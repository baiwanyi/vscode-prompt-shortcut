/**
 * 右键「微边代码」子菜单的注册入口：把动作清单逐条挂到扩展上下文。
 * 目标解析与描述在 targetFile、执行编排在 runContextAction、动作元数据在 actionRegistry，
 * 本文件只保留「清单 → 命令」的遍历注册与异常出口。
 * 注意：命令处理器必须显式 catch——dispatchPrompt 抛错会变成未处理的拒绝，
 * 用户只会看到 VS Code 原生的 command failed，而不是这里约定的可读提示。
 */
import * as vscode from 'vscode'
import { CONTEXT_ACTIONS } from './actionRegistry'
import { runContextAction } from './runContextAction'
import type { CodeBuddyBridge } from '../codebuddy/CodeBuddyBridge'
import type { Notify } from '../common/notify'
import { describeError } from '../../shared/errors'

export function registerContextActions(
    context: vscode.ExtensionContext,
    bridge: CodeBuddyBridge,
    notify: Notify,
): void {
    for (const entry of CONTEXT_ACTIONS) {
        context.subscriptions.push(
            vscode.commands.registerCommand(entry.command, (uri?: vscode.Uri) => {
                void runContextAction(bridge, notify, entry, uri).catch((error: unknown) => {
                    notify('error', `动作执行失败：${describeError(error)}`)
                })
            }),
        )
    }
}
