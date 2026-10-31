/**
 * 提示词条目（PromptItem）：面板列表中的最小可操作单元。
 * 采用 Item 的组合结构（Media / Content / Actions），整行即发送入口；
 * 延迟与撤销交给 useDelayedAction，操作菜单交给 PromptItemMenu，本组件只负责布局与状态呈现。
 * 注意：发送会新建 CodeBuddy 会话且不可撤销，故点击后留出一段可撤销窗口，
 * 窗口内再次点击或展开「更多」菜单都会撤销；位置能力由列表通过 canMove 注入，条目自身不保存序号。
 */
import { cn } from 'cn'
import { ChevronRight, Timer } from 'lucide-react'
import { PromptItemMenu } from '@components/PromptItemMenu'
import { Badge } from '@components/ui/badge'
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@components/ui/item'
import type { MoveDirection, PromptTemplate } from '@shared/types'
import { useDelayedAction } from '@webview/hooks/useDelayedAction'
import { PROMPT_ICON_MAP } from '@webview/lib/icons'
import type { JSX } from 'react'

/** 点击到发送之间的等待窗口：覆盖误触与双击间隔，给用户留出撤销机会 */
const RUN_DELAY_MS = 500

interface PromptItemProps {
    prompt: PromptTemplate
    /** 能否朝指定方向移动；位置规则由列表持有，条目只负责询问 */
    canMove: (direction: MoveDirection) => boolean
    onRun: (id: string) => void
    onCopy: (id: string) => void
    onEdit: (id: string) => void
    onDelete: (id: string) => void
    /** 仅内置模板可用：把该条恢复为出厂内容 */
    onRestore: (id: string) => void
    onMove: (id: string, direction: MoveDirection) => void
}

export function PromptItem({
    prompt,
    canMove,
    onRun,
    onCopy,
    onEdit,
    onDelete,
    onRestore,
    onMove,
}: PromptItemProps): JSX.Element {
    const Icon = PROMPT_ICON_MAP[prompt.icon]

    const runPrompt = (): void => {
        onRun(prompt.id)
    }
    const { isPending, toggle, cancel } = useDelayedAction(RUN_DELAY_MS, runPrompt)

    return (
        <Item
            variant="outline"
            className={cn('cursor-pointer', isPending ? 'bg-accent' : 'hover:bg-accent')}
            onClick={toggle}
        >
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
                <PromptItemMenu
                    label={prompt.label}
                    isBuiltin={prompt.builtin}
                    canMove={canMove}
                    onOpen={cancel}
                    onEdit={(): void => onEdit(prompt.id)}
                    onCopy={(): void => onCopy(prompt.id)}
                    onMove={(direction): void => onMove(prompt.id, direction)}
                    onRestore={(): void => onRestore(prompt.id)}
                    onDelete={(): void => onDelete(prompt.id)}
                />
            </ItemActions>
            {isPending ? (
                <Timer className="size-3.5 shrink-0 animate-pulse text-foreground" />
            ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )}
        </Item>
    )
}
