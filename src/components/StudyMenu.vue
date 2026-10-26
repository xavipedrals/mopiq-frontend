<template>
  <div class="study-menu">
    <button
      ref="flagTrigger"
      type="button"
      class="menu-btn flag-btn"
      :class="{ flagged: selectedFlags.length }"
      :style="{ '--flag-color': selectedFlagColor }"
      :disabled="disabled || !canFlag"
      :aria-label="$t('study.cardFlags')"
      :title="$t('study.cardFlags')"
      :aria-expanded="open && panel === 'flags' ? 'true' : 'false'"
      aria-haspopup="menu"
      @click="toggleFlags"
    >
      <StudyMenuIcon name="flag" />
    </button>
    <button
      ref="trigger"
      type="button"
      class="menu-btn"
      :disabled="disabled"
      :aria-label="$t('study.menu')"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-haspopup="true"
      @click="toggle"
    >
      <StudyMenuIcon name="ellipsis" />
    </button>
    <Teleport to="body">
      <div v-if="open" class="menu-root" @keydown.esc="close">
        <button type="button" class="menu-backdrop" :aria-label="$t('common.close')" @click="close"></button>
        <section
          class="menu-panel"
          role="menu"
          :aria-label="panelTitle"
          :style="panelStyle"
        >
          <header v-if="panel !== 'root'" class="menu-header">
            <button type="button" class="menu-back" :aria-label="$t('study.menuBack')" @click="panel = 'root'">
              <StudyMenuIcon name="chevronLeft" />
            </button>
            <h2>{{ panelTitle }}</h2>
          </header>

          <template v-if="panel === 'root'">
            <button
              v-if="canFlag"
              type="button"
              class="menu-item mobile-flags"
              role="menuitem"
              aria-haspopup="menu"
              @click="openFlags"
            >
              <span class="label">{{ $t('study.cardFlags') }}</span>
              <span class="trailing">
                <StudyMenuIcon name="flag" :class="{ 'selected-flag': selectedFlags.length }" :style="{ '--flag-color': selectedFlagColor }" />
                <StudyMenuIcon name="chevronRight" class="chevron" />
              </span>
            </button>
            <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('tutorial')"><span class="label">{{ $t('tutorial.practice') }}</span><StudyMenuIcon name="selectBox" /></button>
            <button
              type="button"
              class="menu-item"
              role="menuitemcheckbox"
              :aria-checked="showTimer ? 'true' : 'false'"
              @click="$emit('toggle-timer')"
            >
              <span class="label">{{ $t('study.showTimer') }}</span>
              <StudyMenuIcon :name="showTimer ? 'check' : 'circle'" :class="{ on: showTimer }" />
            </button>
            <button
              v-if="canToggleKeyboard"
              type="button"
              class="menu-item"
              role="menuitemcheckbox"
              :aria-checked="showKeycaps ? 'true' : 'false'"
              @click="$emit('toggle-keycaps')"
            >
              <span class="label">{{ $t('study.showKeyboardShortcuts') }}</span>
              <StudyMenuIcon :name="showKeycaps ? 'check' : 'circle'" :class="{ on: showKeycaps }" />
            </button>
            <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('edit')">
              <span class="label">{{ $t('study.editCard') }}</span>
              <StudyMenuIcon name="edit" />
            </button>
            <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('move-card')">
              <span class="label">{{ $t('study.moveCard') }}</span>
              <StudyMenuIcon name="folderShare" />
            </button>
            <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('move-to-deck')">
              <span class="label">{{ $t('study.moveToDeck') }}</span>
              <StudyMenuIcon name="inbox" />
            </button>
            <button type="button" class="menu-item has-sub" role="menuitem" @click="panel = 'appearance'">
              <span class="label">{{ $t('profile.appearance') }}</span>
              <span class="trailing">
                <StudyMenuIcon name="contrast" />
                <StudyMenuIcon name="chevronRight" class="chevron" />
              </span>
            </button>
            <button type="button" class="menu-item has-sub" role="menuitem" @click="panel = 'toast'">
              <span class="label">{{ $t('study.answerToast') }}</span>
              <span class="trailing">
                <StudyMenuIcon name="thumbUp" />
                <StudyMenuIcon name="chevronRight" class="chevron" />
              </span>
            </button>
            <template v-if="canReport">
              <div class="menu-rule"></div>
              <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('report')">
                <span class="label">{{ $t('study.reportCard') }}</span>
                <StudyMenuIcon name="alert" />
              </button>
            </template>
            <div class="menu-rule"></div>
            <button type="button" class="menu-item danger" role="menuitem" @click="emitAndClose('delete')">
              <span class="label">{{ $t('study.deleteCard') }}</span>
              <StudyMenuIcon name="trash" />
            </button>
          </template>

          <template v-else-if="panel === 'flags'">
            <p v-if="flagsLoading" class="menu-status" role="status">{{ $t('common.loading') }}</p>
            <p v-if="flagsError" class="menu-status danger" role="alert">{{ flagsError }}</p>
            <button
              v-for="flag in flags"
              :key="flag.flag_id"
              type="button"
              class="menu-item"
              role="menuitemcheckbox"
              :aria-checked="flagIDs.includes(flag.flag_id) ? 'true' : 'false'"
              :disabled="disabled || flagsLoading || flagsBusy"
              @click="changeFlag(flag)"
            >
              <span v-if="flag.emoji" class="flag-mark" aria-hidden="true">{{ flag.emoji }}</span>
              <StudyMenuIcon v-else name="flag" :style="{ color: flagColor(flag.color) }" />
              <span class="label">{{ flag.labelKey ? $t(flag.labelKey) : flag.name }}</span>
              <StudyMenuIcon v-if="flagIDs.includes(flag.flag_id)" name="check" class="on" />
            </button>
          </template>

          <template v-else-if="panel === 'appearance'">
            <button
              v-for="option in appearanceOptions"
              :key="option"
              type="button"
              class="menu-item"
              role="menuitemradio"
              :aria-checked="appearance === option ? 'true' : 'false'"
              @click="chooseAppearance(option)"
            >
              <span class="label">{{ appearanceLabel(option) }}</span>
              <StudyMenuIcon :name="appearance === option ? 'check' : 'circle'" :class="{ on: appearance === option }" />
            </button>
          </template>

          <template v-else>
            <button
              v-for="option in toastOptions"
              :key="option"
              type="button"
              class="menu-item"
              role="menuitemradio"
              :aria-checked="toastPosition === option ? 'true' : 'false'"
              @click="chooseToast(option)"
            >
              <span class="label">{{ $t(`study.answerToast${capitalize(option)}`) }}</span>
              <StudyMenuIcon :name="toastPosition === option ? 'check' : 'circle'" :class="{ on: toastPosition === option }" />
            </button>
          </template>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script>
