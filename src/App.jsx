import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingGate from './components/OnboardingGate';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import CreateChallenge from './pages/CreateChallenge';
import ChallengeDetail from './pages/ChallengeDetail';
import Onboarding from './pages/Onboarding';
import Landing from './pages/Landing';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<OnboardingGate />}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/create" element={<CreateChallenge />} />
              <Route path="/challenge/:id" element={<ChallengeDetail />} />
            </Route>
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
