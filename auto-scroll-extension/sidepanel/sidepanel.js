const speedInput = document.getElementById('speed');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const extractBtn = document.getElementById('extract');
const statusEl = document.getElementById('status');
const pageEl = document.getElementById('page');

const RESTRICTED_MSG = "Can't run on this page (Chrome blocks extensions on chrome:// pages and the Web Store).";

function setStatus(text, kind = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`.trim();
}

function setRunning(running) {
  startBtn.textContent = running ? 'Update speed' : 'Start';
  stopBtn.disabled = !running;
  setStatus(running ? 'Scrolling…' : 'Stopped', running ? 'running' : '');
}

// The side panel stays open across tabs, so always act on the tab that is active now.
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

async function send(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

function readSpeed() {
  const speed = Math.round(Number(speedInput.value));
  if (!Number.isFinite(speed) || speed < 1) return null;
  return Math.min(speed, 5000);
}

// Show the state of whichever tab is active.
async function refreshStatus() {
  let tab;
  try {
    tab = await getActiveTab();
  } catch (err) {
    console.error(err);
    return;
  }
  pageEl.textContent = tab?.title ? `Page: ${tab.title}` : '';
  setRunning(false);
  if (!tab?.id) return;
  try {
    // Only answers if content.js was already injected into this tab.
    const res = await send(tab.id, { type: 'status' });
    if (res) {
      setRunning(res.running);
      if (res.running) speedInput.value = res.speed;
    }
  } catch {
    // Not injected yet — stay in "Stopped".
  }
}

async function onStart() {
  const speed = readSpeed();
  if (speed === null) {
    setStatus('Enter a speed of 1 or more.', 'error');
    return;
  }
  try {
    await chrome.storage.local.set({ speed });
    const tab = await getActiveTab();
    await ensureContentScript(tab.id);
    const res = await send(tab.id, { type: 'start', speed });
    setRunning(res?.running ?? true);
  } catch (err) {
    console.error(err);
    setStatus(RESTRICTED_MSG, 'error');
  }
}

async function onStop() {
  try {
    const tab = await getActiveTab();
    const res = await send(tab.id, { type: 'stop' });
    setRunning(res?.running ?? false);
  } catch (err) {
    console.error(err);
    setRunning(false);
  }
}

function safeFilename(title) {
  const base = (title || 'page')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'page';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${base}-${stamp}.html`;
}

// Runs inside the page: returns the live DOM as HTML.
function grabPageHtml() {
  const dt = document.doctype;
  const doctype = dt
    ? `<!DOCTYPE ${dt.name}${dt.publicId ? ` PUBLIC "${dt.publicId}"` : ''}${dt.systemId ? ` "${dt.systemId}"` : ''}>`
    : '<!DOCTYPE html>';
  return { html: `${doctype}\n${document.documentElement.outerHTML}`, title: document.title };
}

async function onExtract() {
  extractBtn.disabled = true;
  setStatus('Extracting…');
  try {
    const tab = await getActiveTab();
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: grabPageHtml,
    });
    const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({ url, filename: safeFilename(result.title || tab.title), saveAs: false });
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    const kb = Math.max(1, Math.round(blob.size / 1024));
    setStatus(`Saved HTML (${kb} KB) to Downloads.`);
    setTimeout(refreshStatus, 2500);
  } catch (err) {
    console.error(err);
    setStatus(RESTRICTED_MSG, 'error');
  } finally {
    extractBtn.disabled = false;
  }
}

async function init() {
  try {
    const { speed = 50 } = await chrome.storage.local.get('speed');
    speedInput.value = speed;
  } catch (err) {
    console.error(err);
  }
  await refreshStatus();
}

startBtn.addEventListener('click', onStart);
stopBtn.addEventListener('click', onStop);
extractBtn.addEventListener('click', onExtract);
speedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') onStart();
});

// Keep the panel in sync when you switch tabs or the page navigates.
chrome.tabs.onActivated.addListener(refreshStatus);
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.active) return;
  if (changeInfo.status === 'complete' || changeInfo.title) await refreshStatus();
});

// The page reports when scrolling stops on its own (bottom reached or Esc).
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'scroll-state' || !sender.tab) return false;
  (async () => {
    const tab = await getActiveTab();
    if (tab?.id === sender.tab.id) setRunning(message.running);
  })();
  return false;
});

init();
