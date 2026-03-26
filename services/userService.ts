import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// 1. Address Structure
export interface AddressData {
  receiverName: string;
  receiverPhone: string;
  line1: string;
  line2: string;
  nearby?: string;
  city: string;
  state: string;
}

// 2. Profile Data Interface ✅ FIXED
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string; // ✅ ADDED (IMPORTANT FIX)
  isProfileComplete?: boolean;
  savedAddress?: AddressData;
  updatedAt?: any;
}

/**
 * Update user profile
 */
export const updateUserProfile = async (
  uid: string,
  data: UpdateProfileData
) => {
  if (!uid) throw new Error('User ID is required');

  const userRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Check if email/phone already exists (excluding current user)
 */
export const checkIfUserExists = async (
  field: 'email' | 'phoneNumber',
  value: string,
  currentUid: string
) => {
  const q = query(collection(db, 'users'), where(field, '==', value));
  const snapshot = await getDocs(q);

  let exists = false;

  snapshot.forEach(docSnap => {
    if (docSnap.id !== currentUid) {
      exists = true;
    }
  });

  return exists;
};