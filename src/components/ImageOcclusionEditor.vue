<template>
  <div
    class="io-root"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'occlusion-title'"
    @keydown.esc.stop="onEscape"
  >
    <header class="nav" :style="{ '--nav-side-width': headerSideWidth + 'px' }">
      <button ref="cancelButton" type="button" class="nav-text nav-cancel glass-action glass-action--icon" :aria-label="$t('common.close')" :disabled="saving" @click="closeEditor">
        <TablerIcon name="x" />
      </button>
      <h2 id="occlusion-title">{{ $t('editor.occlusion') }}</h2>
      <div class="nav-trailing">
        <button
          ref="modeSelector"
          type="button"
          class="mode-selector"
          aria-haspopup="dialog"
          :aria-expanded="modeOpen"
          :disabled="saving || detecting"
          @click="openModeSelector"
        >
          <TablerIcon name="layersIntersect" class="mode-selector-icon" />
          <span>{{ $t(mode === 'hideAll' ? 'editor.occlusionHideAll' : 'editor.occlusionHideOne') }}</span>
          <TablerIcon name="chevronRight" class="mode-selector-chevron" />
        </button>
        <button ref="saveButton" type="button" class="nav-text save glass-action glass-action--accent" :disabled="saving || detecting" @click="requestSave">
          {{ saving ? $t('common.loading') : $t('common.save') }}
        </button>
      </div>
    </header>

    <div class="stage-wrap">
      <div class="fit" :style="imageFitStyle">
        <img ref="image" class="photo" :src="imageUrl" alt="" draggable="false" @load="onImageLoad">
        <div class="overlay" :class="{ preview: previewing }" @pointerdown="onPointerDown" @contextmenu.prevent>
          <div
            v-for="(rect, index) in visibleRectangles"
            :key="rect.id"
            class="mask"
            :class="{ selected: rect.id === selectedId && !previewing, active: previewing && index === 0 }"
            :style="maskStyle(rect)"
          >
            <template v-if="rect.id === selectedId && !previewing && !detecting">
              <span class="handle nw"></span>
              <span class="handle ne"></span>
              <span class="handle sw"></span>
              <span class="handle se"></span>
              <span class="handle rot" aria-hidden="true">
                <TablerIcon name="rotateClockwise" />
              </span>
              <button
                type="button"
                class="del"
                :aria-label="$t('editor.occlusionDelete')"
                @pointerdown.stop
                @click.stop="remove(rect.id)"
              >
                <TablerIcon name="trash" />
              </button>
            </template>
          </div>
          <div v-if="draft" class="mask draft" :style="maskStyle(draft)"></div>
        </div>
        <div v-if="detecting" class="scan" aria-hidden="true"></div>
      </div>
    </div>
    <footer class="detection-tray">
      <div v-if="detecting || previewing || hasAutomaticMasks || detectionFeedback" class="detection-status">
        <div class="detection-message" role="status">
          <span v-if="detecting" class="saving-spin detection-spin" aria-hidden="true"></span>
          <TablerIcon v-else-if="hasAutomaticMasks && !previewing" name="check" class="detection-check" />
          {{ detectionStatus }}
        </div>
        <div class="detection-actions">
          <button v-if="detecting" type="button" @click="cancelDetection">{{ $t('common.cancel') }}</button>
          <button v-else-if="previewing" type="button" @click="previewing = false">{{ $t('editor.occlusionEditMasks') }}</button>
          <template v-else-if="hasAutomaticMasks">
            <button type="button" @click="undoDetection">{{ $t('editor.occlusionUndoAi') }}</button>
            <button type="button" @click="showPreview">{{ $t('editor.occlusionPreview') }}</button>
          </template>
          <button
            v-else-if="detectionFeedback !== 'occlusionDetectionLimit'"
            type="button"
            :disabled="!imageReady"
            @click="startDetection"
          >{{ $t('editor.occlusionTryAgain') }}</button>
        </div>
      </div>
      <button v-else type="button" class="detect-button" :disabled="!imageReady" @click="startDetection">
        <TablerIcon name="sparkles" />
        {{ $t('editor.occlusionDetectAi') }}
      </button>
      <p class="hint">{{ $t(detectionHint) }}</p>
    </footer>
    <p v-if="shownError && !saving" class="error">{{ shownError }}</p>

    <div v-if="saving" class="saving-overlay" role="status" aria-live="polite" aria-busy="true">
      <span class="saving-spin" aria-hidden="true"></span>
      <p>{{ $t('common.loading') }}</p>
    </div>

    <dialog
      v-if="modeOpen"
      ref="modeDialog"
      class="sheet"
      :aria-label="$t('editor.occlusionModes')"
      @cancel.prevent="closeModeSelector"
      @keydown.esc.stop.prevent="closeModeSelector"
      @click.self="closeModeSelector"
    >
      <div class="sheet-inner">
        <header class="sheet-nav">
          <button type="button" class="nav-icon glass-action glass-action--icon" :aria-label="$t('common.close')" @click="closeModeSelector">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <h3>{{ $t('editor.occlusionModes') }}</h3>
          <button type="button" class="nav-icon confirm-mode glass-action glass-action--icon glass-action--accent" :aria-label="$t('common.ok')" @click="applyModeSelector">
            <TablerIcon name="check" />
          </button>
        </header>
        <div class="mode-choices" role="radiogroup" :aria-label="$t('editor.occlusionModes')">
          <label v-for="option in modeOptions" :key="option.value" class="choice" :class="{ on: pendingMode === option.value }">
            <input
              v-model="pendingMode"
              type="radio"
              name="occlusion-mode"
              :value="option.value"
              :aria-label="$t(option.title)"
            >
            <span class="choice-image">
              <img :src="option.image" alt="" width="636" height="424">
              <span v-if="pendingMode === option.value" class="choice-check" aria-hidden="true"><TablerIcon name="check" /></span>
            </span>
            <span v-if="option.value === 'hideAll'" class="choice-kicker">{{ $t('editor.occlusionDefault') }}</span>
            <span class="choice-title">{{ $t(option.title) }}</span>
            <span class="choice-body">{{ $t(option.body) }}</span>
          </label>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script>
