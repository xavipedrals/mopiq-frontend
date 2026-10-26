<template>
  <section class="custom-results-screen" aria-labelledby="custom-results-title">
    <header class="results-heading">
      <p>{{ $t('customStudy.title') }}</p>
      <h1 id="custom-results-title" ref="heading" tabindex="-1">{{ $t('customStudy.complete') }}</h1>
      <p v-if="skipped" class="skipped">{{ $t('customStudy.skipped') }}</p>
      <span class="complete-check" aria-hidden="true">✓</span>
    </header>

    <section class="grade-summary" :aria-label="$t('checkpoint.gradePct')">
      <div class="grade-heading">
        <p><strong>{{ grade }}</strong><span>{{ $t('checkpoint.gradePct') }}</span></p>
        <button class="help-button" :aria-label="$t('checkpoint.gradeHelp')" :aria-expanded="showHelp" @click="showHelp = !showHelp">?</button>
      </div>
      <p v-if="showHelp" class="grade-help">{{ $t('checkpoint.gradeCopy') }}</p>
      <div class="grade-bar" aria-hidden="true"><span v-for="answer in answers" :key="answer" :style="{ width: `${initialCounts[answer] / Math.max(initialAnswers.length, 1) * 100}%`, background: colors[answer] }"></span></div>
      <dl class="grade-counts"><div v-for="answer in answers" :key="answer"><dt>{{ $t(`study.${answer.toLowerCase()}`) }}</dt><dd><i :style="{ background: colors[answer] }"></i>{{ initialCounts[answer] }}</dd></div></dl>
    </section>

    <dl class="stat-tiles">
      <div><StudyMenuIcon name="copy"/><dd>{{ initialAnswers.length }}</dd><dt>{{ $t('customStudy.cardsLabel') }}</dt></div>
      <div><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/></svg><dd>{{ timeLabel }}</dd><dt>{{ $t('checkpoint.timeStudied') }}</dt></div>
      <div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-7z"/></svg><dd>{{ perCardLabel }}</dd><dt>{{ $t('customStudy.perCard') }}</dt></div>
    </dl>

    <h2 class="cards-heading">{{ $t('customStudy.reviewed', {count: visibleResults.length}) }}</h2>
    <div class="answer-filters" role="group" :aria-label="$t('customStudy.lastRating')">
      <button :class="{ selected: !filter }" :aria-pressed="!filter" @click="filter = ''">{{ $t('customStudy.all') }} <span>{{ visibleResults.length }}</span></button>
      <button v-for="answer in answers" :key="answer" :class="[answer.toLowerCase(), { selected: filter === answer }]" :style="gradeStyle(answer)" :aria-pressed="filter === answer" :disabled="!counts[answer]" @click="filter = filter === answer ? '' : answer"><svg viewBox="0 0 20 20" aria-hidden="true"><path :d="gradeIcons[answer]"/></svg>{{ $t(`study.${answer.toLowerCase()}`) }} <span>{{ counts[answer] }}</span></button>
    </div>
    <div class="result-cards">
      <p v-if="!filteredResults.length" class="empty-results" role="status">{{ $t('customStudy.filterEmpty') }}</p>
      <article v-for="result in filteredResults" :key="result.id" class="result-card" :style="gradeStyle(result.answer)">
        <div class="card-copy">
          <div v-if="flagsByCard[result.id]?.length" class="card-flags"><span v-for="flag in flagsByCard[result.id]" :key="flag.flag_id" :style="flagStyle(flag)">{{ flag.emoji || '⚑' }} {{ flagName(flag) }}</span></div>
          <p class="question">{{ plainText(result.card, 0) }}</p>
          <p class="answer">{{ plainText(result.card, 1) }}</p>
        </div>
        <footer class="card-footer">
          <span class="answer-label"><svg viewBox="0 0 20 20" aria-hidden="true"><path :d="gradeIcons[result.answer]"/></svg>{{ $t(`study.${result.answer.toLowerCase()}`) }}</span>
          <div class="card-actions">
            <button :aria-label="$t('study.cardFlags')" @click="openFlags(result)"><StudyMenuIcon name="flag"/></button>
            <button v-if="deck?.canEdit && editable(result.card)" :aria-label="$t('study.editCard')" @click="editingCard = result.card"><StudyMenuIcon name="edit"/></button>
            <button v-if="deck?.canEdit" :aria-label="$t('study.deleteCard')" @click="pendingDelete = result"><StudyMenuIcon name="trash"/></button>
          </div>
        </footer>
      </article>
    </div>

    <footer class="results-actions">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button v-if="retryCount" type="button" class="mopiq-btn retry-button" :disabled="retrying || leaving || deleting" @click="$emit('retry')">{{ retrying ? $t('common.loading') : `${$t('customStudy.retryDifficult')} (${retryCount})` }}</button>
      <button type="button" :class="retryCount ? 'done-button' : 'mopiq-btn'" :disabled="retrying || leaving || deleting" @click="$emit('done')">{{ leaving ? $t('study.saving') : $t('customStudy.done') }}</button>
    </footer>

    <CardEditor :open="Boolean(editingCard)" :deck="deck" :card="editingCard" @dismiss="editingCard = null" @saved="cardSaved"/>
    <StudyConfirmSheet :open="Boolean(pendingDelete)" :title="$t('study.deleteTitle')" :message="$t('study.deleteMessage')" :confirm-label="$t('study.deleteCard')" :busy="deleting" :error="deleteError" @dismiss="pendingDelete = null; deleteError = ''" @confirm="removeCard"/>
    <Teleport to="body">
      <div v-if="flagCard" v-dialog-focus class="result-flags-root" @keydown.esc.stop.prevent="closeFlags">
        <button class="flags-backdrop" :aria-label="$t('common.close')" :disabled="flagsBusy" @click="closeFlags"></button>
        <section class="result-flags-sheet" role="dialog" aria-modal="true" aria-labelledby="result-flags-title">
          <header><h2 id="result-flags-title">{{ $t('study.cardFlags') }}</h2><button :disabled="flagsBusy" @click="closeFlags">{{ $t('customStudy.done') }}</button></header>
          <p v-if="flagsLoading" role="status">{{ $t('common.loading') }}</p>
          <p v-if="flagsError" class="error" role="alert">{{ flagsError }} <button @click="loadFlags">{{ $t('customStudy.retry') }}</button></p>
          <button v-for="flag in flagOptions" :key="flag.flag_id" class="flag-choice" :disabled="flagsBusy || flagsLoading" :aria-pressed="flagIDs.includes(flag.flag_id)" @click="toggleFlag(flag)"><span :style="flagStyle(flag)">{{ flag.emoji || '⚑' }}</span>{{ flagName(flag) }}<span class="flag-check">{{ flagIDs.includes(flag.flag_id) ? '✓' : '' }}</span></button>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script>
