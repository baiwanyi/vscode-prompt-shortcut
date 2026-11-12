/**
 * 工具命令的注册入口：把清单逐条挂到扩展上下文与命令面板。
 * 执行编排在 runToolAction，元数据在 toolActions，本文件只保留「清单 → 命令」的遍历注册。
 * 注意：处理器必须显式兜底——runToolAction 自身已捕获转发失败，
 * 但注册期之外的意外异常会变成未处理的拒绝，用户只会看到 VS Code 原生的 command failed。
 */
import * as vscode from 'vscode'
import { runToolAction } from './runToolAction'
import { TOOL_ACTIONS } from './toolActions'
import type { Notify } from '../common/notify'
import { describeError } from '../../shared/errors'

export function registerToolActions(context: vscode.ExtensionContext, notify: Notify): void {
    for (const entry of TOOL_ACTIONS) {
        context.subscriptions.push(
            vscode.commands.registerCommand(entry.command, () => {
                void runToolAction(entry, notify).catch((error: unknown) => {
                    notify('error', `工具命令执行失败：${describeError(error)}`)
                })
            }),
        )
    }
}
