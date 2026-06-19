# Animated Bar Chart Video Design

## Goal

Create a standalone Remotion video project that renders an animated bar chart with five bars.

## User-Facing Result

The project will contain one composition named `AnimatedBarChart`. It will render a 6-second, 1920x1080 video-ready chart where five vertical bars grow from the baseline with a short stagger. Labels and values fade in after each bar has mostly grown. The final frame remains fully readable.

## Visual Direction

The chart uses a clean presentation style: light background, subtle grid lines, dark text, and a varied five-color palette. The last/highest bar receives a slightly stronger color treatment so the final view has a clear focal point without becoming noisy.

## Architecture

The Remotion project lives in its own folder, separate from the existing Vite app. Chart data is defined as a typed array in the chart component. Animation is driven only by Remotion frame state through `useCurrentFrame()`, `useVideoConfig()`, `interpolate()`, and `spring()`.

## Components

- `Root.tsx` registers the Remotion composition.
- `AnimatedBarChart.tsx` renders the chart scene and all animation.
- Optional tests verify the chart data shape and scale calculations.

## Constraints

- No CSS transitions or CSS keyframe animations.
- No third-party chart animation runtime.
- The chart must contain exactly five bars.
- The project must be runnable with Remotion Studio and renderable from the CLI.

## Verification

Run TypeScript checks and render a still frame near the end of the composition to confirm that bars, labels, and values are visible.
