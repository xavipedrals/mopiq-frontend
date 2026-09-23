import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAllDeckTopics, getDeckTopicByPostgresId, getPickerDeckTopics, sidebarTablerIconUrl } from './utils.js';

describe('sidebarTablerIconUrl', () => {
  it('maps each topic to the iPad sidebar Tabler icon', () => {
    const expected = {
      medicine: 'stethoscope',
      languages: 'language-hiragana',
      geography: 'world',
      school: 'school',
      maths: 'math',
      computing: 'device-laptop',
      games: 'device-gamepad-2',
      anatomy: 'lungs',
      biology: 'microscope',
      chemistry: 'flask-2',
      history: 'book',
      law: 'scale',
      music: 'music',
      physics: 'atom',
      other: 'books',
    };
    for (const [imageName, icon] of Object.entries(expected)) {
      assert.equal(sidebarTablerIconUrl(imageName), `/topics/tabler/${icon}.svg`);
      assert.equal(getDeckTopicByPostgresId(imageName).sidebarIcon, icon);
    }
    assert.equal(getAllDeckTopics().length, Object.keys(expected).length);
  });

  it('falls back to the other/books icon', () => {
    assert.equal(sidebarTablerIconUrl(undefined), '/topics/tabler/books.svg');
    assert.equal(sidebarTablerIconUrl('unknown-topic'), '/topics/tabler/books.svg');
  });
});

describe('getPickerDeckTopics', () => {
  it('returns every topic in the iPad picker order', () => {
    assert.deepEqual(
      getPickerDeckTopics().map((topic) => topic.imageName),
      [
        'other', 'medicine', 'languages', 'anatomy', 'biology', 'law', 'maths',
        'chemistry', 'physics', 'geography', 'history', 'music', 'school', 'computing', 'games',
      ],
    );
    assert.equal(getPickerDeckTopics().length, getAllDeckTopics().length);
  });
});
