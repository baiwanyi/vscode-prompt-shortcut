/**
 * 单行输入框组件。
 * 复用 VSCode 的 input 主题色与 focusBorder，保证与编辑器原生输入框视觉一致；
 * 注意：不要在组件内部维护 value 状态，受控/非受控一律交给调用方。
 */
import type { InputHTMLAttributes } from 'react';
import { cn } from '@webview/lib/utils';

export function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            type={type}
            className={cn(
                'flex h-7 w-full rounded-md border border-input bg-muted px-2 py-1 text-[13px] text-foreground',
                'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
