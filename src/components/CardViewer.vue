<template>
  <Teleport v-if="open" :to="teleportTo">
    <div
      ref="root"
      class="viewer-root"
      :class="{ embedded, overlay: !embedded, wide }"
      tabindex="-1"
      role="dialog"
      :aria-modal="embedded ? 'false' : 'true'"
      :aria-labelledby="'card-viewer-title'"
    >
      <header class="viewer-nav">
        <div class="nav-side">
          <button type="button" class="icon-btn" :aria-label="$t('common.close')" @click="dismiss">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
              <path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="viewer-title">
          <h2 id="card-viewer-title">{{ title }}</h2>
          <p v-if="positionLabel">{{ positionLabel }}</p>
        </div>
        <div class="nav-side end">
          <button
            v-if="canExpand"
            type="button"
            class="icon-btn"
            :aria-label="$t('deck.goFullscreen')"
            @click="$emit('expand')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button
            ref="moreButton"
            type="button"
            class="icon-btn"
            :aria-label="$t('deck.moreOptions')"
            :aria-expanded="menuOpen ? 'true' : 'false'"
            aria-haspopup="menu"
            @click="toggleMenu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="6" cy="12" r="1.3" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.3" fill="currentColor"/>
              <circle cx="18" cy="12" r="1.3" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      <div class="viewer-body">
        <div
          class="stage"
          @pointerdown="onChromePointerDown"
          @pointerup="onChromePointerUp"
          @pointercancel="chromeGesture = null"
        >
          <button
            v-if="wide"
            type="button"
            class="icon-btn side"
            :disabled="!hasPrevious"
            :aria-label="$t('deck.previousCard')"
            @click="step(-1)"
          >
            <StudyMenuIcon name="chevronLeft" />
          </button>
          <div class="card-column">
            <div class="paper" :key="card?.id || 'empty'" :class="slide">
              <iframe
                ref="frame"
                class="viewer-frame"
                sandbox="allow-same-origin"
                referrerpolicy="no-referrer"
                :srcdoc="shownHtml"
                :title="$t('deck.viewCard')"
                @load="onFrameLoad"
              ></iframe>
              <button v-if="!revealed" type="button" class="hint" @click="toggleSide">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ $t('deck.tapToShowAnswer') }}
              </button>
            </div>
          </div>
          <button
            v-if="wide"
            type="button"
            class="icon-btn side"
            :disabled="!hasNext"
            :aria-label="$t('deck.nextCard')"
            @click="step(1)"
          >
            <StudyMenuIcon name="chevronRight" />
          </button>
        </div>
        <div class="review-row" :class="{ empty: !showReview }" :aria-hidden="showReview ? 'false' : 'true'">
          <span>{{ $t('deck.lastReview') }}</span>
          <span v-if="showReview" class="review-pill" :class="reviewKey">
            <span class="dot" aria-hidden="true"></span>
            {{ $t(`study.${reviewKey}`) }}
            <span class="age">· {{ reviewAge }}</span>
          </span>
        </div>
      </div>

      <footer v-if="showToolbar" class="toolbar-wrap">
        <div class="viewer-toolbar">
          <button
            v-if="!wide"
            type="button"
            class="icon-btn"
            :disabled="!hasPrevious"
            :aria-label="$t('deck.previousCard')"
            @click="step(-1)"
          >
            <StudyMenuIcon name="chevronLeft" />
          </button>
          <span v-if="!wide" class="spacer"></span>
          <div class="card-actions">
            <button
              v-if="canEdit"
              type="button"
              class="icon-btn"
              :disabled="!editable || paging"
              :aria-label="$t('study.editCard')"
              @click="$emit('edit')"
            >
              <StudyMenuIcon name="edit" />
            </button>
            <button
              ref="flagButton"
              type="button"
              class="icon-btn flag-btn"
              :class="{ flagged: selectedFlags.length }"
              :style="{ '--flag-color': selectedFlags[0] ? flagColor(selectedFlags[0].color) : undefined }"
              :disabled="!card || !deck?.id || paging || flagsBusy"
              :aria-label="$t('study.cardFlags')"
              :aria-expanded="menuOpen && menuPanel === 'flags' ? 'true' : 'false'"
              aria-haspopup="menu"
              @click="toggleFlags"
            >
              <StudyMenuIcon name="flag" />
            </button>
          </div>
          <span v-if="!wide" class="spacer"></span>
          <button
            v-if="!wide"
            type="button"
            class="icon-btn"
            :disabled="!hasNext"
            :aria-label="$t('deck.nextCard')"
            @click="step(1)"
          >
            <StudyMenuIcon name="chevronRight" />
          </button>
        </div>
      </footer>
    </div>
  </Teleport>
  <Teleport to="body">
    <div v-if="open && menuOpen" class="menu-root">
      <button type="button" class="menu-backdrop" :aria-label="$t('common.close')" @click="closeMenu"></button>
      <section ref="menuPanel" class="menu-panel" role="menu" :aria-label="menuPanel === 'flags' ? $t('study.cardFlags') : $t('deck.moreOptions')" :style="menuStyle">
        <template v-if="menuPanel === 'flags'">
          <div class="menu-header"><h2>{{ $t('study.cardFlags') }}</h2></div>
          <p v-if="flagsLoading" class="menu-status" role="status">{{ $t('common.loading') }}</p>
          <p v-if="flagsError" class="menu-status danger" role="alert">{{ flagsError }}</p>
          <button
            v-for="flag in flags"
            :key="flag.flag_id"
            type="button"
            class="menu-item"
            role="menuitemcheckbox"
            :aria-checked="flagIDs.includes(flag.flag_id) ? 'true' : 'false'"
            :disabled="flagsLoading || flagsBusy || paging"
            @click="changeFlag(flag)"
          >
            <span v-if="flag.emoji" class="flag-mark" aria-hidden="true">{{ flag.emoji }}</span>
            <StudyMenuIcon v-else name="flag" :style="{ color: flagColor(flag.color) }" />
            <span class="label">{{ flag.labelKey ? $t(flag.labelKey) : flag.name }}</span>
            <StudyMenuIcon v-if="flagIDs.includes(flag.flag_id)" name="check" class="on" />
          </button>
        </template>
        <template v-else-if="menuPanel === 'appearance'">
          <div class="menu-header">
            <button type="button" class="menu-back" :aria-label="$t('common.back')" @click="menuPanel = 'root'">
              <StudyMenuIcon name="chevronLeft" />
            </button>
            <h2>{{ $t('profile.appearance') }}</h2>
          </div>
          <button
            v-for="option in appearanceOptions"
            :key="option"
            type="button"
            class="menu-item"
            role="menuitemradio"
            :aria-checked="appearance === option ? 'true' : 'false'"
            @click="setAppearance(option)"
          >
            <span class="label">{{ $t(`profile.${option}`) }}</span>
            <StudyMenuIcon :name="appearance === option ? 'check' : 'circle'" :class="{ on: appearance === option }" />
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="menu-item"
            role="menuitemcheckbox"
            :aria-checked="showAnswers ? 'true' : 'false'"
            @click="toggleShowAnswers"
          >
            <span class="label">{{ $t('deck.showAnswers') }}</span>
            <StudyMenuIcon v-if="showAnswers" name="check" class="on" />
          </button>
          <template v-if="canEdit">
            <div class="menu-rule"></div>
            <button type="button" class="menu-item" role="menuitem" :disabled="paging" @click="choose('move')">
              <span class="label">{{ $t('deck.moveWithinDeck') }}</span>
              <StudyMenuIcon name="folder" />
            </button>
            <button type="button" class="menu-item" role="menuitem" :disabled="paging" @click="choose('move-to-deck')">
              <span class="label">{{ $t('study.moveToDeck') }}</span>
              <StudyMenuIcon name="inbox" />
            </button>
          </template>
          <div class="menu-rule"></div>
          <button type="button" class="menu-item" role="menuitem" @click="menuPanel = 'appearance'">
            <span class="label">{{ $t('profile.appearance') }}</span>
            <span class="trailing">
              <StudyMenuIcon name="contrast" />
              <StudyMenuIcon name="chevronRight" class="chevron" />
            </span>
          </button>
          <template v-if="canEdit">
            <div class="menu-rule"></div>
            <button type="button" class="menu-item danger" role="menuitem" :disabled="paging" @click="choose('delete')">
              <span class="label">{{ $t('study.deleteCard') }}</span>
              <StudyMenuIcon name="trash" />
            </button>
          </template>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { fetchMediaMap } from '../api/mopiq';
