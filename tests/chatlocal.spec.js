const { test, expect } = require('@playwright/test');

test('ChatLocal presents a usable local-AI compatibility state and never enables chat before a model is ready', async ({ page }) => {
  await page.goto('/chatlocal/');
  await expect(page.getByRole('heading', { name: /chatgpt that never leaves your laptop/i })).toBeVisible();
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
