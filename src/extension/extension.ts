/**
 * 扩展激活入口。
 * 负责装配三个核心部件：提示词存储（globalState）、CodeBuddy 桥接（命令通道）、侧边栏 Webview，
 * 并把命令面板、视图标题按钮与编辑器右键菜单统一注册到扩展上下文。
 * 注意：Webview 视图必须在 activate 内同步注册，否则视图首次展开时不会渲染；
 * 配置项统一通过 readBridgeConfig 读取，避免各处散落默认值导致行为不一致。
 */
import * as vscode from 'vscode';
import type { BridgeConfig } from './codebuddy/CodeBuddyBridge';
import { CodeBuddyBridge } from './codebuddy/CodeBuddyBridge';
import { registerContextActions } from './commands/contextActions';
import { PromptStore } from './prompt/PromptStore';
import { PromptSidebarProvider } from './views/PromptSidebarProvider';
import type { ChatMode } from '../shared/types';

const SIDEBAR_VIEW_ID = 'webianPrompt.sidebar';
const SIDEBAR_CONTAINER_ID = 'webianPrompt';
const DEFAULT_SEND_COMMAND = 'tencentcloud.codingcopilot.sendToChat';

function readBridgeConfig(): BridgeConfig {
    const config = vscode.workspace.getConfiguration('webianPrompt');
    const mode = config.get<ChatMode>('codebuddy.mode', 'craft');
    return {
        sendCommand: config.get<string>('codebuddy.sendCommand', DEFAULT_SEND_COMMAND) || DEFAULT_SEND_COMMAND,
        mode,
        autoSend: config.get<boolean>('codebuddy.autoSend', true),
        fallbackToClipboard: config.get<boolean>('codebuddy.fallbackToClipboard', true),
    };
}

/** 状态栏提示比弹窗更轻量，错误才升级为弹窗 */
function notify(level: 'info' | 'warn' | 'error', message: string): void {
    if (level === 'error') {
        void vscode.window.showErrorMessage(message);
        return;
    }
    vscode.window.setStatusBarMessage(`微边提示词：${message}`, 4000);
}

async function revealSidebar(): Promise<void> {
    await vscode.commands.executeCommand(`workbench.view.extension.${SIDEBAR_CONTAINER_ID}`);
    try {
        await vscode.commands.executeCommand(`${SIDEBAR_VIEW_ID}.focus`);
    } catch {
        // 视图尚未渲染时 focus 会失败，此时容器已展开，忽略即可
    }
}

export function activate(context: vscode.ExtensionContext): void {
    const store = new PromptStore(context.globalState);
    const bridge = new CodeBuddyBridge(readBridgeConfig);
    const provider = new PromptSidebarProvider(context.extensionUri, store, bridge);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, provider, {
            webviewOptions: { retainContextWhenHidden: true },
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('webianPrompt.openSidebar', async () => {
            await revealSidebar();
            await provider.refresh();
        }),
        vscode.commands.registerCommand('webianPrompt.newPrompt', async () => {
            await revealSidebar();
            await provider.openEditorForNew();
        }),
        vscode.commands.registerCommand('webianPrompt.resetPrompts', async () => {
            const confirmed = await vscode.window.showWarningMessage(
                '恢复默认提示词会删除全部自定义模板，是否继续？',
                { modal: true },
                '恢复默认',
            );
            if (confirmed !== '恢复默认') {
                return;
            }
            await store.reset();
            await provider.refresh();
            notify('info', '已恢复默认提示词。');
        }),
    );

    registerContextActions(context, bridge, notify);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('webianPrompt')) {
                void provider.refresh();
            }
        }),
    );
}

export function deactivate(): void {
    // 无需清理：所有一次性资源均已登记到 context.subscriptions
}
