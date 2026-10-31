/**
 * 模态对话框组件（Radix Dialog 封装）。
 * 提供遮罩、居中容器与可关闭的头部，用于新增/编辑提示词模板，
 * 关闭按钮使用 VSCode 语义色，避免与编辑器主题冲突。
 * 注意：Dialog 默认会锁定焦点并支持 Esc 关闭，调用方不要在外层重复处理键盘事件。
 */
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@webview/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <DialogPrimitive.Content
                className={cn(
                    'fixed left-1/2 top-1/2 z-50 flex w-[min(560px,92vw)] max-h-[86vh] -translate-x-1/2 -translate-y-1/2',
                    'flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl',
                    className,
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close
                    className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="关闭"
                >
                    <X className="h-3.5 w-3.5" />
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('flex flex-col gap-1 border-b border-border px-4 py-3 pr-10', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('flex items-center justify-end gap-2 border-t border-border px-4 py-2.5', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
    return <DialogPrimitive.Title className={cn('text-sm font-semibold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
    return <DialogPrimitive.Description className={cn('text-xs text-muted-foreground', className)} {...props} />;
}
