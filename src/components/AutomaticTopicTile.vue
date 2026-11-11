<template>
  <span class="topic-tile" :class="{ automatic: !topic, working }" :style="tileStyle" aria-hidden="true">
    <span v-if="topic" class="topic-tile-glyph"></span>
    <TablerIcon v-else name="sparkles" />
  </span>
</template>
<script>
import TablerIcon from './TablerIcon.vue';
import { sidebarTablerIconUrl } from '../utils';
export default {
  name:'AutomaticTopicTile',components:{TablerIcon},
  props:{topic:{type:Object,default:null},working:{type:Boolean,default:false}},
  computed:{
    tileStyle(){return this.topic ? {background:this.topic.backgroundColor,color:this.topic.color,'--tabler-src':`url("${sidebarTablerIconUrl(this.topic.imageName)}")`} : {};},
  },
};
</script>
<style scoped>
.topic-tile { width:44px; height:44px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; border:.5px solid rgb(0 0 0 / 8%); box-shadow:0 6px 9px rgb(0 0 0 / 8%); }
.topic-tile.automatic { color:#7c3aed; background:linear-gradient(135deg,#bae6fd,#e9d5ff,#fde68a,#99f6e4,#fbcfe8,#bae6fd); background-size:400% 400%; animation:topic-gradient 6s ease-in-out infinite alternate; }
.topic-tile svg { width:22px; height:22px; }
.topic-tile.working svg { animation:topic-sparkle 1.4s ease-in-out infinite; }
.topic-tile-glyph { width:25px;height:25px;background:currentColor;mask:var(--tabler-src) center/contain no-repeat;-webkit-mask:var(--tabler-src) center/contain no-repeat; }
@keyframes topic-gradient { from {background-position:0 0;} to {background-position:100% 100%;} }
@keyframes topic-sparkle { 50% {transform:scale(1.1) rotate(8deg);} }
@media(prefers-reduced-motion:reduce){.topic-tile.automatic,.topic-tile.working svg{animation:none;}}
</style>
