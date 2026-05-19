import { Link } from 'react-router-dom'
import { Wallet, FileText, AlertCircle, Calculator, CalendarClock, ArrowRight } from 'lucide-react'
import { StatCard } from '../components/dashboard/StatCard'
import { TransactionRow } from '../components/banking/TransactionRow'
import { useDashboard } from '../hooks/useDashboard'
import { useAccount, useTransactions } from '../hooks/useBanking'
import { useInvoiceStats } from '../hooks/useInvoices'
import { useNextDeadline } from '../hooks/useNotifications'
import { formatGBP } from '@keel/utils'

export function DashboardPage() {
  const { data, isLoading: dashLoading } = useDashboard()
  const { data: account, isLoading: accountLoading } = useAccount()
  const { data: invoiceStats, isLoading: invoiceStatsLoading } = useInvoiceStats()
  const { data: txnPages, isLoading: txnLoading } = useTransactions()
  const { data: nextDeadline } = useNextDeadline()

  const recentTxns = txnPages?.pages[0]?.items.slice(0, 5) ?? []

  const nextDeadlineBadge = nextDeadline
    ? (() => {
        const days = nextDeadline.days_until
        if (days <= 0)  return { text: 'Overdue',       variant: 'red'   } as const
        if (days <= 7)  return { text: `${days}d left`, variant: 'amber' } as const
        if (days <= 30) return { text: `${days}d left`, variant: 'blue'  } as const
        return { text: `${days}d left`, variant: 'green' } as const
      })()
    : undefined

  return (
    <div>
      <div className="p-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Account balance"
            value={formatGBP(account?.balance ?? 0)}
            icon={Wallet}
            iconColor="text-keel-500"
            loading={accountLoading}
          />

          <StatCard
            label="Outstanding invoices"
            value={formatGBP(invoiceStats?.total_outstanding ?? 0)}
            icon={FileText}
            iconColor="text-blue-500"
            loading={invoiceStatsLoading}
          />

          <StatCard
            label="Overdue invoices"
            value={String(invoiceStats?.overdue_count ?? 0)}
            subtext="Require immediate attention"
            icon={AlertCircle}
            iconColor="text-red-500"
            badge={
              (invoiceStats?.overdue_count ?? 0) > 0
                ? { text: `${invoiceStats!.overdue_count} overdue`, variant: 'red' }
                : undefined
            }
            loading={invoiceStatsLoading}
          />

          <StatCard
            label="Estimated CT liability"
            value={formatGBP(data?.tax_estimate ?? 0)}
            subtext="Running estimate for current tax year"
            icon={Calculator}
            iconColor="text-amber-500"
            loading={dashLoading}
          />

          <StatCard
            label="Next deadline"
            value={nextDeadline?.title ?? '—'}
            subtext={nextDeadline ? new Date(nextDeadline.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
            icon={CalendarClock}
            iconColor="text-purple-500"
            badge={nextDeadlineBadge}
            loading={dashLoading}
          />
        </div>

        {/* Recent transactions */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent transactions</h2>
            <Link
              to="/transactions"
              className="flex items-center gap-1 text-sm font-medium text-keel-600 hover:text-keel-700"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
            {txnLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                    <div className="h-2.5 w-24 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : recentTxns.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No transactions yet — they'll appear here once your account is active.
              </div>
            ) : (
              recentTxns.map((txn) => (
                <TransactionRow key={txn.id} transaction={txn} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
