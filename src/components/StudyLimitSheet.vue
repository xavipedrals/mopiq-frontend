<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="limit-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-limit-title"
    >
      <button type="button" class="limit-backdrop" :aria-label="actionText" @click="$emit('dismiss')"></button>
      <section class="limit-sheet">
        <img v-if="art" class="limit-art" :src="art" alt="" aria-hidden="true">
        <h2 id="study-limit-title">{{ $t('limit.title') }}</h2>
        <p>
          {{ $t('limit.body', { limit }) }}
        </p>
        <p class="limit-note">
          {{ $t('limit.note') }}
        </p>
        <button type="button" class="mopiq-btn" @click="$emit('dismiss')">{{ actionText }}</button>
        <a class="limit-store" :href="storeUrl" target="_blank" rel="noopener">{{ $t('common.getMopiqStore') }}</a>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { APP_STORE_URL } from '../constants';
import { FREE_CARD_DAILY_LIMIT } from '../study/freeStudyQuota';

export default {
  name: 'StudyLimitSheet',
  props: {
    open: { type: Boolean, default: false },
    limit: { type: Number, default: FREE_CARD_DAILY_LIMIT },
    actionKey: { type: String, default: 'common.ok' },
    art: { type: String, default: '' },
  },
  emits: ['dismiss'],
  data() {
    return { storeUrl: APP_STORE_URL };
  },
  computed: {
    actionText() {
      return this.$t(this.actionKey);
    },
  },
};
</script>

<style scoped>
.limit-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.limit-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgba(15, 23, 42, 0.5);
  cursor: pointer;
}
.limit-sheet {
  position: relative;
  width: min(420px, 100%);
  padding: 28px 24px 24px;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: center;
}
.limit-art {
  display: block;
  width: 168px;
  height: 168px;
  max-width: 52vw;
  max-height: 52vw;
  margin: 0 auto 20px;
  border-radius: 50%;
  object-fit: cover;
}
.limit-sheet h2 {
  margin: 0 0 12px;
  font-size: 1.55rem;
  font-weight: 750;
  color: var(--title);
}
.limit-sheet p {
  margin: 0 0 12px;
  color: var(--text);
  font-size: 1.02rem;
  line-height: 1.45;
}
.limit-note {
  color: var(--text-secondary) !important;
  font-size: 0.92rem !important;
  margin-bottom: 22px !important;
}
.mopiq-btn {
  width: 100%;
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
  border-radius: 50px !important;
  font-weight: 600 !important;
  padding: 12px 28px !important;
}
.limit-store {
  display: inline-block;
  margin-top: 14px;
  color: var(--blue-button);
  font-weight: 600;
  text-decoration: none;
}
</style>
