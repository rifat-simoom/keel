import { cn } from '../../lib/cn'
import { CATEGORY_LABELS } from '@keel/types'
import type { TransactionCategory } from '@keel/types'

const CATEGORY_COLOURS: Record<string, string> = {
  TRAVEL: 'bg-blue-50 text-blue-700',
  VEHICLE: 'bg-blue-50 text-blue-700',
  OFFICE: 'bg-gray-50 text-gray-700',
  EQUIPMENT: 'bg-purple-50 text-purple-700',
  SOFTWARE: 'bg-violet-50 text-violet-700',
  MARKETING: 'bg-pink-50 text-pink-700',
  PROFESSIONAL: 'bg-indigo-50 text-indigo-700',
  TELEPHONE: 'bg-cyan-50 text-cyan-700',
  PREMISES: 'bg-orange-50 text-orange-700',
  WAGES: 'bg-yellow-50 text-yellow-700',
  BANK_CHARGES: 'bg-gray-50 text-gray-600',
  INSURANCE: 'bg-teal-50 text-teal-700',
  TRAINING: 'bg-emerald-50 text-emerald-700',
  ENTERTAINMENT: 'bg-red-50 text-red-700',
  OTHER: 'bg-gray-50 text-gray-500',
}

interface CategoryBadgeProps {
  category?: string | null
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  if (!category) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          'bg-amber-50 text-amber-600',
          className,
        )}
      >
        Uncategorised
      </span>
    )
  }

  const colour = CATEGORY_COLOURS[category] ?? 'bg-gray-50 text-gray-600'
  const label = CATEGORY_LABELS[category as TransactionCategory] ?? category

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        colour,
        className,
      )}
    >
      {label}
    </span>
  )
}
