import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seoForPath } from './seoPaths.js';

describe('seoForPath', () => {
  it('indexes the public marketing pages', () => {
    assert.equal(seoForPath('/').indexable, true);
    assert.equal(seoForPath('/').titleKey, 'seo.homeTitle');
    assert.equal(seoForPath('/privacy').canonicalPath, '/privacy');
    assert.equal(seoForPath('/terms').titleKey, 'seo.termsTitle');
  });

  it('keeps app and stub pages out of search results', () => {
    assert.equal(seoForPath('/decks').indexable, false);
    assert.equal(seoForPath('/decks/abc/study').indexable, false);
    assert.equal(seoForPath('/profile').indexable, false);
    assert.equal(seoForPath('/about').indexable, false);
    assert.equal(seoForPath('/missing').canonicalPath, null);
  });
});
