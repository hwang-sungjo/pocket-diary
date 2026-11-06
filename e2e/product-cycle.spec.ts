import { expect, test } from '@playwright/test';

const GROCERY_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000002';

test('품목 구매일 3회부터 중앙값 주기와 다음 예상일을 표시한다', async ({ page }) => {
  await page.goto('/items');
  await expect(page.getByTestId('product-history-list')).toBeVisible();
  await page.evaluate(async (categoryId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-diary');
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });

    try {
      const transaction = database.transaction(['transactions', 'transactionItems'], 'readwrite');
      const transactionStore = transaction.objectStore('transactions');
      const itemStore = transaction.objectStore('transactionItems');
      for (const day of [2, 9, 18]) {
        const id = `cycle-milk-${day}`;
        const occurredAt = new Date(2026, 0, day, 12).toISOString();
        transactionStore.put({
          id,
          type: 'expense',
          name: `우유 구매 ${day}`,
          totalAmount: day === 18 ? 3_800 : 2_800,
          occurredAt,
          categoryId,
          merchantId: null,
          merchantName: '동네 마트',
          paymentMethod: null,
          memo: null,
          status: 'confirmed',
          recurringRuleId: null,
          scheduledDate: null,
          createdAt: occurredAt,
          updatedAt: occurredAt,
        });
        itemStore.put({
          id: `${id}-item`,
          transactionId: id,
          productId: 'cycle-milk-product',
          productName: '우유',
          categoryId: null,
          quantity: 1,
          unitPrice: 2_800,
          totalPrice: 2_800,
          specification: '1L',
          memo: null,
        });
      }
      itemStore.put({
        id: 'cycle-detergent-item',
        transactionId: 'cycle-milk-18',
        productId: 'cycle-detergent-product',
        productName: '세제',
        categoryId: null,
        quantity: 1,
        unitPrice: 1_000,
        totalPrice: 1_000,
        specification: null,
        memo: null,
      });
      await new Promise<void>((resolve, reject) => {
        transaction.addEventListener('complete', () => resolve());
        transaction.addEventListener('abort', () => reject(transaction.error));
        transaction.addEventListener('error', () => reject(transaction.error));
      });
    } finally {
      database.close();
    }
  }, GROCERY_CATEGORY_ID);
  await page.reload();

  await page.getByLabel('제품명 검색').fill('우유');
  const milk = page.getByTestId('product-history-0');
  await expect(milk).toContainText('3회 구매');
  await expect(milk.getByTestId('product-cycle-interval-0')).toHaveText('약 8일 간격');
  await expect(milk.getByTestId('product-cycle-date-0')).toContainText('1월 26일');
  await expect(milk).toContainText('참고 정보');

  await page.getByLabel('제품명 검색').fill('세제');
  await expect(page.getByTestId('product-history-0')).toContainText('1회 구매');
  await expect(page.getByTestId('product-cycle-0')).toContainText('데이터 부족');
});
