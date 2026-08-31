import type { RecurringRuleRepository } from '@/data/recurring-rule-repository';
import { getNativeDatabase } from '@/data/native-database';
import type {
  RecurringFrequency,
  RecurringRule,
} from '@/domain/recurring-rule';
import type { TransactionType } from '@/domain/transaction';

interface RecurringRuleRow {
  id: string;
  type: TransactionType;
  name: string;
  total_amount: number;
  category_id: string;
  frequency: RecurringFrequency;
  interval: number;
  start_date: string;
  end_date: string | null;
  scheduled_time: string;
  next_scheduled_date: string;
  requires_confirmation: number;
  notification_enabled: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function toRecurringRule(row: RecurringRuleRow): RecurringRule {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    totalAmount: row.total_amount,
    categoryId: row.category_id,
    frequency: row.frequency,
    interval: row.interval,
    startDate: row.start_date,
    endDate: row.end_date,
    scheduledTime: row.scheduled_time,
    nextScheduledDate: row.next_scheduled_date,
    requiresConfirmation: row.requires_confirmation === 1,
    notificationEnabled: row.notification_enabled === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SQLiteRecurringRuleRepository implements RecurringRuleRepository {
  async findById(id: string): Promise<RecurringRule | null> {
    const database = await getNativeDatabase();
    const row = await database.getFirstAsync<RecurringRuleRow>(
      'SELECT * FROM recurring_rules WHERE id = ?',
      id,
    );
    return row ? toRecurringRule(row) : null;
  }

  async list(): Promise<RecurringRule[]> {
    const database = await getNativeDatabase();
    const rows = await database.getAllAsync<RecurringRuleRow>(
      `SELECT * FROM recurring_rules
       ORDER BY is_active DESC, next_scheduled_date, name`,
    );
    return rows.map(toRecurringRule);
  }

  async save(rule: RecurringRule): Promise<void> {
    const database = await getNativeDatabase();
    await database.runAsync(
      `INSERT INTO recurring_rules (
        id, type, name, total_amount, category_id, frequency, interval,
        start_date, end_date, scheduled_time, next_scheduled_date,
        requires_confirmation, notification_enabled, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        total_amount = excluded.total_amount,
        category_id = excluded.category_id,
        frequency = excluded.frequency,
        interval = excluded.interval,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        scheduled_time = excluded.scheduled_time,
        next_scheduled_date = excluded.next_scheduled_date,
        requires_confirmation = excluded.requires_confirmation,
        notification_enabled = excluded.notification_enabled,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at`,
      rule.id,
      rule.type,
      rule.name,
      rule.totalAmount,
      rule.categoryId,
      rule.frequency,
      rule.interval,
      rule.startDate,
      rule.endDate,
      rule.scheduledTime,
      rule.nextScheduledDate,
      rule.requiresConfirmation ? 1 : 0,
      rule.notificationEnabled ? 1 : 0,
      rule.isActive ? 1 : 0,
      rule.createdAt,
      rule.updatedAt,
    );
  }
}

export const localRecurringRuleRepository: RecurringRuleRepository =
  new SQLiteRecurringRuleRepository();
