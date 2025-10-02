import React, { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { authUser } = useAuth();
  const [all, setAll] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [tab, setTab] = useState('mine');

  useEffect(() => {
    const qy = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qy, (snap) => {
      setAll(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load current user's friend ids for filtering
  useEffect(() => {
    if (!authUser) return;
    const unsub = onSnapshot(doc(db, 'users', authUser.uid), (snap) => {
      const data = snap.data();
      setFriendIds(Array.isArray(data?.friends) ? data.friends : []);
    });
    return () => unsub();
  }, [authUser]);

  const filtered = useMemo(() => {
    if (tab === 'mine') return all.filter((c) => c.challengerId === authUser?.uid || c.challengeeId === authUser?.uid);
    if (tab === 'friends') return all.filter((c) => friendIds.includes(c.challengerId) || friendIds.includes(c.challengeeId));
    return all.filter((c) => c.type === 'self');
  }, [tab, all]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        {/* Onboarding banner removed; gating now enforces completion */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('mine')} className={`px-3 py-1 rounded ${tab==='mine' ? 'bg-gray-700' : 'bg-gray-800'}`}>My Challenges</button>
          <button onClick={() => setTab('friends')} className={`px-3 py-1 rounded ${tab==='friends' ? 'bg-gray-700' : 'bg-gray-800'}`}>Friends’ Challenges</button>
          <button onClick={() => setTab('discover')} className={`px-3 py-1 rounded ${tab==='discover' ? 'bg-gray-700' : 'bg-gray-800'}`}>Discover</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} to={`/challenge/${c.id}`} className="bg-gray-800 rounded p-4 hover:bg-gray-700">
              <div className="font-semibold text-white mb-1">{c.type === 'self' ? 'Self' : 'Friend'} challenge</div>
              <div className="text-gray-300 line-clamp-2">{c.description}</div>
              <div className="text-sm text-gray-400 mt-2">Stake: ${(c.potAmount / 100).toFixed(2)}</div>
              <div className="text-xs text-gray-500 uppercase">{c.status}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


