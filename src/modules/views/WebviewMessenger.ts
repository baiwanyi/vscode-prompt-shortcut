/**
 * Webview 传输层：持有视图实例，负责资源域配置、HTML 装配与 ready 握手前的请求缓存。
 * 面板只通过 post / notify 下发消息，不必再自己判断「视图是否存在、是否已握手」；
 * 视图销毁后所有下发静默丢弃，避免向已释放的 webview 推消息。
 * 注意：握手前的新建编辑器请求只缓存一条——该请求天然幂等，队列化会让重复点击堆积成多次弹窗，
 * 因此刻意保持单槽语义；HTML 加载失败时改用可见兜底页面，不留下空白视图。
 */
import * as vscode from 'vscode'
import type { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/messages'
import { buildFallbackHtml, buildWebviewHtml } from '../common/webviewHtml'

export interface WebviewMessengerHandlers {
    /** 收到 Webview 消息；异常由调用方自行兜底 */
    onMessage: (message: WebviewToHostMessage) => void
    /** 视图销毁：调用方据此停止轮询与清理缓存态 */
    onDispose: () => void
    /** 可见性变化：调用方据此暂停 / 恢复后台探测 */
    onVisibilityChange: (visible: boolean) => void
}

export class WebviewMessenger {
    private view: vscode.WebviewView | undefined
    private ready = false
    private isNewPromptPending = false

    constructor(private readonly extensionUri: vscode.Uri) {}

    /** 视图是否已创建：探测类逻辑据此决定要不要继续推进 */
    get hasView(): boolean {
        return this.view !== undefined
    }

    /** 是否完成 ready 握手：握手前下发的消息没有监听者，需要延后补发的调用方据此判断 */
    get isReady(): boolean {
        return this.ready
    }

    /** 绑定视图：配置资源域、渲染 HTML，并注册消息与生命周期回调 */
    attach(view: vscode.WebviewView, handlers: WebviewMessengerHandlers): void {
        this.view = view
        this.ready = false
        this.isNewPromptPending = false
        view.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')],
        }
        void this.renderHtml(view)
        view.webview.onDidReceiveMessage((message: WebviewToHostMessage) => {
            handlers.onMessage(message)
        })
        view.onDidDispose(() => {
            this.view = undefined
            this.ready = false
            this.isNewPromptPending = false
            handlers.onDispose()
        })
        view.onDidChangeVisibility(() => {
            handlers.onVisibilityChange(view.visible)
        })
    }

    /** 标记握手完成；补发走 flushPending，由调用方控制它与其他推送的先后顺序 */
    setReady(): void {
        this.ready = true
    }

    /** 补发握手前登记的新建编辑器请求；无挂起时什么也不做 */
    async flushPending(): Promise<void> {
        if (!this.isNewPromptPending) {
            return
        }
        this.isNewPromptPending = false
        await this.post({ type: 'editPrompt' })
    }

    /** 请求打开新建编辑器：未握手时先登记，等 ready 后补发，否则消息会被静默丢弃 */
    async openNewPrompt(): Promise<void> {
        if (!this.view || !this.ready) {
            this.isNewPromptPending = true
            return
        }
        await this.post({ type: 'editPrompt' })
    }

    /** 下发消息；视图不存在时静默丢弃 */
    async post(message: HostToWebviewMessage): Promise<void> {
        if (!this.view) {
            return
        }
        await this.view.webview.postMessage(message)
    }

    /** 下发一条通知，等级语义与 shared/messages 保持一致 */
    async notify(level: 'info' | 'warn' | 'error', message: string): Promise<void> {
        await this.post({ type: 'notify', level, message })
    }

    private async renderHtml(view: vscode.WebviewView): Promise<void> {
        try {
            view.webview.html = await buildWebviewHtml(view.webview, this.extensionUri)
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            view.webview.html = buildFallbackHtml(reason)
        }
    }
}
