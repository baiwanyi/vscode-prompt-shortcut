/**
 * 提示词条目（PromptItem）：面板列表中的最小可操作单元。
 * 采用 Item 的组合结构（Media / Content / Actions），整行即发送入口；
 * 延迟与撤销交给 useDelayedAction，操作菜单交给 PromptItemMenu，本组件只负责布局与状态呈现。
 * 注意：发送会新建 CodeBuddy 会话且不可撤销，故点击后留出一段可撤销窗口，窗口内再次点击或展开「更多」菜单都会撤销；
 * 菜单开合会刷新时间戳，用于吞掉紧随其后的整行点击（Radix 打开菜单时 preventDefault，click 可能落到行容器上），
 * 否则「点更多」会被当成一次发送；位置能力由列表通过 canMove 注入，条目自身不保存序号。
 */
import { cn } from 'cn'
import { ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { PromptItemMenu } from '@components/PromptItemMenu'
import { Badge } from '@components/ui/badge'
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@components/ui/item'
import { Spinner } from '@components/ui/spinner'
import type { MoveDirection, PromptTemplate } from '@shared/types'
import { useDelayedAction } from '@webview/hooks/useDelayedAction'
import { PROMPT_ICON_MAP } from '@webview/lib/icons'
import type { JSX, MouseEvent } from 'react'

/** 点击到发送之间的等待窗口：覆盖误触与双击间隔，给用户留出撤销机会 */
const RUN_DELAY_MS = 500

/** 菜单开合后的保护窗口：此期间的整行点击视为菜单交互，不进入发送倒计时 */
const MENU_GUARD_MS = 300

/** 行内交互元素自己处理点击，命中这些节点时不触发整行发送 */
const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, [role="menu"], [role="menuitem"]'

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
    const menuTouchedAtRef = useRef(0)

    // 菜单开合都刷新时间戳：Radix 在 pointerdown 打开菜单时会 preventDefault，
    // 随之派发的 click 可能落到整行容器上，不拦就会把「点更多」当成一次发送
    const handleMenuOpenChange = (open: boolean): void => {
        menuTouchedAtRef.current = Date.now()
        if (open) {
            cancel()
        }
    }

    const handleRowClick = (event: MouseEvent<HTMLDivElement>): void => {
        if (Date.now() - menuTouchedAtRef.current < MENU_GUARD_MS) {
            return
        }
        const target = event.target
        if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) {
            return
        }
        toggle()
    }

    return (
        <Item
            variant="outline"
            className={cn('cursor-pointer', isPending ? 'bg-accent' : 'hover:bg-accent')}
            onClick={handleRowClick}
        >
            <ItemMedia variant="icon">
                <Icon className="text-muted-foreground" />
            </ItemMedia>
            <ItemContent className="min-w-0">
                <ItemTitle className="min-w-0">
                    <span className="truncate">{prompt.label}</span>
                    {prompt.builtin ? <Badge variant="outline" className="text-xs font-light">内置</Badge> : null}
                </ItemTitle>
            </ItemContent>
            <ItemActions onClick={(event): void => event.stopPropagation()}>
                <PromptItemMenu
                    label={prompt.label}
                    isBuiltin={prompt.builtin}
                    canMove={canMove}
                    onOpenChange={handleMenuOpenChange}
                    onEdit={(): void => onEdit(prompt.id)}
                    onCopy={(): void => onCopy(prompt.id)}
                    onMove={(direction): void => onMove(prompt.id, direction)}
                    onRestore={(): void => onRestore(prompt.id)}
                    onDelete={(): void => onDelete(prompt.id)}
                />
            </ItemActions>
            {isPending ? (
                <Spinner className="size-3.5 shrink-0 text-foreground" />
            ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )}
        </Item>
    )
}
