export function renderGroups(container, columns, { onActivate, onClose, onPin, onSelect, onMoveToGroup, onReorder, onPinToggle, pinnedGroups = new Set(), selectedTabIds = new Set(), currentTabId = null } = {}) {
  container.innerHTML = '';

  let draggedKey = null;

  function removeAllIndicators() {
    container.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
  }

  columns.forEach((groups, colIndex) => {
    const col = document.createElement('div');
    col.className = 'kanban-column';
    col.dataset.colIndex = colIndex;

    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      updateIndicator(col, e.clientY);
    });

    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) {
        removeIndicator(col);
      }
    });

    col.addEventListener('drop', (e) => {
      e.preventDefault();
      const indicator = col.querySelector('.drop-indicator');
      const cards = Array.from(col.children).filter((c) => c.classList.contains('group-card'));
      let insertIndex = cards.length;
      if (indicator) {
        const next = indicator.nextElementSibling;
        if (next && next.classList.contains('group-card')) {
          insertIndex = cards.indexOf(next);
        }
      }
      removeAllIndicators();
      if (draggedKey) {
        onReorder?.(draggedKey, colIndex, insertIndex);
      }
      draggedKey = null;
    });

    for (const group of groups) {
      const key = group.key;
      const isPinned = pinnedGroups.has(key);
      const card = document.createElement('div');
      card.className = 'group-card';
      if (isPinned) card.classList.add('pinned');
      card.dataset.group = key;
      card.draggable = !isPinned;

      card.addEventListener('dragstart', (e) => {
        draggedKey = key;
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        removeAllIndicators();
        draggedKey = null;
      });

      const header = document.createElement('div');
      header.className = 'group-header';
      const moveInBtn = onMoveToGroup
        ? `<button class="btn-move-in" title="将选中的标签移入该组">移入</button>`
        : '';
      const pinTitle = isPinned ? '取消置顶' : '置顶';
      const pinIcon = isPinned ? '📌' : '📍';
      header.innerHTML = `
        <div class="group-title">
          <span class="group-name">${escapeHtml(group.name)}</span>
          <span class="group-count">${group.tabs.length}</span>
        </div>
        <div class="group-actions">
          <button class="btn-pin-group ${isPinned ? 'pinned' : ''}" title="${pinTitle}">${pinIcon}</button>
          ${moveInBtn}
          <button class="btn-close-group" title="关闭整组">✕</button>
        </div>
      `;
      header.querySelector('.btn-pin-group').addEventListener('click', (e) => {
        e.stopPropagation();
        onPinToggle?.(key);
      });
      if (moveInBtn) {
        header.querySelector('.btn-move-in').addEventListener('click', (e) => {
          e.stopPropagation();
          onMoveToGroup?.(group.name);
        });
      }
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
        if (tab.id === currentTabId) li.classList.add('current-newtab');
        li.dataset.tabId = tab.id;

        const pinBtn = `<button class="btn-pin" title="${tab.pinned ? '取消固定' : '固定'}">${tab.pinned ? '📌' : ' '}</button>`;

        li.innerHTML = `
          <img class="tab-favicon" src="${tab.favIconUrl || ''}" alt="" onerror="this.style.visibility='hidden'">
          <span class="tab-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</span>
          ${tab.id === currentTabId ? '<span class="tab-badge">本页</span>' : ''}
          ${pinBtn}
          ${tab.id !== currentTabId ? '<button class="btn-close" title="关闭">×</button>' : ''}
        `;

        li.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          onSelect?.(tab.id, e.metaKey || e.ctrlKey, e.shiftKey);
        });

        li.querySelector('.tab-title').addEventListener('click', () => onActivate?.(tab.id, tab.windowId));
        const closeBtn = li.querySelector('.btn-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClose?.([tab.id]);
          });
        }
        li.querySelector('.btn-pin').addEventListener('click', (e) => {
          e.stopPropagation();
          onPin?.(tab.id, !tab.pinned);
        });

        let hoverTimer;
        li.addEventListener('mouseenter', () => {
          hoverTimer = setTimeout(() => showTabTooltip(li, tab, currentTabId), 500);
        });
        li.addEventListener('mouseleave', () => {
          clearTimeout(hoverTimer);
          hideTabTooltip();
        });

        list.appendChild(li);
      }

      card.appendChild(header);
      card.appendChild(list);
      col.appendChild(card);
    }

    container.appendChild(col);
  });
}

function updateIndicator(column, clientY) {
  removeIndicator(column);
  const cards = Array.from(column.querySelectorAll('.group-card:not(.dragging)'));
  const pinnedCount = cards.filter((c) => c.classList.contains('pinned')).length;

  let insertBefore = null;
  let insertIndex = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (clientY < mid) {
      insertBefore = cards[i];
      insertIndex = i;
      break;
    }
  }

  if (insertIndex < pinnedCount) {
    insertIndex = pinnedCount;
    insertBefore = insertIndex < cards.length ? cards[insertIndex] : null;
  }

  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';
  if (insertBefore) {
    column.insertBefore(indicator, insertBefore);
  } else {
    const lastCard = cards[cards.length - 1];
    if (lastCard) {
      column.insertBefore(indicator, lastCard.nextSibling);
    } else {
      column.appendChild(indicator);
    }
  }
}

function removeIndicator(column) {
  const existing = column.querySelector('.drop-indicator');
  if (existing) existing.remove();
}

function showTabTooltip(targetEl, tab, currentTabId) {
  hideTabTooltip();
  const tooltip = document.createElement('div');
  tooltip.id = 'tab-tooltip';
  const statusParts = [];
  if (tab.active) statusParts.push('当前标签');
  if (tab.pinned) statusParts.push('已固定');
  if (tab.mutedInfo?.muted) statusParts.push('已静音');
  const statusText = statusParts.length ? statusParts.join(' · ') : '';
  tooltip.innerHTML = `
    <div class="tt-row">
      <img class="tt-favicon" src="${tab.favIconUrl || ''}" alt="" onerror="this.style.visibility='hidden'">
      <span class="tt-title">${escapeHtml(tab.title)}</span>
    </div>
    <div class="tt-row">
      <span class="tt-url">${escapeHtml(tab.url || '')}</span>
    </div>
    ${tab.id === currentTabId ? '<div class="tt-row"><span class="tt-meta" style="color:var(--accent);font-weight:600;">本页</span></div>' : ''}
    ${statusText ? `<div class="tt-row"><span class="tt-meta">${statusText}</span></div>` : ''}
  `;
  document.body.appendChild(tooltip);

  const rect = targetEl.getBoundingClientRect();
  const ttRect = tooltip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - ttRect.width / 2;
  let top = rect.top - ttRect.height - 8;
  if (left < 8) left = 8;
  if (left + ttRect.width > window.innerWidth - 8) left = window.innerWidth - ttRect.width - 8;
  if (top < 8) top = rect.bottom + 8;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTabTooltip() {
  const existing = document.getElementById('tab-tooltip');
  if (existing) existing.remove();
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
