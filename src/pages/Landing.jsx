import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const { authUser } = useAuth();
  const isLoggedIn = !!authUser && !authUser.isAnonymous;
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          Win at life by playing within your rules.
        </h1>
        <p className="mt-5 text-gray-300 max-w-3xl mx-auto text-lg">
          Our app doesn’t hand you generic goals. We use your real-life constraints — who you are, where you live, and what resources you have — to design challenges that naturally guide you to grow.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/onboarding" className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold inline-flex items-center gap-2">
            <span>Start My Challenge</span>
          </Link>
          <Link to="/login" state={{ redirectTo: '/app' }} className="px-6 py-3 rounded bg-gray-800 hover:bg-gray-700 font-semibold inline-flex items-center gap-2">
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-bold mb-3">Why Constraints?</h2>
        <p className="text-gray-300">
          Most apps give you outcomes. We give you rules. By shaping constraints, you discover solutions that stick. That’s called the Constraints-Led Approach (CLA) — a coaching method proven in sports and skill development. Instead of rigid instructions, you get tailored rules, environments, and goals that make progress feel inevitable.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 grid gap-6">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded p-5">
            <div className="font-semibold mb-2">Tell us about yourself.</div>
            <div className="text-gray-300">Answer a short questionnaire about your habits, environment, and goals.</div>
          </div>
          <div className="bg-gray-900 rounded p-5">
            <div className="font-semibold mb-2">Get AI-designed challenges.</div>
            <div className="text-gray-300">We turn your constraints into personalized challenge options.</div>
          </div>
          <div className="bg-gray-900 rounded p-5">
            <div className="font-semibold mb-2">Commit & level up.</div>
            <div className="text-gray-300">Put money down, invite friends, or go solo — your growth, your way.</div>
          </div>
          <div className="bg-gray-900 rounded p-5">
            <div className="font-semibold mb-2">Show progress.</div>
            <div className="text-gray-300">Upload proof or share to Instagram/TikTok as part of your journey.</div>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/onboarding" className="px-5 py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold inline-flex items-center">Take the Questionnaire →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-bold mb-3">What makes us different</h2>
        <p className="text-gray-300">
          Other platforms push one-size-fits-all goals. We turn your life into the playing field. Every challenge is designed from your unique performer, environment, and task constraints.
        </p>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-12 text-center text-gray-400">
        Your growth, your constraints, your challenge. Start today.
      </footer>
    </div>
  );
}


