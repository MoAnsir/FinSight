import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

export function Card({ padding = 'md', className, children, ...props }: Props) {
  return (
    <div {...props} className={cn('bg-white rounded-xl border border-gray-200', paddings[padding], className)}>
      {children}
    </div>
  )
}
