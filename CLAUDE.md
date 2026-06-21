# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 构建与开发

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（Vite watch，文件变更自动重构建）
npm run build        # 生产构建 → dist/index.js
npm test             # 运行单元测试（vitest）
```

## Docker 部署

```bash
# 一键安装/更新到 Docker 容器
./scripts/deploy-docker.sh --container siyuan-note --restart

# 开发模式（自动监听变更并部署）
./scripts/dev-docker.sh --container siyuan-note
```

容器内插件目录结构（注意 `index.js` 在根目录，不在 `dist/` 子目录）：
```
/siyuan/workspace/data/plugins/siyuan-contacts/
├── index.js          # ← 思源加载此文件
├── plugin.json
├── icon.png
├── preview.png
├── README.md
├── README_zh_CN.md
└── i18n/
    ├── zh_CN.json
    └── en_US.json
```

## 架构

### 构建格式：必须用 CommonJS

**这是最容易出错的地方。** 思源通过 `eval()` 加载插件 JS，内部使用 `new Function('module', 'exports', 'require', code)` 包裹代码。因此：

- **格式必须是 `cjs`（CommonJS）**。输出末尾为 `module.exports = ContactsPlugin;`
- **不能用 `iife`**（无 `module.exports`，思源报 `has no export`）
- **不能用 `es`**（`export` 在 `eval` 中语法错误）
- CSS 通过 `vite-plugin-css-injected-by-js` 内联到 JS 中

### 插件入口：必须 extends Plugin

```ts
// ✅ 正确：运行时继承
import { Plugin } from 'siyuan';
export default class ContactsPlugin extends Plugin { ... }

// ❌ 错误：仅类型实现
import type { Plugin } from 'siyuan';
export default class ContactsPlugin implements Plugin { ... }
```

`import { Plugin }` 是运行时导入，构建后变为 `require("siyuan")`。`Plugin` 基类提供 `addDock`、`addCommand`、`eventBus` 等方法。**不能用 `import type`**——那会被 TypeScript 剥离，导致思源报 `does not extends Plugin`。

### plugin.json 兼容性

```json
{
  "backends": ["windows", "linux", "darwin", "docker"],
  "frontends": ["desktop", "desktop-window", "browser-desktop"]
}
```

- **`backends` 必须包含 `docker`**——Docker 部署的后端标识是 `docker`，不是 `linux`
- **`frontends` 至少包含 `browser-desktop`**——浏览器访问需要；`desktop` 是桌面应用

### 插件生命周期 (`src/index.ts`)

`ContactsPlugin extends Plugin`。`onload()` 执行顺序：

1. 检测语言 → 注册 SVG 图标
2. 创建 `ContactsApi` 实例
3. `ensureContactsNotebook()` —— 查找或创建"通讯录"笔记本（**如果失败则 return 退出，dock 不会注册**）
4. 初始化 Svelte stores → `addDock()` 注册面板 → 注册命令和编辑器扩展
5. `loadAllContacts()` 加载联系人列表

### 数据模型：一个联系人 = 一个思源文档

联系人存储为"通讯录"笔记本下的思源文档。字段（电话、邮箱等）存储在文档根块的**自定义块属性**（`custom-contact-*`）中。文档 markdown 正文仅 `# {姓名}`。

优势：支持思源原生 SQL 搜索、`siyuan://blocks/<id>` 跳转、用户可自由添加笔记。

### IAL 解析 (`src/models/attributeKeys.ts`)

思源块属性存储格式为 **IAL**：`{: key1="value1" key2=value2}`。`parseIAL()` 用正则解析，处理引号和非引号值。单个读取优先用 `api.getBlockAttrs(id)` 返回 JSON，批量查询走 SQL + IAL 解析路径。

### API 层 (`src/utils/api.ts`)

`ContactsApi` 封装 `@siyuan-community/siyuan-sdk` Client，调用思源 HTTP API（浏览器同源）。关键方法：`createDocWithMd`、`setBlockAttrs`、`getBlockAttrs`、`sqlQuery`、`removeDoc`。

### 状态管理 (`src/stores/`)

两个 Svelte store 模块：

- **`contactStore.ts`**：`contacts`、`isLoading`、`sortMode`、`searchText`、`selectedGroup`（writable）；`filteredContacts`、`allGroups`（derived）。CRUD 操作和搜索辅助函数。使用前需 `initContactStore(api, notebookId)`。
- **`uiStore.ts`**：`selectedContactId`、`panelView`（`'list' | 'detail' | 'add-form' | 'edit-form'`）、`showDeleteConfirm`。导航辅助函数。

所有跨组件通信通过 stores，不使用 Svelte context 或事件派发。

### 编辑器集成 (`src/editor/`)

1. **`mentionPlugin.ts`** — 监听 `loaded-protyle-dynamic`，向 `protyle.hint.extend` 注入 `@` 触发器。选中后插入 `[姓名](siyuan://blocks/ID)` 块引用链接。
2. **`slashCommand.ts`** — 注册 `/add-contact` 及中文别名到 `protyleSlash`。
3. **`linkPlugin.ts`** — 监听 `click-blockicon` 和 `open-siyuan-url-block`，为联系人文档添加右键菜单。

### Svelte 组件树

```
ContactPanel（dock 根组件）
├── ContactToolbar（搜索、排序、+ 按钮）
├── GroupFilter（水平可滚动标签筛选栏）
├── ContactList → ContactListItem* → ContactAvatar, GroupTag
├── ContactDetail（详情视图，编辑/删除按钮）
├── ContactForm（添加/编辑表单，头像上传）
└── DeleteConfirmDialog（模态覆盖层）
```

### Vite 构建 (`vite.config.ts`)

- **格式 `cjs`**（CommonJS），输出 `dist/index.js`
- `siyuan` 外部化，运行时 `require("siyuan")` 由思源提供
- `vite-plugin-css-injected-by-js` 将 CSS 内联为 `<style>` 标签

## 关键约定

- 块属性键前缀 `custom-contact-`（如 `custom-contact-phone`）
- 分组标签为逗号分隔字符串，与 `string[]` 互转
- 头像为 base64 data URI，限制 64KB
- 搜索为客户端过滤，不每次请求服务端
- IAL 解析是批量查询回退方案；单条读取优先用 `getBlockAttrs`
- 语言检测：`window.siyuan.config.lang`，默认 `zh_CN`
