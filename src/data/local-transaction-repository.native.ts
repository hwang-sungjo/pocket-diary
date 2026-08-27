import { getNativeDatabase } from '@/data/native-database';
import type { TransactionRepository } from '@/data/transaction-repository';
import {
  assertValidTransactionAggregate,
  type Transaction,
  type TransactionAggregate,
  type TransactionItem,
  type TransactionType,
} from '@/domain/transaction';

interface TransactionRow {
  id: string;
  type: TransactionType;
  name: string;
  total_amount: number;
  occurred_at: string;
  category_id: string;
  merchant_id: string | null;
  payment_method: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

interface TransactionItemRow {
  id: string;
  transaction_id: string;
  product_id: string;
  category_id: string | null;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  specification: string | null;
  memo: string | null;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    totalAmount: row.total_amount,
    occurredAt: row.occurred_at,
    categoryId: row.category_id,
    merchantId: row.merchant_id,
    paymentMethod: row.payment_method,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTransactionItem(row: TransactionItemRow): TransactionItem {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    productId: row.product_id,
    categoryId: row.category_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    specification: row.specification,
    memo: row.memo,
  };
}

class SQLiteTransactionRepository implements TransactionRepository {
  async save(aggregate: TransactionAggregate): Promise<void> {
    assertValidTransactionAggregate(aggregate);
    const database = await getNativeDatabase();
    const transaction = aggregate.transaction;

    await database.withTransactionAsync(async () => {
      await database.runAsync(
        `INSERT INTO transactions (
          id, type, name, total_amount, occurred_at, category_id, merchant_id,
          payment_method, memo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          name = excluded.name,
          total_amount = excluded.total_amount,
          occurred_at = excluded.occurred_at,
          category_id = excluded.category_id,
          merchant_id = excluded.merchant_id,
          payment_method = excluded.payment_method,
          memo = excluded.memo,
          updated_at = excluded.updated_at`,
        transaction.id,
        transaction.type,
        transaction.name,
        transaction.totalAmount,
        transaction.occurredAt,
        transaction.categoryId,
        transaction.merchantId,
        transaction.paymentMethod,
        transaction.memo,
        transaction.createdAt,
        transaction.updatedAt,
      );

      await database.runAsync(
        'DELETE FROM transaction_items WHERE transaction_id = ?',
        transaction.id,
      );

      for (const item of aggregate.items) {
        await database.runAsync(
          `INSERT INTO transaction_items (
            id, transaction_id, product_id, category_id, quantity, unit_price,
            total_price, specification, memo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          item.id,
          item.transactionId,
          item.productId,
          item.categoryId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.specification,
          item.memo,
        );
      }
    });
  }

  async findById(id: string): Promise<TransactionAggregate | null> {
    const database = await getNativeDatabase();
    const row = await database.getFirstAsync<TransactionRow>(
      'SELECT * FROM transactions WHERE id = ?',
      id,
    );

    if (!row) {
      return null;
    }

    const itemRows = await database.getAllAsync<TransactionItemRow>(
      'SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY rowid',
      id,
    );

    return {
      transaction: toTransaction(row),
      items: itemRows.map(toTransactionItem),
    };
  }

  async list(): Promise<TransactionAggregate[]> {
    const database = await getNativeDatabase();
    const rows = await database.getAllAsync<TransactionRow>(
      'SELECT * FROM transactions ORDER BY occurred_at DESC',
    );

    return Promise.all(rows.map(({ id }) => this.findById(id))).then(
      (aggregates) =>
        aggregates.filter(
          (aggregate): aggregate is TransactionAggregate => aggregate !== null,
        ),
    );
  }
}

export const localTransactionRepository: TransactionRepository =
  new SQLiteTransactionRepository();
