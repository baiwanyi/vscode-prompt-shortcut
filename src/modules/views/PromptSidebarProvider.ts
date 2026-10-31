/**
 * 侧边栏 Webview 提供者：承载提示词面板的全部交互。
 * 采用「宿主持有状态、Webview 无状态渲染」的模式：Webview 只发意图，宿主完成校验与持久化后
 * 再回推完整状态，避免两侧状态不一致；HTML 装配与 CSP 注入统一交给 webviewHtml。
 * 注意：Webview 消息一律视为不可信输入，模板正文与 id 需在宿主侧重新校验后再落盘；
 * HTML 为异步读盘，加载失败时以可见兜底页面提示重新编译，不静默留白。
 */
import * as vscode from 'vscode'
import type { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/messages'
import type { PromptDraft, PromptStatePayload } from '../../shared/types'
import type { CodeBuddyBridge } from '../codebuddy/CodeBuddyBridge'
import type { PromptStore } from '../prompt/PromptStore'
import { buildWebviewHtml } from '../common/webviewHtml'

const MAX_LABEL_LENGTH = 40
const MAX_DESCRIPTION_LENGTH = 120
const MAX_PROMPT_LENGTH = 8000

/**
 * 未检测到发送命令后的持续轮询参数。
 * CodeBuddy 的激活耗时随机器性能波动（实测 2-3s，慢机器更久），一遍过的检测会长期误报，
 * 因此改成指数退避轮询：1.5s → 3s → 6s → 12s → 15s 封顶，命中即停止。
 */
const DETECTION_RETRY_INITIAL_MS = 1500
const DETECTION_RETRY_MAX_MS = 15000
const DETECTION_RETRY_BACKOFF_STEPS = 4
const DETECTION_RETRY_LIMIT = 30

/** 校验 Webview 提交的草稿，返回错误信息数组（空数组表示通过） */
function validateDraft(draft: PromptDraft): string[] {
    const errors: string[] = []
    if (!draft.label.trim()) {
        errors.push('名称不能为空')
    } else if (draft.label.length > MAX_LABEL_LENGTH) {
        errors.push(`名称不能超过 ${MAX_LABEL_LENGTH} 个字符`)
    }
    if (!draft.prompt.trim()) {
        errors.push('提示词正文不能为空')
    } else if (draft.prompt.length > MAX_PROMPT_LENGTH) {
        errors.push(`提示词正文不能超过 ${MAX_PROMPT_LENGTH} 个字符`)
    }
    if (draft.description.length > MAX_DESCRIPTION_LENGTH) {
        errors.push(`说明不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`)
    }
    return errors
}

export class PromptSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'webianPrompt.sidebar'

    private view: vscode.WebviewView | undefined

    /** 视图尚未渲染时需要延后打开的新建编辑器标记 */
    private pendingNewEditor = false

    /** 发送命令可用性的轮询定时器与已重试次数 */
    private detectionRetryTimer: ReturnType<typeof setTimeout> | undefined
    private detectionRetryCount = 0

    /** 视图不可见时暂停轮询，避免后台空转 */
    private detectionPaused = false

    /** 是否已就「轮询耗尽」提示过一次，避免每次复检都弹 */
    private detectionExhausted = false

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly store: PromptStore,
        private readonly bridge: CodeBuddyBridge,
    ) {}

    resolveWebviewView(view: vscode.WebviewView): void {
        this.view = view
        this.detectionPaused = false
        const webviewRoot = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')
        view.webview.options = {
            enableScripts: true,
            localResourceRoots: [webviewRoot],
        }
        void this.renderHtml(view)
        view.webview.onDidReceiveMessage((message: WebviewToHostMessage) => {
            void this.handleMessage(message)
        })
        view.onDidDispose(() => {
            this.view = undefined
            this.resetDetectionRetry()
        })
        view.onDidChangeVisibility(() => {
            if (view.visible) {
                this.detectionPaused = false
                void this.pushState()
                return
            }
            this.detectionPaused = true
            this.resetDetectionRetry()
        })
    }

    /** 让 Webview 打开编辑器并新建模板；视图未就绪时先登记，等 ready 消息到达后补发 */
    async openEditorForNew(): Promise<void> {
        if (!this.view) {
            this.pendingNewEditor = true
            return
        }
        await this.pushMessage({ type: 'editPrompt', payload: {} })
    }

    /** 通知 Webview 刷新（重置等操作后） */
    async refresh(): Promise<void> {
        await this.pushState()
    }

    /** 恢复出厂提示词；命令面板、视图标题栏与 Webview 三处入口共用同一套二次确认 */
    async resetWithConfirm(): Promise<void> {
        const confirmed = await vscode.window.showWarningMessage(
            '恢复默认提示词会删除全部自定义模板，是否继续？',
            { modal: true },
            '恢复默认',
        )
        if (confirmed !== '恢复默认') {
            return
        }
        await this.store.reset()
        await this.pushState()
        await this.notify('info', '已恢复默认提示词。')
    }

    private async handleMessage(message: WebviewToHostMessage): Promise<void> {
        switch (message.type) {
            case 'ready': {
                await this.pushState()
                if (this.pendingNewEditor) {
                    this.pendingNewEditor = false
                    await this.pushMessage({ type: 'editPrompt', payload: {} })
                }
                break
            }
            case 'requestState': {
                this.resetDetectionRetry()
                await this.pushState()
                break
            }
            case 'runPrompt': {
                await this.runPromptById(message.id)
                break
            }
            case 'copyPrompt': {
                const target = this.store.getAll().find((item) => item.id === message.id)
                if (!target) {
                    await this.notify('warn', '提示词不存在或已被删除。')
                    break
                }
                await vscode.env.clipboard.writeText(target.prompt)
                await this.notify('info', `已复制「${target.label}」的提示词。`)
                break
            }
            case 'savePrompt': {
                const errors = validateDraft(message.draft)
                if (errors.length > 0) {
                    await this.notify('error', errors.join('；'))
                    break
                }
                await this.store.save(message.draft)
                await this.pushState()
                await this.notify('info', message.draft.id ? '提示词已更新。' : '提示词已创建。')
                break
            }
            case 'deletePrompt': {
                const list = this.store.getAll()
                const target = list.find((item) => item.id === message.id)
                if (!target) {
                    await this.notify('warn', '提示词不存在或已被删除。')
                    break
                }
                if (target.builtin) {
                    await this.notify('warn', '内置提示词不可删除，可编辑其正文后使用。')
                    break
                }
                await this.store.remove(message.id)
                await this.pushState()
                await this.notify('info', `已删除「${target.label}」。`)
                break
            }
            case 'movePrompt': {
                await this.store.move(message.id, message.direction)
                await this.pushState()
                break
            }
            case 'resetDefaults': {
                await this.resetWithConfirm()
                break
            }
            default: {
                const exhaustive: never = message
                throw new Error(`未处理的消息类型：${JSON.stringify(exhaustive)}`)
            }
        }
    }

    private async runPromptById(id: string): Promise<void> {
        const target = this.store.getAll().find((item) => item.id === id)
        if (!target) {
            await this.notify('warn', '提示词不存在或已被删除。')
            return
        }
        await this.dispatch(target.prompt, target.mode)
    }

    private async dispatch(prompt: string, mode?: PromptDraft['mode']): Promise<void> {
        const result = await this.bridge.send(prompt, mode)
        if (result.outcome === 'failed') {
            await this.notify('error', result.detail)
            return
        }
        await this.notify(result.outcome === 'sent' ? 'info' : 'warn', result.detail)
    }

    private async pushState(): Promise<void> {
        if (!this.view) {
            return
        }
        const isDetected = await this.bridge.isSendCommandAvailable()
        const payload: PromptStatePayload = {
            prompts: this.store.getAll(),
            codebuddy: {
                detected: isDetected,
                commandId: vscode.workspace.getConfiguration('webianPrompt').get<string>('codebuddy.sendCommand', ''),
                autoSend: vscode.workspace.getConfiguration('webianPrompt').get<boolean>('codebuddy.autoSend', true),
            },
        }
        await this.pushMessage({ type: 'state', payload })
        if (isDetected) {
            this.resetDetectionRetry()
            return
        }
        this.scheduleDetectionRetry()
    }

    /**
     * 未检测到发送命令时按退避间隔继续轮询，直到命中或达到次数上限。
     * 命中后由 pushState 调 resetDetectionRetry 归零，避免命中后还在后台跑。
     */
    private scheduleDetectionRetry(): void {
        if (this.detectionRetryTimer || this.detectionPaused) {
            return
        }
        if (this.detectionRetryCount >= DETECTION_RETRY_LIMIT) {
            void this.reportDetectionExhausted()
            return
        }
        const step = Math.min(this.detectionRetryCount, DETECTION_RETRY_BACKOFF_STEPS)
        const delayMs = Math.min(DETECTION_RETRY_INITIAL_MS * 2 ** step, DETECTION_RETRY_MAX_MS)
        this.detectionRetryCount += 1
        this.detectionRetryTimer = setTimeout(() => {
            this.detectionRetryTimer = undefined
            void this.pushState()
        }, delayMs)
    }

    /** 轮询耗尽后只提示一次，由 Webview 弹出带「刷新」按钮的常驻 toast */
    private async reportDetectionExhausted(): Promise<void> {
        if (this.detectionExhausted) {
            return
        }
        this.detectionExhausted = true
        await this.pushMessage({ type: 'codebuddyMissing' })
    }

    /** 停止轮询并把计数归零；视图可见性变化、命令命中与手动刷新时都走这里 */
    private resetDetectionRetry(): void {
        if (this.detectionRetryTimer) {
            clearTimeout(this.detectionRetryTimer)
            this.detectionRetryTimer = undefined
        }
        this.detectionRetryCount = 0
        this.detectionExhausted = false
    }

    private async notify(level: 'info' | 'warn' | 'error', message: string): Promise<void> {
        await this.pushMessage({ type: 'notify', level, message })
    }

    private async pushMessage(message: HostToWebviewMessage): Promise<void> {
        if (!this.view) {
            return
        }
        await this.view.webview.postMessage(message)
    }

    /** 渲染 Webview HTML：产物缺失说明未编译或打包不完整，此时给可见提示而不是留白 */
    private async renderHtml(view: vscode.WebviewView): Promise<void> {
        try {
            view.webview.html = await buildWebviewHtml(view.webview, this.extensionUri)
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            view.webview.html = `<!doctype html><html><body><h3>微边提示词</h3><p>Webview 资源缺失，请先执行 pnpm run compile（${reason}）</p></body></html>`
        }
    }
}
