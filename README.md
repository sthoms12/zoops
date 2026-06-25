# ZoOps

A personal ops dashboard for [Zo Computer](https://zo.computer) — built by a Zo user, for Zo users.

See what's running on your Zo, tail logs, browse your databases, track automation outputs, and monitor workspace health — all in one place, without needing AI to be active.

---

> **⚠️ Always install as a private service.**
> ZoOps exposes your workspace files, service logs, database contents, run history, and system metrics. It has no authentication layer of its own — it relies entirely on Zo's private service gating. Never publish it as a public service or expose it on a public port. The install instructions below register it as private by default; don't change that.

---

## Install

### Fastest: ask your Zo AI

Open your Zo chat and send this one message:

> Install ZoOps from github.com/sthoms12/zoops and register it as a private service

Your Zo AI will clone the repo, install dependencies, and register it as a persistent private service automatically.

---

### Terminal one-liner

Open your [Zo terminal](/?t=terminal) and run:

```bash
curl -fsSL https://raw.githubusercontent.com/sthoms12/zoops/main/setup.sh | bash
```

The script clones, installs, and attempts to auto-register the service using your Zo identity token. If that step fails it prints the exact prompt to paste into your Zo chat.

---

### Manual steps

```bash
git clone https://github.com/sthoms12/zoops /home/workspace/zoops
cd /home/workspace/zoops
bun install
```

Then ask your Zo AI:

> Register ZoOps as a private Zo service. Entrypoint: `bash -c "cd /home/workspace/zoops && NODE_ENV=production bun run server.ts"`, port 50165.

---

## What's inside

| Page | What it does |
|------|-------------|
| **Command Center** | Stats, health warnings, recent runs, system snapshot |
| **Intelligence Feed** | Scrollable timeline of automation run outputs, searchable by keyword |
| **Sites & Services** | Zo sites with port and publish info |
| **Services** | All registered services with live HTTP health checks |
| **Automations** | All your scheduled Zo agents — schedule, next run, delivery method |
| **Schedule** | 28-day calendar view of automation runs — past results and upcoming schedule |
| **Runs** | Full run history; paste output, add notes, approve/reject |
| **Review Queue** | Action queue: failed runs and flagged items needing attention |
| **Discovery** | Auto-scanned workspace items (sites, DBs, skills, logs) |
| **Workspace Changelog** | Diff between discovery scans — what was added or removed |
| **Log Viewer** | Live tail of any `/dev/shm/*.log` service log, with severity coloring |
| **DB Explorer** | Browse and query any SQLite database discovered in your workspace |
| **Skills & Personas** | Catalog of workspace skills and personas |
| **Health** | System check (disk, memory, load, versions) |
| **Settings** | Persistent key/value config |

---

## Stack

- **Runtime**: Bun + Hono
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui
- **Database**: SQLite (local, zero config)
- **No external services** — reads your Zo filesystem directly

---

## Scripts

| Command | What it does |
|---------|-------------|
| `bun run dev` | Dev server (port 50165, Vite HMR on 50166) |
| `bun run build` | Production build into `dist/` |
| `bun run prod` | Build + serve production |

---

## Data

All state lives in `data/zoops.db` (SQLite, gitignored). Each install gets a fresh database. On first boot, ZoOps scans your workspace and seeds from live Zo data — no fake placeholder content.

---

## For Zo AI: Install Procedure

When a user asks you to install ZoOps, follow these steps:

1. Clone the repo: `git clone https://github.com/sthoms12/zoops /home/workspace/zoops`
2. Install: `cd /home/workspace/zoops && bun install`
3. Register as a private Zo service:
   - Name: `ZoOps`
   - Entrypoint: `bash -c "cd /home/workspace/zoops && NODE_ENV=production bun run server.ts"`
   - Local port: `50165`
   - Mode: `http`
   - Private: `true`
4. Return the service URL to the user.

If `/home/workspace/zoops` already exists, run `git pull` instead of cloning.

---

## License

MIT — free to use, modify, and share.

Built by [@thomstech](https://github.com/sthoms12) · [Zo Computer](https://zo.computer)
