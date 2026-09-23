<template>
  <div class="deck-stats">
    <section class="stat-card ring-card">
      <button
        type="button"
        class="info-btn"
        :aria-label="$t('deck.cardsToStudyToday')"
        @click="infoOpen = true"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2.5A9.5 9.5 0 1 0 21.5 12 9.51 9.51 0 0 0 12 2.5Zm0 14.4a1.15 1.15 0 1 1-1.15 1.15A1.15 1.15 0 0 1 12 16.9Zm1.22-3.18c-.58.34-.82.55-.82 1.08v.22h-1.8v-.34c0-1.18.66-1.86 1.4-2.28.62-.36.96-.62.96-1.14 0-.62-.46-1.06-1.18-1.06-.78 0-1.28.42-1.46 1.1l-1.76-.46c.34-1.4 1.58-2.34 3.28-2.34 1.9 0 3.08 1.12 3.08 2.62 0 1.2-.7 1.86-1.7 2.46Z"
          />
        </svg>
      </button>
      <div class="ring">
        <svg class="ring-svg" viewBox="0 0 200 108" aria-hidden="true" focusable="false">
          <path class="ring-track" :d="ARC" />
          <path class="ring-fill" :d="ARC" :style="{ strokeDasharray: dashArray }" />
        </svg>
        <p class="ring-num">
          <SkeletonBlock v-if="waitingForStats" w="2.4ch" h="0.7em" radius="12px" />
          <template v-else>
            <DoneBadge v-if="hasStats && cardsForToday === 0" class="ring-seal" />
            <span>{{ hasStats ? cardsForToday : '—' }}</span>
          </template>
        </p>
      </div>
      <p class="ring-label">{{ $t('deck.cardsToStudyToday') }}</p>

      <div class="chips">
        <div class="chip new">
          <p class="chip-count">
            <SkeletonBlock v-if="waitingForStats" w="2.4ch" h="0.8em" radius="7px" />
            <template v-else>
              <DoneBadge v-if="hasStats && newCount === 0" class="chip-seal" />
              <span>{{ hasStats ? newCount : '—' }}</span>
            </template>
          </p>
          <p class="chip-label">{{ $t('deck.newCards') }}</p>
        </div>
        <div class="chip review">
          <p class="chip-count">
            <SkeletonBlock v-if="waitingForStats" w="2.4ch" h="0.8em" radius="7px" />
            <template v-else>
              <DoneBadge v-if="hasStats && reviewCount === 0" class="chip-seal" />
              <span>{{ hasStats ? reviewCount : '—' }}</span>
            </template>
          </p>
          <p class="chip-label">{{ $t('deck.toReview') }}</p>
        </div>
      </div>
    </section>

    <div class="study-slot">
      <slot name="study"></slot>
    </div>

    <div class="side">
      <section class="stat-card grade-card">
        <div class="grade-top">
          <SkeletonBlock v-if="gradePending" w="6.2ch" h="2.6rem" radius="12px" />
          <template v-else-if="gradeAvailable && histogram.total > 0">
            <b>{{ histogram.grade }}</b><i>%</i>
            <small>{{ $t('deck.grade') }}</small>
          </template>
          <template v-else>
            <b>—</b><small>{{ $t('deck.grade') }}</small>
          </template>
        </div>
        <p v-if="!gradePending && (!gradeAvailable || !histogram.total)" role="status">
          {{ $t(gradeSyncing ? 'deck.gradeSyncing' : gradeAvailable ? 'deck.gradeEmpty' : 'deck.gradeUnavailable') }}
        </p>
        <button v-if="!gradePending && !gradeAvailable" class="text-btn" @click="$emit('retry-grade')">
          {{ $t('common.retry') }}
        </button>
        <div v-if="gradeAvailable && !gradePending && histogram.total > 0" class="stack">
          <i class="seg again" :style="{ width: percent(shares.again) }"></i>
          <i class="seg hard" :style="{ width: percent(shares.hard) }"></i>
          <i class="seg good" :style="{ width: percent(shares.good) }"></i>
          <i class="seg easy" :style="{ width: percent(shares.easy) }"></i>
        </div>
        <div v-if="gradeAvailable && !gradePending && histogram.total > 0" class="legend">
          <div v-for="item in gradeItems" :key="item.ease" class="legend-item">
            <span>{{ item.label }}</span>
            <p>
              <i class="dot" :style="{ background: item.color }"></i>
              <SkeletonBlock v-if="gradePending" w="2ch" h="0.85rem" radius="5px" />
              <b v-else>{{ item.count }}</b>
            </p>
          </div>
        </div>
      </section>

      <section class="stat-card time-card">
        <p class="kicker">{{ $t('deck.timeStudiedToday') }}</p>
        <p class="time-big">
          <SkeletonBlock v-if="timePending" w="4ch" h="0.8em" radius="14px" />
          <span v-for="part in todayParts" v-else :key="part.unit" class="part">{{ part.value }}<i>{{ part.unit }}</i></span>
        </p>
        <div class="time-rule" aria-hidden="true"></div>
        <div class="time-meta">
          <SkeletonBlock v-if="timePending" class="meta-skeleton" w="220px" h="1.05rem" radius="6px" />
          <template v-else>
            <b>{{ $t('deck.timeTotal', { time: totalLabel }) }}</b>
            <template v-if="sinceLabel">
              <span class="dot-sep">•</span>
              <span>{{ sinceLabel }}</span>
            </template>
            <span class="dot-sep">•</span>
            <span>{{ $t('deck.timeActiveDays', { days: time.activeDays }) }}</span>
          </template>
        </div>
      </section>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="infoOpen"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dash-info-title"
      @keydown.esc="infoOpen = false"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="infoOpen = false"></button>
      <section class="info-sheet">
        <h2 id="dash-info-title">{{ $t('deck.cardsToStudyToday') }}</h2>
        <p><strong>{{ $t('deck.infoNewTitle') }}</strong><br>{{ $t('deck.infoNewBody') }}</p>
        <p><strong>{{ $t('deck.infoReviewTitle') }}</strong><br>{{ $t('deck.infoReviewBody') }}</p>
        <p><strong>{{ $t('deck.infoToday') }}</strong></p>
        <button type="button" class="mopiq-btn" @click="infoOpen = false">{{ $t('common.ok') }}</button>
      </section>
    </div>
  </Teleport>
