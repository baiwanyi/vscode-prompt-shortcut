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
import type { ChatMode, CodeBuddyStatus, SendOutcome } from '../../shared/types'
import { isRecord } from '../../shared/guards'

/** CodeBuddy 聊天视图 ID，focus 该视图可触发其扩展激活 */
const CHAT_VIEW_ID = 'coding-copilot.webviews.chat'

/** 读取当前会话上下文的命令，返回值里带 conversationId（无会话时为空串） */
const CONTEXT_COMMAND = 'tencentcloud.codingcopilot.getContext'

/** 激活到命令可用的等待上限：实测 2-3s，慢机器更久，故给到 10s 再考虑降级 */
const ACTIVATION_TIMEOUT_MS = 10000
const ACTIVATION_POLL_INTERVAL_MS = 250

/** 复用当前会话的重试参数：聊天视图刚激活时其 rpc 通道可能尚未就绪 */
const CURRENT_CHAT_ATTEMPTS = 3
const CURRENT_CHAT_RETRY_INTERVAL_MS = 500

/** 排障日志通道：只在复用失败、回退等异常路径写入，正常发送不留噪音 */
let logChannel: vscode.OutputChannel | undefined

function report(message: string): void {
    logChannel ??= vscode.window.createOutputChannel('微边提示词')
    logChannel.appendLine(`[CodeBuddy] ${message}`)
}

export interface BridgeConfig {
    /** 复用当前会话的发送命令（chat.sendMessage） */
    sendCommand: string
    /** 复用失败时用于新建会话的命令（sendToChat） */
    newChatCommand: string
    mode: ChatMode
    autoSend: boolean
    fallbackToClipboard: boolean
    /** 是否优先在当前会话里发送；关闭后每次点击都会新建会话 */
    reuseConversation: boolean
}

export interface SendResult {
    outcome: SendOutcome
    detail: string
}

/** 单条命令的执行结果：失败原因要能串进最终提示，避免用户只看到一句「失败」 */
interface CommandAttempt {
    isOk: boolean
    detail: string
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

export class CodeBuddyBridge {
    constructor(private readonly readConfig: () => BridgeConfig) {}

    /**
     * 探测是否还有可用的发送通道。
     * 只按当前配置参与的命令判断：关闭复用后若只剩新建通道可用，也应当算「已连接」。
     */
    async isSendCommandAvailable(): Promise<boolean> {
        const config = this.readConfig()
        const commands = await vscode.commands.getCommands(true)
        return this.activeCommands(config).some((id) => commands.includes(id))
    }

