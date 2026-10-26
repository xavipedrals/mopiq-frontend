# Website study parity with iOS 2.2.7

## Included

- Study → Custom study: Entire deck, Needs practice (latest Again/Hard), Flagged, and Choose cards. Selection runs on the server before limits, supports folder scope, media, studied status, latest ratings, private flags (any/all), search, and acquisition dates. Counts refresh as filters change; Start reselects and freezes IDs. Deleted/suspended cards are skipped during loading.
- Custom sessions use a finite queue, save reviews through the existing account-scoped review queue, respect the free-study quota, summarize the latest rating per card, and offer another round for Again/Hard. New/due cards use normal scheduling. Early learning/relearning preserves steps and due dates on Hard/Good/Easy; Again restarts the relevant learning interval without another lapse/ease penalty. Existing early review behavior remains in place.
- PDF guidance has default/custom status, five examples shared with iOS, and the existing 1,000-grapheme limit. Adding an example never truncates existing user instructions. Shared-generation status handles retry and ignores stale responses after account/deck changes.
- Fourteen interface locales, adding `nb`, `nl`, `sv`, `he`, `fi`, `da`, and `zh-Hans`. Shared interface strings reuse native translations; study and generation-specific web copy is translated. Website-only marketing and other unmatched copy deliberately use the existing English fallback. Hebrew switches the interface direction; flashcard documents retain their authored direction.
- A replayable sample review and account-scoped first-review tips. The demo does not call review APIs or affect cards/statistics. Its completion is remembered separately from contextual-tip progress.
- Dark card rendering preserves readable foregrounds on bright highlights and light annotation surfaces. It parses an inert document and does not regex-rewrite ordinary parentheses, RGB attributes, or math text. This does not introduce a new math renderer.

## Additive API contracts

`custom_study_selection_v1(p_deck_version_id, p_filters, p_limit, p_shuffle, p_include_ids)` returns `{matching_count, card_ids}`. Count-only requests omit the snapshot. Filters use the website browse fields plus `matchAllFlags` and `addedWithinDays`. All matches are counted before the optional limit; IDs are shuffled only for a Start request. The authenticated owner is resolved server-side.

`custom_study_cards_v1(p_deck_id, p_card_ids)` accepts up to 500 IDs and returns existing study-bundle fields in snapshot order, excluding unavailable cards. The client batches larger snapshots. Neither function changes existing APIs.

Snapshots live in tab-scoped session storage and are checked against both user and deck before use. A missing snapshot requires starting another session. Recent-acquisition filters use personal addition records synced by clients; they do not infer acquisition from card modification dates.

## Activation

Custom study is visible by default. `VITE_CUSTOM_STUDY_ENABLED=false` explicitly hides the Study-menu entry; an unset flag no longer hides it. A read-only check on October 26, 2026 confirmed that the linked database has migration `20261026140000` installed. The existing shared-generation flag is unchanged.

After explicit approval, from `anki-supabase-local`:

```sh
supabase db push --dry-run
# Review all pending migrations before applying; this checkout has other pending work.
supabase db push
```

The task's additive migration is `20261026140000_web_custom_study.sql`. A database push may include other pending migrations, so it must be reviewed rather than treated as an isolated apply. For another database, install it only with explicit approval. Rebuild/deploy the website through the normal release process; remove an old explicit `VITE_CUSTOM_STUDY_ENABLED=false` setting or set it to `true`. Enable the existing `VITE_SHARED_AI_GENERATION_ENABLED` only after confirming its shared-generation backend is available. Shipping iOS ShareDeck v1 is untouched.

## Validation

- Frontend unit tests cover finite queues/revisiting, account/deck snapshot isolation, filtered scheduling, tutorial preferences, guidance limits, native format placeholders, locale keys/matching, and highlight colors.
- `supabase/tests/database/40_web_custom_study_test.sql` covers count-before-limit, snapshots beyond the first browse page, statuses/ratings, flags including any/all and tombstones, subdeck scope, acquisition dates, search, ordered hydration, and cross-account denial. Tested with the migration in a rolled-back local database transaction.
- Browser verification uses fixture accounts and mocked transport with the actual Vue components and API wrappers. It covers selection, review persistence, finite rounds/retry, error recovery, tutorial practice, guidance editing, RTL, mobile layout, and both themes. No production data is modified.
