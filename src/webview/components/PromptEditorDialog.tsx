/**
 * 提示词新增/编辑对话框。
 * 表单状态完全受控于本组件，提交时只回传 PromptDraft，由宿主完成校验与持久化；
 * 内置模板允许修改文案，但名称之外的结构（id / builtin）由原始数据保留。
 * 注意：draft 变化时必须重置表单，否则会出现「切换编辑对象后仍显示上一条内容」的问题。
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { PROMPT_ICON_LABELS, PROMPT_ICON_MAP } from '@webview/lib/icons';
import { cn } from '@webview/lib/utils';
import type { ChatMode, PromptDraft, PromptIconKey } from '@shared/types';
import { CHAT_MODES, PROMPT_ICON_KEYS } from '@shared/types';

const MODE_LABELS: Record<ChatMode, string> = {
    craft: 'Craft（直接改代码）',
    ask: 'Ask（只问答不改动）',
    plan: 'Plan（先出方案）',
    debug: 'Debug（定位问题）',
};

const EMPTY_DRAFT: PromptDraft = {
    label: '',
    description: '',
    prompt: '',
    icon: 'sparkles',
    mode: 'craft',
};

interface PromptEditorDialogProps {
    open: boolean;
    draft: PromptDraft | null;
    onOpenChange: (open: boolean) => void;
    onSubmit: (draft: PromptDraft) => void;
}

export function PromptEditorDialog({ open, draft, onOpenChange, onSubmit }: PromptEditorDialogProps) {
    const [form, setForm] = useState<PromptDraft>(EMPTY_DRAFT);
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        setForm(draft ?? EMPTY_DRAFT);
        setTouched(false);
    }, [draft, open]);

    const errors = useMemo(() => {
        const result: string[] = [];
        if (!form.label.trim()) {
            result.push('名称不能为空');
        }
        if (!form.prompt.trim()) {
            result.push('提示词正文不能为空');
        }
        return result;
    }, [form.label, form.prompt]);

    const update = <K extends keyof PromptDraft>(key: K, value: PromptDraft[K]): void => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (): void => {
        setTouched(true);
        if (errors.length > 0) {
            return;
        }
        onSubmit({
            ...form,
            label: form.label.trim(),
            description: form.description.trim(),
            prompt: form.prompt.trim(),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{draft?.id ? '编辑提示词' : '新建提示词'}</DialogTitle>
                    <DialogDescription>
                        这段正文会原样发送给 CodeBuddy，建议写成可直接执行的完整指令，并写明禁止项。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    <div className="space-y-1">
                        <Label htmlFor="prompt-label">名称</Label>
                        <Input
                            id="prompt-label"
                            value={form.label}
                            maxLength={40}
                            placeholder="例如：生成单元测试"
                            onChange={(event) => update('label', event.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="prompt-description">说明（可选）</Label>
                        <Input
                            id="prompt-description"
                            value={form.description}
                            maxLength={120}
                            placeholder="一句话描述用途，显示在按钮下方"
                            onChange={(event) => update('description', event.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>图标</Label>
                        <div className="flex flex-wrap gap-1">
                            {PROMPT_ICON_KEYS.map((key: PromptIconKey) => {
                                const Icon = PROMPT_ICON_MAP[key];
                                const active = form.icon === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        title={PROMPT_ICON_LABELS[key]}
                                        aria-label={PROMPT_ICON_LABELS[key]}
                                        aria-pressed={active}
                                        className={cn(
                                            'flex h-6 w-6 items-center justify-center rounded border transition-colors',
                                            active
                                                ? 'border-ring bg-primary/20 text-foreground'
                                                : 'border-border text-muted-foreground hover:bg-accent',
                                        )}
                                        onClick={() => update('icon', key)}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="prompt-mode">对话模式</Label>
                        <select
                            id="prompt-mode"
                            value={form.mode}
                            className="h-7 w-full rounded-md border border-input bg-muted px-1.5 text-[13px] text-foreground"
                            onChange={(event) => update('mode', event.target.value as ChatMode)}
                        >
                            {CHAT_MODES.map((mode) => (
                                <option key={mode} value={mode}>
                                    {MODE_LABELS[mode]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="prompt-body">提示词正文</Label>
                            <span className="text-[10px] text-muted-foreground">{form.prompt.length} 字符</span>
                        </div>
                        <Textarea
                            id="prompt-body"
                            value={form.prompt}
                            rows={9}
                            maxLength={8000}
                            className="font-mono text-xs"
                            placeholder={'例如：\n请按以下顺序推进本次任务……\n不要修改无关文件。'}
                            onChange={(event) => update('prompt', event.target.value)}
                        />
                    </div>

                    {touched && errors.length > 0 ? (
                        <p className="text-[11px] text-destructive-foreground">{errors.join('；')}</p>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button size="sm" onClick={handleSubmit}>
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
