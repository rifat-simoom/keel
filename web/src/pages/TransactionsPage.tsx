import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, CreditCard } from 'lucide-react'
import { cn } from '../lib/cn'
import { AccountHeader } from '../components/banking/AccountHeader'
import { TransactionRow } from '../components/banking/TransactionRow'
import { TransactionDetailSheet } from '../components/banking/TransactionDetailSheet'
import { VirtualCardPanel } from '../components/banking/VirtualCardPanel'
import { ConnectBankBanner } from '../components/banking/ConnectBankBanner'
import {
  useAccount,
  useAccountStats,
  useTransactions,
  useVirtualCard,
} from '../hooks/useBanking'
import { CATEGORY_LABELS } from '@keel/types'
import type { Transaction, TransactionCategory } from '@keel/types'

type Tab = 'transactions' | 'card'

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as TransactionCategory[]

export function TransactionsPage() {
  const [tab, setTab] = useState<Tab>('transactions')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | undefined>()
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Clear TrueLayer callback params from URL after reading them
  const bankConnected = searchParams.get('bank_connected') === 'true'
  const bankError = searchParams.get('bank_error')
  useEffect(() => {
    if (bankConnected || bankError) {
      setSearchParams({}, { replace: true })
    }
  }, [])

  const { data: account, isLoading: accountLoading } = useAccount()
  const { data: stats } = useAccountStats()
  const { data: card } = useVirtualCard()

  const {
    data,
    isLoading: txnLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useTransactions({ search, category: activeCategory })

  const allTransactions = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0

  // Infinite scroll sentinel
  const observer = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) fetchNextPage()
      })
      if (node) observer.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {/* Bank error alert */}
        {bankError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            Could not connect your bank — please try again.
          </div>
        )}

        {/* TrueLayer connect / status banner */}
        <div className="pt-6">
          <ConnectBankBanner />
        </div>

        {/* Account header */}
        <div className="mb-6">
          {accountLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          ) : account ? (
            <AccountHeader account={account} stats={stats} />
          ) : null}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
          {(['transactions', 'card'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                tab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t === 'card' && <CreditCard size={15} />}
              {t === 'transactions' ? 'Transactions' : 'Virtual Card'}
            </button>
          ))}
        </div>

        {tab === 'card' ? (
          <div className="flex justify-center pt-2">
            {card ? (
              <VirtualCardPanel card={card} />
            ) : (
              <div className="h-48 w-full max-w-sm animate-pulse rounded-2xl bg-gray-200" />
            )}
          </div>
        ) : (
          <>
            {/* Search + filter row */}
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search transactions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm placeholder-gray-400 focus:border-keel-400 focus:outline-none focus:ring-1 focus:ring-keel-400"
                />
              </div>
            </div>

            {/* Category filter chips */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory(undefined)}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  !activeCategory
                    ? 'bg-keel-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                All
              </button>
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? undefined : cat)}
                  className={cn(
                    'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    activeCategory === cat
                      ? 'bg-keel-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Transaction count */}
            {!txnLoading && (
              <p className="mb-3 text-xs text-gray-400">
                {total} transaction{total !== 1 ? 's' : ''}
                {activeCategory && ` · ${CATEGORY_LABELS[activeCategory as TransactionCategory]}`}
              </p>
            )}

            {/* Transaction list */}
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
              {txnLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                      <div className="h-2.5 w-24 animate-pulse rounded bg-gray-100" />
                    </div>
                    <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                  </div>
                ))
              ) : allTransactions.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-gray-500">No transactions found</p>
                </div>
              ) : (
                allTransactions.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    transaction={txn}
                    onClick={() => setSelectedTxn(txn)}
                  />
                ))
              )}

              {/* Infinite scroll sentinel */}
              {!txnLoading && (
                <div ref={sentinelRef} className="h-4" />
              )}

              {isFetchingNextPage && (
                <div className="py-4 text-center text-xs text-gray-400">Loading more…</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Transaction detail sheet */}
      {selectedTxn && (
        <TransactionDetailSheet
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}
    </div>
  )
}
