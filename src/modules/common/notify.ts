/**
 * 宿主侧用户提示的等级与通道契约。
 * 命令面板、右键菜单与发送编排共用同一套等级，避免各处手写字面量联合——新增等级时漏改一处就断链。
 * 具体呈现（状态栏 / 弹窗）由各入口注入，本模块只约定契约，不引入 vscode 也不关心呈现形态。
 * 注意：Webview 侧走自己的 toast 通道，不复用本类型。
 */

export type FeedbackLevel = 'info' | 'warn' | 'error'

export type Notify = (level: FeedbackLevel, message: string) => void
