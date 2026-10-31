/**
 * 提示词面板引导组件（bootstrap）：把数据订阅、编辑状态与展示组件装配成完整面板。
 * 采用「宿主推送状态 + 本地派生视图」的结构：组件本身不持久化任何数据，
 * 所有写操作通过 postToHost 发送意图，由宿主校验后回推完整列表。
 * 首屏在收到首个 state 之前统一呈现加载占位，避免把「尚未读到」误报成空列表。
 * 注意：Toaster 只挂载一次且位于内容分支之外，否则加载态与列表态切换会连带卸载常驻提示；
 * 搜索关键词属于视图状态留在本层，数据态与编辑态分别交给 usePromptState 与 usePromptEditor。
 */
import { useMemo, useState } from 'react'
import { PanelHeader } from '@components/PanelHeader'
import { PromptEditorDialog } from '@components/PromptEditorDialog'
import { PromptList } from '@components/PromptList'
import { Toaster } from '@components/ui/sonner'
import { Spinner } from '@components/ui/spinner'
import { usePromptEditor } from '@webview/hooks/usePromptEditor'
import { usePromptState } from '@webview/hooks/usePromptState'
import { filterPrompts } from '@webview/lib/prompt-filter'
import { postToHost } from '@webview/lib/vscode'
import type { JSX } from 'react'

export function Bootstrap(): JSX.Element {
    const [query, setQuery] = useState('')
    const payload = usePromptState()
    const prompts = useMemo(() => payload?.prompts ?? [], [payload])
    const { items, isFiltering } = useMemo(() => filterPrompts(prompts, query), [prompts, query])
    const { editing, isOpen, openEdit, closeDialog, submit } = usePromptEditor(prompts)

    return (
        <div className="flex h-full flex-col">
            {payload ? (
                <>
                    <PanelHeader
                        codebuddy={payload.codebuddy}
                        count={prompts.length}
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
                        onRestore={(id) => postToHost({ type: 'resetPrompt', id })}
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
                onOpenChange={(open) => {
                    if (!open) {
                        closeDialog()
                    }
                }}
                onSubmit={submit}
            />

            <Toaster />
        </div>
    )
}
