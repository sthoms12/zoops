import { z } from "zod";

import { callZo } from "./zo-api";
import {
  categorizeFailureSignal,
  ensureUniqueProjectSlug,
  hydrateDataset,
  normalizeFailureSignal,
  normalizeForDraft,
  normalizeLesson,
  slugify,
  type CollectorBacklogItem,
  type CollectorRun,
  type CollectorRunStatus,
  type CollectorTrigger,
  type IntelligenceDataset,
  type OutcomeClassification,
  type ProjectRecord,
  type Taxonomy,
} from "@/lib/intelligence";

const OUTCOME_VALUES = [
  "Failed",
  "Partially Failed",
  "Delayed",
  "Over Budget",
  "Low Adoption",
  "Underperforming",
  "Successful With Major Lessons",
  "Unknown",
] as const satisfies OutcomeClassification[];

const extractionSchema = z.object({
  organizationName: z.string().optional().default(""),
  publicationDate: z.string().optional().default(""),
  projectSummary: z.string().min(40),
  outcomeClassification: z.enum(OUTCOME_VALUES),
  failureSignals: z
    .array(
      z.object({
        raw: z.string().min(3),
        normalized: z.string().min(2),
        category: z.string().min(2),
      }),
    )
    .min(1)
    .max(8),
  lessonsLearned: z
    .array(
      z.object({
        raw: z.string().min(3),
        normalized: z.string().min(2),
      }),
    )
    .min(1)
    .max(8),
  evidence: z.array(z.string().min(8)).min(1).max(6),
  analystNotes: z.string().optional().default(""),
});

const extractionOutputFormat = {
  type: "object",
  properties: {
    organizationName: { type: "string" },
    publicationDate: { type: "string" },
    projectSummary: { type: "string" },
    outcomeClassification: { type: "string", enum: [...OUTCOME_VALUES] },
    failureSignals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          raw: { type: "string" },
          normalized: { type: "string" },
          category: { type: "string" },
        },
        required: ["raw", "normalized", "category"],
      },
    },
    lessonsLearned: {
      type: "array",
      items: {
        type: "object",
        properties: {
          raw: { type: "string" },
          normalized: { type: "string" },
        },
        required: ["raw", "normalized"],
      },
    },
    evidence: {
      type: "array",
      items: { type: "string" },
    },
    analystNotes: { type: "string" },
  },
  required: [
    "projectSummary",
    "outcomeClassification",
    "failureSignals",
    "lessonsLearned",
    "evidence",
  ],
} as const;

export type CollectorCycleOptions = {
  limit?: number;
  trigger?: CollectorTrigger;
  now?: Date;
};

export type CollectorCycleResult = {
  dataset: IntelligenceDataset;
  run: CollectorRun;
};

