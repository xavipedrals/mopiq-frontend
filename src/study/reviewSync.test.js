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

import { deckReviewSync, assertReviewSyncResults } from './reviewSync.js';

describe('deck review queues across navigation', () => {
  it('keeps unresolved saves accessible from the dashboard and retries them', async () => {
    let fail = true;
    const options = {
      userId: 'navigation-user', deckId: 'deck', currentUserId: () => 'navigation-user',
      maxAttempts: 1, backoffMs: [0],
      submit: async () => { if (fail) throw new Error('offline'); },
    };
    const study = deckReviewSync(options);
    study.enqueue({ id: 1 });
    await study.flush();
    const dashboard = deckReviewSync(options);
    assert.equal(dashboard, study);
    assert.equal(dashboard.pendingCount(), 1);
    assert.equal(dashboard.getError(), 'offline');
    fail = false;
    dashboard.retry();
    await dashboard.flush();
    assert.equal(dashboard.pendingCount(), 0);
  });

  it('does not submit a previous account’s pending review under another account', async () => {
    let current = 'old-account';
    let submissions = 0;
    const old = deckReviewSync({
      userId: current, deckId: 'isolated-deck', currentUserId: () => current,
      submit: async () => { submissions += 1; }, maxAttempts: 1, backoffMs: [0],
    });
    current = 'new-account';
    old.enqueue({ id: 2 });
    await old.flush();
    assert.equal(submissions, 0);
    assert.equal(old.pendingCount(), 1);
    const fresh = deckReviewSync({ userId: current, deckId: 'isolated-deck', currentUserId: () => current, submit: async () => {} });
    assert.equal(fresh.pendingCount(), 0);
    assert.notEqual(old, fresh);
  });

  it('requires acknowledgment for both card state and review log', () => {
    assert.throws(() => assertReviewSyncResults([]));
    assert.throws(() => assertReviewSyncResults([{ id: 1, status: 'ok' }]));
    assert.throws(() => assertReviewSyncResults([{ id: 1, status: 'ok' }, { id: 2, status: 'error' }]));
    assert.doesNotThrow(() => assertReviewSyncResults([
      { id: 1, status: 'ok', data: { applied: 'false' } }, { id: 2, status: 'ok' },
    ]));
  });
});
