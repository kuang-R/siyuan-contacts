# siyuan-contacts (通讯录)

[思源笔记](https://github.com/siyuan-note/siyuan) 通讯录插件。

> 维护者：[@kuang-R](https://github.com/kuang-R)

## 功能

- **侧滑面板** — 点击右上角插件栏图标打开，每次打开自动刷新；点击遮罩或 Esc 关闭。浮动按钮可在面板工具栏中手动开启
- **可选浮动按钮** — 默认关闭，面板工具栏内一键切换显隐（● 显示 / ○ 隐藏），切换有提示
- **丰富的联系人字段** — 姓名、多号码、多邮箱、生日、地址、组织、分组、头像（支持图片预览）、网站、微信、QQ、备注
- **头像支持** — 可上传头像图片（≤128KB），列表和详情中展示
- **多值字段** — 电话和邮箱支持 +/− 按钮动态增删
- **分组标签** — 自定义标签组织联系人，支持按标签筛选
- **排序选项** — 按姓名（A-Z / Z-A）、最近添加、最近更新排序
- **斜杠命令** — 输入 `/名字` 插入联系人链接，点击打开面板而非跳转文档
- **斜杠命令** — `/add-contact` 快速添加联系人
- **内联编辑** — 详情页直接编辑字段，无需切换到独立表单
- **反链视图** — 详情页底部展示引用了该联系人的文档，可自定义反链标题
- **自动聚焦** — 添加或编辑联系人时自动聚焦姓名输入框
- **点击复制** — 点击电话号码复制到剪贴板，弹出提示
- **文档只读保护** — 联系人文档禁止在文件树中直接编辑
- **联系人即文档** — 每个联系人是思源文档，支持原生搜索、引用、数据历史
- **完整国际化** — 中英文界面全覆盖，无硬编码文本

## 安装

### 从思源集市

搜索 "siyuan-contacts" 安装。

### 手动安装

1. 从 [GitHub Releases](https://github.com/kuang-R/siyuan-contacts/releases) 下载
2. 解压到思源 `data/plugins/` 目录
3. 重启思源或刷新插件

## 使用方法

### 打开面板

- 点击右上角插件栏的**联系人图标**
- 浮动按钮默认关闭，可通过面板工具栏的 ● 图标（+ 按钮旁）一键开启
- 点击遮罩层或按 Esc 关闭

### 添加联系人

- 点击面板工具栏 **+** 按钮
- 快捷键 **Ctrl+Shift+A**
- 或在文档中输入 `/add-contact`

### 管理多个电话/邮箱

- 编辑表单中每个电话/邮箱有独立输入框
- 点击 **+ 电话** / **+ 邮箱** 添加新字段
- 点击 **−** 按钮删除该字段

### 链接到联系人

- 文档中输入 `/` 后跟联系人姓名（如 `/张三`）
- 斜杠菜单中选择联系人
- 自动插入可点击的联系人链接
- 点击链接跳转到联系人文档

### 分组

- 编辑时输入逗号分隔的标签（如 `朋友, 同事, 家人`）
- 面板顶部标签栏按分组筛选

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 开发构建（watch）
npm run build        # 生产构建 → dist/index.js
npm test             # 运行单测
```

### 项目结构

```
src/
  index.ts              插件入口（DOM 注入、浮动按钮、侧滑面板）
  index.css             全局样式
  utils/                工具模块（API、SQL、国际化、笔记本管理等）
  models/               数据模型（联系人、IAL 解析）
  stores/               状态管理（联系人 store、UI store）
  components/
    ContactPanel.svelte 一体化 UI 组件（列表、详情、表单、对话框）
  editor/               编辑器集成（@唤起、斜杠命令、点击跳转）
  tests/                单元测试
```

## 技术设计

联系人存储为独立思源文档，元数据（电话、邮箱等）以自定义块属性（`custom-contact-*`）保存在文档根块上，支持原生搜索、链接和自由笔记。UI 由单个 Svelte 组件渲染到 DOM 注入的侧滑面板中，兼容桌面应用、浏览器和 Docker 部署。

## 许可

MIT

---

<div align="center">

  <sub>❤️ 如果这个插件对你有帮助，考虑给我买点token ☕</sub>

  <table>
    <tr>
      <td align="center"><img src="https://raw.githubusercontent.com/kuang-R/siyuan-contacts/main/assets/wechat-qr.png" width="200" alt="微信收款码"><br/>微信</td>
      <td align="center"><img src="https://raw.githubusercontent.com/kuang-R/siyuan-contacts/main/assets/alipay-qr.jpg" width="200" alt="支付宝收款码"><br/>支付宝</td>
    </tr>
  </table>

</div>
