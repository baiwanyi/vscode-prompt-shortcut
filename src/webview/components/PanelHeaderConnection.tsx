/**
 * 面板头部的连接状态指示：图标 + Tooltip 文案，只负责呈现。
 * tone 语义由 lib/connection-state 的纯函数产出，颜色映射留在本组件的模块级常量里，
 * 样式令牌调整因此不必回改领域逻辑。
 * 注意：Tooltip 的 Provider 由 main.tsx 统一提供，本组件不重复包裹。
 */
import { cn } from 'cn'
import { Sparkles } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip'
import type { ConnectionTone } from '@webview/lib/connection-state'
import type { JSX } from 'react'

/** tone 到图标颜色的映射：模块级常量，避免渲染期创建对象字面量 */
const CONNECTION_ICON_CLASS: Record<ConnectionTone, string> = {
    connected: 'text-info',
    missing: 'text-destructive-foreground',
}

interface PanelHeaderConnectionProps {
    tone: ConnectionTone
    /** Tooltip 文案，由 describeConnection 产出 */
    text: string
}

export function PanelHeaderConnection({ tone, text }: PanelHeaderConnectionProps): JSX.Element {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Sparkles className={cn('size-4', CONNECTION_ICON_CLASS[tone])} />
            </TooltipTrigger>
            <TooltipContent side="bottom">{text}</TooltipContent>
        </Tooltip>
    )
}
