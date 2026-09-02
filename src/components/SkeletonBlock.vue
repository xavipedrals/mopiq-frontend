<template>
  <span class="skeleton" :style="style" aria-hidden="true"></span>
</template>

<script>
export default {
  name: 'SkeletonBlock',
  props: {
    w: { type: String, default: '100%' },
    h: { type: String, default: '1rem' },
    radius: { type: String, default: '8px' },
  },
  computed: {
    style() {
      return { width: this.w, height: this.h, borderRadius: this.radius };
    },
  },
};
</script>

<style scoped>
.skeleton {
  display: block;
  flex: 0 0 auto;
  background: var(--skeleton-bg);
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    var(--skeleton-shine) 50%,
    transparent 100%
  );
  background-repeat: no-repeat;
  background-size: 220px 100%;
  animation: skeleton-sweep 1.3s ease-in-out infinite;
}
@keyframes skeleton-sweep {
  from { background-position: -220px 0; }
  to { background-position: calc(100% + 220px) 0; }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background-image: none; }
}
</style>
