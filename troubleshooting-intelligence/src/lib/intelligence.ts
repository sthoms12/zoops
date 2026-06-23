export type OutcomeClassification =
  | "Failed"
  | "Partially Failed"
  | "Delayed"
  | "Over Budget"
  | "Low Adoption"
  | "Underperforming"
  | "Successful With Major Lessons"
  | "Unknown";

export type ReviewStatus = "approved" | "pending_review" | "archived";
export type ProjectStatus = "published" | "draft" | "archived";

export type FailureSignal = {
  raw: string;
  normalized: string;
  category: string;
};

export type LessonLearned = {
  raw: string;
  normalized: string;
};

export type TroubleshootingTechnologyArea =
  | "Microsoft 365"
  | "Identity & Access Management"
  | "Endpoint Management"
  | "Security"
  | "Networking"
  | "Cloud Infrastructure"
  | "AI & Automation"
  | "Applications"
  | "Other";

export type TroubleshootingMistakeType =
  | "premature-root-cause"
  | "resilience-assumption"
  | "diagnostic-surface-misdirection"
  | "retry-amplification-blindness"
  | "recovery-path-blindness"
  | "dependency-chain-truncation";

export type TroubleshootingEvidenceSourceType =
  | "time-correlated-telemetry"
  | "rollout-change-history"
  | "cross-region-comparison"
  | "dependency-health-signal"
  | "protocol-native-evidence"
  | "physical-infrastructure-signal"
  | "customer-symptom"
  | "external-observation";

export type TroubleshootingTechniqueType =
  | "fault-domain-bounding"
  | "dependency-chain-reconstruction"
  | "comparative-analysis"
  | "recurrence-analysis"
  | "protocol-level-validation"
  | "recovery-sequencing";

export type TroubleshootingIncorrectAssumptionType =
  | "healthy-network-means-healthy-service"
  | "managed-service-will-absorb-failure"
  | "mitigation-success-proves-diagnosis"
  | "availability-zones-localize-failure"
  | "initiator-explains-recovery-duration";

export type TroubleshootingTurningPointType =
  | "comparative-evidence"
  | "repeat-occurrence"
  | "dependency-correlation"
  | "load-pattern-shift"
  | "protocol-detail"
  | "recovery-bottleneck";

export type TroubleshootingCaseStatus = "published" | "draft" | "archived";
export type AnalysisConfidence = "low" | "medium" | "high";

export type InvestigationTimelineStep = {
  order: number;
  action: string;
  outcome: string;
};

export type TroubleshootingEvidenceItem = {
  sourceType: TroubleshootingEvidenceSourceType;
  detail: string;
  finding: string;
};

export type TroubleshootingSkillIndicators = {
  beginner: string[];
  intermediate: string[];
  advanced: string[];
  expert: string[];
};

export type TroubleshootingCaseSourceExtraction = {
  problemStatement: string;
  initialAssumptions: string[];
  investigationTimeline: InvestigationTimelineStep[];
  evidenceCollected: TroubleshootingEvidenceItem[];
  deadEnds: string[];
  keyTurningPoints: string[];
  rootCause: string;
  resolution: string;
  lessonsLearned: string[];
};

export type TroubleshootingCaseAnalystSynthesis = {
  effectiveTechniques: string[];
  commonMistakes: string[];
  incorrectAssumptions: string[];
  highValueEvidenceSources: string[];
  diagnosticShortcuts: string[];
  antiPatterns: string[];
  troubleshootingPrinciples: string[];
  skillIndicators: TroubleshootingSkillIndicators;
  complexityScore: number;
  complexityJustification: string;
};

export type TroubleshootingCase = {
  id: string;
  slug: string;
  status: TroubleshootingCaseStatus;
  reviewStatus: ReviewStatus;
  title: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
  date: string;
  technologyArea: TroubleshootingTechnologyArea;
  problemSummary: string;
  sourceExtraction: TroubleshootingCaseSourceExtraction;
  analystSynthesis: TroubleshootingCaseAnalystSynthesis;
  confidence: AnalysisConfidence;
  caseOfWeekEligible: boolean;
};

export type TroubleshootingInsight = {
  id: string;
  slug: string;
  status: ProjectStatus;
  reviewStatus: ReviewStatus;
  title: string;
  patternDiscovered: string;
  summary: string;
  supportingEvidence: string[];
  supportingCaseIds: string[];
  supportingCaseCount: number;
  supportingCases: string[];
  practicalTakeaway: string;
  sourceReportTitle: string;
  sourceReportPath: string;
  reviewWindowStart: string;
  reviewWindowEnd: string;
  sourceUrls: string[];
  tags: string[];
};

export type ProjectRecord = {
  id: string;
  slug: string;
  status: ProjectStatus;
  reviewStatus: ReviewStatus;
  projectTitle: string;
  projectCategory: string;
  technologyArea: string;
  industry: string;
  organizationSize?: string;
  organizationName?: string;
  sourceUrl: string;
  sourceType: string;
  publicationDate?: string | null;
  projectSummary: string;
  outcomeClassification: OutcomeClassification;
  failureSignals: FailureSignal[];
  lessonsLearned: LessonLearned[];
  evidence: string[];
  analystNotes?: string;
};

export type CollectorBacklogItem = {
  id: string;
  title: string;
  projectCategory: string;
  technologyArea: string;
  industry: string;
  organizationSize?: string;
  sourceUrl: string;
  sourceType: string;
  publicationDate?: string | null;
  summaryHint: string;
  candidateSignals: string[];
  candidateLessons: string[];
};

export type CollectionModule = {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  focus: string[];
};

export type CollectorTrigger = "manual" | "automation";
export type CollectorRunStatus = "succeeded" | "partial" | "failed";

export type CollectorRun = {
  id: string;
  trigger: CollectorTrigger;
  status: CollectorRunStatus;
  startedAt: string;
  completedAt: string;
  itemsRequested: number;
  itemsProcessed: number;
  draftsCreated: number;
  duplicatesSkipped: number;
  backlogRemaining: number;
  notes: string[];
};

export type CollectorSettings = {
  automationEnabled: boolean;
  automationSchedule: string;
  automationTimezone: string;
  automationId?: string;
  maxItemsPerRun: number;
  sourceTextCharLimit: number;
  lastRunAt?: string;
  lastRunStatus?: CollectorRunStatus;
};

export type CollectorState = {
  settings: CollectorSettings;
  runs: CollectorRun[];
};

export type Taxonomy = {
  signalCategories: Record<string, string[]>;
  lessonTaxonomy: string[];
  troubleshooting: {
    technologyAreas: TroubleshootingTechnologyArea[];
    mistakeTypes: TroubleshootingMistakeType[];
    evidenceSourceTypes: TroubleshootingEvidenceSourceType[];
    investigationTechniqueTypes: TroubleshootingTechniqueType[];
    incorrectAssumptionTypes: TroubleshootingIncorrectAssumptionType[];
    turningPointTypes: TroubleshootingTurningPointType[];
  };
};

