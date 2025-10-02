import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

export async function addProgressReport(challengeId, userId, { text, file, externalUrl }) {
  let mediaUrl = '';
  if (file) {
    const storage = getStorage();
    const storageRef = ref(storage, `progress/${challengeId}/${file.name}`);
    await uploadBytes(storageRef, file);
    mediaUrl = await getDownloadURL(storageRef);
  }
  const reportsRef = collection(db, 'challenges', challengeId, 'progressReports');
  await addDoc(reportsRef, {
    userId,
    type: externalUrl ? 'link' : file ? 'media' : 'text',
    text: text || '',
    mediaUrl,
    externalUrl: externalUrl || '',
    createdAt: serverTimestamp(),
  });
}


