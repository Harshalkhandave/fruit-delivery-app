import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Appbar, Button, Divider, Switch, Text, TextInput } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { CartItem, setCartItemQuantity } from '../services/cartService';
import { fetchSingleProduct } from '../services/homeService';
import { validatePromoCode } from '../services/promoService';

// ─── Constants ────────────────────────────────────────────────────────────────
const GREEN = '#2e7d32';
const GREEN_LIGHT = '#e8f5e9';
const MAX_QTY_FALLBACK = 10;

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockInfo {
  maxQty: number;
  inStock: boolean;
}

export default function CartScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // ── Use global cart state from CartContext ─────────────────────────────────
  // CartContext already has a live subscription — no duplicate listener needed
  const { effectiveCart } = useCart();

  // Derive cart items from effectiveCart + item metadata stored in cartByLineId
  // We still need CartItem shape (with productName, image etc.) from the subscription
  // So we keep a local items state but driven by effectiveCart changes
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // ── Per-item loading state ─────────────────────────────────────────────────
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Stock info keyed by cartItem.id ───────────────────────────────────────
  const [stockMap, setStockMap] = useState<Record<string, StockInfo>>({});
  const [stockLoading, setStockLoading] = useState(false);

  // Cache fetched stock so we don't re-fetch the same product multiple times
  // in one session — keyed by productId
  const stockFetchCache = useRef<Record<string, StockInfo>>({});

  // ── Bag / promo ────────────────────────────────────────────────────────────
  const [needsBag, setNeedsBag] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);

  // ── Checkout validation loading ────────────────────────────────────────────
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const tr = (key: string, fallback: string) => t(key) || fallback;

  // ── Sync cart items from CartContext effectiveCart ─────────────────────────
  // CartContext tracks quantities; CartItem metadata (name, image, price) comes
  // from the Firestore subscription. We reconcile them here so the UI always
  // shows up-to-date quantities from optimisticCart without a second subscription.
  const [cartItemMetadata, setCartItemMetadata] = useState<Record<string, CartItem>>({});

  // Subscribe once for metadata only — quantities come from effectiveCart
  useEffect(() => {
    if (!user?.uid) return;
    const { subscribeToCart } = require('../services/cartService');
    const unsubscribe = subscribeToCart(user.uid, (items: CartItem[]) => {
      // Store metadata keyed by lineId
      const meta: Record<string, CartItem> = {};
      items.forEach(item => { meta[item.id] = item; });
      setCartItemMetadata(meta);
    });
    return unsubscribe;
  }, [user?.uid]);

  // Merge metadata with live quantities from effectiveCart
  useEffect(() => {
    const merged: CartItem[] = [];
    for (const [lineId, qty] of Object.entries(effectiveCart)) {
      if (qty <= 0) continue;
      const meta = cartItemMetadata[lineId];
      if (meta) {
        merged.push({ ...meta, quantity: qty });
      }
    }
    // Sort to maintain stable order
    merged.sort((a, b) => a.productName.localeCompare(b.productName));
    setCartItems(merged);
  }, [effectiveCart, cartItemMetadata]);

  // ── Fetch stock info — with session cache to avoid repeat fetches ──────────
  const cartItemKey = cartItems.map(i => i.id).join(',');

  useEffect(() => {
    if (cartItems.length === 0) { setStockMap({}); return; }

    let cancelled = false;
    const load = async () => {
      setStockLoading(true);
      const newMap: Record<string, StockInfo> = { ...stockMap };

      await Promise.all(
        cartItems.map(async item => {
          // Skip if already in session cache for this product+variant combo
          const cacheKey = item.variantId
            ? `${item.productId}__${item.variantId}`
            : item.productId;

          if (stockFetchCache.current[cacheKey]) {
            newMap[item.id] = stockFetchCache.current[cacheKey];
            return;
          }

          try {
            const product = await fetchSingleProduct(item.productId);
            if (!product) {
              const fallback = { maxQty: MAX_QTY_FALLBACK, inStock: true };
              newMap[item.id] = fallback;
              stockFetchCache.current[cacheKey] = fallback;
              return;
            }

            let info: StockInfo;
            if (item.variantId && product.variants?.length) {
              const variant = product.variants.find(v => v.id === item.variantId);
              if (variant) {
                info = {
                  maxQty: variant.maxQty ?? variant.totalStock ?? MAX_QTY_FALLBACK,
                  inStock: (variant.totalStock ?? 0) > 0,
                };
              } else {
                info = {
                  maxQty: product.maxQty ?? product.totalStock ?? MAX_QTY_FALLBACK,
                  inStock: (product.totalStock ?? 0) > 0,
                };
              }
            } else {
              info = {
                maxQty: product.maxQty ?? product.totalStock ?? MAX_QTY_FALLBACK,
                inStock: (product.totalStock ?? 0) > 0,
              };
            }

            newMap[item.id] = info;
            stockFetchCache.current[cacheKey] = info;
          } catch {
            newMap[item.id] = { maxQty: MAX_QTY_FALLBACK, inStock: true };
          }
        })
      );

      if (!cancelled) {
        setStockMap(newMap);
        setStockLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItemKey]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const totalQty = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const bagCharge = needsBag ? 20 : 0;
  const finalTotal = Math.max(0, subtotal + bagCharge - promoDiscount);

  // ── Quantity change ────────────────────────────────────────────────────────
  const handleQtyChange = async (item: CartItem, nextQty: number) => {
    if (!user?.uid) return;
    if (updatingId) return;

    const stock = stockMap[item.id];
    if (stock && !stock.inStock && nextQty > item.quantity) return;
    if (stock && nextQty > stock.maxQty) {
      Alert.alert(
        tr('max_qty_title', 'Maximum limit reached'),
        `${tr('only', 'Only')} ${stock.maxQty} ${tr('units_available_for', 'unit(s) available for')} ${item.productName}`
      );
      return;
    }

    try {
      setUpdatingId(item.id);
      await setCartItemQuantity(
        user.uid,
        {
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          unit: item.unit,
          price: item.price,
          variantId: item.variantId,
        },
        nextQty
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Apply promo ────────────────────────────────────────────────────────────
  const applyPromoCode = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    try {
      const result = await validatePromoCode(code, subtotal);
      if (!result.valid) {
        setAppliedPromoCode('');
        setPromoDiscount(0);
        setPromoCode('');
        Alert.alert(
          tr('promo_invalid', 'Invalid promo code'),
          result.message || tr('promo_invalid', 'Invalid promo code')
        );
        return;
      }
      setAppliedPromoCode(result.code);
      setPromoDiscount(result.discount);
      setPromoCode('');
      Keyboard.dismiss();
    } catch {
      setPromoCode('');
      Alert.alert(tr('error', 'Error'), tr('something_went_wrong', 'Something went wrong'));
    } finally {
      setPromoLoading(false);
    }
  };

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!user?.uid) return;
    setCheckoutLoading(true);

    try {
      const issues: string[] = [];

      await Promise.all(
        cartItems.map(async item => {
          try {
            const product = await fetchSingleProduct(item.productId);
            if (!product) return;

            let currentStock = product.totalStock ?? 0;
            if (item.variantId && product.variants?.length) {
              const variant = product.variants.find(v => v.id === item.variantId);
              if (variant) currentStock = variant.totalStock ?? 0;
            }

            if (currentStock <= 0) {
              issues.push(
                `• ${item.productName} (${item.unit}) ${tr('is_out_of_stock', 'is out of stock')}`
              );
            } else if (item.quantity > currentStock) {
              issues.push(
                `• ${item.productName} (${item.unit}): ${tr('only', 'only')} ${currentStock} ${tr('left', 'left')}, ${tr('you_have', 'you have')} ${item.quantity}`
              );
            }
          } catch { /* let server validate */ }
        })
      );

      if (issues.length > 0) {
        Alert.alert(
          tr('cart_issue_title', 'Some items have issues'),
          issues.join('\n'),
          [{ text: tr('ok', 'OK') }]
        );
        return;
      }

      router.push({
        pathname: '/ConfirmOrder',
        params: {
          bag: needsBag ? '1' : '0',
          promoCode: appliedPromoCode,
          promoDiscount: String(promoDiscount),
          totalAmount: String(finalTotal),
        },
      } as never);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={tr('cart', 'Cart')}
          titleStyle={styles.appBarTitle}
        />
        {stockLoading && (
          <ActivityIndicator size="small" color={GREEN} style={styles.headerSpinner} />
        )}
      </Appbar.Header>

      {cartItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text variant="titleMedium">{tr('cart_is_empty', 'Your cart is empty')}</Text>
          <Text variant="bodyMedium" style={styles.emptyHint}>
            {tr('add_items_to_continue', 'Add items to continue')}
          </Text>
          <Button
            mode="contained"
            style={styles.shopBtn}
            onPress={() => router.back()}
          >
            {tr('start_shopping', 'Start Shopping')}
          </Button>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Scrollable content */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Product rows */}
            {cartItems.map(item => {
              const isUpdating = updatingId === item.id;
              const stock = stockMap[item.id];
              const isOutOfStock = stock ? !stock.inStock : false;
              const atMax = stock ? item.quantity >= stock.maxQty : false;
              const originalPrice = (item as any).originalPrice as number | undefined;

              return (
                <View
                  key={item.id}
                  style={[styles.itemRow, isOutOfStock && styles.itemRowOOS]}
                >
                  <ExpoImage
                    source={item.productImage}
                    style={[styles.itemImage, isOutOfStock && styles.itemImageDimmed]}
                    contentFit="cover"
                    transition={100}
                    cachePolicy="memory-disk"
                  />

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.itemUnit}>{item.unit}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.itemPrice}>Rs {item.price}</Text>
                      {originalPrice && originalPrice > item.price ? (
                        <Text style={styles.itemStrike}>Rs {originalPrice}</Text>
                      ) : null}
                    </View>
                    {isOutOfStock ? (
                      <View style={styles.oosBadge}>
                        <Text style={styles.oosText}>
                          {tr('out_of_stock', 'Out of stock')}
                        </Text>
                      </View>
                    ) : atMax ? (
                      <Text style={styles.maxQtyHint}>
                        {tr('max', 'Max')} {stock?.maxQty}
                      </Text>
                    ) : null}
                  </View>

                  {isOutOfStock ? (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleQtyChange(item, 0)}
                      disabled={isUpdating}
                    >
                      {isUpdating
                        ? <ActivityIndicator size="small" color="#c62828" />
                        : <Text style={styles.removeBtnText}>✕</Text>
                      }
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.stepper, isUpdating && styles.stepperUpdating]}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleQtyChange(item, item.quantity - 1)}
                        disabled={isUpdating}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      >
                        {isUpdating
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.stepperSymbol}>−</Text>
                        }
                      </TouchableOpacity>
                      <Text style={styles.stepperCount}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleQtyChange(item, item.quantity + 1)}
                        disabled={isUpdating || atMax}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      >
                        <Text style={[
                          styles.stepperSymbol,
                          (isUpdating || atMax) && styles.stepperSymbolDim,
                        ]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Bag + Promo card */}
            <View style={styles.extraCard}>
              <View style={styles.bagRow}>
                <View style={styles.flex1}>
                  <Text style={styles.bagLabel}>
                    {tr('need_carry_bag', 'Need carry bag?')}
                  </Text>
                  <Text style={styles.bagHint}>
                    {tr('carry_bag_charge', 'Extra Rs 20 will be added')}
                  </Text>
                </View>
                <Switch value={needsBag} onValueChange={setNeedsBag} color={GREEN} />
              </View>

              <Divider style={styles.extraDivider} />

              <View style={styles.promoWrap}>
                <TextInput
                  mode="outlined"
                  label={tr('promo_code', 'Promo Code')}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={applyPromoCode}
                  style={styles.promoInput}
                  outlineStyle={styles.promoOutline}
                  editable={!promoLoading}
                  onFocus={() => {
                    setTimeout(
                      () => scrollRef.current?.scrollToEnd({ animated: true }),
                      300
                    );
                  }}
                />
                <Button
                  mode="contained"
                  onPress={applyPromoCode}
                  loading={promoLoading}
                  disabled={!promoCode.trim() && !promoLoading}
                  style={styles.promoBtn}
                  contentStyle={styles.promoBtnContent}
                  labelStyle={styles.promoBtnLabel}
                >
                  {tr('apply', 'Apply')}
                </Button>
              </View>

              {appliedPromoCode && promoDiscount > 0 ? (
                <Text style={styles.promoApplied}>
                  ✓ {appliedPromoCode} — Rs {promoDiscount} {tr('off', 'off')}
                </Text>
              ) : null}
            </View>

            {/* Bottom padding so content isn't hidden behind the checkout bar */}
            <View style={{ height: 120 + insets.bottom }} />
          </ScrollView>

          {/* Checkout bar — absolutely positioned above phone nav buttons */}
          <View
            style={[
              styles.bottomSheet,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 16 },
            ]}
          >
            <Divider />
            <View style={styles.summaryBlock}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {tr('subtotal', 'Subtotal')} ({totalQty})
                </Text>
                <Text style={styles.summaryValue}>Rs {subtotal}</Text>
              </View>

              {needsBag ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {tr('bag_charge', 'Carry Bag')}
                  </Text>
                  <Text style={styles.summaryValue}>Rs {bagCharge}</Text>
                </View>
              ) : null}

              {appliedPromoCode && promoDiscount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {tr('promo_discount', 'Promo')}
                  </Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    − Rs {promoDiscount}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>{tr('total', 'Total')}</Text>
                <Text style={styles.totalAmount}>Rs {finalTotal}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                checkoutLoading && styles.checkoutBtnLoading,
              ]}
              onPress={handleCheckout}
              disabled={checkoutLoading || cartItems.length === 0}
              activeOpacity={0.85}
            >
              {checkoutLoading ? (
                <View style={styles.checkoutBtnInner}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.checkoutBtnText}>
                    {tr('validating', 'Validating…')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.checkoutBtnText}>
                  {tr('proceed_to_checkout', 'Proceed to Checkout')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  appBar: { backgroundColor: '#fff', elevation: 2 },
  appBarTitle: { fontWeight: '700', fontSize: 17 },
  headerSpinner: { marginRight: 12 },

  scroll: { flex: 1 },
  content: { padding: 10, paddingBottom: 16, gap: 8 },

  // ── Item row ───────────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemRowOOS: {
    backgroundColor: '#fafafa',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 7,
    backgroundColor: '#f0f0f0',
  },
  itemImageDimmed: { opacity: 0.35 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#111', marginBottom: 1 },
  itemUnit: { fontSize: 11, color: '#999', marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#111' },
  itemStrike: { fontSize: 11, color: '#bbb', textDecorationLine: 'line-through' },
  oosBadge: {
    marginTop: 3,
    alignSelf: 'flex-start',
    backgroundColor: '#ffebee',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  oosText: { fontSize: 10, color: '#c62828', fontWeight: '600' },
  maxQtyHint: { fontSize: 10, color: '#e65100', marginTop: 2, fontWeight: '500' },

  // ── Stepper ────────────────────────────────────────────────────────────────
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GREEN,
    borderRadius: 20,
    height: 36,
    minWidth: 96,
    paddingHorizontal: 2,
  },
  stepperUpdating: { backgroundColor: '#66bb6a' },
  stepperBtn: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  stepperSymbolDim: { opacity: 0.35 },
  stepperCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },

  // ── Remove button ──────────────────────────────────────────────────────────
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#c62828', fontSize: 14, fontWeight: '700' },

  // ── Extra card ─────────────────────────────────────────────────────────────
  extraCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bagLabel: { fontSize: 13, fontWeight: '600', color: '#111' },
  bagHint: { fontSize: 11, color: '#999', marginTop: 1 },
  extraDivider: { marginVertical: 10 },
  promoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoInput: { flex: 1, backgroundColor: '#fff', height: 44 },
  promoOutline: { borderRadius: 8 },
  promoBtn: { backgroundColor: GREEN, borderRadius: 8 },
  promoBtnContent: { height: 44, paddingHorizontal: 2 },
  promoBtnLabel: { fontSize: 13, fontWeight: '700' },
  promoApplied: {
    marginTop: 8,
    fontSize: 12,
    color: GREEN,
    fontWeight: '600',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },

  // ── Bottom sheet — sticks above phone nav buttons ──────────────────────────
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingTop: 10,
    // paddingBottom set dynamically using insets
  },
  summaryBlock: { gap: 4, paddingVertical: 6 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: '#666' },
  summaryValue: { fontSize: 13, color: '#333', fontWeight: '500' },
  discountValue: { color: GREEN, fontWeight: '600' },
  totalRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  totalAmount: { fontSize: 16, fontWeight: '800', color: '#111' },

  // ── Checkout button ────────────────────────────────────────────────────────
  checkoutBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  checkoutBtnLoading: { backgroundColor: '#66bb6a' },
  checkoutBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyHint: { color: '#888', marginTop: 6, marginBottom: 16 },
  shopBtn: { borderRadius: 10, backgroundColor: GREEN },
});