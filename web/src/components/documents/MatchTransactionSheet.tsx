import { useState } from 'react'
import { X, Link2, Loader2 } from 'lucide-react'
import { useTransactions } from '../../hooks/useBanking'
import { useMatchDocument } from '../../hooks/useDocuments'
import { CATEGORY_LABELS, type TransactionCategory } from '@keel/types'

interface MatchTransactionSheetProps {
  docId: string
  open: boolean
  onClose: () => void
}

export function MatchTransactionSheet({ docId, open, onClose }: MatchTransactionSheetProps) {
  const [search, setSearch] = useState('')
  const match = useMatchDocument()
  const { data } = useTransactions()

  const transactions = data?.pages.flatMap((p) => p.items) ?? []
  const filtered = transactions.filter((t) =>
    !search ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    (t.merchant_name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const handleMatch = async (transactionId: string) => {
    await match.mutateAsync({ id: docId, transactionId })
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Match to transaction</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No transactions found</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => handleMatch(t.id)}
              disabled={match.isPending}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-50"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{t.description}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  <span>{new Date(t.transaction_date).toLocaleDateString('en-GB')}</span>
                  {t.category && <span>{CATEGORY_LABELS[t.category as TransactionCategory] ?? t.category}</span>}
                </div>
              </div>
              <span className={`flex-shrink-0 text-sm font-semibold ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {t.amount < 0 ? '-' : '+'}£{Math.abs(t.amount).toFixed(2)}
              </span>
              {match.isPending ? (
                <Loader2 size={16} className="animate-spin text-keel-500" />
              ) : (
                <Link2 size={16} className="text-slate-300" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
