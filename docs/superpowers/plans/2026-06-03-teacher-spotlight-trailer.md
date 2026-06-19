# Teacher Spotlight Trailer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 20-second premium Remotion trailer template that presents a teacher like a known stage artist.

**Architecture:** Add a dedicated `teacherSpotlightTrailer` template with its own CRM payload, reusable premium stage primitives, seven timeline scenes, and a registered `TeacherSpotlightTrailer` composition. Keep it separate from the existing generic `TeacherProfile` composition because this template has faster trailer pacing and more dramatic visual treatment.

**Tech Stack:** Remotion 4, React 19, TypeScript, deterministic CSS-in-JS animation.

---

### Task 1: Payload And Defaults

**Files:**
- Create: `animated-bar-chart-video/src/templates/teacherSpotlightTrailer/schema.ts`
- Create: `animated-bar-chart-video/src/templates/teacherSpotlightTrailer/defaultPayload.ts`

- [x] Define `TeacherSpotlightPayload` for teacher photo, experience, achievements, groups, concerts, student thanks, branch, and logo.
- [x] Add default Echo Gor demo data for `Аслан Плиев`.

### Task 2: Premium Trailer Primitives

**Files:**
- Create: `animated-bar-chart-video/src/templates/teacherSpotlightTrailer/components/TeacherSpotlightElements.tsx`

- [x] Build stage backdrop, spotlight beam, teacher portrait, title, counters, group wall, achievement wall, gratitude quote, and logo lockup.
- [x] Keep all animation based on Remotion frame math.

### Task 3: Scenes And Composition

**Files:**
- Create scene files under `animated-bar-chart-video/src/templates/teacherSpotlightTrailer/scenes/`
- Create: `animated-bar-chart-video/src/templates/teacherSpotlightTrailer/TeacherSpotlightTrailerVideo.tsx`

- [x] Implement seven scenes: cold open, hero portrait, legacy stats, groups craft, achievements, gratitude, final lockup.
- [x] Compose a 600-frame / 20-second timeline.

### Task 4: Registration

**Files:**
- Modify: `animated-bar-chart-video/src/templates/templateComponents.tsx`
- Modify: `animated-bar-chart-video/src/Root.tsx`

- [x] Export `TeacherSpotlightTrailer`.
- [x] Register composition at 1080x1920, 30fps, 600 frames.

### Task 5: Verification

**Files:**
- Existing Remotion project.

- [x] Run `npm run lint` in `animated-bar-chart-video`.
- [x] Render still frames for hero and gratitude/final sections.
