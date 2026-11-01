/**
 * 提示词字段长度与存储容量上限，宿主校验与 Webview 输入限制共用同一来源。
 * 宿主按此拒绝超长内容并在读档时截断，Webview 用同一常量设置 maxLength，
 * 避免两侧各写魔法数字后出现「前端能输入、提交却被拒」的错位。
 * 容量上限按整份列表序列化后的字节数计：该键会整键同步到 Settings Sync，体积失控会让同步报 TooLarge 失败。
 * 注意：调整数值会改变已存数据的读档结果（PromptStore 按此截断），需同步检查内置模板正文长度。
 */

export const MAX_LABEL_LENGTH = 40
export const MAX_PROMPT_LENGTH = 8000

/** 整份提示词列表（JSON 序列化后）的字节上限，保存时会校验，超出即拒绝 */
export const MAX_TOTAL_BYTES = 512 * 1024
