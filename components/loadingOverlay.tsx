import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function LoadingOverlay() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', // dark transparent
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});