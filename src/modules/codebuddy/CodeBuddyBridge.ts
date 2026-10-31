/**
 * CodeBuddy 扩展的桥接层，负责把提示词送进 CodeBuddy 对话框。
 * 主通道是 `tencentcloud.codingcopilot.chat.sendMessage`：它把 action 交给聊天页但不带
 * `newConversation` 参数，因此不会新开标签；决定是否复用会话的是 `options.conversationId`——
 * 该值由 `getContext` 读出后显式传入，缺省时聊天页在视图未加载的情况下会自己新建会话。
 * 命令依赖活动栏聊天视图的 rpc，视图尚未加载时会抛 `Chat webview is not ready`，故失败后
 * 重新聚焦视图并有限重试；仍失败才回退 `tencentcloud.codingcopilot.sendToChat`
 * （其内部写死 `options.newChat` 与 `newConversation: true`，必然新建会话），最后降级为写剪贴板。
 * 三个命令都未在 CodeBuddy 的 contributes.commands 中声明，扩展未激活时并不存在，
 * 因此执行前必须先 focus 聊天视图触发激活，再轮询等待命令注册完成。
 * 注意：命令 ID 与参数签名属于对方扩展的内部实现，版本升级可能变动，必须允许通过配置覆盖。
 */
import * as vscode from 'vscode'
import { callCurrentChatOnce, callNewChatOnce, readConversationId } from './chatCommandChannel'
import { CHAT_CONTAINER_VIEW_ID, CHAT_VIEW_ID, CONTEXT_COMMAND } from './config'
import type { BridgeConfig } from './config'
import type { ChatMode, CodeBuddyStatus, SendOutcome } from '../../shared/types'
import type { Reporter } from '../common/createReporter'
import { createReporter } from '../common/createReporter'

/** 激活到命令可用的等待上限：实测 2-3s，慢机器更久，故给到 10s 再考虑降级 */
const ACTIVATION_TIMEOUT_MS = 10000
const ACTIVATION_POLL_INTERVAL_MS = 250

/** 复用当前会话的重试参数：聊天视图刚激活时其 rpc 通道可能尚未就绪 */
const CURRENT_CHAT_ATTEMPTS = 3
const CURRENT_CHAT_RETRY_INTERVAL_MS = 500

export interface SendResult {
    outcome: SendOutcome
    detail: string
}

/** 单条命令的执行结果：失败原因要能串进最终提示，避免用户只看到一句「失败」 */
interface CommandAttempt {
    isOk: boolean
    detail: string
}

/** 复用当前会话的尝试结果：成功即终态，失败只带回原因供调用方汇总 */
type ReuseOutcome = { type: 'sent'; result: SendResult } | { type: 'failed'; reason: string }

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

export class CodeBuddyBridge {
    private readonly reporter: Reporter

    constructor(
        private readonly readConfig: () => BridgeConfig,
        registerDisposable: (disposable: vscode.Disposable) => void,
    ) {
        this.reporter = createReporter('微边提示词', registerDisposable)
    }

    /**
     * 排障日志：只在降级与失败路径写入，正常发送不产生输出——会话 ID 等内部标识不进面板，
     * 用户需要的成功/失败结论已由 SendResult.detail 给出。
     */
    private report(message: string): void {
        this.reporter(`[CodeBuddy] ${message}`)
    }

    /**
     * 探测并返回实际可用的发送通道：按配置顺序取第一个已注册的命令，全部缺失时返回空串。
     * 返回值只服务可用性判断与轮询调度，不进入展示层——命令 ID 属对方扩展的内部细节。
     */
    async findAvailableCommand(): Promise<string> {
        const config = this.readConfig()
        const commands = await vscode.commands.getCommands(true)
        return this.activeCommands(config).find((id) => commands.includes(id)) ?? ''
    }

    /**
     * 探测是否还有可用的发送通道。
     * 只按当前配置参与的命令判断：关闭复用后若只剩新建通道可用，也应当算「已连接」。
     */
    async isSendCommandAvailable(): Promise<boolean> {
        return (await this.findAvailableCommand()) !== ''
    }

