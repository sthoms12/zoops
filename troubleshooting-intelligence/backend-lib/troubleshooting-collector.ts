import { z } from "zod";

import { callZo } from "./zo-api";
import {
  hydrateDataset,
  slugify,
  type AnalysisConfidence,
  type CollectorBacklogItem,
  type CollectorRun,
  type CollectorRunStatus,
  type CollectorTrigger,
  type IntelligenceDataset,
  type InvestigationTimelineStep,
  type Taxonomy,
  type TroubleshootingCase,
  type TroubleshootingCaseAnalystSynthesis,
  type TroubleshootingCaseSourceExtraction,
  type TroubleshootingEvidenceItem,
  type TroubleshootingEvidenceSourceType,
  type TroubleshootingTechnologyArea,
} from "@/lib/intelligence";

const TECHNOLOGY_AREAS = [
  "Microsoft 365",
  "Identity & Access Management",
  "Endpoint Management",
  "Security",
  "Networking",
  "Cloud Infrastructure",
  "AI & Automation",
  "Applications",
  "Other",
] as const satisfies TroubleshootingTechnologyArea[];

const EVIDENCE_SOURCE_TYPES = [
  "time-correlated-telemetry",
  "rollout-change-history",
  "cross-region-comparison",
  "dependency-health-signal",
  "protocol-native-evidence",
  "physical-infrastructure-signal",
  "customer-symptom",
  "external-observation",
] as const satisfies TroubleshootingEvidenceSourceType[];

const CONFIDENCE_VALUES = ["low", "medium", "high"] as const satisfies AnalysisConfidence[];

const sourceExtractionSchema = z.object({
  title: z.string().min(8),
  sourceTitle: z.string().min(8),
  date: z.string().min(8),
  technologyArea: z.enum(TECHNOLOGY_AREAS),
  problemSummary: z.string().min(50),
  problemStatement: z.string().min(30),
  initialAssumptions: z.array(z.string().min(10)).min(1).max(5),
  investigationTimeline: z.array(
    z.object({
      order: z.number().int().min(1),
      action: z.string().min(8),
      outcome: z.string().min(12),
    }),
  ).min(3).max(8),
  evidenceCollected: z.array(
    z.object({
      sourceType: z.enum(EVIDENCE_SOURCE_TYPES),
      detail: z.string().min(6),
      finding: z.string().min(12),
    }),
  ).min(2).max(8),
  deadEnds: z.array(z.string().min(8)).max(5).default([]),
  keyTurningPoints: z.array(z.string().min(10)).min(1).max(5),
  rootCause: z.string().min(12),
  resolution: z.string().min(12),
  lessonsLearned: z.array(z.string().min(10)).min(1).max(6),
});

const analystSynthesisSchema = z.object({
  effectiveTechniques: z.array(z.string().min(8)).min(1).max(6),
  commonMistakes: z.array(z.string().min(8)).min(1).max(5),
  incorrectAssumptions: z.array(z.string().min(8)).max(5).default([]),
  highValueEvidenceSources: z.array(z.string().min(8)).min(1).max(6),
  diagnosticShortcuts: z.array(z.string().min(8)).max(5).default([]),
  antiPatterns: z.array(z.string().min(8)).max(5).default([]),
  troubleshootingPrinciples: z.array(z.string().min(8)).min(1).max(6),
  skillIndicators: z.object({
    beginner: z.array(z.string().min(8)).min(1).max(3),
    intermediate: z.array(z.string().min(8)).min(1).max(3),
    advanced: z.array(z.string().min(8)).min(1).max(3),
    expert: z.array(z.string().min(8)).min(1).max(3),
  }),
  complexityScore: z.number().int().min(1).max(10),
  complexityJustification: z.string().min(20),
  confidence: z.enum(CONFIDENCE_VALUES),
  caseOfWeekEligible: z.boolean(),
});

