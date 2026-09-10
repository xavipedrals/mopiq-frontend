export const DEBUG_UNLIMITED_STUDY_KEY = 'mopiqDebugUnlimitedStudy';

function storageOrNull(storage) {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function isDebugUnlimitedStudy(storage) {
  try {
    return storageOrNull(storage)?.getItem(DEBUG_UNLIMITED_STUDY_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDebugUnlimitedStudy(enabled, storage) {
  try {
    const store = storageOrNull(storage);
    if (!store) return;
    if (enabled) store.setItem(DEBUG_UNLIMITED_STUDY_KEY, '1');
    else store.removeItem(DEBUG_UNLIMITED_STUDY_KEY);
  } catch {
    // Ignore quota / private-mode failures; study still falls back to the free cap.
  }
}
