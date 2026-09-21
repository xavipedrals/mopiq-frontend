import { WEB_CLOZE_NOTE_MODEL_ID, WEB_QA_NOTE_MODEL_ID } from '../study/sanitizeCardHtml.js';
import { getDeckTopicByPostgresId } from '../utils.js';

export const MAX_DECK_NAME_LENGTH = 120;
export const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const NOTE_CSS = `div{
 line-height:1.5;
 font-size:14pt;
}
p{
 margin-block-start:0 !important;
 margin-block-end:0 !important;
}
h1,h2,h3{
 line-height:1.2;
}
table{overflow-x:scroll}
th,td{max-width:200px;min-width:50px}
table,td,th{border-collapse:collapse;border:1px solid #777}
td{padding:5px 10px;height:35px}`;

function encodeCrockford(value, length) {
  let remaining = value;
  const chars = Array(length);
  for (let i = length - 1; i >= 0; i -= 1) {
    chars[i] = CROCKFORD[Number(remaining & 31n)];
    remaining >>= 5n;
  }
  if (remaining !== 0n) throw new Error('ulid overflow');
  return chars.join('');
}

export function encodeUlid(ms, randomBytes) {
  const time = BigInt(Math.floor(Number(ms)));
  if (time < 0n) throw new Error('invalid ulid time');
  const bytes = randomBytes instanceof Uint8Array ? randomBytes : new Uint8Array(randomBytes);
  if (bytes.length !== 10) throw new Error('ulid random must be 10 bytes');
  let entropy = 0n;
  for (const byte of bytes) entropy = (entropy << 8n) | BigInt(byte);
  return encodeCrockford(time, 10) + encodeCrockford(entropy, 16);
}

export function createUlid(now = Date.now()) {
  const random = new Uint8Array(10);
  crypto.getRandomValues(random);
  return encodeUlid(now, random);
}

function field(name, ord) {
  return { ord, font: '', name };
}

function template({ name, qfmt, afmt }) {
  return {
    ord: 0,
    name,
    qfmt,
    afmt,
    bqfmt: '',
    bafmt: '',
  };
}

function noteModel({ id, name, type, did, fields, tmpls }) {
  return {
    id,
    name,
    type,
    did,
    css: NOTE_CSS,
    req: [],
    flds: fields,
    tmpls,
  };
}

export function emptyDeckNoteModels(ankiDeckId) {
  const did = Number(ankiDeckId);
  const qaId = Number(WEB_QA_NOTE_MODEL_ID);
  const clozeId = Number(WEB_CLOZE_NOTE_MODEL_ID);
  return {
    [String(qaId)]: noteModel({
      id: qaId,
      name: 'ankiFlashcardsBrandedDefault',
      type: 0,
      did,
      fields: [field('Question', 0), field('Answer', 1)],
      tmpls: [template({
        name: 'ankiFlashcardsBrandedDefault',
        qfmt: '{{Question}}',
        afmt: '{{FrontSide}}\n<hr id=answer>\n{{Answer}}',
      })],
    }),
    [String(clozeId)]: noteModel({
      id: clozeId,
      name: 'mopiqCloze',
      type: 1,
      did,
      fields: [field('Text', 0), field('Back Extra', 1)],
      tmpls: [template({
        name: 'mopiqCloze',
        qfmt: '{{cloze:Text}}',
        afmt: '{{FrontSide}}\n<hr id=answer>\n{{Back Extra}}',
      })],
    }),
  };
}

export function emptyDeckCreatePayload({
  name,
  topic,
  now = Date.now(),
  firebaseId,
} = {}) {
  const trimmed = String(name || '').trim().slice(0, MAX_DECK_NAME_LENGTH);
  if (!trimmed) {
    const error = new Error('deck_name_required');
    error.code = 'deck_name_required';
    throw error;
  }
  const resolvedTopic = getDeckTopicByPostgresId(topic);
  const ankiDeckId = Math.floor(Number(now));
  const id = firebaseId || createUlid(now);
  return {
    id,
    name: trimmed,
    topic: resolvedTopic.imageName,
    decks: {
      [String(ankiDeckId)]: {
        id: ankiDeckId,
        name: trimmed,
        desc: '',
        conf: 1,
      },
    },
    noteModels: emptyDeckNoteModels(ankiDeckId),
    cardCount: 0,
    createdAt: new Date(now).toISOString(),
    contentMode: 'postgres',
    contentMode2: 'postgres',
    cardIdScheme: 'uuidv7',
  };
}
