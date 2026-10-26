export const DEBUG_UNLIMITED_STUDY_KEY = 'mopiqDebugUnlimitedStudy';
export const DEBUG_ALWAYS_SHOW_STUDY_TUTORIAL_KEY = 'mopiqDebugAlwaysShowStudyTutorial';
export const DEBUG_ALWAYS_SHOW_FEEDBACK_KEY = 'mopiqDebugAlwaysShowFeedbackAfterStudy';

function storageOrNull(storage) {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function defaultHostname() {
  try {
    if (typeof location === 'undefined' || !location) return '';
    return location.hostname || '';
  } catch {
    return '';
  }
}

/** Debug tools stay off unless this browser is pointed at a loopback host. */
export function isLocalDebugHost(hostname = defaultHostname()) {
  const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function readFlag(key, storage, hostname = defaultHostname()) {
  if (!isLocalDebugHost(hostname)) return false;
  try {
    return storageOrNull(storage)?.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key, enabled, storage) {
  try {
    const store = storageOrNull(storage);
    if (!store) return;
    if (enabled) store.setItem(key, '1');
    else store.removeItem(key);
  } catch {
    // Ignore quota / private-mode failures; study still uses the normal path.
  }
}

export function isDebugUnlimitedStudy(storage, hostname) {
  return readFlag(DEBUG_UNLIMITED_STUDY_KEY, storage, hostname);
}

export function setDebugUnlimitedStudy(enabled, storage) {
  writeFlag(DEBUG_UNLIMITED_STUDY_KEY, enabled, storage);
}

export function isDebugAlwaysShowStudyTutorial(storage, hostname) {
  return readFlag(DEBUG_ALWAYS_SHOW_STUDY_TUTORIAL_KEY, storage, hostname);
}

export function setDebugAlwaysShowStudyTutorial(enabled, storage) {
  writeFlag(DEBUG_ALWAYS_SHOW_STUDY_TUTORIAL_KEY, enabled, storage);
}

export function isDebugAlwaysShowFeedback(storage, hostname) {
  return readFlag(DEBUG_ALWAYS_SHOW_FEEDBACK_KEY, storage, hostname);
}

export function setDebugAlwaysShowFeedback(enabled, storage) {
  writeFlag(DEBUG_ALWAYS_SHOW_FEEDBACK_KEY, enabled, storage);
}
