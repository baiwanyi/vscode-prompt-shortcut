/**
 * 提示词草稿的边界收敛与领域校验。
 * Webview 传来的草稿视为不可信输入：先用 parseDraft 收敛成结构可信的 PromptDraft，
 * 再由 validateDraft 给出业务错误；两者都不触碰持久化与视图，便于单独演进与测试。
 * 发送文本规则（resolveSendText）同属领域规则，一并收在这里，避免各发送入口各写一遍空正文回退。
 * 容量校验属两侧共用的度量，落在 shared/promptCapacity，不在本文件重复实现。
 * 注意：正文允许为空，只有名称为空或超长才算非法；长度阈值必须取自 shared/promptLimits，不要就地写数字。
 */
import type { PromptDraft, PromptTemplate } from '../../shared/types'
import { MAX_LABEL_LENGTH, MAX_PROMPT_LENGTH } from '../../shared/promptLimits'
import { isLabelMissing } from '../../shared/promptValidation'
import { isChatMode, isPromptIconKey } from '../../shared/types'

/** 把消息载荷收敛为可信草稿：Webview 传入的字段可能缺失或越界，非法时返回 null */
export function parseDraft(value: unknown): PromptDraft | null {
    if (typeof value !== 'object' || value === null) {
        return null
    }
    const label = 'label' in value ? value.label : undefined
    const prompt = 'prompt' in value ? value.prompt : undefined
    const icon = 'icon' in value ? value.icon : undefined
    const mode = 'mode' in value ? value.mode : undefined
    const id = 'id' in value && typeof value.id === 'string' && value.id ? value.id : undefined
    if (typeof label !== 'string' || typeof prompt !== 'string') {
        return null
    }
    if (!isPromptIconKey(icon) || !isChatMode(mode)) {
        return null
    }
    return { id, label: label.trim(), prompt: prompt.trim(), icon, mode }
}

/** 校验草稿，返回错误信息数组（空数组表示通过）；正文允许为空 */
export function validateDraft(draft: PromptDraft): string[] {
    const errors: string[] = []
    if (isLabelMissing(draft.label)) {
        errors.push('名称不能为空')
    } else if (draft.label.length > MAX_LABEL_LENGTH) {
        errors.push(`名称不能超过 ${MAX_LABEL_LENGTH} 个字符`)
    }
    if (draft.prompt.length > MAX_PROMPT_LENGTH) {
        errors.push(`提示词正文不能超过 ${MAX_PROMPT_LENGTH} 个字符`)
    }
    return errors
}

/** 实际发送的文本：正文为空时退回模板名称，让「只发名称」也能作为一条可用提示词 */
export function resolveSendText(template: PromptTemplate): string {
    return template.prompt.trim() || template.label.trim()
}
