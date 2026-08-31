import { isValidISODate } from '@/domain/input-values';

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'confirmed' | 'needs_confirmation';

export interface Transaction {
  id: string;
  type: TransactionType;
  name: string;
  totalAmount: number;
  occurredAt: string;
  categoryId: string;
  merchantId: string | null;
  merchantName: string | null;
  paymentMethod: string | null;
  memo: string | null;
  status: TransactionStatus;
  recurringRuleId: string | null;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
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

const DAY_ONE_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000001';

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
      merchantName: null,
      paymentMethod: null,
      memo: 'iPhone 및 Web 저장 방식 기술 검증용',
      status: 'confirmed',
      recurringRuleId: null,
      scheduledDate: null,
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

  if (
    !Number.isSafeInteger(transaction.totalAmount) ||
    transaction.totalAmount <= 0
  ) {
    throw new Error('거래 총액은 0보다 큰 정수 원화여야 합니다.');
  }

  if (
    transaction.status !== 'confirmed' &&
    transaction.status !== 'needs_confirmation'
  ) {
    throw new Error('올바르지 않은 거래 상태입니다.');
  }

  if (
    (transaction.recurringRuleId === null) !==
    (transaction.scheduledDate === null)
  ) {
    throw new Error('반복 거래의 규칙 ID와 예정일은 함께 저장해야 합니다.');
  }

  if (
    transaction.scheduledDate !== null &&
    !isValidISODate(transaction.scheduledDate)
  ) {
    throw new Error('반복 거래 예정일이 올바르지 않습니다.');
  }

  if (
    transaction.status === 'needs_confirmation' &&
    transaction.recurringRuleId === null
  ) {
    throw new Error('금액 확인 필요 상태는 반복 거래에만 사용할 수 있습니다.');
  }

  for (const item of items) {
    if (item.transactionId !== transaction.id) {
      throw new Error('상세 품목은 저장 대상 거래에 속해야 합니다.');
    }

    if (!item.productName.trim()) {
      throw new Error('품목명은 필수입니다.');
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error('품목 수량은 0보다 커야 합니다.');
    }

    if (!Number.isSafeInteger(item.totalPrice) || item.totalPrice <= 0) {
      throw new Error('품목 합계는 0보다 큰 정수 원화여야 합니다.');
    }

    if (
      item.unitPrice !== null &&
      (!Number.isSafeInteger(item.unitPrice) || item.unitPrice <= 0)
    ) {
      throw new Error('품목 단가는 0보다 큰 정수 원화여야 합니다.');
    }
  }
}

export function calculateItemTotal(items: readonly TransactionItem[]): number {
  return items.reduce((total, item) => total + item.totalPrice, 0);
}

export function calculateUnclassifiedAmount(
  aggregate: TransactionAggregate,
): number {
  return aggregate.transaction.totalAmount - calculateItemTotal(aggregate.items);
}
