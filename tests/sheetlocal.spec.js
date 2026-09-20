const { test, expect } = require('@playwright/test');
const path = require('node:path');

const fixture = path.join(__dirname, 'fixtures', 'sheetlocal-budget.csv');

test('SheetLocal profiles a local CSV and runs guided analyses', async ({ page }) => {
  const externalRequests = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1'].includes(url.hostname)) externalRequests.push(url.href);
  });

  await page.goto('/sheetlocal/');
  await expect(page.getByRole('heading', { name: 'Understand a spreadsheet without uploading it.' })).toBeVisible();
  await expect(page.getByText('Your files never leave your machine.')).toBeVisible();

  await page.locator('#csvFile').setInputFiles(fixture);
  await expect(page.getByText('sheetlocal-budget.csv')).toBeVisible();
  await expect(page.getByLabel('Spreadsheet profile').locator('.sheetlocal-profile-card').first()).toContainText(/10\s*rows/);
  await expect(page.getByText('Showing 10 of 10 rows')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spreadsheet overview' })).toBeVisible();

  await page.getByRole('button', { name: 'Top categories' }).click();
  await expect(page.getByRole('heading', { name: 'Top categories' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '$2,416.00' })).toBeVisible();

  await page.getByRole('button', { name: 'Find duplicates' }).click();
  await expect(page.getByText('Found 1 repeated row across 1 matching group.')).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('SheetLocal keeps questions constrained and downloads reports locally', async ({ page }) => {
  await page.goto('/sheetlocal/');
  await page.locator('#csvFile').setInputFiles(fixture);
  await expect(page.getByText('sheetlocal-budget.csv')).toBeVisible();

  await page.locator('#questionInput').fill('Which values look unusual?');
  await page.getByRole('button', { name: 'Analyze' }).click();
  await expect(page.getByRole('heading', { name: 'Unusual values' })).toBeVisible();
  await expect(page.getByText('Recognized your question as “Unusual values.” The result above is calculated locally using that fixed analysis.')).toBeVisible();

  await page.locator('#questionInput').fill('Write arbitrary SQL for this spreadsheet');
  await page.getByRole('button', { name: 'Analyze' }).click();
  await expect(page.getByText('I can map questions about top categories, periods, duplicates, unusual values, missing data, or an overview. This stays local and does not use an AI model.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sheetlocal-report.txt');
});

test('SheetLocal maps approved typed questions to deterministic analyses', async ({ page }) => {
  await page.goto('/sheetlocal/');
  await page.locator('#csvFile').setInputFiles(fixture);

  for (const [question, result] of [
    ['Are there repeated transactions?', 'Duplicate rows'],
    ['Show empty fields', 'Missing data'],
    ['How did this change over time?', 'Compare periods'],
    ['Which category is highest?', 'Top categories'],
    ['Give me a summary', 'Spreadsheet overview']
  ]) {
    await page.locator('#questionInput').fill(question);
    await page.getByRole('button', { name: 'Analyze' }).click();
    await expect(page.getByRole('heading', { name: result })).toBeVisible();
  }
});
