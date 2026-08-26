import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { TransactionRepository } from '@/data/transaction-repository';
import {
  assertValidTransactionAggregate,
  type Transaction,
  type TransactionAggregate,
  type TransactionItem,
} from '@/domain/transaction';

interface PocketDiaryDatabase extends DBSchema {
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
}

let databasePromise: Promise<IDBPDatabase<PocketDiaryDatabase>> | undefined;

function getDatabase(): Promise<IDBPDatabase<PocketDiaryDatabase>> {
  if (typeof globalThis.indexedDB === 'undefined') {
    throw new Error('이 브라우저에서는 IndexedDB를 사용할 수 없습니다.');
  }

  databasePromise ??= openDB<PocketDiaryDatabase>('pocket-diary', 1, {
    upgrade(database) {
      const transactions = database.createObjectStore('transactions', {
        keyPath: 'id',
      });
      transactions.createIndex('by-occurred-at', 'occurredAt');

      const items = database.createObjectStore('transactionItems', {
        keyPath: 'id',
      });
      items.createIndex('by-transaction-id', 'transactionId');
    },
  });

  return databasePromise;
}

class IndexedDbTransactionRepository implements TransactionRepository {
  async save(aggregate: TransactionAggregate): Promise<void> {
    assertValidTransactionAggregate(aggregate);
    const database = await getDatabase();
    const databaseTransaction = database.transaction(
      ['transactions', 'transactionItems'],
      'readwrite',
    );
    const transactions = databaseTransaction.objectStore('transactions');
    const items = databaseTransaction.objectStore('transactionItems');
    const oldItemKeys = await items
      .index('by-transaction-id')
      .getAllKeys(aggregate.transaction.id);

    await transactions.put(aggregate.transaction);

    await Promise.all(oldItemKeys.map((key) => items.delete(key)));
    await Promise.all(aggregate.items.map((item) => items.put(item)));
    await databaseTransaction.done;
  }

  async findById(id: string): Promise<TransactionAggregate | null> {
    const database = await getDatabase();
    const databaseTransaction = database.transaction(
      ['transactions', 'transactionItems'],
      'readonly',
    );
    const transaction = await databaseTransaction
      .objectStore('transactions')
      .get(id);

    if (transaction === undefined) {
      return null;
    }

    const items = await databaseTransaction
      .objectStore('transactionItems')
      .index('by-transaction-id')
      .getAll(id);
    await databaseTransaction.done;

    return { transaction, items };
  }

  async list(): Promise<TransactionAggregate[]> {
    const database = await getDatabase();
    const transactions = await database.getAll('transactions');
    const aggregates = await Promise.all(
      transactions.map(({ id }) => this.findById(id)),
    );

    return aggregates
      .filter(
        (aggregate): aggregate is TransactionAggregate => aggregate !== null,
      )
      .sort((left, right) =>
        right.transaction.occurredAt.localeCompare(left.transaction.occurredAt),
      );
  }
}

export const localTransactionRepository: TransactionRepository =
  new IndexedDbTransactionRepository();
