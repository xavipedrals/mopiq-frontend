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
      <div class="card-shell">
        <header class="viewer-nav">
          <button type="button" class="close-circle" :aria-label="$t('common.close')" @click="dismiss">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="currentColor"/>
              <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" fill="none" stroke="var(--study-webview)" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <h2 id="card-viewer-title" class="review-pill" :class="reviewClass">{{ reviewLabel }}</h2>
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
    reviewKey() {
      const raw = String(this.card?.lastAnswerGiven || '').toUpperCase();
      return ['AGAIN', 'HARD', 'GOOD', 'EASY'].includes(raw) ? raw : '';
    },
    reviewClass() {
      return this.reviewKey ? this.reviewKey.toLowerCase() : 'none';
    },
    reviewLabel() {
      const key = this.reviewKey;
      if (!key) return this.$t('deck.noReviews');
      return this.$t(`study.${key.toLowerCase()}`);
    },
    occlusionLabels() {
      return {
        showAnswers: this.$t('study.occlusionShow'),
        hideAnswers: this.$t('study.occlusionHide'),
      };
    },
    shownHtml() {
      if (!this.card) return '';
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const html = this.revealed
        ? backHtml(this.card, this.mediaMap, { dark, ...this.occlusionLabels })
        : frontHtml(this.card, this.mediaMap, this.occlusionLabels);
      return cardDocument(html, { dark, browse: true });
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
  background: var(--page-bg);
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
.card-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 20px 20px 0;
  border-radius: 30px;
  overflow: hidden;
  background: var(--study-webview);
  box-shadow: var(--card-shadow);
}
.viewer-nav {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  height: 60px;
  flex: 0 0 auto;
  background: var(--study-webview);
  border-bottom: 1px solid var(--separator);
}
.review-pill {
  justify-self: center;
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 6px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--title) 10%, transparent);
  color: var(--title);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.2;
}
.review-pill.again { background: var(--grade-again-bg); color: var(--grade-again-text); }
.review-pill.hard { background: var(--grade-hard-bg); color: var(--grade-hard-text); }
.review-pill.good { background: var(--grade-good-bg); color: var(--grade-good-text); }
.review-pill.easy { background: var(--grade-easy-bg); color: var(--grade-easy-text); }
.close-circle {
  width: 44px;
  height: 44px;
  margin-left: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--close-button);
  cursor: pointer;
}
.close-circle svg { width: 24px; height: 24px; display: block; margin: 0 auto; }
.nav-spacer { width: 44px; }
.viewer-stage {
  flex: 1 1 auto;
  min-height: 0;
  background: var(--study-webview);
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
