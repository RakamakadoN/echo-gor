# Artist Journey Documentary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Netflix Documentary-style Remotion template that turns years of a student's dance history into an emotional 30-60 second vertical film.

**Architecture:** Create a specialized `artistJourneyDocumentary` Remotion template instead of stretching the existing generic `ArtistJourney` renderer. The template will use a typed CRM payload, adaptive scene selection, documentary visual primitives, and a `Series` timeline that can render a compact 30-second version or fuller 60-second version from the same data.

**Tech Stack:** Remotion 4, React 19, TypeScript, deterministic CSS-in-JS animation, optional image/video media via Remotion `Img` and `OffthreadVideo`.

---

## Creative Structure

**Format:** 1080x1920, Reels/TikTok/Shorts first. Optional landscape later.

**Style:** Netflix Documentary: dark cinematic grade, archival photo treatment, slow zooms, timestamp captions, chapter titles, restrained typography, deep blacks, warm stage gold, Caucasus mountain silhouettes, dust/fog in light beams.

**Emotional Arc:** first step -> effort over years -> first stage -> public recognition -> family pride -> unfinished future.

## CRM Payload

```ts
export type ArtistJourneyDocumentaryPayload = {
  student: {
    id: string;
    name: string;
    currentAge?: number;
    firstPhotoUrl?: string;
    currentPhotoUrl?: string;
  };
  school: {
    name: string;
    branchName: string;
    logoUrl?: string;
  };
  timeline: {
    firstLesson?: JourneyMoment;
    firstPerformance?: JourneyMoment;
    festivals: JourneyMoment[];
    diplomas: JourneyMoment[];
    achievements: JourneyMoment[];
    concerts: JourneyMoment[];
  };
  summary: {
    yearsInSchool: number;
    lessonsCount?: number;
    performancesCount: number;
    festivalsCount: number;
    diplomasCount: number;
    achievementsCount: number;
  };
  parentsQuote?: {
    text: string;
    author?: string;
  };
  teacherQuote?: {
    text: string;
    author: string;
  };
  durationSeconds?: 30 | 45 | 60;
};

export type JourneyMoment = {
  id: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
};
```

## Scene Structure

| Scene | 30s | 45s | 60s | Purpose |
|---|---:|---:|---:|---|
| Prologue: Mountains Remember | 3s | 5s | 6s | Кавказские горы, документальный opening, имя ученика |
| First Frame | 4s | 6s | 7s | первое фото, первое занятие, дата начала |
| Years Of Discipline | 5s | 7s | 9s | занятия, тренировки, progress montage |
| First Stage Light | 5s | 7s | 8s | первое выступление, свет сцены, дыхание перед выходом |
| Festivals And Concerts | 5s | 7s | 10s | фестивали, концерты, география и сцена |
| Diplomas And Achievements | 4s | 6s | 8s | дипломы, награды, достижения |
| Parents Pride | 2s | 4s | 6s | цитата родителей или тихий emotional caption |
| Epilogue | 2s | 3s | 6s | горы, логотип, `История продолжается...` |

## Scene Details

### 1. Prologue: Mountains Remember

**Visual:** slow push over layered Caucasus mountains, cold mist, sunrise edge light.  
**Text:** `Путь артиста` / student name / branch.  
**Animation:** 3-layer parallax, subtle film grain, title fades in as if documentary chapter card.

### 2. First Frame

**Visual:** first photo appears as archival print, slightly imperfect frame, date caption.  
**Text:** `Первое занятие` and the CRM date.  
**Animation:** photo scan reveal, slow Ken Burns zoom, handwritten-like date marker using normal text styling.

### 3. Years Of Discipline

**Visual:** montage grid of lessons, practice, teacher corrections, shoes/floor/formation details.  
**Text:** `Годы дисциплины` + lessons count if available.  
**Animation:** rhythmic cuts, staggered media tiles, dark-to-gold highlight sweep.

### 4. First Stage Light

**Visual:** stage beam cuts through black, first performance media fills frame.  
**Text:** `Первое выступление` / date / location.  
**Animation:** beam opens like curtain, media transitions from archive frame to full bleed.

