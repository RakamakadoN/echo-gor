# Teacher Cabinet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the full teacher cabinet into a premium dark ЭХОГОР workspace matching the approved reference while preserving the existing teacher photo.

**Architecture:** Keep the implementation centered in `src/components/TeacherWorkspace.tsx`, following the current single-file pattern, but introduce focused helper components for the shell, brand rail, right rail, metric cards, and reusable panel styles. Existing tab/detail views remain in place and are restyled to live inside the new three-zone shell.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 classes, lucide-react icons, recharts sparklines, Vite build pipeline.

---

## Files

- Modify: `src/components/TeacherWorkspace.tsx`
  - Replace the current mobile-first bottom-nav shell with a responsive desktop-first shell.
  - Add `TeacherBrandRail`, `TeacherMobileHeader`, `TeacherRightRail`, `TeacherMetricCard`, `TeacherQuickActions`, and shared small UI helpers.
  - Restyle dashboard, profile, groups, students, feedback, notebook, group detail, and student detail content.
  - Keep `teacherProfileCard` import and `teacherPhotoUrl = teacherProfileCard`.
- Optionally modify: `src/index.css`
  - Add only tiny utility rules if needed for stable scrollbar or safe-area behavior.
- Verify: `package.json`
  - Existing commands: `npm run lint`, `npm run build`, `env PORT=5555 npm run dev`.

No files are created for new components unless `TeacherWorkspace.tsx` becomes too difficult to edit safely. If extraction is needed, create `src/components/teacher-workspace/TeacherWorkspaceShell.tsx` for shell-only helpers and keep tab content in the original file.

## Task 1: Build The Responsive Teacher Shell

**Files:**
- Modify: `src/components/TeacherWorkspace.tsx`

- [ ] **Step 1: Update icon imports**

Add shell icons to the existing `lucide-react` import if missing:

```ts
import {
  Users, Calendar, CheckSquare, Trophy, Bell, BookOpen, User,
  MessageSquare, BrainCircuit, PlayCircle, Plus, FileText, ChevronRight,
  Search, Star, AlertCircle, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Home, ClipboardList, Download, Settings, BarChart3, NotebookText,
  CalendarDays, Megaphone, ClipboardCheck, Award, ShieldAlert, Menu
} from 'lucide-react';
```

Remove imported icons that TypeScript reports as unused after implementation.

- [ ] **Step 2: Add tab metadata near `announcementTypes`**

```ts
const teacherNavItems = [
  { id: "today", label: "Сегодня", icon: Home },
  { id: "groups", label: "Мои группы", icon: Users },
  { id: "students", label: "Ученики", icon: User },
  { id: "feedback", label: "Спасибо", icon: Star },
  { id: "profile", label: "Профиль", icon: Award },
  { id: "more", label: "Notebook", icon: NotebookText }
] as const;

type TeacherTab = typeof teacherNavItems[number]["id"];
```

- [ ] **Step 3: Change active tab typing**

Replace:

```ts
const [activeTab, setActiveTab] = useState<'today' | 'profile' | 'groups' | 'students' | 'feedback' | 'more'>('today');
```

With:

```ts
const [activeTab, setActiveTab] = useState<TeacherTab>('today');
```

- [ ] **Step 4: Add derived dashboard data inside `TeacherWorkspace`**

Place after `teacherStudents`:

```ts
const nearestCompetition = useMemo(() => competitions[0] || null, [competitions]);
const featuredStudent = useMemo(() => teacherStudents[0] || null, [teacherStudents]);
const attentionCount = useMemo(() => {
  return teacherStudents.filter((student) => {
    const recent = Object.values(student.attendance || {}).slice(-4);
    return recent.some((item: any) => item.status === "absent") || student.balance < 0;
  }).length;
}, [teacherStudents]);

const resetToTab = (tab: TeacherTab) => {
  setActiveTab(tab);
  setSelectedGroupId(null);
  setSelectedStudentId(null);
};
```

