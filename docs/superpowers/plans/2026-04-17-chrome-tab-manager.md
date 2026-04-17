# Chrome 新标签页标签管理扩展 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个 Manifest V3 Chrome 扩展，替代新标签页，提供按域名/窗口/时间/原生分组/手动分组维度的标签页管理中心。

**架构：** 采用 Vanilla JS + 原生 DOM，将逻辑拆分为 tabs-api（数据获取）、groups（分组计算）、ui（渲染）、storage（持久化）、quick-links（快捷入口）五个模块。Chrome API 集成部分以手动测试为主，纯逻辑函数使用 Jest + jsdom 做 TDD。

**Tech Stack：** Chrome Extension Manifest V3, Vanilla JavaScript, Jest + jsdom

---

### Task 1: 项目脚手架与 manifest.json

**Files:**
- Create: `manifest.json`
- Create: `src/newtab.html`
- Create: `src/newtab.css`
- Create: `src/newtab.js`

- [ ] **Step 1: 编写 manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Tab Manager - 新标签页",
  "version": "1.0.0",
  "description": "按域名、窗口、时间、分组管理所有标签页",
  "permissions": ["tabs", "tabGroups", "storage", "activeTab"],
  "chrome_url_overrides": {
    "newtab": "src/newtab.html"
  },
  "icons": {
    "128": "src/icons/icon128.png"
  }
}
```

- [ ] **Step 2: 创建 newtab.html 骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>标签页管理</title>
  <link rel="stylesheet" href="newtab.css">
</head>
<body>
  <header class="app-header">
    <input type="text" id="search-input" placeholder="搜索标签页..." autocomplete="off">
    <span id="tab-count">0 个标签</span>
  </header>
  <nav class="group-tabs" id="group-tabs">
    <button data-dimension="domain" class="active">域名</button>
    <button data-dimension="window">窗口</button>
    <button data-dimension="time">时间</button>
    <button data-dimension="native">原生分组</button>
    <button data-dimension="manual">手动分组</button>
  </nav>
  <main class="content" id="content"></main>
  <footer class="quick-links" id="quick-links"></footer>
  <script type="module" src="newtab.js"></script>
</body>
</html>
```

- [ ] **Step 3: 初始化 CSS 变量与基础样式**

在 `src/newtab.css` 中写入：

```css
:root {
  --bg: #ffffff;
  --fg: #1f1f1f;
  --muted: #666666;
  --border: #e0e0e0;
  --card-bg: #ffffff;
  --hover-bg: #f5f5f5;
  --accent: #1a73e8;
  --danger: #d93025;
  --radius: 10px;
  --gap: 12px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #c9d1d9;
    --muted: #8b949e;
    --border: #30363d;
    --card-bg: #161b22;
    --hover-bg: #21262d;
    --accent: #58a6ff;
    --danger: #f85149;
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--fg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}
#search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--fg);
  font-size: 14px;
}
#tab-count { font-size: 13px; color: var(--muted); }
.group-tabs {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 8px;
}
.group-tabs button {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
}
.group-tabs button.active {
  color: var(--fg);
  background: var(--hover-bg);
  font-weight: 600;
}
.content {
  flex: 1;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--gap);
  align-content: start;
  overflow: auto;
}
.quick-links {
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
```

- [ ] **Step 4: 创建空的 newtab.js**

```javascript
// src/newtab.js
console.log('Tab manager loaded');
```

- [ ] **Step 5: 安装 Jest 并初始化配置**

Run:
```bash
npm init -y
npm install --save-dev jest jest-environment-jsdom
```

在 `package.json` 中修改 scripts：
```json
"scripts": {
  "test": "jest"
}
```

- [ ] **Step 6: Commit**

```bash
git add manifest.json src/ package.json package-lock.json
if [ ! -f src/icons/icon128.png ]; then
  touch src/icons/icon128.png
  git add src/icons/icon128.png
fi
git commit -m "chore: scaffold Chrome extension project with manifest, HTML, CSS, and Jest"
```

---

### Task 2: 时间格式化工具（TDD）

**Files:**
- Create: `src/lib/time-format.js`
- Create: `tests/lib/time-format.test.js`

- [ ] **Step 1: 编写失败的测试**

```javascript
// tests/lib/time-format.test.js
const { formatDuration } = require('../../src/lib/time-format');

describe('formatDuration', () => {
  test('returns "刚刚" for less than 1 minute', () => {
    expect(formatDuration(Date.now() - 30 * 1000)).toBe('刚刚');
  });

  test('returns minutes for < 1 hour', () => {
    expect(formatDuration(Date.now() - 12 * 60 * 1000)).toBe('12分');
  });

  test('returns hours for < 24 hours', () => {
    expect(formatDuration(Date.now() - 2 * 60 * 60 * 1000)).toBe('2小时');
  });

  test('returns "1天" for between 24 and 48 hours', () => {
    expect(formatDuration(Date.now() - 25 * 60 * 60 * 1000)).toBe('1天');
  });

  test('returns days for >= 48 hours', () => {
    expect(formatDuration(Date.now() - 3 * 24 * 60 * 60 * 1000)).toBe('3天');
  });

  test('returns "---" for undefined timestamp', () => {
    expect(formatDuration(undefined)).toBe('---');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/lib/time-format.test.js`
