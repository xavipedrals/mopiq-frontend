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

export function sharedDeckIdFromExtra(extra = {}) {
  const value = extra.sharedDeckId || extra.shared_deck_id || '';
  return String(value || '').trim();
}
