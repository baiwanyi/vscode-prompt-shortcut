/**
 * 对话模式单选组 + 当前模式的一句话语义。
 * 模式白名单校验收敛在本组件内，短名与语义文案来自 lib/chat-mode-meta；
 * 调用方只传当前值与变更回调，不必关心取值是否合法。
 * 注意：单选模式允许点击已选项取消（回调收到空串），非法值在这里丢弃，
 * 视觉回弹靠受控 value 保证；说明文字必须跟随 value 而不是点击项。
 */
import { FieldDescription } from '@components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@components/ui/toggle-group'
import type { ChatMode } from '@shared/types'
import { CHAT_MODES, isChatMode } from '@shared/types'
import { CHAT_MODE_DESCRIPTIONS, CHAT_MODE_LABELS } from '@webview/lib/chat-mode-meta'
import type { JSX } from 'react'

interface PromptModePickerProps {
    value: ChatMode
    onChange: (value: ChatMode) => void
}

export function PromptModePicker({ value, onChange }: PromptModePickerProps): JSX.Element {
    return (
        <>
            <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                aria-label="对话模式"
                value={value}
                onValueChange={(next) => {
                    if (isChatMode(next)) {
                        onChange(next)
                    }
                }}
            >
                {CHAT_MODES.map((mode) => (
                    <ToggleGroupItem key={mode} value={mode}>
                        {CHAT_MODE_LABELS[mode]}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <FieldDescription>{CHAT_MODE_DESCRIPTIONS[value]}</FieldDescription>
        </>
    )
}
