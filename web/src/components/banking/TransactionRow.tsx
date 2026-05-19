import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatGBP, formatDate } from '@keel/utils'
import { CategoryBadge } from './CategoryBadge'
import type { Transaction } from '@keel/types'

interface TransactionRowProps {
  transaction: Transaction
  onClick?: () => void
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const isCredit = transaction.amount > 0

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keel-500"
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
          isCredit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500',
        )}
      >
        {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
      </div>

      {/* Description + category */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{transaction.description}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatDate(transaction.transaction_date)}</span>
          {transaction.merchant_name && (
            <span className="text-xs text-gray-400">· {transaction.merchant_name}</span>
          )}
        </div>
      </div>

      {/* Category badge */}
      <CategoryBadge category={transaction.category} className="hidden sm:inline-flex" />

      {/* Amount */}
      <span
        className={cn(
          'ml-2 flex-shrink-0 text-sm font-semibold tabular-nums',
          isCredit ? 'text-green-600' : 'text-gray-900',
        )}
      >
        {isCredit ? '+' : ''}{formatGBP(transaction.amount)}
      </span>
    </button>
  )
}
