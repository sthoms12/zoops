import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";

import type { IntelligenceDataset } from "@/lib/intelligence";

export const defaultDuckDbPath = "/home/workspace/troubleshooting-intelligence/data/troubleshooting-intelligence.duckdb";

export async function syncDuckDbMirror(
  dataset: IntelligenceDataset,
  databasePath = defaultDuckDbPath,
) {
  await mkdir(dirname(databasePath), { recursive: true });
  const sql = buildDuckDbSyncSql(dataset);
  await runDuckDb(databasePath, sql);
}

function buildDuckDbSyncSql(dataset: IntelligenceDataset) {
  const projectRows = dataset.projects.map((project) => {
    const values = [
      sqlString(project.id),
      sqlString(project.slug),
      sqlString(project.status),
      sqlString(project.reviewStatus),
      sqlString(project.projectTitle),
      sqlString(project.projectCategory),
      sqlString(project.technologyArea),
      sqlString(project.industry),
      sqlString(project.organizationSize ?? ""),
      sqlString(project.organizationName ?? ""),
      sqlString(project.sourceUrl),
      sqlString(project.sourceType),
      sqlTimestamp(project.publicationDate ?? ""),
      sqlString(project.projectSummary),
      sqlString(project.outcomeClassification),
      sqlString(project.analystNotes ?? ""),
      sqlTimestamp(dataset.updatedAt),
    ];
    return `(${values.join(", ")})`;
  });

  const signalRows = dataset.projects.flatMap((project) =>
    project.failureSignals.map((signal) => {
      const values = [
        sqlString(project.slug),
        sqlString(signal.raw),
        sqlString(signal.normalized),
        sqlString(signal.category),
      ];
      return `(${values.join(", ")})`;
    }),
  );

  const lessonRows = dataset.projects.flatMap((project) =>
    project.lessonsLearned.map((lesson) => {
      const values = [
        sqlString(project.slug),
        sqlString(lesson.raw),
        sqlString(lesson.normalized),
      ];
      return `(${values.join(", ")})`;
    }),
  );

  const moduleRows = dataset.collectionModules.map((module) => {
    const values = [
      sqlString(module.id),
      sqlString(module.name),
      sqlString(module.sourceType),
      sqlString(module.status),
      sqlJson(module.focus),
    ];
    return `(${values.join(", ")})`;
  });

  const backlogRows = dataset.collectorBacklog.map((item) => {
    const values = [
      sqlString(item.id),
      sqlString(item.title),
      sqlString(item.projectCategory),
      sqlString(item.technologyArea),
      sqlString(item.industry),
      sqlString(item.organizationSize ?? ""),
      sqlString(item.sourceUrl),
      sqlString(item.sourceType),
      sqlTimestamp(item.publicationDate ?? ""),
      sqlString(item.summaryHint),
      sqlJson(item.candidateSignals),
      sqlJson(item.candidateLessons),
    ];
    return `(${values.join(", ")})`;
  });

  const collectorRunRows = dataset.collector.runs.map((run) => {
    const values = [
      sqlString(run.id),
      sqlString(run.trigger),
      sqlString(run.status),
      sqlTimestamp(run.startedAt),
      sqlTimestamp(run.completedAt),
      sqlNumber(run.itemsRequested),
      sqlNumber(run.itemsProcessed),
      sqlNumber(run.draftsCreated),
      sqlNumber(run.duplicatesSkipped),
      sqlNumber(run.backlogRemaining),
      sqlJson(run.notes),
    ];
    return `(${values.join(", ")})`;
  });

  const troubleshootingInsightRows = dataset.troubleshootingInsights.map((insight) => {
    const values = [
      sqlString(insight.id),
      sqlString(insight.slug),
      sqlString(insight.status),
      sqlString(insight.reviewStatus),
      sqlString(insight.title),
      sqlString(insight.patternDiscovered),
      sqlString(insight.summary),
      sqlJson(insight.supportingEvidence),
      sqlJson(insight.supportingCaseIds),
      sqlNumber(insight.supportingCaseCount),
      sqlJson(insight.supportingCases),
      sqlString(insight.practicalTakeaway),
      sqlString(insight.sourceReportTitle),
      sqlString(insight.sourceReportPath),
      sqlTimestamp(insight.reviewWindowStart),
      sqlTimestamp(insight.reviewWindowEnd),
      sqlJson(insight.sourceUrls),
      sqlJson(insight.tags),
      sqlTimestamp(dataset.updatedAt),
    ];
    return `(${values.join(", ")})`;
  });

  const troubleshootingCaseRows = dataset.troubleshootingCases.map((troubleshootingCase) => {
    const values = [
      sqlString(troubleshootingCase.id),
      sqlString(troubleshootingCase.slug),
      sqlString(troubleshootingCase.status),
      sqlString(troubleshootingCase.reviewStatus),
      sqlString(troubleshootingCase.title),
      sqlString(troubleshootingCase.sourceTitle),
      sqlString(troubleshootingCase.sourceUrl),
      sqlString(troubleshootingCase.sourceType),
      sqlTimestamp(troubleshootingCase.date),
      sqlString(troubleshootingCase.technologyArea),
      sqlString(troubleshootingCase.problemSummary),
      sqlString(troubleshootingCase.sourceExtraction.problemStatement),
      sqlJson(troubleshootingCase.sourceExtraction.initialAssumptions),
      sqlJson(troubleshootingCase.sourceExtraction.investigationTimeline),
      sqlJson(troubleshootingCase.sourceExtraction.evidenceCollected),
      sqlJson(troubleshootingCase.sourceExtraction.deadEnds),
      sqlJson(troubleshootingCase.sourceExtraction.keyTurningPoints),
      sqlString(troubleshootingCase.sourceExtraction.rootCause),
      sqlString(troubleshootingCase.sourceExtraction.resolution),
      sqlJson(troubleshootingCase.sourceExtraction.lessonsLearned),
      sqlJson(troubleshootingCase.analystSynthesis.effectiveTechniques),
      sqlJson(troubleshootingCase.analystSynthesis.commonMistakes),
      sqlJson(troubleshootingCase.analystSynthesis.incorrectAssumptions),
      sqlJson(troubleshootingCase.analystSynthesis.highValueEvidenceSources),
      sqlJson(troubleshootingCase.analystSynthesis.diagnosticShortcuts),
      sqlJson(troubleshootingCase.analystSynthesis.antiPatterns),
      sqlJson(troubleshootingCase.analystSynthesis.troubleshootingPrinciples),
      sqlJson(troubleshootingCase.analystSynthesis.skillIndicators),
      sqlNumber(troubleshootingCase.analystSynthesis.complexityScore),
      sqlString(troubleshootingCase.analystSynthesis.complexityJustification),
      sqlString(troubleshootingCase.confidence),
      sqlBoolean(troubleshootingCase.caseOfWeekEligible),
      sqlTimestamp(dataset.updatedAt),
    ];
    return `(${values.join(", ")})`;
  });

  return `
BEGIN TRANSACTION;

CREATE OR REPLACE TABLE intelligence_meta (
  generated_at TIMESTAMP,
  updated_at TIMESTAMP,
  project_count INTEGER,
  published_count INTEGER,
  draft_count INTEGER,
  backlog_count INTEGER
);

CREATE OR REPLACE TABLE intelligence_projects (
  id VARCHAR,
  slug VARCHAR,
  status VARCHAR,
  review_status VARCHAR,
  project_title VARCHAR,
  project_category VARCHAR,
  technology_area VARCHAR,
  industry VARCHAR,
  organization_size VARCHAR,
  organization_name VARCHAR,
  source_url VARCHAR,
  source_type VARCHAR,
  publication_date TIMESTAMP,
  project_summary VARCHAR,
  outcome_classification VARCHAR,
  analyst_notes VARCHAR,
  updated_at TIMESTAMP
);

CREATE OR REPLACE TABLE intelligence_signals (
  project_slug VARCHAR,
  raw_signal VARCHAR,
  normalized_signal VARCHAR,
  signal_category VARCHAR
);

CREATE OR REPLACE TABLE intelligence_lessons (
  project_slug VARCHAR,
  raw_lesson VARCHAR,
  normalized_lesson VARCHAR
);

CREATE OR REPLACE TABLE intelligence_collection_modules (
  id VARCHAR,
  name VARCHAR,
  source_type VARCHAR,
  status VARCHAR,
  focus JSON
);

CREATE OR REPLACE TABLE intelligence_collector_settings (
  automation_enabled BOOLEAN,
  automation_schedule VARCHAR,
  automation_timezone VARCHAR,
  automation_id VARCHAR,
  max_items_per_run INTEGER,
  source_text_char_limit INTEGER,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR
);

CREATE OR REPLACE TABLE intelligence_backlog (
  id VARCHAR,
  title VARCHAR,
  project_category VARCHAR,
  technology_area VARCHAR,
  industry VARCHAR,
  organization_size VARCHAR,
  source_url VARCHAR,
  source_type VARCHAR,
  publication_date TIMESTAMP,
  summary_hint VARCHAR,
  candidate_signals JSON,
  candidate_lessons JSON
);

CREATE OR REPLACE TABLE intelligence_collection_runs (
  id VARCHAR,
  trigger VARCHAR,
  status VARCHAR,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  items_requested INTEGER,
  items_processed INTEGER,
  drafts_created INTEGER,
  duplicates_skipped INTEGER,
  backlog_remaining INTEGER,
  notes JSON
);

CREATE OR REPLACE TABLE intelligence_troubleshooting_insights (
  id VARCHAR,
  slug VARCHAR,
  status VARCHAR,
  review_status VARCHAR,
  title VARCHAR,
  pattern_discovered VARCHAR,
  summary VARCHAR,
  supporting_evidence JSON,
  supporting_case_ids JSON,
  supporting_case_count INTEGER,
  supporting_cases JSON,
  practical_takeaway VARCHAR,
  source_report_title VARCHAR,
  source_report_path VARCHAR,
  review_window_start TIMESTAMP,
  review_window_end TIMESTAMP,
  source_urls JSON,
  tags JSON,
  updated_at TIMESTAMP
);

CREATE OR REPLACE TABLE intelligence_troubleshooting_cases (
  id VARCHAR,
  slug VARCHAR,
  status VARCHAR,
  review_status VARCHAR,
  title VARCHAR,
  source_title VARCHAR,
  source_url VARCHAR,
  source_type VARCHAR,
  case_date TIMESTAMP,
  technology_area VARCHAR,
  problem_summary VARCHAR,
  problem_statement VARCHAR,
  initial_assumptions JSON,
  investigation_timeline JSON,
  evidence_collected JSON,
  dead_ends JSON,
  key_turning_points JSON,
  root_cause VARCHAR,
  resolution VARCHAR,
  lessons_learned JSON,
  effective_techniques JSON,
  common_mistakes JSON,
  incorrect_assumptions JSON,
  high_value_evidence_sources JSON,
  diagnostic_shortcuts JSON,
  anti_patterns JSON,
  troubleshooting_principles JSON,
  skill_indicators JSON,
  complexity_score INTEGER,
  complexity_justification VARCHAR,
  confidence VARCHAR,
  case_of_week_eligible BOOLEAN,
  updated_at TIMESTAMP
);

INSERT INTO intelligence_meta VALUES (
  ${sqlTimestamp(dataset.generatedAt)},
  ${sqlTimestamp(dataset.updatedAt)},
  ${sqlNumber(dataset.projects.length)},
  ${sqlNumber(dataset.projects.filter((project) => project.status === "published").length)},
  ${sqlNumber(dataset.projects.filter((project) => project.status === "draft").length)},
  ${sqlNumber(dataset.collectorBacklog.length)}
);

INSERT INTO intelligence_collector_settings VALUES (
  ${sqlBoolean(dataset.collector.settings.automationEnabled)},
  ${sqlString(dataset.collector.settings.automationSchedule)},
  ${sqlString(dataset.collector.settings.automationTimezone)},
  ${sqlString(dataset.collector.settings.automationId ?? "")},
  ${sqlNumber(dataset.collector.settings.maxItemsPerRun)},
  ${sqlNumber(dataset.collector.settings.sourceTextCharLimit)},
  ${sqlTimestamp(dataset.collector.settings.lastRunAt ?? "")},
  ${sqlString(dataset.collector.settings.lastRunStatus ?? "")}
);

${projectRows.length ? `INSERT INTO intelligence_projects VALUES\n${projectRows.join(",\n")};` : ""}
${signalRows.length ? `INSERT INTO intelligence_signals VALUES\n${signalRows.join(",\n")};` : ""}
${lessonRows.length ? `INSERT INTO intelligence_lessons VALUES\n${lessonRows.join(",\n")};` : ""}
${moduleRows.length ? `INSERT INTO intelligence_collection_modules VALUES\n${moduleRows.join(",\n")};` : ""}
${backlogRows.length ? `INSERT INTO intelligence_backlog VALUES\n${backlogRows.join(",\n")};` : ""}
${collectorRunRows.length ? `INSERT INTO intelligence_collection_runs VALUES\n${collectorRunRows.join(",\n")};` : ""}
${troubleshootingCaseRows.length ? `INSERT INTO intelligence_troubleshooting_cases VALUES\n${troubleshootingCaseRows.join(",\n")};` : ""}
${troubleshootingInsightRows.length ? `INSERT INTO intelligence_troubleshooting_insights VALUES\n${troubleshootingInsightRows.join(",\n")};` : ""}

CREATE OR REPLACE VIEW intelligence_top_signals AS
SELECT normalized_signal, signal_category, count(*) AS occurrences
FROM intelligence_signals
GROUP BY normalized_signal, signal_category
ORDER BY occurrences DESC, normalized_signal ASC;

CREATE OR REPLACE VIEW intelligence_outcomes AS
SELECT outcome_classification, count(*) AS projects
FROM intelligence_projects
WHERE status = 'published'
GROUP BY outcome_classification
ORDER BY projects DESC, outcome_classification ASC;

COMMIT;
`;
}

async function runDuckDb(databasePath: string, sql: string) {
  const process = spawn("duckdb", [databasePath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderr = "";
  let stdout = "";

  process.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  process.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    process.on("error", reject);
    process.on("close", resolve);
    process.stdin.write(sql);
    process.stdin.end();
  });

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || stdout.trim() || `duckdb exited with ${exitCode}`);
  }
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlTimestamp(value: string | null | undefined) {
  if (!value) return "NULL";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "NULL";
  return `CAST(${sqlString(date.toISOString())} AS TIMESTAMP)`;
}

function sqlNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

function sqlJson(value: unknown) {
  return `CAST(${sqlString(JSON.stringify(value))} AS JSON)`;
}

function sqlBoolean(value: boolean) {
  return value ? "TRUE" : "FALSE";
}
