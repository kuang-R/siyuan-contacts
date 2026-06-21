# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

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

### UI：DOM 注入（浮动按钮 + 侧滑面板）

不使用 SiYuan 的 Dock/Tab API（浏览器模式下不可靠）。直接注入 DOM：

- `index.ts` 创建三个 DOM 元素：`#siyuan-contacts-backdrop`（遮罩）、`#siyuan-contacts-panel`（面板）、`#siyuan-contacts-fab`（浮动按钮）
- Svelte 组件渲染到 `#siyuan-contacts-panel` 中
- 点击 FAB toggle 面板，点击遮罩关闭

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
  index.ts              # 插件入口：DOM 注入、FAB、面板开关
  index.css             # 全局样式
  utils/                # API、SQL、i18n、notebook、avatar
  models/               # Contact 接口、IAL 解析
  stores/               # Svelte stores（contactStore、uiStore）
  components/
    ContactPanel.svelte # 唯一 UI 组件（列表/详情/表单/对话框）
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
