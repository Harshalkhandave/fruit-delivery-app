// services/authService.ts

import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// 📱 Send OTP
export const sendOTP = async (
  phone: string,
  recaptchaVerifier: any
): Promise<string> => {
  const phoneProvider = new PhoneAuthProvider(auth);

  const verificationId = await phoneProvider.verifyPhoneNumber(
    `+91${phone}`,
    recaptchaVerifier
  );

  return verificationId;
};

// 🔐 Verify OTP
export const verifyOTP = async (
  verificationId: string,
  otp: string
) => {
  const credential = PhoneAuthProvider.credential(
    verificationId,
    otp
  );

  return await signInWithCredential(auth, credential);
};