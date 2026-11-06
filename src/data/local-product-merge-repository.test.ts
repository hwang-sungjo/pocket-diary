import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { localProductMergeRepository } from '@/data/local-product-merge-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import { getWebDatabase } from '@/data/web-database';
import { buildAutocompleteSuggestions } from '@/domain/autocomplete';
import { buildProductPurchaseHistories } from '@/domain/product-history';
import { prepareProductMerge } from '@/domain/product-merge';
import { calculateMonthlyStatistics } from '@/domain/statistics';
import { createDayOneTestTransaction, type TransactionAggregate } from '@/domain/transaction';

function purchase(
  id: string,
  productName: string,
  productId: string,
  amount: number,
  status: 'confirmed' | 'needs_confirmation' = 'confirmed',
): TransactionAggregate {
  const aggregate = createDayOneTestTransaction(new Date('2026-11-06T03:00:00.000Z'));
  aggregate.transaction.id = id;
  aggregate.transaction.name = id;
  aggregate.transaction.totalAmount = amount;
  aggregate.transaction.status = status;
  aggregate.transaction.recurringRuleId = status === 'needs_confirmation' ? `rule-${id}` : null;
  aggregate.transaction.scheduledDate = status === 'needs_confirmation' ? '2026-11-06' : null;
  aggregate.items = [{
    id: `${id}-item`,
    transactionId: id,
    productId,
    productName,
    categoryId: null,
    quantity: 1,
    unitPrice: amount,
    totalPrice: amount,
    specification: '1L',
    memo: null,
  }];
  return aggregate;
}

test('제품명을 병합하면 품목 ID와 표시명이 함께 바뀌고 금액은 유지된다', async () => {
  const source = purchase('merge-source', '우유', 'old-milk', 2_800);
  const target = purchase('merge-target', '흰우유', 'white-milk', 3_100);
  const pending = purchase('merge-pending', '우유', 'pending-milk', 3_300, 'needs_confirmation');
  await Promise.all([source, target, pending].map((aggregate) => localTransactionRepository.save(aggregate)));
  const before = await localTransactionRepository.list();
  const beforeStats = calculateMonthlyStatistics(before, '2026-11');

  const result = await localProductMergeRepository.merge({
    source: { name: '우유', specification: '1L' },
    target: { name: '흰우유', specification: '1L' },
    newProductId: 'merged-milk',
    updatedAt: '2026-11-07T00:00:00.000Z',
  });
  assert.deepEqual(result, { sourceItemCount: 2, totalItemCount: 3 });

  const after = await localTransactionRepository.list();
  assert.equal(after.length, before.length);
  for (const aggregate of after) {
    assert.equal(aggregate.items[0]?.productId, 'merged-milk');
    assert.equal(aggregate.items[0]?.productName, '흰우유');
    assert.equal(aggregate.transaction.updatedAt, '2026-11-07T00:00:00.000Z');
  }
  assert.deepEqual(
    after.map(({ transaction, items }) => [transaction.id, transaction.totalAmount, items[0]?.totalPrice]),
    before.map(({ transaction, items }) => [transaction.id, transaction.totalAmount, items[0]?.totalPrice]),
  );
  assert.deepEqual(calculateMonthlyStatistics(after, '2026-11').expense, beforeStats.expense);
  assert.deepEqual(
    calculateMonthlyStatistics(after, '2026-11').productExpenses.map(({ name, amount }) => ({ name, amount })),
    [{ name: '흰우유', amount: 5_900 }],
  );
  assert.deepEqual(buildProductPurchaseHistories(after).map(({ name, purchases }) => [name, purchases.length]), [
    ['흰우유', 2],
  ]);
  assert.deepEqual(buildAutocompleteSuggestions(after).products.map(({ name }) => name), ['흰우유']);

  const products = await (await getWebDatabase()).getAll('products');
  assert.deepEqual(products.map(({ id }) => id), ['merged-milk']);
});

test('같은 제품·다른 규격 또는 없는 대상을 병합하면 저장 내용을 유지한다', async () => {
  const request = {
    source: { name: '우유', specification: '1L' },
    target: { name: '흰우유', specification: '2L' },
    newProductId: 'invalid-merge',
    updatedAt: '2026-11-08T00:00:00.000Z',
  };
  assert.throws(() => prepareProductMerge(request), /규격이 다른/);
  assert.throws(() => prepareProductMerge({
    ...request,
    target: { name: ' 우유 ', specification: '1l' },
  }), /같은 제품/);

  const before = await localTransactionRepository.list();
  await assert.rejects(localProductMergeRepository.merge({
    ...request,
    target: { name: '없는 제품', specification: '1L' },
  }), /찾지 못했습니다/);
  assert.deepEqual(await localTransactionRepository.list(), before);
});
