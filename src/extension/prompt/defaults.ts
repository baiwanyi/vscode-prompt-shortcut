/**
 * 内置提示词模板定义。
 * 这里的文案即为「点击按钮后发送给 CodeBuddy 的原文」，因此必须写成可直接执行的完整指令，
 * 而不是简短的标题短语；同时要把禁止项写清楚，避免模型自行扩大动作范围。
 * 注意：内置模板的 id 是稳定契约，PromptStore 依赖它做补齐与重置，禁止随意改名。
 */
import type { PromptTemplate } from '../../shared/types';

const CREATED_AT = 0;

interface BuiltinSeed {
    id: string;
    label: string;
    description: string;
    prompt: string;
    icon: PromptTemplate['icon'];
    mode: PromptTemplate['mode'];
}

const SEEDS: readonly BuiltinSeed[] = [
    {
        id: 'builtin-commit',
        label: '提交到 Git',
        description: '汇总工作区改动，按 Conventional Commits 规范完成一次提交',
        icon: 'git-commit',
        mode: 'craft',
        prompt: [
            '请检查当前工作区的全部改动（含未跟踪文件），按以下要求完成一次提交：',
            '',
            '1. 先用 git status 与 git diff 汇总改动范围，判断这些改动是否应合并为同一个提交；',
            '2. 提交信息遵循 Conventional Commits（feat / fix / refactor / perf / docs / chore / test / build / ci / style），类型前缀用英文，冒号后的标题与正文用中文，标题不超过 72 个字符；正文说明「做了什么」与「为什么」，而不是复述代码；',
            '3. 只提交与本次任务相关的文件，不要顺手提交构建产物、日志、临时文件，也不要提交与本任务无关的格式化改动；',
            '4. 执行 git add 与 git commit；若提交信息含多行正文，用临时文件传入，避免命令行转义问题；',
            '5. 完成后输出本次提交的 hash 与变更文件清单。',
            '',
            '不要执行 git push，不要修改 git config，不要使用 --no-verify 跳过钩子。',
        ].join('\n'),
    },
    {
        id: 'builtin-push',
        label: '推送到 Git',
        description: '把当前分支的提交安全地推送到远程，不做强推',
        icon: 'git-push',
        mode: 'craft',
        prompt: [
            '请把当前分支的提交推送到远程仓库，要求：',
            '',
            '1. 先用 git status 与 git log --oneline @{u}..HEAD 确认待推送的提交与上游分支状态；',
            '2. 若当前分支没有设置上游，使用 git push -u origin <当前分支名>；',
            '3. 禁止使用 git push --force 或 --force-with-lease 覆盖远程历史；若发现本地与远程已经分叉，停下来说明分叉情况，等我决定后再说；',
            '4. 禁止直接推送到 main 或 master；若当前处于受保护分支，先提醒我；',
            '5. 推送完成后输出远程分支名、提交数量与最新一条提交摘要。',
        ].join('\n'),
    },
    {
        id: 'builtin-sequential',
        label: '按顺序实施',
        description: '按「复述 → 调研 → 方案 → 实施 → 验证」的固定顺序推进',
        icon: 'list-ordered',
        mode: 'craft',
        prompt: [
            '请按以下顺序推进本次任务，每完成一步先汇报结论再进入下一步，不要跳步：',
            '',
            '1. 复述需求：用三到五条要点确认你理解的验收标准，并标出任何有歧义的地方；',
            '2. 现状调研：列出涉及的文件与依赖，说明改动边界，不要顺手重构无关代码；',
            '3. 实施方案：给出最短可行路径，并说明为什么这样拆分步骤；',
            '4. 分步实施：严格按上面的顺序落地，每步改动后做一次自检；',
            '5. 验证：执行类型检查、构建或测试，逐项列出通过/失败结果，不要只给汇总；',
            '6. 收尾：汇总改动文件、遗留风险与后续建议。',
            '',
            '如果中途发现某个前提不成立，停下来说明原因并给出替代方案，不要静默改道。',
        ].join('\n'),
    },
    {
        id: 'builtin-recommended',
        label: '按推荐实现',
        description: '按你判断的最佳方案直接落地，减少来回确认',
        icon: 'sparkles',
        mode: 'craft',
        prompt: [
            '请直接按你判断的最佳方案实施，不要反复向我确认：',
            '',
            '1. 先用一段话说清楚你选择的方案与关键取舍，说明为什么不是另外两种常见做法；',
            '2. 遵循仓库现有约定（命名、目录结构、错误处理与测试风格），复用已有的工具函数与类型，不要新增重复实现；',
            '3. 优先保证正确性与可维护性，不为「更通用」引入额外抽象；',
            '4. 不引入新的依赖，除非确有必要，并在结论里说明理由；',
            '5. 实施完成后执行类型检查与构建，逐项列出验证结果，并说明可能的副作用。',
        ].join('\n'),
    },
];

/** 生成一份全新的内置模板列表（每次调用返回新对象，避免调用方误改常量） */
export function createBuiltinPrompts(): PromptTemplate[] {
    return SEEDS.map((seed) => ({
        id: seed.id,
        label: seed.label,
        description: seed.description,
        prompt: seed.prompt,
        icon: seed.icon,
        mode: seed.mode,
        builtin: true,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
    }));
}

/** 内置模板 id 集合，供 PromptStore 做完整性校验 */
export const BUILTIN_PROMPT_IDS: readonly string[] = SEEDS.map((seed) => seed.id);
