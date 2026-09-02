<template>
  <svg class="done-badge" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M7.6 12.4 10.6 15.3 16.4 8.8"
      fill="none"
      stroke="var(--badge-hole, #fff)"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script>
export default { name: 'DoneBadge' };
</script>

<style scoped>
.done-badge {
  width: 1em;
  height: 1em;
  flex: none;
}
</style>
