const { test, expect } = require('@playwright/test');
const { toolContracts } = require('./tool-contracts');

for (const { route, heading } of toolContracts) {
  test(`${route} cross-browser smoke`, async ({ page }) => {
    const pageErrors = [];
    const brokenLocal = [];

    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('response', response => {
      const url = response.url();
      if (url.startsWith('http://127.0.0.1:4173') && response.status() >= 400) {
        brokenLocal.push(`${response.status()} ${url}`);
      }
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator('h1').first()).toContainText(heading);
    await expect(page.locator('body')).toContainText('Your files never leave your machine.');

    const metrics = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll('body *')]
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth
          };
        })
        .filter(item => item.right > clientWidth + 2 || item.left < -2 || item.scrollWidth > item.clientWidth + 2)
        .slice(0, 12);
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth,
        offenders
      };
    });
    const overflowMessage = `${route} horizontal overflow; offenders=${JSON.stringify(metrics.offenders)}`;
    expect(metrics.scrollWidth - metrics.clientWidth, overflowMessage).toBeLessThanOrEqual(2);

    expect(pageErrors, `page errors on ${route}`).toEqual([]);
    expect(brokenLocal, `broken local assets on ${route}`).toEqual([]);
  });
}

test('migrated tool surfaces stay readable in default dark theme', async ({ page }) => {
  for (const { route } of toolContracts.filter(({ route }) => route !== '/' && route !== '/about/' && route !== '/principles/')) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const whiteSurfaces = await page.evaluate(() => {
      const selectors = [
        '.card', '.privacy', '.drop', '.dropzone', '.file-panel', '.settings',
        '.metric', '.mode', '.page-tile', '.row', '.result', '.info', '.content'
      ].join(',');
      return [...document.querySelectorAll(selectors)]
        .filter(el => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map(el => {
          const style = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            backgroundColor: style.backgroundColor,
            color: style.color
          };
        })
        .filter(item => item.backgroundColor === 'rgb(255, 255, 255)')
        .slice(0, 8);
    });
    expect(whiteSurfaces, `${route} has pure-white legacy surfaces in dark theme`).toEqual([]);
  }
});

test('public documentation pages use the composed brand layout', async ({ page }) => {
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  const metrics = await page.evaluate(() => {
    const hero = document.querySelector('.brand-hero-grid');
    const heroBox = hero.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      heroWidth: heroBox.width,
      heroColumns: getComputedStyle(hero).gridTemplateColumns,
      valueCount: document.querySelectorAll('.brand-value').length,
      storyCount: document.querySelectorAll('.brand-story-section').length,
      trustCardCount: document.querySelectorAll('.brand-trust-card').length,
      activeNav: document.querySelector('[aria-current="page"]')?.textContent,
      hasLegacyArticle: Boolean(document.querySelector('.doc-article'))
    };
  });
  expect(metrics.heroWidth).toBeGreaterThan(Math.min(metrics.viewportWidth - 80, 900));
  expect(metrics.valueCount).toBe(3);
  expect(metrics.storyCount).toBeGreaterThanOrEqual(4);
  expect(metrics.trustCardCount).toBe(2);
  expect(metrics.activeNav).toBe('About');
  expect(metrics.hasLegacyArticle).toBe(false);
  if (metrics.viewportWidth > 820) expect(metrics.heroColumns.split(' ').length).toBe(2);
  else expect(metrics.heroColumns.split(' ').length).toBe(1);
});
