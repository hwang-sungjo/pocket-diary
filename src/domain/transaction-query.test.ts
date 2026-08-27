import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDayOneTestTransaction } from '@/domain/transaction';
import {
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

test('월 이동과 표시 문자열을 연도 경계에서도 계산한다', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(formatMonthLabel('2026-08'), '2026년 8월');
});
