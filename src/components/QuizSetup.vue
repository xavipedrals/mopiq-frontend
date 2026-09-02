<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-setup-title"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <header class="sheet-header">
          <h2 id="quiz-setup-title">{{ $t('quiz.title') }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </header>

        <form class="sheet-body" @submit.prevent="start">
          <h3>{{ $t('quiz.source') }}</h3>
          <div class="rows" role="radiogroup" :aria-label="$t('quiz.source')">
            <label
              v-for="option in sources"
              :key="option.value"
              class="row-pick"
              :class="{ on: source === option.value }"
            >
              <input v-model="source" class="sr" type="radio" name="quiz-source" :value="option.value">
              <span class="tile">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="option.icon" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="row-copy">
                <span class="row-title">{{ $t(option.title) }}</span>
                <span class="row-body">{{ $t(option.body) }}</span>
              </span>
              <span class="mark"><CheckGlyph /></span>
            </label>
          </div>

          <h3>{{ $t('quiz.count') }}</h3>
          <div class="grid-3" role="group" :aria-label="$t('quiz.count')">
            <button
              v-for="preset in countPresets"
              :key="preset"
              type="button"
              class="pick"
              :class="{ on: countMode === String(preset) }"
              @click="setCount(preset)"
            >
              {{ preset }}
              <span v-if="countMode === String(preset)" class="badge"><CheckGlyph /></span>
            </button>
            <button
              v-if="countMode !== 'custom'"
              type="button"
              class="pick"
              @click="useCustomCount"
            >
              {{ $t('quiz.custom') }}
            </button>
            <div v-else class="pick on as-input">
              <input
                ref="customInput"
                v-model.number="customCount"
                type="number"
                min="10"
                max="1000"
                :aria-label="$t('quiz.custom')"
                required
              >
              <span class="badge"><CheckGlyph /></span>
            </div>
          </div>

          <h3>{{ $t('quiz.types') }}</h3>
          <div class="grid-2">
            <button
              v-for="type in questionTypes"
              :key="type.key"
              type="button"
              class="type-pick"
              :class="{ on: isTypeOn(type.key) }"
              :aria-pressed="isTypeOn(type.key)"
              @click="toggleType(type.key)"
            >
              <svg class="type-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="type.icon" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="type-title">{{ $t(type.title) }}</span>
              <span class="mark inset"><CheckGlyph /></span>
            </button>
          </div>

          <h3>{{ $t('quiz.difficulty') }}</h3>
          <div class="grid-3" role="radiogroup" :aria-label="$t('quiz.difficulty')">
            <label
              v-for="level in difficulties"
              :key="level"
              class="pick"
              :class="{ on: difficulty === level }"
            >
              <input v-model="difficulty" class="sr" type="radio" name="quiz-difficulty" :value="level">
              {{ $t(`quiz.${level}`) }}
              <span v-if="difficulty === level" class="badge"><CheckGlyph /></span>
            </label>
          </div>

          <p v-if="error" class="error">{{ error }}</p>
          <div class="sheet-actions">
            <button type="button" class="pill-btn ghost" @click="onCancel">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="pill-btn">
              {{ $t('quiz.start') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script>
import CheckGlyph from './CheckGlyph.vue';

const SOURCES = [
  {
    value: 'all',
    title: 'quiz.all',
    body: 'quiz.allBody',
    icon: 'M7 3.6h10M4.6 7.1h14.8M4 10.6h16a1 1 0 0 1 1 1v7.8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7.8a1 1 0 0 1 1-1Z',
  },
  {
    value: 'studied',
    title: 'quiz.studied',
    body: 'quiz.studiedBody',
    icon: 'M12 3.7 22 8.6l-10 4.9L2 8.6l10-4.9ZM6.6 11.1v4.6c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.6',
  },
];

const QUESTION_TYPES = [
  {
    key: 'multi',
    title: 'quiz.multiple',
    icon: 'M9.5 2.8h5a1.2 1.2 0 0 1 1.2 1.2v1.4H8.3V4a1.2 1.2 0 0 1 1.2-1.2ZM8.3 4.6H6.4a1.6 1.6 0 0 0-1.6 1.6v13a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6v-13a1.6 1.6 0 0 0-1.6-1.6h-1.9M8.6 11h.1M11.6 11h4.1M8.6 15.2h.1M11.6 15.2h4.1',
  },
  {
    key: 'trueFalse',
    title: 'quiz.trueFalse',
    icon: 'M4.6 10.9h3.1v9.4H4.6a.8.8 0 0 1-.8-.8v-7.8a.8.8 0 0 1 .8-.8ZM7.7 11.9 12 3.9a1.9 1.9 0 0 1 3.5 1.1l-.9 4h3.7a1.9 1.9 0 0 1 1.8 2.4l-1.7 6.4a2.4 2.4 0 0 1-2.3 1.8H7.7',
  },
];

export default {
  name: 'QuizSetup',
  components: { CheckGlyph },
  props: {
    open: { type: Boolean, default: false },
    deck: { type: Object, default: null },
  },
  emits: ['dismiss', 'start'],
  data() {
    return {
      source: 'all',
      countMode: '10',
      customCount: 20,
      multi: true,
      trueFalse: true,
      difficulty: 'medium',
      error: '',
      countPresets: [10, 40],
      difficulties: ['easy', 'medium', 'hard'],
      sources: SOURCES,
      questionTypes: QUESTION_TYPES,
    };
  },
  computed: {
    count() {
      if (this.countMode === 'custom') {
        return Number(this.customCount) || 0;
      }
      return Number(this.countMode);
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.error = '';
    },
  },
  methods: {
    setCount(value) {
      this.countMode = String(value);
    },
    useCustomCount() {
      this.countMode = 'custom';
      void this.$nextTick(() => this.$refs.customInput?.focus());
    },
    isTypeOn(key) {
      return Boolean(this[key]);
    },
    toggleType(key) {
      const other = key === 'multi' ? 'trueFalse' : 'multi';
      if (this[key] && !this[other]) return;
      this[key] = !this[key];
      this.error = '';
    },
    onCancel() {
      this.$emit('dismiss');
    },
    start() {
      if (!this.multi && !this.trueFalse) {
        this.error = this.$t('quiz.needType');
        return;
      }
      if (this.count < 10) {
        this.error = this.$t('quiz.minQuestions');
        return;
      }
      this.error = '';
      this.$emit('start', {
        source: this.source,
        count: Math.min(1000, this.count),
        multi: this.multi,
        trueFalse: this.trueFalse,
        difficulty: this.difficulty,
      });
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
  align-items: center;
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
  width: min(560px, 100%);
  max-height: min(92vh, 880px);
  overflow: auto;
  background: var(--card-bg);
  border-radius: 28px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
}
.sheet-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 12px;
  background: var(--card-bg);
}
.sheet-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 750;
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
.sheet-body { padding: 4px 22px 24px; }
h3 {
  margin: 24px 0 12px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
h3:first-child { margin-top: 8px; }
.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* ---------- source rows ---------- */
.rows { display: grid; gap: 18px; }
.row-pick {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 20px;
  border: 1px solid var(--quiz-pick-border);
  background: var(--quiz-pick-bg);
  cursor: pointer;
}
.row-pick.on {
  border: 2px solid var(--quiz-pick-on-border);
  padding: 11px;
  background: var(--quiz-pick-on-bg);
}
.tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--quiz-pick-border);
  background: var(--quiz-pick-icon-bg);
  color: var(--title);
}
.row-pick.on .tile {
  border-color: transparent;
  background: var(--quiz-pick-on-border);
  color: #fff;
}
.tile svg { width: 22px; height: 22px; }
.row-copy { flex: 1; padding: 4px 0 6px; }
.row-title {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--title);
}
.row-pick.on .row-title { color: var(--quiz-pick-on-title); }
.row-body {
  display: block;
  margin-top: 4px;
  font-size: 0.93rem;
  line-height: 1.4;
  color: var(--text);
}
.row-pick.on .row-body { color: var(--quiz-pick-on-text); }
.mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border-radius: 50%;
  border: 1px solid var(--quiz-pick-border);
  color: transparent;
}
.row-pick.on .mark,
.type-pick.on .mark {
  border-color: transparent;
  background: var(--quiz-pick-on-border);
  color: #fff;
}

/* ---------- pill grids ---------- */
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.pick {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 8px;
  border-radius: 20px;
  border: 1px solid var(--quiz-pick-border);
  background: var(--quiz-pick-bg);
  color: var(--title);
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  text-align: center;
}
.pick.on {
  border: 2px solid var(--quiz-pick-on-border);
  background: var(--quiz-pick-on-bg);
  color: var(--quiz-pick-on-title);
  font-weight: 700;
}
.pick.as-input { padding: 0; }
.pick.as-input input {
  width: 100%;
  height: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: var(--quiz-pick-on-title);
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
}
.pick.as-input input:focus { outline: none; }
.pick.as-input input::-webkit-outer-spin-button,
.pick.as-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.pick.as-input input { appearance: textfield; }
.badge {
  position: absolute;
  top: -8px;
  right: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--quiz-pick-on-border);
  color: #fff;
}

