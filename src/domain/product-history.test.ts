import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProductPurchaseHistories,
  searchProductPurchaseHistories,
} from '@/domain/product-history';
import { createDayOneTestTransaction } from '@/domain/transaction';

test('같은 제품명과 규격의 구매 이력을 날짜 역순으로 묶고 검색한다', () => {
  const oldPurchase = createDayOneTestTransaction(
    new Date('2026-08-01T03:00:00Z'),
  );
  oldPurchase.transaction.id = 'old';
  oldPurchase.items = [
    {
      id: 'item-old',
      transactionId: 'old',
      productId: 'product-old',
      productName: '우유',
      categoryId: null,
      quantity: 1,
      unitPrice: 2800,
      totalPrice: 2800,
      specification: '1L',
      memo: null,
    },
  ];
  const recentPurchase = structuredClone(oldPurchase);
  recentPurchase.transaction.id = 'recent';
  recentPurchase.transaction.occurredAt = '2026-08-27T03:00:00.000Z';
  recentPurchase.items[0]!.id = 'item-recent';
  recentPurchase.items[0]!.transactionId = 'recent';
  recentPurchase.items[0]!.productId = 'product-recent';

  const histories = buildProductPurchaseHistories([
    oldPurchase,
    recentPurchase,
  ]);

  assert.equal(histories.length, 1);
  assert.deepEqual(
    histories[0]?.purchases.map(({ transactionId }) => transactionId),
    ['recent', 'old'],
  );
  assert.equal(searchProductPurchaseHistories(histories, '우유 1l').length, 1);
  assert.equal(searchProductPurchaseHistories(histories, '세제').length, 0);
});
