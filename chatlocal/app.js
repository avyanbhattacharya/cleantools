const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.85';
const DEFAULT_MODEL = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';
const SYSTEM_PROMPT = 'You are ChatLocal, a concise and helpful assistant. You run entirely in the user\'s browser. Do not claim to access the internet, external accounts, or files unless the user has provided their contents in this conversation.';
const MAX_MESSAGES = 24;
const HISTORY_DB = 'chatlocal-history-v1';
const HISTORY_STORE = 'conversations';

const $ = id => document.getElementById(id);
const elements = {
  model: $('modelSelect'), prepare: $('prepareButton'), clearModel: $('clearModelButton'), progressWrap: $('progressWrap'), progress: $('modelProgress'), progressText: $('progressText'), status: $('modelStatus'), messages: $('messages'), composer: $('composer'), prompt: $('promptInput'), send: $('sendButton'), hint: $('composerHint'), clearConversation: $('clearConversationButton'), error: $('chatError'), diagnostics: $('diagnosticsPanel'), diagnosticsOutput: $('diagnosticsOutput'), copyDiagnostics: $('copyDiagnosticsButton')
};

let webllm = null;
let engine = null;
let worker = null;
let ready = false;
let generating = false;
let history = [];
let supported = false;
let adapter = null;
let setupStage = 'Page loaded';
const diagnostics = [];

function activeModel() { return elements.model.value || DEFAULT_MODEL; }
function setStatus(message, unsupported = false) { elements.status.textContent = message; elements.status.classList.toggle('unsupported', unsupported); }
function setError(message = '') { elements.error.hidden = !message; elements.error.textContent = message; }
function setReady(value) { ready = value; elements.prompt.disabled = !value; elements.send.disabled = !value; elements.model.disabled = generating || value; elements.prepare.disabled = !supported || generating || value; elements.clearModel.disabled = !webllm || generating; elements.hint.textContent = value ? 'Runs privately on this device' : 'Local model not ready'; }
function errorDetails(error) {
  if (!error) return 'No error details were supplied by the browser.';
  if (error instanceof Error) return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  const eventDetails = [error.type, error.message, error.filename, error.lineno && `line ${error.lineno}`, error.colno && `column ${error.colno}`, error.error && errorDetails(error.error)].filter(Boolean);
  if (eventDetails.length) return eventDetails.join(' · ');
  try { return JSON.stringify(error); } catch { return String(error); }
}
function renderDiagnostics(show = false) {
  const capabilities = `secure context: ${Boolean(globalThis.isSecureContext)}\nWebGPU API: ${Boolean(navigator.gpu)}\nWeb Worker: ${typeof Worker !== 'undefined'}\nIndexedDB: ${typeof indexedDB !== 'undefined'}`;
  elements.diagnosticsOutput.textContent = [`ChatLocal local diagnostics`, `Current stage: ${setupStage}`, capabilities, '', ...diagnostics].join('\n');
  elements.diagnostics.hidden = !show;
  if (show) elements.diagnostics.open = true;
}
function recordDiagnostic(stage, detail, show = false) {
  diagnostics.push(`[${new Date().toISOString()}] ${stage}: ${detail}`);
  if (diagnostics.length > 30) diagnostics.shift();
  renderDiagnostics(show);
}
function megabytes(bytes) { return Math.round(bytes / (1024 * 1024)); }
function modelRecord(model) { return webllm && webllm.prebuiltAppConfig && Array.isArray(webllm.prebuiltAppConfig.model_list) ? webllm.prebuiltAppConfig.model_list.find(record => record.model_id === model) : null; }
async function probeComputePipeline(record) {
  const required = (record && record.required_features) || [];
  const missing = required.filter(feature => !adapter.features.has(feature));
  if (missing.length) return { ok: false, reason: `This model requires unsupported WebGPU feature(s): ${missing.join(', ')}.` };
  let device;
  try {
    device = await adapter.requestDevice({ requiredFeatures: required });
    const usesF16 = required.includes('shader-f16');
    const code = usesF16 ? 'enable f16; @compute @workgroup_size(1) fn main() { let value: f16 = 1.0h; }' : '@compute @workgroup_size(1) fn main() { }';
    const module = device.createShaderModule({ code });
    await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'main' } });
    return { ok: true };
  } catch (error) { return { ok: false, reason: `The browser could not compile a basic local compute pipeline: ${errorDetails(error).split('\n')[0]}` }; }
  finally { if (device) device.destroy(); }
}
async function checkModelCompatibility() {
  setupStage = 'Checking model compatibility'; renderDiagnostics(); setStatus('Checking local GPU compatibility before downloading a model…');
  if (!webllm) { webllm = await import(WEBLLM_URL); recordDiagnostic('Loading WebLLM runtime', 'Pinned WebLLM module loaded for compatibility check.'); }
  const record = modelRecord(activeModel());
  if (!record) return { ok: false, reason: 'This model is not available in the pinned local runtime.' };
  const limits = adapter.limits;
  const vram = record.vram_required_MB ? `${Math.ceil(record.vram_required_MB)} MB estimated model GPU memory` : 'no model GPU-memory estimate';
  const buffer = record.buffer_size_required_bytes;
  recordDiagnostic(setupStage, `${activeModel()}: ${vram}; max GPU buffer ${megabytes(limits.maxBufferSize)} MB; max storage binding ${megabytes(limits.maxStorageBufferBindingSize)} MB.`);
  if (buffer && limits.maxStorageBufferBindingSize < buffer) return { ok: false, reason: `This model needs a ${megabytes(buffer)} MB GPU storage buffer, but this browser allows ${megabytes(limits.maxStorageBufferBindingSize)} MB.` };
  const compute = await probeComputePipeline(record);
  if (!compute.ok) return compute;
  return { ok: true, note: `${vram}. The browser does not reveal total available GPU memory, so this is a capability check—not a guarantee of model initialization.` };
}

function openHistoryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(HISTORY_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readHistory() {
  try {
    const db = await openHistoryDb();
    const value = await new Promise((resolve, reject) => { const tx = db.transaction(HISTORY_STORE, 'readonly'); const request = tx.objectStore(HISTORY_STORE).get('active'); request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error); });
    db.close();
    return Array.isArray(value) ? value.filter(message => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string').slice(-MAX_MESSAGES) : [];
  } catch { return []; }
}
async function saveHistory() {
  try { const db = await openHistoryDb(); await new Promise((resolve, reject) => { const tx = db.transaction(HISTORY_STORE, 'readwrite'); tx.objectStore(HISTORY_STORE).put(history.slice(-MAX_MESSAGES), 'active'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close(); } catch { /* A blocked local store must not prevent private chat. */ }
}
async function clearHistory() {
  history = [];
  try { const db = await openHistoryDb(); await new Promise((resolve, reject) => { const tx = db.transaction(HISTORY_STORE, 'readwrite'); tx.objectStore(HISTORY_STORE).delete('active'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close(); } catch { /* no-op */ }
  renderMessages();
}
function messageNode(message) {
  const node = document.createElement('article'); node.className = `message ${message.role}`;
  const label = document.createElement('span'); label.className = 'message-label'; label.textContent = message.role === 'user' ? 'YOU' : 'CHATLOCAL';
  const content = document.createElement('div'); content.textContent = message.content;
  node.append(label, content); return node;
}
function renderMessages(streamingMessage = null) {
  elements.messages.replaceChildren();
  const all = streamingMessage ? [...history, streamingMessage] : history;
  if (!all.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = ready ? 'Ask ChatLocal anything. This conversation stays only in this browser.' : 'Prepare a model to start chatting. Your conversation is stored only in this browser.'; elements.messages.append(empty); return; }
  all.forEach(message => elements.messages.append(messageNode(message))); elements.messages.scrollTop = elements.messages.scrollHeight;
}
function usableWebGPU() { return Boolean(globalThis.isSecureContext && navigator.gpu && typeof Worker !== 'undefined' && typeof indexedDB !== 'undefined'); }
async function checkSupport() {
  setupStage = 'Checking browser support'; renderDiagnostics();
  history = await readHistory(); renderMessages();
  if (!usableWebGPU()) { supported = false; setReady(false); recordDiagnostic(setupStage, 'Required browser capability unavailable.', true); setStatus('This browser cannot run ChatLocal yet. It needs a secure context, WebGPU, a Web Worker, and local browser storage. No messages have been uploaded.', true); return; }
  try { setupStage = 'Probing WebGPU adapter'; adapter = await Promise.race([navigator.gpu.requestAdapter(), new Promise(resolve => setTimeout(() => resolve(null), 2500))]); if (!adapter) { supported = false; setReady(false); recordDiagnostic(setupStage, 'No usable adapter returned within 2.5 seconds.', true); setStatus('This browser exposes WebGPU but no usable adapter was found. ChatLocal will not send your messages to a cloud fallback.', true); return; } supported = true; setReady(false); recordDiagnostic(setupStage, `Usable adapter found. Max GPU buffer: ${megabytes(adapter.limits.maxBufferSize)} MB; max storage binding: ${megabytes(adapter.limits.maxStorageBufferBindingSize)} MB.`); setStatus('This browser exposes WebGPU. Model compatibility will be checked before any large download.'); }
  catch (error) { supported = false; setReady(false); recordDiagnostic(setupStage, errorDetails(error), true); setStatus('WebGPU could not start on this device. ChatLocal will not send your messages to a cloud fallback.', true); }
}
function progressCallback(report) { elements.progressWrap.hidden = false; const value = Number(report && report.progress); elements.progress.value = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; elements.progressText.textContent = (report && report.text) || 'Preparing local model…'; }
async function prepare() {
  if (!supported || generating) return;
  setError(''); elements.diagnostics.hidden = true; setReady(false); elements.prepare.disabled = true; elements.model.disabled = true; setupStage = 'Loading WebLLM runtime'; renderDiagnostics(); setStatus('Loading the WebLLM runtime…');
  try {
    const compatibility = await checkModelCompatibility();
    if (!compatibility.ok) throw new Error(compatibility.reason);
    recordDiagnostic('Model compatibility', `Passed no-download preflight. ${compatibility.note}`);
    const appConfig = { ...webllm.prebuiltAppConfig, cacheBackend: 'cache' };
    setupStage = 'Starting local model worker';
    worker = new Worker(new URL('./chat-worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('error', event => recordDiagnostic('Local model worker error', errorDetails(event), true));
    worker.addEventListener('messageerror', event => recordDiagnostic('Local model worker message error', errorDetails(event), true));
    setupStage = 'Loading model into WebGPU';
    engine = await webllm.CreateWebWorkerMLCEngine(worker, activeModel(), { appConfig, initProgressCallback: progressCallback });
    elements.progressWrap.hidden = true; setupStage = 'Ready'; recordDiagnostic(setupStage, `Model ready: ${activeModel()}`); setReady(true); setStatus('Private model ready. Replies are generated on this device.'); renderMessages(); elements.prompt.focus();
  } catch (error) {
    if (worker) worker.terminate(); worker = null; engine = null;
    setReady(false); elements.prepare.disabled = false; elements.model.disabled = false; elements.progressWrap.hidden = true;
    const details = errorDetails(error); recordDiagnostic(setupStage, details, true);
    setStatus('ChatLocal could not prepare this model on this device. Your messages were not sent to a cloud service.', true);
    setError(`Setup failed during ${setupStage}: ${details.split('\n')[0]}`);
  }
}
async function sendMessage(event) {
  event.preventDefault(); const prompt = elements.prompt.value.trim(); if (!prompt || !ready || generating || !engine) return;
  generating = true; setError(''); elements.prompt.value = ''; elements.send.disabled = true; elements.prompt.disabled = true; elements.model.disabled = true; elements.clearModel.disabled = true;
  const userMessage = { role: 'user', content: prompt }; history = [...history, userMessage].slice(-MAX_MESSAGES); const pending = { role: 'assistant', content: '' }; renderMessages(pending);
  try {
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];
    const stream = await engine.chat.completions.create({ messages, temperature: 0.7, stream: true, stream_options: { include_usage: true } });
    for await (const chunk of stream) { pending.content += chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content ? chunk.choices[0].delta.content : ''; renderMessages(pending); }
    if (!pending.content.trim()) pending.content = 'The local model finished without a visible reply. Please try again.';
    history = [...history, pending].slice(-MAX_MESSAGES); await saveHistory(); renderMessages();
  } catch (error) { renderMessages(); setError(`ChatLocal could not finish that reply. Your conversation stayed on this device. ${error && error.message ? error.message : ''}`); }
  finally { generating = false; elements.prompt.disabled = false; elements.send.disabled = false; elements.model.disabled = ready; elements.clearModel.disabled = !webllm; elements.prompt.focus(); }
}
async function removeModel() {
  if (!webllm || generating) return; const model = activeModel(); elements.clearModel.disabled = true; setStatus('Removing this downloaded model from this browser…');
  try { if (engine) await engine.unload(); if (worker) worker.terminate(); await webllm.deleteModelAllInfoInCache(model, { ...webllm.prebuiltAppConfig, cacheBackend: 'cache' }); engine = null; worker = null; setReady(false); elements.model.disabled = false; elements.prepare.disabled = false; setStatus('Downloaded model removed from this browser. Your conversation was left untouched.'); renderMessages(); }
  catch (error) { setStatus('The model cache could not be fully removed. Your messages were not sent anywhere.', true); setError(error && error.message ? error.message : 'Unable to clear model cache.'); elements.clearModel.disabled = false; }
}

elements.prepare.addEventListener('click', prepare);
elements.composer.addEventListener('submit', sendMessage);
elements.clearConversation.addEventListener('click', clearHistory);
elements.clearModel.addEventListener('click', removeModel);
elements.copyDiagnostics.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(elements.diagnosticsOutput.textContent); elements.copyDiagnostics.textContent = 'Copied'; setTimeout(() => { elements.copyDiagnostics.textContent = 'Copy debugging details'; }, 1600); }
  catch { elements.copyDiagnostics.textContent = 'Select the details above to copy'; }
});
window.addEventListener('error', event => recordDiagnostic('Page error', errorDetails(event), false));
window.addEventListener('unhandledrejection', event => recordDiagnostic('Unhandled local promise rejection', errorDetails(event.reason), false));
window.addEventListener('pagehide', () => { if (worker) worker.terminate(); }, { once: true });
checkSupport();
