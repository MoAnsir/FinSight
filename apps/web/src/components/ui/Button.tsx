import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50',
  secondary: 'border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40',
  danger: 'text-red-400 hover:text-red-600',
  ghost: 'text-gray-400 hover:text-gray-600',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn('rounded-lg font-medium transition-colors disabled:cursor-not-allowed', variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  )
}
