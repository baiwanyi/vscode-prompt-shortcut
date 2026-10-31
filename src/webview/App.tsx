/**
 * 提示词面板根组件。
 * 采用「宿主推送状态 + 本地派生视图」的结构：组件本身不持久化任何数据，
 * 所有写操作通过 postToHost 发送意图，由宿主校验后回推完整列表。
 * 注意：toast 与编辑弹窗属于纯展示态，刷新列表时不应被清空，因此与 payload 分开存放。
 */
import { CircleAlert, Info, Plus, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PromptCard } from '@components/PromptCard';
import { PromptEditorDialog } from '@components/PromptEditorDialog';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { ScrollArea } from '@components/ui/scroll-area';
import { useHostMessages } from '@webview/hooks/useHostMessages';
import { cn } from '@webview/lib/utils';
import { postToHost } from '@webview/lib/vscode';
import type { HostToWebviewMessage } from '@shared/messages';
import type { PromptDraft, PromptStatePayload, PromptTemplate } from '@shared/types';

interface ToastState {
    id: number;
    level: 'info' | 'warn' | 'error';
    message: string;
}

function toDraft(prompt: PromptTemplate): PromptDraft {
    return {
        id: prompt.id,
        label: prompt.label,
        description: prompt.description,
        prompt: prompt.prompt,
        icon: prompt.icon,
        mode: prompt.mode,
    };
}

export function App() {
    const [payload, setPayload] = useState<PromptStatePayload | null>(null);
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState<PromptDraft | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    const handleHostMessage = useCallback(
        (message: HostToWebviewMessage): void => {
            switch (message.type) {
                case 'state':
                    setPayload(message.payload);
                    break;
                case 'notify':
                    setToast({ id: Date.now(), level: message.level, message: message.message });
                    break;
                case 'editPrompt': {
                    const target = payload?.prompts.find((item) => item.id === message.payload.id);
                    setEditing(target ? toDraft(target) : null);
                    setDialogOpen(true);
                    break;
                }
                default:
                    break;
            }
        },
        [payload],
    );

    useHostMessages(handleHostMessage);

    useEffect(() => {
        postToHost({ type: 'ready' });
    }, []);

    useEffect(() => {
        if (!toast) {
            return undefined;
        }
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const prompts = payload?.prompts ?? [];
    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) {
            return prompts;
        }
        return prompts.filter((item) =>
            `${item.label}\n${item.description}\n${item.prompt}`.toLowerCase().includes(keyword),
        );
    }, [prompts, query]);

    const openNew = (): void => {
        setEditing(null);
        setDialogOpen(true);
    };

    const handleSubmit = (draft: PromptDraft): void => {
        postToHost({ type: 'savePrompt', draft });
        setDialogOpen(false);
        setEditing(null);
    };

    return (
        <div className="flex h-full flex-col">
            <header className="shrink-0 space-y-2 border-b border-border px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[13px] font-semibold">提示词</span>
                    <Badge variant="outline" className="ml-0.5">
                        {prompts.length}
                    </Badge>
                    <div className="ml-auto flex items-center gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            title="刷新"
                            aria-label="刷新"
                            onClick={() => postToHost({ type: 'requestState' })}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="新建提示词" aria-label="新建提示词" onClick={openNew}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        className="h-6 pl-6 text-xs"
                        placeholder="搜索提示词"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </div>

                {payload ? (
                    payload.codebuddy.detected ? (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            已连接 CodeBuddy
                            {payload.codebuddy.autoSend ? '（自动发送）' : '（仅复制）'}
                        </div>
                    ) : (
                        <div className="flex items-start gap-1 text-[10px] text-destructive-foreground">
                            <CircleAlert className="mt-px h-3 w-3 shrink-0" />
                            <span>未检测到 CodeBuddy 发送命令，点击后会退化为复制到剪贴板。</span>
                        </div>
                    )
                ) : null}
            </header>

            <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1.5 p-2">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                            <Info className="h-5 w-5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                                {prompts.length === 0 ? '还没有提示词，点击右上角 + 新建一条。' : '没有匹配的提示词。'}
                            </p>
                        </div>
                    ) : (
                        filtered.map((prompt) => {
                            const index = prompts.findIndex((item) => item.id === prompt.id);
                            return (
                                <PromptCard
                                    key={prompt.id}
                                    prompt={prompt}
                                    canMoveUp={!query.trim() && index > 0}
                                    canMoveDown={!query.trim() && index >= 0 && index < prompts.length - 1}
                                    onRun={(id) => postToHost({ type: 'runPrompt', id })}
                                    onCopy={(id) => postToHost({ type: 'copyPrompt', id })}
                                    onEdit={(id) => {
                                        const target = prompts.find((item) => item.id === id);
                                        if (!target) {
                                            return;
                                        }
                                        setEditing(toDraft(target));
                                        setDialogOpen(true);
                                    }}
                                    onDelete={(id) => postToHost({ type: 'deletePrompt', id })}
                                    onMove={(id, direction) => postToHost({ type: 'movePrompt', id, direction })}
                                />
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            <footer className="shrink-0 border-t border-border px-2.5 py-1.5">
                <p className="text-[10px] leading-4 text-muted-foreground">
                    点击右侧图标把提示词发送到 CodeBuddy；右键编辑器可通过「微边代码」调用修复与审查。
                </p>
            </footer>

            <PromptEditorDialog
                open={dialogOpen}
                draft={editing}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                        setEditing(null);
                    }
                }}
                onSubmit={handleSubmit}
            />

            {toast ? (
                <div
                    className={cn(
                        'pointer-events-none fixed bottom-2 left-2 right-2 z-50 rounded-md border px-2.5 py-1.5 text-[11px] shadow-lg',
                        toast.level === 'error'
                            ? 'border-destructive bg-card text-destructive-foreground'
                            : 'border-border bg-card text-foreground',
                    )}
                >
                    {toast.message}
                </div>
            ) : null}
        </div>
    );
}
