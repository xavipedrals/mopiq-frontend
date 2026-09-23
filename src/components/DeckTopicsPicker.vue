<template>
  <div
    class="topic-list"
    role="listbox"
    :aria-labelledby="labelledBy || undefined"
    :aria-label="labelledBy ? undefined : $t('settings.topic')"
  >
    <button
      v-for="topic in topics"
      :key="topic.imageName"
      type="button"
      role="option"
      class="topic-row"
      :class="{ on: modelValue === topic.imageName }"
      :aria-selected="modelValue === topic.imageName"
      :disabled="disabled"
      @click="$emit('update:modelValue', topic.imageName)"
    >
      <span
        class="topic-dot"
        :style="dotStyle(topic)"
      >
        <span class="topic-glyph" aria-hidden="true" />
      </span>
      <span>{{ $topic(topic) }}</span>
    </button>
  </div>
</template>

<script>
import { getPickerDeckTopics, sidebarTablerIconUrl } from '../utils';

export default {
  name: 'DeckTopicsPicker',
  props: {
    modelValue: { type: String, default: 'other' },
    disabled: { type: Boolean, default: false },
    labelledBy: { type: String, default: '' },
    autoFocus: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      topics: getPickerDeckTopics(),
    };
  },
  mounted() {
    if (!this.autoFocus) return;
    this.$el.querySelector('.topic-row.on')?.focus({ preventScroll: true });
  },
  methods: {
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
  border-radius: 12px;
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
</style>
