<template>
  <div class="generation-focus">
    <button type="button" class="focus-trigger" :aria-expanded="expanded" @click="expanded = !expanded"><span>{{ $t('generation.focus') }}</span><strong>{{ $t(modelValue.trim() ? 'generation.custom' : 'generation.default') }}</strong><span aria-hidden="true">{{ expanded ? '−' : '+' }}</span></button>
    <div v-if="expanded" class="focus-editor">
      <p>{{ $t('generation.instructionsHelp') }}</p>
      <span class="ideas-label">{{ $t('generation.ideas') }}</span>
      <div class="idea-list"><button v-for="key in ideas" :key="key" type="button" :aria-pressed="modelValue.includes($t(`generation.${key}`))" @click="toggle($t(`generation.${key}`))">{{ $t(`generation.${key}`) }}<span>{{ $t(modelValue.includes($t(`generation.${key}`)) ? 'generation.added' : 'generation.add') }}</span></button></div>
      <label>{{ $t('generation.instructions') }}<textarea :value="modelValue" rows="4" :placeholder="$t('generation.instructionsPlaceholder')" @input="$emit('update:modelValue', trim($event.target.value))"></textarea></label>
      <small>{{ count }} / 1000</small>
    </div>
  </div>
</template>
<script>
import { trimGenerationInstructions, toggleGenerationIdea } from '../study/sharedGeneration';
export default { props:{ modelValue:{type:String,default:''} },emits:['update:modelValue'],data:()=>({expanded:false,ideas:['ideaExceptions','ideaFormulas','ideaShort','ideaSimple','ideaReasoning']}),computed:{count(){return [...new Intl.Segmenter().segment(this.modelValue)].length;}},methods:{trim:trimGenerationInstructions,toggle(example){this.$emit('update:modelValue',toggleGenerationIdea(this.modelValue,example));}} };
</script>
<style scoped>
.generation-focus{border:1px solid var(--separator);border-radius:16px;overflow:hidden;background:var(--inset-bg);color:var(--title)}.focus-trigger{display:flex;width:100%;align-items:center;gap:12px;padding:16px;border:0;background:transparent;color:inherit;text-align:start;font:inherit}.focus-trigger>span:first-child{flex:1}.focus-trigger strong{font-size:.85rem;color:var(--blue-button)}.focus-editor{display:flex;flex-direction:column;gap:14px;padding:0 16px 18px}.focus-editor p,small{color:var(--text-secondary);font-size:.85rem;margin:0}.ideas-label{font-weight:600}.idea-list{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x proximity;padding-block:3px 10px}.idea-list button{display:flex;flex-direction:column;gap:18px;justify-content:space-between;min-width:220px;max-width:220px;scroll-snap-align:start;text-align:start;padding:16px;border:1px solid var(--separator);border-radius:14px;background:var(--card-bg);color:var(--title);font:inherit;font-size:.9rem}.idea-list button[aria-pressed=true]{border-color:var(--blue-button)}.idea-list button span{font-weight:600;color:var(--blue-button)}label{display:flex;flex-direction:column;gap:8px;font-size:.9rem}textarea{width:100%;padding:12px;border:1px solid var(--separator);border-radius:12px;background:var(--card-bg);color:var(--title);font:inherit}button:focus-visible,textarea:focus-visible{outline:2px solid var(--blue-button);outline-offset:2px}small{text-align:end}
</style>
