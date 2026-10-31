/**
 * 状态徽章组件。
 * 用于展示「内置」「已连接 CodeBuddy」等轻量状态标记，颜色令牌全部来自主题；
 * 注意：徽章只承载状态，不参与交互，不要在其上绑定点击事件。
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@webview/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-primary/15 text-foreground',
                outline: 'border-border text-muted-foreground',
                success: 'border-transparent bg-primary/15 text-primary',
                warning: 'border-transparent bg-secondary text-muted-foreground',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
