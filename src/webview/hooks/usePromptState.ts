/**
 * 提示词面板的宿主状态订阅。
 * 负责向宿主发送 ready 握手，并把推送来的三类消息落到界面：状态写入、普通通知、CodeBuddy 缺失的常驻提示。
 * 容量已满时另起一条带固定 id 的常驻提醒，用量回落后自动关闭，避免与 CodeBuddy 缺失提示互相覆盖。
 * 编辑请求不在本 Hook 内处理（见 usePromptEditor），避免数据订阅与弹窗状态互相牵制。
 * 注意：常驻提示使用固定 id，状态恢复后必须显式 dismiss，否则它会与后续提示堆叠且不会自动消失。
 */
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { HostToWebviewMessage } from '@shared/messages'
import { CAPACITY_LIMIT_KB, capacityKb, isCapacityFull } from '@shared/promptCapacity'
import type { PromptStatePayload } from '@shared/types'
import { useHostMessages } from '@webview/hooks/useHostMessages'
import { postToHost } from '@webview/lib/vscode'

/** 常驻提示的固定 id，状态恢复后据此关闭，避免多条堆叠 */
const CODEBUDDY_MISSING_TOAST_ID = 'codebuddy-missing'
const CAPACITY_FULL_TOAST_ID = 'prompt-capacity-full'

export function usePromptState(): PromptStatePayload | null {
    const [payload, setPayload] = useState<PromptStatePayload | null>(null)

    const handleHostMessage = useCallback((message: HostToWebviewMessage): void => {
        switch (message.type) {
            case 'state': {
                setPayload(message.payload)
                if (message.payload.codebuddy.detected) {
                    toast.dismiss(CODEBUDDY_MISSING_TOAST_ID)
                }
                if (isCapacityFull(message.payload.usedBytes)) {
                    toast.warning('提示词容量已满', {
                        id: CAPACITY_FULL_TOAST_ID,
                        description: `已用 ${capacityKb(message.payload.usedBytes)} / ${CAPACITY_LIMIT_KB} KB。新增或改大内容会被拒绝，请先删除或精简部分提示词。`,
                        duration: Infinity,
                    })
                } else {
                    toast.dismiss(CAPACITY_FULL_TOAST_ID)
                }
                break
            }
            case 'notify':
                if (message.level === 'error') {
                    toast.error(message.message)
                } else if (message.level === 'warn') {
                    toast.warning(message.message)
                } else {
                    toast.info(message.message)
                }
                break
            case 'codebuddyMissing':
                toast.error('未检测到 CodeBuddy', {
                    id: CODEBUDDY_MISSING_TOAST_ID,
                    description:
                        'CodeBuddy 可能尚未激活或未安装。点击「刷新」重新检测；CodeBuddy 打开后通常会自动恢复。',
                    duration: Infinity,
                    action: {
                        label: '刷新',
                        onClick: (): void => postToHost({ type: 'requestState' }),
                    },
                })
                break
            default:
                break
        }
    }, [])

    useHostMessages(handleHostMessage)

    useEffect(() => {
        postToHost({ type: 'ready' })
    }, [])

    return payload
}
