/**
 * Webview 渲染入口。
 * 负责挂载 React 根节点并引入全局样式；构建为 iife 产物后被扩展宿主以 <script nonce> 方式加载。
 * 注意：必须在 index.html 的 #root 之后执行，因此产物脚本放在 body 末尾。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@webview/App';
import '@webview/styles.css';

const container = document.getElementById('root');
if (!container) {
    throw new Error('找不到 #root 容器，Webview HTML 可能未正确生成');
}

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
