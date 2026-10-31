/**
 * 图标单选组：图标键的白名单校验收敛在本组件内。
 * 选项来源分两处——键列表来自 shared/types 的 PROMPT_ICON_KEYS，展示名与组件实例来自 lib/icons；
 * 调用方因此只拿到合法的 PromptIconKey，不必再判一次类型。
 * 注意：ToggleGroup 单选允许点击已选项取消（回调收到空串），非法值在这里丢弃，
 * 视觉回弹靠受控 value 保证，不要改成非受控。
 */
import { ToggleGroup, ToggleGroupItem } from '@components/ui/toggle-group'
import type { PromptIconKey } from '@shared/types'
import { PROMPT_ICON_KEYS, isPromptIconKey } from '@shared/types'
import { PROMPT_ICON_LABELS, PROMPT_ICON_MAP } from '@webview/lib/icons'
import type { JSX } from 'react'

interface PromptIconPickerProps {
    value: PromptIconKey
    onChange: (value: PromptIconKey) => void
}

export function PromptIconPicker({ value, onChange }: PromptIconPickerProps): JSX.Element {
    return (
        <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            aria-label="图标"
            className="flex-wrap"
            value={value}
            onValueChange={(next) => {
                if (isPromptIconKey(next)) {
                    onChange(next)
                }
            }}
        >
            {PROMPT_ICON_KEYS.map((key) => {
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
    )
}
