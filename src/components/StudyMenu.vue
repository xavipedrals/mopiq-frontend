<template>
  <div class="study-menu">
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

export default {
  name: 'StudyMenu',
  components: { StudyMenuIcon },
  props: {
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
  ],
  data() {
    return {
      open: false,
      panel: 'root',
      panelStyle: {},
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
      else this.$nextTick(this.positionPanel);
    },
  },
  mounted() {
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
    window.removeEventListener('keydown', this.onDocumentKey);
    window.removeEventListener('resize', this.onReposition);
    window.removeEventListener('scroll', this.onReposition, true);
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
    positionPanel() {
      const trigger = this.$refs.trigger;
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
.menu-btn :deep(.tabler-icon) {
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
