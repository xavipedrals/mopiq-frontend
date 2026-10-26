<template>
  <Teleport to="body">
    <div
      v-if="open"
      v-dialog-focus
      class="enjoy-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enjoy-title"
      @keydown.esc.stop.prevent="$emit('done')"
    >
      <button type="button" class="backdrop" :aria-label="$t('common.close')" @click="$emit('done')"></button>
      <section class="sheet">
        <h2 id="enjoy-title">{{ $t('settings.enjoyTitle') }}</h2>
        <p>{{ $t('settings.enjoyBody') }}</p>
        <div class="choices">
          <button v-for="choice in choices" :key="choice.id" type="button" @click="$emit('done')">
            <span class="emoji" aria-hidden="true">{{ choice.emoji }}</span>
            <span>{{ $t(choice.label) }}</span>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { dialogFocus } from '../dialogFocus';

export default {
  name: 'EnjoyPrompt',
  directives: { dialogFocus },
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['done'],
  data() {
    return {
      choices: [
        { id: 'no', emoji: '😥', label: 'settings.enjoyNo' },
        { id: 'meh', emoji: '😕', label: 'settings.enjoyMeh' },
        { id: 'yes', emoji: '🙂', label: 'settings.enjoyYes' },
        { id: 'love', emoji: '😄', label: 'settings.enjoyLove' },
      ],
    };
  },
};
</script>

<style scoped>
.enjoy-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}
.sheet {
  position: relative;
  width: min(640px, 100%);
  padding: 32px 24px 28px;
  border-radius: 28px;
  background: var(--card-bg);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.28);
  text-align: center;
}
h2 {
  margin: 0;
  color: var(--title);
  font-size: 1.8rem;
  font-weight: 750;
}
p {
  margin: 10px 0 8px;
  color: var(--text-secondary);
  line-height: 1.45;
}
.choices {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}
.choices button {
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 16px;
  padding: 8px 4px 10px;
}
.choices button:hover,
.choices button:focus-visible {
  background: var(--list-selected);
  outline: none;
}
.emoji {
  display: block;
  font-size: 3rem;
  line-height: 1.2;
}
@media (max-width: 560px) {
  h2 { font-size: 1.4rem; }
  .emoji { font-size: 2.2rem; }
}
</style>
