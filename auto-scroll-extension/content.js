// Injected into the page by the side panel. Safe to inject more than once.
(() => {
  if (window.__autoScroll) return;

  const STEP_MS = 50;          // one scroll step every 50 ms
  const BOTTOM_WAIT_MS = 3000; // wait this long at the bottom for more content

  const state = {
    running: false,
    speed: 50,
    rafId: null,
    lastStep: 0,
    bottomSince: null,
    lastHeight: 0,
  };

  function pageHeight() {
    const el = document.scrollingElement || document.documentElement;
    return el.scrollHeight;
  }

  function atBottom() {
    return window.innerHeight + window.scrollY >= pageHeight() - 2;
  }

  async function notify(running) {
    try {
      await chrome.runtime.sendMessage({ type: 'scroll-state', running });
    } catch {
      // Extension reloaded or service worker unavailable — ignore.
    }
  }

  function tick(now) {
    if (!state.running) return;

    if (now - state.lastStep >= STEP_MS) {
      state.lastStep = now;
      window.scrollBy(0, state.speed);

      if (atBottom()) {
        const height = pageHeight();
        if (state.bottomSince === null || height > state.lastHeight) {
          // Just arrived, or page grew (infinite scroll) — restart the wait.
          state.bottomSince = now;
          state.lastHeight = height;
        } else if (now - state.bottomSince >= BOTTOM_WAIT_MS) {
          stop();
          return;
        }
      } else {
        state.bottomSince = null;
      }
    }

    state.rafId = requestAnimationFrame(tick);
  }

  function start(speed) {
    state.speed = speed;
    if (state.running) return; // just update speed
    state.running = true;
    state.lastStep = 0;
    state.bottomSince = null;
    state.lastHeight = pageHeight();
    state.rafId = requestAnimationFrame(tick);
    notify(true);
  }

  function stop() {
    if (!state.running) return;
    state.running = false;
    if (state.rafId !== null) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    notify(false);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.running) stop();
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message?.type) {
      case 'start':
        start(Number(message.speed) || 50);
        break;
      case 'stop':
        stop();
        break;
      case 'status':
        break;
      default:
        return false;
    }
    sendResponse({ running: state.running, speed: state.speed });
    return false;
  });

  window.__autoScroll = state;
})();
