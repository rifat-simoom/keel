import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications'
import type { Notification } from '@keel/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const navigate = useNavigate()
  return (
    <button
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
        n.is_read ? 'opacity-60' : ''
      }`}
      onClick={() => {
        if (!n.is_read) onRead(n.id)
        if (n.route) navigate(n.route)
      }}
    >
      {!n.is_read && (
        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-keel-500" />
      )}
      {n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 leading-snug">{n.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.body}</p>
        <p className="mt-1 text-xs text-slate-300">{timeAgo(n.created_at)}</p>
      </div>
    </button>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: unreadCount = 0 } = useUnreadCount()
  const { data, isLoading } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const notifications: Notification[] = data?.pages.flatMap((p) => p.items) ?? []

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-96 rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X size={14} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {isLoading && (
              <div className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            )}
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                onRead={(id) => markRead.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
