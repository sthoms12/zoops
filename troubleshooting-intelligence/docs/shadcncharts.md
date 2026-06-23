# ShadCN/UI Charts Guide

A comprehensive guide to using charts in ShadCN/UI, built on top of [Recharts](https://recharts.org/).

---

## ⚠️ CRITICAL: Chart Colors

**DO NOT use `hsl()` for chart colors.** The theme uses oklch format — wrapping in `hsl()` produces black/invisible colors.

✅ **CORRECT:**
```tsx
const chartConfig = {
  sales: { label: "Sales", color: "var(--chart-1)" },
  revenue: { label: "Revenue", color: "var(--chart-2)" },
} satisfies ChartConfig;

<Bar fill="var(--color-sales)" />
```

❌ **WRONG (causes black-on-black):**
```tsx
color: "hsl(var(--chart-1))"  // BROKEN - don't do this
fill: "hsl(var(--color-sales))"  // BROKEN - don't do this
```

Available colors: `--chart-1` through `--chart-5`. Reference as `var(--chart-N)` in config, `var(--color-dataKey)` in components.

---

## Table of Contents

- [Core Concepts](#core-concepts)
- [Chart Types](#chart-types)
  - [Area Charts](#area-charts)
  - [Bar Charts](#bar-charts)
  - [Line Charts](#line-charts)
  - [Pie Charts](#pie-charts)
  - [Radar Charts](#radar-charts)
  - [Radial Charts](#radial-charts)
- [Common Features](#common-features)
  - [Tooltips](#tooltips)
  - [Legends](#legends)
  - [Grids & Axes](#grids--axes)
- [Theming](#theming)
- [Accessibility](#accessibility)

---

## Core Concepts

### The ChartConfig

Every chart requires a `chartConfig` object that defines labels, colors, and optional icons for each data series:

```tsx
import { type ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig
```

**Important:** The chart color CSS variables (`--chart-1` through `--chart-5`) are already defined in oklch format in your theme's CSS. Use them directly with `var(--chart-N)` — do NOT wrap them in `hsl()`.

You can also define theme-aware colors:

```tsx
const chartConfig = {
  desktop: {
    label: "Desktop",
    icon: Monitor, // Optional lucide icon
    theme: {
      light: "#2563eb",
      dark: "#dc2626",
    },
  },
} satisfies ChartConfig
```

### Using Default Chart Colors

Your theme defines chart color variables (`--chart-1` through `--chart-5`) in CSS. To use these with `ChartConfig`:

1. **In the config**: Reference colors as `var(--chart-N)`
2. **In components**: Reference colors as `var(--color-dataKey)`

The `ChartContainer` automatically maps your config's color values to `--color-<dataKey>` CSS variables.

```tsx
// Define config with default chart colors
const chartConfig = {
  participants: {
    label: "Participants (M)",
    color: "var(--chart-1)",  // Uses your theme's first chart color
  },
} satisfies ChartConfig;

const costConfig = {
  snapCost: {
    label: "SNAP ($B)",
    color: "var(--chart-1)",  // First color
  },
  wicCost: {
    label: "WIC ($B)", 
    color: "var(--chart-2)",  // Second color
  },
} satisfies ChartConfig;

// In your chart, reference via var(--color-<dataKey>)
<ChartContainer config={chartConfig}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="fillParticipants" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--color-participants)" stopOpacity={0.8} />
        <stop offset="95%" stopColor="var(--color-participants)" stopOpacity={0.1} />
      </linearGradient>
    </defs>
    <Area
      dataKey="participants"
      fill="url(#fillParticipants)"
      stroke="var(--color-participants)"
    />
  </AreaChart>
</ChartContainer>
```

For pie/donut charts where each slice needs a different color, define colors in both the config AND the data:

```tsx
const chartConfig = {
  value: { label: "Percent" },
  // Define each category's color
  chrome: { label: "Chrome", color: "var(--chart-1)" },
  safari: { label: "Safari", color: "var(--chart-2)" },
  firefox: { label: "Firefox", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Data must include `fill` property for each slice
const data = [
  { name: "Chrome", value: 50, fill: "var(--color-chrome)" },
  { name: "Safari", value: 30, fill: "var(--color-safari)" },
  { name: "Firefox", value: 20, fill: "var(--color-firefox)" },
];
```

**Available default colors**: `--chart-1` through `--chart-5` are defined in your theme's CSS. Add more if needed:

```css
:root {
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}
```

### The ChartContainer

All charts must be wrapped in `ChartContainer` with a minimum height:

```tsx
import { ChartContainer } from "@/components/ui/chart"

<ChartContainer config={chartConfig} className="min-h-[200px] w-full">
  {/* Recharts components go here */}
</ChartContainer>
```

### Using Colors

Reference colors using CSS variables with the format `var(--color-KEY)`:

```tsx
// In components
<Bar dataKey="desktop" fill="var(--color-desktop)" />

// In data objects
const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
]

// In Tailwind classes
<LabelList className="fill-[--color-desktop]" />
```

---

## Chart Types

### Area Charts

Basic area chart with single series:

```tsx
"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function AreaChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <AreaChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="desktop"
          type="natural"
          fill="var(--color-desktop)"
          fillOpacity={0.4}
          stroke="var(--color-desktop)"
        />
      </AreaChart>
    </ChartContainer>
  )
}
```

#### Area Chart Variations

**Stacked Area Chart** - Multiple series stacked on top of each other:

```tsx
<Area dataKey="desktop" type="natural" stackId="a" fill="var(--color-desktop)" stroke="var(--color-desktop)" />
<Area dataKey="mobile" type="natural" stackId="a" fill="var(--color-mobile)" stroke="var(--color-mobile)" />
```

**Gradient Fill** - Using SVG gradients for a polished look:

```tsx
<AreaChart data={chartData}>
  <defs>
    <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
      <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
    </linearGradient>
  </defs>
  <Area
    dataKey="desktop"
    fill="url(#fillDesktop)"
    stroke="var(--color-desktop)"
  />
</AreaChart>
```

**Curve Types** - Control the line interpolation:
- `type="natural"` - Smooth natural curve (default)
- `type="linear"` - Straight lines between points
- `type="step"` - Step function appearance

---

### Bar Charts

Basic vertical bar chart:

```tsx
"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function BarChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
```

#### Bar Chart Variations

**Horizontal Bar Chart** - Use `layout="vertical"` with YAxis:

```tsx
<BarChart data={chartData} layout="vertical">
  <XAxis type="number" hide />
  <YAxis
    dataKey="month"
    type="category"
    tickLine={false}
    axisLine={false}
    tickFormatter={(value) => value.slice(0, 3)}
  />
  <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
</BarChart>
```

**Multiple Bar Series** - Side-by-side bars:

```tsx
<Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
<Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
```

**Stacked Bar Chart** - Use the same `stackId`:

```tsx
<Bar dataKey="desktop" stackId="a" fill="var(--color-desktop)" radius={[0, 0, 4, 4]} />
<Bar dataKey="mobile" stackId="a" fill="var(--color-mobile)" radius={[4, 4, 0, 0]} />
```

**Bar with Labels** - Add data labels on bars:

```tsx
import { LabelList } from "recharts"

<Bar dataKey="desktop" fill="var(--color-desktop)" radius={8}>
  <LabelList
    position="top"
    offset={12}
    className="fill-foreground"
    fontSize={12}
  />
</Bar>
```

**Mixed/Negative Values** - Handle negative values with appropriate radius:

```tsx
<Bar dataKey="visitors" fill="var(--color-desktop)">
  {chartData.map((item) => (
    <Cell
      key={item.month}
      fill={item.visitors > 0 ? "var(--color-positive)" : "var(--color-negative)"}
    />
  ))}
</Bar>
```

---

### Line Charts

Basic line chart:

```tsx
"use client"

import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function LineChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <LineChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="desktop"
          type="natural"
          stroke="var(--color-desktop)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
```

#### Line Chart Variations

**Line with Dots** - Show data points:

```tsx
<Line
  dataKey="desktop"
  type="natural"
  stroke="var(--color-desktop)"
  strokeWidth={2}
  dot={{ fill: "var(--color-desktop)" }}
  activeDot={{ r: 6 }}
/>
```

**Custom Dots** - Define custom dot styles:

```tsx
<Line
  dataKey="desktop"
  stroke="var(--color-desktop)"
  dot={({ cx, cy, payload }) => (
    <circle cx={cx} cy={cy} r={4} fill={payload.fill} />
  )}
/>
```

**Multiple Lines**:

```tsx
<Line dataKey="desktop" stroke="var(--color-desktop)" />
<Line dataKey="mobile" stroke="var(--color-mobile)" />
```

---

### Pie Charts

> ⚠️ **Pie/Radial Chart Tooltips:** Always use `hideLabel` and match `nameKey` between `<Pie>` and `<ChartTooltipContent>`:
> ```tsx
> <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="browser" />} />
> <Pie data={chartData} dataKey="visitors" nameKey="browser" />
> ```
> Without `hideLabel`, the tooltip header will be undefined. Without matching `nameKey`, series names won't display correctly.

Basic pie chart:

```tsx
"use client"

import { Pie, PieChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
]

const chartConfig = {
  visitors: { label: "Visitors" },
  chrome: { label: "Chrome", color: "var(--chart-1)" },
  safari: { label: "Safari", color: "var(--chart-2)" },
  firefox: { label: "Firefox", color: "var(--chart-3)" },
  edge: { label: "Edge", color: "var(--chart-4)" },
  other: { label: "Other", color: "var(--chart-5)" },
} satisfies ChartConfig

export function PieChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={chartData} dataKey="visitors" nameKey="browser" />
      </PieChart>
    </ChartContainer>
  )
}
```

#### Pie Chart Variations

**Donut Chart** - Add inner radius:

```tsx
<Pie
  data={chartData}
  dataKey="visitors"
  nameKey="browser"
  innerRadius={60}
/>
```

**Donut with Center Text** - Display a value in the center:

```tsx
import { Label, Pie, PieChart } from "recharts"

const totalVisitors = chartData.reduce((acc, curr) => acc + curr.visitors, 0)

<PieChart>
  <Pie data={chartData} dataKey="visitors" innerRadius={60} strokeWidth={5}>
    <Label
      content={({ viewBox }) => {
        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
          return (
            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                {totalVisitors.toLocaleString()}
              </tspan>
              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                Visitors
              </tspan>
            </text>
          )
        }
      }}
    />
  </Pie>
</PieChart>
```

**With Labels** - Show labels on slices:

```tsx
<Pie data={chartData} dataKey="visitors" label />

// Or custom labels
<Pie data={chartData} dataKey="visitors" label={({ payload, ...props }) => (
  <text {...props}>{payload.browser}</text>
)} />
```

---

### Radar Charts

```tsx
"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 273 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function RadarChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
      <RadarChart data={chartData}>
        <ChartTooltip content={<ChartTooltipContent />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="month" />
        <Radar
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ChartContainer>
  )
}
```

#### Radar Variations

- **Grid Circle**: Use `gridType="circle"` on `PolarGrid`
- **Multiple Series**: Add multiple `<Radar>` components
- **Dots**: Add `dot={{ r: 4 }}` to show data points
- **Lines Only**: Set `fill="none"` and use `stroke`

---

### Radial Charts

> ⚠️ **Radial Chart Tooltips:** Like pie charts, always use `hideLabel` and set `nameKey` to match your category field:
> ```tsx
> <ChartTooltip content={<ChartTooltipContent nameKey="browser" hideLabel />} />
> ```

```tsx
"use client"

import { RadialBar, RadialBarChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
]

const chartConfig = {
  visitors: { label: "Visitors" },
  chrome: { label: "Chrome", color: "var(--chart-1)" },
  safari: { label: "Safari", color: "var(--chart-2)" },
  firefox: { label: "Firefox", color: "var(--chart-3)" },
  edge: { label: "Edge", color: "var(--chart-4)" },
  other: { label: "Other", color: "var(--chart-5)" },
} satisfies ChartConfig

export function RadialChartDemo() {
  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
      <RadialBarChart data={chartData} innerRadius={30} outerRadius={110}>
        <ChartTooltip content={<ChartTooltipContent nameKey="browser" />} />
        <RadialBar dataKey="visitors" background />
      </RadialBarChart>
    </ChartContainer>
  )
}
```

---

## Common Features

### Tooltips

Import and use `ChartTooltip` with `ChartTooltipContent`:

```tsx
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

<ChartTooltip content={<ChartTooltipContent />} />
```

#### Understanding Tooltip Structure

A chart tooltip displays up to three pieces of information:

```
┌─────────────────────────┐
│ January               ← LABEL (from X-axis value or labelKey)
│ ● Desktop      186    ← NAME (from config label) + VALUE
│ ● Mobile        80
└─────────────────────────┘
```

- **Label**: The header of the tooltip. For Cartesian charts (Bar, Line, Area), this is typically the X-axis value (e.g., "January", a date). For Pie/Radial charts, there's no X-axis, so you usually want `hideLabel`.
- **Name**: The series name shown next to each indicator. This comes from your `chartConfig` labels.
- **Value**: The actual data value, displayed automatically.

#### Tooltip Props

| Prop | Type | Description |
|------|------|-------------|
| `labelKey` | `string` | Config/data key to use for the label (tooltip header) |
| `nameKey` | `string` | Config/data key to use for the series name |
| `indicator` | `"dot" \| "line" \| "dashed"` | Indicator style next to each series |
| `hideLabel` | `boolean` | Hide the label/header |
| `hideIndicator` | `boolean` | Hide the color indicator |
| `labelFormatter` | `(value, payload) => ReactNode` | Custom formatter for the label |

#### When to Use Each Prop

**For Cartesian Charts (Bar, Line, Area):**
- Default `<ChartTooltipContent />` usually works well
- Use `labelFormatter` to format dates or customize the header

```tsx
// Good for date-based X-axis
<ChartTooltip
  content={
    <ChartTooltipContent
      labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}
    />
  }
/>
```

**For Pie and Radial Charts:**
- **Always use `hideLabel`** — there's no X-axis, so the label would be undefined or confusing
- Use `nameKey` to tell the tooltip which data field contains the category name

```tsx
// CORRECT for pie charts
const chartData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
]

const chartConfig = {
  visitors: { label: "Visitors" },
  chrome: { label: "Chrome", color: "var(--chart-1)" },
  safari: { label: "Safari", color: "var(--chart-2)" },
} satisfies ChartConfig

<PieChart>
  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="browser" />} />
  <Pie data={chartData} dataKey="visitors" nameKey="browser" />
</PieChart>
```

#### Understanding `nameKey` and `labelKey`

The tooltip looks up labels from your `chartConfig` using keys from your data:

- **Without `nameKey`**: Uses `dataKey` (e.g., "desktop", "mobile") to find config labels
- **With `nameKey="browser"`**: Uses the VALUE of `data.browser` (e.g., "chrome") to find config labels

```tsx
// Data: { browser: "chrome", visitors: 275 }
// Config has: chrome: { label: "Chrome" }
// 
// nameKey="browser" → looks up config["chrome"] → displays "Chrome"
```

This is essential for pie/radial charts where each data point represents a different category.

#### ⚠️ Common Tooltip Mistakes

1. **Forgetting `hideLabel` on pie/radial charts:**
   ```tsx
   // ❌ BAD - label will be undefined or wrong
   <ChartTooltip content={<ChartTooltipContent />} />
   
   // ✅ GOOD
   <ChartTooltip content={<ChartTooltipContent hideLabel />} />
   ```

2. **Forgetting `nameKey` when data uses dynamic categories:**
   ```tsx
   // Data: [{ category: "Sales", value: 100 }, { category: "Marketing", value: 80 }]
   // Config: { sales: { label: "Sales" }, marketing: { label: "Marketing" } }
   
   // ❌ BAD - tooltip won't find the labels
   <ChartTooltip content={<ChartTooltipContent />} />
   
   // ✅ GOOD - tells tooltip to use "category" field to look up config
   <ChartTooltip content={<ChartTooltipContent nameKey="category" />} />
   ```

3. **Not matching Pie's `nameKey` with tooltip's `nameKey`:**
   ```tsx
   // ❌ BAD - inconsistent nameKey
   <Pie data={chartData} dataKey="value" nameKey="browser" />
   <ChartTooltip content={<ChartTooltipContent />} />
   
   // ✅ GOOD - both use same nameKey
   <Pie data={chartData} dataKey="value" nameKey="browser" />
   <ChartTooltip content={<ChartTooltipContent nameKey="browser" hideLabel />} />
   ```

#### Tooltip Examples

```tsx
// Default with label
<ChartTooltip content={<ChartTooltipContent />} />

// Line indicator
<ChartTooltip content={<ChartTooltipContent indicator="line" />} />

// No indicator
<ChartTooltip content={<ChartTooltipContent hideIndicator />} />

// Hide label (REQUIRED for pie/radial charts)
<ChartTooltip content={<ChartTooltipContent hideLabel />} />

// Custom keys for dynamic categories
<ChartTooltip content={<ChartTooltipContent labelKey="visitors" nameKey="browser" />} />

// Custom label formatter for dates
<ChartTooltip
  content={
    <ChartTooltipContent
      labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}
    />
  }
/>

// Disable cursor highlight
<ChartTooltip cursor={false} content={<ChartTooltipContent />} />

// Show tooltip on a specific index by default
<ChartTooltip defaultIndex={1} content={<ChartTooltipContent />} />
```

---

### Legends

Import and use `ChartLegend` with `ChartLegendContent`:

```tsx
import { ChartLegend, ChartLegendContent } from "@/components/ui/chart"

<ChartLegend content={<ChartLegendContent />} />
```

#### Legend with Custom Key

```tsx
<ChartLegend content={<ChartLegendContent nameKey="browser" />} />
```

---

### Grids & Axes

#### CartesianGrid

```tsx
import { CartesianGrid } from "recharts"

// Horizontal lines only
<CartesianGrid vertical={false} />

// Both horizontal and vertical
<CartesianGrid strokeDasharray="3 3" />
```

#### XAxis

```tsx
import { XAxis } from "recharts"

<XAxis
  dataKey="month"
  tickLine={false}          // Hide tick marks
  axisLine={false}          // Hide axis line
  tickMargin={10}           // Space between tick and label
  tickFormatter={(value) => value.slice(0, 3)}  // Abbreviate labels
/>
```

#### YAxis

```tsx
import { YAxis } from "recharts"

<YAxis
  tickLine={false}
  axisLine={false}
  tickFormatter={(value) => `$${value}`}
/>

// For horizontal bar charts
<YAxis
  dataKey="month"
  type="category"
  tickLine={false}
  axisLine={false}
/>
```

---

## Theming

### CSS Variables (Recommended)

Define colors in your CSS and reference them in the config:

```css
/* globals.css */
:root {
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
}

.dark {
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
}
```

```tsx
const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
}
```

**Important:** The default chart colors are defined in oklch format. Reference them directly with `var(--chart-N)`. Do NOT wrap in `hsl()` — that was for older color formats and will break oklch values.

### Direct Colors

Use any color format directly:

```tsx
const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#2563eb",           // Hex
    // or: "hsl(220, 98%, 61%)" // HSL
    // or: "oklch(0.6 0.2 250)" // OKLCH
  },
}
```

### Theme Object

Define different colors for light and dark modes:

```tsx
const chartConfig = {
  desktop: {
    label: "Desktop",
    theme: {
      light: "#2563eb",
      dark: "#60a5fa",
    },
  },
}
```

---

## Accessibility

Add the `accessibilityLayer` prop to your chart component for keyboard navigation and screen reader support:

```tsx
<BarChart accessibilityLayer data={chartData}>
  {/* ... */}
</BarChart>

<LineChart accessibilityLayer data={chartData}>
  {/* ... */}
</LineChart>

<AreaChart accessibilityLayer data={chartData}>
  {/* ... */}
</AreaChart>
```

---

## Complete Example with Card

Most shadcn/ui chart examples are wrapped in a Card component:

```tsx
"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function CompleteChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bar Chart</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  )
}
```

---

## Interactive Charts with Filtering

For interactive charts with time-range selection or other filters:

```tsx
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function InteractiveChart() {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = React.useMemo(() => {
    return chartData.filter((item) => {
      const date = new Date(item.date)
      const referenceDate = new Date("2024-06-30")
      let daysToSubtract = 90
      if (timeRange === "30d") daysToSubtract = 30
      else if (timeRange === "7d") daysToSubtract = 7
      
      const startDate = new Date(referenceDate)
      startDate.setDate(startDate.getDate() - daysToSubtract)
      return date >= startDate
    })
  }, [timeRange])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Interactive Chart</CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="90d">Last 3 months</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={filteredData}>
            {/* ... chart components */}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

---

## Quick Reference

| Chart Type | Main Component | Key Props |
|------------|----------------|-----------|
| Area | `<Area>` | `type`, `fill`, `fillOpacity`, `stroke`, `stackId` |
| Bar | `<Bar>` | `fill`, `radius`, `stackId`, `layout` |
| Line | `<Line>` | `type`, `stroke`, `strokeWidth`, `dot`, `activeDot` |
| Pie | `<Pie>` | `dataKey`, `nameKey`, `innerRadius`, `outerRadius`, `label` |
| Radar | `<Radar>` | `fill`, `fillOpacity`, `stroke`, `dot` |
| RadialBar | `<RadialBar>` | `dataKey`, `background`, `cornerRadius` |

---

## Resources

- [ShadCN/UI Charts Gallery](https://ui.shadcn.com/charts)
- [ShadCN/UI Chart Documentation](https://ui.shadcn.com/docs/components/chart)
- [Recharts Documentation](https://recharts.org/en-US/)



