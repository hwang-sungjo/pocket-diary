import { isValidISODate } from '@/domain/input-values';
import {
  assertValidTransactionAggregate,
  type TransactionAggregate,
  type TransactionType,
} from '@/domain/transaction';

export interface TransactionItemDraft {
  id: string;
  productId: string;
  productName: string;
  categoryId: string | null;
  quantity: string;
  unitPrice: number | null;
  totalPrice: number | null;
  specification: string;
  memo: string;
}

export interface TransactionDraft {
  type: TransactionType;
  name: string;
  totalAmount: number | null;
  date: string;
  time: string;
  categoryId: string;
  merchantId: string | null;
  merchantName: string;
  paymentMethod: string | null;
  memo: string;
  items: TransactionItemDraft[];
}

export function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function isValidTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(
    match && Number(match[1]) <= 23 && Number(match[2]) <= 59,
  );
}

export function createTransactionDraft(now = new Date()): TransactionDraft {
  return {
    type: 'expense',
    name: '',
    totalAmount: null,
    date: formatLocalDate(now),
    time: formatLocalTime(now),
    categoryId: '',
    merchantId: null,
    merchantName: '',
    paymentMethod: null,
    memo: '',
    items: [],
  };
}

export function createTransactionItemDraft(
  id: string,
  productId: string,
): TransactionItemDraft {
  return {
    id,
    productId,
    productName: '',
    categoryId: null,
    quantity: '1',
    unitPrice: null,
    totalPrice: null,
    specification: '',
    memo: '',
  };
}

export function calculateDraftItemTotal(
  items: readonly TransactionItemDraft[],
): number {
  return items.reduce((total, item) => total + (item.totalPrice ?? 0), 0);
}

export function calculateDraftUnclassifiedAmount(
  draft: TransactionDraft,
): number | null {
  return draft.totalAmount === null
    ? null
    : draft.totalAmount - calculateDraftItemTotal(draft.items);
}

export function getTransactionDraftErrors(draft: TransactionDraft): string[] {
  const errors: string[] = [];

  if (!draft.name.trim()) {
    errors.push('거래명을 입력해 주세요.');
  }

  if (
    draft.totalAmount === null ||
    !Number.isInteger(draft.totalAmount) ||
    draft.totalAmount <= 0
  ) {
    errors.push('총금액은 0보다 큰 정수 원화로 입력해 주세요.');
  }

  if (!isValidISODate(draft.date) || !isValidTime(draft.time)) {
    errors.push('올바른 거래 날짜와 시간을 입력해 주세요.');
  }

  if (!draft.categoryId) {
    errors.push('거래 카테고리를 선택해 주세요.');
  }

  draft.items.forEach((item, index) => {
    const label = `품목 ${index + 1}`;
    const quantity = Number(item.quantity);

    if (!item.productName.trim()) {
      errors.push(`${label}의 제품명을 입력해 주세요.`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`${label}의 수량은 0보다 커야 합니다.`);
    }

    if (
      item.totalPrice === null ||
      !Number.isInteger(item.totalPrice) ||
      item.totalPrice <= 0
    ) {
      errors.push(`${label}의 합계는 0보다 큰 정수 원화여야 합니다.`);
    }

    if (
      item.unitPrice !== null &&
      (!Number.isInteger(item.unitPrice) || item.unitPrice <= 0)
    ) {
      errors.push(`${label}의 단가는 0보다 큰 정수 원화여야 합니다.`);
    }
  });

  return errors;
}

export function buildTransactionAggregate(
  draft: TransactionDraft,
  transactionId: string,
  now = new Date(),
): TransactionAggregate {
  const errors = getTransactionDraftErrors(draft);

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  const timestamp = now.toISOString();
  const occurredAt = new Date(`${draft.date}T${draft.time}:00`).toISOString();
  const merchantName = draft.merchantName.trim();
  const aggregate: TransactionAggregate = {
    transaction: {
      id: transactionId,
      type: draft.type,
      name: draft.name.trim(),
      totalAmount: draft.totalAmount as number,
      occurredAt,
      categoryId: draft.categoryId,
      merchantId: merchantName ? draft.merchantId : null,
      merchantName: merchantName || null,
      paymentMethod: draft.paymentMethod,
      memo: draft.memo.trim() || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    items: draft.items.map((item) => ({
      id: item.id,
      transactionId,
      productId: item.productId,
      productName: item.productName.trim(),
      categoryId: item.categoryId,
      quantity: Number(item.quantity),
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice as number,
      specification: item.specification.trim() || null,
      memo: item.memo.trim() || null,
    })),
  };

  assertValidTransactionAggregate(aggregate);
  return aggregate;
}
