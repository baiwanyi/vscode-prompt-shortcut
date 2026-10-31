/**
 * 未知异常的文本收敛：把 catch 到的 unknown 转成可读的一句话。
 * 宿主与 Webview 共用同一口径——Error 取 message，字符串原样返回，对象序列化，基本类型转字符串，
 * 避免各处手写 instanceof 时漏分支，也避免对象被隐式转成 [object Object]。
 * 注意：这里只做文本转换，不记录日志也不上报；message 可能含内部路径，是否对外展示由调用方决定。
 * 序列化必须容错：错误对象常带循环引用或 BigInt，JSON.stringify 会抛错，而本函数本身就在 catch 链路里，
 * 二次抛错会绕过上层的用户提示。
 */

/** 把未知异常收敛为可读文本；任何输入都返回字符串，不向外抛错 */
export function describeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === 'string') {
        return error
    }
    if (error === undefined || error === null) {
        return '未知错误'
    }
    if (typeof error === 'object') {
        try {
            // 显式放宽为 string | undefined：toJSON 返回 undefined 时 stringify 会给出 undefined
            const serialized: string | undefined = JSON.stringify(error)
            return serialized ?? '未知错误'
        } catch {
            return '无法序列化的错误对象'
        }
    }
    // 剩余取值是原始类型与函数：逐个显式转换，既不依赖隐式 toString，也不会对 symbol 抛 TypeError
    if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') {
        return String(error)
    }
    if (typeof error === 'symbol') {
        return error.description ?? 'symbol'
    }
    if (typeof error === 'function') {
        return error.name || 'function'
    }
    return '未知错误'
}
