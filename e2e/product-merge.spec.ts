import { expect, test } from '@playwright/test';

const GROCERY_CATEGORY_ID = '0198d66a-0b81-7000-8000-000000000002';

test('사용자가 제품명 병합을 확인하면 구매 이력과 거래 상세가 합쳐진다', async ({ page }) => {
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
      const transactions = transaction.objectStore('transactions');
      const items = transaction.objectStore('transactionItems');
      const now = new Date();
      for (const [id, name, amount, day] of [
        ['merge-source', '우유', 2_800, 12],
        ['merge-target', '흰우유', 3_100, 15],
      ] as const) {
        const occurredAt = new Date(now.getFullYear(), now.getMonth(), day, 12).toISOString();
        transactions.put({
          id,
          type: 'expense',
          name: `${name} 구매`,
          totalAmount: amount,
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
          productId: `${id}-product`,
          productName: name,
          categoryId: null,
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          specification: '1L',
          memo: null,
        });
      }
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

  const cards = page.getByTestId(/^product-history-\d+$/);
  const source = cards.filter({
    has: page.getByRole('heading', { name: '우유', exact: true }),
  });
  await expect(source).toBeVisible();
  await source.getByRole('button', { name: '이 제품명 병합' }).click();
  await page.getByRole('button', { name: '흰우유 병합 대상 선택' }).click();
  await expect(page.getByTestId('product-merge-count')).toContainText('상세 품목 1개');
  await page.getByRole('button', { name: '취소' }).click();
  await expect(source).toBeVisible();

  await source.getByRole('button', { name: '이 제품명 병합' }).click();
  await page.getByRole('button', { name: '흰우유 병합 대상 선택' }).click();
  await page.getByTestId('confirm-product-merge').click();
  await expect(page.getByTestId('product-merge-success')).toContainText('총 2개');
  await expect(page.getByRole('heading', { name: '우유', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '흰우유', exact: true })).toHaveCount(1);
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('2회 구매');
  await page.reload();
  await expect(page.getByRole('heading', { name: '흰우유', exact: true })).toBeVisible();

  await page.goto('/transactions/merge-source');
  await expect(page.getByTestId('saved-transaction-detail')).toContainText('흰우유');
  await expect(page.getByTestId('saved-transaction-detail')).toContainText('2,800원');
});
