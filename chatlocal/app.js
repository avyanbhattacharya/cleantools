const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.85';
const DEFAULT_MODEL = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';
const SYSTEM_PROMPT = 'You are ChatLocal, a concise and helpful assistant. You run entirely in the user\'s browser. Do not claim to access the internet, external accounts, or files unless the user has provided their contents in this conversation.';
const MAX_MESSAGES = 24;
const HISTORY_DB = 'chatlocal-history-v1';
const HISTORY_STORE = 'conversations';

const $ = id => document.getElementById(id);
const elements = {
  model: $('modelSelect'), prepare: $('prepareButton'), clearModel: $('clearModelButton'), progressWrap: $('progressWrap'), progress: $('modelProgress'), progressText: $('progressText'), status: $('modelStatus'), messages: $('messages'), composer: $('composer'), prompt: $('promptInput'), send: $('sendButton'), hint: $('composerHint'), clearConversation: $('clearConversationButton'), error: $('chatError')
};

let webllm = null;
let engine = null;
let worker = null;
let ready = false;
let generating = false;
let history = [];
let supported = false;

function activeModel() { return elements.model.value || DEFAULT_MODEL; }
function setStatus(message, unsupported = false) { elements.status.textContent = message; elements.status.classList.toggle('unsupported', unsupported); }
function setError(message = '') { elements.error.hidden = !message; elements.error.textContent = message; }
function setReady(value) { ready = value; elements.prompt.disabled = !value; elements.send.disabled = !value; elements.model.disabled = generating || value; elements.prepare.disabled = !supported || generating || value; elements.clearModel.disabled = !webllm || generating; elements.hint.textContent = value ? 'Runs privately on this device' : 'Local model not ready'; }

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
  history = await readHistory(); renderMessages();
  if (!usableWebGPU()) { supported = false; setReady(false); setStatus('This browser cannot run ChatLocal yet. It needs a secure context, WebGPU, a Web Worker, and local browser storage. No messages have been uploaded.', true); return; }
  try { const adapter = await Promise.race([navigator.gpu.requestAdapter(), new Promise(resolve => setTimeout(() => resolve(null), 2500))]); if (!adapter) { supported = false; setReady(false); setStatus('This browser exposes WebGPU but no usable adapter was found. ChatLocal will not send your messages to a cloud fallback.', true); return; } supported = true; setReady(false); setStatus('This device supports private local AI. Prepare a model to begin.'); }
  catch { supported = false; setReady(false); setStatus('WebGPU could not start on this device. ChatLocal will not send your messages to a cloud fallback.', true); }
}
function progressCallback(report) { elements.progressWrap.hidden = false; const value = Number(report && report.progress); elements.progress.value = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; elements.progressText.textContent = (report && report.text) || 'Preparing local model…'; }
async function prepare() {
  if (!supported || generating) return;
  setError(''); setReady(false); elements.prepare.disabled = true; elements.model.disabled = true; setStatus('Loading the WebLLM runtime…');
  try {
    webllm = await import(WEBLLM_URL);
    const appConfig = { ...webllm.prebuiltAppConfig, cacheBackend: 'cache' };
    worker = new Worker(new URL('./chat-worker.js', import.meta.url), { type: 'module' });
    engine = await webllm.CreateWebWorkerMLCEngine(worker, activeModel(), { appConfig, initProgressCallback: progressCallback });
    elements.progressWrap.hidden = true; setReady(true); setStatus('Private model ready. Replies are generated on this device.'); renderMessages(); elements.prompt.focus();
  } catch (error) {
    if (worker) worker.terminate(); worker = null; engine = null;
    setReady(false); elements.prepare.disabled = false; elements.model.disabled = false; elements.progressWrap.hidden = true;
    setStatus('ChatLocal could not prepare this model on this device. Your messages were not sent to a cloud service.', true);
    setError(`Setup failed: ${error && error.message ? error.message : 'unknown local runtime error'}`);
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
window.addEventListener('pagehide', () => { if (worker) worker.terminate(); }, { once: true });
checkSupport();
