import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db, googleProvider } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setLoading(false);
      if (user) {
        // Ensure user profile exists in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const username = user.displayName || (user.email ? user.email.split('@')[0] : 'user');
          await setDoc(userRef, {
            username,
            usernameLower: (username || '').toLowerCase(),
            email: user.email || '',
            profilePic: user.photoURL || '',
            friends: [],
            stripeCustomerId: null,
            createdAt: serverTimestamp(),
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async ({ email, password, username }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (username) {
      await updateProfile(cred.user, { displayName: username });
    }
    const userRef = doc(db, 'users', cred.user.uid);
    await setDoc(userRef, {
      username: username || (email ? email.split('@')[0] : 'user'),
      usernameLower: (username || (email ? email.split('@')[0] : 'user')).toLowerCase(),
      email,
      profilePic: cred.user.photoURL || '',
      friends: [],
      stripeCustomerId: null,
      createdAt: serverTimestamp(),
    });
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const uname = user.displayName || (user.email ? user.email.split('@')[0] : 'user');
      await setDoc(userRef, {
        username: uname,
        usernameLower: uname.toLowerCase(),
        email: user.email || '',
        profilePic: user.photoURL || '',
        friends: [],
        stripeCustomerId: null,
        createdAt: serverTimestamp(),
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(() => ({ authUser, loading, login, register, loginWithGoogle, logout }), [authUser, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