    /**
     * 面板展示所需的状态聚合：命令通路与 autoSend 都取自同一份配置，调用方无需再直接读配置键。
     * detected 由调用方探测后传入，避免这里重复枚举一次命令列表。
     */
    getStatus(detected: boolean): CodeBuddyStatus {
        const config = this.readConfig()
        return {
            detected,
            commandId: config.reuseConversation ? config.sendCommand : config.newChatCommand,
            autoSend: config.autoSend,
        }
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
                await vscode.commands.executeCommand('workbench.view.extension.coding-copilot-chat')
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
        const mode = overrideMode ?? config.mode

        if (!config.autoSend) {
            await this.copyAndFocus(prompt)
            return {
                outcome: 'copied',
                detail: '已复制提示词并打开 CodeBuddy 对话框，按 Ctrl+V 后回车发送。',
            }
        }

        // 未激活时两个命令都不存在：先 focus 触发激活，再轮询等待其注册完成
        if (!(await this.isSendCommandAvailable())) {
            await this.focusChatView()
            await this.waitForSendCommand(ACTIVATION_TIMEOUT_MS)
        }

        const failures: string[] = []

        if (config.reuseConversation) {
            const conversationId = await this.readConversationId()
            report(conversationId ? `复用会话：${conversationId}` : '未读到当前会话 ID，交由聊天页决定落点。')
            const reuse = await this.sendToCurrentChat(config.sendCommand, prompt, mode, conversationId)
            if (reuse.isOk) {
                return { outcome: 'sent', detail: '已发送到 CodeBuddy 当前对话。' }
            }
            report(`复用失败：${reuse.detail}`)
            failures.push(reuse.detail)
        }

        const newChat = await this.sendToNewChat(config.newChatCommand, prompt, mode)
        if (newChat.isOk) {
            report('已回退到新建会话发送。')
            return {
                outcome: 'sent',
                detail: config.reuseConversation
                    ? '当前对话不可用，已在 CodeBuddy 新建对话并发送。'
                    : '已在 CodeBuddy 新建对话并发送。',
            }
        }
        failures.push(newChat.detail)

        if (config.fallbackToClipboard) {
            await this.copyAndFocus(prompt)
            return {
                outcome: 'copied',
                detail: `未找到可用的 CodeBuddy 发送命令，已复制提示词并打开对话框，按 Ctrl+V 后回车发送。（${failures.join('；')}）`,
            }
        }

        return {
            outcome: 'failed',
            detail: `发送到 CodeBuddy 失败（${failures.join('；')}）。请在设置中调整 webianPrompt.codebuddy.sendCommand / newChatCommand。`,
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
        const options = conversationId ? { mode, conversationId } : { mode }
        let lastError = ''
        for (let index = 0; index < CURRENT_CHAT_ATTEMPTS; index += 1) {
            try {
                const result: unknown = await vscode.commands.executeCommand(command, { message: prompt, options })
                // 会话失效时命令不抛错，而是返回 { error }，必须显式识别才能进入回退链路
                if (isRecord(result) && typeof result.error === 'string') {
                    return { isOk: false, detail: `复用当前对话被拒绝：${result.error}` }
                }
                return { isOk: true, detail: '' }
            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error)
                await this.focusChatView()
                if (index < CURRENT_CHAT_ATTEMPTS - 1) {
                    await delay(CURRENT_CHAT_RETRY_INTERVAL_MS)
                }
            }
        }
        return { isOk: false, detail: `复用当前对话失败：${lastError}` }
    }

    /**
     * 读取 CodeBuddy 当前会话 ID。
     * `getContext` 是对方暴露的只读通道（不传 ensureConversation 时不会新建会话），
     * 读不到或命令缺失时返回空串，由调用方退化为「不指定会话」。
     */
    private async readConversationId(): Promise<string> {
        if (!(await this.hasCommand(CONTEXT_COMMAND))) {
            report(`未找到读取上下文的命令「${CONTEXT_COMMAND}」`)
            return ''
        }
        try {
            const raw: unknown = await vscode.commands.executeCommand(CONTEXT_COMMAND)
            if (!isRecord(raw)) {
                return ''
            }
            return typeof raw.conversationId === 'string' ? raw.conversationId : ''
        } catch (error) {
            report(`读取当前会话失败：${error instanceof Error ? error.message : String(error)}`)
            return ''
        }
    }

    /** 新建会话发送：该命令固定 `newConversation: true`，参数为 `{ prompt, mode }` */
    private async sendToNewChat(command: string, prompt: string, mode: ChatMode): Promise<CommandAttempt> {
        if (!(await this.hasCommand(command))) {
            return { isOk: false, detail: `未找到新建对话的命令「${command}」` }
        }
        try {
            await vscode.commands.executeCommand(command, { prompt, mode })
            return { isOk: true, detail: '' }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            return { isOk: false, detail: `新建对话发送失败：${message}` }
        }
    }

    private async hasCommand(command: string): Promise<boolean> {
        const commands = await vscode.commands.getCommands(true)
        return commands.includes(command)
    }

    /** 当前配置下参与探测的命令：不复用会话时只看新建通道，避免把「只能新建」误判成可用 */
    private activeCommands(config: BridgeConfig): string[] {
        return config.reuseConversation ? [config.sendCommand, config.newChatCommand] : [config.newChatCommand]
    }

    private async copyAndFocus(prompt: string): Promise<void> {
        await vscode.env.clipboard.writeText(prompt)
        await this.focusChatView()
    }
}
