/**
 * 图标选择下拉菜单：图标键的白名单校验收敛在本组件内。
 * 选项来源分两处——键列表来自 shared/types 的 PROMPT_ICON_KEYS，展示名与组件实例来自 lib/icons；
 * 单选语义交给 DropdownMenuRadioGroup，选中项由组件自带的勾选指示呈现。
 * 注意：触发器展示的是当前 value 对应的图标与名称，因此必须受控；非法值在这里丢弃，不要下放给调用方判断。
 */
import { ChevronDown } from 'lucide-react'
import { Button } from '@components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import type { PromptIconKey } from '@shared/types'
import { PROMPT_ICON_KEYS, isPromptIconKey } from '@shared/types'
import { PROMPT_ICON_LABELS, PROMPT_ICON_MAP } from '@webview/lib/icons'
import type { JSX } from 'react'

/** 菜单固定宽度：Content 默认与触发器同宽，8 个图标名需要更宽才不折行 */
const MENU_WIDTH = 'w-40'

interface PromptIconPickerProps {
    value: PromptIconKey
    onChange: (value: PromptIconKey) => void
}

export function PromptIconPicker({ value, onChange }: PromptIconPickerProps): JSX.Element {
    const CurrentIcon = PROMPT_ICON_MAP[value]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="justify-between" aria-label="图标">
                    <div className="flex items-center gap-1.5">
                        <CurrentIcon data-icon="inline-start" />
                        {PROMPT_ICON_LABELS[value]}
                    </div>
                    <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={MENU_WIDTH} align="start">
                <DropdownMenuRadioGroup
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
                            <DropdownMenuRadioItem key={key} value={key}>
                                <Icon />
                                {PROMPT_ICON_LABELS[key]}
                            </DropdownMenuRadioItem>
                        )
                    })}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
