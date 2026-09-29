import { WEB_OCCLUSION_NOTE_MODEL_ID } from './sanitizeCardHtml.js';

export { WEB_OCCLUSION_NOTE_MODEL_ID };
export const OCCLUSION_NOTE_MODEL_NAME = 'ankiFlashcardsBrandedImageOcclusion';
export const MAX_OCCLUSION_RECTS = 100;

const OCCLUSION_MARKUP = /image-occlusion:/i;
const SHAPE_PATTERN = /\{\{c(\d+)::image-occlusion:([^}]+)\}\}/gi;

const OCCLUSION_MODEL_CSS = `#image-occlusion-canvas {
    --inactive-shape-color: #ffeba2;
    --active-shape-color: #ff8e8e;
    --inactive-shape-border: 1px #212121;
    --active-shape-border: 1px #212121;
    --highlight-shape-color: #ff8e8e00;
    --highlight-shape-border: 1px #ff8e8e;
}
.card {
    font-family: arial;
    font-size: 20px;
    text-align: center;
    color: black;
    background-color: white;
}`;

const OCCLUSION_SETUP_SCRIPT = `<script>
try {
    anki.imageOcclusion.setup();
} catch (exc) {
    document.getElementById("err").innerHTML = \`Error loading image occlusion. Is your Anki version up to date?<br><br>\${exc}\`;
}
</script>`;

const OCCLUSION_BODY = `<div style="display: none">
{{cloze:Occlusion}}
</div>
<div id="err"></div>
<div id="image-occlusion-container">
{{Image}}
<canvas id="image-occlusion-canvas"></canvas>
</div>`;

export const OCCLUSION_QUESTION_FORMAT = `${OCCLUSION_BODY}
${OCCLUSION_SETUP_SCRIPT}`;

