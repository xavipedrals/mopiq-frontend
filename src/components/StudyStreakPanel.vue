<template>
  <button v-if="state?.study_day_count > 0" class="streak-entry" type="button" :aria-label="$t('streak.title')" @click="open">
    <TablerIcon :name="state.current_streak ? 'flameFilled' : 'flame'" />
    <span>{{ state.current_streak }}</span>
  </button>
  <Teleport to="body">
    <dialog ref="detail" class="streak-dialog" aria-labelledby="study-streak-title" @close="closeChildren">
      <header class="streak-header">
        <button type="button" :aria-label="$t('common.close')" @click="detail.close()">×</button>
        <h2 id="study-streak-title">{{ $t('streak.title') }}</h2>
        <button type="button" :aria-label="$t('streak.rules')" @click="rules.showModal()">ⓘ</button>
      </header>
      <div class="streak-body">
        <div v-if="streakFailed" class="streak-error" role="status">
          {{ $t('streak.failed') }}
          <button type="button" @click="refresh">{{ $t('streak.retry') }}</button>
        </div>
        <p v-if="!state && !streakFailed" role="status">{{ $t('streak.loading') }}</p>
        <template v-if="state">
          <section class="streak-hero" :aria-label="state.current_streak ? $t('streak.count', { count: state.current_streak }) : $t('streak.start')">
            <span class="streak-hero-icon"><TablerIcon :name="state.current_streak ? 'flameFilled' : 'flame'" /></span>
            <strong class="streak-number">{{ state.current_streak }}</strong>
            <strong>{{ $t(state.current_streak === 0 ? 'streak.start' : state.current_streak === 1 ? 'streak.day' : 'streak.days') }}</strong>
            <small v-if="milestone && state.current_streak">{{ $t('streak.milestone', { count: milestone }) }}</small>
          </section>
          <div class="streak-grid streak-week">
            <div v-for="date in week" :key="key(date)" role="img" :aria-label="dateLabel(date)">
              <small aria-hidden="true">{{ weekday.format(date) }}</small>
              <span class="day-mark" :class="dayClass(date)" aria-hidden="true">
                <TablerIcon v-if="protectedDays.has(key(date))" name="snowflake" />
                <template v-else>{{ studied.has(key(date)) ? '✓' : key(date) === state.as_of_day ? '◌' : '−' }}</template>
              </span>
            </div>
          </div>
          <div class="streak-stats">
            <div><TablerIcon name="trophy" /><strong>{{ state.best_streak }}</strong><small>{{ $t('streak.best') }}</small></div>
            <div><TablerIcon name="calendar" /><strong>{{ state.study_day_count }}</strong><small>{{ $t('streak.total') }}</small></div>
          </div>
          <button class="freeze-row" type="button" @click="freeze.showModal()">
            <span class="freeze-icon"><TablerIcon name="snowflake" /></span>
            <span><strong>{{ freezeTitle }}</strong><small>{{ freezeSubtitle }}</small></span>
          </button>
          <section>
            <div class="streak-month-title">
              <h3>{{ monthName.format(month) }}</h3>
              <button type="button" :aria-label="$t('streak.previousMonth')" @click="monthOffset--">‹</button>
              <button type="button" :aria-label="$t('streak.nextMonth')" :disabled="monthOffset === 0" @click="monthOffset++">›</button>
            </div>
            <div class="streak-grid streak-month">
              <small v-for="day in weekHeadings" :key="key(day)" aria-hidden="true">{{ weekday.format(day) }}</small>
              <span v-for="blank in leading" :key="'blank'+blank" aria-hidden="true" />
              <span v-for="date in monthDays" :key="key(date)" class="day-mark" :class="dayClass(date)" role="img" :aria-label="dateLabel(date)">
                {{ date.getUTCDate() }}<TablerIcon v-if="protectedDays.has(key(date))" name="snowflake" />
              </span>
            </div>
            <div class="streak-legend">
              <small><span aria-hidden="true">✓</span> {{ $t('streak.studied') }}</small>
              <small><TablerIcon name="snowflake" />{{ $t('streak.protected') }}</small>
            </div>
          </section>
        </template>
      </div>
    </dialog>
    <dialog ref="freeze" class="streak-dialog freeze-dialog" aria-labelledby="freeze-title">
      <template v-if="state">
        <header class="streak-header freeze-header">
          <button type="button" :aria-label="$t('common.close')" @click="freeze.close()">×</button>
        </header>
        <div class="freeze-content">
          <div class="freeze-slots">
            <div v-for="slot in 2" :key="slot" :class="{ charging: slot === state.freeze_balance + 1 && slot <= state.freeze_capacity }">
              <span class="freeze-slot" :class="{ charged: slot <= state.freeze_balance, locked: slot > state.freeze_capacity }"
                    role="img" :aria-label="$t(slot > state.freeze_capacity ? 'streak.lockedSlot' : slot <= state.freeze_balance ? 'streak.chargedSlot' : 'streak.emptySlot')">
                <TablerIcon v-if="slot > state.freeze_capacity" name="streakLock" />
                <TablerIcon v-else-if="slot <= state.freeze_balance" name="snowflake" />
              </span>
            </div>
          </div>
          <div class="freeze-progress" :class="{ 'points-first': state.freeze_balance === 0, 'points-second': state.freeze_balance === 1 && state.freeze_capacity === 2 }">
            <strong><TablerIcon :name="full ? 'snowflake' : 'flame'" />{{ full ? $t('streak.full') : $t('streak.progress', { count: state.days_toward_freeze }) }}</strong>
            <span v-if="!full">{{ $t('streak.earn') }}</span>
          </div>
          <h2 id="freeze-title">{{ $t('streak.keepSafe') }}</h2>
          <p>{{ $t('streak.explanation') }}</p>
          <strong>{{ $t('streak.balance', { count: state.freeze_balance, capacity: state.freeze_capacity }) }}</strong>
          <p v-if="state.freeze_capacity === 1">{{ $t('streak.premium') }}</p>
        </div>
      </template>
    </dialog>
    <dialog ref="rules" class="streak-dialog rules-dialog" aria-labelledby="streak-rules-title">
      <header class="streak-header">
        <h2 id="streak-rules-title">{{ $t('streak.rules') }}</h2>
        <button type="button" :aria-label="$t('common.close')" @click="rules.close()">×</button>
      </header>
      <p>{{ $t('streak.rulesBody') }}</p>
    </dialog>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { refreshStudyStreak, streakFailed, streakSnapshot } from '../api/studyStreak';