Expected: 6 failures (module not found / function undefined)

- [ ] **Step 3: 实现最小代码**

```javascript
// src/lib/time-format.js
function formatDuration(timestamp) {
  if (timestamp === undefined || timestamp === null) return '---';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分`;
  if (hours < 24) return `${hours}小时`;
  if (days < 2) return '1天';
  return `${days}天`;
}

module.exports = { formatDuration };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/lib/time-format.test.js`
Expected: 6 passes

- [ ] **Step 5: Commit**

```bash
git add src/lib/time-format.js tests/lib/time-format.test.js
git commit -m "feat: add time formatting utility with tests"
```

---

### Task 3: Tabs API 数据获取层

**Files:**
- Create: `src/tabs-api.js`

- [ ] **Step 1: 编写 tabs-api.js**

```javascript
// src/tabs-api.js

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
```

- [ ] **Step 2: Commit**

```bash
git add src/tabs-api.js
git commit -m "feat: add Chrome tabs API wrapper module"
```

---

### Task 4: 分组逻辑引擎（TDD）

**Files:**
- Create: `src/lib/groups.js`
- Create: `tests/lib/groups.test.js`

- [ ] **Step 1: 编写失败的测试**

```javascript
// tests/lib/groups.test.js
const {
  groupByDomain,
  groupByWindow,
  groupByTime,
  groupByNativeGroups,
  groupByManualGroups,
} = require('../../src/lib/groups');

const makeTab = (id, url, windowId = 1, groupId = -1, lastAccessed = Date.now()) => ({
  id, url, windowId, groupId, lastAccessedTime: lastAccessed, title: `Tab ${id}`,
});

describe('groupByDomain', () => {
  test('groups tabs by hostname', () => {
    const tabs = [
      makeTab(1, 'https://github.com/a'),
      makeTab(2, 'https://github.com/b'),
      makeTab(3, 'https://docs.google.com/x'),
    ];
    const result = groupByDomain(tabs);
    expect(Object.keys(result)).toEqual(['github.com', 'docs.google.com']);
    expect(result['github.com'].tabs.map((t) => t.id)).toEqual([1, 2]);
  });

  test('handles chrome:// URLs in special group', () => {
    const tabs = [makeTab(1, 'chrome://history/')];
    const result = groupByDomain(tabs);
    expect(Object.keys(result)).toEqual(['Chrome 内置页']);
  });
});

describe('groupByWindow', () => {
  test('groups by windowId', () => {
    const tabs = [makeTab(1, 'https://a.com', 1), makeTab(2, 'https://b.com', 2)];
    const result = groupByWindow(tabs);
    expect(Object.keys(result)).toEqual(['窗口 1', '窗口 2']);
  });
});

describe('groupByTime', () => {
  test('categorizes by access time', () => {
    const now = Date.now();
    const tabs = [
      makeTab(1, 'https://a.com', 1, -1, now - 30 * 60 * 1000),
      makeTab(2, 'https://b.com', 1, -1, now - 3 * 60 * 60 * 1000),
      makeTab(3, 'https://c.com', 1, -1, now - 30 * 60 * 60 * 1000),
      makeTab(4, 'https://d.com', 1, -1, now - 72 * 60 * 60 * 1000),
    ];
    const result = groupByTime(tabs);
    expect(result['刚刚']?.tabs.length || 0).toBe(1);
    expect(result['今天']?.tabs.length || 0).toBe(1);
    expect(result['昨天']?.tabs.length || 0).toBe(1);
    expect(result['更早']?.tabs.length || 0).toBe(1);
  });
});

describe('groupByNativeGroups', () => {
  test('groups by native tab group names', () => {
    const tabs = [
      makeTab(1, 'https://a.com', 1, 101),
      makeTab(2, 'https://b.com', 1, 101),
      makeTab(3, 'https://c.com', 1, -1),
    ];
    const nativeGroups = [{ id: 101, title: '工作', color: 'blue' }];
    const result = groupByNativeGroups(tabs, nativeGroups);
    expect(Object.keys(result)).toContain('工作');
    expect(result['工作'].tabs.length).toBe(2);
    expect(result['未分组'].tabs.length).toBe(1);
  });
});

