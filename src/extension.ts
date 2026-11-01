/**
 * 扩展激活入口。
 * 负责装配三个核心部件：提示词存储（globalState）、CodeBuddy 桥接（命令通道）、侧边栏 Webview，
 * 并把命令面板、视图标题按钮与编辑器右键菜单统一注册到扩展上下文；宿主业务模块统一收在 src/modules。
 * 注意：Webview 视图必须在 activate 内同步注册，否则视图首次展开时不会渲染；
 * 配置项统一通过 config 模块的 resolveBridgeConfig 读取，避免各处散落默认值导致行为不一致。
 */
import * as vscode from 'vscode'
import { CodeBuddyBridge } from './modules/codebuddy/CodeBuddyBridge'
import { resolveBridgeConfig } from './modules/codebuddy/config'
import { registerContextActions } from './modules/commands/contextActions'
import { createReporter } from './modules/common/createReporter'
import { PROMPT_STORAGE_KEY, PromptStore } from './modules/prompt/PromptStore'
import { resolveUpdateSettings } from './modules/update/config'
import { checkForUpdate } from './modules/update/updateChecker'
import { PromptSidebarProvider } from './modules/views/PromptSidebarProvider'
import { isRecord } from './shared/guards'
import type { FeedbackLevel } from './modules/common/notify'

const SIDEBAR_VIEW_ID = 'baiwanyi.prompt.sidebar'
const SIDEBAR_CONTAINER_ID = 'baiwanyi.prompt'

/** 已提示过的版本：同一版本只提醒一次，避免每次重载窗口都弹窗 */
const LAST_NOTIFIED_KEY = 'baiwanyi.prompt.update.lastNotifiedVersion'

/** 状态栏提示比弹窗更轻量，错误才升级为弹窗 */
function notify(level: FeedbackLevel, message: string): void {
    if (level === 'error') {
        void vscode.window.showErrorMessage(message)
        return
    }
    vscode.window.setStatusBarMessage(`提示词快捷方式：${message}`, 4000)
}

async function revealSidebar(): Promise<void> {
    await vscode.commands.executeCommand(`workbench.view.extension.${SIDEBAR_CONTAINER_ID}`)
    try {
        await vscode.commands.executeCommand(`${SIDEBAR_VIEW_ID}.focus`)
    } catch {
        // 视图尚未渲染时 focus 会失败，此时容器已展开，忽略即可
    }
}

/** 读扩展清单里的版本号：packageJSON 的类型是 any，先按记录收窄再取值 */
function readLocalVersion(context: vscode.ExtensionContext): string {
    const manifest: unknown = context.extension.packageJSON
    return isRecord(manifest) && typeof manifest.version === 'string' ? manifest.version : ''
}

/**
 * 启动期版本检查：只在新版本可用时打扰用户一次，检查失败与「已最新」都静默。
 * 调用方不 await，网络慢也不会拖住激活与侧边栏渲染。
 */
async function checkUpdateOnStartup(context: vscode.ExtensionContext): Promise<void> {
    const settings = resolveUpdateSettings()
    if (!settings.checkOnStartup || !settings.manifestUrl) {
        return
    }
    const report = createReporter('提示词快捷方式 · 更新检查', (disposable): void => {
        context.subscriptions.push(disposable)
    })
    const localVersion = readLocalVersion(context)
    const outcome = await checkForUpdate(localVersion, settings.manifestUrl, report)
    if (outcome.type !== 'update') {
        return
    }
    // 同一版本已提示过就不再打扰：用户选择忽略后，下次窗口重载不该重弹
    if (context.globalState.get<string>(LAST_NOTIFIED_KEY) === outcome.manifest.version) {
        return
    }
    await context.globalState.update(LAST_NOTIFIED_KEY, outcome.manifest.version)
    const choice = await vscode.window.showInformationMessage(
        `提示词快捷方式有新版本 ${outcome.manifest.version}（当前 ${localVersion}）`,
        '前往下载',
    )
    if (choice === '前往下载') {
        await vscode.env.openExternal(vscode.Uri.parse(outcome.manifest.url))
    }
}

export function activate(context: vscode.ExtensionContext): void {
    // 登记同步键：用户开启 Settings Sync 后，提示词随设置一起在多台设备间同步
    context.globalState.setKeysForSync([PROMPT_STORAGE_KEY])
    const store = new PromptStore(context.globalState)
    // 旧版存储键（webianPrompt.templates.v1）的数据在激活期搬入新键，不依赖用户先展开面板
    void store.migrateLegacyStorage()
    // 桥接层按需创建排障日志通道，释放动作统一挂到扩展上下文
    const bridge = new CodeBuddyBridge(resolveBridgeConfig, (disposable): void => {
        context.subscriptions.push(disposable)
    })
    const provider = new PromptSidebarProvider(context.extensionUri, store, bridge)

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, provider, {
            webviewOptions: { retainContextWhenHidden: true },
        }),
    )

    context.subscriptions.push(
        vscode.commands.registerCommand('baiwanyi.prompt.openSidebar', async () => {
            await revealSidebar()
            await provider.refresh()
        }),
        vscode.commands.registerCommand('baiwanyi.prompt.create', async () => {
            await revealSidebar()
            await provider.openEditorForNew()
        }),
        vscode.commands.registerCommand('baiwanyi.prompt.refresh', async () => {
            await provider.refresh()
        }),
        vscode.commands.registerCommand('baiwanyi.prompt.reset', async () => {
            await revealSidebar()
            await provider.resetWithConfirm()
        }),
    )

    registerContextActions(context, bridge, notify)

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('baiwanyi.prompt')) {
                void provider.refresh()
            }
        }),
    )

    void checkUpdateOnStartup(context)
}

export function deactivate(): void {
    // 无需清理：所有一次性资源均已登记到 context.subscriptions
}
