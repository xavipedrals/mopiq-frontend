export function folderTitle(fullPath, fallback = '') {
  const parts = String(fullPath || '').split('::').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || fallback || '';
}

function asDeckEntry(value, key) {
  if (!value || typeof value !== 'object') return null;
  const id = Number(value.id ?? key);
  const fullPath = String(value.name || value.fullPath || '').trim();
  if (!Number.isFinite(id) || !fullPath) return null;
  return {
    id,
    fullPath,
    title: folderTitle(fullPath),
    depth: Math.max(0, fullPath.split('::').length - 1),
  };
}

export function parseDeckFolders(decksJson, fallbackName = '') {
  let raw = decksJson;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = {}; }
  }
  raw = raw && typeof raw === 'object' ? raw : {};
  const entries = Array.isArray(raw)
    ? raw.map((value, index) => asDeckEntry(value, index))
    : Object.entries(raw).map(([key, value]) => asDeckEntry(value, key));
  const folders = entries
    .filter(Boolean)
    .sort((a, b) => a.fullPath.localeCompare(b.fullPath, undefined, { sensitivity: 'base' }));
  if (!folders.length && fallbackName) {
    return [{ id: 1, fullPath: fallbackName, title: fallbackName, depth: 0 }];
  }
  return folders;
}

export function folderHasChildren(folders = []) {
  return folders.length > 1 || folders.some((folder) => folder.fullPath.includes('::'));
}

export function rootFolderId(folders = []) {
  if (!folders.length) return 1;
  const root = folders.find((folder) => folder.depth === 0) || folders[0];
  return root.id;
}

export function folderById(folders = [], id) {
  const numeric = Number(id);
  return folders.find((folder) => folder.id === numeric) || folders[0] || null;
}

export function findFolder(folders = [], id) {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return null;
  return folders.find((folder) => folder.id === numeric) || null;
}

export class FolderEditError extends Error {
  constructor(code) {
    super(code);
    this.name = 'FolderEditError';
    this.code = code;
  }
}

export function decksRecord(decksJson) {
  let raw = decksJson;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = {}; }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const record = {};
  for (const [key, value] of Object.entries(raw)) {
    const entry = asDeckEntry(value, key);
    if (!entry) continue;
    record[String(entry.id)] = {
      ...(value && typeof value === 'object' ? value : {}),
      id: entry.id,
      name: entry.fullPath,
      conf: value?.conf ?? 1,
      desc: value?.desc ?? '',
    };
  }
  return record;
}

function withRoot(decksJson, deckName = '') {
  const record = decksRecord(decksJson);
  const folders = parseDeckFolders(record, deckName);
  const root = folders.find((folder) => folder.depth === 0);
  if (root && !record[String(root.id)]) {
    record[String(root.id)] = { id: root.id, name: root.fullPath, conf: 1, desc: '' };
  }
  return record;
}

export function rootFolder(folders = []) {
  return folders.find((folder) => folder.depth === 0) || folders[0] || null;
}

export function directChildren(folders = [], parent) {
  if (!parent) return [];
  const prefix = `${parent.fullPath}::`;
  return folders
    .filter((folder) => folder.depth === parent.depth + 1 && folder.fullPath.startsWith(prefix))
    .sort((a, b) => a.fullPath.localeCompare(b.fullPath, undefined, { sensitivity: 'base' }));
}

export function parentOf(folders = [], folder) {
  if (!folder || folder.depth === 0) return null;
  const parentPath = folder.fullPath.split('::').slice(0, -1).join('::');
  return folders.find((item) => item.fullPath === parentPath) || null;
}

export function folderScopeIds(folders = [], folder) {
  if (!folder) return [];
  const prefix = `${folder.fullPath}::`;
  const ids = folders
    .filter((item) => item.id === folder.id || item.fullPath.startsWith(prefix))
    .map((item) => item.id);
  if (folder.depth === 0) ids.push(0);
  return ids;
}

export function flattenFolderRows(folders = [], parent, expandedIds = {}) {
  const rows = [];
  function walk(node, depth) {
    for (const child of directChildren(folders, node)) {
      const hasChildren = directChildren(folders, child).length > 0;
      const expanded = Boolean(expandedIds[child.id]);
      rows.push({ folder: child, depth, hasChildren, expanded });
      if (hasChildren && expanded) walk(child, depth + 1);
    }
  }
  if (parent) walk(parent, 0);
  return rows;
}

export function folderCanAddChild(folder) {
  if (!folder) return false;
  return folder.fullPath.split('::').length <= 2;
}

function cleanFolderName(rawName) {
  const name = String(rawName || '').trim();
  if (!name) throw new FolderEditError('empty');
  if (name.includes('::')) throw new FolderEditError('invalid');
  return name;
}

function nextFolderId(folders) {
  const maxId = folders.reduce((max, folder) => Math.max(max, folder.id), 0);
  let id = Math.max(Date.now(), maxId + 1);
  const used = new Set(folders.map((folder) => folder.id));
  while (used.has(id) || id <= 0) id += 1;
  return id;
}

export function addFolder(decksJson, parentFullPath, rawName, deckName = '') {
  const name = cleanFolderName(rawName);
  const record = withRoot(decksJson, deckName);
  const folders = parseDeckFolders(record, deckName);
  const parent = folders.find((folder) => folder.fullPath === parentFullPath);
  if (!parent) throw new FolderEditError('path');
  if (!folderCanAddChild(parent)) throw new FolderEditError('depth');
  const fullPath = `${parent.fullPath}::${name}`;
  if (folders.some((folder) => folder.fullPath === fullPath)) throw new FolderEditError('exists');
  const id = nextFolderId(folders);
  return {
    ...record,
    [String(id)]: { id, name: fullPath, conf: 1, desc: '' },
  };
}

export function renameFolder(decksJson, folderId, rawName, deckName = '') {
  const name = cleanFolderName(rawName);
  const record = withRoot(decksJson, deckName);
  const folders = parseDeckFolders(record, deckName);
  const current = findFolder(folders, folderId);
  if (!current || current.depth === 0) throw new FolderEditError('path');
  const parentPath = current.fullPath.split('::').slice(0, -1).join('::');
  const nextPath = `${parentPath}::${name}`;
  if (folders.some((folder) => folder.fullPath === nextPath && folder.id !== current.id)) {
    throw new FolderEditError('exists');
  }
  const oldPrefix = current.fullPath;
  const updated = {};
  for (const [key, value] of Object.entries(record)) {
    const path = String(value.name || '');
    let renamed = path;
    if (path === oldPrefix) renamed = nextPath;
    else if (path.startsWith(`${oldPrefix}::`)) renamed = nextPath + path.slice(oldPrefix.length);
    updated[key] = { ...value, name: renamed };
  }
  return updated;
}

export function deleteFolder(decksJson, folderId, counts = {}, deckName = '') {
  const record = withRoot(decksJson, deckName);
  const folders = parseDeckFolders(record, deckName);
  const current = findFolder(folders, folderId);
  if (!current || current.depth === 0) throw new FolderEditError('path');
  const hasChildren = folders.some((folder) => folder.fullPath.startsWith(`${current.fullPath}::`));
  if (hasChildren || Number(counts[current.id] || 0) > 0) throw new FolderEditError('content');
  const next = { ...record };
  delete next[String(current.id)];
  return next;
}

export function sharedDeckIdFromExtra(extra = {}) {
  const value = extra.sharedDeckId || extra.shared_deck_id || '';
  return String(value || '').trim();
}
