/**
 * 右键「快捷命令」子菜单的动作清单：命令 ID、提示词构建器与对话模式的唯一来源。
 * 新增动作时既要在这里加表项，也要同步 package.json 的 contributes.commands 与 menus，
 * 两边缺一项就会出现「有菜单无实现」或「有实现无入口」。
 * 注意：注册顺序不影响行为，但保持与清单同序便于逐项核对；未写 mode 的动作沿用设置里的默认模式。
 */
import type { ChatMode } from '../../shared/types'
import type { ActionPromptBuilder } from '../prompt/actions'
import {
    createFixPrompt,
    createOptimizePrompt,
    createRefactorPrompt,
    createReviewPrompt,
    createStylePrompt,
} from '../prompt/actions'

export interface ContextActionEntry {
    /** 与 package.json 的 contributes.commands 同名 */
    command: string
    buildPrompt: ActionPromptBuilder
    /** 未指定时沿用设置里的默认模式 */
    mode?: ChatMode
}

export const CONTEXT_ACTIONS: readonly ContextActionEntry[] = [
    { command: 'baiwanyi.prompt.fixWithCodeBuddy', buildPrompt: createFixPrompt },
    { command: 'baiwanyi.prompt.reviewWithCodeBuddy', buildPrompt: createReviewPrompt, mode: 'ask' },
    { command: 'baiwanyi.prompt.optimizeWithCodeBuddy', buildPrompt: createOptimizePrompt, mode: 'ask' },
    { command: 'baiwanyi.prompt.styleWithCodeBuddy', buildPrompt: createStylePrompt },
    { command: 'baiwanyi.prompt.refactorWithCodeBuddy', buildPrompt: createRefactorPrompt, mode: 'ask' },
]
