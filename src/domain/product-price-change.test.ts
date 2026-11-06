import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ProductPurchase } from '@/domain/product-history';
import { calculateProductPriceChange } from '@/domain/product-price-change';

function purchase(
  transactionId: string,
  occurredAt: string,
  quantity: number,
  unitPrice: number | null,
  totalPrice: number,
): ProductPurchase {
  return {
    itemId: `${transactionId}-item`,
    transactionId,
    occurredAt,
    merchantName: null,
    quantity,
    unitPrice,
    totalPrice,
  };
}

test('수량이 달라도 최근 두 거래의 단가 차이를 정수 원화로 계산한다', () => {
  const change = calculateProductPriceChange([
    purchase('new', '2026-08-20T12:00:00.000Z', 1, 3_100, 3_100),
    purchase('old', '2026-08-01T12:00:00.000Z', 2, 2_800, 5_600),
  ]);

  assert.deepEqual(change, {
    currentUnitPrice: 3_100,
    previousUnitPrice: 2_800,
    difference: 300,
    currentOccurredAt: '2026-08-20T12:00:00.000Z',
    previousOccurredAt: '2026-08-01T12:00:00.000Z',
  });
});

test('단가가 없고 수량이 1이면 품목 합계를 사용하며 비교 불가능한 기록은 건너뛴다', () => {
  const change = calculateProductPriceChange([
    purchase('new', '2026-08-20T12:00:00.000Z', 1, null, 2_500),
    purchase('unknown', '2026-08-15T12:00:00.000Z', 2, null, 5_600),
    purchase('old', '2026-08-01T12:00:00.000Z', 1, 2_800, 2_800),
  ]);

  assert.equal(change?.currentUnitPrice, 2_500);
  assert.equal(change?.previousUnitPrice, 2_800);
  assert.equal(change?.difference, -300);
  assert.equal(change?.previousOccurredAt, '2026-08-01T12:00:00.000Z');
});

test('최근 구매의 단가를 알 수 없거나 다른 거래가 없으면 비교하지 않는다', () => {
  assert.equal(calculateProductPriceChange([
    purchase('new', '2026-08-20T12:00:00.000Z', 2, null, 5_600),
    purchase('old', '2026-08-01T12:00:00.000Z', 1, 2_800, 2_800),
  ]), null);
  assert.equal(calculateProductPriceChange([
    purchase('same', '2026-08-20T12:00:00.000Z', 1, 3_000, 3_000),
    purchase('same', '2026-08-20T12:00:00.000Z', 1, 2_800, 2_800),
  ]), null);
});

test('단가가 같으면 차이를 0원으로 계산한다', () => {
  const change = calculateProductPriceChange([
    purchase('new', '2026-08-20T12:00:00.000Z', 1, 2_800, 2_800),
    purchase('old', '2026-08-01T12:00:00.000Z', 1, 2_800, 2_800),
  ]);

  assert.equal(change?.difference, 0);
});
