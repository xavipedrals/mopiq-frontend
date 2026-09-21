// Keep in sync with anki-supabase-local/supabase/functions/_shared/sanitizeCardHtml.js
export const MAX_CARD_FIELD_HTML_BYTES = 100_000;
export const WEB_QA_NOTE_MODEL_ID = '777000001';
export const WEB_CLOZE_NOTE_MODEL_ID = '777000002';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a', 'img', 'hr', 'blockquote', 'code',
]);
const VOID_TAGS = new Set(['br', 'img', 'hr']);
const SKIP_SUBTREE_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math',
  'link', 'meta', 'audio', 'video', 'source', 'textarea', 'noscript',
]);
const ALLOWED_ALIGN = new Set(['left', 'center', 'right', 'justify']);
const CLOZE_CLASS = new Set(['cloze', 'anki-cloze']);

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
};

export class CardHtmlTooLargeError extends Error {
  constructor() {
    super('Card text is too long');
    this.name = 'CardHtmlTooLargeError';
  }
}

export function byteLength(value) {
  return new TextEncoder().encode(String(value || '')).length;
}

export function decodeHtmlEntities(value) {
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity) => {
    const key = String(entity || '');
    if (key[0] === '#') {
      const hex = key[1] === 'x' || key[1] === 'X';
      const num = Number.parseInt(hex ? key.slice(2) : key.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(num) || num < 0) return '';
      if (num === 0 || (num >= 0xD800 && num <= 0xDFFF) || num > 0x10FFFF) return '';
      try {
        return String.fromCodePoint(num);
      } catch {
        return '';
      }
    }
    return NAMED_ENTITIES[key.toLowerCase()] ?? full;
  });
}