import StudyMenuIcon from './StudyMenuIcon.vue';
import { fetchCardFlags, saveCardFlag } from '../api/personalFlags';
import { personalFlagColor } from '../study/personalFlags';
import { getTheme, subscribeTheme } from '../theme/theme';

export default {
  name: 'StudyMenu',
  components: { StudyMenuIcon },
  props: {
    deckId: { type: String, default: null },
    cardId: { type: [String, Number], default: null },
    showTimer: { type: Boolean, default: false },
    showKeycaps: { type: Boolean, default: true },
    canToggleKeyboard: { type: Boolean, default: false },
    appearance: { type: String, default: 'light' },
    toastPosition: { type: String, default: 'top' },
    canReport: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: [
    'toggle-timer',
    'toggle-keycaps',
    'set-appearance',
    'set-toast',
    'edit',
    'move-card',
    'move-to-deck',
    'report',
    'delete',
    'open-change',
    'flags-change',
    'tutorial',
  ],
  data() {
    return {
      open: false,
      flags: [],
      flagIDs: [],
      flagsLoading: false,
      flagsBusy: false,
      flagsError: '',
      flagsRequest: 0,
      theme: getTheme(),
      panel: 'root',
      panelStyle: {},
      appearanceOptions: ['system', 'light', 'dark'],
      toastOptions: ['top', 'bottom', 'hide'],
    };
  },
  computed: {
    canFlag() {
      return Boolean(this.deckId) && this.cardId != null;
    },
    cardIdentity() {
      return JSON.stringify([this.deckId, this.cardId]);
    },
    selectedFlags() {
      return this.flags.filter(flag => this.flagIDs.includes(flag.flag_id));
    },
    selectedFlagColor() {
      return this.selectedFlags[0] ? this.flagColor(this.selectedFlags[0].color) : undefined;
    },
    panelTitle() {
      if (this.panel === 'flags') return this.$t('study.cardFlags');
      if (this.panel === 'appearance') return this.$t('profile.appearance');
      if (this.panel === 'toast') return this.$t('study.answerToast');
      return this.$t('study.menu');
    },
  },
  watch: {
    cardIdentity: {
      immediate: true,
      handler() {
        this.close();
        this.loadFlags();
      },
    },
    panel() {
      if (this.open) this.$nextTick(this.positionPanel);
    },
    open(value) {
      this.$emit('open-change', value);
      if (!value) this.panel = 'root';
      else this.$nextTick(this.positionPanel);
    },
  },
  mounted() {
    this.unsubTheme = subscribeTheme(theme => { this.theme = theme; });
    this.onDocumentKey = (event) => {
      if (!this.open || event.key !== 'Escape') return;
      event.preventDefault();
      this.close();
    };
    this.onReposition = () => {
      if (this.open) this.positionPanel();
    };
    window.addEventListener('keydown', this.onDocumentKey);
    window.addEventListener('resize', this.onReposition);
    window.addEventListener('scroll', this.onReposition, true);
  },
  beforeUnmount() {
    this.flagsRequest += 1;
    this.unsubTheme?.();
    window.removeEventListener('keydown', this.onDocumentKey);
    window.removeEventListener('resize', this.onReposition);
    window.removeEventListener('scroll', this.onReposition, true);
  },
  methods: {
    publishFlags() {
      this.$emit('flags-change', { deckId: this.deckId, cardId: this.cardId, flags: this.selectedFlags });
    },
    flagColor(color) {
      return personalFlagColor(color, this.theme === 'dark');
    },
    toggleFlags() {
      if (this.disabled || !this.canFlag) return;
      if (this.open && this.panel === 'flags') this.close();
      else this.openFlags();
    },
    openFlags() {
      if (this.disabled || !this.canFlag) return;
      this.panel = 'flags';
      this.open = true;
      this.loadFlags();
    },
    async loadFlags() {
      const request = ++this.flagsRequest;
      const identity = this.cardIdentity;
      this.flags = [];
      this.flagIDs = [];
      this.flagsError = '';
      this.flagsLoading = false;
      if (!this.canFlag) return;
      this.flagsLoading = true;
      try {
        const result = await fetchCardFlags(this.deckId, this.cardId);
        if (request !== this.flagsRequest || identity !== this.cardIdentity) return;
        this.flags = result.flags;
        this.flagIDs = result.flagIDs;
        this.publishFlags();
      } catch {
        if (request === this.flagsRequest && identity === this.cardIdentity) this.flagsError = this.$t('study.flagsError');
      } finally {
        if (request === this.flagsRequest) this.flagsLoading = false;
      }
    },
    async changeFlag(flag) {
      if (this.disabled || !this.canFlag || this.flagsLoading || this.flagsBusy) return;
      const identity = this.cardIdentity;
      const enabled = !this.flagIDs.includes(flag.flag_id);
      this.flagsBusy = true;
      this.flagsError = '';
      try {
        await saveCardFlag(this.deckId, this.cardId, flag, enabled);
        if (identity !== this.cardIdentity) return;
        this.flagIDs = enabled ? [...this.flagIDs, flag.flag_id] : this.flagIDs.filter(id => id !== flag.flag_id);
        this.publishFlags();
      } catch {
        if (identity === this.cardIdentity) this.flagsError = this.$t('study.flagsError');
      } finally {
        this.flagsBusy = false;
      }
    },
    toggle() {
      if (this.disabled) return;
      this.open = !this.open;
    },
    close() {
      this.open = false;
    },
    emitAndClose(name) {
      this.close();
      this.$emit(name);
    },
    chooseAppearance(option) {
      this.$emit('set-appearance', option);
    },
    chooseToast(option) {
      this.$emit('set-toast', option);
    },
    appearanceLabel(option) {
      return this.$t(`profile.${option}`);
    },
    capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    },
    positionPanel() {
      const flagTrigger = this.$refs.flagTrigger;
      const trigger = this.panel === 'flags' && flagTrigger?.getBoundingClientRect().width
        ? flagTrigger : this.$refs.trigger;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 10;
      const width = Math.min(280, window.innerWidth - margin * 2);
      const top = Math.min(rect.bottom + 6, window.innerHeight - 200);
      const right = Math.max(margin, window.innerWidth - rect.right);
      this.panelStyle = {
        top: `${Math.max(margin, top)}px`,
        right: `${right}px`,
        width: `${width}px`,
        maxHeight: `${Math.max(160, window.innerHeight - Math.max(margin, top) - margin)}px`,
      };
    },
  },
};
</script>

