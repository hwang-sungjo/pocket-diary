import type { TransactionAggregate } from '@/domain/transaction';

export interface NamedSuggestion {
  id: string;
  name: string;
}

export interface ProductSuggestion extends NamedSuggestion {
  specification: string | null;
}

export interface AutocompleteSuggestions {
  transactionNames: string[];
  merchants: NamedSuggestion[];
  products: ProductSuggestion[];
}

interface RankedValue<T> {
  count: number;
  latestAt: string;
  value: T;
}

export function normalizeLookupValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
}

function rankValues<T>(values: Map<string, RankedValue<T>>): T[] {
  return [...values.values()]
    .sort(
      (left, right) =>
        right.count - left.count || right.latestAt.localeCompare(left.latestAt),
    )
    .map(({ value }) => value);
}

export function buildAutocompleteSuggestions(
  aggregates: readonly TransactionAggregate[],
): AutocompleteSuggestions {
  const transactionNames = new Map<string, RankedValue<string>>();
  const merchants = new Map<string, RankedValue<NamedSuggestion>>();
  const products = new Map<string, RankedValue<ProductSuggestion>>();

  for (const aggregate of aggregates) {
    const { transaction, items } = aggregate;
    const transactionNameKey = normalizeLookupValue(transaction.name);
    const previousTransactionName = transactionNames.get(transactionNameKey);
    transactionNames.set(transactionNameKey, {
      count: (previousTransactionName?.count ?? 0) + 1,
      latestAt:
        previousTransactionName &&
        previousTransactionName.latestAt > transaction.occurredAt
          ? previousTransactionName.latestAt
          : transaction.occurredAt,
      value: previousTransactionName?.value ?? transaction.name,
    });

    if (transaction.merchantId && transaction.merchantName) {
      const merchantKey = normalizeLookupValue(transaction.merchantName);
      const previousMerchant = merchants.get(merchantKey);
      merchants.set(merchantKey, {
        count: (previousMerchant?.count ?? 0) + 1,
        latestAt:
          previousMerchant && previousMerchant.latestAt > transaction.occurredAt
            ? previousMerchant.latestAt
            : transaction.occurredAt,
        value: {
          id: previousMerchant?.value.id ?? transaction.merchantId,
          name: previousMerchant?.value.name ?? transaction.merchantName,
        },
      });
    }

    for (const item of items) {
      const productKey = `${normalizeLookupValue(item.productName)}\u0000${normalizeLookupValue(item.specification ?? '')}`;
      const previousProduct = products.get(productKey);
      products.set(productKey, {
        count: (previousProduct?.count ?? 0) + 1,
        latestAt:
          previousProduct && previousProduct.latestAt > transaction.occurredAt
            ? previousProduct.latestAt
            : transaction.occurredAt,
        value: {
          id: previousProduct?.value.id ?? item.productId,
          name: previousProduct?.value.name ?? item.productName,
          specification:
            previousProduct?.value.specification ?? item.specification,
        },
      });
    }
  }

  return {
    transactionNames: rankValues(transactionNames),
    merchants: rankValues(merchants),
    products: rankValues(products),
  };
}
