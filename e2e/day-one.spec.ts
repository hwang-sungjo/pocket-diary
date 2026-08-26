import { expect, test, type Page } from '@playwright/test';

const TEST_TRANSACTION_ID = '0198d66a-0b80-7000-8000-000000000001';

interface StoredTransaction {
  id: string;
  memo: string | null;
  name: string;
  totalAmount: number;
}

async function readTestTransactions(page: Page): Promise<StoredTransaction[]> {
  return page.evaluate(async (transactionId) => {
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

      return rows.filter(({ id }) => id === transactionId);
    } finally {
      database.close();
    }
  }, TEST_TRANSACTION_ID);
}

async function updateTestMemo(page: Page, memo: string): Promise<void> {
  await page.evaluate(
    async ({ transactionId, nextMemo }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('pocket-diary');
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });

      try {
        const databaseTransaction = database.transaction(
          'transactions',
          'readwrite',
        );
        const store = databaseTransaction.objectStore('transactions');
        const storedTransaction = await new Promise<StoredTransaction>(
          (resolve, reject) => {
            const request = store.get(transactionId);
            request.addEventListener('success', () => resolve(request.result));
            request.addEventListener('error', () => reject(request.error));
          },
        );

        storedTransaction.memo = nextMemo;
        store.put(storedTransaction);

        await new Promise<void>((resolve, reject) => {
          databaseTransaction.addEventListener('complete', () => resolve());
          databaseTransaction.addEventListener('abort', () =>
            reject(databaseTransaction.error),
          );
          databaseTransaction.addEventListener('error', () =>
            reject(databaseTransaction.error),
          );
        });
      } finally {
        database.close();
      }
    },
    { transactionId: TEST_TRANSACTION_ID, nextMemo: memo },
  );
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

test('테스트 거래가 IndexedDB에 저장되고 새로고침 후 유지된다', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('storage-verification-result')).toContainText(
    '저장 및 재조회 완료',
  );

  const savedTransactions = await readTestTransactions(page);
  expect(savedTransactions).toHaveLength(1);
  expect(savedTransactions[0]).toMatchObject({
    id: TEST_TRANSACTION_ID,
    name: 'Day 1 로컬 저장 테스트',
    totalAmount: 12500,
  });

  const persistenceMarker = 'e2e-persistence-marker';
  await updateTestMemo(page, persistenceMarker);
  await page.reload();
  await expect(page.getByTestId('storage-verification-result')).toContainText(
    '저장 및 재조회 완료',
  );

  const reloadedTransactions = await readTestTransactions(page);
  expect(reloadedTransactions).toHaveLength(1);
  expect(reloadedTransactions[0]?.memo).toBe(persistenceMarker);
});

