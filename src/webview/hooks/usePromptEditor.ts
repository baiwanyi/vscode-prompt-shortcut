/**
 * 提示词编辑弹窗的状态机。
 * 负责「按 id 取模板并转成草稿」、开关弹窗与提交；提交只把 PromptDraft 交给宿主，校验与持久化都在宿主侧完成。
 * 编辑入口分两条：宿主只会请求新建（无 id），按 id 编辑由卡片点击在 Webview 内直接触发。
 * 注意：id 查不到时保持弹窗关闭——此时模板多半已被删除，弹出空表单会被误当成「新建」。
 */
import { useCallback, useState } from 'react'
import type { HostToWebviewMessage } from '@shared/messages'
import type { PromptDraft, PromptTemplate } from '@shared/types'
import { useHostMessages } from '@webview/hooks/useHostMessages'
import { postToHost } from '@webview/lib/vscode'

/** 从完整模板裁出可编辑字段，不把时间戳带进表单状态 */
function toDraft(prompt: PromptTemplate): PromptDraft {
    return {
        id: prompt.id,
        label: prompt.label,
        prompt: prompt.prompt,
        icon: prompt.icon,
        mode: prompt.mode,
    }
}

export interface PromptEditorApi {
    editing: PromptDraft | null
    isOpen: boolean
    openEdit: (id?: string) => void
    closeDialog: () => void
    submit: (draft: PromptDraft) => void
}

export function usePromptEditor(prompts: PromptTemplate[]): PromptEditorApi {
    const [editing, setEditing] = useState<PromptDraft | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const openEdit = useCallback(
        (id?: string): void => {
            if (!id) {
                setEditing(null)
                setIsOpen(true)
                return
            }
            const target = prompts.find((item) => item.id === id)
            if (!target) {
                return
            }
            setEditing(toDraft(target))
            setIsOpen(true)
        },
        [prompts],
    )

    const closeDialog = useCallback((): void => {
        setIsOpen(false)
        setEditing(null)
    }, [])

    const submit = useCallback((draft: PromptDraft): void => {
        postToHost({ type: 'savePrompt', draft })
        setIsOpen(false)
        setEditing(null)
    }, [])

    const handleHostMessage = useCallback(
        (message: HostToWebviewMessage): void => {
            if (message.type === 'editPrompt') {
                openEdit()
            }
        },
        [openEdit],
    )

    useHostMessages(handleHostMessage)

    return { editing, isOpen, openEdit, closeDialog, submit }
}
