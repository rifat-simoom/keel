import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles, Loader2, Check } from 'lucide-react'
import { CATEGORY_LABELS } from '@keel/types'
import type { Document, UpdateDocumentInput } from '@keel/types'

const schema = z.object({
  vendor_name: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be positive'),
  vat_amount: z.coerce.number().min(0).optional(),
  expense_date: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ReceiptFormProps {
  doc: Document
  onSave: (values: UpdateDocumentInput) => Promise<void>
  saving?: boolean
}

export function ReceiptForm({ doc, onSave, saving }: ReceiptFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor_name: doc.vendor_name ?? '',
      amount: doc.amount ?? undefined,
      vat_amount: doc.vat_amount ?? undefined,
      expense_date: doc.expense_date ?? '',
      category: doc.category ?? '',
      notes: doc.notes ?? '',
    },
  })

  const onSubmit = (values: FormValues) => {
    onSave({
      vendor_name: values.vendor_name,
      amount: values.amount,
      vat_amount: values.vat_amount,
      expense_date: values.expense_date,
      category: values.category,
      notes: values.notes,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* AI extract stub */}
      <div className="flex items-center justify-between rounded-lg border border-dashed border-keel-200 bg-keel-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-keel-700">
          <Sparkles size={15} />
          <span>✦ Extract with AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-keel-100 px-2 py-0.5 text-xs text-keel-600">Coming soon</span>
          <button
            type="button"
            disabled
            title="AI extraction — coming in Phase 9"
            className="cursor-not-allowed rounded-md bg-keel-100 px-3 py-1 text-xs font-medium text-keel-400"
          >
            Extract
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Vendor / Supplier *</label>
          <input
            {...register('vendor_name')}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
            placeholder="e.g. Amazon, Tesco, Uber"
          />
          {errors.vendor_name && <p className="mt-1 text-xs text-red-600">{errors.vendor_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Amount (£) *</label>
          <input
            {...register('amount')}
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
            placeholder="0.00"
          />
          {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">VAT amount (£)</label>
          <input
            {...register('vat_amount')}
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Date *</label>
          <input
            {...register('expense_date')}
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
          />
          {errors.expense_date && <p className="mt-1 text-xs text-red-600">{errors.expense_date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Category *</label>
          <select
            {...register('category')}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
          >
            <option value="">Select category…</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
            placeholder="Optional notes…"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || !isDirty}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-keel-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-keel-700 disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? 'Saving…' : 'Save receipt details'}
      </button>
    </form>
  )
}
