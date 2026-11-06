import { DEFAULT_CATEGORIES, type Category } from '@/domain/category';
import { isValidISODate } from '@/domain/input-values';
import type { RecurringRule } from '@/domain/recurring-rule';
import {
  assertValidTransactionAggregate,
  type TransactionAggregate,
  type TransactionStatus,
  type TransactionType,
} from '@/domain/transaction';

export const BACKUP_FORMAT = 'pocket-diary-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_SIZE = 25 * 1024 * 1024;

function assertBackupSize(text: string): void {
  let bytes = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    if (bytes > MAX_BACKUP_SIZE) {
      throw new Error('백업 파일이 너무 큽니다. 최대 25MB까지 사용할 수 있습니다.');
    }
  }
}

export interface LocalBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  categories: Category[];
  recurringRules: RecurringRule[];
  transactions: TransactionAggregate[];
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 목록이 올바르지 않습니다.`);
  }
  return value;
}

function string(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new Error(`${label} 값이 올바르지 않습니다.`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | null {
  return value === null ? null : string(value, label, true);
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} 값이 올바르지 않습니다.`);
  }
  return value;
}

function safeInteger(value: unknown, label: string, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${label} 값이 올바르지 않습니다.`);
  }
  return value as number;
}

function timestamp(value: unknown, label: string): string {
  const text = string(value, label);
  if (Number.isNaN(Date.parse(text)) || new Date(text).toISOString() !== text) {
    throw new Error(`${label} 날짜가 올바르지 않습니다.`);
  }
  return text;
}

function date(value: unknown, label: string): string {
  const text = string(value, label);
  if (!isValidISODate(text)) {
    throw new Error(`${label} 날짜가 올바르지 않습니다.`);
  }
  return text;
}

function transactionType(value: unknown): TransactionType {
  if (value !== 'income' && value !== 'expense') {
    throw new Error('거래 유형이 올바르지 않습니다.');
  }
  return value;
}

function transactionStatus(value: unknown): TransactionStatus {
  if (value !== 'confirmed' && value !== 'needs_confirmation') {
    throw new Error('거래 상태가 올바르지 않습니다.');
  }
  return value;
}

function parseCategory(value: unknown): Category {
  const row = object(value, '카테고리');
  return {
    id: string(row.id, '카테고리 ID'),
    type: transactionType(row.type),
    name: string(row.name, '카테고리 이름'),
    sortOrder: safeInteger(row.sortOrder, '카테고리 순서', 0),
    isDefault: boolean(row.isDefault, '기본 카테고리 여부'),
    isActive: boolean(row.isActive, '카테고리 활성 상태'),
    createdAt: timestamp(row.createdAt, '카테고리 생성'),
    updatedAt: timestamp(row.updatedAt, '카테고리 수정'),
    deletedAt: row.deletedAt === null ? null : timestamp(row.deletedAt, '카테고리 삭제'),
  };
}

function parseRule(value: unknown): RecurringRule {
  const row = object(value, '반복 규칙');
  if (
    row.frequency !== 'weekly' &&
    row.frequency !== 'monthly' &&
    row.frequency !== 'yearly' &&
    row.frequency !== 'custom'
  ) {
    throw new Error('반복 주기가 올바르지 않습니다.');
  }
  const scheduledTime = string(row.scheduledTime, '반복 시각');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) {
    throw new Error('반복 시각이 올바르지 않습니다.');
  }
  const startDate = date(row.startDate, '반복 시작');
  const endDate = row.endDate === null ? null : date(row.endDate, '반복 종료');
  const nextScheduledDate = date(row.nextScheduledDate, '다음 반복 예정');
  if (endDate !== null && endDate < startDate) {
    throw new Error('반복 종료일이 시작일보다 빠릅니다.');
  }
  return {
    id: string(row.id, '반복 규칙 ID'),
    type: transactionType(row.type),
    name: string(row.name, '반복 거래명'),
    totalAmount: safeInteger(row.totalAmount, '반복 금액', 1),
    categoryId: string(row.categoryId, '반복 카테고리 ID'),
    frequency: row.frequency,
    interval: safeInteger(row.interval, '반복 간격', 1),
    startDate,
    endDate,
    scheduledTime,
    nextScheduledDate,
    requiresConfirmation: boolean(row.requiresConfirmation, '금액 확인 여부'),
    notificationEnabled: boolean(row.notificationEnabled, '반복 알림 여부'),
    isActive: boolean(row.isActive, '반복 규칙 활성 상태'),
    createdAt: timestamp(row.createdAt, '반복 규칙 생성'),
    updatedAt: timestamp(row.updatedAt, '반복 규칙 수정'),
  };
}

function parseAggregate(value: unknown): TransactionAggregate {
  const row = object(value, '거래');
  const saved = object(row.transaction, '거래 정보');
  const transaction = {
    id: string(saved.id, '거래 ID'),
    type: transactionType(saved.type),
    name: string(saved.name, '거래명'),
    totalAmount: safeInteger(saved.totalAmount, '거래 금액', 1),
    occurredAt: timestamp(saved.occurredAt, '거래 일시'),
    categoryId: string(saved.categoryId, '거래 카테고리 ID'),
    merchantId: saved.merchantId === null ? null : string(saved.merchantId, '상점 ID'),
    merchantName: optionalString(saved.merchantName, '상점명'),
    paymentMethod: optionalString(saved.paymentMethod, '결제 수단'),
    memo: optionalString(saved.memo, '거래 메모'),
    status: transactionStatus(saved.status),
    recurringRuleId:
      saved.recurringRuleId === null ? null : string(saved.recurringRuleId, '반복 규칙 ID'),
    scheduledDate:
      saved.scheduledDate === null ? null : date(saved.scheduledDate, '반복 예정'),
    createdAt: timestamp(saved.createdAt, '거래 생성'),
    updatedAt: timestamp(saved.updatedAt, '거래 수정'),
  };
  const items = array(row.items, '품목').map((value) => {
    const item = object(value, '품목');
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('품목 수량이 올바르지 않습니다.');
    }
    return {
      id: string(item.id, '품목 ID'),
      transactionId: string(item.transactionId, '품목 거래 ID'),
      productId: string(item.productId, '제품 ID'),
      productName: string(item.productName, '제품명'),
      categoryId: item.categoryId === null ? null : string(item.categoryId, '품목 카테고리 ID'),
      quantity,
      unitPrice: item.unitPrice === null ? null : safeInteger(item.unitPrice, '품목 단가', 1),
      totalPrice: safeInteger(item.totalPrice, '품목 금액', 1),
      specification: optionalString(item.specification, '제품 규격'),
      memo: optionalString(item.memo, '품목 메모'),
    };
  });
  const aggregate: TransactionAggregate = { transaction, items };
  assertValidTransactionAggregate(aggregate);
  return aggregate;
}

function assertUnique(ids: readonly string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} ID가 중복됐습니다.`);
  }
}

