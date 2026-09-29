import assert from 'node:assert/strict';
import test from 'node:test';
import { countryFromHeaders } from './visitorCountry.js';

test('reads a two-letter country header', () => {
  assert.equal(countryFromHeaders({ 'x-vercel-ip-country': 'de' }), 'DE');
});

test('ignores missing and non-country values', () => {
  assert.equal(countryFromHeaders({}), null);
  assert.equal(countryFromHeaders({ 'cf-ipcountry': 'OTHERS' }), null);
  assert.equal(countryFromHeaders({ 'x-vercel-ip-country': '' }), null);
});
