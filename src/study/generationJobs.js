import { importJobView, POLL_INTERVAL_MS } from './magicImport.js';

const STORAGE_KEY = 'mopiq.generationJobs';
const STATUSES = new Set(['queued', 'generating', 'failed']);

let jobs = [];
let currentUserId = '';
let listeners = new Set();
let pollHooks = null;
let pollTimer = 0;
let polling = false;
let pollAgain = false;
let storageOverride = null;

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
  const phase = generationPhase(job);
  return phase === 'active' || phase === 'failed';
}

export function generationForDeck(list, deckId) {
  const id = String(deckId || '');
  if (!id) return null;
  return (list || []).find((job) => job.deckId === id) || null;
}

export function upsertGenerationJob(list, input) {
  const next = normalizeGenerationJob(input);
  if (!next) return list || [];
  return [next, ...(list || []).filter((job) => job.jobId !== next.jobId && job.deckId !== next.deckId)];
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
    if (status === current.status) {
      return { jobs: list, outcome: 'active', deckId: current.deckId, changed: false };
    }
    return {
      jobs: list.map((job) => (job.jobId === jobId ? { ...job, status } : job)),
      outcome: 'active',
      deckId: current.deckId,
      changed: true,
    };
  }
  if (view.phase === 'failed') {
    return {
      jobs: list.map((job) => (job.jobId === jobId ? {
        ...job,
        status: 'failed',
        errorMessage: String(polled?.errorMessage || '').slice(0, 300),
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
  for (const listener of listeners) listener(snapshot);
}

export function bindGenerationUser(userId) {
  currentUserId = String(userId || '');
  jobs = loadGenerationJobs(browserStorage(), currentUserId);
  emitJobs();
}

export function subscribeGenerationJobs(listener) {
  listeners.add(listener);
  listener(jobs.slice());
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
      const active = jobs.filter((job) => job.status === 'queued' || job.status === 'generating');
      for (const job of active) {
        const hooks = pollHooks;
        if (!hooks) return;
        let polled = null;
        try {
          polled = await hooks.fetchJob(job.jobId);
        } catch {
          continue;
        }
        if (!pollHooks) return;
        const result = reduceGenerationPoll(jobs, job.jobId, polled);
        if (!result.changed) continue;
        if (result.outcome === 'done' || result.outcome === 'missing') {
          try {
            await hooks.onSettled?.(result);
          } catch {
            // Drop the local job anyway so the row can show the finished deck.
          }
        }
        jobs = result.jobs;
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

export function startGenerationPolling({ fetchJob, onSettled, intervalMs = POLL_INTERVAL_MS } = {}) {
  if (!fetchJob) return stopGenerationPolling;
  pollHooks = { fetchJob, onSettled };
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
  currentUserId = '';
  listeners = new Set();
  storageOverride = store;
  polling = false;
  pollAgain = false;
}
