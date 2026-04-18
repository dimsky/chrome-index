const STORAGE_KEY = 'tabManagerData';

export async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || { quickLinks: defaultQuickLinks(), manualGroups: [], groupOrders: {}, groupColumns: {}, pinnedGroups: {}, bgImage: '' });
    });
  });
}

export async function saveConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: config }, resolve);
  });
}

function defaultQuickLinks() {
  return [
    { id: 'ql-downloads', name: '下载', url: 'chrome://downloads/' },
    { id: 'ql-history', name: '历史记录', url: 'chrome://history/' },
    { id: 'ql-bookmarks', name: '书签', url: 'chrome://bookmarks/' },
    { id: 'ql-extensions', name: '扩展', url: 'chrome://extensions/' },
    { id: 'ql-settings', name: '设置', url: 'chrome://settings/' },
  ];
}
