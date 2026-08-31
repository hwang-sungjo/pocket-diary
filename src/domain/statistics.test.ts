import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMonthlyStatistics } from '@/domain/statistics';
import type {
  TransactionAggregate,
  TransactionStatus,
  TransactionType,
} from '@/domain/transaction';

const FOOD = 'food';
const GROCERY = 'grocery';
const HOUSEHOLD = 'household';
const SALARY = 'salary';

function aggregate({
  id,
  type,
  amount,
  occurredAt = '2026-08-15T03:00:00.000Z',
  categoryId,
  status = 'confirmed',
  items = [],
}: {
  id: string;
  type: TransactionType;
  amount: number;
  occurredAt?: string;
  categoryId: string;
  status?: TransactionStatus;
  items?: { amount: number; categoryId?: string | null }[];
}): TransactionAggregate {
  return {
    transaction: {
      id,
      type,
      name: id,
      totalAmount: amount,
      occurredAt,
      categoryId,
      merchantId: null,
      merchantName: null,
      paymentMethod: null,
      memo: null,
      status,
      recurringRuleId:
        status === 'needs_confirmation' ? `rule-${id}` : null,
      scheduledDate: status === 'needs_confirmation' ? '2026-08-15' : null,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    },
    items: items.map((item, index) => ({
      id: `${id}-item-${index}`,
      transactionId: id,
      productId: `${id}-product-${index}`,
      productName: `품목 ${index + 1}`,
      categoryId: item.categoryId ?? null,
      quantity: 1,
      unitPrice: item.amount,
      totalPrice: item.amount,
      specification: null,
      memo: null,
    })),
  };
}

test('월별 합계와 품목·미분류 카테고리 금액이 수기 계산과 일치한다', () => {
  const statistics = calculateMonthlyStatistics(
    [
      aggregate({
        id: 'shopping',
        type: 'expense',
        amount: 48_500,
        categoryId: GROCERY,
        items: [
          { amount: 5_600 },
          { amount: 13_900, categoryId: HOUSEHOLD },
        ],
      }),
      aggregate({
        id: 'dining',
        type: 'expense',
        amount: 20_000,
        categoryId: FOOD,
      }),
      aggregate({
        id: 'salary',
        type: 'income',
        amount: 3_000_000,
        categoryId: SALARY,
      }),
      aggregate({
        id: 'pending-utilities',
        type: 'expense',
        amount: 700_000,
        categoryId: 'utilities',
        status: 'needs_confirmation',
      }),
      aggregate({
        id: 'previous-month',
        type: 'expense',
        amount: 100_000,
        occurredAt: '2026-07-15T03:00:00.000Z',
        categoryId: FOOD,
      }),
    ],
    '2026-08',
  );

  assert.deepEqual(statistics, {
    income: 3_000_000,
    expense: 68_500,
    balance: 2_931_500,
    categoryExpenses: [
      { categoryId: GROCERY, amount: 34_600 },
      { categoryId: FOOD, amount: 20_000 },
      { categoryId: HOUSEHOLD, amount: 13_900 },
    ],
    excludedPendingCount: 1,
  });
  assert.equal(
    statistics.categoryExpenses.reduce((sum, entry) => sum + entry.amount, 0),
    statistics.expense,
  );
});

test('거래 총액과 품목 합계를 다시 더하지 않는다', () => {
  const statistics = calculateMonthlyStatistics(
    [
      aggregate({
        id: 'itemized',
        type: 'expense',
        amount: 10_000,
        categoryId: GROCERY,
        items: [{ amount: 4_000 }, { amount: 3_000, categoryId: HOUSEHOLD }],
      }),
    ],
    '2026-08',
  );

  assert.equal(statistics.expense, 10_000);
  assert.deepEqual(statistics.categoryExpenses, [
    { categoryId: GROCERY, amount: 7_000 },
    { categoryId: HOUSEHOLD, amount: 3_000 },
  ]);
});

test('확인 필요 거래는 저장해 confirmed가 된 뒤에만 통계에 포함한다', () => {
  const pending = aggregate({
    id: 'recurring',
    type: 'expense',
    amount: 120_000,
    categoryId: 'housing',
    status: 'needs_confirmation',
  });

  const beforeConfirmation = calculateMonthlyStatistics([pending], '2026-08');
  const afterConfirmation = calculateMonthlyStatistics(
    [
      {
        ...pending,
        transaction: { ...pending.transaction, status: 'confirmed' },
      },
    ],
    '2026-08',
  );

  assert.equal(beforeConfirmation.expense, 0);
  assert.equal(beforeConfirmation.excludedPendingCount, 1);
  assert.equal(afterConfirmation.expense, 120_000);
  assert.equal(afterConfirmation.excludedPendingCount, 0);
});
