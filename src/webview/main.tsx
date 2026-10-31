/**
 * Webview 挂载入口：把 VS Code 主题同步到 shadcn 的暗色约定，并挂载 React 根。
 * 复用约定：挂载时统一包一层 TooltipProvider，页面内的 Tooltip 不必各自重复提供 Provider；
 * 首屏加载态与面板主体都在 bootstrap 组件内，本文件只负责容器、主题与全局样式。
 * 注意：主题同步必须跟随 data-vscode-theme-kind 的变化，用户切换主题时面板要即时收敛；
 * #root 缺失说明 HTML 与入口对不上，直接抛出并留在 Webview 控制台——宿主兜底页只覆盖「构建产物缺失」，
 * 不会收到这里抛出的异常。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@components/ui/tooltip'
import { Bootstrap } from '@webview/bootstrap'
import '@webview/styles.css'

/** 判定为深色的主题标识，high-contrast 同样使用深色底色 */
const DARK_THEME_KINDS = ['vscode-dark', 'vscode-high-contrast']

/** Tooltip 悬停延迟：窄面板内鼠标频繁掠过，延迟过短会让提示闪烁 */
const TOOLTIP_DELAY_MS = 400

/** 依据 VS Code 主题类型在根元素挂载或移除 .dark 类，供 Tailwind 的 dark 变体使用 */
function syncDarkClass(): void {
    const themeKind = document.body.dataset.vscodeThemeKind ?? ''
    document.documentElement.classList.toggle('dark', DARK_THEME_KINDS.includes(themeKind))
}

/** 挂载失败时的可见兜底：异常只进控制台时用户只会看到白屏，这里把原因直接写进面板 */
function renderFatalError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    const container = document.getElementById('root') ?? document.body
    container.dataset.fatal = ''
    container.textContent = `微边提示词加载失败：${message}。请执行 pnpm run compile 后重新加载窗口。`
}

function mount(): void {
    const container = document.getElementById('root')
    if (!container) {
        throw new Error('找不到 #root 容器，Webview HTML 可能未正确生成')
    }
    syncDarkClass()
    new MutationObserver(syncDarkClass).observe(document.body, {
        attributes: true,
        attributeFilter: ['data-vscode-theme-kind'],
    })
    createRoot(container).render(
        <StrictMode>
            <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                <Bootstrap />
            </TooltipProvider>
        </StrictMode>,
    )
}

try {
    mount()
} catch (error) {
    console.error('[webianPrompt] 挂载失败：', error)
    renderFatalError(error)
}
