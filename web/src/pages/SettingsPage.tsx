import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Loader2, Building2, Receipt, Calculator } from 'lucide-react'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import type { UpdateProfileInput } from '@keel/types'

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  company_name: z.string().min(1, 'Required'),
  company_number: z.string().optional(),
  vat_number: z.string().optional(),
  utr: z.string().optional(),
  is_vat_registered: z.boolean(),
  vat_scheme: z.enum(['cash', 'accrual']),
  vat_stagger: z.enum(['A', 'B', 'C']),
  year_end_month: z.coerce.number().int().min(1).max(12),
  payment_terms_days: z.coerce.number().int().min(1).max(365),
  invoice_footer: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} className="text-keel-600" />
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none'
const selectCls = inputCls

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function SettingsPage() {
  const { data: profile, isLoading } = useProfile()
  const update = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      company_name: '',
      is_vat_registered: false,
      vat_scheme: 'cash',
      vat_stagger: 'A',
      year_end_month: 3,
      payment_terms_days: 30,
    },
  })

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? '',
        company_name: profile.company?.name ?? '',
        company_number: profile.company?.company_number ?? '',
        vat_number: profile.company?.vat_number ?? '',
        utr: profile.company?.utr ?? '',
        is_vat_registered: profile.company?.is_vat_registered ?? false,
        vat_scheme: (profile.company?.vat_scheme as 'cash' | 'accrual') ?? 'cash',
        vat_stagger: (profile.company?.vat_stagger as 'A' | 'B' | 'C') ?? 'A',
        year_end_month: profile.company?.year_end_month ?? 3,
        payment_terms_days: profile.company?.payment_terms_days ?? 30,
        invoice_footer: profile.company?.invoice_footer ?? '',
      })
    }
  }, [profile, reset])

  const isVatRegistered = watch('is_vat_registered')

  const onSubmit = async (values: FormValues) => {
    const payload: UpdateProfileInput = {
      full_name: values.full_name,
      company_name: values.company_name,
      company_number: values.company_number || undefined,
      vat_number: values.vat_number || undefined,
      utr: values.utr || undefined,
      is_vat_registered: values.is_vat_registered,
      vat_scheme: values.vat_scheme,
      vat_stagger: values.vat_stagger,
      year_end_month: values.year_end_month,
      payment_terms_days: values.payment_terms_days,
      invoice_footer: values.invoice_footer || undefined,
    }
    await update.mutateAsync(payload)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <button
            type="submit"
            disabled={update.isPending || !isDirty}
            className="flex items-center gap-2 rounded-lg bg-keel-600 px-4 py-2 text-sm font-medium text-white hover:bg-keel-700 disabled:opacity-50"
          >
            {update.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {update.isSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            <Check size={15} />
            Settings saved successfully
          </div>
        )}

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <Section icon={Building2} title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your full name" error={errors.full_name?.message}>
              <input {...register('full_name')} className={inputCls} />
            </Field>
            <Field label="Company name" error={errors.company_name?.message}>
              <input {...register('company_name')} className={inputCls} />
            </Field>
            <Field label="Companies House number">
              <input {...register('company_number')} className={inputCls} placeholder="e.g. 12345678" />
            </Field>
            <Field label="UTR (Unique Taxpayer Reference)">
              <input {...register('utr')} className={inputCls} placeholder="10-digit UTR" />
            </Field>
          </div>
        </Section>

        {/* ── Invoicing ───────────────────────────────────────────────────── */}
        <Section icon={Receipt} title="Invoicing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default payment terms (days)">
              <input {...register('payment_terms_days')} type="number" min={1} max={365} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Invoice footer / bank details">
                <textarea
                  {...register('invoice_footer')}
                  rows={3}
                  className={inputCls}
                  placeholder="e.g. Bank: Keel | Sort code: 04-00-04 | Acc: 12345678"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── Tax ─────────────────────────────────────────────────────────── */}
        <Section icon={Calculator} title="Tax">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  {...register('is_vat_registered')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-keel-600 focus:ring-keel-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">I am VAT registered</p>
                  <p className="text-xs text-slate-400">Required for VAT return calculations</p>
                </div>
              </label>
            </div>

            {isVatRegistered && (
              <>
                <Field label="VAT number">
                  <input {...register('vat_number')} className={inputCls} placeholder="GB 123 4567 89" />
                </Field>
                <div /> {/* spacer */}
                <Field label="VAT scheme">
                  <select {...register('vat_scheme')} className={selectCls}>
                    <option value="cash">Cash accounting</option>
                    <option value="accrual">Standard accrual</option>
                  </select>
                </Field>
                <Field label="VAT stagger group">
                  <select {...register('vat_stagger')} className={selectCls}>
                    <option value="A">Group A (quarters end Jan/Apr/Jul/Oct)</option>
                    <option value="B">Group B (quarters end Feb/May/Aug/Nov)</option>
                    <option value="C">Group C (quarters end Mar/Jun/Sep/Dec)</option>
                  </select>
                </Field>
              </>
            )}

            <Field label="Company year-end month">
              <select {...register('year_end_month')} className={selectCls}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </Field>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            These settings affect your Corporation Tax estimate and VAT return calculations on the Tax page.
          </p>
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={update.isPending || !isDirty}
            className="flex items-center gap-2 rounded-lg bg-keel-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-keel-700 disabled:opacity-50"
          >
            {update.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