### 5. Festivals And Concerts

**Visual:** vertical timeline of festivals and concerts, selected media moments crossing behind.  
**Text:** festival/concert titles from CRM.  
**Animation:** timeline line draws upward; moments pin to it with gold markers.

### 6. Diplomas And Achievements

**Visual:** diploma/achievement cards float in controlled documentary wall composition.  
**Text:** total diplomas and achievements.  
**Animation:** cards settle one by one, final total locks in.

### 7. Parents Pride

**Visual:** warm side light, quiet frame, optional parent quote.  
**Text fallback:** `За каждым выходом на сцену — годы поддержки семьи.`  
**Animation:** slow fade, no heavy effects; this is the emotional pause.

### 8. Epilogue

**Visual:** mountains return, stronger sunrise, Echo Gor logo, faint stage light behind horizon.  
**Text:** `История продолжается...`  
**Animation:** final text appears after a breath; logo glints once, then holds.

---

## Remotion Component Architecture

```txt
animated-bar-chart-video/src/templates/artistJourneyDocumentary/
  ArtistJourneyDocumentaryVideo.tsx
  schema.ts
  defaultPayload.ts
  timeline.ts
  scenes/
    PrologueMountainsScene.tsx
    FirstFrameScene.tsx
    DisciplineYearsScene.tsx
    FirstStageLightScene.tsx
    FestivalsConcertsScene.tsx
    DiplomasAchievementsScene.tsx
    ParentsPrideScene.tsx
    EpilogueScene.tsx
  components/
    DocumentaryBackdrop.tsx
    CaucasusMountains.tsx
    FilmGrain.tsx
    ArchivePhoto.tsx
    ChapterTitle.tsx
    TimelineRail.tsx
    MediaMoment.tsx
    StageLight.tsx
    DiplomaWall.tsx
    DocumentaryLogo.tsx
```

## Adaptive Duration Rules

`timeline.ts` will expose:

```ts
export const resolveArtistJourneyTimeline = (durationSeconds: 30 | 45 | 60) => {
  if (durationSeconds === 30) {
    return [90, 120, 150, 150, 150, 120, 60, 60];
  }

  if (durationSeconds === 45) {
    return [150, 180, 210, 210, 210, 180, 120, 90];
  }

  return [180, 210, 270, 240, 300, 240, 180, 180];
};
```

Frame totals at 30fps: 900, 1350, 1800.

## Implementation Tasks

### Task 1: Define Documentary Payload

**Files:**
- Create: `animated-bar-chart-video/src/templates/artistJourneyDocumentary/schema.ts`
- Create: `animated-bar-chart-video/src/templates/artistJourneyDocumentary/defaultPayload.ts`

- [ ] **Step 1: Create `JourneyMoment` and `ArtistJourneyDocumentaryPayload` types.**

Use the exact payload contract from this plan. Keep `durationSeconds` limited to `30 | 45 | 60`.

- [ ] **Step 2: Add a default payload.**

Include demo first photo fallback, first lesson, first performance, at least two festivals, two diplomas, two achievements, two concerts, parent quote, teacher quote, and summary counts.

### Task 2: Resolve Timeline Durations

**Files:**
- Create: `animated-bar-chart-video/src/templates/artistJourneyDocumentary/timeline.ts`

- [ ] **Step 1: Implement `resolveArtistJourneyTimeline`.**

Return named scene durations:

```ts
export type ArtistJourneySceneDuration = {
  prologue: number;
  firstFrame: number;
  discipline: number;
  firstStage: number;
  festivalsConcerts: number;
  diplomasAchievements: number;
  parentsPride: number;
  epilogue: number;
};
```

- [ ] **Step 2: Add `getArtistJourneyTotalFrames`.**

Sum the returned object values so `Root.tsx` can register the composition duration from the same timing source.

### Task 3: Build Documentary Visual Primitives

**Files:**
- Create: `animated-bar-chart-video/src/templates/artistJourneyDocumentary/components/DocumentaryElements.tsx`

- [ ] **Step 1: Reuse motion principles from `studentAchievementCinematic`.**

