/**
 * 全局提示组件（shadcn registry 官方实现，本项目已按 VS Code 主题改造）。
 * 主题取自 main.tsx 维护的根元素 .dark 类，用 MutationObserver 订阅切换，不依赖第三方 Provider；
 * 颜色另由组件内 CSS 变量映射到主题令牌。
 * 注意：调用方只需挂载一次 Toaster，重复挂载会导致同一条提示渲染两次；
 * 订阅函数与快照函数定义在模块级，避免每次渲染重新订阅。
 */
'use client'

import { useSyncExternalStore } from 'react'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** 主题订阅：syncDarkClass 改写 <html> 的 class 时通知订阅者 */
function subscribeTheme(onChange: () => void): () => void {
    const observer = new MutationObserver(onChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return (): void => {
        observer.disconnect()
    }
}

function getIsDarkTheme(): boolean {
    return document.documentElement.classList.contains('dark')
}

/** 服务端快照：Webview 不参与 SSR，仅用于满足 useSyncExternalStore 的三参签名 */
function getIsDarkThemeOnServer(): boolean {
    return false
}

const Toaster = ({ ...props }: ToasterProps) => {
    const isDarkTheme = useSyncExternalStore(subscribeTheme, getIsDarkTheme, getIsDarkThemeOnServer)

    return (
        <Sonner
            theme={isDarkTheme ? 'dark' : 'light'}
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--border-radius': 'var(--radius)',
                } as React.CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: 'cn-toast',
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
