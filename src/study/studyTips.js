export function tutorialCompleted(storage, userId) {
  try { return Boolean(userId && storage?.getItem(`mopiq.studyTutorial.${userId}`) === 'complete'); }
  catch { return false; }
}
export function completeTutorial(storage, userId) {
  if (!userId) return;
  try { storage?.setItem(`mopiq.studyTutorial.${userId}`, 'complete'); } catch { /* Best effort preference. */ }
}
