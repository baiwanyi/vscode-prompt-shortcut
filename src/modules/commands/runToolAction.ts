/**
 * 工具命令执行编排：面板工具条与命令面板两条入口都收敛到这里转发。
 * 只做「转发 + 结果反馈」，不预检目标命令是否存在——VS Code 的命令注册是惰性的，
 * 提前查询会在目标扩展尚未激活时误报未安装，统一以 executeCommand 抛错为准。
 * 注意：窗口重载会先销毁宿主、Promise 永不 resolve，必须脱手执行后立刻返回，
 * 否则调用方会一直挂在 await 上；失败提示走调用方注入的通道，保证用户知道该装哪个扩展。
 */
import * as vscode from 'vscode'
import type { ToolActionEntry } from './toolActions'
import type { Notify } from '../common/notify'

export async function runToolAction(entry: ToolActionEntry, notify: Notify): Promise<void> {
    if (entry.isDetached) {
        // 重载成功后宿主已不存在，重载本身的界面反馈足够，不再补成功提示
        void vscode.commands.executeCommand(entry.delegate).then(undefined, (): void => {
            notify('error', entry.missingHint)
        })
        return
    }
    try {
        await vscode.commands.executeCommand(entry.delegate)
    } catch {
        notify('error', entry.missingHint)
        return
    }
    notify('info', `已执行「${entry.label}」。`)
}
