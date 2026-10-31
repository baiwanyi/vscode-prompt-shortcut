/**
 * 右键「微边代码」子菜单五个动作的执行逻辑：修复、审查、优化、规范、重构。
 * 提示词完全内置在本扩展（见 prompt/actions），不依赖 CodeBuddy 的 /fix、/cr 斜杠指令与内置修复命令，
 * 避免对方实现缺失或版本变更后命令失效；这里只负责把「当前文件 + 选区行号」描述成目标文本。
 * 参数来源优先级为：菜单传入的 Uri > 活动编辑器，确保资源管理器右键与编辑器右键都能命中目标。
 * 注意：路径必须用工作区相对路径，绝对路径在远程/容器场景下会失效；无工作区时回退为文件 basename。
 */
import * as vscode from 'vscode'
import type { ChatMode } from '../../shared/types'
import type { CodeBuddyBridge } from '../codebuddy/CodeBuddyBridge'
import type { ActionPromptBuilder } from '../prompt/actions'
import {
    createFixPrompt,
    createOptimizePrompt,
    createRefactorPrompt,
    createReviewPrompt,
    createStylePrompt,
} from '../prompt/actions'

interface TargetFile {
    uri: vscode.Uri
    /** 1 基起始行，无选区时为 undefined */
    startLine?: number
    /** 1 基结束行，无选区时为 undefined */
    endLine?: number
}

function resolveTarget(uri?: vscode.Uri): TargetFile | undefined {
    const editor = vscode.window.activeTextEditor

    if (uri && uri.scheme === 'file') {
        const isActiveDocument = editor?.document.uri.toString() === uri.toString()
        if (isActiveDocument && editor && !editor.selection.isEmpty) {
            return {
                uri,
                startLine: editor.selection.start.line + 1,
                endLine: editor.selection.end.line + 1,
            }
        }
        return { uri }
    }

    if (!editor) {
        return undefined
    }
    const target: TargetFile = { uri: editor.document.uri }
    if (!editor.selection.isEmpty) {
        target.startLine = editor.selection.start.line + 1
        target.endLine = editor.selection.end.line + 1
    }
    return target
}

function toDisplayPath(uri: vscode.Uri): string {
    if (vscode.workspace.getWorkspaceFolder(uri)) {
        return vscode.workspace.asRelativePath(uri, false)
    }
    return uri.path.split('/').pop() ?? uri.fsPath
}

/** 拼装形如 `src/a.ts（第 12-30 行）` 的目标描述，整文件时标记「整个文件」 */
export function describeTarget(target: TargetFile): string {
    const path = toDisplayPath(target.uri)
    if (target.startLine === undefined || target.endLine === undefined) {
        return `${path}（整个文件）`
    }
    const range =
        target.startLine === target.endLine
            ? `第 ${target.startLine} 行`
            : `第 ${target.startLine}-${target.endLine} 行`
    return `${path}（${range}）`
}

export function registerContextActions(
    context: vscode.ExtensionContext,
    bridge: CodeBuddyBridge,
    notify: (level: 'info' | 'warn' | 'error', message: string) => void,
): void {
    const run = async (buildPrompt: ActionPromptBuilder, uri?: vscode.Uri, mode?: ChatMode): Promise<void> => {
        const target = resolveTarget(uri)
        if (!target) {
            await vscode.window.showWarningMessage('请先打开一个文件，再使用「微边代码」菜单。')
            return
        }
        const prompt = buildPrompt(describeTarget(target))
        const result = await bridge.send(prompt, mode)
        if (result.outcome === 'failed') {
            await vscode.window.showErrorMessage(result.detail)
            return
        }
        notify(result.outcome === 'sent' ? 'info' : 'warn', result.detail)
    }

    const register = (command: string, buildPrompt: ActionPromptBuilder, mode?: ChatMode): void => {
        context.subscriptions.push(
            vscode.commands.registerCommand(command, (uri?: vscode.Uri) => run(buildPrompt, uri, mode)),
        )
    }

    register('webianPrompt.fixWithCodeBuddy', createFixPrompt)
    register('webianPrompt.reviewWithCodeBuddy', createReviewPrompt, 'ask')
    register('webianPrompt.optimizeWithCodeBuddy', createOptimizePrompt)
    register('webianPrompt.styleWithCodeBuddy', createStylePrompt)
    register('webianPrompt.refactorWithCodeBuddy', createRefactorPrompt, 'ask')
}
