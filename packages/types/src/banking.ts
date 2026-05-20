import type { Currency } from './common'

export interface Account {
  id: string
  company_id: string
  sort_code: string
  account_number: string
  balance: number
  currency: Currency
  created_at: string
}

export interface Transaction {
  id: string
  account_id: string
  amount: number
  description: string
  category?: string
  merchant_name?: string
  transaction_date: string
  is_expense: boolean
  invoice_id?: string
  receipt_id?: string
  created_at: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface VirtualCard {
  id: string
  account_id: string
  last_four: string
  expiry_month: number
  expiry_year: number
  status: 'active' | 'frozen' | 'cancelled'
  spending_limit?: number
  created_at: string
}

export interface AccountStats {
  period_days: number
  total_income: number
  total_expenses: number
  net: number
  transaction_count: number
}

// Maps to HMRC Chart of Accounts categories
export type TransactionCategory =
  | 'TRAVEL'
  | 'VEHICLE'
  | 'OFFICE'
  | 'EQUIPMENT'
  | 'SOFTWARE'
  | 'MARKETING'
  | 'PROFESSIONAL'
  | 'TELEPHONE'
  | 'PREMISES'
  | 'WAGES'
  | 'BANK_CHARGES'
  | 'INSURANCE'
  | 'TRAINING'
  | 'ENTERTAINMENT'
  | 'OTHER'

// ── TrueLayer connection ──────────────────────────────────────────────────────

export interface BankConnectionStatus {
  connected: boolean
  provider_name?: string
  display_name?: string
  last_synced_at?: string
  status?: 'active' | 'expired' | 'disconnected'
  new_transactions?: number
}

export interface ConnectUrlResponse {
  url: string
  state: string
}

export interface SyncResult {
  new_transactions: number
  synced_at?: string
}

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  TRAVEL: 'Travel & Subsistence',
  VEHICLE: 'Motor Expenses',
  OFFICE: 'Office Costs',
  EQUIPMENT: 'Equipment',
  SOFTWARE: 'Software & Subscriptions',
  MARKETING: 'Advertising & Marketing',
  PROFESSIONAL: 'Professional Fees',
  TELEPHONE: 'Phone & Internet',
  PREMISES: 'Premises',
  WAGES: 'Wages & Salaries',
  BANK_CHARGES: 'Bank Charges',
  INSURANCE: 'Insurance',
  TRAINING: 'Training',
  ENTERTAINMENT: 'Entertainment',
  OTHER: 'Other',
}