export const OCCLUSION_ANSWER_FORMAT = `${OCCLUSION_BODY}
<div class="image-occlusion-toggle-container">
<button id="toggle">Hide Masks</button>
</div>
${OCCLUSION_SETUP_SCRIPT}`;

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imageTag(fileName) {
  const name = String(fileName || '').replace(/["<>]/g, '');
  return `<img src="${name}">`;
}

export function isImageOcclusionMarkup(value) {
  return OCCLUSION_MARKUP.test(String(value || ''));
}

export function cardHasImageOcclusion(card) {
  const fields = card?.noteFields || [];
  return isImageOcclusionMarkup(fields[0] || card?.question || '');
}

export function formatRectToken(rect) {
  const left = clamp01(rect?.left);
  const top = clamp01(rect?.top);
  const width = clamp01(rect?.width);
  const height = clamp01(rect?.height);
  const rotation = finite(rect?.rotation ?? rect?.rotationDegrees, 0);
  return `image-occlusion:rect:left=${left.toFixed(4)}:top=${top.toFixed(4)}:width=${width.toFixed(4)}:height=${height.toFixed(4)}:rotation=${rotation.toFixed(2)}:oi=1`;
}

export function buildOcclusionCards({
  rectangles,
  fileName,
  mode = 'hideAll',
  createId = () => crypto.randomUUID(),
} = {}) {
  const rects = Array.isArray(rectangles) ? rectangles : [];
  if (!rects.length) {
    const error = new Error('Draw at least one rectangle.');
    error.code = 'no-rectangles';
    throw error;
  }
  if (rects.length > MAX_OCCLUSION_RECTS) {
    const error = new Error('You can add up to 100 rectangles.');
    error.code = 'too-many';
    throw error;
  }
  const image = imageTag(fileName);
  const tokens = rects.map((rect) => formatRectToken(rect));
  if (mode === 'hideOne') {
    return tokens.map((token) => {
      const noteId = createId();
      return {
        cardId: createId(),
        noteId,
        noteGuid: noteId,
        templateIndex: 0,
        noteModelId: WEB_OCCLUSION_NOTE_MODEL_ID,
        fields: [`{{c1::${token}}}`, image],
      };
    });
  }
  const noteId = createId();
  const occlusion = tokens.map((token, index) => `{{c${index + 1}::${token}}}`).join('<br>');
  const fields = [occlusion, image];
  return tokens.map((_, index) => ({
    cardId: createId(),
    noteId,
    noteGuid: noteId,
    templateIndex: index,
    noteModelId: WEB_OCCLUSION_NOTE_MODEL_ID,
    fields,
  }));
}

function parseShapeParams(payload) {
  const result = {};
  for (const component of String(payload || '').split(':')) {
    const splitAt = component.indexOf('=');
    if (splitAt === -1) {
      if (!result.shape && component) result.shape = component;
      continue;
    }
    result[component.slice(0, splitAt)] = component.slice(splitAt + 1);
  }
  return result;
}

export function parseOcclusionShapes(html) {
  const shapes = [];
  const pattern = new RegExp(SHAPE_PATTERN.source, 'gi');
  let match = pattern.exec(String(html || ''));
  while (match) {
    const params = parseShapeParams(match[2]);
    const shape = params.shape || 'rect';
    shapes.push({
      clozeNumber: Number(match[1]) || 1,
      shape,
      left: finite(params.left),
      top: finite(params.top),
      width: finite(params.width),
      height: finite(params.height),
      rx: params.rx == null ? null : finite(params.rx),
      ry: params.ry == null ? null : finite(params.ry),
      rotation: finite(params.rotation),
      oi: params.oi === '1',
    });
    match = pattern.exec(String(html || ''));
  }
  return shapes;
}

function shapeBox(shape) {
  if (shape.shape === 'ellipse' && shape.rx != null && shape.ry != null) {
    return {
      left: shape.left,
      top: shape.top,
      width: shape.rx * 2,
      height: shape.ry * 2,
      ellipse: true,
    };
  }
  return {
    left: shape.left,
    top: shape.top,
    width: shape.width,
    height: shape.height,
    ellipse: shape.shape === 'ellipse',
  };
}

function percent(value) {
  return `${(finite(value) * 100).toFixed(4)}%`;
}

export function renderOcclusionStudyHtml({
  occlusionField,
  imageHtml = '',
  templateIndex = 0,
  reveal = false,
  showAnswers = 'Show Answers',
  hideAnswers = 'Hide Answers',
} = {}) {
  const shapes = parseOcclusionShapes(occlusionField);
  const targetIndex = Number(templateIndex) || 0;
  const masks = shapes.map((shape) => {
    const isTarget = (shape.clozeNumber - 1) === targetIndex;
    if (reveal && isTarget) return '';
    const box = shapeBox(shape);
    const kind = isTarget ? 'target' : 'other';
    const radius = box.ellipse ? '50%' : '5px';
    return `<div class="io-mask ${kind}" style="left:${percent(box.left)};top:${percent(box.top)};width:${percent(box.width)};height:${percent(box.height)};transform:rotate(${finite(shape.rotation).toFixed(2)}deg);border-radius:${radius}"></div>`;
  }).join('');
  const showToggle = reveal && shapes.some((shape) => shape.oi);
  const toggle = showToggle
    ? `<input class="io-check" id="io-mask-toggle" type="checkbox" checked>`
    : '';
  const toggleLabel = showToggle
    ? `<label class="io-toggle" for="io-mask-toggle">
<span class="io-hide">${escapeHtml(hideAnswers)}</span>
<span class="io-show">${escapeHtml(showAnswers)}</span>
</label>`
    : '';
  return `<div class="io-card">
${toggle}
<div class="io-frame">
${imageHtml || ''}
<div class="io-masks">${masks}</div>
</div>
${toggleLabel}
</div>`;
}

export function imageOcclusionNoteModel(ankiDeckId, modelId = WEB_OCCLUSION_NOTE_MODEL_ID) {
  const id = Number(modelId);
  return {
    id,
    name: OCCLUSION_NOTE_MODEL_NAME,
    type: 0,
    did: Number(ankiDeckId),
    css: OCCLUSION_MODEL_CSS,
    req: [],
    flds: [
      { ord: 0, font: '', name: 'Occlusion' },
      { ord: 1, font: '', name: 'Image' },
    ],
    tmpls: [{
      ord: 0,
      name: OCCLUSION_NOTE_MODEL_NAME,
      qfmt: OCCLUSION_QUESTION_FORMAT,
      afmt: OCCLUSION_ANSWER_FORMAT,
      bqfmt: '',
      bafmt: '',
    }],
  };
}
