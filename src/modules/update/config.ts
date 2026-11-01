/**
 * 更新检查的配置解析。
 * 默认清单指向仓库根目录的 update.json，经 GitHub raw 直接可读；网络受限时可整体换成镜像或内网地址。
 * 注意：地址留空表示用户主动关闭检查，调用方据此跳过网络请求，不要把它当成「回落默认值」。
 */
import * as vscode from 'vscode'

/** 默认清单地址：发版时由维护者同步更新仓库根目录的 update.json */
export const DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/baiwanyi/vscode-prompt-shortcut/main/update.json'

export interface UpdateSettings {
    /** 清单地址，空串表示关闭检查 */
    manifestUrl: string
    /** 启动时是否检查 */
    checkOnStartup: boolean
}

/** 把扩展设置读成更新配置；默认值只在本文件出现一次 */
export function resolveUpdateSettings(): UpdateSettings {
    const config = vscode.workspace.getConfiguration('baiwanyi.prompt')
    return {
        manifestUrl: config.get<string>('update.manifestUrl', DEFAULT_MANIFEST_URL).trim(),
        checkOnStartup: config.get<boolean>('update.checkOnStartup', true),
    }
}
