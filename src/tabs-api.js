export async function fetchAllTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => resolve(tabs || []));
  });
}

export async function fetchAllTabGroups() {
  return new Promise((resolve) => {
    if (!chrome.tabGroups || !chrome.tabGroups.query) {
      resolve([]);
      return;
    }
    chrome.tabGroups.query({}, (groups) => resolve(groups || []));
  });
}

export async function activateTab(tabId, windowId) {
  await chrome.tabs.update(tabId, { active: true });
  if (windowId !== undefined) {
    await chrome.windows.update(windowId, { focused: true });
  }
}

export async function closeTab(tabId) {
  return chrome.tabs.remove(tabId);
}

export async function closeTabs(tabIds) {
  return chrome.tabs.remove(tabIds);
}

export async function pinTab(tabId, pinned) {
  return chrome.tabs.update(tabId, { pinned });
}

export async function muteTab(tabId, muted) {
  return chrome.tabs.update(tabId, { muted });
}

export async function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.getCurrent((tab) => resolve(tab || null));
  });
}

export async function muteAllTabs(tabs, muted) {
  await Promise.all(tabs.map((t) => chrome.tabs.update(t.id, { muted })));
}

export async function openUrl(url) {
  return chrome.tabs.create({ url });
}

export function subscribeTabChanges(callback) {
  const events = [
    chrome.tabs.onCreated,
    chrome.tabs.onRemoved,
    chrome.tabs.onUpdated,
    chrome.tabs.onMoved,
  ];
  const groupEvents = [
    chrome.tabGroups?.onUpdated,
    chrome.tabGroups?.onRemoved,
  ];

  const handlers = events.map((e) => {
    const fn = () => callback();
    e.addListener(fn);
    return () => e.removeListener(fn);
  });

  const groupHandlers = groupEvents
    .filter(Boolean)
    .map((e) => {
      const fn = () => callback();
      e.addListener(fn);
      return () => e.removeListener(fn);
    });

  return () => {
    handlers.forEach((unsub) => unsub());
    groupHandlers.forEach((unsub) => unsub());
  };
}
