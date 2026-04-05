import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Surface, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import InputField from '../components/InputField';
import LoadingOverlay from '../components/loadingOverlay';
import { auth } from '../firebaseConfig';
import { sendOTP, updateAuthPhoneNumber } from '../services/authService';
import { Field, useProfileForm } from '../services/useProfileForm';
import { checkIfUserExists, updateUserProfile } from '../services/userService';
import { colors, globalStyles } from '../style';

interface Props { user: any; onComplete: () => void; }

type PhoneVerifyState = 'idle' | 'otp_sent' | 'verified';

export default function EditProfileScreen({ user, onComplete }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const originalPhone = user?.phoneNumber?.replace(/^\+91/, '') || '';
  const [phoneVerifyState, setPhoneVerifyState] = useState<PhoneVerifyState>('idle');
  const [verificationId, setVerificationId] = useState<string>('');
  const [otpValue, setOtpValue] = useState('');

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
    if (field === 'phone') {
      if (!trimmed) return t('phone_required');
      if (!/^[0-9]{10}$/.test(trimmed)) return t('invalid_phone');
    }
    return '';
  };

  const { values, errors, touched, handleChange, handleBlur, isFormValid, setValues } =
    useProfileForm({
      initialValues: { firstName: '', lastName: '', email: '', phone: '' },
      validate,
    });

  useEffect(() => {
    setValues({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: originalPhone,
    });
  }, [user]);

// ── Derived state ─────────────────────────────────────────────────────────
const phoneChanged = values.phone !== originalPhone;

const hasChanges = (): boolean => {
  return (
    values.firstName !== (user?.firstName || '') ||
    values.lastName  !== (user?.lastName  || '') ||
    values.email     !== (user?.email     || '') ||
    phoneChanged
  );
};

const isSaveEnabled = (): boolean => {
  if (!hasChanges()) return false;          // nothing changed → disabled
  if (!isFormValid()) return false;         // validation errors → disabled
  if (phoneChanged && phoneVerifyState !== 'verified') return false; // phone unverified → disabled
  return true;
};
  // ── Phone field change — reset OTP state on every edit ────────────────────
  const handlePhoneChange = (text: string) => {
    handleChange('phone', text.replace(/\D/g, ''));
    if (phoneVerifyState !== 'idle') {
      setPhoneVerifyState('idle');
      setVerificationId('');
      setOtpValue('');
    }
  };

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    Keyboard.dismiss();

    handleBlur('phone');
    if (validate('phone', values.phone)) return;

    if (!recaptchaVerifier.current) {
      Alert.alert(t('error'), t('recaptcha_not_ready'));
      return;
    }

    try {
      setOtpLoading(true);
      const formattedPhone = '+91' + values.phone;

      const exists = await checkIfUserExists('phoneNumber', formattedPhone, user.uid);
      if (exists) {
        Alert.alert(t('error'), t('phone_already_registered'));
        return;
      }

      const id = await sendOTP(values.phone, recaptchaVerifier.current);
      setVerificationId(id);
      setPhoneVerifyState('otp_sent');
      Alert.alert(t('success'), t('otp_sent'));
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('otp_failed'));
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.length < 6) {
      Alert.alert(t('error'), t('invalid_otp'));
      return;
    }

    try {
      setOtpLoading(true);
      await updateAuthPhoneNumber(verificationId, otpValue);
      setPhoneVerifyState('verified');
      setOtpValue('');
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('otp_invalid'));
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (loading) return;
    Keyboard.dismiss();

    Object.keys(values).forEach(f => handleBlur(f as Field));
    if (!isSaveEnabled()) return;

    try {
      setLoading(true);

      if (values.email && values.email !== user.email) {
        const exists = await checkIfUserExists('email', values.email, user.uid);
        if (exists) {
          Alert.alert(t('error'), t('email_already_exists'));
          return;
        }
      }

      const formattedPhone = '+91' + values.phone;
      await updateUserProfile(user.uid, { ...values, phoneNumber: formattedPhone });
      onComplete();
    } catch {
      Alert.alert(t('error'), t('something_went_wrong'));
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = () => router.back();

  return (
    <SafeAreaView style={globalStyles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={globalStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
      >
        <Surface style={globalStyles.card} elevation={3}>
          <Text variant="headlineMedium" style={globalStyles.title}>
            {t('edit_profile')}
          </Text>

          {/* ── Name ── */}
          <InputField
            label={`${t('first_name')} *`}
            value={values.firstName}
            error={errors.firstName}
            touched={touched.firstName}
            onChange={v => handleChange('firstName', v)}
            onBlur={() => handleBlur('firstName')}
          />
          <InputField
            label={`${t('last_name')} *`}
            value={values.lastName}
            error={errors.lastName}
            touched={touched.lastName}
            onChange={v => handleChange('lastName', v)}
            onBlur={() => handleBlur('lastName')}
          />

          {/* ── Phone row ── */}
          <View style={styles.phoneRow}>
            <View style={styles.phoneInput}>
              <InputField
                label={`${t('mobile')} *`}
                value={values.phone}
                error={errors.phone}
                touched={touched.phone}
                onChange={handlePhoneChange}
                onBlur={() => handleBlur('phone')}
                keyboardType="phone-pad"
                editable={phoneVerifyState !== 'verified'}
              />
            </View>

            {phoneChanged && phoneVerifyState !== 'verified' && (
              <Button
                mode="outlined"
                onPress={handleSendOtp}
                loading={otpLoading && phoneVerifyState === 'idle'}
                disabled={otpLoading || !!errors.phone || values.phone.length !== 10}
                style={styles.sendOtpBtn}
                labelStyle={styles.smallLabel}
                compact
              >
                {phoneVerifyState === 'otp_sent' ? t('resend') : t('send_otp')}
              </Button>
            )}

            {phoneVerifyState === 'verified' && (
              <Text style={styles.verifiedBadge}>✓ {t('verified')}</Text>
            )}
          </View>

          {/* ── OTP row ── */}
          {phoneVerifyState === 'otp_sent' && (
            <View style={styles.otpRow}>
              <View style={styles.otpInput}>
                <InputField
                  label={t('otp')}
                  value={otpValue}
                  error=""
                  touched={false}
                  onChange={v => setOtpValue(v.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => {}}
                  keyboardType="number-pad"
                />
              </View>
              <Button
                mode="contained"
                onPress={handleVerifyOtp}
                loading={otpLoading}
                disabled={otpLoading || otpValue.length < 6}
                style={styles.verifyBtn}
                labelStyle={styles.smallLabel}
                compact
              >
                {t('verify_login')}
              </Button>
            </View>
          )}

          {/* ── Email ── */}
          <InputField
            label={t('email')}
            value={values.email}
            error={errors.email}
            touched={touched.email}
            onChange={v => handleChange('email', v)}
            onBlur={() => handleBlur('email')}
          />

          {/* ── Action buttons ── */}
          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              disabled={loading}
              style={styles.actionBtn}
            >
              {t('cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={loading || !isSaveEnabled()}
              style={styles.actionBtn}
            >
              {t('save')}
            </Button>
          </View>
        </Surface>
      </KeyboardAwareScrollView>

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneInput: {
    flex: 1,
  },
  sendOtpBtn: {
    alignSelf: 'center',
    marginTop: 6,
  },
  smallLabel: {
    fontSize: 12,
  },
  verifiedBadge: {
    color: colors.success,
    fontWeight: '600',
    alignSelf: 'center',
    marginTop: 6,
    fontSize: 13,
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  otpInput: {
    flex: 1,
  },
  verifyBtn: {
    alignSelf: 'center',
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
  },
});