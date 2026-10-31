/**
 * 跨端通用的结构守卫。
 * 宿主读档（globalState）与 Webview 消息载荷都属不可信输入，取属性前必须先收窄为记录类型，
 * 否则会退化成类型断言，把运行时风险藏到后续逻辑里。
 * 注意：这里只判定「是不是非空对象」，不校验任何业务字段；字段白名单由各自域内的 is* 守卫负责。
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
