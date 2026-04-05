import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Divider, RadioButton, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUser } from '../context/UserContext';
import { CartItem, subscribeToCart } from '../services/cartService';
import { placeOrder } from '../services/orderService';
import { updateUserProfile } from '../services/userService';

export default function ConfirmOrderScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bag?: string; promoCode?: string; promoDiscount?: string; totalAmount?: string }>();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState('30-45 min');

  const tr = (key: string, fallback: string) => t(key) || fallback;

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToCart(user.uid, items => {
      setCartItems(items.filter(item => item.quantity > 0));
    });
    return unsubscribe;
  }, [user?.uid]);

  const savedAddresses = useMemo(() => {
    if (Array.isArray(user?.savedAddresses) && user.savedAddresses.length > 0) return user.savedAddresses;
    if (user?.savedAddress) return [user.savedAddress];
    return [];
  }, [user]);

  useEffect(() => {
    const preferredIndex =
      typeof user?.defaultAddressIndex === 'number' && user.defaultAddressIndex >= 0
        ? user.defaultAddressIndex
        : 0;
    if (preferredIndex < savedAddresses.length) setSelectedAddressIndex(preferredIndex);
  }, [savedAddresses.length, user?.defaultAddressIndex]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const bagCharge = params.bag === '1' ? 20 : 0;
  const promoCode = typeof params.promoCode === 'string' ? params.promoCode : '';
  const promoDiscount = Number(params.promoDiscount || 0);
  const totalAmount = Math.max(0, Number(params.totalAmount || subtotal + bagCharge - promoDiscount));

  const selectedAddress = savedAddresses[selectedAddressIndex];

  const handlePlaceOrder = async () => {
    if (!user?.uid) return;
    if (!selectedAddress) {
      Alert.alert(tr('address_required_title', 'Address Required'), tr('address_required_msg', 'Please add your delivery address to continue'));
      return;
    }
    if (cartItems.length === 0) {
      Alert.alert(tr('cart', 'Cart'), tr('cart_is_empty', 'Your cart is empty'));
      return;
    }

    try {
      setPlacingOrder(true);
      await placeOrder({
        uid: user.uid,
        items: cartItems,
        address: selectedAddress,
        subtotal,
        bagCharge,
        promoCode,
        promoDiscount,
        totalAmount,
        deliveryWindow: selectedWindow,
      });
      await updateUserProfile(user.uid, { defaultAddressIndex: selectedAddressIndex });
      router.replace('/OrderPlaced' as never);
    } catch {
      Alert.alert(tr('error', 'Error'), tr('something_went_wrong', 'Something went wrong'));
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={tr('confirm_order', 'Confirm Order')} titleStyle={styles.title} />
      </Appbar.Header>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {tr('confirm_delivery_address', 'Confirm Delivery Address')}
        </Text>

        {savedAddresses.length === 0 ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="bodyMedium">{tr('no_address_saved', 'No address saved yet')}</Text>
              <Button
                mode="contained"
                style={styles.addAddressBtn}
                onPress={() => router.push('/SavedAddresses' as never)}
              >
                {tr('add_address', 'Add Address')}
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.addressRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                    {selectedAddress?.receiverName}
                  </Text>
                  <Text variant="bodySmall">+91 {selectedAddress?.receiverPhone}</Text>
                  <Text variant="bodySmall">
                    {selectedAddress?.line1}, {selectedAddress?.line2}
                  </Text>
                  <Text variant="bodySmall">
                    {selectedAddress?.city}, {selectedAddress?.state}
                  </Text>
                </View>
              </View>
              <View style={styles.addressActions}>
                <Button mode="outlined" onPress={() => router.push('/SavedAddresses' as never)}>
                  {tr('change_or_edit_address', 'Change / Edit Address')}
                </Button>
                <Button mode="text" onPress={() => router.push('/SavedAddresses' as never)}>
                  {tr('add_new_address', 'Add New Address')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {tr('delivery_window', 'Delivery Window')}
        </Text>
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            {['30-45 min', '45-60 min', '60-90 min'].map(option => (
              <View key={option} style={styles.windowOption}>
                <Text variant="bodyMedium">{option}</Text>
                <RadioButton
                  value={option}
                  status={selectedWindow === option ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedWindow(option)}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {tr('payment_information', 'Payment Information')}
        </Text>
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="bodyMedium">{tr('payment_modes_note', 'All orders are Cash on Delivery. UPI is accepted at delivery.')}</Text>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {tr('bill_details', 'Bill Details')}
        </Text>
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.row}><Text>{tr('subtotal', 'Subtotal')}</Text><Text>Rs {subtotal}</Text></View>
            {bagCharge > 0 ? (
              <View style={styles.row}><Text>{tr('bag_charge', 'Bag Charge')}</Text><Text>Rs {bagCharge}</Text></View>
            ) : null}
            {promoCode && promoDiscount > 0 ? (
              <View style={styles.row}><Text>{tr('promo_discount', 'Promo Discount')}</Text><Text>- Rs {promoDiscount}</Text></View>
            ) : null}
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.row}><Text variant="titleMedium">{tr('total', 'Total')}</Text><Text variant="titleMedium">Rs {totalAmount}</Text></View>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>
        <Button
          mode="contained"
          onPress={handlePlaceOrder}
          loading={placingOrder}
          disabled={placingOrder || cartItems.length === 0}
          style={styles.placeOrderBtn}
        >
          {tr('place_order', 'Place Order')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  appBar: { backgroundColor: '#fff', elevation: 2 },
  title: { fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 90 },
  sectionTitle: { marginBottom: 10, marginTop: 8, fontWeight: '700' },
  card: { marginBottom: 10, borderRadius: 12, backgroundColor: '#fff' },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addAddressBtn: { marginTop: 10, borderRadius: 8, alignSelf: 'flex-start' },
  addressActions: { marginTop: 12, gap: 4 },
  windowOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placeOrderBtn: { borderRadius: 10 },
});
