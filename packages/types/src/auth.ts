export type UserRole = 'owner' | 'accountant' | 'employee'

export interface Company {
  id: string
  name: string
  company_number?: string
  vat_number?: string
  utr?: string
  is_vat_registered: boolean
  vat_scheme: 'cash' | 'accrual'
  vat_stagger: 'A' | 'B' | 'C'
  year_end_month: number
  payment_terms_days: number
  invoice_footer?: string
  created_at: string
}

export interface UpdateProfileInput {
  full_name?: string
  company_name?: string
  company_number?: string
  vat_number?: string
  utr?: string
  is_vat_registered?: boolean
  vat_scheme?: string
  vat_stagger?: string
  year_end_month?: number
  payment_terms_days?: number
  invoice_footer?: string
}

export interface UserProfile {
  id: string
  keycloak_id: string
  email: string
  full_name?: string
  company_id?: string
  company?: Company
  role: UserRole
  created_at: string
  updated_at: string
}
