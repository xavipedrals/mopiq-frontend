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
  if (clean === '/delete-account') {
    return {
      title: 'Delete your account — Mopiq Flashcards',
      description: 'How to delete your Mopiq Flashcards account and associated data from the web or by email.',
      indexable: true,
      canonicalPath: '/delete-account',
    };
  }
  if (clean === '/delete-data') {
    return {
      title: 'Delete selected data — Mopiq Flashcards',
      description: 'How to request deletion of specific Mopiq Flashcards data while keeping your account.',
      indexable: true,
      canonicalPath: '/delete-data',
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
  if (clean === '/refund') {
    return {
      titleKey: 'seo.refundTitle',
      descriptionKey: 'seo.refundDescription',
      indexable: true,
      canonicalPath: '/refund',
    };
  }
  return {
    titleKey: 'seo.appTitle',
    descriptionKey: 'seo.homeDescription',
    indexable: false,
    canonicalPath: null,
  };
}