export type IntelligenceDataset = {
  generatedAt: string;
  updatedAt: string;
  taxonomy: Taxonomy;
  collectionModules: CollectionModule[];
  collectorBacklog: CollectorBacklogItem[];
  collector: CollectorState;
  troubleshootingCases: TroubleshootingCase[];
  troubleshootingInsights: TroubleshootingInsight[];
  projects: ProjectRecord[];
};

export type MetricCard = {
  label: string;
  value: number;
  detail: string;
};

export type DistributionRow = {
  key: string;
  label: string;
  value: number;
};

export type TrendPoint = {
  period: string;
  published: number;
  drafts: number;
};

export type SearchResult =
  | {
      recordType: "project";
      record: ProjectRecord;
      score: number;
      snippets: string[];
    }
  | {
      recordType: "case";
      record: TroubleshootingCase;
      score: number;
      snippets: string[];
    }
  | {
      recordType: "insight";
      record: TroubleshootingInsight;
      score: number;
      snippets: string[];
    };

export type ActiveRecord =
  | { kind: "project"; record: ProjectRecord }
  | { kind: "case"; record: TroubleshootingCase }
  | { kind: "insight"; record: TroubleshootingInsight };

export type TroubleshootingComplexityBand = "Low" | "Moderate" | "High" | "Severe";

export type TroubleshootingCaseFacets = {
  technologyArea: TroubleshootingTechnologyArea;
  mistakeTypes: TroubleshootingMistakeType[];
  evidenceSourceTypes: TroubleshootingEvidenceSourceType[];
  complexityBand: TroubleshootingComplexityBand;
};

export type DashboardPayload = {
  dataset: IntelligenceDataset;
  metrics: MetricCard[];
  outcomeDistribution: DistributionRow[];
  signalCategoryDistribution: DistributionRow[];
  topSignals: DistributionRow[];
  topLessons: DistributionRow[];
  projectsByCategory: DistributionRow[];
  projectsByIndustry: DistributionRow[];
  topInsightTags: DistributionRow[];
  trend: TrendPoint[];
  publishedTroubleshootingCases: TroubleshootingCase[];
  publishedProjects: ProjectRecord[];
  publishedInsights: TroubleshootingInsight[];
  reviewQueue: ProjectRecord[];
  latestCollectorRun: CollectorRun | null;
};

export type GeneratedTroubleshootingWeeklyReport = {
  title: string;
  reviewWindowStart: string;
  reviewWindowEnd: string;
  caseCount: number;
  sourceUrls: string[];
  outputPath: string;
  markdown: string;
};

export type WeeklyPostEntry = {
  id: string;
  title: string;
  slug: string;
  date: string;
  dateSlug: string;
  path: string;
  technologyArea: TroubleshootingTechnologyArea;
  complexityScore: number;
  problemSummary: string;
  keyLesson: string;
  relatedInsightCount: number;
  sourceTitle: string;
  sourceUrl: string;
};

type LegacyTroubleshootingInsight = Omit<TroubleshootingInsight, "supportingCaseIds"> & {
  supportingCaseIds?: string[];
};

type LegacyIntelligenceDataset = Omit<IntelligenceDataset, "collector" | "troubleshootingInsights" | "troubleshootingCases"> & {
  collector?: Partial<CollectorState>;
  troubleshootingCases?: TroubleshootingCase[];
  troubleshootingInsights?: LegacyTroubleshootingInsight[];
};

const DEFAULT_COLLECTOR_SETTINGS: CollectorSettings = {
  automationEnabled: true,
  automationSchedule: "RRULE:FREQ=DAILY;INTERVAL=3;BYHOUR=18;BYMINUTE=0",
  automationTimezone: "America/Chicago",
  maxItemsPerRun: 2,
  sourceTextCharLimit: 16000,
};

const DEFAULT_TROUBLESHOOTING_TAXONOMY: Taxonomy["troubleshooting"] = {
  technologyAreas: [
    "Microsoft 365",
    "Identity & Access Management",
    "Endpoint Management",
    "Security",
    "Networking",
    "Cloud Infrastructure",
    "AI & Automation",
    "Applications",
    "Other",
  ],
  mistakeTypes: [
    "premature-root-cause",
    "resilience-assumption",
    "diagnostic-surface-misdirection",
    "retry-amplification-blindness",
    "recovery-path-blindness",
    "dependency-chain-truncation",
  ],
  evidenceSourceTypes: [
    "time-correlated-telemetry",
    "rollout-change-history",
    "cross-region-comparison",
    "dependency-health-signal",
    "protocol-native-evidence",
    "physical-infrastructure-signal",
    "customer-symptom",
    "external-observation",
  ],
  investigationTechniqueTypes: [
    "fault-domain-bounding",
    "dependency-chain-reconstruction",
    "comparative-analysis",
    "recurrence-analysis",
    "protocol-level-validation",
    "recovery-sequencing",
  ],
  incorrectAssumptionTypes: [
    "healthy-network-means-healthy-service",
    "managed-service-will-absorb-failure",
    "mitigation-success-proves-diagnosis",
    "availability-zones-localize-failure",
    "initiator-explains-recovery-duration",
  ],
  turningPointTypes: [
    "comparative-evidence",
    "repeat-occurrence",
    "dependency-correlation",
    "load-pattern-shift",
    "protocol-detail",
    "recovery-bottleneck",
  ],
};

const TROUBLESHOOTING_INSIGHT_CASE_LINKS: Record<string, string[]> = {
  "symptom-relief-is-not-proof-of-diagnosis": [
    "azure-openai-multi-region-latency-and-failures-pir",
    "coinbase-may-7-2026-outage-postmortem",
  ],
  "prove-what-layer-is-still-healthy-first": [
    "meta-june-12-2026-outage-analysis",
    "google-gemini-june-10-2026-outage-analysis",
    "cloudflare-de-dnssec-outage-response",
  ],
  "retry-storms-deserve-their-own-incident-branch": [
    "azure-openai-multi-region-latency-and-failures-pir",
    "cloudflare-de-dnssec-outage-response",
  ],
  "recovery-is-a-separate-troubleshooting-problem": [
    "azure-west-us-2-power-cooling-pir",
    "coinbase-may-7-2026-outage-postmortem",
  ],
  "shared-infrastructure-rewards-known-exception-policies": [
    "cloudflare-de-dnssec-outage-response",
    "azure-openai-multi-region-latency-and-failures-pir",
  ],
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "why",
  "what",
  "which",
]);

type TroubleshootingRollupDefinition = {
  key: string;
  label: string;
  summary: string;
  match(record: TroubleshootingCase): boolean;
};

type TroubleshootingRollupRow = {
  key: string;
  label: string;
  summary: string;
  count: number;
  supportingCaseIds: string[];
  supportingCases: string[];
};

