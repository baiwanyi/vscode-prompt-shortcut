/**
 * 提示词模板的持久化与增删改查。
 * 数据落在扩展全局状态（globalState）而非工作区，确保同一套提示词跨项目复用；
 * 该键已在 activate 中登记给 Settings Sync，用户开启同步后可在多台设备间共享；
 * 读取时统一做归一化：补齐被删除的内置模板、剔除结构非法的历史数据，避免脏数据进入 Webview。
 * 注意：所有写操作返回最新列表并立即落盘，调用方不要缓存旧引用；内置模板只允许改文案，不允许删除。
 */
import { BUILTIN_PROMPT_IDS, createBuiltinPrompts } from './defaults'
import type { PromptDraft, PromptTemplate } from '../../shared/types'
import type * as vscode from 'vscode'
import { isRecord } from '../../shared/guards'
import { isPromptIconKey } from '../../shared/messages'
import { MAX_LABEL_LENGTH, MAX_PROMPT_LENGTH } from '../../shared/promptLimits'
import { isChatMode } from '../../shared/types'

/** 存储键：既是 globalState 的读写键，也是登记给 Settings Sync 的同步键（见 activate） */
export const PROMPT_STORAGE_KEY = 'webianPrompt.templates.v1'

/** 把外部输入收敛为一条可信模板，非法字段一律回落到安全默认值 */
function normalizeTemplate(raw: unknown, index: number): PromptTemplate | null {
    if (!isRecord(raw)) {
        return null
    }
    const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, MAX_LABEL_LENGTH) : ''
    const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim().slice(0, MAX_PROMPT_LENGTH) : ''
    // 正文允许为空：空正文在发送时回退为名称，只有名称缺失才算脏数据
    if (!label) {
        return null
    }
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `custom-${Date.now()}-${index}`
    return {
        id,
        label,
        prompt,
        icon: isPromptIconKey(raw.icon) ? raw.icon : 'file-text',
        mode: isChatMode(raw.mode) ? raw.mode : 'craft',
        builtin: BUILTIN_PROMPT_IDS.includes(id),
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    }
}

export class PromptStore {
    constructor(private readonly memento: vscode.Memento) {}

    /** 读取并归一化模板列表；内置模板缺失时按内置顺序补回原位 */
    getAll(): PromptTemplate[] {
        const raw = this.memento.get<unknown>(PROMPT_STORAGE_KEY)
        const stored = Array.isArray(raw)
            ? raw
                  .map((item, index) => normalizeTemplate(item, index))
                  .filter((item): item is PromptTemplate => item !== null)
            : []

        const builtinFallback = createBuiltinPrompts()
        const result: PromptTemplate[] = []
        for (const builtin of builtinFallback) {
            const existing = stored.find((item) => item.id === builtin.id)
            result.push(existing ? { ...existing, builtin: true } : builtin)
        }
        for (const item of stored) {
            if (!BUILTIN_PROMPT_IDS.includes(item.id)) {
                result.push(item)
            }
        }
        return result
    }

    /** 按 id 取单条模板；不存在时返回 undefined，由调用方决定提示文案与后续动作 */
    get(id: string): PromptTemplate | undefined {
        return this.getAll().find((item) => item.id === id)
    }

    /** 新增或更新模板；draft.id 命中已有模板时为更新 */
    async save(draft: PromptDraft): Promise<PromptTemplate[]> {
        const list = this.getAll()
        const now = Date.now()
        const index = draft.id ? list.findIndex((item) => item.id === draft.id) : -1

        if (index >= 0) {
            const current = list[index]
            if (!current) {
                return list
            }
            list[index] = {
                ...current,
                label: draft.label,
                prompt: draft.prompt,
                icon: draft.icon,
                mode: draft.mode,
                updatedAt: now,
            }
        } else {
            list.push({
                id: `custom-${now}`,
                label: draft.label,
                prompt: draft.prompt,
                icon: draft.icon,
                mode: draft.mode,
                builtin: false,
                createdAt: now,
                updatedAt: now,
            })
        }
        await this.persist(list)
        return list
    }

    /** 删除自定义模板；内置模板静默忽略 */
    async remove(id: string): Promise<PromptTemplate[]> {
        const list = this.getAll().filter((item) => item.id !== id || item.builtin)
        await this.persist(list)
        return list
    }

    /** 在列表中移动一位，用于调整按钮顺序 */
    async move(id: string, direction: 'up' | 'down'): Promise<PromptTemplate[]> {
        const list = this.getAll()
        const index = list.findIndex((item) => item.id === id)
        if (index < 0) {
            return list
        }
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= list.length) {
            return list
        }
        const [moved] = list.splice(index, 1)
        if (!moved) {
            return list
        }
        list.splice(target, 0, moved)
        await this.persist(list)
        return list
    }

    /** 恢复为出厂状态：丢弃全部自定义模板，内置模板正文回到默认值 */
    async reset(): Promise<PromptTemplate[]> {
        const list = createBuiltinPrompts()
        await this.persist(list)
        return list
    }

    /** 把单条内置模板恢复为出厂定义；id 不属于内置模板时静默返回原列表 */
    async restoreBuiltin(id: string): Promise<PromptTemplate[]> {
        const list = this.getAll()
        const seed = createBuiltinPrompts().find((item) => item.id === id)
        if (!seed) {
            return list
        }
        const next = list.map((item) => (item.id === id ? seed : item))
        await this.persist(next)
        return next
    }

    private async persist(list: PromptTemplate[]): Promise<void> {
        await this.memento.update(PROMPT_STORAGE_KEY, list)
    }
}
