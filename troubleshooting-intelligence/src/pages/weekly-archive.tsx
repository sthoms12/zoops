import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardPayload } from "@/lib/intelligence";
import { buildWeeklyPostArchive } from "@/lib/intelligence";

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

export default function WeeklyArchivePage() {
  const [payload, setPayload] = useState<DashboardPayload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadDataset();
  }, []);

  const archiveEntries = useMemo(
    () => buildWeeklyPostArchive(payload.publishedTroubleshootingCases, payload.publishedInsights),
    [payload.publishedTroubleshootingCases, payload.publishedInsights],
  );

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
      setError(err instanceof Error ? err.message : "Failed to load the weekly archive");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <div className="space-y-3 text-center">
            <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading weekly archive…</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-4 px-6 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 py-2">
              <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 gap-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                <Link to="/">
                  <ArrowLeft className="size-3" />
                  Home
                </Link>
              </Button>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Weekly archive
              </p>
            </div>

            <div className="grid gap-6 py-8 lg:grid-cols-[1fr_280px] lg:items-end">
              <div className="space-y-4">
                <p className="ti-kicker">Published teaching posts</p>
                <h1 className="ti-display max-w-4xl text-[3.8rem] leading-[0.94] font-semibold sm:text-6xl">
                  A dated archive of weekly troubleshooting stories, each linked back to its original source.
                </h1>
                <p className="max-w-3xl text-xl leading-8 text-muted-foreground">
                  Each post chooses a case with enough ambiguity, evidence, and a real turning point to teach a troubleshooting process instead of just a fix summary.
                </p>
              </div>

              <Card className="ti-paper ti-accent-stripe border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Archive scope</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-base leading-7 text-muted-foreground">
                  <p><span className="ti-number text-3xl">{archiveEntries.length}</span> published weekly posts</p>
                  <p>Every entry includes direct source attribution and a stable article URL.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-4">
          {archiveEntries.map((entry, index) => (
            <Card key={entry.id} className={`border-border/80 shadow-sm ${index === 0 ? "ti-accent-stripe" : ""}`}>
              <CardContent className="grid gap-6 p-6 lg:grid-cols-[130px_minmax(0,1fr)_240px] lg:items-start">
                <div className="space-y-2">
                  {index === 0 ? (
                    <span className="inline-flex items-center justify-center rounded-full border-transparent bg-foreground px-3 py-0.5 text-[11px] font-semibold text-background w-fit">Latest</span>
                  ) : null}
                  <p className="text-sm font-semibold text-foreground">{formatDate(entry.date)}</p>
                  <p className="text-xs font-medium text-foreground">{entry.technologyArea}</p>
                  <p className="text-xs text-muted-foreground">Complexity {entry.complexityScore}/10</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="ti-display text-3xl leading-tight font-semibold">{entry.title}</h2>
                    <p className="text-base leading-8 text-muted-foreground">{entry.problemSummary}</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-card p-4">
                    <p className="ti-kicker">Why this case was chosen</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.keyLesson}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <SourcePanel title={entry.sourceTitle} url={entry.sourceUrl} />
                  <Button asChild className="w-full justify-between rounded-full">
                    <Link to={entry.path}>
                      Read post
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

function SourcePanel(props: { title: string; url: string }) {
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-border/80 bg-card p-4 transition hover:border-foreground/20 hover:bg-background"
    >
      <p className="ti-kicker">Original source</p>
      <p className="mt-2 text-base font-medium">{props.title}</p>
      <div className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
        View source
        <ExternalLink className="size-3.5" />
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
