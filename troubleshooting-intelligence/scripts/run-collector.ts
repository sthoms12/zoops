import { runTroubleshootingCollectorCycle } from "../backend-lib/troubleshooting-collector";
import { syncDuckDbMirror } from "../src/lib/duckdb";
import { hydrateDataset, type CollectorBacklogItem, type IntelligenceDataset } from "../src/lib/intelligence";

const datasetPath = "/home/workspace/troubleshooting-intelligence/data/troubleshooting-intelligence.json";

const args = new Map(
  Bun.argv.slice(2).map((arg) => {
    const divider = arg.indexOf("=");
    const key = divider >= 0 ? arg.slice(0, divider) : arg;
    const value = divider >= 0 ? arg.slice(divider + 1) : "true";
    return [key, value ?? "true"];
  }),
);

const limit = Number.parseInt(args.get("--limit") ?? "", 10);
const trigger = args.get("--trigger") === "automation" ? "automation" : "manual";

const file = Bun.file(datasetPath);
const dataset = hydrateDataset((await file.json()) as IntelligenceDataset);

const manualBacklogItem = buildManualBacklogItem(args);
const seedDataset = manualBacklogItem
  ? {
      ...dataset,
      collectorBacklog: [manualBacklogItem, ...dataset.collectorBacklog],
    }
  : dataset;

const result = await runTroubleshootingCollectorCycle(seedDataset, {
  limit: Number.isFinite(limit) ? limit : undefined,
  trigger,
});

await Bun.write(datasetPath, `${JSON.stringify(result.dataset, null, 2)}\n`);
await syncDuckDbMirror(result.dataset);

console.log(JSON.stringify(result.run, null, 2));

function buildManualBacklogItem(values: Map<string, string>): CollectorBacklogItem | null {
  const sourceUrl = values.get("--url")?.trim();
  if (!sourceUrl) return null;

  const title = values.get("--title")?.trim() || sourceUrl;
  const publicationDate = values.get("--date")?.trim() || null;
  const sourceType = values.get("--source-type")?.trim() || "Manual troubleshooting source";
  const summaryHint = values.get("--summary")?.trim() || "Manual troubleshooting collector request.";
  const technologyArea = values.get("--technology-area")?.trim() || "Other";

  return {
    id: `manual-troubleshooting-source-${Date.now()}`,
    title,
    projectCategory: "Troubleshooting",
    technologyArea,
    industry: "Technology",
    sourceUrl,
    sourceType,
    publicationDate,
    summaryHint,
    candidateSignals: [],
    candidateLessons: [],
  };
}
