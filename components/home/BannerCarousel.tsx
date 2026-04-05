import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { BannerItem } from '../../services/homeService';

const { width } = Dimensions.get('window');
const bannerWidth = width - 32;

interface Props {
  banners: BannerItem[];
  activeBannerIndex: number;
  onIndexChange: (index: number) => void;
  listRef: React.RefObject<FlatList<BannerItem>| null>;
}

export function BannerCarousel({ banners, activeBannerIndex, onIndexChange, listRef }: Props) {
  return (
    <>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <ExpoImage source={item.imageUrl} style={styles.image} contentFit="cover" transition={180} cachePolicy="memory-disk" />
            <View style={styles.overlay}>
              <Text variant="titleLarge" style={styles.title}>{item.title}</Text>
              {item.subtitle ? <Text variant="bodyMedium" style={styles.subtitle}>{item.subtitle}</Text> : null}
            </View>
          </View>
        )}
        horizontal pagingEnabled
        onMomentumScrollEnd={event => {
          const idx = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
          if (idx >= 0 && idx < banners.length) onIndexChange(idx);
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 6 }}
        getItemLayout={(_, index) => ({ length: bannerWidth, offset: bannerWidth * index, index })}
      />
      {banners.length > 1 && (
        <View style={styles.dotsRow}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === activeBannerIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </>
  );
}

export function BannerSkeleton() {
  return <View style={styles.skeleton} />;
}

const styles = StyleSheet.create({
  card: { width: bannerWidth, height: 160, borderRadius: 14, overflow: 'hidden', marginRight: 12, backgroundColor: '#ddd' },
  image: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'rgba(0,0,0,0.35)' },
  title: { color: '#fff', fontWeight: '700' },
  subtitle: { color: '#f0f0f0' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cfd8dc', marginHorizontal: 4 },
  dotActive: { width: 20, borderRadius: 8, backgroundColor: '#2e7d32' },
  skeleton: { width: bannerWidth, height: 160, borderRadius: 14, backgroundColor: '#e7e7e7' },
});