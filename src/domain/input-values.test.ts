import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatKRW, isValidISODate, parseKRWInput } from '@/domain/input-values';

test('원화 금액은 정수로 파싱하고 천 단위 구분자로 표시한다', () => {
  assert.equal(parseKRWInput('12,500원'), 12500);
  assert.equal(parseKRWInput(''), null);
  assert.equal(parseKRWInput('abc'), null);
  assert.equal(formatKRW(12500), '12,500');
  assert.equal(formatKRW(null), '');
});

test('실제로 존재하는 ISO 날짜만 허용한다', () => {
  assert.equal(isValidISODate('2026-08-27'), true);
  assert.equal(isValidISODate('2024-02-29'), true);
  assert.equal(isValidISODate('2026-02-29'), false);
  assert.equal(isValidISODate('2026-13-01'), false);
  assert.equal(isValidISODate('2026/08/27'), false);
});
