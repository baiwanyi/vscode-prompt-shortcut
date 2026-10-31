/**
 * 输出面板日志通道工厂：首次写入时才创建通道，并立即登记释放。
 * 桥接层与面板层都需要「按需开日志、随扩展停用释放」这一行为，交给工厂统一，
 * 调用方因此不必各自持有 OutputChannel 字段，也不必记得 dispose。
 * 注意：registerDisposable 必须接扩展上下文的 subscriptions，否则通道会驻留到窗口重载。
 */
import * as vscode from 'vscode'

export type Reporter = (message: string) => void

/** 创建一个按需初始化的日志写入函数；同一实例复用同一个通道 */
export function createReporter(
    channelName: string,
    registerDisposable: (disposable: vscode.Disposable) => void,
): Reporter {
    let channel: vscode.OutputChannel | undefined
    return (message: string): void => {
        if (!channel) {
            channel = vscode.window.createOutputChannel(channelName)
            registerDisposable(channel)
        }
        channel.appendLine(message)
    }
}
