import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import { UploadDropzone } from '../components/documents/UploadDropzone'
import { DocumentCard } from '../components/documents/DocumentCard'
import type { Document } from '@keel/types'

const STATUS_TABS = [
  { label: 'All',      value: undefined  },
  { label: 'Uploaded', value: 'uploaded' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Matched',  value: 'matched'  },
]

export function DocumentsPage() {
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const activeTab = new URLSearchParams(window.location.search).get('status') || undefined
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useDocuments(activeTab)

  const docs: Document[] = data?.pages.flatMap((p) => p.items) ?? []

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const setTab = (value: string | undefined) => {
    const url = value ? `/documents?status=${value}` : '/documents'
    navigate(url, { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Receipts & Documents</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload receipts and attach them to transactions for accurate expense tracking.
        </p>
      </div>

      <UploadDropzone onUploaded={(doc) => navigate(`/documents/${doc.id}`)} />

      {/* Status tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setTab(tab.value)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="rounded-full bg-slate-100 p-5">
            <Receipt size={28} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No receipts yet</p>
          <p className="text-xs text-slate-400">Drop a receipt above to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
      )}
    </div>
  )
}
