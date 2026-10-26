const STEPS = ['recall','rating','scheduled','complete'];
export function readStudyTips(storage, userId) {
  if (!userId) return 'complete';
  try { const stage = storage?.getItem(`mopiq.studyTips.${userId}`); return STEPS.includes(stage) ? stage : 'recall'; }
  catch { return 'recall'; }
}
export function writeStudyTips(storage, userId, stage) {
  if (!userId || !STEPS.includes(stage)) return;
  try { storage?.setItem(`mopiq.studyTips.${userId}`, stage); } catch { /* The tutorial remains usable when storage is blocked. */ }
}

export function tutorialCompleted(storage, userId) {
  try { return Boolean(userId && storage?.getItem(`mopiq.studyTutorial.${userId}`) === 'complete'); }
  catch { return false; }
}
export function completeTutorial(storage, userId) {
  if (!userId) return;
  try { storage?.setItem(`mopiq.studyTutorial.${userId}`, 'complete'); } catch { /* Best effort preference. */ }
}