- [ ] **Step 5: Replace the return shell**

Replace the top-level return in `TeacherWorkspace` with this structure, keeping the existing conditional tab rendering inside `TeacherMainContent`:

```tsx
return (
  <div className="relative min-h-screen w-full overflow-hidden bg-[#050708] text-slate-300 font-sans">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_0%,rgba(197,160,89,0.13),transparent_30%),linear-gradient(135deg,#071015_0%,#050708_42%,#0d1116_100%)]" />
    <div className="relative flex min-h-screen flex-col xl:flex-row">
      <TeacherBrandRail
        teacherName={teacherName}
        activeTab={activeTab}
        onSelectTab={resetToTab}
      />

      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 xl:max-h-screen xl:overflow-y-auto xl:px-7 xl:py-7">
        <TeacherMobileHeader
          teacherName={teacherName}
          activeTab={activeTab}
          onSelectTab={resetToTab}
        />
        <TeacherMainContent
          activeTab={activeTab}
          selectedGroupId={selectedGroupId}
          selectedStudentId={selectedStudentId}
          teacherName={teacherName}
          groups={teacherGroups}
          students={teacherStudents}
          competitions={competitions}
          announcements={announcements}
          navigateToGroup={navigateToGroup}
          navigateToStudent={navigateToStudent}
          clearGroup={() => setSelectedGroupId(null)}
          clearStudent={() => setSelectedStudentId(null)}
        />
      </main>

      <TeacherRightRail
        announcements={announcements}
        competitions={competitions}
        nearestCompetition={nearestCompetition}
        featuredStudent={featuredStudent}
        attentionCount={attentionCount}
      />
    </div>
  </div>
);
```

- [ ] **Step 6: Add `TeacherMainContent` helper**

Move the current conditional content into this helper below `teacherPhotoUrl`:

