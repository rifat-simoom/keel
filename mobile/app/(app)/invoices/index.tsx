import { View, Text, StyleSheet } from 'react-native'
import { FileText } from 'lucide-react-native'

export default function InvoicesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
      </View>
      <View style={styles.empty}>
        <FileText size={40} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Invoices coming in Phase 3</Text>
        <Text style={styles.emptyBody}>Create, send and track invoices.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 16, fontSize: 17, fontWeight: '600', color: '#374151' },
  emptyBody: { marginTop: 6, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
})
