/**
 * 对话模式下拉菜单。
 * 模式白名单校验与选项短名都收敛在本组件内，调用方只传当前值与变更回调，不必关心取值是否合法。
 * 注意：触发器与菜单项取同一份标签表，避免两处措辞漂移；新增模式时必须同步 shared/types 的 ChatMode 联合。
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
import type { ChatMode } from '@shared/types'
import { CHAT_MODES, isChatMode } from '@shared/types'
import type { JSX } from 'react'

/** 菜单固定宽度：模式短名比图标名短，比触发器略宽即可容纳三项 */
const MENU_WIDTH = 'w-44'

/** 下拉触发器与菜单项共用的短名，漏写某个模式会直接触发类型检查失败 */
const CHAT_MODE_LABELS: Record<ChatMode, string> = {
    craft: 'Craft',
    ask: 'Ask',
    plan: 'Plan',
}

interface PromptModePickerProps {
    value: ChatMode
    onChange: (value: ChatMode) => void
}

export function PromptModePicker({ value, onChange }: PromptModePickerProps): JSX.Element {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="justify-between" aria-label="对话模式">
                    {CHAT_MODE_LABELS[value]}
                    <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={MENU_WIDTH} align="start">
                <DropdownMenuRadioGroup
                    value={value}
                    onValueChange={(next) => {
                        if (isChatMode(next)) {
                            onChange(next)
                        }
                    }}
                >
                    {CHAT_MODES.map((mode) => (
                        <DropdownMenuRadioItem key={mode} value={mode}>
                            {CHAT_MODE_LABELS[mode]}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