    /**
     * 面板展示所需的状态聚合：可用性与 autoSend 都取自同一份配置，调用方无需再直接读配置键。
     * detected 由调用方探测后传入（见 findAvailableCommand），避免这里再跑一次 getCommands。
     */
    getStatus(detected: boolean): CodeBuddyStatus {
        const config = this.readConfig()
        return { detected, autoSend: config.autoSend }
    }

    /**
     * 打开并聚焦 CodeBuddy 聊天视图，同时触发其扩展激活。
     * 两级降级均失败说明 CodeBuddy 未安装，此处不抛错，交由调用方的可用性轮询给出结论。
     */
    async focusChatView(): Promise<void> {
        try {
            await vscode.commands.executeCommand(`${CHAT_VIEW_ID}.focus`)
        } catch {
            try {
                await vscode.commands.executeCommand(CHAT_CONTAINER_VIEW_ID)
            } catch {
                return
            }
        }
    }

    /** 轮询等待命令注册完成，避免用固定 sleep 猜激活耗时 */
    async waitForSendCommand(timeoutMs: number): Promise<boolean> {
        const deadline = Date.now() + timeoutMs
        for (;;) {
            if (await this.isSendCommandAvailable()) {
                return true
            }
            if (Date.now() >= deadline) {
                return false
            }
            await delay(ACTIVATION_POLL_INTERVAL_MS)
        }
    }

    /**
     * 把提示词发送到 CodeBuddy。
     * 顺序：确保扩展激活 -> 在当前会话发送 -> 回退新建会话 -> 回退剪贴板。
     * 只有回退发生时详情里才带原因，正常复用会话不给用户多余噪音。
     */
    async send(prompt: string, overrideMode?: ChatMode): Promise<SendResult> {
        const config = this.readConfig()

        if (!config.autoSend) {
            return this.copyOnlyResult(prompt)
        }

        // 只在真正要发送时才解析模式：仅复制路径不经过任何命令，提前求值属于无效计算
        const mode = overrideMode ?? config.mode

        // 未激活时两个命令都不存在：先 focus 触发激活，再轮询等待其注册完成
        if (!(await this.isSendCommandAvailable())) {
            await this.focusChatView()
            await this.waitForSendCommand(ACTIVATION_TIMEOUT_MS)
        }

        const failures: string[] = []

        if (config.reuseConversation) {
            const reuse = await this.tryReuseConversation(config, prompt, mode)
            if (reuse.type === 'sent') {
                return reuse.result
            }
            failures.push(reuse.reason)
        }

        const newChat = await this.sendToNewChat(config.newChatCommand, prompt, mode)
        if (newChat.isOk) {
            this.report('已回退到新建会话发送。')
            return {
                outcome: 'sent',
                detail: config.reuseConversation
                    ? '当前对话不可用，已在 CodeBuddy 新建对话并发送。'
                    : '已在 CodeBuddy 新建对话并发送。',
            }
        }
        failures.push(newChat.detail)

        if (config.fallbackToClipboard) {
            return this.copyAsFallback(prompt, failures)
        }

        return {
            outcome: 'failed',
            detail: `发送到 CodeBuddy 失败（${failures.join('；')}）。请在设置中调整 webianPrompt.codebuddy.sendCommand / newChatCommand。`,
        }
    }

    /** 只复制不发送（autoSend 关闭）：剪贴板不可用时给可读结论，而不是抛给命令调用方 */
    private async copyOnlyResult(prompt: string): Promise<SendResult> {
        if (!(await this.copyAndFocus(prompt))) {
            return { outcome: 'failed', detail: '复制到剪贴板失败，请从提示词卡片手动复制后发送。' }
        }
        return {
            outcome: 'copied',
            detail: '已复制提示词并打开 CodeBuddy 对话框，按 Ctrl+V 后回车发送。',
        }
    }

    /**
     * 复用当前会话的一次尝试：成功即终态，失败只带回原因，由 send 汇总进最终提示。
     * 读不到会话 ID 时聊天页会自行决定落点，成功文案不能笼统宣称「已发送到当前对话」。
     */
    private async tryReuseConversation(config: BridgeConfig, prompt: string, mode: ChatMode): Promise<ReuseOutcome> {
        const read = await readConversationId(CONTEXT_COMMAND)
        if (read.issue) {
            this.report(read.issue)
        }
        const conversationId = read.conversationId
        const reuse = await this.sendToCurrentChat(config.sendCommand, prompt, mode, conversationId)
        if (reuse.isOk) {
            return {
                type: 'sent',
                result: {
                    outcome: 'sent',
                    detail: conversationId
                        ? '已发送到 CodeBuddy 当前对话。'
                        : '已在 CodeBuddy 发送；未读到当前会话，落点由 CodeBuddy 决定。',
                },
            }
        }
        this.report(`复用失败：${reuse.detail}`)
        return { type: 'failed', reason: reuse.detail }
    }