<style scoped>
.study-menu {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  height: 44px;
}
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 50%;
  background: none !important;
  color: var(--close-button);
  cursor: pointer;
}
.menu-btn :deep(.tabler-icon) {
  width: 24px;
  height: 24px;
}
.flag-btn.flagged { color: var(--flag-color); }
.flag-btn.flagged :deep(.tabler-icon),
.menu-item :deep(.tabler-icon.selected-flag) { fill: currentColor; color: var(--flag-color); }
.menu-item.mobile-flags { display: none !important; }
.menu-status { margin: 8px 12px; color: var(--text-secondary); }
.menu-status.danger { color: var(--error); }
.menu-item:disabled { opacity: 0.55; cursor: default; }
.flag-mark { width: 22px; text-align: center; font-size: 22px; }
@media (max-width: 640px) {
  .flag-btn { display: none; }
  .menu-item.mobile-flags { display: flex !important; }
}
.menu-btn:hover:not(:disabled) { color: var(--text); }
.menu-btn:disabled { opacity: 0.55; cursor: default; }
.menu-btn:focus-visible {
  outline: 2px solid var(--blue-button);
  outline-offset: 2px;
}
.menu-root {
  position: fixed;
  inset: 0;
  z-index: 90;
}
.menu-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: default;
}
.menu-panel {
  position: absolute;
  overflow: auto;
  padding: 6px;
  background: color-mix(in srgb, var(--card-bg) 88%, transparent);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 0.5px solid color-mix(in srgb, var(--text) 12%, transparent);
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.22), 0 0 1px rgba(15, 23, 42, 0.12);
  text-align: left;
}
.menu-header {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 2px 6px 8px;
}
.menu-header h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
  color: var(--title);
}
.menu-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--blue-button);
  cursor: pointer;
}
.menu-back :deep(.tabler-icon) {
  width: 20px;
  height: 20px;
  stroke-width: 2.2;
}
.menu-item {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px !important;
  border: 0 !important;
  border-radius: 8px !important;
  background: transparent !important;
  color: var(--title) !important;
  font: inherit !important;
  font-size: 1.0625rem !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
}
.menu-item .label {
  min-width: 0;
  flex: 1 1 auto;
}
.menu-item :deep(.tabler-icon) {
  color: var(--text);
}
.menu-item :deep(.tabler-icon.on) {
  color: var(--blue-button);
}
.menu-item .trailing {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}
.menu-item .chevron {
  width: 16px !important;
  height: 16px !important;
  color: var(--text-secondary);
}
.menu-item:hover { background: color-mix(in srgb, var(--text) 8%, transparent) !important; }
.menu-item.danger,
.menu-item.danger :deep(.tabler-icon) {
  color: #ff3b30 !important;
}
.menu-rule {
  height: 1px;
  margin: 5px 8px;
  background: color-mix(in srgb, var(--text) 12%, transparent);
}
@media (prefers-reduced-transparency: reduce) {
  .menu-panel {
    background: var(--card-bg);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
