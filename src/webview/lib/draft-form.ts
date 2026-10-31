/**
 * 提交前的草稿归一化：把表单里的用户输入收敛成可直接交给宿主的形状。
 * 只做体验层的收口（去掉首尾空白），不承担校验——名称是否合法由 shared/promptValidation 判定，
 * 宿主的 parseDraft 会再收敛一次，两层各自保留，不把防线交给不可信的一方。
 * 注意：正文即使被清空也原样提交，空正文由宿主回退为发送名称，本函数不得把它改写成名称。
 */
import type { PromptDraft } from '@shared/types'

/** 名称与正文去首尾空白后提交；其余字段原样带出 */
export function toSubmittableDraft(form: PromptDraft): PromptDraft {
    return {
        ...form,
        label: form.label.trim(),
        prompt: form.prompt.trim(),
    }
}