const sourceExtractionOutputFormat = {
  type: "object",
  properties: {
    title: { type: "string" },
    sourceTitle: { type: "string" },
    date: { type: "string" },
    technologyArea: { type: "string", enum: [...TECHNOLOGY_AREAS] },
    problemSummary: { type: "string" },
    problemStatement: { type: "string" },
    initialAssumptions: { type: "array", items: { type: "string" } },
    investigationTimeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          order: { type: "number" },
          action: { type: "string" },
          outcome: { type: "string" },
        },
        required: ["order", "action", "outcome"],
      },
    },
    evidenceCollected: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceType: { type: "string", enum: [...EVIDENCE_SOURCE_TYPES] },
          detail: { type: "string" },
          finding: { type: "string" },
        },
        required: ["sourceType", "detail", "finding"],
      },
    },
    deadEnds: { type: "array", items: { type: "string" } },
    keyTurningPoints: { type: "array", items: { type: "string" } },
    rootCause: { type: "string" },
    resolution: { type: "string" },
    lessonsLearned: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "sourceTitle",
    "date",
    "technologyArea",
    "problemSummary",
    "problemStatement",
    "initialAssumptions",
    "investigationTimeline",
    "evidenceCollected",
    "keyTurningPoints",
    "rootCause",
    "resolution",
    "lessonsLearned",
  ],
} as const;

const analystSynthesisOutputFormat = {
  type: "object",
  properties: {
    effectiveTechniques: { type: "array", items: { type: "string" } },
    commonMistakes: { type: "array", items: { type: "string" } },
    incorrectAssumptions: { type: "array", items: { type: "string" } },
    highValueEvidenceSources: { type: "array", items: { type: "string" } },
    diagnosticShortcuts: { type: "array", items: { type: "string" } },
    antiPatterns: { type: "array", items: { type: "string" } },
    troubleshootingPrinciples: { type: "array", items: { type: "string" } },
    skillIndicators: {
      type: "object",
      properties: {
        beginner: { type: "array", items: { type: "string" } },
        intermediate: { type: "array", items: { type: "string" } },
        advanced: { type: "array", items: { type: "string" } },
        expert: { type: "array", items: { type: "string" } },
      },
      required: ["beginner", "intermediate", "advanced", "expert"],
    },
    complexityScore: { type: "number" },
    complexityJustification: { type: "string" },
    confidence: { type: "string", enum: [...CONFIDENCE_VALUES] },
    caseOfWeekEligible: { type: "boolean" },
  },
  required: [
    "effectiveTechniques",
    "commonMistakes",
    "highValueEvidenceSources",
    "troubleshootingPrinciples",
    "skillIndicators",
    "complexityScore",
    "complexityJustification",
    "confidence",
    "caseOfWeekEligible",
  ],
} as const;

type CollectorCycleOptions = {
  limit?: number;
  trigger?: CollectorTrigger;
  now?: Date;
};

type CollectorCycleResult = {
  dataset: IntelligenceDataset;
  run: CollectorRun;
};

