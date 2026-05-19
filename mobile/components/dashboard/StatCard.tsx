import { View, Text, StyleSheet } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

interface BadgeProps {
  text: string
  variant: 'red' | 'amber' | 'green' | 'blue'
}

interface StatCardProps {
  label: string
  value: string
  subtext?: string
  icon: LucideIcon
  iconColor?: string
  badge?: BadgeProps
  loading?: boolean
}

const BADGE_COLORS = {
  red:   { bg: '#fef2f2', text: '#b91c1c' },
  amber: { bg: '#fffbeb', text: '#92400e' },
  green: { bg: '#f0fdf4', text: '#166534' },
  blue:  { bg: '#eff6ff', text: '#1d4ed8' },
}

export function StatCard({ label, value, subtext, icon: Icon, iconColor = '#0057b8', badge, loading }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{label}</Text>
          {loading
            ? <View style={styles.skeleton} />
            : <Text style={styles.value}>{value}</Text>
          }
          {subtext && !loading && <Text style={styles.subtext}>{subtext}</Text>}
        </View>
        <View style={styles.iconBox}>
          <Icon size={20} color={iconColor} />
        </View>
      </View>

      {badge && (
        <View style={[styles.badge, { backgroundColor: BADGE_COLORS[badge.variant].bg }]}>
          <Text style={[styles.badgeText, { color: BADGE_COLORS[badge.variant].text }]}>
            {badge.text}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  textBlock: { flex: 1, marginRight: 12 },
  label: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  value: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 4 },
  subtext: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: { height: 28, width: 100, borderRadius: 6, backgroundColor: '#f3f4f6', marginTop: 4 },
  badge: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
})
