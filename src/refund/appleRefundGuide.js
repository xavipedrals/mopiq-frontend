const ARTICLE_ID = '118223';

const DEFAULT_LOCALE = {
  en: 'en-us',
  es: 'es-es',
  pt: 'pt-br',
  fr: 'fr-fr',
  it: 'it-it',
  ja: 'ja-jp',
  de: 'de-de',
};

// Only locales Apple Support actually serves for this article.
// Unknown codes redirect to en-us, which drops the visitor's language.
const EXACT = {
  en: {
    AE: 'en-ae', AL: 'en-al', AM: 'en-am', AU: 'en-au', AZ: 'en-az',
    BH: 'en-bh', BN: 'en-bn', BW: 'en-bw', BY: 'en-by', CA: 'en-ca',
    EG: 'en-eg', GB: 'en-gb', GE: 'en-ge', GU: 'en-gu', GW: 'en-gw',
    HK: 'en-hk', IE: 'en-ie', IL: 'en-il', IN: 'en-in', IS: 'en-is',
    JO: 'en-jo', KE: 'en-ke', KG: 'en-kg', KW: 'en-kw', KZ: 'en-kz',
    LB: 'en-lb', LK: 'en-lk', MD: 'en-md', ME: 'en-me', MK: 'en-mk',
    MN: 'en-mn', MO: 'en-mo', MT: 'en-mt', MY: 'en-my', MZ: 'en-mz',
    NG: 'en-ng', NZ: 'en-nz', OM: 'en-om', PH: 'en-ph', QA: 'en-qa',
    SA: 'en-sa', SG: 'en-sg', TJ: 'en-tj', TM: 'en-tm', UG: 'en-ug',
    US: 'en-us', UZ: 'en-uz', VN: 'en-vn', ZA: 'en-za',
  },
  es: {
    AR: 'es-la', BO: 'es-la', CL: 'es-cl', CO: 'es-co', CR: 'es-la',
    CU: 'es-la', DO: 'es-la', EC: 'es-la', ES: 'es-es', GT: 'es-la',
    HN: 'es-la', MX: 'es-mx', NI: 'es-la', PA: 'es-la', PE: 'es-la',
    PR: 'es-la', PY: 'es-la', SV: 'es-la', US: 'es-us', UY: 'es-la',
    VE: 'es-la', 419: 'es-la',
  },
  pt: {
    AO: 'pt-pt', BR: 'pt-br', CV: 'pt-pt', GW: 'pt-pt', MZ: 'pt-pt',
    PT: 'pt-pt', ST: 'pt-pt', TL: 'pt-pt',
  },
  fr: {
    BE: 'fr-be', CA: 'fr-ca', CF: 'fr-cf', CH: 'fr-ch', CI: 'fr-ci',
    CM: 'fr-cm', FR: 'fr-fr', GN: 'fr-gn', GQ: 'fr-gq', LU: 'fr-lu',
    MA: 'fr-ma', MG: 'fr-mg', ML: 'fr-ml', MU: 'fr-mu', NE: 'fr-ne',
    SN: 'fr-sn', TN: 'fr-tn',
  },
  de: {
    AT: 'de-at', CH: 'de-ch', DE: 'de-de', LI: 'de-li', LU: 'de-lu',
  },
  it: {},
  ja: {},
};

function codes(list) {
  return new Set(list.trim().split(/\s+/));
}

// Regional pages used when Apple has no country-specific locale for that language.
// Countries with their own page live in EXACT and are omitted here.
const ENGLISH_GROUPS = [
  ['en-euro', codes(`
    AD AT AX BA BE BG CH CY CZ DE DK EE ES FI FO FR GI GR HR HU IT JE LI
    LT LU LV MC NL NO PL PT RO RS RU SE SI SK SM TR UA VA XK
  `)],
  ['en-asia', codes(`
    AF BD BT CN FJ ID JP KH KP KR LA MM MV NP PG PK TH TL TW
  `)],
  ['en-afri', codes(`
    AO BF BI BJ CD CF CG CI CM CV DJ DZ ER ET GA GH GM GN GQ LR LS LY MA
    MG ML MR MU MW NA NE RE RW SC SD SL SN SO SS ST SZ TD TG TN TZ YT ZM ZW
  `)],
  ['en-mide', codes('IQ IR PS SY YE')],
  ['en-la', codes(`
    AG AI AR AW BB BM BO BR BS BZ CL CO CR CU CW DM DO EC GD GF GP GT GY
    HN HT JM KN KY LC MQ MS MX NI PA PE PR PY SR SV SX TC TT UY VC VE VG VI
  `)],
];

const FRENCH_AFRICA = codes(`
  AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG ER ET GA GH GM GN GQ GW KE
  LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SL SN SO SS ST SZ
  TD TG TN TZ UG YT ZA ZM ZW
`);

function parseTag(tag) {
  const parts = String(tag || '').trim().replace(/_/g, '-').split('-').filter(Boolean);
  if (!parts.length) return null;
  const language = parts[0].toLowerCase();
  let region = '';
  for (const part of parts.slice(1)) {
    if (/^[A-Za-z]{2}$/.test(part)) {
      region = part.toUpperCase();
      break;
    }
    if (/^\d{3}$/.test(part)) {
      region = part;
      break;
    }
  }
  if (region === 'UK') region = 'GB';
  return { language, region };
}

function siteLanguage(language) {
  const parsed = parseTag(language);
  const code = parsed?.language || '';
  return DEFAULT_LOCALE[code] ? code : 'en';
}

function regionFromLocales(locales, language) {
  for (const tag of locales || []) {
    const parsed = parseTag(tag);
    if (parsed?.language === language && parsed.region) return parsed.region;
  }
  return '';
}

function anyRegion(locales) {
  for (const tag of locales || []) {
    const parsed = parseTag(tag);
    if (parsed?.region) return parsed.region;
  }
  return '';
}

function englishGroup(region) {
  for (const [locale, regions] of ENGLISH_GROUPS) {
    if (regions.has(region)) return locale;
  }
  return '';
}

export function appleSupportLocale({ language = 'en', country = '', browserLocales = [] } = {}) {
  const lang = siteLanguage(language);
  const parsedLanguage = parseTag(language);
  const explicit = country ? parseTag(`und-${country}`)?.region : '';
  const region = explicit
    || regionFromLocales(browserLocales, lang)
    || anyRegion(browserLocales)
    || (parsedLanguage?.language === lang ? parsedLanguage.region : '');

  if (region && EXACT[lang][region]) return EXACT[lang][region];
  if (lang === 'en' && region) {
    const grouped = englishGroup(region);
    if (grouped) return grouped;
  }
  if (lang === 'fr' && region && FRENCH_AFRICA.has(region)) return 'fr-afri';
  return DEFAULT_LOCALE[lang];
}

export function appleRefundGuideUrl(options) {
  return `https://support.apple.com/${appleSupportLocale(options)}/${ARTICLE_ID}`;
}