import { getLocale } from '../i18n';
import { detectOcclusionText } from '../study/imageOcclusionOcr';
import TablerIcon from './TablerIcon.vue';
import hideAllExample from '../assets/image-occlusion/hide-all.png';
import hideOneExample from '../assets/image-occlusion/hide-one.png';

const HANDLE_PX = 16;
const ROTATE_OFFSET = 28;
const CREATE_THRESHOLD = 6;
const MIN_EDGE = 12;
const MAX_RECTS = 100;
const CORNER_SIGNS = {
  nw: [-1, -1],
  ne: [1, -1],
  sw: [-1, 1],
  se: [1, 1],
};
const OPPOSITE_CORNER = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fitRect(rect) {
  const width = clamp(rect.width, 0.01, 1);
  const height = clamp(rect.height, 0.01, 1);
  return {
    ...rect,
    width,
    height,
    left: clamp(rect.left, 0, 1 - width),
    top: clamp(rect.top, 0, 1 - height),
  };
}

function localPoint(point, rect) {
  const cx = (rect.left + rect.width / 2) * point.w;
  const cy = (rect.top + rect.height / 2) * point.h;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const rad = (-rect.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
    hw: (rect.width * point.w) / 2,
    hh: (rect.height * point.h) / 2,
  };
}

function coversRegion(mask, region, w, h) {
  const right = region.left + region.width;
  const bottom = region.top + region.height;
  if (!mask.rotation) {
    const overlapX = Math.min(right, mask.left + mask.width) - Math.max(region.left, mask.left);
    const overlapY = Math.min(bottom, mask.top + mask.height) - Math.max(region.top, mask.top);
    return overlapX > 0 && overlapY > 0 && overlapX * overlapY >= region.width * region.height * 0.7;
  }
  return [
    [region.left, region.top], [right, region.top], [region.left, bottom], [right, bottom],
  ].every(([x, y]) => {
    const local = localPoint({ x: x * w, y: y * h, w, h }, mask);
    return Math.abs(local.x) <= local.hw && Math.abs(local.y) <= local.hh;
  });
}

