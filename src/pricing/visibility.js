import { isLocalDebugHost } from '../debug/flags.js';

export const WEB_PRICING_CONFIG_KEY = 'web_pricing_enabled';

export function isPricingEnabledValue(value) {
  return value === 'true';
}

/** Localhost always shows pricing. Production shows it only when the switch is exactly "true". */
export function shouldShowWebPricing(value, hostname) {
  if (isLocalDebugHost(hostname)) return true;
  return isPricingEnabledValue(value);
}

let pending;

export function loadWebPricingEnabled() {
  if (isLocalDebugHost()) return Promise.resolve(true);
  if (!pending) {
    pending = import('../supabaseInit.js').then(({ supabase }) => supabase
      .from('app_config')
      .select('value')
      .eq('key', WEB_PRICING_CONFIG_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return false;
        return shouldShowWebPricing(data.value);
      }))
      .catch(() => false);
  }
  return pending;
}
