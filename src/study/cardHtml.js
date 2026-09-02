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

function cardCss(theme) {
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
    h1, h2, h3, h4, h5, h6 { color: ${t.heading}; }
    p, div, li, ol, ul { color: ${t.text}; }
    a { color: ${t.link}; }
    img { background-color: white; }
    `
    : '';
  return `
    html, body { margin: 0; padding: 0; background: ${t.background}; height: 100%; }
    body {
      font-family: system-ui, -apple-system, "Helvetica Neue", sans-serif;
      font-size: 22px;
      line-height: 1.45;
      color: ${t.text};
      padding: 8px 4px;
      word-wrap: break-word;
      box-sizing: border-box;
    }
    .card {
      width: 100%;
      box-sizing: border-box;
    }
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
    .cloze {
      border-radius: 5px;
      padding: 1px 4px;
      background-color: ${t.clozeBg};
      border-bottom: 2.5px solid ${t.clozeBorder};
      color: ${t.clozeText};
    }
    ${darkOverrides}
  `;
}

export function cardDocument(bodyHtml, { dark = false } = {}) {
  const theme = dark ? 'dark' : 'light';
  const night = dark ? ' night_mode nightMode' : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="${theme}">
  <style>${cardCss(theme)}</style>
</head>
<body class="${night.trim()}">
<div class="card${night}">
${bodyHtml || `<p>${escapeHtml('')}</p>`}
</div>
</body>
</html>`;
}

export function frontHtml(card, mediaMap) {
  return fieldHtml(card, 0, mediaMap);
}

export function backHtml(card, mediaMap, { dark = false } = {}) {
  const back = fieldHtml(card, 1, mediaMap);
  const front = fieldHtml(card, 0, mediaMap);
  if (!back) return front;
  if (front && back.indexOf(front) === -1) {
    const hr = CARD_THEME[dark ? 'dark' : 'light'].hr;
    return `${front}<hr style="border:none;border-top:1px solid ${hr};margin:18px 0;">${back}`;
  }
  return back;
}
