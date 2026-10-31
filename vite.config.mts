/**
 * Webview 构建配置（Vite + React 19 + Tailwind CSS 4）。
 * 以 library/iife 模式产出固定文件名的 app.js 与 app.css，便于扩展侧用 asWebviewUri 静态引用；
 * 不使用 hash 文件名是因为 webview HTML 由扩展宿主手写生成，无法感知构建期 hash。
 * 产物落在 dist/webview，与宿主产物 dist/extension.js 同属 dist，但 emptyOutDir 只清理子目录，不会误删宿主包。
 */
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
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
        emptyOutDir: true,
        cssCodeSplit: false,
        minify: 'esbuild',
        lib: {
            entry: r('./src/webview/main.tsx'),
            name: 'WebianPromptWebview',
            formats: ['iife'],
            fileName: () => 'app.js',
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
                    return name.endsWith('.css') ? 'app.css' : 'assets/[name][extname]';
                },
            },
        },
    },
});