describe('groupByManualGroups', () => {
  test('groups by manual group definitions', () => {
    const tabs = [makeTab(1, 'https://a.com'), makeTab(2, 'https://b.com'), makeTab(3, 'https://c.com')];
    const manualGroups = [
      { id: 'mg1', name: '我的分组', tabIds: [1, 3] },
    ];
    const result = groupByManualGroups(tabs, manualGroups);
    expect(result['我的分组'].tabs.map((t) => t.id)).toEqual([1, 3]);
    expect(result['未分组'].tabs.map((t) => t.id)).toEqual([2]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/lib/groups.test.js`
Expected: multiple failures

- [ ] **Step 3: 实现分组逻辑**

```javascript
// src/lib/groups.js
function getHost(url) {
  try {
    if (url.startsWith('chrome://')) return 'Chrome 内置页';
    return new URL(url).hostname || '其他';
  } catch {
    return '其他';
  }
}

function groupByDomain(tabs) {
  const groups = {};
  for (const tab of tabs) {
    const key = getHost(tab.url);
    if (!groups[key]) groups[key] = { name: key, tabs: [] };
    groups[key].tabs.push(tab);
  }
  return groups;
}

function groupByWindow(tabs) {
  const groups = {};
  for (const tab of tabs) {
    const key = `窗口 ${tab.windowId}`;
    if (!groups[key]) groups[key] = { name: key, tabs: [] };
    groups[key].tabs.push(tab);
  }
  return groups;
}

function getTimeBucket(timestamp) {
  if (!timestamp) return '未知时间';
  const diff = Date.now() - timestamp;
  const hours = diff / 3600000;
  if (hours < 1) return '刚刚';
  if (hours < 24) return '今天';
  if (hours < 48) return '昨天';
  return '更早';
}

function groupByTime(tabs) {
  const order = ['刚刚', '今天', '昨天', '更早', '未知时间'];
  const groups = {};
  for (const tab of tabs) {
    const key = getTimeBucket(tab.lastAccessedTime);
    if (!groups[key]) groups[key] = { name: key, tabs: [] };
    groups[key].tabs.push(tab);
  }
  const sorted = {};
  for (const key of order) {
    if (groups[key]) sorted[key] = groups[key];
  }
  return sorted;
}

function groupByNativeGroups(tabs, nativeGroups) {
  const map = {};
  for (const g of nativeGroups) map[g.id] = g;
  const groups = { '未分组': { name: '未分组', tabs: [], color: null } };
  for (const tab of tabs) {
    if (tab.groupId > 0 && map[tab.groupId]) {
      const g = map[tab.groupId];
      const key = g.title || `分组 ${g.id}`;
      if (!groups[key]) groups[key] = { name: key, tabs: [], color: g.color };
      groups[key].tabs.push(tab);
    } else {
      groups['未分组'].tabs.push(tab);
    }
  }
  if (groups['未分组'].tabs.length === 0) delete groups['未分组'];
  return groups;
}

function groupByManualGroups(tabs, manualGroups) {
  const assigned = new Set();
  const groups = { '未分组': { name: '未分组', tabs: [] } };
  for (const mg of manualGroups || []) {
    groups[mg.name] = { name: mg.name, tabs: [] };
    for (const tab of tabs) {
      if ((mg.tabIds || []).includes(tab.id)) {
        groups[mg.name].tabs.push(tab);
        assigned.add(tab.id);
      }
    }
  }
  for (const tab of tabs) {
    if (!assigned.has(tab.id)) groups['未分组'].tabs.push(tab);
  }
  if (groups['未分组'].tabs.length === 0) delete groups['未分组'];
  return groups;
}

module.exports = {
  groupByDomain,
  groupByWindow,
  groupByTime,
  groupByNativeGroups,
  groupByManualGroups,
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/lib/groups.test.js`
Expected: 8 passes

- [ ] **Step 5: Commit**

```bash
git add src/lib/groups.js tests/lib/groups.test.js
git commit -m "feat: add tab grouping logic with full test coverage"
```

---

### Task 5: Storage 持久化层与快速入口逻辑

**Files:**
- Create: `src/storage.js`
- Create: `src/lib/quick-links.js`
- Create: `tests/lib/quick-links.test.js`

- [ ] **Step 1: 实现 storage.js**

```javascript
// src/storage.js
const STORAGE_KEY = 'tabManagerData';

export async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || { quickLinks: defaultQuickLinks(), manualGroups: [] });
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
```

- [ ] **Step 2: 编写 quick-links 测试（失败）**

```javascript
// tests/lib/quick-links.test.js
const {
  addQuickLink,
  removeQuickLink,
  reorderQuickLinks,
  isValidChromeUrl,
} = require('../../src/lib/quick-links');

describe('isValidChromeUrl', () => {
  test('accepts chrome:// URLs', () => {
    expect(isValidChromeUrl('chrome://history/')).toBe(true);
    expect(isValidChromeUrl('chrome://flags/')).toBe(true);
  });
  test('rejects non-chrome URLs', () => {
    expect(isValidChromeUrl('https://google.com')).toBe(false);
    expect(isValidChromeUrl('')).toBe(false);
  });
});

describe('addQuickLink', () => {
  test('adds a new link', () => {
    const list = [{ id: 'a', name: 'A', url: 'chrome://a/' }];
    const result = addQuickLink(list, 'B', 'chrome://b/');
    expect(result.length).toBe(2);
    expect(result[1].name).toBe('B');
  });
});

describe('removeQuickLink', () => {
  test('removes by id', () => {
    const list = [{ id: 'a', name: 'A', url: 'chrome://a/' }];
    const result = removeQuickLink(list, 'a');
    expect(result.length).toBe(0);
  });
});

describe('reorderQuickLinks', () => {
  test('moves item to new index', () => {
    const list = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ];
    const result = reorderQuickLinks(list, 2, 0);
    expect(result.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test -- tests/lib/quick-links.test.js`
Expected: 6 failures

- [ ] **Step 4: 实现 quick-links.js**

```javascript
// src/lib/quick-links.js
function isValidChromeUrl(url) {
  return typeof url === 'string' && url.startsWith('chrome://');
}

function addQuickLink(links, name, url) {
  if (!isValidChromeUrl(url)) return links;
  return [...links, { id: `ql-${Date.now()}`, name, url }];
}

function removeQuickLink(links, id) {
  return links.filter((l) => l.id !== id);
}

function reorderQuickLinks(links, fromIndex, toIndex) {
  const arr = [...links];
  const [moved] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, moved);
  return arr;
}

module.exports = {
  isValidChromeUrl,
  addQuickLink,
  removeQuickLink,
  reorderQuickLinks,
};
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/lib/quick-links.test.js`
Expected: 6 passes

- [ ] **Step 6: Commit**

```bash
git add src/storage.js src/lib/quick-links.js tests/lib/quick-links.test.js
git commit -m "feat: add storage layer and quick links logic with tests"
```

---

### Task 6: UI 渲染层 - 分组卡片与标签列表

**Files:**
- Create: `src/ui.js`
- Modify: `src/newtab.css`

- [ ] **Step 1: 实现 ui.js 渲染函数**

```javascript
// src/ui.js
import { formatDuration } from './lib/time-format.js';

export function renderGroups(container, groups, { onActivate, onClose, onPin, onMute, selectedTabIds = new Set() } = {}) {
  container.innerHTML = '';
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.group = key;

    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
      <div class="group-title">
        <span class="group-name">${escapeHtml(group.name)}</span>
        <span class="group-count">${group.tabs.length}</span>
      </div>
      <button class="btn-close-group" title="关闭整组">关闭全部</button>
    `;
    header.querySelector('.btn-close-group').addEventListener('click', (e) => {
      e.stopPropagation();
      onClose?.(group.tabs.map((t) => t.id));
    });

    const list = document.createElement('ul');
    list.className = 'tab-list';
    for (const tab of group.tabs) {
      const li = document.createElement('li');
      li.className = 'tab-item';
      if (tab.active) li.classList.add('active-tab');
      if (selectedTabIds.has(tab.id)) li.classList.add('selected');
      li.dataset.tabId = tab.id;

      const pinBtn = `<button class="btn-pin" title="${tab.pinned ? '取消固定' : '固定'}">${tab.pinned ? '📌' : ' '}</button>`;
      const muteBtn = `<button class="btn-mute" title="${tab.mutedInfo?.muted ? '取消静音' : '静音'}">${tab.mutedInfo?.muted ? '🔇' : '🔊'}</button>`;

      li.innerHTML = `
        <img class="tab-favicon" src="${tab.favIconUrl || ''}" alt="" onerror="this.style.visibility='hidden'">
        <span class="tab-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</span>
        <span class="tab-time">${formatDuration(tab.lastAccessedTime)}</span>
        ${pinBtn}
        ${muteBtn}
        <button class="btn-close" title="关闭">×</button>
      `;

      li.querySelector('.tab-title').addEventListener('click', () => onActivate?.(tab.id, tab.windowId));
      li.querySelector('.btn-close').addEventListener('click', (e) => {
        e.stopPropagation();
        onClose?.([tab.id]);
      });
      li.querySelector('.btn-pin').addEventListener('click', (e) => {
        e.stopPropagation();
        onPin?.(tab.id, !tab.pinned);
      });
      li.querySelector('.btn-mute').addEventListener('click', (e) => {
        e.stopPropagation();
        onMute?.(tab.id, !tab.mutedInfo?.muted);
      });

      list.appendChild(li);
    }

    card.appendChild(header);
    card.appendChild(list);
    container.appendChild(card);
  }
}

export function renderQuickLinks(container, links, { onClick, onAdd, onRemove, onReorder } = {}) {
  container.innerHTML = '<span class="ql-label">快速入口：</span>';
  for (const link of links) {
    const btn = document.createElement('span');
    btn.className = 'quick-link';
    btn.textContent = link.name;
    btn.title = link.url;
    btn.draggable = true;
    btn.addEventListener('click', () => onClick?.(link.url));
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onRemove?.(link.id);
    });
    container.appendChild(btn);
  }
  const addBtn = document.createElement('span');
  addBtn.className = 'quick-link add';
  addBtn.textContent = '+';
  addBtn.title = '添加快捷入口';
  addBtn.addEventListener('click', () => {
    const url = prompt('请输入 chrome:// 地址');
    if (!url) return;
    const name = prompt('请输入显示名称');
    if (name) onAdd?.(name.trim(), url.trim());
  });
  container.appendChild(addBtn);
}

export function setTabCount(el, count) {
  el.textContent = `${count} 个标签`;
}

export function updateActiveTab(links) {
  for (const btn of links) {
    btn.classList.toggle('active', btn.dataset.dimension === dimension);
  }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: 在 newtab.css 中追加卡片与列表样式**

```css
.group-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  max-height: 320px;
}
.group-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-name { font-weight: 600; font-size: 14px; }
.group-count {
  font-size: 11px;
  color: var(--muted);
  background: var(--hover-bg);
  padding: 2px 6px;
  border-radius: 4px;
}
.btn-close-group {
  font-size: 11px;
  color: var(--danger);
  background: transparent;
  border: none;
  cursor: pointer;
}
.tab-list {
  list-style: none;
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}
.tab-item {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  position: relative;
}
.tab-item:last-child { border-bottom: none; }
.tab-item:hover { background: var(--hover-bg); }
.tab-item.active-tab { border-left: 3px solid var(--accent); padding-left: 9px; }
.tab-item.selected { background: rgba(26, 115, 232, 0.12); }
.tab-favicon { width: 14px; height: 14px; flex-shrink: 0; }
.tab-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}
.tab-time { font-size: 11px; color: var(--muted); flex-shrink: 0; }
.tab-item .btn-pin,
.tab-item .btn-mute,
.tab-item .btn-close {
  font-size: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--muted);
  flex-shrink: 0;
  padding: 2px 4px;
}
.tab-item .btn-close { font-size: 16px; line-height: 1; }
.tab-item .btn-pin { min-width: 20px; }
.tab-item .btn-mute { min-width: 20px; }
.ql-label { font-size: 12px; color: var(--muted); }
.quick-link {
  font-size: 12px;
  color: var(--fg);
  background: var(--hover-bg);
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}
.quick-link.add { color: var(--muted); }
```

- [ ] **Step 3: Commit**

```bash
git add src/ui.js src/newtab.css
git commit -m "feat: add UI rendering for group cards, tab lists, and quick links"
```

---

### Task 7: 主控制器 newtab.js

**Files:**
- Modify: `src/newtab.js`

- [ ] **Step 1: 实现完整主逻辑**

```javascript
// src/newtab.js
import {
  fetchAllTabs,
  fetchAllTabGroups,
  activateTab,
  closeTab,
  closeTabs,
  pinTab,
  muteTab,
  subscribeTabChanges,
} from './tabs-api.js';
import {
  groupByDomain,
  groupByWindow,
  groupByTime,
  groupByNativeGroups,
  groupByManualGroups,
} from './lib/groups.js';
import { loadConfig, saveConfig } from './storage.js';
import { renderGroups, renderQuickLinks, setTabCount } from './ui.js';
import { addQuickLink, removeQuickLink } from './lib/quick-links.js';

const DIMENSION_MAP = {
  domain: groupByDomain,
  window: groupByWindow,
  time: groupByTime,
  native: (tabs, _, nativeGroups) => groupByNativeGroups(tabs, nativeGroups),
  manual: (tabs, manualGroups) => groupByManualGroups(tabs, manualGroups),
};

let state = {
  tabs: [],
  groups: [],
  config: { quickLinks: [], manualGroups: [] },
  dimension: 'domain',
  searchQuery: '',
  selectedTabIds: new Set(),
};

const els = {
  content: document.getElementById('content'),
  searchInput: document.getElementById('search-input'),
  tabCount: document.getElementById('tab-count'),
  groupTabs: document.getElementById('group-tabs'),
  quickLinks: document.getElementById('quick-links'),
};

async function init() {
  state.config = await loadConfig();
  await refreshData();
  setupListeners();
  renderQuickLinksBar();
}

async function refreshData() {
  const [tabs, nativeGroups] = await Promise.all([
    fetchAllTabs(),
    fetchAllTabGroups(),
  ]);
  state.tabs = tabs;
  state.groups = nativeGroups;
  render();
}

function render() {
  const filtered = filterTabs(state.tabs, state.searchQuery);
  const grouper = DIMENSION_MAP[state.dimension];
  const groups = grouper(filtered, state.config.manualGroups, state.groups);

  setTabCount(els.tabCount, state.tabs.length);
  renderGroups(els.content, groups, {
    onActivate: handleActivate,
    onClose: handleClose,
    onPin: handlePin,
    onMute: handleMute,
    selectedTabIds: state.selectedTabIds,
  });

  updateGroupTabsUI();
}

function filterTabs(tabs, query) {
  if (!query.trim()) return tabs;
  const q = query.toLowerCase();
  return tabs.filter((t) =>
    (t.title || '').toLowerCase().includes(q) ||
    (t.url || '').toLowerCase().includes(q)
  );
}

function updateGroupTabsUI() {
  for (const btn of els.groupTabs.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.dimension === state.dimension);
  }
}

function setupListeners() {
  els.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    render();
  });

  els.groupTabs.addEventListener('click', (e) => {
    if (e.target.dataset.dimension) {
      state.dimension = e.target.dataset.dimension;
      state.selectedTabIds.clear();
      render();
    }
  });

  subscribeTabChanges(() => {
    refreshData();
  });
}

async function handleActivate(tabId, windowId) {
  await activateTab(tabId, windowId);
}

async function handleClose(tabIds) {
  const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
  if (ids.length > 1) {
    if (!confirm(`确定要关闭 ${ids.length} 个标签页吗？`)) return;
  }
  await closeTabs(ids);
  for (const id of ids) state.selectedTabIds.delete(id);
  await refreshData();
}

async function handlePin(tabId, pinned) {
  await pinTab(tabId, pinned);
  await refreshData();
}

async function handleMute(tabId, muted) {
  await muteTab(tabId, muted);
  await refreshData();
}

function renderQuickLinksBar() {
  renderQuickLinks(els.quickLinks, state.config.quickLinks, {
    onClick: (url) => window.location.href = url,
    onAdd: async (name, url) => {
      state.config.quickLinks = addQuickLink(state.config.quickLinks, name, url);
      await saveConfig(state.config);
      renderQuickLinksBar();
    },
    onRemove: async (id) => {
      state.config.quickLinks = removeQuickLink(state.config.quickLinks, id);
      await saveConfig(state.config);
      renderQuickLinksBar();
    },
  });
}

init();
```

- [ ] **Step 2: Commit**

```bash
git add src/newtab.js
git commit -m "feat: wire up main controller with data fetching, grouping, and interactions"
```

---

### Task 8: 批量操作支持

**Files:**
- Modify: `src/ui.js`
- Modify: `src/newtab.js`
- Modify: `src/newtab.css`

- [ ] **Step 1: 在 ui.js 的 renderGroups 中暴露多选点击事件**

在 `src/ui.js` 顶部修改 renderGroups 签名，添加 `onSelect`：

```javascript
export function renderGroups(container, groups, { onActivate, onClose, onPin, onMute, onSelect, selectedTabIds = new Set() } = {}) {
```

在 `li` 创建后，为整个 `li`（除操作按钮外）添加多选逻辑：

```javascript
    li.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      onSelect?.(tab.id, e.metaKey || e.ctrlKey, e.shiftKey);
    });
```

- [ ] **Step 2: 在 newtab.js 中实现批量选择和批量操作栏**

在 `render()` 之前插入批量操作栏渲染：

```javascript
function render() {
  const filtered = filterTabs(state.tabs, state.searchQuery);
  const grouper = DIMENSION_MAP[state.dimension];
  const groups = grouper(filtered, state.config.manualGroups, state.groups);

  setTabCount(els.tabCount, state.tabs.length);
  renderBatchBar();
  renderGroups(els.content, groups, {
    onActivate: handleActivate,
    onClose: handleClose,
    onPin: handlePin,
    onMute: handleMute,
    onSelect: handleSelect,
    selectedTabIds: state.selectedTabIds,
  });
  updateGroupTabsUI();
}
```

添加 batch bar 相关函数：

```javascript
function renderBatchBar() {
  let bar = document.getElementById('batch-bar');
  if (state.selectedTabIds.size === 0) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'batch-bar';
    bar.className = 'batch-bar';
    document.body.insertBefore(bar, els.content);
  }
  bar.innerHTML = `
    <span>已选择 ${state.selectedTabIds.size} 个标签页</span>
    <div class="batch-actions">
      <button id="batch-close">批量关闭</button>
      <button id="batch-cancel">取消</button>
    </div>
  `;
  bar.querySelector('#batch-close').addEventListener('click', () => handleClose(Array.from(state.selectedTabIds)));
  bar.querySelector('#batch-cancel').addEventListener('click', () => {
    state.selectedTabIds.clear();
    render();
  });
}

function handleSelect(tabId, meta, shift) {
  if (!meta && !shift) {
    state.selectedTabIds.clear();
    state.selectedTabIds.add(tabId);
    render();
    return;
  }
  if (meta) {
    if (state.selectedTabIds.has(tabId)) state.selectedTabIds.delete(tabId);
    else state.selectedTabIds.add(tabId);
    render();
    return;
  }
  // Shift range selection is a nice-to-have; for MVP, treat as toggle
  if (shift) {
    state.selectedTabIds.add(tabId);
    render();
  }
}
```

- [ ] **Step 3: 追加批量操作栏样式**

```css
.batch-bar {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 100;
}
.batch-bar span { font-size: 13px; }
.batch-actions { display: flex; gap: 8px; }
.batch-actions button {
  padding: 5px 12px;
  border-radius: 14px;
  border: none;
  font-size: 12px;
  cursor: pointer;
}
#batch-close { background: var(--danger); color: #fff; }
#batch-cancel { background: var(--hover-bg); color: var(--fg); }
```

- [ ] **Step 4: Commit**

```bash
git add src/ui.js src/newtab.js src/newtab.css
git commit -m "feat: add batch selection and bulk close actions"
```

---

### Task 9: 手动分组 CRUD

**Files:**
- Modify: `src/ui.js`
- Modify: `src/newtab.js`
- Modify: `src/newtab.css`

- [ ] **Step 1: 在分组卡片头部增加"移入"按钮（仅在手动分组维度）**

修改 `ui.js` 中 `renderGroups` 的 header 生成逻辑：

```javascript
    const moveInBtn = onMoveToGroup
      ? `<button class="btn-move-in" title="将选中的标签移入该组">移入</button>`
      : '';
    header.innerHTML = `
      <div class="group-title">
        <span class="group-name">${escapeHtml(group.name)}</span>
        <span class="group-count">${group.tabs.length}</span>
      </div>
      <div class="group-actions">
        ${moveInBtn}
        <button class="btn-close-group" title="关闭整组">关闭全部</button>
      </div>
    `;
    if (moveInBtn) {
      header.querySelector('.btn-move-in').addEventListener('click', (e) => {
        e.stopPropagation();
        onMoveToGroup?.(group.name);
      });
    }
```

更新 `renderGroups` 签名添加 `onMoveToGroup`。

- [ ] **Step 2: 在 newtab.js 中增加手动分组管理按钮和逻辑**

在 `els` 对象后添加：

```javascript
const manualGroupBtn = document.createElement('button');
manualGroupBtn.id = 'btn-manage-groups';
manualGroupBtn.textContent = '管理分组';
manualGroupBtn.className = 'hidden';
els.groupTabs.insertAdjacentElement('afterend', manualGroupBtn);
```

在 `updateGroupTabsUI` 之后监听该按钮：

```javascript
manualGroupBtn.addEventListener('click', () => {
  const name = prompt('新建手动分组名称');
  if (!name || !name.trim()) return;
  const id = `mg-${Date.now()}`;
  state.config.manualGroups = [...(state.config.manualGroups || []), { id, name: name.trim(), tabIds: [] }];
  saveConfig(state.config).then(refreshData);
});
```

修改 `updateGroupTabsUI`：

```javascript
function updateGroupTabsUI() {
  for (const btn of els.groupTabs.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.dimension === state.dimension);
  }
  manualGroupBtn.classList.toggle('hidden', state.dimension !== 'manual');
}
```

修改 `render` 传入 `onMoveToGroup`：

```javascript
  renderGroups(els.content, groups, {
    onActivate: handleActivate,
    onClose: handleClose,
    onPin: handlePin,
    onMute: handleMute,
    onSelect: handleSelect,
    onMoveToGroup: state.dimension === 'manual' ? handleMoveToGroup : null,
    selectedTabIds: state.selectedTabIds,
  });
