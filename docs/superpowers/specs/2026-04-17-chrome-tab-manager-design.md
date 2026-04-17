# Chrome 新标签页标签管理扩展 - 设计文档

## 1. 项目概述

开发一个 Chrome 扩展，替代浏览器默认的新标签页，提供可视化的标签页管理中心。用户可以在一个页面上查看、搜索、分组、关闭和跳转所有打开的标签页。

## 2. 目标与成功标准

- 打开新标签页时，能在 200ms 内渲染出所有标签页
- 支持至少 5 种分组维度，切换流畅无卡顿
- 搜索过滤响应时间在 50ms 以内
- 支持自定义快速入口，配置持久化
- 支持批量操作和常见单标签操作（关闭、固定、静音、跳转）

## 3. 架构设计

### 3.1 技术栈
- **Manifest V3** Chrome 扩展
- **Vanilla JavaScript + 原生 DOM**（无框架，减少 bundle 体积和加载时间）
- **CSS 自定义属性**（支持亮/暗主题跟随系统）

### 3.2 扩展结构
```
chrome-extension/
├── manifest.json          # MV3 配置，覆盖 newtab
├── newtab.html            # 新标签页入口
├── newtab.css             # 主题和布局样式
├── newtab.js              # 主逻辑：数据获取、渲染、事件处理
├── icons/                 # 扩展图标
└── _locales/              # （可选）国际化
```

### 3.3 核心权限
- `tabs`：读取所有标签页信息
- `tabGroups`：读取原生分组
- `storage`：持久化用户配置
- `activeTab`：（可选）针对当前标签页的额外操作

## 4. 功能规格

### 4.1 页面布局
- **顶部栏**：搜索框（居中/左对齐）、标签统计数字
- **分组维度 Tab**：域名 | 窗口 | 时间 | 原生分组 | 手动分组
- **主内容区**：分组卡片网格，每组是一个可折叠/展开的卡片
- **底部快速入口栏**：自定义 chrome:// 快捷方式

### 4.2 分组维度

| 维度 | 说明 |
|------|------|
| **域名** | 按 `new URL(tab.url).hostname` 分组，同 hostname 归为一组 |
| **窗口** | 按 `windowId` 分组，显示窗口编号 |
| **时间** | 按 `lastAccessedTime` 聚类：刚刚（<1h）、今天（1h~24h）、昨天（24h~48h）、更早 |
| **原生分组** | 读取 Chrome `tabGroups`，显示分组名称和颜色 |
| **手动分组** | 用户创建自定义分组，拖拽标签页进入，存储在 `chrome.storage.local` |

### 4.3 标签列表项（每组内部）
每项显示：
- `favicon`（16x16）
- `title`（超长截断，hover 显示完整 tooltip）
- 打开时长 / 最后访问时间（如"12分"、"2小时"、"1天"）
- 操作按钮：关闭（×）、固定/取消固定图钉、静音/取消静音喇叭

**交互：**
- 单击标题行：激活该标签页（`chrome.tabs.update(tab.id, { active: true })`，若跨窗口则同时 `chrome.windows.update(tab.windowId, { focused: true })`）
- 悬停显示操作按钮
- 右键菜单：关闭、关闭同组、复制链接、移动到其他窗口

### 4.4 搜索
- 顶部搜索框实时过滤
- 匹配 `title` 或 `url`
- 搜索结果保持当前分组维度，只显示包含匹配项的分组
- 防抖 150ms

### 4.5 批量操作
- 按住 `Cmd/Ctrl` 点击多选标签
- 按住 `Shift` 范围选择
- 批量操作按钮浮出：批量关闭、批量移动到新窗口、批量移动到手动分组

### 4.6 快速入口
- 默认预设：`chrome://downloads/`、`chrome://history/`、`chrome://bookmarks/`、`chrome://extensions/`、`chrome://settings/`
- 用户可点击 `+` 添加新的 chrome:// 入口（输入 URL + 名称）
- 支持拖拽排序、右键删除
- 存储在 `chrome.storage.local` 的 `quickLinks` 键下

