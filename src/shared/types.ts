/**
 * 扩展宿主与 Webview 共享的领域类型。
 * 该文件是两侧唯一的类型契约来源：宿主侧负责持久化与校验，Webview 侧只做展示与编辑，
 * 任何字段调整都必须同步 PromptStore 的迁移逻辑与消息协议。
 * 注意：枚举型字段一律使用字面量联合，避免新增取值时出现未覆盖分支。
 */

/** CodeBuddy 对话模式，取值与扩展内置的 BASIC_CHAT_TYPES 对齐 */
export type ChatMode = 'craft' | 'ask' | 'plan' | 'debug';

/** 提示词卡片可用的图标键，Webview 侧映射到 lucide 图标组件 */
export type PromptIconKey =
    | 'git-commit'
    | 'git-push'
    | 'list-ordered'
    | 'sparkles'
    | 'bug'
    | 'search'
    | 'file-text'
    | 'terminal';

export const PROMPT_ICON_KEYS: readonly PromptIconKey[] = [
    'git-commit',
    'git-push',
    'list-ordered',
    'sparkles',
    'bug',
    'search',
    'file-text',
    'terminal',
];

export const CHAT_MODES: readonly ChatMode[] = ['craft', 'ask', 'plan', 'debug'];

/** 一条提示词模板 */
export interface PromptTemplate {
    /** 稳定标识，内置模板使用固定 ID 以便重置时覆盖 */
    id: string;
    /** 按钮上展示的名称，如「提交到 Git」 */
    label: string;
    /** 一句话说明该提示词的用途 */
    description: string;
    /** 实际发送给 CodeBuddy 的提示词正文 */
    prompt: string;
    icon: PromptIconKey;
    mode: ChatMode;
    /** 内置模板不可删除，只能编辑正文 */
    builtin: boolean;
    createdAt: number;
    updatedAt: number;
}

/** 新建或编辑时提交给宿主的载荷（不含时间戳等派生字段） */
export interface PromptDraft {
    id?: string;
    label: string;
    description: string;
    prompt: string;
    icon: PromptIconKey;
    mode: ChatMode;
}

/** CodeBuddy 集成状态，用于在面板顶部提示可用性 */
export interface CodeBuddyStatus {
    /** 是否探测到可用的发送命令 */
    detected: boolean;
    /** 实际使用的命令 ID */
    commandId: string;
    /** 是否会自动触发发送 */
    autoSend: boolean;
}

/** 宿主推送给 Webview 的完整状态 */
export interface PromptStatePayload {
    prompts: PromptTemplate[];
    codebuddy: CodeBuddyStatus;
}

/** 发送结果，用于宿主内部决策是否走降级链路 */
export type SendOutcome = 'sent' | 'copied' | 'failed';