const TROUBLESHOOTING_MISTAKE_DEFINITIONS: TroubleshootingRollupDefinition[] = [
  {
    key: "premature-root-cause",
    label: "Treating the first credible symptom as the root cause",
    summary: "Multiple investigations improved only after teams kept testing beyond the first plausible explanation.",
    match: (record) => caseContains(record, /(first|early).*(root cause|diagnos)|diagnosis was correct|wrong crash signature|stopping diagnosis too early/),
  },
  {
    key: "resilience-assumption",
    label: "Assuming platform resilience guarantees will hold under the real failure mode",
    summary: "Teams were repeatedly surprised when zonal design, managed services, or other resilience assumptions failed under stress.",
    match: (record) => caseContains(record, /resilien|zone|zonal|availability zone|failover|managed service|redundan/),
  },
  {
    key: "diagnostic-surface-misdirection",
    label: "Letting diagnostic surfaces mislead the investigation",
    summary: "Human-readable errors and top-level symptoms often pointed engineers at the wrong layer until protocol or dependency evidence overruled them.",
    match: (record) => caseContains(record, /error label|generic|wrong layer|mislead|diagnostic surface|human-readable|EDE|SERVFAIL|status text/),
  },
  {
    key: "retry-amplification-blindness",
    label: "Underestimating retry amplification",
    summary: "Retry behavior repeatedly acted as an incident amplifier rather than a background implementation detail.",
    match: (record) => caseContains(record, /retr(y|ies)|thundering herd|amplif/),
  },
  {
    key: "recovery-path-blindness",
    label: "Treating recovery as proof the main diagnosis was complete",
    summary: "Several cases required a second investigation thread for what was still blocking safe restoration after the trigger was addressed.",
    match: (record) => caseContains(record, /recover|restor|reopen|backlog|still blocked|safe restoration/),
  },
];

const TROUBLESHOOTING_TECHNIQUE_DEFINITIONS: TroubleshootingRollupDefinition[] = [
  {
    key: "fault-domain-bounding",
    label: "Bounding the fault domain with comparative evidence",
    summary: "The strongest investigations first proved what was still healthy, which quickly shrank the search space.",
    match: (record) => caseContains(record, /compare|comparison|healthy|still healthy|rule out|excluded|scope|bounded|fault domain/),
  },
  {
    key: "dependency-chain-reconstruction",
    label: "Reconstructing the dependency chain end to end",
    summary: "Experienced troubleshooters kept following the path from trigger to customer-visible impact instead of stopping at the first failing subsystem.",
    match: (record) => caseContains(record, /dependency chain|quorum|leader-election|downstream|customer impact|end-to-end/),
  },
  {
    key: "recurrence-analysis",
    label: "Using recurrence or a second wave as fresh evidence",
    summary: "When the issue reappeared under a different load profile or region, the best investigators treated that as new diagnostic evidence.",
    match: (record) => caseContains(record, /second wave|reappear|recurr|later the same day|another region/),
  },
  {
    key: "protocol-level-validation",
    label: "Preferring protocol-native evidence over generic status text",
    summary: "Protocol-level detail consistently shortened the argument over what layer was actually failing.",
    match: (record) => caseContains(record, /protocol|DNSSEC|EDE|HTTP 5XX|resolver response|status text/),
  },
  {
    key: "recovery-sequencing",
    label: "Sequencing recovery by dependency criticality",
    summary: "The cleanest recoveries restored the minimum viable system in deliberate stages while continuing diagnosis.",
    match: (record) => caseContains(record, /staged|phase|sequence|minimum viable|cancel-only|auction|cooling, then/),
  },
];

const TROUBLESHOOTING_EVIDENCE_DEFINITIONS: TroubleshootingRollupDefinition[] = [
  {
    key: "time-correlated-telemetry",
    label: "Time-correlated telemetry across layers",
    summary: "Correlating multiple signals on one timeline mattered more than any single log line.",
    match: (record) =>
      record.sourceExtraction.evidenceCollected.some((item) => item.sourceType === "time-correlated-telemetry")
      || caseContains(record, /timeline|latency|timeout|5XX|packet loss|response-code trend/),
  },
  {
    key: "rollout-change-history",
    label: "Rollout and change history",
    summary: "Change timing repeatedly helped move the investigation from symptom to trigger.",
    match: (record) =>
      record.sourceExtraction.evidenceCollected.some((item) => item.sourceType === "rollout-change-history")
      || caseContains(record, /rollout|change history|API change|triggering infrastructure event/),
  },
  {
    key: "cross-region-comparison",
    label: "Cross-region or cross-zone comparison",
    summary: "Comparing affected and unaffected regions repeatedly separated local symptoms from shared mechanisms.",
    match: (record) =>
      record.sourceExtraction.evidenceCollected.some((item) => item.sourceType === "cross-region-comparison")
      || caseContains(record, /region|zone|Australia East|Sweden Central|West US 2|globally/),
  },
  {
    key: "dependency-health-signal",
    label: "Dependency-health evidence",
    summary: "Quorum state, leader election, shared routing, and storage/network health had more explanatory power than user-facing error summaries.",
    match: (record) =>
      record.sourceExtraction.evidenceCollected.some((item) => item.sourceType === "dependency-health-signal")
      || caseContains(record, /quorum|leader-election|storage|networking|routing|cache behavior/),
  },
  {
    key: "external-observation",
    label: "External observation and third-party vantage points",
    summary: "Independent measurements were useful because they constrained the fault domain before vendor RCA was complete.",
    match: (record) =>
      record.sourceExtraction.evidenceCollected.some((item) => item.sourceType === "external-observation")
      || caseContains(record, /ThousandEyes|third-party|external observation|vantage point/),
  },
];

const TROUBLESHOOTING_ASSUMPTION_DEFINITIONS: TroubleshootingRollupDefinition[] = [
  {
    key: "healthy-network-means-healthy-service",
    label: "Assuming a healthy network path implies a healthy service",
    summary: "Healthy transport repeatedly coexisted with application failure, so network reachability alone was not enough.",
    match: (record) => caseContains(record, /network path|reachability|frontend network|packet loss.*normal|service probably is too/),
  },
  {
    key: "managed-service-will-absorb-failure",
    label: "Assuming managed services will absorb the designed failure mode",
    summary: "Managed or shared dependencies did not always behave the way their architecture diagrams suggested.",
    match: (record) => caseContains(record, /managed service|MSK|Kafka|absorb the failure mode|expected failover behavior/),
  },
  {
    key: "mitigation-success-proves-diagnosis",
    label: "Assuming a mitigation success proves the diagnosis",
    summary: "Mitigations that coincided with improving conditions repeatedly created false confidence.",
    match: (record) => caseContains(record, /improvement after|appeared to confirm|coincides with improvement|diagnosis was correct/),
  },
  {
    key: "availability-zones-localize-failure",
    label: "Assuming availability zones localize most large failures",
    summary: "Large incidents still crossed zonal boundaries when shared dependencies or recovery paths were regional.",
    match: (record) => caseContains(record, /availability zone|zonal|cross-zone|two physical availability zones|regional/),
  },
  {
    key: "initiator-explains-recovery-duration",
    label: "Assuming the initiator explains why recovery stays slow",
    summary: "Recovery bottlenecks often became a separate problem after the trigger was understood.",
    match: (record) => caseContains(record, /recovery remained slow|full recovery|still preventing|backlog|safe restoration/),
  },
];

