import { getNativeDatabase } from '@/data/native-database';
import type {
  ProductMergeRepository,
  ProductMergeResult,
} from '@/data/product-merge-repository';
import { normalizeLookupValue } from '@/domain/autocomplete';
import { productIdentityKey } from '@/domain/product-history';
import { prepareProductMerge, type ProductMergeRequest } from '@/domain/product-merge';

interface ItemIdentityRow {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name_snapshot: string | null;
  specification: string | null;
}

class SQLiteProductMergeRepository implements ProductMergeRepository {
  async merge(request: ProductMergeRequest): Promise<ProductMergeResult> {
    const plan = prepareProductMerge(request);
    const database = await getNativeDatabase();
    let result: ProductMergeResult | null = null;

    await database.withExclusiveTransactionAsync(async (transaction) => {
      const existingProduct = await transaction.getFirstAsync<{ id: string }>(
        'SELECT id FROM products WHERE id = ?',
        request.newProductId,
      );
      const existingItem = await transaction.getFirstAsync<{ id: string }>(
        'SELECT id FROM transaction_items WHERE product_id = ? LIMIT 1',
        request.newProductId,
      );
      if (existingProduct || existingItem) {
        throw new Error('새 제품 ID가 이미 사용 중입니다. 다시 시도해 주세요.');
      }

      const rows = await transaction.getAllAsync<ItemIdentityRow>(
        `SELECT transaction_items.id, transaction_items.transaction_id,
                transaction_items.product_id, transaction_items.specification,
                COALESCE(transaction_items.product_name, products.name)
                  AS product_name_snapshot
         FROM transaction_items
         LEFT JOIN products ON products.id = transaction_items.product_id`,
      );
      const sourceItems = rows.filter(
        (item) => productIdentityKey(item.product_name_snapshot ?? '', item.specification) === plan.sourceKey,
      );
      const targetItems = rows.filter(
        (item) => productIdentityKey(item.product_name_snapshot ?? '', item.specification) === plan.targetKey,
      );
      if (sourceItems.length === 0 || targetItems.length === 0) {
        throw new Error('병합할 구매 기록을 찾지 못했습니다. 목록을 새로고침해 주세요.');
      }

      const mergedItems = [...sourceItems, ...targetItems];
      await transaction.runAsync(
        `INSERT INTO products (
          id, name, normalized_name, specification, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        request.newProductId,
        plan.targetName,
        normalizeLookupValue(plan.targetName),
        plan.targetSpecification,
        request.updatedAt,
        request.updatedAt,
      );
      for (const item of mergedItems) {
        await transaction.runAsync(
          `UPDATE transaction_items
           SET product_id = ?, product_name = ?, specification = ?
           WHERE id = ?`,
          request.newProductId,
          plan.targetName,
          plan.targetSpecification,
          item.id,
        );
      }
      for (const id of new Set(mergedItems.map(({ transaction_id }) => transaction_id))) {
        await transaction.runAsync(
          'UPDATE transactions SET updated_at = ? WHERE id = ?',
          request.updatedAt,
          id,
        );
      }
      for (const id of new Set(mergedItems.map(({ product_id }) => product_id))) {
        await transaction.runAsync(
          `DELETE FROM products WHERE id = ?
           AND NOT EXISTS (
             SELECT 1 FROM transaction_items WHERE product_id = ?
           )`,
          id,
          id,
        );
      }
      result = {
        sourceItemCount: sourceItems.length,
        totalItemCount: mergedItems.length,
      };
    });

    return result!;
  }
}

export const localProductMergeRepository: ProductMergeRepository =
  new SQLiteProductMergeRepository();
