<template>
  <Teleport to="body">
    <div v-if="open" class="checkpoint-root">
      <div class="checkpoint-backdrop"></div>
      <section class="checkpoint-sheet" role="dialog" aria-modal="true" aria-labelledby="checkpoint-title">
        <div class="checkpoint-scroll">
          <p class="checkpoint-kicker">{{ $t('checkpoint.kicker') }}</p>
          <h2 id="checkpoint-title">{{ $t('checkpoint.title') }}</h2>
          <div class="checkpoint-rule"></div>

          <div class="grade-head">
            <div class="grade-value">
              <span class="grade-num">{{ grade }}</span>
              <span class="grade-pct">{{ $t('checkpoint.gradePct') }}</span>
            </div>
            <button type="button" class="help-btn" :aria-label="$t('checkpoint.gradeHelp')" @click="showHelp = !showHelp">?</button>
          </div>
          <p v-if="showHelp" class="help-copy">
            {{ $t('checkpoint.gradeCopy') }}
          </p>
          <div class="stack-bar" aria-hidden="true">
            <div class="stack-seg easy" :style="{ width: percentStyle(percents.easy) }"></div>
            <div class="stack-seg good" :style="{ width: percentStyle(percents.good) }"></div>
            <div class="stack-seg hard" :style="{ width: percentStyle(percents.hard) }"></div>
            <div class="stack-seg again" :style="{ width: percentStyle(percents.again) }"></div>
          </div>
          <div class="count-row">
            <div v-for="item in countItems" :key="item.ease" class="count-item">
              <div class="count-name">{{ item.label }}</div>
              <div class="count-val">
                <span class="dot" :style="{ background: item.color }"></span>
                {{ item.count }}
              </div>
            </div>
          </div>

          <div class="checkpoint-rule"></div>
          <div class="stat-row">
            <span>{{ $t('checkpoint.timeStudied') }}</span>
            <strong>{{ timeStudiedLabel }}</strong>
          </div>
          <div class="stat-row">
            <span>{{ $t('checkpoint.uniqueStudied') }}</span>
            <strong>{{ uniqueStudied }} <em>/ {{ uniqueTotal }}</em></strong>
          </div>
          <div class="stat-row last">
            <span>{{ $t('checkpoint.timeLeft') }}</span>
            <strong>{{ timeLeftLabel }}</strong>
          </div>
        </div>

        <div class="checkpoint-actions">
          <button type="button" class="mopiq-btn secondary" @click="$emit('stats')">{{ $t('checkpoint.stats') }}</button>
          <button type="button" class="mopiq-btn" @click="$emit('continue')">{{ $t('checkpoint.tenMore') }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import {
  GRADE_COLORS,
  estimatedTimeLeft,
  formatStudyDuration,
  gradeCounts,
  sessionGrade,
  stackedPercents,
} from '../study/sessionProgress';

export default {
  name: 'StudyCheckpoint',
  props: {
    open: { type: Boolean, default: false },
    answers: { type: Array, default: () => [] },
    remaining: { type: Number, default: 0 },
    uniqueStudied: { type: Number, default: 0 },
    uniqueTotal: { type: Number, default: 0 },
    elapsedSeconds: { type: Number, default: 0 },
  },
  emits: ['continue', 'stats'],
  data() {
    return { showHelp: false };
  },
  computed: {
    grade() {
      return sessionGrade(this.answers);
    },
    percents() {
      return stackedPercents(this.answers, this.answers.length + this.remaining);
    },
    counts() {
      return gradeCounts(this.answers);
    },
    countItems() {
      return [
        { ease: 'AGAIN', label: this.$t('study.again'), color: GRADE_COLORS.AGAIN, count: this.counts.AGAIN },
        { ease: 'HARD', label: this.$t('study.hard'), color: GRADE_COLORS.HARD, count: this.counts.HARD },
        { ease: 'GOOD', label: this.$t('study.good'), color: GRADE_COLORS.GOOD, count: this.counts.GOOD },
        { ease: 'EASY', label: this.$t('study.easy'), color: GRADE_COLORS.EASY, count: this.counts.EASY },
      ];
    },
    timeStudiedLabel() {
      return formatStudyDuration(this.elapsedSeconds);
    },
    timeLeftLabel() {
      const seconds = estimatedTimeLeft(this.elapsedSeconds, this.answers.length, this.remaining);
      return seconds == null ? '—' : formatStudyDuration(seconds);
    },
  },
  methods: {
    percentStyle(value) {
      return `${Math.max(0, Math.min(1, value)) * 100}%`;
    },
  },
};
</script>

<style scoped>
.checkpoint-root {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.checkpoint-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}
.checkpoint-sheet {
  position: relative;
  width: min(560px, 100%);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.2);
}
.checkpoint-scroll {
  overflow: auto;
  padding: 28px 0 12px;
}
.checkpoint-kicker {
  margin: 0 24px 10px;
  text-align: center;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-secondary);
}
.checkpoint-sheet h2 {
  margin: 0 24px 20px;
  text-align: center;
  font-size: 2rem;
  font-weight: 750;
  color: var(--title);
}
.checkpoint-rule {
  height: 1px;
  background: var(--separator);
  margin-bottom: 20px;
}
.grade-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 24px 12px;
}
.grade-num {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  color: var(--blue-button);
}
.grade-pct {
  margin-left: 6px;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--blue-button);
}
.help-btn {
  width: 28px;
  height: 28px;
  margin-top: 6px;
  border: 0;
  border-radius: 50%;
  background: var(--inset-bg) !important;
  color: var(--text) !important;
  font-weight: 800 !important;
  padding: 0 !important;
}
.help-copy {
  margin: 0 24px 16px;
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.45;
}
.stack-bar {
  position: relative;
  height: 24px;
  margin: 0 24px 24px;
  border-radius: 8px;
  background: var(--empty-bar);
  overflow: hidden;
}
.stack-seg {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 8px;
}
.stack-seg.easy { background: #38bdf8; }
.stack-seg.good { background: #a3e635; }
.stack-seg.hard { background: #fbbf24; }
.stack-seg.again { background: #f87171; }
.count-row {
  display: flex;
  gap: 28px;
  padding: 0 28px 8px;
  flex-wrap: wrap;
}
.count-name {
  font-size: 0.88rem;
  color: var(--text);
  margin-bottom: 6px;
}
.count-val {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--title);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid var(--separator);
  color: var(--text);
  font-size: 1.05rem;
}
.stat-row strong { color: var(--blue-button); font-weight: 700; }
.stat-row em {
  font-style: normal;
  font-weight: 500;
  color: var(--text-secondary);
}
.stat-row.last { border-bottom: 0; }
.checkpoint-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 24px 28px;
}
.mopiq-btn {
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
  border-radius: 50px !important;
  font-weight: 600 !important;
  padding: 12px 18px !important;
}
.mopiq-btn.secondary {
  background: var(--secondary-btn-bg) !important;
  color: var(--secondary-btn-text) !important;
}
@media (min-width: 640px) {
  .checkpoint-root { align-items: center; }
  .checkpoint-sheet {
    max-height: 86vh;
    border-radius: 28px;
  }
}
</style>
