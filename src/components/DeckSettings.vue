<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-root" role="dialog" aria-modal="true" aria-labelledby="deck-settings-title" @keydown.esc.stop.prevent="onEscape" @keydown.tab="onTab">
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section ref="sheet" class="sheet">
        <header class="sheet-header" :inert="pickerOpen || Boolean(confirmKind)">
          <button type="button" class="glass-action glass-action--icon" :aria-label="$t('common.close')" :disabled="saving || acting" @click="onCancel"><TablerIcon name="x" /></button>
          <div class="heading-copy">
            <h2 id="deck-settings-title">{{ $t('settings.title') }}</h2>
          </div>
          <span class="header-spacer" aria-hidden="true"></span>
        </header>

        <form id="deck-settings-form" class="sheet-body" :inert="pickerOpen || Boolean(confirmKind)" @submit.prevent="save">
          <section class="settings-section" aria-labelledby="deck-section-title">
            <h3 id="deck-section-title">{{ $t('settings.deckSection') }}</h3>
            <div class="settings-group">
              <label class="setting-row name-row">
                <span class="row-label">{{ $t('settings.rename') }}</span>
                <input v-model="name" type="text" maxlength="120" :placeholder="$t('settings.namePlaceholder')" :disabled="saving" required>
              </label>
              <button ref="topicTrigger" type="button" class="setting-row topic-trigger" aria-labelledby="deck-settings-topic-label deck-settings-topic-value" aria-haspopup="listbox" :aria-expanded="topicPickerOpen" :disabled="saving" @click="openTopicPicker">
                <span id="deck-settings-topic-label" class="row-label">{{ $t('settings.topic') }}</span>
                <span class="topic-value">
                  <span class="topic-dot" :style="topicDotStyle(selectedTopic)"><span class="topic-glyph" aria-hidden="true" /></span>
                  <span id="deck-settings-topic-value" class="topic-name">{{ $topic(selectedTopic) }}</span>
                  <TablerIcon name="chevronRight" class="row-chevron" />
                </span>
              </button>
            </div>
          </section>

          <section class="settings-section" aria-labelledby="algorithm-section-title">
            <h3 id="algorithm-section-title">{{ $t('settings.algorithm') }}</h3>
            <div class="settings-group">
              <button ref="presetTrigger" type="button" class="setting-row preset-trigger" aria-haspopup="dialog" :aria-expanded="presetPickerOpen" :disabled="saving" @click="openPresetPicker">
                <span class="preset-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path v-for="(d, i) in settingIcon(selectedPreset.key)" :key="i" :d="d" /></svg></span>
                <span class="row-copy"><strong>{{ $t(`settings.${selectedPreset.key}`) }}</strong><small>{{ $t(`settings.${selectedPreset.key}Body`) }}</small></span>
                <TablerIcon name="chevronRight" class="row-chevron" />
              </button>
              <label class="setting-row daily-row">
                <span class="row-label"><svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true"><path v-for="(d, i) in settingIcon('newCards')" :key="i" :d="d" /></svg>{{ $t('settings.newCards') }}</span>
                <input v-model.number="newCardsPerDay" type="number" min="1" max="9999" :disabled="saving" required>
              </label>
              <div v-for="toggle in toggleOptions" :key="toggle.key" class="setting-row">
                <span :id="`deck-settings-${toggle.key}`" class="row-label"><svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true"><path v-for="(d, i) in settingIcon(toggle.label)" :key="i" :d="d" /></svg>{{ $t(`settings.${toggle.label}`) }}</span>
                <button type="button" class="ios-switch" :class="{ on: $data[toggle.key] }" role="switch" :aria-checked="$data[toggle.key]" :aria-labelledby="`deck-settings-${toggle.key}`" :disabled="saving" @click="$data[toggle.key] = !$data[toggle.key]"><i></i></button>
              </div>
            </div>
          </section>

          <div class="danger-block">
            <button type="button" class="danger-link" :disabled="saving || acting" @click="confirmKind = 'reset'"><TablerIcon name="rotateClockwise" /><span>{{ $t('settings.resetProgress') }}</span><TablerIcon name="chevronRight" class="row-chevron" /></button>
            <button type="button" class="danger-link destructive" :disabled="saving || acting" @click="confirmKind = 'delete'"><TablerIcon name="trash" /><span>{{ $t('settings.deleteDeck') }}</span><TablerIcon name="chevronRight" class="row-chevron" /></button>
          </div>
        </form>

        <footer class="sheet-actions" :inert="pickerOpen || Boolean(confirmKind)">
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button type="submit" form="deck-settings-form" class="glass-action glass-action--accent save-button" :disabled="saving || acting">{{ saving ? $t('common.loading') : $t('common.save') }}</button>
        </footer>

        <div v-if="pickerOpen" class="picker-layer" role="dialog" aria-modal="true" aria-labelledby="deck-settings-picker-title" @keydown.esc.stop.prevent="closePicker">
          <header class="picker-header">
            <button type="button" class="glass-action glass-action--icon" :aria-label="$t('common.back')" @click="closePicker"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <h3 id="deck-settings-picker-title">{{ $t(topicPickerOpen ? 'decks.selectTagTitle' : 'settings.algorithm') }}</h3>
            <span class="header-spacer" aria-hidden="true"></span>
          </header>
          <div class="picker-list">
            <DeckTopicsPicker v-if="topicPickerOpen" :model-value="topicDraft" allow-automatic :suggestion="topicSuggestion" labelled-by="deck-settings-picker-title" auto-focus @update:model-value="onTopicPicked" />
            <div v-else class="preset-list" role="radiogroup" :aria-label="$t('settings.algorithm')">
              <label v-for="preset in presets" :key="preset.id" class="preset" :class="{ on: Number(presetId) === preset.id }">
                <input v-model.number="presetId" type="radio" name="preset" :value="preset.id" @change="closePresetPicker">
                <span class="preset-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path v-for="(d, i) in settingIcon(preset.key)" :key="i" :d="d" /></svg></span>
                <span class="row-copy"><strong>{{ $t(`settings.${preset.key}`) }}</strong><small>{{ $t(`settings.${preset.key}Body`) }}</small></span>
                <span class="radio-mark" aria-hidden="true"><TablerIcon v-if="Number(presetId) === preset.id" name="check" /></span>
              </label>
            </div>
          </div>
          <footer v-if="topicPickerOpen" class="sheet-actions">
            <p v-if="topicError" class="error" role="alert">{{ topicError }}</p>
            <button type="button" class="glass-action glass-action--accent save-button" :disabled="topicBusy" @click="saveTopicChoice">{{ $t(topicBusy ? 'common.loading' : 'common.save') }}</button>
          </footer>
        </div>
      </section>
      <StudyConfirmSheet :open="Boolean(confirmKind)" :title="confirmTitle" :message="confirmMessage" :confirm-label="confirmLabel" :busy="acting" :error="confirmError" @dismiss="closeConfirm" @confirm="runConfirm" />
    </div>
  </Teleport>
