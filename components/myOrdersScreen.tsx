import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Card, Chip, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUser } from '../context/UserContext';
import { subscribeUserOrders, UserOrder } from '../services/orderService';

export default function MyOrdersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useUser();
  const [orders, setOrders] = useState<UserOrder[]>([]);

  const tr = (key: string, fallback: string) => t(key) || fallback;

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeUserOrders(user.uid, setOrders);
    return unsubscribe;
  }, [user?.uid]);

  const totalOrders = useMemo(() => orders.length, [orders]);
  const statusLabel = (status: UserOrder['status']) => {
    const labels: Record<UserOrder['status'], string> = {
      placed: tr('order_status_placed', 'Order Placed'),
      packed: tr('order_status_packed', 'Packed'),
      out_for_delivery: tr('order_status_out_for_delivery', 'Out for Delivery'),
      delivered: tr('order_status_delivered', 'Delivered'),
      cancelled: tr('order_status_cancelled', 'Cancelled'),
    };
    return labels[status];
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={tr('my_orders', 'My Orders')} titleStyle={styles.title} />
      </Appbar.Header>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text variant="titleMedium">{tr('no_orders_yet', 'No orders yet')}</Text>
          <Text variant="bodyMedium" style={styles.emptyHint}>
            {tr('order_history_will_appear', 'Your order history will appear here')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="bodyMedium" style={styles.countText}>
            {tr('total_orders', 'Total Orders')}: {totalOrders}
          </Text>
          {orders.map(order => (
            <Card key={order.id} style={styles.orderCard} mode="outlined">
              <Card.Content>
                <View style={styles.row}>
                  <Text variant="titleSmall" style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                  <Chip compact>{statusLabel(order.status)}</Chip>
                </View>
                <Text variant="bodySmall" style={styles.itemCount}>
                  {tr('items_count', 'Items')}: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
                <Text variant="titleSmall" style={styles.total}>
                  {tr('total', 'Total')}: Rs {order.totalAmount}
                </Text>
                <Text variant="bodySmall" style={styles.address}>
                  {order.address.line1}, {order.address.line2}, {order.address.city}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  appBar: { backgroundColor: '#fff', elevation: 2 },
  title: { fontWeight: '700' },
  content: { padding: 16, paddingBottom: 20 },
  countText: { color: '#555', marginBottom: 10 },
  orderCard: { marginBottom: 10, borderRadius: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '700' },
  itemCount: { marginTop: 6, color: '#555' },
  total: { marginTop: 6, fontWeight: '700', color: '#1b5e20' },
  address: { marginTop: 4, color: '#666' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyHint: { color: '#666', marginTop: 6 },
});
