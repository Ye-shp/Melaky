const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const fetch = require('node-fetch');

// Configure functions for us-central1 region
const functionsRegion = functions.region('us-central1');

// Initialize Firebase Admin
admin.initializeApp();

// Read Stripe secret from Functions config, never hardcode secrets
const stripeSecret = functions.config().stripe && functions.config().stripe.secret;
if (!stripeSecret) {
  // Log a warning so developers know to set the secret before invoking endpoints
  console.warn('[Stripe] Missing stripe.secret in functions config');
}
const stripe = new Stripe(stripeSecret || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

// Minimal health check
exports.healthCheck = functionsRegion.https.onRequest((req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Expose Stripe publishable key to client
exports.getStripePublicKey = functionsRegion.https.onCall(async (data, context) => {
  const publishable = functions.config().stripe && functions.config().stripe.publishable;
  if (!publishable) {
    throw new functions.https.HttpsError('failed-precondition', 'Missing stripe.publishable in functions config');
  }
  return { publishableKey: publishable };
});

// Create a PaymentIntent with manual capture for escrow authorization
exports.createPaymentIntent = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { amount, currency = 'usd', customerId, metadata } = data || {};

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be a positive integer (cents).');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId || undefined,
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true },
      metadata: {
        uid: context.auth.uid,
        ...metadata,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('[Stripe] createPaymentIntent error', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Capture funds when challenge is approved
exports.capturePaymentIntent = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const { paymentIntentId } = data || {};
  if (!paymentIntentId) {
    throw new functions.https.HttpsError('invalid-argument', 'paymentIntentId is required.');
  }
  try {
    const captured = await stripe.paymentIntents.capture(paymentIntentId);
    return { status: captured.status };
  } catch (error) {
    console.error('[Stripe] capturePaymentIntent error', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Cancel (refund) when challenge fails/rejected
exports.cancelPaymentIntent = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const { paymentIntentId } = data || {};
  if (!paymentIntentId) {
    throw new functions.https.HttpsError('invalid-argument', 'paymentIntentId is required.');
  }
  try {
    const canceled = await stripe.paymentIntents.cancel(paymentIntentId);
    return { status: canceled.status };
  } catch (error) {
    console.error('[Stripe] cancelPaymentIntent error', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Record an authorized (held) payment after client confirmation
exports.recordAuthorizedPayment = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const { challengeId, amount, paymentIntentId } = data || {};
  if (!challengeId || !paymentIntentId || !Number.isInteger(amount)) {
    throw new functions.https.HttpsError('invalid-argument', 'challengeId, paymentIntentId, amount required');
  }
  const db = admin.firestore();
  const txRef = await db.collection('transactions').add({
    challengeId,
    userId: context.auth.uid,
    amount,
    stripePaymentIntentId: paymentIntentId,
    status: 'held',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  // Increment pot amount and track supporter for self-challenges
  const challengeRef = db.collection('challenges').doc(challengeId);
  const snap = await challengeRef.get();
  const updates = { potAmount: admin.firestore.FieldValue.increment(amount) };
  if (snap.exists && snap.data().type === 'self') {
    updates.supporterIds = admin.firestore.FieldValue.arrayUnion(context.auth.uid);
  }
  await challengeRef.set(updates, { merge: true });
  return { txId: txRef.id };
});

exports.markTransactionReleased = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const { txId } = data || {};
  if (!txId) throw new functions.https.HttpsError('invalid-argument', 'txId required');
  const db = admin.firestore();
  await db.collection('transactions').doc(txId).update({ status: 'released', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});

exports.markTransactionRefunded = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const { txId } = data || {};
  if (!txId) throw new functions.https.HttpsError('invalid-argument', 'txId required');
  const db = admin.firestore();
  await db.collection('transactions').doc(txId).update({ status: 'refunded', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});

// Finalize a self-challenge by majority vote among supporters
exports.finalizeSelfChallenge = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const { challengeId } = data || {};
  if (!challengeId) throw new functions.https.HttpsError('invalid-argument', 'challengeId required');
  const db = admin.firestore();
  const challengeRef = db.collection('challenges').doc(challengeId);
  const challengeSnap = await challengeRef.get();
  if (!challengeSnap.exists) throw new functions.https.HttpsError('not-found', 'Challenge not found');
  const challenge = challengeSnap.data();
  if (challenge.type !== 'self') throw new functions.https.HttpsError('failed-precondition', 'Only for self-challenges');
  if (challenge.challengerId !== context.auth.uid) throw new functions.https.HttpsError('permission-denied', 'Only owner can finalize');
  if (challenge.status !== 'awaiting_verification') throw new functions.https.HttpsError('failed-precondition', 'Challenge not awaiting verification');

  // Tally votes
  const votesSnap = await challengeRef.collection('votes').get();
  let passCount = 0;
  let failCount = 0;
  votesSnap.forEach((d) => {
    const v = d.data();
    if (v && v.vote === 'pass') passCount += 1; else if (v && v.vote === 'fail') failCount += 1;
  });
  const outcome = passCount >= failCount ? 'pass' : 'fail';

  // Fetch held transactions for this challenge
  const heldSnap = await db.collection('transactions').where('challengeId', '==', challengeId).where('status', '==', 'held').get();
  const txDocs = heldSnap.docs;

  // Capture or cancel each payment intent
  for (const docSnap of txDocs) {
    const tx = docSnap.data();
    try {
      if (outcome === 'pass') {
        await stripe.paymentIntents.capture(tx.stripePaymentIntentId);
        await docSnap.ref.update({ status: 'released', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        await stripe.paymentIntents.cancel(tx.stripePaymentIntentId);
        await docSnap.ref.update({ status: 'refunded', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    } catch (err) {
      console.error('[Stripe] finalizeSelfChallenge tx error', tx.stripePaymentIntentId, err);
    }
  }

  // Update challenge status
  await challengeRef.update({ status: outcome === 'pass' ? 'completed' : 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  return { outcome, passCount, failCount, processed: txDocs.length };
});

// Generate onboarding intake suggestions via LLM (requires OPENAI_API_KEY env var)
exports.generateIntakeSuggestions = functionsRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = context.auth.uid;
  const answers = Array.isArray(data?.answers) ? data.answers : [];
  if (answers.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'answers array required');
  }

  const db = admin.firestore();
  // simple per-user rate limit (5s)
  const rateRef = db.collection('aiCalls').doc(uid);
  const rateSnap = await rateRef.get();
  if (rateSnap.exists) {
    const last = rateSnap.get('lastTimestamp');
    const lastMs = last && last.toMillis ? last.toMillis() : 0;
    if (Date.now() - lastMs < 5000) {
      throw new functions.https.HttpsError('resource-exhausted', 'Try again in a few seconds.');
    }
  }
  await rateRef.set({ lastTimestamp: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'Missing OPENAI_API_KEY');
  }

  const userBullets = answers.map((a) => `- ${a.question || a.qId}: ${JSON.stringify(a.response)}`).join('\n');
  const prompt = `You are given a user's intake answers below. Produce a JSON object with:\n{
  "summaryText": "<brief empathetic summary>",
  "suggestions": [
    {"id":"s1","shortDesc":"...","deadlineDays":28,"suggestedStake":50,"verification":"...","prefillFields":{"type":"self","description":"...","deadline":28,"stake":50}}
  ]
}\nUser answers:\n${userBullets}\nConstraints: keep summaryText <= 60 words. suggestions length = 3. Output valid JSON only.`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You summarize intake and suggest 3 actionable personal challenges.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.8,
    }),
  });
  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    parsed = {
      summaryText: 'Starter ideas based on your selections.',
      suggestions: [
        { id: 's1', shortDesc: 'Walk 20 minutes daily for 2 weeks', deadlineDays: 14, suggestedStake: 20, verification: 'Upload photo or link', prefillFields: { type: 'self', description: 'Walk 20 minutes daily', deadline: 14, stake: 20 } },
        { id: 's2', shortDesc: 'No added sugar for 2 weeks', deadlineDays: 14, suggestedStake: 30, verification: 'Text log + photo', prefillFields: { type: 'self', description: 'No added sugar', deadline: 14, stake: 30 } },
        { id: 's3', shortDesc: 'Read 10 pages/day for 4 weeks', deadlineDays: 28, suggestedStake: 25, verification: 'Photo + note', prefillFields: { type: 'self', description: 'Read 10 pages/day', deadline: 28, stake: 25 } },
      ],
    };
  }

  const docRef = await db.collection('intakeResponses').add({
    userId: uid,
    answers,
    aiSummary: parsed,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: data?.source || 'manual',
  });

  return { id: docRef.id, aiSummary: parsed };
});

// When a friend request is accepted, add each user to the other's friends list
exports.onFriendRequestUpdate = functionsRegion.firestore
  .document('friendRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after) return null;
    if (before.status === 'pending' && after.status === 'accepted') {
      const { fromUserId, toUserId } = after;
      const db = admin.firestore();
      const fromRef = db.collection('users').doc(fromUserId);
      const toRef = db.collection('users').doc(toUserId);
      await db.runTransaction(async (tx) => {
        const fromSnap = await tx.get(fromRef);
        const toSnap = await tx.get(toRef);
        const fromFriends = Array.isArray(fromSnap.get('friends')) ? fromSnap.get('friends') : [];
        const toFriends = Array.isArray(toSnap.get('friends')) ? toSnap.get('friends') : [];
        if (!fromFriends.includes(toUserId)) fromFriends.push(toUserId);
        if (!toFriends.includes(fromUserId)) toFriends.push(fromUserId);
        tx.update(fromRef, { friends: fromFriends });
        tx.update(toRef, { friends: toFriends });
      });
    }
    return null;
  });
