# 微边提示词（webian-prompt）

VSCode 扩展：把常用 AI 提示词沉淀成侧边栏卡片，点击即发往 CodeBuddy 对话；编辑器右键通过「使用 WebianCode 进行」子菜单提供修复、审查、优化、规范、重构五个动作。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 类型 | TypeScript 6 检查（`tsc6`）+ TypeScript 7 编译（`tsc`） |
| 扩展宿主 | esbuild（CommonJS 单文件产物） |
| Webview | React 19 + Vite 8 |
| 样式 | Tailwind CSS 4（CSS-first `@theme`）+ shadcn registry 官方组件（`pnpm dlx shadcn@latest add`） |
| 图标 | Lucide |
| 包管理 | pnpm 12 |

## 目录结构

```
webian.prompt/
├── src/
│   ├── extension.ts               # 激活入口：装配 store / bridge / provider 并注册命令
│   ├── modules/                   # 扩展宿主（Node 侧）
│   │   ├── codebuddy/
│   │   │   └── CodeBuddyBridge.ts # 与 CodeBuddy 交互的唯一出口（含降级链路）
│   │   ├── commands/
│   │   │   └── contextActions.ts  # 右键五动作：拼目标描述后发往 CodeBuddy
│   │   ├── common/
│   │   │   └── webviewHtml.ts     # 读取构建产物，注入 CSP 并重写资源基址
│   │   ├── prompt/
│   │   │   ├── actions.ts         # 右键动作提示词（修复/审查/优化/规范/重构）
│   │   │   ├── defaults.ts        # 侧边栏内置提示词（提交/推送/按顺序/按推荐）
│   │   │   └── PromptStore.ts     # globalState 持久化 + 归一化 + 增删改排序
│   │   └── views/
│   │       └── PromptSidebarProvider.ts  # WebviewViewProvider，含消息路由
│   ├── webview/                   # 侧边栏界面（浏览器侧）
│   │   ├── index.html             # Vite HTML 入口（宿主据此注入 CSP）
│   │   ├── main.tsx / bootstrap.tsx  # 挂载入口与面板引导组件（首屏加载态用 Spinner）
│   │   ├── components/            # PromptCard、PromptEditorDialog、ui/*（card / dropdown-menu / spinner / tooltip 等）
│   │   ├── hooks/useHostMessages.ts
│   │   ├── lib/{vscode,icons}.ts  # 类名合并直接用 cn 包，不再维护 utils
│   │   └── styles.css             # Tailwind 4 主题令牌映射
│   └── shared/                    # 两侧共享的类型与消息协议
│       ├── types.ts
│       └── messages.ts
├── resources/
│   └── icon.svg                   # 活动栏图标（24x24 单色，currentColor 跟随主题）
├── dist/
│   ├── extension.js               # 扩展宿主产物（esbuild，CJS）
│   └── webview/                   # 侧边栏前端产物（Vite：index.html + assets/）
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

### 右键菜单「使用 WebianCode 进行」

`editor/context` 与 `explorer/context` 共用一个子菜单，排在 CodeBuddy 的「添加到对话」之后（同为 `navigation` 分组，因此之间不会出现分隔线）；子菜单内五项同属一个分组，彼此也没有分隔线：

| 菜单项 | 动作 | 模式 |
| --- | --- | --- |
| 修复 | 定位真实成因，最小改动修复 | craft |
| 审查 | 正确性 / 安全 / 并发与资源释放，只出结论 | ask |
| 优化 | 四维排查（正确性、安全、边界、性能），分级后按 critical → minor 修复 | craft |
| 规范 | 按分号、import 顺序、命名、Hooks、客户端指令五类规则检查并修正 | craft |
| 重构 | 职责分离 / 复用性 / 复杂度 / 耦合度分析，输出提取方案 | ask |

目标文本统一写作 `src/a.ts（第 12-30 行）`，无选区时为 `src/a.ts（整个文件）`。提示词内置在 `src/modules/prompt/actions.ts`，不使用 CodeBuddy 的 `/fix`、`/cr` 斜杠指令，也不依赖其内置修复命令，因此对方指令缺失或改版都不会导致本扩展的命令失效。

路径优先取菜单传入的 `Uri`，回退到 `activeTextEditor`；工作区内使用 `asRelativePath`，无工作区时使用文件名，避免远程/容器场景下绝对路径失效。

## 开发与调试

```bash
pnpm install
pnpm run compile    # 构建：TS7 类型校验 + esbuild 宿主 + vite webview
pnpm run typecheck  # 类型检查（TS6）
pnpm run lint       # ESLint 检查
pnpm run verify     # 类型检查 + ESLint + Prettier 格式校验
pnpm run watch      # 监听模式：tsc6 + esbuild + vite 三路（改完按 Ctrl+Shift+P → Reload Window）
```

在 VSCode 中按 `F5`（`extensionHost` 配置，preLaunchTask 为 `compile`）即可打开扩展开发宿主调试。

打包：

```bash
pnpm run package    # 产出 releases/webian-prompt-0.1.0.vsix
```

## 配置项

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `webianPrompt.codebuddy.sendCommand` | `tencentcloud.codingcopilot.sendToChat` | 发送命令 ID，CodeBuddy 升级改名时可覆盖 |
| `webianPrompt.codebuddy.mode` | `craft` | 对话模式：craft / ask / plan |
| `webianPrompt.codebuddy.autoSend` | `true` | 关闭后只写剪贴板不发送 |
| `webianPrompt.codebuddy.fallbackToClipboard` | `true` | 未检测到 CodeBuddy 时是否退化为剪贴板 |

## 数据存储

提示词存于 `context.globalState` 的 `webianPrompt.templates.v1`，跨工作区共享。该键通过 `globalState.setKeysForSync` 登记到 Settings Sync，用户开启同步（Settings 分类）后会在多台设备间共享；扩展状态以键为粒度整体同步、不做逐条合并，多设备同时修改时以 VS Code 的冲突选择为准。读取时做归一化：补齐被删除的内置模板、剔除结构非法的历史数据；内置模板只可改文案、不可删除。

## 关键约定与已知限制

1. **CodeBuddy 内部命令属于对方实现细节**。`sendToChat` 与视图 ID `coding-copilot.webviews.chat` 未公开声明，若对方大版本调整，可通过 `webianPrompt.codebuddy.sendCommand` 指向新命令，或依赖剪贴板降级继续可用。
2. **Webview 安全**：CSP 由宿主生成后注入模板，`script-src` / `style-src` 仅放行 `cspSource`，`localResourceRoots` 只放行 `dist/webview`；宿主侧对 Webview 发来的草稿做长度与枚举校验后才落盘。
3. **TypeScript 双版本**：`typescript` 指向 TS6（`@typescript/typescript6`，提供 `tsc6`）供日常检查与 ESLint 类型服务；`@typescript/native` 指向 TS7 原生编译器（占用 `tsc` 名称）供构建期校验。两版共用 `tsconfig.json`，选项须同时被 6 / 7 接受。
4. **主题适配**：`src/webview/styles.css` 通过 `@theme inline` 把 shadcn 语义色映射到 `--vscode-*` 变量，并全部带 fallback，明暗主题自动跟随。
5. **产物统一在 `dist/`**：宿主为 `dist/extension.js`（esbuild，CJS），前端为 `dist/webview/index.html` 与 `dist/webview/assets/`（Vite，HTML 入口 + 多文件产物）。Vite 的 `emptyOutDir` 只清理 `dist/webview` 子目录，不会误删宿主包；两边 watch 并行写入互不冲突。
6. **资源基址由宿主重写**：构建产物里资源引用是 `./assets/xxx` 相对路径（`base: './'`），宿主侧 `webviewHtml` 把该前缀替换为 `asWebviewUri` 地址，因此文件名可以带 hash，宿主无需感知具体名字。
7. **路径别名三处同步**：`@components/*` → `src/webview/components/*`、`@webview/*` → `src/webview/*`、`@shared/*` → `src/shared/*`，同时存在于 `tsconfig.json` 的 `paths`、`vite.config.mts` 的 `resolve.alias` 与 `components.json` 的 `aliases`，改一处必须同步另两处。扩展宿主侧（esbuild）只用相对路径引用 `src/shared`，未接别名。
