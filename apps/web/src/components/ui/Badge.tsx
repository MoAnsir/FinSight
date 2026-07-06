import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'indigo'
  className?: string
  onClick?: () => void
}

const variants = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
  danger: 'bg-red-50 text-red-700',
  indigo: 'bg-indigo-50 text-indigo-700',
}

export function Badge({ children, variant = 'default', className, onClick }: Props) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        variants[variant],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className,
      )}
    >
      {children}
    </span>
  )
}
