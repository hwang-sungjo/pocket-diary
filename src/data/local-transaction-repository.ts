import type { TransactionRepository } from '@/data/transaction-repository';
import { getWebDatabase } from '@/data/web-database';
import { normalizeLookupValue } from '@/domain/autocomplete';
import {
  assertValidTransactionAggregate,
  type Transaction,
  type TransactionAggregate,
  type TransactionItem,
} from '@/domain/transaction';

class IndexedDbTransactionRepository implements TransactionRepository {
  async save(aggregate: TransactionAggregate): Promise<void> {
    assertValidTransactionAggregate(aggregate);
    const database = await getWebDatabase();
    const databaseTransaction = database.transaction(
      ['transactions', 'transactionItems', 'merchants', 'products'],
      'readwrite',
    );
    const transactions = databaseTransaction.objectStore('transactions');
    const items = databaseTransaction.objectStore('transactionItems');
    const merchants = databaseTransaction.objectStore('merchants');
    const products = databaseTransaction.objectStore('products');
    const oldItemKeys = await items
      .index('by-transaction-id')
      .getAllKeys(aggregate.transaction.id);

    if (aggregate.transaction.merchantId && aggregate.transaction.merchantName) {
      await merchants.put({
        id: aggregate.transaction.merchantId,
        name: aggregate.transaction.merchantName,
        normalizedName: normalizeLookupValue(aggregate.transaction.merchantName),
        createdAt: aggregate.transaction.createdAt,
        updatedAt: aggregate.transaction.updatedAt,
      });
    }

    await transactions.put(aggregate.transaction);

    await Promise.all(oldItemKeys.map((key) => items.delete(key)));
    await Promise.all(
      aggregate.items.map(async (item) => {
        await products.put({
          id: item.productId,
          name: item.productName,
          normalizedName: normalizeLookupValue(item.productName),
          specification: item.specification,
          createdAt: aggregate.transaction.createdAt,
          updatedAt: aggregate.transaction.updatedAt,
        });
        await items.put(item);
      }),
    );
    await databaseTransaction.done;
  }

  async findById(id: string): Promise<TransactionAggregate | null> {
    const database = await getWebDatabase();
    const databaseTransaction = database.transaction(
      ['transactions', 'transactionItems'],
      'readonly',
    );
    const storedTransaction = await databaseTransaction
      .objectStore('transactions')
      .get(id);

    if (storedTransaction === undefined) {
      return null;
    }

    const storedItems = await databaseTransaction
      .objectStore('transactionItems')
      .index('by-transaction-id')
      .getAll(id);
    await databaseTransaction.done;

    const transaction: Transaction = {
      ...storedTransaction,
      merchantName: storedTransaction.merchantName ?? null,
      status: storedTransaction.status ?? 'confirmed',
      recurringRuleId: storedTransaction.recurringRuleId ?? null,
      scheduledDate: storedTransaction.scheduledDate ?? null,
    };
    const items: TransactionItem[] = storedItems.map((item) => ({
      ...item,
      productName: item.productName ?? '',
    }));

    return { transaction, items };
  }

  async findByRecurringOccurrence(
    recurringRuleId: string,
    scheduledDate: string,
  ): Promise<TransactionAggregate | null> {
    const database = await getWebDatabase();
    const storedTransaction = await database.getFromIndex(
      'transactions',
      'by-recurring-occurrence',
      [recurringRuleId, scheduledDate],
    );
    return storedTransaction
      ? this.findById(storedTransaction.id)
      : null;
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

  async delete(id: string): Promise<void> {
    const database = await getWebDatabase();
    const databaseTransaction = database.transaction(
      ['transactions', 'transactionItems'],
      'readwrite',
    );
    const items = databaseTransaction.objectStore('transactionItems');
    const itemKeys = await items.index('by-transaction-id').getAllKeys(id);

    await Promise.all(itemKeys.map((key) => items.delete(key)));
    await databaseTransaction.objectStore('transactions').delete(id);
    await databaseTransaction.done;
  }
}

export const localTransactionRepository: TransactionRepository =
  new IndexedDbTransactionRepository();
