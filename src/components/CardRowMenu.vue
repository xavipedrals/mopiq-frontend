<template>
  <div class="card-row-menu">
    <button
      ref="trigger"
      type="button"
      class="menu-btn"
      :disabled="disabled"
      :aria-label="$t('deck.cardMenu')"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-haspopup="true"
      @click.stop="toggle"
    >
      <StudyMenuIcon name="dotsVertical" />
    </button>
    <Teleport to="body">
      <div v-if="open" class="menu-root">
        <button type="button" class="menu-backdrop" :aria-label="$t('common.close')" @click="close"></button>
        <section
          class="menu-panel"
          role="menu"
          :aria-label="$t('deck.cardMenu')"
          :style="panelStyle"
        >
          <button type="button" class="menu-item" role="menuitem" @click="choose('select')">
            <span class="label">{{ $t('deck.select') }}</span>
            <StudyMenuIcon name="selectBox" />
          </button>
          <button type="button" class="menu-item" role="menuitem" @click="choose('edit')">
            <span class="label">{{ $t('study.editCard') }}</span>
            <StudyMenuIcon name="edit" />
          </button>
          <button type="button" class="menu-item" role="menuitem" @click="choose('move')">
            <span class="label">{{ $t('deck.moveWithinDeck') }}</span>
            <StudyMenuIcon name="folder" />
          </button>
          <button type="button" class="menu-item" role="menuitem" @click="choose('move-to-deck')">
            <span class="label">{{ $t('study.moveToDeck') }}</span>
            <StudyMenuIcon name="inbox" />
          </button>
          <button type="button" class="menu-item" role="menuitem" @click="choose('copy')">
            <span class="label">{{ $t('deck.copyCard') }}</span>
            <StudyMenuIcon name="copy" />
          </button>
          <button type="button" class="menu-item" role="menuitem" @click="choose('reverse')">
            <span class="label">{{ $t('deck.reverseCard') }}</span>
            <StudyMenuIcon name="exchange" />
          </button>
          <div class="menu-rule"></div>
          <button type="button" class="menu-item danger" role="menuitem" @click="choose('delete')">
            <span class="label">{{ $t('study.deleteCard') }}</span>
            <StudyMenuIcon name="trash" />
          </button>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script>
import StudyMenuIcon from './StudyMenuIcon.vue';

export default {
  name: 'CardRowMenu',
  components: { StudyMenuIcon },
  props: {
    open: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['toggle', 'close', 'select', 'edit', 'move', 'move-to-deck', 'copy', 'reverse', 'delete'],
  data() {
    return {
      panelStyle: {},
    };
  },
  watch: {
    open(value) {
      if (value) {
        this.$nextTick(this.positionPanel);
        window.addEventListener('resize', this.onReposition);
        window.addEventListener('scroll', this.onReposition, true);
        window.addEventListener('keydown', this.onDocumentKey);
      } else {
        this.detach();
      }
    },
  },
  created() {
    this.onDocumentKey = (event) => {
      if (!this.open || event.key !== 'Escape') return;
      event.preventDefault();
      this.close();
    };
    this.onReposition = () => {
      if (this.open) this.positionPanel();
    };
  },
  beforeUnmount() {
    this.detach();
  },
  methods: {
    detach() {
      window.removeEventListener('resize', this.onReposition);
      window.removeEventListener('scroll', this.onReposition, true);
      window.removeEventListener('keydown', this.onDocumentKey);
    },
    toggle() {
      if (this.disabled) return;
      this.$emit('toggle');
    },
    close() {
      this.$emit('close');
    },
    choose(name) {
      this.close();
      this.$emit(name);
    },
    positionPanel() {
      const trigger = this.$refs.trigger;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 10;
      const width = Math.min(280, window.innerWidth - margin * 2);
      const estimated = 292;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      let top = rect.bottom + 6;
      if (spaceBelow < estimated && spaceAbove > spaceBelow) {
        top = Math.max(margin, rect.top - Math.min(estimated, spaceAbove) - 6);
      }
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
.card-row-menu {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 8px;
  background: transparent !important;
  color: var(--text-secondary);
  cursor: pointer;
}
.menu-btn :deep(.tabler-icon) {
  width: 18px;
  height: 18px;
}
.menu-btn:hover:not(:disabled),
.menu-btn[aria-expanded="true"] {
  background: color-mix(in srgb, var(--text) 8%, transparent) !important;
  color: var(--title);
}
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
