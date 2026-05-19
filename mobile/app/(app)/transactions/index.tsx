import { View, Text, StyleSheet } from 'react-native'
import { CreditCard } from 'lucide-react-native'

export default function TransactionsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>
      <View style={styles.empty}>
        <CreditCard size={40} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Transactions coming in Phase 4</Text>
        <Text style={styles.emptyBody}>View and categorise your account activity.</Text>
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