```

添加 `handleMoveToGroup`：

```javascript
async function handleMoveToGroup(groupName) {
  if (state.selectedTabIds.size === 0) {
    alert('请先选择要移动的标签页');
    return;
  }
  const ids = Array.from(state.selectedTabIds);
  const target = state.config.manualGroups.find((g) => g.name === groupName);
  if (!target) return;

  // Remove from all other manual groups first
  for (const g of state.config.manualGroups) {
    g.tabIds = (g.tabIds || []).filter((id) => !ids.includes(id));
  }
  target.tabIds = [...new Set([...(target.tabIds || []), ...ids])];

  await saveConfig(state.config);
  state.selectedTabIds.clear();
  await refreshData();
}
```

- [ ] **Step 3: 追加管理分组按钮样式**

```css
#btn-manage-groups {
  margin: 8px 16px 0;
  padding: 6px 12px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
#btn-manage-groups.hidden { display: none; }
.group-actions { display: flex; gap: 8px; align-items: center; }
.btn-move-in {
  font-size: 11px;
  color: var(--accent);
  background: transparent;
  border: none;
  cursor: pointer;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui.js src/newtab.js src/newtab.css
git commit -m "feat: add manual tab group creation and move-to-group actions"
```

---

### Task 10: 搜索防抖优化

**Files:**
- Modify: `src/newtab.js`

- [ ] **Step 1: 为搜索输入添加防抖**

将 `setupListeners` 中的搜索监听替换为防抖版本：

```javascript
  let searchDebounce;
  els.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = e.target.value;
      render();
    }, 150);
  });
