# 微边提示词（webian-prompt）

VSCode 扩展：把常用 AI 提示词沉淀成侧边栏按钮，点击即发往 CodeBuddy 对话；同时在编辑器右键提供「微边代码」菜单，一键把当前文件交给 CodeBuddy 修复或审查。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 扩展宿主 | TypeScript 7 + esbuild（CommonJS 单文件产物） |
| Webview | React 19 + TypeScript 7 + Vite 8 |
| 样式 | Tailwind CSS 4（CSS-first `@theme`）+ shadcn/ui 风格组件 |
| 图标 | Lucide |
| 包管理 | pnpm 12 |

## 目录结构

```
webian.prompt/
├── src/
│   ├── extension/                 # 扩展宿主（Node 侧）
│   │   ├── extension.ts           # 激活入口：装配 store / bridge / provider 并注册命令
│   │   ├── codebuddy/
│   │   │   └── CodeBuddyBridge.ts # 与 CodeBuddy 交互的唯一出口（含降级链路）
│   │   ├── commands/
│   │   │   └── contextActions.ts  # 右键「微边代码」：/fix 与 /cr
│   │   ├── prompt/
│   │   │   ├── defaults.ts        # 内置提示词（提交/推送/按顺序/按推荐）
│   │   │   └── PromptStore.ts     # globalState 持久化 + 归一化 + 增删改排序
│   │   └── views/
│   │       └── PromptSidebarProvider.ts  # WebviewViewProvider，含 CSP 与消息路由
│   ├── webview/                   # 侧边栏界面（浏览器侧）
│   │   ├── main.tsx / App.tsx
│   │   ├── components/            # PromptCard、PromptEditorDialog、ui/*
│   │   ├── hooks/useHostMessages.ts
│   │   ├── lib/{vscode,icons,utils}.ts
│   │   └── styles.css             # Tailwind 4 主题令牌映射
│   └── shared/                    # 两侧共享的类型与消息协议
│       ├── types.ts
│       └── messages.ts
├── resources/
│   └── icon.svg                   # 活动栏图标（24x24 单色，currentColor 跟随主题）
├── dist/
│   ├── extension.js               # 扩展宿主产物（esbuild，CJS）
│   └── webview/                   # 侧边栏前端产物（Vite：app.js / app.css）
├── scripts/
│   └── esbuild.mjs                # 扩展宿主构建脚本（CJS 单文件产物）
└── vite.config.mts / tsconfig.json
```

## 与 CodeBuddy 的交互方式

### 主通道：`tencentcloud.codingcopilot.sendToChat`

CodeBuddy 4.12 内部注册了 `sendToChat` 命令（未在 `contributes.commands` 中公开），其实现为：

```js
handler({ prompt, mode }) {
    const action = {
        prompt,
        chatType: mode,
        options: { autoSend: true, newChat: true },
        extra: { isVsCodeCommand: true, commandId: 'tencentcloud.codingcopilot.sendToChat' },
    };
    chatService.activatePage({ path: '/', action, params: { newConversation: true } });
}
```

`autoSend: true` + `newChat: true` 恰好等价于「打开对话框 → 填入文本 → 点击发送」，因此本扩展直接复用该命令：

```ts
await vscode.commands.executeCommand('tencentcloud.codingcopilot.sendToChat', { prompt, mode });
```

### 激活顺序（关键）

该命令由 CodeBuddy 的依赖注入容器在**扩展激活后**注册，未激活时 `executeCommand` 会抛出 command not found。所以发送前固定执行：

1. `executeCommand('coding-copilot.webviews.chat.focus')` —— 打开聊天视图并触发 CodeBuddy 激活；
2. 等待 400ms 让注册完成；
3. `getCommands(true)` 校验命令存在后再调用。

### 降级链路

