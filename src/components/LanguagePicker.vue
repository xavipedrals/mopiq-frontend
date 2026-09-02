<template>
  <div class="language-picker">
    <div v-if="compact" class="language-select-wrap">
      <label class="sr-only" for="language-select">{{ $t('home.language') }}</label>
      <select
        id="language-select"
        class="language-select"
        :value="preference || 'system'"
        @change="onSelect($event.target.value)"
      >
        <option value="system">{{ $t('profile.system') }}</option>
        <option v-for="language in languages" :key="language.code" :value="language.code">
          {{ language.nativeName }}
        </option>
      </select>
      <svg class="chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M4.2 6.2 8 10l3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <div v-else class="language-list" role="radiogroup" :aria-label="$t('profile.language')">
      <button
        type="button"
        role="radio"
        class="language-row"
        :class="{ on: !preference }"
        :aria-checked="!preference"
        @click="onSelect('system')"
      >
        <span>{{ $t('profile.system') }}</span>
        <span v-if="!preference" class="check" aria-hidden="true">✓</span>
      </button>
      <button
        v-for="language in languages"
        :key="language.code"
        type="button"
        role="radio"
        class="language-row"
        :class="{ on: preference === language.code }"
        :aria-checked="preference === language.code"
        @click="onSelect(language.code)"
      >
        <span>{{ language.nativeName }}</span>
        <span v-if="preference === language.code" class="check" aria-hidden="true">✓</span>
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
    };
  },
  computed: {
    preference() {
      return this.$i18n.preference;
    },
  },
  methods: {
    onSelect(value) {
      const code = value === 'system' ? null : value;
      setLanguagePreference(code);
      this.$emit('change', this.preference);
    },
  },
};
</script>

<style scoped>
.language-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.language-select {
  appearance: none;
  border: 1px solid #E2E8F0;
  background: #fff;
  color: #0F172A;
  border-radius: 999px;
  padding: 8px 34px 8px 14px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.chevron {
  position: absolute;
  right: 12px;
  width: 14px;
  height: 14px;
  color: #64748B;
  pointer-events: none;
}
.language-list {
  background: var(--inset-bg);
  border-radius: 18px;
  overflow: hidden;
}
.language-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--title);
  text-align: left;
  padding: 14px 16px;
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--separator);
}
.language-row:last-child { border-bottom: 0; }
.language-row.on {
  background: var(--card-bg);
  font-weight: 650;
}
.check { color: var(--blue-button); font-weight: 700; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
