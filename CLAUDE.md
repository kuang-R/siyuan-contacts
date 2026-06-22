# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## TODO

1. **避免 `/` 菜单联系人过多** — 思源 `String.includes('')` 导致空输入匹配所有条目，无法在插件层面绕过。可能的方案：向思源提交 PR 修改过滤逻辑（空输入不匹配）；或思源支持 `minimumFilterLength` 配置；或改用原生 `@` 触发（需安全操作 Protyle 数据模型）
2. ~~**联系人页面包含引用视图**~~ ✅ 已实现 — 详情页底部展示反链引用列表（SQL 查询 `refs` 表 + `openTab` 跳转 + 手动滚动定位）

## 构建与开发

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（Vite watch）
npm run build        # 生产构建 → dist/index.js
npm test             # 运行单元测试（vitest）
```

- `package.json` 仅用于本地开发工具链（Vite/Svelte/vitest），思源运行时不用它。**插件版本以 `plugin.json` 为准**，`package.json` 的 `version` 仅作参考
- `package-lock.json` **不追踪**（`.gitignore`），因为依赖全是 devDependencies，跨平台 lockfile 频繁产生无意义 diff

## Docker 部署

```bash
# 传统逐文件部署
./scripts/deploy-docker.sh --container siyuan-note

# 打包部署（先 npm run package 再解包，与集市提交一致）
./scripts/deploy-docker.sh --container siyuan-note --package

# watch 模式
./scripts/dev-docker.sh --container siyuan-note
```

`--package` 先跑 `npm run package`，将 `dist/package.zip` 解包后部署，确保部署内容与 bazaar Release 完全一致。`npm run package` 等效于 `bash scripts/package.sh`。

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
- `_siyuanModule` 保留引用，后续可用 `_siyuanModule.openTab()` 等 API（`openTab` 与 `Plugin` 同级）
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

- **FAB 显隐开关**：面板工具栏 ●/○ 按钮，状态存储在 `localStorage`（`siyuan-contacts-showFab`，默认 `false`）
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

### 发布（Bazaar）

1. `npm run package` → 生成 `dist/package.zip`
2. 创建 GitHub Release，上传 `package.zip` 为附件
3. Fork [siyuan-note/bazaar](https://github.com/siyuan-note/bazaar)，在 `plugins.txt` 加 `kuang-R/siyuan-contacts`，提 PR

### 项目结构

```
assets/
  wechat-qr.png          # 微信赞赏码
  alipay-qr.jpg          # 支付宝收款码
scripts/
  deploy-docker.sh       # Docker 部署（支持 --package 打包部署）
  package.sh             # 打包为 package.zip
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
- **反链修复**：`ensureContactsReadonly()` 恢复只读属性后，对每个恢复的联系人调用 `repairBacklinks()`：搜索其他文档中仍包含该联系人块引用的 markdown（`LIKE '%((blockId%'`），对这些源文档根块设 `custom-contact-repair-ts` 属性触发思源重新索引，从而重建 `refs` 表。限制单次最多修复 50 个文档，避免过载
- **反链实现**：用 SQL 查询 `refs` 表（`def_block_root_id = 联系人块ID`）获取引用文档和引用块 ID。不要用 `/api/ref/getBackmentionDoc`（该 API 在 Docker/桌面模式下存在但返回空）
- **`openTab` 导航**：`openTab` 在 `require('siyuan')` 返回的模块上（与 `Plugin` 同级），不在 Plugin 实例上。用法：`_siyuanModule.openTab({ doc: { id: blockId } })`。注意：**先 `this.closePanel()` 再跳转**，否则面板遮住文档看不到效果
- **滚动到引用块**：`openTab` 传文档根块 ID 打开完整文档，但不会自动滚动到引用位置。需用 `document.querySelector('[data-node-id="块ID"]')` + `scrollIntoView()` 手动滚动，并用多次 `setTimeout`（300/800/1500ms）等待 Protyle 异步渲染。查询需限定在 `.layout__wnd--active` 内，避免匹配到反链面板等背景区域的同 ID 块。传 `blockId` 前需判空，避免无意义 scroll
- **联系人内联编辑**：详情页添加 `_editing` 状态，默认只读（显示「编辑」「删除」），点击「编辑」后字段变为输入框（显示「保存」「取消」），保存调 `updateContact` 后 `viewContact` 刷新。进入编辑模式自动聚焦姓名输入框（`tick().then(() => _nameInputEl?.focus())`）。反链区域只在只读模式下显示。新建联系人仍用独立 `add-form`
- **表单自动聚焦**：姓名输入框统一 `bind:this={_nameInputEl}`，新建联系人时通过 `$: if (_view === 'add-form') tick().then(focus)` 自动聚焦。Svelte 的 `{#if}` 分支间共享同一个 `bind:this` 引用（inline edit 和 add-form 两个分支不同时存在，安全共享）
- **反链标题内联编辑**：每个反链条目悬停显示 ✏️ 按钮，点击后标题变输入框（`tick().then(focus)` 自动聚焦），Enter/失焦保存。标题按 `blockID`（非文档 ID）作为 localStorage key 独立存储，**不修改源文档**。列表加载时从 `siyuan-contacts-bl-titles` 恢复自定义标题
- **反链 snippet**：用 `resolveBlockContent()` 查引用块在 `blocks` 表中的完整文本内容，而非 `refs` 表中仅存的人名。`refs.content` 作为回退
- **面板重开刷新反链**：`openPanel()` 设 `panelOpenAt: Date.now()` → Svelte `$:` 检测变化触发 `loadBacklinks` 重新查询数据库
