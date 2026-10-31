/**
 * CodeBuddy 连接状态的展示语义映射：把宿主推送的探测结果收敛为「已连接 / 未检测到」两态。
 * 纯函数只输出语义 tone 与用户文案，颜色类名由组件侧的映射表决定，避免样式细节沉淀到领域层。
 * 注意：这里的文案描述的是面板常驻状态与点击后的行为预期，与宿主侧一次性操作结果的反馈
 * （dispatchPrompt 产出的 detail）属不同语境，不可合并到同一份文案表。
 */
import type { CodeBuddyStatus } from '@shared/types'

/** 连接状态的两态语义：具体着色由调用方按 tone 决定 */
export type ConnectionTone = 'connected' | 'missing'

/** 面板顶部的连接状态展示数据 */
export interface ConnectionState {
    /** 语义色调：已连接走主色、未检测到走错误色 */
    tone: ConnectionTone
    /** Tooltip 文案 */
    text: string
}

/** 两态收敛：已连接 / 未检测到；首屏加载态由面板主体的加载占位承担 */
export function describeConnection(codebuddy: CodeBuddyStatus): ConnectionState {
    if (codebuddy.detected) {
        return {
            tone: 'connected',
            text: codebuddy.autoSend ? '已连接 CodeBuddy（自动发送）' : '已连接 CodeBuddy（仅复制）',
        }
    }
    return {
        tone: 'missing',
        text: '未检测到 CodeBuddy 发送命令，点击时会先尝试激活 CodeBuddy；仍失败才复制到剪贴板。',
    }
}
