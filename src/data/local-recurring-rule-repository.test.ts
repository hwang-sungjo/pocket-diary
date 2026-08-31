import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { generateDueRecurringTransactions } from '@/data/generate-recurring-transactions';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import {
  buildRecurringRule,
  createRecurringRuleDraft,
} from '@/domain/recurring-rule';

test('같은 규칙과 예정일의 반복 거래를 한 번만 생성한다', async () => {
  const draft = createRecurringRuleDraft(new Date('2026-08-29T12:00:00'));
  draft.name = 'Day 5 월세';
  draft.totalAmount = 700000;
  draft.categoryId = '0198d66a-0b81-7000-8000-000000000003';
  draft.requiresConfirmation = true;
  const rule = buildRecurringRule(
    draft,
    '0198d66a-0b85-4000-8000-000000000010',
    new Date('2026-08-29T00:00:00.000Z'),
  );
  await localRecurringRuleRepository.save(rule);

  let idSequence = 0;
  const createId = () =>
    `0198d66a-0b85-4000-8000-${String(++idSequence).padStart(12, '0')}`;
  const first = await generateDueRecurringTransactions(
    localRecurringRuleRepository,
    localTransactionRepository,
    createId,
    new Date('2026-08-29T12:00:00'),
  );

  assert.deepEqual(first, { createdCount: 1, existingCount: 0 });
  const generated = await localTransactionRepository.findByRecurringOccurrence(
    rule.id,
    rule.startDate,
  );
  assert.equal(generated?.transaction.status, 'needs_confirmation');
  assert.equal(generated?.transaction.totalAmount, 700000);

  const advancedRule = await localRecurringRuleRepository.findById(rule.id);
  assert.ok(advancedRule);
  await localRecurringRuleRepository.save({
    ...advancedRule,
    nextScheduledDate: rule.startDate,
  });

  const second = await generateDueRecurringTransactions(
    localRecurringRuleRepository,
    localTransactionRepository,
    createId,
    new Date('2026-08-29T12:00:00'),
  );
  assert.deepEqual(second, { createdCount: 0, existingCount: 1 });

  const occurrences = (await localTransactionRepository.list()).filter(
    ({ transaction }) =>
      transaction.recurringRuleId === rule.id &&
      transaction.scheduledDate === rule.startDate,
  );
  assert.equal(occurrences.length, 1);
});
