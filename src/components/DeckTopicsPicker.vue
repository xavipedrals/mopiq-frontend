<template>
  <div
    class="topic-list"
    role="listbox"
    :aria-labelledby="labelledBy || undefined"
    :aria-label="labelledBy ? undefined : $t('settings.topic')"
  >
    <button v-if="allowAutomatic" type="button" role="option" class="topic-row automatic-row" :class="{ on: modelValue === automaticKey }" :aria-selected="modelValue === automaticKey" :disabled="disabled" @click="$emit('update:modelValue', automaticKey)">
      <AutomaticTopicTile :topic="suggestedTopic" :working="suggestion.phase === 'reading'" />
      <span class="automatic-copy"><strong>{{ suggestedTopic ? $t('decks.topicAiThinks', { topic: $topic(suggestedTopic) }) : $t('decks.topicLetAiChoose') }}</strong><small>{{ $t(suggestion.phase === 'reading' ? 'decks.topicReading' : suggestedTopic ? 'decks.topicAiThinksHelp' : 'decks.topicAiChoiceHelp') }}</small></span>
      <span class="topic-check" :class="{ checked: modelValue === automaticKey }" aria-hidden="true"><TablerIcon v-if="modelValue === automaticKey" name="check" /></span>
    </button>
    <button
      v-for="topic in topics"
      :key="topic.imageName"
      type="button"
      role="option"
      class="topic-row"
      :class="{ on: selectedKey === topic.imageName }"
      :aria-selected="selectedKey === topic.imageName"
      :disabled="disabled || (isAdditional(topic.imageName) && !personalTopicsAvailable)"
      @click="$emit('update:modelValue', topic.imageName)"
    >
      <span
        class="topic-dot"
        :style="dotStyle(topic)"
      >
        <span class="topic-glyph" aria-hidden="true" />
      </span>
      <span class="topic-name">{{ $topic(topic) }}</span>
      <span class="topic-check" :class="{ checked: selectedKey === topic.imageName }" aria-hidden="true"><TablerIcon v-if="selectedKey === topic.imageName" name="check" /></span>
    </button>
  </div>
</template>

<script>
import { getPickerDeckTopics, getDisplayDeckTopic, isPersonalDeckTopic, sidebarTablerIconUrl } from '../utils';
import AutomaticTopicTile from './AutomaticTopicTile.vue';
import TablerIcon from './TablerIcon.vue';
import { AUTOMATIC_TOPIC } from '../study/deckTopicSuggestion';
import { supportsPersonalDeckTopics } from '../api/personalDeckTopics';

export default {
  name: 'DeckTopicsPicker',
  components: { AutomaticTopicTile, TablerIcon },
  props: {
    allowAutomatic: { type: Boolean, default: false },
    suggestion: { type: Object, default: () => ({ phase: 'idle' }) },
    modelValue: { type: String, default: 'other' },
    disabled: { type: Boolean, default: false },
    labelledBy: { type: String, default: '' },
    autoFocus: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      personalTopicsAvailable: false,
      automaticKey: AUTOMATIC_TOPIC,
    };
  },
  computed: {
    topics() {
      const topics = getPickerDeckTopics({ includePersonal: this.personalTopicsAvailable });
      const selected = this.modelValue === AUTOMATIC_TOPIC ? null : getDisplayDeckTopic(this.modelValue);
      if (selected && !topics.some(topic => topic.imageName === selected.imageName)) topics.push(selected);
      return topics;
    },
    selectedKey() { return this.modelValue === AUTOMATIC_TOPIC ? AUTOMATIC_TOPIC : getDisplayDeckTopic(this.modelValue).imageName; },
    suggestedTopic() { return this.suggestion.phase === 'suggested' ? getDisplayDeckTopic(this.suggestion.topicKey) : null; },
  },
  async mounted() {
    try { this.personalTopicsAvailable = await supportsPersonalDeckTopics(); } catch { /* Existing choices still render. */ }
    await this.$nextTick();
    if (!this.autoFocus) return;
    this.$el.querySelector('.topic-row.on')?.focus({ preventScroll: true });
  },
  methods: {
    isAdditional: isPersonalDeckTopic,
    dotStyle(topic) {
      return {
        background: topic.backgroundColor,
        color: topic.color,
        '--topic-tint': topic.color,
        '--tabler-src': `url("${sidebarTablerIconUrl(topic.imageName)}")`,
      };
    },
  },
};
</script>

<style scoped>
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}
.topic-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  padding: 8px 12px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 1rem;
  text-align: left;
  cursor: pointer;
}
.topic-row:disabled {
  opacity: 0.45;
  cursor: default;
}
.topic-row.on {
  background: var(--topic-selected-bg);
  color: var(--topic-selected-text);
  font-weight: 700;
}
.topic-row:focus-visible {
  outline: 2px solid var(--blue-button);
  outline-offset: 2px;
}
.topic-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.topic-row.on .topic-dot {
  box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 35%, transparent);
}
html[data-theme="dark"] .topic-row.on .topic-dot {
  box-shadow: none;
}
.topic-glyph {
  width: 25px;
  height: 25px;
  display: block;
  background-color: var(--topic-tint, currentColor);
  -webkit-mask-image: var(--tabler-src);
  mask-image: var(--tabler-src);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}
.topic-name, .automatic-copy { flex: 1; min-width: 0; }
.automatic-row { min-height: 80px; border: 1px solid var(--card-border); margin-bottom: 8px; }
.automatic-row.on { border-color: #6366f1; background: color-mix(in srgb, #6366f1 10%, var(--card-bg)); color: var(--title); }
.automatic-row :deep(.topic-tile) { width: 40px; height: 40px; }
.automatic-copy { display: flex; flex-direction: column; gap: 4px; }
.automatic-copy strong { font-weight: 600; }
.automatic-copy small { font-weight: 400; font-size: 13px; line-height: 1.4; color: var(--text); }
.topic-check { width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; border: 1.5px solid var(--card-border); display: grid; place-items: center; }
.topic-check.checked { color: white; background: #6366f1; border-color: #6366f1; }
.topic-check svg { width: 15px; height: 15px; }
</style>