Use deterministic Remotion frame math: `useCurrentFrame`, `useVideoConfig`, `interpolate`, `spring`, `Easing`.

- [ ] **Step 2: Implement reusable primitives.**

Create `DocumentaryBackdrop`, `CaucasusMountains`, `FilmGrain`, `ArchivePhoto`, `ChapterTitle`, `TimelineRail`, `MediaMoment`, `StageLight`, `DiplomaWall`, and `DocumentaryLogo`.

- [ ] **Step 3: Support missing media.**

Every media component must render a branded fallback panel using the moment title when `mediaUrl` is missing.

### Task 4: Implement Eight Scene Components

**Files:**
- Create each file under `animated-bar-chart-video/src/templates/artistJourneyDocumentary/scenes/`

- [ ] **Step 1: Build `PrologueMountainsScene`.**

Render mountains, fog, `Путь артиста`, student name, branch name.

- [ ] **Step 2: Build `FirstFrameScene`.**

Render first photo, `Первое занятие`, date, and first lesson description.

- [ ] **Step 3: Build `DisciplineYearsScene`.**

Render a montage from lessons/achievements/concert media and summary count.

- [ ] **Step 4: Build `FirstStageLightScene`.**

Render first performance with stage-light reveal and location/date captions.

- [ ] **Step 5: Build `FestivalsConcertsScene`.**

Render a documentary timeline from `festivals` and `concerts`.

- [ ] **Step 6: Build `DiplomasAchievementsScene`.**

Render diploma and achievement cards with total counters.

- [ ] **Step 7: Build `ParentsPrideScene`.**

Render parent quote or fallback pride caption.

- [ ] **Step 8: Build `EpilogueScene`.**

Render mountains, logo, and `История продолжается...`.

### Task 5: Compose And Register The Template

**Files:**
- Create: `animated-bar-chart-video/src/templates/artistJourneyDocumentary/ArtistJourneyDocumentaryVideo.tsx`
- Modify: `animated-bar-chart-video/src/templates/templateComponents.tsx`
- Modify: `animated-bar-chart-video/src/Root.tsx`

- [ ] **Step 1: Compose scenes with `Series.Sequence`.**

Use durations from `resolveArtistJourneyTimeline(payload.durationSeconds ?? 60)`.

- [ ] **Step 2: Export `ArtistJourneyDocumentary`.**

Add it to `templateComponents.tsx` without replacing the existing `ArtistJourneyVideo`.

- [ ] **Step 3: Register composition.**

Add composition id `ArtistJourneyDocumentary`, `fps={30}`, `width={1080}`, `height={1920}`, duration from `getArtistJourneyTotalFrames(60)`.

### Task 6: Verification

**Files:**
- Existing project files.

- [ ] **Step 1: Run static checks.**

Run:

```bash
npm run lint
```

Expected: `eslint src && tsc` exits with code 0.

- [ ] **Step 2: Render documentary stills.**

Run:

```bash
npx remotion still ArtistJourneyDocumentary --scale=0.25 --frame=120 /tmp/artist-journey-prologue.png
npx remotion still ArtistJourneyDocumentary --scale=0.25 --frame=720 /tmp/artist-journey-stage.png
npx remotion still ArtistJourneyDocumentary --scale=0.25 --frame=1680 /tmp/artist-journey-final.png
```

Expected: each command exits with code 0 and produces a nonblank PNG.

- [ ] **Step 3: Preview in Remotion Studio.**

Run:

```bash
npm run dev -- --port=3001 --no-open
```

Open `http://localhost:3001` and inspect `ArtistJourneyDocumentary`.

## Acceptance Checklist

- [ ] Video can render at 1080x1920.
- [ ] Duration can be configured as 30, 45, or 60 seconds.
- [ ] Missing media does not break the render.
- [ ] The first lesson, first performance, festivals, diplomas, achievements, and concerts can all appear from CRM data.
- [ ] The final scene contains `История продолжается...`.
- [ ] The mood reads as documentary, not celebratory promo only.
- [ ] Static checks pass with `npm run lint`.
