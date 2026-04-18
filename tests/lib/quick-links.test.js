import {
  addQuickLink,
  removeQuickLink,
  reorderQuickLinks,
  isValidChromeUrl,
} from '../../src/lib/quick-links.js';

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
