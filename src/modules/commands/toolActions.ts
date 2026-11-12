/**
 * 环境维护类工具命令清单：命令 ID、目标命令委派与界面元数据的唯一来源。
 * 与 actionRegistry 的差异在于这些动作不发送提示词、不读取选区、不需要 CodeBuddy，
 * 因此不进入提示词存储与资源模板体系，只做「本扩展命令 → VS Code 命令」的转发。
 * 新增动作需同步 package.json 的 contributes.commands 与右键子菜单两处入口。
 * 注意：委派 ID 属外部扩展或 VS Code 内置实现，版本升级可能改名，集中在此表便于单点修正。
 */
import type { ToolActionInfo } from '../../shared/types'

export interface ToolActionEntry extends ToolActionInfo {
    /** 与 package.json 的 contributes.commands 同名 */
    command: string
    /** 实际执行的目标命令 ID */
    delegate: string
    /** 目标命令不存在时的可读提示：要指出缺哪个扩展，而不是暴露底层报错 */
    missingHint: string
    /** 执行后宿主立即销毁（窗口重载）：处理器不得等待其返回 */
    isDetached?: boolean
}

export const TOOL_ACTIONS: readonly ToolActionEntry[] = [
    {
        id: 'reloadWindow',
        command: 'baiwanyi.prompt.reloadWindow',
        label: '重载窗口',
        description: '重新加载 VS Code 窗口，用于扩展与设置异常时的复位',
        delegate: 'workbench.action.reloadWindow',
        missingHint: '无法重新加载窗口，请从命令面板执行「开发人员: 重新加载窗口」。',
        isDetached: true,
    },
    {
        id: 'restartEslint',
        command: 'baiwanyi.prompt.restartEslint',
        label: '重启 ESLint',
        description: '重启 ESLint 语言服务，让配置与依赖改动立即生效',
        delegate: 'eslint.restart',
        missingHint: '未找到 ESLint 重启命令，请确认已安装并启用 ESLint 扩展。',
    },
    {
        id: 'restartTsServer',
        command: 'baiwanyi.prompt.restartTsServer',
        label: '重启 TS',
        description: '重启 TypeScript 语言服务，刷新类型检查与项目引用',
        delegate: 'typescript.restartTsServer',
        missingHint: '未找到 TypeScript 重启命令，请确认已启用内置 TypeScript 扩展。',
    },
]

/** 下发给 Webview 的最小元数据：委派 ID 与失败提示属宿主内部细节，不进协议 */
export function listToolActions(): ToolActionInfo[] {
    return TOOL_ACTIONS.map(({ id, label, description }): ToolActionInfo => ({ id, label, description }))
}

/** 按 id 查表：Webview 传入的 id 不可信，查不到一律视为非法请求 */
export function findToolAction(id: string): ToolActionEntry | undefined {
    return TOOL_ACTIONS.find((entry) => entry.id === id)
}
