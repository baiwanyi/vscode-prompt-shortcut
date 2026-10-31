/**
 * 提示词字段长度上限，宿主校验与 Webview 输入限制共用同一来源。
 * 宿主按此拒绝超长内容并在读档时截断，Webview 用同一常量设置 maxLength，
 * 避免两侧各写魔法数字后出现「前端能输入、提交却被拒」的错位。
 * 注意：调整数值会改变已存数据的读档结果（PromptStore 按此截断），需同步检查内置模板正文长度。
 */

export const MAX_LABEL_LENGTH = 40
export const MAX_PROMPT_LENGTH = 8000