export async function runTroubleshootingCollectorCycle(
  sourceDataset: IntelligenceDataset,
  options: CollectorCycleOptions = {},
): Promise<CollectorCycleResult> {
  const dataset = hydrateDataset(sourceDataset);
  const now = options.now ?? new Date();
  const trigger = options.trigger ?? "manual";
  const configuredLimit = options.limit ?? dataset.collector.settings.maxItemsPerRun ?? 1;
  const limit = Math.max(1, Math.min(configuredLimit, 5));
  const backlog = [...dataset.collectorBacklog];
  const selected = backlog.slice(0, limit);
  const remainingBacklog = backlog.slice(limit);
  const notes: string[] = [];

  let itemsProcessed = 0;
  let draftsCreated = 0;
  let duplicatesSkipped = 0;
  const failedItems: CollectorBacklogItem[] = [];
  const createdCases: TroubleshootingCase[] = [];

  if (!selected.length) {
    const emptyRun = finalizeRun({
      id: `troubleshooting-collector-run-${now.getTime()}`,
      trigger,
      startedAt: now.toISOString(),
      completedAt: now.toISOString(),
      itemsRequested: limit,
      itemsProcessed: 0,
      draftsCreated: 0,
      duplicatesSkipped: 0,
      backlogRemaining: 0,
      notes: ["No troubleshooting backlog items were available."],
    });

    return {
      dataset: applyRun(dataset, emptyRun),
      run: emptyRun,
    };
  }

  for (const item of selected) {
    const duplicate = findDuplicateCase(item, [...dataset.troubleshootingCases, ...createdCases]);
    if (duplicate) {
      duplicatesSkipped += 1;
      itemsProcessed += 1;
      notes.push(`Skipped duplicate source: ${item.title} matches ${duplicate.title}.`);
      continue;
    }

    try {
      const extracted = await extractTroubleshootingCase(item, dataset.taxonomy, dataset.collector.settings.sourceTextCharLimit);
      const nextRecord = ensureUniqueTroubleshootingCase(extracted, [...dataset.troubleshootingCases, ...createdCases]);
      createdCases.push(nextRecord);
      itemsProcessed += 1;
      draftsCreated += 1;
      notes.push(`Created troubleshooting draft for ${nextRecord.title}.`);
    } catch (error) {
      failedItems.push(item);
      notes.push(`Failed ${item.title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const completedAt = new Date().toISOString();
  const run = finalizeRun({
    id: `troubleshooting-collector-run-${now.getTime()}`,
    trigger,
    status: determineStatus(draftsCreated, failedItems.length, itemsProcessed),
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
      troubleshootingCases: [...createdCases, ...dataset.troubleshootingCases],
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

function findDuplicateCase(item: CollectorBacklogItem, cases: TroubleshootingCase[]) {
  const targetSlug = slugify(item.title);
  return cases.find((record) => record.sourceUrl === item.sourceUrl || record.slug === targetSlug);
}

function ensureUniqueTroubleshootingCase(record: TroubleshootingCase, cases: TroubleshootingCase[]) {
  const existingSlugs = new Set(cases.map((item) => item.slug));
  const existingIds = new Set(cases.map((item) => item.id));
  const baseSlug = slugify(record.slug || record.title);
  let nextSlug = baseSlug;
  let index = 2;
  while (existingSlugs.has(nextSlug)) {
    nextSlug = `${baseSlug}-${index}`;
    index += 1;
  }

  const baseId = `tc-${normalizeDateKey(record.date)}-${baseSlug}`;
  let nextId = baseId;
  index = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${index}`;
    index += 1;
  }

  return {
    ...record,
    id: nextId,
    slug: nextSlug,
  };
}

async function extractTroubleshootingCase(
  backlog: CollectorBacklogItem,
  taxonomy: Taxonomy,
  sourceTextCharLimit: number,
): Promise<TroubleshootingCase> {
  const source = await fetchSourceDocument(backlog.sourceUrl, sourceTextCharLimit);
  const [sourceExtractionResult, analystSynthesisResult] = await Promise.all([
    callZo(buildSourceExtractionPrompt(backlog, source, taxonomy), {
      outputFormat: sourceExtractionOutputFormat,
    }),
    callZo(buildAnalystSynthesisPrompt(backlog, source, taxonomy), {
      outputFormat: analystSynthesisOutputFormat,
    }),
  ]);

  const sourceExtraction = await parseSourceExtractionOutput(sourceExtractionResult.output, backlog, source);
  const analystSynthesis = await parseAnalystSynthesisOutput(analystSynthesisResult.output, sourceExtraction);

  return {
    id: "",
    slug: slugify(sourceExtraction.title),
    status: "draft",
    reviewStatus: "pending_review",
    title: sourceExtraction.title.trim(),
    sourceTitle: sourceExtraction.sourceTitle.trim(),
    sourceUrl: backlog.sourceUrl,
    sourceType: backlog.sourceType || inferSourceType(source.title),
    date: normalizeSourceDate(sourceExtraction.date, backlog.publicationDate),
    technologyArea: sourceExtraction.technologyArea,
    problemSummary: sourceExtraction.problemSummary.trim(),
    sourceExtraction: normalizeSourceExtraction(sourceExtraction),
    analystSynthesis: normalizeAnalystSynthesis(analystSynthesis),
    confidence: analystSynthesis.confidence,
    caseOfWeekEligible: analystSynthesis.caseOfWeekEligible,
  };
}

function normalizeSourceExtraction(
  value: z.infer<typeof sourceExtractionSchema>,
): TroubleshootingCaseSourceExtraction {
  const sortedTimeline = [...value.investigationTimeline]
    .sort((left, right) => left.order - right.order)
    .map((step, index) => ({
      order: index + 1,
      action: step.action.trim(),
      outcome: step.outcome.trim(),
    })) satisfies InvestigationTimelineStep[];

  return {
    problemStatement: value.problemStatement.trim(),
    initialAssumptions: dedupeStrings(value.initialAssumptions, 5),
    investigationTimeline: sortedTimeline,
    evidenceCollected: value.evidenceCollected.map((item) => ({
      sourceType: item.sourceType,
      detail: item.detail.trim(),
      finding: item.finding.trim(),
    })) satisfies TroubleshootingEvidenceItem[],
    deadEnds: dedupeStrings(value.deadEnds, 5),
    keyTurningPoints: dedupeStrings(value.keyTurningPoints, 5),
    rootCause: value.rootCause.trim(),
    resolution: value.resolution.trim(),
    lessonsLearned: dedupeStrings(value.lessonsLearned, 6),
  };
}

function normalizeAnalystSynthesis(
  value: z.infer<typeof analystSynthesisSchema>,
): TroubleshootingCaseAnalystSynthesis {
  return {
    effectiveTechniques: dedupeStrings(value.effectiveTechniques, 6),
    commonMistakes: dedupeStrings(value.commonMistakes, 5),
    incorrectAssumptions: dedupeStrings(value.incorrectAssumptions, 5),
    highValueEvidenceSources: dedupeStrings(value.highValueEvidenceSources, 6),
    diagnosticShortcuts: dedupeStrings(value.diagnosticShortcuts, 5),
    antiPatterns: dedupeStrings(value.antiPatterns, 5),
    troubleshootingPrinciples: dedupeStrings(value.troubleshootingPrinciples, 6),
    skillIndicators: {
      beginner: dedupeStrings(value.skillIndicators.beginner, 3),
      intermediate: dedupeStrings(value.skillIndicators.intermediate, 3),
      advanced: dedupeStrings(value.skillIndicators.advanced, 3),
      expert: dedupeStrings(value.skillIndicators.expert, 3),
    },
    complexityScore: value.complexityScore,
    complexityJustification: value.complexityJustification.trim(),
  };
}

async function fetchSourceDocument(url: string, sourceTextCharLimit: number) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; Troubleshooting Intelligence Collector/1.0; +https://thomstech.zo.computer)",
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
    throw new Error("source text too short for troubleshooting extraction");
  }

  return { title, contentType, text };
}

