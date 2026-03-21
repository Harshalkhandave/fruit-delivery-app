import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import FruitHome from '../components/fruitHome';
import Login from '../components/login';
import OnboardingScreen from '../components/onBoardingScreen'; // We will create this next
import { db } from '../firebaseConfig';

export default function Page() {
  // 1. One state to rule them all
  const [user, setUser] = useState<any>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // 2. This function runs when the OTP is successful
  const handleLoginSuccess = async (authUser: any) => {
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists() && userSnap.data().isProfileComplete) {
        // Old user - take them home
        setUser(authUser);
        setNeedsOnboarding(false);
      } else {
        // New user or incomplete profile - show onboarding
        setUser(authUser);
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // 3. The "Gatekeeper" Logic (Order matters here!)
  
  // If no user is logged in, show Login
  if (!user) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  // If logged in but profile is missing, show Onboarding
  if (needsOnboarding) {
    return <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} user={user} />;
  }

  // If everything is good, show the Fruits!
  return <FruitHome onLogout={() => setUser(null)} />;
}