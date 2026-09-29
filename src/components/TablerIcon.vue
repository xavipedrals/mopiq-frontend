<template>
  <svg
    class="tabler-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
</template>

<script>
// Tabler Icons v3.46.0 outline set (MIT). https://tabler.io/icons
const ICONS = {
  photo: [
    'M15 8h.01',
    'M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12',
    'M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5',
    'M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3',
  ],
  layersIntersect: [
    'M8 6a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -8',
    'M4 10a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -8',
  ],
  volume: [
    'M15 8a5 5 0 0 1 0 8',
    'M17.7 5a9 9 0 0 1 0 14',
    'M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5',
  ],
  heading: [
    'M7 12h10',
    'M7 5v14',
    'M17 5v14',
    'M15 19h4',
    'M15 5h4',
    'M5 19h4',
    'M5 5h4',
  ],
  bold: [
    'M7 5h6a3.5 3.5 0 0 1 0 7h-6l0 -7',
    'M13 12h1a3.5 3.5 0 0 1 0 7h-7v-7',
  ],
  italic: [
    'M11 5l6 0',
    'M7 19l6 0',
    'M14 5l-4 14',
  ],
  underline: [
    'M7 5v5a5 5 0 0 0 10 0v-5',
    'M5 19h14',
  ],
  strikethrough: [
    'M5 12l14 0',
    'M16 6.5a4 2 0 0 0 -4 -1.5h-1a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-1.5a4 2 0 0 1 -4 -1.5',
  ],
  brackets: [
    'M8 4h-3v16h3',
    'M16 4h3v16h-3',
  ],
  alignLeft: [
    'M4 6l16 0',
    'M4 12l10 0',
    'M4 18l14 0',
  ],
  alignCenter: [
    'M4 6l16 0',
    'M8 12l8 0',
    'M6 18l12 0',
  ],
  alignRight: [
    'M4 6l16 0',
    'M10 12l10 0',
    'M6 18l14 0',
  ],
  letterA: [
    'M7 20v-12a4 4 0 0 1 4 -4h2a4 4 0 0 1 4 4v12',
    'M7 13l10 0',
  ],
  highlight: [
    'M3 19h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4',
    'M12.5 5.5l4 4',
    'M4.5 13.5l4 4',
    'M21 15v4h-8l4 -4l4 0',
  ],
  list: [
    'M9 6l11 0',
    'M9 12l11 0',
    'M9 18l11 0',
    'M5 6l0 .01',
    'M5 12l0 .01',
    'M5 18l0 .01',
  ],
  listNumbers: [
    'M11 6h9',
    'M11 12h9',
    'M12 18h8',
    'M4 16a2 2 0 1 1 4 0c0 .591 -.5 1 -1 1.5l-3 2.5h4',
    'M6 10v-6l-2 2',
  ],
  link: [
    'M9 15l6 -6',
    'M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464',
    'M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463',
  ],
  superscript: [
    'M5 7l8 10m-8 0l8 -10',
    'M21 11h-4l3.5 -4a1.73 1.73 0 0 0 -3.5 -2',
  ],
  subscript: [
    'M5 7l8 10m-8 0l8 -10',
    'M21 20h-4l3.5 -4a1.73 1.73 0 0 0 -3.5 -2',
  ],
  undo: [
    'M9 14l-4 -4l4 -4',
    'M5 10h11a4 4 0 1 1 0 8h-1',
  ],
  redo: [
    'M15 14l4 -4l-4 -4',
    'M19 10h-11a4 4 0 1 0 0 8h1',
  ],
  chevronLeft: ['M15 6l-6 6l6 6'],
  chevronRight: ['M9 6l6 6l-6 6'],
  deviceDesktop: [
    'M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10',
    'M7 20h10',
    'M9 16v4',
    'M15 16v4',
  ],
  sun: [
    'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
    'M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7',
  ],
  moon: [
    'M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008',
  ],
  copy: [
    'M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z',
    'M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1',
  ],
  calendar: [
    'M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12',
    'M16 3v4',
    'M8 3v4',
    'M4 11h16',
    'M11 15h1',
    'M12 15v3',
  ],
  clock: [
    'M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0',
    'M12 7v5l3 3',
  ],
  star: [
    'M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245',
  ],
  keyboardOff: [
    'M18 18h-14a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2h2m4 0h10a2 2 0 0 1 2 2v8c0 .554 -.226 1.056 -.59 1.418',
    'M6 10l0 .01',
    'M10 10l0 .01',
    'M14 10l0 .01',
    'M18 10l0 .01',
    'M6 14l0 .01',
    'M18 14l0 .01',
    'M10 14l4 0',
    'M3 3l18 18',
  ],
  sparkles: [
    'M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6',
  ],
};

export default {
  name: 'TablerIcon',
  props: {
    name: { type: String, required: true },
  },
  computed: {
    paths() {
      return ICONS[this.name] || [];
    },
  },
};
</script>

<style scoped>
.tabler-icon {
  width: 22px;
  height: 22px;
  display: block;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
