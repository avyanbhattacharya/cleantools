const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Astro builds the existing homepage and passes local tool routes through unchanged', () => {
  const packageJson = JSON.parse(read('package.json'));
  const config = read('astro.config.mjs');
  const sync = read('scripts/sync-astro-public.js');
  const homepage = read('src/pages/index.astro');
  assert.equal(packageJson.devDependencies.astro, '7.3.2');
  assert.match(packageJson.scripts.build, /astro build/);
  assert.match(config, /output:\s*'static'/);
  assert.match(sync, /'passport-photo'/);
  assert.match(sync, /'japa-counter'/);
  assert.match(homepage, /readFileSync/);
  assert.match(homepage, /set:html/);
});

test('GitHub Pages deployment publishes the generated Astro output', () => {
  const workflow = read('.github/workflows/deploy-pages.yml');
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3/);
  assert.match(workflow, /path: dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
