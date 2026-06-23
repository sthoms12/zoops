# Troubleshooting Source Discovery Automation

Purpose: every 3 days, discover high-quality public troubleshooting investigations, create draft troubleshooting cases from the best new sources, and email a short review summary when the run is finished.

## Schedule

- Cadence: every 3 days
- Local timezone: America/Chicago
- Run time: 6:00 PM

## Workflow

1. Read the canonical dataset at `/home/workspace/troubleshooting-intelligence/data/troubleshooting-intelligence.json`.
2. Build a dedupe view from:
   - existing `troubleshootingCases[].sourceUrl`
   - existing `troubleshootingCases[].title`
   - existing `collectorBacklog[].sourceUrl`
3. Discover candidates with a hybrid approach:
   - Start with trusted primary sources and serious incident-analysis sites.
   - Then broaden to the web for additional unique cases.
4. Favor uniqueness:
   - Avoid sources already covered.
   - Avoid multiple retellings of the same incident.
   - Avoid using the same source domain repeatedly when equally good alternatives exist.
5. Select up to 2 high-quality candidates per run.
6. For each selected candidate, create a draft troubleshooting case with:
   - `cd /home/workspace/troubleshooting-intelligence`
   - `bun run collector:run --url=... --title=... --source-type=... --date=... --technology-area=... --limit=1 --trigger=automation`
7. After all extraction is complete, send an email summary to the user with:
   - how many drafts were created
   - case titles
   - source domains and URLs
   - any skipped duplicates
   - any failures that need review

## Source strategy

Trusted/core sources:

- `blog.cloudflare.com`
- `azure.status.microsoft`
- `status.openai.com`
- `developers.googleblog.com`
- `engineering.fb.com`
- `aws.amazon.com`
- `github.blog`
- `www.coinbase.com/blog`
- `www.thousandeyes.com/blog`

Broader discovery:

- search for public incident reports, postmortems, outage analyses, and engineering writeups
- prefer original vendor writeups when available
- allow third-party analyses only when they materially improve the investigation story

## Selection standard

Only promote a source if it clearly teaches troubleshooting:

- visible ambiguity in the symptoms
- meaningful evidence, not just a fix statement
- a real turning point in the investigation
- reusable reasoning principles

## Output standard

- Create drafts only. Do not publish anything.
- Email only after extraction is complete.
- Stay silent if no worthwhile new sources are found.
