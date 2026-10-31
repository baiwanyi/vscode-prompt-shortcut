/**
 * 延迟执行的交互原语：触发后不立刻执行，先留出一段可撤销窗口。
 * 适用于不可逆或代价高的动作（例如发送提示词会新建 CodeBuddy 会话），
 * 窗口内再次触发即撤销，调用方也可以在切换上下文时主动 cancel。
 * 注意：定时器句柄同时承担「是否在窗口内」的判断，不要再另用 state 判断，否则两者失步会出现
 * 「显示待发但其实已取消」；onFire 经 ref 转发，避免计时期间捕获过期的回调。
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface DelayedActionApi {
    /** 是否处于待执行状态 */
    isPending: boolean
    /** 未激活则开始计时；已激活则撤销 */
    toggle: () => void
    /** 主动撤销并清理定时器 */
    cancel: () => void
}

export function useDelayedAction(delayMs: number, onFire: () => void): DelayedActionApi {
    const [isPending, setIsPending] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onFireRef = useRef(onFire)

    // 计时结束时执行的应是「当前这轮渲染」的动作，用 effect 同步最新引用
    useEffect((): void => {
        onFireRef.current = onFire
    }, [onFire])

    const cancel = useCallback((): void => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        setIsPending(false)
    }, [])

    const toggle = useCallback((): void => {
        if (timerRef.current !== null) {
            cancel()
            return
        }
        setIsPending(true)
        timerRef.current = setTimeout(() => {
            timerRef.current = null
            setIsPending(false)
            onFireRef.current()
        }, delayMs)
    }, [cancel, delayMs])

    // 卸载时清掉未触发的定时器，避免视图销毁后动作仍被触发
    useEffect((): (() => void) => cancel, [cancel])

    return { isPending, toggle, cancel }
}
