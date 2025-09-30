import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKS13PS7yKDmkW6mtepSbG4rQwahoYnJs",
  authDomain: "melaky-110.firebaseapp.com",
  projectId: "melaky-110",
  storageBucket: "melaky-110.firebasestorage.app",
  messagingSenderId: "548548241463",
  appId: "1:548548241463:web:0a982e0df35af2fa82b7b2",
  measurementId: "G-HV4SZ93WX4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
export const auth = getAuth(app);

// Configure Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;

// Stripe callable helpers
export const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
export const capturePaymentIntent = httpsCallable(functions, 'capturePaymentIntent');
export const cancelPaymentIntent = httpsCallable(functions, 'cancelPaymentIntent');
export const getStripePublicKey = httpsCallable(functions, 'getStripePublicKey');
export const recordAuthorizedPayment = httpsCallable(functions, 'recordAuthorizedPayment');
export const markTransactionReleased = httpsCallable(functions, 'markTransactionReleased');
export const markTransactionRefunded = httpsCallable(functions, 'markTransactionRefunded');
export const finalizeSelfChallenge = httpsCallable(functions, 'finalizeSelfChallenge');
