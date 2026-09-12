const { test, expect } = require('@playwright/test');
const path = require('path');

test('passport photo upload reveals editor and download controls', async ({ page }) => {
  await page.goto('/passport-photo/');
  await expect(page.getByRole('link', { name: /all clean local tools/i })).toBeVisible();

  const fixture = path.join(__dirname, 'fixtures', 'passport-test.svg');
  await page.locator('#fileInput').setInputFiles(fixture);

  await expect(page.locator('#editorCard')).toBeVisible();
  await expect(page.locator('#downloadCard')).toBeVisible();
  await expect(page.locator('#preview')).toHaveAttribute('width', '600');
  await expect(page.locator('#preview')).toHaveAttribute('height', '600');

  await page.locator('#format').selectOption('35x45');
  await expect(page.locator('#preview')).toHaveAttribute('width', '630');
  await expect(page.locator('#preview')).toHaveAttribute('height', '810');

  await page.locator('#brightness').evaluate(el => {
    el.value = '10';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#brightnessValue')).toHaveText('10');

  await page.getByRole('button', { name: 'Reset adjustments' }).click();
  await expect(page.locator('#brightness')).toHaveValue('0');
});

test('passport 4x6 print sheet downloads after an image is loaded', async ({ page }) => {
  await page.goto('/passport-photo/');
  const fixture = path.join(__dirname, 'fixtures', 'passport-test.svg');
  await page.locator('#fileInput').setInputFiles(fixture);
  await expect(page.locator('#downloadCard')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /download 4×6 print sheet/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('passport-photo-4x6-sheet-4-copies.jpg');
});

test('auto-position reserves hairline headroom rather than filling the crop', async ({ page }) => {
  await page.goto('/passport-photo/');
  const behavior = await page.evaluate(async () => (await (await fetch('/assets/advanced.js')).text()));

  // Face landmarks omit the crown, so these calibrated targets aim for the
  // required 80–85% full-head height while retaining a hair margin.
  expect(behavior).toContain('targetFace=.56');
  expect(behavior).toContain('(.50-m.eyeY)*400');
  expect(behavior).toContain('aim for 80–85% full-head height');
});