export async function runCollectorCycle(
  sourceDataset: IntelligenceDataset,
  options: CollectorCycleOptions = {},
): Promise<CollectorCycleResult> {
  const dataset = hydrateDataset(sourceDataset);
  const now = options.now ?? new Date();
  const trigger = options.trigger ?? "manual";
  const limit = Math.max(1, Math.min(options.limit ?? dataset.collector.settings.maxItemsPerRun, 5));
  const backlog = [...dataset.collectorBacklog];
  const notes: string[] = [];
  const selected = backlog.slice(0, limit);
  const remainingBacklog = backlog.slice(limit);

  let itemsProcessed = 0;
  let draftsCreated = 0;
  let duplicatesSkipped = 0;
  const createdProjects: ProjectRecord[] = [];
  const failedItems: CollectorBacklogItem[] = [];

  if (!selected.length) {
    const emptyRun = finalizeRun({
      id: `collector-run-${now.getTime()}`,
      trigger,
      startedAt: now.toISOString(),
      completedAt: now.toISOString(),
      itemsRequested: limit,
      itemsProcessed: 0,
      draftsCreated: 0,
      duplicatesSkipped: 0,
      backlogRemaining: 0,
      notes: ["No backlog items were available."],
    });

    return {
      dataset: applyRun(dataset, emptyRun),
      run: emptyRun,
    };
  }

  for (const item of selected) {
    const duplicate = findDuplicate(item, [...dataset.projects, ...createdProjects]);
    if (duplicate) {
      duplicatesSkipped += 1;
      itemsProcessed += 1;
      notes.push(`Skipped duplicate source: ${item.title} matches ${duplicate.projectTitle}.`);
      continue;
    }

    try {
      const extracted = await extractDraftFromBacklog(item, dataset.taxonomy, dataset.collector.settings.sourceTextCharLimit);
      extracted.slug = ensureUniqueProjectSlug(extracted.slug, [...dataset.projects, ...createdProjects]);
      createdProjects.push(extracted);
      itemsProcessed += 1;
      draftsCreated += 1;
      notes.push(`Created draft record for ${extracted.projectTitle}.`);
    } catch (error) {
      failedItems.push(item);
      notes.push(`Failed ${item.title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const completedAt = new Date().toISOString();
  const status = determineStatus(draftsCreated, failedItems.length, itemsProcessed);
  const run = finalizeRun({
    id: `collector-run-${now.getTime()}`,
    trigger,
    status,
    startedAt: now.toISOString(),
    completedAt,
    itemsRequested: limit,
    itemsProcessed,
    draftsCreated,
    duplicatesSkipped,
    backlogRemaining: remainingBacklog.length + failedItems.length,
    notes,
  });

  const nextDataset = applyRun(
    {
      ...dataset,
      updatedAt: completedAt,
      collectorBacklog: [...failedItems, ...remainingBacklog],
      projects: [...createdProjects, ...dataset.projects],
    },
    run,
  );

  return { dataset: nextDataset, run };
}

function applyRun(dataset: IntelligenceDataset, run: CollectorRun): IntelligenceDataset {
  return {
    ...dataset,
    collector: {
      settings: {
        ...dataset.collector.settings,
        lastRunAt: run.completedAt,
        lastRunStatus: run.status,
      },
      runs: [run, ...dataset.collector.runs].slice(0, 20),
    },
    updatedAt: run.completedAt,
    collectorBacklog: dataset.collectorBacklog,
  };
}

function finalizeRun(run: Omit<CollectorRun, "status"> & { status?: CollectorRunStatus }): CollectorRun {
  return {
    ...run,
    status: run.status ?? "succeeded",
  };
}

function determineStatus(draftsCreated: number, failures: number, itemsProcessed: number): CollectorRunStatus {
  if (failures === 0) return "succeeded";
  if (draftsCreated > 0 || itemsProcessed > failures) return "partial";
  return "failed";
}

function findDuplicate(item: CollectorBacklogItem, projects: ProjectRecord[]) {
  return projects.find(
    (project) =>
      project.sourceUrl === item.sourceUrl ||
      slugify(project.projectTitle) === slugify(item.title),
  );
}

async function extractDraftFromBacklog(
  item: CollectorBacklogItem,
  taxonomy: Taxonomy,
  sourceTextCharLimit: number,
): Promise<ProjectRecord> {
  const source = await fetchSourceDocument(item.sourceUrl, sourceTextCharLimit);
  const extracted = await runTargetedExtractions(item, taxonomy, source);
  return buildProjectRecord(item, extracted, taxonomy);
}

async function runTargetedExtractions(
  backlog: CollectorBacklogItem,
  taxonomy: Taxonomy,
  source: { title: string; contentType: string; text: string },
) {
  const [summaryOutput, outcomeOutput, insightsOutput] = await Promise.all([
    callZo(buildSummaryPrompt(backlog, source), {
      outputFormat: {
        type: "object",
        properties: {
          projectSummary: { type: "string" },
          organizationName: { type: "string" },
          publicationDate: { type: "string" },
        },
        required: ["projectSummary"],
      },
    }),
    callZo(buildOutcomePrompt(backlog, source), {
      outputFormat: {
        type: "object",
        properties: {
          outcomeClassification: { type: "string", enum: [...OUTCOME_VALUES] },
          analystNotes: { type: "string" },
        },
        required: ["outcomeClassification"],
      },
    }),
    callZo(buildInsightsPrompt(backlog, taxonomy, source), {
      outputFormat: {
        type: "object",
        properties: {
          failureSignals: extractionOutputFormat.properties.failureSignals,
          lessonsLearned: extractionOutputFormat.properties.lessonsLearned,
          evidence: extractionOutputFormat.properties.evidence,
        },
        required: ["failureSignals", "lessonsLearned", "evidence"],
      },
    }),
  ]);

  const summary = parseSummaryOutput(summaryOutput.output, backlog);
  const outcome = parseOutcomeOutput(outcomeOutput.output);
  const insights = parseInsightsOutput(insightsOutput.output, backlog, taxonomy);

  return extractionSchema.parse({
    organizationName: summary.organizationName,
    publicationDate: summary.publicationDate,
    projectSummary: summary.projectSummary,
    outcomeClassification: outcome.outcomeClassification,
    failureSignals: insights.failureSignals,
    lessonsLearned: insights.lessonsLearned,
    evidence: insights.evidence,
    analystNotes: outcome.analystNotes,
  });
}

function buildProjectRecord(
  backlog: CollectorBacklogItem,
  extracted: z.infer<typeof extractionSchema>,
  taxonomy: Taxonomy,
): ProjectRecord {
  const baseDraft = normalizeForDraft(backlog, taxonomy);
  const normalizedSignals = dedupeSignals(
    extracted.failureSignals.map((signal) => ({
      raw: signal.raw.trim(),
      normalized: normalizeFailureSignal(signal.normalized || signal.raw, taxonomy),
      category: resolveSignalCategory(signal.category, signal.normalized || signal.raw, taxonomy),
    })),
  );
  const normalizedLessons = dedupeLessons(
    extracted.lessonsLearned.map((lesson) => ({
      raw: lesson.raw.trim(),
      normalized: normalizeLesson(lesson.normalized || lesson.raw, taxonomy),
    })),
  );

  return {
    ...baseDraft,
    organizationName: extracted.organizationName?.trim() || undefined,
    publicationDate: extracted.publicationDate?.trim() || backlog.publicationDate || null,
    projectSummary: extracted.projectSummary.trim(),
    outcomeClassification: extracted.outcomeClassification,
    failureSignals: normalizedSignals.length ? normalizedSignals : baseDraft.failureSignals,
    lessonsLearned: normalizedLessons.length ? normalizedLessons : baseDraft.lessonsLearned,
    evidence: dedupeStrings(extracted.evidence, 6),
    analystNotes:
      extracted.analystNotes?.trim() ||
      "LLM extraction completed from scheduled collector source. Analyst review required before publish.",
  };
}

async function fetchSourceDocument(url: string, sourceTextCharLimit: number) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; Project Failure Intelligence Collector/1.0; +https://thomstech.zo.computer)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`source fetch returned ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const title = extractTitle(body);
  const text = toPlainText(body, contentType).slice(0, sourceTextCharLimit);
  if (text.length < 800) {
    throw new Error("source text too short for extraction");
  }

  return { title, contentType, text };
}

function buildSummaryPrompt(backlog: CollectorBacklogItem, source: { title: string; contentType: string; text: string }) {
  return [
    "Summarize this enterprise technology failure case for an intelligence database.",
    "Return only the requested fields. No markdown.",
    "",
    `Title hint: ${backlog.title}`,
    `Summary hint: ${backlog.summaryHint}`,
    `Publication date hint: ${backlog.publicationDate ?? "Unknown"}`,
    `Source title: ${source.title}`,
    `Source content type: ${source.contentType}`,
    "Produce a 2-4 sentence summary focused on what happened and why it mattered.",
    "If the organization name or publication date is not clear, return an empty string for that field.",
    "",
    "Source text:",
    source.text,
  ].join("\n");
}

function buildOutcomePrompt(backlog: CollectorBacklogItem, source: { title: string; text: string }) {
  return [
    "Classify the project outcome from this source.",
    "Return only the requested fields. No markdown.",
    `Title hint: ${backlog.title}`,
    `Summary hint: ${backlog.summaryHint}`,
    "",
    "Allowed values:",
    OUTCOME_VALUES.map((value) => `- ${value}`).join("\n"),
    "",
    "Use analystNotes for one short reason behind the classification.",
    "",
    "Source text:",
    source.text,
  ].join("\n");
}

function buildInsightsPrompt(
  backlog: CollectorBacklogItem,
  taxonomy: Taxonomy,
  source: { title: string; text: string },
) {
  const signalTaxonomy = Object.entries(taxonomy.signalCategories)
    .map(([category, values]) => `- ${category}: ${values.join(", ")}`)
    .join("\n");
  const lessonTaxonomy = taxonomy.lessonTaxonomy.map((value) => `- ${value}`).join("\n");

  return [
    "Extract reusable project-failure intelligence from this source.",
    "Return only the requested fields. No markdown.",
    `Title hint: ${backlog.title}`,
    `Candidate signals: ${backlog.candidateSignals.join("; ") || "None"}`,
    `Candidate lessons: ${backlog.candidateLessons.join("; ") || "None"}`,
    "",
    "Use this signal taxonomy when possible:",
    signalTaxonomy,
    "",
    "Use this lesson taxonomy when possible:",
    lessonTaxonomy,
    "",
    "Extract 3-6 failure signals, 2-5 lessons, and 2-5 evidence snippets.",
    "Evidence snippets must be short factual statements drawn from the source.",
    "",
    `Source title: ${source.title}`,
    "Source text:",
    source.text,
  ].join("\n");
}

function extractTitle(html: string) {
  return (
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ||
    "Untitled source"
  );
}

function toPlainText(body: string, contentType: string) {
  if (!contentType.includes("html")) {
    return collapseWhitespace(body);
  }

  return collapseWhitespace(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
  );
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeSignals(signals: ProjectRecord["failureSignals"]) {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.category}::${signal.normalized}`;
    if (!signal.raw || !signal.normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeLessons(lessons: ProjectRecord["lessonsLearned"]) {
  const seen = new Set<string>();
  return lessons.filter((lesson) => {
    const key = lesson.normalized;
    if (!lesson.raw || !lesson.normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeStrings(values: string[], limit: number) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

function resolveSignalCategory(category: string, signal: string, taxonomy: Taxonomy) {
  const trimmedCategory = category.trim();
  if (trimmedCategory && Object.hasOwn(taxonomy.signalCategories, trimmedCategory)) {
    return trimmedCategory;
  }
  return categorizeFailureSignal(signal, taxonomy);
}

async function parseExtractionOutput(output: unknown) {
  try {
    return extractionSchema.parse(unwrapExtractionCandidate(coerceStructuredOutput(output)));
  } catch (error) {
    if (typeof output !== "string") {
      throw error;
    }
    const repair = await callZo(
      [
        "Convert the following malformed extraction output into valid JSON only.",
        "Do not add commentary or markdown fences.",
        "Keep the meaning intact and preserve only the fields required by the schema.",
        "",
        output,
      ].join("\n"),
      { outputFormat: extractionOutputFormat },
    );
    return extractionSchema.parse(unwrapExtractionCandidate(coerceStructuredOutput(repair.output)));
  }
}

function parseSummaryOutput(output: unknown, backlog: CollectorBacklogItem) {
  const candidate = unwrapExtractionCandidate(coerceStructuredOutput(output)) as Record<string, unknown>;
  return {
    projectSummary:
      pickString(candidate, ["projectSummary", "summary", "project_summary"]) || backlog.summaryHint,
    organizationName: pickString(candidate, ["organizationName", "organization", "company"]) || "",
    publicationDate: pickString(candidate, ["publicationDate", "date", "publishedAt"]) || backlog.publicationDate || "",
  };
}

function parseOutcomeOutput(output: unknown) {
  const candidate = unwrapExtractionCandidate(coerceStructuredOutput(output)) as Record<string, unknown>;
  const outcome =
    pickString(candidate, ["outcomeClassification", "outcome", "classification"]) || "Unknown";
  const safeOutcome = OUTCOME_VALUES.includes(outcome as OutcomeClassification)
    ? (outcome as OutcomeClassification)
    : "Unknown";

  return {
    outcomeClassification: safeOutcome,
    analystNotes: pickString(candidate, ["analystNotes", "rationale", "notes"]) || "",
  };
}

function parseInsightsOutput(output: unknown, backlog: CollectorBacklogItem, taxonomy: Taxonomy) {
  const candidate = unwrapExtractionCandidate(coerceStructuredOutput(output)) as Record<string, unknown>;
  const failureSignals = toSignalArray(
    pickArray(candidate, ["failureSignals", "signals"]),
    backlog.candidateSignals,
    taxonomy,
  );
  const lessonsLearned = toLessonArray(
    pickArray(candidate, ["lessonsLearned", "lessons"]),
    backlog.candidateLessons,
    taxonomy,
  );
  const evidence = toEvidenceArray(pickArray(candidate, ["evidence", "evidenceSnippets", "snippets"]), backlog.summaryHint);

  return { failureSignals, lessonsLearned, evidence };
}

function coerceStructuredOutput(output: unknown) {
  if (typeof output === "string") {
    const trimmed = output.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");
    const candidate =
      objectStart >= 0 && objectEnd > objectStart ? trimmed.slice(objectStart, objectEnd + 1) : trimmed;
    return JSON.parse(candidate) as unknown;
  }
  return output;
}

function unwrapExtractionCandidate(output: unknown): unknown {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return output;
  }

  const record = output as Record<string, unknown>;
  if ("projectSummary" in record || "failureSignals" in record || "lessonsLearned" in record) {
    return record;
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if ("projectSummary" in nested || "failureSignals" in nested || "lessonsLearned" in nested) {
        return nested;
      }
    }
  }

  return output;
}

function pickString(candidate: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function pickArray(candidate: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = candidate[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function toSignalArray(values: unknown[], fallback: string[], taxonomy: Taxonomy) {
  if (!values.length) {
    return fallback.map((signal) => ({
      raw: signal,
      normalized: normalizeFailureSignal(signal, taxonomy),
      category: categorizeFailureSignal(signal, taxonomy),
    }));
  }

  return values
    .map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const entry = value as Record<string, unknown>;
      const raw = pickString(entry, ["raw", "signal", "description"]);
      const normalized = pickString(entry, ["normalized", "normalizedSignal", "label"]) || raw;
      const category = resolveSignalCategory(
        pickString(entry, ["category", "signalCategory"]),
        normalized || raw,
        taxonomy,
      );
      if (!raw) return null;
      return { raw, normalized: normalizeFailureSignal(normalized, taxonomy), category };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function toLessonArray(values: unknown[], fallback: string[], taxonomy: Taxonomy) {
  if (!values.length) {
    return fallback.map((lesson) => ({
      raw: lesson,
      normalized: normalizeLesson(lesson, taxonomy),
    }));
  }

  return values
    .map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const entry = value as Record<string, unknown>;
      const raw = pickString(entry, ["raw", "lesson", "description"]);
      const normalized = pickString(entry, ["normalized", "normalizedLesson", "label"]) || raw;
      if (!raw) return null;
      return { raw, normalized: normalizeLesson(normalized, taxonomy) };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function toEvidenceArray(values: unknown[], fallback: string) {
  const evidence = values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return evidence.length ? evidence : [fallback];
}
