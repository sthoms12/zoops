import rawDataset from "../data/troubleshooting-intelligence.json";
import {
  generateTroubleshootingWeeklyReport,
  hydrateDataset,
} from "../src/lib/intelligence";

const dataset = hydrateDataset(rawDataset as never);
const report = generateTroubleshootingWeeklyReport(dataset);
const outputPath = `/home/workspace/troubleshooting-intelligence/${report.outputPath}`;

await Bun.write(outputPath, report.markdown);

console.log(`Generated troubleshooting weekly report: ${outputPath}`);
