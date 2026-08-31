import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { localTransactionRepository } from '@/data/local-transaction-repository';
import { verifyLocalStorage } from '@/data/verify-local-storage';
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

test('안전한 정수 범위를 넘는 원화 금액은 저장하지 않는다', async () => {
  const fixture = createDayOneTestTransaction();
  fixture.transaction.totalAmount = Number.MAX_SAFE_INTEGER + 1;

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

test('거래를 수정하면 같은 ID로 교체되고 삭제하면 품목과 함께 조회되지 않는다', async () => {
  const transactionId = '0198d66a-0b83-4000-8000-000000000001';
  const fixture = createDayOneTestTransaction(
    new Date('2026-08-27T13:00:00Z'),
  );
  fixture.transaction.id = transactionId;
  fixture.transaction.name = '수정 전 거래';
  fixture.transaction.totalAmount = 10000;
  fixture.items = [
    {
      id: '0198d66a-0b83-4000-8000-000000000002',
      transactionId,
      productId: '0198d66a-0b83-4000-8000-000000000003',
      productName: '수정 테스트 품목',
      categoryId: null,
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
      specification: null,
      memo: null,
    },
  ];

  await localTransactionRepository.save(fixture);
  fixture.transaction.name = '수정된 거래';
  fixture.transaction.totalAmount = 12000;
  fixture.items[0]!.totalPrice = 12000;
  fixture.items[0]!.unitPrice = 12000;
  await localTransactionRepository.save(fixture);

  const updated = await localTransactionRepository.findById(transactionId);
  assert.equal(updated?.transaction.name, '수정된 거래');
  assert.equal(updated?.items[0]?.totalPrice, 12000);

  await localTransactionRepository.delete(transactionId);
  assert.equal(await localTransactionRepository.findById(transactionId), null);
});

test('이전 Day 1 테스트 카테고리만 현재 시드 ID로 보정하고 기존 값은 보존한다', async () => {
  const legacy = createDayOneTestTransaction(
    new Date('2026-08-24T00:00:00Z'),
  );
  legacy.transaction.categoryId = '0198d66a-0b80-7000-8000-000000000002';
  legacy.transaction.memo = '보존할 메모';
  await localTransactionRepository.save(legacy);

  const migrated = await verifyLocalStorage(localTransactionRepository);
  const currentFixture = createDayOneTestTransaction();

  assert.equal(migrated.transaction.categoryId, currentFixture.transaction.categoryId);
  assert.equal(migrated.transaction.memo, '보존할 메모');
  assert.equal(migrated.transaction.occurredAt, legacy.transaction.occurredAt);
});