</template>

<script>
import DoneBadge from './DoneBadge.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { formatDuration } from '../api/mopiq';
import { localeTag } from '../i18n';
import { durationParts, gaugeProgress, histogramShares, shortDate } from '../study/deckStats';
import { GRADE_COLORS } from '../study/sessionProgress';

// Semicircle trimmed 7° at each end, like iOS SemicircleShape (187° → 353°).
const ARC = 'M16.63 89.76A84 84 0 0 1 183.37 89.76';
const ARC_LENGTH = 243.37;

export default {
  name: 'DeckStats',
  components: { DoneBadge, SkeletonBlock },
  props: {
    listStats: { type: Object, default: null },
    studiedToday: { type: Number, default: 0 },
    time: {
      type: Object,
      default: () => ({ todayMilliseconds: 0, totalMilliseconds: 0, activeDays: 0, firstStudiedAt: null }),
    },
    histogram: {
      type: Object,
      default: () => ({ counts: { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 }, total: 0, grade: 0 }),
    },
    statsPending: { type: Boolean, default: false },
    gradePending: { type: Boolean, default: false },
    gradeAvailable: { type: Boolean, default: true },
    gradeSyncing: { type: Boolean, default: false },
    timePending: { type: Boolean, default: false },
  },
  data() {
    return { ARC, infoOpen: false };
  },
  computed: {
    hasStats() {
      return Boolean(this.listStats?.statsAvailable);
    },
    waitingForStats() {
      return this.statsPending && !this.hasStats;
    },
    cardsForToday() {
      return this.listStats?.cardsForToday || 0;
    },
    newCount() {
      return this.listStats?.newRemainingToday || 0;
    },
    reviewCount() {
      return this.listStats?.reviewDueToday || 0;
    },
    dashArray() {
      const filled = gaugeProgress({
        cardsForToday: this.hasStats ? this.cardsForToday : 0,
        cardsStudiedToday: this.hasStats ? this.studiedToday : 0,
      }) * ARC_LENGTH;
      return `${filled.toFixed(2)} ${ARC_LENGTH}`;
    },
    shares() {
      return histogramShares(this.histogram.counts);
    },
    gradeItems() {
      const counts = this.histogram.counts || {};
      return [
        { ease: 'AGAIN', label: this.$t('study.again'), color: GRADE_COLORS.AGAIN, count: counts.AGAIN || 0 },
        { ease: 'HARD', label: this.$t('study.hard'), color: GRADE_COLORS.HARD, count: counts.HARD || 0 },
        { ease: 'GOOD', label: this.$t('study.good'), color: GRADE_COLORS.GOOD, count: counts.GOOD || 0 },
        { ease: 'EASY', label: this.$t('study.easy'), color: GRADE_COLORS.EASY, count: counts.EASY || 0 },
      ];
    },
    todayParts() {
      return durationParts(this.time.todayMilliseconds);
    },
    totalLabel() {
      return formatDuration(this.time.totalMilliseconds);
    },
    sinceLabel() {
      const since = shortDate(this.time.firstStudiedAt, localeTag());
      return since ? this.$t('deck.timeSince', { date: since }) : '';
    },
  },
  methods: {
    percent(value) {
      return `${Math.max(0, Math.min(1, value || 0)) * 100}%`;
    },
  },
};
</script>

