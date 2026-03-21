import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// 1. Define the Address Structure
export interface AddressData {
  receiverName: string;
  receiverPhone: string;
  line1: string;
  line2: string;
  nearby?: string;
  city: string;
  state: string;
}

// 2. Define the Profile Data Interface (Single Definition)
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  isProfileComplete?: boolean;
  savedAddress?: AddressData; // 🟢 Now recognized by TypeScript
  updatedAt?: any;
}

/**
 * Updates the user profile in Firestore
 * @param uid - The unique Firebase User ID
 * @param data - The profile fields to update
 */
export const updateUserProfile = async (
  uid: string,
  data: UpdateProfileData
) => {
  if (!uid) throw new Error('User ID is required');

  const userRef = doc(db, 'users', uid);

  try {
    // We use serverTimestamp() instead of new Date() 
    // to ensure the time is consistent across all users in India
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};