import CardEditor from './CardEditor.vue';
import StudyConfirmSheet from './StudyConfirmSheet.vue';
import StudyMenuIcon from './StudyMenuIcon.vue';
import { dialogFocus } from '../dialogFocus';
import { cardPlainText } from '../study/cardHtml';
import { cardEditableOnWeb } from '../study/cardFields';
import { gradeCounts, GRADE_COLORS, sessionGrade, formatStudyDuration } from '../study/sessionProgress';
import { personalFlagChipColors } from '../study/personalFlags';
import { fetchCardFlags, fetchCardsFlags, saveCardFlag } from '../api/personalFlags';
import { deleteDeckCard } from '../api/mopiq';
import { getCurrentUser } from '../auth/session';
import { getTheme } from '../theme/theme';
import { STUDY_GRADE_ICONS } from '../study/gradeIcons';

export default {
  components: { CardEditor, StudyConfirmSheet, StudyMenuIcon },
  directives: { dialogFocus },
  props: {
    results: { type: Array, default: () => [] },
    deck: { type: Object, required: true },
    elapsedSeconds: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    retrying: Boolean,
    leaving: Boolean,
    error: { type: String, default: '' },
    flushReviews: { type: Function, required: true },
  },
  emits: ['retry', 'done', 'edit', 'remove'],
  data() {
    return {
      answers: ['AGAIN', 'HARD', 'GOOD', 'EASY'], colors: GRADE_COLORS, gradeIcons: STUDY_GRADE_ICONS,
      initialAnswers: this.results.map(result => result.answer), filter: '', showHelp: false,
      editingCard: null, pendingDelete: null, deleting: false, deleteError: '',
      deletedIDs: [], flagCard: null, flagOptions: [], flagIDs: [], flagsByCard: {},
      flagsLoading: false, flagsBusy: false, flagsError: '', flagsRevision: 0, disposed: false,
    };
  },
  computed: {
    initialCounts() { return gradeCounts(this.initialAnswers); },
    grade() { return sessionGrade(this.initialAnswers); },
    visibleResults() { return this.results.filter(result => !this.deletedIDs.includes(result.id)); },
    filteredResults() { return this.visibleResults.filter(result => !this.filter || result.answer === this.filter); },
    counts() { return gradeCounts(this.visibleResults.map(result => result.answer)); },
    retryCount() { return this.counts.AGAIN + this.counts.HARD; },
    timeLabel() {
      const seconds = Math.max(0, Math.floor(this.elapsedSeconds));
      const parts = [Math.floor(seconds / 60) % 60, seconds % 60];
      if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
      return parts.map(part => String(part).padStart(2, '0')).join(':');
    },
    perCardLabel() { return formatStudyDuration(this.initialAnswers.length ? Math.round(this.elapsedSeconds / this.initialAnswers.length) : 0); },
  },
  mounted() {
    this.$refs.heading.focus({ preventScroll: true });
    const owner = getCurrentUser()?.supabaseUid;
    fetchCardsFlags(this.deck.id, this.results.map(result => result.id)).then(flags => {
      if (!this.disposed && owner === getCurrentUser()?.supabaseUid) this.flagsByCard = { ...flags, ...this.flagsByCard };
    }).catch(() => { /* The flag picker retains its own retry path. */ });
  },
  beforeUnmount() { this.disposed = true; this.flagsRevision++; },
  methods: {
    plainText: cardPlainText,
    editable: cardEditableOnWeb,
    gradeStyle(answer) { const name = answer.toLowerCase(); return { '--answer-bg': `var(--grade-${name}-bg)`, '--answer-border': `var(--grade-${name}-border)`, '--answer-text': `var(--grade-${name}-text)` }; },
    flagName(flag) { return flag.labelKey ? this.$t(flag.labelKey) : flag.name; },
    flagStyle(flag) { const colors = personalFlagChipColors(flag, getTheme() === 'dark'); return { color: colors.foreground, background: colors.background, borderColor: colors.border }; },
    cardSaved({ card, keepOpen }) { if (card) this.$emit('edit', card); if (!keepOpen) this.editingCard = null; else this.editingCard = { ...this.editingCard, ...card }; },
    async removeCard() {
      if (this.deleting || !this.pendingDelete) return;
      this.deleting = true; this.deleteError = '';
      const result = this.pendingDelete;
      const owner = getCurrentUser()?.supabaseUid;
      try {
        await this.flushReviews();
        if (this.disposed || owner !== getCurrentUser()?.supabaseUid) return;
        await deleteDeckCard(this.deck, result.card);
        if (this.disposed || owner !== getCurrentUser()?.supabaseUid) return;
        this.deletedIDs.push(result.id); this.$emit('remove', result.id); this.pendingDelete = null;
      } catch (error) { this.deleteError = error.message || this.$t('study.actionError'); }
      finally { this.deleting = false; }
    },
    closeFlags() { if (!this.flagsBusy) { this.flagsRevision++; this.flagCard = null; } },
    openFlags(result) { this.flagCard = result; this.loadFlags(); },
    async loadFlags() {
      const revision = ++this.flagsRevision; const owner = getCurrentUser()?.supabaseUid;
      this.flagsLoading = true; this.flagsError = ''; this.flagOptions = []; this.flagIDs = [];
      try {
        const state = await fetchCardFlags(this.deck.id, this.flagCard.id);
        if (revision !== this.flagsRevision || owner !== getCurrentUser()?.supabaseUid) return;
        this.flagOptions = state.flags; this.flagIDs = state.flagIDs;
        this.updateFlagTags();
      } catch { if (revision === this.flagsRevision) this.flagsError = this.$t('study.flagsError'); }
      finally { if (revision === this.flagsRevision) this.flagsLoading = false; }
    },
    updateFlagTags() { if (this.flagCard) this.flagsByCard[this.flagCard.id] = this.flagOptions.filter(flag => this.flagIDs.includes(flag.flag_id)); },
    async toggleFlag(flag) {
      if (this.flagsBusy || this.flagsLoading) return;
      const revision = this.flagsRevision; const owner = getCurrentUser()?.supabaseUid;
      const enabled = !this.flagIDs.includes(flag.flag_id);
      this.flagsBusy = true; this.flagsError = '';
      try {
        await saveCardFlag(this.deck.id, this.flagCard.id, flag, enabled);
        if (revision !== this.flagsRevision || owner !== getCurrentUser()?.supabaseUid) return;
        this.flagIDs = enabled ? [...this.flagIDs, flag.flag_id] : this.flagIDs.filter(id => id !== flag.flag_id);
        this.updateFlagTags();
      } catch { if (revision === this.flagsRevision) this.flagsError = this.$t('study.flagsError'); }
      finally { this.flagsBusy = false; }
    },
  },
};
</script>

