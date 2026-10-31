/**
 * 提示词卡片：面板中的主要操作单元。
 * 采用 Card 的完整组合（Header / Title / Description / Action），字号与配色由组件与 size 变体承担，调用方只补布局类。
 * 整卡即发送入口——点击卡片任意位置把提示词送进 CodeBuddy 对话框并自动发送；
 * 编辑、复制、排序、删除统一收进右侧「更多」下拉菜单，菜单项按 Group 分组以符合组件契约。
 * 注意：下拉菜单的触发按钮与 Content 都必须阻止冒泡，否则点开菜单或选择菜单项会连带触发一次发送；
 * 卡片悬浮提示走 Tooltip 组件而非原生 title，原生 title 在 Webview 中延迟长且会被侧边栏裁切。
 */
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip'
import type { PromptTemplate } from '@shared/types'
import { PROMPT_ICON_MAP } from '@webview/lib/icons'
import type { JSX } from 'react'

interface PromptCardProps {
    prompt: PromptTemplate
    canMoveUp: boolean
    canMoveDown: boolean
    onRun: (id: string) => void
    onCopy: (id: string) => void
    onEdit: (id: string) => void
    onDelete: (id: string) => void
    onMove: (id: string, direction: 'up' | 'down') => void
}

export function PromptCard({
    prompt,
    canMoveUp,
    canMoveDown,
    onRun,
    onCopy,
    onEdit,
    onDelete,
    onMove,
}: PromptCardProps): JSX.Element {
    const Icon = PROMPT_ICON_MAP[prompt.icon]

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Card
                    size="sm"
                    className="cursor-pointer transition-colors hover:ring-ring/40"
                    onClick={() => onRun(prompt.id)}
                >
                    <CardHeader>
                        <div className="flex min-w-0 items-center gap-1.5">
                            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                            <CardTitle className="truncate">{prompt.label}</CardTitle>
                            {prompt.builtin ? <Badge variant="outline">内置</Badge> : null}
                        </div>
                        <CardAction>
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
                                        <DropdownMenuItem
                                            disabled={!canMoveUp}
                                            onSelect={() => onMove(prompt.id, 'up')}
                                        >
                                            <ArrowUp />
                                            上移
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            disabled={!canMoveDown}
                                            onSelect={() => onMove(prompt.id, 'down')}
                                        >
                                            <ArrowDown />
                                            下移
                                        </DropdownMenuItem>
                                        {!prompt.builtin ? (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive-foreground"
                                                    onSelect={() => onDelete(prompt.id)}
                                                >
                                                    <Trash2 />
                                                    删除
                                                </DropdownMenuItem>
                                            </>
                                        ) : null}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardAction>
                        {prompt.description ? (
                            <CardDescription className="line-clamp-2">{prompt.description}</CardDescription>
                        ) : null}
                    </CardHeader>
                </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">点击发送「{prompt.label}」到 CodeBuddy</TooltipContent>
        </Tooltip>
    )
}
