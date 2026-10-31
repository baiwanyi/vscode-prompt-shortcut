/**
 * 基础按钮组件（shadcn/ui Button 的 Tailwind CSS 4 迁移版）。
 * 使用 cva 维护 variant / size 组合，所有语义色走 @theme 中的 VSCode 主题令牌；
 * 注意：需要渲染为链接或自定义元素时通过 asChild 交给 Radix Slot，避免 button 嵌套造成可访问性问题。
 */
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@webview/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:opacity-90',
                secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
                outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                destructive: 'text-destructive-foreground hover:bg-destructive/20',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-7 px-2.5 py-1',
                sm: 'h-6 px-2 text-xs',
                lg: 'h-8 px-3',
                icon: 'h-6 w-6 p-0',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
    const Comp = asChild ? Slot : 'button';
    return (
        <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            {...(asChild ? {} : { type: type ?? 'button' })}
            {...props}
        />
    );
}

export { buttonVariants };
