import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { InvoiceRow } from '../components/invoices/InvoiceRow'
import { StatCard } from '../components/dashboard/StatCard'
import { useInvoices, useInvoiceStats } from '../hooks/useInvoices'
import { formatGBP } from '@keel/utils'
import { FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { InvoiceStatus } from '@keel/types'

type Tab = 'all' | InvoiceStatus

const TABS: { value: Tab; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'viewed',    label: 'Viewed' },
  { value: 'paid',      label: 'Paid' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const { data: stats } = useInvoiceStats()
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInvoices(activeTab === 'all' ? undefined : activeTab)

  const allInvoices = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0

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
      <div className="flex items-center justify-end border-b border-slate-100 bg-white px-8 py-3">
        <Link
          to="/invoices/new"
          className="flex items-center gap-2 rounded-xl bg-keel-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-keel-700"
        >
          <Plus size={15} />
          New invoice
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {/* Stats row */}
        <div className="mb-6 mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Outstanding"
            value={formatGBP(stats?.total_outstanding ?? 0)}
            icon={FileText}
            iconColor="text-blue-500"
            loading={!stats}
          />
          <StatCard
            label="Overdue"
            value={formatGBP(stats?.total_overdue ?? 0)}
            icon={AlertCircle}
            iconColor="text-red-500"
            badge={
              (stats?.overdue_count ?? 0) > 0
                ? { text: `${stats!.overdue_count} overdue`, variant: 'red' }
                : undefined
            }
            loading={!stats}
          />
          <StatCard
            label="Paid this month"
            value={formatGBP(stats?.paid_this_month ?? 0)}
            icon={CheckCircle}
            iconColor="text-green-500"
            loading={!stats}
          />
          <StatCard
            label="Drafts"
            value={String(stats?.draft_count ?? 0)}
            icon={Clock}
            iconColor="text-gray-400"
            loading={!stats}
          />
        </div>

        {/* Status tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={cn(
                'flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeTab === value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="mb-3 text-xs text-gray-400">
            {total} invoice{total !== 1 ? 's' : ''}
          </p>
        )}

        {/* List */}
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100" />
              </div>
            ))
          ) : allInvoices.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto mb-3 text-gray-300" size={32} />
              <p className="text-sm font-medium text-gray-500">No invoices yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Create your first invoice to get started.
              </p>
              <Link
                to="/invoices/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-keel-500 px-4 py-2 text-sm font-semibold text-white hover:bg-keel-600"
              >
                <Plus size={15} />
                New invoice
              </Link>
            </div>
          ) : (
            allInvoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))
          )}

          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="py-4 text-center text-xs text-gray-400">Loading more…</div>
          )}
        </div>
      </div>
    </div>
  )
}
