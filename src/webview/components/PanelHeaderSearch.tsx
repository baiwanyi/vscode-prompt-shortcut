/**
 * 面板头部的搜索区：常态只渲染图标按钮，展开后以覆盖层占用标题行的位置与高度。
 * 展开态与收起规则由 useSearchOverlay 提供，本组件只按 search 对象分支渲染，不再自行判态。
 * 注意：覆盖层必须带不透明背景，否则下层标题会透出；输入框依赖 autoFocus 抢焦点，
 * 因此打开动作只切状态、不手动 focus。
 */
import { Search } from 'lucide-react'
import { Button } from '@components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@components/ui/input-group'
import type { SearchOverlayApi } from '@webview/hooks/useSearchOverlay'
import type { JSX } from 'react'

/** 搜索入口的统一文案：按钮可读名与输入框说明共用，避免两处措辞漂移 */
const SEARCH_LABEL = '搜索提示词'

interface PanelHeaderSearchProps {
    /** 展开态与收起策略，来自 useSearchOverlay */
    search: SearchOverlayApi
    query: string
    onQueryChange: (value: string) => void
}

export function PanelHeaderSearch({ search, query, onQueryChange }: PanelHeaderSearchProps): JSX.Element {
    if (!search.isOpen) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-muted-foreground"
                aria-label={SEARCH_LABEL}
                onClick={search.open}
            >
                <Search className="size-4" />
            </Button>
        )
    }

    return (
        <InputGroup className="absolute inset-0 z-10 bg-background">
            <InputGroupAddon align="inline-start">
                <Search />
            </InputGroupAddon>
            <InputGroupInput
                autoFocus
                value={query}
                placeholder={SEARCH_LABEL}
                aria-label={SEARCH_LABEL}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={search.handleKeyDown}
                onBlur={search.handleBlur}
            />
        </InputGroup>
    )
}
