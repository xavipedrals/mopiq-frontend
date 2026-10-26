<template>
  <Teleport to="body">
    <div
      v-if="open"
      v-dialog-focus
      class="tutorial-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-tutorial-title"
      aria-describedby="study-tutorial-description"
      @keydown.esc.stop.prevent="$emit('done')"
    >
      <section class="tutorial-sheet">
        <header class="tutorial-utility">
          <span>{{ $t('tutorial.practice') }}</span>
          <button type="button" @click="$emit('done')">{{ $t('tutorial.skip') }}</button>
        </header>

        <div class="tutorial-dots" role="progressbar" :aria-label="$t('tutorial.practice')" :aria-valuenow="step + 1" aria-valuemin="1" aria-valuemax="3">
          <span v-for="index in 3" :key="index" :class="{ on: index <= step + 1 }"></span>
        </div>

        <div :key="`heading-${step}`" class="tutorial-heading" aria-live="polite" aria-atomic="true">
          <h2 id="study-tutorial-title">{{ $t(`tutorial.${steps[step]}Title`) }}</h2>
          <p id="study-tutorial-description">{{ $t(`tutorial.${steps[step]}Body`) }}</p>
        </div>

        <div class="practice-content">
          <Transition name="tutorial-step" mode="out-in" @after-enter="focusAction">
            <button v-if="step < 2" key="card" type="button" class="practice-card" :disabled="step === 1" :aria-label="step === 0 ? $t('study.showAnswer') : undefined" @click="reveal">
              <span class="sample-flag" aria-hidden="true">🇯🇵</span>
              <span class="eyebrow">{{ $t('tutorial.questionLabel') }}</span>
              <span class="sample-question">{{ $t('tutorial.question') }}</span>
              <Transition name="tutorial-answer">
                <span v-if="step === 1" class="sample-answer">
                  <span class="answer-rule"></span>
                  <span class="eyebrow">{{ $t('tutorial.answerLabel') }}</span>
                  <strong>{{ $t('tutorial.answer') }}</strong>
                </span>
              </Transition>
            </button>

            <div v-else key="schedule" class="practice-schedule">
              <div class="picked-review">
                <span class="eyebrow">{{ $t('tutorial.youPicked') }}</span>
                <div class="picked-rating">
                  <span class="interval-label">{{ $t(`tutorial.${selected.interval}`) }}</span>
                  <div class="rating-button picked-button" :class="selected.id" :aria-label="$t(`study.${selected.id}`)">
                    <svg class="rating-face" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 9h.01M15.5 9h.01"/><path :d="selected.mouth"/></svg>
                    <span>{{ $t(`study.${selected.id}`) }}</span>
                  </div>
                </div>
              </div>
              <svg class="schedule-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6"/></svg>
              <div class="next-review" aria-live="polite" aria-atomic="true">
                <span class="eyebrow">{{ $t('tutorial.nextReview') }}</span>
                <strong class="next-interval">{{ $t(`tutorial.${selected.interval}`) }}</strong>
                <ol class="review-calendar" :aria-label="$t('tutorial.nextReview')">
                  <li v-for="day in calendarDays" :key="day.offset" :class="{ selected: day.offset === selected.day, today: day.offset === 0 }" :aria-current="day.offset === 0 ? 'date' : undefined" :aria-label="day.label + (day.offset === selected.day ? ` · ${$t('tutorial.nextReview')}` : '')" :data-selected="day.offset === selected.day">
                    <span>{{ day.weekday }}</span><strong>{{ day.number }}</strong>
                  </li>
                </ol>
              </div>
            </div>
          </Transition>
        </div>

        <div class="tutorial-actions">
          <button v-if="step === 0" ref="primaryAction" type="button" class="tutorial-primary" @click="reveal">{{ $t('study.showAnswer') }}</button>
          <div v-else-if="step === 1" class="tutorial-ratings">
            <div v-for="(grade, index) in grades" :key="grade.id" class="rating-choice" :style="{ '--entrance-delay': `${index * 70}ms` }">
              <span class="interval-label"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>{{ $t(`tutorial.${grade.interval}`) }}</span>
              <button ref="ratingButtons" type="button" class="rating-button" :class="grade.id" :aria-label="$t(`study.${grade.id}`)" @click="rate(grade.id)">
                <svg class="rating-face" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 9h.01M15.5 9h.01"/><path :d="grade.mouth"/></svg>
                <span>{{ $t(`study.${grade.id}`) }}</span>
              </button>
            </div>
          </div>
          <button v-else ref="primaryAction" type="button" class="tutorial-primary" @click="$emit('done')">{{ $t('tutorial.start') }}</button>
        </div>
        <p class="practice-note">{{ $t('tutorial.safePractice') }}</p>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { dialogFocus } from '../dialogFocus';
import { localeTag } from '../i18n';

