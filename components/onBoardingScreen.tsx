import React, { useState } from 'react';
import { Alert, Keyboard, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Surface, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import AddressModal from '../components/addressModal';
import InputField from '../components/InputField';
import LoadingOverlay from '../components/loadingOverlay';
import { Field, useProfileForm } from '../services/useProfileForm';
import { updateUserProfile } from '../services/userService';
import { globalStyles } from '../style/globalStyle';
import { onboardingStyles } from '../style/onboardingStyle';

interface Props {
  user: any;
  onComplete: () => void;
}

export default function OnboardingScreen({ user, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [savedAddress, setSavedAddress] = useState<any>(null);

  // ===== VALIDATION FUNCTION =====
  const validate = (field: Field, value: string) => {
    const trimmed = value.trim();
    const t = (key: string) => key; // replace with your translation function

    if ((field === 'firstName' || field === 'lastName')) {
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

  const handleSaveProfile = async () => {
    if (loading) return;

    Keyboard.dismiss();
    // mark all touched
    Object.keys(values).forEach(f => handleBlur(f as Field));

    if (!isFormValid()) return;

    try {
      setLoading(true);
      await updateUserProfile(user.uid, {
        ...values,
        savedAddress: savedAddress || null,
        isProfileComplete: true,
      });
      onComplete();
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
        <Surface style={globalStyles.card} elevation={3}>
          <Text variant="headlineMedium" style={globalStyles.title}>Complete Profile</Text>

          <InputField
            label="First Name *"
            value={values.firstName}
            error={errors.firstName}
            touched={touched.firstName}
            onChange={text => handleChange('firstName', text)}
            onBlur={() => handleBlur('firstName')}
          />

          <InputField
            label="Last Name *"
            value={values.lastName}
            error={errors.lastName}
            touched={touched.lastName}
            onChange={text => handleChange('lastName', text)}
            onBlur={() => handleBlur('lastName')}
          />

          <InputField
            label="Email"
            value={values.email}
            error={errors.email}
            touched={touched.email}
            onChange={text => handleChange('email', text)}
            onBlur={() => handleBlur('email')}
          />

          <View style={onboardingStyles.rowButtons}>
            <Button
              mode={savedAddress ? "contained-tonal" : "outlined"}
              onPress={() => setAddressModalVisible(true)}
              disabled={!isFormValid()}
              style={[onboardingStyles.halfButton, onboardingStyles.spacingRight]}
            >
              {savedAddress ? 'Address Added' : 'Add Address'}
            </Button>

            <Button mode="contained" onPress={handleSaveProfile} disabled={loading || !isFormValid()} style={onboardingStyles.halfButton}>
              Save
            </Button>
          </View>
        </Surface>
      </KeyboardAwareScrollView>

      <AddressModal visible={addressModalVisible} onDismiss={() => setAddressModalVisible(false)} onSave={setSavedAddress} initialData={{ firstName: values.firstName, lastName: values.lastName, phone: user?.phoneNumber || '' }} />
      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}