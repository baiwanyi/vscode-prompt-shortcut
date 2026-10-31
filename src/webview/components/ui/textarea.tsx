/**
 * 多行文本域组件。
 * 用于编辑提示词正文，保留纵向自适应高度与等宽字体选项由调用方通过 className 覆盖；
 * 注意：垂直方向使用 resize-y，避免用户横向拖拽破坏侧边栏窄布局。
 */
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@webview/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                'flex min-h-[96px] w-full resize-y rounded-md border border-input bg-muted px-2 py-1.5 text-[13px]',
                'leading-relaxed text-foreground placeholder:text-muted-foreground',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