import { fetchCardFlags, saveCardFlag } from '../api/personalFlags';
import { personalFlagColor } from '../study/personalFlags';
import { localeTag } from '../i18n';
import { backHtml, cardDocument, frontHtml } from '../study/cardHtml';
import { cardEditableOnWeb } from '../study/cardFields';
import {
  readShowAnswers,
  relativeReviewLabel,
  usesWideCardViewer,
  viewerCanGoNext,
  viewerCanGoPrevious,
  writeShowAnswers,
} from '../study/cardViewer';
import { getTheme, getThemePreference, setThemePreference, subscribeTheme } from '../theme/theme';
import StudyMenuIcon from './StudyMenuIcon.vue';

const INTERACTIVE = 'a, button, input, textarea, select, audio, video, label, summary';

export default {
  name: 'CardViewer',
  components: { StudyMenuIcon },
  props: {
    open: { type: Boolean, default: false },
    embedded: { type: Boolean, default: false },
    canExpand: { type: Boolean, default: false },
    deck: { type: Object, default: null },
    title: { type: String, default: '' },
    card: { type: Object, default: null },
    cards: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    hasMore: { type: Boolean, default: false },
    paging: { type: Boolean, default: false },
  },
  emits: ['dismiss', 'step', 'expand', 'edit', 'move', 'move-to-deck', 'delete'],
  data() {
    return {
      revealed: readShowAnswers(cardViewerStorage()),
      showAnswers: readShowAnswers(cardViewerStorage()),
      mediaMap: {},
      mediaDeckId: '',
      themeTick: 0,
      wide: false,
      slide: '',
      menuOpen: false,
      menuPanel: 'root',
      menuStyle: {},
      appearance: 'light',
      appearanceOptions: ['system', 'light', 'dark'],
      suppressClick: false,
      chromeGesture: null,
      flags: [],
      flagIDs: [],
      flagsLoading: false,
      flagsBusy: false,
      flagsError: '',
    };
  },
  computed: {
    teleportTo() {
      return this.embedded ? '#browse-inspector' : 'body';
    },
    canEdit() {
      return Boolean(this.deck?.canEdit);
    },
    editable() {
      return this.canEdit && cardEditableOnWeb(this.card);
    },
    showToolbar() {
      return !this.wide || this.canEdit || Boolean(this.card && this.deck?.id);
    },
    selectedFlags() {
      return this.flags.filter((flag) => this.flagIDs.includes(flag.flag_id));
    },
    index() {
      const id = this.card?.id;
      if (id == null) return -1;
      return this.cards.findIndex((row) => row?.id === id);
    },
    positionLabel() {
      if (this.index < 0) return '';
      const total = Math.max(this.total || 0, this.cards.length, this.index + 1);
      return this.$t('deck.cardPosition', { current: this.index + 1, total });
    },
    hasPrevious() {
      return !this.paging && viewerCanGoPrevious(this.index);
    },
    hasNext() {
      return !this.paging && viewerCanGoNext(this.index, this.cards.length, this.hasMore);
    },
    reviewKey() {
      const raw = String(this.card?.lastAnswerGiven || '').toUpperCase();
      return ['AGAIN', 'HARD', 'GOOD', 'EASY'].includes(raw) ? raw.toLowerCase() : '';
    },
    reviewAge() {
      void this.$t('deck.lastReview');
      if (!this.card?.lastReviewedAt) return '';
      return relativeReviewLabel(this.card.lastReviewedAt, new Date(), localeTag());
    },
    showReview() {
      return Boolean(this.reviewKey && this.reviewAge);
    },
    occlusionLabels() {
      return {
        showAnswers: this.$t('study.occlusionShow'),
        hideAnswers: this.$t('study.occlusionHide'),
      };
    },
    shownHtml() {
      void this.themeTick;
      if (!this.card) return '';
      const dark = getTheme() === 'dark';
      const html = this.revealed
        ? backHtml(this.card, this.mediaMap, { dark, ...this.occlusionLabels })
        : frontHtml(this.card, this.mediaMap, this.occlusionLabels);
      return cardDocument(html, {
        dark,
        viewer: true,
        flags: this.selectedFlags.map(flag => ({ ...flag, name: flag.labelKey ? this.$t(flag.labelKey) : flag.name })),
      });
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) {
          this.revealed = this.showAnswers;
          this.menuOpen = false;
          this.slide = '';
          this.loadMedia();
          this.loadFlags();
          this.$nextTick(() => {
            this.observe();
            this.syncScrollLock();
            if (!this.embedded) this.$refs.root?.focus();
          });
        } else {
          this.menuOpen = false;
          this.syncScrollLock();
        }
      },
    },
    embedded() {
      this.syncScrollLock();
      this.$nextTick(this.observe);
    },
    card(card, previous) {
      if (card?.id !== previous?.id) {
        this.revealed = this.showAnswers;
        this.menuOpen = false;
      }
      if (this.open) {
        this.loadMedia();
        this.loadFlags();
      }
    },
    'deck.id'() {
      if (this.open) this.loadFlags();
    },
    menuOpen(value) {
      if (!value) {
        this.menuPanel = 'root';
        return;
      }
      this.appearance = getThemePreference();
      this.$nextTick(this.positionMenu);
    },
    menuPanel() {
      if (this.menuOpen) this.$nextTick(this.positionMenu);
    },
  },
  created() {
    this.onKey = (event) => {
      if (!this.open) return;
      const typing = event.target?.closest?.('input, textarea, select, [contenteditable="true"]');
      if (event.key === 'Escape') {
        if (this.menuOpen) {
          event.preventDefault();
          this.closeMenu();
          return;
        }
        if (!typing) this.dismiss();
        return;
      }
      if (typing || this.menuOpen) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.step(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    this.onReposition = () => {
      if (this.menuOpen) this.positionMenu();
    };
  },
  mounted() {
    this.appearance = getThemePreference();
    this.unsubscribeTheme = subscribeTheme(() => {
      this.themeTick += 1;
    });
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onReposition);
  },
  beforeUnmount() {
    this.observer?.disconnect();
    this.unsubscribeTheme?.();
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onReposition);
    document.documentElement.classList.remove('card-viewer-open');
  },
  methods: {
    dismiss() {
      this.menuOpen = false;
      this.$emit('dismiss');
    },
    step(offset) {
      if (offset < 0 && !this.hasPrevious) return;
      if (offset > 0 && !this.hasNext) return;
      this.slide = offset > 0 ? 'forward' : 'back';
      this.menuOpen = false;
      this.$emit('step', offset);
    },
    toggleSide() {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.showAnswers) return;
      this.revealed = !this.revealed;
    },
    toggleShowAnswers() {
      this.showAnswers = !this.showAnswers;
      writeShowAnswers(this.showAnswers, cardViewerStorage());
      this.revealed = this.showAnswers;
      this.closeMenu();
    },
    toggleMenu() {
      const wasOpen = this.menuOpen && this.menuPanel !== 'flags';
      this.menuPanel = 'root';
      this.menuOpen = !wasOpen;
    },
    toggleFlags() {
      const wasOpen = this.menuOpen && this.menuPanel === 'flags';
      this.menuPanel = 'flags';
      this.menuOpen = !wasOpen;
      if (!wasOpen) this.loadFlags();
    },
    flagColor(color) {
      void this.themeTick;
      return personalFlagColor(color, getTheme() === 'dark');
    },
    async loadFlags() {
      const request = this.flagsRequest = (this.flagsRequest || 0) + 1;
      const deckId = this.deck?.id;
      const cardId = this.card?.id;
      this.flags = [];
      this.flagIDs = [];
      this.flagsError = '';
      this.flagsLoading = false;
      if (!deckId || cardId == null) return;
      this.flagsLoading = true;
      try {
        const result = await fetchCardFlags(deckId, cardId);
        if (request !== this.flagsRequest) return;
        this.flags = result.flags;
        this.flagIDs = result.flagIDs;
      } catch {
        if (request === this.flagsRequest) this.flagsError = this.$t('study.flagsError');
      } finally {
        if (request === this.flagsRequest) {
          this.flagsLoading = false;
          if (this.menuOpen && this.menuPanel === 'flags') this.$nextTick(this.positionMenu);
        }
      }
    },
    async changeFlag(flag) {
      if (this.flagsBusy || this.flagsLoading || this.paging) return;
      const request = this.flagsRequest;
      const enabled = !this.flagIDs.includes(flag.flag_id);
      this.flagsBusy = true;
      this.flagsError = '';
      try {
        await saveCardFlag(this.deck.id, this.card.id, flag, enabled);
        if (request !== this.flagsRequest) return;
        this.flagIDs = enabled
          ? [...this.flagIDs, flag.flag_id]
          : this.flagIDs.filter((id) => id !== flag.flag_id);
      } catch {
        if (request === this.flagsRequest) this.flagsError = this.$t('study.flagsError');
      } finally {
        this.flagsBusy = false;
      }
    },
    closeMenu() {
      this.menuOpen = false;
    },
    choose(name) {
      if (this.paging) return;
      this.closeMenu();
      this.$emit(name);
    },
    setAppearance(option) {
      this.appearance = option;
      setThemePreference(option);
    },
    syncScrollLock() {
      document.documentElement.classList.toggle('card-viewer-open', Boolean(this.open) && !this.embedded);
    },
    observe() {
      this.observer?.disconnect();
      const root = this.$refs.root;
      if (!root || typeof ResizeObserver === 'undefined') return;
      this.observer = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect;
        if (!box) return;
        this.wide = usesWideCardViewer(box.width, box.height);
      });
      this.observer.observe(root);
    },
    positionMenu() {
      const trigger = this.menuPanel === 'flags' ? this.$refs.flagButton : this.$refs.moreButton;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 10;
      const width = Math.min(280, window.innerWidth - margin * 2);
      const availableAbove = Math.max(120, rect.top - margin - 6);
      const panelHeight = this.menuPanel === 'flags'
        ? Math.min(this.$refs.menuPanel?.offsetHeight || 360, availableAbove)
        : 220;
      const top = this.menuPanel === 'flags'
        ? Math.max(margin, rect.top - panelHeight - 6)
        : Math.min(rect.bottom + 6, window.innerHeight - panelHeight);
      const right = Math.max(margin, window.innerWidth - rect.right);
      this.menuStyle = {
        top: `${Math.max(margin, top)}px`,
        right: `${right}px`,
        width: `${width}px`,
        maxHeight: `${this.menuPanel === 'flags' ? availableAbove : Math.max(160, window.innerHeight - Math.max(margin, top) - margin)}px`,
      };
    },
    onChromePointerDown(event) {
      if (event.button !== 0 || event.target?.closest?.('button')) return;
      this.chromeGesture = { x: event.clientX, y: event.clientY };
    },
    onChromePointerUp(event) {
      const start = this.chromeGesture;
      this.chromeGesture = null;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        this.suppressClick = true;
        this.step(dx < 0 ? 1 : -1);
      }
    },
    onFrameLoad() {
      const doc = this.$refs.frame?.contentDocument;
      if (!doc || doc.__mopiqViewerBound) return;
      try {
        doc.__mopiqViewerBound = true;
        let startX = 0;
        let startY = 0;
        let tracking = false;
        doc.addEventListener('pointerdown', (event) => {
          if (event.button !== 0) return;
          tracking = true;
          startX = event.clientX;
          startY = event.clientY;
        });
        doc.addEventListener('pointerup', (event) => {
          if (!tracking) return;
          tracking = false;
          const dx = event.clientX - startX;
          const dy = event.clientY - startY;
          if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            this.step(dx < 0 ? 1 : -1);
            return;
          }
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
          if (event.target?.closest?.(INTERACTIVE)) return;
          if (doc.getSelection?.()?.toString()) return;
          this.toggleSide();
        });
      } catch {
        // The hint button still reveals the answer if the frame blocks events.
      }
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

function cardViewerStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
</script>

<style scoped>
.viewer-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #E2E8F0;
  color: var(--title);
  font-family: Inter, system-ui, -apple-system, "Helvetica Neue", sans-serif;
  outline: none;
}
.viewer-root.overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  height: 100dvh;
}
.viewer-root.embedded { height: 100%; }
.viewer-nav {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr) 104px;
  align-items: center;
  width: min(900px, 100%);
  height: 64px;
  padding: 0 8px;
  box-sizing: border-box;
  margin: 0 auto;
  flex: 0 0 auto;
}
.viewer-root.wide .viewer-nav { width: min(780px, 100%); }
.nav-side {
  display: flex;
  align-items: center;
  min-width: 44px;
}
.nav-side.end { justify-content: flex-end; }
.viewer-title {
  min-width: 0;
  text-align: center;
}
.viewer-title h2 {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1.2;
}
.viewer-title p {
  margin: 1px 0 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.2;
}
.viewer-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 12px;
  padding: 6px 16px 0;
}
.card-column {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 900px;
  display: flex;
}
.viewer-root.wide .card-column { max-width: 780px; }
.paper {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  overflow: hidden;
  background: var(--study-webview);
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.04);
}
.paper.forward { animation: viewer-forward 0.24s ease; }
.paper.back { animation: viewer-back 0.24s ease; }
.viewer-frame {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  border: 0;
  background: transparent;
}
.hint {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  margin: 0 12px 8px;
  padding: 8px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
.hint svg { width: 16px; height: 16px; flex: 0 0 auto; }
.side { align-self: center; }
.review-row {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  padding: 8px 12px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.review-row.empty { visibility: hidden; }
.review-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 15px;
  font-weight: 650;
}
.review-pill .age { font-weight: 500; opacity: 0.8; }
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.review-pill.again { background: var(--grade-again-bg); color: var(--grade-again-text); }
.review-pill.hard { background: var(--grade-hard-bg); color: var(--grade-hard-text); }
.review-pill.good { background: var(--grade-good-bg); color: var(--grade-good-text); }
.review-pill.easy { background: var(--grade-easy-bg); color: var(--grade-easy-text); }
.toolbar-wrap {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  padding: 0 12px calc(6px + env(safe-area-inset-bottom));
}
.viewer-toolbar {
  display: flex;
  align-items: center;
  width: min(900px, 100%);
  height: 64px;
}
.card-actions { display: flex; align-items: center; gap: 12px; }
.viewer-root.wide .viewer-toolbar {
  width: 220px;
  justify-content: center;
}
.spacer { flex: 1 1 auto; }
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--title);
  cursor: pointer;
}
.icon-btn svg,
.icon-btn :deep(.tabler-icon) {
  width: 28px;
  height: 28px;
}
.flag-btn.flagged { color: var(--flag-color); }
.flag-btn.flagged :deep(.tabler-icon) { fill: currentColor; }
.flag-mark { width: 22px; text-align: center; font-size: 22px; }
.menu-status { margin: 8px 12px; color: var(--text-secondary); font-size: 0.9rem; }
.menu-status.danger { color: var(--grade-again-text); }
.icon-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--title) 8%, transparent); }
.icon-btn:disabled { opacity: 0.28; cursor: default; }
.icon-btn:focus-visible,
.hint:focus-visible,
.menu-item:focus-visible,
.menu-back:focus-visible {
  outline: 2px solid var(--blue-button);
  outline-offset: 2px;
}
.menu-root {
  position: fixed;
  inset: 0;
  z-index: 75;
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
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--title);
  font: inherit;
  font-size: 1.0625rem;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
}
.menu-item .label { min-width: 0; flex: 1 1 auto; }
.menu-item :deep(.tabler-icon) { color: var(--text); }
.menu-item :deep(.tabler-icon.on) { color: var(--blue-button); }
.menu-item .trailing {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.menu-item .chevron {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
}
.menu-item:hover:not(:disabled) { background: color-mix(in srgb, var(--text) 8%, transparent); }
.menu-item:disabled { opacity: 0.4; cursor: default; }
.menu-item.danger,
.menu-item.danger :deep(.tabler-icon) { color: #ff3b30; }
.menu-rule {
  height: 1px;
  margin: 5px 8px;
  background: color-mix(in srgb, var(--text) 12%, transparent);
}
@keyframes viewer-forward {
  from { transform: translateX(28px); opacity: 0.72; }
  to { transform: none; opacity: 1; }
}
@keyframes viewer-back {
  from { transform: translateX(-28px); opacity: 0.72; }
  to { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .paper.forward, .paper.back { animation: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .menu-panel {
    background: var(--card-bg);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>

<style>
html[data-theme='dark'] .viewer-root { background: #1E293C; }
html[data-theme='dark'] .viewer-root .paper { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }
</style>