export function buildDashboardPayload(dataset: IntelligenceDataset): DashboardPayload {
  const publishedTroubleshootingCases = dataset.troubleshootingCases.filter((record) => record.status === "published");
  const publishedProjects = dataset.projects.filter((project) => project.status === "published");
  const publishedInsights = dataset.troubleshootingInsights.filter((insight) => insight.status === "published");
  const reviewQueue = dataset.projects.filter((project) => project.reviewStatus === "pending_review");
  const uniqueSignals = new Set(publishedProjects.flatMap((project) => project.failureSignals.map((signal) => signal.normalized)));
  const uniqueLessons = new Set(publishedProjects.flatMap((project) => project.lessonsLearned.map((lesson) => lesson.normalized)));
  const metrics: MetricCard[] = [
    {
      label: "Projects analyzed",
      value: publishedProjects.length,
      detail: `${reviewQueue.length} pending review`,
    },
    {
      label: "Failure signals identified",
      value: publishedProjects.reduce((total, project) => total + project.failureSignals.length, 0),
      detail: `${uniqueSignals.size} normalized signals`,
    },
    {
      label: "Lessons extracted",
      value: publishedProjects.reduce((total, project) => total + project.lessonsLearned.length, 0),
      detail: `${uniqueLessons.size} normalized lessons`,
    },
    {
      label: "Troubleshooting insights",
      value: publishedInsights.length,
      detail: `${countDistinct(publishedInsights.flatMap((insight) => insight.tags))} active pattern tags`,
    },
    {
      label: "Industries covered",
      value: countDistinct(publishedProjects.map((project) => project.industry)),
      detail: `${dataset.collectorBacklog.length} backlog sources ready`,
    },
  ];

  return {
    dataset,
    metrics,
    outcomeDistribution: computeDistribution(publishedProjects.map((project) => project.outcomeClassification)),
    signalCategoryDistribution: computeDistribution(
      publishedProjects.flatMap((project) => project.failureSignals.map((signal) => signal.category)),
    ),
    topSignals: computeDistribution(
      publishedProjects.flatMap((project) => project.failureSignals.map((signal) => signal.normalized)),
      8,
    ),
    topLessons: computeDistribution(
      publishedProjects.flatMap((project) => project.lessonsLearned.map((lesson) => lesson.normalized)),
      8,
    ),
    projectsByCategory: computeDistribution(publishedProjects.map((project) => project.projectCategory)),
    projectsByIndustry: computeDistribution(publishedProjects.map((project) => project.industry)),
    topInsightTags: computeDistribution(publishedInsights.flatMap((insight) => insight.tags), 8),
    trend: computeTrend(dataset.projects),
    publishedTroubleshootingCases,
    publishedProjects,
    publishedInsights,
    reviewQueue,
    latestCollectorRun: dataset.collector.runs[0] ?? null,
  };
}

export function hydrateDataset(input: LegacyIntelligenceDataset): IntelligenceDataset {
  const troubleshootingCases = input.troubleshootingCases ?? [];
  return {
    ...input,
    taxonomy: {
      ...input.taxonomy,
      troubleshooting: {
        ...DEFAULT_TROUBLESHOOTING_TAXONOMY,
        ...(input.taxonomy?.troubleshooting ?? {}),
      },
    },
    collector: {
      settings: {
        ...DEFAULT_COLLECTOR_SETTINGS,
        ...(input.collector?.settings ?? {}),
      },
      runs: input.collector?.runs ?? [],
    },
    troubleshootingCases,
    troubleshootingInsights: deriveTroubleshootingInsights(
      troubleshootingCases,
      input.troubleshootingInsights ?? [],
    ),
  };
}

function deriveTroubleshootingInsights(
  troubleshootingCases: TroubleshootingCase[],
  troubleshootingInsights: LegacyTroubleshootingInsight[],
): TroubleshootingInsight[] {
  const casesById = new Map(troubleshootingCases.map((record) => [record.id, record] as const));
  const casesBySourceUrl = new Map(troubleshootingCases.map((record) => [record.sourceUrl, record] as const));
  const casesByTitle = new Map(troubleshootingCases.map((record) => [record.title, record] as const));
  const casesBySlug = new Map(troubleshootingCases.map((record) => [record.slug, record] as const));

  return troubleshootingInsights.map((insight) => {
    const resolvedCases = resolveSupportingCases(insight, {
      casesById,
      casesBySourceUrl,
      casesByTitle,
      casesBySlug,
    });

    return {
      ...insight,
      supportingCaseIds: resolvedCases.map((record) => record.id),
      supportingCaseCount: resolvedCases.length,
      supportingCases: resolvedCases.map((record) => record.title),
      supportingEvidence: insight.supportingEvidence.length
        ? insight.supportingEvidence
        : resolvedCases.map((record) => `${record.title}: ${record.problemSummary}`),
      sourceUrls: uniqueStrings(resolvedCases.map((record) => record.sourceUrl), insight.sourceUrls),
    };
  });
}

function resolveSupportingCases(
  insight: LegacyTroubleshootingInsight,
  lookup: {
    casesById: Map<string, TroubleshootingCase>;
    casesBySourceUrl: Map<string, TroubleshootingCase>;
    casesByTitle: Map<string, TroubleshootingCase>;
    casesBySlug: Map<string, TroubleshootingCase>;
  },
) {
  const resolved = new Map<string, TroubleshootingCase>();
  const preferredSlugs = TROUBLESHOOTING_INSIGHT_CASE_LINKS[insight.slug] ?? [];

  for (const caseSlug of preferredSlugs) {
    const record = lookup.casesBySlug.get(caseSlug);
    if (record) resolved.set(record.id, record);
  }

  for (const caseId of insight.supportingCaseIds ?? []) {
    const record = lookup.casesById.get(caseId);
    if (record) resolved.set(record.id, record);
  }

  for (const sourceUrl of insight.sourceUrls) {
    const record = lookup.casesBySourceUrl.get(sourceUrl);
    if (record) resolved.set(record.id, record);
  }

  for (const reference of insight.supportingCases) {
    const record = lookup.casesByTitle.get(reference) ?? lookup.casesBySlug.get(reference);
    if (record) resolved.set(record.id, record);
  }

  return [...resolved.values()];
}

