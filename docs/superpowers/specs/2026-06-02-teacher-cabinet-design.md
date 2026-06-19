# Teacher Cabinet Redesign

Date: 2026-06-02
Project: ЭХОГОР React/Vite cabinet
Selected direction: Full teacher cabinet in the reference style

## Goal

Redesign the full teacher cabinet so it matches the supplied dark ЭХОГОР reference: premium mountain mood, black glass panels, gold accents, dense operational dashboard, and a strong left-side brand portrait. The redesign must keep the existing teacher photo asset exactly as-is: `src/assets/images/teacher_profile_card.png`.

## Scope

Update the full `TeacherWorkspace` experience, not only the "Сегодня" dashboard.

Included sections:

- Сегодня
- Профиль
- Группы
- Ученики
- Спасибо
- Notebook
- Group detail and student detail states

Out of scope:

- Changing app-wide role routing
- Replacing mock data models
- Adding real backend persistence
- Editing or regenerating the teacher photo

## Visual Direction

The teacher cabinet becomes a desktop-first workspace with three visual zones:

1. Left brand rail: logo, vertical navigation, mountain-style dark background, the unchanged teacher photo, short ЭХОГОР slogan, and compact teacher identity.
2. Main workspace: greeting, metrics, quick actions, and active-tab content.
3. Right assistant rail: AI readiness, best student, nearest competition, and recent announcements.

The visual language uses:

- Near-black backgrounds
- Subtle glass panels with thin borders
- Gold accents for active navigation and calls to action
- Red only for warnings or items requiring attention
- Green only for readiness, progress, and positive state
- Lucide icons for recognizable controls
- Compact card radius, preferably 8-16px depending on local layout density

The UI should feel like a real instructor command center, not a marketing landing page.

## Layout

Desktop layout:

- Use a fixed or sticky left rail around 300-360px wide.
- Place the teacher photo prominently inside the rail, preserving the image file and natural portrait focus.
- Use a central grid for active content.
- Use a right rail around 280-340px wide for contextual widgets.
- Keep the main area scrollable without losing navigation.

Responsive layout:

- On tablet, collapse the right rail below the main content or into a stacked column.
- On mobile, convert the left rail into a top visual banner and use compact navigation.
- Ensure all text fits in cards and buttons without overlap.
- Preserve the teacher photo as a first-screen signal even when compressed.

## Components

`TeacherWorkspace` should provide the shell and shared data derived from props:

- Active tab state
- Selected group state
- Selected student state
- Shared navigation actions
- Shared panel/card styling helpers if useful

Primary components:

- `TeacherBrandRail`: logo, nav items, teacher portrait, slogan, compact teacher profile.
- `TeacherTopGreeting`: greeting, date, subtitle, small calendar action.
- `TeacherMetricGrid`: today's lessons, students, announcements, warnings.
- `TeacherQuickActions`: attendance, schedule, note, announcement, homework check, competition prep.
- `TeacherRightRail`: AI assistant, student of month, competition card, announcements.
- Existing tab views, restyled to match the new shell.

The existing section components can remain inside `TeacherWorkspace.tsx` unless extracting small helpers makes the file easier to reason about. Any extraction should be focused on repeated shell/card elements, not a broad refactor.

## Data Flow

The redesign continues using the existing props:

- `groups`
- `students`
- `competitions`
- `announcements`
- `addAuditLog`
- `teacherName`

Derived display data can be computed locally with `useMemo` where helpful:

- Total students
- Today's lesson count
- Next lesson time
- Announcements requiring attention
- Best student preview
- Nearest competition
- Attendance and activity summaries

Navigation remains local state:

- `activeTab`
- `selectedGroupId`
- `selectedStudentId`

No new external data layer is required.

## Interactions

Navigation:

- Left nav switches tabs and clears detail selections where appropriate.
- Group cards navigate into group detail.
- Student cards navigate into student detail.
- Back buttons return to the relevant list.

Quick actions:

- Actions can be visual buttons for now if the current app has no full workflows behind them.
- Existing actions that already navigate should preserve behavior.
- Buttons should have icons and clear labels.

Right rail:

- AI assistant is presentational unless existing AI workflows are already available.
- Competition card should point users toward the competition section or preparation action if feasible.
- Announcement items should remain scannable and compact.

## Error And Empty States

Handle empty arrays gracefully:

- No groups: show an empty panel inviting the teacher to check schedule or contact admin.
- No students: show an empty panel instead of blank grids.
- No competitions: hide nearest competition details or show "Нет ближайших соревнований".
- No announcements: show "Новых объявлений нет".

Images:

- Teacher portrait uses the existing imported asset.
- Student photos continue using existing `photoUrl` values.
- If a student photo fails, the card should still have a readable name and metadata.

## Testing And Verification

Run static validation:

- `npm run lint`
- `npm run build`

Run visual verification:

- Start the local app with the existing dev command.
- Open the teacher role.
- Check desktop, tablet, and mobile widths.
- Confirm the teacher photo is the existing `teacher_profile_card.png`.
- Confirm no text overlaps in nav, metric cards, right rail, group cards, student cards, and detail views.
- Confirm all existing tabs remain reachable.

## Acceptance Criteria

- The full teacher cabinet visually matches the provided reference style.
- The existing teacher photo remains unchanged and visible.
- All existing teacher sections remain accessible.
- Desktop layout has left portrait rail, central workspace, and right context rail.
- Mobile layout remains usable without horizontal scrolling.
- `npm run lint` and `npm run build` pass.
