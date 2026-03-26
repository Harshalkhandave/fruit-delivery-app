import { useRouter } from 'expo-router';
import { ShoppingBasket } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Appbar, Avatar, Divider, Drawer, IconButton, Text } from 'react-native-paper';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

interface HomeProps {
  onLogout: () => void;
}

export default function FruitHome({ onLogout }: HomeProps) {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const toggleDrawer = () => setDrawerVisible(!drawerVisible);

  // Get first character of First Name safely
  const firstInitial = (user?.firstName?.charAt(0)?.toUpperCase() || 'U').toString();

  // Safe translation helper with fallback
  const tr = (key: string, fallback: string) => t(key) || fallback;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <Appbar.Header style={{ backgroundColor: '#fff', elevation: 2 }}>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content
          title={tr('market_yard_door', 'Market Yard Door')}
          titleStyle={{ fontWeight: 'bold' }}
        />
        <Appbar.Action
          icon={() => <ShoppingBasket size={24} color="black" />}
          onPress={() => {}}
        />
      </Appbar.Header>

      {/* TODO: FlatList / main content goes here */}

      {/* SIDEBAR MENU */}
      {drawerVisible && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableWithoutFeedback onPress={toggleDrawer}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.drawerContainer}>
            {/* TOP SECTION: Profile + Close Button */}
            <View style={styles.drawerHeader}>
              <View style={styles.userInfoSection}>
                <Avatar.Text
                  size={50}
                  label={firstInitial}
                  style={{ backgroundColor: '#2e7d32' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                  </Text>
                  <Text variant="bodySmall" style={{ color: 'gray' }}>
                    +91 {user?.phoneNumber?.slice(-10) || 'XXXXXXXXXX'}
                  </Text>
                </View>
                <IconButton icon="close" size={24} onPress={toggleDrawer} />
              </View>
            </View>

            <Divider />

            {/* NAVIGATION ITEMS */}
            <View style={{ flex: 1, marginTop: 10 }}>
              <Drawer.Item
                icon="account-edit"
                label={tr('edit_profile', 'Edit Profile')}
                onPress={() => {
                  toggleDrawer();
                  router.push('/EditProfile');
                }}
              />
              <Drawer.Item
                icon="translate"
                label={tr('language', 'Language')}
                onPress={() => {
                  toggleDrawer();
                }}
              />
              <Drawer.Item
                icon="map-marker-radius"
                label={tr('manage_address', 'Manage Address')}
                onPress={() => {
                  toggleDrawer();
                  // router.push('/ManageAddress'); // Uncomment if route exists
                }}
              />
            </View>

            {/* LOGOUT */}
            <View style={styles.drawerBottom}>
              <Divider />
              <Drawer.Item
                icon="logout"
                label={tr('logout', 'Logout')}
                onPress={() => {
                  toggleDrawer();
                  onLogout();
                }}
                style={styles.logoutItem}
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: 'white',
    elevation: 16,
    flexDirection: 'column',
  },
  drawerHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerBottom: {
    marginBottom: 20,
  },
  logoutItem: {
    marginTop: 10,
  },
});