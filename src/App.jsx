import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingGate />}>
            <Route path="/app" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/friends" element={<PageTransition><Friends /></PageTransition>} />
            <Route path="/create" element={<PageTransition><CreateChallenge /></PageTransition>} />
            <Route path="/challenge/:id" element={<PageTransition><ChallengeDetail /></PageTransition>} />
          </Route>
        </Route>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className="bg-gray-950"
    >
      {children}
    </motion.div>
  );
}

export default App;
