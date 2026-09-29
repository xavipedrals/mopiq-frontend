import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  backgroundsPromptDeck,
  fileMatchesSource,
  fileTooLarge,
  importJobView,
  isFileDropSource,
  MAGIC_SOURCES,
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
  it('sends spreadsheet to the importer, Anki to the app, and other new-deck sources to a job', () => {
    assert.equal(magicImportRoute('sheets'), 'spreadsheet');
    assert.equal(magicImportRoute('anki'), 'appOnly');
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

  it('uses Tabler icons and a file-only drop step for uploads', () => {
    for (const source of MAGIC_SOURCES) {
      assert.ok(Array.isArray(source.icon) && source.icon.length > 0);
    }
    for (const id of ['pdf', 'powerpoint', 'word', 'photo', 'audioFile', 'anki']) {
      assert.equal(isFileDropSource(id), true);
    }
    for (const id of ['aiPrompt', 'paste', 'sheets', 'youtube']) {
      assert.equal(isFileDropSource(id), false);
    }
    assert.equal(MAGIC_SOURCES.some((source) => source.id === 'record'), false);
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
    assert.equal(backgroundsPromptDeck({
      source: 'aiPrompt',
      deckId: '',
      jobId: 'job-1',
      status: 'queued',
    }), true);
    assert.equal(backgroundsPromptDeck({
      source: 'aiPrompt',
      deckId: 'deck-1',
      jobId: 'job-1',
      status: 'queued',
    }), false);
    assert.equal(backgroundsPromptDeck({
      source: 'pdf',
      deckId: '',
      jobId: 'job-1',
      status: 'queued',
    }), false);
    assert.equal(backgroundsPromptDeck({
      source: 'aiPrompt',
      deckId: '',
      jobId: 'job-1',
      status: 'done',
    }), false);
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
    const longAudio = 'ytmp3free.cc_the-entire-history-of-the-united-states-of-america-youtubemp3free.org.mp3';
    const audioPath = magicImportObjectPath('USER', 'JOB', longAudio);
    assert.equal(audioPath.endsWith('.mp3'), true);
    assert.equal(audioPath.split('/').pop().length <= 80, true);
    assert.equal(fileMatchesSource('audioFile', audioPath), true);
  });
});
