import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { localTransactionRepository } from '@/data/local-transaction-repository';
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
