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

  updateActiveTab(els.groupTabs.querySelectorAll('button'), state.dimension);
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
