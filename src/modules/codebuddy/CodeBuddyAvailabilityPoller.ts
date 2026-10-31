/**
 * CodeBuddy 发送命令的可用性轮询状态机。
 * 按指数退避安排重试（1.5s → 3s → 6s → 12s → 15s 封顶），命中或手动刷新时归零，
 * 次数耗尽后只回调一次「已耗尽」，由调用方决定弹什么提示。
 * 注意：本类只负责节奏、计数与耗尽去重，不感知视图与消息协议——探测与重新推送都由外部注入，
 * 这样面板刷新逻辑与轮询策略互不牵制；dispose 之后不得再触发任何回调。
 */
const RETRY_INITIAL_MS = 1500
const RETRY_MAX_MS = 15000
const RETRY_BACKOFF_STEPS = 4
const RETRY_LIMIT = 30

export interface PollerOptions {
    /** 定时器到期后重新执行一次「探测 + 推送」的完整流程 */
    onRetry: () => void
    /** 重试次数耗尽后的通知，只触发一次 */
    onExhausted: () => void
}

export class CodeBuddyAvailabilityPoller {
    private timer: ReturnType<typeof setTimeout> | undefined
    private attemptCount = 0
    private isExhaustedNotified = false
    private isPaused = false
    private isDetached = false

    constructor(private readonly options: PollerOptions) {}

    /** 绑定视图时恢复可用并清掉上一轮遗留计数；视图销毁后重建会再次调用 */
    attach(): void {
        this.isDetached = false
        this.reset()
    }

    /** 视图销毁时停止：此后不再触发回调，直到下次 attach */
    detach(): void {
        this.isDetached = true
        this.reset()
    }

    /** 安排下一次探测；暂停、已解绑或已达上限时不再调度 */
    schedule(): void {
        if (this.isDetached || this.timer || this.isPaused) {
            return
        }
        if (this.attemptCount >= RETRY_LIMIT) {
            this.reportExhausted()
            return
        }
        const step = Math.min(this.attemptCount, RETRY_BACKOFF_STEPS)
        const delayMs = Math.min(RETRY_INITIAL_MS * 2 ** step, RETRY_MAX_MS)
        this.attemptCount += 1
        this.timer = setTimeout(() => {
            this.timer = undefined
            this.options.onRetry()
        }, delayMs)
    }

    /** 停止轮询并把计数归零；探测命中、视图可见性变化、手动刷新都走这里 */
    reset(): void {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = undefined
        }
        this.attemptCount = 0
        this.isExhaustedNotified = false
    }

    /** 视图隐藏时暂停并清掉待触发的定时器，恢复可见后由调用方主动刷新一次 */
    setPaused(paused: boolean): void {
        this.isPaused = paused
        if (paused) {
            this.reset()
        }
    }

    private reportExhausted(): void {
        if (this.isExhaustedNotified) {
            return
        }
        this.isExhaustedNotified = true
        this.options.onExhausted()
    }
}
