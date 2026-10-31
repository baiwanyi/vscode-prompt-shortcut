/**
 * 提示词新增/编辑对话框。
 * 表单用 Field / FieldGroup 组织，校验态经 data-invalid 与 aria-invalid 传给控件，错误文案交给 FieldError；
 * 图标与对话模式都是互斥单选，统一用 ToggleGroup 承载，避免原生 select 在窄面板中展开后被裁切。
 * 正文用 InputGroup 承载（可留空，留空时由宿主回退为发送名称），字数统计作为 block-end 的 addon。
 * 表单状态完全受控于本组件，提交时只回传 PromptDraft，由宿主完成校验与持久化；
 * 内置模板允许修改文案，但名称之外的结构（id / builtin）由原始数据保留。
 * 注意：draft 变化时必须重置表单，否则会出现「切换编辑对象后仍显示上一条内容」的问题；
 * 正文控件自带 field-sizing-content，必须配合 max-h 与 overflow-y-auto 限高，否则长提示词会把对话框顶出视口。
 */
import { useState } from 'react'
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
import { ToggleGroup, ToggleGroupItem } from '@components/ui/toggle-group'
import { isPromptIconKey } from '@shared/messages'
import type { ChatMode, PromptDraft, PromptIconKey } from '@shared/types'
import { CHAT_MODES, isChatMode, PROMPT_ICON_KEYS } from '@shared/types'
import { PROMPT_ICON_LABELS, PROMPT_ICON_MAP } from '@webview/lib/icons'
import type { JSX } from 'react'

/** 选项按钮上的短名，完整语义放在 ToggleGroup 下方的 FieldDescription 里 */
const MODE_LABELS: Record<ChatMode, string> = {
    craft: 'Craft',
    ask: 'Ask',
    plan: 'Plan',
}

const MODE_DESCRIPTIONS: Record<ChatMode, string> = {
    craft: 'Craft：直接分析并修改代码',
    ask: 'Ask：只回答问题，不改动文件',
    plan: 'Plan：先给出方案，确认后再动手',
}

const EMPTY_DRAFT: PromptDraft = {
    label: '',
    prompt: '',
    icon: 'sparkles',
    mode: 'craft',
}

interface PromptEditorDialogProps {
    open: boolean
    draft: PromptDraft | null
    onOpenChange: (open: boolean) => void
    onSubmit: (draft: PromptDraft) => void
}

export function PromptEditorDialog({ open, draft, onOpenChange, onSubmit }: PromptEditorDialogProps): JSX.Element {
    const [form, setForm] = useState<PromptDraft>(draft ?? EMPTY_DRAFT)
    const [isTouched, setIsTouched] = useState(false)
    const [syncSource, setSyncSource] = useState<{ draft: PromptDraft | null; open: boolean }>({ draft, open })

    // 切换编辑对象或重新打开时重置表单：按 React 官方「props 变化时调整 state」模式在渲染期同步，
    // 避免在 effect 中同步 setState 触发额外一轮渲染；条件只成立一次，不会形成循环
    if (syncSource.draft !== draft || syncSource.open !== open) {
        setSyncSource({ draft, open })
        setForm(draft ?? EMPTY_DRAFT)
        setIsTouched(false)
    }

    const isLabelInvalid = isTouched && !form.label.trim()

    const update = <K extends keyof PromptDraft>(key: K, value: PromptDraft[K]): void => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleSubmit = (): void => {
        setIsTouched(true)
        if (!form.label.trim()) {
            return
        }
        onSubmit({
            ...form,
            label: form.label.trim(),
            prompt: form.prompt.trim(),
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{draft?.id ? '编辑提示词' : '新建提示词'}</DialogTitle>
                    <DialogDescription>
                        这段正文会原样发送给 CodeBuddy，建议写成可直接执行的完整指令，并写明禁止项。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-0">
                    <FieldGroup className="gap-3">
                        <Field data-invalid={isLabelInvalid}>
                            <FieldLabel htmlFor="prompt-label">名称</FieldLabel>
                            <Input
                                id="prompt-label"
                                value={form.label}
                                maxLength={40}
                                placeholder="例如：生成单元测试"
                                aria-invalid={isLabelInvalid}
                                onChange={(event) => update('label', event.target.value)}
                            />
                            <FieldError>{isLabelInvalid ? '名称不能为空' : null}</FieldError>
                        </Field>

                        <Field>
                            <FieldTitle>图标</FieldTitle>
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                aria-label="图标"
                                className="flex-wrap"
                                value={form.icon}
                                onValueChange={(value) => {
                                    if (isPromptIconKey(value)) {
                                        update('icon', value)
                                    }
                                }}
                            >
                                {PROMPT_ICON_KEYS.map((key: PromptIconKey) => {
                                    const Icon = PROMPT_ICON_MAP[key]
                                    return (
                                        <ToggleGroupItem
                                            key={key}
                                            value={key}
                                            title={PROMPT_ICON_LABELS[key]}
                                            aria-label={PROMPT_ICON_LABELS[key]}
                                        >
                                            <Icon />
                                        </ToggleGroupItem>
                                    )
                                })}
                            </ToggleGroup>
                        </Field>

                        <Field>
                            <FieldTitle>对话模式</FieldTitle>
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                aria-label="对话模式"
                                value={form.mode}
                                onValueChange={(value) => {
                                    if (isChatMode(value)) {
                                        update('mode', value)
                                    }
                                }}
                            >
                                {CHAT_MODES.map((mode) => (
                                    <ToggleGroupItem key={mode} value={mode}>
                                        {MODE_LABELS[mode]}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <FieldDescription>{MODE_DESCRIPTIONS[form.mode]}</FieldDescription>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="prompt-body">提示词正文</FieldLabel>
                            <InputGroup>
                                <InputGroupTextarea
                                    id="prompt-body"
                                    value={form.prompt}
                                    rows={9}
                                    maxLength={8000}
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
