# Tab Manager - Chrome 新标签页

一个 Chrome 扩展，将新标签页替换为强大的标签管理看板，支持按域名、窗口、时间、原生分组和自定义分组整理标签页。

## 功能

- **看板布局** - 4 列固定看板，每列独立滚动，标签组卡片均衡分布
- **多维度分组** - 支持按域名、窗口、访问时间、Chrome 原生分组、手动分组切换
- **拖拽排序** - 跨列拖拽标签组，蓝色分割线指示插入位置
- **置顶固定** - 将常用标签组固定到列首
- **批量操作** - Ctrl/Cmd 多选标签页，批量关闭
- **快速入口** - 自定义 chrome:// 快捷链接，新标签页打开
- **背景图片** - 支持上传自定义背景图
- **悬浮提示** - 鼠标悬停 0.5s 显示标签页标题、完整 URL、状态信息
- **搜索过滤** - 实时搜索标签页标题和 URL
- **暗色模式** - 自动适配系统暗色主题

## 安装

### 开发者模式加载

1. 克隆仓库
2. 打开 Chrome 扩展管理页 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择项目根目录

## 项目结构

```
├── manifest.json          # Chrome 扩展清单
├── src/
│   ├── newtab.html        # 新标签页入口
│   ├── newtab.css         # 样式（含暗色模式）
│   ├── newtab.js          # 主控制器
│   ├── ui.js              # 渲染逻辑（看板、拖拽、提示）
│   ├── tabs-api.js        # Chrome Tabs API 封装
│   ├── storage.js         # chrome.storage 持久化
│   └── lib/
│       ├── groups.js      # 分组算法
│       ├── quick-links.js # 快速入口管理
│       └── time-format.js # 时间格式化
├── tests/                 # Jest 单元测试
└── docs/superpowers/      # 设计文档与实现计划
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test
```

## 技术栈

- Chrome Extension Manifest V3
- 原生 ES Modules（无构建工具）
- Jest + jsdom 测试
- CSS 变量实现明暗主题切换
- HTML5 Drag and Drop API
