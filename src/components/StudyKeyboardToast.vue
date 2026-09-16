<template>
  <aside class="keyboard-toast" role="status">
    <svg class="keyboard-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
    </svg>
    <span v-if="kind === 'question'" class="hint-text">
      {{ $t('study.keyboardHintPrefix') }} <kbd>{{ $t('study.keyboardSpace') }}</kbd> {{ $t('study.keyboardHintSuffix') }}
    </span>
    <span v-else class="hint-text grade-hint">
      <span v-for="(grade, index) in grades" :key="grade" class="grade-shortcut"><kbd>{{ index + 1 }}</kbd> {{ $t(`study.${grade}`) }}<span v-if="index < 3">,</span></span>
    </span>
    <button class="dismiss-hint" type="button" :aria-label="$t('study.dismissKeyboardHint')" @click="$emit('dismiss')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
    </button>
  </aside>
</template>

<script>
export default {
  name: 'StudyKeyboardToast',
  props: { kind: { type: String, required: true } },
  emits: ['dismiss'],
  data: () => ({ grades: ['again', 'hard', 'good', 'easy'] }),
};
</script>

<style scoped>
.keyboard-toast {
  --hint-bg: #202b3b;
  --hint-text: #f8fbff;
  --hint-icon: #b3c9df;
  --hint-key-bg: #293342;
  --hint-key-border: #ffffff40;
  --hint-key-edge: #ffffff29;
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  max-width: min(560px, 100%);
  margin: 0 auto 16px;
  padding: 6px 4px 6px 16px;
  color: var(--hint-text);
  background: var(--hint-bg);
  border-radius: 16px;
  box-shadow: 0 8px 25px #15233624;
  font-size: 14px;
  line-height: 1.9;
  text-align: start;
}
:global([data-theme='dark']) .keyboard-toast {
  --hint-bg: #f2f7fc;
  --hint-text: #202b3b;
  --hint-icon: #576577;
  --hint-key-bg: #fff;
  --hint-key-border: #00000040;
  --hint-key-edge: #00000029;
}
.keyboard-icon { width: 21px; height: 21px; flex-shrink: 0; color: var(--hint-icon); }
.keyboard-toast svg { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.hint-text { min-width: 0; }
.keyboard-toast kbd {
  display: inline-block;
  padding: 0 9px;
  margin: 0 3px 2px;
  border: 1px solid var(--hint-key-border);
  border-radius: 5px;
  background: var(--hint-key-bg);
  box-shadow: 0 2px 0 var(--hint-key-edge);
  color: inherit;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 23px;
  vertical-align: 1px;
  white-space: nowrap;
}
.grade-hint { display: flex; flex-wrap: wrap; column-gap: 6px; row-gap: 3px; }
.grade-shortcut { white-space: nowrap; }
.dismiss-hint {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 10px !important;
  background: transparent !important;
  color: var(--hint-text) !important;
  opacity: 0.7;
  cursor: pointer;
}
.dismiss-hint svg { width: 15px; height: 15px; }
.dismiss-hint:hover { opacity: 1; }
.dismiss-hint:focus-visible { outline: 2px solid currentColor; outline-offset: -4px; }
</style>
