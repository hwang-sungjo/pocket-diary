import { expect, test, type Page } from '@playwright/test';

const FOOD_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000001';
const GROCERY_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000002';
const SIDE_INCOME_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000015';

async function previousCategoryId(page: Page, id: string): Promise<string | null> {
  return page.getByTestId(`category-${id}`).evaluate(
    (row) => row.previousElementSibling?.getAttribute('data-testid') ?? null,
  );
}

test('지출·수입 카테고리 순서를 바꾸고 다시 열어도 유지한다', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByTestId('category-list')).toBeVisible();
  await expect(page.getByRole('button', { name: '식비 위로 이동' })).toBeDisabled();

  await page.getByRole('button', { name: '장보기 위로 이동' }).click();
  await expect.poll(() => previousCategoryId(page, GROCERY_CATEGORY_ID)).toBeNull();
  await expect.poll(() => previousCategoryId(page, FOOD_CATEGORY_ID)).toBe(
    `category-${GROCERY_CATEGORY_ID}`,
  );

  await page.getByRole('button', { name: '부수입 위로 이동' }).click();
  await expect.poll(() => previousCategoryId(page, SIDE_INCOME_CATEGORY_ID)).toBeNull();

  await page.reload();
  await expect.poll(() => previousCategoryId(page, GROCERY_CATEGORY_ID)).toBeNull();
  await expect.poll(() => previousCategoryId(page, SIDE_INCOME_CATEGORY_ID)).toBeNull();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  await page.goto('/transactions/new');
  const transactionCategories = page.getByTestId('transaction-category-options');
  await expect(transactionCategories.getByRole('button').first()).toHaveText('장보기');
  await expect(transactionCategories.getByRole('button').nth(1)).toHaveText('식비');
});
