import { SITE_URL } from './constants';
import { t, localeTag } from './i18n';
import { seoForPath } from './seoPaths';

const OG_IMAGE = `${SITE_URL}/marketing/hero-sync.png`;
const FAQ_PAIRS = [
  ['faqFreeQ', 'faqFreeA'],
  ['faqSrsQ', 'faqSrsA'],
  ['faqWebQ', 'faqWebA'],
  ['faqEditQ', 'faqEditA'],
];

function upsertMeta(attr, key, content) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(id);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function applySeo(route) {
  if (typeof document === 'undefined') return;
  const path = route?.path || '/';
  const spec = seoForPath(path);
  const title = t(spec.titleKey);
  const description = t(spec.descriptionKey);
  const canonical = spec.canonicalPath == null
    ? null
    : `${SITE_URL}${spec.canonicalPath === '/' ? '/' : spec.canonicalPath}`;

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', spec.indexable ? 'index,follow' : 'noindex,nofollow');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonical || `${SITE_URL}/`);
  upsertMeta('property', 'og:image', OG_IMAGE);
  upsertMeta('property', 'og:locale', localeTag());
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', OG_IMAGE);
  upsertLink('canonical', canonical);

  if (spec.canonicalPath === '/') {
    upsertJsonLd('mopiq-faq-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_PAIRS.map(([q, a]) => ({
        '@type': 'Question',
        name: t(`home.${q}`),
        acceptedAnswer: { '@type': 'Answer', text: t(`home.${a}`) },
      })),
    });
  } else {
    upsertJsonLd('mopiq-faq-jsonld', null);
  }
}
