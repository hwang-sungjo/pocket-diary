import { expect, test } from '@playwright/test';

test('빈 화면과 기본 접근성 정보를 제공한다', async ({ page }) => {
  await page.goto('/transactions');
  await expect(page.getByRole('heading', { name: '내역' })).toBeVisible();
  await expect(page.getByText('거래가 없습니다', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: '품목' }).click();
  await expect(page.getByRole('heading', { name: '품목' })).toBeVisible();
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible();
  await expect(page.getByLabel('제품명 검색')).toBeVisible();

  await page.getByRole('tab', { name: '통계' }).click();
  await expect(page.getByRole('heading', { name: '통계' })).toBeVisible();
  await expect(page.getByText('선택한 달에 확정된 지출이 없습니다.')).toBeVisible();
  await expect(page.getByLabel('수입 0원')).toBeVisible();
  await expect(page.getByLabel('지출 0원')).toBeVisible();
  await expect(page.getByLabel('잔액 0원')).toBeVisible();

  const unnamedInteractiveElements = await page
    .locator('[role="button"], [role="tab"], input, textarea')
    .evaluateAll((elements) =>
      elements.filter((element) => {
        const name =
          element.getAttribute('aria-label') ??
          element.getAttribute('placeholder') ??
          element.textContent;
        return !name?.trim();
      }).length,
    );
  expect(unnamedInteractiveElements).toBe(0);
});

test('로컬 저장소 오류를 중단 대신 사용자 메시지로 표시한다', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      get: () => undefined,
    });
  });

  await page.goto('/stats');
  await expect(page.getByTestId('statistics-error')).toContainText(
    'IndexedDB를 사용할 수 없습니다',
  );
});

test('인터넷 연결이 끊긴 상태에서 거래를 저장하고 앱 재실행 후 조회한다', async ({
  context,
  page,
}) => {
  await page.goto('/transactions/new');
  await expect(page.getByTestId('save-transaction')).toBeEnabled();
  await context.setOffline(true);

  await page.getByLabel('거래명').fill('Day 7 오프라인 거래');
  await page.getByLabel('총금액').fill('77000');
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  await expect(
    page.getByText('Day 7 오프라인 거래', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: '내역으로 돌아가기' }).click();
  await expect(
    page.getByText('Day 7 오프라인 거래', { exact: true }),
  ).toBeVisible();

  await context.setOffline(false);
  const restartedPage = await context.newPage();
  await restartedPage.goto('/transactions');
  await expect(
    restartedPage.getByText('Day 7 오프라인 거래', { exact: true }),
  ).toBeVisible();
  await restartedPage.close();
});

test('큰 금액을 저장하고 작은 화면에서도 잘림 없이 조회한다', async ({ page }) => {
  const largeAmount = '900000000000000';
  const formattedLargeAmount = '900,000,000,000,000원';

  await page.goto('/transactions/new');
  await page.getByLabel('거래명').fill('Day 7 큰 금액');
  await page.getByLabel('총금액').fill(largeAmount);
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  await expect(page.getByText(formattedLargeAmount, { exact: true }).first()).toBeVisible();

  await page.goto('/transactions');
  await expect(page.getByText(formattedLargeAmount, { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.goto('/stats');
  await expect(page.getByTestId('monthly-expense')).toContainText(
    formattedLargeAmount,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
