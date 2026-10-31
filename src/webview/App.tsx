/**
 * 提示词面板根组件。
 * 采用「宿主推送状态 + 本地派生视图」的结构：组件本身不持久化任何数据，
 * 所有写操作通过 postToHost 发送意图，由宿主校验后回推完整列表。
 * 首屏在收到首个 state 之前统一呈现 Spinner 加载态，避免把「尚未读到」误报成空列表。
 * 提示统一交给 sonner 渲染，包含「轮询耗尽仍未检测到 CodeBuddy」这类需要按钮的常驻提示；
 * 注意：编辑弹窗状态与 payload 分开存放，刷新列表时不应关闭正在编辑的弹窗。
 */
import { cn } from 'cn'
import { Info, Search, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PromptCard } from '@components/PromptCard'
import { PromptEditorDialog } from '@components/PromptEditorDialog'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import { Toaster } from '@components/ui/sonner'
import { Spinner } from '@components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip'
import type { HostToWebviewMessage } from '@shared/messages'
import type { PromptDraft, PromptStatePayload, PromptTemplate } from '@shared/types'
import { useHostMessages } from '@webview/hooks/useHostMessages'
import { postToHost } from '@webview/lib/vscode'
import type { JSX } from 'react'

/** 常驻提示的固定 id，检测成功后据此关闭，避免多条堆叠 */
const CODEBUDDY_MISSING_TOAST_ID = 'codebuddy-missing'

interface ConnectionState {
    /** 图标着色类：成功走主色、失败走错误色、未探测到走弱化色 */
    iconClass: string
    /** Tooltip 文案 */
    text: string
}

/** 两态收敛：已连接 / 未检测到，供标题行的小图标使用；首屏加载态由组件内的 Spinner 承担 */
function describeConnection(payload: PromptStatePayload): ConnectionState {
    if (payload.codebuddy.detected) {
        return {
            iconClass: 'text-primary',
            text: payload.codebuddy.autoSend ? '已连接 CodeBuddy（自动发送）' : '已连接 CodeBuddy（仅复制）',
        }
    }
    return {
        iconClass: 'text-destructive-foreground',
        text: '未检测到 CodeBuddy 发送命令，点击时会先尝试激活 CodeBuddy；仍失败才复制到剪贴板。',
    }
}

function toDraft(prompt: PromptTemplate): PromptDraft {
    return {
        id: prompt.id,
        label: prompt.label,
        description: prompt.description,
        prompt: prompt.prompt,
        icon: prompt.icon,
        mode: prompt.mode,
    }
}

export function App(): JSX.Element {
    const [payload, setPayload] = useState<PromptStatePayload | null>(null)
    const [query, setQuery] = useState('')
    const [editing, setEditing] = useState<PromptDraft | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleHostMessage = useCallback(
        (message: HostToWebviewMessage): void => {
            switch (message.type) {
                case 'state':
                    setPayload(message.payload)
                    if (message.payload.codebuddy.detected) {
                        toast.dismiss(CODEBUDDY_MISSING_TOAST_ID)
                    }
                    break
                case 'notify':
                    if (message.level === 'error') {
                        toast.error(message.message)
                    } else if (message.level === 'warn') {
                        toast.warning(message.message)
                    } else {
                        toast.info(message.message)
                    }
                    break
                case 'codebuddyMissing':
                    toast.error('未检测到 CodeBuddy', {
                        id: CODEBUDDY_MISSING_TOAST_ID,
                        description:
                            'CodeBuddy 可能尚未激活或未安装。点击「刷新」重新检测；CodeBuddy 打开后通常会自动恢复。',
                        duration: Infinity,
                        action: {
                            label: '刷新',
                            onClick: () => postToHost({ type: 'requestState' }),
                        },
                    })
                    break
                case 'editPrompt': {
                    const target = payload?.prompts.find((item) => item.id === message.payload.id)
                    setEditing(target ? toDraft(target) : null)
                    setIsDialogOpen(true)
                    break
                }
                default:
                    break
            }
        },
        [payload],
    )

    useHostMessages(handleHostMessage)

    useEffect(() => {
        postToHost({ type: 'ready' })
    }, [])

    const prompts = useMemo(() => payload?.prompts ?? [], [payload])
    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase()
        if (!keyword) {
            return prompts
        }
        return prompts.filter((item) =>
            `${item.label}\n${item.description}\n${item.prompt}`.toLowerCase().includes(keyword),
        )
    }, [prompts, query])

    // 首屏还没收到宿主状态时先给加载态，避免把「尚未读到」误报成「还没有提示词」
    if (!payload) {
        return (
            <>
                <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                    <Spinner className="size-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">正在读取提示词…</p>
                </div>
                <Toaster />
            </>
        )
    }

    const connection = describeConnection(payload)
    const handleSubmit = (draft: PromptDraft): void => {
        postToHost({ type: 'savePrompt', draft })
        setIsDialogOpen(false)
        setEditing(null)
    }

    return (
        <div className="flex h-full flex-col">
            <header className="shrink-0 space-y-2 border-b border-border px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                tabIndex={0}
                                aria-label={connection.text}
                                className="inline-flex size-4 items-center justify-center rounded focus-visible:outline-none"
                            >
                                <Sparkles className={cn('size-3.5', connection.iconClass)} />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{connection.text}</TooltipContent>
                    </Tooltip>
                    <span className="font-semibold">提示词</span>
                    <Badge variant="outline">{prompts.length}</Badge>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        className="h-6 pl-6 text-xs"
                        placeholder="搜索提示词"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </div>
            </header>

            <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1.5 p-2">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                            <Info className="size-5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                                {prompts.length === 0
                                    ? '还没有提示词，点击视图标题栏的 + 新建一条。'
                                    : '没有匹配的提示词。'}
                            </p>
                        </div>
                    ) : (
                        filtered.map((prompt) => {
                            const index = prompts.findIndex((item) => item.id === prompt.id)
                            return (
                                <PromptCard
                                    key={prompt.id}
                                    prompt={prompt}
                                    canMoveUp={!query.trim() && index > 0}
                                    canMoveDown={!query.trim() && index >= 0 && index < prompts.length - 1}
                                    onRun={(id) => postToHost({ type: 'runPrompt', id })}
                                    onCopy={(id) => postToHost({ type: 'copyPrompt', id })}
                                    onEdit={(id) => {
                                        const target = prompts.find((item) => item.id === id)
                                        if (!target) {
                                            return
                                        }
                                        setEditing(toDraft(target))
                                        setIsDialogOpen(true)
                                    }}
                                    onDelete={(id) => postToHost({ type: 'deletePrompt', id })}
                                    onMove={(id, direction) => postToHost({ type: 'movePrompt', id, direction })}
                                />
                            )
                        })
                    )}
                </div>
            </ScrollArea>

            <PromptEditorDialog
                open={isDialogOpen}
                draft={editing}
                onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) {
                        setEditing(null)
                    }
                }}
                onSubmit={handleSubmit}
            />

            <Toaster />
        </div>
    )
}
