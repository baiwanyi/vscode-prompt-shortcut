/**
 * CodeBuddy 集成涉及的命令、视图标识与扩展设置解析。
 * 这些 ID 全部属于对方扩展的内部实现，版本升级可能变动，集中在此便于单点排查与配置覆盖；
 * 默认值只在这里定义一次，设置项留空时回落到这里，别处不得再写字面量。
 * 注意：BridgeConfig 是桥接层的依赖契约，放在本文件以保持「常量 → 配置 → 桥接」的单向依赖。
 */
import * as vscode from 'vscode'
import type { ChatMode } from '../../shared/types'

/** 复用当前会话的发送命令：不带 newConversation 参数，落点由 options.conversationId 决定 */
export const DEFAULT_SEND_COMMAND = 'tencentcloud.codingcopilot.chat.sendMessage'

/** 新建会话的发送命令：内部写死 newConversation: true，必然新开对话 */
export const DEFAULT_NEW_CHAT_COMMAND = 'tencentcloud.codingcopilot.sendToChat'

/** 读取当前会话上下文的只读命令，返回值里带 conversationId */
export const CONTEXT_COMMAND = 'tencentcloud.codingcopilot.getContext'

/** CodeBuddy 聊天视图 ID，focus 该视图可触发其扩展激活 */
export const CHAT_VIEW_ID = 'coding-copilot.webviews.chat'

/** 聊天视图所属的容器视图，作为 focus 失败时的二级降级目标 */
export const CHAT_CONTAINER_VIEW_ID = 'workbench.view.extension.coding-copilot-chat'

/** 桥接层需要的全部配置项 */
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

/** 把扩展设置读成桥接配置；默认值与本文件常量同源，避免两处各写一份命令 ID */
export function resolveBridgeConfig(): BridgeConfig {
    const config = vscode.workspace.getConfiguration('baiwanyi.prompt')
    const mode = config.get<ChatMode>('codebuddy.mode', 'craft')
    return {
        sendCommand: config.get<string>('codebuddy.sendCommand', DEFAULT_SEND_COMMAND) || DEFAULT_SEND_COMMAND,
        newChatCommand:
            config.get<string>('codebuddy.newChatCommand', DEFAULT_NEW_CHAT_COMMAND) || DEFAULT_NEW_CHAT_COMMAND,
        mode,
        autoSend: config.get<boolean>('codebuddy.autoSend', true),
        fallbackToClipboard: config.get<boolean>('codebuddy.fallbackToClipboard', true),
        reuseConversation: config.get<boolean>('codebuddy.reuseConversation', true),
    }
}
