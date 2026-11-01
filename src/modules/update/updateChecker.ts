/**
 * 更新检查：拉取仓库里的更新清单，与本机版本比对后给出结论。
 * 清单是远程不可信输入，先用 isRecord 收窄再逐字段校验，且只接受 https 地址；
 * 失败与「已最新」都只写输出面板，不打扰用户，也不阻塞激活流程。
 * 注意：本模块不做下载与安装，只负责「发现新版本 + 给出下载页」，装包由 VS Code 扩展视图完成。
 */
import type { Reporter } from '../common/createReporter'
import { describeError } from '../../shared/errors'
import { isRecord } from '../../shared/guards'

/** 更新清单的契约：版本号与下载页地址缺一不可 */
export interface UpdateManifest {
    version: string
    url: string
}

export type UpdateOutcome =
    | { type: 'update'; manifest: UpdateManifest }
    | { type: 'skipped'; reason: string }
    | { type: 'failed'; reason: string }

/** 清单只收 https：明文 http 与 file 协议都可能被中间人改写 */
const HTTPS_PREFIX = 'https://'

/** 请求超时：GitHub 在受限网络下会长时间无响应，超时按失败处理即可 */
const TIMEOUT_MS = 3000

/** 字段长度上限：清单本身只有两行，异常长度直接判为脏数据 */
const MAX_FIELD_LENGTH = 2048

/** 解析版本号前三段数字：容忍 `1.2`、`1.2.3-beta.1` 这类写法，解析失败返回 null */
function parseVersion(value: string): [number, number, number] | null {
    const match = /^(\d+)\.(\d+)(?:\.(\d+))?/u.exec(value.trim())
    if (!match) {
        return null
    }
    return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
}

/** 远端严格更高才算新版本：同版本或更低一律视为「无需提示」 */
export function isNewerVersion(candidate: string, current: string): boolean {
    const remote = parseVersion(candidate)
    const local = parseVersion(current)
    if (!remote || !local) {
        return false
    }
    for (let index = 0; index < 3; index += 1) {
        const remotePart = remote[index] ?? 0
        const localPart = local[index] ?? 0
        if (remotePart !== localPart) {
            return remotePart > localPart
        }
    }
    return false
}

/** 收窄远程清单：字段缺失、类型不符、超长或非 https 一律判为非法 */
function parseManifest(raw: unknown): UpdateManifest | null {
    if (!isRecord(raw)) {
        return null
    }
    const version = typeof raw.version === 'string' ? raw.version.trim() : ''
    const url = typeof raw.url === 'string' ? raw.url.trim() : ''
    if (!version || !url || version.length > MAX_FIELD_LENGTH || url.length > MAX_FIELD_LENGTH) {
        return null
    }
    if (!url.startsWith(HTTPS_PREFIX) || !parseVersion(version)) {
        return null
    }
    return { version, url }
}

type FetchResult = { ok: true; manifest: UpdateManifest } | { ok: false; reason: string }

/** 一次网络请求的完整降级：超时、非 2xx、JSON 解析失败、格式不符都收敛成失败原因 */
async function fetchManifest(manifestUrl: string): Promise<FetchResult> {
    try {
        const response = await fetch(manifestUrl, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!response.ok) {
            return { ok: false, reason: `HTTP ${response.status}` }
        }
        const raw: unknown = await response.json()
        const manifest = parseManifest(raw)
        return manifest ? { ok: true, manifest } : { ok: false, reason: '更新清单格式不正确' }
    } catch (error) {
        return { ok: false, reason: describeError(error) }
    }
}

/** 检查是否有新版本；report 只接收异常路径的排障信息，正常与「已最新」都不写日志 */
export async function checkForUpdate(
    localVersion: string,
    manifestUrl: string,
    report: Reporter,
): Promise<UpdateOutcome> {
    if (!localVersion) {
        return { type: 'skipped', reason: '本机版本号缺失' }
    }
    const fetched = await fetchManifest(manifestUrl)
    if (!fetched.ok) {
        report(`检查更新失败：${fetched.reason}`)
        return { type: 'failed', reason: fetched.reason }
    }
    if (!isNewerVersion(fetched.manifest.version, localVersion)) {
        return { type: 'skipped', reason: `已是最新版本 ${localVersion}` }
    }
    return { type: 'update', manifest: fetched.manifest }
}
