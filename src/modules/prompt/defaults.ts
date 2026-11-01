/**
 * 内置提示词模板定义。
 * 这里的文案即为「点击按钮后发送给 CodeBuddy 的原文」，因此必须写成可直接执行的完整指令，
 * 而不是简短的标题短语；同时要把禁止项写清楚，避免模型自行扩大动作范围。
 * 注意：内置模板的 id 是稳定契约，PromptStore 依赖它做补齐与重置，禁止随意改名。
 * 右键「微边代码」子菜单的动作提示词不放这里，见同目录的 actions.ts。
 */
import type { PromptTemplate } from '../../shared/types'

/** 内置模板的时间哨兵：0 表示出厂内容、无真实创建时间，避免被误读为用户创建于 1970 年 */
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
        id: 'builtin-continue',
        label: '请继续',
        icon: 'terminal',
        mode: 'craft',
        prompt: '',
    },
    {
        id: 'builtin-sequential',
        label: '按推荐顺序实施',
        icon: 'sparkles',
        mode: 'craft',
        prompt: '',
    },
    {
        id: 'builtin-commit',
        label: '提交到 Git',
        icon: 'gitCommit',
        mode: 'craft',
        prompt: '',
    },
    {
        id: 'builtin-push',
        label: '推送到 Git',
        icon: 'gitPush',
        mode: 'craft',
        prompt: '',
    },
    {
        id: 'builtin-cleanup',
        label: '排查遗留代码',
        icon: 'shieldCheck',
        mode: 'ask',
        prompt: '请对项目代码库进行全面评估，系统性地识别并归类孤儿代码、死代码及旧代码残留。评估需覆盖以下方面：孤儿代码（无调用方或被引用的函数、类、模块）、死代码（逻辑上不可达或条件恒不成立的代码路径）、旧代码残留（被新实现替代但未清理的历史代码、过时注释、废弃的配置项与依赖）。对每类问题给出所在位置、判定依据、影响范围（如增加维护成本、混淆逻辑、潜在安全隐患）及清理优先级建议。最终输出结构化评估报告，按类别汇总问题清单，并给出整体清理建议与风险提示。',
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