const GRADES = [
  { id: 'again', interval: 'fewMinutes', day: 0, mouth: 'M8 16q4-5 8 0' },
  { id: 'hard', interval: 'tomorrow', day: 1, mouth: 'M8 15h8' },
  { id: 'good', interval: 'twoDays', day: 2, mouth: 'M8 14q4 5 8 0' },
  { id: 'easy', interval: 'fiveDays', day: 5, mouth: 'M7.5 13.5q4.5 7 9 0Z' },
];

export default {
  directives: { dialogFocus },
  props: { open: Boolean },
  emits: ['done'],
  data: () => ({ step: 0, selectedGrade: 'easy', today: new Date(), steps: ['recall', 'rating', 'scheduled'], grades: GRADES }),
  computed: {
    selected() { return this.grades.find(grade => grade.id === this.selectedGrade); },
    calendarDays() {
      const locale = localeTag();
      return Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + offset, 12);
        return {
          offset,
          number: new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date),
          weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
          label: new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date),
        };
      });
    },
  },
  watch: {
    open(value) {
      if (value) { this.step = 0; this.selectedGrade = 'easy'; this.today = new Date(); }
    },
    step() { this.$nextTick(this.focusAction); },
  },
  mounted() {
    this.onDocumentEscape = event => {
      if (this.open && event.key === 'Escape') {
        event.preventDefault();
        this.$emit('done');
      }
    };
    document.addEventListener('keydown', this.onDocumentEscape);
  },
  beforeUnmount() { document.removeEventListener('keydown', this.onDocumentEscape); },
  methods: {
    reveal() { if (this.step === 0) this.step = 1; },
    rate(grade) { if (this.step === 1) { this.selectedGrade = grade; this.step = 2; } },
    focusAction() {
      const control = this.step === 1 ? this.$refs.ratingButtons?.[0] : this.$refs.primaryAction;
      control?.focus({ preventScroll: true });
    },
  },
};
</script>

