import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ProductPurchase } from '@/domain/product-history';
import { calculateProductPurchaseCycle } from '@/domain/product-purchase-cycle';

function purchase(date: string, itemId: string): ProductPurchase {
  return {
    itemId,
    transactionId: itemId,
    occurredAt: new Date(`${date}T12:00:00`).toISOString(),
    merchantName: null,
    quantity: 1,
    unitPrice: 1000,
    totalPrice: 1000,
  };
}

test('서로 다른 구매 날짜가 3회 이상일 때 간격 중앙값으로 다음 구매일을 계산한다', () => {
  const cycle = calculateProductPurchaseCycle([
    purchase('2026-01-18', 'new'),
    purchase('2026-01-18', 'same-day'),
    purchase('2026-01-02', 'old'),
    purchase('2026-01-09', 'middle'),
  ]);

  assert.deepEqual(cycle, {
    purchaseDateCount: 3,
    typicalIntervalDays: 8,
    expectedNextPurchaseDate: '2026-01-26',
  });
});

test('간격 개수가 짝수면 두 중앙값의 평균을 일 단위로 반올림한다', () => {
  const cycle = calculateProductPurchaseCycle([
    purchase('2026-01-01', 'one'),
    purchase('2026-01-03', 'two'),
    purchase('2026-01-08', 'three'),
    purchase('2026-01-10', 'four'),
    purchase('2026-01-19', 'five'),
  ]);

  assert.equal(cycle?.typicalIntervalDays, 4);
  assert.equal(cycle?.expectedNextPurchaseDate, '2026-01-23');
});

test('구매 기록이 3건이어도 구매 날짜가 2일뿐이면 예상일을 표시하지 않는다', () => {
  assert.equal(calculateProductPurchaseCycle([
    purchase('2026-01-01', 'one'),
    purchase('2026-01-01', 'two'),
    purchase('2026-01-08', 'three'),
  ]), null);
});

test('일광 절약 시간 전환 구간에도 달력 날짜 간격을 사용한다', () => {
  const cycle = calculateProductPurchaseCycle([
    purchase('2026-03-07', 'before'),
    purchase('2026-03-08', 'change'),
    purchase('2026-03-09', 'after'),
  ]);

  assert.equal(cycle?.typicalIntervalDays, 1);
  assert.equal(cycle?.expectedNextPurchaseDate, '2026-03-10');
});
