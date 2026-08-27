import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import { DEFAULT_CATEGORIES, type Category, type CategoryType } from '@/domain/category';
import type { Transaction, TransactionItem } from '@/domain/transaction';

export interface PocketDiaryDatabase extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-occurred-at': string };
  };
  transactionItems: {
    key: string;
    value: TransactionItem;
    indexes: { 'by-transaction-id': string };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-type': CategoryType };
  };
}

let databasePromise: Promise<IDBPDatabase<PocketDiaryDatabase>> | undefined;

export function getWebDatabase(): Promise<IDBPDatabase<PocketDiaryDatabase>> {
  if (typeof globalThis.indexedDB === 'undefined') {
    throw new Error('이 브라우저에서는 IndexedDB를 사용할 수 없습니다.');
  }

  databasePromise ??= openDB<PocketDiaryDatabase>('pocket-diary', 2, {
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
    },
  });

  return databasePromise;
}
