import { expect, test, type Page } from '@playwright/test';

interface DayFiveStoredData {
  rules: Array<{
    id: string;
    name: string;
    nextScheduledDate: string;
  }>;
  transactions: Array<{
    id: string;
    name: string;
    recurringRuleId: string | null;
    scheduledDate: string | null;
    status: string;
  }>;
}

async function readDayFiveData(page: Page): Promise<DayFiveStoredData> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-diary');
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });

    try {
      const readStore = <T,>(storeName: string) =>
        new Promise<T[]>((resolve, reject) => {
          const request = database
            .transaction(storeName, 'readonly')
            .objectStore(storeName)
            .getAll();
          request.addEventListener('success', () => resolve(request.result));
          request.addEventListener('error', () => reject(request.error));
        });

      const [rules, transactions] = await Promise.all([
        readStore<DayFiveStoredData['rules'][number]>('recurringRules'),
        readStore<DayFiveStoredData['transactions'][number]>('transactions'),
      ]);
      return { rules, transactions };
    } finally {
      database.close();
    }
  });
}

async function rewindRule(
  page: Page,
  ruleId: string,
  scheduledDate: string,
): Promise<void> {
  await page.evaluate(
    async ({ id, date }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('pocket-diary');
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });

      try {
        const transaction = database.transaction('recurringRules', 'readwrite');
        const store = transaction.objectStore('recurringRules');
        const rule = await new Promise<Record<string, unknown>>((resolve, reject) => {
          const request = store.get(id);
          request.addEventListener('success', () => resolve(request.result));
          request.addEventListener('error', () => reject(request.error));
        });
        rule.nextScheduledDate = date;
        store.put(rule);
        await new Promise<void>((resolve, reject) => {
          transaction.addEventListener('complete', () => resolve());
          transaction.addEventListener('abort', () => reject(transaction.error));
          transaction.addEventListener('error', () => reject(transaction.error));
        });
      } finally {
        database.close();
      }
    },
    { id: ruleId, date: scheduledDate },
  );
}

test('사용자 카테고리와 반복 규칙을 관리하고 같은 예정 거래를 한 번만 생성한다', async ({
  page,
}) => {
  await page.goto('/settings');

  await page.getByLabel('새 카테고리 이름').fill('구독');
  await page.getByTestId('add-category').click();
  await expect(page.getByTestId('expense-category-count')).toHaveText('14개');

  const categoryRow = page
    .getByTestId('category-list')
    .getByText('구독', { exact: true })
    .locator('..')
    .locator('..');
  await categoryRow.getByRole('button', { name: '구독 숨기기' }).click();
  await expect(page.getByTestId('expense-category-count')).toHaveText('13개');
  await expect(categoryRow).toContainText('숨김');
  await categoryRow.getByRole('button', { name: '구독 활성화' }).click();
  await expect(page.getByTestId('expense-category-count')).toHaveText('14개');

  const scheduledDate = await page.getByLabel('시작일').inputValue();
  await page.getByLabel('반복 거래명').fill('Day 5 정기 구독');
  await page.getByLabel('반복 금액').fill('12900');
  await page
    .getByTestId('recurring-category-options')
    .getByRole('button', { name: '구독' })
    .click();
  await page.getByRole('button', { name: '금액 확인 필요' }).click();
  await page.getByTestId('save-recurring-rule').click();

  await expect(page.getByText('예정 거래 1건 생성')).toBeVisible();
  await expect(page.getByText('Day 5 정기 구독', { exact: true })).toBeVisible();

  const firstData = await readDayFiveData(page);
  const rule = firstData.rules.find(({ name }) => name === 'Day 5 정기 구독');
  const occurrences = firstData.transactions.filter(
    ({ name }) => name === 'Day 5 정기 구독',
  );
  expect(rule).toBeTruthy();
  expect(occurrences).toHaveLength(1);
  expect(occurrences[0]).toMatchObject({
    recurringRuleId: rule?.id,
    scheduledDate,
    status: 'needs_confirmation',
  });

  await rewindRule(page, rule!.id, scheduledDate);
  await page.getByTestId('generate-recurring-transactions').click();
  await expect(page.getByText('예정 거래 1건 중복 방지')).toBeVisible();

  const secondData = await readDayFiveData(page);
  expect(
    secondData.transactions.filter(
      ({ recurringRuleId, scheduledDate: date }) =>
        recurringRuleId === rule?.id && date === scheduledDate,
    ),
  ).toHaveLength(1);

  const transactionId = occurrences[0]!.id;
  await page.goto('/transactions');
  const transactionRow = page.getByTestId(`transaction-row-${transactionId}`);
  await expect(transactionRow).toContainText('Day 5 정기 구독');
  await expect(transactionRow).toContainText('금액 확인 필요');
  await transactionRow.click();
  await expect(page.getByTestId('confirmation-required')).toBeVisible();

  await page.getByTestId('edit-transaction').click();
  await page.getByTestId('save-transaction').click();
  await expect(page.getByTestId('confirmation-required')).toBeHidden();

  const confirmedData = await readDayFiveData(page);
  expect(
    confirmedData.transactions.find(({ id }) => id === transactionId)?.status,
  ).toBe('confirmed');
});