<style scoped>
.deck-stats {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(240px, 352px) minmax(0, 1fr);
  grid-template-areas:
    "ring side"
    "study study";
  align-items: start;
  margin: 18px 0 0;
}
.ring-card { grid-area: ring; }
.side { grid-area: side; }
.study-slot { grid-area: study; }
.stat-card {
  position: relative;
  padding: 24px 18px;
  border-radius: 24px;
  background: var(--card-bg);
  border: 1px solid var(--stat-card-border);
}
.kicker {
  margin: 0 0 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.info-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.info-btn svg { display: block; width: 22px; height: 22px; }

/* ---------- ring card ---------- */
.ring-card { display: flex; flex-direction: column; }
.ring { position: relative; width: min(272px, 100%); margin: 4px auto 0; }
.ring-svg { display: block; width: 100%; height: auto; overflow: visible; }
.ring-track,
.ring-fill {
  fill: none;
  stroke-width: 16;
  stroke-linecap: round;
}
.ring-track { stroke: var(--stat-gauge-track); }
.ring-fill {
  stroke: var(--stat-gauge-fill);
  transition: stroke-dasharray 0.5s ease-in-out;
}
.ring-num {
  --badge-hole: var(--card-bg);
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
  color: var(--title);
}
.ring-seal { color: var(--stat-gauge-fill); font-size: 0.8em; }
.ring-label {
  margin: 4px 0 0;
  text-align: center;
  font-size: 1.125rem;
  color: var(--text-secondary);
  padding-bottom: 18px;
}
.chips {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}
.chip {
  --badge-hole: var(--stat-pill-bg);
  padding: 15px 10px 18px;
  border-radius: 18px;
  background: var(--stat-pill-bg);
  border: 1px solid var(--stat-pill-border);
  text-align: center;
}
.chip-count {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.15;
}
.chip-seal { font-size: 0.75em; }
.chip-label { margin: 0; font-size: 0.875rem; }
.chip.new .chip-count,
.chip.new .chip-label { color: var(--stat-new); }
.chip.review .chip-count,
.chip.review .chip-label { color: var(--stat-review); }

/* ---------- side stack ---------- */
.side { display: grid; gap: 18px; }
.grade-top {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 12px;
  color: var(--blue-button);
}
.grade-top b { font-size: 2.625rem; font-weight: 800; line-height: 1; }
.grade-top i { font-style: normal; font-size: 1.5rem; font-weight: 800; }
.grade-top small {
  margin-left: 4px;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.stack {
  display: flex;
  height: 18px;
  border-radius: 6px;
  background: var(--empty-bar);
  overflow: hidden;
}
.seg { transition: width 0.4s ease-out; }
.seg.again { background: #f87171; }
.seg.hard { background: #fbbf24; }
.seg.good { background: #a3e635; }
.seg.easy { background: #38bdf8; }
.legend {
  display: flex;
  gap: 28px;
  margin-top: 18px;
  padding-left: 3px;
  overflow-x: auto;
}
.legend-item { display: flex; flex-direction: column; gap: 8px; font-size: 0.875rem; }
.legend-item span { color: var(--text); white-space: nowrap; }
.legend-item p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.legend-item b { color: var(--title); font-weight: 700; }

.time-big {
  display: flex;
  align-items: baseline;
  margin: 0 0 12px;
  font-size: clamp(48px, 8vw, 72px);
  font-weight: 700;
  line-height: 0.95;
  color: var(--title);
}
.time-big i {
  font-style: normal;
  font-size: 0.44em;
  font-weight: 600;
  color: var(--text-secondary);
}
.part + .part { margin-left: 8px; }
.time-rule {
  height: 1px;
  margin-bottom: 14px;
  background: var(--stat-rule);
}
.time-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 4px;
  font-size: 0.9375rem;
  line-height: 1.35;
  color: var(--text-secondary);
}
.time-meta b { font-weight: 600; color: var(--title); }
.dot-sep { color: var(--text-secondary); }

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
.info-sheet {
  position: relative;
  width: min(420px, 100%);
  padding: 32px 20px 20px;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
}
.info-sheet h2 {
  margin: 0 0 16px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--title);
}
.info-sheet p {
  margin: 0 0 14px;
  font-size: 1.05rem;
  line-height: 1.45;
  color: var(--text);
}
.info-sheet .mopiq-btn {
  width: 100%;
  margin-top: 8px;
  height: 52px;
  border-radius: 20px !important;
}

@media (max-width: 720px) {
  .deck-stats {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "ring"
      "study"
      "side";
  }
  .chips { flex-direction: row; gap: 18px; }
  .chip { flex: 1 1 0; }
  .legend { gap: 18px; }
  .time-big { font-size: 48px; }
}
@media (prefers-reduced-motion: reduce) {
  .ring-fill,
  .seg { transition: none; }
}
</style>
