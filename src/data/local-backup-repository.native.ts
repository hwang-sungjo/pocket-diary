import { localCategoryRepository } from '@/data/local-category-repository';
import type { LocalBackupRepository } from '@/data/local-backup-repository';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import { getNativeDatabase } from '@/data/native-database';
import { normalizeLookupValue } from '@/domain/autocomplete';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  validateLocalBackup,
  type LocalBackup,
} from '@/domain/local-backup';

class SQLiteBackupRepository implements LocalBackupRepository {
  async exportData(): Promise<LocalBackup> {
    const [categories, recurringRules, transactions] = await Promise.all([
      localCategoryRepository.list({ includeInactive: true }),
      localRecurringRuleRepository.list(),
      localTransactionRepository.list(),
    ]);
    return validateLocalBackup({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      categories,
      recurringRules,
      transactions,
    });
  }

  async replaceData(backup: LocalBackup): Promise<void> {
    const safe = validateLocalBackup(backup);
    const database = await getNativeDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        DELETE FROM transaction_items;
        DELETE FROM transactions;
        DELETE FROM recurring_rules;
        DELETE FROM categories;
        DELETE FROM merchants;
        DELETE FROM products;
      `);

      for (const category of safe.categories) {
        await transaction.runAsync(
          `INSERT INTO categories (
            id, type, name, sort_order, is_default, is_active,
            created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          category.id,
          category.type,
          category.name,
          category.sortOrder,
          category.isDefault ? 1 : 0,
          category.isActive ? 1 : 0,
          category.createdAt,
          category.updatedAt,
          category.deletedAt,
        );
      }

      for (const rule of safe.recurringRules) {
        await transaction.runAsync(
          `INSERT INTO recurring_rules (
            id, type, name, total_amount, category_id, frequency, interval,
            start_date, end_date, scheduled_time, next_scheduled_date,
            requires_confirmation, notification_enabled, is_active,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

      for (const { transaction: saved, items } of safe.transactions) {
        if (saved.merchantId && saved.merchantName) {
          await transaction.runAsync(
            `INSERT INTO merchants (
              id, name, normalized_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              normalized_name = excluded.normalized_name,
              updated_at = excluded.updated_at`,
            saved.merchantId,
            saved.merchantName,
            normalizeLookupValue(saved.merchantName),
            saved.createdAt,
            saved.updatedAt,
          );
        }

        await transaction.runAsync(
          `INSERT INTO transactions (
            id, type, name, total_amount, occurred_at, category_id,
            merchant_id, merchant_name, payment_method, memo, status,
            recurring_rule_id, scheduled_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          saved.id,
          saved.type,
          saved.name,
          saved.totalAmount,
          saved.occurredAt,
          saved.categoryId,
          saved.merchantId,
          saved.merchantName,
          saved.paymentMethod,
          saved.memo,
          saved.status,
          saved.recurringRuleId,
          saved.scheduledDate,
          saved.createdAt,
          saved.updatedAt,
        );

        for (const item of items) {
          await transaction.runAsync(
            `INSERT INTO products (
              id, name, normalized_name, specification, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              normalized_name = excluded.normalized_name,
              specification = excluded.specification,
              updated_at = excluded.updated_at`,
            item.productId,
            item.productName,
            normalizeLookupValue(item.productName),
            item.specification,
            saved.createdAt,
            saved.updatedAt,
          );
          await transaction.runAsync(
            `INSERT INTO transaction_items (
              id, transaction_id, product_id, product_name, category_id,
              quantity, unit_price, total_price, specification, memo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            item.id,
            item.transactionId,
            item.productId,
            item.productName,
            item.categoryId,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            item.specification,
            item.memo,
          );
        }
      }
    });
  }
}

export const localBackupRepository: LocalBackupRepository =
  new SQLiteBackupRepository();
