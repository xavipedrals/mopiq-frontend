<template>
  <div class="streak-review-banner" role="status">
    <button type="button" :title="$t('common.close')" @click="$emit('dismiss')">
      <TablerIcon name="flameFilled" class="flame" />
      <span class="copy">
        <strong>{{ count === 1 ? streakReviewCopy.dayOne : $t('streak.count', { count }) }}</strong>
        <span>{{ message }}</span>
      </span>
      <svg class="check" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <path d="m7 12 3 3 6-7" fill="none" stroke="var(--warm-bg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { streakReviewCopy } from '../i18n/streakMessages';
import TablerIcon from './TablerIcon.vue';

const props = defineProps({ count: { type: Number, required: true }, isRestart: Boolean });
const emit = defineEmits(['dismiss']);
const message = props.isRestart ? streakReviewCopy.restarted : props.count === 1 ? streakReviewCopy.firstReview
  : streakReviewCopy.everyday[Math.floor(Math.random() * streakReviewCopy.everyday.length)];
let timer;
onMounted(() => { timer = window.setTimeout(() => emit('dismiss'), 6000); });
onUnmounted(() => window.clearTimeout(timer));
</script>

<style scoped>
.streak-review-banner {
  --warm: #92400e;
  --warm-bg: #fef3c7;
  position: absolute;
  inset: 56px 18px auto;
  z-index: 4;
  max-width: 410px;
  margin-inline: auto;
}
:global(html[data-theme='dark'] .streak-review-banner) {
  --warm: #fde68a;
  --warm-bg: #451a03;
}
.streak-review-banner button {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 61px;
  border: 0;
  border-radius: 17px;
  padding: 13px 14px 10px 10px;
  background: var(--warm-bg);
  box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
  color: var(--warm);
  text-align: start;
  cursor: pointer;
}
.streak-review-banner button::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: currentColor;
  transform-origin: left;
  animation: streak-countdown 6s linear forwards;
}
:global(html[dir='rtl'] .streak-review-banner button)::before { transform-origin: right; }
.copy { flex: 1; display: grid; gap: 2px; color: var(--text); font-size: 13px; }
.copy strong { color: var(--title); font-size: 15px; font-weight: 650; }
.flame { flex: none; width: 25px; height: 25px; margin-inline: 6px; }
.check { flex: none; width: 18px; height: 18px; }
@keyframes streak-countdown { to { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) {
  .streak-review-banner button::before { animation: none; }
}
</style>
