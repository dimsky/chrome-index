import {
  fetchAllTabs,
  fetchAllTabGroups,
  activateTab,
  closeTab,
  closeTabs,
  pinTab,
  openUrl,
  subscribeTabChanges,
  getCurrentTab,
  muteAllTabs,
} from './tabs-api.js';
import {
  groupByDomain,
  groupByWindow,
  groupByNativeGroups,
  groupByManualGroups,
} from './lib/groups.js';
import { loadConfig, saveConfig } from './storage.js';
import { renderGroups, renderQuickLinks, setTabCount, updateActiveTab } from './ui.js';
import { addQuickLink, removeQuickLink } from './lib/quick-links.js';

const DIMENSION_MAP = {
  domain: groupByDomain,
  window: groupByWindow,
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
  currentTabId: null,
};

function toGroupColumns(groupsObj, dim, config) {
  const allGroups = Object.keys(groupsObj).map((key) => ({ key, ...groupsObj[key] }));
  const groupMap = new Map(allGroups.map((g) => [g.key, g]));
  let columns = config.groupColumns?.[dim];

  if (!columns) {
    const total = allGroups.length;
    const perCol = Math.ceil(total / 4) || 1;
    columns = [[], [], [], []];
    for (let i = 0; i < total; i++) {
      const colIndex = Math.min(Math.floor(i / perCol), 3);
      columns[colIndex].push(allGroups[i].key);
    }
    config.groupColumns = config.groupColumns || {};
    config.groupColumns[dim] = columns;
  }

  const assigned = new Set(columns.flat());
  for (const g of allGroups) {
    if (!assigned.has(g.key)) {
      const minCol = columns.reduce((min, col, i) =>
        col.length < columns[min].length ? i : min, 0);
      columns[minCol].push(g.key);
    }
  }

  const validKeys = new Set(allGroups.map((g) => g.key));
  for (let c = 0; c < 4; c++) {
    columns[c] = columns[c].filter((k) => validKeys.has(k));
  }

  return columns.map((keys) =>
    keys.map((k) => groupMap.get(k)).filter(Boolean)
  );
}

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
  state.config.groupColumns = state.config.groupColumns || {};
  state.config.pinnedGroups = state.config.pinnedGroups || {};
  const me = await getCurrentTab();
  state.currentTabId = me?.id ?? null;
  applyBgImage();
  await refreshData();
  setupListeners();
  renderQuickLinksBar();
  renderBgButton();
  renderMuteButton();
  setTimeout(() => {
    els.searchInput.focus();
    els.searchInput.select();
  }, 300);
}

function applyBgImage() {
  const url = state.config.bgImage;
  if (url) {
    document.body.style.backgroundImage = `url(${url})`;
  } else {
    document.body.style.backgroundImage = 'none';
  }
}

function renderBgButton() {
  let wrapper = document.getElementById('bg-btn-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('span');
    wrapper.id = 'bg-btn-wrapper';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '4px';
    els.tabCount.insertAdjacentElement('afterend', wrapper);
  }
  wrapper.innerHTML = '';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      state.config.bgImage = reader.result;
      await saveConfig(state.config);
      applyBgImage();
      renderBgButton();
    };
    reader.readAsDataURL(file);
  };
  wrapper.appendChild(fileInput);

  const btn = document.createElement('button');
  btn.id = 'btn-set-bg';
  btn.className = 'btn-bg';
  btn.title = '设置背景图';
  btn.textContent = state.config.bgImage ? '🖼️ 更换背景' : '🖼️ 设置背景';
  btn.onclick = () => fileInput.click();
  wrapper.appendChild(btn);

  if (state.config.bgImage) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-bg';
    clearBtn.title = '清除背景';
    clearBtn.textContent = '✕';
    clearBtn.onclick = async () => {
      state.config.bgImage = '';
      await saveConfig(state.config);
      applyBgImage();
      renderBgButton();
    };
    wrapper.appendChild(clearBtn);
  }
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
  const groupsObj = grouper(filtered, state.config.manualGroups, state.groups);
  const columns = toGroupColumns(groupsObj, state.dimension, state.config);

  setTabCount(els.tabCount, state.tabs.length);
  renderBatchBar();
  renderGroups(els.content, columns, {
    onActivate: handleActivate,
    onClose: handleClose,
    onPin: handlePin,
    onSelect: handleSelect,
    onMoveToGroup: state.dimension === 'manual' ? handleMoveToGroup : null,
    onReorder: handleReorder,
    onPinToggle: handlePinToggle,
    pinnedGroups: new Set(state.config.pinnedGroups[state.dimension] || []),
    selectedTabIds: state.selectedTabIds,
    currentTabId: state.currentTabId,
  });

  updateGroupTabsUI();
  updateMuteButton();
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

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
    }
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

