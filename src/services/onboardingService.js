import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export async function generateIntakeSuggestions(answers, source = 'manual') {
  const fn = httpsCallable(functions, 'generateIntakeSuggestions');
  const { data } = await fn({ answers, source });
  return data; // { id, aiSummary }
}


