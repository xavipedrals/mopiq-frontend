import assert from 'node:assert/strict';
import { it } from 'node:test';
import { tutorialCompleted, completeTutorial } from './studyTips.js';

it('remembers completing the study tutorial per account', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  assert.equal(tutorialCompleted(storage, 'a'), false);
  completeTutorial(storage, 'a');
  assert.equal(tutorialCompleted(storage, 'a'), true);
  assert.equal(tutorialCompleted(storage, 'b'), false);
  assert.equal(tutorialCompleted(storage, null), false);
  assert.doesNotThrow(() => completeTutorial({ setItem() { throw new Error('blocked'); } }, 'a'));
  assert.equal(tutorialCompleted({ getItem() { throw new Error('blocked'); } }, 'a'), false);
});
