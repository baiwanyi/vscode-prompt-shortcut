/**
 * 侧边栏 Webview 提供者：承载提示词面板的全部交互。
 * 采用「宿主持有状态、Webview 无状态渲染」的模式：Webview 只发意图，宿主完成校验与持久化后
 * 再回推完整状态，避免两侧状态不一致；CSP 使用 nonce 白名单，仅允许加载 dist/webview 下的资源。
 * 注意：Webview 消息一律视为不可信输入，模板正文与 id 需在宿主侧重新校验后再落盘。
 */
import * as vscode from 'vscode';
import type { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/messages';
import type { PromptDraft, PromptStatePayload } from '../../shared/types';
import type { CodeBuddyBridge } from '../codebuddy/CodeBuddyBridge';
import type { PromptStore } from '../prompt/PromptStore';

const MAX_LABEL_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 120;
const MAX_PROMPT_LENGTH = 8000;

function createNonce(): string {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 校验 Webview 提交的草稿，返回错误信息数组（空数组表示通过） */
function validateDraft(draft: PromptDraft): string[] {
    const errors: string[] = [];
    if (!draft.label.trim()) {
        errors.push('名称不能为空');
    } else if (draft.label.length > MAX_LABEL_LENGTH) {
        errors.push(`名称不能超过 ${MAX_LABEL_LENGTH} 个字符`);
    }
    if (!draft.prompt.trim()) {
        errors.push('提示词正文不能为空');
    } else if (draft.prompt.length > MAX_PROMPT_LENGTH) {
        errors.push(`提示词正文不能超过 ${MAX_PROMPT_LENGTH} 个字符`);
    }
    if (draft.description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push(`说明不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`);
    }
    return errors;
}

export class PromptSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'webianPrompt.sidebar';

    private view: vscode.WebviewView | undefined;

    /** 视图尚未渲染时需要延后打开的新建编辑器标记 */
    private pendingNewEditor = false;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly store: PromptStore,
        private readonly bridge: CodeBuddyBridge,
    ) {}

    resolveWebviewView(view: vscode.WebviewView): void {
        this.view = view;
        const webviewRoot = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview');
        view.webview.options = {
            enableScripts: true,
            localResourceRoots: [webviewRoot],
        };
        view.webview.html = this.buildHtml(view.webview);
        view.webview.onDidReceiveMessage((message: WebviewToHostMessage) => {
            void this.handleMessage(message);
        });
        view.onDidDispose(() => {
            this.view = undefined;
        });
    }

    /** 让 Webview 打开编辑器并新建模板；视图未就绪时先登记，等 ready 消息到达后补发 */
    async openEditorForNew(): Promise<void> {
        if (!this.view) {
            this.pendingNewEditor = true;
            return;
        }
        await this.pushMessage({ type: 'editPrompt', payload: {} });
    }

    /** 通知 Webview 刷新（重置等操作后） */
    async refresh(): Promise<void> {
        await this.pushState();
    }

    private async handleMessage(message: WebviewToHostMessage): Promise<void> {
        switch (message.type) {
            case 'ready': {
                await this.pushState();
                if (this.pendingNewEditor) {
                    this.pendingNewEditor = false;
                    await this.pushMessage({ type: 'editPrompt', payload: {} });
                }
                break;
            }
            case 'requestState': {
                await this.pushState();
                break;
            }
            case 'runPrompt': {
                await this.runPromptById(message.id);
                break;
            }
            case 'copyPrompt': {
                const target = this.store.getAll().find((item) => item.id === message.id);
                if (!target) {
                    await this.notify('warn', '提示词不存在或已被删除。');
                    break;
                }
                await vscode.env.clipboard.writeText(target.prompt);
                await this.notify('info', `已复制「${target.label}」的提示词。`);
                break;
            }
            case 'savePrompt': {
                const errors = validateDraft(message.draft);
                if (errors.length > 0) {
                    await this.notify('error', errors.join('；'));
                    break;
                }
                await this.store.save(message.draft);
                await this.pushState();
                await this.notify('info', message.draft.id ? '提示词已更新。' : '提示词已创建。');
                break;
            }
            case 'deletePrompt': {
                const list = this.store.getAll();
                const target = list.find((item) => item.id === message.id);
                if (!target) {
                    await this.notify('warn', '提示词不存在或已被删除。');
                    break;
                }
                if (target.builtin) {
                    await this.notify('warn', '内置提示词不可删除，可编辑其正文后使用。');
                    break;
                }
                await this.store.remove(message.id);
                await this.pushState();
                await this.notify('info', `已删除「${target.label}」。`);
                break;
            }
            case 'movePrompt': {
                await this.store.move(message.id, message.direction);
                await this.pushState();
                break;
            }
            case 'resetDefaults': {
                await this.store.reset();
                await this.pushState();
                await this.notify('info', '已恢复默认提示词。');
                break;
            }
            default: {
                const exhaustive: never = message;
                throw new Error(`未处理的消息类型：${JSON.stringify(exhaustive)}`);
            }
        }
    }

    private async runPromptById(id: string): Promise<void> {
        const target = this.store.getAll().find((item) => item.id === id);
        if (!target) {
            await this.notify('warn', '提示词不存在或已被删除。');
            return;
        }
        await this.dispatch(target.prompt, target.mode);
    }

    private async dispatch(prompt: string, mode?: PromptDraft['mode']): Promise<void> {
        const result = await this.bridge.send(prompt, mode);
        if (result.outcome === 'failed') {
            await this.notify('error', result.detail);
            return;
        }
        await this.notify(result.outcome === 'sent' ? 'info' : 'warn', result.detail);
    }

    private async pushState(): Promise<void> {
        const payload: PromptStatePayload = {
            prompts: this.store.getAll(),
            codebuddy: {
                detected: await this.bridge.isSendCommandAvailable(),
                commandId: vscode.workspace.getConfiguration('webianPrompt').get<string>('codebuddy.sendCommand', ''),
                autoSend: vscode.workspace.getConfiguration('webianPrompt').get<boolean>('codebuddy.autoSend', true),
            },
        };
        await this.pushMessage({ type: 'state', payload });
    }

    private async notify(level: 'info' | 'warn' | 'error', message: string): Promise<void> {
        await this.pushMessage({ type: 'notify', level, message });
    }

    private async pushMessage(message: HostToWebviewMessage): Promise<void> {
        if (!this.view) {
            return;
        }
        await this.view.webview.postMessage(message);
    }

    private buildHtml(webview: vscode.Webview): string {
        const nonce = createNonce();
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'app.js'),
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'app.css'),
        );
        const csp = [
            "default-src 'none'",
            `img-src ${webview.cspSource} https: data:`,
            `font-src ${webview.cspSource}`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `script-src 'nonce-${nonce}'`,
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <link rel="stylesheet" href="${styleUri.toString()}" />
    <title>微边提示词</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
    }
}
