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
