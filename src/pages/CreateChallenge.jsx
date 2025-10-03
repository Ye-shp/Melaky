import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { db, createPaymentIntent, getStripePublicKey, recordAuthorizedPayment } from '../firebase';
import { addDoc, collection, doc, documentId, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateChallenge() {
  const { authUser } = useAuth();
  const location = useLocation();
  const [type, setType] = useState('friend');
  const [targetId, setTargetId] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [stake, setStake] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  
  useEffect(() => {
    const pre = location.state?.prefill;
    if (pre) {
      if (pre.type) setType(pre.type);
      if (pre.description) setDescription(pre.description);
      if (pre.deadline) {
        const d = new Date();
        d.setDate(d.getDate() + Number(pre.deadline));
        setDeadline(d.toISOString().slice(0,16));
      }
      if (pre.stake) setStake(String(pre.stake));
    }
  }, [location.state]);
  
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [pendingChallengeDraft, setPendingChallengeDraft] = useState(null);
  const [friendIds, setFriendIds] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  React.useEffect(() => {
    if (!authUser) return;
    const unsub = onSnapshot(doc(db, 'users', authUser.uid), (snap) => {
      const data = snap.data();
      setFriendIds(Array.isArray(data?.friends) ? data.friends : []);
    });
    return () => unsub();
  }, [authUser]);

  React.useEffect(() => {
    (async () => {
      setLoadingFriends(true);
      try {
        if (!friendIds || friendIds.length === 0) { setFriends([]); return; }
        const chunks = [];
        for (let i = 0; i < friendIds.length; i += 10) chunks.push(friendIds.slice(i, i + 10));
        const usersCol = collection(db, 'users');
        const profiles = [];
        for (const chunk of chunks) {
          const q = query(usersCol, where(documentId(), 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach((d) => profiles.push({ id: d.id, ...d.data() }));
        }
        profiles.sort((a, b) => friendIds.indexOf(a.id) - friendIds.indexOf(b.id));
        setFriends(profiles);
      } finally {
        setLoadingFriends(false);
      }
    })();
  }, [friendIds]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);
    try {
      const cents = Math.round(parseFloat(stake) * 100);
      if (type === 'self') {
        const challenge = {
          type,
          description,
          deadline: new Date(deadline).toISOString(),
          status: 'active',
          challengerId: authUser.uid,
          challengeeId: null,
          potAmount: 0,
          supporterIds: [],
          proofUrl: '',
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'challenges'), challenge);
        setMsg('Self-challenge created. Use the Support section on detail page to stake.');
      } else {
        const pub = await getStripePublicKey();
        const publishableKey = pub.data.publishableKey;
        setStripePromise(loadStripe(publishableKey));
        const pi = await createPaymentIntent({ amount: cents, metadata: { purpose: 'challenge_escrow' } });
        setClientSecret(pi.data.clientSecret);
        setPendingChallengeDraft({
          type,
          description,
          deadline: new Date(deadline).toISOString(),
          status: 'pending',
          challengerId: authUser.uid,
          challengeeId: targetId,
          potAmount: cents,
          supporterIds: [],
          proofUrl: '',
          paymentIntentId: pi.data.paymentIntentId,
        });
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TopNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-5xl font-bold mb-2 text-gradient-blue">Create Challenge</h1>
          <p className="text-gray-400 text-lg mb-8">Set your goal and stake your commitment</p>
        </motion.div>

        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="mb-6 p-4 rounded-2xl glass-strong text-gray-300 text-sm"
            >
              {msg}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={onSubmit}
          className="space-y-6"
        >
          <div className="glass-strong rounded-3xl p-8 space-y-6">
            <div className="flex gap-4">
              {['friend', 'self'].map((t, i) => (
                <motion.label
                  key={t}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl cursor-pointer transition-all ${
                    type === t 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl' 
                      : 'glass hover:glass-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="sr-only"
                  />
                  <span className="font-semibold capitalize">{t} challenge</span>
                </motion.label>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {type === 'friend' && (
                <motion.div
                  key="friend-select"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-medium mb-2 text-gray-300">Select friend</label>
                  {loadingFriends ? (
                    <div className="text-sm text-gray-400 p-4 glass rounded-2xl">Loading friends...</div>
                  ) : friends.length > 0 ? (
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                      required
                    >
                      <option value="" disabled>Select a friend...</option>
                      {friends.map((u) => (
                        <option key={u.id} value={u.id}>{u.username || u.email}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-400 p-4 glass rounded-2xl">
                      No friends found. Add friends first on the Friends page.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-gray-500 resize-none"
                rows="4"
                placeholder="Describe your challenge..."
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Deadline</label>
                <input
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  type="datetime-local"
                  className="w-full px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Stake (USD)</label>
                <input
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create challenge'}
            </motion.button>
          </div>
        </motion.form>

        <AnimatePresence>
          {stripePromise && clientSecret && pendingChallengeDraft && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 glass-strong rounded-3xl p-8"
            >
              <h3 className="text-2xl font-bold mb-6">Authorize payment</h3>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentAuthorization
                  draft={pendingChallengeDraft}
                  onComplete={() => {
                    setPendingChallengeDraft(null);
                    setClientSecret('');
                    setStripePromise(null);
                    setMsg('Challenge created and payment authorized.');
                  }}
                  onError={(m) => setMsg(m)}
                />
              </Elements>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PaymentAuthorization({ draft, onComplete, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const confirmAndSave = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (error) {
        onError(error.message);
        setProcessing(false);
        return;
      }
      if (!paymentIntent) {
        onError('Payment failed to initialize.');
        setProcessing(false);
        return;
      }
      const challengeRef = await addDoc(collection(db, 'challenges'), {
        ...draft,
        paymentIntentId: paymentIntent.id,
        createdAt: serverTimestamp(),
      });
      const txResp = await recordAuthorizedPayment({
        challengeId: challengeRef.id,
        amount: draft.potAmount,
        paymentIntentId: paymentIntent.id,
      });
      const txId = txResp?.data?.txId;
      if (txId) {
        await updateDoc(doc(db, 'challenges', challengeRef.id), { txId });
      }
      onComplete();
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PaymentElement />
      <motion.button
        disabled={processing || !stripe}
        onClick={confirmAndSave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Authorizing...' : 'Authorize'}
      </motion.button>
    </div>
  );
}
