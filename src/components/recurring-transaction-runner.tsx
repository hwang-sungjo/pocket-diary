import { useEffect } from 'react';

import { ensureDueRecurringTransactions } from '@/data/ensure-due-recurring-transactions';

export function RecurringTransactionRunner() {
  useEffect(() => {
    void ensureDueRecurringTransactions().catch((cause: unknown) => {
      console.error('반복 거래 자동 생성에 실패했습니다.', cause);
    });
  }, []);

  return null;
}
