import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import FruitHome from '../components/home/FruitHome';
import Login from '../components/login';
import OnboardingScreen from '../components/onBoardingScreen';
import { useUser } from '../context/UserContext';
import { db } from '../firebaseConfig';


// 🛠️ DEV CONFIGURATION
const IS_DEV_MODE = true; 
const DEV_USER_ID = '7yewgvAhTCdFc2UH2EZxYLIEHpy1';

export default function Page() {
  const { user, setUser } = useUser();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Dev Effect: Auto-Login specific user
  useEffect(() => {
    if (IS_DEV_MODE && !user) {
      console.log("🛠️ Dev Mode: Fetching data for UID:", DEV_USER_ID);
      handleLoginSuccess({ uid: DEV_USER_ID });
    } else {
      setIsInitializing(false);
    }
  }, []);

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
        // If user document doesn't exist yet, we still set the authUser
        setUser(authUser);
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error("Login fetch error:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleOnboardingComplete = async () => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      setUser({ ...user, ...userSnap.data() });
    }
    setNeedsOnboarding(false);
  };

  // Prevent flicker while dev-loading
  if (isInitializing) {
    return null; 
  }

  if (!user) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  if (needsOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} user={user} />;
  }

  return (
    <FruitHome 
      onLogout={() => {
        setUser(null);
        // If you're in dev mode, you might want to stop the auto-login after logout
        // or just let it loop back for testing.
      }} 
    />
  );
}