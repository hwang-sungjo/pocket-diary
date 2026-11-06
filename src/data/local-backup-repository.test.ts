import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { localBackupRepository } from '@/data/local-backup-repository';
import { localCategoryRepository } from '@/data/local-category-repository';
import { localRecurringRuleRepository } from '@/data/local-recurring-rule-repository';
import { localTransactionRepository } from '@/data/local-transaction-repository';
import { createCustomCategory } from '@/domain/category';
import { buildRecurringRule, createRecurringRuleDraft } from '@/domain/recurring-rule';
import { createDayOneTestTransaction } from '@/domain/transaction';

test('로컬 백업을 복원하면 네 데이터 종류가 유지되고 재복원해도 중복되지 않는다', async () => {
  const categories = await localCategoryRepository.list({ includeInactive: true });
  const custom = createCustomCategory('custom-category', 'expense', '반려동물', categories);
  await localCategoryRepository.save(custom);
  await localCategoryRepository.setActive(custom.id, false, new Date().toISOString());
  const original = createDayOneTestTransaction(new Date('2026-08-24T09:00:00Z'));
  original.transaction.categoryId = custom.id;
  original.transaction.name = '복원할 거래';
  original.items = [{
    id: 'item-backup',
    transactionId: original.transaction.id,
    productId: 'product-backup',
    productName: '강아지 사료',
    categoryId: custom.id,
    quantity: 1,
    unitPrice: 12500,
    totalPrice: 12500,
    specification: '2kg',
    memo: null,
  }];
  await localTransactionRepository.save(original);
  const ruleDraft = createRecurringRuleDraft(new Date('2026-08-24T09:00:00Z'));
  ruleDraft.name = '반복 테스트';
  ruleDraft.totalAmount = 30000;
  ruleDraft.categoryId = custom.id;
  const rule = buildRecurringRule(ruleDraft, 'backup-rule', new Date('2026-08-24T09:00:00Z'));
  await localRecurringRuleRepository.save(rule);
  const backup = await localBackupRepository.exportData();

  await localTransactionRepository.delete(original.transaction.id);
  await localCategoryRepository.setActive(custom.id, true, new Date().toISOString());
  await localBackupRepository.replaceData(backup);
  await localBackupRepository.replaceData(backup);

  assert.deepEqual(await localTransactionRepository.findById(original.transaction.id), original);
  assert.equal((await localTransactionRepository.list()).length, 1);
  assert.equal((await localCategoryRepository.findById(custom.id))?.isActive, false);
  assert.deepEqual(await localRecurringRuleRepository.findById(rule.id), rule);
});

test('잘못된 백업은 기존 로컬 데이터를 변경하지 않는다', async () => {
  const before = await localBackupRepository.exportData();
  const invalid = structuredClone(before);
  invalid.transactions[0]!.transaction.totalAmount = 0;
  await assert.rejects(localBackupRepository.replaceData(invalid), /거래 금액/);
  const after = await localBackupRepository.exportData();
  assert.deepEqual(after.categories, before.categories);
  assert.deepEqual(after.transactions, before.transactions);
});