</template>

<script>
import { classifyDeckTopic } from '../api/deckTopicSuggestion';
import { AUTOMATIC_TOPIC, createTopicSuggestionModel } from '../study/deckTopicSuggestion';
import { getCurrentUser } from '../auth/session';
import { deleteOwnedDeck, resetDeckProgress, saveDeckSettings } from '../api/mopiq';
import { parseDeckConfig } from '../study/deckConfig';
import { DECK_PRESETS, readDeckSettings } from '../study/deckSettings';
import { getDisplayDeckTopic, sidebarTablerIconUrl } from '../utils';
import DeckTopicsPicker from './DeckTopicsPicker.vue';
import StudyConfirmSheet from './StudyConfirmSheet.vue';
import TablerIcon from './TablerIcon.vue';
import { isLegacyTopicKey, legacyTopicKey } from '../study/personalDeckTopics';

// Tabler Icons v3.46.0 outline (MIT). Stand-ins for the iPad SF / template glyphs.
const SETTING_ICONS = {
  general: [
    'M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8',
    'M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8',
    'M17.5 16a3.5 3.5 0 0 0 0 -7h-.5',
    'M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0',
    'M6.5 16a3.5 3.5 0 0 1 0 -7h.5',
    'M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10',
  ],
  medical: [
    'M6 4h-1a2 2 0 0 0 -2 2v3.5a5.5 5.5 0 0 0 11 0v-3.5a2 2 0 0 0 -2 -2h-1',
    'M8 15a6 6 0 1 0 12 0v-3',
    'M11 3v2',
    'M6 3v2',
    'M18 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  ],
  languages: [
    'M9 6.371c0 4.418 -2.239 6.629 -5 6.629',
    'M4 6.371h7',
    'M5 9c0 2.144 2.252 3.908 6 4',
    'M12 20l4 -9l4 9',
    'M19.1 18h-6.2',
    'M6.694 3l.793 .582',
  ],
  newCards: [
    'M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0',
    'M9 12h6',
    'M12 9v6',
  ],
  shuffle: [
    'M18 4l3 3l-3 3',
    'M18 20l3 -3l-3 -3',
    'M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5',
    'M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3',
  ],
  checkpoints: [
    'M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666',
    'M4.012 16.737a2 2 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1',
    'M11 14l2 2l4 -4',
  ],
  autoplay: [
    'M15 8a5 5 0 0 1 0 8',
    'M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5',
  ],
  topic: [
    'M6.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3',
  ],
  rename: [
    'M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4',
    'M13.5 6.5l4 4',
  ],
  reset: [
    'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4',
    'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4',
  ],
  delete: [
    'M4 7h16',
    'M10 11v6',
    'M14 11v6',
    'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
    'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
  ],
};

export default {
  name: 'DeckSettings',
  components: { DeckTopicsPicker, StudyConfirmSheet, TablerIcon },
  props: {
    open: { type: Boolean, default: false },
    deck: { type: Object, default: null },
  },
  emits: ['dismiss', 'saved', 'deleted', 'reset'],
  data() {
    return {
      presets: DECK_PRESETS,
      toggleOptions: [
        { key: 'shuffle', label: 'shuffle' },
        { key: 'showCheckpoints', label: 'checkpoints' },
        { key: 'autoplayAudio', label: 'autoplay' },
      ],
      presetPickerOpen: false,
      presetId: 0,
      newCardsPerDay: 20,
      shuffle: false,
      showCheckpoints: true,
      autoplayAudio: false,
      topicId: 'other',
      topicChanged: false,
      topicDraft: 'other',
      topicSuggestion: { phase: 'idle' },
      topicBusy: false,
      topicError: '',
      name: '',
      saving: false,
      error: '',
      topicPickerOpen: false,
      confirmKind: '',
      acting: false,
      confirmError: '',
    };
  },
  created() {
    this._topicModel = createTopicSuggestionModel({ classify: classifyDeckTopic, getIdentity: () => getCurrentUser()?.supabaseUid || '', onChange: state => { this.topicSuggestion = state; } });
  },
  beforeUnmount() { this._topicModel?.cancel(); },
  computed: {
    pickerOpen() { return this.topicPickerOpen || this.presetPickerOpen; },
    selectedPreset() { return this.presets.find(preset => preset.id === Number(this.presetId)) || this.presets[0]; },
    selectedTopic() {
      return getDisplayDeckTopic(this.topicId);
    },
    confirmTitle() {
      if (this.confirmKind === 'delete') return this.$t('settings.deleteTitle');
      if (this.confirmKind === 'reset') return this.$t('settings.resetTitle');
      return '';
    },
    confirmMessage() {
      if (this.confirmKind === 'delete') return this.$t('settings.deleteBody');
      if (this.confirmKind === 'reset') return this.$t('settings.resetBody');
      return '';
    },
    confirmLabel() {
      if (this.confirmKind === 'delete') return this.$t('settings.deleteDeck');
      if (this.confirmKind === 'reset') return this.$t('settings.resetProgress');
      return '';
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.hydrate();
        else this._topicModel?.cancel();
      },
    },
  },
  methods: {
    onTab(event) {
      const controls = [...this.$refs.sheet.querySelectorAll('button, input')]
        .filter(control => !control.disabled && !control.closest('[inert]') && control.offsetParent !== null);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    },
    hydrate() {
      const deck = this.deck;
      if (!deck) return;
      const settings = readDeckSettings(deck.extraConfig);
      this.presetId = settings.presetId;
      this.newCardsPerDay = settings.newCardsPerDay;
      this.shuffle = !settings.displayNewCardsInOrder;
      this.showCheckpoints = settings.showCheckpoints;
      this.autoplayAudio = settings.autoplayAudio;
      this.topicId = deck.personalTopicKey ?? deck.topic?.imageName ?? 'other';
      this.topicChanged = false;
      this.name = deck.name || '';
      this.error = '';
      this.topicPickerOpen = false;
      this.presetPickerOpen = false;
      this.confirmKind = '';
      this.confirmError = '';
      this.acting = false;
    },
    settingIcon(name) {
      return SETTING_ICONS[name] || [];
    },
    topicDotStyle(topic) {
      return {
        background: topic.backgroundColor,
        color: topic.color,
        '--topic-tint': topic.color,
        '--tabler-src': `url("${sidebarTablerIconUrl(topic.imageName)}")`,
      };
    },
    openPresetPicker() {
      if (this.saving) return;
      this.presetPickerOpen = true;
      this.$nextTick(() => this.$refs.sheet?.querySelector('input[name="preset"]:checked')?.focus());
    },
    closePresetPicker() {
      this.presetPickerOpen = false;
      this.$nextTick(() => this.$refs.presetTrigger?.focus());
    },
    closePicker() {
      if (this.topicPickerOpen) this.closeTopicPicker();
      else this.closePresetPicker();
    },
    openTopicPicker() {
      if (this.saving) return;
      this.topicDraft = this.topicId;
      this.topicError = '';
      this.topicBusy = false;
      this._topicModel.nameChanged(this.name);
      this.topicSuggestion = this._topicModel.stateFor(this.name);
      this.topicPickerOpen = true;
      this.$nextTick(() => {
        const sheet = this.$refs.sheet;
        if (sheet) sheet.scrollTop = 0;
        const list = sheet?.querySelector('.picker-list');
        const selected = list?.querySelector('.topic-row.on');
        if (list && selected) {
          list.scrollTop = Math.max(0, selected.offsetTop - 8);
        }
      });
    },
    closeTopicPicker() {
      this._topicModel?.cancel();
      this.topicBusy = false;
      this.topicPickerOpen = false;
      this.$nextTick(() => this.$refs.topicTrigger?.focus());
    },
    onTopicPicked(topicId) {
      this.topicDraft = topicId;
      this.topicError = '';
      if (topicId !== AUTOMATIC_TOPIC) { this._topicModel.cancel(); this.topicBusy = false; }
      else this._topicModel.nameChanged(this.name);
    },
    async saveTopicChoice() {
      if (this.topicBusy) return;
      const draft = this.topicDraft, owner = getCurrentUser()?.supabaseUid;
      this.topicBusy = true;
      try {
        const topic = draft === AUTOMATIC_TOPIC ? await this._topicModel.resolve(this.name) : draft;
        if (!this.open || !this.topicPickerOpen || draft !== this.topicDraft || getCurrentUser()?.supabaseUid !== owner) return;
        this.topicId = topic;
        this.topicChanged = true;
        this.closeTopicPicker();
      } catch (error) {
        if (error.name !== 'AbortError') this.topicError = this.$t('settings.saveError');
      } finally { this.topicBusy = false; }
    },
    onEscape() {
      if (this.saving || this.acting) return;
      if (this.confirmKind) {
        this.closeConfirm();
        return;
      }
      if (this.pickerOpen) {
        this.closePicker();
        return;
      }
      this.onCancel();
    },
    onCancel() {
      if (this.saving || this.acting) return;
      this._topicModel?.cancel();
      this.$emit('dismiss');
    },
    closeConfirm() {
      if (this.acting) return;
      this.confirmKind = '';
      this.confirmError = '';
    },
    async runConfirm() {
      if (!this.deck || this.acting || !this.confirmKind) return;
      this.acting = true;
      this.confirmError = '';
      try {
        if (this.confirmKind === 'delete') {
          await deleteOwnedDeck(this.deck);
          this.confirmKind = '';
          this.$emit('deleted');
        } else {
          await resetDeckProgress(this.deck);
          this.confirmKind = '';
          this.$emit('reset');
        }
      } catch (error) {
        this.confirmError = error.message || (this.confirmKind === 'delete'
          ? this.$t('settings.deleteError')
          : this.$t('settings.resetError'));
      } finally {
        this.acting = false;
      }
    },
    async save() {
      if (!this.deck || this.saving) return;
      const name = this.name.trim();
      if (!name) {
        this.error = this.$t('settings.nameRequired');
        return;
      }
      const newCardsPerDay = Math.min(9999, Math.max(1, Number(this.newCardsPerDay) || 20));
      this.saving = true;
      this.error = '';
      try {
        const extraConfig = await saveDeckSettings(this.deck, {
          presetId: Number(this.presetId) || 0,
          newCardsPerDay,
          displayNewCardsInOrder: !this.shuffle,
          showCheckpoints: this.showCheckpoints,
          autoplayAudio: this.autoplayAudio,
          ...(this.topicChanged ? { topic: this.topicId } : {}),
          name,
        });
        this.$emit('saved', {
          extraConfig,
          config: parseDeckConfig(extraConfig),
          name,
          topic: getDisplayDeckTopic(this.topicId),
          personalTopicKey: isLegacyTopicKey(this.topicId) ? null : this.topicId,
          legacyTopic: this.topicChanged ? getDisplayDeckTopic(legacyTopicKey(this.topicId)) : this.deck.legacyTopic,
        });
      } catch (error) {
        this.error = error.message || this.$t('settings.saveError');
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.sheet-root { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 24px; color: var(--title); }
.sheet-backdrop { position: absolute; inset: 0; border: 0; background: color-mix(in srgb, var(--title) 35%, transparent); backdrop-filter: blur(5px); cursor: pointer; }
.sheet { position: relative; display: flex; flex-direction: column; width: min(640px, 100%); max-height: min(900px, calc(100dvh - 48px)); overflow: hidden; background: var(--page-bg); border: 1px solid var(--card-border); border-radius: 28px; box-shadow: 0 24px 80px color-mix(in srgb, var(--title) 20%, transparent); text-align: start; }
.sheet-header, .picker-header { display: grid; grid-template-columns: 40px minmax(0, 1fr) 40px; align-items: center; gap: 16px; padding: 20px 24px; flex: 0 0 auto; }
.heading-copy { min-width: 0; text-align: center; }
.heading-copy h2 { margin: 0; color: var(--title); font-size: 21px; font-weight: 700; }
.sheet-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 4px 24px 24px; overscroll-behavior: contain; }
.settings-section + .settings-section { margin-top: 24px; }
h3 { margin: 0 0 10px 4px; font-size: 14px; font-weight: 650; color: var(--text); }
.settings-group, .danger-block { overflow: hidden; border: 1px solid var(--card-border); border-radius: 18px; background: var(--card-bg); }
.setting-row { display: flex; width: 100%; box-sizing: border-box; align-items: center; justify-content: space-between; gap: 16px; min-height: 60px; padding: 12px 16px; border: 0; background: transparent; color: var(--title); font: inherit; text-align: start; }
.setting-row + .setting-row { border-top: 1px solid var(--empty-bar); }
.row-label { display: flex; align-items: center; gap: 10px; flex: 1 1 auto; min-width: 0; font-size: 15px; font-weight: 550; }
.setting-icon { width: 20px; height: 20px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.setting-row input { box-sizing: border-box; min-width: 0; border: 1px solid var(--empty-bar); border-radius: 10px; background: var(--inset-bg); color: var(--title); padding: 9px 12px; font: inherit; font-size: 15px; }
.name-row input { width: 58%; }
.daily-row input { width: 84px; text-align: center; }
.topic-trigger, .preset-trigger { cursor: pointer; }
.topic-trigger:hover, .preset-trigger:hover { background: var(--inset-bg); }
.topic-value { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 66%; }
.topic-dot { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto; }
.topic-glyph { width: 18px; height: 18px; background-color: var(--topic-tint, currentColor); mask: var(--tabler-src) center / contain no-repeat; -webkit-mask: var(--tabler-src) center / contain no-repeat; }
.topic-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; }
.row-chevron { width: 18px; height: 18px; flex: 0 0 auto; color: var(--text-secondary); }
.preset-trigger { gap: 12px; padding-block: 16px; }
.preset-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 auto; border-radius: 10px; background: var(--secondary-btn-bg); color: var(--blue-button); }
.preset-icon svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.row-copy { flex: 1 1 auto; min-width: 0; }
.row-copy strong { display: block; font-size: 15px; font-weight: 600; color: var(--title); }
.row-copy small { display: block; margin-top: 5px; color: var(--text); font-size: 13px; line-height: 1.5; }
.ios-switch { position: relative; width: 48px; height: 29px; padding: 0; border: 0; border-radius: 999px; background: var(--search-border); cursor: pointer; flex: 0 0 auto; }
.ios-switch.on { background: var(--green); }
.ios-switch i { position: absolute; top: 2px; left: 2px; width: 25px; height: 25px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px var(--search-shadow); transition: transform .18s ease; }
.ios-switch.on i { transform: translateX(19px); }
.danger-block { margin-top: 24px; }
.danger-link { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 54px; padding: 12px 16px; border: 0; background: transparent; color: var(--title); font: inherit; font-size: 14px; text-align: start; cursor: pointer; }
.danger-link + .danger-link { border-top: 1px solid var(--empty-bar); }
.danger-link:hover { background: var(--inset-bg); }
.danger-link.destructive { color: var(--error); }
.danger-link.destructive:hover { background: color-mix(in srgb, var(--error) 5%, var(--card-bg)); }
.danger-link svg { width: 20px; height: 20px; }
.danger-link span { flex: 1; }
.sheet-actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex: 0 0 auto; padding: 16px 24px; border-top: 1px solid var(--empty-bar); background: var(--card-bg); }
.save-button { min-width: 100px; }
.error { flex: 1; margin: 0; color: var(--error); font-size: 14px; }
.picker-layer { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; min-height: 0; background: var(--page-bg); }
.picker-header h3 { margin: 0; text-align: center; font-size: 18px; color: var(--title); }
.picker-list { flex: 1; min-height: 0; overflow: auto; padding: 4px 20px 24px; }
.preset-list { display: grid; gap: 12px; }
.preset { position: relative; display: flex; align-items: start; gap: 12px; padding: 18px 16px; border: 1px solid var(--empty-bar); border-radius: 16px; background: var(--card-bg); cursor: pointer; }
.preset.on { border-color: var(--blue-button); background: color-mix(in srgb, var(--blue-button) 5%, var(--card-bg)); }
.preset input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.preset:focus-within { outline: 2px solid var(--blue-button); outline-offset: 3px; }
.radio-mark { display: grid; place-items: center; width: 22px; height: 22px; border: 1.5px solid var(--search-border); border-radius: 50%; flex: 0 0 auto; }
.preset.on .radio-mark { border-color: var(--blue-button); background: var(--blue-button); color: var(--button-text); }
.radio-mark svg { width: 16px; height: 16px; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--blue-button); outline-offset: 3px; }
.settings-group button:focus-visible { outline-offset: -3px; }
button:disabled, input:disabled { opacity: .45; cursor: default; }
@media (max-width: 600px) {
  .sheet-root { padding: 12px; }
  .sheet { max-height: calc(100dvh - 24px); border-radius: 24px; }
  .sheet-header, .picker-header { padding: 16px; gap: 10px; }
  .sheet-body { padding: 4px 12px 20px; }
  .sheet-actions { padding: 12px 16px max(12px, env(safe-area-inset-bottom)); }
  .setting-row { padding-inline: 12px; gap: 10px; }
  .picker-list { padding-inline: 12px; }
  .name-row { align-items: stretch; flex-direction: column; }
  .name-row input { width: 100%; }
}
@media (prefers-reduced-motion: reduce) { .ios-switch i { transition: none; } }
</style>
