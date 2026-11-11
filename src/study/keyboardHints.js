// Local UI preference for shortcut badges on study buttons.
export const SHOW_KEYCAPS_STORAGE_KEY = 'mopiqShowStudyKeyboardShortcuts';

export function readShowStudyKeycaps(storage) {
  try {
    const raw = storage?.getItem?.(SHOW_KEYCAPS_STORAGE_KEY);
    if (raw == null) return true;
    return raw === 'true' || raw === '1';
  } catch {
    return true;
  }
}

export function writeShowStudyKeycaps(show, storage) {
  const next = Boolean(show);
  try {
    storage?.setItem?.(SHOW_KEYCAPS_STORAGE_KEY, next ? 'true' : 'false');
  } catch {
    // Private browsing may disable storage.
  }
  return next;
}

export function isTypingTarget(target) {
  return Boolean(target && (
    ['INPUT', 'TEXTAREA', 'SELECT', 'IFRAME'].includes(target.tagName)
    || target.isContentEditable
    || target.closest?.('[contenteditable=""], [contenteditable="true"], [role="textbox"]')
  ));
}

export function isKeyboardEvidence(event) {
  // There is no browser API for attached keyboards. Outside an editor, trusted
  // coded key events are a conservative signal on otherwise touch-only devices.
  return event.isTrusted === true && Boolean(event.code) && event.code !== 'Unidentified'
    && !event.isComposing && event.keyCode !== 229 && !isTypingTarget(event.target);
}

export function desktopKeyboardLikely({ maxTouchPoints = 0, mobile = false, finePointer = false } = {}) {
  return !mobile && maxTouchPoints === 0 && finePointer;
}

export function studyShortcutAction(event, showingAnswer) {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || isTypingTarget(event.target)) return null;
  if (!showingAnswer && event.key === 't') return 'write';
  if (event.target?.closest?.('button, a, [role="button"]')) return null;
  if (!showingAnswer) {
    return event.code === 'Space' || event.key === ' ' ? 'reveal' : null;
  }
  return ({ Digit1: 'AGAIN', Numpad1: 'AGAIN', Digit2: 'HARD', Numpad2: 'HARD',
    Digit3: 'GOOD', Numpad3: 'GOOD', Digit4: 'EASY', Numpad4: 'EASY' })[event.code] || null;
}
