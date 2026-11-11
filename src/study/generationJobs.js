import { importJobView, POLL_INTERVAL_MS } from './magicImport.js';
import { trackProductEvent } from '../analytics.js';

// Only observe jobs started by this browser. Never attribute restored jobs from
// another platform or emit identifiers to Analytics.
const observedPdfJobs = new Set();
export function observePdfStart(job) {
  if (Number(job?.insertedCards) > 0) {
    void trackProductEvent('pdf_cards_available');
  } else if (job.jobId && currentUserId) {
    if (observedPdfJobs.size === 200) observedPdfJobs.delete(observedPdfJobs.values().next().value);
    observedPdfJobs.add(job.jobId);
  }
}
export function observePdfProgress(jobId, job) {
  if (!observedPdfJobs.has(jobId)) return;
  if (Number(job?.insertedCards) > 0) {
    observedPdfJobs.delete(jobId);
    void trackProductEvent('pdf_cards_available');
  } else if (importJobView(job).finished || job?.status === 'cancelled') {
    observedPdfJobs.delete(jobId);
  }
}

const STORAGE_KEY = 'mopiq.generationJobs';
const STATUSES = new Set(['queued', 'generating', 'failed', 'paused', 'cancelled', 'done', 'done_with_warnings']);

let jobs = [];
const additionalSubmissions = new Map();
let currentUserId = '';
let listeners = new Set();
let pollHooks = null;
let pollTimer = 0;
let polling = false;
let pollAgain = false;
let storageOverride = null;
let settledSharedJobs = new Set();

