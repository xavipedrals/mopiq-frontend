import { ANKI_DAY_STARTS_AT_HOUR } from '../constants';

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function supposedDayStart(date) {
  const start = startOfLocalDay(date);
  start.setHours(start.getHours() + ANKI_DAY_STARTS_AT_HOUR);
  return start;
}

export function ankiDayStart(date = new Date()) {
  const supposed = supposedDayStart(date);
  if (supposed <= date) return supposed;
  return new Date(supposed.getTime() - 24 * 3600 * 1000);
}

export function ankiDayEndExclusive(date = new Date()) {
  return new Date(ankiDayStart(date).getTime() + 24 * 3600 * 1000);
}

export function ankiDayString(date = new Date()) {
  const start = ankiDayStart(date);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameAnkiDay(a, b) {
  return ankiDayStart(a).getTime() === ankiDayStart(b).getTime();
}

export function toIso(date) {
  return new Date(date).toISOString();
}

export function studyDayWireFields(date = new Date()) {
  return {
    start: toIso(ankiDayStart(date)),
    end: toIso(ankiDayEndExclusive(date)),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}
