export type DeadlineUrgency = 'ok' | 'warning' | 'critical'

export type DeadlineType =
  | 'vat_return'
  | 'corp_tax_payment'
  | 'corp_tax_filing'
  | 'self_assessment'
  | 'invoice_due'

export interface Notification {
  id: string
  company_id: string
  notification_type: string
  title: string
  body: string
  route: string | null
  payload: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  items: Notification[]
  total: number
  unread_count: number
}

export interface Deadline {
  deadline_type: DeadlineType
  title: string
  description: string
  due_date: string
  days_until: number
  route: string
  urgency: DeadlineUrgency
}
