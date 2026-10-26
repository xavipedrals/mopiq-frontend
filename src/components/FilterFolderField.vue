<template>
  <fieldset class="filter-section">
    <legend>{{ $t('deck.searchIn') }}</legend>
    <div class="filter-group">
      <button ref="trigger" type="button" class="filter-row folder-trigger" :disabled="disabled" @click="showPicker">
        <span>{{ selectedTitle }}</span><StudyMenuIcon name="chevronRight" aria-hidden="true"/>
      </button>
      <slot/>
    </div>
  </fieldset>
  <Teleport to="body">
    <div v-if="pickerOpen" v-dialog-focus class="filter-dialog folder-picker-dialog" role="dialog" aria-modal="true" :aria-labelledby="`${id}-title`" @keydown.esc.stop.prevent="pickerOpen = false">
      <button type="button" class="filter-backdrop" :aria-label="$t('common.close')" @click="pickerOpen = false"></button>
      <section class="filter-sheet">
        <header class="filter-nav"><button type="button" class="filter-nav-action" @click="pickerOpen = false">{{ $t('common.cancel') }}</button><h2 :id="`${id}-title`">{{ $t('filterUI.selectFolder') }}</h2><button type="button" class="filter-nav-action" @click="pendingID = ''">{{ $t('common.clear') }}</button></header>
        <div class="filter-scroll">
          <div class="filter-group" role="group" :aria-label="$t('deck.searchIn')">
            <div v-for="folder in visibleFolders" :key="folder.id" class="folder-choice" :class="{ chosen: String(folder.id) === String(pendingID) }" :style="{ '--folder-depth': folder.depth }">
              <button v-if="hasChildren(folder)" type="button" class="folder-expand" :aria-expanded="!collapsed.includes(folder.id)" :aria-label="folder.fullPath" @click="toggleFolder(folder.id)"><StudyMenuIcon name="chevronRight" :class="{ expanded: !collapsed.includes(folder.id) }"/></button>
              <span v-else class="folder-spacer"></span>
              <button type="button" class="folder-choice-button" :aria-pressed="String(folder.id) === String(pendingID)" @click="pendingID = folder.id"><StudyMenuIcon name="folder" aria-hidden="true"/><span>{{ folder.title }}</span><span v-if="String(folder.id) === String(pendingID)" class="folder-check" aria-hidden="true">✓</span></button>
            </div>
          </div>
        </div>
        <footer class="filter-footer"><button type="button" class="filter-start" @click="save">{{ $t('common.save') }}</button></footer>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { useId } from 'vue';
import { dialogFocus } from '../dialogFocus';
import StudyMenuIcon from './StudyMenuIcon.vue';
import './cardFilterSheet.css';

export default {
  components: { StudyMenuIcon }, directives: { dialogFocus },
  props: { folders: { type: Array, default: () => [] }, modelValue: { type: [String, Number], default: '' }, deckName: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  setup() { return { id: useId() }; },
  data: () => ({ pickerOpen: false, pendingID: '', collapsed: [] }),
  computed: {
    choices() { return [{ id: '', title: this.deckName, fullPath: this.folders.find(folder => folder.depth === 0)?.fullPath || this.deckName, depth: 0 }, ...this.folders.filter(folder => folder.depth > 0)]; },
    normalizedID() { return this.folders.find(folder => String(folder.id) === String(this.modelValue))?.depth === 0 ? '' : this.modelValue ?? ''; },
    selectedTitle() { return this.folders.find(folder => String(folder.id) === String(this.normalizedID))?.title || this.deckName; },
    visibleFolders() { return this.choices.filter(folder => !this.choices.some(parent => this.collapsed.includes(parent.id) && folder.fullPath.startsWith(`${parent.fullPath}::`))); },
  },
  methods: {
    showPicker() { this.pendingID = this.normalizedID; this.collapsed = []; this.pickerOpen = true; },
    hasChildren(folder) { return this.choices.some(child => child.fullPath.startsWith(`${folder.fullPath}::`)); },
    toggleFolder(id) { this.collapsed = this.collapsed.includes(id) ? this.collapsed.filter(value => value !== id) : [...this.collapsed, id]; },
    save() { this.$emit('update:modelValue', this.pendingID); this.pickerOpen = false; },
  },
};
</script>

<style scoped>
.folder-trigger { width:100%; border:0; background:transparent; text-align:start; cursor:pointer; }
.folder-trigger>span { min-width:0; overflow-wrap:anywhere; }
.folder-trigger>svg { width:16px; height:16px; color:var(--filter-muted); }
.folder-picker-dialog { z-index:95; }
.folder-choice { display:flex; align-items:center; gap:0; min-height:52px; padding-inline-start:calc(6px + var(--folder-depth)*16px); }
.folder-choice.chosen { background:color-mix(in srgb,var(--blue-button) 12%,var(--filter-surface)); }
.folder-expand { display:grid; place-items:center; flex-shrink:0; width:36px; height:44px; padding:0; border:0; background:transparent; color:var(--filter-muted); }
.folder-expand svg { width:16px; height:16px; }
.folder-expand svg.expanded { transform:rotate(90deg); }
.folder-spacer { width:36px; flex-shrink:0; }
.folder-choice-button { display:flex; align-items:center; gap:10px; flex:1; min-width:0; min-height:52px; padding:10px 16px 10px 0; border:0; background:transparent; color:var(--title); text-align:start; font:inherit; overflow-wrap:anywhere; }
.folder-choice-button>svg { width:20px; height:20px; color:var(--blue-button); }
.folder-check { margin-inline-start:auto; color:var(--blue-button); }
</style>