/* ---------- question type cards ---------- */
.type-pick {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 14px;
  border-radius: 20px;
  border: 1px solid var(--quiz-pick-border);
  background: var(--quiz-pick-bg);
  color: var(--title);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.type-pick.on {
  border: 2px solid var(--quiz-pick-on-border);
  padding: 17px 13px;
  background: var(--quiz-pick-on-bg);
  color: var(--quiz-pick-on-title);
}
.type-icon { width: 24px; height: 24px; }
.type-pick.on .type-icon { color: var(--quiz-pick-on-text); }
.type-title { font-size: 1rem; line-height: 1.4; padding-right: 24px; }
.type-pick.on .type-title { font-weight: 600; }
.mark.inset {
  position: absolute;
  top: 14px;
  right: 14px;
  margin-top: 0;
}

/* ---------- footer ---------- */
.sheet-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}
.pill-btn {
  flex: 1;
  border: 0;
  border-radius: 20px;
  background: var(--blue-button);
  color: var(--button-text);
  font: inherit;
  font-weight: 700;
  font-size: 1rem;
  padding: 15px 20px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.pill-btn:hover { background: var(--blue-button-hover); }
.pill-btn.ghost { flex: 0 0 auto; background: var(--secondary-btn-bg); color: var(--secondary-btn-text); }
.pill-btn.ghost:hover { background: var(--secondary-btn-hover); }
.error { margin: 16px 0 0; color: var(--error); }

@media (max-width: 420px) {
  .sheet-body { padding: 4px 16px 20px; }
  .sheet-header { padding: 18px 16px 12px; }
  .grid-3 { gap: 8px; }
  .pick { font-size: 0.94rem; }
}
</style>
