/**
 * Webview 渲染入口。
 * 负责挂载 React 根节点、引入全局样式，并用 TooltipProvider 统一承担全局面板内的悬浮提示；
 * 产物由 Vite 打包成 assets 下的模块脚本，挂在 index.html 的 #root 之后加载。
 * 注意：根节点缺失说明 HTML 与入口对不上，直接抛出；控制台错误由宿主侧渲染兜底页呈现；
 * TooltipProvider 只能挂一次，分散到各组件会导致提示延迟与关闭行为不一致。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@components/ui/tooltip'
import { App } from '@webview/App'
import '@webview/styles.css'

const container = document.getElementById('root')
if (!container) {
    throw new Error('找不到 #root 容器，Webview HTML 可能未正确生成')
}

createRoot(container).render(
    <StrictMode>
        <TooltipProvider delayDuration={400}>
            <App />
        </TooltipProvider>
    </StrictMode>,
)
