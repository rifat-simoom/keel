import { cn } from '../../lib/cn'
import type { InvoiceStatus } from '@keel/types'

const CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Sent',      className: 'bg-blue-50 text-blue-700' },
  viewed:    { label: 'Viewed',    className: 'bg-indigo-50 text-indigo-700' },
  paid:      { label: 'Paid',      className: 'bg-green-50 text-green-700' },
  overdue:   { label: 'Overdue',   className: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-400' },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.draft
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}
