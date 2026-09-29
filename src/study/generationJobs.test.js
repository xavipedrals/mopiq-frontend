import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  bindGenerationUser,
  blocksDeckGeneration,
  dismissGenerationJob,
  generationForDeck,
  generationPhase,
  loadGenerationJobs,
  reduceGenerationPoll,
  resetGenerationJobsForTests,
  saveGenerationJobs,
  startGenerationPolling,
  subscribeGenerationJobs,
  trackGenerationJob,
} from './generationJobs.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

describe('generation job state', () => {
  it('keeps one job per deck and hides the deck until generation settles', () => {
    const queued = {
      jobId: 'job-1',
      deckId: 'deck-1',
      userId: 'user-1',
      status: 'queued',
      errorMessage: '',
    };
    const jobs = [queued];
    assert.equal(generationPhase(queued), 'active');
    assert.equal(blocksDeckGeneration(queued), true);
    assert.equal(generationForDeck(jobs, 'deck-1'), queued);

    const generating = reduceGenerationPoll(jobs, 'job-1', { status: 'generating', progress: 40 });
    assert.equal(generating.changed, true);
    assert.equal(generating.jobs[0].status, 'generating');
    assert.equal(blocksDeckGeneration(generating.jobs[0]), true);

    const same = reduceGenerationPoll(generating.jobs, 'job-1', { status: 'generating', progress: 80 });
    assert.equal(same.changed, false);
    assert.equal(same.jobs, generating.jobs);

    const done = reduceGenerationPoll(generating.jobs, 'job-1', { status: 'done', progress: 100 });
    assert.equal(done.outcome, 'done');
    assert.deepEqual(done.jobs, []);

    const failed = reduceGenerationPoll(jobs, 'job-1', {
      status: 'failed',
      errorMessage: 'The model stopped',
    });
    assert.equal(failed.outcome, 'failed');
    assert.equal(failed.jobs[0].errorMessage, 'The model stopped');
    assert.equal(generationPhase(failed.jobs[0]), 'failed');
    assert.equal(blocksDeckGeneration(failed.jobs[0]), true);
  });

  it('stores each account separately and drops a job that disappears', () => {
    const store = memoryStorage();
    saveGenerationJobs(store, 'user-1', [{
      jobId: 'job-1',
      deckId: 'deck-1',
      userId: 'user-1',
      status: 'generating',
    }]);
    saveGenerationJobs(store, 'user-2', [{
      jobId: 'job-2',
      deckId: 'deck-2',
      userId: 'user-2',
      status: 'failed',
      errorMessage: 'nope',
    }]);
    assert.equal(loadGenerationJobs(store, 'user-1')[0].jobId, 'job-1');
    assert.equal(loadGenerationJobs(store, 'user-2')[0].status, 'failed');
    assert.deepEqual(loadGenerationJobs(store, 'user-3'), []);

    const missing = reduceGenerationPoll(loadGenerationJobs(store, 'user-1'), 'job-1', null);
    assert.equal(missing.outcome, 'missing');
    assert.deepEqual(missing.jobs, []);
  });
});

describe('generation job polling', { concurrency: false }, () => {
  afterEach(() => {
    resetGenerationJobsForTests(null);
  });

  it('refreshes the deck list before clearing a finished prompt job', async () => {
    const store = memoryStorage();
    resetGenerationJobsForTests(store);
    bindGenerationUser('user-1');
    const seen = [];
    subscribeGenerationJobs((next) => seen.push(next.map((job) => job.status)));
    trackGenerationJob({ jobId: 'job-1', deckId: 'deck-1', status: 'queued' });

    let jobsAtRefresh = null;
    let releaseRefresh;
    const refreshed = new Promise((resolve) => {
      releaseRefresh = resolve;
    });
    const stop = startGenerationPolling({
      fetchJob: async () => ({ status: 'done', progress: 100 }),
      onSettled: () => {
        jobsAtRefresh = generationForDeck(
          loadGenerationJobs(store, 'user-1'),
          'deck-1',
        );
        releaseRefresh();
      },
    });
    await refreshed;
    await Promise.resolve();
    stop();

    assert.equal(jobsAtRefresh.status, 'queued');
    assert.equal(generationForDeck(loadGenerationJobs(store, 'user-1'), 'deck-1'), null);
    assert.deepEqual(seen.at(-1), []);
  });

  it('removes a failed prompt from the deck when the user opens it anyway', () => {
    const store = memoryStorage();
    resetGenerationJobsForTests(store);
    bindGenerationUser('user-1');
    trackGenerationJob({ jobId: 'job-1', deckId: 'deck-1', status: 'failed' });
    dismissGenerationJob('deck-1');
    assert.equal(loadGenerationJobs(store, 'user-1').length, 0);
  });
});
