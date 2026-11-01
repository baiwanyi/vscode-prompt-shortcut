/**
 * 破坏性操作的二次确认对话框。
 * 只在面板内使用，外观与「取消 / 执行」两条路径固定，业务差异全部由调用方以 props 注入，
 * 因此恢复单条内置正文与整体重置可以共用同一套交互，不必各写一遍 Dialog 结构。
 * 注意：DialogTitle 必须保留，Radix 依赖它做可访问性标注；
 * 关闭按钮刻意隐藏，Esc、遮罩点击与「取消」按钮统一走 onOpenChange(false)，清理逻辑只需写在一处。
 */
import { Button } from '@components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@components/ui/dialog'
import type { JSX } from 'react'

interface ConfirmDialogProps {
    open: boolean
    title: string
    description: string
    confirmLabel: string
    /** 关闭弹窗（取消、Esc、点遮罩都会走到这里）：由调用方清理待确认状态 */
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    onOpenChange,
    onConfirm,
}: ConfirmDialogProps): JSX.Element {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="px-2 py-4">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button variant="destructive" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
