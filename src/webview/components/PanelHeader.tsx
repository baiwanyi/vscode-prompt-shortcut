/**
 * 面板头部：连接状态指示、标题计数与搜索框。
 * 连接文案由 CodeBuddyStatus 收敛为两态（已连接 / 未检测到），首屏加载态不经过本组件。
 * 注意：状态图标用 Tooltip 承载说明并保持键盘可达（tabIndex + aria-label）；
 * 文案需覆盖「自动发送 / 仅复制」的差异，否则用户会误判点击后的实际行为。
 */
import { cn } from 'cn'
import { Search, Sparkles } from 'lucide-react'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
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
            iconClass: 'text-primary',
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

    return (
        <header className="shrink-0 space-y-2 border-b border-border px-2.5 py-2">
            <div className="flex items-center gap-1.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                            tabIndex={0}
                            aria-label={connection.text}
                            className="inline-flex size-4 items-center justify-center rounded focus-visible:outline-none"
                        >
                            <Sparkles className={cn('size-3.5', connection.iconClass)} />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{connection.text}</TooltipContent>
                </Tooltip>
                <span className="font-semibold">提示词</span>
                <Badge variant="secondary">{count}</Badge>
            </div>

            <div className="relative">
                <Search className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={query}
                    className="h-6 pl-6 text-xs"
                    placeholder="搜索提示词"
                    onChange={(event) => onQueryChange(event.target.value)}
                />
            </div>
        </header>
    )
}
