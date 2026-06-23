# ZoOps — Agent Guide

ZoOps is a Zo-native management plane for a Zo Computer workspace.
It runs as a Zo Site at port **50165** (dev) / **56874** (prod).

## Purpose
Manually track, review, and troubleshoot Zo workflows, services, browser tasks,
prompts, skills, and personas — without requiring AI to be running.

## Architecture

```
server.ts          Hono API server (port 50165 dev / prod from zosite.json)
  └── /api/*       All backend routes (SQLite via better-sqlite3)
  └── *            Proxy to Vite dev server (port 50166) in dev mode
                   Serve dist/ (static) in production mode

backend-lib/
  db.ts            SQLite init, schema, generateId(), now()
  discovery.ts     Workspace scanner — finds zo-sites, services, DBs, skills
  health.ts        System health check (uptime, disk, mem, load, versions)
  seed.ts          Seeds demo data if DB is empty

src/
  main.tsx         React entry point
  App.tsx          BrowserRouter + sidebar shell + nav groups
  styles.css       Tailwind v4 + ZoOps dark theme CSS variables
  lib/utils.ts     cn(), fmtRelative(), STATUS_COLORS, statusLabel()
  pages/           13 pages (see below)
  components/ui/   shadcn/ui components

data/
  zoops.db         SQLite database (runtime, gitignored)
```

## Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Command Center | Stats, warnings, recent runs, health snapshot |
| `/discovery` | Discovery | Auto-detected workspace items by type |
| `/services` | Services | Zo services + HTTP health checks |
| `/workflows` | Workflows | CRUD list with health/stale state |
| `/workflows/:id` | WorkflowDetail | Prompt versions, run history, edit |
| `/runs` | Runs | All workflow runs, filter by status |
| `/runs/:id` | RunDetail | Paste output, approve/reject, edit |
| `/review` | Needs Review | Action items, failed runs, session issues |
| `/browser-tasks` | BrowserTasks | Browser playbooks + session status |
| `/prompts` | PromptRegistry | Per-workflow prompt version history |
| `/skills-personas` | SkillsPersonas | Catalog of workspace skills + personas |
| `/health` | Health | Live system check + ZoOps operational checks |
| `/settings` | Settings | Persistent key/value config via SQLite |

## Dev Server Startup

**Important:** The dev script must NOT use `bun --hot` — it conflicts with Vite's own server.

```bash
cd /home/workspace/zoops
bun run dev        # starts Hono on :50165, Vite on :50166 (proxied)
bun run prod       # builds then starts production server on :50165
```

If the server crashes, kill port 50165 and restart:
```bash
kill $(lsof -ti :50165) 2>/dev/null; cd /home/workspace/zoops && nohup bash -c 'NODE_ENV=development bun run server.ts' > /dev/shm/zosite-50165.log 2>&1 &
```

## Vite Dev Proxy Architecture

In development, `server.ts` does **not** use `vite.middlewares` (connect-style).
Instead it:
1. Starts a full Vite server on `local_port + 1` (50166)
2. Proxies all non-`/api/` traffic from Hono (50165) → Vite (50166) via `fetch()`

This correctly serves Vite's pre-bundled deps, CSS, and HMR assets which
`vite.transformRequest()` alone cannot handle.

## SQLite Schema (key tables)

- `workflows` — name, prompt, category, status, health state, run stats
- `workflow_runs` — output, summary, status, review_status, reviewer_notes
- `review_items` — manual action items with priority/status
- `services` — detected/registered services, endpoint, last health check
- `browser_tasks` + `browser_task_runs` — playbooks + execution log
- `prompt_versions` — versioned prompts per workflow
- `skills_personas` — workspace skill/persona catalog
- `discovered_items` — auto-scan results from discovery engine
- `health_snapshots` — point-in-time system health records
- `settings` — arbitrary key/value config

## Key Decisions

- **In-memory → SQLite**: all state is persisted in `data/zoops.db`
- **No Zo API calls**: ZoOps reads the local filesystem directly (no round-trips)
- **Discovery**: scans `/dev/shm/*.log`, `zosite.json` files, `Skills/`, `.sqlite` files
- **No auto-run**: workflows are executed manually in Zo chat; output is pasted in
- **Review queue**: aggregates failed runs + browser session issues + manual items
