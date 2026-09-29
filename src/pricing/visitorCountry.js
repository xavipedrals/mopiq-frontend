const COUNTRY_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
];

export function countryFromHeaders(headers) {
  for (const name of COUNTRY_HEADERS) {
    const raw = headers[name] ?? headers[name.toLowerCase()];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== 'string') continue;
    const code = value.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) return code;
  }
  return null;
}
