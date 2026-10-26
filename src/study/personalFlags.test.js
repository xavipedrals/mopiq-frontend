import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STARTER_FLAGS, cardFlagRecord, personalFlagColor, personalFlagRecord, visiblePersonalFlags } from './personalFlags.js';

describe('personal flags shared with iOS', () => {
  it('preserves renamed and deleted starters and sorts custom flags after starters', () => {
    const records = [
      { flag_id: 'starter-important', name: 'Exam', color: 'pink' },
      { flag_id: 'starter-confusing', deleted: true },
      { flag_id: 'z', name: 'Zebra' },
      { flag_id: 'a', name: 'Apple' },
      { flag_id: 'deleted', name: 'Gone', deleted: true },
    ];
    const flags = visiblePersonalFlags(records);
    assert.deepEqual(flags.map((flag) => flag.flag_id), ['starter-important', 'starter-wording', 'a', 'z']);
    assert.equal(flags[0].name, 'Exam');
    assert.equal(flags[0].labelKey, undefined);
  });

  it('seeds missing defaults with the same zero-time event as iOS', () => {
    const record = personalFlagRecord(STARTER_FLAGS[0]);
    assert.equal(record.event_at, 0);
    assert.equal(record.event_id, 'starter-important');
    assert.equal(record.deck_id, '');
    assert.equal(record.card_id, '');
    assert.equal(record.kind, 'flag');
  });

  it('writes independent assignments and tombstones using string card IDs and Unix seconds', () => {
    const before = Date.now() / 1000;
    const add = cardFlagRecord('deck', 123, 'starter-important', true);
    const remove = cardFlagRecord('deck', 123, 'starter-important', false);
    assert.equal(add.card_id, '123');
    assert.equal(add.deck_id, 'deck');
    assert.equal(add.deleted, false);
    assert.equal(remove.deleted, true);
    assert.ok(add.event_at >= before && add.event_at <= Date.now() / 1000);
    assert.notEqual(add.event_id, remove.event_id);
  });

  it('matches iOS colors in both themes and preserves custom colors', () => {
    assert.equal(personalFlagColor('blue'), '#3b82f6');
    assert.equal(personalFlagColor('blue', true), '#60a5fa');
    assert.equal(personalFlagColor('#ABCDEF', true), '#ABCDEF');
    assert.equal(personalFlagColor('invalid'), '#3b82f6');
  });
});
