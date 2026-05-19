import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Calculator, FolderOpen, Users, CalendarDays, Settings, LogOut, ChevronRight } from 'lucide-react-native'
import { useAuthStore } from '../../../stores/auth'

const SECTIONS = [
  {
    title: 'Finance',
    items: [
      { icon: Calculator, label: 'Tax',       sub: 'VAT returns · CT estimate' },
      { icon: FolderOpen, label: 'Documents', sub: 'Receipts · contracts' },
      { icon: Users,      label: 'Payroll',   sub: 'PAYE · NIC · RTI' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: CalendarDays, label: 'Calendar', sub: 'Deadlines · reminders' },
      { icon: Settings,     label: 'Settings', sub: 'Profile · company · preferences' },
    ],
  },
]

export default function MoreScreen() {
  const { clearAuth } = useAuthStore()

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, index) => (
              <View key={item.label}>
                <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                  <View style={styles.iconBox}>
                    <item.icon size={20} color="#0057b8" />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSub}>{item.sub}</Text>
                  </View>
                  <ChevronRight size={16} color="#d1d5db" />
                </Pressable>
                {index < section.items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={clearAuth}
          >
            <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
              <LogOut size={20} color="#ef4444" />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: '#ef4444' }]}>Sign out</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f3f4f6' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowPressed: { backgroundColor: '#f9fafb' },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 64 },
})
