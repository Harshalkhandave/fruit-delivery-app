import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrderPlacedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key) || fallback;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="displaySmall">🎉</Text>
        <Text variant="headlineSmall" style={styles.title}>
          {tr('order_placed_title', 'Order Placed!')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {tr('order_placed_subtitle', 'Your order has been placed successfully and is being processed.')}
        </Text>

        <Button mode="contained" style={styles.primaryBtn} onPress={() => router.replace('/MyOrders' as never)}>
          {tr('view_my_orders', 'View My Orders')}
        </Button>
        <Button mode="outlined" style={styles.secondaryBtn} onPress={() => router.replace('/' as never)}>
          {tr('continue_shopping', 'Continue Shopping')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { marginTop: 10, fontWeight: '700' },
  subtitle: { textAlign: 'center', color: '#666', marginTop: 8, marginBottom: 20 },
  primaryBtn: { borderRadius: 10, width: '100%' },
  secondaryBtn: { borderRadius: 10, width: '100%', marginTop: 10 },
});
