import dataset from "../data/troubleshooting-intelligence.json";
import { syncDuckDbMirror } from "../src/lib/duckdb";

await syncDuckDbMirror(dataset as never);
console.log("Synced DuckDB mirror:", "/home/workspace/troubleshooting-intelligence/data/troubleshooting-intelligence.duckdb");