### 4.7 固定 / 静音
- **固定/取消固定**：调用 `chrome.tabs.update(tab.id, { pinned: true/false })`
- **静音/取消静音**：调用 `chrome.tabs.update(tab.id, { muted: true/false })`，使用 `tabs` API 的 `mutedInfo` 字段

## 5. UI/UX 设计

### 5.1 主题
- 自动跟随系统 `prefers-color-scheme`
- 亮色/暗色两套 CSS 变量

### 5.2 响应式
- 宽屏（≥1440px）：4 列分组卡片
- 中屏（1024px~1439px）：3 列
- 平板（768px~1023px）：2 列
- 移动端（<768px）：1 列

### 5.3 分组卡片
- 圆角卡片，带阴影
- 卡片头部：分组名 + 数量 badge + 一键关闭
- 卡片主体：标签列表，超出最大高度时内部滚动
- 空分组：显示"暂无标签"占位

### 5.4 视觉反馈
- 标签项 hover：背景色变化
- 当前激活的标签：左侧高亮条
- 固定标签：图钉图标常驻显示
- 静音标签：喇叭图标常驻显示
- 加载中：顶部细条进度条或骨架屏

## 6. 数据流

```
页面加载
  │
  ├─> chrome.tabs.query({}) ──────────┐
  ├─> chrome.tabGroups.query({}) ─────┤
  ├─> chrome.storage.local.get() ─────┘
  │                                      │
  ▼                                      ▼
数据归一化（计算时长、分组）        读取用户配置
  │                                      │
  └──────────────┬───────────────────────┘
                 ▼
              渲染 DOM
                 │
  ┌──────────────┼──────────────┐
  │              │              │
  ▼              ▼              ▼
用户搜索      用户点击       监听事件
（过滤）    （操作标签）   （tabs/tabGroups 变化）
  │              │              │
  ▼              ▼              ▼
重新渲染    调用 Chrome API   重新 query + 渲染
```

### 6.1 事件监听
页面挂载后注册以下监听器：
- `chrome.tabs.onCreated`
- `chrome.tabs.onRemoved`
- `chrome.tabs.onUpdated`
- `chrome.tabs.onMoved`
- `chrome.tabGroups.onUpdated`
- `chrome.tabGroups.onRemoved`

事件触发后统一执行 `refreshData()` → 重新 query 并渲染。

### 6.2 时间计算
```javascript
function formatDuration(timestamp) {
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
```

若 `tab.lastAccessedTime` 不存在（旧版 Chrome），fallback 显示 `---`。

## 7. 错误处理

| 场景 | 处理策略 |
|------|----------|
| 权限不足 | 页面中央显示引导："请启用标签页权限以使用全部功能" |
| 0 个标签页 | 显示空状态插画 + 文案："没有打开的标签页" |
| API 调用失败 | 控制台输出错误，UI 不阻塞，操作按钮显示短暂失败态 |
| 超长标题 | CSS `text-overflow: ellipsis` + `title` 属性完整提示 |
| 无效 chrome:// URL | 快速入口添加时做正则校验 `^chrome://` |

## 8. MVP 范围与边界

### 在范围内
- 5 种分组维度（域名、窗口、时间、原生分组、手动分组）
- 搜索过滤
- 标签页跳转、关闭、固定、静音
- 批量选择和批量关闭
- 自定义快速入口（CRUD + 排序）
- 系统主题自适应

### 不在范围内（未来可扩展）
- 缩略图预览（Chrome API 限制）
- 历史标签页恢复
- 云端同步配置
- 标签页休眠/丢弃操作
- 鼠标手势

## 9. 测试策略

- **手动测试矩阵**：不同标签数量（0、10、50、200+）、不同窗口数、暗色模式
- **关键路径**：打开新标签页 → 渲染 → 搜索 → 关闭标签 → 切换分组维度
- **边界测试**：无标签、无权限、超长标题、无 lastAccessedTime
