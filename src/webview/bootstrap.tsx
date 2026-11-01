/**
 * 提示词面板引导组件（bootstrap）：把数据订阅、编辑状态与展示组件装配成完整面板。
 * 采用「宿主推送状态 + 本地派生视图」的结构：组件本身不持久化任何数据，
 * 所有写操作通过 postToHost 发送意图，由宿主校验后回推完整列表。
 * 首屏在收到首个 state 之前统一呈现加载占位，避免把「尚未读到」误报成空列表。
 * 恢复默认这类破坏性操作先在面板内的 ConfirmDialog 确认，确认后才把意图发给宿主；
 * 命令面板触发的整体重置也落到同一个 dialog，宿主只负责把请求排进握手队列。
 * 注意：Toaster 只挂载一次且位于内容分支之外，否则加载态与列表态切换会连带卸载常驻提示；
 * 搜索关键词属于视图状态留在本层，数据态与编辑态分别交给 usePromptState 与 usePromptEditor。
 */
import { useCallback, useMemo, useState } from 'react'
import { ConfirmDialog } from '@components/ConfirmDialog'
import { PanelHeader } from '@components/PanelHeader'
import { PromptEditorDialog } from '@components/PromptEditorDialog'
import { PromptList } from '@components/PromptList'
import { Toaster } from '@components/ui/sonner'
import { Spinner } from '@components/ui/spinner'
import type { HostToWebviewMessage } from '@shared/messages'
import { useHostMessages } from '@webview/hooks/useHostMessages'
import { usePromptEditor } from '@webview/hooks/usePromptEditor'
import { usePromptState } from '@webview/hooks/usePromptState'
import { filterPrompts } from '@webview/lib/prompt-filter'
import { postToHost } from '@webview/lib/vscode'
import type { JSX } from 'react'

/** 待确认的破坏性操作：单条恢复需要带上名称，整体重置不需要额外参数 */
type PendingConfirm = { kind: 'restore'; id: string; label: string } | { kind: 'resetAll' }

/** 确认文案随场景切换：两种入口共用同一个弹窗，只有措辞与按钮名不同 */
function resolveCopy(pending: PendingConfirm): { title: string; description: string; confirmLabel: string } {
    if (pending.kind === 'resetAll') {
        return {
            title: '恢复默认提示词',
            description: '会删除全部自定义模板，只保留内置提示词的出厂内容。此操作不可撤销。',
            confirmLabel: '恢复默认',
        }
    }
    return {
        title: '恢复默认内容',
        description: `将「${pending.label}」恢复为出厂内容？当前的修改会丢失。`,
        confirmLabel: '恢复',
    }
}

export function Bootstrap(): JSX.Element {
    const [query, setQuery] = useState('')
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
    const payload = usePromptState()
    const prompts = useMemo(() => payload?.prompts ?? [], [payload])
    const { items, isFiltering } = useMemo(() => filterPrompts(prompts, query), [prompts, query])
    const { editing, isOpen, openEdit, closeDialog, submit } = usePromptEditor(prompts)

    // 命令面板的整体重置不在面板内，宿主只下发请求，确认动作仍由这里的 dialog 承担
    const handleHostMessage = useCallback((message: HostToWebviewMessage): void => {
        if (message.type === 'confirmResetAll') {
            setPendingConfirm({ kind: 'resetAll' })
        }
    }, [])
    useHostMessages(handleHostMessage)

    const requestRestore = useCallback(
        (id: string): void => {
            const target = prompts.find((item) => item.id === id)
            if (!target) {
                return
            }
            setPendingConfirm({ kind: 'restore', id, label: target.label })
        },
        [prompts],
    )

    const handleConfirm = (): void => {
        if (!pendingConfirm) {
            return
        }
        if (pendingConfirm.kind === 'resetAll') {
            postToHost({ type: 'resetAll' })
        } else {
            postToHost({ type: 'resetPrompt', id: pendingConfirm.id })
        }
        setPendingConfirm(null)
    }

    const copy = pendingConfirm ? resolveCopy(pendingConfirm) : null

    return (
        <div className="flex h-full flex-col">
            {payload ? (
                <>
                    <PanelHeader
                        codebuddy={payload.codebuddy}
                        count={prompts.length}
                        usedBytes={payload.usedBytes}
                        query={query}
                        onQueryChange={setQuery}
                    />
                    <PromptList
                        prompts={prompts}
                        items={items}
                        isFiltering={isFiltering}
                        onRun={(id) => postToHost({ type: 'runPrompt', id })}
                        onCopy={(id) => postToHost({ type: 'copyPrompt', id })}
                        onEdit={openEdit}
                        onDelete={(id) => postToHost({ type: 'deletePrompt', id })}
                        onRestore={requestRestore}
                        onMove={(id, direction) => postToHost({ type: 'movePrompt', id, direction })}
                    />
                </>
            ) : (
                <div className="flex min-h-0 flex-1 justify-center p-3">
                    <Spinner className="size-5 text-muted-foreground" />
                </div>
            )}

            <PromptEditorDialog
                open={isOpen}
                draft={editing}
                prompts={prompts}
                usedBytes={payload?.usedBytes ?? 0}
                onOpenChange={(open) => {
                    if (!open) {
                        closeDialog()
                    }
                }}
                onSubmit={submit}
            />

            <ConfirmDialog
                open={pendingConfirm !== null}
                title={copy?.title ?? ''}
                description={copy?.description ?? ''}
                confirmLabel={copy?.confirmLabel ?? ''}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingConfirm(null)
                    }
                }}
                onConfirm={handleConfirm}
            />

            <Toaster />
        </div>
    )
}