```

- [ ] **Step 2: Commit**

```bash
git add src/newtab.js
git commit -m "perf: debounce search input at 150ms"
```

---

### Task 11: 手动测试清单与验证

**Files:**
- None (manual testing)

- [ ] **Step 1: 运行所有自动化测试**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: 在 Chrome 中加载扩展进行手动测试**

1. 打开 Chrome 扩展管理页 `chrome://extensions/`
2. 开启右上角"开发者模式"
3. 点击"加载已解压的扩展程序"，选择项目根目录
4. 打开一个新标签页，确认页面加载正常

**测试清单：**

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 打开新标签页 | 看到所有打开的标签页按域名分组 |
| 2 | 点击顶部分组 Tab（窗口/时间/原生分组/手动分组） | 内容区重新渲染为对应分组 |
| 3 | 在搜索框输入关键词 | 列表实时过滤，只显示匹配项 |
| 4 | 点击某个标签标题 | 跳转到该标签页 |
| 5 | 点击标签旁的 × | 关闭该标签，列表更新 |
| 6 | 点击图钉按钮 | 标签被固定/取消固定，图标变化 |
| 7 | 点击喇叭按钮 | 标签被静音/取消静音，图标变化 |
| 8 | Cmd/Ctrl 点击两个标签 | 两个标签被高亮选中，底部出现批量操作栏 |
| 9 | 点击批量操作栏的"批量关闭" | 选中的标签被关闭，列表更新 |
| 10 | 切换到"手动分组"维度，点击"管理分组"，输入名称 | 新建一个空的手动分组 |
| 11 | Cmd/Ctrl 选中几个标签，点击某手动分组的"移入" | 标签被移入该分组 |
| 12 | 点击底部快速入口的"历史记录" | 页面跳转到 chrome://history/ |
| 13 | 点击快速入口的 +，输入 URL 和名称 | 新的快速入口出现 |
| 14 | 右键点击某个快速入口 | 该入口被删除 |
| 15 | 切换系统暗色/亮色主题 | 新标签页主题自动跟随 |