export function searchProjects(projects: ProjectRecord[], query: string): SearchResult[] {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return projects
      .map((record) => ({ recordType: "project" as const, record, score: 0, snippets: [] }))
      .sort((left, right) => left.record.projectTitle.localeCompare(right.record.projectTitle));
  }

  return projects
    .map((record) => {
      const haystack = [
        record.projectTitle,
        record.projectCategory,
        record.technologyArea,
        record.industry,
        record.organizationName ?? "",
        record.projectSummary,
        record.outcomeClassification,
        record.failureSignals.map((signal) => `${signal.raw} ${signal.normalized} ${signal.category}`).join(" "),
        record.lessonsLearned.map((lesson) => `${lesson.raw} ${lesson.normalized}`).join(" "),
        record.evidence.join(" "),
        record.analystNotes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      const snippets = new Set<string>();
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += record.projectTitle.toLowerCase().includes(token) ? 5 : 2;
        }
        for (const signal of record.failureSignals) {
          if (`${signal.raw} ${signal.normalized} ${signal.category}`.toLowerCase().includes(token)) {
            score += 3;
            snippets.add(`${signal.category}: ${signal.normalized}`);
          }
        }
        for (const lesson of record.lessonsLearned) {
          if (`${lesson.raw} ${lesson.normalized}`.toLowerCase().includes(token)) {
            score += 2;
            snippets.add(`Lesson: ${lesson.normalized}`);
          }
        }
        if (record.projectSummary.toLowerCase().includes(token)) {
          snippets.add(record.projectSummary);
        }
      }

      return {
        recordType: "project" as const,
        record,
        score,
        snippets: [...snippets].slice(0, 3),
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.record.projectTitle.localeCompare(right.record.projectTitle));
}

export function deriveTroubleshootingCaseFacets(record: TroubleshootingCase): TroubleshootingCaseFacets {
  return {
    technologyArea: record.technologyArea,
    mistakeTypes: TROUBLESHOOTING_MISTAKE_DEFINITIONS
      .filter((definition) => definition.match(record))
      .map((definition) => definition.key as TroubleshootingMistakeType),
    evidenceSourceTypes: uniqueStrings(
      record.sourceExtraction.evidenceCollected.map((item) => item.sourceType),
      TROUBLESHOOTING_EVIDENCE_DEFINITIONS
        .filter((definition) => definition.match(record))
        .map((definition) => definition.key as TroubleshootingEvidenceSourceType),
    ) as TroubleshootingEvidenceSourceType[],
    complexityBand: getTroubleshootingComplexityBand(record.analystSynthesis.complexityScore),
  };
}

export function getTroubleshootingComplexityBand(score: number): TroubleshootingComplexityBand {
  if (score >= 9) return "Severe";
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Low";
}

export function getTroubleshootingMistakeLabel(type: TroubleshootingMistakeType): string {
  return TROUBLESHOOTING_MISTAKE_DEFINITIONS.find((definition) => definition.key === type)?.label ?? type;
}

export function getTroubleshootingEvidenceSourceLabel(type: TroubleshootingEvidenceSourceType): string {
  return TROUBLESHOOTING_EVIDENCE_DEFINITIONS.find((definition) => definition.key === type)?.label ?? type;
}

export function searchTroubleshootingCases(cases: TroubleshootingCase[], query: string): SearchResult[] {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return cases
      .map((record) => ({ recordType: "case" as const, record, score: 0, snippets: [] }))
      .sort((left, right) => left.record.title.localeCompare(right.record.title));
  }

  return cases
    .map((record) => {
      const facets = deriveTroubleshootingCaseFacets(record);
      const haystack = [
        record.title,
        record.sourceTitle,
        record.sourceType,
        record.technologyArea,
        record.problemSummary,
        record.sourceExtraction.problemStatement,
        record.sourceExtraction.initialAssumptions.join(" "),
        record.sourceExtraction.investigationTimeline.map((step) => `${step.action} ${step.outcome}`).join(" "),
        record.sourceExtraction.evidenceCollected.map((item) => `${item.sourceType} ${item.detail} ${item.finding}`).join(" "),
        record.sourceExtraction.deadEnds.join(" "),
        record.sourceExtraction.keyTurningPoints.join(" "),
        record.sourceExtraction.rootCause,
        record.sourceExtraction.resolution,
        record.sourceExtraction.lessonsLearned.join(" "),
        record.analystSynthesis.effectiveTechniques.join(" "),
        record.analystSynthesis.commonMistakes.join(" "),
        record.analystSynthesis.incorrectAssumptions.join(" "),
        record.analystSynthesis.highValueEvidenceSources.join(" "),
        record.analystSynthesis.diagnosticShortcuts.join(" "),
        record.analystSynthesis.antiPatterns.join(" "),
        record.analystSynthesis.troubleshootingPrinciples.join(" "),
        facets.mistakeTypes.join(" "),
        facets.mistakeTypes.map(getTroubleshootingMistakeLabel).join(" "),
        facets.evidenceSourceTypes.join(" "),
        facets.evidenceSourceTypes.map(getTroubleshootingEvidenceSourceLabel).join(" "),
        facets.complexityBand,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      const snippets = new Set<string>();
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += record.title.toLowerCase().includes(token) ? 5 : 2;
        }
        if (record.problemSummary.toLowerCase().includes(token)) {
          snippets.add(record.problemSummary);
        }
        if (record.technologyArea.toLowerCase().includes(token)) {
          snippets.add(`Technology area: ${record.technologyArea}`);
        }
        for (const mistakeType of facets.mistakeTypes) {
          const label = getTroubleshootingMistakeLabel(mistakeType);
          if (`${mistakeType} ${label}`.toLowerCase().includes(token)) {
            score += 3;
            snippets.add(`Mistake: ${label}`);
          }
        }
        for (const evidenceType of facets.evidenceSourceTypes) {
          const label = getTroubleshootingEvidenceSourceLabel(evidenceType);
          if (`${evidenceType} ${label}`.toLowerCase().includes(token)) {
            score += 2;
            snippets.add(`Evidence: ${label}`);
          }
        }
      }

      return {
        recordType: "case" as const,
        record,
        score,
        snippets: [...snippets].slice(0, 4),
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.record.title.localeCompare(right.record.title));
}

