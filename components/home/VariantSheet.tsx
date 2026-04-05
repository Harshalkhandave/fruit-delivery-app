import React from 'react';
import {
    ActivityIndicator, Modal, Pressable, ScrollView,
    StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { Divider, IconButton, Snackbar, Text } from 'react-native-paper';
import { cartLineDocId } from '../../services/cartService';
import type { ProductItem, ProductVariant } from '../../services/homeService';

interface Props {
  product: ProductItem | null;
  visible: boolean;
  onClose: () => void;
  selectedVariantId: string;
  effectiveCart: Record<string, number>;
  staleFetchingLineIds: Set<string>;
  modalSnackMsg: string | null;
  modalSnackType: 'success' | 'warning';
  onDismissSnack: () => void;
  onSelectVariant: (variantId: string) => void;
  onQuantityChange: (variant: ProductVariant, nextQty: number) => void;
  onSpawnParticle: (
    type: '+1' | '-1',
    btnRef: View | null,
    imgRef: View | null,
    isIncrease: boolean,
    vLineId: string,
  ) => void;
  addButtonRefs: React.MutableRefObject<Record<string, View | null>>;
  productImageRefs: React.MutableRefObject<Record<string, View | null>>;
  onNavigateToCart: () => void;
  getParticleTarget: () => { x: number; y: number };
}

export function VariantSheet({
  product, visible, onClose, selectedVariantId,
  effectiveCart, staleFetchingLineIds,
  modalSnackMsg, modalSnackType, onDismissSnack,
  onSelectVariant, onQuantityChange, onSpawnParticle,
  addButtonRefs, productImageRefs,
  onNavigateToCart, getParticleTarget,
}: Props) {
  if (!product?.variants?.length) return null;

  const variantsInCart = product.variants.filter(v =>
    (effectiveCart[cartLineDocId(product.id, v.id)] || 0) > 0
  );
  const anyVariantInCart = variantsInCart.length > 0;
  const productCartTotal = product.variants.reduce(
    (sum, v) => sum + (effectiveCart[cartLineDocId(product.id, v.id)] || 0), 0
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>{product.name}</Text>
          <IconButton icon="close" size={22} onPress={onClose} />
        </View>
        <Divider />

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {product.variants.map(variant => {
            const vLineId = cartLineDocId(product.id, variant.id);
            const vQty = effectiveCart[vLineId] || 0;
            const isSelected = selectedVariantId === variant.id;
            const vIsOOS = variant.totalStock === 0;
            const vMax = Math.min(variant.maxQty ?? variant.totalStock, variant.totalStock);
            const vIsAtMax = vQty >= vMax && vMax > 0;
            const vDiscountPct = variant.oldPrice
              ? Math.round(((variant.oldPrice - variant.price) / variant.oldPrice) * 100)
              : null;
            const isSelectable = !anyVariantInCart || vQty > 0;
            const vIsStaleFetching = staleFetchingLineIds.has(vLineId);

            const vAddRef = (ref: View | null) => { addButtonRefs.current[`modal-add-${vLineId}`] = ref; };
            const vMinusRef = (ref: View | null) => { addButtonRefs.current[`modal-minus-${vLineId}`] = ref; };
            const vPlusRef = (ref: View | null) => { addButtonRefs.current[`modal-plus-${vLineId}`] = ref; };

            return (
              <Pressable
                key={variant.id}
                onPress={() => { if (isSelectable) onSelectVariant(variant.id); }}
                style={[
                  styles.row,
                  isSelected && !vIsOOS ? styles.rowActive : null,
                  vIsOOS ? styles.rowDisabled : null,
                ]}
              >
                <View style={styles.info}>
                  <View style={styles.unitRow}>
                    <Text variant="bodyMedium" style={styles.unitText}>{variant.unit}</Text>
                    {vIsOOS ? (
                      <View style={styles.oosTag}><Text style={styles.oosTagText}>Out of Stock</Text></View>
                    ) : vIsAtMax ? (
                      <View style={styles.maxTag}><Text style={styles.maxTagText}>Max reached</Text></View>
                    ) : vDiscountPct ? (
                      <View style={styles.discTag}><Text style={styles.discTagText}>{vDiscountPct}% OFF</Text></View>
                    ) : null}
                  </View>
                  <View style={styles.priceRow}>
                    <Text variant="titleSmall" style={styles.price}>Rs {variant.price}</Text>
                    {variant.oldPrice && (
                      <Text variant="bodySmall" style={styles.oldPrice}>Rs {variant.oldPrice}</Text>
                    )}
                  </View>
                </View>

                <View style={{ width: 100, alignItems: 'flex-end' }}>
                  {vIsOOS ? (
                    <View style={styles.oosPlaceholder} />
                  ) : vQty === 0 ? (
                    <View ref={vAddRef} collapsable={false} style={styles.addBtn}>
                      <TouchableOpacity
                        style={styles.addBtnInner}
                        disabled={vIsStaleFetching || vIsAtMax}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => {
                          onQuantityChange(variant, 1);
                          onSpawnParticle('+1', addButtonRefs.current[`modal-add-${vLineId}`] ?? null, null, true, vLineId);
                        }}
                      >
                        {vIsStaleFetching
                          ? <ActivityIndicator size="small" color="#2e7d32" />
                          : <Text style={[styles.addBtnText, vIsAtMax && { opacity: 0.3 }]}>+</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.stepper}>
                      <View ref={vMinusRef} collapsable={false} style={styles.stepBtn}>
                        <TouchableOpacity
                          style={styles.stepBtnInner}
                          hitSlop={{ top: 8, bottom: 8, left: 8 }}
                          onPress={() => {
                            onQuantityChange(variant, vQty - 1);
                            onSpawnParticle('-1', addButtonRefs.current[`modal-minus-${vLineId}`] ?? null, productImageRefs.current[product.id] ?? null, false, vLineId);
                          }}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.stepCount}>{vQty}</Text>
                      <View ref={vPlusRef} collapsable={false} style={styles.stepBtn}>
                        <TouchableOpacity
                          style={styles.stepBtnInner}
                          disabled={vIsStaleFetching || vIsAtMax}
                          hitSlop={{ top: 8, bottom: 8, right: 8 }}
                          onPress={() => {
                            onQuantityChange(variant, vQty + 1);
                            onSpawnParticle('+1', addButtonRefs.current[`modal-plus-${vLineId}`] ?? null, null, true, vLineId);
                          }}
                        >
                          {vIsStaleFetching
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={[styles.stepBtnText, vIsAtMax && { opacity: 0.3 }]}>+</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {productCartTotal > 0 && (
          <TouchableOpacity style={styles.miniCart} onPress={onNavigateToCart} activeOpacity={0.9}>
            <View style={styles.miniCartLeft}>
              <View style={styles.miniCartBadge}>
                <Text style={styles.miniCartBadgeText}>{productCartTotal}</Text>
              </View>
              <Text style={styles.miniCartItems}>
                {productCartTotal} item{productCartTotal !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.miniCartLabel}>CART →</Text>
          </TouchableOpacity>
        )}

        <Snackbar
          visible={!!modalSnackMsg}
          onDismiss={onDismissSnack}
          duration={2500}
          style={[styles.snack, modalSnackType === 'success' ? styles.snackSuccess : styles.snackWarning]}
        >
          {modalSnackMsg ?? ''}
        </Snackbar>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', paddingBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingTop: 10, paddingBottom: 6 },
  title: { fontWeight: '700' },
  list: { paddingHorizontal: 12, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 8, marginBottom: 8, backgroundColor: '#fff' },
  rowActive: { borderColor: '#2e7d32', backgroundColor: '#f1f8f2' },
  rowDisabled: { backgroundColor: '#fafafa', opacity: 0.6 },
  info: { flex: 1, marginLeft: 10, marginRight: 8 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  unitText: { fontWeight: '600' },
  oosTag: { backgroundColor: '#f5f5f5', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: '#ddd' },
  oosTagText: { color: '#9e9e9e', fontSize: 10, fontWeight: '600' },
  maxTag: { backgroundColor: '#fff3e0', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: '#e65100' },
  maxTagText: { color: '#e65100', fontSize: 10, fontWeight: '600' },
  discTag: { backgroundColor: '#ffebee', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  discTagText: { color: '#d32f2f', fontSize: 10, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { color: '#1b5e20', fontWeight: '700' },
  oldPrice: { color: '#9e9e9e', textDecorationLine: 'line-through' },
  oosPlaceholder: { width: 36, height: 36 },
  addBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2e7d32', alignItems: 'center', justifyContent: 'center' },
  addBtnInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#2e7d32', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', borderRadius: 7 },
  stepBtn: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepBtnInner: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 19 },
  stepCount: { color: '#fff', fontSize: 13, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  miniCart: { marginHorizontal: 12, marginTop: 8, marginBottom: 12, height: 50, backgroundColor: '#2e7d32', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, elevation: 4 },
  miniCartLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniCartBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  miniCartBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  miniCartItems: { color: '#fff', fontSize: 14, fontWeight: '500' },
  miniCartLabel: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  snack: { marginHorizontal: 12, marginBottom: 8 },
  snackSuccess: { backgroundColor: '#2e7d32' },
  snackWarning: { backgroundColor: '#323232' },
});