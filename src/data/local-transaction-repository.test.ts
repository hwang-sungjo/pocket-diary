import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { localTransactionRepository } from '@/data/local-transaction-repository';
import {
  buildTransactionAggregate,
  createTransactionDraft,
  createTransactionItemDraft,
} from '@/domain/transaction-draft';
import {
  createDayOneTestTransaction,
  DAY_ONE_TEST_TRANSACTION_ID,
} from '@/domain/transaction';

test('테스트 거래를 저장하고 같은 값으로 다시 조회한다', async () => {
  const fixture = createDayOneTestTransaction(new Date('2026-08-24T00:00:00Z'));

  await localTransactionRepository.save(fixture);
  const saved = await localTransactionRepository.findById(
    DAY_ONE_TEST_TRANSACTION_ID,
  );

  assert.deepEqual(saved, fixture);
});

test('같은 ID를 다시 저장해도 거래가 중복되지 않는다', async () => {
  const fixture = createDayOneTestTransaction(new Date('2026-08-24T00:00:00Z'));

  await localTransactionRepository.save(fixture);
  await localTransactionRepository.save(fixture);

  const transactions = await localTransactionRepository.list();
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0]?.transaction.totalAmount, 12500);
});

test('원화 금액이 정수가 아니면 저장하지 않는다', async () => {
  const fixture = createDayOneTestTransaction();
  fixture.transaction.totalAmount = 12500.5;

  await assert.rejects(
    localTransactionRepository.save(fixture),
    /0보다 큰 정수 원화/,
  );
});

test('상점과 상세 품목이 있는 거래를 저장하고 다시 조회한다', async () => {
  const draft = createTransactionDraft(new Date('2026-08-27T12:00:00'));
  draft.name = 'Day 3 장보기';
  draft.totalAmount = 48500;
  draft.categoryId = '0198d66a-0b81-7000-8000-000000000002';
  draft.merchantId = '0198d66a-0b82-4000-8000-000000000001';
  draft.merchantName = 'OO마트';

  const milk = createTransactionItemDraft(
    '0198d66a-0b82-4000-8000-000000000002',
    '0198d66a-0b82-4000-8000-000000000003',
  );
  milk.productName = '우유';
  milk.quantity = '2';
  milk.unitPrice = 2800;
  milk.totalPrice = 5600;
  milk.specification = '1L';
  draft.items = [milk];

  const aggregate = buildTransactionAggregate(
    draft,
    '0198d66a-0b82-4000-8000-000000000004',
    new Date('2026-08-27T12:01:00Z'),
  );
  await localTransactionRepository.save(aggregate);

  assert.deepEqual(
    await localTransactionRepository.findById(aggregate.transaction.id),
    aggregate,
  );
});
