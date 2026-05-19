import type { Address, Currency, VatRate } from './common'

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'overdue'
  | 'cancelled'

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: VatRate
}

export interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  client_address?: Address
  line_items: LineItem[]
  subtotal: number
  vat_amount: number
  total: number
  currency: Currency
  issue_date: string
  due_date: string
  status: InvoiceStatus
  paid_at?: string
  notes?: string
  created_at: string
  updated_at: string
  events?: InvoiceEvent[]
}

export interface InvoiceStats {
  total_outstanding: number
  total_overdue: number
  overdue_count: number
  paid_this_month: number
  draft_count: number
}

export interface InvoiceEvent {
  id: string
  event_type: string
  event_data?: Record<string, unknown>
  created_at: string
}

export interface CreateInvoiceInput {
  client_name: string
  client_email: string
  client_address?: Address
  line_items: LineItem[]
  issue_date: string
  due_date: string
  notes?: string
}
