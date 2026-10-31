/**
 * CodeBuddy 命令的单次调用契约：参数形状与返回结构全部收在这里。
 * 三个命令都属于对方扩展的内部实现，最易随版本漂移，隔离后升级只需改本文件；
 * 本模块不重试、不聚焦视图、不写日志，只把一次调用翻译成明确的结果形态。
 * 注意：必须区分「被拒绝」与「抛异常」——前者是会话失效（重试无意义），后者是 rpc 未就绪（值得重试）。
 */
import * as vscode from 'vscode'
import type { ChatMode } from '../../shared/types'
import { describeError } from '../../shared/errors'
import { isRecord } from '../../shared/guards'

/** 单次调用结果：ok 表示已交出，rejected 表示对方明确拒绝，error 表示通道本身出错 */
export type ChatCallOutcome = { type: 'ok' } | { type: 'rejected'; reason: string } | { type: 'error'; reason: string }

/** 会话读取结果：ID 为空时 issue 说明原因，由调用方决定是否写日志 */
export interface ConversationReadResult {
    conversationId: string
    /** 读取失败的原因；成功或对方返回值不含会话时为默认空串 */
    issue: string
}

/** 对方拒绝时可能是字符串，也可能是结构化对象，统一交给 describeError 兜住循环引用等不可序列化输入 */
function formatRejection(rejection: unknown): string {
    return typeof rejection === 'string' ? rejection : describeError(rejection)
}

/** 单次调用当前会话通道：`{ error }` 视为拒绝，抛出视为可重试的通道错误 */
export async function callCurrentChatOnce(
    command: string,
    prompt: string,
    mode: ChatMode,
    conversationId: string,
): Promise<ChatCallOutcome> {
    const options = conversationId ? { mode, conversationId } : { mode }
    try {
        const result: unknown = await vscode.commands.executeCommand(command, { message: prompt, options })
        const rejection = isRecord(result) ? result.error : undefined
        if (rejection !== undefined && rejection !== null) {
            return { type: 'rejected', reason: formatRejection(rejection) }
        }
        return { type: 'ok' }
    } catch (error) {
        return { type: 'error', reason: describeError(error) }
    }
}

/** 单次调用新建会话通道：该命令固定 `newConversation: true`，参数为 `{ prompt, mode }` */
export async function callNewChatOnce(command: string, prompt: string, mode: ChatMode): Promise<ChatCallOutcome> {
    try {
        await vscode.commands.executeCommand(command, { prompt, mode })
        return { type: 'ok' }
    } catch (error) {
        return { type: 'error', reason: describeError(error) }
    }
}

/**
 * 读取 CodeBuddy 当前会话 ID。
 * `getContext` 是对方暴露的只读通道（不传 ensureConversation 时不会新建会话）；
 * 命令缺失会以异常形式返回，这里统一转成 issue，读不到会话本身不算失败（issue 为空串）。
 */
export async function readConversationId(contextCommand: string): Promise<ConversationReadResult> {
    try {
        const raw: unknown = await vscode.commands.executeCommand(contextCommand)
        if (!isRecord(raw) || typeof raw.conversationId !== 'string') {
            return { conversationId: '', issue: '' }
        }
        return { conversationId: raw.conversationId, issue: '' }
    } catch (error) {
        return { conversationId: '', issue: `读取当前会话失败：${describeError(error)}` }
    }
}
