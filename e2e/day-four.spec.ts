import { expect, test, type Page } from '@playwright/test';

async function transactionStillExists(
  page: Page,
  transactionId: string,
): Promise<{ itemCount: number; transactionExists: boolean }> {
  return page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-diary');
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });

    try {
      const transaction = await new Promise<unknown>((resolve, reject) => {
        const request = database
          .transaction('transactions', 'readonly')
          .objectStore('transactions')
          .get(id);
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
      const items = await new Promise<{ transactionId: string }[]>(
        (resolve, reject) => {
          const request = database
            .transaction('transactionItems', 'readonly')
            .objectStore('transactionItems')
            .getAll();
          request.addEventListener('success', () => resolve(request.result));
          request.addEventListener('error', () => reject(request.error));
        },
      );

      return {
        itemCount: items.filter((item) => item.transactionId === id).length,
        transactionExists: transaction !== undefined,
      };
    } finally {
      database.close();
    }
  }, transactionId);
}

test('거래를 월별 조회·수정·품목 검색한 뒤 삭제한다', async ({ page }) => {
  await page.goto('/transactions/new');
  await expect(page.getByTestId('save-transaction')).toBeEnabled();

  await page.getByLabel('거래명').fill('Day 4 원두 구매');
  await page.getByLabel('총금액').fill('30000');
  await page.getByLabel('상점 또는 수입처').fill('동네 로스터리');
  await page.getByRole('button', { name: '품목 추가' }).click();
  await page.getByLabel('품목 1 제품명').fill('원두');
  await page.getByLabel('품목 1 수량').fill('2');
  await page.getByLabel('품목 1 단가').fill('15000');
  await page.getByLabel('품목 1 규격').fill('500g');
  await page.getByTestId('save-transaction').click();

  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  const transactionId = page.url().split('/').at(-1);
  expect(transactionId).toBeTruthy();

  await page.getByTestId('edit-transaction').click();
  await expect(page.getByRole('heading', { name: '거래 수정' })).toBeVisible();
  await expect(page.getByLabel('거래명')).toHaveValue('Day 4 원두 구매');
  await expect(page.getByLabel('품목 1 제품명')).toHaveValue('원두');

  await page.getByLabel('거래명').fill('Day 4 원두 구매 수정');
  await page.getByLabel('총금액').fill('32000');
  await page.getByLabel('품목 1 단가').fill('16000');
  await page.getByTestId('save-transaction').click();

  await expect(page).toHaveURL(
    new RegExp(`/transactions/${transactionId as string}$`),
  );
  await expect(
    page.getByText('Day 4 원두 구매 수정', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('32,000원', { exact: true }).first()).toBeVisible();

  await page.goto('/transactions');
  const transactionRow = page.getByTestId(
    `transaction-row-${transactionId as string}`,
  );
  await expect(transactionRow).toContainText('Day 4 원두 구매 수정');
  await expect(transactionRow).toContainText('품목 1개');
  await transactionRow.click();
  await expect(page.getByTestId('saved-transaction-detail')).toBeVisible();

  await page.goto('/items');
  await page.getByLabel('제품명 검색').fill('원두');
  await expect(page.getByRole('heading', { name: '원두' })).toBeVisible();
  await expect(page.getByText('500g', { exact: true })).toBeVisible();
  await expect(page.getByText('1회 구매', { exact: true })).toBeVisible();
  await page.getByTestId(`purchase-${transactionId as string}`).click();
  await expect(page.getByTestId('saved-transaction-detail')).toBeVisible();

  await page.getByTestId('delete-transaction').click();
  await expect(page.getByTestId('delete-confirmation')).toBeVisible();
  await page.getByTestId('confirm-delete-transaction').click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(
    page.getByTestId(`transaction-row-${transactionId as string}`),
  ).toHaveCount(0);

  expect(await transactionStillExists(page, transactionId as string)).toEqual({
    itemCount: 0,
    transactionExists: false,
  });

  await page.goto('/items');
  await page.getByLabel('제품명 검색').fill('원두');
  await expect(page.getByRole('heading', { name: '원두' })).toHaveCount(0);
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible();
});
