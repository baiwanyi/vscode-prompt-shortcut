/**
 * Webview HTML 装配：读取 Vite 产出的 dist/webview/index.html，注入 CSP 并重写资源基址。
 * 复用约定：模板中的资源引用由构建期写成 assets/ 相对路径，此处统一替换为 asWebviewUri 生成的地址，
 * 宿主因此无需感知带 hash 的文件名；模板缺失（未编译或打包不完整）时抛错，由调用方给出可见兜底页面。
 * 关键约束：CSP 必须与 localResourceRoots 指向同一 webview 源，否则样式与脚本会被拦成加载失败；
 * 只重写 assets/ 前缀，模板若被改成绝对路径或外链将直接落在 CSP 之外。
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as vscode from 'vscode'

/** 构建产物中的资源前缀，与 Vite 的默认 assetDir 保持一致 */
const ASSET_DIR = 'assets'

/** 资源引用匹配：构建产物写成 ./assets/xxx，这里把前缀整段换成 asWebviewUri 地址 */
const ASSET_REFERENCE = new RegExp(`(src|href)="(?:\\.\\.?/)*${ASSET_DIR}/`, 'gu')

export async function buildWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    const distDir = vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
    const template = await fs.readFile(path.join(distDir.fsPath, 'index.html'), 'utf-8')
    const assetBase = webview.asWebviewUri(vscode.Uri.joinPath(distDir, ASSET_DIR)).toString()
    const csp = [
        "default-src 'none'",
        `img-src ${webview.cspSource} https: data:`,
        `font-src ${webview.cspSource}`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src ${webview.cspSource}`,
    ].join('; ')

    return template
        .replace(ASSET_REFERENCE, `$1="${assetBase}/`)
        .replace('</head>', `<meta http-equiv="Content-Security-Policy" content="${csp}"></head>`)
}

/**
 * 产物缺失时的可见兜底页面。
 * 由调用方在 buildWebviewHtml 抛错时使用，避免把「未编译」表现成一片空白；
 * 错误信息可能带尖括号或引号，拼进文本节点前必须先转义。
 */
export function buildFallbackHtml(reason: string): string {
    return `<!doctype html><html><body><h3>微边提示词</h3><p>Webview 资源缺失，请先执行 pnpm run compile（${escapeHtml(reason)}）</p></body></html>`
}

/** 最小 HTML 转义：只覆盖会破坏文本节点的四个字符，兜底页面无需完整实体表 */
function escapeHtml(text: string): string {
    return text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;')
}
