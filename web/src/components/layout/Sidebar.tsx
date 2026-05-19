import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Calculator,
  FolderOpen,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  Building2,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useUnreadCount } from '../../hooks/useNotifications'

// ── Nav sections ──────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard, end: true  },
  { to: '/invoices',     label: 'Invoices',     icon: FileText,        end: false },
  { to: '/transactions', label: 'Transactions', icon: CreditCard,      end: false },
  { to: '/documents',    label: 'Documents',    icon: FolderOpen,      end: false },
]

const FINANCE_NAV = [
  { to: '/tax',      label: 'Tax',      icon: Calculator,   end: false },
  { to: '/payroll',  label: 'Payroll',  icon: Users,        end: false },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, end: false },
]

// ── Reusable nav item ─────────────────────────────────────────────────────────

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  badge,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end: boolean
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-keel-50 text-keel-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        )
      }
    >
      <Icon size={17} className="flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { logout } = useAuth()
  const { data: profile } = useProfile()
  const { data: unreadCount = 0 } = useUnreadCount()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'KL'
  const displayName = profile?.full_name ?? profile?.email ?? 'Your account'
  const companyName = profile?.company?.name ?? 'Keel'

  return (
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-slate-100 bg-white">

      {/* ── Logo / workspace ─────────────────────────────────────────────── */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-keel-600 text-white">
          <Building2 size={16} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{companyName}</p>
          <p className="text-[10px] text-slate-400 leading-none">Business account</p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <SectionLabel>Main</SectionLabel>
        {PRIMARY_NAV.map(({ to, label, icon, end }) => (
          <NavItem key={to} to={to} label={label} icon={icon} end={end} />
        ))}

        <SectionLabel>Finance</SectionLabel>
        {FINANCE_NAV.map(({ to, label, icon, end }) => (
          <NavItem
            key={to}
            to={to}
            label={label}
            icon={icon}
            end={end}
            badge={to === '/calendar' && unreadCount > 0 ? unreadCount : undefined}
          />
        ))}
      </nav>

      {/* ── Bottom: settings + help + user ───────────────────────────────── */}
      <div className="border-t border-slate-100 px-3 py-3 space-y-0.5">
        <NavItem to="/settings" label="Settings" icon={Settings} end={false} />

        <a
          href="mailto:support@keelapp.co.uk"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <HelpCircle size={17} className="flex-shrink-0" />
          Help & Support
        </a>

        {/* User row */}
        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-keel-600 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800 leading-none">{displayName}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400 leading-none">
              {profile?.role === 'owner' ? 'Owner' : profile?.role ?? 'Member'}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
