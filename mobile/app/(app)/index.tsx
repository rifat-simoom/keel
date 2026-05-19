import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@keel/api'
import { formatGBP, daysUntil } from '@keel/utils'
import {
  Wallet,
  FileText,
  AlertCircle,
  Calculator,
  CalendarClock,
} from 'lucide-react-native'
import { StatCard } from '../../components/dashboard/StatCard'
import { useAuthStore } from '../../stores/auth'

interface DashboardSummary {
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

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<DashboardSummary>('/api/v1/dashboard/summary')
        return data
      } catch {
        return EMPTY
      }
    },
    staleTime: 60_000,
  })
}

export default function DashboardScreen() {
  const { data, isLoading, refetch } = useDashboard()
  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const deadlineDays = data?.next_deadline ? daysUntil(data.next_deadline.date) : null
  const deadlineBadge = deadlineDays !== null
    ? deadlineDays < 0  ? { text: 'Overdue',             variant: 'red'   } as const
    : deadlineDays <= 7 ? { text: `${deadlineDays}d`,    variant: 'amber' } as const
                        : { text: `${deadlineDays}d`,    variant: 'green' } as const
    : undefined

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0057b8" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSub}>Your business at a glance</Text>
      </View>

      <StatCard
        label="Account balance"
        value={formatGBP(data?.account_balance ?? 0)}
        icon={Wallet}
        iconColor="#0057b8"
        loading={isLoading}
      />

      <StatCard
        label="Outstanding invoices"
        value={formatGBP(data?.outstanding_invoices_amount ?? 0)}
        icon={FileText}
        iconColor="#3b82f6"
        loading={isLoading}
      />

      <StatCard
        label="Overdue invoices"
        value={String(data?.overdue_invoices_count ?? 0)}
        subtext="Require immediate attention"
        icon={AlertCircle}
        iconColor="#ef4444"
        badge={
          (data?.overdue_invoices_count ?? 0) > 0
            ? { text: `${data!.overdue_invoices_count} overdue`, variant: 'red' }
            : undefined
        }
        loading={isLoading}
      />

      <StatCard
        label="Estimated CT liability"
        value={formatGBP(data?.tax_estimate ?? 0)}
        subtext="Running estimate · current tax year"
        icon={Calculator}
        iconColor="#f59e0b"
        loading={isLoading}
      />

      <StatCard
        label="Next deadline"
        value={data?.next_deadline?.label ?? '—'}
        subtext={data?.next_deadline?.date}
        icon={CalendarClock}
        iconColor="#8b5cf6"
        badge={deadlineBadge}
        loading={isLoading}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20, paddingTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
})
