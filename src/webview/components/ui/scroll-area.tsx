/**
 * 自定义滚动容器。
 * 用 Radix ScrollArea 统一滚动条样式，避免 Webview 内默认滚动条与编辑器风格割裂；
 * 注意：容器必须显式设置高度（父级 flex-1 + min-h-0），否则不会产生内部滚动。
 */
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import type { ComponentProps } from 'react';
import { cn } from '@webview/lib/utils';

export function ScrollArea({ className, children, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
    return (
        <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden', className)} {...props}>
            <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
                orientation="vertical"
                className="flex touch-none select-none p-0.5 transition-colors"
            >
                <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollAreaPrimitive.Scrollbar>
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
}
