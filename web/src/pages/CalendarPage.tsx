import { Link } from 'react-router-dom'
import {
  Calendar,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Receipt,
  Calculator,
  FileText,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { useDeadlines } from '../hooks/useNotifications'
import type { Deadline, DeadlineType, DeadlineUrgency } from '@keel/types'

const TYPE_ICON: Record<DeadlineType, React.ElementType> = {
  vat_return: Receipt,
  corp_tax_payment: Calculator,
  corp_tax_filing: FileText,
  self_assessment: FileText,
  invoice_due: Clock,
}

const URGENCY_CONFIG: Record<DeadlineUrgency, { badge: string; icon: React.ElementType; bar: string }> = {
  ok:       { badge: 'bg-green-100 text-green-700',  icon: CheckCircle,   bar: 'bg-green-400'  },
  warning:  { badge: 'bg-amber-100 text-amber-700',  icon: AlertTriangle, bar: 'bg-amber-400'  },
  critical: { badge: 'bg-red-100   text-red-700',    icon: AlertCircle,   bar: 'bg-red-500'    },
}

function DeadlineCard({ d }: { d: Deadline }) {
  const Icon = TYPE_ICON[d.deadline_type] ?? Calendar
  const cfg = URGENCY_CONFIG[d.urgency]
  const UrgencyIcon = cfg.icon

  return (
    <Link
      to={d.route}
      className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Left colour bar */}
      <div className={`mt-0.5 h-full w-1 self-stretch rounded-full ${cfg.bar} flex-shrink-0`} />

      <div className={`flex-shrink-0 rounded-xl p-2.5 ${cfg.badge}`}>
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 leading-snug">{d.title}</p>
          <span className={`flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
            <UrgencyIcon size={11} />
            {d.days_until === 0 ? 'Today' : d.days_until === 1 ? '1 day' : `${d.days_until} days`}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{d.description}</p>
        <p className="mt-2 text-xs text-slate-400">
          Due {new Date(d.due_date).toLocaleDateString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      <ChevronRight size={16} className="mt-1 flex-shrink-0 text-slate-300 group-hover:text-slate-400" />
    </Link>
  )
}

export function CalendarPage() {
  const { data: deadlines, isLoading } = useDeadlines()

  const critical = deadlines?.filter((d) => d.urgency === 'critical') ?? []
  const warning  = deadlines?.filter((d) => d.urgency === 'warning')  ?? []
  const ok       = deadlines?.filter((d) => d.urgency === 'ok')       ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Deadlines & Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          All your upcoming HMRC deadlines and invoice due dates in one place.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : deadlines?.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="rounded-full bg-green-100 p-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <p className="text-sm font-medium text-slate-700">Nothing due soon</p>
          <p className="text-xs text-slate-400">
            Deadlines appear here 90 days before they're due.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {critical.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
                <AlertCircle size={15} />
                Urgent — due within 7 days
              </h2>
              <div className="space-y-3">
                {critical.map((d) => <DeadlineCard key={`${d.deadline_type}-${d.due_date}`} d={d} />)}
              </div>
            </section>
          )}

          {warning.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600">
                <AlertTriangle size={15} />
                Coming up — within 30 days
              </h2>
              <div className="space-y-3">
                {warning.map((d) => <DeadlineCard key={`${d.deadline_type}-${d.due_date}`} d={d} />)}
              </div>
            </section>
          )}

          {ok.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Calendar size={15} />
                Further ahead
              </h2>
              <div className="space-y-3">
                {ok.map((d) => <DeadlineCard key={`${d.deadline_type}-${d.due_date}`} d={d} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Deadlines are calculated from your{' '}
        <Link to="/settings" className="text-keel-500 hover:underline">company settings</Link>.
        {' '}HMRC dates are approximate — always verify at hmrc.gov.uk.
      </p>
    </div>
  )
}
