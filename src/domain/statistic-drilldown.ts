import { productIdentityKey } from '@/domain/product-history';
import {
  expenseCategoryAllocations,
  merchantIdentityKey,
} from '@/domain/statistics';
import type { TransactionAggregate } from '@/domain/transaction';
import { filterTransactionsByMonth } from '@/domain/transaction-query';

export type StatisticSelection =
  | { kind: 'category'; categoryId: string }
  | { kind: 'merchant'; merchantKey: string | null }
  | { kind: 'product'; productKey: string };

export interface StatisticTransaction {
  aggregate: TransactionAggregate;
  amount: number;
}

/** A row amount is the contribution to the selected statistic, not always the transaction total. */
export function selectStatisticTransactions(
  aggregates: readonly TransactionAggregate[],
  monthKey: string,
  selection: StatisticSelection,
): StatisticTransaction[] {
  return filterTransactionsByMonth(aggregates, monthKey).flatMap((aggregate) => {
    const { transaction, items } = aggregate;
    if (transaction.status !== 'confirmed' || transaction.type !== 'expense') {
      return [];
    }

    let amount = 0;
    let matched = false;
    if (selection.kind === 'category') {
      amount = expenseCategoryAllocations(aggregate).get(selection.categoryId) ?? 0;
      matched = amount !== 0;
    } else if (selection.kind === 'merchant') {
      if (merchantIdentityKey(transaction.merchantName) === selection.merchantKey) {
        amount = transaction.totalAmount;
        matched = true;
      }
    } else {
      const matchingItems = items.filter(
        (item) => productIdentityKey(item.productName, item.specification) === selection.productKey,
      );
      amount = matchingItems.reduce((sum, item) => sum + item.totalPrice, 0);
      matched = matchingItems.length > 0;
    }
    return matched ? [{ aggregate, amount }] : [];
  });
}
