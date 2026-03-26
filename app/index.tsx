import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import FruitHome from '../components/fruitHome';
import Login from '../components/login';
import OnboardingScreen from '../components/onBoardingScreen';
import { useUser } from '../context/UserContext'; // ✅
import { db } from '../firebaseConfig';

export default function Page() {
  const { user, setUser } = useUser(); // ✅ GLOBAL
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const handleLoginSuccess = async (authUser: any) => {
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const firestoreData = userSnap.data();

        if (firestoreData.isProfileComplete) {
          setUser({ ...authUser, ...firestoreData });
          setNeedsOnboarding(false);
        } else {
          setUser(authUser);
          setNeedsOnboarding(true);
        }
      } else {
        setUser(authUser);
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleOnboardingComplete = async () => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      setUser({ ...user, ...userSnap.data() });
    }

    setNeedsOnboarding(false);
  };

  if (!user) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  if (needsOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} user={user} />;
  }

  return <FruitHome onLogout={() => setUser(null)} />;
}