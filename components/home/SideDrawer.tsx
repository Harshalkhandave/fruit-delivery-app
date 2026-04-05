import React from 'react';
import { Dimensions, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { Avatar, Divider, Drawer, IconButton, Text } from 'react-native-paper';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  firstInitial: string;
  currentLang: 'en' | 'mr';
  onEditProfile: () => void;
  onLanguage: () => void;
  onManageAddress: () => void;
  onMyOrders: () => void;
  onContactUs: () => void;
  onLogout: () => void;
  tr: (key: string, fallback: string) => string;
}

export function SideDrawer({
  visible, onClose, firstName, lastName, phoneNumber, firstInitial,
  currentLang, onEditProfile, onLanguage, onManageAddress,
  onMyOrders, onContactUs, onLogout, tr,
}: Props) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.userRow}>
            <Avatar.Text size={50} label={firstInitial} style={{ backgroundColor: '#2e7d32' }} labelStyle={{ fontWeight: 'bold' }} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                {`${firstName} ${lastName}`.trim()}
              </Text>
              <Text variant="bodySmall" style={{ color: 'gray' }}>
                +91 {phoneNumber?.slice(-10) || 'XXXXXXXXXX'}
              </Text>
            </View>
            <IconButton icon="close" size={24} onPress={onClose} />
          </View>
        </View>
        <Divider />
        <View style={{ flex: 1, marginTop: 10 }}>
          <Drawer.Item icon="account-edit" label={tr('edit_profile', 'Edit Profile')} onPress={onEditProfile} />
          <Drawer.Item icon="translate" label={`${tr('language', 'Language')} (${currentLang === 'en' ? 'English' : 'मराठी'})`} onPress={onLanguage} />
          <Drawer.Item icon="map-marker-radius" label={tr('manage_address', 'Manage Address')} onPress={onManageAddress} />
          <Drawer.Item icon="clipboard-list-outline" label={tr('my_orders', 'My Orders')} onPress={onMyOrders} />
          <Drawer.Item icon="phone-outline" label={tr('contact_us', 'Contact Us')} onPress={onContactUs} />
        </View>
        <View style={styles.bottom}>
          <Divider />
          <Drawer.Item icon="logout" label={tr('logout', 'Logout')} onPress={onLogout} style={{ marginTop: 10 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  container: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8, backgroundColor: 'white', elevation: 16, flexDirection: 'column' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 15 },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottom: { marginBottom: 20 },
});