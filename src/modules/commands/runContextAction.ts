/**
 * 右键动作的执行编排：解析目标 → 拼提示词 → 交给统一的发送编排。
 * 提示通道由调用方注入（命令面板用状态栏、错误升级为弹窗），本模块不感知呈现形态；
 * 暴露为独立函数而非命令闭包，命令面板等其他入口可复用同一段编排。
 * 注意：无目标文件时用弹窗而非状态栏——右键后需要持久可见的反馈，状态栏一闪而过看不到。
 */
import * as vscode from 'vscode'
import { describeTarget, resolveTargetFile } from './targetFile'
import type { ContextActionEntry } from './actionRegistry'
import type { CodeBuddyBridge } from '../codebuddy/CodeBuddyBridge'
import type { Notify } from '../common/notify'
import { dispatchPrompt } from '../codebuddy/dispatchPrompt'

/** 执行一次右键动作；无目标文件时给出明确提示而不是静默返回 */
export async function runContextAction(
    bridge: CodeBuddyBridge,
    notify: Notify,
    entry: ContextActionEntry,
    uri?: vscode.Uri,
): Promise<void> {
    const target = resolveTargetFile(uri)
    if (!target) {
        await vscode.window.showWarningMessage('请先打开一个文件，再使用「微边代码」菜单。')
        return
    }
    await dispatchPrompt(bridge, entry.buildPrompt(describeTarget(target)), entry.mode, notify)
}
