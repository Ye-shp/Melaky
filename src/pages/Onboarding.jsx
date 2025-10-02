import React, { useMemo, useState } from 'react';
import { generateIntakeSuggestions } from '../services/onboardingService';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Quick intake — find a first challenge</h1>
        {step === 1 && (
          <div className="bg-gray-800 rounded p-4 space-y-3">
            <div className="font-semibold">Step 1 — Categories</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => toggle(categories, setCategories, c)} className={`px-3 py-1 rounded ${categories.includes(c) ? 'bg-blue-600' : 'bg-gray-700'}`}>{c}</button>
              ))}
            </div>
            <div><button onClick={() => setStep(2)} className="px-4 py-2 bg-blue-600 rounded">Next</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-gray-800 rounded p-4 space-y-3">
            <div className="font-semibold">Step 2 — Prioritization</div>
            <input value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Top focus (e.g., Fitness)" className="w-full px-3 py-2 bg-gray-700 rounded" />
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-3 py-2 bg-gray-700 rounded">Back</button>
              <button onClick={() => setStep(3)} className="px-4 py-2 bg-blue-600 rounded">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-gray-800 rounded p-4 space-y-3">
            <div className="font-semibold">Step 3 — Narrowing question</div>
            <div className="text-sm text-gray-300">Briefly, why does this matter to you?</div>
            <textarea value={why} onChange={(e) => setWhy(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded" rows="3" />
            <div className="text-sm text-gray-300">What would success look like in 90 days?</div>
            <textarea value={success90} onChange={(e) => setSuccess90(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded" rows="3" />
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-3 py-2 bg-gray-700 rounded">Back</button>
              <button onClick={() => setStep(4)} className="px-4 py-2 bg-blue-600 rounded">Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-gray-800 rounded p-4 space-y-3">
            <div className="font-semibold">Step 4 — Commitment preferences</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={horizon} onChange={(e) => setHorizon(e.target.value)} className="px-3 py-2 bg-gray-700 rounded">
                <option value="14">2 weeks</option>
                <option value="28">4 weeks</option>
                <option value="84">12 weeks</option>
              </select>
              <select value={risk} onChange={(e) => setRisk(e.target.value)} className="px-3 py-2 bg-gray-700 rounded">
                <option value="low">Low stake</option>
                <option value="medium">Medium stake</option>
                <option value="high">High stake</option>
              </select>
              <select value={verify} onChange={(e) => setVerify(e.target.value)} className="px-3 py-2 bg-gray-700 rounded">
                <option value="self">Self upload</option>
                <option value="social">Social embed</option>
                <option value="integration">App integration</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(3)} className="px-3 py-2 bg-gray-700 rounded">Back</button>
              <button onClick={() => setStep(5)} className="px-4 py-2 bg-blue-600 rounded">Next</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="bg-gray-800 rounded p-4 space-y-3">
            <div className="font-semibold">Step 5 — Consent & AI opt-in</div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to store responses and generate suggestions.
            </label>
            <div className="flex gap-2">
              <button onClick={() => setStep(4)} className="px-3 py-2 bg-gray-700 rounded">Back</button>
              <button onClick={submit} className="px-4 py-2 bg-blue-600 rounded">Submit</button>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-gray-800 rounded p-4">Generating suggestions…</div>
        )}

        {step === 99 && result && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded p-4">
              <div className="font-semibold mb-1">Summary</div>
              <div className="text-gray-300">{result.aiSummary?.summaryText}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(result.aiSummary?.suggestions || []).map((s) => (
                <div key={s.id} className="bg-gray-800 rounded p-4 space-y-2">
                  <div className="font-semibold">{s.shortDesc}</div>
                  <div className="text-sm text-gray-400">Suggested stake: ${s.suggestedStake}</div>
                  <div className="text-sm text-gray-400">Verification: {s.verification}</div>
                  <button onClick={() => {
                    if (!authUser || authUser.isAnonymous) {
                      // First-time users: register to claim and auto-create challenge, then go to dashboard
                      navigate('/register', { state: { redirectTo: '/app', createFromSuggestion: s.prefillFields } });
                    } else {
                      // Signed-in users can review/edit on create page
                      navigate('/create', { state: { prefill: s.prefillFields } });
                    }
                  }} className="px-3 py-2 bg-blue-600 rounded w-full">Accept Challenge</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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


