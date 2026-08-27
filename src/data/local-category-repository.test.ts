import assert from 'node:assert/strict';
import { test } from 'node:test';

import 'fake-indexeddb/auto';

import { localCategoryRepository } from '@/data/local-category-repository';
import { DEFAULT_CATEGORIES } from '@/domain/category';

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
