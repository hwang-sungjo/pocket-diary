import { randomUUID } from 'expo-crypto';

import { generateDueRecurringTransactions, type GenerateRecurringTransactionsResult } from '@/data/generate-recurring-transactions';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';

let inFlight: Promise<GenerateRecurringTransactionsResult> | null = null;

export function ensureDueRecurringTransactions(): Promise<GenerateRecurringTransactionsResult> {
  inFlight ??= generateDueRecurringTransactions(
    localRecurringRuleRepository,
    localTransactionRepository,
    randomUUID,
  ).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