function buildSourceExtractionPrompt(
  backlog: CollectorBacklogItem,
  source: { title: string; contentType: string; text: string },
  taxonomy: Taxonomy,
) {
  return [
    "Extract a structured troubleshooting case from this source.",
    "Focus on the investigation process, not only the final fix.",
    "Return only the requested fields. No markdown.",
    "",
    `Title hint: ${backlog.title}`,
    `Summary hint: ${backlog.summaryHint || "None"}`,
    `Publication date hint: ${backlog.publicationDate ?? "Unknown"}`,
    `Source title: ${source.title}`,
    `Source content type: ${source.contentType}`,
    `Allowed technology areas: ${taxonomy.troubleshooting.technologyAreas.join("; ")}`,
    `Allowed evidence source types: ${taxonomy.troubleshooting.evidenceSourceTypes.join("; ")}`,
    "",
    "Requirements:",
    "- Write a concise but specific case title.",
    "- Prefer the source's actual publication title for sourceTitle.",
    "- problemSummary should be 2-4 sentences.",
    "- investigationTimeline should preserve the order of troubleshooting steps.",
    "- evidenceCollected should include concrete observations, logs, tests, or comparisons that changed the diagnosis.",
    "- deadEnds should be empty if the source does not clearly describe any.",
    "",
    "Source text:",
    source.text,
  ].join("\n");
}

