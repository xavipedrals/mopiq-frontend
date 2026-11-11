# Agent instructions

Never stage changes; the user handles staging. Preserve existing staged content.
Do not commit or push without explicit user authorization. Never apply remote
database migrations or deploy functions without the user's explicit request in
the conversation. Preserve contracts used by released iOS, Android and web clients.

## Database guardian handoff

For schema, migration, RPC, RLS, grant, trigger, Edge Function contract, or
client request/response/storage contract changes, read the implementer skill
before editing. UI, presentation, and job orchestration changes that preserve
those contracts do not require a guardian review:

`/Users/xavierpedralscamprubi/iosProjects/anki-server/anki-supabase-local/tools/database-guardian/implementer/SKILL.md`

When the user asks about "production contracts" or "database guardian", follow
the requested operation without reviewing unrelated pending work.

Before reporting that change as ready, queue an independent review:

```bash
python3 /Users/xavierpedralscamprubi/iosProjects/anki-server/anki-supabase-local/scripts/database_guardian.py request --file backend/supabase/migrations/CHANGED_FILE.sql --reason "Change summary; affected clients; validation performed"
```

Name the actual changed contract files with repeated `--file repository/path`
arguments and add relevant caller/context files when needed. The watcher
reviews new SQL/schema edits after its initial baseline. It does not review
old pending work or launch reviews for ordinary UI/service-file edits.
Read the report with `status`. Findings are advisory. Surface `FINDINGS`,
`PARTIAL`, `ERROR`, and `STALE` with their actual meaning. `PASS` means no issues
were found in the supplied scope. It never proves production compatibility or
authorizes deployment. The restricted reviewer must never execute SQL or deploy.

Preserve the existing user approval requirement for every remote migration or
function deployment. A guardian report never grants deployment permission.
