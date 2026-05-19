import { useNavigate } from 'react-router-dom'
import { InvoiceForm } from '../components/invoices/InvoiceForm'
import { useCreateInvoice } from '../hooks/useInvoices'
import type { CreateInvoiceInput } from '@keel/types'

export function NewInvoicePage() {
  const navigate = useNavigate()
  const create = useCreateInvoice()

  async function handleSubmit(data: CreateInvoiceInput) {
    const invoice = await create.mutateAsync(data)
    navigate(`/invoices/${invoice.id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="mx-auto max-w-3xl">
        {create.error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {(create.error as any)?.response?.data?.detail ?? 'Failed to create invoice'}
          </div>
        )}
        <InvoiceForm
          onSubmit={handleSubmit}
          isSubmitting={create.isPending}
          submitLabel="Create invoice"
        />
      </div>
    </div>
  )
}
