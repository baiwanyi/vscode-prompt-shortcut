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
import { PROMPT_STORAGE_KEY, PromptStore } from './modules/prompt/PromptStore'
import { PromptSidebarProvider } from './modules/views/PromptSidebarProvider'
import type { FeedbackLevel } from './modules/common/notify'

const SIDEBAR_VIEW_ID = 'webianPrompt.sidebar'
const SIDEBAR_CONTAINER_ID = 'webianPrompt'

/** 状态栏提示比弹窗更轻量，错误才升级为弹窗 */
function notify(level: FeedbackLevel, message: string): void {
    if (level === 'error') {
        void vscode.window.showErrorMessage(message)
        return
    }
    vscode.window.setStatusBarMessage(`微边提示词：${message}`, 4000)
}

async function revealSidebar(): Promise<void> {
    await vscode.commands.executeCommand(`workbench.view.extension.${SIDEBAR_CONTAINER_ID}`)
    try {
        await vscode.commands.executeCommand(`${SIDEBAR_VIEW_ID}.focus`)
    } catch {
        // 视图尚未渲染时 focus 会失败，此时容器已展开，忽略即可
    }
}

export function activate(context: vscode.ExtensionContext): void {
    // 登记同步键：用户开启 Settings Sync 后，提示词随设置一起在多台设备间同步
    context.globalState.setKeysForSync([PROMPT_STORAGE_KEY])
    const store = new PromptStore(context.globalState)
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
        vscode.commands.registerCommand('webianPrompt.openSidebar', async () => {
            await revealSidebar()
            await provider.refresh()
        }),
        vscode.commands.registerCommand('webianPrompt.newPrompt', async () => {
            await revealSidebar()
            await provider.openEditorForNew()
        }),
        vscode.commands.registerCommand('webianPrompt.refresh', async () => {
            await provider.refresh()
        }),
        vscode.commands.registerCommand('webianPrompt.resetPrompts', async () => {
            await revealSidebar()
            await provider.resetWithConfirm()
        }),
    )

    registerContextActions(context, bridge, notify)

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('webianPrompt')) {
                void provider.refresh()
            }
        }),
    )
}

export function deactivate(): void {
    // 无需清理：所有一次性资源均已登记到 context.subscriptions
}
