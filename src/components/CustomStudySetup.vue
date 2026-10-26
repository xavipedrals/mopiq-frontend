<template>
  <Teleport to="body">
    <div v-if="open" v-dialog-focus class="filter-dialog custom-study-root" role="dialog" aria-modal="true" aria-labelledby="custom-study-title" @keydown.esc.stop.prevent="dismiss">
      <button type="button" class="filter-backdrop" :disabled="starting" :aria-label="$t('common.close')" @click="dismiss"></button>
      <section class="filter-sheet">
        <header class="filter-nav">
          <button v-if="option" type="button" class="filter-nav-action" :disabled="starting" @click="back"><StudyMenuIcon name="chevronLeft" aria-hidden="true"/>{{ $t('common.back') }}</button><span v-else></span>
          <h2 id="custom-study-title">{{ $t(option ? `customStudy.${option}` : 'customStudy.title') }}</h2>
          <button type="button" class="filter-nav-action" :disabled="starting" @click="dismiss">{{ $t('common.close') }}</button>
        </header>
        <div v-if="!option" class="filter-scroll option-list">
          <div class="focus-copy"><h3>{{ $t('customStudy.focusTitle') }}</h3><p>{{ $t('customStudy.intro') }}</p></div>
          <button v-for="item in options" :key="item" type="button" class="study-option" @click="choose(item)">
            <span class="option-symbol"><StudyMenuIcon :name="optionIcons[item]"/></span><span class="option-copy"><strong>{{ $t(`customStudy.${item}`) }}</strong><small>{{ $t(`customStudy.${item}Body`) }}</small></span><StudyMenuIcon name="chevronRight" aria-hidden="true"/>
          </button>
          <p class="filter-note">{{ $t('customStudy.scheduling') }}</p>
        </div>
        <form v-else class="filter-form" @submit.prevent="start">
          <div class="filter-scroll custom-fields">
            <fieldset class="custom-controls" :disabled="starting">
              <template v-if="option === 'chooseCards'">
                <FilterFolderField v-model="folderID" :folders="folders" :deck-name="deck?.name || ''" :disabled="starting">
                  <label v-if="folderID !== ''" class="filter-row" :class="{ 'is-selected': includeSubdecks }"><span>{{ $t('customStudy.includeSubdecks') }}</span><input v-model="includeSubdecks" class="filter-switch" type="checkbox" role="switch"></label>
                </FilterFolderField>
              </template>
              <CardFilterSections v-model="config" :show-content="option === 'chooseCards'" :show-flags="['flagged','chooseCards'].includes(option)" :requires-flag="option === 'flagged'" :flags="flags" :flags-loading="flagsLoading" :flags-error="Boolean(flagsError)" highlights-selection allow-match-all @retry-flags="loadFlags"/>
              <fieldset v-if="option === 'chooseCards'" class="filter-section">
                <legend>{{ $t('customStudy.added') }}</legend>
                <div class="filter-group"><label class="filter-row filter-picker-row" :class="{ 'is-selected': config.addedWithinDays }"><span>{{ $t('customStudy.added') }}</span><select v-model="config.addedWithinDays" :aria-label="$t('customStudy.added')"><option :value="null">{{ $t('customStudy.any') }}</option><option :value="7">{{ $t('customStudy.last7') }}</option><option :value="30">{{ $t('customStudy.last30') }}</option></select></label></div>
              </fieldset>
              <fieldset class="filter-section">
                <legend>{{ $t('filterUI.session') }}</legend>
                <div class="filter-group">
                  <label class="filter-row" :class="{ 'is-selected': config.shuffle }"><span>{{ $t('customStudy.shuffle') }}</span><input v-model="config.shuffle" class="filter-switch" type="checkbox" role="switch"></label>
                  <label class="filter-row filter-picker-row" :class="{ 'is-selected': limitChoice !== 'all' }"><span>{{ $t('customStudy.limit') }}</span><select v-model="limitChoice" :aria-label="$t('customStudy.limit')"><option value="all">{{ $t('customStudy.all') }}</option><option value="20">20</option><option value="50">50</option><option value="custom">{{ $t('customStudy.custom') }}</option></select></label>
                  <label v-if="limitChoice === 'custom'" class="filter-row filter-input-row is-selected"><input v-model.number="customLimit" type="number" min="1" max="1000000" required :aria-label="$t('customStudy.limit')"></label>
                </div>
              </fieldset>
              <div v-if="['flagged','chooseCards'].includes(option)" class="filter-group"><button type="button" class="filter-row filter-reset" @click="resetFilters">{{ $t('filterUI.clearFilters') }}</button></div>
            </fieldset>
          </div>
          <footer class="filter-footer">
            <p v-if="error" role="alert" class="filter-count filter-error">{{ error }} <button type="button" class="filter-inline-action" @click="refresh">{{ $t('customStudy.retry') }}</button></p>
            <p v-else class="filter-count" role="status">{{ count == null ? $t('customStudy.finding') : $t('customStudy.matches', {count}) }}</p>
            <button type="submit" class="filter-start" :disabled="starting || count == null || !selectedCount || Boolean(error) || flagsRequiredAndUnavailable"><svg v-if="!starting" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5v13l11-6.5z"/></svg>{{ starting ? $t('study.preparing') : $t('customStudy.start', {count: selectedCount}) }}</button>
            <p class="filter-note">{{ $t('customStudy.scheduling') }}</p>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { dialogFocus } from '../dialogFocus';
