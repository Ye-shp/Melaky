import React, { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { collection, doc, documentId, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { searchUsersByUsername, sendFriendRequest, acceptFriendRequest, declineFriendRequest } from '../services/friends';
import { motion, AnimatePresence } from 'framer-motion';

export default function Friends() {
  const { authUser } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [friends, setFriends] = useState([]);

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
    <div className="min-h-screen bg-gray-950 text-white">
      <TopNav />
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-5xl font-bold mb-2 text-gradient-blue">Friends</h1>
          <p className="text-gray-400 text-lg mb-8">Connect and challenge your friends</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={doSearch}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="flex gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="flex-1 px-4 py-3 glass rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-gray-500"
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold shadow-xl"
            >
              Search
            </motion.button>
          </div>
        </motion.form>

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-strong rounded-3xl p-6"
            >
              <h2 className="text-xl font-bold mb-4">Search Results</h2>
              <div className="space-y-3">
                {results.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 glass rounded-2xl hover:glass-strong transition-all"
                  >
                    <div>
                      <div className="font-medium text-white">{u.username || u.email}</div>
                      <div className="text-sm text-gray-400">{u.email}</div>
                    </div>
                    <motion.button
                      onClick={() => sendRequest(u.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 glass-strong rounded-xl font-medium hover:bg-white/15 transition-colors"
                    >
                      Add friend
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-strong rounded-3xl p-6"
          >
            <h2 className="text-xl font-bold mb-4">Incoming requests</h2>
            <div className="space-y-3">
              {filteredIncoming.length > 0 ? (
                filteredIncoming.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 glass rounded-2xl"
                  >
                    <div className="text-gray-200">From: {r.fromUserId}</div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => acceptRequest(r)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors"
                      >
                        Accept
                      </motion.button>
                      <motion.button
                        onClick={() => declineRequest(r)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-medium transition-colors"
                      >
                        Decline
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">No incoming requests</div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="glass-strong rounded-3xl p-6"
          >
            <h2 className="text-xl font-bold mb-4">Outgoing requests</h2>
            <div className="space-y-3">
              {filteredOutgoing.length > 0 ? (
                filteredOutgoing.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 glass rounded-2xl"
                  >
                    <div className="text-gray-200">To: {r.toUserId}</div>
                    <div className="text-xs text-gray-400 uppercase px-3 py-1 glass rounded-full">{r.status}</div>
                  </motion.div>
                ))
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">No outgoing requests</div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="glass-strong rounded-3xl p-6"
        >
          <h2 className="text-xl font-bold mb-4">Your Friends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.length > 0 ? (
              friends.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="flex items-center gap-3 p-4 glass rounded-2xl hover:glass-strong transition-all"
                >
                  {u.profilePic ? (
                    <img src={u.profilePic} alt="avatar" className="h-12 w-12 rounded-full ring-2 ring-white/20" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ring-2 ring-white/20">
                      {(u.username || u.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white">{u.username || u.email}</div>
                    <div className="text-xs text-gray-400">Friend</div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-sm text-gray-400 text-center py-8">No friends yet</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
