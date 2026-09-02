import { stripHtml } from './cardHtml.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const RICH_MARKUP = /<(img|audio|video|table|iframe|style|cloze)\b|\{\{c\d+::|\[sound:/i;

export function htmlToEditorText(html) {
  const raw = String(html || '');
  if (!raw) return '';
  if (RICH_MARKUP.test(raw)) return raw;
  return stripHtml(raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'));
}

export function editorTextToHtml(text) {
  const trimmed = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!trimmed) return '';
  if (RICH_MARKUP.test(trimmed) || /<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function cardEditorFields(card) {
  const fields = card?.noteFields || [];
  return {
    front: htmlToEditorText(fields[0] || card?.question || ''),
    back: htmlToEditorText(fields[1] || card?.answer || ''),
  };
}

export function replaceFrontBackFields(card, frontHtml, backHtml) {
  const fields = Array.isArray(card?.noteFields) ? card.noteFields.slice() : [];
  while (fields.length < 2) fields.push('');
  fields[0] = frontHtml;
  fields[1] = backHtml;
  return fields;
}

export function cardHasRichMarkup(card) {
  const fields = card?.noteFields || [];
  const text = `${fields[0] || ''} ${fields[1] || ''} ${card?.question || ''} ${card?.answer || ''}`;
  return RICH_MARKUP.test(text);
}

export function cardContainsImage(card) {
  if (card?.hasImage) return true;
  const fields = card?.noteFields || [];
  const text = `${fields[0] || ''} ${fields[1] || ''} ${card?.question || ''} ${card?.answer || ''}`;
  return /<img\b/i.test(text);
}
