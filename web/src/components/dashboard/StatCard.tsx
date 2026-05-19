import { cn } from '../../lib/cn'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  subtext?: string
  icon: LucideIcon
  iconColor?: string
  badge?: { text: string; variant: 'red' | 'amber' | 'green' | 'blue' }
  loading?: boolean
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-keel-500',
  badge,
  loading = false,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-28 animate-pulse rounded-md bg-gray-100" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          )}
          {subtext && !loading && (
            <p className="mt-1 text-sm text-gray-500">{subtext}</p>
          )}
        </div>
        <div className={cn('ml-4 flex-shrink-0 rounded-lg bg-gray-50 p-2.5', iconColor)}>
          <Icon size={20} />
        </div>
      </div>
      {badge && (
        <div className="mt-4">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              badge.variant === 'red' && 'bg-red-50 text-red-700',
              badge.variant === 'amber' && 'bg-amber-50 text-amber-700',
              badge.variant === 'green' && 'bg-green-50 text-green-700',
              badge.variant === 'blue' && 'bg-blue-50 text-blue-700',
            )}
          >
            {badge.text}
          </span>
        </div>
      )}
    </div>
  )
}
