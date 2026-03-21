import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Surface, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import AddressModal from '../components/addressModal';
import LoadingOverlay from '../components/loadingOverlay';
import { updateUserProfile } from '../services/userService';
import { globalStyles } from '../style/globalStyle';
import { onboardingStyles } from '../style/onboardingStyle';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
}

type Field = 'firstName' | 'lastName' | 'email';

type ErrorsType = Record<Field, string>;
type TouchedType = Record<Field, boolean>;

export default function OnboardingScreen({ user, onComplete }: OnboardingProps) {
  const { t } = useTranslation();

  // ===== STATE =====
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [savedAddress, setSavedAddress] = useState<any>(null);

  const [errors, setErrors] = useState<ErrorsType>({
    firstName: '',
    lastName: '',
    email: '',
  });

  const [touched, setTouched] = useState<TouchedType>({
    firstName: false,
    lastName: false,
    email: false,
  });

  const [loading, setLoading] = useState(false);

  // ===== REFS =====
  const lastNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);

  // ===== VALIDATION =====
  const validateName = (name: string) => {
    const trimmed = name.trim();
  
    if (!trimmed) return t('name_required');
  
    // ✅ supports English + Marathi (Devanagari)
    const regex = /^[A-Za-z\u0900-\u097F\s]+$/;
  
    if (!regex.test(trimmed)) return t('only_letters');
  
    if (trimmed.length < 2) return t('min_2_characters');
  
    return '';
  };

  const validateEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return t('invalid_email');
    return '';
  };

  const validateField = (field: Field, value: string) => {
    if (field === 'email') return validateEmail(value);
    return validateName(value);
  };

  const isFormValid = () => {
    return (
      !validateName(firstName) &&
      !validateName(lastName) &&
      !validateEmail(email)
    );
  };

  // ===== HANDLERS =====
  const handleChange = (field: Field, value: string) => {
    if (field === 'firstName') setFirstName(value);
    if (field === 'lastName') setLastName(value);
    if (field === 'email') setEmail(value);

    // Clear error while typing
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field: Field) => {
    const value =
      field === 'firstName' ? firstName :
      field === 'lastName' ? lastName :
      email;

    const error = validateField(field, value);

    setErrors(prev => ({ ...prev, [field]: error }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSaveProfile = async () => {
    if (loading) return;

    Keyboard.dismiss();

    const newErrors: ErrorsType = {
      firstName: validateName(firstName),
      lastName: validateName(lastName),
      email: validateEmail(email),
    };

    setErrors(newErrors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
    });

    if (Object.values(newErrors).some(e => e !== '')) return;

    if (!savedAddress) {
      Alert.alert(t('address_required_title'), t('address_required_msg'));
      return;
    }

    try {
      setLoading(true);

      await updateUserProfile(user.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        savedAddress,
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
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={globalStyles.card} elevation={3}>
          <Text variant="headlineMedium" style={globalStyles.title}>
            {t('complete_profile')}
          </Text>

          {/* First Name */}
          <TextInput
            label={`${t('first_name')} *`}
            value={firstName}
            onChangeText={t => handleChange('firstName', t)}
            onBlur={() => handleBlur('firstName')}
            mode="outlined"
            style={globalStyles.input}
            error={touched.firstName && !!errors.firstName}
          />
          {touched.firstName && !!errors.firstName && (
            <Text style={{ color: 'red' }}>{errors.firstName}</Text>
          )}

          {/* Last Name */}
          <TextInput
            ref={lastNameRef}
            label={`${t('last_name')} *`}
            value={lastName}
            onChangeText={t => handleChange('lastName', t)}
            onBlur={() => handleBlur('lastName')}
            mode="outlined"
            style={globalStyles.input}
            error={touched.lastName && !!errors.lastName}
          />
          {touched.lastName && !!errors.lastName && (
            <Text style={{ color: 'red' }}>{errors.lastName}</Text>
          )}

          {/* Phone */}
          <TextInput
            label={t('mobile')}
            value={user?.phoneNumber?.replace(/^\+91/, '') || ''}
            mode="outlined"
            disabled
            style={[globalStyles.input, onboardingStyles.disabledInput]}
          />

          {/* Email */}
          <TextInput
            ref={emailRef}
            label={t('email')}
            value={email}
            onChangeText={t => handleChange('email', t)}
            onBlur={() => handleBlur('email')}
            mode="outlined"
            style={globalStyles.input}
            error={touched.email && !!errors.email}
          />
          {touched.email && !!errors.email && (
            <Text style={{ color: 'red' }}>{errors.email}</Text>
          )}

          {/* Buttons */}
          <View style={onboardingStyles.rowButtons}>
            <Button
              mode={savedAddress ? "contained-tonal" : "outlined"}
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
        onSave={(data) => setSavedAddress(data)}
        initialData={{
          firstName,
          lastName,
          phone: user?.phoneNumber || '',
        }}
      />

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}