async function handleMuteAll() {
  const audibleTabs = state.tabs.filter((t) => t.id !== state.currentTabId && !t.mutedInfo?.muted);
  const mutedTabs = state.tabs.filter((t) => t.id !== state.currentTabId && t.mutedInfo?.muted);
  const targetMuted = audibleTabs.length > 0;
  await muteAllTabs(targetMuted ? audibleTabs : mutedTabs, targetMuted);
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

async function handleReorder(draggedKey, targetColIndex, insertIndex) {
  const dim = state.dimension;
  const pinned = new Set(state.config.pinnedGroups[dim] || []);
  if (pinned.has(draggedKey)) return;

  const columns = state.config.groupColumns[dim];

  for (let c = 0; c < 4; c++) {
    const idx = columns[c].indexOf(draggedKey);
    if (idx !== -1) {
      columns[c].splice(idx, 1);
      break;
    }
  }

  const targetCol = columns[targetColIndex];
  const pinnedCount = targetCol.filter((k) => pinned.has(k)).length;
  const effectiveIndex = Math.max(insertIndex, pinnedCount);

  targetCol.splice(effectiveIndex, 0, draggedKey);

  await saveConfig(state.config);
  render();
}

async function handlePinToggle(groupKey) {
  const dim = state.dimension;
  const pinned = new Set(state.config.pinnedGroups[dim] || []);
  const columns = state.config.groupColumns[dim];

  if (pinned.has(groupKey)) {
    pinned.delete(groupKey);
  } else {
    pinned.add(groupKey);
    for (let c = 0; c < 4; c++) {
      const idx = columns[c].indexOf(groupKey);
      if (idx !== -1) {
        columns[c].splice(idx, 1);
        const pinnedCount = columns[c].filter((k) => pinned.has(k)).length;
        columns[c].splice(pinnedCount, 0, groupKey);
        break;
      }
    }
  }
  state.config.pinnedGroups[dim] = Array.from(pinned);
  await saveConfig(state.config);
  render();
}

function updateGroupTabsUI() {
  for (const btn of els.groupTabs.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.dimension === state.dimension);
  }
  manualGroupBtn.classList.toggle('hidden', state.dimension !== 'manual');
}

function renderMuteButton() {
  let btn = document.getElementById('btn-mute-all');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-mute-all';
    btn.className = 'btn-bg';
    btn.title = '一键静音/取消静音';
    btn.onclick = handleMuteAll;
    const wrapper = document.getElementById('bg-btn-wrapper');
    if (wrapper) {
      wrapper.insertAdjacentElement('beforebegin', btn);
    } else {
      els.tabCount.insertAdjacentElement('afterend', btn);
    }
  }
}

function updateMuteButton() {
  const btn = document.getElementById('btn-mute-all');
  if (!btn) return;
  const audible = state.tabs.some((t) => t.id !== state.currentTabId && !t.mutedInfo?.muted);
  btn.textContent = audible ? '🔊' : '🔇';
  btn.title = audible ? '一键静音全部' : '取消静音全部';
}

function renderQuickLinksBar() {
  renderQuickLinks(els.quickLinks, state.config.quickLinks, {
    onClick: (url) => openUrl(url),
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
