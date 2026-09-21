<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-mode-title"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <header class="sheet-header">
          <h2 id="study-mode-title">{{ title }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </header>
        <div class="options">
          <button type="button" class="option study" :disabled="busy" @click="$emit('study')">
            <span class="banner">{{ $t('deck.studyBanner') }}</span>
            <span class="copy">
              <strong>{{ $t('deck.studySmarter') }}</strong>
              <small>{{ $t('deck.studySmarterBody') }}</small>
            </span>
            <img src="/study/study-spaced-rep.png" alt="">
          </button>
          <button type="button" class="option quiz" :disabled="busy" @click="$emit('quiz')">
            <span class="copy">
              <strong>{{ $t('deck.takeQuiz') }}</strong>
              <small>{{ $t('deck.takeQuizBody') }}</small>
            </span>
            <img src="/study/start-quiz.png" alt="">
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'StudyModeSheet',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    busy: { type: Boolean, default: false },
  },
  emits: ['dismiss', 'study', 'quiz'],
  methods: {
    onCancel() {
      if (this.busy) return;
      this.$emit('dismiss');
    },
  },
};
</script>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
}
.sheet-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgba(15, 23, 42, 0.5);
  cursor: pointer;
}
.sheet {
  position: relative;
  width: min(520px, 100%);
  background: var(--card-bg);
  border-radius: 28px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
  padding-bottom: 12px;
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px 8px;
}
.sheet-header h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--title);
}
.sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: var(--inset-bg);
  color: var(--text);
  cursor: pointer;
}
.sheet-close svg { width: 18px; height: 18px; }
.options {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px 24px 24px;
}
.option {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 132px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 30px;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.option:disabled { opacity: 0.7; cursor: default; }
.option.study {
  background: #EBF8FF;
  border-color: #A7D8F0;
}
.option.quiz {
  background: #F2FDE0;
  border-color: #C7EA8F;
}
.copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 28px 24px;
  padding-right: 8px;
}
.copy strong {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}
.option.study .copy strong { color: #0B4F71; }
.option.quiz .copy strong { color: #2B4005; }
.copy small {
  font-size: 1rem;
  line-height: 1.4;
}
.option.study .copy small { color: #1D6F98; }
.option.quiz .copy small { color: #507712; }
.option img {
  width: 132px;
  height: 132px;
  object-fit: contain;
  object-position: bottom right;
  flex: 0 0 auto;
  align-self: flex-end;
  pointer-events: none;
}
.banner {
  position: absolute;
  top: -1px;
  left: 40px;
  z-index: 1;
  padding: 8px 10px;
  border-radius: 12px;
  background: #0A7AFF;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  transform: translateY(-50%);
}
html[data-theme="dark"] .option.study {
  background: #082F49;
  border-color: #0369A1;
}
html[data-theme="dark"] .option.quiz {
  background: #1A2E05;
  border-color: #3F6212;
}
html[data-theme="dark"] .option.study .copy strong { color: #E0F2FE; }
html[data-theme="dark"] .option.quiz .copy strong { color: #ECFCCB; }
html[data-theme="dark"] .option.study .copy small { color: #7DD3FC; }
html[data-theme="dark"] .option.quiz .copy small { color: #BEF264; }

@media (min-width: 560px) {
  .sheet-root { align-items: center; }
}
</style>
