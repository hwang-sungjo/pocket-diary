import { expect, test } from '@playwright/test';

test('홈에서 최근 거래와 다음 반복 예정일을 보여주고 변경을 반영한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home-recent-transactions')).toContainText('아직 저장된 거래가 없습니다.');
  await expect(page.getByTestId('home-upcoming-recurring')).toContainText('예정된 반복 거래가 없습니다.');

  await page.goto('/transactions/new');
  await page.getByLabel('거래명').fill('홈 최근 거래 검증');
  await page.getByLabel('총금액').fill('12345');
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  const transactionId = page.url().split('/').at(-1);
  expect(transactionId).toBeTruthy();

  await page.goto('/');
  const recent = page.getByTestId(`home-recent-transaction-${transactionId}`);
  await expect(recent).toContainText('홈 최근 거래 검증');
  await expect(recent).toContainText('-12,345원');
  await expect(page.getByTestId('monthly-expense')).toContainText('12,345원');
  await recent.click();
  await expect(page).toHaveURL(new RegExp(`/transactions/${transactionId}$`));

  await page.goto('/settings');
  await page.getByLabel('반복 거래명').fill('홈 반복 예정 검증');
  await page.getByLabel('반복 금액').fill('8900');
  await page.getByLabel('시작일').fill('2099-01-01');
  await page.getByTestId('save-recurring-rule').click();
  const rule = page.getByTestId(/^recurring-rule-[0-9a-f]{8}-/).filter({ hasText: '홈 반복 예정 검증' });
  await expect(rule).toBeVisible();

  await page.goto('/');
  const upcoming = page.getByTestId(/^home-upcoming-rule-/).filter({ hasText: '홈 반복 예정 검증' });
  await expect(upcoming).toContainText('2099');
  await expect(upcoming).toContainText('8,900원');
  await page.getByRole('button', { name: '규칙 관리' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await rule.getByRole('button', { name: '홈 반복 예정 검증 중지' }).click();

  await page.goto('/');
  await expect(page.getByTestId('home-upcoming-recurring')).toContainText('예정된 반복 거래가 없습니다.');
});