function buildAnalystSynthesisPrompt(
  backlog: CollectorBacklogItem,
  source: { title: string; text: string },
  taxonomy: Taxonomy,
) {
  return [
    "Analyze this troubleshooting source like an intelligence analyst.",
    "Focus on reusable reasoning, not generic management lessons.",
    "Return only the requested fields. No markdown.",
    "",
    `Title hint: ${backlog.title}`,
    `Summary hint: ${backlog.summaryHint || "None"}`,
    `Allowed mistake types (reference only): ${taxonomy.troubleshooting.mistakeTypes.join("; ")}`,
    `Allowed evidence source types (reference only): ${taxonomy.troubleshooting.evidenceSourceTypes.join("; ")}`,
    `Allowed turning point types (reference only): ${taxonomy.troubleshooting.turningPointTypes.join("; ")}`,
    "",
    "Requirements:",
    "- effectiveTechniques should name what the investigators did well.",
    "- commonMistakes should describe actual or implied troubleshooting mistakes from the case.",
    "- highValueEvidenceSources should name the strongest diagnostic evidence in plain language.",
    "- troubleshootingPrinciples should be reusable across other incidents.",
    "- skillIndicators should describe what a beginner, intermediate, advanced, or expert troubleshooter would notice in this case.",
    "- complexityScore should be 1-10.",
    "- caseOfWeekEligible should be true only if the case has visible ambiguity, meaningful evidence, and a clear turning point.",
    "",
    "Source text:",
    source.text,
  ].join("\n");
}

function extractTitle(html: string) {
  return (
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
    || html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim()
    || "Untitled source"
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

async function parseSourceExtractionOutput(
  output: unknown,
  backlog: CollectorBacklogItem,
  source: { title: string; contentType: string; text: string },
) {
  try {
    return sourceExtractionSchema.parse(
      normalizeSourceExtractionCandidate(unwrapTroubleshootingCandidate(coerceStructuredOutput(output)), backlog, source),
    );
  } catch (error) {
    try {
      const repair = await callZo(
        [
          "Convert the following malformed troubleshooting case extraction into valid JSON only.",
          "Do not add commentary or markdown fences.",
          "Flatten or reshape fields as needed to match the requested schema exactly.",
          "",
          typeof output === "string" ? output : JSON.stringify(output, null, 2),
        ].join("\n"),
        { outputFormat: sourceExtractionOutputFormat },
      );
      return sourceExtractionSchema.parse(
        normalizeSourceExtractionCandidate(unwrapTroubleshootingCandidate(coerceStructuredOutput(repair.output)), backlog, source),
      );
    } catch {
      return sourceExtractionSchema.parse(normalizeSourceExtractionCandidate({}, backlog, source));
    }
  }
}

async function parseAnalystSynthesisOutput(
  output: unknown,
  sourceExtraction: z.infer<typeof sourceExtractionSchema>,
) {
  try {
    return analystSynthesisSchema.parse(
      normalizeAnalystSynthesisCandidate(unwrapTroubleshootingCandidate(coerceStructuredOutput(output)), sourceExtraction),
    );
  } catch (error) {
    try {
      const repair = await callZo(
        [
          "Convert the following malformed troubleshooting analyst synthesis into valid JSON only.",
          "Do not add commentary or markdown fences.",
          "Flatten or reshape fields as needed to match the requested schema exactly.",
          "",
          typeof output === "string" ? output : JSON.stringify(output, null, 2),
        ].join("\n"),
        { outputFormat: analystSynthesisOutputFormat },
      );
      return analystSynthesisSchema.parse(
        normalizeAnalystSynthesisCandidate(unwrapTroubleshootingCandidate(coerceStructuredOutput(repair.output)), sourceExtraction),
      );
    } catch {
      return analystSynthesisSchema.parse(normalizeAnalystSynthesisCandidate({}, sourceExtraction));
    }
  }
}

function unwrapTroubleshootingCandidate(output: unknown): unknown {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return output;
  }

  const record = output as Record<string, unknown>;
  if ("problemSummary" in record || "effectiveTechniques" in record || "troubleshootingPrinciples" in record) {
    return record;
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if ("problemSummary" in nested || "effectiveTechniques" in nested || "troubleshootingPrinciples" in nested) {
        return nested;
      }
    }
  }

  return output;
}

function dedupeStrings(values: string[], limit: number) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

