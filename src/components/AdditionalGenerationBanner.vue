<template>
  <div v-if="countdown" class="ai-banner confirmation" role="status" data-testid="add-cards-ai-banner">
    <div class="countdown" aria-hidden="true"></div>
    <span class="icon" aria-hidden="true"><TablerIcon name="sparkles" /></span>
    <div>
      <strong>{{ $t('editor.aiAddingTitle') }}</strong>
      <p>{{ $t('editor.aiAddingBody') }}</p>
    </div>
  </div>
  <div v-else class="ai-banner progress" role="status" data-testid="deck-ai-generation-banner">
    <span v-if="!error" class="spinner" aria-hidden="true"></span>
    <span class="status-text">{{ error || $t('editor.aiGeneratingMore') }}</span>
    <span v-if="!error && progress > 0">({{ Math.min(100, Math.floor(progress)) }}%)</span>
  </div>
</template>

<script>
import TablerIcon from './TablerIcon.vue';

export default {
  components: { TablerIcon },
  props: {
    countdown: Boolean,
    progress: { type: Number, default: 0 },
    error: { type: String, default: '' },
  },
};
</script>

<style scoped>
.ai-banner {
  display: flex;
  gap: 12px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.4;
}
.confirmation {
  position: relative;
  align-items: flex-start;
  overflow: hidden;
  margin: 8px 16px;
  padding-top: 19px;
  border-radius: 16px;
  background: #e0e7ff;
  color: var(--title);
  --accent: #4f46e5;
}
.confirmation strong { font-size: 16px; font-weight: 600; }
.confirmation p { margin: 4px 0 0; color: #475569; }
.icon {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--accent);
}
.icon :deep(svg) { width: 20px; height: 20px; }
.countdown {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--accent);
  transform-origin: left;
  animation: countdown 6s linear both;
}
.progress {
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  border: 1px solid #fbbf24;
  border-radius: 20px;
  background: #fef3c7;
  color: #92400e;
  --spinner: #d97706;
}
.status-text { flex: 1; }
.spinner {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border: 2px solid currentColor;
  border-inline-end-color: transparent;
  border-radius: 50%;
  color: var(--spinner);
  animation: spin 0.8s linear infinite;
}
:global(html[data-theme="dark"]) .confirmation { background: #1e1b4b; --accent: #818cf8; }
:global(html[data-theme="dark"]) .confirmation p { color: #f1f5f9; }
:global(html[data-theme="dark"]) .progress {
  background: #451a03;
  border-color: #d97706;
  color: #fde68a;
  --spinner: #fbbf24;
}
@keyframes countdown { to { transform: scaleX(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .countdown, .spinner { animation: none; }
}
</style>