import { fetchCustomStudySelection } from '../api/customStudy';
import { fetchPersonalFlags } from '../api/personalFlags';
import { getCurrentUser } from '../auth/session';
import { CUSTOM_STUDY_OPTIONS, customStudyDefaults, saveCustomStudySnapshot } from '../study/customStudy';
import { parseDeckFolders } from '../study/deckFolders';
import CardFilterSections from './CardFilterSections.vue';
import FilterFolderField from './FilterFolderField.vue';
import StudyMenuIcon from './StudyMenuIcon.vue';
import './cardFilterSheet.css';

export default {
  directives: { dialogFocus }, components: { CardFilterSections, FilterFolderField, StudyMenuIcon },
  props: { open: Boolean, deck: Object }, emits: ['dismiss', 'start'],
  data: () => ({
    option: '', options: CUSTOM_STUDY_OPTIONS,
    optionIcons: { entireDeck: 'copy', needsPractice: 'retry', flagged: 'flag', chooseCards: 'sliders' },
    config: customStudyDefaults(), flags: [], flagsLoading: false, flagsError: false, flagsRevision: 0,
    folderID: '', includeSubdecks: true, limitChoice: 'all', customLimit: 20,
    count: null, error: '', starting: false, revision: 0, refreshTimer: null,
  }),
  computed: {
    folders() { return parseDeckFolders(this.deck?.decks, this.deck?.name); },
    flagsRequiredAndUnavailable() { return ['flagged','chooseCards'].includes(this.option) && (this.flagsLoading || this.flagsError); },
    selection() {
      const folder = this.folders.find(folder => String(folder.id) === String(this.folderID));
      const subdeckIDs = !folder ? null : this.folders.filter(item => item.id === folder.id || (this.includeSubdecks && item.fullPath.startsWith(`${folder.fullPath}::`))).map(item => item.id);
      return { ...this.config, subdeckIDs, limit: this.limitChoice === 'all' ? null : Number(this.limitChoice === 'custom' ? this.customLimit : this.limitChoice) };
    },
    selectedCount() {
      const limit = this.selection.limit;
      return limit == null ? this.count || 0 : Number.isFinite(limit) ? Math.max(0, Math.min(this.count || 0, Math.trunc(limit))) : 0;
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (value) { this.option = ''; this.error = ''; this.loadFlags(); }
        else { this.revision++; this.flagsRevision++; clearTimeout(this.refreshTimer); }
      },
    },
    selection: { deep: true, handler() { this.scheduleRefresh(); } },
  },
  beforeUnmount() { this.revision++; this.flagsRevision++; clearTimeout(this.refreshTimer); },
  methods: {
    dismiss() { if (!this.starting) this.$emit('dismiss'); },
    back() { this.option = ''; this.revision++; clearTimeout(this.refreshTimer); },
    choose(option) {
      this.option = option; this.config = customStudyDefaults(option); this.folderID = ''; this.includeSubdecks = true;
      this.limitChoice = this.config.limit == null ? 'all' : String(this.config.limit); this.customLimit = 20;
      this.error = ''; this.scheduleRefresh();
    },
    resetFilters() { this.config = customStudyDefaults(this.option); },
    scheduleRefresh() {
      this.count = null; this.revision++; clearTimeout(this.refreshTimer);
      if (this.open && this.option) this.refreshTimer = setTimeout(() => this.refresh(), 200);
    },
    async loadFlags() {
      const revision = ++this.flagsRevision; const owner = getCurrentUser()?.supabaseUid; const deckId = this.deck?.id;
      this.flags = []; this.flagsLoading = true; this.flagsError = false;
      try {
        const flags = await fetchPersonalFlags();
        if (revision === this.flagsRevision && this.open && owner === getCurrentUser()?.supabaseUid && deckId === this.deck?.id) this.flags = flags;
      } catch { if (revision === this.flagsRevision) this.flagsError = true; }
      finally { if (revision === this.flagsRevision) this.flagsLoading = false; }
    },
    async refresh() {
      const revision = ++this.revision; this.count = null; this.error = '';
      try { const result = await fetchCustomStudySelection(this.deck.id, this.selection); if (revision === this.revision && this.open) this.count = result.count; }
      catch { if (revision === this.revision) this.error = this.$t('customStudy.error'); }
    },
    async start() {
      if (this.starting || !this.selectedCount || this.count == null || this.flagsRequiredAndUnavailable) return;
      this.starting = true; this.error = '';
      try {
        const result = await fetchCustomStudySelection(this.deck.id, this.selection, true);
        if (!result.cardIDs.length) { this.count = 0; return; }
        const id = saveCustomStudySnapshot(sessionStorage, getCurrentUser()?.supabaseUid, this.deck.id, result.cardIDs);
        this.$emit('start', id);
      } catch { this.error = this.$t('customStudy.error'); }
      finally { this.starting = false; }
    },
  },
};
</script>

<style scoped>
.custom-controls { min-width:0; margin:0; padding:0; border:0; }
.option-list { display:flex; flex-direction:column; gap:12px; }
.focus-copy { margin-bottom:12px; }
.focus-copy h3 { margin:0 0 12px; font-size:28px; font-weight:750; color:var(--title); }
.focus-copy p { margin:0; color:var(--filter-muted); font-size:15px; }
.study-option { display:flex; align-items:center; gap:14px; padding:16px; min-height:100px; border:1px solid var(--card-border); border-radius:22px; background:var(--filter-surface); color:var(--title); text-align:start; cursor:pointer; }
.option-symbol { flex:0 0 44px; height:48px; display:grid; place-items:center; border-radius:15px; color:#b45309; background:#fef3c7; }
html[data-theme="dark"] .option-symbol { color:#fcd34d; background:#30240f; }
.option-copy { flex:1; }.option-copy strong{font-size:16px}.option-copy small { display:block; margin-top:5px; color:var(--filter-muted); font-size:13px; line-height:1.4; }
.study-option>svg { width:14px; height:14px; color:var(--filter-muted); }
@media(max-width:420px) { .study-option{gap:10px}.focus-copy h3{font-size:25px} }
</style>
