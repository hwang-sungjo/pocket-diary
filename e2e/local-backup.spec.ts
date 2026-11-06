import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

test('거래와 품목을 파일로 백업하고 삭제 후 복원한다', async ({ page }) => {
  await page.goto('/transactions/new');
  await expect(page.getByTestId('save-transaction')).toBeEnabled();
  await page.getByLabel('거래명').fill('백업 복원 테스트');
  await page.getByLabel('총금액').fill('18000');
  await page.getByRole('button', { name: '품목 추가' }).click();
  await page.getByLabel('품목 1 제품명').fill('우유');
  await page.getByLabel('품목 1 단가').fill('5000');
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  const transactionId = page.url().split('/').at(-1)!;

  await page.goto('/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-backup').click();
  const download = await downloadPromise;
  const text = await readFile(await download.path(), 'utf8');
  const backup = JSON.parse(text) as {
    format: string;
    categories: unknown[];
    transactions: { transaction: { id: string }; items: unknown[] }[];
  };
  expect(backup.format).toBe('pocket-diary-backup');
  expect(backup.categories).toHaveLength(18);
  expect(backup.transactions).toHaveLength(1);
  expect(backup.transactions[0]?.transaction.id).toBe(transactionId);
  expect(backup.transactions[0]?.items).toHaveLength(1);

  await page.goto(`/transactions/${transactionId}`);
  await page.getByRole('button', { name: '거래 삭제' }).click();
  await page.getByRole('button', { name: '삭제 확인' }).click();
  await expect(page).toHaveURL(/\/transactions$/);

  await page.goto('/settings');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('select-backup').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'pocket-diary-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
  await expect(page.getByTestId('restore-preview')).toContainText('거래 1건');
  await expect(page.getByTestId('restore-preview')).toContainText('현재 거래 0건');
  await page.getByTestId('confirm-restore').click();
  await expect(page.getByTestId('backup-message')).toContainText('복원을 완료');

  await page.goto(`/transactions/${transactionId}`);
  await expect(page.getByText('백업 복원 테스트', { exact: true })).toBeVisible();
  await expect(page.getByText('우유', { exact: true })).toBeVisible();

  await page.goto('/settings');
  const invalidChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('select-backup').click();
  await (await invalidChooserPromise).setFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.getByTestId('backup-error')).toContainText('JSON');
  await expect(page.getByTestId('restore-preview')).toHaveCount(0);
  await page.goto(`/transactions/${transactionId}`);
  await expect(page.getByText('백업 복원 테스트', { exact: true })).toBeVisible();
});