export function escapeHtmlText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hasC0Controls(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function isLocalMediaFilename(src) {
  const value = decodeHtmlEntities(String(src || '')).trim();
  if (!value || value.length > 180) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  if (value.includes('/') || value.includes('\\') || value.includes('..')) return false;
  if (hasC0Controls(value)) return false;
  if (value.includes('?') || value.includes('#') || value.includes('%00')) return false;
  return true;
}

export function containsClozeMarkup(html) {
  const text = String(html || '');
  return /\{\{c\d+::/i.test(text) || /class\s*=\s*["'][^"']*\banki-cloze\b/i.test(text);
}

export function normalizeClozesToC1(html) {
  return String(html || '').replace(/\{\{c\d+::/gi, '{{c1::');
}

export function editorHtmlToStored(html) {
  const withClozes = String(html || '').replace(
    /<span\b[^>]*class\s*=\s*["'][^"']*\banki-cloze\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner) => `{{c1::${String(inner).replace(/\}\}/g, '')}}}`,
  );
  return normalizeClozesToC1(withClozes);
}

export function storedHtmlToEditor(html) {
  return String(html || '').replace(/\{\{c\d+::([\s\S]*?)\}\}/g, (_, inner) => {
    const split = inner.lastIndexOf('::');
    const text = split === -1 ? inner : inner.slice(0, split);
    return `<span class="anki-cloze">${text}</span>`;
  });
}

function isSafeCssColor(value) {
  const v = String(value || '').trim().toLowerCase();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return true;
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(v)) return true;
  if (/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|1|0?\.\d+)\s*\)$/i.test(v)) return true;
  return false;
}

function sanitizeStyle(style) {
  const allowed = [];
  for (const part of String(style || '').split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!value || /expression|url\s*\(|javascript|behavior|@import/i.test(value)) continue;
    if ((prop === 'color' || prop === 'background-color') && isSafeCssColor(value)) {
      allowed.push(`${prop}: ${value}`);
    } else if (prop === 'text-align' && ALLOWED_ALIGN.has(value.toLowerCase())) {
      allowed.push(`${prop}: ${value.toLowerCase()}`);
    }
  }
  return allowed.join('; ');
}

function sanitizeClassList(tag, className) {
  if (tag !== 'span') return '';
  return String(className || '')
    .split(/\s+/)
    .filter((name) => CLOZE_CLASS.has(name))
    .join(' ');
}

function sanitizeHref(href) {
  const value = decodeHtmlEntities(href).trim();
  if (/^https:\/\//i.test(value) || /^http:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      if (url.username || url.password) return '';
      return url.toString();
    } catch {
      return '';
    }
  }
  if (/^mailto:[^\s<>]+$/i.test(value) && !hasC0Controls(value)) {
    return value;
  }
  return '';
}

function parseAttributes(raw) {
  const attrs = {};
  const input = String(raw || '');
  const re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = re.exec(input))) {
    const name = match[1].toLowerCase();
    if (name.startsWith('on') || name === 'srcset' || (name.startsWith('data-') && name !== 'data-filename')) {
      continue;
    }
    attrs[name] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function serializeAttributes(tag, attrs) {
  const out = [];
  if (tag === 'a') {
    const href = sanitizeHref(attrs.href || '');
    if (!href) return null;
    out.push(`href="${escapeHtmlText(href)}"`);
    out.push('rel="noopener noreferrer"');
    out.push('target="_blank"');
  }
  if (tag === 'img') {
    const src = isLocalMediaFilename(attrs.src || attrs['data-filename'] || '')
      ? decodeHtmlEntities(attrs.src || attrs['data-filename']).trim()
      : '';
    if (!src) return null;
    out.push(`src="${escapeHtmlText(src)}"`);
    if (attrs.alt) out.push(`alt="${escapeHtmlText(attrs.alt.slice(0, 200))}"`);
  }
  const className = sanitizeClassList(tag, attrs.class || '');
  if (className) out.push(`class="${escapeHtmlText(className)}"`);
  const style = sanitizeStyle(attrs.style || '');
  if (style) out.push(`style="${escapeHtmlText(style)}"`);
  return out;
}

function skipUntil(html, start, closer) {
  const idx = html.toLowerCase().indexOf(closer, start);
  return idx === -1 ? html.length : idx + closer.length;
}

export function sanitizeCardHtml(input, { maxBytes = MAX_CARD_FIELD_HTML_BYTES } = {}) {
  const html = String(input || '').split('\0').join('');
  if (byteLength(html) > maxBytes) throw new CardHtmlTooLargeError();

  let i = 0;
  let out = '';
  const stack = [];

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += escapeHtmlText(html.slice(i));
      break;
    }
    if (lt > i) out += escapeHtmlText(html.slice(i, lt));

    const rest = html.slice(lt);
    const comment = /^<!--[\s\S]*?-->/.exec(rest);
    if (comment) {
      i = lt + comment[0].length;
      continue;
    }
    if (/^<!\[cdata\[/i.test(rest) || /^<!doctype/i.test(rest) || /^<\?/i.test(rest)) {
      const close = rest.indexOf('>');
      i = close === -1 ? html.length : lt + close + 1;
      continue;
    }

    const closeMatch = /^<\/([a-zA-Z][a-zA-Z0-9:-]*)\s*>/.exec(rest);
    if (closeMatch) {
      const tag = closeMatch[1].toLowerCase();
      i = lt + closeMatch[0].length;
      const idx = stack.lastIndexOf(tag);
      if (idx !== -1 && ALLOWED_TAGS.has(tag) && !VOID_TAGS.has(tag)) {
        while (stack.length > idx) {
          const open = stack.pop();
          out += `</${open}>`;
        }
      }
      continue;
    }

    const openMatch = /^<([a-zA-Z][a-zA-Z0-9:-]*)\b([^>]*?)(\/?)>/.exec(rest);
    if (!openMatch) {
      out += '&lt;';
      i = lt + 1;
      continue;
    }

    const tag = openMatch[1].toLowerCase();
    const rawAttrs = openMatch[2];
    const selfClosing = Boolean(openMatch[3]) || VOID_TAGS.has(tag);
    i = lt + openMatch[0].length;

    if (SKIP_SUBTREE_TAGS.has(tag)) {
      if (!selfClosing) i = skipUntil(html, i, `</${tag}`);
      if (!selfClosing) {
        const gt = html.indexOf('>', i);
        i = gt === -1 ? html.length : gt + 1;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) continue;

    const attrs = parseAttributes(rawAttrs);
    const serialized = serializeAttributes(tag, attrs);
    if (serialized == null) continue;

    const attrText = serialized.length ? ` ${serialized.join(' ')}` : '';
    if (VOID_TAGS.has(tag) || selfClosing) {
      out += `<${tag}${attrText}>`;
      continue;
    }
    out += `<${tag}${attrText}>`;
    stack.push(tag);
  }

  while (stack.length) out += `</${stack.pop()}>`;
  if (byteLength(out) > maxBytes) throw new CardHtmlTooLargeError();
  return out;
}

export function sanitizeCardFields(fields, options) {
  return (Array.isArray(fields) ? fields : []).map((field) => sanitizeCardHtml(field, options));
}

export function htmlLooksEmpty(html) {
  const raw = String(html || '');
  if (/<img\b/i.test(raw) || containsClozeMarkup(raw)) return false;
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return !text;
}

export function fieldsHaveImage(fields) {
  return (Array.isArray(fields) ? fields : []).some((field) => /<img\b/i.test(String(field || '')));
}

export function noteModelIdForWebFields(fields) {
  const joined = (Array.isArray(fields) ? fields : []).join('\n');
  return containsClozeMarkup(joined) ? WEB_CLOZE_NOTE_MODEL_ID : WEB_QA_NOTE_MODEL_ID;
}
