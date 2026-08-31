import { randomUUID } from 'expo-crypto';
import { useEffect } from 'react';

import { generateDueRecurringTransactions } from '@/data/generate-recurring-transactions';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';

export function RecurringTransactionRunner() {
  useEffect(() => {
    void generateDueRecurringTransactions(
      localRecurringRuleRepository,
      localTransactionRepository,
      randomUUID,
    ).catch((cause: unknown) => {
      console.error('반복 거래 자동 생성에 실패했습니다.', cause);
    });
  }, []);

  return null;
}
