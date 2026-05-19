import { Tabs } from 'expo-router'
import { LayoutDashboard, FileText, Camera, CreditCard, MoreHorizontal } from 'lucide-react-native'
import { ScanTabButton } from '../../components/common/ScanTabButton'

const TAB_BAR_STYLE = {
  height: 64,
  paddingBottom: 8,
  paddingTop: 8,
  borderTopColor: '#e5e7eb',
}

const ACTIVE_COLOR = '#0057b8'
const INACTIVE_COLOR = '#9ca3af'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ size }) => <Camera size={size} color="#ffffff" />,
          tabBarButton: (props) => <ScanTabButton {...props} />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
