import type { TransactionRepository } from '@/data/transaction-repository';
import { getWebDatabase } from '@/data/web-database';
import {
  assertValidTransactionAggregate,
  type TransactionAggregate,
} from '@/domain/transaction';

class IndexedDbTransactionRepository implements TransactionRepository {
  async save(aggregate: TransactionAggregate): Promise<void> {
    assertValidTransactionAggregate(aggregate);
    const database = await getWebDatabase();
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
    const database = await getWebDatabase();
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
    const database = await getWebDatabase();
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