function normalizeSourceExtractionCandidate(
  output: unknown,
  backlog: CollectorBacklogItem,
  source: { title: string; contentType: string; text: string },
) {
  const candidate = asRecord(output);
  const timelineRaw = pickArray(candidate, ["investigationTimeline", "timeline", "steps"]);
  const evidenceRaw = pickArray(candidate, ["evidenceCollected", "evidence", "evidenceItems"]);

  return {
    title: pickString(candidate, ["title", "caseTitle", "headline"]) || backlog.title,
    sourceTitle: pickString(candidate, ["sourceTitle", "originalTitle"]) || source.title,
    date: pickString(candidate, ["date", "publicationDate", "publishedAt"]) || backlog.publicationDate || new Date().toISOString().slice(0, 10),
    technologyArea: normalizeTechnologyArea(pickString(candidate, ["technologyArea", "category", "technology"]), backlog.technologyArea),
    problemSummary: ensureMinLength(
      pickString(candidate, ["problemSummary", "summary"]),
      backlog.summaryHint || truncateText(source.text, 320),
      50,
    ),
    problemStatement: ensureMinLength(
      pickString(candidate, ["problemStatement", "problem", "issue"]),
      backlog.summaryHint || truncateText(source.text, 240),
      30,
    ),
    initialAssumptions: normalizeStringArray(
      pickArray(candidate, ["initialAssumptions", "assumptions"]),
      ["The initial fault domain was ambiguous from the top-level symptom alone."],
      5,
    ),
    investigationTimeline: normalizeTimeline(timelineRaw),
    evidenceCollected: normalizeEvidence(evidenceRaw),
    deadEnds: normalizeStringArray(pickArray(candidate, ["deadEnds", "wrongTurns"]), [], 5),
    keyTurningPoints: normalizeStringArray(
      pickArray(candidate, ["keyTurningPoints", "turningPoints"]),
      ["Comparative or protocol-level evidence narrowed the diagnosis materially."],
      5,
    ),
    rootCause: pickString(candidate, ["rootCause", "cause"]) || "The root cause was identified through the investigation described in the source.",
    resolution: pickString(candidate, ["resolution", "mitigation", "fix"]) || "The source describes how the service was restored after the root cause was isolated.",
    lessonsLearned: normalizeStringArray(
      pickArray(candidate, ["lessonsLearned", "lessons"]),
      ["Preserve the diagnostic sequence and evidence, not only the final fix."],
      6,
    ),
  };
}

