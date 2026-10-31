/**
 * 订阅扩展宿主推送消息的 Hook。
 * 通过 ref 保存最新回调，使监听器在整个组件生命周期内只注册一次，
 * 避免回调闭包捕获过期的 state（这是 Webview 消息处理最常见的 bug 来源）。
 * 注意：回调更新放在 effect 中而非渲染期，遵循 React 对 ref 写入的约束。
 */
import { useEffect, useRef } from 'react'
import type { HostToWebviewMessage } from '@shared/messages'

export function useHostMessages(onMessage: (message: HostToWebviewMessage) => void): void {
    const handlerRef = useRef(onMessage)

    useEffect(() => {
        handlerRef.current = onMessage
    }, [onMessage])

    useEffect(() => {
        const listener = (event: MessageEvent<HostToWebviewMessage>): void => {
            handlerRef.current(event.data)
        }
        window.addEventListener('message', listener)
        return (): void => {
            window.removeEventListener('message', listener)
        }
    }, [])
}
