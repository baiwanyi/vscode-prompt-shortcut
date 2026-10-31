/**
 * 分隔线（shadcn registry 官方实现）。
 * 按 orientation 渲染水平或垂直细线，decorative 为 true 时不参与无障碍树。
 * 注意：需要语义分隔时把 decorative 设为 false 并补充 aria-orientation，不要用 div 加 border 代替。
 */
import * as React from 'react'
import { cn } from 'cn'
import { Separator as SeparatorPrimitive } from 'radix-ui'

function Separator({
    className,
    orientation = 'horizontal',
    decorative = true,
    ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
    return (
        <SeparatorPrimitive.Root
            data-slot="separator"
            decorative={decorative}
            orientation={orientation}
            className={cn(
                'shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch',
                className,
            )}
            {...props}
        />
    )
}

export { Separator }
