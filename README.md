# ZoOps

A management dashboard for [Zo Computer](https://zo.computer) — built by a Zo user, for Zo users.

Track your workflows, services, browser tasks, prompts, skills, and system health without needing AI to be running.

---

## What it does

ZoOps is a Zo-native ops plane. It gives you a persistent, visual record of everything happening on your Zo Computer:

- **Command Center** — live stats, warnings, recent runs, health snapshot
- **Services** — registered Zo services with HTTP health checks
- **Workflows** — prompt-driven workflow CRUD with stale/health tracking
- **Runs** — full run history; paste output, approve/reject, add notes
- **Needs Review** — aggregated action queue (failed runs, issues, items)
- **Browser Tasks** — playbook library + session log
- **Prompt Registry** — per-workflow versioned prompt history
- **Skills & Personas** — catalog of workspace skills + personas
- **Discovery** — auto-scanned workspace items (sites, DBs, skills, logs)
- **Health** — system check (disk, mem, load) + ZoOps operational checks
- **Settings** — persistent key/value config via SQLite

---

## Stack

- **Runtime**: Bun + Hono (API server)
- **Frontend**: React 19 + Vite 7 + Tailwind v4 + shadcn/ui
- **Database**: SQLite via `better-sqlite3`
- **No external dependencies** — reads your Zo filesystem directly

---

## Requirements

- A [Zo Computer](https://zo.computer) account
- Bun installed (`curl -fsSL https://bun.sh/install | bash`)

---

## Installation

```bash
# Clone into your Zo workspace
cd /home/workspace
git clone https://github.com/sthoms12/zoops.git
cd zoops

# Install dependencies
bun install

# Start the dev server
bun run dev
```

The app runs on port **50165**. Access it via your Zo site preview or register it as a service.

---

## Registering as a Zo Service

To keep ZoOps running persistently (survives restarts), register it as a Zo user service from your Zo chat:

> "Register ZoOps as a private Zo service. The entrypoint is `bun run prod` in `/home/workspace/zoops`, port 50165."

This tells Claude to call `register_user_service` with the right config. ZoOps will then auto-start on boot and get a persistent private URL.

---

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Dev server (HMR, port 50165 + Vite on 50166) |
| `bun run build` | Production build into `dist/` |
| `bun run prod` | Build + serve production on port 50165 |

---

## Data

All state lives in `data/zoops.db` (SQLite). This directory is gitignored — each Zo Computer gets its own fresh database on first run.

On startup, ZoOps automatically:
- Initializes the schema
- Scans your workspace for services, skills, and personas
- Loads a system health snapshot

---

## AGENTS.md

The `AGENTS.md` file in this repo is a Claude Code agent guide. When Claude Code is running in this directory, it automatically loads these instructions — so Claude knows how to restart the server, understand the architecture, and operate ZoOps on your behalf.

---

## License

MIT — free to use, modify, and share.

---

Built by [@thomstech](https://github.com/sthoms12) with [Zo Computer](https://zo.computer).
