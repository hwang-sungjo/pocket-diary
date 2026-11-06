import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMonthlyStatistics } from '@/domain/statistics';
import { selectStatisticTransactions } from '@/domain/statistic-drilldown';
import { productIdentityKey } from '@/domain/product-history';
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
  merchantName = null,
  status = 'confirmed',
  items = [],
}: {
  id: string;
  type: TransactionType;
  amount: number;
  occurredAt?: string;
  categoryId: string;
  merchantName?: string | null;
  status?: TransactionStatus;
  items?: {
    amount: number;
    categoryId?: string | null;
    name?: string;
    specification?: string | null;
  }[];
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
      merchantName,
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
      productName: item.name ?? `품목 ${index + 1}`,
      categoryId: item.categoryId ?? null,
      quantity: 1,
      unitPrice: item.amount,
      totalPrice: item.amount,
      specification: item.specification ?? null,
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
    merchantExpenses: [
      {
        merchantKey: null,
        merchantName: null,
        amount: 68_500,
        transactionCount: 2,
      },
    ],
    productExpenses: [
      {
        key: '품목 2\u0000',
        name: '품목 2',
        specification: null,
        amount: 13_900,
        itemCount: 1,
      },
      {
        key: '품목 1\u0000',
        name: '품목 1',
        specification: null,
        amount: 5_600,
        itemCount: 1,
      },
    ],
    excludedPendingCount: 1,
  });
  assert.equal(
    statistics.categoryExpenses.reduce((sum, entry) => sum + entry.amount, 0),
    statistics.expense,
  );
});

test('품목별 지출은 이름·규격별로 묶고 확정 지출의 상세 품목 금액만 누적한다', () => {
  const statistics = calculateMonthlyStatistics(
    [
      aggregate({
        id: 'shopping',
        type: 'expense',
        amount: 7_000,
        categoryId: GROCERY,
        items: [
          { name: '우유', specification: '1L', amount: 2_000 },
          { name: '우유', specification: '2L', amount: 5_000 },
        ],
      }),
      aggregate({
        id: 'repeat',
        type: 'expense',
        amount: 5_000,
        categoryId: GROCERY,
        items: [{ name: ' 우유 ', specification: '1l', amount: 4_000 }],
      }),
      aggregate({
        id: 'unclassified',
        type: 'expense',
        amount: 3_000,
        categoryId: FOOD,
      }),
      aggregate({
        id: 'income',
        type: 'income',
        amount: 9_000,
        categoryId: SALARY,
        items: [{ name: '우유', specification: '1L', amount: 9_000 }],
      }),
      aggregate({
        id: 'pending',
        type: 'expense',
        amount: 10_000,
        categoryId: FOOD,
        status: 'needs_confirmation',
        items: [{ name: '우유', specification: '1L', amount: 10_000 }],
      }),
      aggregate({
        id: 'previous-month',
        type: 'expense',
        amount: 4_000,
        categoryId: FOOD,
        occurredAt: '2026-07-15T03:00:00.000Z',
        items: [{ name: '우유', specification: '1L', amount: 4_000 }],
      }),
    ],
    '2026-08',
  );

  assert.deepEqual(statistics.productExpenses, [
    {
      key: '우유\u00001l',
      name: '우유',
      specification: '1L',
      amount: 6_000,
      itemCount: 2,
    },
    {
      key: '우유\u00002l',
      name: '우유',
      specification: '2L',
      amount: 5_000,
      itemCount: 1,
    },
  ]);
  assert.equal(statistics.expense, 15_000);
  assert.equal(
    statistics.productExpenses.reduce((sum, entry) => sum + entry.amount, 0),
    11_000,
  );
});

test('상점별 지출은 거래 총액을 한 번씩 합산하고 이름 변형과 미입력을 묶는다', () => {
  const statistics = calculateMonthlyStatistics(
    [
      aggregate({
        id: 'itemized',
        type: 'expense',
        amount: 48_000,
        categoryId: GROCERY,
        merchantName: '  OO마트  ',
        items: [{ amount: 15_000 }, { amount: 10_000 }],
      }),
      aggregate({
        id: 'same-merchant',
        type: 'expense',
        amount: 12_000,
        categoryId: GROCERY,
        merchantName: 'oo마트',
      }),
      aggregate({
        id: 'unassigned',
        type: 'expense',
        amount: 5_000,
        categoryId: FOOD,
      }),
      aggregate({
        id: 'pending',
        type: 'expense',
        amount: 9_000,
        categoryId: FOOD,
        merchantName: 'OO마트',
        status: 'needs_confirmation',
      }),
      aggregate({
        id: 'income',
        type: 'income',
        amount: 100_000,
        categoryId: SALARY,
        merchantName: 'OO마트',
      }),
      aggregate({
        id: 'previous-month',
        type: 'expense',
        amount: 8_000,
        categoryId: FOOD,
        merchantName: 'OO마트',
        occurredAt: '2026-07-15T03:00:00.000Z',
      }),
    ],
    '2026-08',
  );

  assert.deepEqual(statistics.merchantExpenses, [
    {
      merchantKey: 'oo마트',
      merchantName: 'OO마트',
      amount: 60_000,
      transactionCount: 2,
    },
    {
      merchantKey: null,
      merchantName: null,
      amount: 5_000,
      transactionCount: 1,
    },
  ]);
  assert.equal(
    statistics.merchantExpenses.reduce((sum, entry) => sum + entry.amount, 0),
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

test('통계 항목 관련 거래의 반영 금액 합계가 월별 통계 행과 일치한다', () => {
  const aggregates = [
    aggregate({
      id: 'shopping', type: 'expense', amount: 48_500, categoryId: GROCERY,
      merchantName: '  샘플   마트 ',
      items: [
        { name: '우유', specification: '1L', amount: 5_600 },
        { name: '세제', amount: 13_900, categoryId: HOUSEHOLD },
      ],
    }),
    aggregate({ id: 'dining', type: 'expense', amount: 20_000, categoryId: FOOD }),
    aggregate({ id: 'pending', type: 'expense', amount: 90_000, categoryId: HOUSEHOLD, status: 'needs_confirmation' }),
    aggregate({ id: 'salary', type: 'income', amount: 3_000_000, categoryId: SALARY }),
    aggregate({ id: 'old', type: 'expense', amount: 1_000, categoryId: FOOD, occurredAt: '2026-07-15T03:00:00.000Z' }),
  ];
  const statistics = calculateMonthlyStatistics(aggregates, '2026-08');
  const selections = [
    { kind: 'category' as const, categoryId: GROCERY },
    { kind: 'category' as const, categoryId: HOUSEHOLD },
    { kind: 'merchant' as const, merchantKey: '샘플 마트' },
    { kind: 'merchant' as const, merchantKey: null },
    { kind: 'product' as const, productKey: productIdentityKey('우유', '1l') },
  ];
  const expected = [34_600, 13_900, 48_500, 20_000, 5_600];

  selections.forEach((selection, index) => {
    const matches = selectStatisticTransactions(aggregates, '2026-08', selection);
    assert.equal(matches.length, 1);
    assert.equal(matches.reduce((sum, { amount }) => sum + amount, 0), expected[index]);
  });
  assert.equal(
    selectStatisticTransactions(aggregates, '2026-08', selections[1]!).at(0)?.aggregate.transaction.id,
    'shopping',
  );
  assert.equal(statistics.categoryExpenses.find(({ categoryId }) => categoryId === HOUSEHOLD)?.amount, 13_900);
  assert.equal(statistics.merchantExpenses.find(({ merchantKey }) => merchantKey === '샘플 마트')?.amount, 48_500);
});