export function searchIntelligence(
  projects: ProjectRecord[],
  troubleshootingCases: TroubleshootingCase[],
  insights: TroubleshootingInsight[],
  query: string,
): SearchResult[] {
  const projectResults = searchProjects(projects, query);
  const caseResults = searchTroubleshootingCases(troubleshootingCases, query);
  const tokens = tokenize(query);

  const insightResults = (!tokens.length
    ? insights
        .map((record) => ({
          recordType: "insight" as const,
          record,
          score: 0,
          snippets: [] as string[],
        }))
        .sort((left, right) => left.record.title.localeCompare(right.record.title))
    : insights
        .map((record) => {
          const haystack = [
            record.title,
            record.patternDiscovered,
            record.summary,
            record.supportingEvidence.join(" "),
            record.supportingCaseIds.join(" "),
            record.supportingCases.join(" "),
            record.practicalTakeaway,
            record.sourceReportTitle,
            record.tags.join(" "),
          ]
            .join(" ")
            .toLowerCase();

          let score = 0;
          const snippets = new Set<string>();
          for (const token of tokens) {
            if (haystack.includes(token)) {
              score += record.title.toLowerCase().includes(token) ? 5 : 2;
            }
            if (record.tags.some((tag) => tag.toLowerCase().includes(token))) {
              score += 3;
              snippets.add(`Tag: ${record.tags.find((tag) => tag.toLowerCase().includes(token))}`);
            }
            if (record.patternDiscovered.toLowerCase().includes(token)) {
              snippets.add(record.patternDiscovered);
            }
            if (record.practicalTakeaway.toLowerCase().includes(token)) {
              snippets.add(`Takeaway: ${record.practicalTakeaway}`);
            }
          }

          return {
            recordType: "insight" as const,
            record,
            score,
            snippets: [...snippets].slice(0, 3),
          };
        })
        .filter((result) => result.score > 0)
        .sort((left, right) => right.score - left.score || left.record.title.localeCompare(right.record.title)));

  return [
    ...projectResults,
    ...caseResults,
    ...insightResults,
  ].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const leftTitle = left.recordType === "project" ? left.record.projectTitle : left.record.title;
    const rightTitle = right.recordType === "project" ? right.record.projectTitle : right.record.title;
    return leftTitle.localeCompare(rightTitle);
  });
}

