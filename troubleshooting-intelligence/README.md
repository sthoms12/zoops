# Troubleshooting Intelligence

Troubleshooting Intelligence is a public-facing Zo Site for studying how experienced technology teams investigate, diagnose, and resolve incidents. The product is case-first: each troubleshooting case captures the investigation path, evidence, dead ends, turning points, root cause, resolution, and reusable lessons. Insights and weekly reports are derived from those structured cases, while the public site centers on one detailed weekly teaching post plus a dated archive.

## Current scope
- Public-facing Zo Site with responsive mobile/desktop layout
- Canonical JSON dataset in `data/troubleshooting-intelligence.json`
- DuckDB mirror in `data/troubleshooting-intelligence.duckdb`
- Structured troubleshooting case records with source extraction and analyst synthesis
- Structured troubleshooting insights with explicit supporting case links
- AI-assisted troubleshooting collector that creates draft cases for analyst review
- Generated `Troubleshooting Intelligence Weekly` report in `docs/reports/`
- Mixed natural-language search across troubleshooting cases and insights
- Public homepage focused on one featured troubleshooting process at a time
- Weekly teaching post routes at `/weekly`, `/weekly/:dateSlug/:slug`, and archive at `/weekly/archive`
- Dedicated dashboard/library for overview, case browsing, insight browsing, and linked detail views

## Architecture
- **Frontend:** React + Vite + Tailwind CSS 4 with shadcn/ui primitives
- **Backend:** Bun + Hono in `server.ts`
- **Storage:** JSON as the canonical dataset, mirrored into DuckDB for analysis

## Key files
- `server.ts` — API routes, dataset loading, search, DuckDB sync, and Vite/Bun server wiring
- `src/pages/intelligence-dashboard.tsx` — main troubleshooting analyst UI
- `src/lib/intelligence.ts` — shared types, dataset hydration, dashboard shaping, search, case facets, and weekly report generation
- `src/lib/duckdb.ts` — DuckDB mirror sync
- `data/troubleshooting-intelligence.json` — canonical troubleshooting dataset
- `docs/reports/` — generated weekly troubleshooting reports
- `scripts/generate-troubleshooting-weekly.ts` — materializes the weekly markdown report from structured cases and insights
- `scripts/sync-duckdb.ts` — manual mirror rebuild helper

## API surface
- `GET /api/intelligence/dataset` — full troubleshooting dashboard payload
- `GET /api/intelligence/search?q=` — query troubleshooting cases and insights by title, summary, evidence, lessons, principles, and metadata

## Data model
Each `TroubleshootingCase` includes:
- title, source, date, and technology area
- problem summary
- source extraction for the reported issue, assumptions, investigation timeline, evidence, dead ends, turning points, root cause, resolution, and lessons
- analyst synthesis for techniques, mistakes, assumptions, evidence value, anti-patterns, principles, skill indicators, and complexity scoring
- confidence and case-of-the-week eligibility

Each `TroubleshootingInsight` includes:
- insight title
- discovered pattern
- summary
- supporting evidence
- explicit supporting case IDs and supporting case titles
- practical takeaway
- source report provenance
- review-window dates
- tags

## Useful commands
```bash
bun install
bun run check
bun run build
bun run sync:duckdb
bun run report:troubleshooting-weekly
bun run collector:run
bun run collector:run --url=https://example.com/postmortem --title="Example incident" --source-type="Vendor incident analysis"
bun run dev
```

## Collector workflow
- `collector:run` now targets the troubleshooting dataset, not the older project-failure model.
- The collector fetches the source document, uses Zo to extract:
  - source extraction fields (problem, assumptions, timeline, evidence, dead ends, turning points, root cause, resolution, lessons)
  - analyst synthesis fields (techniques, mistakes, principles, skill indicators, complexity, confidence)
- New AI-created cases are saved as:
  - `status: "draft"`
  - `reviewStatus: "pending_review"`
- This keeps source attribution and AI output visible while requiring human review before publication.

## Notes
- This app was split from `project-failure-intelligence` so troubleshooting analysis can evolve independently.
- The original `project-failure-intelligence` app remains unchanged.
