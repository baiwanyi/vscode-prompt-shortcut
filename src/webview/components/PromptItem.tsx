/**
 * 提示词条目（PromptItem）：面板列表中的最小可操作单元。
 * 采用 Item 的组合结构（Media / Content / Actions），整行即发送入口，点击任意位置把提示词送进 CodeBuddy。
 * 编辑、复制、排序、删除收进右侧「更多」下拉菜单，菜单项按 Group 分组以符合组件契约。
 * 注意：下拉菜单的触发按钮与 Content 都必须阻止冒泡，否则点开菜单或选择菜单项会连带触发一次发送；
 * 条目不再挂 Tooltip —— 行内的名称与箭头已足够表达「点击即发送」，原生 title 在 Webview 中延迟长且会被裁切。
 */
import { ArrowDown, ArrowUp, ChevronRight, Copy, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@components/ui/item'
import type { PromptTemplate } from '@shared/types'
import { PROMPT_ICON_MAP } from '@webview/lib/icons'
import type { JSX } from 'react'

interface PromptItemProps {
    prompt: PromptTemplate
    canMoveUp: boolean
    canMoveDown: boolean
    onRun: (id: string) => void
    onCopy: (id: string) => void
    onEdit: (id: string) => void
    onDelete: (id: string) => void
    /** 仅内置模板可用：把该条恢复为出厂内容 */
    onRestore: (id: string) => void
    onMove: (id: string, direction: 'up' | 'down') => void
}

export function PromptItem({
    prompt,
    canMoveUp,
    canMoveDown,
    onRun,
    onCopy,
    onEdit,
    onDelete,
    onRestore,
    onMove,
}: PromptItemProps): JSX.Element {
    const Icon = PROMPT_ICON_MAP[prompt.icon]

    return (
        <Item variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => onRun(prompt.id)}>
            <ItemMedia variant="icon">
                <Icon className="text-muted-foreground" />
            </ItemMedia>
            <ItemContent className="min-w-0">
                <ItemTitle className="min-w-0">
                    <span className="truncate">{prompt.label}</span>
                    {prompt.builtin ? <Badge variant="outline">内置</Badge> : null}
                </ItemTitle>
            </ItemContent>
            <ItemActions>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground"
                            aria-label={`「${prompt.label}」的更多操作`}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenuGroup>
                            <DropdownMenuItem onSelect={() => onEdit(prompt.id)}>
                                <Pencil />
                                编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onCopy(prompt.id)}>
                                <Copy />
                                复制提示词
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!canMoveUp} onSelect={() => onMove(prompt.id, 'up')}>
                                <ArrowUp />
                                上移
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canMoveDown} onSelect={() => onMove(prompt.id, 'down')}>
                                <ArrowDown />
                                下移
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {prompt.builtin ? (
                                <DropdownMenuItem onSelect={() => onRestore(prompt.id)}>
                                    <RotateCcw />
                                    恢复默认
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(prompt.id)}>
                                    <Trash2 />
                                    删除
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </ItemActions>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        </Item>
    )
}
