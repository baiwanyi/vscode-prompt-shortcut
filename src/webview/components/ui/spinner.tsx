/**
 * 旋转加载指示器（shadcn registry 官方实现）。
 * 复用约定：尺寸与颜色由调用方经 className 传入，默认 size-4 跟随所在文字的行高。
 * 注意：组件自带 role="status" 与 aria-label，加载文案由旁边文字给出，避免重复朗读。
 */
import { cn } from 'cn'
import { Loader2Icon } from 'lucide-react'
import type { ComponentProps } from 'react'

function Spinner({ className, ...props }: ComponentProps<'svg'>) {
    return (
        <Loader2Icon
            data-slot="spinner"
            role="status"
            aria-label="Loading"
            className={cn('size-4 animate-spin', className)}
            {...props}
        />
    )
}

export { Spinner }
