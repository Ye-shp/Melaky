import React, { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, cancelPaymentIntent, capturePaymentIntent, markTransactionRefunded, markTransactionReleased, finalizeSelfChallenge } from '../firebase';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createPaymentIntent, getStripePublicKey, recordAuthorizedPayment } from '../firebase';
import ProgressFeed from '../components/ProgressFeed';
import { addProgressReport } from '../services/progressService';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChallengeDetail() {
  const { id } = useParams();
  const { authUser } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [file, setFile] = useState(null);
  const [supportAmount, setSupportAmount] = useState('');
  const [supporting, setSupporting] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [progressText, setProgressText] = useState('');
  const [progressLink, setProgressLink] = useState('');
  const [progressFile, setProgressFile] = useState(null);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'challenges', id));
      if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() });
      setLoading(false);
    })();
  }, [id]);

  const isChallenger = useMemo(() => challenge && authUser && challenge.challengerId === authUser.uid, [challenge, authUser]);
  const isChallengee = useMemo(() => challenge && authUser && challenge.challengeeId === authUser.uid, [challenge, authUser]);
  const isSelf = useMemo(() => challenge && challenge.type === 'self', [challenge]);

  const submitProof = async () => {
    if (!file || !challenge) return;
    try {
      const storage = getStorage();
      const fileRef = ref(storage, `proofs/${challenge.id}/${file.name}`);
      await uploadBytes(fileRef, file, {
        customMetadata: {
          challengerId: challenge.challengerId || '',
          challengeeId: challenge.challengeeId || '',
        }
      });
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'challenges', challenge.id), {
        proofUrl: url,
        status: 'awaiting_verification',
      });
      setMsg('Proof submitted. Awaiting verification.');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const approveProof = async () => {
    if (!challenge?.paymentIntentId) return setMsg('Missing PaymentIntent id');
    try {
      await capturePaymentIntent({ paymentIntentId: challenge.paymentIntentId });
      await markTransactionReleased({ txId: challenge.txId });
      await updateDoc(doc(db, 'challenges', challenge.id), { status: 'completed' });
      setMsg('Funds released and challenge completed.');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const rejectProof = async () => {
    if (!challenge?.paymentIntentId) return setMsg('Missing PaymentIntent id');
    try {
      await cancelPaymentIntent({ paymentIntentId: challenge.paymentIntentId });
      await markTransactionRefunded({ txId: challenge.txId });
      await updateDoc(doc(db, 'challenges', challenge.id), { status: 'failed' });
      setMsg('Funds refunded and challenge failed.');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const startSupport = async () => {
    try {
      setSupporting(true);
      const cents = Math.round(parseFloat(supportAmount) * 100);
      if (!cents || cents <= 0) throw new Error('Enter a valid amount');
      const pub = await getStripePublicKey();
      setStripePromise(loadStripe(pub.data.publishableKey));
      const pi = await createPaymentIntent({ amount: cents, metadata: { purpose: 'self_challenge_support', challengeId: challenge.id } });
      setClientSecret(pi.data.clientSecret);
    } catch (err) {
      setMsg(err.message);
      setSupporting(false);
    }
  };

  const vote = async (value) => {
    if (!challenge) return;
    try {
      await setDoc(doc(collection(db, 'challenges', challenge.id, 'votes'), authUser.uid), {
        userId: authUser.uid,
        vote: value,
        createdAt: new Date().toISOString(),
      });
      setMsg('Vote submitted.');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const finalizeSelf = async () => {
    try {
      const res = await finalizeSelfChallenge({ challengeId: challenge.id });
      setMsg(`Finalized: ${res.data.outcome}.`);
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold">Challenge not found</h2>
        </motion.div>
      </div>
    );
  }

  const statusColors = {
    active: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    pending: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    completed: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
    awaiting_verification: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    failed: 'from-red-500/20 to-pink-500/20 border-red-500/30'
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TopNav />
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-bold mb-2 text-gradient-blue">Challenge Detail</h1>
          <p className="text-gray-400 text-lg">Track your progress and manage your challenge</p>
        </motion.div>

        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-4 rounded-2xl glass-strong text-gray-300 text-sm"
            >
              {msg}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`glass-strong rounded-3xl p-8 border-2 ${statusColors[challenge.status] || statusColors.active}`}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="px-4 py-2 rounded-full text-xs font-semibold glass inline-block mb-4">
                {challenge.type === 'self' ? 'Self' : 'Friend'} Challenge
              </span>
              <p className="text-2xl font-medium text-white leading-relaxed">{challenge.description}</p>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-4">
              <div className="text-sm text-gray-400 mb-1">Stake</div>
              <div className="text-2xl font-bold">${(challenge.potAmount / 100).toFixed(2)}</div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className="text-2xl font-bold capitalize">{challenge.status.replace('_', ' ')}</div>
            </div>
          </div>

          {challenge.proofUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <a
                href={challenge.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
              >
                View Proof
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </motion.div>
          )}
        </motion.div>

        {isChallengee && challenge.status === 'active' && (
          <ActionCard title="Submit proof">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 glass rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
            <ActionButton onClick={submitProof}>Upload Proof</ActionButton>
          </ActionCard>
        )}

        {isChallenger && challenge.status === 'awaiting_verification' && (
          <ActionCard title="Verify proof">
            <div className="flex gap-3">
              <ActionButton onClick={approveProof} variant="success">Approve</ActionButton>
              <ActionButton onClick={rejectProof} variant="danger">Reject</ActionButton>
            </div>
          </ActionCard>
        )}

        {isSelf && challenge.status === 'awaiting_verification' && (
          <ActionCard title="Community voting">
            <div className="flex gap-3 mb-4">
              <ActionButton onClick={() => vote('pass')} variant="success">Pass</ActionButton>
              <ActionButton onClick={() => vote('fail')} variant="danger">Fail</ActionButton>
            </div>
            {isChallenger && (
              <ActionButton onClick={finalizeSelf}>Finalize by votes</ActionButton>
            )}
          </ActionCard>
        )}

        {isSelf && challenge.status === 'active' && (
          <ActionCard title="Support this challenge">
            <div className="flex gap-3 mb-4">
              <input
                type="number"
                min="0"
                step="0.01"
                value={supportAmount}
                onChange={(e) => setSupportAmount(e.target.value)}
                className="flex-1 px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                placeholder="Amount (USD)"
              />
              <ActionButton onClick={startSupport}>Support</ActionButton>
            </div>
            {supporting && stripePromise && clientSecret && (
              <div className="glass rounded-2xl p-6">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SupportPayment onDone={async (paymentIntent) => {
                    try {
                      const cents = Math.round(parseFloat(supportAmount) * 100);
                      await recordAuthorizedPayment({ challengeId: challenge.id, amount: cents, paymentIntentId: paymentIntent.id });
                      setMsg('Support authorized.');
                      setSupporting(false);
                      setClientSecret('');
                    } catch (err) {
                      setMsg(err.message);
                    }
                  }} onError={(m) => setMsg(m)} />
                </Elements>
              </div>
            )}
          </ActionCard>
        )}

        {(isChallengee || isChallenger) && (
          <ActionCard title="Add progress update">
            <div className="space-y-4">
              <textarea
                value={progressText}
                onChange={(e) => setProgressText(e.target.value)}
                placeholder="Write an update (optional)"
                className="w-full px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500 resize-none"
                rows="3"
              />
              <input
                type="url"
                value={progressLink}
                onChange={(e) => setProgressLink(e.target.value)}
                placeholder="Paste a link (Instagram, TikTok, YouTube...)"
                className="w-full px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-500"
              />
              <input
                type="file"
                onChange={(e) => setProgressFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 glass rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
              <ActionButton onClick={async () => {
                try {
                  await addProgressReport(challenge.id, authUser.uid, { text: progressText, file: progressFile, externalUrl: progressLink });
                  setProgressText('');
                  setProgressLink('');
                  setProgressFile(null);
                  setMsg('Progress added');
                } catch (err) {
                  setMsg(err.message);
                }
              }}>Add Progress Update</ActionButton>
            </div>
          </ActionCard>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="glass-strong rounded-3xl p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Progress Feed</h2>
          <ProgressFeed challengeId={challenge.id} />
        </motion.div>
      </div>
    </div>
  );
}

function ActionCard({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-3xl p-8"
    >
      <h3 className="text-xl font-bold mb-6">{title}</h3>
      {children}
    </motion.div>
  );
}

function ActionButton({ onClick, children, variant = 'primary' }) {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600',
    success: 'bg-green-600 hover:bg-green-500',
    danger: 'bg-red-600 hover:bg-red-500'
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`px-6 py-3 rounded-xl font-semibold shadow-xl transition-all ${variants[variant]}`}
    >
      {children}
    </motion.button>
  );
}

function SupportPayment({ onDone, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const confirm = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (error) return onError(error.message);
      if (!paymentIntent) return onError('Payment failed.');
      await onDone(paymentIntent);
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      <motion.button
        onClick={confirm}
        disabled={processing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold shadow-xl disabled:opacity-50"
      >
        {processing ? 'Authorizing...' : 'Authorize'}
      </motion.button>
    </div>
  );
}
