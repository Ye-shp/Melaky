import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-pulse text-gray-300">Loading…</div>
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  // Block anonymous sessions from app routes
  if (authUser?.isAnonymous) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}


