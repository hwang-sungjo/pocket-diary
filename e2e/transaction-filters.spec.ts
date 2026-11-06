import { expect, test, type Page } from '@playwright/test';

async function createTransaction(
  page: Page,
  { name, merchant, category, type = '지출' }: {
    name: string;
    merchant: string;
    category: string;
    type?: '지출' | '수입';
  },
) {
  await page.goto('/transactions/new');
  if (type === '수입') {
    await page.getByLabel('거래 유형').getByRole('button', { name: '수입' }).click();
  }
  await page.getByLabel('거래명').fill(name);
  await page.getByLabel('총금액').fill('10000');
  await page.getByLabel('상점 또는 수입처').fill(merchant);
  await page.getByLabel('거래 카테고리').getByRole('button', { name: category, exact: true }).click();
  await page.getByTestId('save-transaction').click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
}

test('월별 내역에서 거래명·상점명 검색과 유형·카테고리 필터를 조합한다', async ({ page }) => {
  await createTransaction(page, {
    name: '주말 장보기',
    merchant: '동네마트',
    category: '장보기',
  });
  await createTransaction(page, {
    name: '영화 관람',
    merchant: '시네마',
    category: '문화·여가',
  });
  await createTransaction(page, {
    name: '외주 정산',
    merchant: 'ProjectA',
    category: '부수입',
    type: '수입',
  });

  await page.goto('/transactions');
  await expect(page.getByTestId('transaction-result-count')).toHaveText('3건');
  const search = page.getByLabel('거래명 또는 상점명 검색');
  await search.fill('  projecta  ');
  await expect(page.getByTestId('transaction-result-count')).toHaveText('1건');
  await expect(page.getByText('외주 정산', { exact: true })).toBeVisible();

  await search.fill('영화');
  await expect(page.getByTestId('transaction-result-count')).toHaveText('1건');
  await expect(page.getByText('영화 관람', { exact: true })).toBeVisible();

  await search.fill('');
  await page.getByTestId('transaction-type-filter').getByRole('button', { name: '지출' }).click();
  await expect(page.getByTestId('transaction-result-count')).toHaveText('2건');
  await page.getByTestId('transaction-category-filter').getByRole('button', { name: '장보기' }).click();
  await expect(page.getByTestId('transaction-result-count')).toHaveText('1건');
  await expect(page.getByText('주말 장보기', { exact: true })).toBeVisible();

  await search.fill('시네마');
  await expect(page.getByTestId('transaction-result-count')).toHaveText('0건');
  await expect(page.getByText('검색·필터 조건에 맞는 거래가 없습니다.')).toBeVisible();

  await search.fill('');
  await page.getByTestId('transaction-type-filter').getByRole('button', { name: '수입' }).click();
  await expect(page.getByTestId('transaction-result-count')).toHaveText('1건');
  await expect(page.getByText('외주 정산', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByTestId('transaction-result-count')).toHaveText('3건');
});
