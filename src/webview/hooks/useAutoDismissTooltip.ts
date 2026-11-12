/**
 * Tooltip 自动收起控制：把 Radix 的非受控开合改为「打开后计时收回」。
 * Radix 只在指针离开触发元素时关闭，鼠标停在原处时提示会一直遮住下方内容；
 * 这里在打开时启动计时，到点置为关闭，指针再次进入或重新聚焦会重新计时。
 * 注意：定时器必须在关闭与卸载时清理，否则面板重渲染后仍会对已失效的状态调用 setState；
 * 收回后不主动重开——Radix 只在新的 enter / focus 事件下再次触发 onOpenChange。
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** 自动收起延时：足够读完一行说明，又不至于长时间遮挡列表 */
const AUTO_DISMISS_MS = 2000

export interface AutoDismissTooltip {
    /** 受控开合状态，直接传给 Tooltip 的 open */
    isOpen: boolean
    /** 与 Tooltip 的 onOpenChange 对接：负责启停计时并同步状态 */
    onOpenChange: (open: boolean) => void
}

export function useAutoDismissTooltip(): AutoDismissTooltip {
    const [isOpen, setIsOpen] = useState(false)
    const timerRef = useRef<number | undefined>(undefined)

    const stopTimer = useCallback((): void => {
        if (timerRef.current !== undefined) {
            window.clearTimeout(timerRef.current)
            timerRef.current = undefined
        }
    }, [])

    const onOpenChange = useCallback(
        (open: boolean): void => {
            // 先清旧计时：连续进出时不能留下上一轮的定时器把新一轮提前关掉
            stopTimer()
            setIsOpen(open)
            if (!open) {
                return
            }
            timerRef.current = window.setTimeout((): void => {
                timerRef.current = undefined
                setIsOpen(false)
            }, AUTO_DISMISS_MS)
        },
        [stopTimer],
    )

    useEffect(() => stopTimer, [stopTimer])

    return { isOpen, onOpenChange }
}
