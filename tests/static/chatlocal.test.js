const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('ChatLocal keeps its local-only model and persistence contract explicit', () => {
  const html = read('chatlocal/index.html');
  const app = read('chatlocal/app.js');
  const worker = read('chatlocal/chat-worker.js');
  assert.match(html, /Your files never leave your machine\./);
  assert.match(html, /No hidden cloud fallback/);
  assert.match(html, /id="prepareButton"/);
  assert.match(html, /id="messages"/);
  assert.match(app, /Phi-3-mini-4k-instruct-q4f16_1-MLC/);
  assert.match(html, /Mistral-7B-Instruct-v0\.3-q4f16_1-MLC/);
  assert.match(app, /cacheBackend:\s*'cache'/);
  assert.match(app, /indexedDB\.open/);
  assert.match(app, /CreateWebWorkerMLCEngine/);
  assert.match(app, /stream:\s*true/);
  assert.match(app, /deleteModelAllInfoInCache/);
  assert.doesNotMatch(app, /fetch\s*\(/);
  assert.match(worker, /WebWorkerMLCEngineHandler/);
  assert.match(worker, /@mlc-ai\/web-llm@0\.2\.85/);
});
