/**
 * 对话模式的展示元数据：选项短名与一句话语义。
 * 与 lib/icons 的图标元数据同层分工——宿主只持久化 ChatMode 字面量，展示文案一律留在 Webview。
 * 注意：新增模式时必须同步 shared/types 的 ChatMode 联合与 CHAT_MODES 白名单；
 * 两张表都声明为 Record<ChatMode, string>，漏写会直接触发类型检查失败。
 */
import type { ChatMode } from '@shared/types'

/** 选项按钮上的短名，完整语义放在选项组下方的说明里 */
export const CHAT_MODE_LABELS: Record<ChatMode, string> = {
    craft: 'Craft',
    ask: 'Ask',
    plan: 'Plan',
}

/** 每个模式的一句话语义，供选项组下方的说明文字使用 */
export const CHAT_MODE_DESCRIPTIONS: Record<ChatMode, string> = {
    craft: 'Craft：直接分析并修改代码',
    ask: 'Ask：只回答问题，不改动文件',
    plan: 'Plan：先给出方案，确认后再动手',
}
