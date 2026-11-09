// Opens the side panel on icon click, and shows an "ON" badge on the tab
// while auto-scroll is running. No state is kept in globals.

async function enablePanelOnClick() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.error('Could not set side panel behavior:', err);
  }
}

chrome.runtime.onInstalled.addListener(enablePanelOnClick);
chrome.runtime.onStartup.addListener(enablePanelOnClick);

async function setBadge(tabId, running) {
  try {
    await chrome.action.setBadgeText({ tabId, text: running ? 'ON' : '' });
    if (running) {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#1a7f37' });
    }
  } catch (err) {
    // Tab may have closed; nothing to do.
    console.warn('Badge update failed:', err);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'scroll-state' || !sender.tab?.id) return false;
  (async () => {
    await setBadge(sender.tab.id, message.running);
    sendResponse({ ok: true });
  })();
  return true;
});

// A navigation destroys the content script, so clear the badge.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    await setBadge(tabId, false);
  }
});