function browserStorage() {
  if (storageOverride) return storageOverride;
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function normalizeGenerationJob(input) {
  const jobId = String(input?.jobId || '');
  const deckId = String(input?.deckId || '');
  const userId = String(input?.userId || '');
  const status = STATUSES.has(input?.status) ? input.status : '';
  if (!jobId || !deckId || !userId || !status) return null;
  return {
    jobId,
    deckId,
    userId,
    status,
    revision: Number(input?.revision) || 0,
    ...(input?.additional ? { additional: true } : {}),
    ...(Number(input?.progress) > 0 ? { progress: Math.min(100, Number(input.progress)) } : {}),
    insertedCards: Number(input?.insertedCards) || 0,
    pipeline: input?.pipeline || 'legacy',
    errorMessage: String(input?.errorMessage || '').slice(0, 300),
  };
}

export function generationPhase(job) {
  if (!job) return '';
  if (job.status === 'queued' || job.status === 'generating') return 'active';
  if (job.status === 'failed') return 'failed';
  return '';
}

export function blocksDeckGeneration(job) {
  if (job?.pipeline === 'shared' || job?.additional) return false;
  const phase = generationPhase(job);
  return phase === 'active' || phase === 'failed';
}

export function generationForDeck(list, deckId) {
  const id = String(deckId || '');
  if (!id) return null;
  return (list || []).find((job) => job.deckId === id && !job.additional) || null;
}

export function additionalGenerationForDeck(list, deckId) {
  const matching = list.filter(job => job.additional && job.deckId === deckId);
  return matching.find(job => generationPhase(job) === 'active')
    || matching.find(job => job.status === 'failed' || job.status === 'paused') || null;
}

export function upsertGenerationJob(list, input) {
  const next = normalizeGenerationJob(input);
  if (!next) return list || [];
  return [next, ...(list || []).filter((job) => job.jobId !== next.jobId && (next.additional || job.additional || job.deckId !== next.deckId))];
}

export function loadGenerationJobs(store, userId) {
  const id = String(userId || '');
  if (!store || !id) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((job) => job?.userId === id)
      .map((job) => normalizeGenerationJob(job))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function saveGenerationJobs(store, userId, list) {
  const id = String(userId || '');
  if (!store || !id) return;
  let existing = [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    existing = [];
  }
  const rest = existing.filter((job) => job?.userId && job.userId !== id);
  const mine = (list || [])
    .map((job) => normalizeGenerationJob({ ...job, userId: id }))
    .filter(Boolean);
  try {
    store.setItem(STORAGE_KEY, JSON.stringify([...rest, ...mine]));
  } catch {
    // The deck still shows for this page load when storage is blocked.
  }
}

export function reduceGenerationPoll(list, jobId, polled) {
  const current = (list || []).find((job) => job.jobId === jobId);
  if (!current) {
    return { jobs: list || [], outcome: 'missing', deckId: '', changed: false };
  }
  const view = importJobView(polled);
  if (view.phase === 'active') {
    const status = polled?.status === 'generating' ? 'generating' : 'queued';
    const revision = Number(polled?.revision ?? current.revision) || 0;
    const progress = Math.max(0, Math.min(100, Number(polled?.progress ?? current.progress) || 0));
    const insertedCards = Number(polled?.insertedCards ?? current.insertedCards) || 0;
    const additionalChanged = current.additional
      && (progress !== (current.progress || 0) || insertedCards !== (current.insertedCards || 0));
    if (status === current.status && revision === (current.revision || 0) && !additionalChanged) {
      return { jobs: list, outcome: 'active', deckId: current.deckId, changed: false };
    }
    return {
      jobs: list.map((job) => (job.jobId === jobId ? { ...job, status, revision, insertedCards, progress } : job)),
      outcome: 'active',
      deckId: current.deckId,
      changed: true,
    };
  }
  if (view.phase === 'failed') {
    const status = current.pipeline === 'shared' && STATUSES.has(polled?.status) ? polled.status : 'failed';
    const revision = Number(polled?.revision) || 0;
    const errorMessage = String(polled?.errorMessage || '').slice(0, 300);
    if (current.status === status && current.revision === revision && current.errorMessage === errorMessage) {
      return { jobs: list, outcome: 'failed', deckId: current.deckId, changed: false };
    }
    return {
      jobs: list.map((job) => (job.jobId === jobId ? {
        ...job,
        status, revision, errorMessage,
        insertedCards: Number(polled?.insertedCards) || current.insertedCards,
      } : job)),
      outcome: 'failed',
      deckId: current.deckId,
      changed: true,
    };
  }
  return {
    jobs: list.filter((job) => job.jobId !== jobId),
    outcome: view.phase === 'done' ? 'done' : 'missing',
    deckId: current.deckId,
    changed: true,
  };
}

function persistJobs() {
  saveGenerationJobs(browserStorage(), currentUserId, jobs);
}

function emitJobs() {
  const snapshot = jobs.slice();
  const submissions = new Map(additionalSubmissions);
  for (const listener of listeners) listener(snapshot, submissions);
}

export function bindGenerationUser(userId) {
  const nextUserId = String(userId || '');
  if (nextUserId !== currentUserId) {
    additionalSubmissions.clear();
    observedPdfJobs.clear();
  }
  currentUserId = nextUserId;
  settledSharedJobs = new Set();
  jobs = loadGenerationJobs(browserStorage(), currentUserId);
  emitJobs();
}

export function subscribeGenerationJobs(listener) {
  listeners.add(listener);
  listener(jobs.slice(), new Map(additionalSubmissions));
  return () => listeners.delete(listener);
}

export function trackGenerationJob(input) {
  const job = normalizeGenerationJob({
    ...input,
    userId: input?.userId || currentUserId,
    status: input?.status || 'queued',
  });
  if (!job) return null;
  jobs = upsertGenerationJob(jobs, job);
  persistJobs();
  emitJobs();
  void pollGenerationJobs();
  return job;
}

// AddDeckViewPager.runAIGeneration. The submission belongs to the signed-in
// job tracker, so closing the editor or changing routes cannot lose a receipt.
export function submitAdditionalGeneration(deckId, start, formatError) {
  const owner = currentUserId;
  if (!owner || !deckId || additionalSubmissions.get(deckId)?.submitting) return false;
  const submission = { submitting: true, startedAt: Date.now() };
  additionalSubmissions.set(deckId, submission);
  emitJobs();
  const isCurrent = () => owner === currentUserId && additionalSubmissions.get(deckId) === submission;
  void (async () => {
    try {
      const result = await start(isCurrent);
      if (!isCurrent()) return;
      if (!result || result.deckId !== deckId) throw new Error('Unexpected generation destination');
      if (result.jobId) trackGenerationJob({ ...result, additional: true, userId: owner });
      additionalSubmissions.delete(deckId);
    } catch (error) {
      if (!isCurrent()) return;
      additionalSubmissions.set(deckId, { ...submission, submitting: false, error: formatError(error) });
    }
    emitJobs();
  })();
  return true;
}

export function dismissGenerationJob(deckId) {
  const id = String(deckId || '');
  if (!id) return;
  const next = jobs.filter((job) => job.deckId !== id);
  if (next.length === jobs.length) return;
  jobs = next;
  persistJobs();
  emitJobs();
}

async function pollGenerationJobs() {
  if (!pollHooks) return;
  if (polling) {
    pollAgain = true;
    return;
  }
  polling = true;
  try {
    do {
      pollAgain = false;
      if (pollHooks?.fetchJobs) {
        try {
          const owner = currentUserId;
          const hooks = pollHooks;
          const remote = await hooks.fetchJobs();
          if (hooks !== pollHooks || owner !== currentUserId) return;
          for (const row of remote) {
            if (settledSharedJobs.has(`${row.jobId}:${row.revision}`)) continue;
            const normalized = normalizeGenerationJob({ ...row, userId: currentUserId });
            if (normalized && !jobs.some(j => j.jobId === normalized.jobId)) jobs = upsertGenerationJob(jobs, normalized);
            else if (normalized?.pipeline === 'shared') jobs = jobs.map(j => j.jobId === normalized.jobId ? { ...j, pipeline: 'shared' } : j);
          }
          persistJobs(); emitJobs();
        } catch { /* Migration may not be deployed yet. Keep legacy jobs. */ }
      }
      const active = jobs.filter((job) => job.status === 'queued' || job.status === 'generating' || job.pipeline === 'shared');
      for (const job of active) {
        const hooks = pollHooks;
        const owner = currentUserId;
        if (!hooks) return;
        let polled = null;
        try {
          polled = await hooks.fetchJob(job.jobId);
        } catch {
          continue;
        }
        if (hooks !== pollHooks || owner !== currentUserId) return;
        observePdfProgress(job.jobId, polled);
        const result = reduceGenerationPoll(jobs, job.jobId, polled);
        if (!result.changed) continue;
        if (result.outcome === 'done' || result.outcome === 'missing'
          || (result.outcome === 'active' && !job.additional)) {
          try {
            await hooks.onSettled?.(result);
          } catch {
            continue; // Keep the receipt until the committed deck refresh succeeds.
          }
        }
        if (hooks !== pollHooks || owner !== currentUserId) return;
        if (result.outcome === 'done' && job.pipeline === 'shared') settledSharedJobs.add(`${job.jobId}:${polled?.revision || job.revision}`);
        jobs = reduceGenerationPoll(jobs, job.jobId, polled).jobs;
        persistJobs();
        emitJobs();
        if (result.outcome === 'failed' && pollHooks) {
          try {
            await hooks.onSettled?.(result);
          } catch {
            // The failed row is already visible.
          }
        }
      }
    } while (pollAgain);
  } finally {
    polling = false;
  }
}

export function startGenerationPolling({ fetchJob, fetchJobs, onSettled, intervalMs = POLL_INTERVAL_MS } = {}) {
  if (!fetchJob) return stopGenerationPolling;
  pollHooks = { fetchJob, fetchJobs, onSettled };
  if (!pollTimer) {
    void pollGenerationJobs();
    pollTimer = setInterval(() => {
      void pollGenerationJobs();
    }, intervalMs);
  }
  return stopGenerationPolling;
}

export function stopGenerationPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = 0;
  pollHooks = null;
  pollAgain = false;
}

export function resetGenerationJobsForTests(store = null) {
  stopGenerationPolling();
  jobs = [];
  additionalSubmissions.clear();
  currentUserId = '';
  listeners = new Set();
  observedPdfJobs.clear();
  storageOverride = store;
  polling = false;
  pollAgain = false;
}
