<template>
  <Teleport v-if="open" :to="teleportTo">
    <div
      class="viewer-root"
      :class="{ embedded, overlay: !embedded }"
      role="dialog"
      :aria-modal="embedded ? 'false' : 'true'"
      :aria-labelledby="'card-viewer-title'"
      @keydown.esc="dismiss"
    >
      <header class="viewer-nav">
        <button type="button" class="close-circle" :aria-label="$t('common.close')" @click="dismiss">×</button>
        <h2 id="card-viewer-title">{{ $t('deck.viewCard') }}</h2>
        <span class="nav-spacer"></span>
      </header>
      <div class="viewer-stage">
        <iframe
          class="viewer-frame"
          sandbox=""
          :srcdoc="shownHtml"
          :title="$t('deck.viewCard')"
        ></iframe>
      </div>
      <div class="viewer-actions">
        <button type="button" class="toggle" @click="revealed = !revealed">
          {{ revealed ? $t('deck.showQuestion') : $t('study.showAnswer') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { fetchMediaMap } from '../api/mopiq';
import { backHtml, cardDocument, frontHtml } from '../study/cardHtml';

export default {
  name: 'CardViewer',
  props: {
    open: { type: Boolean, default: false },
    embedded: { type: Boolean, default: false },
    deck: { type: Object, default: null },
    card: { type: Object, default: null },
  },
  emits: ['dismiss'],
  data() {
    return {
      revealed: false,
      mediaMap: {},
      mediaDeckId: '',
    };
  },
  computed: {
    teleportTo() {
      return this.embedded ? '#browse-inspector' : 'body';
    },
    shownHtml() {
      if (!this.card) return '';
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const html = this.revealed
        ? backHtml(this.card, this.mediaMap, { dark })
        : frontHtml(this.card, this.mediaMap);
      return cardDocument(html, { dark });
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) {
          this.revealed = false;
          this.loadMedia();
        }
      },
    },
    card() {
      this.revealed = false;
      if (this.open) this.loadMedia();
    },
  },
  methods: {
    dismiss() {
      this.$emit('dismiss');
    },
    async loadMedia() {
      const deckId = this.deck?.id;
      if (!deckId) {
        this.mediaMap = {};
        this.mediaDeckId = '';
        return;
      }
      if (deckId === this.mediaDeckId && Object.keys(this.mediaMap).length) return;
      try {
        this.mediaMap = await fetchMediaMap(deckId);
        this.mediaDeckId = deckId;
      } catch {
        this.mediaMap = {};
      }
    },
  },
};
</script>

<style scoped>
.viewer-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--card-bg);
  color: var(--title);
}
.viewer-root.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
}
.viewer-root.embedded {
  height: 100%;
}
.viewer-nav {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 52px;
  padding: 8px 10px 0;
  flex: 0 0 auto;
}
.viewer-nav h2 {
  margin: 0;
  text-align: center;
  font-size: 17px;
  font-weight: 650;
}
.close-circle {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 15px;
  background: var(--empty-bar);
  color: var(--text);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}
.nav-spacer { width: 30px; }
.viewer-stage {
  flex: 1 1 auto;
  min-height: 0;
  margin: 8px 16px 0;
  border-radius: 20px;
  overflow: hidden;
  background: var(--page-bg);
}
.viewer-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
}
.viewer-actions {
  flex: 0 0 auto;
  padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
}
.toggle {
  width: 100%;
  border: 1px solid var(--stat-icon);
  background: var(--card-bg);
  color: var(--title);
  border-radius: 999px;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 600;
  padding: 14px 16px;
  cursor: pointer;
}
.toggle:hover { background: var(--inset-bg); }
</style>
