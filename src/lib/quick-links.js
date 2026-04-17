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