    /** 最后的剪贴板降级：写入失败时不能报「已复制」，必须把真实结论交给用户 */
    private async copyAsFallback(prompt: string, failures: string[]): Promise<SendResult> {
        if (!(await this.copyAndFocus(prompt))) {
            return {
                outcome: 'failed',
                detail: `发送到 CodeBuddy 失败，且无法写入剪贴板（${failures.join('；')}）。`,
            }
        }
        return {
            outcome: 'copied',
            detail: `未找到可用的 CodeBuddy 发送命令，已复制提示词并打开对话框，按 Ctrl+V 后回车发送。（${failures.join('；')}）`,
        }
    }

    /**
     * 在当前会话发送。
     * conversationId 是复用的关键：聊天页拿不到目标会话时会在视图未加载的情况下自行新建，
     * 只有显式传入才会把消息送回原会话；读不到 ID 时退化为「不指定会话」，由聊天页决定落点。
     * rpc 通道未就绪会立刻抛错，此时先重新聚焦聊天视图再重试；全部失败才判定为不可用。
     */
    private async sendToCurrentChat(
        command: string,
        prompt: string,
        mode: ChatMode,
        conversationId: string,
    ): Promise<CommandAttempt> {
        if (!(await this.hasCommand(command))) {
            return { isOk: false, detail: `未找到复用当前对话的命令「${command}」` }
        }
        let lastError = ''
        for (let index = 0; index < CURRENT_CHAT_ATTEMPTS; index += 1) {
            const outcome = await callCurrentChatOnce(command, prompt, mode, conversationId)
            if (outcome.type === 'ok') {
                return { isOk: true, detail: '' }
            }
            // 被拒绝说明会话已失效，重试没有意义，直接进入新建会话的回退链路
            if (outcome.type === 'rejected') {
                return { isOk: false, detail: `复用当前对话被拒绝：${outcome.reason}` }
            }
            lastError = outcome.reason
            // focus 是下一次重试的前置动作：最后一次失败后不再抢占用户焦点
            if (index < CURRENT_CHAT_ATTEMPTS - 1) {
                await this.focusChatView()
                await delay(CURRENT_CHAT_RETRY_INTERVAL_MS)
            }
        }
        return { isOk: false, detail: `复用当前对话失败：${lastError}` }
    }

    /** 新建会话发送：命令固定 `newConversation: true`，参数形状与错误翻译都在 channel 内 */
    private async sendToNewChat(command: string, prompt: string, mode: ChatMode): Promise<CommandAttempt> {
        if (!(await this.hasCommand(command))) {
            return { isOk: false, detail: `未找到新建对话的命令「${command}」` }
        }
        const outcome = await callNewChatOnce(command, prompt, mode)
        if (outcome.type === 'ok') {
            return { isOk: true, detail: '' }
        }
        return { isOk: false, detail: `新建对话发送失败：${outcome.reason}` }
    }

    private async hasCommand(command: string): Promise<boolean> {
        const commands = await vscode.commands.getCommands(true)
        return commands.includes(command)
    }

    /** 当前配置下参与探测的命令：不复用会话时只看新建通道，避免把「只能新建」误判成可用 */
    private activeCommands(config: BridgeConfig): string[] {
        return config.reuseConversation ? [config.sendCommand, config.newChatCommand] : [config.newChatCommand]
    }

    /**
     * 写入剪贴板并聚焦对话框；剪贴板不可用时返回 false，由调用方给出可读结论。
     * focusChatView 内部已吞掉焦点异常，这里只需守住剪贴板这一步。
     */
    private async copyAndFocus(prompt: string): Promise<boolean> {
        try {
            await vscode.env.clipboard.writeText(prompt)
        } catch {
            return false
        }
        await this.focusChatView()
        return true
    }
}