function handleHit(local) {
  if (Math.hypot(local.x, local.y + local.hh + ROTATE_OFFSET) <= HANDLE_PX) {
    return { kind: 'rotate' };
  }
  for (const [corner, signs] of Object.entries(CORNER_SIGNS)) {
    const [sx, sy] = signs;
    const x = sx * local.hw;
    const y = sy * local.hh;
    if (Math.hypot(local.x - x, local.y - y) <= HANDLE_PX) return { kind: 'resize', corner };
  }
  return null;
}

function hitTest(point, rectangles, selectedId) {
  if (selectedId) {
    const selected = rectangles.find((rect) => rect.id === selectedId);
    if (selected) {
      const local = localPoint(point, selected);
      if (Math.abs(local.x) <= local.hw / 2 && Math.abs(local.y) <= local.hh / 2) {
        return { id: selected.id, kind: 'move' };
      }
      const handle = handleHit(local);
      if (handle) return { id: selected.id, ...handle };
    }
  }
  for (let index = rectangles.length - 1; index >= 0; index -= 1) {
    const rect = rectangles[index];
    const local = localPoint(point, rect);
    if (Math.abs(local.x) <= local.hw && Math.abs(local.y) <= local.hh) {
      return { id: rect.id, kind: 'move' };
    }
  }
  return null;
}

function cornerClient(rect, corner, box) {
  const [sx, sy] = CORNER_SIGNS[corner];
  const cx = box.left + (rect.left + rect.width / 2) * box.width;
  const cy = box.top + (rect.top + rect.height / 2) * box.height;
  const hw = (rect.width * box.width) / 2;
  const hh = (rect.height * box.height) / 2;
  const rad = (rect.rotation * Math.PI) / 180;
  const lx = sx * hw;
  const ly = sy * hh;
  return {
    x: cx + lx * Math.cos(rad) - ly * Math.sin(rad),
    y: cy + lx * Math.sin(rad) + ly * Math.cos(rad),
  };
}

