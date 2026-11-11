<template>
  <section class="preparation" aria-labelledby="add-deck-import-title" aria-busy="true">
    <div class="preparation-art" aria-hidden="true">
      <span class="paper paper-back"></span>
      <span class="paper paper-front"><svg viewBox="0 0 24 24"><path d="M7 8h10M7 12h7M7 16h5" /></svg></span>
      <span class="preparation-spinner"></span>
    </div>
    <div class="preparation-copy">
      <h2 id="add-deck-import-title">{{ $t(starting ? 'decks.pptStarting' : titleKey) }}</h2>
      <p>{{ $t(`decks.${prefix}${starting ? 'StartingBody' : 'PreparingBody'}`) }}</p>
    </div>
    <div class="preparation-file">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4M5 21h12a2 2 0 0 0 2-2V7l-4-4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" /></svg>
      <span>{{ fileName }}</span>
    </div>
    <div class="preparation-progress">
      <div
        class="progress-track"
        :class="{ indeterminate: !total || starting }"
        role="progressbar"
        :aria-label="$t(titleKey)"
        :aria-valuemin="total && !starting ? 0 : undefined"
        :aria-valuemax="total && !starting ? total : undefined"
        :aria-valuenow="total && !starting ? current : undefined"
      ><span :style="{ width: total && !starting ? `${percent}%` : undefined }"></span></div>
      <p class="progress-label" role="status">{{ total && !starting ? $t(source === 'word' ? 'decks.wordReading' : 'decks.pptReadingSlides', { current, total, progress: Math.floor(percent) }) : $t(starting ? 'decks.pptStarting' : `decks.${prefix}Opening`) }}</p>
    </div>
    <p class="preparation-hint">{{ $t(`decks.${prefix}KeepOpen`) }}</p>
  </section>
</template>

<script>
export default {
  name: 'ImportPreparation',
  props: {
    source: { type: String, default: 'powerpoint' },
    fileName: { type: String, default: '' },
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    starting: { type: Boolean, default: false },
  },
  computed: {
    prefix() { return this.source === 'word' ? 'word' : 'ppt'; },
    titleKey() { return `decks.${this.prefix}PreparingTitle`; },
    percent() { return this.total ? Math.min(100, Math.max(0, this.current / this.total * 100)) : 0; },
  },
};
</script>

<style scoped>
.preparation { min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 28px 12px 36px; text-align: center; }
.preparation-art { width: 112px; height: 104px; position: relative; margin: 0 0 4px; }
.paper { position: absolute; width: 60px; height: 78px; border-radius: 13px; border: 1.5px solid color-mix(in srgb, var(--blue-button) 25%, transparent); }
.paper-back { top: 6px; left: 16px; transform: rotate(-13deg); background: color-mix(in srgb, var(--blue-button) 8%, var(--card-bg)); }
.paper-front { top: 14px; left: 35px; transform: rotate(8deg); background: var(--card-bg); box-shadow: 0 6px 18px color-mix(in srgb, var(--title) 6%, transparent); }
.paper-front svg { width: 42px; height: 42px; margin-top: 15px; fill: none; stroke: var(--blue-button); stroke-width: 1.6; stroke-linecap: round; }
.preparation-spinner { position: absolute; right: 3px; bottom: 0; width: 28px; height: 28px; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--blue-button) 20%, var(--card-bg)); border-top-color: var(--blue-button); background: var(--card-bg); animation: preparation-spin .9s linear infinite; }
.preparation-copy { display: grid; gap: 10px; max-width: 360px; }
.preparation h2 { margin: 0; color: var(--title); font-size: 1.5rem; font-weight: 700; line-height: 1.25; }
.preparation-copy p { margin: 0; color: var(--text); font-size: .95rem; line-height: 1.55; }
.preparation-file { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; border-radius: 12px; background: var(--inset-bg); padding: 10px 14px; color: var(--text); font-size: .85rem; }
.preparation-file svg { width: 18px; height: 18px; flex: 0 0 auto; fill: none; stroke: var(--text-secondary); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.preparation-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preparation-progress { width: 100%; max-width: 320px; display: grid; gap: 10px; }
.progress-track { height: 6px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--blue-button) 14%, var(--inset-bg)); }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--blue-button); transition: width .2s ease; }
.progress-track.indeterminate span { width: 35%; animation: preparation-progress 1.5s ease-in-out infinite; }
.progress-label { margin: 0; min-height: 20px; color: var(--text); font-size: .85rem; font-variant-numeric: tabular-nums; }
.preparation-hint { max-width: 300px; margin: 0; color: var(--text); font-size: .8rem; line-height: 1.5; }
@keyframes preparation-spin { to { transform: rotate(360deg); } }
@keyframes preparation-progress { from { transform: translateX(-110%); } to { transform: translateX(390%); } }
@media (prefers-reduced-motion: reduce) {
  .preparation-spinner, .progress-track.indeterminate span { animation: none; }
  .progress-track span { transition: none; }
  .progress-track.indeterminate span { width: 100%; opacity: .5; }
}
</style>
