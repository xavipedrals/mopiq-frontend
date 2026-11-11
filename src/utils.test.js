import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAllDeckTopics, getDeckTopicByPostgresId, getPickerDeckTopics, getDisplayDeckTopic, isPersonalDeckTopic, PERSONAL_DECK_TOPICS, sidebarTablerIconUrl } from './utils.js';

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
        'medicine', 'languages', 'anatomy', 'biology', 'law', 'chemistry', 'maths',
        'physics', 'geography', 'psychology', 'business', 'engineering', 'history',
        'finance', 'economy', 'music', 'other',
      ],
    );
    assert.equal(getPickerDeckTopics({ includePersonal: false }).some(topic => isPersonalDeckTopic(topic.imageName)), false);
    for (const topic of PERSONAL_DECK_TOPICS) {
      assert.equal(getDeckTopicByPostgresId(topic.imageName).imageName, 'other');
      assert.equal(getDisplayDeckTopic(topic.imageName).imageName, topic.imageName);
      assert.equal(sidebarTablerIconUrl(topic.imageName), `/topics/${topic.imageName}.svg`);
    }
  });
});
