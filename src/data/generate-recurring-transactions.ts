import type { RecurringRuleRepository } from '@/data/recurring-rule-repository';
import type { TransactionRepository } from '@/data/transaction-repository';
import { getNextScheduledDate } from '@/domain/recurring-rule';
import type { TransactionAggregate } from '@/domain/transaction';
import { formatLocalDate } from '@/domain/transaction-draft';

export interface GenerateRecurringTransactionsResult {
  createdCount: number;
  existingCount: number;
}

export async function generateDueRecurringTransactions(
  recurringRuleRepository: RecurringRuleRepository,
  transactionRepository: TransactionRepository,
  createId: () => string,
  now = new Date(),
): Promise<GenerateRecurringTransactionsResult> {
  const today = formatLocalDate(now);
  const rules = await recurringRuleRepository.list();
  let createdCount = 0;
  let existingCount = 0;

  for (const rule of rules.filter(({ isActive }) => isActive)) {
    let scheduledDate = rule.nextScheduledDate;
    let processedCount = 0;

    while (
      scheduledDate <= today &&
      (!rule.endDate || scheduledDate <= rule.endDate)
    ) {
      const existing = await transactionRepository.findByRecurringOccurrence(
        rule.id,
        scheduledDate,
      );

      if (existing) {
        existingCount += 1;
      } else {
        const timestamp = now.toISOString();
        const aggregate: TransactionAggregate = {
          transaction: {
            id: createId(),
            type: rule.type,
            name: rule.name,
            totalAmount: rule.totalAmount,
            occurredAt: new Date(
              `${scheduledDate}T${rule.scheduledTime}:00`,
            ).toISOString(),
            categoryId: rule.categoryId,
            merchantId: null,
            merchantName: null,
            paymentMethod: null,
            memo: null,
            status: rule.requiresConfirmation
              ? 'needs_confirmation'
              : 'confirmed',
            recurringRuleId: rule.id,
            scheduledDate,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          items: [],
        };

        try {
          await transactionRepository.save(aggregate);
          createdCount += 1;
        } catch (cause) {
          const concurrentlyCreated =
            await transactionRepository.findByRecurringOccurrence(
              rule.id,
              scheduledDate,
            );
          if (!concurrentlyCreated) {
            throw cause;
          }
          existingCount += 1;
        }
      }

      scheduledDate = getNextScheduledDate(rule, scheduledDate);
      processedCount += 1;
      if (processedCount > 1000) {
        throw new Error('반복 거래 생성 범위가 너무 큽니다.');
      }
    }

    const ended = Boolean(rule.endDate && scheduledDate > rule.endDate);
    if (
      scheduledDate !== rule.nextScheduledDate ||
      (ended && rule.isActive)
    ) {
      await recurringRuleRepository.save({
        ...rule,
        nextScheduledDate: scheduledDate,
        isActive: ended ? false : rule.isActive,
        updatedAt: now.toISOString(),
      });
    }
  }

  return { createdCount, existingCount };
}
