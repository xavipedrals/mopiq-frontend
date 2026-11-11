import { readonly, shallowRef } from 'vue';
import { getCurrentUser, onSessionChange } from '../auth/session';
import { ANKI_DAY_STARTS_AT_HOUR } from '../constants';
import { supabase } from '../supabaseInit';

const snapshot = shallowRef(null);
const failed = shallowRef(false);
let owner;
let inFlight;
let repeatRequested = false;
let pendingReview;
export const streakSnapshot = readonly(snapshot);
export const streakFailed = readonly(failed);

onSessionChange((user) => {
  const next = user?.supabaseUid;
  if (next === owner) return;
  owner = next;
  snapshot.value = null;
  failed.value = false;
  inFlight = undefined;
  repeatRequested = false;
  pendingReview = undefined;
});

function studyDate(saved, reviewedAt) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: saved.timezone, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date(reviewedAt));
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  const day = new Date(Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour - saved.rollover_hour));
  return day.toISOString().slice(0, 10);
}

export function refreshStudyStreak({ reviewedAt, onCelebration, expectedOwner = getCurrentUser()?.supabaseUid } = {}) {
  if (!expectedOwner || expectedOwner !== owner) return;
  const saved = snapshot.value;
  if (reviewedAt && saved?.study_dates.includes(studyDate(saved, reviewedAt))) return;
  if (reviewedAt) pendingReview = { reviewedAt, onCelebration };
  if (inFlight) {
    if (reviewedAt) repeatRequested = true;
    return inFlight;
  }
  failed.value = false;
  const pending = (async () => {
    do {
      repeatRequested = false;
      try {
        const { data, error } = await supabase.rpc('sync_online_study_streak_v3', {
          p_expected_user_id: expectedOwner,
          p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          p_rollover_hour: ANKI_DAY_STARTS_AT_HOUR,
        });
        if (inFlight !== pending) return;
        if (error || !data?.state) throw error || new Error('Missing streak snapshot');
        const previous = snapshot.value;
        const review = pendingReview;
        snapshot.value = data;
        failed.value = false;
        if (review) {
          const day = studyDate(data, review.reviewedAt);
          const count = data.state.current_streak;
          if (day === data.state.as_of_day && data.study_dates.includes(day) &&
              !previous?.study_dates.includes(day) && count > 0) {
            pendingReview = undefined;
            try {
              review.onCelebration?.({ count, isRestart: count === 1 && data.study_dates.length > 1 });
            } catch { /* Presentation cannot affect a confirmed save. */ }
          }
        }
      } catch {
        if (inFlight !== pending) return;
        failed.value = true;
      }
    } while (repeatRequested);
  })().finally(() => {
    if (inFlight === pending) {
      inFlight = undefined;
      pendingReview = undefined;
    }
  });
  inFlight = pending;
  return pending;
}
