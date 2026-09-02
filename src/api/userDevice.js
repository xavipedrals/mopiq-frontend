import { supabase, supabaseAnonKey } from '../supabaseInit';
import { edgeFunctionUrl } from './functionsUrl';

const DEVICE_ID_KEY = 'mopiq-web-device-id';

function webDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return `web-${Date.now()}`;
  }
}

function browserModel() {
  const ua = navigator.userAgent || '';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return 'Browser';
}

function osVersion() {
  const platform = navigator.userAgentData?.platform;
  if (platform) return platform;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'web';
}

export async function registerWebDevice(accessToken) {
  const token = accessToken || (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return;
  await fetch(edgeFunctionUrl('upsert_user_device'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      deviceId: webDeviceId(),
      platform: 'web',
      model: browserModel(),
      osVersion: osVersion(),
      appVersion: 'web',
    }),
  });
}
