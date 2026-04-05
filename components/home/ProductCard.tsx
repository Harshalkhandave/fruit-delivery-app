import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { ProductItem, ProductVariant } from '../../services/homeService';

interface Props {
  product: ProductItem;
  qty: number;
  isStaleFetching: boolean;
  isAtMax: boolean;
  isOutOfStock: boolean;
  discountPct: number | null;
  unitLabel: string;
  priceVal: number;
  oldPriceVal?: number;
  selectedVariant?: ProductVariant;
  lineId: string;
  hasMultiVariants: boolean;
  // Ref callbacks
  addBtnRef: (ref: View | null) => void;
  minusBtnRef: (ref: View | null) => void;
  imgRef: (ref: View | null) => void;
  // Handlers
  onQuickAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onOpenVariants: () => void;
}

export function ProductCard({
  product, qty, isStaleFetching, isAtMax, isOutOfStock,
  discountPct, unitLabel, priceVal, oldPriceVal,
  addBtnRef, minusBtnRef, imgRef,
  onQuickAdd, onIncrease, onDecrease, onOpenVariants,
  hasMultiVariants,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <View ref={imgRef} collapsable={false}>
          <ExpoImage
            source={product.imageUrl}
            style={[styles.image, isOutOfStock && styles.imageDimmed]}
            contentFit="cover" transition={180} cachePolicy="memory-disk"
          />
        </View>

        {/* Top badges */}
        {isOutOfStock ? (
          <View style={styles.topBadge}><Text style={styles.topBadgeText}>Out of Stock</Text></View>
        ) : isAtMax ? (
          <View style={[styles.topBadge, styles.topBadgeMax]}><Text style={styles.topBadgeText}>Max reached</Text></View>
        ) : null}

        {discountPct && !isOutOfStock ? (
          <View style={styles.discountBadge}><Text style={styles.discountBadgeText}>{discountPct}% OFF</Text></View>
        ) : null}

        {/* Add / Stepper */}
        {isOutOfStock ? (
          <View style={styles.oosBadge}><Text style={styles.oosText}>Out of Stock</Text></View>
        ) : qty === 0 ? (
          <View ref={addBtnRef} collapsable={false} style={styles.fab}>
            <TouchableOpacity
              style={styles.fabInner}
              onPress={onQuickAdd}
              disabled={isStaleFetching || isAtMax}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isStaleFetching
                ? <ActivityIndicator size="small" color="#2e7d32" />
                : <Text style={styles.fabText}>+</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.stepper}>
            <View ref={minusBtnRef} collapsable={false} style={styles.stepBtn}>
              <TouchableOpacity style={styles.stepBtnInner} onPress={onDecrease} hitSlop={{ top: 8, bottom: 8, left: 8 }}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.stepCount}>{qty}</Text>
            <View ref={addBtnRef} collapsable={false} style={styles.stepBtn}>
              <TouchableOpacity
                style={styles.stepBtnInner}
                onPress={onIncrease}
                disabled={isStaleFetching || isAtMax}
                hitSlop={{ top: 8, bottom: 8, right: 8 }}
              >
                {isStaleFetching
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[styles.stepBtnText, isAtMax && styles.stepBtnDisabled]}>+</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{product.name}</Text>
      <View style={styles.priceRow}>
        <Text variant="titleMedium" style={styles.price}>Rs {priceVal}</Text>
        {oldPriceVal ? <Text variant="bodySmall" style={styles.oldPrice}>Rs {oldPriceVal}</Text> : null}
      </View>
      <TouchableOpacity
        style={styles.unitTrigger}
        disabled={!hasMultiVariants}
        onPress={onOpenVariants}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text variant="bodySmall" style={styles.unitText} numberOfLines={1}>{unitLabel}</Text>
        {hasMultiVariants && <Text style={styles.chevron}>▼</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', borderRadius: 12, backgroundColor: 'transparent', marginBottom: 10, padding: 4 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 130, borderRadius: 8, marginBottom: 8, backgroundColor: '#f0f0f0' },
  imageDimmed: { opacity: 0.45 },
  topBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#d32f2f', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  topBadgeMax: { backgroundColor: '#e65100' },
  topBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  discountBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#2e7d32', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  oosBadge: { position: 'absolute', right: 0, bottom: 0, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#f5f5f5', borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  oosText: { fontSize: 11, color: '#9e9e9e', fontWeight: '600' },
  fab: { position: 'absolute', right: 0, bottom: 0, width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2e7d32', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  fabInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#2e7d32', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  stepper: { position: 'absolute', right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e7d32', borderRadius: 8, elevation: 2 },
  stepBtn: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepBtnInner: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  stepBtnDisabled: { opacity: 0.3 },
  stepCount: { color: '#fff', fontSize: 13, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  name: { fontWeight: '700', marginTop: 0 },
  priceRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  price: { color: '#1b5e20', fontWeight: '700' },
  oldPrice: { color: '#9e9e9e', textDecorationLine: 'line-through' },
  unitTrigger: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'flex-start', paddingVertical: 4 },
  unitText: { color: '#444', fontWeight: '600', marginRight: 4 },
  chevron: { color: '#666', fontSize: 10 },
});