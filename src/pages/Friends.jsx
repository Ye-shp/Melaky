import React, { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, doc, documentId, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { searchUsersByUsername, sendFriendRequest, acceptFriendRequest, declineFriendRequest } from '../services/friends';

export default function Friends() {
  const { authUser } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [friends, setFriends] = useState([]);

  // Live friend requests
  useEffect(() => {
    if (!authUser) return;
    const incomingQ = query(collection(db, 'friendRequests'), where('toUserId', '==', authUser.uid));
    const outgoingQ = query(collection(db, 'friendRequests'), where('fromUserId', '==', authUser.uid));
    const unsubIn = onSnapshot(incomingQ, (snap) => setIncoming(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubOut = onSnapshot(outgoingQ, (snap) => setOutgoing(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUser = onSnapshot(doc(db, 'users', authUser.uid), (snap) => {
      const data = snap.data();
      setFriendIds(Array.isArray(data?.friends) ? data.friends : []);
    });
    return () => { unsubIn(); unsubOut(); unsubUser(); };
  }, [authUser]);

  // Load friend profiles when friendIds change
  useEffect(() => {
    (async () => {
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
      // Keep same order as friendIds if possible
      profiles.sort((a, b) => friendIds.indexOf(a.id) - friendIds.indexOf(b.id));
      setFriends(profiles);
    })();
  }, [friendIds]);

  const doSearch = async (e) => {
    e.preventDefault();
    const list = await searchUsersByUsername(search);
    const filtered = list.filter((u) => u.id !== authUser.uid && !friendIds.includes(u.id));
    setResults(filtered);
  };

  const sendRequest = async (toUserId) => {
    await sendFriendRequest(authUser.uid, toUserId);
  };

  const acceptRequest = async (req) => {
    await acceptFriendRequest(req.id);
  };

  const declineRequest = async (req) => {
    await declineFriendRequest(req.id);
  };

  const filteredIncoming = useMemo(() => incoming.filter((r) => r.status === 'pending'), [incoming]);
  const filteredOutgoing = useMemo(() => outgoing.filter((r) => r.status === 'pending'), [outgoing]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Friends</h1>

        <form onSubmit={doSearch} className="bg-gray-800 rounded p-4 flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email" className="flex-1 px-3 py-2 bg-gray-700 rounded" />
          <button className="px-4 py-2 bg-blue-600 rounded">Search</button>
        </form>

        {results.length > 0 && (
          <div className="bg-gray-800 rounded p-4">
            <div className="font-semibold mb-2">Results</div>
            <div className="space-y-2">
              {results.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="text-gray-200">{u.username || u.email} <span className="text-xs text-gray-400">({u.email})</span></div>
                  <button onClick={() => sendRequest(u.id)} className="px-3 py-1 bg-gray-700 rounded">Add friend</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded p-4">
            <div className="font-semibold mb-2">Incoming requests</div>
            <div className="space-y-2">
              {filteredIncoming.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="text-gray-200">From: {r.fromUserId}</div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(r)} className="px-3 py-1 bg-green-600 rounded">Accept</button>
                    <button onClick={() => declineRequest(r)} className="px-3 py-1 bg-red-600 rounded">Decline</button>
                  </div>
                </div>
              ))}
              {filteredIncoming.length === 0 && <div className="text-sm text-gray-400">None</div>}
            </div>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <div className="font-semibold mb-2">Outgoing requests</div>
            <div className="space-y-2">
              {filteredOutgoing.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="text-gray-200">To: {r.toUserId}</div>
                  <div className="text-xs text-gray-400 uppercase">{r.status}</div>
                </div>
              ))}
              {filteredOutgoing.length === 0 && <div className="text-sm text-gray-400">None</div>}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded p-4">
          <div className="font-semibold mb-2">Friends</div>
          <div className="space-y-2">
            {friends.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {u.profilePic ? (
                    <img src={u.profilePic} alt="avatar" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs">
                      {(u.username || u.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-gray-200">{u.username || u.email}</div>
                </div>
              </div>
            ))}
            {friends.length === 0 && <div className="text-sm text-gray-400">No friends yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}


