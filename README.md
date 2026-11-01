# Prompt Shortcut for VSCode

> CodeBuddy 代码开发提示词快捷方式 VSCode 扩展

将日常反复输入的 AI 提示词固化为可检索、可排序、可同步的侧边栏卡片，点击即送达 CodeBuddy 对话框，省去每次重新翻找与粘贴。

在编辑器选中使用右键菜单「快捷命令」，即可直接触发修复、评审、优化、规范、重构五个预设动作，提示词由扩展按选区与相对路径自动拼装。

[![Version](https://img.shields.io/github/package-json/v/baiwanyi/vscode-prompt-shortcut/main?label=version&color=blue)](https://github.com/baiwanyi/vscode-prompt-shortcut/releases)
![License](https://img.shields.io/github/license/baiwanyi/vscode-prompt-shortcut?color=blue)

-----

## ✨ 功能特性

| 功能 | 说明 |
| --- | --- |
| 🗂️ 卡片式管理 | 新建、编辑、复制、上移下移、删除，支持按名称与正文实时搜索 |
| ⚡ 一键发送 | 点击卡片即发送，优先复用 CodeBuddy 当前对话，避免每次新开会话标签 |
| 🖱️ 快捷命令 | 编辑器/资源管理器右键「快捷命令」，提示词由扩展内部拼装，不依赖斜杠指令 |
| 📍 自动描述 | 动作提示词自动带上工作区相对路径与行号，如 `example.ts（第 12-30 行）` |
| 🎛️ 分级降级 | 复用会话 → 新建会话 → 写剪贴板，逐级回退并以 toast 告知结果 |
| 🧩 内置模板 | 内置常用提示词模板，帮助快速上手 |
| 💾 数据同步 | 数据存于扩展全局状态并参与 Settings Sync；整份列表上限 512 KB，编辑器内实时显示用量 |

-----

## 🚀 快速开始

### 安装

从源码运行：

1. `git clone https://github.com/baiwanyi/vscode-prompt-shortcut.git`
2. `pnpm install`
3. `pnpm run compile`
4. 在 VS Code 中按 `F5` 启动扩展开发宿主

安装打包产物：

```bash
pnpm run package
code --install-extension releases/vscode-prompt-shortcut-0.1.0.vsix
```

### 发送一条提示词

点击活动栏的「提示词快捷方式」图标展开面板，点击任意卡片。

`What it does:`

1. 卡片进入 500 ms 待发状态，行尾显示计时图标，此时再次点击可撤销
2. 到点后发送，链路依次尝试：复用当前对话 → 新建对话 → 写入剪贴板
3. 结果以 toast 呈现，例如「已发送到 CodeBuddy 当前对话」

| 场景 | 行为 |
| --- | --- |
| 自动发送 | 只写剪贴板并聚焦 CodeBuddy 对话框 |
| 复用当前会话成功 | 发往当前对话 |
| 复用失败 | 回退新建会话并发送 |
| 全部失败且允许降级 | 写剪贴板 + 聚焦，提示粘贴后回车 |
| 全部失败且禁止降级 | 报错，提示调整命令类配置 |

### 右键快捷命令

在编辑器中右键，或在资源管理器中右键某个文件 →「快捷命令」→ 选择动作。动作目标自动取自选区或整个文件：

| 菜单项 | 作用 | 使用模式 |
| --- | --- | --- |
| 修复缺陷 | 定位真实成因并做最小改动 | 默认模式 |
| 代码评审 | 检查正确性、安全、并发与资源释放，只出结论 | `ask` |
| 实现优化 | 四维排查（正确性、安全、边界、性能），分级后修复 | `ask` |
| 编码规范 | 按分号、import 顺序、命名、Hooks、客户端指令五类规则检查并修正 | 默认模式 |
| 代码重构 | 分析职责分离、复用性、复杂度与耦合度，输出提取方案 | `ask` |

-----

## 📖 内置提示词

内置模板出厂即有，可编辑正文、不可删除；正文为空时以名称作为提示词发送。

| 名称 | 图标 | 模式 | 默认正文 |
| --- | --- | --- | --- |
| 请继续 | terminal | `craft` | 名称即正文 |
| 按推荐顺序实施 | sparkles | `craft` | 名称即正文 |
| 提交到 Git | gitCommit | `craft` | 名称即正文 |
| 推送到 Git | gitPush | `craft` | 名称即正文 |
| 排查遗留代码 | shieldCheck | `ask` | 完整评估指令（孤儿代码、死代码、旧代码残留） |

模式说明：`craft` 直接动手实现，`ask` 只回答不改文件，`plan` 先出方案。

**恢复默认**：卡片「更多」→「恢复默认」可还原单条内置模板；命令面板执行「提示词快捷方式：恢复默认提示词」可清空自定义模板并还原全部出厂内容。该入口刻意只放在命令面板，避免在视图标题栏误点。

-----

## ⚙️ 配置

全部配置位于 `settings.json` 或「设置 → 扩展 → 提示词快捷方式」，无需环境变量。

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| `baiwanyi.prompt.codebuddy.reuseConversation` | `true` | 是否发往当前对话；关闭后每次点击都新建会话 |
| `baiwanyi.prompt.codebuddy.sendCommand` | `tencentcloud.codingcopilot.chat.sendMessage` | 复用当前会话时调用的命令 ID |
| `baiwanyi.prompt.codebuddy.newChatCommand` | `tencentcloud.codingcopilot.sendToChat` | 复用失败时用于新建会话的命令 ID |
| `baiwanyi.prompt.codebuddy.mode` | `craft` | 右键动作未预设模式时的默认模式（`craft`/`ask`/`plan`） |
| `baiwanyi.prompt.codebuddy.autoSend` | `true` | 关闭后不发送，只写剪贴板并聚焦对话框 |
| `baiwanyi.prompt.codebuddy.fallbackToClipboard` | `true` | 发送命令不可用时是否降级为写剪贴板 |
| `baiwanyi.prompt.update.checkOnStartup` | `false` | 是否在启动时检查自建清单；市场安装的版本由 VS Code 自动更新 |
| `baiwanyi.prompt.update.manifestUrl` | 空 | 自建更新清单地址，仅接受 `https`；仅在内网、离线等绕开市场的场景填写 |

```json
{
    "baiwanyi.prompt.codebuddy.reuseConversation": true,
    "baiwanyi.prompt.codebuddy.mode": "ask",
    "baiwanyi.prompt.codebuddy.autoSend": true
}
```

> 前置命令 ID 属 CodeBuddy 内部实现，版本升级可能变动；三项命令类配置即为该风险的覆盖入口。

-----

## 🧱 技术栈

| 层 | 选型 |
| --- | --- |
| 语言 | TypeScript 7 |
| 扩展宿主 | esbuild 打包为 CommonJS 单文件，`target: node20`（Node.js ≥ 20） |
| 前端 | React 19 + Vite + Tailwind CSS 4，组件用 shadcn/ui，图标 lucide-react |
| 质量与打包 | ESLint + Prettier 校验，@vscode/vsce 打包发布，pnpm 管理依赖 |

-----

## 🛠️ 开发

```bash
pnpm install
pnpm run compile   # tsc --noEmit + esbuild + vite build
```

| 命令 | 作用 |
| --- | --- |
| `pnpm run typecheck` | 仅 TypeScript 类型检查 |
| `pnpm run watch` | 三路监听：类型检查、宿主打包、Webview 打包 |
| `pnpm run lint` | ESLint 全量检查 |
| `pnpm run verify` | 类型检查 + ESLint + Prettier 格式校验 |
| `pnpm run package` | 编译并输出 VSIX 到 `releases/` |
| `pnpm run release` | 打包、推 tag 并发布到 GitHub Release（需 `gh auth login`） |

-----

## 💡 常见问题

**面板提示「Webview 资源缺失」**

构建产物不存在，执行 `pnpm run compile` 后重载窗口。

**修改前端代码后界面没变化**

Webview 加载 `dist/webview` 产物而非源码，重新构建后需重开视图或重载窗口。

**常驻提示「未检测到 CodeBuddy」**

可用性轮询已耗尽，确认 CodeBuddy 已安装并激活后点「刷新」；自定义命令 ID 时检查是否指向已注册命令。

**右键菜单提示「请先打开一个文件」**

动作需要目标文件：资源管理器右键会传入文件，命令面板调用则要求存在活动编辑器。

**每次点击都新建了会话**

读不到 `conversationId` 时会退化为不指定会话。可在输出面板选择「提示词快捷方式」通道查看原因，或临时关闭 `reuseConversation`。

-----

## 📜 许可证

MIT License，Copyright (c) 2026 Baiwanyi。完整条款见 [LICENSE.txt](./LICENSE.txt)。

## 🐛 反馈

| 渠道 | 地址 |
| --- | --- |
| 问题反馈 | [Issues](https://github.com/baiwanyi/vscode-prompt-shortcut/issues) |

-----

**Better prompts, better AI responses.**

Make VIBE CODE more convenient.
