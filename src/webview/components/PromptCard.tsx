/**
 * 提示词卡片：面板中的主要操作单元。
 * 卡片主体展示图标、名称与说明，右侧独立发送按钮触发「填入并发送」；
 * 编辑、排序、删除等低频操作收在 hover 才出现的操作行里，避免窄侧边栏误触。
 * 注意：发送按钮与卡片点击是两条不同的事件路径，不要在同层嵌套 button。
 */
import { ArrowDown, ArrowUp, Copy, Pencil, Send, Trash2 } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { PROMPT_ICON_MAP } from '@webview/lib/icons';
import { cn } from '@webview/lib/utils';
import type { PromptTemplate } from '@shared/types';

interface PromptCardProps {
    prompt: PromptTemplate;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onRun: (id: string) => void;
    onCopy: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onMove: (id: string, direction: 'up' | 'down') => void;
}

export function PromptCard({
    prompt,
    canMoveUp,
    canMoveDown,
    onRun,
    onCopy,
    onEdit,
    onDelete,
    onMove,
}: PromptCardProps) {
    const Icon = PROMPT_ICON_MAP[prompt.icon];

    return (
        <div
            className={cn(
                'group relative rounded-md border border-border bg-card px-2.5 py-2',
                'transition-colors hover:border-ring/70',
            )}
        >
            <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium leading-5">{prompt.label}</span>
                        {prompt.builtin ? <Badge variant="outline">内置</Badge> : null}
                    </div>
                    {prompt.description ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                            {prompt.description}
                        </p>
                    ) : null}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-primary hover:bg-primary/15"
                    title={`发送「${prompt.label}」到 CodeBuddy`}
                    aria-label={`发送「${prompt.label}」到 CodeBuddy`}
                    onClick={() => onRun(prompt.id)}
                >
                    <Send className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className={cn('mt-1.5 hidden items-center gap-0.5 border-t border-border/60 pt-1.5', 'group-hover:flex')}>
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[11px]" onClick={() => onEdit(prompt.id)}>
                    <Pencil className="h-3 w-3" />
                    编辑
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    title="复制提示词"
                    aria-label="复制提示词"
                    onClick={() => onCopy(prompt.id)}
                >
                    <Copy className="h-3 w-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    title="上移"
                    aria-label="上移"
                    disabled={!canMoveUp}
                    onClick={() => onMove(prompt.id, 'up')}
                >
                    <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    title="下移"
                    aria-label="下移"
                    disabled={!canMoveDown}
                    onClick={() => onMove(prompt.id, 'down')}
                >
                    <ArrowDown className="h-3 w-3" />
                </Button>
                {!prompt.builtin ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-5 px-1.5 text-[11px] text-destructive-foreground"
                        onClick={() => onDelete(prompt.id)}
                    >
                        <Trash2 className="h-3 w-3" />
                        删除
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
