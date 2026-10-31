/**
 * Webview 运行时全局声明。
 * VSCode 在 webview 中注入 acquireVsCodeApi，但它不属于 DOM 标准类型，需要在此补充声明；
 * 文件保持无顶层 import/export，确保声明的名称落在全局作用域。
 */

interface VsCodeApi {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;
