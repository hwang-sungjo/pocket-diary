import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAutocompleteSuggestions } from '@/domain/autocomplete';
import { createDayOneTestTransaction } from '@/domain/transaction';

test('자동완성은 사용 빈도 우선, 같은 빈도에서는 최근 사용 우선으로 정렬한다', () => {
  const oldFrequent = createDayOneTestTransaction(
    new Date('2026-08-25T00:00:00Z'),
  );
  oldFrequent.transaction.id = 'transaction-1';
  oldFrequent.transaction.name = '정기 장보기';

  const recent = createDayOneTestTransaction(new Date('2026-08-27T00:00:00Z'));
  recent.transaction.id = 'transaction-2';
  recent.transaction.name = '편의점';

  const frequentAgain = createDayOneTestTransaction(
    new Date('2026-08-24T00:00:00Z'),
  );
  frequentAgain.transaction.id = 'transaction-3';
  frequentAgain.transaction.name = '정기   장보기';

  const suggestions = buildAutocompleteSuggestions([
    recent,
    oldFrequent,
    frequentAgain,
  ]);

  assert.deepEqual(suggestions.transactionNames, ['정기 장보기', '편의점']);
});
