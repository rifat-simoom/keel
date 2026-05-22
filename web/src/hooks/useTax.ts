import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@keel/api'
import type { CorpTaxEstimate, VATPeriodsResponse, PayOptimiserResult } from '@keel/types'

export function useCorpTaxEstimate() {
  return useQuery({
    queryKey: ['tax', 'corp-tax'],
    queryFn: async () => {
      const { data } = await apiClient.get<CorpTaxEstimate>('/api/v1/tax/corp-tax/estimate')
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useVATReturns(count: number = 4) {
  return useQuery({
    queryKey: ['tax', 'vat', count],
    queryFn: async () => {
      const { data } = await apiClient.get<VATPeriodsResponse>('/api/v1/tax/vat/periods', {
        params: { count },
      })
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function usePayOptimiser(desiredIncome: number) {
  return useQuery({
    queryKey: ['tax', 'salary-optimiser', desiredIncome],
    queryFn: async () => {
      const { data } = await apiClient.get<PayOptimiserResult>('/api/v1/tax/salary-optimiser', {
        params: { desired_income: desiredIncome },
      })
      return data
    },
    enabled: desiredIncome > 0,
    staleTime: 60_000,
  })
}
