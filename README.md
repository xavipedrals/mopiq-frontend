# Mopiq web

Vite + Vue 3. TypeScript is enabled with `allowJs`, so existing `.js` / `.vue` files keep working; convert modules to `.ts` as you touch them.

## Setup

```
npm install
```

## Develop

```
npm run dev
```

`npm run serve` is the same command (kept for old muscle memory). Dev server defaults to http://localhost:8080/.

## Build

```
npm run build
firebase deploy
```

## Typecheck / lint

```
npm run type-check
npm run lint
```

## Browser tests

Install the browser once, then run the public signup smoke test:

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts the local Vite server on port 4173. To use an already deployed
website, set `E2E_BASE_URL=https://your-website.example`. To use an installed Chrome
instead of downloading Chromium, set `PLAYWRIGHT_CHANNEL=chrome`.

The live account test requires an explicit flag because it creates real accounts
in the Firebase/Supabase backend configured by the website:

```sh
E2E_LIVE_ACCOUNTS=1 \
E2E_CLEANUP_PROJECT_DIR=/absolute/path/to/anki-supabase-local \
npm run test:e2e:live
```

It starts on the main page, registers a unique `mopiq-playwright-…@example.com`
account with a generated password, creates a first deck/card, completes the
first-study tutorial and one review, then deletes the account through Settings.
The website currently has no separate onboarding questionnaire; this test covers
the actual first-use experience available on the web.

The test fixture cleans up through the same Firebase and Supabase deletion APIs
if a step fails, verifies that neither identity can authenticate afterward, and
attaches a cleanup summary to the report. No admin credentials or existing users
are used by the normal flow. A force-killed process cannot run teardown; the unique email and IDs in
a cleanup error identify the disposable account if manual cleanup is needed.
While the known account-deletion regression below exists, the full live test
requires `E2E_CLEANUP_PROJECT_DIR` before it creates an account. This opts in to a
teardown fallback through an authenticated, linked Supabase CLI. It only removes the newly created
account and its named private test deck, refuses unexpected/shared content, and
does not suppress the failing account-deletion assertion. This is data cleanup,
not a migration or deployment.

Live auth tokens/passwords stay in memory: traces and video are disabled for the
live project. Screenshots and reports are ignored by Git.

```sh
npm run test:e2e:ui
npm run test:e2e:report
```

GitHub Actions runs the existing unit tests and the public browser smoke test on
pull requests and pushes to main/master. It does not run the real-account test.
See the [Playwright documentation](https://playwright.dev/docs/intro) for the test
runner and browser tooling.

Known live regression found during setup: `delete_current_user` cannot delete a
Supabase account that still owns a deck because `deck_versions_creator_id_fkey`
blocks deletion. Firebase deletion happens first. The full lifecycle test should
remain red until the backend deletion path handles owned content correctly; the
scoped cleanup fallback removes only the disposable test data after the failure.
