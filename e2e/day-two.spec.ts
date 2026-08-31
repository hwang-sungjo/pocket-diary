import { expect, test, type Page } from '@playwright/test';

interface StoredCategory {
  id: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
  type: 'income' | 'expense';
}

async function readCategories(page: Page): Promise<StoredCategory[]> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-diary');
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });

    try {
      const transaction = database.transaction('categories', 'readonly');
      return await new Promise<StoredCategory[]>((resolve, reject) => {
        const request = transaction.objectStore('categories').getAll();
        request.addEventListener('success', () =>
          resolve(request.result as StoredCategory[]),
        );
        request.addEventListener('error', () => reject(request.error));
      });
    } finally {
      database.close();
    }
  });
}

test('기본 카테고리를 조회하고 새로고침 후에도 유지한다', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.getByTestId('expense-category-count')).toHaveText('13개');
  await expect(page.getByTestId('income-category-count')).toHaveText('5개');
  const categoryList = page.getByTestId('category-list');
  await expect(categoryList.getByText('식비', { exact: true })).toBeVisible();
  await expect(
    categoryList.getByText('기타 지출', { exact: true }),
  ).toBeVisible();
  await expect(categoryList.getByText('월급', { exact: true })).toBeVisible();
  await expect(
    categoryList.getByText('기타 수입', { exact: true }),
  ).toBeVisible();

  const categories = await readCategories(page);
  expect(categories).toHaveLength(18);
  expect(categories.filter(({ type }) => type === 'expense')).toHaveLength(13);
  expect(categories.filter(({ type }) => type === 'income')).toHaveLength(5);
  expect(new Set(categories.map(({ id }) => id)).size).toBe(18);

  await page.reload();
  await expect(page.getByTestId('expense-category-count')).toHaveText('13개');
  await expect(page.getByTestId('income-category-count')).toHaveText('5개');
});
