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
import { renderGroups, renderQuickLinks, setTabCount, updateActiveTab } from './ui.js';
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

const manualGroupBtn = document.createElement('button');
manualGroupBtn.id = 'btn-manage-groups';
manualGroupBtn.textContent = '管理分组';
manualGroupBtn.className = 'hidden';
els.groupTabs.insertAdjacentElement('afterend', manualGroupBtn);

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
  renderBatchBar();
  renderGroups(els.content, groups, {
    onActivate: handleActivate,
    onClose: handleClose,
    onPin: handlePin,
    onMute: handleMute,
    onSelect: handleSelect,
    onMoveToGroup: state.dimension === 'manual' ? handleMoveToGroup : null,
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

function setupListeners() {
  let searchDebounce;
  els.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = e.target.value;
      render();
    }, 150);
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

  manualGroupBtn.addEventListener('click', () => {
    const name = prompt('新建手动分组名称');
    if (!name || !name.trim()) return;
    const id = `mg-${Date.now()}`;
    state.config.manualGroups = [...(state.config.manualGroups || []), { id, name: name.trim(), tabIds: [] }];
    saveConfig(state.config).then(refreshData);
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

function updateGroupTabsUI() {
  for (const btn of els.groupTabs.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.dimension === state.dimension);
  }
  manualGroupBtn.classList.toggle('hidden', state.dimension !== 'manual');
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
