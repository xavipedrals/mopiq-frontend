import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { desktopKeyboardLikely, isKeyboardEvidence, isTypingTarget,
  readShowStudyKeycaps, studyShortcutAction, writeShowStudyKeycaps } from './keyboardHints.js';

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
};

describe('study keyboard shortcut badges', () => {
  it('defaults to showing keycaps, matching iPad', () => {
    assert.equal(readShowStudyKeycaps(storage()), true);
    assert.equal(writeShowStudyKeycaps(false, storage()), false);
  });
  it('round-trips the local preference', () => {
    const prefs = storage();
    assert.equal(writeShowStudyKeycaps(false, prefs), false);
    assert.equal(readShowStudyKeycaps(prefs), false);
    assert.equal(writeShowStudyKeycaps(true, prefs), true);
    assert.equal(readShowStudyKeycaps(prefs), true);
  });
});

describe('study keyboard shortcuts', () => {
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
