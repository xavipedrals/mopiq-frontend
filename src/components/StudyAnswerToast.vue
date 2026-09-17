<template>
  <div v-if="grade" class="feedback" :class="[grade.className, position]">
    <svg v-if="grade.icon === 'x'" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17"/>
    </svg>
    <svg v-else-if="grade.icon === 'down'" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 10v10M8 20h7.2a2 2 0 0 0 1.9-1.4l1.7-5.2A1.8 1.8 0 0 0 17.1 11H13l.8-4.2A1.8 1.8 0 0 0 12 4.6L8 10"/>
      <path d="M8 10H5.8A1.8 1.8 0 0 0 4 11.8v6.4A1.8 1.8 0 0 0 5.8 20H8"/>
    </svg>
    <svg v-else-if="grade.icon === 'up'" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 14V4M8 4h7.2A2 2 0 0 1 17.1 5.4l1.7 5.2A1.8 1.8 0 0 1 17.1 13H13l.8 4.2A1.8 1.8 0 0 1 12 19.4L8 14"/>
      <path d="M8 14H5.8A1.8 1.8 0 0 1 4 12.2V5.8A1.8 1.8 0 0 1 5.8 4H8"/>
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.5 12.5 3.5 3.5 7.5-8"/>
    </svg>
  </div>
</template>

<script>
import { answerFeedbackGrade } from '../study/answerFeedback';

export default {
  name: 'StudyAnswerToast',
  props: {
    ease: { type: String, default: '' },
    position: { type: String, default: 'top' },
  },
  computed: {
    grade() {
      return answerFeedbackGrade(this.ease);
    },
  },
};
</script>

<style scoped>
.feedback {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  pointer-events: none;
  animation: feedback-in 0.1s linear;
}
.feedback.top { top: 8px; }
.feedback.bottom { bottom: 8px; }
.feedback.again { left: 8px; background: #ef4444; }
.feedback.hard { left: 8px; background: #f59e0b; }
.feedback.good { right: 8px; background: #84cc16; }
.feedback.easy { right: 8px; background: #0ea5e9; }
.feedback svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: #fff;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
@keyframes feedback-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