export default {
  name: 'ImageOcclusionEditor',
  components: { TablerIcon },
  props: {
    imageUrl: { type: String, required: true },
    saving: { type: Boolean, default: false },
    saveError: { type: String, default: '' },
  },
  emits: ['cancel', 'save'],
  data() {
    return {
      rectangles: [],
      selectedId: '',
      draft: null,
      gesture: null,
      mode: 'hideAll',
      pendingMode: 'hideAll',
      modeOpen: false,
      headerSideWidth: 44,
      modeOptions: [
        { value: 'hideAll', title: 'editor.occlusionHideAll', body: 'editor.occlusionHideAllBody', image: hideAllExample },
        { value: 'hideOne', title: 'editor.occlusionHideOne', body: 'editor.occlusionHideOneBody', image: hideOneExample },
      ],
      localError: '',
      imageSize: null,
      detectionController: null,
      detectionFeedback: '',
      previewing: false,
    };
  },
  computed: {
    imageReady() { return this.imageSize !== null; },
    imageFitStyle() {
      if (!this.imageSize) return null;
      const { width, height } = this.imageSize;
      return { '--photo-width': `${width}px`, '--photo-ratio': width / height };
    },
    detecting() { return this.detectionController !== null; },
    hasAutomaticMasks() { return this.rectangles.some((rect) => rect.automatic); },
    visibleRectangles() {
      return this.previewing && this.mode === 'hideOne' ? this.rectangles.slice(0, 1) : this.rectangles;
    },
    detectionStatus() {
      if (this.detecting) return this.$t('editor.occlusionDetecting');
      if (this.previewing) return this.$t('editor.occlusionPreviewing');
      if (this.hasAutomaticMasks) {
        const count = this.rectangles.length;
        return this.$t(count === 1 ? 'editor.occlusionOneReady' : 'editor.occlusionMasksReady', { count });
      }
      return this.$t(`editor.${this.detectionFeedback}`);
    },
    detectionHint() {
      if (this.detecting) return 'editor.occlusionDetectingHint';
      if (this.previewing) return 'editor.occlusionPreviewHint';
      if (this.detectionFeedback === 'occlusionDetectionLimit') return 'editor.occlusionLimitHint';
      if (this.hasAutomaticMasks) return 'editor.occlusionReviewHint';
      return 'editor.occlusionHint';
    },
    shownError() {
      if (this.saveError) return this.saveError;
      if (this.localError === 'none') return this.$t('editor.occlusionNone');
      if (this.localError === 'many') return this.$t('editor.occlusionTooMany');
      return '';
    },
  },
  mounted() {
    this.headerObserver = new ResizeObserver(() => {
      this.headerSideWidth = Math.ceil(Math.max(
        44,
        this.$refs.cancelButton.getBoundingClientRect().width,
        this.$refs.saveButton.getBoundingClientRect().width,
      ));
    });
    this.headerObserver.observe(this.$refs.cancelButton);
    this.headerObserver.observe(this.$refs.saveButton);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  },
  beforeUnmount() {
    this.headerObserver.disconnect();
    this.cancelDetection();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
  },
  methods: {
    openModeSelector() {
      if (this.saving || this.detecting) return;
      this.pendingMode = this.mode;
      this.modeOpen = true;
      this.$nextTick(() => {
        this.$refs.modeDialog.showModal();
        this.$refs.modeDialog.querySelector('input:checked')?.focus();
      });
    },
    closeModeSelector() {
      this.$refs.modeDialog?.close();
      this.modeOpen = false;
      this.$nextTick(() => this.$refs.modeSelector?.focus());
    },
    applyModeSelector() {
      this.mode = this.pendingMode;
      this.closeModeSelector();
    },
    onImageLoad({ currentTarget }) {
      const { naturalWidth, naturalHeight } = currentTarget;
      if (naturalWidth && naturalHeight) this.imageSize = { width: naturalWidth, height: naturalHeight };
    },
    async startDetection() {
      const image = this.$refs.image;
      if (!image?.naturalWidth || !image.naturalHeight || this.detecting || this.saving) return;
      const available = MAX_RECTS - this.rectangles.length;
      if (available <= 0) {
        this.detectionFeedback = 'occlusionDetectionLimit';
        return;
      }
      this.selectedId = '';
      this.draft = null;
      this.gesture = null;
      this.detectionFeedback = '';
      this.localError = '';
      const controller = new AbortController();
      this.detectionController = controller;
      try {
        const regions = await detectOcclusionText(image, { locale: getLocale(), signal: controller.signal });
        if (controller.signal.aborted) return;
        const candidates = regions.filter((region) =>
          !this.rectangles.some((mask) => coversRegion(mask, region, image.naturalWidth, image.naturalHeight)),
        );
        this.rectangles.push(...candidates.slice(0, available).map((rect) => ({
          ...rect, id: crypto.randomUUID(), automatic: true,
        })));
        if (!regions.length) this.detectionFeedback = 'occlusionNoText';
        else if (!candidates.length) this.detectionFeedback = 'occlusionAlreadyCovered';
        else if (candidates.length > available) this.detectionFeedback = 'occlusionDetectionLimit';
      } catch {
        if (!controller.signal.aborted) this.detectionFeedback = 'occlusionDetectionFailed';
      } finally {
        if (this.detectionController === controller) this.detectionController = null;
      }
    },
    cancelDetection() {
      this.detectionController?.abort();
      this.detectionController = null;
    },
    undoDetection() {
      this.rectangles = this.rectangles.filter((rect) => !rect.automatic);
      this.selectedId = '';
      this.detectionFeedback = '';
    },
    showPreview() {
      this.selectedId = '';
      this.previewing = true;
    },
    closeEditor() {
      this.cancelDetection();
      this.$emit('cancel');
    },
    maskStyle(rect) {
      return {
        left: `${rect.left * 100}%`,
        top: `${rect.top * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
        transform: `rotate(${rect.rotation || 0}deg)`,
      };
    },
    imagePoint(event) {
      const img = this.$refs.image;
      if (!img) return null;
      const box = img.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      return {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
        w: box.width,
        h: box.height,
        box,
      };
    },
    patchRect(id, next) {
      const index = this.rectangles.findIndex((rect) => rect.id === id);
      if (index < 0) return;
      this.rectangles.splice(index, 1, fitRect({ ...this.rectangles[index], ...next }));
    },
    remove(id) {
      this.rectangles = this.rectangles.filter((rect) => rect.id !== id);
      if (this.selectedId === id) this.selectedId = '';
      this.localError = '';
      if (['occlusionAlreadyCovered', 'occlusionDetectionLimit'].includes(this.detectionFeedback)) {
        this.detectionFeedback = '';
      }
    },
    onPointerDown(event) {
      if (this.saving || this.detecting || this.previewing || (event.button != null && event.button !== 0)) return;
      const point = this.imagePoint(event);
      if (!point) return;
      const hit = hitTest(point, this.rectangles, this.selectedId);
      if (hit?.kind === 'move' || hit?.kind === 'resize' || hit?.kind === 'rotate') {
        const origin = this.rectangles.find((rect) => rect.id === hit.id);
        this.selectedId = hit.id;
        if (hit.kind === 'move') {
          this.gesture = { type: 'move', id: hit.id, start: point, origin: { ...origin } };
        } else if (hit.kind === 'resize') {
          this.gesture = {
            type: 'resize',
            id: hit.id,
            origin: { ...origin },
            opposite: cornerClient(origin, OPPOSITE_CORNER[hit.corner], point.box),
          };
        } else {
          const cx = point.box.left + (origin.left + origin.width / 2) * point.w;
          const cy = point.box.top + (origin.top + origin.height / 2) * point.h;
          this.gesture = {
            type: 'rotate',
            id: hit.id,
            origin: { ...origin },
            startAngle: Math.atan2(event.clientY - cy, event.clientX - cx),
          };
        }
        return;
      }
      this.selectedId = '';
      if (this.rectangles.length >= MAX_RECTS) {
        this.localError = 'many';
        return;
      }
      this.gesture = { type: 'pending', start: point };
    },
    onPointerMove(event) {
      const gesture = this.gesture;
      if (!gesture) return;
      const point = this.imagePoint(event);
      if (!point) return;
      if (gesture.type === 'pending') {
        const dx = point.x - gesture.start.x;
        const dy = point.y - gesture.start.y;
        if (Math.hypot(dx, dy) < CREATE_THRESHOLD) return;
        this.gesture = { type: 'create', start: gesture.start };
      }
      const active = this.gesture;
      if (active.type === 'create') {
        const start = active.start;
        this.draft = {
          left: Math.min(start.x, point.x) / point.w,
          top: Math.min(start.y, point.y) / point.h,
          width: Math.abs(point.x - start.x) / point.w,
          height: Math.abs(point.y - start.y) / point.h,
          rotation: 0,
        };
        return;
      }
      if (active.type === 'move') {
        const dx = (point.x - active.start.x) / point.w;
        const dy = (point.y - active.start.y) / point.h;
        this.patchRect(active.id, {
          left: active.origin.left + dx,
          top: active.origin.top + dy,
        });
        return;
      }
      if (active.type === 'rotate') {
        const cx = point.box.left + (active.origin.left + active.origin.width / 2) * point.w;
        const cy = point.box.top + (active.origin.top + active.origin.height / 2) * point.h;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx);
        const delta = ((angle - active.startAngle) * 180) / Math.PI;
        this.patchRect(active.id, { rotation: active.origin.rotation + delta });
        return;
      }
      if (active.type === 'resize') {
        const ox = active.opposite.x - point.box.left;
        const oy = active.opposite.y - point.box.top;
        const cx = (ox + point.x) / 2;
        const cy = (oy + point.y) / 2;
        const rad = (-active.origin.rotation * Math.PI) / 180;
        const vx = point.x - ox;
        const vy = point.y - oy;
        const localX = vx * Math.cos(rad) - vy * Math.sin(rad);
        const localY = vx * Math.sin(rad) + vy * Math.cos(rad);
        const width = Math.abs(localX) / point.w;
        const height = Math.abs(localY) / point.h;
        if (Math.abs(localX) < MIN_EDGE || Math.abs(localY) < MIN_EDGE) return;
        this.patchRect(active.id, {
          left: cx / point.w - width / 2,
          top: cy / point.h - height / 2,
          width,
          height,
        });
      }
    },
    onPointerUp() {
      const gesture = this.gesture;
      if (gesture?.type === 'create' && this.draft) {
        const box = this.$refs.image?.getBoundingClientRect();
        const widthPx = this.draft.width * (box?.width || 0);
        const heightPx = this.draft.height * (box?.height || 0);
        if (widthPx >= MIN_EDGE && heightPx >= MIN_EDGE) {
          const id = crypto.randomUUID();
          this.rectangles.push({ id, ...fitRect(this.draft) });
          this.selectedId = id;
          this.localError = '';
        }
      }
      this.draft = null;
      this.gesture = null;
    },
    onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.onEscape();
        return;
      }
      if (this.modeOpen || this.saving || this.detecting || this.previewing || !this.selectedId) return;
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      this.remove(this.selectedId);
    },
    onEscape() {
      if (this.modeOpen) {
        this.closeModeSelector();
        return;
      }
      if (this.detecting) this.cancelDetection();
      else if (this.previewing) this.previewing = false;
      else if (!this.saving) this.closeEditor();
    },
    requestSave() {
      if (this.saving || this.detecting) return;
      if (!this.rectangles.length) {
        this.localError = 'none';
        return;
      }
      if (this.rectangles.length > MAX_RECTS) {
        this.localError = 'many';
        return;
      }
      this.localError = '';
      this.$emit('save', {
        mode: this.mode,
        rectangles: this.rectangles.map((rect) => ({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          rotation: rect.rotation || 0,
        })),
      });
    },
  },
};
</script>

<style scoped>
.io-root {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  background: var(--card-bg, #fff);
  color: var(--title, #1e293d);
}
.nav {
  display: grid;
  grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: calc(4px + env(safe-area-inset-top)) 8px 4px 4px;
}
.nav h2, .sheet-nav h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  text-align: center;
}
.nav-text, .nav-icon {
  border: 0;
  background: transparent;
  color: var(--blue-button, #0a7aff);
  font: inherit;
  cursor: pointer;
}
.nav-text { font-size: 17px; padding: 8px 12px; text-align: left; }
.nav-cancel { justify-self: start; }
.nav-text.save { font-weight: 650; text-align: right; }
.nav-text:disabled, .nav-icon:disabled { opacity: 0.45; cursor: default; }
.nav-trailing { display: flex; justify-content: flex-end; align-items: center; gap: 6px; }
.mode-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--blue-button, #0a7aff) 18%, var(--card-bg, #fff));
  border-radius: 999px;
  background: color-mix(in srgb, var(--card-bg, #fff) 80%, var(--page-bg, #f8fafc));
  box-shadow: 0 2px 6px color-mix(in srgb, var(--title, #1e293d) 5%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: inherit;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  text-align: start;
}
.mode-selector:hover:not(:disabled), .mode-selector[aria-expanded="true"] {
  border-color: color-mix(in srgb, var(--blue-button, #0a7aff) 45%, var(--card-bg, #fff));
  background: color-mix(in srgb, var(--blue-button, #0a7aff) 6%, var(--card-bg, #fff));
}
.mode-selector:focus-visible { outline: 2px solid var(--blue-button, #0a7aff); outline-offset: 3px; }
.mode-selector:disabled { opacity: 0.45; cursor: default; }
.mode-selector .mode-selector-icon { width: 18px; height: 18px; color: var(--blue-button, #0a7aff); }
.mode-selector .mode-selector-chevron { width: 14px; height: 14px; opacity: 0.65; transform: rotate(90deg); }
.mode-selector[aria-expanded="true"] .mode-selector-chevron { transform: rotate(-90deg); }
.nav-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
}
.nav-icon svg, .del svg { width: 22px; height: 22px; }
.stage-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  place-items: center;
  padding: 12px 16px;
  container-type: size;
  background: var(--page-bg, #f8fafc);
}
.fit {
  position: relative;
  width: min(100%, 960px, var(--photo-width, 960px), calc((100dvh - 150px) * var(--photo-ratio, 1)));
  width: min(100%, 960px, var(--photo-width, 960px), calc(100cqh * var(--photo-ratio, 1)));
  line-height: 0;
  touch-action: none;
  user-select: none;
}
.photo {
  display: block;
  width: 100%;
  height: auto;
  -webkit-user-drag: none;
}
.overlay { position: absolute; inset: 0; }
.overlay.preview { pointer-events: none; }
.mask {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 6px;
  transform-origin: center center;
}
.mask.selected {
  border: 3px solid var(--blue-button, #0a7aff);
  background: rgba(10, 122, 255, 0.12);
  z-index: 2;
}
.mask.draft {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  pointer-events: none;
}
.preview .mask {
  border: 1px solid #212121;
  background: #ffeba2;
}
.preview .mask.active { background: #ff8e8e; }
.scan {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: 1px solid var(--blue-button, #0a7aff);
  border-radius: 6px;
  pointer-events: none;
}
.scan::after {
  content: '';
  position: absolute;
  inset: 15% 0 auto;
  height: 2px;
  background: var(--blue-button, #0a7aff);
  box-shadow: 0 0 12px var(--blue-button, #0a7aff);
  animation: io-scan 1.25s ease-in-out infinite alternate;
}
@keyframes io-scan { to { top: 85%; } }
.handle {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  background: #fff;
  border: 2px solid var(--blue-button, #0a7aff);
  transform: translate(-50%, -50%);
}
.handle.nw { left: 0; top: 0; }
.handle.ne { left: 100%; top: 0; }
.handle.sw { left: 0; top: 100%; }
.handle.se { left: 100%; top: 100%; }
.handle.rot {
  left: 50%;
  top: -28px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: var(--blue-button, #0a7aff);
  color: var(--button-text, #fff);
  display: grid;
  place-items: center;
  cursor: grab;
}
.handle.rot svg { width: 16px; height: 16px; }
.del {
  position: absolute;
  left: 50%;
  top: calc(100% + 10px);
  width: 28px;
  height: 28px;
  margin-left: -14px;
  border: 0;
  border-radius: 14px;
  background: #ef4444;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
}
.del svg { width: 16px; height: 16px; }
.detection-tray {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--page-bg, #f8fafc);
}
.detect-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  margin-bottom: 6px;
  padding: 8px 18px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--card-bg, #fff) 72%, transparent);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  box-shadow: 0 4px 18px color-mix(in srgb, var(--title, #1e293d) 9%, transparent);
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.detect-button:disabled { opacity: 0.45; cursor: default; }
.detect-button svg { width: 19px; height: 19px; transform: rotate(90deg); }
.detection-status {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0 8px;
  width: min(100%, 500px);
  min-height: 48px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 15px;
  background: var(--card-bg, #fff);
  font-size: 14px;
  font-weight: 650;
}
.detection-message, .detection-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.detection-actions { margin-inline-start: auto; }
.detection-actions button {
  min-height: 44px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: var(--blue-button, #0a7aff);
  font: inherit;
  cursor: pointer;
}
.detection-check { width: 17px; height: 17px; color: #23845e; }
.detection-tray .detection-spin { width: 16px; height: 16px; border-width: 2px; }
.hint {
  margin: 0;
  text-align: center;
  color: var(--secondary-text, var(--title, #1e293d));
  font-size: 13px;
}
.error {
  margin: 0;
  padding: 8px 16px 16px;
  color: #b91c1c;
  text-align: center;
}
.saving-overlay {
  position: fixed;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: color-mix(in srgb, var(--card-bg, #fff) 78%, transparent);
  color: var(--title, #1e293d);
}
.saving-overlay p { margin: 0; font-size: 17px; }
.saving-spin {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--blue-button, #0a7aff) 25%, transparent);
  border-top-color: var(--blue-button, #0a7aff);
  animation: io-spin 0.8s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .saving-spin, .scan::after { animation: none; }
}
@keyframes io-spin { to { transform: rotate(360deg); } }
.sheet {
  box-sizing: border-box;
  width: min(840px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  border: 0;
  margin: auto;
  padding: 0;
  border-radius: 22px;
  background: var(--card-bg, #fff);
  color: inherit;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.3);
  overflow: hidden;
}
.sheet::backdrop {
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
}
.sheet-inner {
  display: flex;
  flex-direction: column;
  max-height: inherit;
}
.sheet-nav {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  flex: 0 0 auto;
}
.confirm-mode {
  border-radius: 50%;
}
.mode-choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  overflow-y: auto;
  padding: 4px 20px 24px;
}
.choice {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: start;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  border-radius: 20px;
  padding: 16px;
  background: var(--card-bg, #fff);
  color: inherit;
  cursor: pointer;
}
.choice.on {
  border-color: var(--blue-button, #0a7aff);
  box-shadow: inset 0 0 0 1px var(--blue-button, #0a7aff);
  background: color-mix(in srgb, var(--blue-button, #0a7aff) 7%, var(--card-bg, #fff));
}
.choice:focus-within { outline: 2px solid var(--blue-button, #0a7aff); outline-offset: 3px; }
.choice input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.choice-image {
  position: relative;
  display: block;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  border-radius: 12px;
  background: #fff;
  margin-top: 16px;
}
.choice-image img { display: block; width: 100%; height: auto; }
.choice-check {
  position: absolute;
  bottom: 9px;
  inset-inline-end: 9px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid white;
  border-radius: 50%;
  background: var(--blue-button, #0a7aff);
  color: var(--button-text, #fff);
}
.choice-check svg { width: 20px; height: 20px; }
.choice-kicker {
  position: absolute;
  top: 9px;
  inset-inline-end: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  background: var(--blue-button, #0a7aff);
  color: var(--button-text, #fff);
}
.choice-title { font-size: 18px; font-weight: 650; }
.choice-body { font-size: 15px; line-height: 1.5; opacity: 0.8; }
@media (max-width: 760px) {
  .nav {
    grid-template-columns: var(--nav-side-width) minmax(0, 1fr) var(--nav-side-width);
    gap: 6px;
    padding-inline: 8px;
  }
  .nav h2 {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .nav-trailing { display: contents; }
  .nav-cancel { grid-column: 1; justify-self: start; }
  .mode-selector { grid-column: 2; justify-self: center; max-width: 100%; }
  .nav .save { grid-column: 3; justify-self: end; padding-inline: 8px; }
}
@media (max-width: 480px) {
  .nav .nav-cancel { display: grid; place-items: center; width: 44px; min-height: 44px; padding: 0; }
  .mode-selector { gap: 6px; padding: 6px 10px; font-size: 13px; }
  .nav .save { font-size: 15px; min-height: 44px; }
}
@media (max-width: 600px) {
  .mode-choices { grid-template-columns: minmax(0, 1fr); }
}
</style>
