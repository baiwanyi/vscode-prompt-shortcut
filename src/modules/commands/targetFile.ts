/**
 * 右键动作的目标文件解析与描述：回答「这次操作针对哪个文件的哪几行、该怎样表述」。
 * 菜单 Uri 优先于活动编辑器，保证资源管理器右键与编辑器右键都能命中目标；
 * 路径只用工作区相对路径（远程/容器场景下绝对路径会失效），不在工作区时回退为文件名。
 * 注意：行号一律 1 基，0 基到 1 基的转换只允许发生在 toLineRange 内，别处不得再对 line 做 +1。
 */
import * as vscode from 'vscode'

export interface TargetFile {
    uri: vscode.Uri
    /** 1 基起始行，无选区时为 undefined */
    startLine?: number
    /** 1 基结束行，无选区时为 undefined */
    endLine?: number
}

/** 选区非空时给出 1 基行号区间；空选区返回 undefined */
function toLineRange(selection: vscode.Selection): Pick<TargetFile, 'startLine' | 'endLine'> | undefined {
    if (selection.isEmpty) {
        return undefined
    }
    return {
        startLine: selection.start.line + 1,
        endLine: selection.end.line + 1,
    }
}

/** 解析本次操作的目标：菜单 Uri 优先，其次活动编辑器；两者都没有时返回 undefined */
export function resolveTargetFile(uri?: vscode.Uri): TargetFile | undefined {
    const editor = vscode.window.activeTextEditor
    const fileUri = uri?.scheme === 'file' ? uri : editor?.document.uri
    if (!fileUri) {
        return undefined
    }
    // 行号只在「选区所属文件正是目标文件」时成立，否则一律按整文件描述
    const isSelectionOwner = editor !== undefined && editor.document.uri.toString() === fileUri.toString()
    const range = isSelectionOwner ? toLineRange(editor.selection) : undefined
    return range ? { uri: fileUri, ...range } : { uri: fileUri }
}

/** 工作区相对路径；不在工作区时回退为文件名 */
function toDisplayPath(uri: vscode.Uri): string {
    if (vscode.workspace.getWorkspaceFolder(uri)) {
        return vscode.workspace.asRelativePath(uri, false)
    }
    const baseName = uri.path.split('/').pop()
    return baseName ? baseName : uri.fsPath
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
