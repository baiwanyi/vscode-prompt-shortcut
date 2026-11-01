/**
 * 提示词条目的「更多」操作菜单。
 * 只负责展示与回调：条目 id 由调用方在回调里绑定，因此本组件不依赖 PromptTemplate 的结构。
 * 菜单项用配置数组渲染，分组由 isGroupStart 标记，新增一项只改数组一处。
 * 注意：下拉内容由 Radix Portal 渲染到 body 下，天然不会冒泡到整行的点击处理；
 * 触发按钮仍在原 DOM 树内，除了自身阻止冒泡，还要把开合事件交给调用方去挡住点击穿透。
 */
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Fragment } from 'react'
import { Button } from '@components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import type { MoveDirection } from '@shared/types'
import type { JSX } from 'react'

/** 单个菜单项的配置：图标、文案、可用性与选中行为都在这里描述 */
interface MenuEntry {
    key: string
    icon: typeof Pencil
    label: string
    isDisabled?: boolean
    isDestructive?: boolean
    /** 在该项之前插入分组分隔线 */
    isGroupStart?: boolean
    onSelect: () => void
}

export interface PromptItemMenuProps {
    label: string
    isBuiltin: boolean
    canMove: (direction: MoveDirection) => boolean
    onEdit: () => void
    onCopy: () => void
    onMove: (direction: MoveDirection) => void
    onRestore: () => void
    onDelete: () => void
    /** 菜单开合通知：展开时撤销待发状态，收起时也要让调用方挡住点击穿透 */
    onOpenChange: (open: boolean) => void
}

export function PromptItemMenu({
    label,
    isBuiltin,
    canMove,
    onEdit,
    onCopy,
    onMove,
    onRestore,
    onDelete,
    onOpenChange,
}: PromptItemMenuProps): JSX.Element {
    const entries: MenuEntry[] = [
        { key: 'edit', icon: Pencil, label: '编辑', onSelect: onEdit },
        { key: 'copy', icon: Copy, label: '复制提示词', onSelect: onCopy },
        {
            key: 'move-up',
            icon: ArrowUp,
            label: '上移',
            isGroupStart: true,
            isDisabled: !canMove('up'),
            onSelect: (): void => {
                onMove('up')
            },
        },
        {
            key: 'move-down',
            icon: ArrowDown,
            label: '下移',
            isDisabled: !canMove('down'),
            onSelect: (): void => {
                onMove('down')
            },
        },
        isBuiltin
            ? { key: 'restore', icon: RotateCcw, label: '恢复默认', isGroupStart: true, onSelect: onRestore }
            : {
                  key: 'delete',
                  icon: Trash2,
                  label: '删除',
                  isGroupStart: true,
                  isDestructive: true,
                  onSelect: onDelete,
              },
    ]

    return (
        <DropdownMenu onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                    aria-label={`「${label}」的更多操作`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    {entries.map((entry) => {
                        const Icon = entry.icon
                        return (
                            <Fragment key={entry.key}>
                                {entry.isGroupStart ? <DropdownMenuSeparator /> : null}
                                <DropdownMenuItem
                                    disabled={entry.isDisabled ?? false}
                                    variant={entry.isDestructive ? 'destructive' : 'default'}
                                    onSelect={entry.onSelect}
                                >
                                    <Icon />
                                    {entry.label}
                                </DropdownMenuItem>
                            </Fragment>
                        )
                    })}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
