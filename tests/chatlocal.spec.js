const { test, expect } = require('@playwright/test');

test('Local AI Lab introduces Local Chat without changing its route', async ({ page }) => {
  await page.goto('/local-ai-lab/');
  await expect(page.getByRole('heading', { name: /local ai lab/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /open local chat/i })).toBeVisible();

  await page.getByRole('link', { name: /open local chat/i }).click();
  await expect(page).toHaveURL(/\/chatlocal\/$/);
  await expect(page.getByRole('heading', { name: /private ai chat that runs on your device/i })).toBeVisible();
});

test('Local AI Lab exposes the safe Workspace module', async ({ page }) => {
  await page.goto('/local-ai-lab/');
  await page.getByRole('link', { name: /available now workspace/i }).click();
  await expect(page).toHaveURL(/\/workspace\/$/);
  await expect(page.getByRole('heading', { name: /safe home for local work/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /choose workspace folder/i })).toBeVisible();
  await expect(page.locator('#commandInput')).toBeDisabled();
  await expect(page.locator('.workspace-footnote')).toContainText(/no rm.*package installer.*network command/i);
});

test('ChatLocal presents a usable local-AI compatibility state and never enables chat before a model is ready', async ({ page }) => {
  await page.goto('/chatlocal/');
  await expect(page.getByRole('heading', { name: /private ai chat that runs on your device/i })).toBeVisible();
  await expect(page.locator('#promptInput')).toBeDisabled();
  await expect(page.getByRole('button', { name: /prepare private chat/i })).toBeDisabled();
  await expect(page.locator('#messages')).toContainText(/prepare a model/i);
  await expect(page.locator('#modelStatus')).toContainText(/browser|device|local ai|webgpu/i);
  await expect(page.getByRole('button', { name: /clear conversation/i })).toBeEnabled();
});

test('ChatLocal keeps the expected model choices and local controls available', async ({ page }) => {
  await page.goto('/chatlocal/');
  await expect(page.locator('#modelSelect')).toHaveValue('Phi-3-mini-4k-instruct-q4f16_1-MLC');
  await expect(page.locator('#modelSelect')).toContainText(/mistral 7b/i);
  await expect(page.getByRole('button', { name: /remove downloaded model/i })).toBeDisabled();
});
