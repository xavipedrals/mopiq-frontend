<template>
  <div class="robot-loader">
    <div class="robot-disc">
      <video
        ref="video"
        src="/loading-quiz.mp4"
        autoplay
        loop
        muted
        playsinline
        preload="auto"
        aria-hidden="true"
      ></video>
    </div>
    <h2>{{ title }}</h2>
    <p v-if="subtitle">{{ subtitle }}</p>
  </div>
</template>

<script>
export default {
  name: 'RobotLoader',
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
  },
  mounted() {
    const video = this.$refs.video;
    if (!video) return;
    video.muted = true;
    // Safari rejects the promise when the tab is backgrounded; nothing to recover from.
    void video.play().catch(() => {});
  },
};
</script>

<style scoped>
.robot-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 20px 60px;
  text-align: center;
}
.robot-disc {
  width: 220px;
  height: 220px;
  max-width: 62vw;
  max-height: 62vw;
  border-radius: 50%;
  overflow: hidden;
  background: var(--inset-bg);
  margin-bottom: 32px;
}
.robot-disc video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.robot-loader h2 {
  margin: 0 0 12px;
  font-size: 1.5rem;
  font-weight: 750;
  color: var(--title);
}
.robot-loader p {
  margin: 0;
  max-width: 34ch;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
