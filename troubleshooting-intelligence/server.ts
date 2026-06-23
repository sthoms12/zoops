import { serveStatic } from "hono/bun";
import { Hono } from "hono";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";

import config from "./zosite.json";
import {
  buildDashboardPayload,
  searchIntelligence,
  hydrateDataset,
  type IntelligenceDataset,
} from "./src/lib/intelligence";
import { syncDuckDbMirror } from "./src/lib/duckdb";

type Mode = "development" | "production";

const app = new Hono();
const mode: Mode = process.env.NODE_ENV === "production" ? "production" : "development";
const datasetPath = "/home/workspace/troubleshooting-intelligence/data/troubleshooting-intelligence.json";

let dataset = await loadDataset();
await syncDuckDbMirror(dataset);

app.get("/api/intelligence/dataset", (c) => {
  return c.json(buildDashboardPayload(dataset));
});

app.get("/api/intelligence/search", (c) => {
  const query = c.req.query("q") ?? "";
  const troubleshootingCases = dataset.troubleshootingCases.filter((record) => record.status !== "archived");
  const insights = dataset.troubleshootingInsights.filter((insight) => insight.status !== "archived");
  return c.json({
    query,
    results: searchIntelligence([], troubleshootingCases, insights, query),
  });
});

if (mode === "production") {
  configureProduction(app);
} else {
  await configureDevelopment(app);
}

const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : mode === "production"
    ? (config.publish?.published_port ?? config.local_port)
    : config.local_port;

export default { fetch: app.fetch, port, idleTimeout: 255 };

async function loadDataset(): Promise<IntelligenceDataset> {
  const file = Bun.file(datasetPath);
  return hydrateDataset((await file.json()) as IntelligenceDataset);
}

async function persistDataset() {
  await Bun.write(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`);
  await syncDuckDbMirror(dataset);
}

function configureProduction(app: Hono) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.get("/favicon.ico", (c) => c.redirect("/favicon.svg", 302));
  app.use(async (c, next) => {
    if (c.req.method !== "GET") return next();

    const path = c.req.path;
    if (path.startsWith("/api/") || path.startsWith("/assets/")) return next();

    const file = Bun.file(`./dist${path}`);
    if (await file.exists()) {
      const stat = await file.stat();
      if (stat && !stat.isDirectory()) {
        return new Response(file);
      }
    }

    return serveStatic({ path: "./dist/index.html" })(c, next);
  });
}

async function configureDevelopment(app: Hono): Promise<ViteDevServer> {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
  });

  app.use("*", async (c, next) => {
    if (c.req.path.startsWith("/api/")) return next();
    if (c.req.path === "/favicon.ico") return c.redirect("/favicon.svg", 302);

    const url = c.req.path;
    try {
      if (url === "/" || url === "/index.html") {
        let template = await Bun.file("./index.html").text();
        template = await vite.transformIndexHtml(url, template);
        return c.html(template, {
          headers: { "Cache-Control": "no-store, must-revalidate" },
        });
      }

      const publicFile = Bun.file(`./public${url}`);
      if (await publicFile.exists()) {
        const stat = await publicFile.stat();
        if (stat && !stat.isDirectory()) {
          return new Response(publicFile, {
            headers: { "Cache-Control": "no-store, must-revalidate" },
          });
        }
      }

      let result;
      try {
        result = await vite.transformRequest(url);
      } catch {
        result = null;
      }

      if (result) {
        return new Response(result.code, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-store, must-revalidate",
          },
        });
      }

      let template = await Bun.file("./index.html").text();
      template = await vite.transformIndexHtml("/", template);
      return c.html(template, {
        headers: { "Cache-Control": "no-store, must-revalidate" },
      });
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);
      return c.text("Internal Server Error", 500);
    }
  });

  return vite;
}
