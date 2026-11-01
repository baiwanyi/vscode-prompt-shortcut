/**
 * 面板头部：连接状态指示、标题计数与按需展开的搜索。
 * 连接语义由 lib/connection-state 产出、展开态由 useSearchOverlay 承接，本组件只做布局装配。
 * 注意：覆盖层必须给不透明背景，否则下层标题会透出；展开时标题行用 invisible 保留占位，
 * 不能改成条件渲染，否则行宽/行高跳动会让搜索框位移。
 */
import { cn } from 'cn'
import { PanelHeaderCapacity } from '@components/PanelHeaderCapacity'
import { PanelHeaderConnection } from '@components/PanelHeaderConnection'
import { PanelHeaderSearch } from '@components/PanelHeaderSearch'
import { Badge } from '@components/ui/badge'
import type { CodeBuddyStatus } from '@shared/types'
import { useSearchOverlay } from '@webview/hooks/useSearchOverlay'
import { describeConnection } from '@webview/lib/connection-state'
import type { JSX } from 'react'

interface PanelHeaderProps {
    codebuddy: CodeBuddyStatus
    /** 提示词总数，展示在标题右侧 */
    count: number
    /** 存储用量字节数，交给容量徽章折算成百分比与 KB */
    usedBytes: number
    query: string
    onQueryChange: (value: string) => void
}

export function PanelHeader({ codebuddy, count, usedBytes, query, onQueryChange }: PanelHeaderProps): JSX.Element {
    const connection = describeConnection(codebuddy)
    const search = useSearchOverlay(query, onQueryChange)

    return (
        <header className="shrink-0 px-3">
            <div className="relative flex h-9 items-center gap-1.5">
                <div className={cn('flex min-w-0 items-center gap-1.5', search.isOpen && 'invisible')}>
                    <PanelHeaderConnection tone={connection.tone} text={connection.text} />
                    <span className="font-semibold">提示词</span>
                    <Badge variant="secondary">{count}</Badge>
                    <PanelHeaderCapacity usedBytes={usedBytes} />
                </div>

                <PanelHeaderSearch search={search} query={query} onQueryChange={onQueryChange} />
            </div>
        </header>
    )
}
