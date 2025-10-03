import React, { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
  }, [tab, all, authUser, friendIds]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TopNav />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-5xl font-bold mb-2 text-gradient-blue">Dashboard</h1>
          <p className="text-gray-400 text-lg mb-8">Track your progress and see what your friends are up to</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex gap-3 mb-8 flex-wrap"
        >
          {['mine', 'friends', 'discover'].map((t, i) => (
            <motion.button
              key={t}
              onClick={() => setTab(t)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`px-6 py-3 rounded-2xl font-semibold capitalize transition-all duration-300 ${
                tab === t 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl' 
                  : 'glass hover:glass-strong'
              }`}
            >
              {t === 'mine' ? 'My Challenges' : t === 'friends' ? "Friends' Challenges" : 'Discover'}
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full text-center py-20"
              >
                <div className="glass-strong rounded-3xl p-12 max-w-md mx-auto">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold mb-2">No challenges yet</h3>
                  <p className="text-gray-400 mb-6">Create your first challenge and start your journey</p>
                  <Link to="/create">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold"
                    >
                      Create Challenge
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              filtered.map((c, i) => (
                <ChallengeCard key={c.id} challenge={c} index={i} />
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChallengeCard({ challenge, index }) {
  const statusColors = {
    active: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    pending: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    completed: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
    awaiting_verification: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    failed: 'from-red-500/20 to-pink-500/20 border-red-500/30'
  };

  const statusColor = statusColors[challenge.status] || statusColors.active;

  return (
    <Link to={`/challenge/${challenge.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        whileHover={{ scale: 1.03, y: -8 }}
        whileTap={{ scale: 0.98 }}
        className="group h-full"
      >
        <div className={`glass rounded-3xl p-6 h-full relative overflow-hidden hover:glass-strong transition-all duration-300 border ${statusColor}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold glass-strong">
                {challenge.type === 'self' ? 'Self' : 'Friend'} Challenge
              </span>
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" />
            </div>

            <p className="text-white text-lg font-medium mb-4 line-clamp-2 group-hover:text-blue-300 transition-colors">
              {challenge.description}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Stake</span>
                <span className="font-semibold text-white">${(challenge.potAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="font-semibold text-white capitalize">{challenge.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </motion.div>
    </Link>
  );
}
