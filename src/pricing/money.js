const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'CLP']);

export function amountFromLowestUnit(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return ZERO_DECIMAL.has(currency) ? value : value / 100;
}

export function formatMoney(amount, currency, locale) {
  if (amount == null || !currency) return '';
  const language = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en');
  return new Intl.NumberFormat(language, { style: 'currency', currency }).format(amount);
}

/** Monthly equivalent of a yearly charge, formatted. Empty when the yearly total is missing or zero. */
export function yearlyMonthlyEquivalent(yearLowest, currency, locale) {
  const year = amountFromLowestUnit(yearLowest, currency);
  if (year == null || year <= 0) return '';
  return formatMoney(year / 12, currency, locale);
}

/** Whole-number percent saved by paying yearly instead of 12 monthly charges. Null when yearly is not cheaper. */
export function yearlySavingsPercent(monthLowest, yearLowest, currency) {
  const month = amountFromLowestUnit(monthLowest, currency);
  const year = amountFromLowestUnit(yearLowest, currency);
  if (month == null || year == null || month <= 0 || year <= 0) return null;
  const percent = Math.round((1 - year / (month * 12)) * 100);
  return percent > 0 ? percent : null;
}
