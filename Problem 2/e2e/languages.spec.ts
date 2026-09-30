import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('switches languages, swaps localized input and restores the preference after reload', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Pay amount').fill('1.25');
  await page.getByRole('button', { name: /^Language/ }).click();
  await expect(page.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.locator('.MuiMenu-paper')).toHaveCSS('opacity', '1');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('menuitemradio', { name: 'Tiếng Việt' }).click();
  await expect(page.locator('.MuiMenu-root')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByLabel('Số lượng trả')).toHaveValue('1,25');
  await page.getByLabel('Số lượng trả').fill('3');
  await expect(page.getByRole('alert')).toContainText('Không đủ số dư');
  await page.getByLabel('Số lượng trả').fill('1,25');
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-vietnamese.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Xem lại giao dịch' }).click();
  await expect(page.getByRole('dialog')).toContainText('1,25 ETH');
  await expect(page.locator('.MuiDialog-container')).toHaveCSS('opacity', '1');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/swaps') && r.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Xác nhận hoán đổi mô phỏng' }).click();
  expect((await request).postDataJSON().amount).toBe('1.25');
  await expect(page.getByText('Số dư: 1,25', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Ngôn ngữ/ }).click();
  await page.getByRole('menuitemradio', { name: '日本語' }).click();
  await expect(page.locator('.MuiMenu-root')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByText('残高: 1.25', { exact: true })).toBeVisible();
  await page.getByLabel('支払い数量').fill('０．５');
  await expect(page.getByLabel('支払い数量')).toHaveValue('0.5');
  await expect(page.getByRole('button', { name: '交換内容を確認' })).toBeEnabled();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-japanese.png`,
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('支払い数量')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page).toHaveTitle('Demo Swap — 小さな交換から、新しい可能性へ');
  expect(await page.evaluate(() => localStorage.getItem('demo-swap.language'))).toBe('ja');
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('支払い数量').fill('1');
  await page.getByRole('button', { name: '交換内容を確認' }).click();
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'キャンセル' }).click();
  await page.getByRole('button', { name: /^言語/ }).click();
  await page.getByRole('menuitemradio', { name: 'English' }).click();
  await expect(page.getByLabel('Pay amount')).toHaveValue('1');
  expect(errors).toEqual([]);
});
