/**
 * 发送提示词并把结果转成用户可读反馈的公共编排。
 * 面板条目点击与右键「快捷命令」菜单共用同一段判断：failed 报错误、sent 报成功、copied 报警告，
 * 各入口只注入自己的提示通道，不再各写一遍 outcome 分支。
 * 注意：提示通道必须由调用方注入——面板用 Webview toast、命令面板用状态栏与弹窗，
 * 统一到单一通道会改变交互形态，因此这里只统一编排，不统一呈现。
 */
import type { CodeBuddyBridge, SendResult } from './CodeBuddyBridge'
import type { ChatMode } from '../../shared/types'
import type { Notify } from '../common/notify'

export async function dispatchPrompt(
    bridge: CodeBuddyBridge,
    prompt: string,
    mode: ChatMode | undefined,
    notify: Notify,
): Promise<SendResult> {
    const result = await bridge.send(prompt, mode)
    if (result.outcome === 'failed') {
        notify('error', result.detail)
        return result
    }
    notify(result.outcome === 'sent' ? 'info' : 'warn', result.detail)
    return result
}
