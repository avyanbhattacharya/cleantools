const { test, expect } = require('@playwright/test');

const catalogLinks = [
  /passport photo/i,
  /japa counter/i,
  /compress pdf/i,
  /merge pdf/i,
  /resize & compress image/i,
  /clean pdf printer/i,
  /document flattener/i,
  /image to pdf/i,
  /split pdf/i,
  /heic to jpg/i,
  /remove photo metadata/i,
  /qr code maker/i,
  /sheetlocal/i,
  /clean html printer/i,
  /photo to scan/i
];

test('homepage presents the private-local story, catalog, and browser navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Clean Local Tools/);
  // Precision Light is light-first: no stored theme means light.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('heading', { name: /useful file tools/i })).toBeVisible();
  await expect(page.getByText('Your files never leave your machine.', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Your file stays on this device')).toBeVisible();
  const themeToggle = page.getByRole('button', { name: /switch color theme/i });
  await expect(themeToggle).toBeVisible();
  await themeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible();

  const cards = page.locator('.tool-grid .tool-card');
  await expect(cards).toHaveCount(15);

  for (const linkName of catalogLinks) {
    await expect(page.getByRole('link', { name: linkName }).first()).toBeVisible();
  }

  await page.getByRole('link', { name: /image to pdf/i }).first().click();
  await expect(page).toHaveURL(/\/image-to-pdf\/$/);
  await expect(page.getByRole('heading', { name: /image to pdf/i }).first()).toBeVisible();
});

test('mobile homepage keeps the promise and all tools on one grid', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /useful file tools/i })).toBeVisible();
  await expect(page.getByLabel('Your file stays on this device')).toBeVisible();

  // The three hero steps stay on a single row at phone width.
  const steps = page.locator('.step-row .step');
  await expect(steps).toHaveCount(3);
  const tops = await steps.evaluateAll(els => els.map(el => el.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);

  const cards = page.locator('.tool-grid .tool-card');
  await expect(cards).toHaveCount(15);
  for (let i = 0; i < 15; i++) {
    await expect(cards.nth(i)).toBeVisible();
  }

  const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
});
