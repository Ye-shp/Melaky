import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function ProgressFeed({ challengeId }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'challenges', challengeId, 'progressReports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [challengeId]);

  return (
    <div className="space-y-4">
      {reports.map((r) => (
        <div key={r.id} className="bg-gray-800 rounded p-4">
          <div className="text-xs text-gray-400 mb-2">{new Date(r.createdAt?.toDate?.() || Date.now()).toLocaleString()}</div>
          {r.text && <div className="text-gray-200 whitespace-pre-wrap">{r.text}</div>}
          {r.type === 'media' && r.mediaUrl && (
            <div className="mt-2">
              <img src={r.mediaUrl} alt="progress" className="w-full rounded" />
            </div>
          )}
          {r.type === 'link' && r.externalUrl && (
            <div className="mt-2">
              <iframe src={r.externalUrl} className="w-full h-64 rounded" allow="autoplay; encrypted-media" title={`embed-${r.id}`} />
            </div>
          )}
        </div>
      ))}
      {reports.length === 0 && <div className="text-sm text-gray-400">No progress yet</div>}
    </div>
  );
}


