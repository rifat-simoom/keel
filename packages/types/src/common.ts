export interface Address {
  line1: string
  line2?: string
  city: string
  county?: string
  postcode: string
  country: string
}

export type Currency = 'GBP'

export type VatRate = 0 | 0.05 | 0.2

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ApiError {
  error: string
  code: string
  details?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: Pagination
}
