import { useParams, Link } from 'react-router-dom'
import { Download, Send, CheckCircle, XCircle, ArrowLeft, Clock } from 'lucide-react'
import { InvoiceStatusBadge } from '../components/invoices/InvoiceStatusBadge'
import {
  useInvoice,
  useSendInvoice,
  useMarkPaid,
  useCancelInvoice,
  useDownloadPdf,
} from '../hooks/useInvoices'
import { formatGBP, formatDate } from '@keel/utils'
import { cn } from '../lib/cn'
import type { InvoiceStatus } from '@keel/types'

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: invoice, isLoading } = useInvoice(id!)
  const send = useSendInvoice()
  const markPaid = useMarkPaid()
  const cancel = useCancelInvoice()
  const download = useDownloadPdf()

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">Invoice not found</div>
    )
  }

  const canSend = invoice.status === 'draft'
  const canMarkPaid = ['sent', 'viewed', 'overdue'].includes(invoice.status)
  const canCancel = !['paid', 'cancelled'].includes(invoice.status)
  const isPending = send.isPending || markPaid.isPending || cancel.isPending

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back link */}
        <Link
          to="/invoices"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={15} />
          Back to invoices
        </Link>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
            <div className="flex-1" />
            {canSend && (
              <ActionButton
                icon={Send}
                label="Send to client"
                colour="blue"
                disabled={isPending}
                onClick={() => send.mutate(invoice.id)}
                loading={send.isPending}
              />
            )}
            {canMarkPaid && (
              <ActionButton
                icon={CheckCircle}
                label="Mark as paid"
                colour="green"
                disabled={isPending}
                onClick={() => markPaid.mutate(invoice.id)}
                loading={markPaid.isPending}
              />
            )}
            <ActionButton
              icon={Download}
              label="Download PDF"
              colour="gray"
              disabled={download.isPending}
              onClick={() => download.mutate({ id: invoice.id, number: invoice.invoice_number })}
              loading={download.isPending}
            />
            {canCancel && (
              <ActionButton
                icon={XCircle}
                label="Cancel invoice"
                colour="red"
                disabled={isPending}
                onClick={() => {
                  if (confirm('Cancel this invoice? This cannot be undone.')) {
                    cancel.mutate(invoice.id)
                  }
                }}
                loading={cancel.isPending}
              />
            )}
          </div>

          {/* Invoice card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 p-6">
              <div>
                <p className="text-2xl font-bold text-keel-600">{invoice.invoice_number}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Issued {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{formatGBP(invoice.total)}</p>
                <p className="mt-1 text-sm text-gray-500">incl. VAT</p>
              </div>
            </div>

            {/* Bill to */}
            <div className="border-b border-gray-100 p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Bill to
              </p>
              <p className="font-semibold text-gray-900">{invoice.client_name}</p>
              <p className="text-sm text-gray-500">{invoice.client_email}</p>
              {invoice.client_address && (
                <div className="mt-1 text-sm text-gray-500">
                  {['line1', 'line2', 'city', 'postcode'].map((k) => {
                    const v = (invoice.client_address as any)?.[k]
                    return v ? <p key={k}>{v}</p> : null
                  })}
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Line items
              </p>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="pb-2 text-left font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit price</th>
                    <th className="pb-2 text-right font-medium">VAT</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoice.line_items.map((item, i) => {
                    const net = item.quantity * item.unit_price
                    const vat = net * item.vat_rate
                    return (
                      <tr key={i} className="text-sm">
                        <td className="py-2.5 pr-4 text-gray-900">{item.description}</td>
                        <td className="py-2.5 text-right tabular-nums text-gray-600">{item.quantity}</td>
                        <td className="py-2.5 text-right tabular-nums text-gray-600">{formatGBP(item.unit_price)}</td>
                        <td className="py-2.5 text-right text-gray-500">{(item.vat_rate * 100).toFixed(0)}%</td>
                        <td className="py-2.5 text-right tabular-nums font-medium text-gray-900">{formatGBP(net + vat)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="ml-auto mt-4 w-52 space-y-1 border-t border-gray-100 pt-4">
                <TotalLine label="Subtotal" value={formatGBP(invoice.subtotal)} />
                <TotalLine label="VAT" value={formatGBP(invoice.vat_amount)} />
                <TotalLine label="Total" value={formatGBP(invoice.total)} bold />
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border-t border-gray-100 px-6 py-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          {invoice.events && invoice.events.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-500">Activity</h3>
              <div className="space-y-2">
                {invoice.events.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3">
                    <Clock size={13} className="flex-shrink-0 text-gray-400" />
                    <span className="text-sm capitalize text-gray-600">
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {formatDate(ev.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
  )
}



function TotalLine({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={cn('text-sm', bold ? 'font-semibold text-gray-900' : 'text-gray-500')}>
        {label}
      </span>
      <span className={cn('text-sm tabular-nums', bold ? 'font-bold text-keel-600' : 'text-gray-700')}>
        {value}
      </span>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  colour,
  onClick,
  disabled,
  loading,
}: {
  icon: React.ElementType
  label: string
  colour: 'blue' | 'green' | 'red' | 'gray'
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}) {
  const cls = {
    blue:  'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    red:   'border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
    gray:  'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  }[colour]

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        cls,
      )}
    >
      <Icon size={15} />
      {loading ? 'Processing…' : label}
    </button>
  )
}
