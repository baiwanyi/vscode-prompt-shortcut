/**
 * 面板头部的存储用量徽章：徽章显示整数百分比，Tooltip 补充具体 KB 数值。
 * 百分比与 KB 都由 shared/promptCapacity 折算，与保存拦截、编辑器容量行共用同一口径。
 * 注意：满容时才切 destructive，常态保持 outline；Tooltip 的 Provider 由 main.tsx 统一提供，本组件不重复包裹；
 * 提示由 useAutoDismissTooltip 计时收起，与面板内其余 Tooltip 行为一致。
 */
import { Badge } from '@components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip'
import { CAPACITY_LIMIT_KB, capacityKb, capacityPercent } from '@shared/promptCapacity'
import { useAutoDismissTooltip } from '@webview/hooks/useAutoDismissTooltip'
import type { JSX } from 'react'

/** 百分比封顶值：达到它就是满容，与 isCapacityFull 的判定同源 */
const FULL_PERCENT = 100

interface PanelHeaderCapacityProps {
    /** 整份列表序列化后的字节数，来自宿主推送的 state */
    usedBytes: number
}

export function PanelHeaderCapacity({ usedBytes }: PanelHeaderCapacityProps): JSX.Element {
    const percent = capacityPercent(usedBytes)
    const tooltip = useAutoDismissTooltip()
    return (
        <Tooltip open={tooltip.isOpen} onOpenChange={tooltip.onOpenChange}>
            <TooltipTrigger asChild>
                <Badge
                    variant={percent >= FULL_PERCENT ? 'destructive' : 'outline'}
                    className="cursor-pointer hover:border-primary"
                >
                    {percent}%
                </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                已用 {capacityKb(usedBytes)} KB / {CAPACITY_LIMIT_KB} KB
            </TooltipContent>
        </Tooltip>
    )
}
