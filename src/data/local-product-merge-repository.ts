import type { ProductMergeRepository } from '@/data/product-merge-repository';
import { getWebDatabase } from '@/data/web-database';
import { normalizeLookupValue } from '@/domain/autocomplete';
import { productIdentityKey } from '@/domain/product-history';
import { prepareProductMerge, type ProductMergeRequest } from '@/domain/product-merge';

class IndexedDbProductMergeRepository implements ProductMergeRepository {
  async merge(request: ProductMergeRequest) {
    const plan = prepareProductMerge(request);
    const database = await getWebDatabase();
    const transaction = database.transaction(
      ['transactionItems', 'transactions', 'products'],
      'readwrite',
    );
    const items = transaction.objectStore('transactionItems');
    const transactions = transaction.objectStore('transactions');
    const products = transaction.objectStore('products');

    try {
      const [allItems, allProducts] = await Promise.all([items.getAll(), products.getAll()]);
      const productNames = new Map(allProducts.map(({ id, name }) => [id, name]));
      if (
        allProducts.some(({ id }) => id === request.newProductId) ||
        allItems.some(({ productId }) => productId === request.newProductId)
      ) {
        throw new Error('새 제품 ID가 이미 사용 중입니다. 다시 시도해 주세요.');
      }

      const sourceItems = [];
      const targetItems = [];
      for (const item of allItems) {
        const key = productIdentityKey(
          item.productName ?? productNames.get(item.productId) ?? '',
          item.specification,
        );
        if (key === plan.sourceKey) {
          sourceItems.push(item);
        } else if (key === plan.targetKey) {
          targetItems.push(item);
        }
      }
      if (sourceItems.length === 0 || targetItems.length === 0) {
        throw new Error('병합할 구매 기록을 찾지 못했습니다. 목록을 새로고침해 주세요.');
      }

      const mergedItems = [...sourceItems, ...targetItems];
      const changedItemIds = new Set(mergedItems.map(({ id }) => id));
      const remainingProductIds = new Set(
        allItems.filter(({ id }) => !changedItemIds.has(id)).map(({ productId }) => productId),
      );
      const oldProductIds = new Set(mergedItems.map(({ productId }) => productId));

      await products.put({
        id: request.newProductId,
        name: plan.targetName,
        normalizedName: normalizeLookupValue(plan.targetName),
        specification: plan.targetSpecification,
        createdAt: request.updatedAt,
        updatedAt: request.updatedAt,
      });
      for (const item of mergedItems) {
        await items.put({
          ...item,
          productId: request.newProductId,
          productName: plan.targetName,
          specification: plan.targetSpecification,
        });
      }
      for (const id of new Set(mergedItems.map(({ transactionId }) => transactionId))) {
        const storedTransaction = await transactions.get(id);
        if (storedTransaction) {
          await transactions.put({ ...storedTransaction, updatedAt: request.updatedAt });
        }
      }
      for (const id of oldProductIds) {
        if (!remainingProductIds.has(id)) {
          await products.delete(id);
        }
      }
      await transaction.done;
      return { sourceItemCount: sourceItems.length, totalItemCount: mergedItems.length };
    } catch (cause) {
      try {
        transaction.abort();
      } catch {
        // A failed IndexedDB request may have already aborted the transaction.
      }
      await transaction.done.catch(() => undefined);
      throw cause;
    }
  }
}

export const localProductMergeRepository: ProductMergeRepository =
  new IndexedDbProductMergeRepository();
