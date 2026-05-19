import type { DocumentStatus } from '@keel/types'

const CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  uploaded:  { label: 'Uploaded',  className: 'bg-slate-100  text-slate-600' },
  reviewed:  { label: 'Reviewed',  className: 'bg-blue-100   text-blue-700'  },
  matched:   { label: 'Matched',   className: 'bg-green-100  text-green-700' },
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
