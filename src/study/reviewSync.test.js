import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createReviewSyncQueue } from './reviewSync.js';

function waitFor(queue, predicate, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop();
      reject(new Error('timed out waiting for queue state'));
    }, timeoutMs);
    const stop = queue.subscribe((state) => {
      if (predicate(state)) {
        clearTimeout(timer);
        stop();
        resolve(state);
      }
    });
  });
}

describe('reviewSync queue', () => {
  it('saves in order without the caller awaiting', async () => {
    const seen = [];
    const queue = createReviewSyncQueue({
      submit: async (job) => {
        seen.push(job.id);
      },
      sleep: async () => {},
    });
    queue.enqueue({ id: 'a' });
    queue.enqueue({ id: 'b' });
    await waitFor(queue, (state) => state.pending === 0);
    assert.deepEqual(seen, ['a', 'b']);
  });

  it('retries a failed save then continues', async () => {
    let calls = 0;
    const queue = createReviewSyncQueue({
      maxAttempts: 3,
      backoffMs: [0, 0, 0],
      sleep: async () => {},
      submit: async () => {
        calls += 1;
        if (calls < 3) throw new Error('network');
      },
    });
    queue.enqueue({ id: 1 });
    await waitFor(queue, (state) => state.pending === 0);
    assert.equal(calls, 3);
    assert.equal(queue.getError(), '');
  });

  it('pauses and surfaces an error after retries are exhausted', async () => {
    const queue = createReviewSyncQueue({
      maxAttempts: 2,
      backoffMs: [0, 0],
      sleep: async () => {},
      submit: async () => {
        throw new Error('offline');
      },
    });
    queue.enqueue({ id: 1 });
    const failed = await waitFor(queue, (state) => Boolean(state.error) && !state.pumping);
    assert.equal(failed.error, 'offline');
    assert.equal(queue.pendingCount(), 1);
  });

  it('retry() resumes a paused queue', async () => {
    let calls = 0;
    const queue = createReviewSyncQueue({
      maxAttempts: 1,
      backoffMs: [0],
      sleep: async () => {},
      submit: async () => {
        calls += 1;
        if (calls === 1) throw new Error('offline');
      },
    });
    queue.enqueue({ id: 1 });
    await waitFor(queue, (state) => state.error === 'offline' && !state.pumping);
    queue.retry();
    await waitFor(queue, (state) => state.pending === 0);
    assert.equal(calls, 2);
    assert.equal(queue.getError(), '');
  });
});
