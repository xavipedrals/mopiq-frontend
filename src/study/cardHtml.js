import { containsClozeMarkup, WEB_CLOZE_NOTE_MODEL_ID } from './sanitizeCardHtml.js';
import { cardHasImageOcclusion, renderOcclusionStudyHtml } from './imageOcclusion.js';

export const CARD_THEME = {
  light: {
    background: 'transparent',
    text: '#1E293D',
    heading: '#1E293D',
    hr: '#CBD5E1',
    codeBg: '#f1f1f1',
    codeText: 'black',
    inputBg: '#ffffff',
    inputText: '#1E293D',
    inputBorder: '#CBD5E1',
    link: '#0A7AFF',
    clozeBg: '#cffafe',
    clozeBorder: '#67e8f9',
    clozeText: '#164e63',
  },
  dark: {
    background: '#020617',
    text: '#cbd5e1',
    heading: '#f1f5f9',
    hr: '#334155',
    codeBg: '#475569',
    codeText: 'white',
    inputBg: '#334155',
    inputText: '#f1f5f9',
    inputBorder: '#64748b',
    link: '#F0F8FF',
    clozeBg: '#0e7490',
    clozeBorder: '#22d3ee',
    clozeText: '#ecfeff',
  },
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rewriteMedia(html, mediaMap) {
  if (!html) return '';
  let next = html.replace(/\[sound:([^\]]+)\]/gi, (_, file) => {
    const url = mediaMap[file];
    return url ? `<audio controls src="${url}"></audio>` : '';
  });
  next = next.replace(/(src=["'])([^"']+)(["'])/gi, (full, pre, src, post) => {
    if (/^https?:|^data:|^blob:/i.test(src)) return full;
    const file = decodeURIComponent(src.split('/').pop());
    const url = mediaMap[file] || mediaMap[src];
    return url ? `${pre}${url}${post}` : full;
  });
  return next;
}

export function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[sound:[^\]]+\]/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cardPlainText(card, index) {
  const fields = card?.noteFields || [];
  const raw = fields[index];
  if (raw == null || raw === '') {
    return stripHtml(index === 0 ? card?.question : card?.answer);
  }
  return stripHtml(raw);
}

export function fieldHtml(card, index, mediaMap) {
  const fields = card.noteFields || [];
  const raw = fields[index];
  if (raw == null || raw === '') {
    const fallback = index === 0 ? card.question : card.answer;
    if (!fallback) return '';
    return rewriteMedia(fallback, mediaMap);
  }
  return rewriteMedia(raw, mediaMap);
}

