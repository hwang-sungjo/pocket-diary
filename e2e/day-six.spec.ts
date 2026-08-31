import { expect, test, type Page } from '@playwright/test';

const FOOD_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000001';
const GROCERY_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000002';
const HOUSING_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000003';
const HOUSEHOLD_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000007';
const SALARY_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000014';

async function seedStatisticsSample(page: Page): Promise<void> {
  await page.evaluate(
    async ({ food, grocery, housing, household, salary }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('pocket-diary');
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
      const current = new Date();
      const currentDate = new Date(
        current.getFullYear(),
        current.getMonth(),
        15,
        12,
      ).toISOString();
      const previousDate = new Date(
        current.getFullYear(),
        current.getMonth() - 1,
        15,
        12,
      ).toISOString();
      const scheduledDate = `${current.getFullYear()}-${String(
        current.getMonth() + 1,
      ).padStart(2, '0')}-15`;
      const timestamps = { createdAt: currentDate, updatedAt: currentDate };
      const transactions = [
        {
          id: 'day-six-shopping',
          type: 'expense',
          name: 'Day 6 장보기',
          totalAmount: 48_500,
          occurredAt: currentDate,
          categoryId: grocery,
          merchantId: null,
          merchantName: '샘플 마트',
          paymentMethod: null,
          memo: null,
          status: 'confirmed',
          recurringRuleId: null,
          scheduledDate: null,
          ...timestamps,
        },
        {
          id: 'day-six-dining',
          type: 'expense',
          name: 'Day 6 외식',
          totalAmount: 20_000,
          occurredAt: currentDate,
          categoryId: food,
          merchantId: null,
          merchantName: null,
          paymentMethod: null,
          memo: null,
          status: 'confirmed',
          recurringRuleId: null,
          scheduledDate: null,
          ...timestamps,
        },
        {
          id: 'day-six-salary',
          type: 'income',
          name: 'Day 6 월급',
          totalAmount: 3_000_000,
          occurredAt: currentDate,
          categoryId: salary,
          merchantId: null,
          merchantName: null,
          paymentMethod: null,
          memo: null,
          status: 'confirmed',
          recurringRuleId: null,
          scheduledDate: null,
          ...timestamps,
        },
        {
          id: 'day-six-pending',
          type: 'expense',
          name: 'Day 6 확인 전 월세',
          totalAmount: 700_000,
          occurredAt: currentDate,
          categoryId: housing,
          merchantId: null,
          merchantName: null,
          paymentMethod: null,
          memo: null,
          status: 'needs_confirmation',
          recurringRuleId: 'day-six-rule',
          scheduledDate,
          ...timestamps,
        },
        {
          id: 'day-six-previous',
          type: 'expense',
          name: 'Day 6 지난달',
          totalAmount: 100_000,
          occurredAt: previousDate,
          categoryId: food,
          merchantId: null,
          merchantName: null,
          paymentMethod: null,
          memo: null,
          status: 'confirmed',
          recurringRuleId: null,
          scheduledDate: null,
          createdAt: previousDate,
          updatedAt: previousDate,
        },
      ];
      const items = [
        {
          id: 'day-six-milk',
          transactionId: 'day-six-shopping',
          productId: 'day-six-milk-product',
          productName: '우유',
          categoryId: null,
          quantity: 2,
          unitPrice: 2_800,
          totalPrice: 5_600,
          specification: null,
          memo: null,
        },
        {
          id: 'day-six-detergent',
          transactionId: 'day-six-shopping',
          productId: 'day-six-detergent-product',
          productName: '세제',
          categoryId: household,
          quantity: 1,
          unitPrice: 13_900,
          totalPrice: 13_900,
          specification: null,
          memo: null,
        },
      ];

      try {
        const databaseTransaction = database.transaction(
          ['transactions', 'transactionItems'],
          'readwrite',
        );
        const transactionStore = databaseTransaction.objectStore('transactions');
        const itemStore = databaseTransaction.objectStore('transactionItems');
        for (const transaction of transactions) {
          transactionStore.put(transaction);
        }
        for (const item of items) {
          itemStore.put(item);
        }
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
    {
      food: FOOD_CATEGORY_ID,
      grocery: GROCERY_CATEGORY_ID,
      housing: HOUSING_CATEGORY_ID,
      household: HOUSEHOLD_CATEGORY_ID,
      salary: SALARY_CATEGORY_ID,
    },
  );
}

test('월별·카테고리 통계가 수기 계산과 일치하고 화면이 반응형으로 표시된다', async ({
  page,
}) => {
  await page.goto('/stats');
  await expect(page.getByTestId('monthly-statistics')).toBeVisible();
  await seedStatisticsSample(page);
  await page.reload();

  await expect(page.getByTestId('monthly-income')).toContainText('3,000,000원');
  await expect(page.getByTestId('monthly-expense')).toContainText('68,500원');
  await expect(page.getByTestId('monthly-balance')).toContainText('2,931,500원');
  await expect(page.getByTestId('pending-statistics-notice')).toContainText(
    '금액 확인 필요 1건',
  );
  await expect(page.getByTestId(`category-stat-${GROCERY_CATEGORY_ID}`)).toContainText(
    '장보기34,600원',
  );
  await expect(page.getByTestId(`category-stat-${FOOD_CATEGORY_ID}`)).toContainText(
    '식비20,000원',
  );
  await expect(page.getByTestId(`category-stat-${HOUSEHOLD_CATEGORY_ID}`)).toContainText(
    '생활용품13,900원',
  );

  await page.getByRole('button', { name: '통계 이전 달' }).click();
  await expect(page.getByTestId('monthly-income')).toContainText('0원');
  await expect(page.getByTestId('monthly-expense')).toContainText('100,000원');
  await expect(page.getByTestId('monthly-balance')).toContainText('-100,000원');
  await expect(page.getByTestId(`category-stat-${FOOD_CATEGORY_ID}`)).toContainText(
    '식비100,000원',
  );

  await page.getByRole('button', { name: '통계 다음 달' }).click();
  await expect(page.getByTestId('monthly-expense')).toContainText('68,500원');

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.goto('/');
  await expect(page.getByTestId('monthly-income')).toContainText('3,000,000원');
  await expect(page.getByTestId('monthly-expense')).toContainText('68,500원');
  await expect(page.getByTestId('monthly-balance')).toContainText('2,931,500원');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
