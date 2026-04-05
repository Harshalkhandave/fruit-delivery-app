import React from 'react';
import { Animated as RNAnimated, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  height: RNAnimated.Value;
  color: string;
  message: string;
}

export function NetworkBanner({ height, color, message }: Props) {
  return (
    <RNAnimated.View style={[styles.banner, { height, backgroundColor: color }]}>
      <Text style={styles.text}>{message}</Text>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
});