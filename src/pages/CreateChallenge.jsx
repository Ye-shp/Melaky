import React, { useState } from 'react';
import TopNav from '../components/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { db, createPaymentIntent, getStripePublicKey, recordAuthorizedPayment } from '../firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

export default function CreateChallenge() {
  const { authUser } = useAuth();
  const [type, setType] = useState('friend');
  const [targetId, setTargetId] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [stake, setStake] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [pendingChallengeDraft, setPendingChallengeDraft] = useState(null);

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
        setMsg('Self-challenge created and active. Others can support.');
      } else {
        // Friend challenge: create PaymentIntent for manual capture and present PaymentElement
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
    <div className="min-h-screen bg-gray-900 text-white">
      <TopNav />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Create a Challenge</h1>
        {msg && <div className="mb-4 text-sm text-gray-300">{msg}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="type" value="friend" checked={type==='friend'} onChange={() => setType('friend')} />
              Friend challenge
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="type" value="self" checked={type==='self'} onChange={() => setType('self')} />
              Self-challenge
            </label>
          </div>
          {type === 'friend' && (
            <div>
              <label className="block text-sm mb-1">Friend userId</label>
              <input value={targetId} onChange={(e) => setTargetId(e.target.value)} type="text" className="w-full px-3 py-2 bg-gray-800 rounded" placeholder="Enter friend's uid (placeholder UI)" required />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-gray-800 rounded" rows="3" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Deadline</label>
            <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="datetime-local" className="w-full px-3 py-2 bg-gray-800 rounded" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Stake (USD)</label>
            <input value={stake} onChange={(e) => setStake(e.target.value)} type="number" min="0" step="0.01" className="w-full px-3 py-2 bg-gray-800 rounded" required />
          </div>
          <button disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded">{submitting ? 'Submitting…' : 'Create challenge'}</button>
        </form>

        {stripePromise && clientSecret && pendingChallengeDraft && (
          <div className="mt-8 bg-gray-800 rounded p-4">
            <div className="font-semibold mb-2">Authorize payment</div>
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
          </div>
        )}
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
    <div className="space-y-4">
      <PaymentElement />
      <button disabled={processing || !stripe} onClick={confirmAndSave} className="px-4 py-2 bg-blue-600 rounded">
        {processing ? 'Authorizing…' : 'Authorize'}
      </button>
    </div>
  );
}


