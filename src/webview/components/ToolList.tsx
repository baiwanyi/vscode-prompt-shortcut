/**
 * 面板底部的工具分区：与提示词列表分开，固定在面板下沿。
 * 分区定位参考现有视觉顺序——提示词在上滚动，环境维护动作在下常驻，列表滚动时工具项不随之移动。
 * 注意：没有工具项时整块不渲染，避免在列表下方留一条孤立的分隔线；
 * 左右内距与 PromptList 的 px-3 对齐，保证两类条目的边缘齐平。
 */
import { ToolItem } from '@components/ToolItem'
import { ItemGroup } from '@components/ui/item'
import type { ToolActionId, ToolActionInfo } from '@shared/types'
import type { JSX } from 'react'

interface ToolListProps {
    /** 上下发的顺序渲染，本层不排序也不过滤 */
    tools: ToolActionInfo[]
    onRun: (id: ToolActionId) => void
}

export function ToolList({ tools, onRun }: ToolListProps): JSX.Element | null {
    if (tools.length === 0) {
        return null
    }

    return (
        <ItemGroup className="shrink-0 p-3 gap-2">
            {tools.map((tool) => (
                <ToolItem key={tool.id} tool={tool} onRun={onRun} />
            ))}
        </ItemGroup>
    )
}
