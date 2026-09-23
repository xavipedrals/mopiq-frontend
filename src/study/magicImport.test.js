import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fileMatchesSource,
  fileTooLarge,
  importJobView,
  magicImportObjectPath,
  magicImportRoute,
  mapImportJob,
  MAX_ANKI_BYTES,
  sourcesForExistingDeck,
  validateNotes,
  validatePrompt,
  validateYouTubeUrl,
} from './magicImport.js';

describe('magic import routing', () => {
  it('sends spreadsheet to the existing importer and every other new-deck source to a job', () => {
    assert.equal(magicImportRoute('sheets'), 'spreadsheet');
    assert.equal(magicImportRoute('anki'), 'job');
    assert.equal(magicImportRoute('pdf'), 'job');
    assert.equal(magicImportRoute('aiPrompt'), 'job');
    assert.equal(magicImportRoute('missing'), 'rejected');
  });

  it('keeps Anki off the add-to-deck list', () => {
    const ids = sourcesForExistingDeck().map((source) => source.id);
    assert.equal(ids.includes('anki'), false);
    assert.equal(ids.includes('sheets'), true);
    assert.equal(magicImportRoute('anki', { existingDeck: true }), 'rejected');
    assert.equal(magicImportRoute('paste', { existingDeck: true }), 'job');
  });
});

describe('magic import jobs', () => {
  it('maps a poll row and treats done with warnings as finished', () => {
    const job = mapImportJob({
      job_id: 'job-1',
      deck_version_id: 'deck-1',
      source_kind: 'pdf',
      status: 'done_with_warnings',
      progress: 100,
      inserted_cards: 12,
      warning_messages: ['short_source'],
      error_code: null,
      error_message: null,
    });
    assert.equal(job.jobId, 'job-1');
    assert.equal(job.insertedCards, 12);
    const view = importJobView(job);
    assert.equal(view.phase, 'done');
    assert.equal(view.finished, true);
    assert.equal(view.warnings, true);
    assert.deepEqual(importJobView({ status: 'queued', progress: 0 }), {
      phase: 'active',
      progress: 0,
      finished: false,
      failed: false,
      warnings: false,
    });
    assert.equal(importJobView({ status: 'failed', progress: 100 }).phase, 'failed');
    assert.equal(importJobView(null).phase, 'missing');
    assert.equal(mapImportJob(null), null);
  });
});

describe('magic import input checks', () => {
  it('matches the server limits for prompts, notes, YouTube, files, and storage paths', () => {
    assert.equal(validatePrompt('short'), 'prompt_too_short');
    assert.equal(validatePrompt('Explain photosynthesis for a quiz'), '');
    assert.equal(validateNotes('too short'), 'notes_too_short');
    assert.equal(validateNotes(`${'n'.repeat(200)}`), '');
    assert.equal(validateYouTubeUrl('https://youtu.be/abcdefghijk'), '');
    assert.equal(validateYouTubeUrl('https://vimeo.com/123'), 'youtube_invalid');
    assert.equal(fileMatchesSource('pdf', 'notes.PDF'), true);
    assert.equal(fileMatchesSource('pdf', 'notes.docx'), false);
    assert.equal(fileMatchesSource('anki', 'deck.apkg'), true);
    assert.equal(fileTooLarge('anki', MAX_ANKI_BYTES + 1), true);
    assert.equal(
      magicImportObjectPath('USER', 'JOB', 'my notes.pdf'),
      'users/user/imports/job/my_notes.pdf',
    );
  });
});
