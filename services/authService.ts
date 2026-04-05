// services/authService.ts

import {
  PhoneAuthProvider,
  signInWithCredential,
  updatePhoneNumber,
} from 'firebase/auth';
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

export const updateAuthPhoneNumber = async (
  verificationId: string,
  otp: string
) => {
  const credential = PhoneAuthProvider.credential(verificationId, otp);
  // Updates the phone number on the currently signed-in Firebase Auth user
  await updatePhoneNumber(auth.currentUser!, credential);
};