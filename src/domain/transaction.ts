export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  name: string;
  totalAmount: number;
  occurredAt: string;
  categoryId: string;
  merchantId: string | null;
  paymentMethod: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  specification: string | null;
  memo: string | null;
}

export interface TransactionAggregate {
  transaction: Transaction;
  items: TransactionItem[];
}

export const DAY_ONE_TEST_TRANSACTION_ID =
  '0198d66a-0b80-7000-8000-000000000001';

const DAY_ONE_CATEGORY_ID = '0198d66a-0b80-7000-8000-000000000002';

export function createDayOneTestTransaction(
  now = new Date(),
): TransactionAggregate {
  const timestamp = now.toISOString();

  return {
    transaction: {
      id: DAY_ONE_TEST_TRANSACTION_ID,
      type: 'expense',
      name: 'Day 1 로컬 저장 테스트',
      totalAmount: 12500,
      occurredAt: timestamp,
      categoryId: DAY_ONE_CATEGORY_ID,
      merchantId: null,
      paymentMethod: null,
      memo: 'iPhone 및 Web 저장 방식 기술 검증용',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    items: [],
  };
}

export function assertValidTransactionAggregate(
  aggregate: TransactionAggregate,
): void {
  const { transaction, items } = aggregate;

  if (!transaction.name.trim()) {
    throw new Error('거래명은 필수입니다.');
  }

  if (!Number.isInteger(transaction.totalAmount) || transaction.totalAmount <= 0) {
    throw new Error('거래 총액은 0보다 큰 정수 원화여야 합니다.');
  }

  for (const item of items) {
    if (item.transactionId !== transaction.id) {
      throw new Error('상세 품목은 저장 대상 거래에 속해야 합니다.');
    }

    if (!Number.isInteger(item.totalPrice)) {
      throw new Error('품목 합계는 정수 원화여야 합니다.');
    }

    if (item.unitPrice !== null && !Number.isInteger(item.unitPrice)) {
      throw new Error('품목 단가는 정수 원화여야 합니다.');
    }
  }
}

