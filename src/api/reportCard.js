import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseInit';

const reportDeck = httpsCallable(functions, 'reportDeck');

export const REPORT_REASONS = [
  { id: 1, key: 'bullying' },
  { id: 2, key: 'hate' },
  { id: 3, key: 'sex' },
  { id: 4, key: 'violence' },
  { id: 0, key: 'other' },
];

export async function reportStudyCard({ sharedDeckId, localDeckId, cardId, reason, details }) {
  const snap = await getDoc(doc(db, 'shared-decks', sharedDeckId));
  if (!snap.exists()) throw new Error('Could not send this report');
  const ownerId = snap.data()?.ownerId;
  if (!ownerId) throw new Error('Could not send this report');
  await reportDeck({
    localDeckId,
    ownerId,
    reportReason: reason,
    reportDetails: details,
    cardId,
  });
}
