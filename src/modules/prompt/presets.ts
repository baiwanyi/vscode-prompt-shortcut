/**
 * 预设内容的加载：把 resources/ 下的 Markdown 读成宿主可用的结构化数据。
 * 预设提示词用于首次激活时初始化存储，动作提示词供右键「快捷命令」的五个入口拼装指令；
 * 两者共用同一套行式解析——`## 键` 起一段，段内 `- key: value` 是元数据，text 代码块是正文。
 * 注意：解析跳过代码块内的行，因此正文可以自由包含 Markdown 标题；
 * 资源缺失或格式不合法一律抛错，静默降级会让人以为「少了几条」却查不出原因。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ChatMode, PromptIconKey, PromptTemplate } from '../../shared/types'
import { isChatMode, isPromptIconKey } from '../../shared/types'

/** 资源目录：宿主入口打包为 dist/extension.js，而 resources/ 始终位于扩展包根目录 */
const RESOURCES_DIR = join(dirname(__filename), '..', 'resources')

/** 一段 Markdown 的结构：键名、元数据与正文 */
interface ResourceSection {
    key: string
    meta: Map<string, string>
    body: string
}

/** 标题行：二级标题即段名，三级及以下留给正文使用 */
const HEADING_PATTERN = /^##\s+(.+)$/u

/** 元数据行：`- icon: terminal` 这类列表项 */
const META_PATTERN = /^[-*]\s+([\w-]+):\s*(.+)$/u

/** 按段解析：代码块内的内容整体归入正文，不参与标题与元数据判定 */
function parseSections(markdown: string): ResourceSection[] {
    const sections: ResourceSection[] = []
    const bodyLines: string[] = []
    let current: ResourceSection | null = null
    let isInFence = false

    const flush = (): void => {
        if (!current) {
            return
        }
        current.body = bodyLines.join('\n').trim()
        sections.push(current)
        bodyLines.length = 0
    }

    for (const rawLine of markdown.split(/\r?\n/u)) {
        if (rawLine.startsWith('```')) {
            isInFence = !isInFence
            continue
        }
        if (isInFence) {
            bodyLines.push(rawLine)
            continue
        }
        const heading = HEADING_PATTERN.exec(rawLine)
        if (heading) {
            flush()
            current = { key: (heading[1] ?? '').trim(), meta: new Map(), body: '' }
            continue
        }
        const meta = META_PATTERN.exec(rawLine)
        if (meta && current) {
            current.meta.set((meta[1] ?? '').toLowerCase(), (meta[2] ?? '').trim())
        }
    }
    flush()

    return sections
}

/** 读资源文件：编码固定 utf8，缺失即抛错并带上文件名 */
function readResource(fileName: string): string {
    return readFileSync(join(RESOURCES_DIR, fileName), 'utf8')
}

/** 取枚举型元数据：取值不合法时回落到安全默认值，不让脏配置进入存储 */
function readIcon(meta: Map<string, string>): PromptIconKey {
    const icon = meta.get('icon')
    return isPromptIconKey(icon) ? icon : 'fileText'
}

function readMode(meta: Map<string, string>): ChatMode {
    const mode = meta.get('mode')
    return isChatMode(mode) ? mode : 'craft'
}

/**
 * 预设提示词：仅用于存储尚无该键时的那一次初始化。
 * id 按段序生成即可——预设身份不需要跨设备稳定，写入存储后就是普通模板，与用户自建条目无异。
 */
export function loadPresets(): PromptTemplate[] {
    const now = Date.now()
    return parseSections(readResource('prompts.md')).map((section, index) => ({
        id: `preset-${index + 1}`,
        label: section.key,
        prompt: section.body,
        icon: readIcon(section.meta),
        mode: readMode(section.meta),
        createdAt: now,
        updatedAt: now,
    }))
}

/** 动作提示词：键为动作名，值为含 {{target}} 占位符的模板原文 */
export function loadActionTemplates(): Map<string, string> {
    const templates = new Map<string, string>()
    for (const section of parseSections(readResource('actions.md'))) {
        templates.set(section.key, section.body)
    }
    return templates
}