```tsx
function TeacherMainContent({
  activeTab,
  selectedGroupId,
  selectedStudentId,
  teacherName,
  groups,
  students,
  competitions,
  announcements,
  navigateToGroup,
  navigateToStudent,
  clearGroup,
  clearStudent
}: any) {
  return (
    <div className="space-y-5">
      {activeTab === 'today' && !selectedGroupId && !selectedStudentId && (
        <DashboardView
          teacherName={teacherName}
          groups={groups}
          students={students}
          announcements={announcements}
          competitions={competitions}
          onNavigateToGroup={navigateToGroup}
          onNavigateToStudent={navigateToStudent}
        />
      )}

      {activeTab === 'profile' && !selectedGroupId && !selectedStudentId && (
        <TeacherProfileView teacherName={teacherName} groups={groups} students={students} competitions={competitions} />
      )}

      {activeTab === 'groups' && !selectedGroupId && (
        <TeacherGroupsView groups={groups} onNavigateToGroup={navigateToGroup} />
      )}

      {activeTab === 'groups' && selectedGroupId && (
        <GroupDetailsView groupId={selectedGroupId} groups={groups} students={students} onBack={clearGroup} onNavigateToStudent={navigateToStudent} />
      )}

      {activeTab === 'students' && selectedStudentId && (
        <StudentDetailsView studentId={selectedStudentId} students={students} onBack={clearStudent} />
      )}

      {activeTab === 'students' && !selectedStudentId && (
        <TeacherStudentsView students={students} onNavigateToStudent={navigateToStudent} />
      )}

      {activeTab === 'feedback' && (
        <SafeFeedbackView groups={groups} students={students} />
      )}

      {activeTab === 'more' && (
        <AINotebookView announcements={announcements} groups={groups} students={students} competitions={competitions} />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run TypeScript to see expected missing helpers**

Run: `npm run lint`

Expected: FAIL with missing names such as `TeacherBrandRail`, `TeacherMobileHeader`, `TeacherRightRail`, `TeacherGroupsView`, and `TeacherStudentsView`.

## Task 2: Add Brand Rail, Mobile Header, And Right Rail

**Files:**
- Modify: `src/components/TeacherWorkspace.tsx`

- [ ] **Step 1: Add `TeacherBrandRail`**

```tsx
function TeacherBrandRail({ teacherName, activeTab, onSelectTab }: {
  teacherName: string;
  activeTab: TeacherTab;
  onSelectTab: (tab: TeacherTab) => void;
}) {
  return (
    <aside className="relative hidden min-h-screen w-[340px] shrink-0 overflow-hidden border-r border-white/10 bg-[#070b0d] xl:block">
      <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(20,31,38,0.95),rgba(5,7,8,0.98)_48%,rgba(2,3,4,1)),radial-gradient(circle_at_70%_28%,rgba(197,160,89,0.18),transparent_32%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black via-black/50 to-transparent" />

      <div className="relative z-10 flex h-full flex-col px-7 py-7">
        <div className="mb-7">
          <p className="text-4xl font-black tracking-tight text-[#7EA4C6]">ЭХОГОР</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.34em] text-slate-400">Студия кавказского танца</p>
        </div>

        <nav className="space-y-2">
          {teacherNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition-colors ${
                  active ? "bg-[#C5A059]/18 text-[#F1BE55]" : "text-slate-200 hover:bg-white/7 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="relative mt-auto min-h-[520px]">
          <img
            src={teacherPhotoUrl}
            alt={teacherName}
            className="absolute bottom-24 left-1/2 h-[500px] max-w-none -translate-x-1/2 object-contain object-bottom"
          />
          <div className="absolute inset-x-0 bottom-20 h-48 bg-gradient-to-t from-[#050708] via-[#050708]/72 to-transparent" />
          <div className="absolute bottom-24 left-1">
            <p className="text-2xl font-black uppercase leading-tight text-[#D8AC52]">Традиции.</p>
            <p className="text-2xl font-black uppercase leading-tight text-white">Движение.</p>
            <p className="text-2xl font-black uppercase leading-tight text-[#74A7D4]">Характер.</p>
            <p className="mt-7 max-w-[210px] text-[11px] uppercase leading-6 tracking-[0.2em] text-slate-300">
              Мы воспитываем не танцоров, а личностей.
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 rounded-lg border border-white/10 bg-black/45 p-3 backdrop-blur">
            <img src={teacherPhotoUrl} alt={teacherName} className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{teacherName}</p>
              <p className="text-[10px] text-slate-400">Преподаватель</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Add `TeacherMobileHeader`**

```tsx
function TeacherMobileHeader({ teacherName, activeTab, onSelectTab }: {
  teacherName: string;
  activeTab: TeacherTab;
  onSelectTab: (tab: TeacherTab) => void;
}) {
  return (
    <header className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#081014]/90 xl:hidden">
      <div className="flex items-end gap-4 p-4">
        <img src={teacherPhotoUrl} alt={teacherName} className="h-24 w-20 rounded-xl object-cover object-top" />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black tracking-tight text-[#7EA4C6]">ЭХОГОР</p>
          <p className="truncate text-sm font-bold text-white">{teacherName}</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#C5A059]">Кабинет преподавателя</p>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-2">
        {teacherNavItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${
                active ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Add `TeacherRightRail`**

```tsx
function TeacherRightRail({ announcements, nearestCompetition, featuredStudent, attentionCount }: any) {
  return (
    <aside className="hidden w-[320px] shrink-0 border-l border-white/10 px-5 py-7 xl:block xl:max-h-screen xl:overflow-y-auto">
      <div className="space-y-4">
        <TeacherPanel className="border-[#C5A059]/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[#F1BE55]">AI-Ассистент</p>
            <button className="text-[10px] font-bold text-slate-400 hover:text-white">Открыть чат →</button>
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-xs font-bold text-white">Готовность к соревнованию</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-xs text-slate-400">Старший ансамбль</span>
              <span className="text-2xl font-black text-emerald-400">8.2<span className="text-sm text-slate-400">/10</span></span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-emerald-400 to-[#C5A059]" />
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-xs font-bold text-white">Рекомендации на сегодня</p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-300">
              <li>Уделить внимание синхронности в парных элементах</li>
              <li>Проверить выносливость перед финальными прогонами</li>
            </ul>
          </div>
        </TeacherPanel>

        <TeacherPanel>
          <p className="text-sm font-black text-[#F1BE55]">Лучший ученик месяца</p>
          {featuredStudent ? (
            <div className="mt-4 flex items-center gap-3">
              <img src={featuredStudent.photoUrl} alt={featuredStudent.name} className="h-14 w-14 rounded-full object-cover" />
              <div>
                <p className="text-sm font-black text-white">{featuredStudent.name}</p>
                <p className="text-xs text-slate-400">{featuredStudent.artistLevel}</p>
                <p className="mt-2 text-xs text-slate-300">Посещаемость: <span className="text-[#F1BE55]">96%</span></p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Ученики пока не добавлены.</p>
          )}
        </TeacherPanel>

        <TeacherPanel>
          <p className="text-sm font-black text-[#F1BE55]">Ближайшее соревнование</p>
          <div className="mt-4 flex items-start gap-3">
            <Trophy className="mt-1 h-6 w-6 text-[#F1BE55]" />
            <div>
              <p className="text-base font-black text-white">{nearestCompetition?.title || "Нет ближайших соревнований"}</p>
              <p className="mt-1 text-xs text-slate-400">{nearestCompetition?.date || "Дата не назначена"} {nearestCompetition?.location ? `• ${nearestCompetition.location}` : ""}</p>
            </div>
          </div>
          <button className="mt-4 w-full rounded-lg border border-[#C5A059] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#F1BE55] hover:bg-[#C5A059] hover:text-black">
            Подготовка
          </button>
        </TeacherPanel>

        <TeacherPanel>
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[#F1BE55]">Последние объявления</p>
            <span className="text-[10px] text-rose-300">{attentionCount} требуют внимания</span>
          </div>
          <div className="mt-3 space-y-2">
            {(announcements || []).slice(0, 3).map((item: Announcement) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-bold text-white">{item.title}</p>
                <p className="mt-1 text-[10px] text-slate-400">{item.date || "Сегодня"}</p>
              </div>
            ))}
            {(!announcements || announcements.length === 0) && (
              <p className="text-xs text-slate-400">Новых объявлений нет.</p>
            )}
          </div>
        </TeacherPanel>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Add `TeacherPanel`**

```tsx
function TeacherPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/20 backdrop-blur ${className}`}>
      {children}
    </section>
  );
}
```

- [ ] **Step 5: Run TypeScript**

Run: `npm run lint`

Expected: remaining failures are only for `TeacherGroupsView` and `TeacherStudentsView`, plus possible unused imports.

## Task 3: Extract Groups And Students List Views

**Files:**
- Modify: `src/components/TeacherWorkspace.tsx`

- [ ] **Step 1: Add `TeacherGroupsView`**

```tsx
function TeacherGroupsView({ groups, onNavigateToGroup }: any) {
  return (
    <div className="animate-fade-in space-y-5">
      <SectionHeader
        eyebrow="Учебные составы"
        title="Мои группы"
        description="Педагогическая зона ответственности: расписание, состав, посещаемость и быстрый переход в группу."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {groups.map((g: Group, index: number) => {
          const attendance = [92, 88, 85, 79][index] || 82;
          return (
            <button
              key={g.id}
              onClick={() => onNavigateToGroup(g.id)}
              className="group text-left rounded-xl border border-white/10 bg-white/[0.045] p-5 transition-colors hover:border-[#C5A059]/45"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black text-white">{g.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{g.level} • {g.ageGroup}</p>
                </div>
                <span className="rounded-full bg-[#C5A059]/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#F1BE55]">
                  {g.studentCount} уч.
                </span>
              </div>
              <div className="mt-5 grid gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#F1BE55]" /> {g.scheduleText}</div>
                <div className="flex items-center gap-2"><Home className="h-4 w-4 text-[#F1BE55]" /> {g.hallId}</div>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
                  <span>Посещаемость</span>
                  <span>{attendance}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${attendance}%` }} />
                </div>
              </div>
            </button>
          );
        })}
        {groups.length === 0 && <EmptyPanel title="Группы не найдены" text="Проверьте расписание или обратитесь к администратору филиала." />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `TeacherStudentsView`**

```tsx
function TeacherStudentsView({ students, onNavigateToStudent }: any) {
  return (
    <div className="animate-fade-in space-y-5">
      <SectionHeader
        eyebrow="Педагогический список"
        title="Мои ученики"
        description="Прогресс, посещаемость и быстрый переход в историю ученика."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {students.map((stud: Student) => (
          <button
            key={stud.id}
            onClick={() => onNavigateToStudent(stud.id)}
            className="text-left rounded-xl border border-white/10 bg-white/[0.045] p-4 transition-colors hover:border-[#C5A059]/45"
          >
            <div className="flex items-center gap-3">
              <img src={stud.photoUrl} alt={stud.name} className="h-14 w-14 rounded-xl border border-[#C5A059]/25 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{stud.name}</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#F1BE55]">{stud.artistLevel}</p>
                <AttendanceSparkline attendance={stud.attendance} />
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
              {stud.notes.find((note) => !note.isPrivate)?.content || "Нет открытых заметок по ученику."}
            </p>
          </button>
        ))}
        {students.length === 0 && <EmptyPanel title="Ученики не найдены" text="Когда ученики появятся в группах, они будут видны здесь." />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add shared `SectionHeader` and `EmptyPanel`**

```tsx
function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#F1BE55]">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-xs text-slate-400">{text}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run TypeScript**

Run: `npm run lint`

Expected: missing-helper errors are gone. Fix any unused imports reported by TypeScript.

## Task 4: Restyle Dashboard Into Reference-Like Command Center

**Files:**
- Modify: `src/components/TeacherWorkspace.tsx`

- [ ] **Step 1: Change `DashboardView` signature**

```tsx
function DashboardView({ teacherName, groups, students, announcements, competitions, onNavigateToGroup, onNavigateToStudent }: any) {
```

- [ ] **Step 2: Replace the top dashboard greeting and metrics**

Inside `DashboardView`, replace the current hello card and metric grid with:

```tsx
<div className="rounded-xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
        Доброе утро, <span className="text-[#F1BE55]">{teacherName.split(" ")[0]}!</span>
      </h2>
      <p className="mt-2 text-sm text-slate-400">Вы уверенно ведёте своих учеников к вершинам мастерства.</p>
    </div>
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
      <span>2 июня 2026, вторник</span>
      <CalendarDays className="h-4 w-4 text-[#F1BE55]" />
    </div>
  </div>
</div>

<div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
  <TeacherMetricCard icon={<Calendar className="h-6 w-6" />} label="Занятия сегодня" value="4" footer="Следующее: 16:30" />
  <TeacherMetricCard icon={<Users className="h-6 w-6" />} label="Всего учеников" value={students.length} footer={`В ${groups.length} группах`} />
  <TeacherMetricCard icon={<Bell className="h-6 w-6" />} label="Новые объявления" value={(announcements || []).length || 0} footer="Требуют внимания" />
  <TeacherMetricCard icon={<ShieldAlert className="h-6 w-6" />} label="Контроль" value="2" footer="Требуют контроля" danger />
</div>
```

- [ ] **Step 3: Add `TeacherMetricCard`**

```tsx
function TeacherMetricCard({ icon, label, value, footer, danger = false }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  footer: string;
  danger?: boolean;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-start justify-between">
        <div className={danger ? "text-rose-400" : "text-[#F1BE55]"}>{icon}</div>
        <ChevronRight className="h-4 w-4 text-[#F1BE55]" />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-light text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{footer}</p>
    </section>
  );
}
```

- [ ] **Step 4: Restyle quick actions**

Update `QuickAction` button classes:

```tsx
<button className={`flex min-h-[106px] flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${colorClasses[color]}`}>
```

Change `colorClasses` amber/gold dominant:

```ts
const colorClasses: Record<string, string> = {
  emerald: 'bg-white/[0.045] text-emerald-400 border-white/10 hover:border-emerald-400/40',
  blue: 'bg-white/[0.045] text-[#F1BE55] border-white/10 hover:border-[#F1BE55]/45',
  amber: 'bg-white/[0.045] text-[#F1BE55] border-white/10 hover:border-[#F1BE55]/45',
  purple: 'bg-white/[0.045] text-[#F1BE55] border-white/10 hover:border-[#F1BE55]/45',
  indigo: 'bg-white/[0.045] text-[#F1BE55] border-white/10 hover:border-[#F1BE55]/45',
  rose: 'bg-white/[0.045] text-rose-400 border-white/10 hover:border-rose-400/40',
};
```

- [ ] **Step 5: Normalize dashboard panel radii**

Replace dashboard-only `rounded-[2rem]` and `rounded-3xl` with `rounded-xl` or `rounded-2xl` where cards are compact. Keep no nested card-inside-card visual clutter beyond operational panels.

- [ ] **Step 6: Run TypeScript**

Run: `npm run lint`

Expected: PASS or only unused import errors. Remove unused imports until PASS.

## Task 5: Align Existing Detail Views With The New Style

**Files:**
- Modify: `src/components/TeacherWorkspace.tsx`

- [ ] **Step 1: Restyle `TeacherProfileView`**

Replace the hero section outer class:

```tsx
<section className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] p-5 md:p-7">
```

Remove any decorative blurred orb:

```tsx
{/* remove: absolute rounded-full blur-3xl decorative div */}
```

Use compact profile image:

```tsx
<div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-[#C5A059]/60 bg-black shadow-2xl shadow-black/40">
```

- [ ] **Step 2: Restyle `SafeFeedbackView` and `AINotebookView` sections**

For their top sections, replace `rounded-[2rem]` with `rounded-xl`, keep dark backgrounds, and avoid purple-heavy styling in Notebook by using gold/black accents:

```tsx
<section className="rounded-xl border border-white/10 bg-white/[0.045] p-5 md:p-7">
```

For AI Notebook icon container:

```tsx
<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#C5A059]/15 text-[#F1BE55]">
```

- [ ] **Step 3: Restyle `GroupDetailsView`**

Change main panel:

```tsx
<div className="rounded-xl border border-white/10 bg-white/[0.045] p-6 shadow-xl">
```

Change student rows:

```tsx
<div key={stud.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3 transition-all hover:border-[#C5A059]/35">
```

Add an empty state after the map:

```tsx
{groupStudents.length === 0 && (
  <EmptyPanel title="В группе пока нет учеников" text="Состав появится здесь после назначения учеников администратором." />
)}
```

- [ ] **Step 4: Restyle `StudentDetailsView`**

Change the student hero:

```tsx
<div className="relative flex flex-col gap-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl md:flex-row">
```

Replace random chart bars with deterministic heights to avoid changing UI on every render:

```tsx
{[72, 84, 65, 90, 88, 78, 54, 92, 86, 70, 95, 82, 76, 89].map((height, i) => (
  <div key={i} className={`${height > 60 ? 'bg-emerald-500/40' : 'bg-rose-500/40'} flex-1 rounded-t-sm`} style={{ height: `${height}%` }} />
))}
```

- [ ] **Step 5: Run TypeScript**

Run: `npm run lint`

Expected: PASS.

## Task 6: Responsive And Visual Verification

**Files:**
- Modify: `src/components/TeacherWorkspace.tsx`
- Optionally modify: `src/index.css`

- [ ] **Step 1: Build the app**

Run: `npm run build`

Expected: PASS, with Vite output and server bundle generated in `dist`.

- [ ] **Step 2: Start dev server**

Run: `env PORT=5555 npm run dev`

Expected: server starts and prints a local URL on port 5555.

- [ ] **Step 3: Open the app in the in-app browser**

Use Browser plugin or navigate manually to:

```text
http://localhost:5555
```

Expected: the app loads.

- [ ] **Step 4: Switch to teacher role**

Use the role selector in the app to open `Преподаватель`.

Expected:

- Left rail is visible on desktop.
- Teacher photo is visible and matches `teacher_profile_card.png`.
- Main dashboard shows greeting, metric cards, quick actions, schedule/content.
- Right rail shows AI assistant, best student, competition, announcements.

- [ ] **Step 5: Check all teacher tabs**

Click:

- Сегодня
- Мои группы
- Ученики
- Спасибо
- Профиль
- Notebook

Expected: every section opens, uses the same dark/gold visual language, and has no horizontal overflow.

- [ ] **Step 6: Check detail navigation**

Click a group card, then click back. Click a student card, then click back.

Expected: detail views still open and return correctly.

- [ ] **Step 7: Check responsive widths**

Inspect at approximate widths:

- Desktop: 1440px
- Tablet: 900px
- Mobile: 390px

Expected:

- Desktop has three zones.
- Tablet/mobile remove the desktop side rails and show the mobile header/navigation.
- Teacher photo remains visible.
- Text does not overlap buttons, cards, nav, metrics, or right rail content.

- [ ] **Step 8: Stop dev server**

If a long-running session was started, stop it with Ctrl-C or `kill <pid>`.

Expected: no required dev server remains running after verification.

## Task 7: Final Cleanup

**Files:**
- Modify: `src/components/TeacherWorkspace.tsx`
- Optionally modify: `src/index.css`

- [ ] **Step 1: Remove obsolete `NavItem`**

Delete the old bottom navigation helper if no references remain:

```tsx
function NavItem(...) { ... }
```

Run: `rg -n "NavItem" src/components/TeacherWorkspace.tsx`

Expected: no output.

- [ ] **Step 2: Scan for excessive one-hue palette**

Run:

```bash
rg -n "purple|indigo|violet|rounded-\\[2rem\\]|blur-3xl|Math\\.random" src/components/TeacherWorkspace.tsx
```

Expected:

- No `Math.random`.
- No decorative `blur-3xl` or oversized orb decoration.
- Purple/indigo remains only where semantically needed for AI, not as the dominant palette.
- `rounded-[2rem]` is removed or rare and intentional.

- [ ] **Step 3: Final validation**

Run:

```bash
npm run lint
npm run build
```

Expected: both PASS.

- [ ] **Step 4: Git note**

This workspace is not a git repository. Do not run commit commands unless `git rev-parse --is-inside-work-tree` returns `true`.

If it later becomes a git repository, commit with:

```bash
git add src/components/TeacherWorkspace.tsx src/index.css docs/superpowers/specs/2026-06-02-teacher-cabinet-design.md docs/superpowers/plans/2026-06-02-teacher-cabinet-redesign.md
git commit -m "feat: redesign teacher cabinet"
```

## Self-Review

- Spec coverage: The plan covers the full teacher cabinet, keeps the existing teacher photo, provides desktop three-zone layout, mobile fallback, all existing sections, empty states, and lint/build/visual verification.
- Placeholder scan: The plan contains no unresolved placeholder steps.
- Type consistency: `TeacherTab`, `teacherNavItems`, shell props, and helper names are defined before use.
