/**
 * 面板头部：连接状态指示、标题计数与按需展开的搜索。
 * 搜索默认收起，只保留右侧图标；点击后在标题行位置覆盖展开，避免常驻输入框占用侧边栏高度。
 * 注意：覆盖层必须给不透明背景，否则下层标题会透出；收起时清空关键词，
 * 避免列表停留在筛选状态而搜索入口已消失；Esc 与「失焦且关键词为空」都会收起。
 */
import { cn } from 'cn'
import { Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@components/ui/input-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip'
import type { CodeBuddyStatus } from '@shared/types'
import type { JSX } from 'react'

interface ConnectionState {
    /** 图标着色类：成功走主色、失败走错误色 */
    iconClass: string
    /** Tooltip 文案 */
    text: string
}

/** 两态收敛：已连接 / 未检测到；首屏加载态由面板主体的加载占位承担 */
function describeConnection(codebuddy: CodeBuddyStatus): ConnectionState {
    if (codebuddy.detected) {
        return {
            iconClass: 'text-info',
            text: codebuddy.autoSend ? '已连接 CodeBuddy（自动发送）' : '已连接 CodeBuddy（仅复制）',
        }
    }
    return {
        iconClass: 'text-destructive-foreground',
        text: '未检测到 CodeBuddy 发送命令，点击时会先尝试激活 CodeBuddy；仍失败才复制到剪贴板。',
    }
}

interface PanelHeaderProps {
    codebuddy: CodeBuddyStatus
    /** 提示词总数，展示在标题右侧 */
    count: number
    query: string
    onQueryChange: (value: string) => void
}

export function PanelHeader({ codebuddy, count, query, onQueryChange }: PanelHeaderProps): JSX.Element {
    const connection = describeConnection(codebuddy)
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    /** 收起搜索：连同关键词一起清空，否则列表会停在筛选态而入口已不可见 */
    const closeSearch = (): void => {
        setIsSearchOpen(false)
        if (query) {
            onQueryChange('')
        }
    }

    return (
        <header className="shrink-0 px-3">
            <div className="relative flex h-9 items-center gap-1.5">
                <div className={cn('flex min-w-0 items-center gap-1.5', isSearchOpen && 'invisible')}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Sparkles className={cn('size-4', connection.iconClass)} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{connection.text}</TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">提示词</span>
                    <Badge variant="secondary">{count}</Badge>
                </div>

                {isSearchOpen ? (
                    <InputGroup className="absolute inset-0 z-10 bg-background">
                        <InputGroupAddon align="inline-start">
                            <Search />
                        </InputGroupAddon>
                        <InputGroupInput
                            autoFocus
                            value={query}
                            placeholder="搜索提示词"
                            aria-label="搜索提示词"
                            onChange={(event) => onQueryChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    closeSearch()
                                }
                            }}
                            onBlur={() => {
                                if (!query) {
                                    setIsSearchOpen(false)
                                }
                            }}
                        />
                    </InputGroup>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-muted-foreground"
                        aria-label="搜索提示词"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <Search className="size-4" />
                    </Button>
                )}
            </div>
        </header>
    )
}
