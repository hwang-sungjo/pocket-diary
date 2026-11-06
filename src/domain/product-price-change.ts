import type { ProductPurchase } from '@/domain/product-history';

export interface ProductPriceChange {
  currentUnitPrice: number;
  previousUnitPrice: number;
  difference: number;
  currentOccurredAt: string;
  previousOccurredAt: string;
}

function comparableUnitPrice(purchase: ProductPurchase): number | null {
  if (purchase.unitPrice !== null) {
    return purchase.unitPrice;
  }
  return purchase.quantity === 1 ? purchase.totalPrice : null;
}

/** Purchases are newest first; compare separate transactions with usable unit prices. */
export function calculateProductPriceChange(
  purchases: readonly ProductPurchase[],
): ProductPriceChange | null {
  const current = purchases[0];
  if (!current) {
    return null;
  }
  const currentUnitPrice = comparableUnitPrice(current);
  if (currentUnitPrice === null) {
    return null;
  }

  const previous = purchases.slice(1).find(
    (purchase) =>
      purchase.transactionId !== current.transactionId &&
      comparableUnitPrice(purchase) !== null,
  );
  if (!previous) {
    return null;
  }
  const previousUnitPrice = comparableUnitPrice(previous)!;

  return {
    currentUnitPrice,
    previousUnitPrice,
    difference: currentUnitPrice - previousUnitPrice,
    currentOccurredAt: current.occurredAt,
    previousOccurredAt: previous.occurredAt,
  };
}
