<template>
  <template v-if="showContent">
    <fieldset class="filter-section">
      <legend>{{ $t('deck.filters') }}</legend>
      <div class="filter-group">
        <label v-for="field in contentFields" :key="field.key" class="filter-row" :class="selected(modelValue[field.key])">
          <span>{{ $t(field.label) }}</span>
          <input class="filter-switch" type="checkbox" role="switch" :checked="Boolean(modelValue[field.key])" @change="update(field.key, $event.target.checked)">
        </label>
        <div class="filter-row filter-status-row" :class="selected(modelValue.status)">
          <span :id="`${id}-status`">{{ $t('deck.cardStatus') }}</span>
          <div class="filter-segments" role="radiogroup" :aria-labelledby="`${id}-status`">
            <label v-for="status in statuses" :key="status.value" class="filter-segment"><input type="radio" :name="`${id}-status`" :value="status.value" :checked="(modelValue.status || '') === status.value" @change="update('status', status.value || null)"><span>{{ $t(status.label) }}</span></label>
          </div>
        </div>
      </div>
    </fieldset>
    <fieldset class="filter-section">
      <legend>{{ $t('deck.lastAnswer') }}</legend>
      <div class="filter-group">
        <label v-for="answer in answers" :key="answer" class="filter-row" :class="selected(modelValue.lastAnswers?.includes(answer))">
          <span class="filter-row-label"><svg class="filter-face" viewBox="0 0 20 20" aria-hidden="true"><path :d="icons[answer]"/></svg>{{ $t(`study.${answer.toLowerCase()}`) }}</span>
          <input class="filter-switch" type="checkbox" role="switch" :checked="modelValue.lastAnswers?.includes(answer)" @change="toggleValue('lastAnswers', answer, $event.target.checked)">
        </label>
      </div>
    </fieldset>
  </template>
  <fieldset v-if="showFlags" class="filter-section">
    <legend>{{ $t('filterUI.flags') }}</legend>
    <div class="filter-group">
      <button v-if="requiresFlag" type="button" class="filter-row filter-reset" :class="selected(!modelValue.flagIDs?.length)" :aria-pressed="!modelValue.flagIDs?.length" @click="update('flagIDs', [])"><span>{{ $t('customStudy.anyFlag') }}</span><span v-if="!modelValue.flagIDs?.length" aria-hidden="true">✓</span></button>
      <label v-else class="filter-row" :class="selected(modelValue.anyFlag)"><span>{{ $t('deck.flaggedOnly') }}</span><input class="filter-switch" type="checkbox" role="switch" :checked="Boolean(modelValue.anyFlag)" @change="update('anyFlag', $event.target.checked)"></label>
      <label v-for="flag in flags" :key="flag.flag_id" class="filter-row" :class="selected(modelValue.flagIDs?.includes(flag.flag_id))">
        <span class="filter-row-label"><span v-if="flag.emoji" aria-hidden="true">{{ flag.emoji }}</span><StudyMenuIcon v-else name="flag" :style="{color: flagColor(flag.color)}" aria-hidden="true"/>{{ flag.labelKey ? $t(flag.labelKey) : flag.name }}</span>
        <input class="filter-switch" type="checkbox" role="switch" :checked="modelValue.flagIDs?.includes(flag.flag_id)" @change="toggleValue('flagIDs', flag.flag_id, $event.target.checked)">
      </label>
      <label v-if="allowMatchAll && modelValue.flagIDs?.length > 1" class="filter-row" :class="selected(modelValue.matchAllFlags)"><span>{{ $t('customStudy.matchAll') }}</span><input class="filter-switch" type="checkbox" role="switch" :checked="Boolean(modelValue.matchAllFlags)" @change="update('matchAllFlags', $event.target.checked)"></label>
    </div>
    <p v-if="flagsLoading" class="filter-note" role="status">{{ $t('common.loading') }}</p>
    <p v-if="flagsError" class="filter-note filter-error" role="alert">{{ $t('deck.flagsLoadError') }} <button type="button" class="filter-inline-action" @click="$emit('retry-flags')">{{ $t('customStudy.retry') }}</button></p>
    <p v-if="requiresFlag || modelValue.flagIDs?.length > 1" class="filter-note">{{ $t(modelValue.matchAllFlags ? 'customStudy.matchAll' : 'deck.flagsMatchAny') }}</p>
  </fieldset>
</template>

<script>
import { useId } from 'vue';
import { CARD_BROWSE_ANSWERS } from '../study/cardBrowse';
import { STUDY_GRADE_ICONS } from '../study/gradeIcons';
import { personalFlagColor } from '../study/personalFlags';
import { getTheme } from '../theme/theme';
import StudyMenuIcon from './StudyMenuIcon.vue';
import './cardFilterSheet.css';

export default {
  components: { StudyMenuIcon },
  props: {
    modelValue: { type: Object, required: true },
    flags: { type: Array, default: () => [] },
    showContent: { type: Boolean, default: true },
    showFlags: { type: Boolean, default: true },
    requiresFlag: Boolean,
    highlightsSelection: Boolean,
    allowMatchAll: Boolean,
    flagsLoading: Boolean,
    flagsError: Boolean,
  },
  emits: ['update:modelValue', 'retry-flags'],
  setup() { return { id: useId() }; },
  data: () => ({
    answers: CARD_BROWSE_ANSWERS,
    icons: STUDY_GRADE_ICONS,
    contentFields: [{ key: 'hasImage', label: 'deck.containsImage' }, { key: 'hasAudio', label: 'deck.containsAudio' }],
    statuses: [{ value: '', label: 'deck.statusAll' }, { value: 'new', label: 'deck.statusNew' }, { value: 'studied', label: 'deck.statusStudied' }],
  }),
  methods: {
    flagColor(color) { return personalFlagColor(color, getTheme() === 'dark'); },
    selected(value) { return { 'is-selected': this.highlightsSelection && Boolean(value) }; },
    update(key, value) { this.$emit('update:modelValue', { ...this.modelValue, [key]: value }); },
    toggleValue(key, value, enabled) { const values = this.modelValue[key] || []; this.update(key, enabled ? [...new Set([...values, value])] : values.filter(item => item !== value)); },
  },
};
</script>
