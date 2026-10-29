import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPricingEnabledValue, shouldShowWebPricing, WEB_PRICING_CONFIG_KEY } from './visibility.js';

describe('web pricing switch', () => {
  it('shows the page only for the exact true value', () => {
    assert.equal(WEB_PRICING_CONFIG_KEY, 'web_pricing_enabled');
    assert.equal(isPricingEnabledValue('true'), true);
    assert.equal(isPricingEnabledValue('false'), false);
    assert.equal(isPricingEnabledValue(''), false);
    assert.equal(isPricingEnabledValue(null), false);
    assert.equal(isPricingEnabledValue(undefined), false);
    assert.equal(isPricingEnabledValue('TRUE'), false);
  });

  it('keeps pricing available on localhost and hidden in production until the switch is true', () => {
    assert.equal(shouldShowWebPricing('false', 'localhost'), true);
    assert.equal(shouldShowWebPricing(null, '127.0.0.1'), true);
    assert.equal(shouldShowWebPricing('false', 'mopiq.app'), false);
    assert.equal(shouldShowWebPricing('true', 'mopiq.app'), true);
    assert.equal(shouldShowWebPricing(undefined, 'www.mopiq.app'), false);
  });
});
