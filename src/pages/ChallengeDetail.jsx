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

  if (loading) return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading…</div>
  );

  if (!challenge) return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Not found</div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopNav />
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Challenge</h1>
        {msg && <div className="text-sm text-gray-300">{msg}</div>}
        <div className="bg-gray-800 rounded p-4">
          <div className="text-gray-300">{challenge.description}</div>
          <div className="text-sm text-gray-400 mt-2">Stake: ${(challenge.potAmount / 100).toFixed(2)}</div>
          <div className="text-sm text-gray-400">Status: {challenge.status}</div>
          {challenge.proofUrl && (
            <div className="mt-2"><a className="text-blue-400" href={challenge.proofUrl} target="_blank" rel="noreferrer">View Proof</a></div>
          )}
        </div>

        {isChallengee && challenge.status === 'active' && (
          <div className="bg-gray-800 rounded p-4 space-y-2">
            <div className="font-semibold">Submit proof</div>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={submitProof} className="px-4 py-2 bg-blue-600 rounded">Upload</button>
          </div>
        )}

        {isChallenger && challenge.status === 'awaiting_verification' && (
          <div className="bg-gray-800 rounded p-4 space-y-2">
            <div className="font-semibold">Verify proof</div>
            <div className="flex gap-2">
              <button onClick={approveProof} className="px-4 py-2 bg-green-600 rounded">Approve</button>
              <button onClick={rejectProof} className="px-4 py-2 bg-red-600 rounded">Reject</button>
            </div>
          </div>
        )}

        {isSelf && challenge.status === 'awaiting_verification' && (
          <div className="bg-gray-800 rounded p-4 space-y-2">
            <div className="font-semibold">Community voting</div>
            <div className="flex gap-2">
              <button onClick={() => vote('pass')} className="px-4 py-2 bg-green-600 rounded">Pass</button>
              <button onClick={() => vote('fail')} className="px-4 py-2 bg-red-600 rounded">Fail</button>
            </div>
            {isChallenger && (
              <div className="pt-2">
                <button onClick={finalizeSelf} className="px-4 py-2 bg-blue-600 rounded">Finalize by votes</button>
              </div>
            )}
          </div>
        )}

        {isSelf && challenge.status === 'active' && (
          <div className="bg-gray-800 rounded p-4 space-y-3">
            <div className="font-semibold">Support this self-challenge</div>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={supportAmount} onChange={(e) => setSupportAmount(e.target.value)} className="px-3 py-2 bg-gray-700 rounded" placeholder="Amount (USD)" />
              <button onClick={startSupport} className="px-4 py-2 bg-blue-600 rounded">Support</button>
            </div>
            {supporting && stripePromise && clientSecret && (
              <div className="bg-gray-900 rounded p-4">
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
          </div>
        )}

        {(isChallengee || isChallenger) && (
          <div className="bg-gray-800 rounded p-4 space-y-3">
            <div className="font-semibold">Add progress update</div>
            <textarea value={progressText} onChange={(e) => setProgressText(e.target.value)} placeholder="Write an update (optional)" className="w-full px-3 py-2 bg-gray-700 rounded" rows="3" />
            <input type="url" value={progressLink} onChange={(e) => setProgressLink(e.target.value)} placeholder="Paste a link (Instagram, TikTok, YouTube...)" className="w-full px-3 py-2 bg-gray-700 rounded" />
            <input type="file" onChange={(e) => setProgressFile(e.target.files?.[0] || null)} />
            <div>
              <button onClick={async () => {
                try {
                  await addProgressReport(challenge.id, authUser.uid, { text: progressText, file: progressFile, externalUrl: progressLink });
                  setProgressText('');
                  setProgressLink('');
                  setProgressFile(null);
                  setMsg('Progress added');
                } catch (err) {
                  setMsg(err.message);
                }
              }} className="px-4 py-2 bg-blue-600 rounded">Add Progress Update</button>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded p-4">
          <div className="font-semibold mb-2">Progress</div>
          <ProgressFeed challengeId={challenge.id} />
        </div>
      </div>
    </div>
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
    <div className="space-y-3">
      <PaymentElement />
      <button onClick={confirm} disabled={processing} className="px-4 py-2 bg-blue-600 rounded">{processing ? 'Authorizing…' : 'Authorize'}</button>
    </div>
  );
}


