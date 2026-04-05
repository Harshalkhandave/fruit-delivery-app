import React from 'react';
import type { ViewStyle } from 'react-native';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { AnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

interface Props {
  cartCount: number;
  cartBarMsg: string | null;
  navigating: boolean;
  navigatingFromDrawer: boolean;
  bottom: number;
  animStyle: AnimatedStyle<ViewStyle>;
  cartBarBadgeRef: React.RefObject<View| null>;
  onMeasureBadge: () => void;
  onPress: () => void;
}

export function CartBar({
  cartCount,
  cartBarMsg,
  navigating,
  navigatingFromDrawer,
  bottom,
  animStyle,
  cartBarBadgeRef,
  onMeasureBadge,
  onPress,
}: Props) {
  const showSpinner = navigating && !navigatingFromDrawer;

  return (
    <Animated.View
      style={[styles.cartBar, { bottom }, animStyle]}
      pointerEvents={cartCount > 0 ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={styles.inner}
        onPress={onPress}
        activeOpacity={0.9}
        disabled={showSpinner}
      >
        <View style={styles.left}>
          {showSpinner ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <View
                ref={cartBarBadgeRef}
                collapsable={false}
                style={styles.badge}
                onLayout={onMeasureBadge}
              >
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
              <Text style={styles.itemsText}>
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </View>
        <Text style={styles.label}>{cartBarMsg ?? 'CART →'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cartBar: { position: 'absolute', left: 24, right: 24, height: 56, backgroundColor: '#2e7d32', borderRadius: 14, elevation: 8, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, overflow: 'hidden' },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemsText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  label: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});