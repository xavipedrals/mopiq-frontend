import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WEB_CLOZE_NOTE_MODEL_ID, WEB_QA_NOTE_MODEL_ID } from '../study/sanitizeCardHtml.js';
import { parseDeckFolders, rootFolderId } from '../study/deckFolders.js';
import {
  createUlid,
  emptyDeckCreatePayload,
  encodeUlid,
  MAX_DECK_NAME_LENGTH,
  ULID_PATTERN,
} from './emptyDeck.js';

describe('encodeUlid', () => {
  it('encodes a 26-character Crockford ULID', () => {
    const id = encodeUlid(1_758_000_000_000, new Uint8Array(10).fill(1));
    assert.match(id, ULID_PATTERN);
    assert.equal(id.length, 26);
  });

  it('keeps time in the first 10 characters', () => {
    const a = encodeUlid(1_758_000_000_000, new Uint8Array(10));
    const b = encodeUlid(1_758_000_000_001, new Uint8Array(10));
    assert.notEqual(a.slice(0, 10), b.slice(0, 10));
    assert.equal(a.slice(10), b.slice(10));
  });
});

describe('createUlid', () => {
  it('returns unique valid ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createUlid()));
    assert.equal(ids.size, 20);
    for (const id of ids) assert.match(id, ULID_PATTERN);
  });
});

describe('emptyDeckCreatePayload', () => {
  it('builds a postgres bulk_sync deck.create payload iOS can hydrate', () => {
    const now = 1_758_091_200_000;
    const payload = emptyDeckCreatePayload({
      name: '  Spanish verbs  ',
      topic: 'languages',
      now,
      firebaseId: '01K3EMPTYDECKTEST000000001',
    });
    assert.equal(payload.id, '01K3EMPTYDECKTEST000000001');
    assert.equal(payload.name, 'Spanish verbs');
    assert.equal(payload.topic, 'languages');
    assert.equal(payload.contentMode, 'postgres');
    assert.equal(payload.contentMode2, 'postgres');
    assert.equal(payload.cardIdScheme, 'uuidv7');
    assert.equal(payload.cardCount, 0);
    assert.equal(payload.createdAt, new Date(now).toISOString());
    assert.deepEqual(payload.decks[String(now)], {
      id: now,
      name: 'Spanish verbs',
      desc: '',
      conf: 1,
    });
    const folders = parseDeckFolders(payload.decks, payload.name);
    assert.equal(rootFolderId(folders), now);
    const qa = payload.noteModels[WEB_QA_NOTE_MODEL_ID];
    const cloze = payload.noteModels[WEB_CLOZE_NOTE_MODEL_ID];
    assert.equal(qa.name, 'ankiFlashcardsBrandedDefault');
    assert.equal(qa.did, now);
    assert.equal(cloze.name, 'mopiqCloze');
    assert.equal(cloze.type, 1);
  });

  it('falls unknown topics back to other and trims long names', () => {
    const payload = emptyDeckCreatePayload({
      name: `${'a'.repeat(MAX_DECK_NAME_LENGTH + 8)} extra`,
      topic: 'not-a-topic',
      firebaseId: '01K3EMPTYDECKTEST000000002',
    });
    assert.equal(payload.topic, 'other');
    assert.equal(payload.name.length, MAX_DECK_NAME_LENGTH);
  });

  it('rejects a blank name', () => {
    assert.throws(
      () => emptyDeckCreatePayload({ name: '   ', topic: 'other' }),
      (error) => error.code === 'deck_name_required',
    );
  });
});
