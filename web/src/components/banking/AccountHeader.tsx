import { useState } from 'react'
import { Copy, Check, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatGBP } from '@keel/utils'
import type { Account, AccountStats } from '@keel/types'

interface AccountHeaderProps {
  account: Account
  stats?: AccountStats
  loading?: boolean
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-keel-200">{label}</span>
      <span className="font-mono text-sm font-medium text-white">{value}</span>
      <button
        onClick={handleCopy}
        title={`Copy ${label}`}
        className="rounded p-0.5 text-keel-200 transition-colors hover:text-white"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  )
}

export function AccountHeader({ account, stats, loading = false }: AccountHeaderProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-keel-600 to-keel-800 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-keel-200">Business Account · GBP</p>
          {loading ? (
            <div className="mt-2 h-10 w-40 animate-pulse rounded-lg bg-keel-700" />
          ) : (
            <p className="mt-1 text-4xl font-bold tracking-tight">
              {formatGBP(account.balance)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-4">
            <CopyField label="Sort code" value={account.sort_code} />
            <CopyField label="Account no." value={account.account_number} />
          </div>
        </div>

        {stats && (
          <div className="hidden flex-col items-end gap-2 sm:flex">
            <div className="flex items-center gap-1.5 rounded-full bg-keel-700/50 px-3 py-1.5">
              <TrendingUp size={14} className="text-green-300" />
              <span className="text-xs font-medium text-green-300">
                +{formatGBP(stats.total_income)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-keel-700/50 px-3 py-1.5">
              <TrendingDown size={14} className="text-red-300" />
              <span className="text-xs font-medium text-red-300">
                -{formatGBP(stats.total_expenses)}
              </span>
            </div>
            <p className="text-xs text-keel-300">Last 30 days</p>
          </div>
        )}
      </div>
    </div>
  )
}