<style scoped>
.custom-results-screen{width:min(750px,100%);margin-inline:auto;color:var(--title);text-align:start;background:var(--results-bg,#e2e8f0)}
.results-heading{position:relative;text-align:center;padding:28px 60px 24px;border-bottom:1px solid var(--separator)}
.results-heading>p:first-child{margin:0 0 8px;text-transform:uppercase;font-size:14px;font-weight:800;letter-spacing:.06em;color:var(--text)}
.results-heading h1{margin:0;font-size:32px;font-weight:750;outline:none}.skipped{font-size:15px;margin:8px 0 0;color:var(--text)}
.complete-check{position:absolute;inset-inline-end:20px;top:24px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#22c55e;color:white;font-weight:900}
.grade-summary{padding:24px 24px 32px;border-bottom:1px solid var(--separator)}.grade-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}.grade-heading p{color:var(--blue-button);margin:0 0 12px;display:flex;gap:6px;align-items:baseline}.grade-heading strong{font-size:48px;line-height:1.1;font-weight:850}.grade-heading span{font-size:17px;font-weight:800}.help-button{width:32px;height:32px;border:0;border-radius:50%;background:var(--close-button);color:var(--card-bg);font-size:18px;font-weight:800}.grade-help{color:var(--text);font-size:15px;margin:0 0 16px}
.grade-bar{display:flex;height:24px;overflow:hidden;border-radius:8px;background:var(--empty-bar);margin-bottom:24px}.grade-counts{display:flex;gap:42px;margin:0}.grade-counts dt{font-size:14px;color:var(--text);font-weight:400;margin-bottom:4px}.grade-counts dd{display:flex;align-items:center;gap:8px;font-weight:700;margin:0}.grade-counts i{width:10px;height:10px;border-radius:50%}
.stat-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:24px 20px 0}.stat-tiles>div{display:flex;align-items:center;flex-direction:column;gap:4px;padding:14px 8px;background:var(--card-bg);border:1px solid var(--search-border);border-radius:18px}.stat-tiles svg{width:22px;height:22px;fill:none;stroke:var(--blue-button);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;margin-bottom:2px}.stat-tiles dd{font-size:22px;font-weight:750;margin:0;font-variant-numeric:tabular-nums}.stat-tiles dt{font-size:13px;color:var(--text);font-weight:400;text-align:center}
.cards-heading{font-size:20px;font-weight:750;margin:32px 20px 0}.answer-filters{position:sticky;top:0;z-index:2;display:flex;gap:8px;overflow-x:auto;padding:14px 20px;background:var(--results-bg,#e2e8f0);scrollbar-width:thin}.answer-filters button{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;min-height:36px;padding:6px 14px;border:1px solid var(--search-border);border-radius:100px;background:var(--card-bg);color:var(--title);font:inherit;font-size:15px;font-weight:600}.answer-filters button.selected{background:var(--answer-bg,var(--blue-button));border-color:var(--answer-border,var(--blue-button));color:var(--answer-text,var(--button-text));box-shadow:inset 0 0 0 1px var(--answer-border,var(--blue-button))}.answer-filters button:disabled{opacity:.4}.answer-filters span{opacity:.65;font-weight:750}.answer-filters svg{width:16px;height:16px;fill:currentColor}
.result-cards{padding-inline:20px;display:grid;gap:14px}.result-card{border:2px solid var(--answer-border);border-radius:20px;background:var(--card-bg);overflow:hidden}.card-copy{padding:16px}.card-copy p{margin:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;font-size:16px;line-height:1.5;overflow-wrap:anywhere}.card-copy .question{font-weight:500;padding-bottom:16px}.card-copy .answer{border-top:1px dashed var(--search-border);padding-top:16px;color:var(--text)}.card-flags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}.card-flags span{padding:5px 9px;border:1px solid;border-radius:10px;font-size:13px}.card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 6px 4px 16px;background:color-mix(in srgb,var(--answer-bg) 35%,var(--card-bg));border-top:1px dashed var(--search-border)}.answer-label{display:flex;align-items:center;gap:10px;color:var(--answer-text);font-weight:600}.answer-label svg{width:20px;height:20px;fill:currentColor}.card-actions{display:flex}.card-actions button{display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;background:transparent;color:var(--text)}.card-actions svg{width:20px;height:20px}.empty-results{text-align:center;padding:32px 0;color:var(--text)}
.results-actions{position:sticky;bottom:0;z-index:3;display:flex;flex-direction:column;gap:4px;padding:20px 20px max(12px,env(safe-area-inset-bottom));margin-top:12px;background:linear-gradient(transparent,var(--results-bg,#e2e8f0) 18px)}.results-actions>button{min-height:48px;width:100%;border-radius:24px;font-size:17px;font-weight:600}.done-button{border:0;background:transparent;color:var(--title)}.results-actions .error{margin:0 0 8px;background:var(--results-bg,#e2e8f0)}
.result-flags-root{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:20px;color:var(--title)}.flags-backdrop{position:absolute;inset:0;border:0;background:#0f172a80}.result-flags-sheet{position:relative;width:min(420px,100%);max-height:85dvh;overflow:auto;padding:24px;background:var(--card-bg);border-radius:24px;box-shadow:var(--card-shadow)}.result-flags-sheet header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.result-flags-sheet h2{font-size:20px;margin:0}.result-flags-sheet header button,.result-flags-sheet p button{border:0;background:transparent;color:var(--blue-button);padding:8px}.flag-choice{display:flex;align-items:center;gap:12px;width:100%;text-align:start;min-height:52px;padding:8px;border:0;background:transparent;color:var(--title);font:inherit}.flag-choice>span:first-child{display:grid;place-items:center;width:32px;height:32px;border-radius:10px}.flag-check{margin-inline-start:auto;color:var(--blue-button)}
button:focus-visible{outline:3px solid var(--blue-button);outline-offset:3px}button:disabled{cursor:default}.error{color:var(--error)}
html[data-theme="dark"] .custom-results-screen{--results-bg:#1e293c}
@media(max-width:420px){.grade-counts{justify-content:space-between;gap:12px}.stat-tiles dd{font-size:20px}.stat-tiles dt{font-size:12px}.results-heading{padding-inline:45px}.results-heading h1{font-size:28px}.answer-filters{scrollbar-width:none}.card-copy p{font-size:15px}}
</style>
