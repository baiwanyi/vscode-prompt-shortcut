/**
 * 把提交标题整理成 Release notes 正文。
 * 按 Conventional Commits 前缀分组，描述沿用提交里的中文原文，不重新措辞；
 * 发布流程自身产生的提交（发布版本 / 更新版本清单）会被过滤，它们描述流程而非本版内容。
 * 注意：只接收已切好的标题数组，不读 git；没有可归类条目时返回空串，由调用方决定回退到自动生成。
 */

/** 前缀到分组标题的映射，数组顺序即 notes 的输出顺序 */
const CATEGORY_TITLES = [
    ['feat', '新功能'],
    ['fix', '修复'],
    ['perf', '性能'],
    ['refactor', '重构'],
    ['docs', '文档'],
    ['test', '测试'],
    ['build', '构建'],
    ['ci', '持续集成'],
]

/** 未列出的前缀（chore、style、revert 等）与不符合约定的标题统一落到这里 */
const OTHER_TITLE = '其他'

/** 发布流程自身的提交：发布版本号、同步更新清单，都不该出现在本版变更里 */
const RELEASE_NOISE = /^chore(?:\([^)]*\))?:\s*(?:发布|更新版本清单)/u

/** 解析 `type(scope)!: 描述`，不符合规范时返回 null 交给兜底 */
const COMMIT_PATTERN = /^([a-zA-Z]+)(?:\([^)]*\))?!?:\s*(.+)$/u

/** 把一条标题拆成「分组 + 描述」，无法识别类型时整条归入「其他」 */
function parseSubject(subject) {
    const match = COMMIT_PATTERN.exec(subject)
    if (!match) {
        return { title: OTHER_TITLE, summary: subject }
    }
    const [, type, summary] = match
    const known = CATEGORY_TITLES.find(([prefix]) => prefix === type)
    return { title: known ? known[1] : OTHER_TITLE, summary }
}

/** 生成 markdown：只输出命中的分组，避免出现一堆空标题 */
export function buildReleaseNotes(subjects) {
    const groups = new Map()
    for (const subject of subjects) {
        const trimmed = subject.trim()
        if (!trimmed || trimmed.startsWith('Merge ') || RELEASE_NOISE.test(trimmed)) {
            continue
        }
        const { title, summary } = parseSubject(trimmed)
        const list = groups.get(title) ?? []
        list.push(summary)
        groups.set(title, list)
    }
    if (groups.size === 0) {
        return ''
    }
    const lines = ['## 变更内容', '']
    for (const [, title] of [...CATEGORY_TITLES, [undefined, OTHER_TITLE]]) {
        const list = groups.get(title)
        if (!list) {
            continue
        }
        lines.push(`### ${title}`, ...list.map((item) => `- ${item}`), '')
    }
    return lines.join('\n').trim()
}
