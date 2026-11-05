import { expect, test } from '@playwright/test';

test('한 번 연 앱을 서버 연결 없이 다시 열어 IndexedDB CRUD를 수행한다', async ({
  context,
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.close();

  const createPage = await context.newPage();
  await createPage.goto('/transactions/new');
  await expect(
    createPage.getByRole('heading', { name: '거래 등록' }),
  ).toBeVisible();
  await createPage.getByLabel('거래명').fill('PWA 오프라인 콜드 스타트');
  await createPage.getByLabel('총금액').fill('24000');
  await createPage.getByTestId('save-transaction').click();
  await expect(createPage).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  const transactionId = createPage.url().split('/').at(-1);
  expect(transactionId).toBeTruthy();
  await createPage.close();

  const readPage = await context.newPage();
  await readPage.goto(`/transactions/${transactionId as string}`);
  await expect(
    readPage.getByText('PWA 오프라인 콜드 스타트', { exact: true }),
  ).toBeVisible();

  await readPage.getByTestId('edit-transaction').click();
  await expect(
    readPage.getByRole('heading', { name: '거래 수정' }),
  ).toBeVisible();
  await expect(readPage.getByLabel('거래명')).toHaveValue(
    'PWA 오프라인 콜드 스타트',
  );
  await readPage
    .getByLabel('거래명')
    .fill('PWA 오프라인 콜드 스타트 수정');
  await readPage.getByTestId('save-transaction').click();
  await expect(readPage).toHaveURL(
    new RegExp(`/transactions/${transactionId as string}$`),
  );
  await expect(
    readPage.getByText('PWA 오프라인 콜드 스타트 수정', { exact: true }),
  ).toBeVisible();

  await readPage.getByRole('button', { name: '거래 삭제' }).click();
  await readPage.getByRole('button', { name: '삭제 확인' }).click();
  await expect(readPage).toHaveURL(/\/transactions$/);
  await readPage.close();

  const restartedPage = await context.newPage();
  await restartedPage.goto('/transactions');
  await expect(
    restartedPage.getByText('PWA 오프라인 콜드 스타트 수정', {
      exact: true,
    }),
  ).toHaveCount(0);
});
