import type { RecurringRule } from '@/domain/recurring-rule';

export interface RecurringRuleRepository {
  findById(id: string): Promise<RecurringRule | null>;
  list(): Promise<RecurringRule[]>;
  save(rule: RecurringRule): Promise<void>;
}