export function validateLocalBackup(value: unknown): LocalBackup {
  const root = object(value, '백업 파일');
  if (root.format !== BACKUP_FORMAT || root.version !== BACKUP_VERSION) {
    throw new Error('지원하지 않는 Pocket Diary 백업 형식 또는 버전입니다.');
  }
  const categories = array(root.categories, '카테고리').map(parseCategory);
  const recurringRules = array(root.recurringRules, '반복 규칙').map(parseRule);
  const transactions = array(root.transactions, '거래').map(parseAggregate);
  assertUnique(categories.map(({ id }) => id), '카테고리');
  assertUnique(recurringRules.map(({ id }) => id), '반복 규칙');
  assertUnique(transactions.map(({ transaction }) => transaction.id), '거래');
  assertUnique(transactions.flatMap(({ items }) => items.map(({ id }) => id)), '품목');

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  for (const expected of DEFAULT_CATEGORIES) {
    const actual = categoryById.get(expected.id);
    if (!actual || actual.type !== expected.type || actual.name !== expected.name || !actual.isDefault) {
      throw new Error('필수 기본 카테고리가 백업에 없습니다.');
    }
  }
  const categoryNames = new Set<string>();
  for (const category of categories) {
    const normalizedName = category.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
    const key = `${category.type}\u0000${normalizedName}`;
    if (categoryNames.has(key)) {
      throw new Error('같은 유형의 카테고리 이름이 중복됐습니다.');
    }
    categoryNames.add(key);
  }

  const ruleById = new Map(recurringRules.map((rule) => [rule.id, rule]));
  for (const rule of recurringRules) {
    if (categoryById.get(rule.categoryId)?.type !== rule.type) {
      throw new Error('반복 규칙의 카테고리 연결이 올바르지 않습니다.');
    }
  }
  const occurrences = new Set<string>();
  for (const { transaction, items } of transactions) {
    if (categoryById.get(transaction.categoryId)?.type !== transaction.type) {
      throw new Error('거래의 카테고리 연결이 올바르지 않습니다.');
    }
    if (transaction.recurringRuleId !== null) {
      if (!ruleById.has(transaction.recurringRuleId)) {
        throw new Error('거래의 반복 규칙 연결이 올바르지 않습니다.');
      }
      const key = `${transaction.recurringRuleId}\u0000${transaction.scheduledDate}`;
      if (occurrences.has(key)) {
        throw new Error('같은 예정일의 반복 거래가 중복됐습니다.');
      }
      occurrences.add(key);
    }
    for (const item of items) {
      if (item.categoryId !== null && categoryById.get(item.categoryId)?.type !== transaction.type) {
        throw new Error('품목의 카테고리 연결이 올바르지 않습니다.');
      }
    }
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: timestamp(root.createdAt, '백업 생성'),
    categories,
    recurringRules,
    transactions,
  };
}

export function parseLocalBackup(text: string): LocalBackup {
  assertBackupSize(text);
  try {
    return validateLocalBackup(JSON.parse(text) as unknown);
  } catch (cause) {
    if (cause instanceof SyntaxError) {
      throw new Error('백업 파일이 올바른 JSON이 아닙니다.');
    }
    throw cause;
  }
}

export function serializeLocalBackup(backup: LocalBackup): string {
  const text = JSON.stringify(validateLocalBackup(backup), null, 2);
  assertBackupSize(text);
  return text;
}
