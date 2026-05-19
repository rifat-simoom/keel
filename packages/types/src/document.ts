export type DocumentStatus = 'uploaded' | 'reviewed' | 'matched'

export interface Document {
  id: string
  company_id: string
  file_key: string
  file_name: string
  mime_type: string
  file_size: number | null
  status: DocumentStatus
  url: string
  vendor_name: string | null
  amount: number | null
  vat_amount: number | null
  expense_date: string | null
  category: string | null
  notes: string | null
  extracted_data: Record<string, unknown> | null
  transaction_id: string | null
  created_at: string
  updated_at: string
}

export interface DocumentListResponse {
  items: Document[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface UpdateDocumentInput {
  vendor_name?: string
  amount?: number
  vat_amount?: number
  expense_date?: string
  category?: string
  notes?: string
}
