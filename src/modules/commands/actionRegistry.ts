/**
 * 右键「快捷命令」子菜单的动作清单：命令 ID、提示词模板与对话模式的唯一来源。
 * 提示词原文存放在 resources/actions.md，这里只负责键名取模板与目标占位符替换，
 * 新增动作时既要在这里加表项，也要同步 package.json 的 contributes.commands 与 menus，
 * 两边缺一项就会出现「有菜单无实现」或「有实现无入口」。
 * 注意：注册顺序不影响行为，但保持与清单同序便于逐项核对；未写 mode 的动作沿用设置里的默认模式。
 */
import type { ChatMode } from '../../shared/types'
import { loadActionTemplates } from '../prompt/presets'

/** 把目标描述（相对路径 + 行号）嵌进模板，供命令注册处直接调用 */
export type ActionPromptBuilder = (target: string) => string

export interface ContextActionEntry {
    /** 与 package.json 的 contributes.commands 同名 */
    command: string
    buildPrompt: ActionPromptBuilder
    /** 未指定时沿用设置里的默认模式 */
    mode?: ChatMode
}

/** 目标占位符：resources/actions.md 用它标记目标描述插入的位置 */
const TARGET_PLACEHOLDER = '{{target}}'

/** 动作模板随模块加载一次：资源损坏时在激活期就暴露，而不是等到用户点击才失败 */
const TEMPLATES = loadActionTemplates()

/** 取模板并绑定占位符替换；模板缺失说明资源被改坏，直接抛错而不是发一段缺目标的指令 */
function createBuilder(key: string): ActionPromptBuilder {
    const template = TEMPLATES.get(key)
    if (!template) {
        throw new Error(`resources/actions.md 缺少动作模板：${key}`)
    }
    return (target: string): string => template.replaceAll(TARGET_PLACEHOLDER, target)
}

export const CONTEXT_ACTIONS: readonly ContextActionEntry[] = [
    { command: 'baiwanyi.prompt.fixWithCodeBuddy', buildPrompt: createBuilder('fix') },
    { command: 'baiwanyi.prompt.reviewWithCodeBuddy', buildPrompt: createBuilder('review'), mode: 'ask' },
    { command: 'baiwanyi.prompt.optimizeWithCodeBuddy', buildPrompt: createBuilder('optimize'), mode: 'ask' },
    { command: 'baiwanyi.prompt.styleWithCodeBuddy', buildPrompt: createBuilder('style') },
    { command: 'baiwanyi.prompt.refactorWithCodeBuddy', buildPrompt: createBuilder('refactor'), mode: 'ask' },
]
