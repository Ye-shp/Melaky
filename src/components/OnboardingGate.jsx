import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function OnboardingGate() {
  const { authUser, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasIntake, setHasIntake] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authUser) { setChecking(false); return; }
      try {
        const intakeQ = query(collection(db, 'intakeResponses'), where('userId', '==', authUser.uid), limit(1));
        const challengesQ1 = query(collection(db, 'challenges'), where('challengerId', '==', authUser.uid), limit(1));
        const challengesQ2 = query(collection(db, 'challenges'), where('challengeeId', '==', authUser.uid), limit(1));
        const [intakeSnap, c1, c2] = await Promise.all([getDocs(intakeQ), getDocs(challengesQ1), getDocs(challengesQ2)]);
        if (!cancelled) {
          const hasAny = !intakeSnap.empty || !c1.empty || !c2.empty;
          setHasIntake(hasAny);
          setChecking(false);
        }
      } catch (_) {
        if (!cancelled) { setHasIntake(false); setChecking(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [authUser]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-pulse text-gray-300">Loading…</div>
      </div>
    );
  }

  // Allow the onboarding page itself, and allow `/create` when arriving with prefill from onboarding
  const allowCreateWithPrefill = location.pathname === '/create' && location.state && location.state.prefill;
  const isDashboardRoute = location.pathname === '/app' || location.pathname.startsWith('/challenge') || location.pathname.startsWith('/friends') || location.pathname.startsWith('/create');
  if (!hasIntake && isDashboardRoute && !allowCreateWithPrefill) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}


