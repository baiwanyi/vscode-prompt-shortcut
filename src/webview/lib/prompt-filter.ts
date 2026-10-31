/**
 * 提示词筛选：把关键词归一化、多字段匹配与「是否处于搜索态」收敛为一个纯函数。
 * 列表渲染与排序可用性共用同一份判定口径，避免各处重复 trim/toLowerCase 造成「搜索结果仍可排序」这类偏差。
 * 注意：匹配范围包含提示词正文，正文可能很长，调用方应以 useMemo 缓存结果；
 * 关键词为空时原样返回入参数组（引用不变），便于下游依赖短路。
 */
import type { PromptTemplate } from '@shared/types'

/** 参与搜索的字段以换行拼接，避免跨字段拼出一个实际不存在的命中 */
function toSearchableText(prompt: PromptTemplate): string {
    return `${prompt.label}\n${prompt.description}\n${prompt.prompt}`
}

/** 筛选结果：items 保持模板原始顺序，isFiltering 表示当前是否处于搜索态 */
export interface PromptFilterResult {
    items: PromptTemplate[]
    isFiltering: boolean
}

export function filterPrompts(prompts: PromptTemplate[], query: string): PromptFilterResult {
    const keyword = query.trim().toLowerCase()
    if (!keyword) {
        return { items: prompts, isFiltering: false }
    }
    return {
        items: prompts.filter((item) => toSearchableText(item).toLowerCase().includes(keyword)),
        isFiltering: true,
    }
}
