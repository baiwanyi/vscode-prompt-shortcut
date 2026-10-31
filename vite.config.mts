/**
 * Webview 构建配置（Vite + React 19 + Tailwind CSS 4）。
 * 以 src/webview/index.html 为 HTML 入口，产物为 dist/webview/index.html 与 assets/ 下带 hash 的 js/css；
 * base 设为 './' 让产物内部引用保持相对路径，宿主侧再把 assets/ 前缀重写为 asWebviewUri 地址。
 * 注意：不使用 library 模式——HTML 入口才会让 Vite 自动注入带 hash 的资源引用，宿主无需感知文件名；
 * root 落在 src/webview，构建范围只由 index.html 的依赖图决定，扩展宿主源码不参与。
 */
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
    root: r('./src/webview'),
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@components': r('./src/webview/components'),
            '@shared': r('./src/shared'),
            '@webview': r('./src/webview'),
        },
    },
    build: {
        outDir: r('./dist/webview'),
        // 产物目录在 root 之外，必须显式开启清理，否则旧产物会残留
        emptyOutDir: true,
        cssCodeSplit: false,
        minify: 'esbuild',
        rollupOptions: {
            input: r('./src/webview/index.html'),
        },
    },
})
