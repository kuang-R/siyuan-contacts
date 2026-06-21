# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## TODO

1. **避免 `/` 菜单联系人过多** — 思源 `String.includes('')` 导致空输入匹配所有条目，无法在插件层面绕过。可能的方案：向思源提交 PR 修改过滤逻辑（空输入不匹配）；或思源支持 `minimumFilterLength` 配置；或改用原生 `@` 触发（需安全操作 Protyle 数据模型）
2. **联系人页面包含引用视图** — 联系人详情中展示"谁引用了此联系人"（类似思源反链面板），利用 `/api/ref/getBackmentionDoc` 等 API

## 构建与开发

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（Vite watch）
npm run build        # 生产构建 → dist/index.js
npm test             # 运行单元测试（vitest）
```

## Docker 部署

```bash
./scripts/deploy-docker.sh --container siyuan-note
./scripts/dev-docker.sh --container siyuan-note   # watch 模式
```

容器内插件目录结构（`index.js` 在根目录，不在 `dist/` 子目录）：
```
/siyuan/workspace/data/plugins/siyuan-contacts/
├── index.js          # ← 思源加载此文件
├── plugin.json
├── icon.png
├── preview.png
├── README.md / README_zh_CN.md
└── i18n/
    ├── zh_CN.json
    └── en_US.json
```

## 架构

### 构建格式：IIFE + module.exports footer

思源通过 `new Function('module', 'exports', 'require', code)` 加载插件。**必须用 IIFE 格式**，末尾加 `module.exports = siyuanContacts;`：

- `vite.config.ts`: `formats: ['iife']`，`footer: 'module.exports = siyuanContacts;'`
- **不能用 CJS**——Rollup 会重命名 Svelte 组件引用导致 `ReferenceError`
- **不能用 ES**——`export` 在 `eval()` 中语法错误
- CSS 通过 `vite-plugin-css-injected-by-js` 注入 `<style>`

### 插件入口

```ts
// index.ts — Plugin 从 eval 上下文的 require 获取
declare const require: any;
const _siyuanModule = typeof require !== 'undefined' ? require('siyuan') : window.siyuan;
const Plugin = _siyuanModule?.Plugin || window.Plugin;
if (!Plugin) throw new Error('...');
```

- `siyuan` 全局对象没有 `.Plugin`，只有通过 `require('siyuan')` 才能拿到
- 加 `throw` 做明确报错，不用静默降级

### UI：DOM 注入（浮动按钮 + 顶部栏 + 侧滑面板）

不使用 SiYuan 的 Dock/Tab API（浏览器模式下不可靠）。直接注入 DOM：

- `index.ts` 创建 `#siyuan-contacts-backdrop`（遮罩）、`#siyuan-contacts-panel`（面板）、`#siyuan-contacts-fab`（浮动按钮，可选）
- 通过 `this.addTopBar()` 在顶部栏注册图标按钮，左键打开面板
- Svelte 组件渲染到 `#siyuan-contacts-panel` 中
- 点击 FAB 或顶部栏图标打开面板，点击遮罩关闭
- 面板未打开时 FAB 为 `null`，`openPanel`/`closePanel` 需判空（`if (this.fabBtn)`）

### 插件配置（无 Setting 页面）

思源顶部栏右键菜单不支持插件自定义菜单项（内核硬编码只放"取消盯住"）。配置项直接放在面板 UI 中：

- **FAB 显隐开关**：面板工具栏 ●/○ 按钮，状态存储在 `localStorage`（`siyuan-contacts-showFab`，默认 `true`）
- `toggleFab()` 创建/销毁 FAB，通过 `this.panelComponent.$set({ showFab })` 同步到 Svelte 组件
- 不用 `this.data`/`saveData()` 持久化 FAB 状态——`saveData()` 因思源序列化机制会抛异常

### 笔记本架构

联系人存储在专用笔记本中，每个联系人为独立 `.sy` 文档：

- `ensureContactsNotebook()` 查找/创建"通讯录"笔记本，自动重新打开被意外关闭的笔记本
- **不能 `closeNotebook`**：关闭后 SQL 查询不到数据，联系人列表变空。`ensureContactsNotebook` 会自动检测并修复
- 重复笔记本处理：filter 全部候选人 → 重新打开 closed 的 → 按中/英文名优先级选取

### 联系人链接与点击拦截

插入联系人链接用 `<span data-type="block-ref">`（思源原生块引用，确保可点击）：

- **`open-siyuan-url-block` 事件不能取消导航**——它是通知型事件，在导航之后才触发
- **`siyuan://plugins/` 协议不可行**——Protyle 不渲染为可点击链接
- **正确做法**：`document.addEventListener('click', handler, true)` 捕获阶段拦截，`stopImmediatePropagation()` 在思源处理器看到之前截住点击，打开面板代替跳转

