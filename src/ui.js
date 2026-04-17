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

      const pinBtn = `<button class="btn-pin" title="${tab.pinned ? '取消固定' : '固定'}">${tab.pinned ? '📌' : ' '}</button>`;
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

export function updateActiveTab(links, dimension) {
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
