import {
  groupByDomain,
  groupByWindow,
  groupByTime,
  groupByNativeGroups,
  groupByManualGroups,
} from '../../src/lib/groups.js';

const makeTab = (id, url, windowId = 1, groupId = -1, lastAccessed = Date.now()) => ({
  id, url, windowId, groupId, lastAccessedTime: lastAccessed, title: `Tab ${id}`,
});

describe('groupByDomain', () => {
  test('groups tabs by top-level domain', () => {
    const tabs = [
      makeTab(1, 'https://github.com/a'),
      makeTab(2, 'https://github.com/b'),
      makeTab(3, 'https://docs.google.com/x'),
    ];
    const result = groupByDomain(tabs);
    expect(Object.keys(result)).toEqual(['github.com', 'google.com']);
    expect(result['github.com'].tabs.map((t) => t.id)).toEqual([1, 2]);
    expect(result['google.com'].tabs.map((t) => t.id)).toEqual([3]);
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
