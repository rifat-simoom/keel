import { Link } from 'react-router-dom'
import { FileImage, FileText, Receipt } from 'lucide-react'
import type { Document } from '@keel/types'
import { DocumentStatusBadge } from './DocumentStatusBadge'

function FileIcon({ mime }: { mime: string }) {
  if (mime === 'application/pdf') return <FileText size={20} className="text-red-500" />
  return <FileImage size={20} className="text-blue-500" />
}

export function DocumentCard({ doc }: { doc: Document }) {
  const amount = doc.amount != null
    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(doc.amount)
    : null

  return (
    <Link
      to={`/documents/${doc.id}`}
      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Thumbnail or icon */}
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center">
        {doc.mime_type.startsWith('image/') && doc.url ? (
          <img src={doc.url} alt={doc.file_name} className="h-full w-full object-cover" />
        ) : (
          <FileIcon mime={doc.mime_type} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-800">
            {doc.vendor_name || doc.file_name}
          </p>
          {amount && (
            <span className="flex-shrink-0 text-sm font-semibold text-slate-900">{amount}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <DocumentStatusBadge status={doc.status} />
          {doc.expense_date && (
            <span className="text-xs text-slate-400">
              {new Date(doc.expense_date).toLocaleDateString('en-GB')}
            </span>
          )}
          {doc.category && (
            <span className="text-xs text-slate-400">{doc.category}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
