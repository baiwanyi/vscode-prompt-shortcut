/**
 * 提示词字段的业务判定谓词，宿主校验与 Webview 表单提示共用的唯一口径。
 * 只回答「什么算缺失」，不承担归一化动作：前端提交前的 trim 属体验层，
 * 宿主 parseDraft 的收敛属不可信输入防线，两层各自保留，避免把防线委托给不可信的一方。
 * 注意：这里是判定口径的唯一来源，宿主与前端都不得再各写一份 trim 判空。
 */

/** 仅含空白视为名称缺失 */
export function isLabelMissing(label: string): boolean {
    return label.trim().length === 0
}