import { localeTag, t } from '../i18n';
import TablerIcon from './TablerIcon.vue';

const detail = ref(null);
const freeze = ref(null);
const rules = ref(null);
const monthOffset = ref(0);
const state = computed(() => streakSnapshot.value?.state);
const studied = computed(() => new Set(streakSnapshot.value?.study_dates));
const protectedDays = computed(() => new Set(state.value?.protected_dates));
const today = computed(() => new Date(`${state.value?.as_of_day}T00:00:00Z`));
const milestone = computed(() => [3, 7, 14, 30, 100].find((count) => count > state.value?.current_streak));
const full = computed(() => state.value.freeze_balance === state.value.freeze_capacity);
const week = computed(() => Array.from({ length: 7 }, (_, index) => shift(today.value, index - 6)));
const weekHeadings = Array.from({ length: 7 }, (_, index) => new Date(Date.UTC(2024, 0, index + 1)));
const month = computed(() => new Date(Date.UTC(today.value.getUTCFullYear(), today.value.getUTCMonth() + monthOffset.value, 1)));
const leading = computed(() => (month.value.getUTCDay() + 6) % 7);
const monthDays = computed(() => {
  const count = new Date(Date.UTC(month.value.getUTCFullYear(), month.value.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => shift(month.value, index));
});
const weekday = computed(() => format({ weekday: 'narrow' }));
const monthName = computed(() => format({ month: 'long', year: 'numeric' }));
const fullDate = computed(() => format({ weekday: 'long', month: 'long', day: 'numeric' }));
const freezeTitle = computed(() => {
  const count = state.value.freeze_balance;
  return t(count === 0 ? 'streak.freeze' : count === 1 ? 'streak.ready' : 'streak.multipleReady', { count });
});
const freezeSubtitle = computed(() => {
  const count = state.value.freeze_balance;
  return t(count === 0 ? 'streak.rowProgress' : count === 1 ? 'streak.oneDay' : 'streak.explanation',
    { count: state.value.days_toward_freeze });
});

function format(options) { return new Intl.DateTimeFormat(localeTag(), { ...options, timeZone: 'UTC' }); }
function shift(date, days) { return new Date(date.getTime() + days * 86_400_000); }
function key(date) { return date.toISOString().slice(0, 10); }
function dayClass(date) {
  const id = key(date);
  return {
    studied: studied.value.has(id), protected: protectedDays.value.has(id),
    today: id === state.value.as_of_day, future: id > state.value.as_of_day,
  };
}
function dateLabel(date) {
  const status = dayClass(date);
  const suffix = status.studied ? t('streak.studied') : status.protected ? t('streak.protected') : status.today ? t('streak.today') : '';
  return [fullDate.value.format(date), suffix].filter(Boolean).join(', ');
}
function refresh() { void refreshStudyStreak(); }
function open() {
  monthOffset.value = 0;
  detail.value.showModal();
  refresh();
}
function closeChildren() {
  freeze.value?.close();
  rules.value?.close();
}
watch(streakSnapshot, (next, previous) => {
  if (!next && previous) {
    closeChildren();
    detail.value?.close();
  }
});
let rolloverPoll;
onMounted(() => {
  refresh();
  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  rolloverPoll = window.setInterval(() => { if (detail.value?.open && !document.hidden) refresh(); }, 60_000);
});
onUnmounted(() => {
  window.removeEventListener('focus', refresh);
  window.removeEventListener('online', refresh);
  window.clearInterval(rolloverPoll);
});
</script>

<style scoped>
.streak-entry, .streak-header button, .streak-month-title button, .streak-error button {
  border: 0; background: none; color: var(--blue-button); min-width: 44px; min-height: 44px; cursor: pointer;
}
.streak-entry { display: inline-flex; align-items: center; gap: 5px; justify-content: center; padding: 0 10px; border-radius: 999px; background: #fef3c7; color: #92400e; font-weight: 650; }
.streak-entry :deep(svg) { width: 18px; height: 18px; }
.streak-dialog { --warm: #92400e; --warm-bg: #fef3c7; --cool-bg: #f0f9ff; --streak-panel: #f1f5f9; width: min(490px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); padding: 0; border: 0; border-radius: 24px; background: var(--list-bg, var(--page-bg)); color: var(--title); }
:global(html[data-theme="dark"] .streak-dialog) { --warm: #fde68a; --warm-bg: #451a03; --cool-bg: #082f49; --streak-panel: #334155; }
:global(html[data-theme="dark"] .streak-entry) { background: #451a03; color: #fde68a; }
.streak-dialog::backdrop { background: #02061766; }
.streak-header { display: flex; align-items: center; justify-content: space-between; min-height: 55px; padding: 4px 12px; }
.streak-header h2 { margin: 0; font-size: 17px; font-weight: 650; }
.streak-header button, .streak-month-title button { font-size: 24px; line-height: 1; }
.streak-body { padding: 18px 20px; display: grid; gap: 18px; }
.streak-error { color: var(--text); text-align: center; }
.streak-hero { display: grid; justify-items: center; gap: 7px; font-size: 19px; text-align: center; }
.streak-hero-icon { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 23px; color: var(--warm); background: var(--warm-bg); }
.streak-hero-icon :deep(svg) { width: 42px; height: 42px; }
.streak-number { font-size: 62px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.streak-body small, .freeze-content p, .freeze-progress span { color: var(--text); }
.streak-hero small { font-size: 13px; }
.streak-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); align-items: center; justify-items: center; text-align: center; }
.streak-week > div { display: grid; justify-items: center; gap: 6px; }
.day-mark { position: relative; display: grid; place-items: center; width: 29px; height: 29px; border: 1px solid transparent; border-radius: 50%; color: var(--text); font-size: 12px; }
.streak-week .day-mark { width: 34px; height: 34px; font-weight: 650; }
.day-mark.studied { background: var(--warm-bg); color: var(--warm); }
.day-mark.protected { background: var(--cool-bg); color: var(--blue-button); }
.day-mark.today { border-color: var(--blue-button); border-style: dashed; }
.day-mark.today.studied { border-color: var(--warm); border-style: solid; }
.day-mark.future { opacity: .42; }
.day-mark :deep(svg), .streak-legend :deep(svg) { width: 13px; height: 13px; }
.streak-month .day-mark :deep(svg) { position: absolute; right: -1px; bottom: 0; width: 9px; height: 9px; }
.streak-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.streak-stats > div { position: relative; display: grid; gap: 5px; border-radius: 15px; padding: 12px 13px; color: var(--warm); background: var(--warm-bg); }
.streak-stats > div + div { background: var(--cool-bg); color: var(--blue-button); }
.streak-stats strong { font-size: 26px; color: var(--title); }
.streak-stats :deep(svg) { position: absolute; top: 13px; inset-inline-end: 13px; width: 18px; height: 18px; }
.freeze-row { display: flex; gap: 12px; align-items: flex-start; text-align: start; background: var(--inset-bg); color: var(--title); border: 0; border-radius: 14px; padding: 13px; cursor: pointer; }
.freeze-row > span + span { display: grid; gap: 4px; }
.freeze-icon { flex: 0 0 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--cool-bg); color: var(--blue-button); }
.streak-month-title { display: flex; align-items: center; }
.streak-month-title h3 { flex: 1; margin: 0; font-size: 14px; }
.streak-month { row-gap: 5px; }
.streak-legend, .streak-legend small { display: flex; align-items: center; gap: 5px; }
.streak-legend { margin-top: 10px; gap: 13px; }
.freeze-dialog { margin-block: auto 12px; }
.freeze-header { justify-content: end; }
.freeze-content { display: grid; justify-items: center; gap: 8px; text-align: center; padding: 0 20px 26px; }
.freeze-content h2 { font-size: 19px; margin: 10px 0 0; }
.freeze-content p { margin: 0; }
.freeze-slots { display: flex; gap: 12px; margin-bottom: 12px; }
.freeze-slots > div { display: grid; place-items: center; width: 88px; height: 88px; border-radius: 17px; }
.freeze-slots .charging, .freeze-progress { background: var(--streak-panel); }
.freeze-slot { display: grid; place-items: center; width: 66px; height: 66px; border: 3px dashed var(--blue-button); border-radius: 15px; color: var(--blue-button); }
.freeze-slot.charged { background: var(--cool-bg); border-style: solid; }
.freeze-slot.locked { border-color: var(--text-secondary); }
.freeze-slot.locked :deep(svg) { background: #e0e7ff; color: #4338ca; box-sizing: content-box; padding: 4px 9px; border-radius: 999px; width: 14px; height: 14px; }
.freeze-progress { position: relative; isolation: isolate; width: 100%; border-radius: 17px; display: grid; gap: 3px; padding: 15px 12px; }
.freeze-progress:is(.points-first, .points-second)::before { content: ""; position: absolute; z-index: -1; top: -5px; inset-inline-start: calc(50% - 56px); width: 13px; height: 13px; transform: rotate(45deg); background: inherit; }
.freeze-progress.points-second::before { inset-inline-start: calc(50% + 44px); }
.freeze-progress strong { display: flex; align-items: center; gap: 6px; justify-content: center; font-size: 20px; }
.freeze-progress :deep(svg) { color: var(--warm); width: 18px; height: 18px; }
.rules-dialog p { margin: 0; padding: 0 20px 20px; color: var(--text); }
</style>