### Svelte：单文件组件 + 手动订阅

**所有 UI 在一个 `ContactPanel.svelte` 中**，不导入任何子组件（Rollup 会树摇掉 Svelte 子组件导入）。模板中避免：

- ❌ `$store` 自动订阅——Rollup IIFE 下 CJS 会重命名 store 变量导致 ReferenceError
- ❌ 直接调用导入的函数（如 `t()`）——同样会被重命名
- ❌ 模板中的 TypeScript 类型断言（`as Type`、`: Type`）——Svelte 4 解析器不兼容

✅ 正确做法：
```svelte
<script>
  import { t } from '../utils/i18n';
  function L(key) { return t(key); }  // 模板调用 L()，避免引用被改名
  // 手动订阅 store
  onMount(() => { unsubs.push(store.subscribe(v => localVar = v)); });
</script>
<p>{L('loading')}</p>  <!-- ✅ 调用局部函数 -->
```

### 数据模型

联系人存储为独立思源文档，元数据（`custom-contact-*`）在文档根块属性中。电话和邮箱以逗号分隔字符串存储，表单中使用数组 `fPhones`/`fEmails`（`parseMulti`/`joinMulti` 互转）。详情页拆分显示为独立链接（tel:/mailto:），点击号码复制到剪贴板。

### plugin.json 兼容性

```json
{
  "backends": ["windows", "linux", "darwin", "docker"],
  "frontends": ["desktop", "desktop-window", "browser-desktop"]
}
```

### 项目结构

```
src/
  index.ts              # 插件入口：DOM 注入、FAB、顶部栏、面板开关、配置管理
  index.css             # 全局样式
  utils/                # API、SQL、i18n、notebook、avatar
  models/               # Contact 接口、IAL 解析
  stores/               # Svelte stores（contactStore、uiStore）
  components/
    ContactPanel.svelte # 唯一 UI 组件（列表/详情/表单/对话框/FAB开关）
  editor/               # mentionPlugin（/名字 斜杠链接）、slashCommand、linkPlugin
tests/                  # IAL 解析、工具函数测试
```

### 关键约定

- 块属性前缀 `custom-contact-`
- 电话/邮箱存储为逗号分隔字符串，表单用数组+增删按钮
- 头像 base64 data URI，限制 64KB
- 搜索为客户端过滤，不每次请求服务端
- 语言检测：`window.siyuan.config.lang`，默认 `zh_CN`
- i18n 统一用 `L('key')`：`i18n.ts` 导出 `export const L = t` 别名，非 Svelte 文件直接 `import { L }`；Svelte 组件内定义局部 `function L(key) { return t(key); }`（避免 Rollup IIFE 改名）
- Store 导航注意：`selectedContactId.set(id)` 当值相同时 Svelte store 不触发订阅者。`viewContact` 先 `set(null)` 再 `set(id)` 强制刷新
- 插件→Svelte 通信：通过 props 传递数据和回调（`showFab`/`onToggleFab`），运行时更新用 `this.panelComponent.$set({ key: value })`
- 思源顶部栏右键菜单不支持插件自定义项（内核只放"取消盯住"），不要尝试 `menu`/`menus` 等属性
- 通讯录笔记本**不能关闭**（`closeNotebook`）：关闭后 SQL 查不到联系人数据
- 联系人链接点击拦截用**捕获阶段 + `stopImmediatePropagation`**，不要尝试 `open-siyuan-url-plugin`（Protyle 不渲染该协议链接）或 `open-siyuan-url-block`（通知事件，不能取消）
- **`/add-contact` 斜杠命令**：回调需先调 `openPanel()` 再 `openAddForm()`。用 `protyle.insert('​')`（零宽空格）通知 Protyle 替换斜杠文本，否则原文残留
- **删除联系人**：面板只提示用户手动在文档树中删除，不调 API。因为 `removeDoc` 与文件树 UI 行为不一致（内核异步清理，块可能残留）
- **孤儿块过滤**：`loadAllContacts()` 用 `listDocsByPath` 获取实际存在的文档 ID 集合，与 SQL 查出的联系人交叉比对，过滤已删除的孤儿块
- **自动刷新**：每次 `openPanel()` 调 `loadAllContacts()`，确保手动删除后打开面板即时反映
- **只读保护恢复**：`ensureContactsReadonly()` 每次启动用一次 SQL（`WHERE ial NOT LIKE '%custom-sy-readonly%'`）找出缺失只读标记的联系人并补上，防止手动删除/恢复后属性丢失
