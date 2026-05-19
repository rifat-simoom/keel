import { Pressable, StyleSheet, View } from 'react-native'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'

export function ScanTabButton({ onPress, onLongPress, children }: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.wrapper}
    >
      <View style={styles.fab}>{children}</View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -18,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0057b8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0057b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
})
