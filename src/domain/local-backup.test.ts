import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_CATEGORIES } from '@/domain/category';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  parseLocalBackup,
  serializeLocalBackup,
  validateLocalBackup,
  type LocalBackup,
} from '@/domain/local-backup';
import { buildRecurringRule, createRecurringRuleDraft } from '@/domain/recurring-rule';
import { createDayOneTestTransaction } from '@/domain/transaction';

function fixture(): LocalBackup {
  const categoryId = DEFAULT_CATEGORIES[0]!.id;
  const ruleDraft = createRecurringRuleDraft(new Date('2026-08-24T09:00:00Z'));
  ruleDraft.name = '월세';
  ruleDraft.totalAmount = 500000;
  ruleDraft.categoryId = categoryId;
  const rule = buildRecurringRule(ruleDraft, 'rule-1', new Date('2026-08-24T09:00:00Z'));
  const aggregate = createDayOneTestTransaction(new Date('2026-08-24T09:00:00Z'));
  aggregate.transaction.categoryId = categoryId;
  aggregate.transaction.recurringRuleId = rule.id;
  aggregate.transaction.scheduledDate = '2026-08-24';
  aggregate.items = [{
    id: 'item-1',
    transactionId: aggregate.transaction.id,
    productId: 'product-1',
    productName: '우유',
    categoryId: null,
    quantity: 2,
    unitPrice: 2000,
    totalPrice: 4000,
    specification: '1L',
    memo: null,
  }];
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: '2026-08-24T09:00:00.000Z',
    categories: [...DEFAULT_CATEGORIES],
    recurringRules: [rule],
    transactions: [aggregate],
  };
}

test('백업 JSON 왕복으로 거래·품목·카테고리·반복 규칙을 보존한다', () => {
  const backup = fixture();
  assert.deepEqual(parseLocalBackup(serializeLocalBackup(backup)), backup);
});

test('지원하지 않는 버전과 손상된 JSON을 거부한다', () => {
  assert.throws(() => parseLocalBackup('{'), /JSON/);
  assert.throws(
    () => validateLocalBackup({ ...fixture(), version: 2 }),
    /지원하지 않는/,
  );
});

test('기본 카테고리 누락·중복 품목·잘못된 금액과 연결을 거부한다', () => {
  const backup = fixture();
  assert.throws(
    () => validateLocalBackup({ ...backup, categories: backup.categories.slice(1) }),
    /기본 카테고리/,
  );
  const duplicateItems = structuredClone(backup);
  duplicateItems.transactions[0]!.items.push({ ...duplicateItems.transactions[0]!.items[0]! });
  assert.throws(() => validateLocalBackup(duplicateItems), /품목 ID가 중복/);
  const invalidAmount = structuredClone(backup);
  invalidAmount.transactions[0]!.transaction.totalAmount = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateLocalBackup(invalidAmount), /거래 금액/);
  const invalidCategory = structuredClone(backup);
  invalidCategory.transactions[0]!.transaction.categoryId = 'missing';
  assert.throws(() => validateLocalBackup(invalidCategory), /카테고리 연결/);
});
