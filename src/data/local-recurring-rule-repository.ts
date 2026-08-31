import type { RecurringRuleRepository } from '@/data/recurring-rule-repository';
import { getWebDatabase } from '@/data/web-database';
import type { RecurringRule } from '@/domain/recurring-rule';

class IndexedDbRecurringRuleRepository implements RecurringRuleRepository {
  async findById(id: string): Promise<RecurringRule | null> {
    const database = await getWebDatabase();
    return (await database.get('recurringRules', id)) ?? null;
  }

  async list(): Promise<RecurringRule[]> {
    const database = await getWebDatabase();
    const rules = await database.getAll('recurringRules');
    return rules.sort(
      (left, right) =>
        Number(right.isActive) - Number(left.isActive) ||
        left.nextScheduledDate.localeCompare(right.nextScheduledDate) ||
        left.name.localeCompare(right.name, 'ko'),
    );
  }

  async save(rule: RecurringRule): Promise<void> {
    const database = await getWebDatabase();
    await database.put('recurringRules', rule);
  }
}

export const localRecurringRuleRepository: RecurringRuleRepository =
  new IndexedDbRecurringRuleRepository();
