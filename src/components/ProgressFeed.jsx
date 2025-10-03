import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';

export default function ProgressFeed({ challengeId }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'challenges', challengeId, 'progressReports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [challengeId]);

  if (reports.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-400">No progress updates yet</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((r, i) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass rounded-2xl p-6 hover:glass-strong transition-all"
        >
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(r.createdAt?.toDate?.() || Date.now()).toLocaleString()}
          </div>
          
          {r.text && (
            <p className="text-white leading-relaxed whitespace-pre-wrap mb-4">{r.text}</p>
          )}
          
          {r.type === 'media' && r.mediaUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4"
            >
              <img 
                src={r.mediaUrl} 
                alt="progress" 
                className="w-full rounded-xl shadow-lg"
              />
            </motion.div>
          )}
          
          {r.type === 'link' && r.externalUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4"
            >
              <div className="glass rounded-xl overflow-hidden">
                <iframe 
                  src={r.externalUrl} 
                  className="w-full h-80" 
                  allow="autoplay; encrypted-media" 
                  title={`embed-${r.id}`}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
