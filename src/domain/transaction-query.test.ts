import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDayOneTestTransaction } from '@/domain/transaction';
import {
  filterTransactionsByCriteria,
  filterTransactionsByMonth,
  formatMonthLabel,
  groupTransactionsByDate,
  shiftMonth,
} from '@/domain/transaction-query';

test('선택한 월의 거래만 최신 날짜순으로 묶는다', () => {
  const augustOld = createDayOneTestTransaction(
    new Date('2026-08-02T03:00:00Z'),
  );
  augustOld.transaction.id = 'august-old';
  const augustRecent = createDayOneTestTransaction(
    new Date('2026-08-27T03:00:00Z'),
  );
  augustRecent.transaction.id = 'august-recent';
  const september = createDayOneTestTransaction(
    new Date('2026-09-01T03:00:00Z'),
  );
  september.transaction.id = 'september';

  const filtered = filterTransactionsByMonth(
    [augustOld, september, augustRecent],
    '2026-08',
  );
  const groups = groupTransactionsByDate(filtered);

  assert.deepEqual(
    filtered.map(({ transaction }) => transaction.id),
    ['august-recent', 'august-old'],
  );
  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.transactions[0]?.transaction.id, 'august-recent');
});

test('거래 유형·카테고리·거래명 또는 상점명 검색을 함께 적용한다', () => {
  const grocery = createDayOneTestTransaction(new Date('2026-08-02T03:00:00Z'));
  grocery.transaction.id = 'grocery';
  grocery.transaction.name = '주말 장보기';
  grocery.transaction.merchantName = '동네 마트';
  grocery.transaction.categoryId = 'groceries';

  const cafe = createDayOneTestTransaction(new Date('2026-08-03T03:00:00Z'));
  cafe.transaction.id = 'cafe';
  cafe.transaction.name = '커피';
  cafe.transaction.merchantName = '동네 카페';
  cafe.transaction.categoryId = 'food';

  const income = createDayOneTestTransaction(new Date('2026-08-04T03:00:00Z'));
  income.transaction.id = 'income';
  income.transaction.name = '용돈';
  income.transaction.type = 'income';
  income.transaction.merchantName = '동네 마트';
  income.transaction.categoryId = 'income';

  const monthly = filterTransactionsByMonth([grocery, cafe, income], '2026-08');
  const result = filterTransactionsByCriteria(monthly, {
    type: 'expense',
    categoryId: 'groceries',
    search: '  동네 마트  ',
  });

  assert.deepEqual(result.map(({ transaction }) => transaction.id), ['grocery']);
  assert.deepEqual(
    filterTransactionsByCriteria(monthly, {
      type: 'all',
      categoryId: null,
      search: '커피',
    }).map(({ transaction }) => transaction.id),
    ['cafe'],
  );
  assert.deepEqual(
    filterTransactionsByCriteria(monthly, {
      type: 'income',
      categoryId: null,
      search: '마트',
    }).map(({ transaction }) => transaction.id),
    ['income'],
  );
});

test('월 이동과 표시 문자열을 연도 경계에서도 계산한다', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(formatMonthLabel('2026-08'), '2026년 8월');
});
