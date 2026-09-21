import {
  byteLength,
  CardHtmlTooLargeError,
  escapeHtmlText,
  MAX_CARD_FIELD_HTML_BYTES,
  noteModelIdForWebFields,
} from './sanitizeCardHtml.js';

export const MAX_SPREADSHEET_CHARS = 400_000;
export const MAX_SPREADSHEET_BYTES = 2 * 1024 * 1024;
export const MAX_SPREADSHEET_CARDS = 2_000;
export const SPREADSHEET_TAG = 'from-spreadsheet';

const HEADER_PAIRS = new Set([
  'term|definition',
  'terms|definitions',
  'question|answer',
  'questions|answers',
  'word|translation',
  'word|definition',
  'concepto|definición',
  'pregunta|respuesta',
  'termo|definição',
  'mot|définition',
  '用語|定義',
]);

const HEADER_TOKENS = new Set([
  'term', 'terms', 'definition', 'definitions',
  'question', 'answer', 'questions', 'answers',
  'word', 'translation', 'concepto', 'definición',
  'pregunta', 'respuesta', '用語', '定義',
  'termo', 'definição', 'mot', 'définition',
]);

export function defaultSpreadsheetSettings() {
  return {
    termDelimiter: 'tab',
    cardDelimiter: 'newLine',
    customTermDelimiter: '|',
    customCardDelimiter: '---',
    skipHeader: false,
  };
}

export function termSeparator(settings) {
  switch (settings.termDelimiter) {
    case 'tab': return '\t';
    case 'comma': return ',';
    case 'semicolon': return ';';
    case 'custom': return String(settings.customTermDelimiter || '');
    default: return '\t';
  }
}

export function cardSeparator(settings) {
  switch (settings.cardDelimiter) {
    case 'newLine': return '\n';
    case 'semicolon': return ';';
    case 'custom': return String(settings.customCardDelimiter || '');
    default: return '\n';
  }
}

export function detectSpreadsheetSettings(text) {
  return autoDetectSpreadsheet(text).settings;
}

export function autoDetectSpreadsheet(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return { settings: defaultSpreadsheetSettings(), cards: [], confidence: 0 };
  }

  let best = null;
  let bestScore = -Infinity;
  for (const candidate of candidateSettings(trimmed)) {
    const cards = parseSpreadsheet(trimmed, candidate);
    const score = scoreSettings(trimmed, candidate, cards);
    if (score > bestScore) {
      bestScore = score;
      best = {
        settings: candidate,
        cards,
        confidence: Math.min(1, Math.max(0, score / 100)),
      };
    }
  }
  return best || { settings: defaultSpreadsheetSettings(), cards: [], confidence: 0 };
}

export function parseSpreadsheet(text, settings = defaultSpreadsheetSettings()) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  const termSep = termSeparator(settings);
  const cardSep = cardSeparator(settings);
  if (!termSep || !cardSep) return [];

  const rows = splitCards(trimmed, cardSep, termSep);
  const dataRows = settings.skipHeader && rows.length ? rows.slice(1) : rows;
  const cards = [];
  for (const row of dataRows) {
    const fields = splitFields(row, termSep);
    if (fields.length < 2) continue;
    const question = String(fields[0] || '').trim();
    const answer = String(fields[1] || '').trim();
    if (!question || !answer) continue;
    cards.push({ question, answer, tags: [SPREADSHEET_TAG] });
  }
  return cards;
}

function candidateSettings(text) {
  let termCandidates = [
    { delimiter: 'tab', custom: '|' },
    { delimiter: 'comma', custom: '|' },
    { delimiter: 'semicolon', custom: '|' },
    { delimiter: 'custom', custom: '|' },
    { delimiter: 'custom', custom: ' - ' },
    { delimiter: 'custom', custom: '\t' },
  ];
  const sample = text.slice(0, 8_000);
  termCandidates = termCandidates.filter((candidate) => {
    const sep = termSeparator({
      termDelimiter: candidate.delimiter,
      customTermDelimiter: candidate.custom,
    });
    return sample.includes(sep);
  });
  if (!termCandidates.length) {
    termCandidates = [
      { delimiter: 'comma', custom: '|' },
      { delimiter: 'tab', custom: '|' },
      { delimiter: 'semicolon', custom: '|' },
    ];
  }

  const cardCandidates = [
    { delimiter: 'newLine', custom: '---' },
    { delimiter: 'semicolon', custom: '---' },
  ];

  const results = [];
  for (const term of termCandidates) {
    for (const card of cardCandidates) {
      const termSep = termSeparator({
        termDelimiter: term.delimiter,
        customTermDelimiter: term.custom,
      });
      const cardSep = cardSeparator({
        cardDelimiter: card.delimiter,
        customCardDelimiter: card.custom,
      });
      if (termSep === cardSep) continue;
      for (const skipHeader of [false, true]) {
        results.push({
          termDelimiter: term.delimiter,
          cardDelimiter: card.delimiter,
          customTermDelimiter: term.custom,
          customCardDelimiter: card.custom,
          skipHeader,
        });
      }
    }
  }
  return results;
}

