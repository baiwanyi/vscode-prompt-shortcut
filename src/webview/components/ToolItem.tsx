/**
 * 工具动作条目：与提示词卡片同样式的整行，只保留名称、说明与点击行为。
 * 这类动作不产生对话、不可撤销，也不属于提示词数据，因此不提供编辑/复制/删除菜单；
 * 图标统一使用 AppWindowMac，与提示词可选的语义图标区分开。
 * 注意：说明文字用 ItemDescription 常显而不是 Tooltip——工具区固定在面板底部，两行文案不会挤占提示词列表；
 * 点击即转发给宿主执行，不做延迟撤销，重载窗口等动作没有中间态，延迟只会让人以为没响应。
 */
import { AppWindowMac, ChevronRight } from 'lucide-react'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@components/ui/item'
import type { ToolActionId, ToolActionInfo } from '@shared/types'
import type { JSX } from 'react'

interface ToolItemProps {
    tool: ToolActionInfo
    onRun: (id: ToolActionId) => void
}

export function ToolItem({ tool, onRun }: ToolItemProps): JSX.Element {
    return (
        <Item variant="outline" className="cursor-pointer hover:bg-accent" onClick={(): void => onRun(tool.id)}>
            <ItemMedia variant="icon">
                <AppWindowMac className="text-muted-foreground" />
            </ItemMedia>
            <ItemContent className="min-w-0">
                <ItemTitle className="min-w-0">
                    <span className="truncate">{tool.label}</span>
                </ItemTitle>
                <ItemDescription className="line-clamp-2 text-xs">{tool.description}</ItemDescription>
            </ItemContent>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        </Item>
    )
}
