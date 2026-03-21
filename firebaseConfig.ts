import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDwmTmIcIViPt2C82oGXqjRAr7zhX9HjzA",
    authDomain: "your-app.firebaseapp.com",
    projectId: "fruitwala-bc7a9",
    storageBucket: "fruitwala-bc7a9.firebasestorage.app",
    messagingSenderId: "1032320265485",
    appId: "1:1032320265485:android:ca1bcefa2127a4ebee9444"
  
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


// import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth';

// const firebaseConfig = {
//   // your config
//   apiKey: "AIzaSyDwmTmIcIViPt2C82oGXqjRAr7zhX9HjzA",
//   authDomain: "your-app.firebaseapp.com",
//   projectId: "fruitwala-bc7a9",
//   storageBucket: "fruitwala-bc7a9.firebasestorage.app",
//   messagingSenderId: "1032320265485",
//   appId: "1:1032320265485:android:ca1bcefa2127a4ebee9444"
// };

// const app = initializeApp(firebaseConfig);

// export const auth = getAuth(app);


// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { initializeApp } from 'firebase/app';
// import { initializeAuth } from 'firebase/auth';
// import { getReactNativePersistence } from 'firebase/auth/react-native';

// const firebaseConfig = {
//   // your config
//   apiKey: "AIzaSyDwmTmIcIViPt2C82oGXqjRAr7zhX9HjzA",
//   authDomain: "your-app.firebaseapp.com",
//   projectId: "fruitwala-bc7a9",
//   storageBucket: "fruitwala-bc7a9.firebasestorage.app",
//   messagingSenderId: "1032320265485",
//   appId: "1:1032320265485:android:ca1bcefa2127a4ebee9444"
// };

// const app = initializeApp(firebaseConfig);

// export const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(AsyncStorage),
// });