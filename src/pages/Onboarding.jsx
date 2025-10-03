import React, { useMemo, useState } from 'react';
import { generateIntakeSuggestions } from '../services/onboardingService';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Health & Fitness','Habits','Substance','Career','Learning','Social','Creative','Other'];

export default function Onboarding() {
  const { authUser } = useAuth();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [priority, setPriority] = useState('');
  const [why, setWhy] = useState('');
  const [success90, setSuccess90] = useState('');
  const [horizon, setHorizon] = useState('28');
  const [risk, setRisk] = useState('medium');
  const [verify, setVerify] = useState('self');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const answers = useMemo(() => ([
    { qId: 'cat', question: 'categories', response: categories },
    { qId: 'priority', question: 'priority', response: priority },
    { qId: 'why1', question: 'Why is this important?', response: why },
    { qId: 'why2', question: 'What would success look like in 90 days?', response: success90 },
    { qId: 'prefs', question: 'Preferences', response: { horizon, risk, verify } },
    { qId: 'consent', question: 'Consent to store and summarize', response: consent }
  ]), [categories, priority, why, success90, horizon, risk, verify, consent]);

  const submit = async () => {
    if (!consent) {
      setResult({ aiSummary: { summaryText: 'Here are a few starter templates.', suggestions: defaultSuggestions() } });
      setStep(99);
      return;
    }
    setLoading(true);
    try {
      const data = await generateIntakeSuggestions(answers, 'signup');
      setResult(data);
      setStep(99);
    } catch (err) {
      setResult({ aiSummary: { summaryText: 'Here are a few starter templates.', suggestions: defaultSuggestions() } });
      setStep(99);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-3 text-gradient-blue">Find Your Challenge</h1>
          <p className="text-gray-400 text-lg">Answer a few questions to get personalized recommendations</p>
          {step < 99 && (
            <div className="mt-8 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <motion.div
                  key={s}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: s * 0.05 }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step ? 'w-12 bg-gradient-to-r from-blue-600 to-purple-600' : 'w-2 bg-gray-700'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepContainer key="step1">
              <StepTitle>Step 1 — Categories</StepTitle>
              <p className="text-gray-400 mb-6">What areas do you want to focus on?</p>
              <div className="flex flex-wrap gap-3 mb-8">
                {CATEGORIES.map((c, i) => (
                  <motion.button
                    key={c}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => toggle(categories, setCategories, c)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                      categories.includes(c) 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl' 
                        : 'glass hover:glass-strong'
                    }`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
              <NavButtons onNext={() => setStep(2)} />
            </StepContainer>
          )}

          {step === 2 && (
            <StepContainer key="step2">
              <StepTitle>Step 2 — Prioritization</StepTitle>
              <p className="text-gray-400 mb-6">What's your top focus right now?</p>
              <input
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="e.g., Fitness, Learn coding, etc."
                className="w-full px-6 py-4 glass rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white text-lg placeholder-gray-500 mb-8"
              />
              <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
            </StepContainer>
          )}

          {step === 3 && (
            <StepContainer key="step3">
              <StepTitle>Step 3 — Your Why</StepTitle>
              <p className="text-gray-400 mb-6">Help us understand your motivation</p>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Why does this matter to you?</label>
                  <textarea
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    className="w-full px-6 py-4 glass rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-gray-500 resize-none"
                    rows="4"
                    placeholder="Share your motivation..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">What would success look like in 90 days?</label>
                  <textarea
                    value={success90}
                    onChange={(e) => setSuccess90(e.target.value)}
                    className="w-full px-6 py-4 glass rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-gray-500 resize-none"
                    rows="4"
                    placeholder="Describe your ideal outcome..."
                  />
                </div>
              </div>
              <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
            </StepContainer>
          )}

          {step === 4 && (
            <StepContainer key="step4">
              <StepTitle>Step 4 — Preferences</StepTitle>
              <p className="text-gray-400 mb-6">Customize your challenge settings</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Time horizon</label>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value)}
                    className="w-full px-4 py-3 glass rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  >
                    <option value="14">2 weeks</option>
                    <option value="28">4 weeks</option>
                    <option value="84">12 weeks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Stake level</label>
                  <select
                    value={risk}
                    onChange={(e) => setRisk(e.target.value)}
                    className="w-full px-4 py-3 glass rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  >
                    <option value="low">Low stake</option>
                    <option value="medium">Medium stake</option>
                    <option value="high">High stake</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Verification</label>
                  <select
                    value={verify}
                    onChange={(e) => setVerify(e.target.value)}
                    className="w-full px-4 py-3 glass rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  >
                    <option value="self">Self upload</option>
                    <option value="social">Social embed</option>
                    <option value="integration">App integration</option>
                  </select>
                </div>
              </div>
              <NavButtons onBack={() => setStep(3)} onNext={() => setStep(5)} />
            </StepContainer>
          )}

          {step === 5 && (
            <StepContainer key="step5">
              <StepTitle>Step 5 — Final Step</StepTitle>
              <p className="text-gray-400 mb-6">Review and confirm your preferences</p>
              <motion.label
                whileHover={{ scale: 1.02 }}
                className="flex items-start gap-4 p-6 glass-strong rounded-2xl mb-8 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded accent-blue-600"
                />
                <span className="text-gray-300">
                  I consent to store my responses and generate personalized challenge suggestions using AI.
                </span>
              </motion.label>
              <NavButtons 
                onBack={() => setStep(4)} 
                onNext={submit}
                nextLabel="Generate Suggestions"
                nextDisabled={loading}
              />
            </StepContainer>
          )}

          {loading && (
            <StepContainer key="loading">
              <div className="text-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
                />
                <p className="text-xl text-gray-400">Generating your personalized challenges...</p>
              </div>
            </StepContainer>
          )}

          {step === 99 && result && (
            <StepContainer key="results">
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong rounded-3xl p-8"
                >
                  <h2 className="text-2xl font-bold mb-3">Your Personalized Summary</h2>
                  <p className="text-gray-300 leading-relaxed">{result.aiSummary?.summaryText}</p>
                </motion.div>

                <div>
                  <h2 className="text-2xl font-bold mb-6">Recommended Challenges</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(result.aiSummary?.suggestions || []).map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        className="glass-strong rounded-3xl p-6 space-y-4"
                      >
                        <h3 className="font-bold text-lg">{s.shortDesc}</h3>
                        <div className="space-y-2 text-sm text-gray-400">
                          <div>Suggested stake: <span className="text-white font-semibold">${s.suggestedStake}</span></div>
                          <div>Verification: <span className="text-white">{s.verification}</span></div>
                        </div>
                        <motion.button
                          onClick={() => {
                            if (!authUser || authUser.isAnonymous) {
                              navigate('/register', { state: { redirectTo: '/app', createFromSuggestion: s.prefillFields } });
                            } else {
                              navigate('/create', { state: { prefill: s.prefillFields } });
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold shadow-xl"
                        >
                          Accept Challenge
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </StepContainer>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepContainer({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong rounded-3xl p-8"
    >
      {children}
    </motion.div>
  );
}

function StepTitle({ children }) {
  return <h2 className="text-3xl font-bold mb-4">{children}</h2>;
}

function NavButtons({ onBack, onNext, nextLabel = 'Next', nextDisabled = false }) {
  return (
    <div className="flex gap-4">
      {onBack && (
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-3 glass-strong rounded-xl font-semibold hover:bg-white/15 transition-colors"
        >
          Back
        </motion.button>
      )}
      <motion.button
        onClick={onNext}
        disabled={nextDisabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex-1 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </motion.button>
    </div>
  );
}

function toggle(arr, setArr, item) {
  if (arr.includes(item)) setArr(arr.filter((x) => x !== item)); else setArr([...arr, item]);
}

function defaultSuggestions() {
  return [
    { id: 's1', shortDesc: 'Walk 20 minutes daily for 2 weeks', deadlineDays: 14, suggestedStake: 20, verification: 'Upload a daily photo', prefillFields: { type: 'self', description: 'Walk 20 minutes daily', deadline: 14, stake: 20 } },
    { id: 's2', shortDesc: 'Meditate 5 minutes daily for 2 weeks', deadlineDays: 14, suggestedStake: 15, verification: 'Screenshot or note', prefillFields: { type: 'self', description: 'Meditate 5 minutes daily', deadline: 14, stake: 15 } },
    { id: 's3', shortDesc: 'Read 10 pages/day for 4 weeks', deadlineDays: 28, suggestedStake: 25, verification: 'Photo of pages', prefillFields: { type: 'self', description: 'Read 10 pages/day', deadline: 28, stake: 25 } },
  ];
}
