import { IconChartBar, IconRocket } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";

import data from "@/app/dashboard/data.json";

/**
 * Data dashboard demo - demonstrates charts, tables, and data visualization.
 *
 * This demo shows how to:
 * - Display data with Recharts (line, bar, area charts)
 * - Build interactive data tables with sorting and filtering
 * - Create sidebar navigation
 * - Load data from JSON files or APIs
 *
 * All dependencies (recharts, shadcn/ui components) are pre-installed.
 * The sample data is in src/app/dashboard/data.json.
 * See docs/shadcncharts.md for comprehensive chart examples and patterns.
 *
 * Customize this by:
 * - Connecting to a SQLite database for dynamic data
 * - Adding real-time data updates via WebSocket
 * - Creating custom chart types
 * - Adding data export (CSV, PDF)
 * - Implementing advanced filters and search
 */

export default function DataDemo() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <header className="mb-8 text-center">
          <Badge variant="outline" className="mb-4">
            <IconRocket className="size-3" />
            Running on your Zo Computer
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Data Dashboard Template
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            A starting point for building data-driven applications
          </p>
        </header>

        <Card className="mb-8 bg-gradient-to-t from-primary/5 to-card shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconChartBar className="size-5" />
              This is a template
            </CardTitle>
            <CardDescription>
              Everything below is demo content — replace it with your own data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              This template includes charts, tables, and data visualization
              components that you can customize for your use case. The sample
              data is placeholder content to show what's possible.
            </p>
            <p>
              <strong className="text-foreground">Ask Zo to help you:</strong>{" "}
              connect to a database, visualize your own data, add filters and
              search, create new chart types, or build something entirely
              different.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="border-t bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
          <div className="mb-6 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Demo
            </Badge>
            <span className="text-sm text-muted-foreground">
              Sample dashboard with placeholder data
            </span>
          </div>
        </div>

        <div className="@container/main flex flex-col gap-2">
          <div className="flex flex-col gap-4 pb-8 md:gap-6">
            <SectionCards />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            <DataTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