export function normalizeForDraft(backlog: CollectorBacklogItem, taxonomy: Taxonomy): ProjectRecord {
  return {
    id: backlog.id,
    slug: slugify(backlog.title),
    status: "draft",
    reviewStatus: "pending_review",
    projectTitle: backlog.title,
    projectCategory: backlog.projectCategory,
    technologyArea: backlog.technologyArea,
    industry: backlog.industry,
    organizationSize: backlog.organizationSize,
    sourceUrl: backlog.sourceUrl,
    sourceType: backlog.sourceType,
    publicationDate: backlog.publicationDate ?? null,
    projectSummary: backlog.summaryHint,
    outcomeClassification: "Unknown",
    failureSignals: backlog.candidateSignals.map((signal) => ({
      raw: signal,
      normalized: findNormalizedSignal(signal, taxonomy),
      category: findSignalCategory(signal, taxonomy),
    })),
    lessonsLearned: backlog.candidateLessons.map((lesson) => ({
      raw: lesson,
      normalized: findNormalizedLesson(lesson, taxonomy),
    })),
    evidence: ["Draft created from collector backlog. Analyst review required before publish."],
    analystNotes: "Auto-created draft from collector backlog.",
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function ensureUniqueProjectSlug(slug: string, projects: ProjectRecord[]) {
  const base = slugify(slug);
  let candidate = base;
  let index = 2;
  const existing = new Set(projects.map((project) => project.slug));
  while (existing.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

export function categorizeFailureSignal(signal: string, taxonomy: Taxonomy): string {
  return findSignalCategory(signal, taxonomy);
}

export function normalizeFailureSignal(signal: string, taxonomy: Taxonomy): string {
  return findNormalizedSignal(signal, taxonomy);
}

export function normalizeLesson(lesson: string, taxonomy: Taxonomy): string {
  return findNormalizedLesson(lesson, taxonomy);
}

export function generateTroubleshootingWeeklyReport(dataset: IntelligenceDataset): GeneratedTroubleshootingWeeklyReport {
  const publishedCases = dataset.troubleshootingCases
    .filter((record) => record.status === "published")
    .sort((left, right) => left.date.localeCompare(right.date));
  const publishedInsights = dataset.troubleshootingInsights
    .filter((record) => record.status === "published")
    .sort((left, right) => right.supportingCaseCount - left.supportingCaseCount || left.title.localeCompare(right.title));

  const reviewWindow = deriveTroubleshootingReviewWindow(publishedCases, publishedInsights);
  const mistakeRollups = buildTroubleshootingRollups(publishedCases, TROUBLESHOOTING_MISTAKE_DEFINITIONS).slice(0, 4);
  const techniqueRollups = buildTroubleshootingRollups(publishedCases, TROUBLESHOOTING_TECHNIQUE_DEFINITIONS).slice(0, 5);
  const evidenceRollups = buildTroubleshootingRollups(publishedCases, TROUBLESHOOTING_EVIDENCE_DEFINITIONS).slice(0, 5);
  const assumptionRollups = buildTroubleshootingRollups(publishedCases, TROUBLESHOOTING_ASSUMPTION_DEFINITIONS).slice(0, 5);
  const caseOfWeek = selectFeaturedTroubleshootingCase(publishedCases);
  const sourceUrls = uniqueStrings(publishedCases.map((record) => record.sourceUrl), []);
  const outputPath = `docs/reports/${reviewWindow.reviewWindowEnd}-troubleshooting-intelligence-weekly.md`;

  const markdown = [
    "# Troubleshooting Intelligence Weekly",
    "",
    `Review window: ${formatDateForReport(reviewWindow.reviewWindowStart)} to ${formatDateForReport(reviewWindow.reviewWindowEnd)}`,
    "",
    `Scope: ${publishedCases.length} public troubleshooting investigations and outage analyses in the structured case library for this review window.`,
    "",
    "Cases reviewed:",
    ...publishedCases.map(
      (record) => `- ${record.title} (${record.technologyArea}, ${formatDateForReport(record.date)})`,
    ),
    "",
    "This report is generated from structured troubleshooting cases and derived troubleshooting insights. It focuses on what the investigations taught across cases rather than retelling incidents.",
    "",
    "## Executive Summary",
    "",
    buildExecutiveSummary(publishedCases, mistakeRollups, techniqueRollups, evidenceRollups, assumptionRollups),
    "",
    "## Most Common Troubleshooting Mistakes",
    "",
    ...renderRollupSection(mistakeRollups, publishedCases),
    "## Most Effective Investigation Techniques",
    "",
    ...renderRollupSection(techniqueRollups, publishedCases),
    "## Most Valuable Evidence Sources",
    "",
    ...renderRollupSection(evidenceRollups, publishedCases),
    "## Most Common Incorrect Assumptions",
    "",
    ...renderRollupSection(assumptionRollups, publishedCases),
    "## Emerging Troubleshooting Patterns",
    "",
    ...renderInsightSection(publishedInsights),
    "## Case of the Week",
    "",
    ...renderCaseOfWeek(caseOfWeek),
    "## Bottom Line",
    "",
    buildBottomLine(techniqueRollups, mistakeRollups, assumptionRollups),
    "",
    "## Sources",
    "",
    ...sourceUrls.map((url) => `- ${url}`),
    "",
  ].join("\n");

  return {
    title: "Troubleshooting Intelligence Weekly",
    reviewWindowStart: reviewWindow.reviewWindowStart,
    reviewWindowEnd: reviewWindow.reviewWindowEnd,
    caseCount: publishedCases.length,
    sourceUrls,
    outputPath,
    markdown,
  };
}

export function getTroubleshootingWeeklyPostPath(
  record: Pick<TroubleshootingCase, "date" | "slug">,
): string {
  return `/weekly/${normalizeDateKey(record.date)}/${record.slug}`;
}

export function buildWeeklyPostArchive(
  records: TroubleshootingCase[],
  insights: TroubleshootingInsight[],
): WeeklyPostEntry[] {
  const insightCountByCaseId = new Map<string, number>();
  for (const insight of insights) {
    for (const caseId of insight.supportingCaseIds) {
      insightCountByCaseId.set(caseId, (insightCountByCaseId.get(caseId) ?? 0) + 1);
    }
  }

  return [...records]
    .filter((record) => record.status === "published" && record.caseOfWeekEligible)
    .sort((left, right) => {
      const dateDelta = normalizeDateKey(right.date).localeCompare(normalizeDateKey(left.date));
      if (dateDelta !== 0) return dateDelta;
      const complexityDelta = right.analystSynthesis.complexityScore - left.analystSynthesis.complexityScore;
      if (complexityDelta !== 0) return complexityDelta;
      return left.title.localeCompare(right.title);
    })
    .map((record) => ({
      id: record.id,
      title: record.title,
      slug: record.slug,
      date: record.date,
      dateSlug: normalizeDateKey(record.date),
      path: getTroubleshootingWeeklyPostPath(record),
      technologyArea: record.technologyArea,
      complexityScore: record.analystSynthesis.complexityScore,
      problemSummary: record.problemSummary,
      keyLesson:
        record.analystSynthesis.troubleshootingPrinciples[0]
        ?? record.sourceExtraction.lessonsLearned[0]
        ?? "Evidence-led fault isolation beats intuition-first diagnosis.",
      relatedInsightCount: insightCountByCaseId.get(record.id) ?? 0,
      sourceTitle: record.sourceTitle,
      sourceUrl: record.sourceUrl,
    }));
}

export function resolveWeeklyPostCase(
  records: TroubleshootingCase[],
  insights: TroubleshootingInsight[],
  params?: { slug?: string; dateSlug?: string },
): TroubleshootingCase | null {
  const archive = buildWeeklyPostArchive(records, insights);
  const fallback = archive[0];
  if (!fallback) return null;
  if (!params?.slug && !params?.dateSlug) {
    return records.find((record) => record.id === fallback.id) ?? null;
  }

  const matchedEntry = archive.find((entry) => {
    const slugMatches = !params.slug || entry.slug === params.slug;
    const dateMatches = !params.dateSlug || entry.dateSlug === params.dateSlug;
    return slugMatches && dateMatches;
  });

  return records.find((record) => record.id === (matchedEntry?.id ?? fallback.id)) ?? null;
}

function computeDistribution(values: string[], limit?: number): DistributionRow[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = [...counts.entries()]
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function computeTrend(projects: ProjectRecord[]): TrendPoint[] {
  const byYear = new Map<string, TrendPoint>();
  for (const project of projects) {
    const year = project.publicationDate?.slice(0, 4) ?? "Unknown";
    const current = byYear.get(year) ?? { period: year, published: 0, drafts: 0 };
    if (project.status === "published") current.published += 1;
    if (project.status === "draft") current.drafts += 1;
    byYear.set(year, current);
  }
  return [...byYear.values()].sort((left, right) => left.period.localeCompare(right.period));
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function countDistinct(values: string[]): number {
  return new Set(values.filter(Boolean)).size;
}

function uniqueStrings(primary: string[], fallback: string[]): string[] {
  const values = primary.length ? primary : fallback;
  return [...new Set(values.filter(Boolean))];
}

function buildTroubleshootingRollups(
  records: TroubleshootingCase[],
  definitions: TroubleshootingRollupDefinition[],
): TroubleshootingRollupRow[] {
  return definitions
    .map((definition) => {
      const supportingCases = records.filter((record) => definition.match(record));
      return {
        key: definition.key,
        label: definition.label,
        summary: definition.summary,
        count: supportingCases.length,
        supportingCaseIds: supportingCases.map((record) => record.id),
        supportingCases: supportingCases.map((record) => record.title),
      };
    })
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function caseContains(record: TroubleshootingCase, matcher: RegExp): boolean {
  const evidenceDetails = record.sourceExtraction.evidenceCollected
    .map((item) => `${item.sourceType} ${item.detail} ${item.finding}`)
    .join(" ");
  const timeline = record.sourceExtraction.investigationTimeline
    .map((step) => `${step.action} ${step.outcome}`)
    .join(" ");
  const skillSignals = [
    ...record.analystSynthesis.skillIndicators.beginner,
    ...record.analystSynthesis.skillIndicators.intermediate,
    ...record.analystSynthesis.skillIndicators.advanced,
    ...record.analystSynthesis.skillIndicators.expert,
  ].join(" ");

  const haystack = [
    record.title,
    record.problemSummary,
    record.sourceExtraction.problemStatement,
    record.sourceExtraction.initialAssumptions.join(" "),
    timeline,
    evidenceDetails,
    record.sourceExtraction.deadEnds.join(" "),
    record.sourceExtraction.keyTurningPoints.join(" "),
    record.sourceExtraction.rootCause,
    record.sourceExtraction.resolution,
    record.sourceExtraction.lessonsLearned.join(" "),
    record.analystSynthesis.effectiveTechniques.join(" "),
    record.analystSynthesis.commonMistakes.join(" "),
    record.analystSynthesis.incorrectAssumptions.join(" "),
    record.analystSynthesis.highValueEvidenceSources.join(" "),
    record.analystSynthesis.diagnosticShortcuts.join(" "),
    record.analystSynthesis.antiPatterns.join(" "),
    record.analystSynthesis.troubleshootingPrinciples.join(" "),
    skillSignals,
    record.technologyArea,
  ]
    .filter(Boolean)
    .join(" ");

  return matcher.test(haystack);
}

function deriveTroubleshootingReviewWindow(
  records: TroubleshootingCase[],
  insights: TroubleshootingInsight[],
): Pick<GeneratedTroubleshootingWeeklyReport, "reviewWindowStart" | "reviewWindowEnd"> {
  const insightStarts = insights.map((record) => normalizeDateKey(record.reviewWindowStart)).filter(Boolean);
  const insightEnds = insights.map((record) => normalizeDateKey(record.reviewWindowEnd)).filter(Boolean);
  const caseDates = records.map((record) => normalizeDateKey(record.date)).filter(Boolean);

  const reviewWindowStart = insightStarts.length
    ? insightStarts.sort()[0]
    : caseDates.sort()[0] ?? new Date().toISOString().slice(0, 10);
  const reviewWindowEnd = insightEnds.length
    ? insightEnds.sort().at(-1) ?? reviewWindowStart
    : caseDates.sort().at(-1) ?? reviewWindowStart;

  return { reviewWindowStart, reviewWindowEnd };
}

export function selectFeaturedTroubleshootingCase(records: TroubleshootingCase[]): TroubleshootingCase | null {
  return records
    .filter((record) => record.caseOfWeekEligible)
    .sort((left, right) => {
      const complexityDelta = right.analystSynthesis.complexityScore - left.analystSynthesis.complexityScore;
      if (complexityDelta !== 0) return complexityDelta;
      const turningPointDelta =
        right.sourceExtraction.keyTurningPoints.length - left.sourceExtraction.keyTurningPoints.length;
      if (turningPointDelta !== 0) return turningPointDelta;
      return right.date.localeCompare(left.date);
    })[0] ?? null;
}

function buildExecutiveSummary(
  records: TroubleshootingCase[],
  mistakeRollups: TroubleshootingRollupRow[],
  techniqueRollups: TroubleshootingRollupRow[],
  evidenceRollups: TroubleshootingRollupRow[],
  assumptionRollups: TroubleshootingRollupRow[],
): string {
  const topAreas = computeDistribution(records.map((record) => record.technologyArea), 3).map((row) => row.label);
  const topMistake = mistakeRollups[0]?.label.toLowerCase() ?? "testing beyond early symptoms";
  const topTechnique = techniqueRollups[0]?.label.toLowerCase() ?? "bounding the fault domain";
  const topEvidence = evidenceRollups[0]?.label.toLowerCase() ?? "time-correlated telemetry";
  const topAssumption = assumptionRollups[0]?.label.toLowerCase() ?? "resilience guarantees";

  return [
    `Across ${records.length} structured troubleshooting cases spanning ${joinAsSentence(topAreas)}, the strongest investigators kept separating symptom, trigger, amplifier, and recovery bottleneck instead of locking onto the first plausible story.`,
    "",
    `The most common mistake pattern was ${topMistake}. The most effective repeated technique was ${topTechnique}. The evidence source that most consistently changed the direction of investigations was ${topEvidence}. The assumption that failed most often was ${topAssumption}.`,
  ].join("\n");
}

function renderRollupSection(rows: TroubleshootingRollupRow[], records: TroubleshootingCase[]): string[] {
  if (!rows.length) {
    return ["No qualifying records were available for this section.", ""];
  }

  return rows.flatMap((row, index) => {
    const supportingSummaries = records
      .filter((record) => row.supportingCaseIds.includes(record.id))
      .slice(0, 2)
      .map((record) => `- ${record.title}: ${record.problemSummary}`);

    return [
      `### ${index + 1}. ${row.label}`,
      "",
      `${row.summary} Cases supporting it: ${row.count}.`,
      "",
      ...supportingSummaries,
      "",
    ];
  });
}

function renderInsightSection(insights: TroubleshootingInsight[]): string[] {
  if (!insights.length) {
    return ["No published troubleshooting insights were available for this review window.", ""];
  }

  return insights.slice(0, 5).flatMap((insight) => [
    `### ${insight.title}`,
    "",
    `${insight.patternDiscovered} Supported by ${insight.supportingCaseCount} case${insight.supportingCaseCount === 1 ? "" : "s"}.`,
    "",
    `Practical takeaway: ${insight.practicalTakeaway}`,
    "",
  ]);
}

function renderCaseOfWeek(record: TroubleshootingCase | null): string[] {
  if (!record) {
    return ["No case met the current eligibility threshold.", ""];
  }

  const storySteps = record.sourceExtraction.investigationTimeline
    .slice(0, 3)
    .map((step) => `- ${step.action} ${step.outcome}`);
  const turningPoint = record.sourceExtraction.keyTurningPoints[0] ?? "The investigation only converged after the team narrowed the fault domain more aggressively.";
  const principles = record.analystSynthesis.troubleshootingPrinciples.map((item) => `- ${item}`);

  return [
    `### ${record.title}`,
    "",
    `**Problem:** ${record.problemSummary}`,
    "",
    "**Investigation story:**",
    ...storySteps,
    "",
    `**Key turning point:** ${turningPoint}`,
    "",
    `**Root cause:** ${record.sourceExtraction.rootCause}`,
    "",
    "**Lessons learned:**",
    ...record.sourceExtraction.lessonsLearned.map((item) => `- ${item}`),
    "",
    "**Troubleshooting principles:**",
    ...principles,
    "",
  ];
}

function buildBottomLine(
  techniqueRollups: TroubleshootingRollupRow[],
  mistakeRollups: TroubleshootingRollupRow[],
  assumptionRollups: TroubleshootingRollupRow[],
): string {
  const technique = techniqueRollups[0]?.label ?? "Bounding the fault domain";
  const mistake = mistakeRollups[0]?.label.toLowerCase() ?? "stopping at the first plausible symptom";
  const assumption = assumptionRollups[0]?.label.toLowerCase() ?? "resilience guarantees will behave as expected";

  return `The strongest reusable lesson this week is that effective troubleshooting stays comparative and evidence-led. Teams moved fastest when they used ${technique.toLowerCase()}, while the most repeated failure mode was ${mistake}. The assumption most in need of pressure-testing remains ${assumption}.`;
}

function formatDateForReport(value: string): string {
  const normalized = normalizeDateKey(value);
  const date = new Date(`${normalized}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function joinAsSentence(values: string[]): string {
  if (!values.length) return "multiple technology areas";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function normalizeDateKey(value: string): string {
  return value.includes("T") ? value.slice(0, 10) : value;
}

function findSignalCategory(signal: string, taxonomy: Taxonomy): string {
  const normalizedSignal = signal.toLowerCase();
  for (const [category, entries] of Object.entries(taxonomy.signalCategories)) {
    if (entries.some((entry) => normalizedSignal.includes(entry) || entry.includes(normalizedSignal))) {
      return category;
    }
  }
  if (normalizedSignal.includes("training") || normalizedSignal.includes("user")) return "Change Management";
  if (normalizedSignal.includes("budget") || normalizedSignal.includes("staff") || normalizedSignal.includes("vendor")) return "Resource";
  if (normalizedSignal.includes("integration") || normalizedSignal.includes("data") || normalizedSignal.includes("platform")) return "Technical";
  if (normalizedSignal.includes("scope") || normalizedSignal.includes("governance") || normalizedSignal.includes("risk")) return "Governance";
  return "Operating Model";
}

function findNormalizedSignal(signal: string, taxonomy: Taxonomy): string {
  const normalizedSignal = signal.toLowerCase();
  for (const entries of Object.values(taxonomy.signalCategories)) {
    for (const entry of entries) {
      if (normalizedSignal.includes(entry) || entry.includes(normalizedSignal)) {
        return entry;
      }
    }
  }
  return signal.toLowerCase();
}

function findNormalizedLesson(lesson: string, taxonomy: Taxonomy): string {
  const normalizedLesson = lesson.toLowerCase();
  for (const entry of taxonomy.lessonTaxonomy) {
    if (normalizedLesson.includes(entry) || entry.includes(normalizedLesson)) {
      return entry;
    }
  }
  return lesson.toLowerCase();
}