export function renderClozeHtml(html, { reveal = false } = {}) {
  const raw = String(html || '');
  if (!/\{\{c\d+::/i.test(raw)) return raw;
  return raw.replace(/\{\{c\d+::([\s\S]*?)\}\}/g, (_, inner) => {
    const split = inner.lastIndexOf('::');
    const text = split === -1 ? inner : inner.slice(0, split);
    const hint = split === -1 ? '' : inner.slice(split + 2);
    if (reveal) return `<span class="cloze">${text}</span>`;
    const label = String(hint || '').trim() || '...';
    return `<span class="cloze">[${escapeHtml(stripHtml(label) || '...')}]</span>`;
  });
}

export function cardHasCloze(card) {
  const fields = card?.noteFields || [];
  if (String(card?.noteModelId || '') === WEB_CLOZE_NOTE_MODEL_ID) return true;
  return containsClozeMarkup(fields[0] || '') || containsClozeMarkup(card?.question || '');
}

function occlusionStudyHtml(card, mediaMap, options) {
  const fields = card?.noteFields || [];
  const occlusionField = fields[0] == null || fields[0] === ''
    ? (card?.question || '')
    : fields[0];
  return renderOcclusionStudyHtml({
    occlusionField,
    imageHtml: fieldHtml(card, 1, mediaMap),
    templateIndex: card?.templateIndex || 0,
    reveal: options.reveal,
    showAnswers: options.showAnswers,
    hideAnswers: options.hideAnswers,
  });
}

function cardHr(dark) {
  const hr = CARD_THEME[dark ? 'dark' : 'light'].hr;
  return `<hr style="border:none;border-top:1px solid ${hr};margin:18px 0;">`;
}

export function frontHtml(card, mediaMap, options = {}) {
  if (cardHasImageOcclusion(card)) return occlusionStudyHtml(card, mediaMap, { ...options, reveal: false });
  return renderClozeHtml(fieldHtml(card, 0, mediaMap), { reveal: false });
}

export function backHtml(card, mediaMap, { dark = false, ...options } = {}) {
  if (cardHasImageOcclusion(card)) return occlusionStudyHtml(card, mediaMap, { ...options, reveal: true });
  if (cardHasCloze(card)) {
    const revealed = renderClozeHtml(fieldHtml(card, 0, mediaMap), { reveal: true });
    const extra = fieldHtml(card, 1, mediaMap);
    if (!extra) return revealed;
    return `${revealed}${cardHr(dark)}${extra}`;
  }
  const back = fieldHtml(card, 1, mediaMap);
  const front = fieldHtml(card, 0, mediaMap);
  if (!back) return front;
  if (front && back.indexOf(front) === -1) {
    return `${front}${cardHr(dark)}${back}`;
  }
  return back;
}

function cardCss(theme, { browse = false } = {}) {
  const t = CARD_THEME[theme];
  const darkOverrides = theme === 'dark'
    ? `
    html, body, .card, body, div {
      background-color: ${t.background};
      background: ${t.background};
    }
    .card {
      background-color: ${t.background} !important;
      background: ${t.background} !important;
    }
    h1, h2, h3, h4, h5, h6 { color: ${t.heading}; line-height: 1.2; }
    p, div, li, ol, ul { color: ${t.text}; }
    a { color: ${t.link}; }
    img { background-color: white; }
    `
    : '';
  return `
    html, body { margin: 0; padding: 0; background: ${t.background}; height: 100%; }
    body {
      font-family: ${browse ? '-apple-system, system-ui, "Helvetica Neue", sans-serif' : 'system-ui, -apple-system, "Helvetica Neue", sans-serif'};
      font-size: ${browse ? '14pt' : '22px'};
      line-height: ${browse ? '1.5' : '1.45'};
      color: ${t.text};
      padding: ${browse ? '0' : '8px 4px'};
      word-wrap: break-word;
      box-sizing: border-box;
    }
    .card {
      width: ${browse ? '90%' : '100%'};
      ${browse ? 'max-width: 90%; min-height: 100%; margin-left: auto; margin-right: auto; padding-top: 30px; padding-bottom: 30px;' : ''}
      box-sizing: border-box;
    }
    ${browse ? 'p { margin-block-start: 0; margin-block-end: 0; }' : ''}
    img, video { max-width: 100%; max-height: 100%; height: auto; object-fit: contain; }
    audio { width: 100%; margin: 8px 0; }
    hr {
      border: none;
      border-top: 1px solid ${t.hr};
      margin: 18px 0;
    }
    code {
      font-family: Consolas, "courier new", monospace;
      font-size: 22px;
      color: ${t.codeText};
      background-color: ${t.codeBg};
      padding: 6px;
    }
    input {
      font-family: Consolas, "courier new", monospace;
      font-size: 20px;
      padding: 10px;
      width: 90%;
      border-radius: 8px;
      background-color: ${t.inputBg};
      color: ${t.inputText};
      border: 1px solid ${t.inputBorder};
    }
    h1, h2, h3, h4, h5, h6 { line-height: 1.2; margin: 0; }
    .card-title { font-size: 2em; font-weight: 700; line-height: 1.2; }
    .card-subtitle { font-size: 1.5em; font-weight: 650; line-height: 1.2; }
    .cloze {
      border-radius: 5px;
      padding: 1px 4px;
      background-color: ${t.clozeBg};
      border-bottom: 2.5px solid ${t.clozeBorder};
      color: ${t.clozeText};
    }
    .io-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    .io-frame {
      position: relative;
      display: block;
      max-width: 100%;
      line-height: 0;
    }
    .io-frame img {
      display: block;
      max-width: 100%;
      max-height: 70vh;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .io-masks {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .io-mask {
      position: absolute;
      box-sizing: border-box;
    }
    .io-mask.target {
      background: #A7F3D0;
      border: 1px solid #34D399;
    }
    .io-mask.other {
      background: #FDE68A;
      border: 1px solid #FBBF24;
    }
    .io-check {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: 0;
      border: 0;
      opacity: 0;
    }
    .io-toggle {
      display: block;
      margin: 16px auto 0;
      line-height: 1.2;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid ${t.hr};
      color: ${t.text};
      font-size: 15px;
      cursor: pointer;
    }
    .io-check:checked ~ .io-toggle .io-hide { display: none; }
    .io-check:not(:checked) ~ .io-toggle .io-show { display: none; }
    .io-check:not(:checked) ~ .io-frame .io-masks { display: none; }
    ${darkOverrides}
  `;
}

export function cardDocument(bodyHtml, { dark = false, browse = false } = {}) {
  const theme = dark ? 'dark' : 'light';
  const night = dark ? ' night_mode nightMode' : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="${theme}">
  <style>${cardCss(theme, { browse })}</style>
</head>
<body class="${night.trim()}">
<div class="card${night}">
${bodyHtml || `<p>${escapeHtml('')}</p>`}
</div>
</body>
</html>`;
}
