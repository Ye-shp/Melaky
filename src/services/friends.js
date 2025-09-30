import { db } from '../firebase';
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

// Prefix search on usernameLower
export async function searchUsersByUsername(term, { max = 10 } = {}) {
  const needle = (term || '').trim().toLowerCase();
  if (needle.length < 2) return [];
  const usersCol = collection(db, 'users');
  const q = query(
    usersCol,
    where('usernameLower', '>=', needle),
    where('usernameLower', '<=', needle + '\uf8ff'),
    orderBy('usernameLower'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function sendFriendRequest(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;
  const reqId = `${currentUserId}_${targetUserId}`;
  await setDoc(doc(db, 'friendRequests', reqId), {
    fromUserId: currentUserId,
    toUserId: targetUserId,
    status: 'pending',
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function acceptFriendRequest(requestId) {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted', updatedAt: serverTimestamp() });
}

export async function declineFriendRequest(requestId) {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined', updatedAt: serverTimestamp() });
}


