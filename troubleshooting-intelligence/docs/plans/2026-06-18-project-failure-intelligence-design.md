# Project Failure Intelligence Design

## Goal
Build a private analyst tool that turns project-failure writeups into structured intelligence records rather than storing them as articles. The platform should get more useful as the normalized signal and lesson corpus grows.

## V1 decisions
- Zo Site app
- Internal analyst tool
- Curated seed set with automated expansion path
- AI extracts, human reviews before publish
- Review the full intelligence record before publish
- Controlled taxonomy with analyst override

## V1 architecture
Use a single Zo Site codebase with four layers:

1. Data layer
- Canonical dataset stored as JSON in `data/failure-intelligence.json`
- DuckDB mirror in `data/failure-intelligence.duckdb`
- Controlled taxonomies for normalized failure signals and lessons

2. Intelligence model
- `ProjectRecord` is the primary unit, not articles
- Each record stores summary, outcome classification, structured signals, normalized lessons, evidence snippets, and review state
- Draft records can exist in the review queue before publication

3. Application layer
- Hono API in `server.ts`
- React dashboard for overview, search, review queue, and record detail
- Admin actions for approving or archiving draft records and running a demo collector pass

4. Collection path
- Seed dataset gives the system immediate analytical value
- Backlog-driven collector module demonstrates how new sources flow into draft records
- Future source adapters can write drafts into the same review queue without changing the UI or analytics model

## Why JSON plus DuckDB
JSON is practical for curated edits, review actions, and deterministic local persistence. DuckDB gives fast analytical queries and leaves room for future trend analysis, exports, and predictive modeling. The JSON file is canonical in v1; DuckDB is a mirror optimized for analysis.

## Core entities
### ProjectRecord
Fields:
- title
- projectCategory
- technologyArea
- industry
- organizationSize
- sourceUrl
- sourceType
- publicationDate
- projectSummary
- outcomeClassification
- failureSignals[] with raw + normalized + category
- lessonsLearned[] with raw + normalized
- evidence[]
- review state and analyst notes

### Collector backlog item
Represents a discovered source that has not yet been transformed into a draft review record.

### Taxonomy
Stores reusable normalized categories for signals and lessons. Analysts can adjust mappings later without changing downstream visualizations.

## API surface
- `GET /api/intelligence/dataset`
- `GET /api/intelligence/search?q=`
- `POST /api/intelligence/admin/review/:slug/approve`
- `POST /api/intelligence/admin/review/:slug/archive`
- `POST /api/intelligence/admin/collector/run`

## UI shape
A single responsive workspace with tabs:
- Overview: counts, outcomes, top signals, category/industry coverage
- Search: natural-language query over records, signals, and lessons
- Review Queue: pending records plus collector backlog actions
- Record Detail: evidence, signals, lessons, and analyst notes

## Review workflow
1. Collector creates draft record
2. Analyst reviews summary, outcome, normalized signals, normalized lessons, duplicate risk, and evidence
3. Analyst approves to publish or archives the draft
4. Persist canonical JSON and rebuild DuckDB mirror

## Future path
The current model supports:
- AI extraction workers
- scheduled collection modules
- duplicate detection improvements
- record confidence scoring
- predictive risk models
- pre-mortem generation from normalized historical patterns

## Deliberate v1 limits
- No public product surface
- No multi-user permissions model
- No broad-source crawling scheduler yet
- No embedding index yet

These are deferred so the first version can establish the right intelligence model, review workflow, and analytics foundation.