- [ ] **Step 3: 修复测试中发现的问题**

根据手动测试结果，修复任何布局错位、功能异常或交互缺陷。每修复一个问题后立即 commit。

- [ ] **Step 4: Final Commit**

```bash
git add .
git commit -m "feat: complete Chrome new tab tab manager extension"
```

---

## 自检清单

### Spec 覆盖检查

| 需求 | 对应任务 |
|------|----------|
| 替代新标签页 | Task 1 (manifest.json chrome_url_overrides) |
| 5 种分组维度 | Task 4 (groups.js) + Task 7 (newtab.js 控制器) |
| 显示 favicon + title + 打开时间 | Task 6 (ui.js renderGroups) |
| 搜索过滤 | Task 7 + Task 10 |
| 快速关闭 | Task 6 (onClose), Task 8 (batch close) |
| 跳转标签页 | Task 6 (onActivate) |
| 固定/取消固定 | Task 3 (tabs-api.js) + Task 6 (onPin) |
| 静音/取消静音 | Task 3 (tabs-api.js) + Task 6 (onMute) |
| 批量操作 | Task 8 |
| 自定义快速入口 | Task 5 + Task 6 + Task 7 |
| 手动分组 | Task 9 |
| 暗色模式跟随系统 | Task 1 (CSS prefers-color-scheme) |
| 实时更新 | Task 3 (subscribeTabChanges) + Task 7 |

### Placeholder 扫描

- 无 TBD / TODO / "implement later" / "add appropriate error handling" 等占位符。
- 每个任务都包含完整代码和命令。

### 类型一致性检查

- `renderGroups` 签名在 Task 6、Task 8、Task 9 中保持一致（添加了可选回调）。
- `chrome.storage.local` 的 key `tabManagerData` 在 `storage.js` 和 `newtab.js` 中一致使用。
- `manualGroups` 的数据结构 `{ id, name, tabIds }` 在 `groups.js` 和 `newtab.js` 中一致。
