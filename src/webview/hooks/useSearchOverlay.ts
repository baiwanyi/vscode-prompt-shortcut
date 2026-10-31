/**
 * 面板头部搜索覆盖层的展开态原语：把「何时收起、收起时是否清空关键词」收成一份规则。
 * 关键词是受控状态，仍由调用方持有（它要参与列表筛选），本 Hook 只借用读写，不接管数据。
 * 注意：Esc 与失焦的收起语义不同——Esc 是显式取消（连同关键词清空），失焦只在关键词为空时收起，
 * 否则用户切走再回来会看到被清空的搜索框却仍处于筛选前的列表。
 */
import { useCallback, useState } from 'react'
import type { KeyboardEvent } from 'react'

export interface SearchOverlayApi {
    /** 覆盖层是否展开 */
    isOpen: boolean
    /** 展开（焦点交由输入框的 autoFocus 承接） */
    open: () => void
    /** 显式取消：收起并清空关键词 */
    dismiss: () => void
    /** 失焦策略：有关键词则保持展开，无关键词才收起 */
    handleBlur: () => void
    /** Esc 触发显式取消 */
    handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function useSearchOverlay(query: string, onQueryChange: (value: string) => void): SearchOverlayApi {
    const [isOpen, setIsOpen] = useState(false)

    const open = useCallback((): void => {
        setIsOpen(true)
    }, [])

    const dismiss = useCallback((): void => {
        setIsOpen(false)
        if (query) {
            onQueryChange('')
        }
    }, [onQueryChange, query])

    const handleBlur = useCallback((): void => {
        if (!query) {
            setIsOpen(false)
        }
    }, [query])

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>): void => {
            if (event.key === 'Escape') {
                dismiss()
            }
        },
        [dismiss],
    )

    return { isOpen, open, dismiss, handleBlur, handleKeyDown }
}
