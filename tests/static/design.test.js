const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
// Emoji, pictographs, miscellaneous symbols, and dingbats. Arrows
// (U+2190-U+21FF) are typographic chrome and intentionally allowed.
const EMOJI = new RegExp(
  '[' +
    '\\u{1F300}-\\u{1FAFF}' + // emoticons, pictographs, symbols
    '\\u{2600}-\\u{26FF}' + // miscellaneous symbols
    '\\u{2700}-\\u{27BF}' + // dingbats
    '\\u{2B00}-\\u{2BFF}' + // miscellaneous symbols and arrows (pictographic block)
    '\\uFE0F' + // variation selector-16
    ']',
  'u'
);

test('homepage chrome uses the SVG icon set, never emoji', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(homepage, EMOJI, 'index.html contains emoji UI chrome');
  assert.ok(homepage.includes('ui-icon'), 'index.html should use the shared icon set');
});

test('Astro shell chrome uses the SVG icon set, never emoji', () => {
  for (const file of ['src/pages/index.astro', 'src/components/ToolShell.astro']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, EMOJI, `${file} contains emoji UI chrome`);
  }
});

test('rendered tool pages use the SVG icon set, never emoji', async () => {
  const { loadLegacyTool, toolRoutes } = await import('../../src/lib/legacy-tools.js');
  const routes = [...toolRoutes.map(route => [route, 'index.html']), ['japa-counter', 'tap.html']];
  for (const [route, file] of routes) {
    const tool = loadLegacyTool(route, file);
    assert.doesNotMatch(tool.body, EMOJI, `${route}/${file} rendered body contains emoji UI chrome`);
    assert.doesNotMatch(tool.head, EMOJI, `${route}/${file} rendered head contains emoji UI chrome`);
  }
});

test('shared icon set covers every tool icon used on the homepage', async () => {
  const { ICONS } = await import('../../src/lib/icons.js');
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const used = [...homepage.matchAll(/ui-icon--([a-z-]+)/g)].map(match => match[1]);
  assert.ok(used.length > 0, 'homepage should reference shared icons');
  for (const name of new Set(used)) {
    assert.ok(ICONS[name], `homepage uses unknown icon: ${name}`);
  }
});

test('theme is light-first with a color-only dark override', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
  const flat = css.replace(/\s+/g, '');
  // Light is the default: :root carries the light palette.
  assert.ok(flat.includes('--bg:#f8fafc'), ':root should default to the light background');
  assert.ok(flat.includes('--accent:#165dff'), ':root should default to the light accent');
  assert.ok(flat.includes('color-scheme:light'), ':root should declare color-scheme: light');
  // Dark exists as an override with the agreed blue accent (no red).
  assert.ok(flat.includes('html[data-theme=dark]'), 'dark theme override must exist');
  assert.ok(flat.includes('--accent:#78a6ff'), 'dark accent must be the refined blue');
  assert.ok(flat.includes('color-scheme:dark'), 'dark override should declare color-scheme: dark');
  // Card shadow geometry is identical between modes: the toggle swaps colors only.
  const shadows = flat.match(/--card-shadow:022px50px/g) || [];
  assert.ok(shadows.length >= 2, 'card shadow geometry must be identical in both modes');
});

test('theme scripts default to light, stored choice still wins', () => {
  for (const file of ['src/pages/index.astro', 'src/components/ToolShell.astro']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(
      source.includes("localStorage.getItem('clean-local-theme')||'light'"),
      `${file} should default to light when nothing is stored`
    );
  }
});
