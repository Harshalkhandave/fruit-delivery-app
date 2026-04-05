import React from 'react';
import { StyleSheet, View } from 'react-native';

export function ProductSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.image} />
      <View style={styles.name} />
      <View style={styles.price} />
      <View style={styles.unit} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', borderRadius: 12, backgroundColor: 'transparent', marginBottom: 10, padding: 4 },
  image: { width: '100%', height: 130, borderRadius: 8, marginBottom: 8, backgroundColor: '#e7e7e7' },
  name: { width: '70%', height: 16, borderRadius: 6, backgroundColor: '#ededed', marginBottom: 8 },
  price: { width: '55%', height: 16, borderRadius: 6, backgroundColor: '#ededed', marginBottom: 8 },
  unit: { width: '45%', height: 12, borderRadius: 6, backgroundColor: '#efefef' },
});