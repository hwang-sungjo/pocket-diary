import { expect, test, type Page } from '@playwright/test';

interface StoredDayThreeData {
  itemCount: number;
  merchantCount: number;
  productCount: number;
  transactionName: string | null;
}

async function readStoredData(
  page: Page,
  transactionId: string,
): Promise<StoredDayThreeData> {
  return page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-diary');
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });

    function getAll(storeName: string): Promise<unknown[]> {
      return new Promise((resolve, reject) => {
        const request = database
          .transaction(storeName, 'readonly')
          .objectStore(storeName)
          .getAll();
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
    }

    try {
      const transaction = await new Promise<{ name: string } | undefined>(
        (resolve, reject) => {
          const request = database
            .transaction('transactions', 'readonly')
            .objectStore('transactions')
            .get(id);
          request.addEventListener('success', () => resolve(request.result));
          request.addEventListener('error', () => reject(request.error));
        },
      );
      const items = (await getAll('transactionItems')) as {
        transactionId: string;
      }[];
      const merchants = await getAll('merchants');
      const products = await getAll('products');

      return {
        itemCount: items.filter((item) => item.transactionId === id).length,
        merchantCount: merchants.length,
        productCount: products.length,
        transactionName: transaction?.name ?? null,
      };
    } finally {
      database.close();
    }
  }, transactionId);
}

async function waitForForm(page: Page): Promise<void> {
  await page.goto('/transactions/new');
  await expect(page.getByRole('heading', { name: '거래 등록' })).toBeVisible();
  await expect(page.getByTestId('save-transaction')).toBeEnabled();
}

test('상세 품목이 있는 거래를 저장하고 다시 열며 자동완성에 반영한다', async ({
  page,
}) => {
  await waitForForm(page);

  await page.getByLabel('거래명').fill('Day 3 장보기');
  await page.getByLabel('총금액').fill('48500');
  await page.getByLabel('상점 또는 수입처').fill('OO마트');
  await page.getByRole('button', { name: '카드', exact: true }).click();

  await page.getByRole('button', { name: '품목 추가' }).click();
  await page.getByLabel('품목 1 제품명').fill('우유');
  await page.getByLabel('품목 1 수량').fill('2');
  await page.getByLabel('품목 1 단가').fill('2800');
  await page.getByLabel('품목 1 규격').fill('1L');

  await page.getByRole('button', { name: '품목 추가' }).click();
  await page.getByLabel('품목 2 제품명').fill('세제');
  await page.getByLabel('품목 2 단가').fill('13900');

  await expect(page.getByTestId('unclassified-amount')).toContainText('29,000원');
  await page.getByTestId('save-transaction').click();

  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId('saved-transaction-detail')).toBeVisible();
  await expect(page.getByText('Day 3 장보기', { exact: true })).toBeVisible();
  await expect(page.getByTestId('saved-item-count')).toHaveText('2개');
  await expect(page.getByText('우유', { exact: true })).toBeVisible();
  await expect(page.getByText('세제', { exact: true })).toBeVisible();

  const transactionId = page.url().split('/').at(-1);
  expect(transactionId).toBeTruthy();
  const stored = await readStoredData(page, transactionId as string);
  expect(stored).toEqual({
    itemCount: 2,
    merchantCount: 1,
    productCount: 2,
    transactionName: 'Day 3 장보기',
  });

  await page.reload();
  await expect(page.getByTestId('saved-item-count')).toHaveText('2개');

  await page.getByRole('button', { name: '새 거래' }).click();
  await expect(page.getByTestId('save-transaction')).toBeEnabled();
  await page.getByLabel('거래명').fill('Day 3');
  await expect(
    page.getByRole('button', { name: 'Day 3 장보기 자동완성' }),
  ).toBeVisible();
  await page.getByLabel('상점 또는 수입처').fill('OO');
  await expect(
    page.getByRole('button', { name: 'OO마트 자동완성' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '품목 추가' }).click();
  await page.getByLabel('품목 1 제품명').fill('우');
  await expect(
    page.getByRole('button', { name: '우유 · 1L 자동완성' }),
  ).toBeVisible();
});

test('품목 합계 초과 거래는 명시적으로 확인한 뒤 저장한다', async ({ page }) => {
  await waitForForm(page);

  await page.getByLabel('거래명').fill('초과 금액 확인 테스트');
  await page.getByLabel('총금액').fill('1000');
  await page.getByRole('button', { name: '품목 추가' }).click();
  await page.getByLabel('품목 1 제품명').fill('테스트 품목');
  await page.getByLabel('품목 1 합계').fill('1500');

  await expect(page.getByTestId('overage-warning')).toBeVisible();
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/new$/);
  await expect(page.getByText('품목 합계 초과 금액을 확인한 뒤 저장해 주세요.')).toBeVisible();

  await page.getByRole('button', { name: '초과 금액 확인', exact: true }).click();
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  await expect(page.getByText('초과 금액 확인 테스트', { exact: true })).toBeVisible();
});
