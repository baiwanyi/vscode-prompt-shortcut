/**
 * Webview 通用样式工具。
 * 仅导出 clsx + tailwind-merge 的组合函数，用于合并条件类名并消除 Tailwind 冲突类；
 * 不在这里放业务逻辑，避免宿主与 Webview 的职责边界模糊。
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
