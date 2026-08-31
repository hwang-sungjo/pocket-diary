import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import { DEFAULT_CATEGORIES, type Category, type CategoryType } from '@/domain/category';
import type { RecurringRule } from '@/domain/recurring-rule';
import type {
  Transaction,
  TransactionItem,
  TransactionStatus,
} from '@/domain/transaction';

export interface MerchantRecord {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecord extends MerchantRecord {
  specification: string | null;
}

export type StoredTransaction = Omit<
  Transaction,
  'merchantName' | 'status' | 'recurringRuleId' | 'scheduledDate'
> & {
  merchantName?: string | null;
  status?: TransactionStatus;
  recurringRuleId?: string | null;
  scheduledDate?: string | null;
};

export type StoredTransactionItem = Omit<TransactionItem, 'productName'> & {
  productName?: string;
};

export interface PocketDiaryDatabase extends DBSchema {
  transactions: {
    key: string;
    value: StoredTransaction;
    indexes: {
      'by-occurred-at': string;
      'by-recurring-occurrence': [string, string];
    };
  };
  transactionItems: {
    key: string;
    value: StoredTransactionItem;
    indexes: { 'by-transaction-id': string };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-type': CategoryType };
  };
  merchants: {
    key: string;
    value: MerchantRecord;
    indexes: { 'by-normalized-name': string };
  };
  products: {
    key: string;
    value: ProductRecord;
    indexes: { 'by-normalized-name': string };
  };
  recurringRules: {
    key: string;
    value: RecurringRule;
  };
}

let databasePromise: Promise<IDBPDatabase<PocketDiaryDatabase>> | undefined;

export function getWebDatabase(): Promise<IDBPDatabase<PocketDiaryDatabase>> {
  if (typeof globalThis.indexedDB === 'undefined') {
    throw new Error('이 브라우저에서는 IndexedDB를 사용할 수 없습니다.');
  }

  databasePromise ??= openDB<PocketDiaryDatabase>('pocket-diary', 5, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        const transactions = database.createObjectStore('transactions', {
          keyPath: 'id',
        });
        transactions.createIndex('by-occurred-at', 'occurredAt');

        const items = database.createObjectStore('transactionItems', {
          keyPath: 'id',
        });
        items.createIndex('by-transaction-id', 'transactionId');
      }

      if (oldVersion < 2) {
        const categories = database.createObjectStore('categories', {
          keyPath: 'id',
        });
        categories.createIndex('by-type', 'type');

        for (const category of DEFAULT_CATEGORIES) {
          void transaction.objectStore('categories').put(category);
        }
      }

      if (oldVersion < 3) {
        const merchants = database.createObjectStore('merchants', {
          keyPath: 'id',
        });
        merchants.createIndex('by-normalized-name', 'normalizedName');

        const products = database.createObjectStore('products', {
          keyPath: 'id',
        });
        products.createIndex('by-normalized-name', 'normalizedName');
      }

      if (oldVersion < 5) {
        transaction.objectStore('transactions').createIndex(
          'by-recurring-occurrence',
          ['recurringRuleId', 'scheduledDate'],
          { unique: true },
        );
        database.createObjectStore('recurringRules', { keyPath: 'id' });
      }
    },
  });

  return databasePromise;
}
