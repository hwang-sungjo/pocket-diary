import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRecurringRule,
  createRecurringRuleDraft,
  getNextScheduledDate,
  getRecurringRuleDraftErrors,
} from '@/domain/recurring-rule';

test('월말 반복일을 다음 달의 마지막 유효 날짜로 보정한다', () => {
  const draft = createRecurringRuleDraft(new Date('2026-01-31T12:00:00'));
  draft.name = '월말 결제';
  draft.totalAmount = 10000;
  draft.categoryId = 'category';
  const rule = buildRecurringRule(draft, 'rule');

  assert.equal(getNextScheduledDate(rule, '2026-01-31'), '2026-02-28');
  assert.equal(getNextScheduledDate(rule, '2026-02-28'), '2026-03-31');
});

test('사용자 지정 주기는 N일 뒤 예정일을 계산한다', () => {
  const draft = createRecurringRuleDraft(new Date('2026-08-27T12:00:00'));
  draft.name = '사흘마다';
  draft.totalAmount = 3000;
  draft.categoryId = 'category';
  draft.frequency = 'custom';
  draft.interval = '3';
  const rule = buildRecurringRule(draft, 'rule');

  assert.equal(getNextScheduledDate(rule, '2026-08-27'), '2026-08-30');
});

test('종료일과 반복 간격을 검증한다', () => {
  const draft = createRecurringRuleDraft(new Date('2026-08-27T12:00:00'));
  draft.name = '잘못된 규칙';
  draft.totalAmount = 1000;
  draft.categoryId = 'category';
  draft.interval = '0';
  draft.endDate = '2026-08-26';

  assert.deepEqual(getRecurringRuleDraftErrors(draft), [
    '반복 간격은 1 이상의 정수여야 합니다.',
    '종료일은 시작일보다 빠를 수 없습니다.',
  ]);
});

test('반복 금액은 안전한 정수 범위 안에서만 허용한다', () => {
  const draft = createRecurringRuleDraft(new Date('2026-08-27T12:00:00'));
  draft.name = '큰 반복 금액';
  draft.totalAmount = Number.MAX_SAFE_INTEGER + 1;
  draft.categoryId = 'category';

  assert.match(getRecurringRuleDraftErrors(draft)[0] ?? '', /반복 금액/);
});
