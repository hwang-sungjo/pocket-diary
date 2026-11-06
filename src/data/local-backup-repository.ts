import { localCategoryRepository } from '@/data/local-category-repository';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import { getWebDatabase } from '@/data/web-database';
import { normalizeLookupValue } from '@/domain/autocomplete';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  validateLocalBackup,
  type LocalBackup,
} from '@/domain/local-backup';

export interface LocalBackupRepository {
  exportData(): Promise<LocalBackup>;
  replaceData(backup: LocalBackup): Promise<void>;
}

class IndexedDbBackupRepository implements LocalBackupRepository {
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
    const database = await getWebDatabase();
    const transaction = database.transaction(
      ['transactionItems', 'transactions', 'recurringRules', 'categories', 'merchants', 'products'],
      'readwrite',
    );
    try {
      for (const name of ['transactionItems', 'transactions', 'recurringRules', 'categories', 'merchants', 'products'] as const) {
        await transaction.objectStore(name).clear();
      }
      for (const category of safe.categories) {
        await transaction.objectStore('categories').put(category);
      }
      for (const rule of safe.recurringRules) {
        await transaction.objectStore('recurringRules').put(rule);
      }
      for (const { transaction: saved, items } of safe.transactions) {
        await transaction.objectStore('transactions').put(saved);
        if (saved.merchantId && saved.merchantName) {
          await transaction.objectStore('merchants').put({
            id: saved.merchantId,
            name: saved.merchantName,
            normalizedName: normalizeLookupValue(saved.merchantName),
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt,
          });
        }
        for (const item of items) {
          await transaction.objectStore('transactionItems').put(item);
          await transaction.objectStore('products').put({
            id: item.productId,
            name: item.productName,
            normalizedName: normalizeLookupValue(item.productName),
            specification: item.specification,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt,
          });
        }
      }
      await transaction.done;
    } catch (cause) {
      try {
        transaction.abort();
      } catch {
        // A failed IndexedDB request may have already aborted the transaction.
      }
      throw cause;
    }
  }
}

export const localBackupRepository: LocalBackupRepository =
  new IndexedDbBackupRepository();
