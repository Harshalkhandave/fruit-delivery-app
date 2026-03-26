import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import * as Localization from 'expo-localization';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Button,
  Divider,
  Menu,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import LoadingOverlay from '../components/loadingOverlay';
import i18n from '../config/i18n';
import { auth } from '../firebaseConfig';
import { useAuth } from '../hooks/useAuth';
import { globalStyles } from '../style/globalStyle';

const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;
const OTP_TIMER = 60;
const SKIP_OTP = __DEV__;
// const SKIP_OTP = false;
interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const recaptchaVerifier = useRef<any>(null);
  const { sendOtp, verifyOtp } = useAuth();

  // 🌐 Language
  const deviceLocale = Localization.getLocales()[0]?.languageTag ?? 'en';
  const deviceLang: 'en' | 'mr' =
    ['en', 'mr'].includes(deviceLocale.split('-')[0])
      ? (deviceLocale.split('-')[0] as 'en' | 'mr')
      : 'en';

  const [language, setLanguage] = useState<'en' | 'mr'>(deviceLang);
  const [menuVisible, setMenuVisible] = useState(false);

  const changeLanguage = (lng: 'en' | 'mr') => {
    i18n.changeLanguage(lng);
    setLanguage(lng);
    setMenuVisible(false);
  };

  // ===== STATE =====
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [timer, setTimer] = useState(0);

  const isValidPhone = phone.length === PHONE_LENGTH;
  const isValidOtp = otp.length === OTP_LENGTH;

  // ===== TIMER =====
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // ===== INPUT HANDLERS =====
  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').trim();
    setPhone(cleaned);

    if (cleaned.length === PHONE_LENGTH) {
      Keyboard.dismiss();
    }
  };

  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setOtp(cleaned);

    if (cleaned.length === OTP_LENGTH) {
      Keyboard.dismiss();
    }
  };

  // ===== ACTIONS =====
  const handleSendOTP = async () => {
    if (loading || timer > 0) return;

    Keyboard.dismiss();

    if (!isValidPhone) {
      Alert.alert(t('error'), t('invalid_number'));
      return;
    }

    try {
      setLoading(true);
      if (SKIP_OTP) {
        // fake login user
        onLogin({
          uid: '6rHUoW1eSBYKJOJ05gRpoDBEtzz1',
          phoneNumber: '+919421266124',
        });
        return;
      }
      const vid = await sendOtp(phone, recaptchaVerifier.current);

      setVerificationId(vid);
      setStep(2);
      setTimer(OTP_TIMER);

      Alert.alert(t('success'), t('otp_sent'));

      if (__DEV__) console.log('OTP sent:', phone);
    } catch (err: any) {
      console.log('Send OTP Error:', err);
      Alert.alert(t('error'), t('something_went_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue?: string) => {
    if (loading) return;

    Keyboard.dismiss();

    const finalOtp = (otpValue ?? otp).trim();

    if (finalOtp.length !== OTP_LENGTH) {
      Alert.alert(t('error'), t('invalid_otp'));
      return;
    }

    try {
      setLoading(true);
      const user = await verifyOtp(verificationId, finalOtp);

      if (__DEV__) console.log('User verified:', user.uid);

      onLogin(user);
    } catch (err: any) {
      console.log('Verify OTP Error:', err);

      if (err.code === 'auth/invalid-verification-code') {
        Alert.alert(t('error'), t('otp_invalid'));
      } else {
        Alert.alert(t('error'), t('something_went_wrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep(1);
    setOtp('');
    setVerificationId('');
    setTimer(0);
  };

  // ===== UI =====
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 20,
          paddingTop: 60,
        }}
        enableOnAndroid
        extraScrollHeight={60}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={auth.app.options}
        />

        {/* 🌐 Language */}
        <View style={globalStyles.languageContainer}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setMenuVisible(true)}>
                {language === 'en' ? 'English' : 'मराठी'}
              </Button>
            }
          >
            <Menu.Item onPress={() => changeLanguage('en')} title="English" />
            <Divider />
            <Menu.Item onPress={() => changeLanguage('mr')} title="मराठी" />
          </Menu>
        </View>

        <Surface style={globalStyles.card} elevation={3}>
          <Text variant="headlineMedium" style={globalStyles.title}>
            {t('title')}
          </Text>

          <Text style={{ textAlign: 'center', marginBottom: 16 }}>
            {t('subtitle')}
          </Text>

          {/* PHONE INPUT */}
          <TextInput
            label={t('mobile')}
            value={phone}
            onChangeText={handlePhoneChange}
            left={<TextInput.Affix text="+91 " />}
            mode="outlined"
            keyboardType="phone-pad"
            maxLength={PHONE_LENGTH}
            disabled={step === 2 || loading}
            style={globalStyles.input}
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
          />

          {/* OTP INPUT */}
          {step === 2 && (
            <TextInput
              label={t('otp')}
              value={otp}
              onChangeText={handleOtpChange}
              mode="outlined"
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              secureTextEntry={!showOtp}
              style={globalStyles.input}
              returnKeyType="done"
              onSubmitEditing={() => handleVerifyOTP()}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              right={
                <TextInput.Icon
                  icon={showOtp ? 'eye-off' : 'eye'}
                  onPress={() => setShowOtp(!showOtp)}
                />
              }
            />
          )}

          {/* BUTTONS */}
          <View style={{ marginTop: 16 }}>
            <Button
              mode="contained"
              onPress={step === 1 ? handleSendOTP : () => handleVerifyOTP()}
              disabled={loading}
              style={globalStyles.button}
            >
              {step === 1 ? t('send_otp') : t('verify_login')}
            </Button>

            {step === 2 && !loading && (
              <View style={{ marginTop: 10 }}>
                <Button
                  onPress={handleSendOTP}
                  disabled={timer > 0}
                  mode="text"
                  style={{ marginBottom: 8 }}
                >
                  {timer > 0
                    ? t('resend_timer', { time: timer })
                    : t('resend')}
                </Button>

                <Button onPress={handleChangeNumber} mode="text">
                  {t('change_number')}
                </Button>
              </View>
            )}
          </View>
        </Surface>
      </KeyboardAwareScrollView>

      {/* FULL SCREEN LOADER */}
      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}