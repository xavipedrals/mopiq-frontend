export function mergeCatalog(base, overrides) {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeCatalog(base[key] || {}, value) : value;
  }
  return result;
}