function scoreSettings(text, settings, cards) {
  if (!cards.length) return -1;
  const termSep = termSeparator(settings);
  const cardSep = cardSeparator(settings);
  const rows = splitCards(text, cardSep, termSep);
  if (!rows.length) return -1;
  const dataRows = settings.skipHeader ? rows.slice(1) : rows;
  if (!dataRows.length) return -1;

  let twoFieldRows = 0;
  let multiFieldRows = 0;
  const fieldCounts = [];
  for (const row of dataRows) {
    const fields = splitFields(row, termSep)
      .map((field) => field.trim())
      .filter(Boolean);
    fieldCounts.push(fields.length);
    if (fields.length === 2) twoFieldRows += 1;
    else if (fields.length > 2) multiFieldRows += 1;
  }

  const coverage = twoFieldRows / dataRows.length;
  let score = cards.length * 8;
  score += coverage * 40;
  score -= multiFieldRows * 1.5;
  score += (cards.length / dataRows.length) * 25;

  const mode = mostCommon(fieldCounts);
  if (mode === 2 && fieldCounts.length) {
    const modeShare = fieldCounts.filter((count) => count === 2).length / fieldCounts.length;
    score += modeShare * 15;
  }

  const first = rows[0];
  if (first) {
    const looksLikeHeader = rowLooksLikeHeader(first, termSep);
    if (looksLikeHeader && settings.skipHeader) score += 18;
    else if (looksLikeHeader && !settings.skipHeader) score -= 18;
    else if (!looksLikeHeader && settings.skipHeader) score -= 10;
  }

  if (settings.cardDelimiter === 'newLine') score += 3;
  if (settings.termDelimiter === 'tab') score += 2;
  else if (settings.termDelimiter === 'comma') score += 1.5;
  else if (settings.termDelimiter === 'semicolon') score += 1;
  return score;
}

function rowLooksLikeHeader(row, termSeparatorValue) {
  const fields = splitFields(row, termSeparatorValue)
    .slice(0, 2)
    .map((field) => field.trim().toLowerCase());
  if (fields.length < 2) return false;
  if (HEADER_PAIRS.has(`${fields[0]}|${fields[1]}`)) return true;
  return HEADER_TOKENS.has(fields[0]) && HEADER_TOKENS.has(fields[1]);
}

function mostCommon(values) {
  if (!values.length) return null;
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  let best = null;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function splitCards(text, cardSep, termSep) {
  const normalized = cardSep === '\n'
    ? text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    : text;

  if (cardSep === '\n' && (termSep === ',' || termSep === ';')) {
    return splitCsvLines(normalized);
  }
  if (cardSep === '\n') {
    return normalized
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, ''))
      .filter(Boolean);
  }
  return splitBySeparator(normalized, cardSep)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitFields(row, separator) {
  if (separator === ',') return splitDelimitedFields(row, ',');
  if (separator === ';') return splitDelimitedFields(row, ';');
  if (separator.length === 1) {
    return row.split(separator).map((part) => unquote(part.trim()));
  }
  return splitBySeparator(row, separator).map((part) => unquote(part.trim()));
}

function splitBySeparator(text, separator) {
  if (!separator) return [text];
  const parts = [];
  let remaining = text;
  let index = remaining.indexOf(separator);
  while (index !== -1) {
    parts.push(remaining.slice(0, index));
    remaining = remaining.slice(index + separator.length);
    index = remaining.indexOf(separator);
  }
  parts.push(remaining);
  return parts;
}

function splitCsvLines(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      const trimmed = current.trim();
      if (trimmed) lines.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed) lines.push(trimmed);
  return lines;
}

function splitDelimitedFields(line, delimiter) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function unquote(value) {
  if (value.length < 2 || value[0] !== '"' || value[value.length - 1] !== '"') return value;
  return value.slice(1, -1).replace(/""/g, '"');
}

export function wrapSpreadsheetField(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  const escaped = escapeHtmlText(trimmed).replace(/\r\n|\r|\n/g, '<br>');
  const html = `<p>${escaped}</p>`;
  if (byteLength(html) > MAX_CARD_FIELD_HTML_BYTES) throw new CardHtmlTooLargeError();
  return html;
}

export function spreadsheetCardFields(card) {
  const fields = [wrapSpreadsheetField(card.question), wrapSpreadsheetField(card.answer)];
  return {
    fields,
    noteModelId: noteModelIdForWebFields(fields),
  };
}

export function decodeSpreadsheetBytes(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('iso-8859-1').decode(bytes);
  }
}

export function deckNameFromFilename(name) {
  const base = String(name || '')
    .replace(/^.*[/\\]/, '')
    .replace(/\.[^.]+$/, '')
    .trim();
  return base.slice(0, 120);
}

export function assertSpreadsheetLimits(text, cards) {
  const raw = String(text || '');
  if (raw.length > MAX_SPREADSHEET_CHARS) {
    const error = new Error('spreadsheet_too_large');
    error.code = 'spreadsheet_too_large';
    throw error;
  }
  if (!Array.isArray(cards) || cards.length === 0) {
    const error = new Error('no_spreadsheet_cards');
    error.code = 'no_spreadsheet_cards';
    throw error;
  }
  if (cards.length > MAX_SPREADSHEET_CARDS) {
    const error = new Error('spreadsheet_too_many');
    error.code = 'spreadsheet_too_many';
    throw error;
  }
}

export { CardHtmlTooLargeError };
