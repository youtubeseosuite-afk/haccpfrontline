<!-- File Path: /sync-agent/README.md -->
<!-- Status: NEW FILE -->

# AI QMS Local Sync Agent

Syncs documents from a folder on your own server to your AI QMS account.
Runs as a scheduled task (cron / Task Scheduler) — not a background
service — so there's nothing to keep running, and nothing that can
silently crash and stay down.

**What it does:** each run, it scans the configured folder, extracts text
locally from any new or changed file (PDF, DOCX, TXT, MD), and uploads
*only that extracted text* — never the original file — to your AI QMS
account. Deleted local files are never removed from your account
automatically; this agent only ever adds or updates.

## Requirements

- Node.js 18 or later
- A sync token, generated for your organization from the AI QMS admin
  dashboard (ask your account contact if you don't have one)

## Setup

1. Copy this `sync-agent` folder onto the server where your documents live.
2. Install dependencies:
   ```
   npm install
   ```
3. Create `config.json` in this folder:
   ```json
   {
     "syncToken": "paste-your-sync-token-here",
     "apiUrl": "https://your-app.vercel.app",
     "watchFolder": "/path/to/your/documents/folder"
   }
   ```
4. Run it once by hand to check it works:
   ```
   npm run sync
   ```
   You should see a summary line like `Done. Uploaded: 3, skipped (unchanged): 12, failed: 0.`

## Scheduling

**Linux/macOS (cron):** run `crontab -e` and add a line like:
```
*/15 * * * * cd /path/to/sync-agent && npm run sync >> sync.log 2>&1
```
That runs it every 15 minutes and logs output to `sync.log`.

**Windows (Task Scheduler):** create a new task that runs `node sync.js`,
with "Start in" set to this folder, on whatever schedule you'd like.

## Notes

- `.sync-state.json` (created automatically in this folder on first run)
  tracks what's already been synced, by content hash. Don't delete it
  unless you want everything re-uploaded on the next run.
- If a sync token is revoked from the admin dashboard, this agent starts
  failing with a 401 — that's expected. Generate a new one and update
  `config.json`.
- `config.json` and `.sync-state.json` both contain sensitive/local
  information — don't commit them to version control if this folder ever
  ends up in a git repo of its own.
