import { expect, test, type Page } from '@playwright/test';

interface StoredTransaction {
  id: string;
  name: string;
  totalAmount: number;
}

async function readTransaction(
  page: Page,
  transactionId: string,
): Promise<StoredTransaction | undefined> {
  return page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-diary');
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });

    try {
      const transaction = database.transaction('transactions', 'readonly');
      const rows = await new Promise<StoredTransaction[]>((resolve, reject) => {
        const request = transaction.objectStore('transactions').getAll();
        request.addEventListener('success', () =>
          resolve(request.result as StoredTransaction[]),
        );
        request.addEventListener('error', () => reject(request.error));
      });

      return rows.find((row) => row.id === id);
    } finally {
      database.close();
    }
  }, transactionId);
}

test('주요 화면 사이를 이동할 수 있다', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Pocket Diary' }),
  ).toBeVisible();

  const destinations = [
    { label: '내역', path: '/transactions' },
    { label: '품목', path: '/items' },
    { label: '통계', path: '/stats' },
    { label: '설정', path: '/settings' },
    { label: '홈', path: '/' },
  ] as const;

  for (const destination of destinations) {
    await page.getByRole('tab', { name: destination.label }).click();
    await expect(page).toHaveURL(new RegExp(`${destination.path}$`));

    const heading = destination.label === '홈' ? 'Pocket Diary' : destination.label;
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('사용자가 등록한 거래가 IndexedDB에 저장되고 앱 재실행 후 유지된다', async ({
  page,
}) => {
  await page.goto('/transactions/new');
  await page.getByLabel('거래명').fill('로컬 재실행 검증');
  await page.getByLabel('총금액').fill('12500');
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  const transactionId = page.url().split('/').at(-1);
  expect(transactionId).toBeTruthy();

  expect(await readTransaction(page, transactionId as string)).toMatchObject({
    id: transactionId,
    name: '로컬 재실행 검증',
    totalAmount: 12500,
  });

  await page.reload();
  await expect(
    page.getByText('로컬 재실행 검증', { exact: true }),
  ).toBeVisible();
  expect(await readTransaction(page, transactionId as string)).toMatchObject({
    id: transactionId,
    name: '로컬 재실행 검증',
    totalAmount: 12500,
  });
});
