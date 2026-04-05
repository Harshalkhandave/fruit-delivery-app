import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import {
    ActivityIndicator,
    Appbar,
    Button,
    Card,
    Chip,
    Dialog,
    Divider,
    IconButton,
    Portal,
    RadioButton,
    Text,
} from 'react-native-paper';

import { useUser } from '../context/UserContext';
import { updateUserProfile } from '../services/userService';
import AddressModal from './addressModal';

const MAX_ADDRESSES = 3;

export default function ManageAddressScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, setUser } = useUser();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalIndex, setEditModalIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ visible: boolean; index: number | null }>({
    visible: false,
    index: null,
  });

  // Optimistic default address index — instant UI, background save
  const [localDefaultIndex, setLocalDefaultIndex] = useState<number>(
    typeof user?.defaultAddressIndex === 'number' ? user.defaultAddressIndex : 0
  );
  const defaultSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDefaultSave = useRef(false);
  const [defaultSaving, setDefaultSaving] = useState(false);

  const savedAddresses = useMemo(() => {
    if (Array.isArray(user?.savedAddresses) && user.savedAddresses.length > 0) {
      return user.savedAddresses;
    }
    if (user?.savedAddress) return [user.savedAddress];
    return [];
  }, [user]);

  const tr = useCallback((key: string, fallback: string) => t(key) || fallback, [t]);
  
  // Sync localDefaultIndex if user updates externally
  useEffect(() => {
    if (typeof user?.defaultAddressIndex === 'number') {
      setLocalDefaultIndex(user.defaultAddressIndex);
    }
  }, [user?.defaultAddressIndex]);

  // Flush pending default address save on unmount
  useEffect(() => {
    return () => {
      if (defaultSaveTimer.current) clearTimeout(defaultSaveTimer.current);
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const setDefaultAddress = useCallback(
    (index: number) => {
      setLocalDefaultIndex(index); // instant UI
      setUser({ ...user, defaultAddressIndex: index });

      if (defaultSaveTimer.current) clearTimeout(defaultSaveTimer.current);
      pendingDefaultSave.current = true;
      setDefaultSaving(true);

      defaultSaveTimer.current = setTimeout(async () => {
        try {
          await updateUserProfile(user.uid, { defaultAddressIndex: index });
        } catch {
          // silently fail — user context already updated; show toast if needed
        } finally {
          pendingDefaultSave.current = false;
          setDefaultSaving(false);
        }
      }, 600); // debounce: only one Firestore write if tapping fast
    },
    [user, setUser]
  );

  const handleSaveAddress = useCallback(
    async (addressData: any) => {
      try {
        setSaving(true);
        const updatedAddresses = [...savedAddresses, addressData];
        await updateUserProfile(user.uid, {
          savedAddresses: updatedAddresses,
          savedAddress: updatedAddresses[0],
        });
        setUser({ ...user, savedAddresses: updatedAddresses, savedAddress: updatedAddresses[0] });
        setAddModalVisible(false);
      } catch {
        // surface error via snackbar or alert
      } finally {
        setSaving(false);
      }
    },
    [savedAddresses, user, setUser]
  );

  const handleEditAddress = useCallback(
    async (addressData: any) => {
      if (editModalIndex === null) return;
      try {
        setSaving(true);
        const updatedAddresses = savedAddresses.map((a: any, i: number) =>
          i === editModalIndex ? addressData : a
        );
        await updateUserProfile(user.uid, {
          savedAddresses: updatedAddresses,
          savedAddress: updatedAddresses[0],
        });
        setUser({ ...user, savedAddresses: updatedAddresses, savedAddress: updatedAddresses[0] });
        setEditModalIndex(null);
      } catch {
        // surface error
      } finally {
        setSaving(false);
      }
    },
    [editModalIndex, savedAddresses, user, setUser]
  );

  const confirmDelete = useCallback((index: number) => {
    setDeleteDialog({ visible: true, index });
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    const index = deleteDialog.index;
    if (index === null) return;
    setDeleteDialog({ visible: false, index: null });
    try {
      setSaving(true);
      const updatedAddresses = savedAddresses.filter((_: unknown, i: number) => i !== index);
      const nextDefault =
        updatedAddresses.length === 0
          ? 0
          : Math.max(0, Math.min(localDefaultIndex, updatedAddresses.length - 1));
      await updateUserProfile(user.uid, {
        savedAddresses: updatedAddresses,
        savedAddress: updatedAddresses[0] ?? null,
        defaultAddressIndex: nextDefault,
      });
      setLocalDefaultIndex(nextDefault);
      setUser({
        ...user,
        savedAddresses: updatedAddresses,
        savedAddress: updatedAddresses[0] ?? null,
        defaultAddressIndex: nextDefault,
      });
    } catch {
      // surface error
    } finally {
      setSaving(false);
    }
  }, [deleteDialog, savedAddresses, localDefaultIndex, user, setUser]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  const editingAddress =
    editModalIndex !== null ? savedAddresses[editModalIndex] : null;

  return (
    <>
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={tr('manage_address', 'Manage Address')}
          titleStyle={styles.appBarTitle}
        />
        {defaultSaving && (
          <ActivityIndicator size="small" style={styles.savingIndicator} />
        )}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {savedAddresses.length > 0 ? (
          savedAddresses.map((address: any, index: number) => (
            <Card
              key={`${address.receiverPhone}-${index}`}
              style={[
                styles.addressCard,
                index === localDefaultIndex && styles.addressCardDefault,
              ]}
              mode="outlined"
            >
              <Card.Content>
                <View style={styles.addressRow}>
                  {/* Radio: tap entire left area for default */}
                  <RadioButton
                    value={String(index)}
                    status={localDefaultIndex === index ? 'checked' : 'unchecked'}
                    onPress={() => setDefaultAddress(index)}
                  />

                  <View style={styles.addressInfo}>
                    <View style={styles.nameRow}>
                      <Text variant="titleSmall" style={styles.receiverName}>
                        {address.receiverName}
                      </Text>
                      {index === localDefaultIndex && (
                        <Chip compact style={styles.defaultChip} textStyle={styles.defaultChipText}>
                          {tr('default', 'Default')}
                        </Chip>
                      )}
                    </View>

                    <Text variant="bodySmall" style={styles.receiverPhone}>
                      +91 {address.receiverPhone}
                    </Text>
                    <Text variant="bodySmall" style={styles.addressLine}>
                      {address.line1}, {address.line2}
                    </Text>
                    {address.nearby ? (
                      <Text variant="bodySmall" style={styles.addressLine}>
                        {tr('nearby', 'Near')}: {address.nearby}
                      </Text>
                    ) : null}
                    <Text variant="bodySmall" style={styles.addressLine}>
                      {address.city}, {address.state}
                    </Text>

                    {/* Pinned location — tappable to open Maps */}
                    {address.coords ? (
                      <Button
                        icon="map-marker"
                        mode="text"
                        compact
                        textColor="#2e7d32"
                        style={styles.pinnedBtn}
                        onPress={() => {
                          const { latitude, longitude } = address.coords;
                          Linking.openURL(
                            `https://www.google.com/maps?q=${latitude},${longitude}`
                          );
                        }}
                      >
                        {tr('location_pinned', 'View pinned location')}
                      </Button>
                    ) : null}
                  </View>

                  {/* Edit + Delete */}
                  <View style={styles.addressActions}>
                    <IconButton
                      icon="pencil-outline"
                      size={18}
                      onPress={() => setEditModalIndex(index)}
                    />
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      iconColor="#d32f2f"
                      onPress={() => confirmDelete(index)}
                    />
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {tr('no_address_saved', 'No address saved yet')}
            </Text>
          </View>
        )}

        <Divider style={styles.divider} />

        {savedAddresses.length >= MAX_ADDRESSES && (
        <Text variant="bodySmall" style={styles.limitText}>
            {tr('max_address_limit', `You can save up to ${MAX_ADDRESSES} addresses only.`)}
        </Text>
        )}

        <Button
        mode="contained"
        icon="plus"
        onPress={() => setAddModalVisible(true)}
        loading={saving}
        disabled={saving || savedAddresses.length >= MAX_ADDRESSES}
        style={styles.addBtn}
        >
        {tr('add_address', 'Add Address')}
        </Button>
      </ScrollView>

      {/* ── Delete Confirmation Dialog (matches Paper UI) ── */}
      <Portal>
        <Dialog
          visible={deleteDialog.visible}
          onDismiss={() => setDeleteDialog({ visible: false, index: null })}
          style={styles.dialog}
        >
          <Dialog.Icon icon="alert-circle-outline" color="#d32f2f" />
          <Dialog.Title style={styles.dialogTitle}>
            {tr('delete_address', 'Delete Address')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogContent}>
              {tr(
                'delete_address_confirm',
                'Are you sure you want to remove this address? This action cannot be undone.'
              )}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialog({ visible: false, index: null })}>
              {tr('cancel', 'Cancel')}
            </Button>
            <Button textColor="#d32f2f" onPress={handleDeleteConfirmed}>
              {tr('delete', 'Delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── Add Address Modal ── */}
      <AddressModal
        visible={addModalVisible}
        onDismiss={() => setAddModalVisible(false)}
        onSave={handleSaveAddress}
        initialData={{
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          phone: user?.phoneNumber || '',
        }}
      />

      {/* ── Edit Address Modal ── */}
      {editingAddress && (
        <AddressModal
          visible={editModalIndex !== null}
          onDismiss={() => setEditModalIndex(null)}
          onSave={handleEditAddress}
          initialData={{
            firstName: editingAddress.receiverName?.split(' ')[0] || '',
            lastName: editingAddress.receiverName?.split(' ').slice(1).join(' ') || '',
            phone: editingAddress.receiverPhone || '',
          }}
          prefillAddress={editingAddress}   // 👈 new prop — see AddressModal changes below
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  appBar: { backgroundColor: '#fff', elevation: 2 },
  appBarTitle: { fontWeight: 'bold' },
  savingIndicator: { marginRight: 12 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 },
  divider: { marginTop: 12 },
  addressCard: { marginBottom: 10, borderRadius: 12 },
  addressCardDefault: { borderColor: '#4caf50', borderWidth: 1.5 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  addressInfo: { flex: 1, gap: 2, paddingVertical: 2 },
  receiverName: { fontWeight: 'bold' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' },
  defaultChip: { backgroundColor: '#e8f5e9' },
  defaultChipText: { color: '#2e7d32', fontSize: 11 },
  receiverPhone: { color: '#555', marginBottom: 4 },
  addressLine: { color: '#444', lineHeight: 20 },
  pinnedBtn: { alignSelf: 'flex-start', marginTop: 2, marginLeft: -8 },
  addressActions: { alignItems: 'center', justifyContent: 'flex-start' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#888' },
  addBtn: { marginTop: 16, borderRadius: 8 },
  dialog: { borderRadius: 16 },
  dialogTitle: { textAlign: 'center' },
  dialogContent: { textAlign: 'center', color: '#555' },
  limitText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 12,
    fontSize: 12,
  },
});