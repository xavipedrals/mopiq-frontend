<template>
  <svg class="face" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" stroke-width="1.7" />
    <circle cx="8.9" cy="9.9" r="1.35" fill="currentColor" />
    <circle cx="15.1" cy="9.9" r="1.35" fill="currentColor" />
    <path
      :d="mouth"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
    />
  </svg>
</template>

<script>
const SMILE = 'M7.9 14.2c1.05 1.5 2.4 2.25 4.1 2.25s3.05-.75 4.1-2.25';
const FROWN = 'M16.1 16.6c-1.05-1.5-2.4-2.25-4.1-2.25s-3.05.75-4.1 2.25';

export default {
  name: 'FaceIcon',
  props: {
    happy: { type: Boolean, default: false },
  },
  computed: {
    mouth() {
      return this.happy ? SMILE : FROWN;
    },
  },
};
</script>

<style scoped>
.face {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
}
</style>
