# 微边提示词（webian-prompt）

一个 VS Code 扩展：把常用 AI 提示词沉淀为侧边栏卡片，点击即发送到 CodeBuddy 对话；编辑器与资源管理器右键通过「使用 WebianCode 进行」子菜单提供修复、审查、优化、规范、重构五个动作。

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [安装](#安装)
- [配置](#配置)
- [快速开始](#快速开始)
- [使用示例](#使用示例)
- [项目结构](#项目结构)
- [API 说明](#api-说明)
- [常见问题与故障排查](#常见问题与故障排查)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [联系方式](#联系方式)

## 项目简介

### 背景与目标

CodeBuddy 的常用指令（提交代码、按推荐顺序实施、排查遗留代码等）需要反复手写或复制。本项目把这些指令固化为可编辑的卡片，并复用 CodeBuddy 已有的会话通道，使「选择一条提示词并发出」缩短为一次点击。

### 核心特性

- 侧边栏卡片式提示词管理：支持新建、编辑、复制、排序、删除、按名称与正文搜索。
- 一键发送到 CodeBuddy：优先复用当前会话，失败后按「新建会话 → 写入剪贴板」逐级降级。
- 右键五动作：修复、审查、优化、规范、重构，提示词由扩展内部拼装，不依赖 CodeBuddy 的斜杠指令。
- 目标自动描述：动作提示词会带上工作区相对路径与行号范围（如 `src/a.ts（第 12-30 行）`）。
- 配置可覆盖：命令 ID、对话模式、是否自动发送、是否复用会话均可通过设置调整。
- 数据跟随 Settings Sync：提示词存于扩展全局状态，开启同步后可在多台设备间共享。

### 适用场景

- 已安装 CodeBuddy，且希望把团队或个人常用指令固化为列表的开发者。
- 需要在多项目间复用同一套提示词，而不想每个仓库各存一份配置文件。
- 希望在右键菜单里直接发起代码审查、重构分析等固定动作。

## 技术栈

| 层 | 选型 | 版本要求 |
| --- | --- | --- |
| 语言 | TypeScript | `^6.0.2`（`tsc6`，日常检查）、`^7.0.2`（`tsc`，构建前校验） |
| 扩展宿主 | esbuild | `^0.28.2`，输出 CommonJS 单文件，`target: node20` |
| 界面框架 | React / React DOM | `^19.3.1` |
| 构建（Webview） | Vite / @vitejs/plugin-react | `^8.3.5` / `^6.1.2` |
| 样式 | Tailwind CSS / @tailwindcss/vite / tw-animate-css | `^4.3.3` / `^4.3.3` / `^1.4.0` |
| 组件库 | shadcn 结构 + radix-ui | `^1.8.1` |
| 图标 / 通知 | lucide-react / sonner | `^1.65.0` / `^2.0.8` |
| 类名合并 | cn（`clsx` + `tailwind-merge` 的编译版替代） | `^0.5.1` |
| 代码质量 | ESLint / Prettier | `^10.14.0` / `^3.9.10` |
| 打包 | @vscode/vsce | `^4.1.0` |
| 包管理 | pnpm | 12 |

> 依赖全部声明在 `devDependencies`：扩展宿主由 esbuild 打包进 `dist/extension.js`，Webview 由 Vite 打包进 `dist/webview`，发布时使用 `vsce package --no-dependencies`，运行期不读取 `node_modules`。

## 环境要求

| 项 | 要求 | 依据 |
| --- | --- | --- |
| Node.js | ≥ 22（推测） | 依赖 `cn@0.5.1` 声明 `engines.node >= 22`；`package.json` 未声明 `engines.node` |
| pnpm | 12 | `pnpm-workspace.yaml` 注释与既有文档；`package.json` 未声明 `packageManager` |
| VS Code | `^1.144.0` | `package.json` 的 `engines.vscode` |
| CodeBuddy 扩展 | 可选，建议 4.12 及以上 | 命令 ID 取自 CodeBuddy 内部实现，见 `src/modules/codebuddy/config.ts` |
| 原生依赖 | 无 | `keytar`、`@vscode/vsce-sign`、`unrs-resolver` 使用 pnpm 下载的预编译二进制，无需本机编译 |

CodeBuddy 未安装时扩展仍可运行，发送链路会降级为写剪贴板并给出提示。

## 安装

### 从源码运行（开发）

```bash
git clone https://github.com/baiwanyi/webian.prompt.git
cd webian.prompt
pnpm install
```

PowerShell 下命令相同，若策略限制脚本执行，可使用 `pnpm.cmd install`。

### 安装打包产物

```bash
pnpm run package
```

命令会在 `releases/` 生成 `webian-prompt-0.1.0.vsix`，然后在 VS Code 中执行：

```bash
code --install-extension releases/webian-prompt-0.1.0.vsix
```

或通过扩展面板的「从 VSIX 安装」选择该文件。

## 配置

本项目不使用环境变量，全部配置位于 VS Code 设置（`settings.json` 或「设置 → 扩展 → 微边提示词」）。

| 变量名 | 是否必填 | 默认值 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `webianPrompt.codebuddy.reuseConversation` | 否 | `true` | 是否把提示词发往当前对话。关闭后每次点击都会新建会话 | `false` |
| `webianPrompt.codebuddy.sendCommand` | 否 | `tencentcloud.codingcopilot.chat.sendMessage` | 复用当前会话时调用的命令 ID | `tencentcloud.codingcopilot.chat.sendMessage` |
| `webianPrompt.codebuddy.newChatCommand` | 否 | `tencentcloud.codingcopilot.sendToChat` | 复用失败时用于新建会话的命令 ID | `tencentcloud.codingcopilot.sendToChat` |
| `webianPrompt.codebuddy.mode` | 否 | `craft` | 右键动作未预设模式时的默认模式，取值 `craft` / `ask` / `plan`；侧边栏卡片按各自模式发送，不受此项影响 | `ask` |
| `webianPrompt.codebuddy.autoSend` | 否 | `true` | 关闭后不发送，只写入剪贴板并聚焦对话框 | `false` |
| `webianPrompt.codebuddy.fallbackToClipboard` | 否 | `true` | 两条发送命令都不可用时是否降级为写剪贴板 | `false` |
| `webianPrompt.update.checkOnStartup` | 否 | `true` | 启动时是否检查新版本，失败静默 | `false` |
| `webianPrompt.update.manifestUrl` | 否 | 仓库 `update.json` 的 GitHub raw 地址 | 更新清单地址，仅接受 `https`，留空即关闭检查 | `https://cdn.jsdelivr.net/gh/baiwanyi/webian.prompt@main/update.json` |

前置命令 ID 属 CodeBuddy 内部实现，版本升级可能变动；三项命令类配置即为该风险的覆盖入口。

## 快速开始

```bash
pnpm run compile
```

该命令依次执行：`tsc --noEmit`（TypeScript 7 类型校验）、`node scripts/esbuild.mjs`（宿主打包）、`vite build`（Webview 打包）。成功时输出类似：

```text
  dist/extension.js  34.9kb
  Done in 21ms
  dist/webview/index.html                    1.03 kB │ gzip:   0.76 kB
  dist/webview/assets/style-<hash>.css      65.85 kB │ gzip:  10.80 kB
  dist/webview/assets/index-<hash>.js      450.02 kB │ gzip: 144.15 kB
```

在 VS Code 中按 `F5` 启动扩展开发宿主（`preLaunchTask` 已配置为 `compile`），活动栏会出现「微边提示词」图标，点击展开侧边栏。

其他常用命令：

| 命令 | 作用 |
| --- | --- |
| `pnpm run typecheck` | 仅做 TypeScript 6 类型检查（`tsc6 --noEmit`） |
| `pnpm run watch` | 三路监听：`tsc6 --watch`、esbuild `--watch`、`vite build --watch` |
| `pnpm run lint` | ESLint 全量检查 |
| `pnpm run verify` | 类型检查 + ESLint + Prettier 格式校验 |
| `pnpm run package` | 编译并输出 VSIX 到 `releases/` |
| `pnpm run release` | 打包、推 tag 并发布到 GitHub Release（需 `gh auth login`，详见「更新检查」） |

## 使用示例

### 发送一条提示词

展开侧边栏，点击任意卡片：点击后留出 500 ms 可撤销窗口（行尾出现计时图标），窗口内再次点击或打开「更多」菜单即取消。发送结果以 toast 呈现。

发送链路按以下顺序降级：

| 场景 | 行为 |
| --- | --- |
| `autoSend = false` | 只写剪贴板并聚焦 CodeBuddy 对话框 |
| 复用当前会话成功 | 发往当前对话，提示「已发送到 CodeBuddy 当前对话」 |
| 复用失败 | 回退新建会话，提示「已在 CodeBuddy 新建对话并发送」 |
| 两条命令都失败且 `fallbackToClipboard = true` | 写剪贴板 + 聚焦，提示按 `Ctrl+V` 后回车 |
| 两条命令都失败且 `fallbackToClipboard = false` | 报错，并提示调整 `sendCommand` / `newChatCommand` |

### 右键动作

在编辑器内右键（或资源管理器中右键文件）→「使用 WebianCode 进行」→ 选择动作：

| 菜单项 | 行为 | 使用模式 |
| --- | --- | --- |
| 修复 | 定位真实成因并做最小改动 | 默认模式 |
| 审查 | 检查正确性、安全、并发与资源释放，只出结论 | `ask` |
| 优化 | 四维排查（正确性、安全、边界、性能），分级后修复 | `ask` |
| 规范 | 按分号、import 顺序、命名、Hooks、客户端指令五类规则检查并修正 | 默认模式 |
| 重构 | 分析职责分离、复用性、复杂度与耦合度，输出提取方案 | `ask` |

有选区时目标描述为 `src/a.ts（第 12-30 行）`，无选区时为 `src/a.ts（整个文件）`。

### 通过设置调整行为

```json
{
    "webianPrompt.codebuddy.reuseConversation": true,
    "webianPrompt.codebuddy.mode": "ask",
    "webianPrompt.codebuddy.autoSend": true,
    "webianPrompt.codebuddy.fallbackToClipboard": true,
    "webianPrompt.update.checkOnStartup": true
}
```

### 恢复默认

- 单条：卡片「更多」→「恢复默认」（仅内置模板可用，需二次确认）。
- 全部：命令面板执行「微边提示词：恢复默认提示词」。该入口刻意只放在命令面板，视图标题栏不提供，避免误点清空自定义模板。

### 更新检查

扩展未上架市场，新版本通过仓库根目录的 `update.json` 告知：

| 字段 | 说明 |
| --- | --- |
| `version` | 最新可用版本，须严格高于 `package.json` 的 `version` 才会提示 |
| `url` | 下载页地址，仅接受 `https`；点击提示中的「前往下载」会用浏览器打开 |

发版时同步这两项，用户下次重载窗口即可收到提示；同一版本只提示一次。

- 检查在激活后异步执行，不阻塞侧边栏渲染；超时 3 秒，失败只写入「微边提示词 · 更新检查」输出面板。
- `webianPrompt.update.checkOnStartup` 置 `false`，或把 `manifestUrl` 留空，都能完全停用。
- GitHub 访问受限时，把地址换成镜像（如 jsDelivr）或内网地址即可，无需改代码。

发布新版本：

```bash
pnpm run release
```

脚本会校验工作区是否干净、tag 是否已被占用，再依次执行 `pnpm run package`、推送分支与 `v*` tag、`gh release create` 上传 vsix。它不改 `update.json`，发布成功后仍需手动把版本号与下载地址同步过去并提交。

## 项目结构

```text
webian.prompt/
├── src/
│   ├── extension.ts               # 激活入口：装配 store / bridge / provider 并注册命令
│   ├── modules/                   # 扩展宿主（Node 侧）
│   │   ├── codebuddy/             # CodeBuddy 桥接：命令调用契约、配置常量、可用性轮询、发送编排
│   │   ├── commands/              # 右键动作：清单、注册、目标文件解析、执行编排
│   │   ├── common/                # 二次确认、日志通道工厂、提示契约、Webview HTML 装配
│   │   ├── prompt/                # 内置模板、动作提示词文案、草稿校验、持久化
│   │   ├── update/                # 更新检查：清单地址配置、版本比对、清单校验
│   │   └── views/                 # WebviewViewProvider 与传输层（握手缓存、消息下发）
│   ├── webview/                   # 侧边栏界面（浏览器侧）
│   │   ├── main.tsx               # 挂载入口：主题同步 + TooltipProvider
│   │   ├── bootstrap.tsx          # 面板引导组件与首屏加载态
│   │   ├── components/            # 业务组件（头部、列表、条目、编辑器、选择器）
│   │   │   └── ui/                # shadcn 托管组件目录（由 CLI 写盘，勿手改结构）
│   │   ├── hooks/                 # 状态订阅、编辑弹窗、表单、撤销窗口、搜索覆盖层
│   │   ├── lib/                   # 纯函数与映射：筛选、草稿归一、图标、模式文案、连接语义、消息出口
│   │   └── styles.css             # Tailwind 4 主题令牌（绑定 --vscode-* 变量）
│   └── shared/                    # 两侧共享：领域类型、消息协议、长度上限、判空谓词、异常文本化
├── resources/                     # icon.svg（活动栏）与 icon.png（扩展图标）
├── scripts/esbuild.mjs            # 扩展宿主构建脚本
├── .vscode/                       # launch.json（F5）与 tasks.json（compile / watch）
├── components.json                # shadcn CLI 配置（别名须与 tsconfig / vite 同步）
├── eslint.config.mjs              # 扁平配置：宿主 + Webview + 托管 ui 目录豁免
├── tsconfig.json                  # 双版本 TypeScript 共用的类型配置
├── vite.config.mts                # Webview 构建配置（HTML 入口 + 别名）
├── pnpm-workspace.yaml            # 仅承载 allowBuilds 白名单，非 monorepo 声明
└── dist/                          # 构建产物：extension.js 与 webview/（gitignore）
```

设计约束：宿主负责校验与持久化，Webview 只发意图并按推送渲染；`src/shared` 是两侧唯一的类型与协议来源。

## API 说明

本项目不提供 HTTP 接口。可编程入口为 VS Code 命令与设置项，客户端契约均为可选参数。

### 命令

| 命令 ID | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `webianPrompt.openSidebar` | 无 | `Promise<void>` | 展开侧边栏容器并聚焦视图 |
| `webianPrompt.newPrompt` | 无 | `Promise<void>` | 展开侧边栏并打开新建弹窗 |
| `webianPrompt.refresh` | 无 | `Promise<void>` | 重新探测并推送状态 |
| `webianPrompt.resetPrompts` | 无 | `Promise<void>` | 二次确认后删除全部自定义模板并恢复内置默认 |
| `webianPrompt.fixWithCodeBuddy` | `uri?: vscode.Uri` | `Promise<void>` | 修复动作；`uri` 由资源管理器右键传入 |
| `webianPrompt.reviewWithCodeBuddy` | `uri?: vscode.Uri` | `Promise<void>` | 审查动作，使用 `ask` 模式 |
| `webianPrompt.optimizeWithCodeBuddy` | `uri?: vscode.Uri` | `Promise<void>` | 优化动作，使用 `ask` 模式 |
| `webianPrompt.styleWithCodeBuddy` | `uri?: vscode.Uri` | `Promise<void>` | 规范动作 |
| `webianPrompt.refactorWithCodeBuddy` | `uri?: vscode.Uri` | `Promise<void>` | 重构动作，使用 `ask` 模式 |

五个动作命令未传 `uri` 时，目标取自当前活动编辑器；两者都没有时弹出「请先打开一个文件」。

### 依赖的外部命令通道

以下 ID 属 CodeBuddy 内部实现，未在其 `contributes.commands` 中声明，版本升级可能变动。

| 用途 | 命令 / 视图 ID | 是否可配置 | 说明 |
| --- | --- | --- | --- |
| 读取当前会话 | `tencentcloud.codingcopilot.getContext` | 否 | 只读通道，不传 `ensureConversation` 时不会新建会话 |
| 复用当前会话发送 | `tencentcloud.codingcopilot.chat.sendMessage` | 是（`sendCommand`） | 不带 `newConversation`，落点由 `options.conversationId` 决定 |
| 新建会话发送 | `tencentcloud.codingcopilot.sendToChat` | 是（`newChatCommand`） | 内部固定 `newConversation: true`，必然新开会话 |
| 聊天视图 | `coding-copilot.webviews.chat` | 否 | focus 该视图可触发 CodeBuddy 激活 |
| 聊天容器 | `workbench.view.extension.coding-copilot-chat` | 否 | focus 视图失败时的二级降级目标 |

激活与重试策略：发送前先 focus 聊天视图，再以 250 ms 间隔轮询 `getCommands(true)` 等待命令注册，超时 10 s；复用通道失败时按 500 ms 间隔重试至多 3 次，被对方明确拒绝（返回 `{ error }`）则不重试，直接进入新建会话回退。

### 内部消息协议

Webview 与宿主之间使用可辨识联合消息，仅供本扩展内部使用，不构成对外兼容承诺。

| 方向 | 类型 | 载荷 |
| --- | --- | --- |
| Webview → 宿主 | `ready` / `requestState` | 无 |
| Webview → 宿主 | `runPrompt` / `copyPrompt` / `deletePrompt` | `id: string` |
| Webview → 宿主 | `resetPrompt` | `id: string`（仅内置模板生效） |
| Webview → 宿主 | `savePrompt` | `draft: PromptDraft` |
| Webview → 宿主 | `movePrompt` | `id: string`、`direction: 'up' \| 'down'` |
| 宿主 → Webview | `state` | `payload: PromptStatePayload` |
| 宿主 → Webview | `notify` | `level: 'info' \| 'warn' \| 'error'`、`message: string` |
| 宿主 → Webview | `editPrompt` | 无（请求打开新建弹窗） |
| 宿主 → Webview | `codebuddyMissing` | 无（轮询耗尽后的常驻提示） |

### 数据存储

| 项 | 值 |
| --- | --- |
| 存储位置 | `context.globalState`（跨工作区共享） |
| 键名 | `webianPrompt.templates.v1` |
| 同步 | 通过 `globalState.setKeysForSync` 参与 Settings Sync，以键为粒度整体同步 |
| 容量上限 | 整份列表序列化后 ≤ 512 KB（`MAX_TOTAL_BYTES`）；编辑器内实时显示用量，提交超限时由 Webview 拦截并提示，宿主复核后拒绝落盘 |
| 读取归一化 | 补齐缺失的内置模板、剔除非法结构、跳过重复 `id`；顺序以持久化数组为准 |

## 常见问题与故障排查

**侧边栏提示「Webview 资源缺失，请先执行 pnpm run compile」**

构建产物不存在或路径不匹配。执行 `pnpm run compile` 后重新加载窗口（`Ctrl+Shift+P` → `Developer: Reload Window`）。

**修改前端代码后界面没有变化**

Webview 加载的是 `dist/webview` 下的产物，不是源码。重新执行 `pnpm run compile`（或保持 `pnpm run watch`）后需重开视图或重载窗口。

**面板常驻提示「未检测到 CodeBuddy」**

说明可用性轮询已耗尽（最多 30 次、指数退避至 15 s 封顶）。确认 CodeBuddy 已安装并激活，然后点击提示中的「刷新」。若使用自定义命令 ID，检查 `sendCommand` / `newChatCommand` 是否指向已注册命令。

**每次点击都新建了会话**

复用会话依赖 `tencentcloud.codingcopilot.getContext` 返回的 `conversationId`。读不到时会退化为不指定会话，落点由 CodeBuddy 决定。可在输出面板选择「微边提示词」通道查看失败原因，或临时关闭 `reuseConversation` 以稳定走新建通道。

**右键菜单提示「请先打开一个文件，再使用「微边代码」菜单」**

动作需要目标文件：资源管理器右键会传入文件 `Uri`，命令面板调用则要求存在活动编辑器。

**`pnpm install` 提示构建脚本被拦截**

`pnpm-workspace.yaml` 的 `allowBuilds` 已声明 `@vscode/vsce-sign`、`esbuild`、`keytar`、`unrs-resolver`。若新增需要执行 postinstall 的依赖，需同步补入该白名单。

**为什么有两个 TypeScript 相关命令**

`typescript` 指向 TS 6（提供 `tsc6`），用于日常检查与 ESLint 类型服务；`@typescript/native` 指向 TS 7 原生编译器（占用 `tsc` 名称），用于构建前校验。二者共用 `tsconfig.json`，选项须同时被两版接受。

**ESLint 报错但不想改代码结构**

项目启用 `noInlineConfig`，禁止使用 `eslint-disable` 注释规避规则；请通过重构或调整实现方式解决。`src/webview/components/ui` 为 shadcn CLI 托管目录，已整目录豁免部分规则。

## 贡献指南

### 提交信息

采用 Conventional Commits，类型前缀使用英文，描述使用中文：

```text
fix: 修复内置模板排序被读档重建覆盖的问题
feat: 新增按正文搜索提示词
refactor: 拆分宿主消息路由与业务编排
chore: 更新依赖与锁文件
```

### 代码风格

| 项 | 约定 |
| --- | --- |
| 缩进 | 4 个空格，不使用 Tab |
| 引号 / 分号 | 单引号，语句结尾不加分号 |
| 行宽 | 120（Prettier） |
| 换行符 | LF |
| 导入顺序 | builtin → external → internal（`@components` / `@shared` / `@webview`）→ sibling → index → type，组内字母升序、组间不留空行 |
| 文件头 | 每个源文件首部保留 3–8 行中文模块注释：职责、复用约定、关键约束 |
| 禁止项 | 不使用 `eslint-disable`；不使用 `as unknown as` 双重断言；不使用已废弃 API |

### 提交前检查

```bash
pnpm run verify
pnpm run compile
```

### 分支与 PR 流程

分支命名规范：[待补充]

<!-- TODO: 需补充分支规范（如 main 保护策略、feature/fix 分支命名） -->

PR 流程：[待补充]

<!-- TODO: 需补充 PR 模板、评审要求、CI 检查项（当前仓库无 .github 配置与 CI） -->

## 许可证

MIT License，Copyright (c) 2026 webian。完整条款见 [LICENSE.txt](./LICENSE.txt)。

## 联系方式

| 渠道 | 地址 |
| --- | --- |
| 邮箱 | baiwanyi@webian.cn |
| 主页 | [baiwanyi.com](https://baiwanyi.com) |
| 仓库 | [github.com/baiwanyi/webian.prompt](https://github.com/baiwanyi/webian.prompt) |
| 问题反馈 | [Issues](https://github.com/baiwanyi/webian.prompt/issues) |
