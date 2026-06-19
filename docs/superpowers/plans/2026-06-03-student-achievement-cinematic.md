# Student Achievement Cinematic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CRM-ready cinematic Remotion template for student achievement videos in 1080x1920 vertical format.

**Architecture:** Add a focused `studentAchievementCinematic` template folder with typed payload data, reusable cinematic visual primitives, and five scene components. Register a new `StudentAchievementCinematic` composition alongside existing Echo Gor templates without changing the current generic `StudentAchievement` composition.

**Tech Stack:** Remotion 4, React 19, TypeScript, CSS-in-JS style objects.

---

### Task 1: Payload Contract And Defaults

**Files:**
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/schema.ts`
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/defaultPayload.ts`

- [x] **Step 1: Define a typed CRM payload**

Create `schema.ts` with `StudentAchievementPayload`, supporting arbitrary achievement names while documenting the expected CRM fields.

- [x] **Step 2: Add demo CRM data**

Create `defaultPayload.ts` with a realistic Echo Gor student, branch, teacher, date, counters, logo fallback, and placeholder photo behavior.

### Task 2: Cinematic Visual Components

**Files:**
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/components/CinematicElements.tsx`

- [x] **Step 1: Build reusable primitives**

Create `CinematicMountains`, `FogLayer`, `SunRays`, `EchoGorLogo`, `StudentPortrait`, `GoldMedal`, `ProgressCounter`, `SceneTransition`, and text helpers.

- [x] **Step 2: Keep animation deterministic**

Use `useCurrentFrame`, `useVideoConfig`, `interpolate`, `spring`, and `Easing` only. Avoid browser-time animation so renders remain deterministic.

### Task 3: Scene Components

**Files:**
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/scenes/OpeningMountainScene.tsx`
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/scenes/StudentRevealScene.tsx`
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/scenes/AchievementMedalScene.tsx`
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/scenes/ProgressScene.tsx`
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/scenes/FinalMountainScene.tsx`

- [x] **Step 1: Implement five cinematic scenes**

Each scene receives `payload: StudentAchievementPayload` and renders one storyboard beat: opening mountains, student reveal, achievement medal, progress stats, and final logo.

- [x] **Step 2: Use scene-local timings**

Use local sequence frames for scene entrances, since `Series.Sequence` resets `useCurrentFrame()` for children.

### Task 4: Composition Registration

**Files:**
- Create: `animated-bar-chart-video/src/templates/studentAchievementCinematic/StudentAchievementCinematicVideo.tsx`
- Modify: `animated-bar-chart-video/src/templates/templateComponents.tsx`
- Modify: `animated-bar-chart-video/src/Root.tsx`

- [x] **Step 1: Compose the full 18-second video**

Use `Series.Sequence` with durations of 96, 108, 120, 114, and 102 frames for a total of 540 frames at 30fps.

- [x] **Step 2: Register Remotion composition**

Add `StudentAchievementCinematic` at 1080x1920, 30fps, 540 frames.

### Task 5: Verification

**Files:**
- Existing Remotion project files.

- [x] **Step 1: Run static verification**

Run `npm run lint` from `animated-bar-chart-video`.

- [x] **Step 2: Fix any TypeScript or ESLint issues**

Address local issues only; leave unrelated project files untouched.
