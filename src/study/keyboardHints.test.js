import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createKeyboardHintHistory, desktopKeyboardLikely, isKeyboardEvidence, isTypingTarget,
  keyboardHintMetadataPatch, readKeyboardHintMetadata, studyShortcutAction, visibleKeyboardHint } from './keyboardHints.js';

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
};
const eligible = { ready: true, active: true, keyboard: true, typing: false, showingAnswer: false,
  flags: { shortcutUsed: false, answerSeen: false } };

describe('keyboard hint eligibility and shortcuts', () => {
  it('requires a keyboard, loaded history and active study outside editors', () => {
    assert.equal(visibleKeyboardHint(eligible), 'question');
    for (const patch of [{ ready: false }, { active: false }, { keyboard: false }, { typing: true },
      { questionDismissed: true }, { flags: { shortcutUsed: true } }]) {
      assert.equal(visibleKeyboardHint({ ...eligible, ...patch }), null);
    }
  });
  it('shows the answer introduction independently, once, keeping its first display visible', () => {
    const answer = { ...eligible, showingAnswer: true, flags: { shortcutUsed: true, answerSeen: false } };
    assert.equal(visibleKeyboardHint(answer), 'answer');
    answer.flags.answerSeen = true;
    assert.equal(visibleKeyboardHint(answer), null);
    assert.equal(visibleKeyboardHint({ ...answer, answerVisible: true }), 'answer');
    assert.equal(visibleKeyboardHint({ ...answer, answerVisible: true, typing: true }), null);
  });
  it('does not assume touch devices or a mouse imply a connected keyboard', () => {
    assert.equal(desktopKeyboardLikely({ finePointer: true }), true);
    assert.equal(desktopKeyboardLikely({ finePointer: true, maxTouchPoints: 5 }), false);
    assert.equal(desktopKeyboardLikely({ finePointer: true, mobile: true }), false);
    assert.equal(desktopKeyboardLikely(), false);
    assert.equal(isKeyboardEvidence({ isTrusted: true, code: 'Tab' }), true);
    assert.equal(isKeyboardEvidence({ isTrusted: true, code: 'KeyA', target: { tagName: 'TEXTAREA' } }), false);
    assert.equal(isKeyboardEvidence({ code: 'Tab' }), false);
    assert.equal(isKeyboardEvidence({ isTrusted: true, code: '', keyCode: 229 }), false);
  });
  it('recognizes Space on questions and 1–4 on answers only', () => {
    assert.equal(studyShortcutAction({ code: 'Space' }, false), 'reveal');
    assert.equal(studyShortcutAction({ code: 'Space' }, true), null);
    for (const [index, grade] of ['AGAIN', 'HARD', 'GOOD', 'EASY'].entries()) {
      for (const prefix of ['Digit', 'Numpad']) {
        assert.equal(studyShortcutAction({ code: `${prefix}${index + 1}` }, true), grade);
        assert.equal(studyShortcutAction({ code: `${prefix}${index + 1}` }, false), null);
      }
    }
  });
  it('leaves text entry, native controls, composition, modifiers and held keys alone', () => {
    for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' },
      { tagName: 'IFRAME' }, { isContentEditable: true }, { closest: () => ({}) }]) {
      for (const [code, answer] of [['Space', false], ['Digit1', true]]) {
        assert.equal(studyShortcutAction({ code, target }, answer), null);
      }
    }
    assert.equal(isTypingTarget({ tagName: 'DIV' }), false);
    for (const key of ['repeat', 'isComposing', 'defaultPrevented', 'ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      assert.equal(studyShortcutAction({ code: 'Space', [key]: true }, false), null);
      assert.equal(studyShortcutAction({ code: 'Digit1', [key]: true }, true), null);
    }
  });
});

describe('per-account keyboard hint persistence', () => {
  it('writes only its own true metadata keys', () => {
    assert.deepEqual(keyboardHintMetadataPatch({ answerSeen: true, shortcutUsed: false, admin: true }),
      { web_study_answer_keyboard_hint_seen: true });
    assert.deepEqual(readKeyboardHintMetadata({ web_study_keyboard_shortcut_used: true, name: 'Ada' }),
      { shortcutUsed: true, questionSeen: false, answerSeen: false });
  });
  it('hydrates remote history before allowing hints and restores it on a different browser', async () => {
    let state;
    let remote = { answerSeen: true };
    const history = createKeyboardHintHistory({ userId: 'a', storage: storage(), load: async () => remote,
      save: async (patch) => { remote = { ...remote, ...patch }; }, onChange: (s) => { state = s; } });
    await history.hydrate();
    assert.equal(state.ready, true);
    assert.equal(state.answerSeen, true);
    history.mark({ shortcutUsed: true });
    await history.flush();
    const otherBrowser = createKeyboardHintHistory({ userId: 'a', storage: storage(), load: async () => remote,
      save: async () => {}, onChange: (s) => { state = s; } });
    await otherBrowser.hydrate();
    assert.equal(state.shortcutUsed, true);
    assert.equal(state.answerSeen, true);
  });
  it('keeps failed saves offline and retries on the next session without resetting remote flags', async () => {
    const cache = storage();
    const first = createKeyboardHintHistory({ userId: 'a', storage: cache, load: async () => { throw Error('offline'); },
      save: async () => { throw Error('offline'); } });
    await first.hydrate();
    first.mark({ answerSeen: true });
    await first.flush();
    const writes = [];
    let state;
    const next = createKeyboardHintHistory({ userId: 'a', storage: cache, load: async () => ({ shortcutUsed: true }),
      save: async (patch) => writes.push(patch), onChange: (s) => { state = s; } });
    await next.hydrate();
    assert.equal(state.shortcutUsed, true);
    assert.equal(state.answerSeen, true);
    assert.deepEqual(writes, [{ answerSeen: true }]);
  });
  it('isolates accounts and ignores stale hydration after disposal', async () => {
    const cache = storage();
    const first = createKeyboardHintHistory({ userId: 'a', storage: cache, load: async () => ({}), save: async () => {} });
    await first.hydrate();
    first.mark({ shortcutUsed: true });
    let state;
    const second = createKeyboardHintHistory({ userId: 'b', storage: cache, load: async () => ({}),
      save: async () => {}, onChange: (s) => { state = s; } });
    await second.hydrate();
    assert.equal(state.shortcutUsed, false);
    let finish;
    const stale = createKeyboardHintHistory({ userId: 'a', storage: cache, load: () => new Promise((r) => { finish = r; }),
      save: async () => assert.fail('stale account write'), onChange: () => assert.fail('stale publication') });
    const pending = stale.hydrate();
    stale.dispose();
    finish({});
    await pending;
  });
  it('serializes overlapping writes and saves flags added during a request', async () => {
    const writes = [];
    let finish;
    const history = createKeyboardHintHistory({ userId: 'a', storage: storage(), load: async () => ({}),
      save: async (patch) => { writes.push(patch); if (writes.length === 1) await new Promise((r) => { finish = r; }); } });
    await history.hydrate();
    history.mark({ questionSeen: true });
    history.mark({ answerSeen: true });
    finish();
    await history.flush();
    assert.deepEqual(writes, [{ questionSeen: true }, { answerSeen: true }]);
  });
  it('continues studying when browser storage is disabled', async () => {
    let state;
    const history = createKeyboardHintHistory({ userId: 'a', storage: { getItem() { throw Error(); }, setItem() { throw Error(); } },
      load: async () => ({}), save: async () => {}, onChange: (s) => { state = s; } });
    await history.hydrate();
    history.mark({ answerSeen: true });
    assert.equal(state.answerSeen, true);
  });
});
