import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  folderById,
  folderHasChildren,
  folderTitle,
  parseDeckFolders,
  rootFolderId,
  sharedDeckIdFromExtra,
} from './deckFolders.js';

describe('parseDeckFolders', () => {
  it('builds a sorted tree from Anki decks JSON', () => {
    const folders = parseDeckFolders({
      3: { id: 3, name: 'Spanish::Nouns' },
      1: { id: 1, name: 'Spanish' },
      2: { id: 2, name: 'Spanish::Verbs' },
    });
    assert.deepEqual(folders.map((folder) => [folder.id, folder.title, folder.depth]), [
      [1, 'Spanish', 0],
      [3, 'Nouns', 1],
      [2, 'Verbs', 1],
    ]);
    assert.equal(folderHasChildren(folders), true);
    assert.equal(rootFolderId(folders), 1);
    assert.equal(folderById(folders, 2).fullPath, 'Spanish::Verbs');
  });

  it('falls back to the deck name when folders are missing', () => {
    const folders = parseDeckFolders({}, 'Biology');
    assert.deepEqual(folders, [{ id: 1, fullPath: 'Biology', title: 'Biology', depth: 0 }]);
    assert.equal(folderHasChildren(folders), false);
    assert.equal(rootFolderId([]), 1);
  });

  it('parses a JSON string of decks', () => {
    const folders = parseDeckFolders(JSON.stringify({
      1: { id: 1, name: 'Spanish' },
      2: { id: 2, name: 'Spanish::Verbs' },
    }));
    assert.equal(folders.length, 2);
    assert.equal(folderById(folders, 2).title, 'Verbs');
  });
});

describe('folderTitle', () => {
  it('uses the last path component', () => {
    assert.equal(folderTitle('Spanish::Verbs::Past'), 'Past');
    assert.equal(folderTitle(''), '');
  });
});

describe('sharedDeckIdFromExtra', () => {
  it('reads camelCase or snake_case shared deck ids', () => {
    assert.equal(sharedDeckIdFromExtra({ sharedDeckId: 'abc' }), 'abc');
    assert.equal(sharedDeckIdFromExtra({ shared_deck_id: ' xyz ' }), 'xyz');
    assert.equal(sharedDeckIdFromExtra({}), '');
  });
});