| 场景 | 行为 |
| --- | --- |
| 命令可用 | 直接发送，状态栏提示「已发送」 |
| 命令不可用 / 调用失败 | 写入剪贴板 + 打开 CodeBuddy 对话框，提示 Ctrl+V 后回车 |
| CodeBuddy 未安装 | 同上；若关闭 `fallbackToClipboard` 则弹错误提示并给出配置项指引 |
| `autoSend = false` | 只复制并聚焦，不发送 |

### 右键菜单「微边代码」

`editor/context` 贡献子菜单，两项命令分别拼装：

- 修复：`/fix <相对路径>`，有选区时追加 `（第 12-30 行）`
- 审查：`/cr <相对路径>`，同上

路径优先取菜单传入的 `Uri`，回退到 `activeTextEditor`；工作区内使用 `asRelativePath`，无工作区时使用文件名，避免远程/容器场景下绝对路径失效。

## 开发与调试

```bash
pnpm install
pnpm run build      # 构建 webview 与扩展宿主
pnpm run check      # 类型检查 + 构建
pnpm run watch      # 监听模式（改了代码后按 Ctrl+Shift+P → Reload Window）
```

在 VSCode 中按 `F5`（`extensionHost` 配置，preLaunchTask 为 `build`）即可打开扩展开发宿主调试。

打包：

```bash
pnpm run package    # 产出 releases/webian-prompt-0.1.0.vsix
```

## 配置项

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `webianPrompt.codebuddy.sendCommand` | `tencentcloud.codingcopilot.sendToChat` | 发送命令 ID，CodeBuddy 升级改名时可覆盖 |
| `webianPrompt.codebuddy.mode` | `craft` | 对话模式：craft / ask / plan / debug |
| `webianPrompt.codebuddy.autoSend` | `true` | 关闭后只写剪贴板不发送 |
| `webianPrompt.codebuddy.fallbackToClipboard` | `true` | 未检测到 CodeBuddy 时是否退化为剪贴板 |

## 数据存储

提示词存于 `context.globalState` 的 `webianPrompt.templates.v1`，跨工作区共享。读取时做归一化：补齐被删除的内置模板、剔除结构非法的历史数据；内置模板只可改文案、不可删除。

## 关键约定与已知限制

1. **CodeBuddy 内部命令属于对方实现细节**。`sendToChat` 与视图 ID `coding-copilot.webviews.chat` 未公开声明，若对方大版本调整，可通过 `webianPrompt.codebuddy.sendCommand` 指向新命令，或依赖剪贴板降级继续可用。
2. **Webview 安全**：CSP 使用 nonce，`localResourceRoots` 只放行 `dist/webview`；宿主侧对 Webview 发来的草稿做长度与枚举校验后才落盘。
3. **TypeScript 7 与 ESLint**：`typescript-eslint@8.x` 在检测到 TS ≥ 7 时会直接抛错（上游 issue #10940），因此本项目暂不接入 ESLint，静态检查以 `pnpm run typecheck`（`tsc --noEmit`）为准；待上游支持后可补回。
4. **主题适配**：`src/webview/styles.css` 通过 `@theme inline` 把 shadcn 语义色映射到 `--vscode-*` 变量，并全部带 fallback，明暗主题自动跟随。
5. **产物统一在 `dist/`**：宿主为 `dist/extension.js`（esbuild，CJS），前端为 `dist/webview/app.{js,css}`（Vite，IIFE）。Vite 的 `emptyOutDir` 只清理 `dist/webview` 子目录，不会误删宿主包；两边 watch 并行写入互不冲突。
6. **构建产物文件名固定**：Webview HTML 由扩展宿主手写生成，无法感知构建期 hash，故 `app.js` / `app.css` 不哈希。
7. **路径别名三处同步**：`@components/*` → `src/webview/components/*`、`@webview/*` → `src/webview/*`、`@shared/*` → `src/shared/*`，同时存在于 `tsconfig.json` 的 `paths`、`vite.config.mts` 的 `resolve.alias` 与 `components.json` 的 `aliases`，改一处必须同步另两处。扩展宿主侧（esbuild）只用相对路径引用 `src/shared`，未接别名。
