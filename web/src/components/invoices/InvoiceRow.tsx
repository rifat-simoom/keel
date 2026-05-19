import { Link } from 'react-router-dom'
import { formatGBP, formatDate } from '@keel/utils'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import type { Invoice } from '@keel/types'

export function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Link
      to={`/invoices/${invoice.id}`}
      className="flex items-center gap-4 rounded-lg px-4 py-3.5 transition-colors hover:bg-gray-50"
    >
      {/* Invoice number + client */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{invoice.invoice_number}</span>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-500">{invoice.client_name}</p>
      </div>

      {/* Dates */}
      <div className="hidden flex-col items-end sm:flex">
        <span className="text-xs text-gray-400">Issued {formatDate(invoice.issue_date)}</span>
        <span className="text-xs text-gray-400">Due {formatDate(invoice.due_date)}</span>
      </div>

      {/* Amount */}
      <span className="ml-4 flex-shrink-0 text-sm font-semibold tabular-nums text-gray-900">
        {formatGBP(invoice.total)}
      </span>
    </Link>
  )
}
