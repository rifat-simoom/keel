import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Link2, Unlink, Trash2, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { useDocument, useUpdateDocument, useUnmatchDocument, useDeleteDocument } from '../hooks/useDocuments'
import { DocumentStatusBadge } from '../components/documents/DocumentStatusBadge'
import { ReceiptForm } from '../components/documents/ReceiptForm'
import { MatchTransactionSheet } from '../components/documents/MatchTransactionSheet'
import type { UpdateDocumentInput } from '@keel/types'

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [matchOpen, setMatchOpen] = useState(false)

  const { data: doc, isLoading } = useDocument(id!)
  const update = useUpdateDocument()
  const unmatch = useUnmatchDocument()
  const del = useDeleteDocument()

  const handleSave = async (values: UpdateDocumentInput) => {
    await update.mutateAsync({ id: id!, body: values })
  }

  const handleUnmatch = async () => {
    await unmatch.mutateAsync(id!)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this receipt? This cannot be undone.')) return
    await del.mutateAsync(id!)
    navigate('/documents')
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-keel-500" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        Receipt not found.{' '}
        <Link to="/documents" className="text-keel-600 hover:underline">Go back</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/documents"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Receipts
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 truncate max-w-xs">
          {doc.vendor_name || doc.file_name}
        </span>
        <DocumentStatusBadge status={doc.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            {doc.mime_type.startsWith('image/') && doc.url ? (
              <img
                src={doc.url}
                alt={doc.file_name}
                className="w-full object-contain"
                style={{ maxHeight: 480 }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FileText size={40} className="text-red-400" />
                <p className="text-sm text-slate-600">{doc.file_name}</p>
              </div>
            )}
          </div>

          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1.5 text-xs text-keel-600 hover:underline"
            >
              <ExternalLink size={12} />
              Open original
            </a>
          )}

          {/* Match status */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Transaction link
            </p>
            {doc.transaction_id ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Link2 size={14} className="text-green-500" />
                  Matched
                </div>
                <button
                  onClick={handleUnmatch}
                  disabled={unmatch.isPending}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                >
                  {unmatch.isPending ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                  Unmatch
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMatchOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-keel-200 py-2 text-sm text-keel-600 hover:bg-keel-50"
              >
                <Link2 size={14} />
                Match to transaction
              </button>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={del.isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 py-2 text-sm text-red-500 hover:bg-red-50"
          >
            {del.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete receipt
          </button>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Receipt details</h2>
          <ReceiptForm doc={doc} onSave={handleSave} saving={update.isPending} />
        </div>
      </div>

      {matchOpen && (
        <MatchTransactionSheet
          docId={id!}
          open={matchOpen}
          onClose={() => setMatchOpen(false)}
        />
      )}
    </div>
  )
}
