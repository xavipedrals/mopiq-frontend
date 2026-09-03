export function seoForPath(path) {
  const clean = String(path || '/').split('?')[0] || '/';
  if (clean === '/') {
    return {
      titleKey: 'seo.homeTitle',
      descriptionKey: 'seo.homeDescription',
      indexable: true,
      canonicalPath: '/',
    };
  }
  if (clean === '/privacy') {
    return {
      titleKey: 'seo.privacyTitle',
      descriptionKey: 'seo.privacyDescription',
      indexable: true,
      canonicalPath: '/privacy',
    };
  }
  if (clean === '/terms') {
    return {
      titleKey: 'seo.termsTitle',
      descriptionKey: 'seo.termsDescription',
      indexable: true,
      canonicalPath: '/terms',
    };
  }
  return {
    titleKey: 'seo.appTitle',
    descriptionKey: 'seo.homeDescription',
    indexable: false,
    canonicalPath: null,
  };
}
