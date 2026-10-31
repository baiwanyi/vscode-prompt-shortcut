/**
 * 内置提示词模板定义。
 * 这里的文案即为「点击按钮后发送给 CodeBuddy 的原文」，因此必须写成可直接执行的完整指令，
 * 而不是简短的标题短语；同时要把禁止项写清楚，避免模型自行扩大动作范围。
 * 注意：内置模板的 id 是稳定契约，PromptStore 依赖它做补齐与重置，禁止随意改名。
 * 右键「微边代码」子菜单的动作提示词不放这里，见同目录的 actions.ts。
 */
import type { PromptTemplate } from '../../shared/types'

const CREATED_AT = 0

interface BuiltinSeed {
    id: string
    label: string
    prompt: string
    icon: PromptTemplate['icon']
    mode: PromptTemplate['mode']
}

const SEEDS: readonly BuiltinSeed[] = [
    {
        id: 'builtin-commit',
        label: '提交到 Git',
        icon: 'git-commit',
        mode: 'craft',
        prompt: '',
    },
    {
        id: 'builtin-push',
        label: '推送到 Git',
        icon: 'git-push',
        mode: 'craft',
        prompt: '',
    },
    {
        id: 'builtin-sequential',
        label: '按推荐顺序实施',
        icon: 'list-ordered',
        mode: 'craft',
        prompt: '',
    },
]

/** 生成一份全新的内置模板列表（每次调用返回新对象，避免调用方误改常量） */
export function createBuiltinPrompts(): PromptTemplate[] {
    return SEEDS.map((seed) => ({
        id: seed.id,
        label: seed.label,
        prompt: seed.prompt,
        icon: seed.icon,
        mode: seed.mode,
        builtin: true,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
    }))
}

/** 内置模板 id 集合，供 PromptStore 做完整性校验 */
export const BUILTIN_PROMPT_IDS: readonly string[] = SEEDS.map((seed) => seed.id)
