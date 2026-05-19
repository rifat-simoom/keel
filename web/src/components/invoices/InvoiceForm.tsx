import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { createInvoiceSchema, type CreateInvoiceInput } from '@keel/validation'
import { formatGBP } from '@keel/utils'

interface InvoiceFormProps {
  defaultValues?: Partial<CreateInvoiceInput>
  onSubmit: (data: CreateInvoiceInput) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

const VAT_OPTIONS = [
  { label: '0%',  value: 0 },
  { label: '5%',  value: 0.05 },
  { label: '20%', value: 0.2 },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}
function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function InvoiceForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save invoice',
}: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: defaultValues ?? {
      issue_date: today(),
      due_date: addDays(30),
      line_items: [{ description: '', quantity: 1, unit_price: 0, vat_rate: 0.2 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' })
  const lineItems = watch('line_items')

  const subtotal = lineItems?.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0,
  ) ?? 0
  const vatTotal = lineItems?.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0) * (item.vat_rate || 0),
    0,
  ) ?? 0
  const total = subtotal + vatTotal

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Client details */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Client details
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client name *" error={errors.client_name?.message}>
            <input {...register('client_name')} placeholder="Acme Corp" />
          </Field>
          <Field label="Client email *" error={errors.client_email?.message}>
            <input {...register('client_email')} type="email" placeholder="billing@acme.com" />
          </Field>
        </div>
      </section>

      {/* Dates */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Dates
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Issue date *" error={errors.issue_date?.message}>
            <input {...register('issue_date')} type="date" />
          </Field>
          <Field label="Due date *" error={errors.due_date?.message}>
            <input {...register('due_date')} type="date" />
          </Field>
        </div>
      </section>

      {/* Line items */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Line items
        </h3>

        {/* Header */}
        <div className="mb-2 hidden grid-cols-[1fr_80px_110px_80px_36px] gap-3 text-xs font-medium uppercase tracking-wide text-gray-400 sm:grid">
          <span>Description</span>
          <span className="text-center">Qty</span>
          <span className="text-center">Unit price (£)</span>
          <span className="text-center">VAT</span>
          <span />
        </div>

        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_110px_80px_36px] sm:items-start">
              <Field error={errors.line_items?.[idx]?.description?.message}>
                <input
                  {...register(`line_items.${idx}.description`)}
                  placeholder="Service description"
                />
              </Field>
              <Field error={errors.line_items?.[idx]?.quantity?.message}>
                <input
                  {...register(`line_items.${idx}.quantity`, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1"
                  className="text-center"
                />
              </Field>
              <Field error={errors.line_items?.[idx]?.unit_price?.message}>
                <input
                  {...register(`line_items.${idx}.unit_price`, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="text-center"
                />
              </Field>
              <Field error={errors.line_items?.[idx]?.vat_rate?.message}>
                <Controller
                  control={control}
                  name={`line_items.${idx}.vat_rate`}
                  render={({ field: f }) => (
                    <select
                      value={f.value}
                      onChange={(e) => f.onChange(parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
                    >
                      {VAT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                />
              </Field>
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={fields.length === 1}
                className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => append({ description: '', quantity: 1, unit_price: 0, vat_rate: 0.2 })}
          className="mt-3 flex items-center gap-2 text-sm font-medium text-keel-600 hover:text-keel-700"
        >
          <Plus size={15} />
          Add line item
        </button>

        {errors.line_items?.root && (
          <p className="mt-2 text-xs text-red-500">{errors.line_items.root.message}</p>
        )}
      </section>

      {/* Totals summary */}
      <div className="ml-auto w-full max-w-xs rounded-xl bg-gray-50 p-4 space-y-1">
        <TotalRow label="Subtotal" value={formatGBP(subtotal)} />
        <TotalRow label="VAT" value={formatGBP(vatTotal)} />
        <div className="my-2 border-t border-gray-200" />
        <TotalRow label="Total" value={formatGBP(total)} bold />
      </div>

      {/* Notes */}
      <section>
        <Field label="Notes (optional)" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Payment terms, bank details, or any additional information…"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-keel-500 focus:outline-none"
          />
        </Field>
      </section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-keel-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-keel-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
      <div className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-gray-200 [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:focus:border-keel-500 [&_input]:focus:outline-none">
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function TotalRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', bold ? 'font-semibold text-gray-900' : 'text-gray-500')}>
        {label}
      </span>
      <span className={cn('text-sm tabular-nums', bold ? 'font-bold text-keel-600' : 'text-gray-700')}>
        {value}
      </span>
    </div>
  )
}
