# siyuan-contacts (通讯录)

为[思源笔记](https://github.com/siyuan-note/siyuan)添加通讯录功能的插件。

## 功能特性

- **联系人管理** — 在专用 dock 面板中添加、编辑、删除、搜索联系人
- **丰富的联系人字段** — 姓名、电话、邮箱、生日、地址、组织、分组标签、头像、网站、微信、QQ、备注
- **分组标签** — 用自定义标签组织联系人，支持按标签筛选
- **@唤起集成** — 在任意文档中输入 `@名字` 即可插入联系人链接
- **斜杠命令** — 输入 `/add-contact` 快速添加联系人
- **无缝跳转** — 点击联系人引用链接直接跳转到联系人页面
- **联系人文档化** — 每个联系人是独立的思源文档，支持所有原生功能（链接、引用、搜索）

## 安装

### 从思源集市安装

在思源集市中搜索 "siyuan-contacts" 或 "通讯录"。

### 手动安装

1. 从 [GitHub Releases](https://github.com/ruan/siyuan-contacts/releases) 下载最新版本
2. 解压到思源 `data/plugins/` 目录
3. 重启思源或刷新插件

## 使用方法

### 添加联系人

- 点击通讯录面板中的 **+** 按钮
- 或使用快捷键 **Ctrl+Shift+A**
- 或在任意文档中输入 `/add-contact`

### 查看和编辑

- 点击联系人列表中的任意联系人查看详情
- 点击 **编辑** 修改联系人信息
- 点击 **删除** 删除联系人

### 链接到联系人

- 在任意文档中输入 `@` 后跟联系人姓名
- 从下拉列表中选择联系人
- 系统会插入 `[姓名](siyuan://blocks/ID)` 格式的链接
- 点击链接即可跳转到联系人文档

### 使用分组标签

- 在编辑表单中，用逗号分隔输入分组标签（如 `朋友, 同事, 家人`）
- 使用面板顶部的分组筛选栏按标签过滤

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（热更新）
pnpm run dev

# 生产构建
pnpm run build
```

### 项目结构

```
src/
  index.ts              插件入口
  index.css             全局样式
  global.d.ts           类型声明
  utils/                工具模块
    api.ts              思源 API 封装
    constants.ts        常量定义
    i18n.ts             国际化
    notebook.ts         笔记本管理
    sql.ts              SQL 查询构建
    avatar.ts           头像工具函数
  models/               数据模型
    contact.ts          联系人接口
    attributeKeys.ts    IAL 解析器
  stores/               状态管理
    contactStore.ts     联系人 store
    uiStore.ts          UI 状态 store
  components/           Svelte 组件
    ContactPanel.svelte       主面板
    ContactToolbar.svelte     工具栏
    ContactList.svelte        列表
    ContactListItem.svelte    列表项
    ContactDetail.svelte      详情页
    ContactForm.svelte        表单
    ContactAvatar.svelte      头像
    GroupFilter.svelte        分组筛选
    GroupTag.svelte           标签徽标
    EmptyState.svelte         空状态
    LoadingSpinner.svelte     加载中
    DeleteConfirmDialog.svelte 删除确认
  editor/               编辑器集成
    mentionPlugin.ts    @唤起自动完成
    slashCommand.ts     斜杠命令
    linkPlugin.ts       链接点击处理
```

## 技术设计

每个联系人存储为"通讯录"笔记本下的独立思源文档。联系人元数据（电话、邮箱、分组等）作为自定义块属性（`custom-contact-*`）保存在文档根块上。这种设计：

- 支持完整的思源搜索和引用链接功能
- 通过思源 SQL API 可查询联系人数据
- 用户可自由在联系人文档中添加笔记和内容

## 许可协议

MIT
