/**
 * 提示词存储容量的度量与校验。
 * 宿主保存与 Webview 提交前共用同一套估算：容量按整份列表 JSON 序列化后的 UTF-8 字节数计，
 * 该键会整键同步到 Settings Sync，超限会让同步报 TooLarge 失败，因此两端各拦一次、口径必须一致。
 * 注意：估算基于完整模板列表，更新时先按 id 剔除原条目；占位条目的 id 与时间戳差异不影响判定结果。
 */
import { MAX_TOTAL_BYTES } from './promptLimits'
import type { PromptDraft, PromptTemplate } from './types'

/** UTF-8 计数器：容量按字节计，中文若按字符数估会低估三倍 */
const UTF8_ENCODER = new TextEncoder()

/** 上限对应的 KB 值：界面文案与用量展示共用，不在各处各算一遍 */
export const CAPACITY_LIMIT_KB = MAX_TOTAL_BYTES / 1024

/** 字节转 KB 展示值：向上取整，刚越过上限时不会显示成等于上限 */
export function capacityKb(bytes: number): number {
    return Math.ceil(bytes / 1024)
}

/** 用量百分比：向下取整并封顶 100，只有真正触到上限才显示 100% */
export function capacityPercent(bytes: number): number {
    return Math.min(Math.floor((bytes / MAX_TOTAL_BYTES) * 100), 100)
}

/** 整份列表序列化后的字节数，供界面展示当前用量 */
export function measurePromptsBytes(list: readonly PromptTemplate[]): number {
    return UTF8_ENCODER.encode(JSON.stringify(list)).byteLength
}

/** 预测保存该草稿后的体积：编辑现有条目时不会把自己的旧体积重复计入 */
export function measureAfterSave(list: readonly PromptTemplate[], draft: PromptDraft): number {
    const others = list.filter((item) => item.id !== draft.id)
    // 占位条目补齐模板字段：id 与时间戳的差异只有几十字节，不影响容量判定
    const candidate: PromptTemplate = {
        ...draft,
        id: draft.id ?? 'pending',
        createdAt: 0,
        updatedAt: 0,
    }
    return measurePromptsBytes([...others, candidate])
}

/** 保存该草稿是否会撑破容量上限；超限时返回可直接展示的文案，未超限返回 null */
export function checkCapacity(list: readonly PromptTemplate[], draft: PromptDraft): string | null {
    const bytes = measureAfterSave(list, draft)
    if (bytes <= MAX_TOTAL_BYTES) {
        return null
    }
    return `提示词总容量将达 ${capacityKb(bytes)} KB，超过上限 ${CAPACITY_LIMIT_KB} KB，请先删除或精简部分提示词。`
}

/** 用量是否已达上限：界面据此给出常驻提醒，避免用户反复尝试保存 */
export function isCapacityFull(bytes: number): boolean {
    return bytes >= MAX_TOTAL_BYTES
}
