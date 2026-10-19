import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { PLACEHOLDER_FIREBASE_API_KEY } from './isFirebaseConfigured';

// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: PLACEHOLDER_FIREBASE_API_KEY,
  authDomain: "your-app-id.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
