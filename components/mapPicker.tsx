import * as Location from 'expo-location';
import { isPointInPolygon } from 'geolib';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import MapView, { Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { Button, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { NEPTI_BOUNDARY } from '../constants/deliveryZone';
import { addressStyles } from '../style/addressStyle';

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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const bounds = useMemo(() => {
    let minLat = NEPTI_BOUNDARY[0].latitude;
    let maxLat = NEPTI_BOUNDARY[0].latitude;
    let minLng = NEPTI_BOUNDARY[0].longitude;
    let maxLng = NEPTI_BOUNDARY[0].longitude;

    NEPTI_BOUNDARY.forEach(p => {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
    });

    return { minLat, maxLat, minLng, maxLng };
  }, []);

  const getBoundaryRegion = () => ({
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLng + bounds.maxLng) / 2,
    latitudeDelta: (bounds.maxLat - bounds.minLat) * 1.5,
    longitudeDelta: (bounds.maxLng - bounds.minLng) * 1.5,
  });

  const getClampedRegion = (newRegion: any) => {
    const LAT_MARGIN = 0.002;
    const LNG_MARGIN = 0.002;

    return {
      ...newRegion,
      latitude: Math.min(
        Math.max(newRegion.latitude, bounds.minLat - LAT_MARGIN),
        bounds.maxLat + LAT_MARGIN
      ),
      longitude: Math.min(
        Math.max(newRegion.longitude, bounds.minLng - LNG_MARGIN),
        bounds.maxLng + LNG_MARGIN
      ),
    };
  };

  useEffect(() => {
    if (visible) {
      setRegion(DEFAULT_LOC);

      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          setLocationPermissionStatus(status === 'granted' ? 'granted' : 'denied');

          if (status !== 'granted') return;

          const loc = await Location.getCurrentPositionAsync({});
          const userCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          setUserLocation(userCoords);

          if (isPointInPolygon(userCoords, NEPTI_BOUNDARY)) {
            setRegion({ ...userCoords, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            setIsInside(true);
          } else {
            setRegion(getBoundaryRegion());
            setIsInside(false);
          }
        } catch (e) {
          console.log('Location error ignored:', e);
        }
      })();
    }
  }, [visible]);

  const handleRegionChange = (newRegion: any) => {
    const clamped = getClampedRegion(newRegion);
    setRegion(clamped);

    const inside = isPointInPolygon(
      { latitude: clamped.latitude, longitude: clamped.longitude },
      NEPTI_BOUNDARY
    );
    setIsInside(inside);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status === 'granted' ? 'granted' : 'denied');

      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      const userCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(userCoords);

      setRegion({ ...userCoords, latitudeDelta: 0.005, longitudeDelta: 0.005 });
      setIsInside(isPointInPolygon(userCoords, NEPTI_BOUNDARY));
    } catch (e) {
      console.log('Error fetching location', e);
    }
  };

  const isUseCurrentLocationDisabled = () => {
    if (!userLocation) return false; // Initially enabled
    if (!isPointInPolygon(userLocation, NEPTI_BOUNDARY)) return true; // outside serviceable
    if (region.latitude === userLocation.latitude && region.longitude === userLocation.longitude && isInside)
      return true; // pin at user location inside
    return false;
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={addressStyles.fullScreen}>
        <View style={{ flex: 1 }}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={addressStyles.map}
            mapType="hybrid"
            region={region}
            onRegionChangeComplete={handleRegionChange}
            minZoomLevel={14}
            maxZoomLevel={20}
          >
            {!isInside && (
              <Polygon
                coordinates={[
                  { latitude: bounds.minLat - 1, longitude: bounds.minLng - 1 },
                  { latitude: bounds.minLat - 1, longitude: bounds.maxLng + 1 },
                  { latitude: bounds.maxLat + 1, longitude: bounds.maxLng + 1 },
                  { latitude: bounds.maxLat + 1, longitude: bounds.minLng - 1 },
                ]}
                holes={[NEPTI_BOUNDARY]}
                fillColor="rgba(255,0,0,0.2)"
              />
            )}
            <Polygon
              coordinates={NEPTI_BOUNDARY}
              fillColor="rgba(46, 125, 50, 0.3)"
              strokeColor="#2e7d32"
              strokeWidth={2}
            />
          </MapView>

          <View style={addressStyles.markerFixed} pointerEvents="none">
            <IconButton icon="map-marker" size={40} iconColor={isInside ? '#2e7d32' : 'red'} />
          </View>

          <View style={addressStyles.topBar}>
            <IconButton icon="close" containerColor="white" onPress={onCancel} />
            <Text variant="titleMedium" style={addressStyles.statusText}>
              {isInside ? t('drag_to_pin') : t('outside_area')}
            </Text>
          </View>

          <View style={addressStyles.footer}>
            <Text style={{ textAlign: 'center', marginBottom: 10 }}>
              {isInside
                ? t('delivery_available')
                : t('delivery_unavailable')}
            </Text>

            <Button
              mode="outlined"
              style={{ marginBottom: 10 }}
              disabled={isUseCurrentLocationDisabled()}
              onPress={handleUseCurrentLocation}
            >
              {t('use_current_location')}
            </Button>

            <Button
              mode="contained"
              disabled={!isInside}
              style={{ backgroundColor: isInside ? '#2e7d32' : '#ccc' }}
              onPress={() =>
                onLocationSelected({
                  latitude: region.latitude,
                  longitude: region.longitude,
                })
              }
            >
              {t('confirm_location')}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}