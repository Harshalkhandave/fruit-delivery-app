import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React from 'react';

import EditProfileScreen from '../components/editProfileScreen';
import { useUser } from '../context/UserContext'; // ✅
import { db } from '../firebaseConfig';

export default function EditProfilePage() {
  const { user, setUser } = useUser();   
  const router = useRouter();

  return (
    <EditProfileScreen
      user={user}
      onComplete={async () => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser({ ...user, ...userSnap.data() });
        }

        router.back(); // ✅ go back
      }}
    />
  );
}