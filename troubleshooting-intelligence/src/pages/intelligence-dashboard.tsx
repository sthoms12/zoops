import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Compass,
  ExternalLink,
  Library,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type {
  DashboardPayload,
  SearchResult,
  TroubleshootingCase,
  TroubleshootingComplexityBand,
  TroubleshootingInsight,
} from "@/lib/intelligence";
import {
  buildWeeklyPostArchive,
  deriveTroubleshootingCaseFacets,
  getTroubleshootingComplexityBand,
  getTroubleshootingEvidenceSourceLabel,
  getTroubleshootingMistakeLabel,
  getTroubleshootingWeeklyPostPath,
} from "@/lib/intelligence";

type DetailRecord =
  | { kind: "case"; record: TroubleshootingCase }
  | { kind: "insight"; record: TroubleshootingInsight };

const emptyPayload: DashboardPayload = {
  dataset: {
    generatedAt: "",
    updatedAt: "",
    taxonomy: {
      signalCategories: {},
      lessonTaxonomy: [],
      troubleshooting: {
        technologyAreas: [],
        mistakeTypes: [],
        evidenceSourceTypes: [],
        investigationTechniqueTypes: [],
        incorrectAssumptionTypes: [],
        turningPointTypes: [],
      },
    },
    collectionModules: [],
    collectorBacklog: [],
    collector: {
      settings: {
        automationEnabled: false,
        automationSchedule: "",
        automationTimezone: "America/Chicago",
        maxItemsPerRun: 0,
        sourceTextCharLimit: 16000,
      },
      runs: [],
    },
    troubleshootingCases: [],
    troubleshootingInsights: [],
    projects: [],
  },
  metrics: [],
  outcomeDistribution: [],
  signalCategoryDistribution: [],
  topSignals: [],
  topLessons: [],
  projectsByCategory: [],
  projectsByIndustry: [],
  topInsightTags: [],
  trend: [],
  publishedTroubleshootingCases: [],
  publishedInsights: [],
  publishedProjects: [],
  reviewQueue: [],
  latestCollectorRun: null,
};

