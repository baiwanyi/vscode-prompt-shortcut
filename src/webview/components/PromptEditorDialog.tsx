/**
 * 提示词新增/编辑对话框。
 * 表单状态机交给 useDraftForm、图标与模式交给各自的 picker，本组件只做字段布局与提交时机。
 * 校验态经 Field 的 data-invalid 与控件的 aria-invalid 成对呈现，错误文案交给 FieldError。
 * 正文用 InputGroup 承载（可留空，留空时由宿主回退为发送名称），字数统计作为 block-end 的 addon。
 * 注意：正文控件自带 field-sizing-content，必须配合 max-h 与 overflow-y-auto 限高，否则长提示词会把对话框顶出视口；
 * 名称与正文的长度上限取自 shared/promptLimits，不要就地写数字。
 */
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
import { MAX_LABEL_LENGTH, MAX_PROMPT_LENGTH } from '@shared/promptLimits'
import type { PromptDraft } from '@shared/types'
import { useDraftForm } from '@webview/hooks/useDraftForm'
import type { JSX } from 'react'

interface PromptEditorDialogProps {
    open: boolean
    draft: PromptDraft | null
    onOpenChange: (open: boolean) => void
    onSubmit: (draft: PromptDraft) => void
}

export function PromptEditorDialog({ open, draft, onOpenChange, onSubmit }: PromptEditorDialogProps): JSX.Element {
    const { form, update, isLabelInvalid, prepareSubmit } = useDraftForm(draft, open)

    const handleSubmit = (): void => {
        const payload = prepareSubmit()
        if (payload) {
            onSubmit(payload)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-1">
                <DialogHeader>
                    <DialogTitle>{draft?.id ? '编辑提示词' : '新建提示词'}</DialogTitle>
                    <DialogDescription>
                        这段正文会原样发送给 CodeBuddy，建议写成可直接执行的完整指令，并写明禁止项。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
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

                        <Field>
                            <FieldTitle>图标</FieldTitle>
                            <PromptIconPicker value={form.icon} onChange={(next) => update('icon', next)} />
                        </Field>

                        <Field>
                            <FieldTitle>对话模式</FieldTitle>
                            <PromptModePicker value={form.mode} onChange={(next) => update('mode', next)} />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="prompt-body">提示词正文</FieldLabel>
                            <InputGroup>
                                <InputGroupTextarea
                                    id="prompt-body"
                                    value={form.prompt}
                                    rows={9}
                                    maxLength={MAX_PROMPT_LENGTH}
                                    className="max-h-56 overflow-y-auto font-mono placeholder:text-sm"
                                    placeholder={'例如：\n请按以下顺序推进本次任务……\n不要修改无关文件。'}
                                    onChange={(event) => update('prompt', event.target.value)}
                                />
                                <InputGroupAddon align="block-end" className="justify-end">
                                    <InputGroupText>{form.prompt.length} 字符</InputGroupText>
                                </InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>留空时只把名称发送给 CodeBuddy。</FieldDescription>
                        </Field>
                    </FieldGroup>
                </div>

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
