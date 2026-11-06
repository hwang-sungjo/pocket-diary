import { expect, test } from '@playwright/test';

const GROCERY_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000002';

test('품목 화면에서 최근 단가의 상승 금액을 보여준다', async ({ page }) => {
  await page.goto('/items');
  await expect(page.getByTestId('product-history-list')).toBeVisible();
  await page.evaluate(async (categoryId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pocket-diary');
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });

    try {
      const databaseTransaction = database.transaction(
        ['transactions', 'transactionItems'],
        'readwrite',
      );
      const transactions = databaseTransaction.objectStore('transactions');
      const items = databaseTransaction.objectStore('transactionItems');
      for (const [day, quantity, unitPrice] of [[1, 2, 2_800], [20, 1, 3_100]] as const) {
        const id = `price-milk-${day}`;
        const occurredAt = new Date(2026, 7, day, 12).toISOString();
        const totalPrice = quantity * unitPrice;
        transactions.put({
          id,
          type: 'expense',
          name: `우유 구매 ${day}`,
          totalAmount: totalPrice,
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
        items.put({
          id: `${id}-item`,
          transactionId: id,
          productId: 'price-milk-product',
          productName: '우유',
          categoryId: null,
          quantity,
          unitPrice,
          totalPrice,
          specification: '1L',
          memo: null,
        });
      }
      await new Promise<void>((resolve, reject) => {
        databaseTransaction.addEventListener('complete', () => resolve());
        databaseTransaction.addEventListener('abort', () => reject(databaseTransaction.error));
        databaseTransaction.addEventListener('error', () => reject(databaseTransaction.error));
      });
    } finally {
      database.close();
    }
  }, GROCERY_CATEGORY_ID);
  await page.reload();

  await page.getByLabel('제품명 검색').fill('우유');
  const history = page.getByTestId('product-history-0');
  await expect(history).toContainText('2회 구매');
  await expect(history.getByTestId('product-price-values-0')).toHaveText(
    '2,800원 → 3,100원',
  );
  await expect(history.getByTestId('product-price-difference-0')).toHaveText(
    '+300원 상승',
  );
  await expect(history.getByTestId('product-cycle-0')).toContainText('데이터 부족');
});
