/**
 * 表单标签组件。
 * 基于 Radix Label 保证点击标签可聚焦关联控件，提升键盘可达性；
 * 注意：必须通过 htmlFor 与控件 id 对应，否则失去点击聚焦语义。
 */
import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentProps } from 'react';
import { cn } from '@webview/lib/utils';

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root
            className={cn('text-xs font-medium text-muted-foreground select-none', className)}
            {...props}
        />
    );
}
