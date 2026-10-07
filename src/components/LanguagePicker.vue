<template>
  <div class="language-picker" @focusout="onFocusOut">
    <button
      v-if="compact"
      ref="trigger"
      type="button"
      class="language-trigger"
      aria-haspopup="menu"
      :aria-label="`${$t('home.language')}: ${currentLanguage.nativeName}`"
      :aria-expanded="open"
      @click="toggleMenu"
      @keydown.down.prevent="openMenu()"
      @keydown.up.prevent="openMenu(true)"
      @keydown.esc.prevent="closeMenu()"
    >
      <img class="language-flag" :src="currentLanguage.flag" alt="">
      <span :lang="currentLanguage.code">{{ currentLanguage.nativeName }}</span>
      <svg class="chevron" :class="{ open }" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M4.2 6.2 8 10l3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div
      v-if="!compact || open"
      ref="list"
      class="language-list"
      :class="{ 'language-menu': compact }"
      :role="compact ? 'menu' : 'radiogroup'"
      :aria-label="$t('profile.language')"
      @keydown="onMenuKeydown"
    >
      <button
        v-for="language in languages"
        :key="language.code"
        type="button"
        :role="compact ? 'menuitemradio' : 'radio'"
        class="language-row"
        :class="{ on: locale === language.code }"
        :aria-checked="locale === language.code"
        :tabindex="compact ? -1 : 0"
        @click="onSelect(language.code)"
      >
        <img class="language-flag" :src="language.flag" alt="">
        <span class="language-name" :lang="language.code">{{ language.nativeName }}</span>
        <svg v-if="locale === language.code" class="check" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { APP_LANGUAGES, setLanguagePreference } from '../i18n';

export default {
  name: 'LanguagePicker',
  props: {
    compact: { type: Boolean, default: false },
  },
  emits: ['change'],
  data() {
    return {
      languages: APP_LANGUAGES,
      open: false,
    };
  },
  computed: {
    locale() {
      return this.$i18n.locale;
    },
    currentLanguage() {
      return this.languages.find((language) => language.code === this.locale) || this.languages[0];
    },
  },
  mounted() {
    document.addEventListener('pointerdown', this.onPointerDown);
  },
  beforeUnmount() {
    document.removeEventListener('pointerdown', this.onPointerDown);
  },
  methods: {
    async openMenu(fromEnd = false) {
      this.open = true;
      await this.$nextTick();
      const rows = this.$refs.list?.querySelectorAll('.language-row');
      const index = fromEnd ? this.languages.length - 1 : this.languages.indexOf(this.currentLanguage);
      rows?.[index]?.focus();
    },
    toggleMenu() {
      if (this.open) this.closeMenu();
      else this.openMenu();
    },
    closeMenu(restoreFocus = false) {
      this.open = false;
      if (restoreFocus) this.$refs.trigger?.focus();
    },
    onPointerDown(event) {
      if (!this.$el.contains(event.target)) this.closeMenu();
    },
    onFocusOut(event) {
      if (!this.$el.contains(event.relatedTarget)) this.closeMenu();
    },
    onMenuKeydown(event) {
      if (!this.compact) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeMenu(true);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const rows = Array.from(this.$refs.list.querySelectorAll('.language-row'));
      const current = rows.indexOf(document.activeElement);
      let next = current;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = rows.length - 1;
      else next = (current + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      rows[next]?.focus();
    },
    onSelect(code) {
      setLanguagePreference(code);
      if (this.compact) this.closeMenu(true);
      this.$emit('change', this.$i18n.preference);
    },
  },
};
</script>

<style scoped>
.language-picker {
  position: relative;
  flex-shrink: 0;
}
.language-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #E2E8F0;
  background: #fff;
  color: #0F172A;
  border-radius: 999px;
  padding: 8px 12px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}
.language-trigger:hover {
  border-color: #94A3B8;
}
.language-trigger:focus-visible {
  outline: 2px solid #0A7AFF;
  outline-offset: 3px;
}
.language-flag {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 7px;
  object-fit: cover;
}
.language-trigger .language-flag {
  width: 22px;
  height: 22px;
  border-radius: 5px;
}
.chevron {
  width: 14px;
  height: 14px;
  color: #64748B;
}
.chevron.open { transform: rotate(180deg); }
.language-list {
  background: var(--inset-bg);
  border-radius: 18px;
  overflow: hidden;
}
.language-menu {
  --menu-background: rgba(255, 255, 255, 0.96);
  --menu-border: rgba(15, 23, 42, 0.1);
  --menu-text: #334155;
  --menu-selected: rgba(15, 23, 42, 0.05);
  --menu-hover: rgba(15, 23, 42, 0.09);
  --menu-shadow: rgba(15, 23, 42, 0.14);
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  width: 256px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 100px);
  overflow-y: auto;
  padding: 8px;
  border: 1px solid var(--menu-border);
  border-radius: 26px;
  background: var(--menu-background);
  backdrop-filter: blur(24px);
  box-shadow: 0 16px 48px var(--menu-shadow);
  color-scheme: light;
}
html[data-theme="dark"] .language-menu {
  --menu-background: rgba(20, 20, 22, 0.94);
  --menu-border: rgba(255, 255, 255, 0.12);
  --menu-text: #D4D4D8;
  --menu-selected: rgba(255, 255, 255, 0.07);
  --menu-hover: rgba(255, 255, 255, 0.12);
  --menu-shadow: rgba(0, 0, 0, 0.24);
  color-scheme: dark;
}
.language-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--separator);
  background: transparent;
  color: var(--title);
  text-align: left;
  padding: 14px 16px;
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
}
.language-row:last-child { border-bottom: 0; }
.language-row.on {
  background: var(--card-bg);
  font-weight: 650;
}
.language-name { flex: 1; }
.check {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--blue-button);
}
.language-menu .language-row {
  min-height: 58px;
  padding: 12px 16px;
  border: 0;
  border-radius: 20px;
  color: var(--menu-text);
  font-size: 1.1rem;
  font-weight: 600;
}
.language-menu .language-row.on {
  background: var(--menu-selected);
}
.language-menu .language-row:hover,
.language-menu .language-row:focus-visible {
  background: var(--menu-hover);
  outline: none;
}
.language-menu .check { color: var(--menu-text); }
</style>
