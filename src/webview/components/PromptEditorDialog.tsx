/**
 * 提示词新增/编辑对话框。
 * 表单状态机交给 useDraftForm、图标与模式交给各自的 picker，本组件只做字段布局与提交时机。
 * 校验态经 Field 的 data-invalid 与控件的 aria-invalid 成对呈现，错误文案交给 FieldError。
 * 正文用 InputGroup 承载（可留空，留空时由宿主回退为发送名称），字数统计作为 block-end 的 addon。
 * 容量行同时展示已用量与保存后预测：超限时用 sonner 提示并拒绝提交，宿主侧还有同一口径的防线。
 * 注意：正文控件自带 field-sizing-content，必须配合 max-h 与 overflow-y-auto 限高，否则长提示词会把对话框顶出视口；
 * 名称与正文的长度上限、容量上限均取自 shared 下的限制模块，不要就地写数字。
 */
import { useMemo } from 'react'
import { toast } from 'sonner'
import { PromptIconPicker } from '@components/PromptIconPicker'
import { PromptModePicker } from '@components/PromptModePicker'
import { Button } from '@components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from '@components/ui/field'
import { Input } from '@components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupTextarea } from '@components/ui/input-group'
import { CAPACITY_LIMIT_KB, capacityKb, checkCapacity } from '@shared/promptCapacity'
import { MAX_LABEL_LENGTH, MAX_PROMPT_LENGTH } from '@shared/promptLimits'
import type { PromptDraft, PromptTemplate } from '@shared/types'
import { useDraftForm } from '@webview/hooks/useDraftForm'
import type { JSX } from 'react'

interface PromptEditorDialogProps {
    open: boolean
    draft: PromptDraft | null
    /** 当前完整列表：容量按「保存后的整份列表」估算，缺了它预测会少算其他条目 */
    prompts: PromptTemplate[]
    /** 已落盘的用量字节数，用于展示当前占用 */
    usedBytes: number
    onOpenChange: (open: boolean) => void
    onSubmit: (draft: PromptDraft) => void
}

export function PromptEditorDialog({
    open,
    draft,
    prompts,
    usedBytes,
    onOpenChange,
    onSubmit,
}: PromptEditorDialogProps): JSX.Element {
    const { form, update, isLabelInvalid, prepareSubmit } = useDraftForm(draft, open)
    // 随输入重算：超限提示要与提交时的判定同步，不能等点了保存才出现
    const capacityError = useMemo(() => checkCapacity(prompts, { ...form, id: draft?.id }), [prompts, form, draft])

    const handleSubmit = (): void => {
        const payload = prepareSubmit()
        if (!payload) {
            return
        }
        // 超限只提示不提交：交给宿主拒绝会先关弹窗再弹提示，用户看不到拦截原因
        const error = checkCapacity(prompts, payload)
        if (error) {
            toast.error(error)
            return
        }
        onSubmit(payload)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="px-2 py-4">
                <DialogHeader>
                    <DialogTitle>{draft?.id ? '编辑提示词' : '新建提示词'}</DialogTitle>
                    <DialogDescription>你的常用指令，放在这里。</DialogDescription>
                </DialogHeader>

                <FieldGroup className="gap-3">
                    <Field data-invalid={isLabelInvalid}>
                        <FieldLabel htmlFor="prompt-label">名称</FieldLabel>
                        <Input
                            id="prompt-label"
                            value={form.label}
                            maxLength={MAX_LABEL_LENGTH}
                            placeholder="例如：生成单元测试"
                            aria-invalid={isLabelInvalid}
                            onChange={(event) => update('label', event.target.value)}
                        />
                        <FieldError>{isLabelInvalid ? '名称不能为空' : null}</FieldError>
                    </Field>

                    <FieldGroup className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldTitle>图标</FieldTitle>
                            <PromptIconPicker value={form.icon} onChange={(next) => update('icon', next)} />
                        </Field>

                        <Field>
                            <FieldTitle>对话模式</FieldTitle>
                            <PromptModePicker value={form.mode} onChange={(next) => update('mode', next)} />
                        </Field>
                    </FieldGroup>

                    <Field>
                        <FieldLabel htmlFor="prompt-body">提示词正文</FieldLabel>
                        <InputGroup>
                            <InputGroupTextarea
                                id="prompt-body"
                                value={form.prompt}
                                rows={9}
                                maxLength={MAX_PROMPT_LENGTH}
                                className="max-h-64 overflow-y-auto text-xs placeholder:text-xs"
                                placeholder="正文可留空，发送时用名称。"
                                onChange={(event) => update('prompt', event.target.value)}
                            />
                            <InputGroupAddon align="block-end" className="justify-end">
                                <InputGroupText>{form.prompt.length} 字符</InputGroupText>
                            </InputGroupAddon>
                        </InputGroup>
                        <FieldDescription className={capacityError ? 'text-destructive-foreground' : undefined}>
                            {capacityError ?? `容量：已用 ${capacityKb(usedBytes)} / ${CAPACITY_LIMIT_KB} KB`}
                        </FieldDescription>
                    </Field>
                </FieldGroup>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit}>保存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
