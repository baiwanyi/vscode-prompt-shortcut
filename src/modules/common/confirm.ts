/**
 * 宿主侧的 modal 二次确认封装。
 * 统一「showWarningMessage + 精确比较按钮文案 + 布尔返回」这一形态，让各入口只关心「确认后做什么」，
 * 不再各自复写取消判断；破坏性操作（恢复默认、恢复单条内置）都应经由本函数把关。
 * 注意：按钮文案必须与比较值同源传入——用户关闭弹窗时 VSCode 返回 undefined，
 * 若用「不等于取消」这类宽松判断，误点关闭会被当成确认。
 */
import * as vscode from 'vscode'

export async function confirmAction(message: string, confirmLabel: string): Promise<boolean> {
    const confirmed = await vscode.window.showWarningMessage(message, { modal: true }, confirmLabel)
    return confirmed === confirmLabel
}
