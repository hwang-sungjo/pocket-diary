import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTransactionAggregate,
  calculateDraftItemTotal,
  calculateDraftUnclassifiedAmount,
  createTransactionDraft,
  createTransactionItemDraft,
  getTransactionDraftErrors,
  isValidTime,
} from '@/domain/transaction-draft';

test('상세 품목 합계와 미분류 금액을 정수 원화로 계산한다', () => {
  const draft = createTransactionDraft(new Date('2026-08-27T12:00:00'));
  draft.totalAmount = 48500;
  const milk = createTransactionItemDraft('item-1', 'product-1');
  milk.totalPrice = 5600;
  const detergent = createTransactionItemDraft('item-2', 'product-2');
  detergent.totalPrice = 13900;
  draft.items = [milk, detergent];

  assert.equal(calculateDraftItemTotal(draft.items), 19500);
  assert.equal(calculateDraftUnclassifiedAmount(draft), 29000);

  draft.totalAmount = 10000;
  assert.equal(calculateDraftUnclassifiedAmount(draft), -9500);
});

test('필수 거래와 품목 입력을 검증하고 aggregate를 만든다', () => {
  const draft = createTransactionDraft(new Date('2026-08-27T12:00:00'));
  assert.equal(getTransactionDraftErrors(draft).length >= 3, true);

  draft.name = '장보기';
  draft.totalAmount = 5600;
  draft.categoryId = '0198d66a-0b81-7000-8000-000000000002';
  const item = createTransactionItemDraft(
    '0198d66a-0b82-4000-8000-000000000010',
    '0198d66a-0b82-4000-8000-000000000011',
  );
  item.productName = '우유';
  item.quantity = '2';
  item.unitPrice = 2800;
  item.totalPrice = 5600;
  draft.items = [item];

  const aggregate = buildTransactionAggregate(
    draft,
    '0198d66a-0b82-4000-8000-000000000012',
    new Date('2026-08-27T03:10:00Z'),
  );

  assert.equal(getTransactionDraftErrors(draft).length, 0);
  assert.equal(aggregate.items.length, 1);
  assert.equal(aggregate.items[0]?.productName, '우유');
  assert.equal(aggregate.items[0]?.transactionId, aggregate.transaction.id);
});

test('실제로 존재하는 24시간제 시각만 허용한다', () => {
  assert.equal(isValidTime('00:00'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('9:30'), false);
});
