/**
 * Webview 与扩展宿主之间的消息协议。
 * 采用可辨识联合（discriminant union）而非字符串事件名，保证 switch 分支穷尽且类型可收敛；
 * 所有消息只承载纯数据，宿主侧必须重新校验载荷，不可信任 Webview 传入的 id 与正文。
 * 注意：新增消息类型时两侧 switch 必须同时补齐，否则 noFallthroughCasesInSwitch 会报错。
 */
import type { MoveDirection, PromptDraft, PromptStatePayload } from './types'

/** Webview -> 宿主 */
export type WebviewToHostMessage =
    | { type: 'ready' }
    | { type: 'requestState' }
    | { type: 'runPrompt'; id: string }
    | { type: 'copyPrompt'; id: string }
    | {
          type: 'savePrompt'
          draft: PromptDraft
      }
    | { type: 'deletePrompt'; id: string }
    | { type: 'movePrompt'; id: string; direction: MoveDirection }

/** 宿主 -> Webview */
export type HostToWebviewMessage =
    | { type: 'state'; payload: PromptStatePayload }
    | { type: 'notify'; level: 'info' | 'warn' | 'error'; message: string }
    /** 请求打开编辑器新建模板；按 id 编辑由卡片点击在 Webview 内自行触发，不走协议 */
    | { type: 'editPrompt' }
    /** 轮询次数耗尽仍未检测到 CodeBuddy，Webview 据此弹出带「刷新」按钮的常驻提示 */
    | { type: 'codebuddyMissing' }
