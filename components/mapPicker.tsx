import * as Location from 'expo-location';
import { isPointInPolygon } from 'geolib';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import MapView, { Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { NEPTI_BOUNDARY } from '../constants/deliveryZone';

// 📍 Your requested default coordinates
const DEFAULT_LOC = {
  latitude: 19.0961,
  longitude: 74.7196,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function NeptiMapPicker({ visible, onLocationSelected, onCancel }: any) {
  const { t } = useTranslation();
  const [region, setRegion] = useState(DEFAULT_LOC);
  const [isInside, setIsInside] = useState(true);

  // 1. Initial Permission & Location Check
  useEffect(() => {
    if (visible) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const userCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          // Only snap to user if they are inside Nepti, else stay at DEFAULT_LOC
          if (isPointInPolygon(userCoords, NEPTI_BOUNDARY)) {
            setRegion({ ...DEFAULT_LOC, ...userCoords });
          }
        }
      })();
    }
  }, [visible]);

  // 2. Handle map movement
  const handleRegionChange = (newRegion: any) => {
    setRegion(newRegion);
    // Real-time check if the center of the map is inside our service boundary
    setIsInside(isPointInPolygon({ 
      latitude: newRegion.latitude, 
      longitude: newRegion.longitude 
    }, NEPTI_BOUNDARY));
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.fullScreen}>
        <View style={{ flex: 1 }}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            mapType="hybrid"
            initialRegion={region}
            onRegionChangeComplete={handleRegionChange}
          >
            <Polygon
              coordinates={NEPTI_BOUNDARY}
              fillColor="rgba(46, 125, 50, 0.2)"
              strokeColor="#2e7d32"
              strokeWidth={2}
            />
          </MapView>

          {/* 🎯 FIXED CENTER PIN ICON */}
          <View style={styles.markerFixed} pointerEvents="none">
             <IconButton icon="map-marker" size={40} iconColor={isInside ? "#2e7d32" : "red"} />
          </View>

          {/* TOP BAR / BACK BUTTON */}
          <View style={styles.topBar}>
            <IconButton icon="close" containerColor="white" onPress={onCancel} />
            <Text variant="titleMedium" style={styles.statusText}>
              {isInside ? t('drag_to_pin') : t('outside_area')}
            </Text>
          </View>

          {/* BOTTOM ACTIONS */}
          <View style={styles.footer}>
            <Text style={styles.coordsText}>
                {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
            </Text>
            <Button 
              mode="contained" 
              disabled={!isInside}
              style={{ backgroundColor: isInside ? '#2e7d32' : '#ccc' }}
              onPress={() => onLocationSelected({ 
                latitude: region.latitude, 
                longitude: region.longitude 
              })}
            >
              {t('confirm_location')}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: 'white', margin: 0 },
  map: { flex: 1 },
  markerFixed: {
    left: '50%',
    marginLeft: -24, // Half of icon width
    marginTop: -48, // Offset to align point of marker to center
    position: 'absolute',
    top: '50%',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    elevation: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 10,
  },
  coordsText: { textAlign: 'center', color: '#666', marginBottom: 10, fontSize: 12 },
});