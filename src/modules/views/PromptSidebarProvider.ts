/**
 * 侧边栏 Webview 提供者：把提示词业务装配到 Webview 视图上。
 * 采用「宿主持有状态、Webview 无状态渲染」的模式：Webview 只发意图，宿主完成校验与持久化后再回推完整状态；
 * 视图装配、握手缓存与消息下发交给 WebviewMessenger，发送节奏交给 CodeBuddyAvailabilityPoller，
 * 本类只保留「拿到意图 → 调用领域逻辑 → 推回状态」这一条主线。
 * 注意：Webview 消息一律视为不可信输入，模板正文与 id 需重新校验后再落盘；
 * 探测期间视图可能被销毁，推送前要用 hasView 复核，避免向已释放的 webview 继续调度；
 * 握手前的下发统一走 pendingAfterReady：同步就绪播报与重置确认请求都经它排队，ready 后按序补发。
 */
import * as vscode from 'vscode'
import { WebviewMessenger } from './WebviewMessenger'
import type { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/messages'
import type { PromptDraft, PromptStatePayload, PromptTemplate } from '../../shared/types'
import type { CodeBuddyBridge } from '../codebuddy/CodeBuddyBridge'
import type { PromptStore } from '../prompt/PromptStore'
import { describeError } from '../../shared/errors'
import { checkCapacity, measurePromptsBytes } from '../../shared/promptCapacity'
import { CodeBuddyAvailabilityPoller } from '../codebuddy/CodeBuddyAvailabilityPoller'
import { dispatchPrompt } from '../codebuddy/dispatchPrompt'
import { runToolAction } from '../commands/runToolAction'
import { findToolAction, listToolActions } from '../commands/toolActions'
import { parseDraft, resolveSendText, validateDraft } from '../prompt/draft'

export class PromptSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'baiwanyi.prompt.sidebar'

    /** 视图传输层：负责 HTML 装配、握手缓存与消息下发 */
    private readonly messenger: WebviewMessenger

    /** 发送命令可用性的退避轮询：节奏与去重由该类托管，视图隐藏时暂停 */
    private readonly poller: CodeBuddyAvailabilityPoller

    /** 握手后补发的消息队列：握手前 post 没有监听者，先排队，ready 时按登记顺序发出 */
    private readonly pendingAfterReady: HostToWebviewMessage[] = []

    constructor(
        extensionUri: vscode.Uri,
        private readonly store: PromptStore,
        private readonly bridge: CodeBuddyBridge,
    ) {
        this.messenger = new WebviewMessenger(extensionUri)
        this.poller = new CodeBuddyAvailabilityPoller({
            onRetry: (): void => {
                void this.pushState()
            },
            onExhausted: (): void => {
                void this.messenger.post({ type: 'codebuddyMissing' })
            },
        })
    }

    resolveWebviewView(view: vscode.WebviewView): void {
        this.poller.attach()
        this.messenger.attach(view, {
            onMessage: (message): void => {
                void this.handleMessage(message).catch((error: unknown) => {
                    void this.reportUnexpectedError(error)
                })
            },
            onDispose: (): void => {
                this.poller.detach()
            },
            onVisibilityChange: (visible): void => {
                if (visible) {
                    this.poller.setPaused(false)
                    void this.pushState()
                    return
                }
                this.poller.setPaused(true)
            },
        })
    }

    /** 让 Webview 打开编辑器并新建模板；未握手时由传输层缓存，ready 后补发 */
    async openEditorForNew(): Promise<void> {
        await this.messenger.openNewPrompt()
    }

    /** 通知 Webview 刷新（重置等操作后） */
    async refresh(): Promise<void> {
        await this.pushState()
    }

    /**
     * 播报设置同步就绪：activate 在登记同步键与旧数据搬迁完成后调用。
     * 条数在此刻求值并入队，握手后才下发，避免首屏状态推送把它挤掉。
     */
    announceSyncReady(): void {
        this.enqueueAfterReady({
            type: 'notify',
            level: 'info',
            message: `设置同步已就绪，共 ${this.store.getAll().length} 条提示词同步成功。`,
        })
    }

    /**
     * 按 id 取模板，查不到就提示并返回 undefined。
     * 发送、复制、删除三个入口共用同一文案，避免同一句提示散落多处后改漏。
     */
    private async requirePrompt(id: string): Promise<PromptTemplate | undefined> {
        const target = this.store.get(id)
        if (!target) {
            await this.messenger.notify('warn', '提示词不存在或已被删除。')
            return undefined
        }
        return target
    }

    /** 消息路由：只负责分发，具体动作各自成方法，便于单点修改与阅读 */
    private async handleMessage(message: WebviewToHostMessage): Promise<void> {
        switch (message.type) {
            case 'ready': {
                await this.handleReady()
                break
            }
            case 'requestState': {
                await this.handleRequestState()
                break
            }
            case 'runPrompt': {
                await this.runPromptById(message.id)
                break
            }
            case 'copyPrompt': {
                await this.copyPromptById(message.id)
                break
            }
            case 'savePrompt': {
                await this.savePrompt(message.draft)
                break
            }
            case 'deletePrompt': {
                await this.deletePromptById(message.id)
                break
            }
            case 'movePrompt': {
                await this.store.move(message.id, message.direction)
                await this.pushState()
                break
            }
            case 'runTool': {
                await this.runToolById(message.id)
                break
            }
            default: {
                const exhaustive: never = message
                throw new Error(`未处理的消息类型：${JSON.stringify(exhaustive)}`)
            }
        }
    }

    /** ready 握手：标记可推送，再补发握手期间登记的请求与提示，顺序保证首屏状态先到 */
    private async handleReady(): Promise<void> {
        this.messenger.setReady()
        await this.pushState()
        await this.messenger.flushPending()
        await this.flushAfterReady()
    }

    /** 登记一条握手后再下发的消息：已握手时立即发出，否则留在队列等 handleReady 消费 */
    private enqueueAfterReady(message: HostToWebviewMessage): void {
        this.pendingAfterReady.push(message)
        void this.flushAfterReady()
    }

    /** 按登记顺序发出排队的消息；未握手时原样保留，等下一次握手再补发 */
    private async flushAfterReady(): Promise<void> {
        if (!this.messenger.isReady || this.pendingAfterReady.length === 0) {
            return
        }
        // 先整批取出再逐条下发：下发过程中新登记的消息排到队尾，不会打乱本轮顺序
        const queued = this.pendingAfterReady.splice(0)
        for (const message of queued) {
            await this.messenger.post(message)
        }
    }

    /** 请求刷新：先归零轮询计数，避免沿用上一轮的退避进度 */
    private async handleRequestState(): Promise<void> {
        this.poller.reset()
        await this.pushState()
    }

    /** 复制提示词正文：与发送共用 resolveSendText，正文为空时复制的也是名称 */
    private async copyPromptById(id: string): Promise<void> {
        const target = await this.requirePrompt(id)
        if (!target) {
            return
        }
        await vscode.env.clipboard.writeText(resolveSendText(target))
        await this.messenger.notify('info', `已复制「${target.label}」的提示词。`)
    }

    /** 保存草稿：先收敛不可信载荷，再走字段与容量校验，最后区分「新增 / 更新」提示 */
    private async savePrompt(raw: unknown): Promise<void> {
        const draft = parseDraft(raw)
        if (!draft) {
            await this.messenger.notify('error', '提交的内容格式不正确，请刷新面板后重试。')
            return
        }
        const errors = validateDraft(draft)
        if (errors.length > 0) {
            await this.messenger.notify('error', errors.join('；'))
            return
        }
        const list = this.store.getAll()
        const isExisting = draft.id !== undefined && list.some((item) => item.id === draft.id)
        const capacityError = checkCapacity(list, draft)
        if (capacityError) {
            await this.messenger.notify('error', capacityError)
            return
        }
        await this.store.save(draft)
        await this.pushState()
        await this.messenger.notify('info', isExisting ? '提示词已更新。' : '提示词已创建。')
    }

    /** 删除单条模板：预设与自建一视同仁，删除后不再回灌 */
    private async deletePromptById(id: string): Promise<void> {
        const target = await this.requirePrompt(id)
        if (!target) {
            return
        }
        await this.store.remove(id)
        await this.pushState()
        await this.messenger.notify('info', `已删除「${target.label}」。`)
    }

    /** 发送单条模板：正文为空时由 resolveSendText 回退为名称 */
    private async runPromptById(id: string): Promise<void> {
        const target = await this.requirePrompt(id)
        if (!target) {
            return
        }
        await this.dispatch(resolveSendText(target), target.mode)
    }

    /**
     * 执行工具条上的环境维护动作：id 来自 Webview，必须查表校验后再转发，
     * 避免未知 id 被直接拼进 executeCommand；结果与命令面板入口共用 runToolAction 的提示口径。
     */
    private async runToolById(id: string): Promise<void> {
        const entry = findToolAction(id)
        if (!entry) {
            await this.messenger.notify('warn', '未知的工具命令，请刷新面板后重试。')
            return
        }
        await runToolAction(entry, (level, message): void => {
            void this.messenger.notify(level, message)
        })
    }

    /** 发送并把结果反馈到面板：编排与右键命令共用 dispatchPrompt，这里只把 toast 通道适配进去 */
    private async dispatch(prompt: string, mode?: PromptDraft['mode']): Promise<void> {
        await dispatchPrompt(this.bridge, prompt, mode, (level, message): void => {
            void this.messenger.notify(level, message)
        })
    }

    private async pushState(): Promise<void> {
        if (!this.messenger.hasView) {
            return
        }
        const commandId = await this.bridge.findAvailableCommand()
        // 探测期间视图可能已被销毁：此时既不必推送，也不该继续调度轮询
        if (!this.messenger.hasView) {
            return
        }
        const prompts = this.store.getAll()
        const payload: PromptStatePayload = {
            prompts,
            // 用量与保存校验共用 shared/promptCapacity，界面展示的数字与实际拦截口径一致
            usedBytes: measurePromptsBytes(prompts),
            // 可用性与 autoSend 由 bridge 统一给出，Provider 不再直接触碰配置键
            codebuddy: this.bridge.getStatus(commandId !== ''),
            // 工具条清单固定来自宿主表，Webview 只负责渲染，避免两侧各维护一份
            tools: listToolActions(),
        }
        await this.messenger.post({ type: 'state', payload })
        if (commandId !== '') {
            this.poller.reset()
            return
        }
        this.poller.schedule()
    }

    /** 消息处理链路的兜底：详情只留下行日志，界面给可读提示，避免未捕获拒绝导致点击无反应 */
    private async reportUnexpectedError(error: unknown): Promise<void> {
        console.error('[baiwanyi.prompt] 处理 Webview 消息失败：', describeError(error))
        await this.messenger.notify('error', '操作失败，请重试；若持续出现可重新加载窗口。')
    }
}
