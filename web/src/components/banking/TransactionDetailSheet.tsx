import { X, Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatGBP, formatDate } from '@keel/utils'
import { CATEGORY_LABELS } from '@keel/types'
import type { Transaction, TransactionCategory } from '@keel/types'
import { CategoryBadge } from './CategoryBadge'
import { useUpdateCategory } from '../../hooks/useBanking'

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as TransactionCategory[]

interface TransactionDetailSheetProps {
  transaction: Transaction
  onClose: () => void
}

export function TransactionDetailSheet({ transaction, onClose }: TransactionDetailSheetProps) {
  const updateCategory = useUpdateCategory()
  const isCredit = transaction.amount > 0

  function handleCategory(cat: TransactionCategory) {
    updateCategory.mutate({ id: transaction.id, category: cat })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Transaction</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Amount */}
          <div className="mb-6 text-center">
            <p
              className={cn(
                'text-4xl font-bold tabular-nums',
                isCredit ? 'text-green-600' : 'text-gray-900',
              )}
            >
              {isCredit ? '+' : ''}{formatGBP(transaction.amount)}
            </p>
            <p className="mt-1 text-sm text-gray-500">{formatDate(transaction.transaction_date)}</p>
          </div>

          {/* Details */}
          <div className="space-y-4 rounded-xl bg-gray-50 p-4">
            <DetailRow label="Description" value={transaction.description} />
            {transaction.merchant_name && (
              <DetailRow label="Merchant" value={transaction.merchant_name} />
            )}
            <DetailRow label="Type" value={isCredit ? 'Income' : 'Expense'} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Category</span>
              <CategoryBadge category={transaction.category} />
            </div>
          </div>

          {/* Category picker */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-gray-700">Set category</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategory(cat)}
                  disabled={updateCategory.isPending}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors',
                    transaction.category === cat
                      ? 'border-keel-500 bg-keel-50 text-keel-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-keel-300 hover:bg-keel-50',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* AI hook — disabled stub */}
          <div className="mt-6">
            <button
              disabled
              title="Coming soon — Phase 9"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              <Sparkles size={15} />
              ✦ Auto-categorise
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                Coming soon
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex-shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
