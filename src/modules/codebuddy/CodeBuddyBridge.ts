/**
 * CodeBuddy 扩展的桥接层，负责把提示词送进 CodeBuddy 对话框。
 * 主通道是 CodeBuddy 内置的 `tencentcloud.codingcopilot.sendToChat`：其内部构造
 * `{ prompt, options: { autoSend: true, newChat: true } }` 并激活聊天页，等价于「填入 + 发送」。
 * 由于该命令未在 CodeBuddy 的 contributes.commands 中声明，扩展未激活时并不存在，
 * 因此执行前必须先 focus 聊天视图触发激活，再轮询等待命令注册完成，并保留剪贴板降级链路。
 * 注意：命令 ID 属于对方扩展的内部实现，版本升级可能变动，必须允许通过配置覆盖。
 */
import * as vscode from 'vscode'
import type { ChatMode, SendOutcome } from '../../shared/types'

/** CodeBuddy 聊天视图 ID，focus 该视图可触发其扩展激活 */
const CHAT_VIEW_ID = 'coding-copilot.webviews.chat'

/** 激活到命令可用的等待上限：实测 2-3s，慢机器更久，故给到 10s 再考虑降级 */
const ACTIVATION_TIMEOUT_MS = 10000
const ACTIVATION_POLL_INTERVAL_MS = 250

export interface BridgeConfig {
    sendCommand: string
    mode: ChatMode
    autoSend: boolean
    fallbackToClipboard: boolean
}

export interface SendResult {
    outcome: SendOutcome
    detail: string
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

export class CodeBuddyBridge {
    constructor(private readonly readConfig: () => BridgeConfig) {}

    /** 探测发送命令是否已注册；未激活时返回 false，调用方可先 focusChatView 再重试 */
    async isSendCommandAvailable(): Promise<boolean> {
        const { sendCommand } = this.readConfig()
        const commands = await vscode.commands.getCommands(true)
        return commands.includes(sendCommand)
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
     * 顺序：确保扩展激活 -> 调用 sendToChat -> 失败则写剪贴板并提示手动粘贴。
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

        // 未激活时命令尚不存在：先 focus 触发激活，再轮询等待其注册完成
        if (!(await this.isSendCommandAvailable())) {
            await this.focusChatView()
            await this.waitForSendCommand(ACTIVATION_TIMEOUT_MS)
        }

        if (await this.isSendCommandAvailable()) {
            try {
                await vscode.commands.executeCommand(config.sendCommand, { prompt, mode })
                return { outcome: 'sent', detail: '已发送到 CodeBuddy 对话。' }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                if (!config.fallbackToClipboard) {
                    return { outcome: 'failed', detail: `调用 CodeBuddy 失败：${message}` }
                }
            }
        }

        if (config.fallbackToClipboard) {
            await this.copyAndFocus(prompt)
            return {
                outcome: 'copied',
                detail: '未检测到 CodeBuddy 发送命令，已复制提示词并打开对话框，按 Ctrl+V 后回车发送。',
            }
        }

        return {
            outcome: 'failed',
            detail: `未找到可用的 CodeBuddy 命令「${config.sendCommand}」，请在设置中调整 webianPrompt.codebuddy.sendCommand。`,
        }
    }

    private async copyAndFocus(prompt: string): Promise<void> {
        await vscode.env.clipboard.writeText(prompt)
        await this.focusChatView()
    }
}
