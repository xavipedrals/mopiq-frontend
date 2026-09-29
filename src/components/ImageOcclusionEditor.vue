<template>
  <div
    class="io-root"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="'occlusion-title'"
    @keydown.esc.stop="onEscape"
  >
    <header class="nav">
      <button type="button" class="nav-text" :disabled="saving" @click="$emit('cancel')">
        {{ $t('common.cancel') }}
      </button>
      <h2 id="occlusion-title">{{ $t('editor.occlusion') }}</h2>
      <div class="nav-trailing">
        <button
          type="button"
          class="nav-icon"
          :aria-label="$t('editor.occlusionModes')"
          :disabled="saving"
          @click="modeOpen = true"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="12" r="1.4" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
            <circle cx="18" cy="12" r="1.4" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="nav-text save" :disabled="saving" @click="requestSave">
          {{ saving ? $t('common.loading') : $t('common.save') }}
        </button>
      </div>
    </header>

    <div class="stage-wrap">
      <div class="fit">
        <img ref="image" class="photo" :src="imageUrl" alt="" draggable="false">
        <div class="overlay" @pointerdown="onPointerDown" @contextmenu.prevent>
          <div
            v-for="rect in rectangles"
            :key="rect.id"
            class="mask"
            :class="{ selected: rect.id === selectedId }"
            :style="maskStyle(rect)"
          >
            <template v-if="rect.id === selectedId">
              <span class="handle nw"></span>
              <span class="handle ne"></span>
              <span class="handle sw"></span>
              <span class="handle se"></span>
              <span class="handle rot"></span>
              <button
                type="button"
                class="del"
                :aria-label="$t('editor.occlusionDelete')"
                @pointerdown.stop
                @click.stop="remove(rect.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 8.5h8M9.2 8.5l.4 9h4.8l.4-9M10 8.4V7.2h4v1.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                </svg>
              </button>
            </template>
          </div>
          <div v-if="draft" class="mask draft" :style="maskStyle(draft)"></div>
        </div>
      </div>
      <p v-if="!rectangles.length && !draft" class="hint">{{ $t('editor.occlusionHint') }}</p>
    </div>
    <p v-if="shownError && !saving" class="error">{{ shownError }}</p>

    <div v-if="saving" class="saving-overlay" role="status" aria-live="polite" aria-busy="true">
      <span class="saving-spin" aria-hidden="true"></span>
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div v-if="modeOpen" class="sheet-back" @click.self="modeOpen = false">
      <section class="sheet" role="dialog" :aria-label="$t('editor.occlusionModes')">
        <header class="sheet-nav">
          <button type="button" class="nav-icon" :aria-label="$t('common.cancel')" @click="modeOpen = false">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <h3>{{ $t('editor.occlusionModes') }}</h3>
          <button type="button" class="nav-icon" :aria-label="$t('common.ok')" @click="modeOpen = false">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 12.5l3.2 3.2 7.8-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </header>
        <button
          type="button"
          class="choice"
          :class="{ on: mode === 'hideAll' }"
          @click="mode = 'hideAll'"
        >
          <span class="choice-kicker">{{ $t('editor.occlusionDefault') }}</span>
          <span class="choice-title">{{ $t('editor.occlusionHideAll') }}</span>
          <span class="choice-body">{{ $t('editor.occlusionHideAllBody') }}</span>
        </button>
        <button
          type="button"
          class="choice"
          :class="{ on: mode === 'hideOne' }"
          @click="mode = 'hideOne'"
        >
          <span class="choice-title">{{ $t('editor.occlusionHideOne') }}</span>
          <span class="choice-body">{{ $t('editor.occlusionHideOneBody') }}</span>
        </button>
      </section>
    </div>
  </div>
</template>

<script>
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
      const handle = handleHit(localPoint(point, selected));
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
      modeOpen: false,
      localError: '',
    };
  },
  computed: {
    shownError() {
      if (this.saveError) return this.saveError;
      if (this.localError === 'none') return this.$t('editor.occlusionNone');
      if (this.localError === 'many') return this.$t('editor.occlusionTooMany');
      return '';
    },
  },
  mounted() {
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  },
  beforeUnmount() {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
  },
  methods: {
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
    },
    onPointerDown(event) {
      if (this.saving || (event.button != null && event.button !== 0)) return;
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
        if (this.modeOpen) {
          this.modeOpen = false;
          return;
        }
        if (!this.saving) this.$emit('cancel');
        return;
      }
      if (this.modeOpen || !this.selectedId) return;
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      this.remove(this.selectedId);
    },
    onEscape() {
      if (this.modeOpen) {
        this.modeOpen = false;
        return;
      }
      if (!this.saving) this.$emit('cancel');
    },
    requestSave() {
      if (this.saving) return;
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
.nav-text.save { font-weight: 650; text-align: right; }
.nav-text:disabled, .nav-icon:disabled { opacity: 0.45; cursor: default; }
.nav-trailing { display: flex; justify-content: flex-end; align-items: center; }
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
  place-items: center;
  padding: 12px 16px 24px;
  background: var(--page-bg, #f8fafc);
}
.fit {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  touch-action: none;
  user-select: none;
}
.photo {
  display: block;
  max-width: min(100%, 960px);
  max-height: calc(100dvh - 150px);
  width: auto;
  height: auto;
  -webkit-user-drag: none;
}
.overlay { position: absolute; inset: 0; }
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
.handle.rot { left: 50%; top: -28px; }
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
.hint {
  position: absolute;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  margin: 0;
  max-width: min(440px, calc(100% - 32px));
  padding: 10px 16px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--card-bg, #fff) 88%, transparent);
  color: var(--title, #1e293d);
  text-align: center;
  font-size: 15px;
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
  .saving-spin { animation: none; }
}
@keyframes io-spin { to { transform: rotate(360deg); } }
.sheet-back {
  position: fixed;
  inset: 0;
  z-index: 2;
  background: rgba(15, 23, 42, 0.35);
  display: grid;
  align-items: end;
}
.sheet {
  width: min(520px, 100%);
  margin: 0 auto;
  background: var(--card-bg, #fff);
  border-radius: 18px 18px 0 0;
  padding: 8px 16px calc(20px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sheet-nav {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
}
.choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  border: 0;
  border-radius: 16px;
  padding: 16px;
  background: var(--page-bg, #f8fafc);
  color: inherit;
  cursor: pointer;
}
.choice.on { outline: 2px solid var(--blue-button, #0a7aff); }
.choice-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--blue-button, #0a7aff);
}
.choice-title { font-size: 17px; font-weight: 650; }
.choice-body { font-size: 14px; line-height: 1.35; opacity: 0.8; }
</style>
