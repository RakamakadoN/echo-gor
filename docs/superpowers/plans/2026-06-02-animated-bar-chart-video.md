# Animated Bar Chart Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Remotion project that renders a 6-second animated chart with exactly five bars.

**Architecture:** Create an isolated Remotion app in `animated-bar-chart-video/`. Register one composition in `src/Root.tsx`, render all chart visuals in `src/AnimatedBarChart.tsx`, and keep data plus scale helpers simple and local. Drive all motion from Remotion frame hooks rather than CSS animation.

**Tech Stack:** Remotion, React, TypeScript, Vitest or TypeScript-only validation depending on the scaffold.

---

### Task 1: Scaffold The Remotion Project

**Files:**
- Create: `animated-bar-chart-video/`

- [ ] **Step 1: Scaffold a blank Remotion app**

Run:

```bash
npx create-video@latest --yes --blank --no-tailwind animated-bar-chart-video
```

Expected: A new `animated-bar-chart-video` directory with Remotion source files and `package.json`.

- [ ] **Step 2: Inspect generated scripts**

Run:

```bash
sed -n '1,220p' animated-bar-chart-video/package.json
```

Expected: Scripts for starting Remotion Studio and rendering/checking the project are visible.

### Task 2: Add Chart Data And Scale Tests

**Files:**
- Create: `animated-bar-chart-video/src/chartData.ts`
- Create: `animated-bar-chart-video/src/chartData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/chartData.test.ts` with tests that require exactly five bars and a normalized max scale of `100`.

- [ ] **Step 2: Run the test and verify it fails**

Run the scaffold's test command if available. If no test command exists, run TypeScript after importing the missing module.

Expected: The test or typecheck fails because `chartData.ts` does not exist.

- [ ] **Step 3: Implement chart data helpers**

Create `src/chartData.ts` exporting:

```ts
export type BarDatum = {
  label: string;
  value: number;
  color: string;
};

export const chartData: BarDatum[] = [
  { label: "Alpha", value: 46, color: "#2f80ed" },
  { label: "Beta", value: 72, color: "#27ae60" },
  { label: "Gamma", value: 58, color: "#f2994a" },
  { label: "Delta", value: 88, color: "#eb5757" },
  { label: "Echo", value: 100, color: "#7b61ff" },
];

export const maxChartValue = Math.max(...chartData.map((item) => item.value));

export const getBarHeightRatio = (value: number) => value / maxChartValue;
```

- [ ] **Step 4: Run tests or typecheck again**

Expected: The chart data checks pass.

### Task 3: Register The Composition

**Files:**
- Modify: `animated-bar-chart-video/src/Root.tsx`

- [ ] **Step 1: Register `AnimatedBarChart`**

Update `src/Root.tsx` so it exports a composition:

```tsx
<Composition
  id="AnimatedBarChart"
  component={AnimatedBarChart}
  durationInFrames={180}
  fps={30}
  width={1920}
  height={1080}
/>
```

Expected: Remotion can discover a 6-second 1080p composition.

### Task 4: Implement The Animated Chart

**Files:**
- Create: `animated-bar-chart-video/src/AnimatedBarChart.tsx`

- [ ] **Step 1: Render the chart layout**

Build a full-frame scene with title, baseline, subtle grid lines, five bars, labels, and values.

- [ ] **Step 2: Add frame-driven animation**

Use `useCurrentFrame()`, `useVideoConfig()`, `spring()`, and `interpolate()` so each bar grows from the baseline with a `5` frame stagger and values fade in after growth.

- [ ] **Step 3: Ensure final readability**

At frame `150`, all bars, labels, and values should be fully visible and non-overlapping.

### Task 5: Verify And Preview

**Files:**
- Verify: `animated-bar-chart-video/`

- [ ] **Step 1: Run TypeScript/build verification**

Run the generated typecheck/build command.

Expected: No TypeScript errors.

- [ ] **Step 2: Render a still frame**

Run:

```bash
npx remotion still AnimatedBarChart --scale=0.25 --frame=150
```

Expected: A still image renders successfully and shows the completed chart.

- [ ] **Step 3: Start Studio**

Run:

```bash
npx remotion studio
```

Expected: Studio opens or starts on a local URL where the composition can be previewed.

## Self-Review

- Spec coverage: The plan covers standalone project creation, exactly five bars, Remotion frame-driven animation, composition registration, and still-frame verification.
- Placeholder scan: No TBD or TODO placeholders remain.
- Type consistency: `chartData`, `maxChartValue`, and `getBarHeightRatio` are named consistently across tasks.
