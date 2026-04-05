import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Surface, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import AddressModal from '../components/addressModal';
import InputField from '../components/InputField';
import LoadingOverlay from '../components/loadingOverlay';
import { Field, useProfileForm } from '../services/useProfileForm';
import { updateUserProfile } from '../services/userService';
import { globalStyles, onboardingStyles } from '../style';

interface Props {
  user: any;
  onComplete: () => void;
}

export default function OnboardingScreen({ user, onComplete }: Props) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [savedAddress, setSavedAddress] = useState<any>(null);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (field: Field, value: string) => {
    const trimmed = value.trim();

    if (field === 'firstName' || field === 'lastName') {
      if (!trimmed) return t('name_required');
      if (!/^[A-Za-z\u0900-\u097F\s]+$/.test(trimmed)) return t('only_letters');
      if (trimmed.length < 2) return t('min_2_characters');
    }
    if (field === 'email') {
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return t('invalid_email');
    }
    return '';
  };

  const { values, errors, touched, handleChange, handleBlur, isFormValid } = useProfileForm({
    initialValues: { firstName: '', lastName: '', email: '' },
    validate,
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (loading) return;

    Keyboard.dismiss();
    Object.keys(values).forEach(f => handleBlur(f as Field));

    if (!isFormValid()) return;

    if (!savedAddress) {
      Alert.alert(t('address_required_title'), t('address_required_msg'));
      return;
    }

    try {
      setLoading(true);
      await updateUserProfile(user.uid, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        savedAddress,
        savedAddresses: [savedAddress],
        isProfileComplete: true,
      });
      onComplete();
    } catch {
      Alert.alert(t('error'), t('something_went_wrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={globalStyles.scrollContent}
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={globalStyles.card} elevation={3}>
          <Text variant="headlineMedium" style={globalStyles.title}>
            {t('complete_profile')}
          </Text>

          {/* First Name */}
          <InputField
            label={`${t('first_name')} *`}
            value={values.firstName}
            error={errors.firstName}
            touched={touched.firstName}
            onChange={text => handleChange('firstName', text)}
            onBlur={() => handleBlur('firstName')}
          />

          {/* Last Name */}
          <InputField
            label={`${t('last_name')} *`}
            value={values.lastName}
            error={errors.lastName}
            touched={touched.lastName}
            onChange={text => handleChange('lastName', text)}
            onBlur={() => handleBlur('lastName')}
          />

          {/* Phone — read only, same as old version */}
          <TextInput
            label={t('mobile')}
            value={user?.phoneNumber?.replace(/^\+91/, '') || ''}
            mode="flat"
            disabled
            style={[globalStyles.input, onboardingStyles.disabledInput]}
          />

          {/* Email */}
          <InputField
            label={t('email')}
            value={values.email}
            error={errors.email}
            touched={touched.email}
            onChange={text => handleChange('email', text)}
            onBlur={() => handleBlur('email')}
          />

          {/* Buttons */}
          <View style={onboardingStyles.rowButtons}>
            <Button
              mode={savedAddress ? 'contained-tonal' : 'outlined'}
              onPress={() => setAddressModalVisible(true)}
              disabled={!isFormValid()}
              style={[onboardingStyles.halfButton, onboardingStyles.spacingRight]}
            >
              {savedAddress ? t('address_added') : t('add_address')}
            </Button>

            <Button
              mode="contained"
              onPress={handleSaveProfile}
              disabled={loading || !isFormValid()}
              style={onboardingStyles.halfButton}
            >
              {t('save')}
            </Button>
          </View>
        </Surface>
      </KeyboardAwareScrollView>

      <AddressModal
        visible={addressModalVisible}
        onDismiss={() => setAddressModalVisible(false)}
        onSave={setSavedAddress}
        initialData={{
          firstName: values.firstName,
          lastName: values.lastName,
          phone: user?.phoneNumber || '',
        }}
      />

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}