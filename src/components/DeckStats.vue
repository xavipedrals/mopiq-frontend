<template>
  <div class="deck-stats">
    <section class="stat-card ring-card">
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

    <div class="side">
      <section class="stat-card grade-card">
        <p class="kicker">{{ $t('deck.grade') }}</p>
        <div class="grade-top">
          <SkeletonBlock v-if="gradePending" w="4.6ch" h="2.6rem" radius="12px" />
          <template v-else>
            <b>{{ histogram.grade }}</b><i>%</i>
            <small>{{ $t('deck.answersCount', { count: shares.total }) }}</small>
          </template>
        </div>
        <div class="stack">
          <i class="seg again" :style="{ width: percent(shares.again) }"></i>
          <i class="seg hard" :style="{ width: percent(shares.hard) }"></i>
          <i class="seg good" :style="{ width: percent(shares.good) }"></i>
          <i class="seg easy" :style="{ width: percent(shares.easy) }"></i>
        </div>
        <div class="legend">
          <div v-for="item in gradeItems" :key="item.ease" class="legend-item">
            <i class="dot" :style="{ background: item.color }"></i>
            <span>{{ item.label }}</span>
            <SkeletonBlock v-if="gradePending" w="2ch" h="0.85rem" radius="5px" />
            <b v-else>{{ item.count }}</b>
          </div>
        </div>
      </section>

      <section class="stat-card time-card">
        <p class="kicker">{{ $t('deck.timeStudiedToday') }}</p>
        <div class="time-row">
          <p class="time-big">
            <SkeletonBlock v-if="timePending" w="4ch" h="0.8em" radius="14px" />
            <span v-for="part in todayParts" v-else :key="part.unit" class="part">{{ part.value }}<i>{{ part.unit }}</i></span>
          </p>
          <div class="time-meta">
            <SkeletonBlock v-if="timePending" class="meta-skeleton" w="150px" h="1.05rem" radius="6px" />
            <template v-else>
              <b>{{ $t('deck.timeTotal', { time: totalLabel }) }}</b>
              <span>{{ historyLabel }}</span>
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
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
    timePending: { type: Boolean, default: false },
  },
  data() {
    return { ARC };
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
    historyLabel() {
      const since = shortDate(this.time.firstStudiedAt, localeTag());
      const parts = since ? [this.$t('deck.timeSince', { date: since })] : [];
      parts.push(this.$t('deck.timeActiveDays', { days: this.time.activeDays }));
      return parts.join(' · ');
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
  gap: 16px;
  grid-template-columns: 340px minmax(0, 1fr);
  margin-bottom: 24px;
}
.stat-card {
  padding: 20px;
  border-radius: 24px;
  background: var(--card-bg);
  border: 1px solid var(--stat-card-border);
  box-shadow: var(--card-shadow);
}
.kicker {
  margin: 0 0 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ---------- ring card ---------- */
.ring-card { display: flex; flex-direction: column; }
.ring { position: relative; width: min(240px, 100%); margin: 4px auto 0; }
.ring-svg { display: block; width: 100%; height: auto; overflow: visible; }
.ring-track,
.ring-fill {
  fill: none;
  stroke-width: 15;
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
  bottom: 8%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 3.1rem;
  font-weight: 800;
  line-height: 1;
  color: var(--title);
}
.ring-seal { color: var(--stat-gauge-fill); font-size: 0.85em; }
.ring-label {
  margin: 10px 0 0;
  text-align: center;
  font-size: 1rem;
  color: var(--text-secondary);
}
.chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: auto;
  padding-top: 20px;
}
.chip {
  --badge-hole: var(--stat-pill-bg);
  padding: 12px 10px;
  border-radius: 14px;
  background: var(--stat-pill-bg);
  text-align: center;
}
.chip-count {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin: 0 0 2px;
  font-size: 1.45rem;
  font-weight: 700;
  line-height: 1.15;
}
.chip-seal { font-size: 0.85em; }
.chip-label { margin: 0; font-size: 0.82rem; color: var(--text-secondary); }
.chip.new .chip-count { color: var(--stat-new); }
.chip.review .chip-count { color: var(--stat-review); }

/* ---------- side stack ---------- */
.side { display: grid; gap: 16px; grid-template-rows: 1fr 1fr; }
.grade-top { display: flex; align-items: baseline; gap: 4px; margin-bottom: 14px; }
.grade-top b { font-size: 2.6rem; font-weight: 800; line-height: 1; color: var(--blue-button); }
.grade-top i { font-style: normal; font-size: 1rem; font-weight: 800; color: var(--blue-button); }
.grade-top small { margin-left: auto; font-size: 0.85rem; color: var(--text-secondary); }
.stack {
  display: flex;
  height: 14px;
  border-radius: 7px;
  background: var(--stat-gauge-track);
  overflow: hidden;
}
.seg { transition: width 0.4s ease-out; }
.seg.again { background: #f87171; }
.seg.hard { background: #fbbf24; }
.seg.good { background: #a3e635; }
.seg.easy { background: #38bdf8; }
.legend { display: flex; justify-content: space-between; gap: 12px; margin-top: 16px; }
.legend-item { display: flex; align-items: center; gap: 7px; font-size: 0.88rem; }
.dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
.legend-item span { color: var(--text-secondary); }
.legend-item b { color: var(--title); }

.time-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
.time-big {
  display: flex;
  align-items: baseline;
  margin: 0;
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 0.95;
  color: var(--title);
}
.time-big i {
  font-style: normal;
  font-size: 0.47em;
  font-weight: 600;
  color: var(--text-secondary);
}
.part + .part { margin-left: 8px; }
.time-meta { text-align: right; font-size: 0.9rem; line-height: 1.35; color: var(--text-secondary); }
.time-meta b { display: block; font-size: 1.05rem; color: var(--title); }
.meta-skeleton { margin-left: auto; }

@media (max-width: 720px) {
  .deck-stats { grid-template-columns: minmax(0, 1fr); }
  .side { grid-template-rows: auto auto; }
  .legend { flex-wrap: wrap; justify-content: flex-start; gap: 10px 22px; }
  .time-big { font-size: 2.6rem; }
}
@media (prefers-reduced-motion: reduce) {
  .ring-fill,
  .seg { transition: none; }
}
</style>
