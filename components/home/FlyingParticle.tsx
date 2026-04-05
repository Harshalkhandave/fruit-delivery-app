import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const PARTICLE_DURATION = 700;

export interface ParticleData {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: '+1' | '-1';
}

interface Props {
  particle: ParticleData;
  onDone: (id: string) => void;
}

export function FlyingParticle({ particle, onDone }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: PARTICLE_DURATION }, finished => {
      if (finished) runOnJS(onDone)(particle.id);
    });
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const cpX = (particle.fromX + particle.toX) / 2;
    const cpY = Math.min(particle.fromY, particle.toY) - 60;
    const x = Math.pow(1-t,2)*particle.fromX + 2*(1-t)*t*cpX + Math.pow(t,2)*particle.toX;
    const y = Math.pow(1-t,2)*particle.fromY + 2*(1-t)*t*cpY + Math.pow(t,2)*particle.toY;
    const opacity = t < 0.6 ? 1 : 1-(t-0.6)/0.4;
    return { transform: [{ translateX: x }, { translateY: y }, { scale: 1 - t*0.6 }], opacity };
  });

  return (
    <Animated.View style={[styles.container, animStyle]} pointerEvents="none">
      <Text style={styles.text}>{particle.type}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, zIndex: 999 },
  text: { color: '#2e7d32', fontSize: 16, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});