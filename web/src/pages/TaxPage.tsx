import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  TrendingDown,
  Calendar,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { useCorpTaxEstimate, useVATReturns, usePayOptimiser } from '../hooks/useTax'
import { useProfile } from '../hooks/useProfile'

const GBP = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

const GBP2 = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

function StatRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className={muted ? 'text-slate-400' : 'text-slate-600'}>{label}</span>
      <span className={`font-medium ${muted ? 'text-slate-400' : 'text-slate-900'}`}>{value}</span>
    </div>
  )
}

// ── Corp Tax Card ─────────────────────────────────────────────────────────────

function CorpTaxCard() {
  const { data, isLoading, error } = useCorpTaxEstimate()

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
  if (error || !data) return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6">
      <p className="text-sm text-slate-400">Unable to calculate CT estimate — check your company settings.</p>
    </div>
  )

  const urgency = data.days_until_deadline < 60 ? 'text-red-600' : data.days_until_deadline < 180 ? 'text-amber-600' : 'text-green-600'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-keel-600" />
        <h2 className="text-base font-semibold text-slate-900">Corporation Tax estimate</h2>
        <span className="ml-auto text-xs text-slate-400">Tax year {data.tax_year - 1}/{String(data.tax_year).slice(-2)}</span>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-900">{GBP(data.ct_due)}</span>
        <span className="mb-0.5 text-sm text-slate-400">estimated due</span>
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 px-4 divide-y divide-slate-100">
        <StatRow label="Total income (net)" value={GBP2(data.total_income)} />
        <StatRow label="Allowable expenses" value={`− ${GBP2(data.total_expenses)}`} />
        <StatRow label="Taxable profit" value={GBP2(data.taxable_profit)} />
        <StatRow label="Effective CT rate" value={`${(data.effective_rate * 100).toFixed(1)}%`} muted />
      </div>

      <div className={`flex items-center gap-2 text-sm ${urgency}`}>
        <Calendar size={14} />
        Payment due {new Date(data.payment_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' '}({data.days_until_deadline > 0 ? `${data.days_until_deadline} days` : 'overdue'})
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Running estimate — updated as invoices are paid and expenses logged. Not financial advice.
        <Link to="/settings" className="ml-1 text-keel-500 hover:underline">Check year-end settings →</Link>
      </p>
    </div>
  )
}

// ── VAT Returns Card ──────────────────────────────────────────────────────────

function VATCard() {
  const { data: profile } = useProfile()
  const { data, isLoading } = useVATReturns(4)
  const isVatRegistered = profile?.company?.is_vat_registered

  if (!isVatRegistered) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TrendingDown size={18} className="text-keel-600" />
          <h2 className="text-base font-semibold text-slate-900">VAT returns</h2>
        </div>
        <p className="text-sm text-slate-400">You are not marked as VAT registered.</p>
        <Link to="/settings" className="mt-2 inline-block text-sm text-keel-600 hover:underline">
          Update settings →
        </Link>
      </div>
    )
  }

  if (isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />

  const periods = data?.periods ?? []
  const schemeName = data?.vat_scheme === 'cash' ? 'Cash accounting' : 'Standard accrual'

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <TrendingDown size={18} className="text-keel-600" />
        <h2 className="text-base font-semibold text-slate-900">VAT returns</h2>
        <span className="ml-auto text-xs text-slate-400">{schemeName}</span>
      </div>

      <div className="space-y-3">
        {periods.map((p) => {
          const owed = p.net_vat > 0
          return (
            <div key={p.period_label} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{p.period_label}</span>
                <span className={`text-sm font-semibold ${owed ? 'text-red-600' : 'text-green-600'}`}>
                  {owed ? 'Owe ' : 'Claim '}{GBP2(Math.abs(p.net_vat))}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
                <span>Output VAT: {GBP2(p.output_vat)}</span>
                <span>Input VAT: {GBP2(p.input_vat)}</span>
                <span>{p.invoice_count} inv · {p.expense_count} exp</span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        HMRC MTD submission is not yet available — use these figures to complete your return on the HMRC portal.
      </p>
    </div>
  )
}

// ── Salary Optimiser ──────────────────────────────────────────────────────────

function SalaryOptimiserCard() {
  const [income, setIncome] = useState(60000)
  const { data, isLoading } = usePayOptimiser(income)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Calculator size={18} className="text-keel-600" />
        <h2 className="text-base font-semibold text-slate-900">Salary vs dividends</h2>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-600">Desired annual income</span>
          <span className="font-semibold text-slate-900">{GBP(income)}</span>
        </div>
        <input
          type="range"
          min={10000}
          max={200000}
          step={1000}
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full accent-keel-600"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-300">
          <span>£10k</span>
          <span>£200k</span>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-keel-50 p-4">
              <p className="text-xs text-keel-600 font-medium mb-1">Optimal split</p>
              <p className="text-sm font-semibold text-slate-800">Salary: {GBP(data.optimal_salary)}</p>
              <p className="text-sm font-semibold text-slate-800">Dividends: {GBP(data.optimal_dividends)}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs text-green-600 font-medium mb-1">Annual saving</p>
              <p className="text-2xl font-bold text-green-700">{GBP(data.annual_saving)}</p>
              <p className="text-xs text-green-600">vs salary only</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 divide-y divide-slate-100">
            <StatRow label="Net take-home" value={GBP2(data.net_income)} />
            <StatRow label="Dividend tax" value={GBP2(data.dividend_tax)} />
            <StatRow label="Income tax" value={GBP2(data.income_tax)} />
            <StatRow label="Employee NIC" value={GBP2(data.employee_nic)} />
            <StatRow label="Employer NIC (company cost)" value={GBP2(data.employer_nic)} muted />
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 px-4 divide-y divide-slate-50">
            <p className="py-2 text-xs font-medium text-slate-400 uppercase tracking-wide">Comparison: salary only</p>
            <StatRow label="Net take-home" value={GBP2(data.comparison.salary_only_net)} muted />
            <StatRow label="Income tax" value={GBP2(data.comparison.salary_only_income_tax)} muted />
            <StatRow label="Employee NIC" value={GBP2(data.comparison.salary_only_employee_nic)} muted />
          </div>
        </>
      )}

      {/* AI hook stub */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-keel-200 bg-keel-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-keel-700">
          <Sparkles size={15} />
          <span>✦ Ask Keel AI for personalised tax advice</span>
        </div>
        <span className="rounded-full bg-keel-100 px-2 py-0.5 text-xs text-keel-600">Coming soon</span>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        These figures are estimates based on 2024/25 UK rates. They do not constitute financial advice. Consult a qualified accountant for your specific situation.
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TaxPage() {
  const { data: profile } = useProfile()
  const isVatRegistered = profile?.company?.is_vat_registered

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax</h1>
          <p className="mt-1 text-sm text-slate-500">
            Running estimates — updated in real time as you invoice and log expenses.
          </p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-1 text-sm text-keel-600 hover:underline"
        >
          Tax settings
          <ChevronRight size={14} />
        </Link>
      </div>

      <CorpTaxCard />
      <VATCard />
      <SalaryOptimiserCard />
    </div>
  )
}