export default function IntelligenceDashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload>(emptyPayload);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTechnologyArea, setSelectedTechnologyArea] = useState<string>("all");
  const [selectedComplexityBand, setSelectedComplexityBand] = useState<TroubleshootingComplexityBand | "all">("all");
  const [activeRecord, setActiveRecord] = useState<DetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadDataset();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    void runSearch(trimmed);
  }, [query]);

  const weeklyArchive = useMemo(
    () => buildWeeklyPostArchive(payload.publishedTroubleshootingCases, payload.publishedInsights),
    [payload.publishedTroubleshootingCases, payload.publishedInsights],
  );

  const featuredCase =
    payload.publishedTroubleshootingCases.find((record) => record.id === weeklyArchive[0]?.id)
    ?? payload.publishedTroubleshootingCases[0]
    ?? null;

  useEffect(() => {
    if (activeRecord) return;
    if (featuredCase) {
      setActiveRecord({ kind: "case", record: featuredCase });
      return;
    }
    const firstInsight = payload.publishedInsights[0];
    if (firstInsight) setActiveRecord({ kind: "insight", record: firstInsight });
  }, [activeRecord, featuredCase, payload.publishedInsights]);

  const filteredCases = useMemo(() => {
    return payload.publishedTroubleshootingCases.filter((record) => {
      const facets = deriveTroubleshootingCaseFacets(record);
      const technologyMatches = selectedTechnologyArea === "all" || record.technologyArea === selectedTechnologyArea;
      const complexityMatches = selectedComplexityBand === "all" || facets.complexityBand === selectedComplexityBand;
      return technologyMatches && complexityMatches;
    });
  }, [payload.publishedTroubleshootingCases, selectedTechnologyArea, selectedComplexityBand]);

  const selectedCaseRelatedInsights =
    activeRecord?.kind === "case"
      ? payload.publishedInsights.filter((insight) => insight.supportingCaseIds.includes(activeRecord.record.id))
      : [];

  async function loadDataset() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/intelligence/dataset", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Dataset request failed with ${response.status}`);
      const nextPayload = (await response.json()) as DashboardPayload;
      setPayload(nextPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Troubleshooting Intelligence");
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(trimmed: string) {
    try {
      const response = await fetch(`/api/intelligence/search?q=${encodeURIComponent(trimmed)}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Search request failed with ${response.status}`);
      const body = (await response.json()) as { results: SearchResult[] };
      setSearchResults(body.results.filter((result) => result.recordType !== "project"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="space-y-3 text-center">
            <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading Troubleshooting Intelligence…</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !payload.publishedTroubleshootingCases.length && !payload.publishedInsights.length) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-4 px-6 text-center">
          <ShieldAlert className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => void loadDataset()}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header>
        <div className="ti-masthead-stripe" />
        <div className="border-b border-border/80">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between border-b border-border/50 py-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                A weekly research publication
              </p>
              <nav className="flex items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                <a href="#latest" className="transition-colors hover:text-foreground">Latest</a>
                <Link to="/weekly/archive" className="transition-colors hover:text-foreground">Archive</Link>
                <a href="#library" className="transition-colors hover:text-foreground">Library</a>
                <a href="#method" className="transition-colors hover:text-foreground">Method</a>
              </nav>
            </div>
            <div className="py-5">
              <h1 className="ti-display text-[2.5rem] font-semibold leading-none tracking-tight sm:text-5xl">
                Troubleshooting Intelligence
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Real incident reasoning, studied in public.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section id="latest" className="border-b border-border/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10 lg:px-8 lg:py-16">
          <div className="space-y-5">
            <Badge variant="outline" className="ti-kicker gap-2 rounded-full px-3 py-1">
              <BookOpen className="size-3.5" />
              Weekly troubleshooting case
            </Badge>
            <div className="space-y-3">
              <p className="ti-display max-w-5xl text-[3.9rem] leading-[0.92] font-semibold sm:text-6xl lg:text-7xl">
                Learn how strong troubleshooters think by studying one real investigation at a time.
              </p>
            </div>

            {featuredCase ? (
              <div className="ti-paper ti-accent-stripe rounded-xl border border-border/80 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-full border border-border/80 px-2 py-0.5 text-xs font-medium w-fit bg-card text-foreground">{featuredCase.technologyArea}</span>
                  <span className="inline-flex items-center justify-center rounded-full border border-border/80 px-2 py-0.5 text-xs font-medium w-fit bg-background text-foreground">Complexity {featuredCase.analystSynthesis.complexityScore}/10</span>
                  <span className="inline-flex items-center justify-center rounded-full border border-border/80 px-2 py-0.5 text-xs font-medium w-fit bg-background text-foreground">{formatDate(featuredCase.date)}</span>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="ti-kicker">This week’s lead story</p>
                    <h2 className="ti-display mt-2 text-4xl leading-tight font-semibold sm:text-5xl">
                      {featuredCase.title}
                    </h2>
                  </div>
                  <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                    {featuredCase.problemSummary}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg" className="rounded-full px-6">
                      <Link to={getTroubleshootingWeeklyPostPath(featuredCase)}>
                        Read this week’s case
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full px-6">
                      <a href={featuredCase.sourceUrl} target="_blank" rel="noreferrer">
                        View original source
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              This site does not just aggregate troubleshooting methods. It selects strong public investigations,
              reconstructs how the diagnosis unfolded, and turns one of them each week into a detailed teaching post.
            </p>
          </div>

          <aside className="space-y-4 sm:space-y-5">
            {featuredCase ? (
              <Card className="ti-paper ti-accent-stripe border-border/80 shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="ti-kicker">Source credit</p>
                    <a
                      href={featuredCase.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium hover:underline transition"
                      style={{ color: "var(--accent-warm-text)" }}
                    >
                      Open source
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">Original reporting</CardTitle>
                    <CardDescription className="text-base leading-7">
                      Every featured story links back to the public postmortem, incident report, or outage analysis it
                      was derived from.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
                  <SourceCitation
                    title={featuredCase.sourceTitle}
                    url={featuredCase.sourceUrl}
                    meta={`${featuredCase.sourceType} · ${formatDate(featuredCase.date)}`}
                  />
                  <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="ti-kicker">Why this case teaches well</p>
                    <p className="mt-3 text-base leading-7">
                      {featuredCase.analystSynthesis.complexityJustification}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium">How to use this</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Start with the symptom. Then follow the investigation—assumptions, evidence, turning points, and dead ends in order.</p>
                <p>Extract the reusable diagnostic move, not just the incident-specific fix.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      <section className="border-b border-border/80">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="ti-kicker">Recent weekly posts</p>
              <h2 className="ti-display text-[2.9rem] leading-[0.98] font-semibold sm:text-5xl">
                Start with the latest case, then work backward through the archive.
              </h2>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/weekly/archive">
                Browse archive
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {weeklyArchive.slice(0, 3).map((entry) => (
              <Card key={entry.id} className="ti-paper border-border/80 shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatDate(entry.date)}</Badge>
                    <Badge variant="secondary">{entry.technologyArea}</Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="ti-display text-3xl leading-tight font-semibold">{entry.title}</CardTitle>
                    <CardDescription className="text-base leading-7">{entry.problemSummary}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SourceCitation title={entry.sourceTitle} url={entry.sourceUrl} meta="Original source" compact />
                  <div className="rounded-lg border border-border/80 bg-background/70 p-4">
                    <p className="ti-kicker">Why it was selected</p>
                    <p className="mt-2 text-base leading-7 text-muted-foreground">{entry.keyLesson}</p>
                  </div>
                  <Button asChild variant="ghost" className="h-auto w-full justify-between px-0 text-left">
                    <Link to={entry.path}>
                      Read post
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="library">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="space-y-3">
            <p className="ti-kicker">Research library</p>
            <h2 className="ti-display text-[2.9rem] leading-[0.98] font-semibold sm:text-5xl">
              Use the library when you want to compare cases instead of reading only the lead story.
            </h2>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              Search for a symptom, evidence source, or troubleshooting pattern. Every result carries source attribution so you can move from our synthesis back to the original investigation.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Browse cases and insights</CardTitle>
                <CardDescription>
                  Search broadly, then narrow the case list by technology area or complexity when you want cleaner comparisons.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search retry amplification, DNSSEC, recovery bottlenecks…"
                    className="pl-9"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FilterSelect
                    label="Technology area"
                    value={selectedTechnologyArea}
                    onChange={setSelectedTechnologyArea}
                    options={[
                      { value: "all", label: "All areas" },
                      ...payload.dataset.taxonomy.troubleshooting.technologyAreas.map((area) => ({ value: area, label: area })),
                    ]}
                  />
                  <FilterSelect
                    label="Complexity"
                    value={selectedComplexityBand}
                    onChange={(value) => setSelectedComplexityBand(value as TroubleshootingComplexityBand | "all")}
                    options={[
                      { value: "all", label: "All bands" },
                      { value: "Low", label: "Low" },
                      { value: "Moderate", label: "Moderate" },
                      { value: "High", label: "High" },
                      { value: "Severe", label: "Severe" },
                    ]}
                  />
                </div>

                <div className="space-y-3">
                  {query.trim() ? (
                    searchResults.length ? (
                      searchResults.slice(0, 6).map((result) => (
                        <SearchResultCard
                          key={`${result.recordType}-${result.record.slug}`}
                          result={result}
                          onSelect={(record) => setActiveRecord(record)}
                        />
                      ))
                    ) : (
                      <EmptyState message="No case or insight matches that search yet." />
                    )
                  ) : filteredCases.length ? (
                    filteredCases.slice(0, 6).map((record) => (
                      <CasePreviewCard
                        key={record.id}
                        record={record}
                        onSelect={() => setActiveRecord({ kind: "case", record })}
                      />
                    ))
                  ) : (
                    <EmptyState message="No cases match the current filters." />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">
                  {activeRecord?.kind === "insight" ? "Selected insight" : "Selected case"}
                </CardTitle>
                <CardDescription>
                  Source attribution stays attached to the record so the teaching surface always points back to the underlying investigation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeRecord ? (
                  activeRecord.kind === "case" ? (
                    <CaseDetail record={activeRecord.record} relatedInsights={selectedCaseRelatedInsights} />
                  ) : (
                    <InsightDetail
                      record={activeRecord.record}
                      supportingCases={payload.publishedTroubleshootingCases.filter((item) =>
                        activeRecord.record.supportingCaseIds.includes(item.id),
                      )}
                      onSelectCase={(record) => setActiveRecord({ kind: "case", record })}
                    />
                  )
                ) : (
                  <EmptyState message="Select a case or insight to inspect it." />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}


function FilterSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-2">
      <span className="ti-kicker">{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchResultCard(props: { result: SearchResult; onSelect: (record: DetailRecord) => void }) {
  const { result, onSelect } = props;
  if (result.recordType === "insight") {
    return (
      <button
        type="button"
        onClick={() => onSelect({ kind: "insight", record: result.record })}
        className="block w-full rounded-xl border border-border/80 bg-background/70 p-4 text-left transition hover:border-foreground/20 hover:bg-background"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Insight</Badge>
          <Badge variant="outline">{result.record.supportingCaseCount} cases</Badge>
        </div>
        <p className="mt-3 text-lg font-medium">{result.record.title}</p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.record.patternDiscovered}</p>
        {result.snippets.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {result.snippets.map((snippet) => (
              <Badge key={snippet} variant="outline">
                {snippet}
              </Badge>
            ))}
          </div>
        ) : null}
      </button>
    );
  }

  if (result.recordType !== "case") {
    return null;
  }

  return (
    <CasePreviewCard
      record={result.record}
      onSelect={() => onSelect({ kind: "case", record: result.record })}
      snippets={result.snippets}
    />
  );
}

function CasePreviewCard(props: {
  record: TroubleshootingCase;
  onSelect: () => void;
  snippets?: string[];
}) {
  const { record, onSelect, snippets = [] } = props;
  const facets = deriveTroubleshootingCaseFacets(record);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="block w-full rounded-xl border border-border/80 bg-background/70 p-4 text-left transition hover:border-foreground/20 hover:bg-background"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{record.technologyArea}</Badge>
        <Badge variant="outline">{facets.complexityBand}</Badge>
        <Badge variant="outline">Complexity {record.analystSynthesis.complexityScore}/10</Badge>
      </div>
      <h3 className="mt-3 text-xl font-medium">{record.title}</h3>
      <p className="mt-2 text-base leading-7 text-muted-foreground">{record.problemSummary}</p>
      <div className="mt-4 space-y-2">
        <SourceCitation title={record.sourceTitle} url={record.sourceUrl} meta={`${record.sourceType} · ${formatDate(record.date)}`} compact />
      </div>
      {snippets.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {snippets.slice(0, 3).map((snippet) => (
            <Badge key={snippet} variant="outline">
              {snippet}
            </Badge>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function CaseDetail(props: { record: TroubleshootingCase; relatedInsights: TroubleshootingInsight[] }) {
  const { record, relatedInsights } = props;
  const facets = deriveTroubleshootingCaseFacets(record);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{record.technologyArea}</Badge>
          <Badge variant="outline">{facets.complexityBand}</Badge>
          <Badge variant="outline">{record.confidence} confidence</Badge>
        </div>
        <h3 className="ti-display text-4xl leading-tight font-semibold">{record.title}</h3>
        <p className="text-lg leading-8 text-muted-foreground">{record.problemSummary}</p>
      </div>

      <SourceCitation title={record.sourceTitle} url={record.sourceUrl} meta={`${record.sourceType} · ${formatDate(record.date)}`} />

      <Separator />

      <EditorialBlock title="Problem statement">
        <p className="text-base leading-8 text-muted-foreground">{record.sourceExtraction.problemStatement}</p>
      </EditorialBlock>

      <EditorialBlock title="Initial assumptions">
        <ul className="space-y-3">
          {record.sourceExtraction.initialAssumptions.map((item) => (
            <li key={item} className="rounded-lg border border-border/80 bg-background/70 p-4 text-base leading-7 text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      </EditorialBlock>

      <EditorialBlock title="Investigation timeline">
        <div className="space-y-3">
          {record.sourceExtraction.investigationTimeline.map((step) => (
            <div key={`${record.id}-${step.order}`} className="rounded-lg border border-border/80 bg-background/70 p-4">
              <p className="text-sm font-medium">{step.order}. {step.action}</p>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{step.outcome}</p>
            </div>
          ))}
        </div>
      </EditorialBlock>

      <div className="grid gap-4 lg:grid-cols-2">
        <EditorialBlock title="Evidence that mattered">
          <div className="space-y-3">
            {record.sourceExtraction.evidenceCollected.map((item) => (
              <div key={`${record.id}-${item.detail}`} className="rounded-lg border border-border/80 bg-background/70 p-4">
                <Badge variant="outline">{getTroubleshootingEvidenceSourceLabel(item.sourceType)}</Badge>
                <p className="mt-3 text-sm font-medium">{item.detail}</p>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{item.finding}</p>
              </div>
            ))}
          </div>
        </EditorialBlock>

        <EditorialBlock title="Turning points">
          <div className="space-y-3">
            {record.sourceExtraction.keyTurningPoints.map((item) => (
              <div key={item} className="rounded-lg border border-border/80 bg-background/70 p-4 text-base leading-7 text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </EditorialBlock>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EditorialBlock title="Root cause">
          <p className="text-base leading-8 text-muted-foreground">{record.sourceExtraction.rootCause}</p>
        </EditorialBlock>
        <EditorialBlock title="Resolution">
          <p className="text-base leading-8 text-muted-foreground">{record.sourceExtraction.resolution}</p>
        </EditorialBlock>
      </div>

      <EditorialBlock title="Reusable troubleshooting principles">
        <div className="space-y-3">
          {record.analystSynthesis.troubleshootingPrinciples.map((item) => (
            <div key={item} className="rounded-lg border border-border/80 bg-background/70 p-4 text-base leading-7 text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </EditorialBlock>

      <div className="space-y-3">
        <p className="ti-kicker">Related patterns</p>
        <div className="flex flex-wrap gap-2">
          {facets.mistakeTypes.map((type) => (
            <Badge key={type} variant="secondary">
              {getTroubleshootingMistakeLabel(type)}
            </Badge>
          ))}
        </div>
        {relatedInsights.length ? (
          <div className="grid gap-3">
            {relatedInsights.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-border/80 bg-background/70 p-4">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{insight.patternDiscovered}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InsightDetail(props: {
  record: TroubleshootingInsight;
  supportingCases: TroubleshootingCase[];
  onSelectCase: (record: TroubleshootingCase) => void;
}) {
  const { record, supportingCases, onSelectCase } = props;
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Insight</Badge>
          <Badge variant="outline">{record.supportingCaseCount} supporting cases</Badge>
        </div>
        <h3 className="ti-display text-4xl leading-tight font-semibold">{record.title}</h3>
        <p className="text-lg leading-8 text-muted-foreground">{record.patternDiscovered}</p>
      </div>

      <EditorialBlock title="Summary">
        <p className="text-base leading-8 text-muted-foreground">{record.summary}</p>
      </EditorialBlock>

      <EditorialBlock title="Practical takeaway">
        <p className="text-base leading-8 text-muted-foreground">{record.practicalTakeaway}</p>
      </EditorialBlock>

      <EditorialBlock title="Supporting cases">
        <div className="space-y-3">
          {supportingCases.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelectCase(record)}
              className="block w-full rounded-lg border border-border/80 bg-background/70 p-4 text-left transition hover:border-foreground/20 hover:bg-background"
            >
              <p className="text-sm font-medium">{record.title}</p>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{record.problemSummary}</p>
              <div className="mt-3">
                <SourceCitation title={record.sourceTitle} url={record.sourceUrl} meta={`${record.sourceType} · ${formatDate(record.date)}`} compact />
              </div>
            </button>
          ))}
        </div>
      </EditorialBlock>
    </div>
  );
}

function EditorialBlock(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="ti-kicker">{props.title}</p>
      {props.children}
    </section>
  );
}

function SourceCitation(props: { title: string; url: string; meta: string; compact?: boolean }) {
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      className={`block rounded-lg border border-border/80 bg-background/70 transition hover:border-foreground/20 hover:bg-background ${
        props.compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ti-kicker">Original source</p>
          <p className="mt-1 text-base font-medium text-foreground">{props.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{props.meta}</p>
        </div>
        <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </div>
    </a>
  );
}

function EmptyState(props: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
      {props.message}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function _formatComplexity(record: TroubleshootingCase) {
  return getTroubleshootingComplexityBand(record.analystSynthesis.complexityScore);
}
