const HOME_KEY = 'local-ai-lab-workspace-home-v1';
const DB_NAME = 'local-ai-lab-workspace-v1';
const STORE_NAME = 'handles';
const MAX_OUTPUT = 24000;

const $ = id => document.getElementById(id);
const ui = {
  choose: $('chooseWorkspace'), forget: $('forgetWorkspace'), status: $('workspaceStatus'), home: $('workspaceHome'),
  terminal: $('terminalOutput'), form: $('commandForm'), command: $('commandInput'), reset: $('resetTerminal')
};

let home = null;

function print(text = '', kind = '') {
  const line = document.createElement('div');
  line.className = `terminal-line ${kind}`;
  line.textContent = text;
  ui.terminal.append(line);
  while (ui.terminal.textContent.length > MAX_OUTPUT && ui.terminal.firstChild) ui.terminal.firstChild.remove();
  ui.terminal.scrollTop = ui.terminal.scrollHeight;
}

function db() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHome(handle) {
  const database = await db();
  await new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, HOME_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  database.close();
}

async function loadHome() {
  const database = await db();
  const handle = await new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(HOME_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
}

async function clearHome() {
  const database = await db();
  await new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(HOME_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  database.close();
}

async function permission(handle, mode = 'read') {
  if (!handle?.queryPermission) return 'denied';
  const options = { mode };
  let result = await handle.queryPermission(options);
  if (result !== 'granted') result = await handle.requestPermission(options);
  return result;
}

function setHome(handle, message) {
  home = handle;
  ui.home.textContent = handle ? `~/ ${handle.name}` : 'No workspace selected';
  ui.forget.disabled = !handle;
  ui.command.disabled = !handle;
  ui.status.textContent = message;
  ui.status.classList.toggle('unsupported', !handle);
}

async function chooseHome() {
  if (!window.showDirectoryPicker) {
    setHome(null, 'This browser does not support selected-folder workspaces yet. Use current desktop Chrome or Edge.');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    if (await permission(handle, 'readwrite') !== 'granted') throw new Error('Folder permission was not granted.');
    await saveHome(handle);
    setHome(handle, `Workspace connected to “${handle.name}”. Commands can access only this folder.`);
    print(`Connected ~/ ${handle.name}`, 'success');
    ui.command.focus();
  } catch (error) {
    setHome(home, error?.message || 'No workspace folder was selected.');
  }
}

async function restoreHome() {
  if (!window.showDirectoryPicker) { setHome(null, 'This browser does not support selected-folder workspaces yet. Use current desktop Chrome or Edge.'); return; }
  try {
    const handle = await loadHome();
    if (!handle) { setHome(null, 'Choose a local folder to begin. Nothing is uploaded.'); return; }
    if (await permission(handle, 'readwrite') !== 'granted') { setHome(null, 'Choose your workspace again to restore access. Browsers require permission after a restart.'); return; }
    setHome(handle, `Reopened ~/ ${handle.name}. Nothing outside this folder is available.`);
    print(`Reopened ~/ ${handle.name}`, 'success');
  } catch { setHome(null, 'Choose a local folder to begin. Nothing is uploaded.'); }
}

function parts(value) { return value.trim().split(/\s+/).filter(Boolean); }
function safeName(value) { return value && !value.includes('/') && !value.includes('\\') && value !== '.' && value !== '..'; }
async function entries() { const list = []; for await (const entry of home.values()) list.push(entry); return list.sort((a, b) => a.name.localeCompare(b.name)); }
async function file(name) { if (!safeName(name)) throw new Error('Use a file name in the selected home folder only.'); return home.getFileHandle(name); }

async function execute(raw) {
  const [command, ...args] = parts(raw);
  if (!command) return;
  if (command === 'help') {
    print('Commands: pwd, ls, cat <file>, head <file>, wc <file>, find <text>, mkdir <name>, touch <file>, write <file> <text>, clear, reset');
    print('All paths stay in ~/ (the folder you selected). No network, installers, shell scripts, or host commands are available.');
    return;
  }
  if (command === 'clear') { ui.terminal.replaceChildren(); return; }
  if (command === 'reset') { ui.terminal.replaceChildren(); print('Terminal output cleared. Your workspace files were not changed.', 'success'); return; }
  if (!home) throw new Error('Choose a workspace folder first.');
  if (command === 'pwd') { print(`~/ ${home.name}`); return; }
  if (command === 'ls') { const list = await entries(); print(list.length ? list.map(entry => `${entry.kind === 'directory' ? 'dir ' : 'file'}  ${entry.name}`).join('\n') : '(empty workspace)'); return; }
  if (command === 'cat' || command === 'head') {
    const target = args[0]; if (!target) throw new Error(`Usage: ${command} <file>`);
    const text = await (await file(target)).getFile().then(item => item.text());
    print(command === 'head' ? text.split('\n').slice(0, 10).join('\n') : text);
    return;
  }
  if (command === 'wc') {
    const target = args[0]; if (!target) throw new Error('Usage: wc <file>');
    const text = await (await file(target)).getFile().then(item => item.text());
    print(`${text.split(/\r?\n/).length} lines · ${text.trim() ? text.trim().split(/\s+/).length : 0} words · ${text.length} bytes  ${target}`);
    return;
  }
  if (command === 'find') {
    const needle = args.join(' '); if (!needle) throw new Error('Usage: find <text>');
    const matches = [];
    for (const entry of await entries()) if (entry.kind === 'file') { const text = await (await entry.getFile()).text(); if (text.includes(needle)) matches.push(entry.name); }
    print(matches.length ? matches.join('\n') : '(no matching top-level files)');
    return;
  }
  if (command === 'mkdir') {
    const target = args[0]; if (!safeName(target)) throw new Error('Usage: mkdir <simple-folder-name>');
    await home.getDirectoryHandle(target, { create: true }); print(`Created directory: ${target}`, 'success'); return;
  }
  if (command === 'touch') {
    const target = args[0]; if (!safeName(target)) throw new Error('Usage: touch <simple-file-name>');
    await home.getFileHandle(target, { create: true }); print(`Created file: ${target}`, 'success'); return;
  }
  if (command === 'write') {
    const target = args.shift(); const text = args.join(' ');
    if (!safeName(target) || !text) throw new Error('Usage: write <simple-file-name> <text>');
    const handle = await home.getFileHandle(target, { create: true });
    const stream = await handle.createWritable(); await stream.write(text); await stream.close();
    print(`Wrote ${text.length} characters to ${target}`, 'success'); return;
  }
  throw new Error(`“${command}” is not available in this safe workspace. Type help for the supported commands.`);
}

ui.choose.addEventListener('click', chooseHome);
ui.forget.addEventListener('click', async () => { await clearHome(); setHome(null, 'Workspace disconnected. Files were not changed.'); print('Disconnected workspace. Files were not changed.', 'success'); });
ui.reset.addEventListener('click', () => { ui.terminal.replaceChildren(); print('Terminal output cleared. Your workspace files were not changed.', 'success'); });
ui.form.addEventListener('submit', async event => {
  event.preventDefault(); const raw = ui.command.value.trim(); if (!raw) return;
  print(`$ ${raw}`, 'prompt'); ui.command.value = '';
  try { await execute(raw); } catch (error) { print(error?.message || 'Command failed.', 'error'); }
});

print('Local AI Lab Workspace — safe browser sandbox', 'success');
print('Type help to see the supported commands. Choose a folder to make it your reusable home workspace.');
restoreHome();