<style scoped>
.tutorial-root {
  --tutorial-canvas: #E2E8F0;
  --tutorial-paper: #FFFFFF;
  --tutorial-date: #F1F5F9;
  position: fixed;
  inset: 0;
  z-index: 95;
  display: grid;
  place-items: center;
  padding-inline: 24px;
  overflow: auto;
  background: var(--tutorial-canvas);
  color: var(--title);
  font-family: Inter, system-ui, -apple-system, sans-serif;
}
.tutorial-sheet {
  width: min(600px, 100%);
  height: min(900px, 100dvh);
  padding-block: 20px 16px;
  display: grid;
  grid-template-rows: auto auto auto minmax(220px, 1fr) auto auto;
  gap: 24px;
}
.tutorial-utility { display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 13px; }
.tutorial-utility button { min-height: 36px; border: 0; padding: 6px 8px; background: transparent; color: var(--blue-button); font: inherit; cursor: pointer; }
.tutorial-dots { display: flex; gap: 6px; }
.tutorial-dots span { height: 4px; flex: 1; border-radius: 99px; background: color-mix(in srgb, var(--text-secondary) 24%, transparent); }
.tutorial-dots .on { background: var(--blue-button); }
.tutorial-heading { animation: heading-entrance 240ms ease-out both; }
.tutorial-heading h2 { margin: 0 0 8px; font-size: 32px; line-height: 1.18; font-weight: 750; letter-spacing: -.025em; }
.tutorial-heading p { margin: 0; font-size: 17px; line-height: 1.6; color: var(--text-secondary); }
.practice-content { width: 100%; height: 100%; max-height: 360px; min-height: 0; align-self: center; container-type: size; }
.practice-card {
  width: 100%; height: 100%; border: 0; border-radius: 28px; padding: 28px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  background: var(--tutorial-paper); color: var(--title); font: inherit;
  box-shadow: 0 5px 12px #0000000a; cursor: pointer;
}
.practice-card:disabled { cursor: default; opacity: 1; }
.sample-flag { font-size: 46px; line-height: 1.2; }
.eyebrow { font-size: 12px; line-height: 1.3; letter-spacing: 1.5px; font-weight: 700; color: var(--text-secondary); text-align: center; }
.sample-question { font-size: 24px; line-height: 1.25; font-weight: 700; text-align: center; }
.sample-answer { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }
.answer-rule { height: 1px; width: 100%; margin-block: 4px; background: var(--separator); }
.sample-answer strong { color: var(--blue-button); font-size: 36px; line-height: 1.15; font-weight: 750; }
.tutorial-actions { min-height: 120px; display: flex; align-items: flex-end; padding-bottom: 4px; }
.tutorial-primary { width: 100%; min-height: 60px; border: 0; border-radius: 999px; padding: 16px 24px; background: var(--blue-button); color: var(--button-text); font: inherit; font-size: 17px; font-weight: 650; cursor: pointer; }
.tutorial-ratings { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; width: 100%; }
.rating-choice { display: flex; flex-direction: column; gap: 6px; min-width: 0; animation: rating-entrance 350ms ease-out var(--entrance-delay) both; }
.interval-label { display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 30px; color: var(--text-secondary); font-size: 12px; line-height: 1.25; text-align: center; }
.interval-label svg { width: 13px; height: 13px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.5; }
.rating-button { height: 68px; width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px; border: 1px solid var(--rating-border); border-radius: 20px; box-shadow: 0 4px 0 var(--rating-border); background: var(--rating-bg); color: var(--rating-text); font: inherit; font-size: 15px; font-weight: 650; cursor: pointer; transition: transform 100ms, box-shadow 100ms; }
button.rating-button:active { transform: translateY(4px); box-shadow: 0 0 0 var(--rating-border); }
.rating-face { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.again { --rating-bg: var(--grade-again-bg); --rating-border: var(--grade-again-border); --rating-text: var(--grade-again-text); }
.hard { --rating-bg: var(--grade-hard-bg); --rating-border: var(--grade-hard-border); --rating-text: var(--grade-hard-text); }
.good { --rating-bg: var(--grade-good-bg); --rating-border: var(--grade-good-border); --rating-text: var(--grade-good-text); }
.easy { --rating-bg: var(--grade-easy-bg); --rating-border: var(--grade-easy-border); --rating-text: var(--grade-easy-text); }
.practice-schedule { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
.picked-review { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.picked-rating { width: 112px; }
.picked-button { cursor: default; animation: demonstrate-press 2900ms 550ms infinite; }
.schedule-arrow { width: 20px; height: 20px; flex: 0 0 auto; fill: none; stroke: var(--text-secondary); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.next-review { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; }
.next-interval { max-width: 100%; font-size: clamp(30px, 4vw, 48px); line-height: 1.1; font-weight: 750; letter-spacing: -.025em; color: var(--blue-button); text-align: center; }
.review-calendar { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; width: 100%; padding: 0; margin: 8px 0 0; list-style: none; }
.review-calendar li { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-width: 0; height: 64px; border: 2px solid transparent; border-radius: 12px; background: var(--tutorial-date); color: var(--text-secondary); }
.review-calendar li span { font-size: 11px; }
.review-calendar li strong { font-size: 17px; }
.review-calendar .today:not(.selected) { border-color: color-mix(in srgb, var(--text-secondary) 25%, transparent); }
.review-calendar .selected { background: var(--blue-button); color: var(--button-text); }
.practice-note { margin: 0; text-align: center; color: var(--text-secondary); font-size: 12px; line-height: 1.4; }
button:focus-visible { outline: 2px solid var(--blue-button); outline-offset: 5px; }
.tutorial-step-enter-active, .tutorial-step-leave-active, .tutorial-answer-enter-active { transition: opacity 180ms, transform 250ms; }
.tutorial-step-enter-from { opacity: 0; transform: translateX(24px); }
.tutorial-step-leave-to { opacity: 0; transform: translateX(-16px); }
.tutorial-answer-enter-from { opacity: 0; transform: translateY(12px); }
@keyframes heading-entrance { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes rating-entrance { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes demonstrate-press { 0%, 19%, 100% { transform: none; box-shadow: 0 4px 0 var(--rating-border); } 7%, 12% { transform: translateY(4px); box-shadow: 0 0 0 var(--rating-border); } }
@container (max-height: 310px) {
  .picked-review { flex-direction: row; gap: 16px; }
  .practice-schedule { gap: 10px; }
  .schedule-arrow { display: none; }
  .review-calendar li { height: 48px; gap: 3px; }
  .sample-flag { font-size: 30px; }
  .practice-card { gap: 8px; padding: 18px; }
  .sample-question { font-size: 21px; }
  .sample-answer { gap: 6px; }
  .sample-answer strong { font-size: 30px; }
}
@media (max-height: 740px) {
  .tutorial-sheet { gap: 12px; padding-block: 10px; }
  .tutorial-heading h2 { font-size: 26px; }
  .tutorial-heading p { font-size: 15px; line-height: 1.45; }
  .tutorial-actions { min-height: 100px; }
}
@media (max-width: 480px) {
  .tutorial-root { padding-inline: 20px; }
  .tutorial-sheet { gap: 18px; }
  .tutorial-heading h2 { font-size: 28px; }
  .rating-button { font-size: 13px; }
  .interval-label { font-size: 11px; }
}
@media (max-height: 520px) and (min-width: 650px) {
  .tutorial-sheet { width: min(900px, 100%); grid-template-columns: 1fr 1fr; grid-template-rows: auto auto 1fr auto auto; column-gap: 32px; grid-template-areas: 'utility utility' 'progress progress' 'heading content' 'actions content' 'note note'; }
  .tutorial-utility { grid-area: utility; }
  .tutorial-dots { grid-area: progress; }
  .tutorial-heading { grid-area: heading; }
  .practice-content { grid-area: content; }
  .tutorial-actions { grid-area: actions; }
  .practice-note { grid-area: note; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
</style>

<style>
html[data-theme='dark'] .tutorial-root { --tutorial-canvas: #1E293C; --tutorial-paper: #020617; --tutorial-date: #334155; }
</style>
