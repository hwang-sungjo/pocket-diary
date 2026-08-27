import type { TransactionAggregate } from '@/domain/transaction';

export function toMonthKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonth(monthKey: string, amount: number): string {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error('올바르지 않은 월 형식입니다.');
  }

  return toMonthKey(new Date(year, month - 1 + amount, 1));
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${year}년 ${Number(month)}월`;
}

export function filterTransactionsByMonth(
  aggregates: readonly TransactionAggregate[],
  monthKey: string,
): TransactionAggregate[] {
  return aggregates
    .filter(
      ({ transaction }) =>
        toMonthKey(new Date(transaction.occurredAt)) === monthKey,
    )
    .sort((left, right) =>
      right.transaction.occurredAt.localeCompare(left.transaction.occurredAt),
    );
}

export interface DailyTransactionGroup {
  dateKey: string;
  transactions: TransactionAggregate[];
}

export function groupTransactionsByDate(
  aggregates: readonly TransactionAggregate[],
): DailyTransactionGroup[] {
  const groups = new Map<string, TransactionAggregate[]>();

  for (const aggregate of aggregates) {
    const date = new Date(aggregate.transaction.occurredAt);
    const dateKey = `${toMonthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
    const group = groups.get(dateKey) ?? [];
    group.push(aggregate);
    groups.set(dateKey, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, transactions]) => ({ dateKey, transactions }));
}
