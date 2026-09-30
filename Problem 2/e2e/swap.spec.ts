import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('renders, validates, reviews and swaps without console errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByLabel('Pay amount')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter an amount' })).toBeDisabled();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-initial.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, message: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.getByLabel('Pay amount').fill('3');
  await expect(page.getByRole('alert')).toContainText('Not enough balance');
  await page.getByLabel('Pay amount').fill('1');
  await page.getByRole('button', { name: 'Review swap' }).click();
  await expect(page.getByRole('dialog')).toContainText('Simulated transaction');
  await expect(page.locator('.MuiDialog-container')).toHaveCSS('opacity', '1');
  const reviewA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(
    reviewA11y.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Confirm demo swap' }).click();
  await expect(page.getByRole('alert')).toContainText('Your demo balances are updated');
  await expect(page.getByText('Balance: 1.5', { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-success.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test('token search, sample labels, keyboard dismissal and direction reversal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Pay amount')).toBeVisible();
  await page.getByLabel('Select pay token, ETH').click();
  await page.getByLabel('Search tokens').fill('nonsensezzz');
  await expect(page.getByText('No tokens found')).toBeVisible();
  await page.getByLabel('Search tokens').fill('BTC');
  await page.getByRole('button', { name: 'Select BTC', exact: true }).click();
  await expect(page.getByText('Includes generated sample prices')).toBeVisible();
  await page.getByRole('button', { name: 'MAX', exact: true }).click();
  await expect(page.getByLabel('Pay amount')).toHaveValue('0.05000000');
  await page.getByLabel('Reverse swap direction').click();
  await expect(page.getByLabel('Select pay token, USDC')).toBeVisible();
  await page.getByLabel('Select receive token, BTC').click();
  await expect(page.locator('.MuiDialog-container')).toHaveCSS('opacity', '1');
  const pickerA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(
    pickerA11y.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('handles long token symbols on narrow screens and broken icon fallback', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.context().route('**/tokens/ETH.svg', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
  await expect(page.getByLabel('Pay amount')).toBeVisible();
  await expect(
    page.getByLabel('Select pay token, ETH').getByText('ET', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Select pay token, ETH').click();
  await page.getByLabel('Search tokens').fill('LPberaSTONE');
  await page.getByRole('button', { name: 'Select LPberaSTONE_10APR2025', exact: true }).click();
  await page.getByRole('button', { name: 'MAX', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Review swap' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
});

test('starts in English, initializes a JWT and protects the mock API', async ({ page }) => {
  const requests: { path: string; authorization: string | undefined }[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/'))
      requests.push({ path, authorization: request.headers()['authorization'] });
  });
  await page.goto('/');
  await expect(page.getByLabel('Pay amount')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Demo Swap — A little change goes a long way');
  expect(requests[0].path).toBe('/api/auth/token');
  expect(requests.find((request) => request.path === '/api/tokens')?.authorization).toMatch(
    /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/,
  );
  const statuses = await page.evaluate(async () => {
    const missing = await fetch('/api/tokens');
    const invalid = await fetch('/api/swaps', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad.jwt.token' },
      body: '{}',
    });
    const issued = await fetch('/api/auth/token', { method: 'POST' }).then((r) => r.json());
    const valid = await fetch('/api/tokens', {
      headers: { Authorization: 'Bearer ' + issued.token },
    });
    return [missing.status, invalid.status, valid.status];
  });
  expect(statuses).toEqual([401, 401, 200]);
});
