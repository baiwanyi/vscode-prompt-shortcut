/**
 * Webview 与扩展宿主通信的唯一出口。
 * acquireVsCodeApi 在整个 Webview 生命周期内只允许调用一次，因此用模块级单例缓存；
 * 所有发往宿主的消息都必须走 postToHost，便于统一约束消息类型与后续埋点。
 * 注意：不要在其他模块直接调用 acquireVsCodeApi，重复调用会抛异常。
 */
import type { WebviewToHostMessage } from '@shared/messages'

let cachedApi: VsCodeApi | undefined

function getVsCodeApi(): VsCodeApi {
    if (!cachedApi) {
        if (typeof acquireVsCodeApi !== 'function') {
            throw new Error('acquireVsCodeApi 不可用：当前页面未运行在 VSCode Webview 中')
        }
        cachedApi = acquireVsCodeApi()
    }
    return cachedApi
}

export function postToHost(message: WebviewToHostMessage): void {
    getVsCodeApi().postMessage(message)
}
