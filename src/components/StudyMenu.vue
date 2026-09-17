<template>
  <div class="study-menu">
    <button
      type="button"
      class="menu-btn"
      :disabled="disabled"
      :aria-label="$t('study.menu')"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-haspopup="true"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="8" cy="12" r="1.15" fill="currentColor"/>
        <circle cx="12" cy="12" r="1.15" fill="currentColor"/>
        <circle cx="16" cy="12" r="1.15" fill="currentColor"/>
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" class="menu-root" @keydown.esc="close">
        <button type="button" class="menu-backdrop" :aria-label="$t('common.close')" @click="close"></button>
        <section class="menu-panel" role="menu" :aria-label="$t('study.menu')">
          <header v-if="panel !== 'root'" class="menu-header">
            <button type="button" class="menu-back" @click="panel = 'root'">{{ $t('study.menuBack') }}</button>
            <h2>{{ panelTitle }}</h2>
          </header>
          <template v-if="panel === 'root'">
            <button type="button" class="menu-item" role="menuitemcheckbox" :aria-checked="showTimer ? 'true' : 'false'" @click="$emit('toggle-timer')">
              <span>{{ $t('study.showTimer') }}</span>
              <span class="mark" :class="{ on: showTimer }"></span>
            </button>
            <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('move-card')">
              {{ $t('study.moveCard') }}
            </button>
            <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('move-to-deck')">
              {{ $t('study.moveToDeck') }}
            </button>
            <button type="button" class="menu-item has-sub" role="menuitem" @click="panel = 'appearance'">
              {{ $t('profile.appearance') }}
            </button>
            <button type="button" class="menu-item has-sub" role="menuitem" @click="panel = 'toast'">
              {{ $t('study.answerToast') }}
            </button>
            <template v-if="canReport">
              <div class="menu-rule"></div>
              <button type="button" class="menu-item" role="menuitem" @click="emitAndClose('report')">
                {{ $t('study.reportCard') }}
              </button>
            </template>
            <div class="menu-rule"></div>
            <button type="button" class="menu-item danger" role="menuitem" @click="emitAndClose('delete')">
              {{ $t('study.deleteCard') }}
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
              <span>{{ appearanceLabel(option) }}</span>
              <span class="mark" :class="{ on: appearance === option }"></span>
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
              <span>{{ $t(`study.answerToast${capitalize(option)}`) }}</span>
              <span class="mark" :class="{ on: toastPosition === option }"></span>
            </button>
          </template>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: 'StudyMenu',
  props: {
    showTimer: { type: Boolean, default: false },
    appearance: { type: String, default: 'light' },
    toastPosition: { type: String, default: 'top' },
    canReport: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['toggle-timer', 'set-appearance', 'set-toast', 'move-card', 'move-to-deck', 'report', 'delete', 'open-change'],
  data() {
    return {
      open: false,
      panel: 'root',
      appearanceOptions: ['system', 'light', 'dark'],
      toastOptions: ['top', 'bottom', 'hide'],
    };
  },
  computed: {
    panelTitle() {
      if (this.panel === 'appearance') return this.$t('profile.appearance');
      if (this.panel === 'toast') return this.$t('study.answerToast');
      return this.$t('study.menu');
    },
  },
  watch: {
    open(value) {
      this.$emit('open-change', value);
      if (!value) this.panel = 'root';
    },
  },
  mounted() {
    this.onDocumentKey = (event) => {
      if (!this.open || event.key !== 'Escape') return;
      event.preventDefault();
      this.close();
    };
    window.addEventListener('keydown', this.onDocumentKey);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onDocumentKey);
  },
  methods: {
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
  },
};
</script>

<style scoped>
.study-menu {
  position: relative;
  flex: 0 0 44px;
  width: 44px;
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
.menu-btn svg {
  width: 24px;
  height: 24px;
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
  background: rgba(15, 23, 42, 0.28);
  cursor: pointer;
}
.menu-panel {
  position: absolute;
  top: max(12px, env(safe-area-inset-top));
  right: 16px;
  width: min(320px, calc(100vw - 32px));
  max-height: min(72vh, 560px);
  overflow: auto;
  padding: 8px 0;
  background: var(--card-bg);
  border-radius: 18px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
}
.menu-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 10px;
}
.menu-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--title);
}
.menu-back {
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  padding: 0;
}
.menu-item {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 18px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--title) !important;
  font: inherit !important;
  font-size: 1rem !important;
  font-weight: 550 !important;
  letter-spacing: 0 !important;
  text-align: left;
  cursor: pointer;
}
.menu-item:hover { background: var(--inset-bg) !important; }
.menu-item.danger { color: #dc2626 !important; }
.menu-item.has-sub::after {
  content: '';
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--text-secondary);
  border-top: 2px solid var(--text-secondary);
  transform: rotate(45deg);
  flex: 0 0 auto;
}
.menu-rule {
  height: 1px;
  margin: 6px 0;
  background: var(--empty-bar);
}
.mark {
  width: 18px;
  height: 18px;
  border: 1.6px solid var(--text-secondary);
  border-radius: 50%;
  flex: 0 0 auto;
}
.mark.on {
  border-color: var(--blue-button);
  background: var(--blue-button);
  box-shadow: inset 0 0 0 3px var(--card-bg);
}
@media (max-width: 640px) {
  .menu-panel {
    top: auto;
    right: 12px;
    left: 12px;
    bottom: max(12px, env(safe-area-inset-bottom));
    width: auto;
  }
}
</style>
