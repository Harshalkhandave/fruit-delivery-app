import React, { useEffect, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Surface, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import InputField from '../components/InputField';
import LoadingOverlay from '../components/loadingOverlay';
import { Field, useProfileForm } from '../services/useProfileForm';
import { checkIfUserExists, updateUserProfile } from '../services/userService';
import { globalStyles } from '../style/globalStyle';

interface Props { user: any; onComplete: () => void; }

export default function EditProfileScreen({ user, onComplete }: Props) {
  const [loading, setLoading] = useState(false);

  const validate = (field: Field, value: string) => {
    const trimmed = value.trim();
    const t = (key: string) => key;

    if ((field === 'firstName' || field === 'lastName')) {
      if (!trimmed) return t('name_required');
      if (!/^[A-Za-z\u0900-\u097F\s]+$/.test(trimmed)) return t('only_letters');
      if (trimmed.length < 2) return t('min_2_characters');
    }
    if (field === 'email') {
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return t('invalid_email');
    }
    if (field === 'phone') {
      if (!trimmed) return t('phone_required');
      if (!/^[0-9]{10}$/.test(trimmed)) return t('invalid_phone');
    }
    return '';
  };

  const { values, errors, touched, handleChange, handleBlur, isFormValid, setValues } = useProfileForm({
    initialValues: { firstName: '', lastName: '', email: '', phone: '' },
    validate,
  });

  useEffect(() => {
    setValues({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phoneNumber?.replace(/^\+91/, '') || '',
    });
  }, [user]);

  const handleSave = async () => {
    if (loading) return;
    Keyboard.dismiss();

    Object.keys(values).forEach(f => handleBlur(f as Field));
    if (!isFormValid()) return;

    try {
      setLoading(true);

      if (values.email && values.email !== user.email) {
        const exists = await checkIfUserExists('email', values.email, user.uid);
        if (exists) { Alert.alert('Error', 'Email already exists'); setLoading(false); return; }
      }

      const formattedPhone = '+91' + values.phone;
      if (values.phone !== user.phoneNumber?.replace(/^\+91/, '')) {
        const exists = await checkIfUserExists('phoneNumber', formattedPhone, user.uid);
        if (exists) { Alert.alert('Error', 'Phone already exists'); setLoading(false); return; }
      }

      await updateUserProfile(user.uid, { ...values, phoneNumber: formattedPhone });
      onComplete();
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
        <Surface style={globalStyles.card} elevation={3}>
          <Text variant="headlineMedium" style={globalStyles.title}>Edit Profile</Text>

          <InputField label="First Name *" value={values.firstName} error={errors.firstName} touched={touched.firstName} onChange={t => handleChange('firstName', t)} onBlur={() => handleBlur('firstName')} />
          <InputField label="Last Name *" value={values.lastName} error={errors.lastName} touched={touched.lastName} onChange={t => handleChange('lastName', t)} onBlur={() => handleBlur('lastName')} />
          <InputField label="Phone *" value={values.phone} error={errors.phone} touched={touched.phone} onChange={t => handleChange('phone', t.replace(/\D/g, ''))} onBlur={() => handleBlur('phone')} keyboardType="phone-pad" />
          <InputField label="Email" value={values.email} error={errors.email} touched={touched.email} onChange={t => handleChange('email', t)} onBlur={() => handleBlur('email')} />

          <Button mode="contained" onPress={handleSave} disabled={loading || !isFormValid()} style={{ marginTop: 10 }}>Save</Button>
        </Surface>
      </KeyboardAwareScrollView>

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}