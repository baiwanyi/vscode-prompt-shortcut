/**
 * 图标键到 lucide 组件的映射。
 * 宿主只持久化稳定的字符串键，图标实例由 Webview 侧解析，避免把 React 组件写进存储；
 * 新增图标键时必须同步 shared/types 的 PromptIconKey 联合类型，否则会漏映射。
 */
import {
    Bug,
    FileText,
    GitCommit,
    ListOrdered,
    Search,
    ShieldCheck,
    Sparkles,
    Terminal,
    Upload,
    Wrench,
    type LucideIcon,
} from 'lucide-react'
import type { PromptIconKey } from '@shared/types'

export const PROMPT_ICON_MAP: Record<PromptIconKey, LucideIcon> = {
    gitCommit: GitCommit,
    gitPush: Upload,
    listOrdered: ListOrdered,
    wrench: Wrench,
    shieldCheck: ShieldCheck,
    sparkles: Sparkles,
    bug: Bug,
    search: Search,
    fileText: FileText,
    terminal: Terminal,
}

export const PROMPT_ICON_LABELS: Record<PromptIconKey, string> = {
    gitCommit: '提交',
    gitPush: '推送',
    listOrdered: '顺序',
    wrench: '修复',
    shieldCheck: '审查',
    sparkles: '推荐',
    bug: '缺陷',
    search: '检索',
    fileText: '文档',
    terminal: '终端',
}
