import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test as base, expect, type APIRequestContext, type Page, type Response } from '@playwright/test';

// Read the same public client configuration as the application. No admin keys.
const firebaseSource = readFileSync(new URL('../../src/firebaseInit.js', import.meta.url), 'utf8');
const supabaseSource = readFileSync(new URL('../../src/supabaseInit.js', import.meta.url), 'utf8');
function requiredMatch(source: string, pattern: RegExp): string {
  const value = source.match(pattern)?.[1];
  if (!value) throw new Error('Could not read the app public authentication configuration');
  return value;
}
const firebaseKey = requiredMatch(firebaseSource, /apiKey:\s*["']([^"']+)/);
const projectID = requiredMatch(firebaseSource, /projectId:\s*["']([^"']+)/);
const supabaseURL = requiredMatch(supabaseSource, /supabaseUrl\s*=\s*["']([^"']+)/);
const supabaseKey = requiredMatch(supabaseSource, /supabaseAnonKey\s*=\s*["']([^"']+)/);
const firebaseEndpoint = (operation: string) => `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${firebaseKey}`;

export class DisposableAccount {
  readonly name = 'Playwright New User';
  readonly email = `mopiq-playwright-${Date.now()}-${randomUUID()}@example.com`;
  readonly password = `Pw!${randomUUID()}a9`;
  firebaseUID = '';
  supabaseUID = '';
  firebaseDeleted = false;
  supabaseDeleted = false;
  createdDeckName = '';
  cleanupMethod = 'account-api';
  private firebaseToken = '';
  private supabaseToken = '';
  private pending: Promise<void>[] = [];

  constructor(private request: APIRequestContext) {}

  observe = (response: Response) => {
    const url = response.url();
    if (!response.ok() || response.request().method() === 'OPTIONS') return;
    if (/identitytoolkit\.googleapis\.com\/v1\/accounts:signUp\?/.test(url)) {
      this.pending.push(response.json().then(data => {
        if (data.email !== this.email) return;
        this.firebaseUID = data.localId;
        this.firebaseToken = data.idToken;
      }));
    } else if (url === `https://us-central1-${projectID}.cloudfunctions.net/getSupabaseTokensV1`) {
      this.pending.push(response.json().then(data => {
        const session = data.result || data.data;
        if (session?.access_token) {
          this.supabaseToken = session.access_token;
          this.supabaseUID = session.supabase_uid;
        }
      }));
    } else if (/identitytoolkit\.googleapis\.com\/v1\/accounts:delete\?/.test(url)) {
      this.firebaseDeleted = true;
    } else if (url.includes('/functions/v1/delete_current_user') && response.request().method() === 'DELETE') {
      this.supabaseDeleted = true;
    }
  };

  async ready() {
    await Promise.all(this.pending);
    expect(this.firebaseUID, 'Signup must create a Firebase user').not.toBe('');
    expect(this.supabaseUID, 'Signup must create the Supabase account/session').not.toBe('');
  }

  async cleanup() {
    await Promise.all(this.pending);
    if (!this.firebaseUID) return;
    // A failed signup bridge may still have created a Supabase user. Resolve its
    // identity before removing Firebase, while the original ID token still works.
    if (!this.supabaseToken && !this.firebaseDeleted) {
      const bridge = await this.request.post(`https://us-central1-${projectID}.cloudfunctions.net/getSupabaseTokensV1`, {
        headers: { Authorization: `Bearer ${this.firebaseToken}` }, data: { data: {} },
      });
      if (!bridge.ok()) throw new Error(`Cleanup could not resolve Supabase identity for test account ${this.email}`);
      const data = await bridge.json();
      const session = data.result || data.data;
      this.supabaseToken = session?.access_token || '';
      this.supabaseUID = session?.supabase_uid || '';
      if (!this.supabaseToken) throw new Error(`Cleanup received no Supabase session for ${this.email}`);
    }
    if (!this.firebaseDeleted) {
      const response = await this.request.post(firebaseEndpoint('delete'), { data: { idToken: this.firebaseToken } });
      if (!response.ok()) throw new Error(`Cleanup could not delete Firebase test account ${this.firebaseUID}`);
      this.firebaseDeleted = true;
    }
    if (this.supabaseToken && !this.supabaseDeleted) {
      const response = await this.request.delete(`${supabaseURL}/functions/v1/delete_current_user`, {
        headers: { Authorization: `Bearer ${this.supabaseToken}`, apikey: supabaseKey },
      });
      if (!response.ok()) {
        const data = await response.json().catch(() => ({}));
        if (process.env.E2E_CLEANUP_PROJECT_DIR) await this.cleanupPrivateTestData();
        else throw new Error(`Cleanup could not delete Supabase test account ${this.supabaseUID}: HTTP ${response.status()} (${data.code || data.error || data.message || 'unknown error'})`);
      }
      this.supabaseDeleted = true;
    }
    await this.verifyDeleted();
  }

  private async cleanupPrivateTestData() {
    // Explicit opt-in for a developer's linked Supabase CLI. This is teardown
    // only: it must never turn a failing account-deletion assertion green.
    if (!/^mopiq-playwright-\d+-[a-f0-9-]+@example\.com$/.test(this.email)
      || !/^[a-f0-9-]{36}$/.test(this.supabaseUID)
      || !/^Playwright first deck \d+$/.test(this.createdDeckName)) {
      throw new Error('Refusing database cleanup for an unrecognized test identity');
    }
    const sql = `begin;
      do $$ begin
        if not exists (select 1 from auth.users where id = '${this.supabaseUID}' and email = '${this.email}' and created_at > now() - interval '2 hours') then
          raise exception 'Refusing cleanup: disposable account identity did not match';
        end if;
        if exists (select 1 from public.deck_versions where creator_id = '${this.supabaseUID}' and (name <> '${this.createdDeckName}' or is_shared or is_premade)) then
          raise exception 'Refusing cleanup: account owns unexpected or shared content';
        end if;
      end $$;
      delete from public.deck_versions where creator_id = '${this.supabaseUID}' and name = '${this.createdDeckName}' and not is_shared and not is_premade;
      delete from auth.users where id = '${this.supabaseUID}' and email = '${this.email}';
      commit;`;
    try {
      await promisify(execFile)('supabase', ['db', 'query', '--linked', sql], {
        cwd: process.env.E2E_CLEANUP_PROJECT_DIR, timeout: 45_000,
      });
      this.cleanupMethod = 'database-fallback';
    } catch {
      throw new Error(`Scoped database cleanup failed for disposable account ${this.supabaseUID}`);
    }
  }

  async verifyDeleted() {
    const firebase = await this.request.post(firebaseEndpoint('lookup'), { data: { idToken: this.firebaseToken } });
    const firebaseData = await firebase.json();
    if (firebase.ok() && firebaseData.users?.length) throw new Error(`Firebase test account still exists: ${this.firebaseUID}`);
    expect(firebaseData.error?.message).toMatch(/USER_NOT_FOUND|INVALID_ID_TOKEN/);
    if (this.supabaseToken) {
      const supabase = await this.request.get(`${supabaseURL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${this.supabaseToken}`, apikey: supabaseKey },
      });
      expect([401, 403], 'Deleted Supabase account must no longer authenticate').toContain(supabase.status());
    }
  }

  summary() {
    return { email: this.email, firebaseUID: this.firebaseUID, supabaseUID: this.supabaseUID, firebaseDeleted: this.firebaseDeleted, supabaseDeleted: this.supabaseDeleted, cleanupMethod: this.cleanupMethod };
  }
}

export const test = base.extend<{ account: DisposableAccount }>({
  account: [async ({ page, request }, use, testInfo) => {
    const account = new DisposableAccount(request);
    page.on('response', account.observe);
    try { await use(account); }
    finally {
      try { await account.cleanup(); }
      finally {
        page.off('response', account.observe);
        await testInfo.attach('disposable-account-cleanup', { body: JSON.stringify(account.summary(), null, 2), contentType: 'application/json' });
      }
    }
  }, { timeout: 90_000 }],
});

export async function prepareNewVisitor(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('mopiq-language', 'en');
    localStorage.setItem('mopiq-theme', 'light');
    localStorage.setItem('mopiq-analytics-consent', 'denied');
  });
}

export { expect };