function normalizeAnalystSynthesisCandidate(
  output: unknown,
  sourceExtraction: z.infer<typeof sourceExtractionSchema>,
) {
  const candidate = asRecord(output);
  return {
    effectiveTechniques: normalizeStringArray(
      pickArray(candidate, ["effectiveTechniques", "techniques"]),
      ["Follow the evidence in order and keep narrowing the fault domain."],
      6,
    ),
    commonMistakes: normalizeStringArray(
      pickArray(candidate, ["commonMistakes", "mistakes"]),
      ["Stopping too early at the first plausible explanation."],
      5,
    ),
    incorrectAssumptions: normalizeStringArray(
      pickArray(candidate, ["incorrectAssumptions", "assumptions"]),
      [],
      5,
    ),
    highValueEvidenceSources: normalizeStringArray(
      pickArray(candidate, ["highValueEvidenceSources", "evidenceSources"]),
      sourceExtraction.evidenceCollected.map((item) => `${item.detail}: ${item.finding}`),
      6,
    ),
    diagnosticShortcuts: normalizeStringArray(
      pickArray(candidate, ["diagnosticShortcuts", "shortcuts"]),
      [],
      5,
    ),
    antiPatterns: normalizeStringArray(
      pickArray(candidate, ["antiPatterns", "antipatterns"]),
      [],
      5,
    ),
    troubleshootingPrinciples: normalizeStringArray(
      pickArray(candidate, ["troubleshootingPrinciples", "principles"]),
      sourceExtraction.lessonsLearned,
      6,
    ),
    skillIndicators: normalizeSkillIndicators(candidate.skillIndicators),
    complexityScore: normalizeComplexityScore(candidate.complexityScore),
    complexityJustification:
      pickString(candidate, ["complexityJustification", "complexityReason"]) ||
      "The case involves enough ambiguity and evidence collection to teach a reusable troubleshooting process.",
    confidence: normalizeConfidence(pickString(candidate, ["confidence"])),
    caseOfWeekEligible: normalizeBoolean(candidate.caseOfWeekEligible, sourceExtraction),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function pickString(candidate: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickArray(candidate: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = candidate[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeStringArray(values: unknown[], fallback: string[], limit: number) {
  const normalized = values
    .map((value) => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const entry = value as Record<string, unknown>;
        return pickString(entry, ["value", "text", "description", "detail", "finding", "label"]);
      }
      return "";
    })
    .filter(Boolean);

  return dedupeStrings(normalized.length ? normalized : fallback, limit);
}

function normalizeTimeline(values: unknown[]) {
  const normalized = values
    .map((value, index) => {
      if (typeof value === "string" && value.trim()) {
        return {
          order: index + 1,
          action: `Step ${index + 1}`,
          outcome: value.trim(),
        };
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const entry = value as Record<string, unknown>;
        const order = typeof entry.order === "number" ? entry.order : index + 1;
        const action = pickString(entry, ["action", "step", "title"]) || `Step ${index + 1}`;
        const outcome = pickString(entry, ["outcome", "finding", "description", "result"]);
        if (outcome) {
          return { order, action, outcome };
        }
      }
      return null;
    })
    .filter((value): value is { order: number; action: string; outcome: string } => Boolean(value))
    .slice(0, 8);

  if (normalized.length >= 3) return normalized;
  if (normalized.length === 2) {
    return [
      ...normalized,
      {
        order: 3,
        action: "Confirm restoration path",
        outcome: "The analyst should verify how the source describes mitigation, validation, and recovery sequencing before publication.",
      },
    ];
  }
  if (normalized.length === 1) {
    return [
      normalized[0],
      {
        order: 2,
        action: "Collect supporting evidence",
        outcome: "The analyst should extract the key observations, comparisons, or telemetry that materially narrowed the diagnosis.",
      },
      {
        order: 3,
        action: "Confirm restoration path",
        outcome: "The analyst should verify how the source describes mitigation, validation, and recovery sequencing before publication.",
      },
    ];
  }

  return [
    {
      order: 1,
      action: "Review the source investigation",
      outcome: "The source contained a troubleshooting sequence that should be reviewed and structured by an analyst before publication.",
    },
    {
      order: 2,
      action: "Collect supporting evidence",
      outcome: "The analyst should extract the key observations, comparisons, or telemetry that materially narrowed the diagnosis.",
    },
    {
      order: 3,
      action: "Confirm restoration path",
      outcome: "The analyst should verify how the source describes mitigation, validation, and recovery sequencing before publication.",
    },
  ];
}

function normalizeEvidence(values: unknown[]) {
  const normalized = values
    .map((value) => {
      if (typeof value === "string" && value.trim()) {
        return {
          sourceType: "external-observation" as const,
          detail: "Evidence item",
          finding: value.trim(),
        };
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const entry = value as Record<string, unknown>;
        const sourceType = normalizeEvidenceSourceType(pickString(entry, ["sourceType", "type", "category"]));
        const detail = pickString(entry, ["detail", "label", "title"]) || "Evidence item";
        const finding = pickString(entry, ["finding", "description", "value", "text"]);
        if (finding) {
          return { sourceType, detail, finding };
        }
      }
      return null;
    })
    .filter((value): value is { sourceType: TroubleshootingEvidenceSourceType; detail: string; finding: string } => Boolean(value))
    .slice(0, 8);

  if (normalized.length >= 2) return normalized;
  if (normalized.length === 1) {
    return [
      normalized[0],
      {
        sourceType: "external-observation" as const,
        detail: "Supporting source narrative",
        finding: "The source should be reviewed for an additional concrete observation before publication.",
      },
    ];
  }

  return [
    {
      sourceType: "external-observation" as const,
      detail: "Source narrative",
      finding: "The source contains enough incident detail for analyst review, but the evidence structure should be refined before publication.",
    },
    {
      sourceType: "customer-symptom" as const,
      detail: "Reported impact",
      finding: "The externally visible symptom should be confirmed and sharpened during analyst review before publishing the case.",
    },
  ];
}

function normalizeSkillIndicators(value: unknown) {
  const candidate = asRecord(value);
  return {
    beginner: normalizeStringArray(pickArray(candidate, ["beginner"]), ["Notices the symptom but has not yet separated symptom from cause."], 3),
    intermediate: normalizeStringArray(pickArray(candidate, ["intermediate"]), ["Begins comparing evidence sources instead of trusting the first explanation."], 3),
    advanced: normalizeStringArray(pickArray(candidate, ["advanced"]), ["Uses comparative evidence and sequencing to narrow the fault domain."], 3),
    expert: normalizeStringArray(pickArray(candidate, ["expert"]), ["Preserves the reasoning process clearly enough that others can reuse it."], 3),
  };
}

function normalizeComplexityScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.min(10, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(1, Math.min(10, parsed));
  }
  return 6;
}

function normalizeConfidence(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized as AnalysisConfidence;
  }
  return "medium";
}

function normalizeBoolean(value: unknown, sourceExtraction: z.infer<typeof sourceExtractionSchema>) {
  if (typeof value === "boolean") return value;
  return sourceExtraction.investigationTimeline.length >= 4 && sourceExtraction.evidenceCollected.length >= 3;
}

function normalizeTechnologyArea(value: string, fallback: string) {
  const normalized = `${value} ${fallback}`.toLowerCase();
  if (normalized.includes("microsoft 365") || normalized.includes("office 365")) return "Microsoft 365";
  if (normalized.includes("identity") || normalized.includes("access")) return "Identity & Access Management";
  if (normalized.includes("endpoint")) return "Endpoint Management";
  if (normalized.includes("security")) return "Security";
  if (normalized.includes("network") || normalized.includes("dns")) return "Networking";
  if (normalized.includes("cloud") || normalized.includes("azure") || normalized.includes("aws") || normalized.includes("kafka")) {
    return "Cloud Infrastructure";
  }
  if (normalized.includes("ai") || normalized.includes("openai") || normalized.includes("gemini")) return "AI & Automation";
  if (normalized.includes("application") || normalized.includes("app") || normalized.includes("meta") || normalized.includes("coinbase")) {
    return "Applications";
  }
  return "Other";
}

function normalizeEvidenceSourceType(value: string): TroubleshootingEvidenceSourceType {
  const normalized = value.toLowerCase();
  if (normalized.includes("telemetry") || normalized.includes("latency") || normalized.includes("timeline")) {
    return "time-correlated-telemetry";
  }
  if (normalized.includes("change") || normalized.includes("rollout")) return "rollout-change-history";
  if (normalized.includes("region") || normalized.includes("zone") || normalized.includes("comparison")) return "cross-region-comparison";
  if (normalized.includes("dependency") || normalized.includes("quorum") || normalized.includes("leader")) return "dependency-health-signal";
  if (normalized.includes("protocol") || normalized.includes("dnssec") || normalized.includes("resolver")) return "protocol-native-evidence";
  if (normalized.includes("power") || normalized.includes("cooling") || normalized.includes("physical")) return "physical-infrastructure-signal";
  if (normalized.includes("customer") || normalized.includes("user") || normalized.includes("symptom")) return "customer-symptom";
  return "external-observation";
}

function truncateText(value: string, limit: number) {
  return value.slice(0, limit).trim();
}

function normalizeSourceDate(date: string, fallback?: string | null) {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  if (fallback && /^\d{4}-\d{2}-\d{2}$/.test(fallback)) {
    return fallback;
  }

  return new Date().toISOString().slice(0, 10);
}

function inferSourceType(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("postmortem")) return "Public postmortem";
  if (normalized.includes("incident review") || normalized.includes("post incident review") || normalized.includes("pir")) {
    return "Incident review";
  }
  if (normalized.includes("outage")) return "Outage analysis";
  return "Troubleshooting source";
}

function normalizeDateKey(value: string) {
  return value.slice(0, 10);
}

function ensureMinLength(value: string, fallback: string, minimum: number) {
  const primary = value.trim();
  if (primary.length >= minimum) return primary;
  const secondary = fallback.trim();
  if (secondary.length >= minimum) return secondary;
  return `${secondary} ${secondary}`.trim().slice(0, Math.max(minimum, secondary.length * 2));
}