/**
 * 更新检查的配置解析。
 * 已上架 VS Code Marketplace，版本升级由市场自动完成，故默认清单地址留空、启动检查默认关闭；
 * 仅当分发绕开市场（内网、离线镜像）时，才由用户显式填写自建清单地址。
 * 注意：地址留空表示不做检查，调用方据此跳过网络请求，不要把它当成「回落默认值」。
 */
import * as vscode from 'vscode'

/** 默认清单地址：市场通道无需自建清单，留空表示默认不检查 */
export const DEFAULT_MANIFEST_URL = ''

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
        checkOnStartup: config.get<boolean>('update.checkOnStartup', false),
    }
}
