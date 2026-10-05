# todAI

A calm, single-user task manager for daily work, personal projects, and long-term goals.

## Run locally

Requires **Node.js 24 or later** and npm.

```powershell
cd todai
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. The workspace starts empty. “Try sample tasks” adds editable examples only when the workspace is empty.

For a production build:

```powershell
npm run build
npm start
```

Both commands bind to loopback by default. This is a personal, local application without accounts or authentication. Use a single Node server with a persistent disk; a public or multi-user deployment needs authentication and per-user data isolation first. Ephemeral/serverless filesystems are not suitable for this SQLite setup.

## Features

- Create, edit, complete, reopen, and delete tasks, with notes, dates, and priorities.
- Today (including overdue tasks), Upcoming, Inbox, All tasks, and Completed views.
- Projects with colors; goals with progress calculated from linked tasks.
- Global search across titles and notes, priority filtering, sorting, and 40-task pages.
- A 25-minute focus timer. It uses wall-clock time while the tab is open, including background tabs; reloading resets it.
- Responsive mobile navigation, native accessible dialogs, keyboard shortcuts (`N`, `/`, `Escape`), and reduced-motion support.
- JSON export from Workspace settings. Export is for portability/inspection; JSON import is not included.

## Technology and structure

Next.js provides the document shell and HTTP route handlers. React is required by Next.js but application interactions use **vanilla JavaScript DOM APIs**, with no client React components or state library. Tailwind CSS v4 compiles at build time; semantic CSS provides the detailed visual styling. SQLite uses Node's built-in `node:sqlite`, without a native package installation.

```text
app/page.js                  Next.js document shell
app/globals.css              Tailwind entry point and responsive design
app/api/[...path]/route.js    Validated same-origin JSON API
public/app.js                Vanilla JavaScript UI, forms, routing, timer
public/icons.js              Local SVG icon library
lib/database.mjs             Async database worker client and bounded queue
lib/db-worker.mjs            Dedicated database worker
lib/store.mjs                Schema, parameterized queries, validation, transactions
scripts/backup.mjs           Consistent SQLite online backup
tests/                      Storage tests and browser/API integration tests
```

Official references: [Next.js setup](https://nextjs.org/docs/app/getting-started/installation), [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), and [Node SQLite](https://nodejs.org/api/sqlite.html).

## Storage and recovery

The app creates `data/todai.sqlite` automatically. Set `TODAI_DB_PATH` to an absolute file path to use another location (see `.env.example`). Keep its directory on a local, persistent disk. Do not place the active database on a network drive.

SQLite WAL journaling, full synchronization, foreign keys, parameterized SQL, and transactional multi-step changes protect database consistency. A worker keeps synchronous SQL off the HTTP event loop. Task/goal revision checks reject stale edits rather than silently overwriting newer changes. Debounced search cancels outdated browser requests; results are paginated. Search uses a substring scan and dashboard counts scan stored tasks, so this is designed for personal workloads, not unbounded enterprise datasets.

Create a consistent backup, even while the app runs:

```powershell
npm run backup
# Or choose a new destination:
npm run backup -- C:/Backups/todai-copy.sqlite
```

The script uses SQLite's online backup API. It refuses to overwrite an existing file. If using a custom database, set `TODAI_DB_PATH` in the shell as well; the backup script does not read Next.js `.env.local`.

To restore: stop every todAI process, move the current database and any adjacent `-wal`/`-shm` files to a separate recovery folder, then copy the backup to the configured database path and restart. Do not mix a backup with an old WAL file. Keep multiple backup versions on a separate disk; SQLite consistency cannot protect against disk failure or accidental deletion. No automatic backup schedule is configured.

## Verification

```powershell
npm test
npm run build
npm run test:e2e
```

Storage tests use temporary databases. Browser tests start a production server on port 3100 with a unique isolated database under `data/e2e-*.sqlite`; they never touch the personal database. They use installed Microsoft Edge in headless mode. For another platform, change `channel` in `playwright.config.js` to an installed Chromium browser or install Playwright Chromium and remove the `channel` option. Browser tests require a successful build first.

Tests cover persistence, database integrity, stale edits, validation, pagination, literal wildcard searches, project/goal deletion behavior, goal progress, desktop CRUD, mobile navigation, keyboard entry, cross-origin rejection, request size limits, and JSON export. Screenshots are written to `test-results/`.

## API

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/dashboard?today=YYYY-MM-DD` | GET | Counts, projects, goals, progress |
| `/api/tasks` | GET, POST | Filtered pages or create |
| `/api/tasks/:id` | GET, PATCH, DELETE | Inspect or mutate a task |
| `/api/projects` | POST | Create a project |
| `/api/projects/:id` | PATCH, DELETE | Edit or delete a project |
| `/api/goals` | POST | Create a goal |
| `/api/goals/:id` | PATCH, DELETE | Edit or delete a goal |
| `/api/export` | GET | Consistent JSON snapshot |
| `/api/demo` | POST | Optional samples in an empty database |

Write requests must be JSON and are capped at 32 KiB. Task/goal updates and deletes require the current numeric `revision`; a conflict returns HTTP 409. Tasks deleted with a stale revision are preserved. Deleting a project or goal keeps its tasks and removes the association. Today uses the browser's local calendar date and includes overdue incomplete tasks. Search includes completed tasks. The name todAI is branding; no external AI service is called.
