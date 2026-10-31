/**
 * 编辑器右键「微边代码」菜单的执行逻辑。
 * 统一把「当前文件 + 选区行号」拼成 CodeBuddy 的斜杠命令文本（/fix、/cr），再交给桥接层发送；
 * 参数来源优先级为：菜单传入的 Uri > 活动编辑器，确保资源管理器右键与编辑器右键都能命中目标。
 * 注意：路径必须用工作区相对路径，绝对路径在远程/容器场景下会失效；无工作区时回退为文件 basename。
 */
import * as vscode from 'vscode';
import type { CodeBuddyBridge } from '../codebuddy/CodeBuddyBridge';

/** 修复命令，对应 CodeBuddy 的 /fix 斜杠指令 */
const FIX_COMMAND = '/fix';
/** 审查命令，对应 CodeBuddy 的 /cr 斜杠指令 */
const REVIEW_COMMAND = '/cr';

interface TargetFile {
    uri: vscode.Uri;
    /** 1 基起始行，无选区时为 undefined */
    startLine?: number;
    /** 1 基结束行，无选区时为 undefined */
    endLine?: number;
}

function resolveTarget(uri?: vscode.Uri): TargetFile | undefined {
    const editor = vscode.window.activeTextEditor;

    if (uri && uri.scheme === 'file') {
        const isActiveDocument = editor?.document.uri.toString() === uri.toString();
        if (isActiveDocument && editor && !editor.selection.isEmpty) {
            return {
                uri,
                startLine: editor.selection.start.line + 1,
                endLine: editor.selection.end.line + 1,
            };
        }
        return { uri };
    }

    if (!editor) {
        return undefined;
    }
    const target: TargetFile = { uri: editor.document.uri };
    if (!editor.selection.isEmpty) {
        target.startLine = editor.selection.start.line + 1;
        target.endLine = editor.selection.end.line + 1;
    }
    return target;
}

function toDisplayPath(uri: vscode.Uri): string {
    if (vscode.workspace.getWorkspaceFolder(uri)) {
        return vscode.workspace.asRelativePath(uri, false);
    }
    return uri.path.split('/').pop() ?? uri.fsPath;
}

/** 拼装形如 `/fix src/a.ts (第 12-30 行)` 的指令文本 */
export function buildSlashPrompt(slashCommand: string, target: TargetFile): string {
    const path = toDisplayPath(target.uri);
    if (target.startLine === undefined || target.endLine === undefined) {
        return `${slashCommand} ${path}`;
    }
    const range = target.startLine === target.endLine ? `第 ${target.startLine} 行` : `第 ${target.startLine}-${target.endLine} 行`;
    return `${slashCommand} ${path}（${range}）`;
}

export function registerContextActions(
    context: vscode.ExtensionContext,
    bridge: CodeBuddyBridge,
    notify: (level: 'info' | 'warn' | 'error', message: string) => void,
): void {
    const run = async (slashCommand: string, uri?: vscode.Uri): Promise<void> => {
        const target = resolveTarget(uri);
        if (!target) {
            await vscode.window.showWarningMessage('请先打开一个文件，再使用「微边代码」菜单。');
            return;
        }
        const prompt = buildSlashPrompt(slashCommand, target);
        const result = await bridge.send(prompt);
        if (result.outcome === 'failed') {
            await vscode.window.showErrorMessage(result.detail);
            return;
        }
        notify(result.outcome === 'sent' ? 'info' : 'warn', result.detail);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('webianPrompt.fixWithCodeBuddy', (uri?: vscode.Uri) => run(FIX_COMMAND, uri)),
        vscode.commands.registerCommand('webianPrompt.reviewWithCodeBuddy', (uri?: vscode.Uri) => run(REVIEW_COMMAND, uri)),
    );
}
