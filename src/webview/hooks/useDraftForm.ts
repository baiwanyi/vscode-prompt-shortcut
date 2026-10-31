/**
 * 编辑表单的状态机：受控草稿、触摸态与提交时机。
 * 用渲染期「props 变化时调整 state」的官方模式重置表单，而不是在 effect 里同步，
 * 避免重新打开弹窗时先闪一帧旧内容再被清空。
 * 注意：触摸态必须留在本 Hook 内——它决定「何时开始显示错误」，下放给调用方会出现两处各判一次。
 */
import { useState } from 'react'
import { isLabelMissing } from '@shared/promptValidation'
import type { PromptDraft } from '@shared/types'
import { toSubmittableDraft } from '@webview/lib/draft-form'

/** 新建模板的初始值：图标与模式取最常见的一项 */
const EMPTY_DRAFT: PromptDraft = {
    label: '',
    prompt: '',
    icon: 'sparkles',
    mode: 'craft',
}

export interface DraftFormApi {
    form: PromptDraft
    update: <K extends keyof PromptDraft>(key: K, value: PromptDraft[K]) => void
    /** 触摸过且名称为空 */
    isLabelInvalid: boolean
    /** 命令：标记触摸并校验，通过返回归一化草稿，不通过返回 null */
    prepareSubmit: () => PromptDraft | null
}

export function useDraftForm(draft: PromptDraft | null, isOpen: boolean): DraftFormApi {
    const [form, setForm] = useState<PromptDraft>(draft ?? EMPTY_DRAFT)
    const [isTouched, setIsTouched] = useState(false)
    const [syncSource, setSyncSource] = useState<{ draft: PromptDraft | null; isOpen: boolean }>({ draft, isOpen })

    // 切换编辑对象或重新打开时重置表单：条件只成立一次，不会形成渲染循环
    if (syncSource.draft !== draft || syncSource.isOpen !== isOpen) {
        setSyncSource({ draft, isOpen })
        setForm(draft ?? EMPTY_DRAFT)
        setIsTouched(false)
    }

    const isLabelInvalid = isTouched && isLabelMissing(form.label)

    const update = <K extends keyof PromptDraft>(key: K, value: PromptDraft[K]): void => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const prepareSubmit = (): PromptDraft | null => {
        setIsTouched(true)
        if (isLabelMissing(form.label)) {
            return null
        }
        return toSubmittableDraft(form)
    }

    return { form, update, isLabelInvalid, prepareSubmit }
}
