import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sharedGenerationRequest, trimGenerationInstructions } from './sharedGeneration.js';
import { mapImportJob } from './magicImport.js';
import { blocksDeckGeneration } from './generationJobs.js';
import { reduceGenerationPoll } from './generationJobs.js';
test('PDF instructions and selected pages travel in canonical request', () => {
  const request = sharedGenerationRequest({ requestId: 'request', source: 'pdf', deckId: 'deck', pages: [3, 9], generationInstructions: '  Compare cell types.  ', preferredLanguage: 'es' });
  assert.equal(request.generationInstructions, 'Compare cell types.');
  assert.deepEqual(request.pages, [3, 9]); assert.equal(request.mode, 'extract'); assert.equal(request.preferredLanguage, 'es');
});
test('instructions limit matches Swift grapheme counting', () => {
  const emoji = '👩🏽‍⚕️'; assert.equal(trimGenerationInstructions(emoji.repeat(1001)), emoji.repeat(1000));
});
test('blank guidance preserves default behavior', () => assert.equal(sharedGenerationRequest({ source: 'pdf', generationInstructions: '\n ' }).generationInstructions, ''));
test('existing deck requests retain their destination folder', () => {
  const request = sharedGenerationRequest({ source: 'paste', deckId: 'deck', targetSubdeckId: 123 });
  assert.equal(request.deckVersionId, 'deck'); assert.equal(request.targetSubdeckId, 123);
});
test('YouTube URL remains a server source rather than client transcript', () => {
  const r = sharedGenerationRequest({ source: 'youtube', text: 'https://youtu.be/abcdefghijk' });
  assert.equal(r.url, 'https://youtu.be/abcdefghijk'); assert.equal(r.text, '');
});
test('shared jobs never hide saved deck content while generating', () => {
  const job = mapImportJob({ id: 'job', deck_version_id: 'deck', recipe_version: 'app-2026-10-19.1', status: 'generating', inserted_cards: 12, revision: 3 });
  assert.equal(job.jobId, 'job'); assert.equal(job.revision, 3); assert.equal(blocksDeckGeneration(job), false);
});
test('paused shared jobs keep their state without repeated deck reloads', () => {
  const jobs = [{ jobId: 'job', deckId: 'deck', userId: 'owner', pipeline: 'shared', status: 'generating', revision: 1, insertedCards: 12, errorMessage: '' }];
  const paused = reduceGenerationPoll(jobs, 'job', { status: 'paused', revision: 1, insertedCards: 12 });
  assert.equal(paused.jobs[0].status, 'paused');
  assert.equal(blocksDeckGeneration(paused.jobs[0]), false);
  assert.equal(reduceGenerationPoll(paused.jobs, 'job', { status: 'paused', revision: 1, insertedCards: 12 }).changed, false);
});
