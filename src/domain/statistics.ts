import type { TransactionAggregate } from '@/domain/transaction';
import { calculateItemTotal } from '@/domain/transaction';
import { filterTransactionsByMonth } from '@/domain/transaction-query';

export interface CategoryExpenseStatistic {
  categoryId: string;
  amount: number;
}

export interface MonthlyStatistics {
  income: number;
  expense: number;
  balance: number;
  categoryExpenses: CategoryExpenseStatistic[];
  excludedPendingCount: number;
}

/**
 * 집계 기준은 거래 총액이다. 상세 품목은 카테고리별 배분에만 사용하며,
 * 품목 합계를 거래 총액에 다시 더하지 않는다.
 */
export function calculateMonthlyStatistics(
  aggregates: readonly TransactionAggregate[],
  monthKey: string,
): MonthlyStatistics {
  const monthlyAggregates = filterTransactionsByMonth(aggregates, monthKey);
  const confirmedAggregates = monthlyAggregates.filter(
    ({ transaction }) => transaction.status === 'confirmed',
  );
  const categoryAmounts = new Map<string, number>();
  let income = 0;
  let expense = 0;

  for (const aggregate of confirmedAggregates) {
    const { transaction, items } = aggregate;

    if (transaction.type === 'income') {
      income += transaction.totalAmount;
      continue;
    }

    expense += transaction.totalAmount;

    for (const item of items) {
      addCategoryAmount(
        categoryAmounts,
        item.categoryId ?? transaction.categoryId,
        item.totalPrice,
      );
    }

    const unclassifiedAmount =
      transaction.totalAmount - calculateItemTotal(items);
    addCategoryAmount(
      categoryAmounts,
      transaction.categoryId,
      unclassifiedAmount,
    );
  }

  return {
    income,
    expense,
    balance: income - expense,
    categoryExpenses: [...categoryAmounts.entries()]
      .filter(([, amount]) => amount !== 0)
      .map(([categoryId, amount]) => ({ categoryId, amount }))
      .sort(
        (left, right) =>
          right.amount - left.amount ||
          left.categoryId.localeCompare(right.categoryId),
      ),
    excludedPendingCount: monthlyAggregates.filter(
      ({ transaction }) => transaction.status === 'needs_confirmation',
    ).length,
  };
}

function addCategoryAmount(
  categoryAmounts: Map<string, number>,
  categoryId: string,
  amount: number,
): void {
  categoryAmounts.set(
    categoryId,
    (categoryAmounts.get(categoryId) ?? 0) + amount,
  );
}
