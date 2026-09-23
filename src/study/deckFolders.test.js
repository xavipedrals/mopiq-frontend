import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addFolder,
  deleteFolder,
  directChildren,
  findFolder,
  flattenFolderRows,
  folderById,
  folderCanAddChild,
  folderHasChildren,
  folderScopeIds,
  folderTitle,
  FolderEditError,
  parseDeckFolders,
  renameFolder,
  rootFolder,
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

describe('folder tree', () => {
  const decks = {
    1: { id: 1, name: 'Spanish' },
    2: { id: 2, name: 'Spanish::Verbs' },
    4: { id: 4, name: 'Spanish::Verbs::Past' },
    3: { id: 3, name: 'Spanish::Nouns' },
  };
  const folders = parseDeckFolders(decks);

  it('lists direct children and flattens expanded rows', () => {
    const root = rootFolder(folders);
    assert.deepEqual(directChildren(folders, root).map((folder) => folder.title), ['Nouns', 'Verbs']);
    const rows = flattenFolderRows(folders, root, { 2: true });
    assert.deepEqual(rows.map((row) => [row.folder.title, row.depth]), [
      ['Nouns', 0],
      ['Verbs', 0],
      ['Past', 1],
    ]);
    assert.equal(folderCanAddChild(root), true);
    assert.equal(folderCanAddChild(findFolder(folders, 4)), false);
  });

  it('scopes a folder to itself and its descendants', () => {
    assert.deepEqual(folderScopeIds(folders, findFolder(folders, 2)), [2, 4]);
    assert.deepEqual(folderScopeIds(folders, rootFolder(folders)), [1, 3, 2, 4, 0]);
  });

  it('adds, renames, and deletes folders', () => {
    const added = addFolder(decks, 'Spanish', 'Adjectives', 'Spanish');
    const created = parseDeckFolders(added).find((folder) => folder.title === 'Adjectives');
    assert.equal(created.fullPath, 'Spanish::Adjectives');
    const renamed = renameFolder(added, 2, 'Actions', 'Spanish');
    assert.equal(findFolder(parseDeckFolders(renamed), 4).fullPath, 'Spanish::Actions::Past');
    const removed = deleteFolder(decks, 3, {}, 'Spanish');
    assert.equal(findFolder(parseDeckFolders(removed), 3), null);
    assert.throws(() => deleteFolder(decks, 2, { 2: 1 }, 'Spanish'), FolderEditError);
    assert.throws(() => addFolder(decks, 'Spanish', 'Verbs', 'Spanish'), FolderEditError);
  });
});

describe('sharedDeckIdFromExtra', () => {
  it('reads camelCase or snake_case shared deck ids', () => {
    assert.equal(sharedDeckIdFromExtra({ sharedDeckId: 'abc' }), 'abc');
    assert.equal(sharedDeckIdFromExtra({ shared_deck_id: ' xyz ' }), 'xyz');
    assert.equal(sharedDeckIdFromExtra({}), '');
  });
});
