import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@keel/api'

export interface DashboardSummary {
  account_balance: number
  outstanding_invoices_amount: number
  overdue_invoices_count: number
  tax_estimate: number
  next_deadline: { label: string; date: string } | null
}

const EMPTY: DashboardSummary = {
  account_balance: 0,
  outstanding_invoices_amount: 0,
  overdue_invoices_count: 0,
  tax_estimate: 0,
  next_deadline: null,
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<DashboardSummary>('/api/v1/dashboard/summary')
        return data
      } catch {
        // Endpoint not yet implemented — return zeros until Phase 3-6 fill it in
        return EMPTY
      }
    },
    staleTime: 60_000,
  })
}
