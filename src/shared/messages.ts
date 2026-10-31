/**
 * Webview 与扩展宿主之间的消息协议。
 * 采用可辨识联合（discriminant union）而非字符串事件名，保证 switch 分支穷尽且类型可收敛；
 * 所有消息只承载纯数据，宿主侧必须重新校验载荷，不可信任 Webview 传入的 id 与正文。
 * 注意：新增消息类型时两侧 switch 必须同时补齐，否则 noFallthroughCasesInSwitch 会报错。
 */
import type { PromptDraft, PromptIconKey, PromptStatePayload } from './types';

/** Webview -> 宿主 */
export type WebviewToHostMessage =
    | { type: 'ready' }
    | { type: 'requestState' }
    | { type: 'runPrompt'; id: string }
    | { type: 'copyPrompt'; id: string }
    | {
          type: 'savePrompt';
          draft: PromptDraft;
      }
    | { type: 'deletePrompt'; id: string }
    | { type: 'movePrompt'; id: string; direction: 'up' | 'down' }
    | { type: 'resetDefaults' };

/** 宿主 -> Webview */
export type HostToWebviewMessage =
    | { type: 'state'; payload: PromptStatePayload }
    | { type: 'notify'; level: 'info' | 'warn' | 'error'; message: string }
    | { type: 'editPrompt'; payload: { id?: string } };

/** 图标键白名单校验，宿主侧收到草稿时复用 */
export function isPromptIconKey(value: unknown): value is PromptIconKey {
    return (
        value === 'git-commit' ||
        value === 'git-push' ||
        value === 'list-ordered' ||
        value === 'sparkles' ||
        value === 'bug' ||
        value === 'search' ||
        value === 'file-text' ||
        value === 'terminal'
    );
}
