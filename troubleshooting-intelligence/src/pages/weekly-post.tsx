import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DashboardPayload } from "@/lib/intelligence";
import {
  buildWeeklyPostArchive,
  deriveTroubleshootingCaseFacets,
  getTroubleshootingEvidenceSourceLabel,
  getTroubleshootingMistakeLabel,
  getTroubleshootingWeeklyPostPath,
  resolveWeeklyPostCase,
} from "@/lib/intelligence";

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

export default function WeeklyPostPage() {
  const { slug, dateSlug } = useParams();
  const [payload, setPayload] = useState<DashboardPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadDataset();
  }, []);

  const featuredCase = useMemo(
    () => resolveWeeklyPostCase(payload.publishedTroubleshootingCases, payload.publishedInsights, { slug, dateSlug }),
    [payload.publishedInsights, payload.publishedTroubleshootingCases, slug, dateSlug],
  );

  const archive = useMemo(
    () => buildWeeklyPostArchive(payload.publishedTroubleshootingCases, payload.publishedInsights),
    [payload.publishedInsights, payload.publishedTroubleshootingCases],
  );

  const relatedInsights = featuredCase
    ? payload.publishedInsights.filter((insight) => insight.supportingCaseIds.includes(featuredCase.id))
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
      setError(err instanceof Error ? err.message : "Failed to load the weekly post");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="space-y-3 text-center">
            <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading weekly post…</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !featuredCase) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-4 px-6 text-center">
          <ShieldAlert className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error || "No featured troubleshooting case is available yet."}</p>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  const facets = deriveTroubleshootingCaseFacets(featuredCase);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header>
        <div className="ti-masthead-stripe" />
        <div className="border-b border-border/80">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 py-2">
              <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 gap-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 hover:text-foreground">
                <Link to="/">
                  <ArrowLeft className="size-3" />
                  Home
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full border border-border/80 px-2 py-0.5 text-[10px] font-medium w-fit bg-background text-foreground">{formatDate(featuredCase.date)}</span>
                <span className="inline-flex items-center justify-center rounded-full border border-border/80 px-2 py-0.5 text-[10px] font-medium w-fit bg-card text-foreground">{featuredCase.technologyArea}</span>
                <span className="inline-flex items-center justify-center rounded-full border border-border/80 px-2 py-0.5 text-[10px] font-medium w-fit bg-background text-foreground">Complexity {featuredCase.analystSynthesis.complexityScore}/10</span>
              </div>
            </div>

            <div className="space-y-4 py-8">
              <p className="ti-kicker">Weekly detailed post</p>
              <h1 className="ti-display max-w-4xl text-[3.8rem] leading-[0.94] font-semibold sm:text-6xl lg:text-7xl">
                {featuredCase.title}
              </h1>
              <p className="max-w-3xl text-xl leading-8 text-muted-foreground">
                This week’s case study follows one real troubleshooting investigation from first symptom to defensible
                diagnosis, preserving the evidence trail and linking directly back to the original source.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8 lg:py-14">
        <article className="min-w-0 space-y-10">
          <div className="ti-paper ti-accent-stripe rounded-xl border border-border/80 p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Original source</Badge>
              <Badge variant="secondary">{featuredCase.sourceType}</Badge>
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-base leading-8 text-muted-foreground">
                <span className="font-semibold text-foreground">{featuredCase.sourceTitle}</span> published the incident
                material this article is based on. Read the original report directly before or after this analysis.
              </p>
              <Button asChild variant="outline" className="rounded-full !border-border !text-foreground hover:!bg-background">
                <a href={featuredCase.sourceUrl} target="_blank" rel="noreferrer">
                  View original source
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          <ArticleSection
            title="Problem"
            description="What failed and why this incident was worth studying."
          >
            <p className="text-lg leading-8 text-muted-foreground">{featuredCase.problemSummary}</p>
            <p className="mt-4 text-base leading-8 text-muted-foreground">{featuredCase.sourceExtraction.problemStatement}</p>
          </ArticleSection>

          <ArticleSection
            title="Initial assumptions"
            description="The early theories were part of the story, especially where they later proved incomplete."
          >
            <div className="space-y-3">
              {featuredCase.sourceExtraction.initialAssumptions.map((item) => (
                <div key={item} className="rounded-lg border border-border/80 bg-card p-4 text-base leading-8 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </ArticleSection>

          <ArticleSection
            title="Investigation timeline"
            description="The sequence of troubleshooting moves that pushed the diagnosis forward."
          >
            <div className="space-y-3">
              {featuredCase.sourceExtraction.investigationTimeline.map((step) => (
                <div key={`${featuredCase.id}-${step.order}`} className="rounded-lg border border-border/80 bg-card p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold"
                      style={{ borderColor: "var(--accent-warm-text)", color: "var(--accent-warm-text)" }}
                    >
                      {step.order}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium">{step.action}</p>
                      <p className="mt-2 text-base leading-8 text-muted-foreground">{step.outcome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ArticleSection>

          <ArticleSection
            title="Evidence that changed the direction"
            description="These signals mattered because they reduced ambiguity, not because they merely described the outage."
          >
            <div className="space-y-4">
              {featuredCase.sourceExtraction.evidenceCollected.map((item) => (
                <div key={`${featuredCase.id}-${item.detail}`} className="rounded-lg border border-border/80 bg-card p-5">
                  <Badge variant="outline">{getTroubleshootingEvidenceSourceLabel(item.sourceType)}</Badge>
                  <p className="mt-3 text-base font-medium">{item.detail}</p>
                  <p className="mt-2 text-base leading-8 text-muted-foreground">{item.finding}</p>
                </div>
              ))}
            </div>
          </ArticleSection>

          <div className="grid gap-5 sm:grid-cols-2">
            <ArticleCard
              title="Key turning points"
              description="What materially improved the diagnosis."
              rows={featuredCase.sourceExtraction.keyTurningPoints}
            />
            <ArticleCard
              title="Dead ends"
              description="Useful because they reveal what did not actually explain the incident."
              rows={featuredCase.sourceExtraction.deadEnds}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ArticleCard
              title="Root cause"
              description="What ultimately caused the incident."
              rows={[featuredCase.sourceExtraction.rootCause]}
            />
            <ArticleCard
              title="Resolution"
              description="How the incident was resolved."
              rows={[featuredCase.sourceExtraction.resolution]}
            />
          </div>

          <ArticleSection
            title="What future troubleshooters should reuse"
            description="The point is not only to know what broke here, but to keep the reasoning moves that transfer elsewhere."
          >
            <div className="space-y-3">
              {featuredCase.analystSynthesis.troubleshootingPrinciples.map((item) => (
                <div key={item} className="rounded-lg border border-border/80 bg-card p-4 text-base leading-8 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </ArticleSection>

          <ArticleSection
            title="Lessons learned"
            description="Explicit takeaways preserved from the case record."
          >
            <div className="space-y-3">
              {featuredCase.sourceExtraction.lessonsLearned.map((item) => (
                <div key={item} className="rounded-lg border border-border/80 bg-card p-4 text-base leading-8 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </ArticleSection>

          <section className="space-y-4 border-t border-border/80 pt-8">
            <p className="ti-kicker">References</p>
            <div className="space-y-3">
              <ReferenceLink
                title={featuredCase.sourceTitle}
                meta={`${featuredCase.sourceType} · ${formatDate(featuredCase.date)}`}
                url={featuredCase.sourceUrl}
              />
              <ReferenceLink
                title="Troubleshooting Intelligence weekly archive"
                meta="Internal article archive"
                url="/weekly/archive"
                internal
              />
            </div>
          </section>
        </article>

        <aside className="space-y-6">
          <Card className="ti-paper border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Case signals</CardTitle>
              <CardDescription>This article’s teaching surface at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {facets.mistakeTypes.map((type) => (
                  <Badge key={type} variant="secondary">
                    {getTroubleshootingMistakeLabel(type)}
                  </Badge>
                ))}
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="ti-kicker">Source publisher</p>
                <p className="text-base">{featuredCase.sourceTitle}</p>
              </div>
              <div className="space-y-2">
                <p className="ti-kicker">Confidence</p>
                <p className="text-base capitalize">{featuredCase.confidence}</p>
              </div>
              <div className="space-y-2">
                <p className="ti-kicker">Why it teaches well</p>
                <p className="text-base leading-8 text-muted-foreground">
                  {featuredCase.analystSynthesis.complexityJustification}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Related insights</CardTitle>
              <CardDescription>Patterns this case strengthens in the larger library.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedInsights.length ? (
                relatedInsights.map((insight) => (
                  <div key={insight.id} className="rounded-lg border border-border/80 bg-card p-4">
                    <p className="text-base font-medium">{insight.title}</p>
                    <p className="mt-2 text-base leading-8 text-muted-foreground">{insight.patternDiscovered}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No linked insights yet for this case.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Read another case</CardTitle>
              <CardDescription>Other strong weekly-post candidates from the archive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {archive
                .filter((entry) => entry.id !== featuredCase.id)
                .slice(0, 3)
                .map((entry) => (
                  <Button key={entry.id} asChild variant="outline" className="h-auto w-full justify-between whitespace-normal py-3 text-left">
                    <Link to={entry.path}>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{entry.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {entry.sourceTitle} · {formatDate(entry.date)}
                        </span>
                      </span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ))}
              <Button asChild variant="ghost" className="w-full justify-between px-0">
                <Link to="/weekly/archive">
                  View full archive
                  <BookOpen className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function ArticleSection(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border/60 pt-8">
      <div className="space-y-1.5">
        <p className="ti-kicker">{props.title}</p>
        <p className="text-sm leading-7 text-muted-foreground">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}

function ArticleCard(props: { title: string; description: string; rows: string[] }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.rows.map((row) => (
          <div key={row} className="rounded-lg border border-border/80 bg-card p-4 text-base leading-8 text-muted-foreground">
            {row}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReferenceLink(props: { title: string; meta: string; url: string; internal?: boolean }) {
  if (props.internal) {
    return (
      <Link to={props.url} className="block rounded-lg border border-border/80 bg-card p-4 transition hover:border-foreground/20 hover:bg-background">
        <p className="text-base font-medium">{props.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{props.meta}</p>
      </Link>
    );
  }

  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-border/80 bg-card p-4 transition hover:border-foreground/20 hover:bg-background"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-medium">{props.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{props.meta}</p>
        </div>
        <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </div>
    </a>
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
