import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { sendOTP, verifyOTP } from '../services/authService';

export const useAuth = () => {

  const sendOtp = async (phone: string, recaptcha: any) => {
    const verificationId = await sendOTP(phone, recaptcha);
    return verificationId;
  };

  const verifyOtp = async (verificationId: string, otp: string) => {
    const userCredential = await verifyOTP(verificationId, otp);
    const user = userCredential.user;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        phoneNumber: user.phoneNumber,
        role: 'customer',
        createdAt: serverTimestamp(),
        isProfileComplete: false,
      });
    }

    return user;
  };

  return {
    sendOtp,
    verifyOtp,
  };
};