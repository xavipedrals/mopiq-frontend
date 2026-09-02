const DEFAULT_BACKOFF_MS = [0, 800, 2000];

export function createReviewSyncQueue({
  submit,
  maxAttempts = 3,
  backoffMs = DEFAULT_BACKOFF_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (typeof submit !== 'function') {
    throw new Error('createReviewSyncQueue requires submit');
  }

  const pending = [];
  const listeners = new Set();
  let pumping = false;
  let error = '';

  function snapshot() {
    return {
      pending: pending.length,
      pumping,
      error,
    };
  }

  function notify() {
    const state = snapshot();
    for (const listener of listeners) listener(state);
  }

  function delayForAttempt(attempt) {
    const index = Math.min(Math.max(attempt, 0), backoffMs.length - 1);
    return backoffMs[index] ?? 0;
  }

  async function runJob(job) {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const wait = delayForAttempt(attempt);
      if (wait > 0) await sleep(wait);
      try {
        await submit(job);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Could not save this review');
  }

  async function pump() {
    if (pumping) return;
    pumping = true;
    notify();
    while (pending.length) {
      const job = pending[0];
      try {
        error = '';
        notify();
        await runJob(job);
        pending.shift();
        notify();
      } catch (err) {
        error = err?.message || 'Could not save this review';
        pumping = false;
        notify();
        return;
      }
    }
    pumping = false;
    notify();
  }

  return {
    enqueue(job) {
      pending.push(job);
      notify();
      void pump();
    },
    retry() {
      error = '';
      notify();
      void pump();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    pendingCount() {
      return pending.length;
    },
    getError() {
      return error;
    },
    flush() {
      if (!pending.length) return Promise.resolve();
      if (!pumping) void pump();
      return new Promise((resolve) => {
        const stop = this.subscribe((state) => {
          if (state.pending === 0 || (state.error && !state.pumping)) {
            stop();
            resolve();
          }
        });
      });
    },
  };
}
