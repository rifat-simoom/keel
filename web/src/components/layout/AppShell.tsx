import { useLocation, Outlet, Link } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '../notifications/NotificationBell'
import { useProfile } from '../../hooks/useProfile'

const ROUTE_META: Record<string, { title: string; subtitle?: string }> = {
  '/':             { title: 'Dashboard',     subtitle: 'Your business at a glance' },
  '/invoices':     { title: 'Invoices',      subtitle: 'Create, send and track client invoices' },
  '/invoices/new': { title: 'New invoice',   subtitle: 'Fill in the details and send' },
  '/transactions': { title: 'Transactions',  subtitle: 'Account activity and expense categorisation' },
  '/tax':          { title: 'Tax',           subtitle: 'Running estimates updated in real time' },
  '/documents':    { title: 'Receipts & Documents', subtitle: 'Upload and match receipts to transactions' },
  '/payroll':      { title: 'Payroll',       subtitle: 'Pay employees — coming soon' },
  '/calendar':     { title: 'Deadlines',     subtitle: 'HMRC dates and invoice due dates in one place' },
  '/settings':     { title: 'Settings',      subtitle: 'Company profile, invoicing and tax preferences' },
}

function useRouteMeta() {
  const { pathname } = useLocation()
  // Match exact first, then prefix (for /invoices/:id etc.)
  if (ROUTE_META[pathname]) return ROUTE_META[pathname]
  const match = Object.keys(ROUTE_META)
    .filter((k) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0] as string | undefined
  return (match ? ROUTE_META[match] : undefined) ?? { title: 'Keel' }
}

function TopBar() {
  const meta = useRouteMeta()
  const { data: profile } = useProfile()
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'KL'
  const displayName = profile?.full_name ?? profile?.email ?? 'Account'
  const companyName = profile?.company?.name

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6">
      {/* Left: page title */}
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-slate-900">{meta.title}</h1>
        {meta.subtitle && (
          <p className="truncate text-xs text-slate-400">{meta.subtitle}</p>
        )}
      </div>

      {/* Right: bell + user chip */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        <Link
          to="/settings"
          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 hover:bg-slate-100 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-keel-600 text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-slate-800 leading-none">{displayName}</p>
            {companyName && (
              <p className="text-[11px] text-slate-400 leading-none mt-0.5 truncate max-w-[140px]">
                {companyName}
              </p>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
