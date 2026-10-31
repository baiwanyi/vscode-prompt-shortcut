/**
 * 表单标签（shadcn registry 官方实现）。
 * 基于 Radix Label，点击标签会把焦点交给关联控件。
 * 注意：必须设置 htmlFor 指向控件 id，否则点击不聚焦且屏幕阅读器无法建立关联。
 */
'use client'

import * as React from 'react'
import { cn } from 'cn'
import { Label as LabelPrimitive } from 'radix-ui'

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root
            data-slot="label"
            className={cn(
                'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                className,
            )}
            {...props}
        />
    )
}

export { Label }
