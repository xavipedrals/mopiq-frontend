// These are UI preferences, not authorization data. Only true values are synced,
// under separate metadata keys, so another device cannot reset a learned hint.
export const KEYBOARD_HINT_METADATA = {
  shortcutUsed: 'web_study_keyboard_shortcut_used',
  questionSeen: 'web_study_question_keyboard_hint_seen',
  answerSeen: 'web_study_answer_keyboard_hint_seen',
};

export function readKeyboardHintMetadata(metadata = {}) {
  return Object.fromEntries(Object.entries(KEYBOARD_HINT_METADATA)
    .map(([flag, key]) => [flag, metadata?.[key] === true]));
}

export function keyboardHintMetadataPatch(flags) {
  return Object.fromEntries(Object.entries(KEYBOARD_HINT_METADATA)
    .filter(([flag]) => flags?.[flag] === true).map(([, key]) => [key, true]));
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
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || isTypingTarget(event.target)
      || event.target?.closest?.('button, a, [role="button"]')) return null;
  if (!showingAnswer) return event.code === 'Space' || event.key === ' ' ? 'reveal' : null;
  return ({ Digit1: 'AGAIN', Numpad1: 'AGAIN', Digit2: 'HARD', Numpad2: 'HARD',
    Digit3: 'GOOD', Numpad3: 'GOOD', Digit4: 'EASY', Numpad4: 'EASY' })[event.code] || null;
}

export function visibleKeyboardHint({ ready, active, keyboard, typing, showingAnswer, flags,
  questionDismissed = false, answerVisible = false }) {
  if (!ready || !active || !keyboard || typing) return null;
  if (showingAnswer) return answerVisible || !flags.answerSeen ? 'answer' : null;
  return !flags.shortcutUsed && !questionDismissed ? 'question' : null;
}

export function createKeyboardHintHistory({ userId, storage, load, save, onChange = () => {} }) {
  const key = `mopiq-study-keyboard-hints:${userId}`;
  const names = Object.keys(KEYBOARD_HINT_METADATA);
  let flags = Object.fromEntries(names.map((name) => [name, false]));
  let synced = { ...flags };
  let ready = false;
  let disposed = false;
  let saving = null;
  try {
    const local = JSON.parse(storage?.getItem(key) || '{}');
    for (const name of names) flags[name] = local?.[name] === true;
  } catch { /* Storage may be unavailable; hints must never block study. */ }

  function publish() {
    try { storage?.setItem(key, JSON.stringify(flags)); } catch { /* Best effort offline cache. */ }
    if (!disposed) onChange({ ...flags, ready });
  }

  async function flush() {
    if (saving || disposed || !ready) return saving;
    const run = async () => {
      while (!disposed) {
        const patch = Object.fromEntries(names.filter((name) => flags[name] && !synced[name])
          .map((name) => [name, true]));
        if (!Object.keys(patch).length) return;
        try {
          await save(patch);
          synced = { ...synced, ...patch };
        } catch {
          // Keep the unsynced flags locally. Retry on reconnect or next session.
          return;
        }
      }
    };
    saving = run();
    try { await saving; } finally { saving = null; }
  }

  async function hydrate() {
    try {
      const remote = await load();
      for (const name of names) {
        synced[name] = remote?.[name] === true;
        flags[name] ||= synced[name];
      }
    } catch { /* Use the per-account cache when offline. */ }
    if (disposed) return;
    ready = true;
    publish();
    await flush();
  }

  function mark(patch) {
    if (disposed) return;
    let changed = false;
    for (const name of names) {
      if (patch[name] === true && !flags[name]) { flags[name] = true; changed = true; }
    }
    if (changed) { publish(); void flush(); }
  }

  return { hydrate, mark, flush, dispose() { disposed = true; } };
}
