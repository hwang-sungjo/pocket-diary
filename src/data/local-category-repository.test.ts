import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { localCategoryRepository } from '@/data/local-category-repository';
import {
  createCustomCategory,
  DEFAULT_CATEGORIES,
  moveCategory,
} from '@/domain/category';

test('기본 카테고리 18개를 유형별 순서로 조회한다', async () => {
  const categories = await localCategoryRepository.list();
  const expenses = await localCategoryRepository.list({ type: 'expense' });
  const incomes = await localCategoryRepository.list({ type: 'income' });

  assert.equal(categories.length, 18);
  assert.equal(expenses.length, 13);
  assert.equal(incomes.length, 5);
  assert.deepEqual(
    expenses.map(({ name }) => name),
    DEFAULT_CATEGORIES.filter(({ type }) => type === 'expense').map(
      ({ name }) => name,
    ),
  );
  assert.deepEqual(
    incomes.map(({ name }) => name),
    DEFAULT_CATEGORIES.filter(({ type }) => type === 'income').map(
      ({ name }) => name,
    ),
  );
});

test('고정 UUID로 시드된 기본 카테고리를 다시 조회해도 중복되지 않는다', async () => {
  const first = await localCategoryRepository.list();
  const second = await localCategoryRepository.list();

  assert.deepEqual(second, first);
  assert.equal(new Set(second.map(({ id }) => id)).size, 18);
  assert.equal(second.every(({ isDefault, isActive }) => isDefault && isActive), true);
});

test('사용자 카테고리를 추가하고 숨긴 뒤 다시 활성화한다', async () => {
  const category = createCustomCategory(
    '0198d66a-0b85-4000-8000-000000000001',
    'expense',
    '  반려   동물  ',
    await localCategoryRepository.list({ includeInactive: true }),
    new Date('2026-08-29T00:00:00.000Z'),
  );

  await localCategoryRepository.save(category);
  assert.equal(
    (await localCategoryRepository.findById(category.id))?.name,
    '반려 동물',
  );

  await localCategoryRepository.setActive(
    category.id,
    false,
    '2026-08-29T01:00:00.000Z',
  );
  assert.equal(
    (await localCategoryRepository.list()).some(({ id }) => id === category.id),
    false,
  );
  assert.equal(
    (await localCategoryRepository.findById(category.id))?.deletedAt,
    '2026-08-29T01:00:00.000Z',
  );

  await localCategoryRepository.setActive(
    category.id,
    true,
    '2026-08-29T02:00:00.000Z',
  );
  assert.equal(
    (await localCategoryRepository.findById(category.id))?.isActive,
    true,
  );
  assert.equal(
    (await localCategoryRepository.findById(category.id))?.deletedAt,
    null,
  );
});

test('같은 유형의 중복 사용자 카테고리는 만들지 않는다', () => {
  assert.throws(
    () =>
      createCustomCategory(
        '0198d66a-0b85-4000-8000-000000000002',
        'expense',
        '  식비 ',
        DEFAULT_CATEGORIES,
      ),
    /이미 존재하는 카테고리/,
  );
});

test('카테고리 이동은 같은 유형 안에서만 한 칸씩 적용한다', () => {
  const firstExpense = DEFAULT_CATEGORIES[0]!;
  const secondExpense = DEFAULT_CATEGORIES[1]!;
  const firstIncome = DEFAULT_CATEGORIES.find(({ type }) => type === 'income')!;

  assert.equal(moveCategory(DEFAULT_CATEGORIES, firstExpense.id, -1), null);
  assert.equal(moveCategory(DEFAULT_CATEGORIES, 'missing', 1), null);
  const updates = moveCategory(DEFAULT_CATEGORIES, firstExpense.id, 1)!;
  assert.deepEqual(updates.slice(0, 2), [
    { id: secondExpense.id, sortOrder: 1 },
    { id: firstExpense.id, sortOrder: 2 },
  ]);
  assert.equal(updates.some(({ id }) => id === firstIncome.id), false);
});

test('변경한 순서가 저장되고 중간 오류가 나면 전체 변경을 취소한다', async () => {
  const before = await localCategoryRepository.list({ includeInactive: true });
  const expenses = before.filter(({ type }) => type === 'expense');
  const updates = moveCategory(before, expenses[0]!.id, 1)!;
  const updatedAt = '2026-11-06T00:00:00.000Z';

  await localCategoryRepository.setSortOrders(updates, updatedAt);
  const after = await localCategoryRepository.list({ includeInactive: true });
  assert.deepEqual(
    after.filter(({ type }) => type === 'expense').slice(0, 2).map(({ id }) => id),
    [expenses[1]!.id, expenses[0]!.id],
  );
  assert.equal((await localCategoryRepository.findById(expenses[0]!.id))?.updatedAt, updatedAt);
  assert.deepEqual(
    after.filter(({ type }) => type === 'income').map(({ id }) => id),
    before.filter(({ type }) => type === 'income').map(({ id }) => id),
  );

  const reverse = moveCategory(after, expenses[0]!.id, -1)!;
  await assert.rejects(
    localCategoryRepository.setSortOrders(
      [...reverse, { id: 'missing-category', sortOrder: 99 }],
      '2026-11-06T01:00:00.000Z',
    ),
    /찾지 못했습니다/,
  );
  assert.deepEqual(await localCategoryRepository.list({ includeInactive: true }), after);
});
