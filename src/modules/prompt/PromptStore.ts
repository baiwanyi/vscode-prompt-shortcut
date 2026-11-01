/**
 * 提示词模板的持久化与增删改查。
 * 数据落在扩展全局状态（globalState）而非工作区，确保同一套提示词跨项目复用；
 * 该键已在 activate 中登记给 Settings Sync，用户开启同步后可在多台设备间共享。
 * 预设模板只在「存储里还没有这份列表」时写入一次，此后与用户自建模板完全等价：
 * 可编辑、可排序、可删除，删空也不会被补回——是否存在存储值才是唯一判据。
 * 读取时统一做归一化：剔除结构非法的历史数据、重复 id 只保留首个，避免脏数据进入 Webview。
 * 顺序以持久化数组为准——用户的排序结果必须保留。
 * 旧键（LEGACY_PROMPT_STORAGE_KEY）只在迁移期读取：搬到新键后立即删除，日常读写一律不碰旧键。
 * 注意：写操作一律返回最新列表并立即落盘，调用方不要缓存旧引用；
 * 首次写入预设与后续写操作必须串行，否则初始化可能覆盖掉用户刚落盘的修改。
 */
import type { MoveDirection, PromptDraft, PromptTemplate } from '../../shared/types'
import type * as vscode from 'vscode'
import { isRecord } from '../../shared/guards'
import { MAX_LABEL_LENGTH, MAX_PROMPT_LENGTH } from '../../shared/promptLimits'
import { isChatMode, isPromptIconKey } from '../../shared/types'

/**
 * 存储键：既是 globalState 的读写键，也是登记给 Settings Sync 的同步键（见 activate）。
 * 注意：键名一旦发布就不能再改——换键会让已存模板全部读不到，等同于用户数据丢失。
 */
export const PROMPT_STORAGE_KEY = 'baiwanyi.prompt.templates.v1'

/**
 * 旧版存储键（早期沿用 webianPrompt 前缀），仅用于一次性迁移。
 * 迁移成功即删除该键；残留于已同步设备的旧数据由各端首次激活时各自搬迁，故常量不可提前移除。
 */
export const LEGACY_PROMPT_STORAGE_KEY = 'webianPrompt.templates.v1'

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
        icon: isPromptIconKey(raw.icon) ? raw.icon : 'fileText',
        mode: isChatMode(raw.mode) ? raw.mode : 'craft',
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    }
}

/** 把任意数组收敛为可信模板列表：逐条归一化，重复 id 只保留首个 */
function normalizeList(raw: readonly unknown[]): PromptTemplate[] {
    const seenIds = new Set<string>()
    const result: PromptTemplate[] = []
    raw.forEach((item, index) => {
        const template = normalizeTemplate(item, index)
        if (!template || seenIds.has(template.id)) {
            return
        }
        seenIds.add(template.id)
        result.push(template)
    })
    return result
}

export class PromptStore {
    /** 迁移进行中的 Promise：激活期与首次读档可能同时触发，据此复用同一次写盘 */
    private legacyMigration: Promise<void> | null = null

    /** 首次写入预设的进行中任务：写操作等它结束再落盘，避免初值覆盖用户修改 */
    private seeding: PromiseLike<void> | null = null

    constructor(
        private readonly memento: vscode.Memento,
        /** 预设模板：仅在存储尚无该键时使用，调用方不要把它当作可回灌的出厂内容 */
        private readonly presets: readonly PromptTemplate[],
    ) {}

    /**
     * 把旧键里的模板搬到新键，成功后删除旧键；供 activate 在登记同步键后主动调用。
     * 写盘前会复核新键仍为空——若期间已写入新数据（例如用户刚好保存过模板），只清旧键不覆盖。
     */
    async migrateLegacyStorage(): Promise<void> {
        if (this.legacyMigration) {
            return this.legacyMigration
        }
        const legacy = this.memento.get<unknown>(LEGACY_PROMPT_STORAGE_KEY)
        if (!Array.isArray(legacy)) {
            return
        }
        const migration = this.runMigration(legacy)
            .catch(() => {
                // 写盘失败不打断读档：旧键仍在，下次激活或读档会重新尝试
            })
            .finally(() => {
                this.legacyMigration = null
            })
        this.legacyMigration = migration
        return migration
    }

    private async runMigration(legacy: readonly unknown[]): Promise<void> {
        if (!Array.isArray(this.memento.get<unknown>(PROMPT_STORAGE_KEY))) {
            await this.memento.update(PROMPT_STORAGE_KEY, normalizeList(legacy))
        }
        await this.memento.update(LEGACY_PROMPT_STORAGE_KEY, undefined)
    }

    /**
     * 待迁移的旧数据：新键已有数组即视为已迁移，返回 null。
     * 据此即使用户清空过模板，也不会被旧键里的历史数据回灌。
     */
    private legacyPendingData(): unknown[] | null {
        if (Array.isArray(this.memento.get<unknown>(PROMPT_STORAGE_KEY))) {
            return null
        }
        const legacy = this.memento.get<unknown>(LEGACY_PROMPT_STORAGE_KEY)
        return Array.isArray(legacy) ? legacy : null
    }

    /**
     * 读取并归一化模板列表。
     * 存储里已有数组（哪怕已被用户删空成 []）就完全以它为准；
     * 只有从未落盘过，才依次尝试旧键数据、预设模板，并把结果写回，保证下一次读到的是同一份。
     */
    getAll(): PromptTemplate[] {
        const raw = this.memento.get<unknown>(PROMPT_STORAGE_KEY)
        if (Array.isArray(raw)) {
            return normalizeList(raw)
        }
        // 新键尚未落盘时先按旧键数据渲染，避免升级后首次展开面板显示成预设内容
        const legacy = this.legacyPendingData()
        if (legacy) {
            void this.migrateLegacyStorage()
            return normalizeList(legacy)
        }
        return this.seedPresets()
    }

    /** 首次使用：返回一份预设副本并异步落盘，与后续写操作的先后由 seeding 串行保证 */
    private seedPresets(): PromptTemplate[] {
        const seeds = this.presets.map((item) => ({ ...item }))
        // 成功与失败都要清空：写盘失败时下一次 getAll 会重新播种，不能让串行标记永久占位
        this.seeding = this.memento.update(PROMPT_STORAGE_KEY, seeds).then(
            (): void => {
                this.seeding = null
            },
            (): void => {
                this.seeding = null
            },
        )
        return seeds
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
            // 仅为满足 noUncheckedIndexedAccess：index 来自 findIndex >= 0，运行时不会缺失
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
                createdAt: now,
                updatedAt: now,
            })
        }
        await this.persist(list)
        return list
    }

    /** 删除模板；预设与自建一视同仁，删掉就只留在存储的历史里 */
    async remove(id: string): Promise<PromptTemplate[]> {
        const list = this.getAll().filter((item) => item.id !== id)
        await this.persist(list)
        return list
    }

    /** 在列表中移动一位，用于调整按钮顺序 */
    async move(id: string, direction: MoveDirection): Promise<PromptTemplate[]> {
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
        // 同上：index 合法时 splice 必返回一个元素，判空只为收窄类型
        if (!moved) {
            return list
        }
        list.splice(target, 0, moved)
        await this.persist(list)
        return list
    }

    private async persist(list: PromptTemplate[]): Promise<void> {
        if (this.seeding) {
            await this.seeding
        }
        await this.memento.update(PROMPT_STORAGE_KEY, list)
    }
}
