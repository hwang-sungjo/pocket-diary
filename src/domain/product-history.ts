import { normalizeLookupValue } from '@/domain/autocomplete';
import type { TransactionAggregate } from '@/domain/transaction';

export interface ProductPurchase {
  itemId: string;
  transactionId: string;
  occurredAt: string;
  merchantName: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
}

export interface ProductPurchaseHistory {
  key: string;
  name: string;
  specification: string | null;
  purchases: ProductPurchase[];
}

export function buildProductPurchaseHistories(
  aggregates: readonly TransactionAggregate[],
): ProductPurchaseHistory[] {
  const histories = new Map<string, ProductPurchaseHistory>();

  for (const aggregate of aggregates) {
    for (const item of aggregate.items) {
      const normalizedName = normalizeLookupValue(item.productName);
      const normalizedSpecification = normalizeLookupValue(
        item.specification ?? '',
      );
      const key = `${normalizedName}\u0000${normalizedSpecification}`;
      const history = histories.get(key) ?? {
        key,
        name: item.productName,
        specification: item.specification,
        purchases: [],
      };
      history.purchases.push({
        itemId: item.id,
        transactionId: aggregate.transaction.id,
        occurredAt: aggregate.transaction.occurredAt,
        merchantName: aggregate.transaction.merchantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
      histories.set(key, history);
    }
  }

  return [...histories.values()]
    .map((history) => ({
      ...history,
      purchases: [...history.purchases].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'ko'));
}

export function searchProductPurchaseHistories(
  histories: readonly ProductPurchaseHistory[],
  query: string,
): ProductPurchaseHistory[] {
  const normalizedQuery = normalizeLookupValue(query);

  if (!normalizedQuery) {
    return [...histories];
  }

  return histories.filter((history) =>
    normalizeLookupValue(
      `${history.name} ${history.specification ?? ''}`,
    ).includes(normalizedQuery),
  );
}
