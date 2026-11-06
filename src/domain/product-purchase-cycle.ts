import type { ProductPurchase } from '@/domain/product-history';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ProductPurchaseCycle {
  purchaseDateCount: number;
  typicalIntervalDays: number;
  expectedNextPurchaseDate: string;
}

function localDayNumber(occurredAt: string): number {
  const date = new Date(occurredAt);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
    MILLISECONDS_PER_DAY;
}

/** Calendar days avoid daylight saving time changing the measured interval. */
export function calculateProductPurchaseCycle(
  purchases: readonly ProductPurchase[],
): ProductPurchaseCycle | null {
  const purchaseDays = [...new Set(purchases.map(({ occurredAt }) => localDayNumber(occurredAt)))]
    .sort((left, right) => left - right);
  if (purchaseDays.length < 3) {
    return null;
  }

  const intervals = purchaseDays
    .slice(1)
    .map((day, index) => day - purchaseDays[index]!)
    .sort((left, right) => left - right);
  const middle = Math.floor(intervals.length / 2);
  const median = intervals.length % 2 === 0
    ? (intervals[middle - 1]! + intervals[middle]!) / 2
    : intervals[middle]!;
  const typicalIntervalDays = Math.round(median);
  const nextDay = purchaseDays.at(-1)! + typicalIntervalDays;

  return {
    purchaseDateCount: purchaseDays.length,
    typicalIntervalDays,
    expectedNextPurchaseDate: new Date(nextDay * MILLISECONDS_PER_DAY)
      .toISOString()
      .slice(0, 10),
  };
}
