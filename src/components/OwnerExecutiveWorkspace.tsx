import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgePercent,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CheckCircle,
  ClipboardList,
  Coins,
  Crown,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  LineChart,
  MapPin,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Ticket,
  Megaphone,
  Phone,
  Receipt,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  Wallet,
  Landmark,
  CreditCard,
  CalendarClock,
  ChevronLeft,
  Clock,
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { Announcement, AnnouncementAudience, Branch, Competition, ExecutiveSummary, Group, Payment, Student, SubscriptionPlan, Teacher } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart as RLineChart, Line, Legend, AreaChart, Area
} from "recharts";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import StudentsRegistry from "./StudentsRegistry";
import { computeOwnerDashboard, type DashFilters, type PeriodKey, type LevelKey, type DashExtras, type Delta } from "../ownerDashboardAnalytics";

type StudentInput = { name?: string; branchId?: string; groupId?: string; teacherId?: string; parentName?: string; parentPhone?: string; status?: string; manualStatus?: string | null };
type TrashStudent = { id: string; name: string; branchId: string; parentName: string; parentPhone: string; requestedBy: string; requestedAt: string; reason: string };
type TeacherInput = { name?: string; phone?: string; specialization?: string; branchId?: string | null; role?: string };
type CompetitionInput = {
  title?: string;
  date?: string;
  location?: string;
  level?: "regional" | "republican";
  scope?: "kazakhstan" | "cis";
  status?: "registering" | "rehearsals" | "completed";
  prizePool?: string;
  responsibleTeacherId?: string;
  participantStudentIds?: string[];
};

interface OwnerExecutiveWorkspaceProps {
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  payments: Payment[];
  announcements: Announcement[];
  competitions: Competition[];
  metrics: ExecutiveSummary;
  onCreateBranch?: (data: { name: string; city: string; address?: string; phone?: string }) => Promise<boolean>;
  onUpdateBranch?: (id: string, data: { name?: string; city?: string; address?: string; phone?: string }) => Promise<boolean>;
  onDeleteBranch?: (id: string) => Promise<boolean>;
  onCreateStudent?: (data: StudentInput) => Promise<boolean>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  subscriptionPlans?: SubscriptionPlan[];
  studentTrash?: TrashStudent[];
  onRestoreStudent?: (id: string) => Promise<boolean>;
  onConfirmDeleteStudent?: (id: string) => Promise<boolean>;
  onCreateTeacher?: (data: TeacherInput) => Promise<boolean>;
  onUpdateTeacher?: (id: string, data: TeacherInput) => Promise<boolean>;
  onDeleteTeacher?: (id: string) => Promise<boolean>;
  onCreateAnnouncement?: (data: { title: string; content: string; audience: AnnouncementAudience; isImportant: boolean }) => void;
  onUpdateAnnouncement?: (id: string, data: { title?: string; content?: string; audience?: AnnouncementAudience; isImportant?: boolean }) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onCreateCompetition?: (data: CompetitionInput) => Promise<boolean>;
  onUpdateCompetition?: (id: string, data: CompetitionInput) => Promise<boolean>;
  onDeleteCompetition?: (id: string) => Promise<boolean>;
  aiResult?: {
    executiveSummary: string;
    branchRisks: Array<{ branchId: string; riskTitle: string; description: string; severity: "high" | "medium" | "low" }>;
    growthRecommendations: string[];
    insights: string[];
  } | null;
  aiGenerating?: boolean;
  onTriggerAiReport?: () => void;
  halls?: any[];
  scheduleItems?: any[];
  scheduleLoading?: boolean;
  onLoadSchedule?: (filters?: { branchId?: string; groupId?: string; from?: string; to?: string }) => void;
  onCreateGroup?: (data: any) => Promise<boolean>;
  onUpdateGroup?: (id: string, data: any) => Promise<boolean>;
  onDeleteGroup?: (id: string) => Promise<boolean>;
  onCreateLesson?: (data: any) => Promise<boolean>;
  onUpdateLesson?: (id: string, data: any) => Promise<boolean>;
  onDeleteLesson?: (id: string) => Promise<boolean>;
}

type OwnerTab = "dashboard" | "eduerp" | "branches" | "students" | "teachers" | "schedule" | "finance" | "events" | "feed" | "announcements" | "analytics" | "ai" | "settings";

const ownerTabs: { id: OwnerTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", short: "Главная", icon: Activity },
  { id: "eduerp", label: "EduERP OS", short: "EduERP", icon: ClipboardList },
  { id: "branches", label: "Филиалы", short: "Филиалы", icon: Building2 },
  { id: "students", label: "Ученики", short: "Ученики", icon: Users },
  { id: "teachers", label: "Преподаватели", short: "Педагоги", icon: GraduationCap },
  { id: "schedule", label: "Расписание", short: "Расписание", icon: CalendarDays },
  { id: "finance", label: "Бухгалтерия", short: "Учёт", icon: Coins },
  { id: "events", label: "Концерты", short: "Сцена", icon: Trophy },
  { id: "feed", label: "Афиша СНГ", short: "Афиша", icon: CalendarDays },
  { id: "announcements", label: "Объявления", short: "Связь", icon: Megaphone },
  { id: "analytics", label: "Аналитика", short: "BI", icon: BarChart3 },
  { id: "ai", label: "AI Assistant", short: "AI", icon: Sparkles },
  { id: "settings", label: "Настройки сети", short: "Еще", icon: Settings }
];

export function OwnerExecutiveWorkspace({
  branches,
  groups,
  students,
  teachers,
  payments,
  announcements,
  competitions,
  metrics,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onOpenPayment,
  onSellSubscription,
  subscriptionPlans = [],
  studentTrash = [],
  onRestoreStudent,
  onConfirmDeleteStudent,
  onCreateTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onCreateCompetition,
  onUpdateCompetition,
  onDeleteCompetition,
  aiResult,
  aiGenerating,
  onTriggerAiReport,
  halls = [],
  scheduleItems = [],
  scheduleLoading = false,
  onLoadSchedule,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
}: OwnerExecutiveWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<OwnerTab>("dashboard");
  const debt = Math.abs(students.filter((student) => student.balance < 0).reduce((sum, student) => sum + student.balance, 0));
  const renewals = students.filter((student) => student.subscriptions.some((sub) => sub.lessonsLeft <= 2 || sub.status !== "active")).length;
  const monthRevenue = metrics.thisMonthRevenue;
  const todayRevenue = metrics.todayRevenue;
  const activeStudents = metrics.activeStudentsTotal;
  const newStudentsMonth = metrics.newRegistrationsToday;
  const eventsCount = competitions.length;

  const branchScorecards = useMemo(() => {
    return metrics.branchMetrics.map((branchMetric, index) => {
      const branch = branches.find((item) => item.id === branchMetric.branchId);
      const teachersCount = Math.max(1, groups.filter((group) => group.branchId === branchMetric.branchId).map((group) => group.teacherId).filter((id, pos, arr) => arr.indexOf(id) === pos).length);
      const status = branchMetric.attendanceRate < 70 ? "critical" : branchMetric.attendanceRate < 82 ? "warning" : "healthy";
      return {
        ...branchMetric,
        city: branch?.city || "Филиал",
        managerName: branch?.managerName || "Руководитель филиала",
        teachersCount,
        newLeads: 0,
        retention: Math.max(0, Math.round(100 - metrics.churnRate)),
        status
      };
    });
  }, [branches, groups, metrics.branchMetrics]);

  return (
    <div className="min-h-full bg-[#080808] text-slate-200">
      <div className="mx-auto flex max-w-[1560px] gap-0 lg:gap-5">
        <aside className="sticky top-0 hidden h-[calc(100vh-64px)] w-76 shrink-0 border-r border-white/5 bg-[#0F0F0F] p-4 lg:block">
          <div className="rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#2A2110] to-[#111] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C5A059] text-black">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Владелец сети</p>
                <h2 className="text-lg font-black text-white">CEO Command</h2>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">Вся сеть, финансы, филиалы, люди, риски и точки роста в одном executive-центре.</p>
          </div>
          <nav className="mt-5 space-y-1">
            {ownerTabs.map((tab) => (
              <OwnerNavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
            ))}
          </nav>
          <div className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Полный доступ</p>
            <p className="mt-2 text-sm font-bold text-white">Network Owner RBAC</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Видит все филиалы, финансы, роли, настройки, audit log и AI-аналитику сети.</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pt-6 lg:pb-8">
          <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/5 bg-[#080808]/90 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C5A059] text-black"><Crown className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Владелец сети</p>
                <h1 className="text-base font-black text-white">CEO Command Center</h1>
              </div>
            </div>
          </div>

          {activeTab === "dashboard" && (
            <OwnerDashboard
              rawBranches={branches}
              rawStudents={students}
              rawGroups={groups}
              rawTeachers={teachers}
              rawPayments={payments}
              branchScorecards={branchScorecards}
              onNavigate={(tab: OwnerTab) => setActiveTab(tab)}
              onTriggerAiReport={onTriggerAiReport}
              aiResult={aiResult}
              aiGenerating={aiGenerating}
            />
          )}
          {activeTab === "eduerp" && <OwnerEduErpView branches={branches} groups={groups} students={students} teachers={teachers} payments={payments} monthRevenue={monthRevenue} todayRevenue={todayRevenue} debt={debt} renewals={renewals} />}
          {activeTab === "branches" && <BranchesView branches={branchScorecards} rawBranches={branches} students={students} groups={groups} teachers={teachers} halls={halls} onCreateBranch={onCreateBranch} onUpdateBranch={onUpdateBranch} onDeleteBranch={onDeleteBranch} onCreateGroup={onCreateGroup} onUpdateGroup={onUpdateGroup} onDeleteGroup={onDeleteGroup} />}
          {activeTab === "students" && <StudentsNetworkView students={students} branches={branches} groups={groups} teachers={teachers} onCreateStudent={onCreateStudent} onUpdateStudent={onUpdateStudent} onDeleteStudent={onDeleteStudent} onOpenPayment={onOpenPayment} onSellSubscription={onSellSubscription} subscriptionPlans={subscriptionPlans} studentTrash={studentTrash} onRestoreStudent={onRestoreStudent} onConfirmDeleteStudent={onConfirmDeleteStudent} />}
          {activeTab === "teachers" && <TeachersNetworkView teachers={teachers} metrics={metrics} branches={branches} onCreateTeacher={onCreateTeacher} onUpdateTeacher={onUpdateTeacher} onDeleteTeacher={onDeleteTeacher} />}
          {activeTab === "finance" && <BookkeepingView branches={branchScorecards} payments={payments} monthRevenue={monthRevenue} todayRevenue={todayRevenue} debt={debt} renewals={renewals} />}
          {activeTab === "schedule" && (
            <OwnerScheduleView
              branches={branches}
              groups={groups}
              teachers={teachers}
              halls={halls}
              scheduleItems={scheduleItems}
              scheduleLoading={scheduleLoading}
              onLoadSchedule={onLoadSchedule}
              onCreateGroup={onCreateGroup}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
              onCreateLesson={onCreateLesson}
              onUpdateLesson={onUpdateLesson}
              onDeleteLesson={onDeleteLesson}
            />
          )}
          {activeTab === "events" && <EventsView competitions={competitions} branches={branches} students={students} teachers={teachers} onCreateCompetition={onCreateCompetition} onUpdateCompetition={onUpdateCompetition} onDeleteCompetition={onDeleteCompetition} />}
          {activeTab === "feed" && <DanceEventsFeedView />}
          {activeTab === "announcements" && <OwnerAnnouncementsView announcements={announcements} branches={branches} onCreateAnnouncement={onCreateAnnouncement} onUpdateAnnouncement={onUpdateAnnouncement} onDeleteAnnouncement={onDeleteAnnouncement} />}
          {activeTab === "analytics" && <ExecutiveAnalyticsView branches={branchScorecards} groups={groups} teachers={teachers} students={students} payments={payments} metrics={metrics} />}
          {activeTab === "ai" && <OwnerAiView branches={branchScorecards} renewals={renewals} debt={debt} aiResult={aiResult} aiGenerating={aiGenerating} onTriggerAiReport={onTriggerAiReport} />}
          {activeTab === "settings" && <NetworkSettingsView branches={branches} teachers={teachers} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#080808]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {ownerTabs.slice(0, 5).map((tab) => (
          <OwnerMobileNav key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </nav>
    </div>
  );
}

function OwnerDashboard({ rawBranches, rawStudents, rawGroups, rawTeachers, rawPayments, branchScorecards, onNavigate, onTriggerAiReport, aiResult, aiGenerating }: any) {
  const go = (tab: string) => onNavigate?.(tab);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [level, setLevel] = useState<LevelKey>("network");
  const [branchId, setBranchId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [extras, setExtras] = useState<DashExtras>({});

  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/owner/extras", { headers: { "x-demo-role": "owner" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setExtras(d); })
      .catch(() => {});
    // Зафиксировать снапшот текущего месяца — накопление истории для YoY.
    fetch("/api/mvp/owner/snapshot", { method: "POST", headers: { "x-demo-role": "owner" } }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const filters: DashFilters = { period, level, branchId, groupId, teacherId, customStart, customEnd };
  const m = useMemo(
    () => computeOwnerDashboard(
      { students: rawStudents || [], payments: rawPayments || [], groups: rawGroups || [], branches: rawBranches || [], teachers: rawTeachers || [] },
      filters, new Date(), extras
    ),
    [rawStudents, rawPayments, rawGroups, rawBranches, rawTeachers, period, level, branchId, groupId, teacherId, customStart, customEnd, extras]
  );

  const periods: { id: PeriodKey; label: string }[] = [
    { id: "today", label: "Сегодня" }, { id: "yesterday", label: "Вчера" }, { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" }, { id: "quarter", label: "Квартал" }, { id: "year", label: "Год" }, { id: "custom", label: "Период" }
  ];
  const levels: { id: LevelKey; label: string }[] = [
    { id: "network", label: "Вся сеть" }, { id: "branch", label: "Филиал" }, { id: "group", label: "Группа" }, { id: "teacher", label: "Педагог" }
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <div className="space-y-5">
      {/* 1. ФИЛЬТРЫ */}
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">{greeting}, владелец</p>
            <h1 className="mt-1.5 text-2xl font-black text-white md:text-3xl">Главный экран сети</h1>
            <p className="mt-1 text-sm text-slate-400">{m.scope.label} · {m.ranges.cur.label} · {m.scope.students} учеников</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {periods.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${period === p.id ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#C5A059]/40"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {levels.map((l) => (
                <button key={l.id} onClick={() => { setLevel(l.id); }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${level === l.id ? "bg-white/15 text-white ring-1 ring-[#C5A059]/40" : "border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"}`}>
                  {l.label}
                </button>
              ))}
              {level === "branch" && (
                <FilterSelect value={branchId} onChange={setBranchId} placeholder="Выбрать филиал"
                  options={(rawBranches || []).map((b: Branch) => ({ value: b.id, label: b.name || b.city }))} />
              )}
              {level === "group" && (
                <FilterSelect value={groupId} onChange={setGroupId} placeholder="Выбрать группу"
                  options={(rawGroups || []).map((g: Group) => ({ value: g.id, label: g.name }))} />
              )}
              {level === "teacher" && (
                <FilterSelect value={teacherId} onChange={setTeacherId} placeholder="Выбрать педагога"
                  options={(rawTeachers || []).map((t: Teacher) => ({ value: t.id, label: t.name }))} />
              )}
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200" />
                <span className="text-slate-500">—</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. ОСНОВНЫЕ ПОКАЗАТЕЛИ */}
      <SectionTitle icon={BarChart3} title="Основные показатели" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BigKpi label="Выручка" value={money(m.revenue.total)} onClick={() => go("finance")}
          rows={[
            { k: "К пред. периоду", v: <DeltaBadge pct={m.revenue.momPct} /> },
            { k: "Год к году", v: <DeltaBadge pct={m.revenue.yoyPct} /> },
            { k: "Сегодня / вчера", v: <span className="text-slate-200">{money(m.revenue.today)} / {money(m.revenue.yesterday)}</span> },
            { k: "Новые / пост. / верн.", v: <span className="text-slate-200 text-[11px]">{money(m.revenue.new)} · {money(m.revenue.regular)} · {money(m.revenue.returning)}</span> }
          ]} />
        <BigKpi label="Активные абонементы" value={m.activeSubs.count} onClick={() => go("students")}
          rows={[
            { k: "К пред. месяцу", v: <DeltaBadge pct={m.activeSubs.momPct} /> },
            { k: "Год к году", v: <DeltaBadge pct={m.activeSubs.yoyPct} /> }
          ]} />
        <BigKpi label="Заполняемость" value={m.occupancy.pct === null ? "—" : `${m.occupancy.pct}%`} onClick={() => go("schedule")}
          rows={[
            { k: "Мест занято", v: <span className="text-slate-200">{m.occupancy.filled} / {m.occupancy.capacity || "—"}</span> },
            ...(m.occupancy.byBranch.slice(0, 2).map((b) => ({ k: b.name, v: <span className="text-slate-300">{b.pct === null ? "—" : b.pct + "%"}</span> })))
          ]} />
        <BigKpi label="Удержание (мес→мес)" value={m.retention.pct === null ? "—" : `${m.retention.pct}%`} onClick={() => go("analytics")}
          rows={[
            { k: "Активны / всего", v: <span className="text-slate-200">{m.retention.activeStudents} / {m.retention.totalStudents}</span> },
            { k: "К пред. месяцу", v: <DeltaBadge pct={m.retention.momPct} /> },
            { k: "Год к году", v: <DeltaBadge pct={m.retention.yoyPct} /> }
          ]} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BigKpi label="Средний чек" value={m.avgCheck.all === null ? "—" : money(m.avgCheck.all)} onClick={() => go("finance")}
          rows={[
            { k: "Новые", v: <span className="text-slate-200">{m.avgCheck.new === null ? "—" : money(m.avgCheck.new)}</span> },
            { k: "Постоянные", v: <span className="text-slate-200">{m.avgCheck.regular === null ? "—" : money(m.avgCheck.regular)}</span> },
            { k: "Вернувшиеся", v: <span className="text-slate-200">{m.avgCheck.returning === null ? "—" : money(m.avgCheck.returning)}</span> },
            { k: "К пред. периоду", v: <DeltaBadge pct={m.avgCheck.momPct} /> }
          ]} />
        <BigKpi label="Должники" value={m.debtors.total} tone={m.debtors.total > 0 ? "rose" : "emerald"} onClick={() => go("finance")}
          rows={m.debtors.aging
            ? [
                { k: "1–7 дней", v: <span className="text-slate-200">{m.debtors.aging.d1_7}</span> },
                { k: "8–14 дней", v: <span className="text-slate-200">{m.debtors.aging.d8_14}</span> },
                { k: "> 14 дней", v: <span className="text-slate-200">{m.debtors.aging.d14plus}</span> }
              ]
            : [
                { k: "Сумма долга", v: <span className="text-slate-200">{m.debtors.debtAmount ? money(m.debtors.debtAmount) : "—"}</span> },
                { k: "Разбивка по дням", v: <span className="text-slate-500 text-[11px]">накапливается</span> }
              ]} />
        <BigKpi label="Записи на будущее" value={m.futureEnrollments.total} onClick={() => go("students")}
          rows={[
            ...(m.futureEnrollments.byBranch.slice(0, 2).map((b) => ({ k: b.name, v: <span className="text-slate-200">{b.n}</span> }))),
            { k: m.futureEnrollments.isProxy ? "Лиды + пробные (прокси)" : "По возрастам", v: <span className="text-slate-500 text-[11px]">{m.futureEnrollments.byAge.map((a) => `${a.label}:${a.n}`).join(" ") || "—"}</span> }
          ]} />
        <BigKpi label="Новые ученики" value={m.newStudents.hasData ? m.newStudents.period : "—"} tone="gold" onClick={() => go("students")}
          rows={[
            { k: "Сегодня", v: <span className="text-slate-200">{m.newStudents.hasData ? m.newStudents.today : "—"}</span> },
            { k: "За период", v: <span className="text-slate-200">{m.newStudents.hasData ? m.newStudents.period : "нет данных"}</span> }
          ]} />
      </div>

      {/* 3. РИСКИ */}
      <SectionTitle icon={AlertTriangle} title="Риски" hint="Что требует решения прямо сейчас" />
      {m.risks.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {m.risks.map((r) => <RiskTile key={r.id} severity={r.severity} title={r.title} detail={r.detail} onClick={() => go("branches")} />)}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle className="h-6 w-6 text-emerald-400" />
          <p className="text-sm font-bold text-emerald-200">Острых рисков нет — показатели в норме.</p>
        </div>
      )}
      {/* 4. ВОРОНКА ПРОДАЖ */}
      <SectionTitle icon={Filter} title="Воронка продаж" />
      <div className="grid gap-4 xl:grid-cols-3">
        <FunnelDayCard title="Сегодня" data={m.funnel.today} />
        <FunnelDayCard title="Вчера" data={m.funnel.yesterday} />
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">За текущий месяц</p>
          <div className="mt-3 space-y-2.5">
            <FunnelStage label="Лиды" n={m.funnel.month.leads} conv={null} />
            <FunnelStage label="Записались" n={m.funnel.month.signed} conv={m.funnel.month.convSigned} />
            <FunnelStage label="Пришли" n={m.funnel.month.came} conv={m.funnel.month.convCame} />
            <FunnelStage label="Купили" n={m.funnel.month.bought} conv={m.funnel.month.convBought} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Этапы оцениваются по статусам учеников; точная дневная воронка накапливается из событий.</p>
        </section>
      </div>

      {/* 5. ГРАФИКИ */}
      <SectionTitle icon={LineChart} title="Графики" />
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Выручка по месяцам" subtitle="текущий и прошлый год">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.charts.revenueByMonth} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}к`} width={36} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [money(Number(v)), n === "cur" ? "Тек. год" : "Прош. год"]} />
              <Legend formatter={(v) => (v === "cur" ? "Тек. год" : "Прош. год")} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cur" fill="#C5A059" radius={[6, 6, 0, 0]} maxBarSize={22} />
              <Bar dataKey="prev" fill="#3f3f46" radius={[6, 6, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Средний чек по месяцам" subtitle="текущий и прошлый год">
          <ResponsiveContainer width="100%" height="100%">
            <RLineChart data={m.charts.avgCheckByMonth} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}к`} width={36} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [money(Number(v)), n === "cur" ? "Тек. год" : "Прош. год"]} />
              <Line type="monotone" dataKey="cur" stroke="#C5A059" strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="prev" stroke="#52525b" strokeWidth={2} dot={false} connectNulls />
            </RLineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Активные абонементы по месяцам" subtitle="накапливается из снапшотов" empty={m.charts.subsByMonth.every((p) => p.value === null)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={m.charts.subsByMonth} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, "Абонементы"]} />
              <Area type="monotone" dataKey="value" stroke="#C5A059" fill="#C5A059" fillOpacity={0.15} strokeWidth={2.5} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Удержание по дням" subtitle="за последние 30 дней (по посещаемости)" empty={!m.charts.retentionByDay}>
          <ResponsiveContainer width="100%" height="100%">
            <RLineChart data={m.charts.retentionByDay || []} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} width={30} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, "Посещаемость"]} />
              <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} dot={false} connectNulls />
            </RLineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 6. AI EXECUTIVE BRIEF */}
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#C5A059] p-3 text-black"><Sparkles className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">AI Executive Brief · Итоги за 30 секунд</p>
            <ul className="mt-3 space-y-1.5">
              {m.brief.map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-100"><span className="text-[#C5A059]">•</span><span>{t}</span></li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* 7 + 8. ТРЕБУЮТ ВНИМАНИЯ + ТОЧКИ РОСТА */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ListPanel icon={AlertTriangle} tone="rose" title="Требуют внимания" items={m.attention} />
        <ListPanel icon={TrendingUp} tone="emerald" title="Точки роста" items={m.growth} />
      </div>

      {/* 10. РЕЙТИНГИ */}
      <SectionTitle icon={Trophy} title="Рейтинги" hint="Топ-5" />
      <div className="grid gap-4 xl:grid-cols-3">
        <RatingTabs title="Филиалы" onClick={() => go("branches")} tabs={[
          { label: "Выручка", rows: m.ratings.branches.byRevenue.map((b) => ({ name: b.name, main: money(b.revenue), sub: `удерж. ${b.retention ?? "—"}% · чек ${b.avgCheck ? money(b.avgCheck) : "—"}`, delta: b.growthPct })) },
          { label: "Удержание", rows: m.ratings.branches.byRetention.map((b) => ({ name: b.name, main: b.retention === null ? "—" : `${b.retention}%`, sub: `выручка ${money(b.revenue)}`, delta: null })) },
          { label: "Чек", rows: m.ratings.branches.byAvgCheck.map((b) => ({ name: b.name, main: b.avgCheck ? money(b.avgCheck) : "—", sub: `выручка ${money(b.revenue)}`, delta: null })) },
          { label: "Рост", rows: m.ratings.branches.byGrowth.map((b) => ({ name: b.name, main: b.growthPct === null ? "—" : `${b.growthPct}%`, sub: `выручка ${money(b.revenue)}`, delta: b.growthPct })) }
        ]} />
        <RatingTabs title="Педагоги" onClick={() => go("teachers")} tabs={[
          { label: "Ученики", rows: m.ratings.teachers.byStudents.map((t) => ({ name: t.name, main: `${t.students} уч.`, sub: `удерж. ${t.retention ?? "—"}% · ${money(t.revenue)}`, delta: null })) },
          { label: "Удержание", rows: m.ratings.teachers.byRetention.map((t) => ({ name: t.name, main: t.retention === null ? "—" : `${t.retention}%`, sub: `${t.students} уч.`, delta: null })) },
          { label: "Выручка", rows: m.ratings.teachers.byRevenue.map((t) => ({ name: t.name, main: money(t.revenue), sub: `${t.students} уч. · удерж. ${t.retention ?? "—"}%`, delta: null })) },
          { label: "Прирост", rows: m.ratings.teachers.byGrowth.map((t) => ({ name: t.name, main: t.growthPct === null ? "—" : `${t.growthPct}%`, sub: `${t.students} уч.`, delta: t.growthPct })) }
        ]} />
        <RatingTabs title="Группы" onClick={() => go("schedule")} tabs={[
          { label: "Выручка", rows: m.ratings.groups.byRevenue.map((g) => ({ name: g.name, main: money(g.revenue), sub: `запол. ${g.occupancy ?? "—"}% · удерж. ${g.retention ?? "—"}%`, delta: null })) },
          { label: "Заполняемость", rows: m.ratings.groups.byOccupancy.map((g) => ({ name: g.name, main: g.occupancy === null ? "—" : `${g.occupancy}%`, sub: `выручка ${money(g.revenue)}`, delta: null })) },
          { label: "Удержание", rows: m.ratings.groups.byRetention.map((g) => ({ name: g.name, main: g.retention === null ? "—" : `${g.retention}%`, sub: `выручка ${money(g.revenue)}`, delta: null })) }
        ]} />
      </div>

      {/* 11. AI-АНАЛИЗ МЕСЯЦА */}
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={FileText} title="AI-анализ месяца" hint="Финансы · продажи · удержание · заполняемость · проблемы · рекомендации" inline />
          <button onClick={() => onTriggerAiReport?.()} disabled={aiGenerating}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-[#C5A059] transition hover:bg-[#C5A059] hover:text-black disabled:opacity-50">
            <Sparkles className="h-3.5 w-3.5" /> {aiGenerating ? "Генерация…" : "Сформировать (Gemini)"}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnalysisBlock title="Финансы" lines={[
            `Выручка: ${money(m.revenue.total)}`,
            `К пред. периоду: ${m.revenue.momPct === null ? "нет данных" : m.revenue.momPct + "%"}`,
            `Год к году: ${m.revenue.yoyPct === null ? "нет данных" : m.revenue.yoyPct + "%"}`,
            `Средний чек: ${m.avgCheck.all === null ? "—" : money(m.avgCheck.all)}`
          ]} />
          <AnalysisBlock title="Продажи" lines={[
            `Новые ученики: ${m.newStudents.hasData ? m.newStudents.period : "нет данных"}`,
            `Воронка: ${m.funnel.month.leads}→${m.funnel.month.signed}→${m.funnel.month.came}→${m.funnel.month.bought}`,
            `Конверсия в покупку: ${m.funnel.month.convBought === null ? "—" : m.funnel.month.convBought + "%"}`
          ]} />
          <AnalysisBlock title="Удержание" lines={[
            `Удержание: ${m.retention.pct === null ? "—" : m.retention.pct + "%"}`,
            `Отток: ${m.retention.pct === null ? "—" : (100 - m.retention.pct) + "%"}`,
            `Активны: ${m.retention.activeStudents} из ${m.retention.totalStudents}`
          ]} />
          <AnalysisBlock title="Заполняемость" lines={[
            `Загрузка: ${m.occupancy.pct === null ? "—" : m.occupancy.pct + "%"}`,
            `Перегруженные: ${m.risks.filter((r) => r.id === "overload").length ? "есть" : "нет"}`,
            `Полупустые: ${m.risks.filter((r) => r.id === "empty").length ? "есть" : "нет"}`
          ]} />
          <AnalysisBlock title="Лучшие показатели" lines={[
            `Педагог: ${m.ratings.teachers.byRetention[0]?.name || "—"}`,
            `Группа: ${m.ratings.groups.byRevenue[0]?.name || "—"}`,
            `Филиал: ${m.ratings.branches.byRevenue[0]?.name || "—"}`
          ]} />
          <AnalysisBlock title="Проблемы и рекомендации" lines={[
            ...(m.attention.slice(0, 2)),
            ...(m.growth.slice(0, 2))
          ]} />
        </div>
        {aiResult?.executiveSummary && (
          <div className="mt-4 rounded-2xl border border-[#C5A059]/20 bg-black/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C5A059]">Gemini</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{aiResult.executiveSummary}</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- презентационные компоненты дашборда ----------
const tooltipStyle = { background: "#161616", border: "1px solid rgba(197,160,89,0.3)", borderRadius: 12, color: "#fff", fontSize: 12 } as const;

function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-[#C5A059]/30 bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-100 outline-none">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SectionTitle({ icon: Icon, title, hint, inline }: { icon: React.ElementType; title: string; hint?: string; inline?: boolean }) {
  return (
    <div className={inline ? "flex items-center gap-2" : "mt-1 flex items-center gap-2"}>
      <Icon className="h-4 w-4 text-[#C5A059]" />
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">{title}</h2>
      {hint && <span className="hidden text-xs text-slate-500 sm:inline">· {hint}</span>}
    </div>
  );
}

function DeltaBadge({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null || pct === undefined) return <span className="text-[11px] text-slate-500">нет данных</span>;
  const good = invert ? pct <= 0 : pct >= 0;
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${good ? "text-emerald-400" : "text-rose-400"}`}>
      <Icon className="h-3.5 w-3.5" />{Math.abs(pct)}%
    </span>
  );
}

function BigKpi({ label, value, rows, tone = "gold", onClick }: { label: string; value: React.ReactNode; rows: { k: string; v: React.ReactNode }[]; tone?: "gold" | "white" | "rose" | "emerald"; onClick?: () => void }) {
  const valColor = tone === "rose" ? "text-rose-400" : tone === "emerald" ? "text-emerald-400" : tone === "white" ? "text-white" : "text-[#C5A059]";
  return (
    <section onClick={onClick} className="cursor-pointer rounded-[1.75rem] border border-white/10 bg-[#141414] p-4 transition hover:border-[#C5A059]/40">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-black ${valColor}`}>{value}</p>
      <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-slate-500">{r.k}</span>
            <span className="shrink-0 text-xs font-bold">{r.v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskTile({ severity, title, detail, onClick }: { key?: React.Key; severity: "high" | "mid" | "low"; title: string; detail: string; onClick?: () => void }) {
  const styles = severity === "high" ? "border-rose-500/30 bg-rose-500/10" : severity === "mid" ? "border-amber-400/30 bg-amber-400/10" : "border-white/10 bg-white/[0.03]";
  const dot = severity === "high" ? "bg-rose-500" : severity === "mid" ? "bg-amber-400" : "bg-slate-500";
  return (
    <button onClick={onClick} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:brightness-125 ${styles}`}>
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
      </div>
    </button>
  );
}

function FunnelDayCard({ title, data }: { title: string; data: { leads: number; trialBooked: number; trialCame: number; bought: number } | null }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">{title}</p>
      {data ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MiniMetric label="Лиды" value={data.leads} />
          <MiniMetric label="Запись на пробный" value={data.trialBooked} />
          <MiniMetric label="Пришли на пробный" value={data.trialCame} />
          <MiniMetric label="Купили впервые" value={data.bought} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Накапливается из событий статусов.</p>
      )}
    </section>
  );
}

function FunnelStage({ label, n, conv }: { label: string; n: number; conv: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <span className="flex items-center gap-3">
        <span className="text-base font-black text-white">{n}</span>
        {conv !== null && <span className="rounded-lg bg-[#C5A059]/15 px-2 py-0.5 text-[11px] font-bold text-[#C5A059]">{conv}%</span>}
      </span>
    </div>
  );
}

function ChartCard({ title, subtitle, children, empty }: { title: string; subtitle?: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <h3 className="text-base font-black text-white">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      <div className="relative mt-3 h-56 w-full">
        {empty && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 text-xs text-slate-500">Данные накапливаются</div>}
        {children}
      </div>
    </section>
  );
}

function ListPanel({ icon: Icon, tone, title, items }: { icon: React.ElementType; tone: "rose" | "emerald"; title: string; items: string[] }) {
  const c = tone === "rose" ? "text-rose-400" : "text-emerald-400";
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className={`flex items-center gap-2 ${c}`}><Icon className="h-4 w-4" /><h2 className="text-sm font-black uppercase tracking-wider">{title}</h2></div>
      <ul className="mt-3 space-y-2">
        {items.map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-200"><span className={c}>•</span><span>{t}</span></li>)}
      </ul>
    </section>
  );
}

type RatingRow = { name: string; main: string; sub: string; delta: number | null };
function RatingTabs({ title, tabs, onClick }: { title: string; tabs: { label: string; rows: RatingRow[] }[]; onClick?: () => void }) {
  const [active, setActive] = useState(0);
  const rows = tabs[active]?.rows || [];
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-white">{title}</h3>
        <button onClick={onClick} className="text-[10px] font-black uppercase tracking-wider text-[#C5A059] hover:text-white">Все ›</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {tabs.map((t, i) => (
          <button key={t.label} onClick={() => setActive(i)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${active === i ? "bg-[#C5A059] text-black" : "bg-white/[0.04] text-slate-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-500">Нет данных</p>}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#C5A059]/15 text-xs font-black text-[#C5A059]">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{r.name}</p>
              <p className="truncate text-[11px] text-slate-500">{r.sub}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-[#C5A059]">{r.main}</p>
              {r.delta !== null && <DeltaBadge pct={r.delta} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalysisBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#C5A059]">{title}</p>
      <ul className="mt-2 space-y-1">
        {lines.filter(Boolean).map((l, i) => <li key={i} className="text-xs text-slate-300">{l}</li>)}
      </ul>
    </div>
  );
}

function PriorityCard({ tone, icon: Icon, title, sub, onClick }: { key?: React.Key; tone: "rose" | "amber" | "gold"; icon: React.ElementType; title: string; sub: string; tab?: string; onClick: () => void }) {
  const styles = {
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    gold: "border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059]"
  }[tone];
  return (
    <button onClick={onClick} className={`group flex items-center gap-3 rounded-3xl border p-4 text-left transition hover:brightness-125 ${styles}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/30">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-white">{title}</p>
        <p className="truncate text-xs text-slate-400">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}

function BranchesView({ branches, rawBranches, students, groups, teachers, halls, onCreateBranch, onUpdateBranch, onDeleteBranch, onCreateGroup, onUpdateGroup, onDeleteGroup }: {
  branches: any[];
  rawBranches: Branch[];
  students: Student[];
  groups: Group[];
  teachers: Teacher[];
  halls?: any[];
  onCreateBranch?: (data: { name: string; city: string; address?: string; phone?: string }) => Promise<boolean>;
  onUpdateBranch?: (id: string, data: { name?: string; city?: string; address?: string; phone?: string }) => Promise<boolean>;
  onDeleteBranch?: (id: string) => Promise<boolean>;
  onCreateGroup?: (data: any) => Promise<boolean>;
  onUpdateGroup?: (id: string, data: any) => Promise<boolean>;
  onDeleteGroup?: (id: string) => Promise<boolean>;
}) {
  const empty = { name: "", city: "", address: "", phone: "" };
  const [section, setSection] = useState<"branches" | "groups">("branches");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [openBranchId, setOpenBranchId] = useState<string | null>(null);
  const canManage = Boolean(onCreateBranch);

  const groupName = (s: Student) => groups.find((g) => s.groupIds?.includes(g.id))?.name || "—";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name || "—";
  const branchStudents = (branchId: string) => students.filter((s) => s.branchId === branchId);
  const hasActiveSub = (s: Student) => (s.subscriptions || []).some((sub) => sub.status === "active");

  const startAdd = () => { setEditingId(null); setForm(empty); setAdding(true); };
  const startEdit = (id: string) => {
    const b = rawBranches.find((x) => x.id === id);
    setAdding(false);
    setEditingId(id);
    setForm({ name: b?.name || "", city: b?.city || "", address: b?.address || "", phone: b?.phone || "" });
  };
  const cancel = () => { setAdding(false); setEditingId(null); setForm(empty); };

  const submit = async () => {
    if (!form.name.trim() || !form.city.trim()) return;
    setBusy(true);
    let ok = false;
    if (adding && onCreateBranch) ok = await onCreateBranch(form);
    else if (editingId && onUpdateBranch) ok = await onUpdateBranch(editingId, form);
    setBusy(false);
    if (ok) cancel();
  };

  const remove = async (id: string, label: string) => {
    if (!onDeleteBranch) return;
    if (!window.confirm(`Архивировать филиал «${label}»? Данные сохранятся, но филиал скроется из сети.`)) return;
    await onDeleteBranch(id);
  };

  return (
    <OwnerScreen title="Филиалы сети" subtitle="Все филиалы, руководители, финансы, посещаемость. Владелец может добавлять, редактировать и архивировать филиалы и группы.">
      <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-[#121212] p-1">
        <button
          onClick={() => setSection("branches")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${section === "branches" ? "bg-[#C5A059] text-black" : "text-slate-400 hover:text-white"}`}
        >
          <Building2 className="mr-1.5 inline h-4 w-4" /> Филиалы
        </button>
        <button
          onClick={() => setSection("groups")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${section === "groups" ? "bg-[#C5A059] text-black" : "text-slate-400 hover:text-white"}`}
        >
          <Users className="mr-1.5 inline h-4 w-4" /> Группы
        </button>
      </div>

      {section === "groups" ? (
        <BranchGroupsManager
          rawBranches={rawBranches}
          groups={groups}
          teachers={teachers}
          halls={halls}
          onCreateGroup={onCreateGroup}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
        />
      ) : (
      <>
      {canManage && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">{rawBranches.length} активных филиалов</p>
          {!adding && editingId === null && (
            <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
              <Plus className="h-4 w-4" /> Добавить филиал
            </button>
          )}
        </div>
      )}

      {(adding || editingId !== null) && (
        <BranchForm
          title={adding ? "Новый филиал" : "Редактирование филиала"}
          form={form}
          setForm={setForm}
          busy={busy}
          onSubmit={submit}
          onCancel={cancel}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {branches.map((branch) => (
          <article key={branch.branchId} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
            <div className="flex items-start justify-between">
              <BranchStatus status={branch.status} />
              {canManage && (
                <div className="flex gap-1">
                  <button onClick={() => startEdit(branch.branchId)} title="Редактировать" className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(branch.branchId, branch.branchName || branch.city)} title="Архивировать" className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:border-red-500/40 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <h3 className="mt-4 text-xl font-black text-white">{branch.branchName || branch.city}</h3>
            <p className="mt-1 text-xs text-slate-500">{branch.city} · {branch.managerName}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniMetric label="Ученики" value={branch.studentsCount} />
              <MiniMetric label="Педагоги" value={branch.teachersCount} />
              <MiniMetric label="Выручка" value={money(branch.revenue)} />
              <MiniMetric label="Посещ." value={`${branch.attendanceRate}%`} />
              <MiniMetric label="Новые" value={branch.newLeads} />
              <MiniMetric label="Удерж." value={`${branch.retention}%`} />
            </div>
            <button
              onClick={() => setOpenBranchId(openBranchId === branch.branchId ? null : branch.branchId)}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${openBranchId === branch.branchId ? "border-[#C5A059]/60 bg-[#C5A059]/10 text-[#C5A059]" : "border-white/10 text-slate-300 hover:border-[#C5A059]/40 hover:text-[#C5A059]"}`}
            >
              <Users className="h-4 w-4" />
              {openBranchId === branch.branchId ? "Скрыть учеников" : `Показать учеников (${branchStudents(branch.branchId).length})`}
            </button>
          </article>
        ))}
      </div>

      {openBranchId && (() => {
        const list = branchStudents(openBranchId);
        const title = branches.find((b) => b.branchId === openBranchId)?.branchName || rawBranches.find((b) => b.id === openBranchId)?.name || "Филиал";
        return (
          <div className="rounded-[2rem] border border-[#C5A059]/30 bg-[#161616] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Ученики · {title} <span className="text-slate-500">({list.length})</span></h3>
              <button onClick={() => setOpenBranchId(null)} className="rounded-lg p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <div className="hidden grid-cols-12 gap-2 border-b border-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid">
                <span className="col-span-4">Ученик</span>
                <span className="col-span-3">Группа</span>
                <span className="col-span-3">Преподаватель</span>
                <span className="col-span-2">Абонемент</span>
              </div>
              {list.map((s) => (
                <div key={s.id} className="grid grid-cols-2 gap-2 border-b border-white/5 px-4 py-2.5 text-sm md:grid-cols-12 md:items-center">
                  <div className="col-span-4">
                    <p className="font-bold text-white">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.parentName} · {s.parentPhone || "—"}</p>
                  </div>
                  <span className="col-span-3 text-slate-300">{groupName(s)}</span>
                  <span className="col-span-3 text-slate-300">{teacherName(s.teacherId)}</span>
                  <span className="col-span-2">
                    {hasActiveSub(s)
                      ? <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">активен</span>
                      : <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-400">нет</span>}
                  </span>
                </div>
              ))}
              {list.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">В этом филиале пока нет учеников.</p>}
            </div>
          </div>
        );
      })()}
      </>
      )}
    </OwnerScreen>
  );
}

function BranchGroupsManager({ rawBranches, groups, teachers, halls, onCreateGroup, onUpdateGroup, onDeleteGroup }: {
  rawBranches: Branch[];
  groups: Group[];
  teachers: Teacher[];
  halls?: any[];
  onCreateGroup?: (data: any) => Promise<boolean>;
  onUpdateGroup?: (id: string, data: any) => Promise<boolean>;
  onDeleteGroup?: (id: string) => Promise<boolean>;
}) {
  const emptyForm = { name: "", branchId: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", capacity: "", level: "Начинающие", scheduleDays: "", scheduleTime: "" };
  const [filterBranchId, setFilterBranchId] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const canManage = Boolean(onCreateGroup);

  const branchName = (id: string) => rawBranches.find((b) => b.id === id)?.name || "—";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name || "Не назначен";
  const hallName = (id: string) => (halls || []).find((h: any) => h.id === id)?.name || "—";
  const visibleGroups = groups.filter((g) => !filterBranchId || g.branchId === filterBranchId);
  const branchTeachers = (branchId: string) => teachers.filter((t) => !t.branchId || t.branchId === branchId);

  const startAdd = () => { setEditingId(null); setForm({ ...emptyForm, branchId: filterBranchId || "" }); setAdding(true); };
  const startEdit = (g: Group) => {
    setAdding(false);
    setEditingId(g.id);
    setForm({
      name: g.name || "",
      branchId: g.branchId || "",
      teacherId: g.teacherId || "",
      hallId: g.hallId || "",
      ageFrom: g.ageFrom != null ? String(g.ageFrom) : "",
      ageTo: g.ageTo != null ? String(g.ageTo) : "",
      capacity: g.capacity != null ? String(g.capacity) : "",
      level: g.level || "Начинающие",
      scheduleDays: (g.days || []).join(", "),
      scheduleTime: g.time || "",
    });
  };
  const cancel = () => { setAdding(false); setEditingId(null); setForm(emptyForm); };

  const submit = async () => {
    if (!form.name.trim() || !form.branchId) return;
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      branchId: form.branchId,
      teacherId: form.teacherId || undefined,
      hallId: form.hallId || undefined,
      ageFrom: form.ageFrom ? Number(form.ageFrom) : undefined,
      ageTo: form.ageTo ? Number(form.ageTo) : undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      level: form.level,
      scheduleDays: form.scheduleDays || undefined,
      scheduleTime: form.scheduleTime || undefined,
    };
    let ok = false;
    if (adding && onCreateGroup) ok = await onCreateGroup(payload);
    else if (editingId && onUpdateGroup) ok = await onUpdateGroup(editingId, payload);
    setBusy(false);
    if (ok) cancel();
  };

  const assignTeacher = async (groupId: string, teacherId: string) => {
    if (!onUpdateGroup) return;
    await onUpdateGroup(groupId, { teacherId: teacherId || undefined });
  };

  const remove = async (g: Group) => {
    if (!onDeleteGroup) return;
    if (!window.confirm(`Архивировать группу «${g.name}»? Данные сохранятся, но группа скроется из сети.`)) return;
    await onDeleteGroup(g.id);
  };

  const inputCls = "mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";
  const kicCls = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{visibleGroups.length} {filterBranchId ? "групп в филиале" : "групп в сети"}</p>
        {canManage && !adding && editingId === null && (
          <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
            <Plus className="h-4 w-4" /> Добавить группу
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setFilterBranchId("")} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${!filterBranchId ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>Все филиалы</button>
        {rawBranches.map((b) => (
          <button key={b.id} onClick={() => setFilterBranchId(b.id)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${filterBranchId === b.id ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>{b.name}</button>
        ))}
      </div>

      {(adding || editingId !== null) && (
        <div className="mb-5 rounded-[2rem] border border-[#C5A059]/30 bg-[#161616] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white">{adding ? "Новая группа" : "Редактирование группы"}</h3>
            <button onClick={cancel} className="rounded-lg p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className={kicCls}>Название *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Лезгинка · Старшая" className={inputCls} />
            </label>
            <label className="block"><span className={kicCls}>Филиал *</span>
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value, teacherId: "" })} className={inputCls}>
                <option value="">Выберите филиал</option>
                {rawBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="block"><span className={kicCls}>Преподаватель</span>
              <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className={inputCls}>
                <option value="">Не назначен</option>
                {(form.branchId ? branchTeachers(form.branchId) : teachers).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="block"><span className={kicCls}>Зал</span>
              <select value={form.hallId} onChange={(e) => setForm({ ...form, hallId: e.target.value })} className={inputCls}>
                <option value="">Не выбрано</option>
                {(halls || []).filter((h: any) => !form.branchId || h.branchId === form.branchId).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="block"><span className={kicCls}>Уровень</span>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputCls}>
                {["Начинающие", "Продолжающие", "Ансамбль", "Профи"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="block"><span className={kicCls}>Возраст от–до</span>
              <div className="mt-1 flex gap-2">
                <input type="number" min={3} value={form.ageFrom} onChange={(e) => setForm({ ...form, ageFrom: e.target.value })} placeholder="от" className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50" />
                <input type="number" min={3} value={form.ageTo} onChange={(e) => setForm({ ...form, ageTo: e.target.value })} placeholder="до" className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50" />
              </div>
            </label>
            <label className="block"><span className={kicCls}>Вместимость</span>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="16" className={inputCls} />
            </label>
            <label className="block"><span className={kicCls}>Дни занятий</span>
              <input value={form.scheduleDays} onChange={(e) => setForm({ ...form, scheduleDays: e.target.value })} placeholder="Пн, Ср, Пт" className={inputCls} />
            </label>
            <label className="block"><span className={kicCls}>Время</span>
              <input value={form.scheduleTime} onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })} placeholder="18:30–20:00" className={inputCls} />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={busy || !form.name.trim() || !form.branchId} onClick={submit} className="rounded-2xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
            <button onClick={cancel} className="rounded-2xl border border-white/10 px-5 py-2 text-sm font-bold text-slate-300 hover:text-white">Отмена</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleGroups.map((g) => (
          <article key={g.id} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white">{g.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{branchName(g.branchId)} · {g.ageGroup || "Все возрасты"} · {g.level}</p>
                {(g.days?.length > 0 || g.time) && <p className="mt-0.5 text-xs text-slate-500">{(g.days || []).join(", ")} {g.time}</p>}
              </div>
              {canManage && (
                <div className="flex flex-shrink-0 gap-1">
                  <button onClick={() => startEdit(g)} title="Редактировать" className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(g)} title="Архивировать" className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:border-red-500/40 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniMetric label="Ученики" value={g.studentCount ?? 0} />
              <MiniMetric label="Вместим." value={g.capacity || "—"} />
              <MiniMetric label="Зал" value={hallName(g.hallId)} />
            </div>
            <div className="mt-4">
              <span className={kicCls}>Преподаватель</span>
              {canManage ? (
                <select
                  value={g.teacherId || ""}
                  onChange={(e) => assignTeacher(g.id, e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#C5A059]/50"
                >
                  <option value="">Не назначен</option>
                  {branchTeachers(g.branchId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <p className="mt-1 text-sm font-bold text-white">{teacherName(g.teacherId)}</p>
              )}
            </div>
          </article>
        ))}
      </div>
      {visibleGroups.length === 0 && (
        <div className="rounded-[2rem] border border-white/10 bg-[#121212] py-12 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">{filterBranchId ? "В этом филиале пока нет групп." : "Групп пока нет."}</p>
        </div>
      )}
    </div>
  );
}

function BranchForm({ title, form, setForm, busy, onSubmit, onCancel }: {
  title: string;
  form: { name: string; city: string; address: string; phone: string };
  setForm: (f: { name: string; city: string; address: string; phone: string }) => void;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const field = (label: string, key: "name" | "city" | "address" | "phone", placeholder: string) => (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50"
      />
    </label>
  );
  return (
    <div className="mb-5 rounded-[2rem] border border-[#C5A059]/30 bg-[#161616] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <button onClick={onCancel} className="rounded-lg p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {field("Название", "name", "Эхо Гор Центр")}
        {field("Город", "city", "Алматы")}
        {field("Адрес", "address", "ул. Абая, 45")}
        {field("Телефон", "phone", "+7 (727) 000-00-00")}
      </div>
      <div className="mt-4 flex gap-2">
        <button disabled={busy || !form.name.trim() || !form.city.trim()} onClick={onSubmit} className="rounded-2xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
        <button onClick={onCancel} className="rounded-2xl border border-white/10 px-5 py-2 text-sm font-bold text-slate-300 hover:text-white">Отмена</button>
      </div>
    </div>
  );
}

function OwnerEduErpView({ branches, groups, students, teachers, payments, monthRevenue, todayRevenue, debt, renewals }: {
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  payments: Payment[];
  monthRevenue: number;
  todayRevenue: number;
  debt: number;
  renewals: number;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const [activeEduArea, setActiveEduArea] = useState<"reports" | "employees" | "directories">("reports");
  const [openEduSections, setOpenEduSections] = useState<Record<string, boolean>>({
    "Финансовые отчеты": true,
    "Ученики и группы": true,
    "Маркетинг и источники": true,
    "Операционная дисциплина": true,
    "Сотрудники филиалов": true,
    "Роли и доступы": true,
    "Нагрузка и эффективность": true,
    "Кадровые действия": true,
    "Организация": true,
    "Стоимость": true,
    "Коммуникации": true
  });
  const selectedStudent = students.find((student) => student.id === selectedStudentId) || students[0];
  const selectedGroup = groups.find((group) => selectedStudent.groupIds?.includes(group.id));
  const selectedBranch = branches.find((branch) => branch.id === selectedStudent?.branchId);
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedStudent?.teacherId);
  const selectedSubscription = selectedStudent?.subscriptions[0];
  const toggleEduSection = (title: string) => setOpenEduSections((sections) => ({ ...sections, [title]: !sections[title] }));

  const moduleCards = [
    { icon: Users, title: "Посетители", text: "Все ученики сети, родители, статусы, источники, комментарии, архив.", accent: `${students.length}` },
    { icon: Receipt, title: "Счета", text: "Оплата, отправка, редактирование, удаление, массовое выставление.", accent: money(debt) },
    { icon: WalletCards, title: "Баланс", text: "Пополнения, возвраты, корректировки, резерв баланса, экспорт.", accent: money(todayRevenue) },
    { icon: BadgePercent, title: "Абонементы", text: "Типы, ПП, скидки, справки, сроки, остатки занятий.", accent: `${renewals}` },
    { icon: ClipboardList, title: "Посещение", text: "Журнал, отметки занятий, справки, отработки и подарки.", accent: "82%" },
    { icon: Send, title: "Рассылка", text: "SMS, email, push, шаблоны, будущая отправка, история доставки.", accent: "100%" },
    { icon: CheckCircle, title: "Задачи", text: "Просроченные, на сегодня, мои, шаблоны задач и реестр.", accent: "2062" },
    { icon: BarChart3, title: "Отчеты", text: "Выручка, потери, взаиморасчеты, источники, посещаемость.", accent: "12", area: "reports" as const },
    { icon: UserRound, title: "Сотрудники", text: "Преподаватели, администраторы, руководители, роли, нагрузка.", accent: `${teachers.length}`, area: "employees" as const },
    { icon: Settings, title: "Справочники", text: "Филиалы, группы, статусы, источники, стоимость, интеграции.", accent: "18", area: "directories" as const }
  ];

  const reportCategories = [
    {
      title: "Финансовые отчеты",
      text: "Контроль денег сети, долгов, повторных продаж и потерь по филиалам.",
      items: ["Руководители по месяцам", "Отчет о выручке и потерях", "Взаиморасчеты", "Реестр операций", "Проданные абонементы", "Средний чек"]
    },
    {
      title: "Ученики и группы",
      text: "Динамика базы, посещаемость, заполненность и операционные сигналы.",
      items: ["Посещаемость", "Заполненность групп", "Новые ученики", "Ушедшие ученики", "Дни рождения", "НПС / привязка к тренерам"]
    },
    {
      title: "Маркетинг и источники",
      text: "Откуда приходят ученики и какие каналы дают реальную оплату.",
      items: ["Источники посетителей", "Рекламные расходы", "Конверсия заявок", "Пробные занятия", "Новые продажи", "Повторные продажи"]
    },
    {
      title: "Операционная дисциплина",
      text: "Задачи, рассылки, просрочки и качество ведения базы администраторами.",
      items: ["Отчет по задачам", "Реестр задач", "История рассылок", "Архив посетителей", "Необработанные заявки", "Просроченные действия"]
    }
  ];

  const employeeCategories = [
    {
      title: "Сотрудники филиалов",
      text: "Единый список людей по всей сети с фильтром по филиалу и роли.",
      items: ["Руководители филиалов", "Администраторы", "Преподаватели", "Стажеры", "Уволенные / архив", "Без назначенного филиала"]
    },
    {
      title: "Роли и доступы",
      text: "Кто что может видеть и менять внутри сети и конкретного филиала.",
      items: ["Owner", "Branch manager", "Admin", "Teacher", "Индивидуальные ограничения", "История изменений доступа"]
    },
    {
      title: "Нагрузка и эффективность",
      text: "Группы, расписание, посещаемость и результативность по каждому сотруднику.",
      items: ["Нагрузка преподавателей", "Группы преподавателя", "Посещаемость групп", "Удержание учеников", "Благодарности", "Замены и пропуски"]
    },
    {
      title: "Кадровые действия",
      text: "Операции, которые нужны владельцу и руководителям филиалов.",
      items: ["Добавить сотрудника", "Назначить филиал", "Назначить группы", "Изменить роль", "Заблокировать доступ", "Открыть audit log"]
    }
  ];

  const directoryCategories = [
    {
      title: "Организация",
      text: "Структура сети, которая управляет расписанием, группами и отчетностью.",
      items: ["Филиалы", "Города", "Территории", "Залы", "Группы", "Возраст групп"]
    },
    {
      title: "Стоимость",
      text: "Все коммерческие правила, которые влияют на счета и абонементы.",
      items: ["Абонементы", "Скидки", "Промокоды", "Справки", "Подарочные занятия", "Правила продления"]
    },
    {
      title: "Коммуникации",
      text: "Шаблоны и сценарии сообщений для операционной работы.",
      items: ["Шаблоны задач", "Сценарии рассылок", "История отправок", "Каналы связи", "Интеграции", "Политики"]
    }
  ];

  const activeCategories = activeEduArea === "reports" ? reportCategories : activeEduArea === "employees" ? employeeCategories : directoryCategories;
  const activeAreaMeta = {
    reports: { title: "Отчеты EduERP", text: "Все категории отчетов открываются внутри кабинета владельца: финансы, ученики, маркетинг и операционная дисциплина.", icon: BarChart3 },
    employees: { title: "Сотрудники", text: "Полный контур сотрудников: роли, филиалы, группы, нагрузка, эффективность и кадровые действия.", icon: UserRound },
    directories: { title: "Справочники", text: "Организация, стоимость, коммуникации и системные настройки, которые нужны для EduERP-ядра.", icon: Settings }
  }[activeEduArea];
  const ActiveAreaIcon = activeAreaMeta.icon;

  return (
    <OwnerScreen title="EduERP OS владельца" subtitle="Полный операционный контур EduERP внутри кабинета владельца: посетители, счета, баланс, абонементы, посещение, задачи, рассылки, родители, справочники и отчеты по всей сети.">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#C5A059]/20 bg-gradient-to-br from-[#221B10] via-[#121212] to-black p-5 md:p-7">
        <div className="absolute right-[-100px] top-[-110px] h-80 w-80 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[1fr_420px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059]">Network Owner / EduERP Core</p>
            <h2 className="mt-2 text-3xl font-black text-white md:text-5xl">Операции всей сети в руках владельца</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              Владелец видит все, что есть в EduERP у администратора, но в сетевом масштабе: сравнение филиалов, контроль долгов, продлений, задач и качества ведения базы.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniMetric label="Сегодня" value={money(todayRevenue)} />
            <MiniMetric label="Месяц" value={money(monthRevenue)} />
            <MiniMetric label="Долги" value={money(debt)} />
            <MiniMetric label="Продления" value={renewals} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {moduleCards.map((module) => (
          <button
            key={module.title}
            onClick={() => module.area && setActiveEduArea(module.area)}
            className={`rounded-[1.6rem] border p-4 text-left transition ${module.area && activeEduArea === module.area ? "border-[#C5A059]/50 bg-[#C5A059]/10" : "border-white/10 bg-[#121212] hover:border-[#C5A059]/30 hover:bg-[#181818]"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">
                <module.icon className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-[#C5A059]/20 bg-[#C5A059]/10 px-2 py-1 text-[10px] font-black text-[#C5A059]">{module.accent}</span>
            </div>
            <h3 className="mt-4 text-base font-black text-white">{module.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{module.text}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#121212]">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Посетители сети</p>
                <h3 className="mt-1 text-xl font-black text-white">Контроль базы как в EduERP</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <OwnerAction icon={Search} label="Поиск" />
                <OwnerAction icon={Filter} label="Фильтр" />
                <OwnerAction icon={FileSpreadsheet} label="Экспорт" primary />
              </div>
            </div>
          </div>
          {/* Mobile card list (md-) */}
          <div className="space-y-3 p-4 md:hidden">
            {students.slice(0, 8).map((student) => {
              const branch = branches.find((item) => item.id === student.branchId);
              const group = groups.find((item) => item.id === (student.groupIds?.[0] || (student as any).groupId));
              const subscription = student.subscriptions[0];
              const active = selectedStudent?.id === student.id;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left transition active:scale-[0.99] ${active ? "border-[#C5A059]/40 bg-[#C5A059]/10" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-black text-white">{student.name}</p>
                    <span className={`shrink-0 text-sm font-black ${student.balance < 0 ? "text-rose-300" : "text-emerald-300"}`}>{money(student.balance)}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400"><Phone className="h-3.5 w-3.5 shrink-0 text-[#C5A059]" />{student.parentPhone} · {branch?.city || "Филиал"} · {group?.name || "Группа"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <OwnerStatus text={student.balance < 0 ? "Не оплачен" : "Активен"} warning={student.balance < 0} />
                    <span className="text-[11px] text-slate-500">Посещение {subscription?.lessonsLeft ?? 0}/{subscription?.lessonsTotal ?? 0}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Full table (md+) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-slate-500">
                <tr>{["Имя", "Контакты", "Родитель", "Статус", "Филиал", "Группа", "Абонемент", "Посещение", "Баланс"].map((header) => <th key={header} className="p-4 font-black">{header}</th>)}</tr>
              </thead>
              <tbody>
                {students.slice(0, 8).map((student) => {
                  const branch = branches.find((item) => item.id === student.branchId);
                  const group = groups.find((item) => item.id === (student.groupIds?.[0] || (student as any).groupId));
                  const subscription = student.subscriptions[0];
                  const active = selectedStudent?.id === student.id;
                  return (
                    <tr key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`cursor-pointer border-t border-white/5 transition hover:bg-[#C5A059]/10 ${active ? "bg-[#C5A059]/15" : ""}`}>
                      <td className="p-4">
                        <p className="font-black text-white">{student.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">Открыть карточку</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-400"><Phone className="h-3.5 w-3.5 text-[#C5A059]" />{student.parentPhone}</div>
                      </td>
                      <td className="p-4 text-slate-400">{student.parentName}</td>
                      <td className="p-4"><OwnerStatus text={student.balance < 0 ? "Не оплачен" : "Активен"} warning={student.balance < 0} /></td>
                      <td className="p-4 text-slate-400">{branch?.city || "Филиал"}</td>
                      <td className="p-4 text-slate-400">{group?.name || "Группа"}</td>
                      <td className="p-4 text-slate-400">{subscription?.name || "Нет"}</td>
                      <td className="p-4 text-slate-400">{subscription?.lessonsLeft ?? 0}/{subscription?.lessonsTotal ?? 0}</td>
                      <td className={`p-4 font-black ${student.balance < 0 ? "text-rose-300" : "text-emerald-300"}`}>{money(student.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {selectedStudent && (
          <div className="xl:sticky xl:top-5 xl:self-start">
            <StudentManagementCard
              student={selectedStudent}
              group={selectedGroup}
              branch={selectedBranch}
              teacher={selectedTeacher}
              allGroups={groups}
              allBranches={branches}
              allTeachers={teachers}
              onClose={() => setSelectedStudentId("")}
            />
          </div>
        )}
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">
              <ActiveAreaIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Основной блок EduERP</p>
              <h3 className="mt-1 text-xl font-black text-white">{activeAreaMeta.title}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{activeAreaMeta.text}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <OwnerAreaButton active={activeEduArea === "reports"} label="Отчеты" onClick={() => setActiveEduArea("reports")} />
            <OwnerAreaButton active={activeEduArea === "employees"} label="Сотрудники" onClick={() => setActiveEduArea("employees")} />
            <OwnerAreaButton active={activeEduArea === "directories"} label="Справочники" onClick={() => setActiveEduArea("directories")} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_390px]">
          <div className="grid gap-3">
            {activeCategories.map((category) => (
              <OwnerEduAccordion
                key={category.title}
                title={category.title}
                text={category.text}
                items={category.items}
                open={openEduSections[category.title] ?? true}
                onToggle={() => toggleEduSection(category.title)}
              />
            ))}
          </div>
          <OwnerEduAreaPreview
            activeArea={activeEduArea}
            branches={branches}
            teachers={teachers}
            groups={groups}
            payments={payments}
            debt={debt}
            monthRevenue={monthRevenue}
          />
        </div>
      </section>
    </OwnerScreen>
  );
}

function StudentsNetworkView({ students, branches, groups, teachers, onCreateStudent, onUpdateStudent, onDeleteStudent, onOpenPayment, onSellSubscription, subscriptionPlans = [], studentTrash = [], onRestoreStudent, onConfirmDeleteStudent }: {
  students: Student[];
  branches: Branch[];
  groups: Group[];
  teachers: Teacher[];
  onCreateStudent?: (data: StudentInput) => Promise<boolean>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  subscriptionPlans?: SubscriptionPlan[];
  studentTrash?: TrashStudent[];
  onRestoreStudent?: (id: string) => Promise<boolean>;
  onConfirmDeleteStudent?: (id: string) => Promise<boolean>;
}) {
  const [trashBusy, setTrashBusy] = useState<string | null>(null);
  const branchNameById = (id: string) => branches.find((b) => b.id === id)?.name || "—";
  const restore = async (t: TrashStudent) => {
    if (!onRestoreStudent) return;
    setTrashBusy(t.id);
    await onRestoreStudent(t.id);
    setTrashBusy(null);
  };
  const confirmDelete = async (t: TrashStudent) => {
    if (!onConfirmDeleteStudent) return;
    if (!window.confirm(`Окончательно удалить ученика «${t.name}»? Карточка будет архивирована, история оплат и посещений сохранится.`)) return;
    setTrashBusy(t.id);
    await onConfirmDeleteStudent(t.id);
    setTrashBusy(null);
  };

  return (
    <OwnerScreen title="Ученики сети" subtitle="Вся база учеников: продления, долги, LTV-сегменты, коммуникации и массовые действия. Владелец видит все филиалы.">
      <StudentsRegistry
        students={students}
        groups={groups}
        branches={branches}
        teachers={teachers}
        onCreateStudent={onCreateStudent}
        onUpdateStudent={onUpdateStudent}
        onDeleteStudent={onDeleteStudent}
        onOpenPayment={onOpenPayment}
        onSellSubscription={onSellSubscription}
        plans={subscriptionPlans}
      />

            <div className="overflow-hidden rounded-[2rem] border border-rose-500/20 bg-[#140f10]">
        <div className="flex items-center justify-between gap-3 border-b border-rose-500/15 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-rose-500/15 p-2.5 text-rose-400"><Trash2 className="h-5 w-5" /></div>
            <div>
              <h3 className="font-black text-white">Корзина учеников</h3>
              <p className="text-xs text-slate-500">Заявки на удаление от руководителей филиалов. Подтверждает только владелец.</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${studentTrash.length ? "bg-rose-500/15 text-rose-400" : "bg-white/5 text-slate-500"}`}>{studentTrash.length}</span>
        </div>

        {studentTrash.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">Корзина пуста — заявок на удаление нет.</p>
        ) : (
          studentTrash.map((t) => (
            <div key={t.id} className="grid grid-cols-1 gap-3 border-b border-white/5 px-5 py-3 text-sm md:grid-cols-12 md:items-center">
              <div className="md:col-span-4">
                <p className="font-bold text-white">{t.name}</p>
                <p className="text-xs text-slate-500">{t.parentName || "—"} · {t.parentPhone || "—"}</p>
              </div>
              <span className="text-slate-300 md:col-span-2">{branchNameById(t.branchId)}</span>
              <div className="md:col-span-3">
                <p className="text-xs text-slate-400">Заявка: <span className="text-slate-200">{t.requestedBy}</span></p>
                {t.requestedAt && <p className="text-[11px] text-slate-600">{new Date(t.requestedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
              </div>
              <div className="flex justify-end gap-2 md:col-span-3">
                <button onClick={() => restore(t)} disabled={trashBusy === t.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40">Восстановить</button>
                <button onClick={() => confirmDelete(t)} disabled={trashBusy === t.id} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-40">{trashBusy === t.id ? "…" : "Удалить"}</button>
              </div>
            </div>
          ))
        )}
      </div>
    </OwnerScreen>
  );
}

function StudentForm({ title, form, setForm, branches, groups, teachers, busy, onSubmit, onCancel }: {
  title: string;
  form: StudentInput;
  setForm: (f: StudentInput) => void;
  branches: Branch[];
  groups: Group[];
  teachers: Teacher[];
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputCls = "mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";
  const groupOptions = groups.filter((g) => !form.branchId || g.branchId === form.branchId);
  return (
    <div className="rounded-[2rem] border border-[#C5A059]/30 bg-[#161616] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <button onClick={onCancel} className="rounded-lg p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Имя ученика</span>
          <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя Фамилия" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Родитель</span>
          <input value={form.parentName || ""} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder="Имя родителя" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Телефон</span>
          <input value={form.parentPhone || ""} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} placeholder="+7 ..." className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Филиал</span>
          <select value={form.branchId || ""} onChange={(e) => setForm({ ...form, branchId: e.target.value, groupId: "" })} className={inputCls}>
            <option value="">— выберите —</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Группа</span>
          <select value={form.groupId || ""} onChange={(e) => setForm({ ...form, groupId: e.target.value })} className={inputCls}>
            <option value="">— без группы —</option>
            {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Преподаватель</span>
          <select value={form.teacherId || ""} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className={inputCls}>
            <option value="">— не назначен —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button disabled={busy || !form.name?.trim() || !form.branchId} onClick={onSubmit} className="rounded-2xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
        <button onClick={onCancel} className="rounded-2xl border border-white/10 px-5 py-2 text-sm font-bold text-slate-300 hover:text-white">Отмена</button>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  teacher: "Преподаватель",
  admin: "Администратор",
  branch_manager: "Управляющий филиалом",
  owner: "Владелец"
};

function TeachersNetworkView({ teachers, metrics, branches, onCreateTeacher, onUpdateTeacher, onDeleteTeacher }: {
  teachers: Teacher[];
  metrics: ExecutiveSummary;
  branches: Branch[];
  onCreateTeacher?: (data: TeacherInput) => Promise<boolean>;
  onUpdateTeacher?: (id: string, data: TeacherInput) => Promise<boolean>;
  onDeleteTeacher?: (id: string) => Promise<boolean>;
}) {
  const empty: TeacherInput = { name: "", phone: "", specialization: "", branchId: branches[0]?.id || "", role: "teacher" };
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherInput>(empty);
  const [busy, setBusy] = useState(false);
  const canManage = Boolean(onCreateTeacher);

  const branchName = (id?: string | null) => branches.find((b) => b.id === id)?.name || "— не назначен —";
  const metricFor = (id: string) => metrics.teacherPerformance.find((m) => m.teacherId === id);

  const startAdd = () => { setEditingId(null); setForm(empty); setAdding(true); };
  const startEdit = (t: Teacher) => {
    setAdding(false);
    setEditingId(t.id);
    setForm({ name: t.name, phone: t.phone || "", specialization: t.specialties?.[0] || "", branchId: t.branchId || "", role: t.role || "teacher" });
  };
  const cancel = () => { setAdding(false); setEditingId(null); setForm(empty); };

  const submit = async () => {
    if (!form.name?.trim()) return;
    setBusy(true);
    let ok = false;
    if (adding && onCreateTeacher) ok = await onCreateTeacher(form);
    else if (editingId && onUpdateTeacher) ok = await onUpdateTeacher(editingId, form);
    setBusy(false);
    if (ok) cancel();
  };

  const remove = async (t: Teacher) => {
    if (!onDeleteTeacher) return;
    if (!window.confirm(`Архивировать «${t.name}»? История групп и занятий сохранится.`)) return;
    await onDeleteTeacher(t.id);
  };

  return (
    <OwnerScreen title="Преподаватели сети" subtitle="Статистика и управление персоналом. Владелец может добавлять, редактировать, архивировать сотрудников, назначать филиал и выдавать права (роль).">
      {/* Performance cards */}
      <div className="grid gap-4 xl:grid-cols-3">
        {metrics.teacherPerformance.map((teacherMetric) => {
          const teacher = teachers.find((item) => item.id === teacherMetric.teacherId);
          return (
            <article key={teacherMetric.teacherId} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
              {teacher && <img src={teacher.photoUrl} alt={teacher.name} className="h-20 w-20 rounded-full border border-[#C5A059]/35 object-cover" />}
              <h3 className="mt-4 text-lg font-black text-white">{teacherMetric.teacherName}</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniMetric label="Ученики" value={teacherMetric.studentsCount} />
                <MiniMetric label="Удержание" value={`${teacherMetric.retentionRate}%`} />
                <MiniMetric label="Посещ." value={`${teacherMetric.averageAttendance}%`} />
                <MiniMetric label="Спасибо" value="57" />
              </div>
            </article>
          );
        })}
      </div>

      {/* Management */}
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{teachers.length} преподавателей в сети</p>
          {!adding && editingId === null && (
            <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
              <Plus className="h-4 w-4" /> Добавить преподавателя
            </button>
          )}
        </div>
      )}

      {(adding || editingId !== null) && (
        <TeacherForm
          title={adding ? "Новый преподаватель" : "Редактирование преподавателя"}
          form={form}
          setForm={setForm}
          branches={branches}
          busy={busy}
          onSubmit={submit}
          onCancel={cancel}
        />
      )}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#121212]">
        <div className="hidden grid-cols-12 gap-2 border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid">
          <span className="col-span-3">Преподаватель</span>
          <span className="col-span-3">Специализация</span>
          <span className="col-span-3">Филиал</span>
          <span className="col-span-2">Права</span>
          <span className="col-span-1 text-right">Действия</span>
        </div>
        {teachers.map((t) => {
          const m = metricFor(t.id);
          return (
            <div key={t.id} className="grid grid-cols-2 gap-2 border-b border-white/5 px-5 py-3 text-sm md:grid-cols-12 md:items-center">
              <div className="col-span-3">
                <p className="font-bold text-white">{t.name}</p>
                <p className="text-xs text-slate-500">{t.phone || "—"}{m ? ` · ${m.studentsCount} уч.` : ""}</p>
              </div>
              <span className="col-span-3 text-slate-300">{t.specialties?.[0] || "—"}</span>
              <span className="col-span-3 text-slate-300">{branchName(t.branchId)}</span>
              <span className="col-span-2">
                <span className="rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-[#C5A059]">{ROLE_LABELS[t.role || "teacher"]}</span>
              </span>
              {canManage && (
                <div className="col-span-1 flex justify-end gap-1">
                  <button onClick={() => startEdit(t)} title="Редактировать" className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(t)} title="Архивировать" className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:border-red-500/40 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          );
        })}
        {teachers.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-500">Преподаватели не найдены.</p>}
      </div>
    </OwnerScreen>
  );
}

function TeacherForm({ title, form, setForm, branches, busy, onSubmit, onCancel }: {
  title: string;
  form: TeacherInput;
  setForm: (f: TeacherInput) => void;
  branches: Branch[];
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputCls = "mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";
  return (
    <div className="rounded-[2rem] border border-[#C5A059]/30 bg-[#161616] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <button onClick={onCancel} className="rounded-lg p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Имя</span>
          <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя Фамилия" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Телефон</span>
          <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 ..." className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Специализация</span>
          <input value={form.specialization || ""} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Лезгинка, ансамбль…" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Филиал</span>
          <select value={form.branchId || ""} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
            <option value="">— не назначен —</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Права (роль)</span>
          <select value={form.role || "teacher"} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
            <option value="teacher">Преподаватель</option>
            <option value="admin">Администратор</option>
            <option value="branch_manager">Управляющий филиалом</option>
            <option value="owner">Владелец</option>
          </select>
          <span className="mt-1 block text-[11px] text-slate-500">Изменение роли с «Преподаватель» переместит сотрудника из списка преподавателей в соответствующий доступ.</span>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button disabled={busy || !form.name?.trim()} onClick={onSubmit} className="rounded-2xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
        <button onClick={onCancel} className="rounded-2xl border border-white/10 px-5 py-2 text-sm font-bold text-slate-300 hover:text-white">Отмена</button>
      </div>
    </div>
  );
}

function FinanceCenterView({ branches, payments, monthRevenue, todayRevenue, debt, renewals }: any) {
  return (
    <OwnerScreen title="Финансовый центр" subtitle="Выручка по филиалам, динамика, задолженности, продления, средний чек, новые и повторные продажи.">
      <div className="grid gap-3 md:grid-cols-4">
        <OwnerKpi label="Сегодня" value={money(todayRevenue)} detail="касса сети" tone="gold" />
        <OwnerKpi label="Месяц" value={money(monthRevenue)} detail="+18% MoM" tone="gold" />
        <OwnerKpi label="Долги" value={money(debt)} detail="к взысканию" tone="rose" />
        <OwnerKpi label="Продления" value={renewals} detail="7 дней" tone="emerald" />
      </div>
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Выручка по филиалам</h3>
        <div className="mt-4 space-y-3">
          {branches.map((branch: any) => <BranchRow key={branch.branchId} branch={branch} />)}
        </div>
        <p className="mt-4 text-xs text-slate-500">Фильтры периода: день, неделя, месяц, квартал, год. Операций в демо: {payments.length}.</p>
      </section>
    </OwnerScreen>
  );
}

// ===================== БУХГАЛТЕРИЯ (управленческий учёт в стиле brizo) =====================

type AcctRow = { category: string; byMonth: number[]; total: number };
type AcctOverview = {
  accounts: { id: string; name: string; kind: string; currency: string; openingBalance: number; balance: number }[];
  categories: { id: string; name: string; kind: "income" | "expense" }[];
  cashflow: { months: string[]; incomeRows: AcctRow[]; expenseRows: AcctRow[]; incomeByMonth: number[]; expenseByMonth: number[]; netByMonth: number[] };
  pnl: { month: string; revenue: number; expense: number; profit: number; margin: number }[];
  calendar: { id: string; date: string; type: string; amount: number; category: string; account: string; counterparty: string | null; description: string | null }[];
  totals: { income: number; expense: number; profit: number; plannedIn: number; plannedOut: number; balanceTotal: number };
};
type AcctOp = { id: string; type: string; status: string; amount: number; date: string; categoryId: string | null; accountId: string | null; counterparty: string | null; description: string | null };

const RU_MON = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  return `${RU_MON[Number(mm) - 1]} ${y.slice(2)}`;
}
function accountIcon(kind: string) {
  return kind === "bank" ? Landmark : kind === "card" ? CreditCard : Wallet;
}
const ownerHdr = { headers: { "x-demo-role": "owner" } };

function BookkeepingView({ branches }: any) {
  const [tab, setTab] = useState<"overview" | "cashflow" | "pnl" | "calendar" | "ops" | "requests">("overview");
  const [data, setData] = useState<AcctOverview | null>(null);
  const [ops, setOps] = useState<AcctOp[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [oRes, opRes, reqRes] = await Promise.all([
        fetch("/api/mvp/accounting/overview", ownerHdr),
        fetch("/api/mvp/accounting/operations", ownerHdr),
        fetch("/api/mvp/accounting/expense-requests", ownerHdr),
      ]);
      if (!oRes.ok) throw new Error(await oRes.text());
      setData(await oRes.json());
      if (opRes.ok) setOps(((await opRes.json()).operations as AcctOp[]) || []);
      if (reqRes.ok) setRequests((await reqRes.json()).requests || []);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить данные бухгалтерии");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const decideRequest = async (id: string, action: "approve" | "reject", opts?: { comment?: string; accountId?: string }) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/mvp/accounting/expense-requests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: JSON.stringify({ comment: opts?.comment || null, accountId: opts?.accountId || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      setError(e?.message || "Не удалось обработать заявку");
    } finally {
      setBusy(false);
    }
  };
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const createOp = async (payload: any) => {
    setBusy(true);
    try {
      const res = await fetch("/api/mvp/accounting/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowAdd(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Не удалось создать операцию");
    } finally {
      setBusy(false);
    }
  };
  const deleteOp = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`/api/mvp/accounting/operations/${id}`, { method: "DELETE", headers: { "x-demo-role": "owner" } });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: typeof tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "overview", label: "Обзор", icon: WalletCards },
    { id: "cashflow", label: "ДДС", icon: TrendingUp },
    { id: "pnl", label: "ОПиУ / P&L", icon: BarChart3 },
    { id: "calendar", label: "Платёжный календарь", icon: CalendarClock },
    { id: "ops", label: "Операции", icon: Receipt },
    { id: "requests", label: "Заявки на расход", icon: Send, badge: pendingCount },
  ];

  return (
    <OwnerScreen title="Бухгалтерия" subtitle="Управленческий учёт сети: счета и кассы, движение денег (ДДС), прибыли и убытки (ОПиУ), платёжный календарь и реестр операций.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition ${active ? "border-[#C5A059]/50 bg-[#C5A059]/15 text-[#C5A059]" : "border-white/10 bg-[#161616] text-slate-400 hover:text-white"}`}>
                <Icon className="h-4 w-4" /> {t.label}
                {t.badge ? <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">{t.badge}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#161616] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
            <RefreshCw className="h-4 w-4" /> Обновить
          </button>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
            <Plus className="h-4 w-4" /> Операция
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
      {loading && !data && <div className="rounded-3xl border border-white/10 bg-[#121212] p-8 text-center text-sm text-slate-500">Загрузка данных бухгалтерии…</div>}

      {data && (
        <>
          {tab === "overview" && <AcctOverviewTab data={data} branches={branches} />}
          {tab === "cashflow" && <AcctCashflowTab data={data} />}
          {tab === "pnl" && <AcctPnlTab data={data} />}
          {tab === "calendar" && <AcctCalendarTab data={data} />}
          {tab === "ops" && <AcctOpsTab data={data} ops={ops} onDelete={deleteOp} busy={busy} />}
          {tab === "requests" && <AcctRequestsTab data={data} requests={requests} onDecide={decideRequest} busy={busy} />}
        </>
      )}

      {showAdd && data && (
        <AcctAddOperation categories={data.categories} accounts={data.accounts} busy={busy}
          onClose={() => setShowAdd(false)} onSubmit={createOp} />
      )}
    </OwnerScreen>
  );
}

function AcctOverviewTab({ data, branches }: { data: AcctOverview; branches: any[] }) {
  const { totals, cashflow } = data;
  const maxNet = Math.max(1, ...cashflow.netByMonth.map((v) => Math.abs(v)));
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <OwnerKpi label="Остаток на счетах" value={money(totals.balanceTotal)} detail="все кассы и банки" tone="gold" icon={Wallet} />
        <OwnerKpi label="Доходы (факт)" value={money(totals.income)} detail="за весь период" tone="emerald" icon={ArrowUpRight} />
        <OwnerKpi label="Расходы (факт)" value={money(totals.expense)} detail="за весь период" tone="rose" icon={ArrowDownRight} />
        <OwnerKpi label="Прибыль" value={money(totals.profit)} detail={`план: +${money(totals.plannedIn)} / −${money(totals.plannedOut)}`} tone={totals.profit >= 0 ? "emerald" : "rose"} icon={TrendingUp} />
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Счета и кассы</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {data.accounts.map((a) => {
            const Icon = accountIcon(a.kind);
            return (
              <div key={a.id} className="rounded-2xl border border-white/10 bg-[#161616] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400">{a.name}</p>
                  <Icon className="h-4 w-4 text-[#C5A059]" />
                </div>
                <p className="mt-2 text-xl font-black text-white">{money(a.balance)}</p>
                <p className="mt-1 text-[11px] text-slate-500">старт: {money(a.openingBalance)} · {a.currency}</p>
              </div>
            );
          })}
          {data.accounts.length === 0 && <p className="text-sm text-slate-500">Счета не заведены.</p>}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Чистый денежный поток по месяцам</h3>
        <div className="mt-4 flex items-end gap-3" style={{ height: 160 }}>
          {cashflow.months.map((m, i) => {
            const v = cashflow.netByMonth[i];
            const h = Math.round((Math.abs(v) / maxNet) * 130);
            return (
              <div key={m} className="flex flex-1 flex-col items-center justify-end gap-2">
                <span className={`text-[11px] font-bold ${v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{money(v)}</span>
                <div className={`w-full rounded-t-lg ${v >= 0 ? "bg-emerald-500/70" : "bg-rose-500/70"}`} style={{ height: `${Math.max(4, h)}px` }} />
                <span className="text-[11px] text-slate-500">{monthLabel(m)}</span>
              </div>
            );
          })}
          {cashflow.months.length === 0 && <p className="text-sm text-slate-500">Нет фактических операций.</p>}
        </div>
      </section>

      {branches && branches.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Выручка по филиалам</h3>
          <div className="mt-4 space-y-3">
            {branches.map((branch: any) => <BranchRow key={branch.branchId} branch={branch} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function AcctCashflowTab({ data }: { data: AcctOverview }) {
  const { cashflow } = data;
  const { months } = cashflow;
  if (months.length === 0) return <EmptyAcct text="Пока нет фактических операций для ДДС." />;
  const Section = ({ title, rows, totals, tone }: { title: string; rows: AcctRow[]; totals: number[]; tone: "emerald" | "rose" }) => (
    <>
      <tr className="bg-white/[0.03]">
        <td className="p-3 text-xs font-black uppercase tracking-wider text-slate-300">{title}</td>
        {totals.map((t, i) => <td key={i} className="p-3 text-right text-xs font-black text-slate-300">{money(t)}</td>)}
        <td className="p-3 text-right text-xs font-black text-slate-300">{money(totals.reduce((s, v) => s + v, 0))}</td>
      </tr>
      {rows.map((r) => (
        <tr key={title + r.category} className="border-t border-white/5">
          <td className="p-3 pl-6 text-sm text-slate-400">{r.category}</td>
          {r.byMonth.map((v, i) => <td key={i} className={`p-3 text-right text-sm ${v ? (tone === "emerald" ? "text-emerald-300" : "text-rose-300") : "text-slate-600"}`}>{v ? money(v) : "—"}</td>)}
          <td className="p-3 text-right text-sm font-bold text-white">{money(r.total)}</td>
        </tr>
      ))}
    </>
  );
  return (
    <section className="overflow-x-auto rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <h3 className="font-black text-white">Движение денежных средств (ДДС)</h3>
      <table className="mt-4 w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="p-3">Статья</th>
            {months.map((m) => <th key={m} className="p-3 text-right">{monthLabel(m)}</th>)}
            <th className="p-3 text-right">Итого</th>
          </tr>
        </thead>
        <tbody>
          <Section title="Поступления" rows={cashflow.incomeRows} totals={cashflow.incomeByMonth} tone="emerald" />
          <Section title="Выплаты" rows={cashflow.expenseRows} totals={cashflow.expenseByMonth} tone="rose" />
          <tr className="border-t-2 border-[#C5A059]/30 bg-[#C5A059]/5">
            <td className="p-3 text-sm font-black text-[#C5A059]">Чистый поток</td>
            {cashflow.netByMonth.map((v, i) => <td key={i} className={`p-3 text-right text-sm font-black ${v >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{money(v)}</td>)}
            <td className="p-3 text-right text-sm font-black text-white">{money(cashflow.netByMonth.reduce((s, v) => s + v, 0))}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function AcctPnlTab({ data }: { data: AcctOverview }) {
  if (data.pnl.length === 0) return <EmptyAcct text="Пока нет данных для отчёта о прибылях и убытках." />;
  return (
    <section className="overflow-x-auto rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <h3 className="font-black text-white">Отчёт о прибылях и убытках (ОПиУ)</h3>
      <p className="mt-1 text-xs text-slate-500">Упрощённый P&L по денежным операциям.</p>
      <table className="mt-4 w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="p-3">Месяц</th>
            <th className="p-3 text-right">Выручка</th>
            <th className="p-3 text-right">Расходы</th>
            <th className="p-3 text-right">Прибыль</th>
            <th className="p-3 text-right">Маржа</th>
          </tr>
        </thead>
        <tbody>
          {data.pnl.map((p) => (
            <tr key={p.month} className="border-t border-white/5">
              <td className="p-3 text-sm font-bold text-white">{monthLabel(p.month)}</td>
              <td className="p-3 text-right text-sm text-emerald-300">{money(p.revenue)}</td>
              <td className="p-3 text-right text-sm text-rose-300">{money(p.expense)}</td>
              <td className={`p-3 text-right text-sm font-bold ${p.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{money(p.profit)}</td>
              <td className={`p-3 text-right text-sm font-bold ${p.margin >= 0 ? "text-slate-200" : "text-rose-400"}`}>{p.margin}%</td>
            </tr>
          ))}
          <tr className="border-t-2 border-[#C5A059]/30 bg-[#C5A059]/5">
            <td className="p-3 text-sm font-black text-[#C5A059]">Итого</td>
            <td className="p-3 text-right text-sm font-black text-emerald-400">{money(data.totals.income)}</td>
            <td className="p-3 text-right text-sm font-black text-rose-400">{money(data.totals.expense)}</td>
            <td className="p-3 text-right text-sm font-black text-white">{money(data.totals.profit)}</td>
            <td className="p-3 text-right text-sm font-black text-white">{data.totals.income > 0 ? Math.round((data.totals.profit / data.totals.income) * 100) : 0}%</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function AcctCalendarTab({ data }: { data: AcctOverview }) {
  const { calendar, totals } = data;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <OwnerKpi label="Плановые поступления" value={money(totals.plannedIn)} detail="ожидается" tone="emerald" icon={ArrowUpRight} />
        <OwnerKpi label="Плановые выплаты" value={money(totals.plannedOut)} detail="к оплате" tone="rose" icon={ArrowDownRight} />
        <OwnerKpi label="Прогноз остатка" value={money(totals.balanceTotal + totals.plannedIn - totals.plannedOut)} detail="после плановых" tone={(totals.balanceTotal + totals.plannedIn - totals.plannedOut) >= 0 ? "gold" : "rose"} icon={Wallet} />
      </div>
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Платёжный календарь</h3>
        {calendar.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Плановых операций нет.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {calendar.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#161616] p-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {c.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{c.category}{c.counterparty ? ` · ${c.counterparty}` : ""}</p>
                    <p className="text-[11px] text-slate-500">{new Date(c.date).toLocaleDateString("ru-RU")} · {c.account}{c.description ? ` · ${c.description}` : ""}</p>
                  </div>
                </div>
                <p className={`text-sm font-black ${c.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>{c.type === "income" ? "+" : "−"}{money(c.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AcctOpsTab({ data, ops, onDelete, busy }: { data: AcctOverview; ops: AcctOp[]; onDelete: (id: string) => void; busy: boolean }) {
  const [filter, setFilter] = useState<"all" | "actual" | "planned">("all");
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name || "Без статьи";
  const accName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name || "—";
  const rows = ops.filter((o) => filter === "all" || o.status === filter);
  return (
    <section className="overflow-x-auto rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-black text-white">Реестр операций</h3>
        <div className="flex gap-2">
          {(["all", "actual", "planned"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${filter === f ? "border-[#C5A059]/50 bg-[#C5A059]/15 text-[#C5A059]" : "border-white/10 text-slate-400 hover:text-white"}`}>
              {f === "all" ? "Все" : f === "actual" ? "Факт" : "План"}
            </button>
          ))}
        </div>
      </div>
      <table className="mt-4 w-full min-w-[680px] border-collapse">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="p-3">Дата</th>
            <th className="p-3">Статья</th>
            <th className="p-3">Счёт</th>
            <th className="p-3">Контрагент</th>
            <th className="p-3 text-right">Сумма</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-white/5">
              <td className="p-3 text-sm text-slate-300">
                {new Date(o.date).toLocaleDateString("ru-RU")}
                {o.status === "planned" && <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">план</span>}
              </td>
              <td className="p-3 text-sm text-white">{catName(o.categoryId)}{o.description ? <span className="block text-[11px] text-slate-500">{o.description}</span> : null}</td>
              <td className="p-3 text-sm text-slate-400">{accName(o.accountId)}</td>
              <td className="p-3 text-sm text-slate-400">{o.counterparty || "—"}</td>
              <td className={`p-3 text-right text-sm font-black ${o.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>{o.type === "income" ? "+" : "−"}{money(o.amount)}</td>
              <td className="p-3 text-right">
                <button disabled={busy} onClick={() => onDelete(o.id)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400" title="Удалить">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-slate-500">Операций нет.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function AcctRequestsTab({ data, requests, onDecide, busy }: {
  data: AcctOverview; requests: any[]; onDecide: (id: string, action: "approve" | "reject", opts?: { comment?: string; accountId?: string }) => void; busy: boolean;
}) {
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const defaultAccount = data.accounts[0]?.id || "";
  const [acctFor, setAcctFor] = useState<Record<string, string>>({});
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  const Card = ({ r, actionable }: { key?: React.Key; r: any; actionable: boolean }) => (
    <div className="rounded-2xl border border-white/10 bg-[#161616] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-white">{money(r.amount)}</p>
          <p className="text-sm text-slate-300">{r.description || "Без описания"}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {r.requestedByName || "Управляющий"} · {new Date(r.createdAt).toLocaleDateString("ru-RU")}
          </p>
          {r.status === "approved" && <p className="mt-1 text-[11px] text-emerald-400">Одобрено{r.decidedBy ? ` · ${r.decidedBy}` : ""} → расход списан со счёта</p>}
          {r.status === "rejected" && <p className="mt-1 text-[11px] text-rose-400">Отклонено{r.decisionComment ? ` · ${r.decisionComment}` : ""}</p>}
        </div>
        {!actionable && (
          <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${r.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
            {r.status === "approved" ? "Одобрено" : "Отклонено"}
          </span>
        )}
      </div>
      {actionable && (
        rejectId === r.id ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input autoFocus placeholder="Причина отказа (необязательно)" value={comment} onChange={(e) => setComment(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50" />
            <button disabled={busy} onClick={() => { onDecide(r.id, "reject", { comment }); setRejectId(null); setComment(""); }}
              className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50">Отклонить</button>
            <button onClick={() => { setRejectId(null); setComment(""); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-400">Отмена</button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-slate-500">Списать со счёта:</label>
            <select value={acctFor[r.id] ?? defaultAccount} onChange={(e) => setAcctFor((m) => ({ ...m, [r.id]: e.target.value }))}
              className="rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50">
              {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button disabled={busy} onClick={() => onDecide(r.id, "approve", { accountId: acctFor[r.id] ?? defaultAccount })}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-50">
              <CheckCircle className="h-4 w-4" /> Одобрить
            </button>
            <button disabled={busy} onClick={() => { setRejectId(r.id); setComment(""); }}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-bold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
              <X className="h-4 w-4" /> Отклонить
            </button>
          </div>
        )
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-[#C5A059]" />
          <h3 className="font-black text-white">Заявки на расход от филиалов</h3>
          {pending.length > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white">{pending.length}</span>}
        </div>
        <p className="mt-1 text-xs text-slate-500">Управляющие запрашивают средства — подтвердите или отклоните. При одобрении создаётся фактический расход и списывается с выбранного счёта.</p>
        <div className="mt-4 space-y-3">
          {pending.length === 0 && <p className="text-sm text-slate-500">Новых заявок нет.</p>}
          {pending.map((r) => <Card key={r.id} r={r} actionable />)}
        </div>
      </section>

      {decided.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">История заявок</h3>
          <div className="mt-4 space-y-3">
            {decided.map((r) => <Card key={r.id} r={r} actionable={false} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function AcctAddOperation({ categories, accounts, busy, onClose, onSubmit }: {
  categories: AcctOverview["categories"]; accounts: AcctOverview["accounts"]; busy: boolean;
  onClose: () => void; onSubmit: (p: any) => void;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [status, setStatus] = useState<"actual" | "planned">("actual");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  const cats = categories.filter((c) => c.kind === type);

  const submit = () => {
    const a = Number(amount);
    if (!a || a <= 0) return;
    onSubmit({ type, status, date, amount: a, categoryId: categoryId || cats[0]?.id || null, accountId: accountId || null, counterparty, description });
  };
  const field = "w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white">Новая операция</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button key={t} onClick={() => { setType(t); setCategoryId(""); }}
                className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${type === t ? (t === "income" ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300" : "border-rose-500/50 bg-rose-500/15 text-rose-300") : "border-white/10 text-slate-400"}`}>
                {t === "income" ? "Доход" : "Расход"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={field}>
              <option value="actual">Факт</option>
              <option value="planned">План</option>
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </div>
          <input type="number" inputMode="numeric" placeholder="Сумма, ₸" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
            <option value="">— Статья —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={field}>
            <option value="">— Счёт —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input placeholder="Контрагент (необязательно)" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className={field} />
          <input placeholder="Описание (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
          <button disabled={busy || !amount} onClick={submit}
            className="w-full rounded-2xl bg-[#C5A059] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
            {busy ? "Сохранение…" : "Добавить операцию"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyAcct({ text }: { text: string }) {
  return <div className="rounded-[2rem] border border-white/10 bg-[#121212] p-8 text-center text-sm text-slate-500">{text}</div>;
}

type CompFormState = {
  title: string;
  date: string;
  location: string;
  level: "regional" | "republican";
  scope: "kazakhstan" | "cis";
  status: "registering" | "rehearsals" | "completed";
  prizePool: string;
  responsibleTeacherId: string;
  participantStudentIds: string[];
};

const emptyCompForm: CompFormState = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  location: "",
  level: "regional",
  scope: "kazakhstan",
  status: "registering",
  prizePool: "",
  responsibleTeacherId: "",
  participantStudentIds: []
};

const compStatusLabel: Record<string, { text: string; cls: string }> = {
  registering: { text: "Идёт регистрация", cls: "bg-sky-500/15 text-sky-300" },
  rehearsals: { text: "Репетиции", cls: "bg-amber-400/15 text-amber-300" },
  completed: { text: "Завершён", cls: "bg-emerald-500/15 text-emerald-300" }
};

function EventsView({ competitions, branches, students, teachers, onCreateCompetition, onUpdateCompetition, onDeleteCompetition }: {
  competitions: Competition[];
  branches: Branch[];
  students: Student[];
  teachers: Teacher[];
  onCreateCompetition?: (data: CompetitionInput) => Promise<boolean>;
  onUpdateCompetition?: (id: string, data: CompetitionInput) => Promise<boolean>;
  onDeleteCompetition?: (id: string) => Promise<boolean>;
}) {
  const canManage = Boolean(onCreateCompetition || onUpdateCompetition || onDeleteCompetition);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompFormState>(emptyCompForm);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const teacherName = (id?: string) => teachers.find((t) => t.id === id)?.name;
  const studentName = (id: string) => students.find((s) => s.id === id)?.name || "Ученик";

  const startAdd = () => { setEditingId(null); setForm(emptyCompForm); setAdding(true); };
  const startEdit = (c: Competition) => {
    setAdding(false);
    setEditingId(c.id);
    setForm({
      title: c.title,
      date: c.date,
      location: c.location,
      level: c.level,
      scope: c.scope,
      status: c.status,
      prizePool: c.prizePool || "",
      responsibleTeacherId: c.responsibleTeacherId || "",
      participantStudentIds: c.participantStudentIds || []
    });
  };
  const cancel = () => { setAdding(false); setEditingId(null); setForm(emptyCompForm); };

  const submit = async () => {
    if (!form.title.trim() || !form.location.trim()) return;
    setBusy(true);
    const payload: CompetitionInput = { ...form, responsibleTeacherId: form.responsibleTeacherId || undefined };
    const ok = adding
      ? await onCreateCompetition?.(payload)
      : editingId
        ? await onUpdateCompetition?.(editingId, payload)
        : false;
    setBusy(false);
    if (ok) cancel();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const ok = await onDeleteCompetition?.(id);
    setBusy(false);
    if (ok) setConfirmDelete(null);
  };

  return (
    <OwnerScreen title="Концерты и мероприятия" subtitle="Создавайте концерты, назначайте ответственного преподавателя и участников-учеников. Полное управление сетью.">
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{competitions.length} концертов в сети</p>
          {!adding && editingId === null && (
            <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
              <Plus className="h-4 w-4" /> Создать концерт
            </button>
          )}
        </div>
      )}

      {(adding || editingId !== null) && (
        <CompetitionForm
          title={adding ? "Новый концерт" : "Редактирование концерта"}
          form={form}
          setForm={setForm}
          teachers={teachers}
          students={students}
          busy={busy}
          onSubmit={submit}
          onCancel={cancel}
        />
      )}

      {competitions.length === 0 && !adding && (
        <div className="rounded-[2rem] border border-dashed border-white/15 bg-[#121212] p-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-[#C5A059]/60" />
          <p className="mt-3 text-sm font-bold text-white">Концертов пока нет</p>
          <p className="mt-1 text-xs text-slate-500">Нажмите «Создать концерт», чтобы добавить первое мероприятие.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {competitions.map((event) => {
          const resp = teacherName(event.responsibleTeacherId);
          const participants = event.participantStudentIds || [];
          const st = compStatusLabel[event.status] || compStatusLabel.registering;
          return (
            <article key={event.id} className="flex flex-col rounded-[2rem] border border-white/10 bg-[#121212] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#C5A059]">{event.date} • {event.location}</p>
                  <h3 className="mt-2 text-lg font-black text-white">{event.title}</h3>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${st.cls}`}>{st.text}</span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-black/25 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C5A059]/15 text-[#C5A059]"><GraduationCap className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ответственный</p>
                    <p className="truncate font-bold text-white">{resp || "Не назначен"}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/25 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Участники</p>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black text-slate-300">{participants.length}</span>
                  </div>
                  {participants.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {participants.slice(0, 8).map((sid) => (
                        <span key={sid} className="rounded-full bg-[#C5A059]/10 px-2.5 py-1 text-[11px] font-bold text-[#C5A059]">{studentName(sid)}</span>
                      ))}
                      {participants.length > 8 && <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-400">+{participants.length - 8}</span>}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Ученики ещё не назначены</p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
                  <button onClick={() => startEdit(event)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/10">
                    <Pencil className="h-3.5 w-3.5" /> Изменить
                  </button>
                  {confirmDelete === event.id ? (
                    <span className="inline-flex items-center gap-2">
                      <button onClick={() => remove(event.id)} disabled={busy} className="rounded-xl bg-rose-500/90 px-3 py-1.5 text-xs font-black text-white transition hover:bg-rose-500 disabled:opacity-50">Удалить</button>
                      <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">Отмена</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(event.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20">
                      <Trash2 className="h-3.5 w-3.5" /> Удалить
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </OwnerScreen>
  );
}

function CompetitionForm({ title, form, setForm, teachers, students, busy, onSubmit, onCancel }: {
  title: string;
  form: CompFormState;
  setForm: React.Dispatch<React.SetStateAction<CompFormState>>;
  teachers: Teacher[];
  students: Student[];
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [studentSearch, setStudentSearch] = useState("");
  const set = (patch: Partial<CompFormState>) => setForm((prev) => ({ ...prev, ...patch }));
  const toggleStudent = (id: string) => set({
    participantStudentIds: form.participantStudentIds.includes(id)
      ? form.participantStudentIds.filter((x) => x !== id)
      : [...form.participantStudentIds, id]
  });

  const filtered = students.filter((s) => s.name.toLowerCase().includes(studentSearch.trim().toLowerCase()));
  const inputCls = "w-full rounded-2xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#C5A059]/50";
  const labelCls = "text-[10px] font-black uppercase tracking-wider text-slate-500";

  return (
    <section className="rounded-[2rem] border border-[#C5A059]/25 bg-[#141414] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <button onClick={onCancel} className="rounded-xl border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 md:col-span-2">
          <span className={labelCls}>Название концерта *</span>
          <input className={inputCls} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Гала-концерт «Эхо гор»" />
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Дата</span>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Место / город *</span>
          <input className={inputCls} value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Алматы, Дворец Республики" />
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Статус</span>
          <select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value as CompFormState["status"] })}>
            <option value="registering">Идёт регистрация</option>
            <option value="rehearsals">Репетиции</option>
            <option value="completed">Завершён</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Уровень</span>
          <select className={inputCls} value={form.level} onChange={(e) => set({ level: e.target.value as CompFormState["level"] })}>
            <option value="regional">Региональный</option>
            <option value="republican">Республиканский</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Призовой фонд / награды</span>
          <input className={inputCls} value={form.prizePool} onChange={(e) => set({ prizePool: e.target.value })} placeholder="Дипломы лауреатов" />
        </label>
        <label className="space-y-1.5">
          <span className={labelCls}>Ответственный преподаватель</span>
          <select className={inputCls} value={form.responsibleTeacherId} onChange={(e) => set({ responsibleTeacherId: e.target.value })}>
            <option value="">— Не назначен —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      {/* Участники-ученики */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className={labelCls}>Участники-ученики</span>
          <span className="text-[11px] font-bold text-[#C5A059]">Выбрано: {form.participantStudentIds.length}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-slate-600 outline-none" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Поиск ученика по имени…" />
        </div>
        {form.participantStudentIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.participantStudentIds.map((id) => {
              const s = students.find((x) => x.id === id);
              return (
                <button key={id} onClick={() => toggleStudent(id)} className="inline-flex items-center gap-1 rounded-full bg-[#C5A059]/15 px-2.5 py-1 text-[11px] font-bold text-[#C5A059] transition hover:bg-[#C5A059]/25">
                  {s?.name || "Ученик"} <X className="h-3 w-3" />
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-1.5">
          {filtered.length === 0 ? (
            <p className="p-3 text-center text-xs text-slate-500">Ничего не найдено</p>
          ) : filtered.map((s) => {
            const checked = form.participantStudentIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${checked ? "bg-[#C5A059]/10 text-white" : "text-slate-300 hover:bg-white/5"}`}>
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-[#C5A059] bg-[#C5A059] text-black" : "border-white/20"}`}>{checked && <CheckCircle className="h-3 w-3" />}</span>
                  <span className="font-bold">{s.name}</span>
                </span>
                <span className="text-[11px] text-slate-500">{s.age} лет</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={onSubmit} disabled={busy || !form.title.trim() || !form.location.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-5 py-2.5 text-sm font-black text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
        <button onClick={onCancel} className="rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5">Отмена</button>
      </div>
    </section>
  );
}

// ─────────────── Афиша СНГ: парсенные турниры и концерты кавказского танца ───

type DanceEvent = {
  id: string;
  event_type: "tournament" | "concert";
  audience: "kids" | "adults" | "all";
  title: string;
  organizer: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  reg_deadline: string | null;
  age_categories: string | null;
  price: string | null;
  url: string | null;
  image: string | null;
  source: string;
  status: "new" | "published" | "hidden";
};

const COUNTRY_LABEL: Record<string, string> = {
  KZ: "🇰🇿 Казахстан", RU: "🇷🇺 Россия", UZ: "🇺🇿 Узбекистан", KG: "🇰🇬 Кыргызстан",
  TJ: "🇹🇯 Таджикистан", BY: "🇧🇾 Беларусь", AZ: "🇦🇿 Азербайджан", GE: "🇬🇪 Грузия", AM: "🇦🇲 Армения",
};

const AUDIENCE_LABEL: Record<DanceEvent["audience"], string> = { kids: "Дети", adults: "Взрослые", all: "Все" };

function fmtDate(start: string | null, end: string | null): string {
  if (!start) return "Дата уточняется";
  const f = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}.${m}.${y}`;
  };
  return end && end !== start ? `${f(start)} — ${f(end)}` : f(start);
}

const ownerHeaders = { "Content-Type": "application/json", "x-demo-role": "owner" };

function DanceEventsFeedView() {
  const [events, setEvents] = useState<DanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"" | "tournament" | "concert">("");
  const [audience, setAudience] = useState<"" | "kids" | "adults">("");
  const [country, setCountry] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (audience) params.set("audience", audience);
      if (country) params.set("country", country);
      const res = await fetch(`/api/mvp/dance-events?${params.toString()}`, { headers: ownerHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
      setEvents(data.events || []);
    } catch (e: any) {
      setError(e.message || "Не удалось загрузить афишу");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type, audience, country]);

  const runParse = async () => {
    setParsing(true);
    setParseMsg(null);
    try {
      // Кнопка гоняет только быстрый Ticketon (SSR). Тяжёлый Kassir (JS-рендеринг) — в ночном cron.
      const res = await fetch("/api/mvp/dance-events/parse", {
        method: "POST", headers: ownerHeaders, body: JSON.stringify({ sources: ["ticketon"] }),
      });
      const text = await res.text();
      let r: any;
      try { r = JSON.parse(text); } catch {
        throw new Error(res.status === 504 || /timeout|error occurred/i.test(text)
          ? "Источник долго отвечает (таймаут). Полный сбор идёт ночью по расписанию."
          : `Сервер вернул не-JSON (${res.status}).`);
      }
      if (!res.ok) throw new Error(r.error || "Парсинг не выполнен");
      setParseMsg(`Найдено: ${r.matched}, добавлено/обновлено: ${r.upserted} (турниров ${r.byType?.tournament ?? 0}, концертов ${r.byType?.concert ?? 0}).`);
      await load();
    } catch (e: any) {
      setParseMsg(`Ошибка парсинга: ${e.message}`);
    } finally {
      setParsing(false);
    }
  };

  const setStatus = async (ev: DanceEvent, status: DanceEvent["status"]) => {
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, status } : x)));
    try {
      await fetch(`/api/mvp/dance-events/${ev.id}`, {
        method: "PATCH", headers: ownerHeaders, body: JSON.stringify({ status }),
      });
    } catch { await load(); }
  };

  const counts = useMemo(() => ({
    total: events.length,
    tournaments: events.filter((e) => e.event_type === "tournament").length,
    concerts: events.filter((e) => e.event_type === "concert").length,
  }), [events]);

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
        active ? "bg-[#C5A059] text-black" : "border border-white/10 bg-black/25 text-slate-300 hover:border-[#C5A059]/40"
      }`}
    >
      {children}
    </button>
  );

  return (
    <OwnerScreen
      title="Афиша СНГ — турниры и концерты"
      subtitle="Турниры (дети/взрослые) и концерты кавказского танца из билетных систем и федераций. Запустите парсинг, чтобы обновить афишу."
    >
      {/* Панель управления */}
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runParse}
            disabled={parsing}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${parsing ? "animate-spin" : ""}`} />
            {parsing ? "Парсинг…" : "Обновить афишу"}
          </button>
          <span className="text-xs text-slate-400">
            Всего {counts.total} · турниров {counts.tournaments} · концертов {counts.concerts}
          </span>
        </div>
        {parseMsg && <p className="mt-3 text-xs text-[#C5A059]">{parseMsg}</p>}
      </section>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <Chip active={type === ""} onClick={() => setType("")}>Все типы</Chip>
        <Chip active={type === "tournament"} onClick={() => setType("tournament")}>Турниры</Chip>
        <Chip active={type === "concert"} onClick={() => setType("concert")}>Концерты</Chip>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <Chip active={audience === ""} onClick={() => setAudience("")}>Любой возраст</Chip>
        <Chip active={audience === "kids"} onClick={() => setAudience("kids")}>Дети</Chip>
        <Chip active={audience === "adults"} onClick={() => setAudience("adults")}>Взрослые</Chip>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-bold text-slate-300"
        >
          <option value="">Все страны</option>
          {Object.entries(COUNTRY_LABEL).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      {/* Список */}
      {loading ? (
        <p className="text-sm text-slate-400">Загрузка…</p>
      ) : error ? (
        <div className="rounded-[2rem] border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div>
      ) : events.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-[#121212] p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">Событий пока нет. Нажмите «Обновить афишу», чтобы собрать данные.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {events.map((ev) => (
            <article
              key={ev.id}
              className={`rounded-[2rem] border bg-[#121212] p-5 transition ${
                ev.status === "hidden" ? "border-white/5 opacity-50" : "border-white/10"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  ev.event_type === "tournament" ? "bg-[#C5A059]/20 text-[#C5A059]" : "bg-emerald-500/15 text-emerald-300"
                }`}>
                  {ev.event_type === "tournament" ? "Турнир" : "Концерт"}
                </span>
                {ev.event_type === "tournament" && (
                  <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-300">
                    {AUDIENCE_LABEL[ev.audience]}
                  </span>
                )}
                {ev.status === "published" && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">Опубликовано</span>
                )}
              </div>

              <h3 className="mt-3 text-lg font-black leading-snug text-white">{ev.title}</h3>

              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-[#C5A059]" />{fmtDate(ev.start_date, ev.end_date)}</p>
                {(ev.city || ev.country) && (
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#C5A059]" />
                    {[ev.city, ev.country ? (COUNTRY_LABEL[ev.country] || ev.country) : null].filter(Boolean).join(", ")}
                  </p>
                )}
                {ev.organizer && <p>Организатор: {ev.organizer}</p>}
                {ev.reg_deadline && <p>Регистрация до: {fmtDate(ev.reg_deadline, null)}</p>}
                {ev.age_categories && <p>Категории: {ev.age_categories}</p>}
                {ev.price && <p className="flex items-center gap-2"><Ticket className="h-3.5 w-3.5 text-[#C5A059]" />{ev.price}</p>}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-bold text-slate-200 hover:border-[#C5A059]/40"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Источник ({ev.source})
                  </a>
                )}
                {ev.status !== "published" ? (
                  <button onClick={() => setStatus(ev, "published")} className="rounded-xl bg-emerald-500/15 px-3 py-2 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25">Опубликовать</button>
                ) : (
                  <button onClick={() => setStatus(ev, "new")} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-bold text-slate-300">Снять с публикации</button>
                )}
                {ev.status !== "hidden" ? (
                  <button onClick={() => setStatus(ev, "hidden")} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-rose-300">Скрыть</button>
                ) : (
                  <button onClick={() => setStatus(ev, "new")} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-bold text-slate-300">Вернуть</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </OwnerScreen>
  );
}

const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: "all", label: "Вся сеть" },
  { value: "branches", label: "Филиалы" },
  { value: "teachers", label: "Преподаватели" },
  { value: "parents", label: "Родители" },
  { value: "students", label: "Ученики" },
];

function audienceLabel(a: AnnouncementAudience) {
  return AUDIENCE_OPTIONS.find((o) => o.value === a)?.label ?? a;
}

type AnnFormState = { title: string; content: string; audience: AnnouncementAudience; isImportant: boolean };
const emptyForm = (): AnnFormState => ({ title: "", content: "", audience: "all", isImportant: false });

function OwnerAnnouncementsView({
  announcements,
  branches,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
}: {
  announcements: Announcement[];
  branches: Branch[];
  onCreateAnnouncement?: (data: AnnFormState) => void;
  onUpdateAnnouncement?: (id: string, data: Partial<AnnFormState>) => void;
  onDeleteAnnouncement?: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnFormState>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setShowForm(true); };
  const openEdit = (ann: Announcement) => {
    setForm({ title: ann.title, content: ann.content, audience: ann.audience ?? "all", isImportant: ann.isImportant });
    setEditId(ann.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    if (editId) { onUpdateAnnouncement?.(editId, form); }
    else { onCreateAnnouncement?.(form); }
    closeForm();
  };

  return (
    <OwnerScreen title="Объявления владельца" subtitle="Публикации всей сети, филиалам, преподавателям, родителям и ученикам.">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Филиалов: {branches.length}. Всего объявлений: {announcements.length}.</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Новое объявление
        </button>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#141414] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-white">{editId ? "Редактировать объявление" : "Новое объявление"}</h3>
              <button onClick={closeForm} className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Audience */}
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Кому</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, audience: opt.value }))}
                      className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${
                        form.audience === opt.value
                          ? "border-[#C5A059] bg-[#C5A059]/20 text-[#C5A059]"
                          : "border-white/10 bg-black/25 text-slate-300 hover:border-white/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Заголовок</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Заголовок объявления"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#C5A059]/60"
                />
              </div>
              {/* Content */}
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-400">Текст</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Текст объявления..."
                  rows={4}
                  required
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#C5A059]/60"
                />
              </div>
              {/* Important toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm((f) => ({ ...f, isImportant: !f.isImportant }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${form.isImportant ? "bg-[#C5A059]" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isImportant ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm text-slate-300">Срочное / важное</span>
              </label>
              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-slate-300 hover:bg-white/5">Отмена</button>
                <button type="submit" className="flex-1 rounded-2xl bg-[#C5A059] py-3 text-sm font-black text-black hover:opacity-90">
                  {editId ? "Сохранить" : "Опубликовать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#141414] p-6 shadow-2xl text-center">
            <Trash2 className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <h3 className="text-base font-black text-white mb-2">Удалить объявление?</h3>
            <p className="text-xs text-slate-400 mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-slate-300 hover:bg-white/5">Отмена</button>
              <button
                onClick={() => { onDeleteAnnouncement?.(deleteId); setDeleteId(null); }}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-black text-white hover:bg-red-600"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="rounded-[2rem] border border-white/5 bg-white/5 p-10 text-center text-slate-500">
          <Megaphone className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm">Нет объявлений. Создайте первое!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-[2rem] border p-5 ${ann.isImportant ? "border-[#C5A059]/30 bg-[#C5A059]/8" : "border-white/8 bg-white/3"}`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${ann.isImportant ? "bg-[#C5A059]/20 text-[#C5A059]" : "bg-white/8 text-slate-400"}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {ann.isImportant && (
                      <span className="rounded-lg bg-[#C5A059]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#C5A059]">Срочно</span>
                    )}
                    <span className="rounded-lg bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-400">{audienceLabel(ann.audience ?? "all")}</span>
                    <span className="text-[10px] text-slate-500">{ann.date}</span>
                  </div>
                  <h4 className="font-black text-white text-sm leading-snug">{ann.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400 line-clamp-3">{ann.content}</p>
                  <p className="mt-2 text-[10px] text-slate-500">{ann.authorName} · {ann.authorRole}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openEdit(ann)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:border-[#C5A059]/50 hover:text-[#C5A059] transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(ann.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:border-red-400/50 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerScreen>
  );
}

function AnalyticsKpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-[2rem] border p-5 ${accent ? "border-[#C5A059]/30 bg-[#C5A059]/8" : "border-white/8 bg-white/3"}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${accent ? "text-[#C5A059]" : "text-white"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function AnalyticsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

const GOLD = "#C5A059";
const CHART_COLORS = ["#C5A059", "#7B6B3A", "#A08840", "#D4B870", "#8A7030"];

function ExecutiveAnalyticsView({
  branches, groups, teachers, students, payments, metrics
}: {
  branches: any[];
  groups: Group[];
  teachers: Teacher[];
  students: Student[];
  payments: Payment[];
  metrics: ExecutiveSummary;
}) {
  // ── Computed values ──────────────────────────────────────────────
  const paidPayments = payments.filter((p) => p.status === "paid");

  const totalDebt = Math.abs(
    students.filter((s) => s.balance < 0).reduce((sum, s) => sum + s.balance, 0)
  );

  const avgCheck = paidPayments.length
    ? Math.round(paidPayments.reduce((sum, p) => sum + p.amount, 0) / paidPayments.length)
    : 0;

  const atRiskCount = students.filter((s) =>
    s.subscriptions.some((sub) => sub.lessonsLeft <= 2 && sub.status === "active")
  ).length;

  const groupsOverloaded = groups.filter((g) => g.studentCount >= 12).length;
  const groupsUnderloaded = groups.filter((g) => g.studentCount <= 4).length;

  // Branch bar chart data
  const branchChartData = metrics.branchMetrics.map((b) => ({
    name: b.branchName.length > 10 ? b.branchName.slice(0, 10) + "…" : b.branchName,
    fullName: b.branchName,
    revenue: Math.round(b.revenue / 1000), // в тысячах
    students: b.studentsCount,
    attendance: b.attendanceRate,
  }));

  // Payment type breakdown
  const payByType: Record<string, number> = {};
  paidPayments.forEach((p) => {
    const label =
      p.type === "subscription" ? "Абонементы" :
      p.type === "concert" ? "Концерты" :
      p.type === "uniform" ? "Форма" : "Разовые";
    payByType[label] = (payByType[label] || 0) + p.amount;
  });
  const payTypeData = Object.entries(payByType).map(([name, value]) => ({ name, value: Math.round(value / 1000) }));

  // Teacher performance data
  const teacherData = metrics.teacherPerformance
    .filter((t) => t.studentsCount > 0)
    .sort((a, b) => b.studentsCount - a.studentsCount);

  const attendanceColor = (rate: number) =>
    rate >= 80 ? "text-emerald-400" : rate >= 60 ? "text-yellow-400" : "text-red-400";

  const retentionColor = (rate: number) =>
    rate >= 80 ? "text-emerald-400" : rate >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <OwnerScreen title="Аналитика сети" subtitle="Реальные данные — ученики, выручка, посещаемость, загрузка преподавателей и групп.">

      {/* KPI cards */}
      <AnalyticsSection title="Ключевые показатели">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnalyticsKpiCard label="Учеников в сети" value={String(metrics.activeStudentsTotal)} sub={`Активных абонементов: ${metrics.activeSubscriptionsCount}`} accent />
          <AnalyticsKpiCard label="Посещаемость" value={`${metrics.overallAttendanceRate}%`} sub="По всем филиалам и группам" />
          <AnalyticsKpiCard label="Отток" value={`${metrics.churnRate}%`} sub="Без активного абонемента" />
          <AnalyticsKpiCard label="Выручка месяца" value={money(metrics.thisMonthRevenue)} sub={`Сегодня: ${money(metrics.todayRevenue)}`} accent />
          <AnalyticsKpiCard label="Средний чек" value={avgCheck ? money(avgCheck) : "—"} sub={`Платежей: ${paidPayments.length}`} />
          <AnalyticsKpiCard label="Долги сети" value={money(totalDebt)} sub={`Под риском ухода: ${atRiskCount} уч.`} />
        </div>
      </AnalyticsSection>

      {/* Branch revenue chart */}
      {branchChartData.length > 0 && (
        <AnalyticsSection title="Выручка по филиалам (тыс. ₸)">
          <div className="rounded-[2rem] border border-white/8 bg-white/3 p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={branchChartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem", color: "#fff", fontSize: 12 }}
                  formatter={(v: any, _name: any, props: any) => [`${v} тыс. ₸`, props.payload.fullName]}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                  {branchChartData.map((_entry, i) => (
                    <Cell key={i} fill={i === 0 ? GOLD : CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsSection>
      )}

      {/* Branch attendance chart */}
      {branchChartData.length > 0 && (
        <AnalyticsSection title="Посещаемость по филиалам (%)">
          <div className="rounded-[2rem] border border-white/8 bg-white/3 p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={branchChartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem", color: "#fff", fontSize: 12 }}
                  formatter={(v: any, _name: any, props: any) => [`${v}%`, props.payload.fullName]}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="attendance" radius={[8, 8, 0, 0]}>
                  {branchChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.attendance >= 80 ? "#34d399" : entry.attendance >= 60 ? "#fbbf24" : "#f87171"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsSection>
      )}

      {/* Payment type breakdown */}
      {payTypeData.length > 0 && (
        <AnalyticsSection title="Структура выручки (тыс. ₸)">
          <div className="rounded-[2rem] border border-white/8 bg-white/3 p-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={payTypeData} layout="vertical" margin={{ top: 0, right: 16, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem", color: "#fff", fontSize: 12 }}
                  formatter={(v: any) => [`${v} тыс. ₸`]}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {payTypeData.map((_entry, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsSection>
      )}

      {/* Teacher performance table */}
      {teacherData.length > 0 && (
        <AnalyticsSection title="Эффективность преподавателей">
          <div className="overflow-hidden rounded-[2rem] border border-white/8 bg-white/3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Преподаватель</th>
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Учеников</th>
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Удержание</th>
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Посещ.</th>
                </tr>
              </thead>
              <tbody>
                {teacherData.map((t, i) => (
                  <tr key={t.teacherId} className={i < teacherData.length - 1 ? "border-b border-white/5" : ""}>
                    <td className="px-5 py-3 font-semibold text-white">{t.teacherName}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{t.studentsCount}</td>
                    <td className={`px-4 py-3 text-center font-bold ${retentionColor(t.retentionRate)}`}>{t.retentionRate}%</td>
                    <td className={`px-4 py-3 text-center font-bold ${attendanceColor(t.averageAttendance)}`}>{t.averageAttendance}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsSection>
      )}

      {/* Groups overview */}
      <AnalyticsSection title="Группы">
        <div className="grid gap-3 sm:grid-cols-3">
          <AnalyticsKpiCard label="Всего групп" value={String(groups.length)} sub="По всей сети" />
          <AnalyticsKpiCard label="Перегружены" value={String(groupsOverloaded)} sub="≥ 12 учеников" />
          <AnalyticsKpiCard label="Требуют набора" value={String(groupsUnderloaded)} sub="≤ 4 ученика" />
        </div>
      </AnalyticsSection>

    </OwnerScreen>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
};
const SEVERITY_LABEL: Record<string, string> = { high: "Высокий", medium: "Средний", low: "Низкий" };

function OwnerAiView({ branches, renewals, debt, aiResult, aiGenerating, onTriggerAiReport }: any) {
  return (
    <OwnerScreen title="AI Executive Assistant" subtitle="Анализирует всю сеть и выдаёт управленческие инсайты: риски филиалов, рекомендации роста, ключевые выводы.">
      {/* Trigger card */}
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-gradient-to-br from-[#2A2110] to-[#101010] p-5 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Сводка владельца</p>
            <h2 className="mt-1 text-xl font-black text-white md:text-2xl">
              {aiResult ? "Отчёт сгенерирован" : "Запустить AI-анализ сети"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {aiResult
                ? "Данные актуальны на момент последней генерации. Нажмите ещё раз для обновления."
                : `Данные: ${branches.length} филиалов, ${renewals} продлений на этой неделе, задолженность ${money(debt)}.`}
            </p>
          </div>
          <button
            onClick={onTriggerAiReport}
            disabled={aiGenerating}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#C5A059] px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#d4b06a] disabled:opacity-60"
          >
            {aiGenerating ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Анализирую…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {aiResult ? "Обновить отчёт" : "Сгенерировать отчёт"}
              </>
            )}
          </button>
        </div>
      </section>

      {/* Loading state */}
      {aiGenerating && !aiResult && (
        <section className="flex flex-col items-center gap-3 rounded-[2rem] border border-white/10 bg-[#111] py-12 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#C5A059]" />
          <p className="text-xs text-slate-400">Анализирую сеть филиалов…</p>
        </section>
      )}

      {/* Results */}
      {aiResult && (
        <div className="space-y-4">
          {/* Executive summary */}
          <section className="rounded-[2rem] border border-white/10 bg-[#111] p-5 md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Резюме AI советника</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{aiResult.executiveSummary}</p>
          </section>

          {/* Branch risks */}
          {aiResult.branchRisks?.length > 0 && (
            <section className="rounded-[2rem] border border-white/10 bg-[#111] p-5 md:p-6">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Риски филиалов</p>
              <div className="grid gap-3 md:grid-cols-2">
                {aiResult.branchRisks.map((risk: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-white">{risk.riskTitle}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${SEVERITY_STYLES[risk.severity] || SEVERITY_STYLES.low}`}>
                        {SEVERITY_LABEL[risk.severity] || risk.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{risk.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Growth recommendations */}
          {aiResult.growthRecommendations?.length > 0 && (
            <section className="rounded-[2rem] border border-white/10 bg-[#111] p-5 md:p-6">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Рекомендации роста</p>
              <ul className="space-y-2">
                {aiResult.growthRecommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
                    {rec}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Insights */}
          {aiResult.insights?.length > 0 && (
            <section className="rounded-[2rem] border border-white/10 bg-[#111] p-5 md:p-6">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Ключевые выводы</p>
              <div className="grid gap-3 md:grid-cols-2">
                {aiResult.insights.map((insight: string, i: number) => (
                  <div key={i} className="rounded-2xl border border-[#C5A059]/10 bg-[#C5A059]/5 p-4">
                    <p className="text-sm leading-relaxed text-slate-200">{insight}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty state when not yet generated */}
      {!aiResult && !aiGenerating && (
        <section className="rounded-[2rem] border border-white/10 bg-[#111] p-5 md:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Быстрая сводка</p>
          <h2 className="mt-2 text-xl font-black text-white">Текущее состояние сети</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Insight severity="Филиал" text={`${branches.find((b: any) => b.status !== "healthy")?.city || branches[0]?.city || "—"} требует внимания: отслеживайте посещаемость.`} />
            <Insight severity="Абонементы" text={`${renewals} абонементов заканчиваются в течение недели.`} />
            <Insight severity="Финансы" text={`Задолженность сети: ${money(debt)}. AI рекомендует кампанию напоминаний.`} />
            <Insight severity="Рост" text="Нажмите «Сгенерировать отчёт» для персонализированного AI-анализа." />
          </div>
        </section>
      )}
    </OwnerScreen>
  );
}

function NetworkSettingsView({ branches, teachers }: { branches: Branch[]; teachers: Teacher[] }) {
  return (
    <OwnerScreen title="Настройки сети" subtitle="Филиалы, роли, права доступа, тарифы, шаблоны, audit log, интеграции и лицензия.">
      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutivePanel icon={<Shield />} title="RBAC владельца" text="Полный доступ к сети, филиалам, финансам, ролям, настройкам, лицензии и audit log." />
        <ExecutivePanel icon={<Settings />} title="Глобальные настройки" text={`Филиалов: ${branches.length}. Преподавателей: ${teachers.length}. Управление тарифами и шаблонами уведомлений.`} />
        <ExecutivePanel icon={<CheckCircle />} title="Защищенные действия" text="Удаление филиалов, экспорт данных и доступ к чувствительным данным проходят через подтверждение и журналирование." />
        <ExecutivePanel icon={<Activity />} title="Audit log сети" text="Все действия владельца, руководителей филиалов, администраторов и преподавателей фиксируются." />
      </div>
    </OwnerScreen>
  );
}

function OwnerScreen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">CEO Network Command</p>
        <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function OwnerNavButton({ tab, active, onClick }: { key?: React.Key; tab: any; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition ${active ? "border border-[#C5A059]/25 bg-[#C5A059]/10 text-[#C5A059]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
      <Icon className="h-4 w-4" />
      <span>{tab.label}</span>
    </button>
  );
}

function OwnerMobileNav({ tab, active, onClick }: { key?: React.Key; tab: any; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-black uppercase ${active ? "text-[#C5A059]" : "text-slate-500"}`}>
      <Icon className="h-5 w-5" />
      <span>{tab.short}</span>
    </button>
  );
}

function OwnerKpi({ label, value, detail, tone = "white", icon: Icon, onClick, compact = false }: { key?: React.Key; label: string; value: React.ReactNode; detail: string; tone?: string; icon?: React.ElementType; onClick?: () => void; compact?: boolean }) {
  const color = tone === "gold" ? "text-[#C5A059]" : tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : "text-white";
  const interactive = onClick ? "cursor-pointer hover:border-[#C5A059]/40 hover:bg-[#1b1b1b]" : "";
  return (
    <section onClick={onClick} className={`group rounded-3xl border border-white/10 bg-[#161616] p-4 transition ${interactive}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-600 transition group-hover:text-[#C5A059]" />}
      </div>
      <p className={`mt-2 font-black ${compact ? "text-xl" : "text-2xl"} ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function Insight({ severity, text }: { key?: React.Key; severity: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#C5A059]">{severity}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-200">{text}</p>
    </div>
  );
}

function BranchRow({ branch }: { key?: React.Key; branch: any }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/25 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <BranchStatus status={branch.status} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{branch.city}</p>
          <p className="truncate text-xs text-slate-500">{branch.studentsCount} учеников • {branch.retention}% удержание</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-[#C5A059]">{money(branch.revenue)}</p>
        <p className="text-[10px] text-slate-500">{branch.attendanceRate}% посещ.</p>
      </div>
    </div>
  );
}

function BranchStatus({ status }: { status: "healthy" | "warning" | "critical" }) {
  const styles = {
    healthy: "bg-emerald-400 shadow-emerald-400/40",
    warning: "bg-amber-400 shadow-amber-400/40",
    critical: "bg-rose-500 shadow-rose-500/40"
  };
  return <span className={`h-3 w-3 shrink-0 rounded-full shadow-lg ${styles[status]}`} />;
}

function ExecutivePanel({ icon, title, text, onClick }: { key?: React.Key; icon: React.ReactNode; title: string; text: string; onClick?: () => void }) {
  const interactive = onClick ? "cursor-pointer transition hover:border-[#C5A059]/30 hover:bg-[#161616]" : "";
  return (
    <section onClick={onClick} className={`group rounded-[2rem] border border-white/10 bg-[#121212] p-5 ${interactive}`}>
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">{icon}</div>
        {onClick && <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-[#C5A059]" />}
      </div>
      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
    </section>
  );
}

function OwnerAction({ icon: Icon, label, primary = false }: { icon: React.ElementType; label: string; primary?: boolean }) {
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-wider transition ${primary ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function OwnerStatus({ text, warning = false }: { text: string; warning?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${warning ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
      {text}
    </span>
  );
}

function OwnerMiniTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      <div className="border-b border-white/10 px-3 py-2">
        <p className="text-xs font-black text-white">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500">
            <tr>{headers.map((header) => <th key={header} className="p-2 font-black">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-white/5">
                {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className={`p-2 ${cellIndex === 0 ? "font-bold text-white" : "text-slate-400"}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OwnerAreaButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${active ? "bg-[#C5A059] text-black" : "border border-white/10 bg-black/25 text-slate-300 hover:bg-white/10"}`}
    >
      {label}
    </button>
  );
}

function OwnerEduAccordion({ title, text, items, open, onToggle }: { key?: React.Key; title: string; text: string; items: string[]; open: boolean; onToggle: () => void }) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/25">
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-white/[0.03]">
        <div>
          <h4 className="text-base font-black text-white">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
        </div>
        <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-[#C5A059] transition ${open ? "rotate-180 bg-[#C5A059]/10" : "bg-white/[0.03]"}`}>
          <ChevronDown className="h-4 w-4" />
        </div>
      </button>
      {open && (
        <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <button key={item} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121212] px-3 py-3 text-left transition hover:border-[#C5A059]/40 hover:bg-[#C5A059]/10">
              <span>
                <span className="block text-xs font-black text-slate-100">{item}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Раздел #{index + 1}</span>
              </span>
              <span className="rounded-full bg-[#C5A059]/10 px-2 py-1 text-[9px] font-black uppercase text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-black">Открыть</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function OwnerEduAreaPreview({ activeArea, branches, teachers, groups, payments, debt, monthRevenue }: {
  activeArea: "reports" | "employees" | "directories";
  branches: Branch[];
  teachers: Teacher[];
  groups: Group[];
  payments: Payment[];
  debt: number;
  monthRevenue: number;
}) {
  if (activeArea === "employees") {
    const rows = teachers.slice(0, 5).map((teacher, index) => [
      teacher.name,
      branches[index % Math.max(branches.length, 1)]?.city || "Филиал",
      `${groups.filter((group) => group.teacherId === teacher.id).length || index + 2}`,
      index % 2 === 0 ? "Активен" : "Нужна проверка"
    ]);

    return (
      <aside className="rounded-[1.5rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Срез сотрудников</p>
        <h4 className="mt-1 text-lg font-black text-white">Кого видит владелец</h4>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniMetric label="Сотрудники" value={teachers.length} />
          <MiniMetric label="Преподаватели" value={teachers.length} />
          <MiniMetric label="Админы" value="7" />
          <MiniMetric label="Руководители" value={branches.length} />
        </div>
        <OwnerMiniTable title="Сотрудники сети" headers={["ФИО", "Филиал", "Групп", "Статус"]} rows={rows} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <OwnerAction icon={UserRound} label="Добавить" primary />
          <OwnerAction icon={Shield} label="Права" />
        </div>
      </aside>
    );
  }

  if (activeArea === "directories") {
    return (
      <aside className="rounded-[1.5rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Справочники</p>
        <h4 className="mt-1 text-lg font-black text-white">Настройки EduERP-ядра</h4>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniMetric label="Филиалы" value={branches.length} />
          <MiniMetric label="Группы" value={groups.length} />
          <MiniMetric label="Абонементы" value="9" />
          <MiniMetric label="Шаблоны" value="24" />
        </div>
        <OwnerMiniTable
          title="Последние изменения"
          headers={["Раздел", "Действие", "Статус"]}
          rows={[
            ["Абонементы", "Цена обновлена", "Активно"],
            ["Группы", "Добавлена группа", "Готово"],
            ["Рассылки", "Шаблон счета", "Проверка"]
          ]}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <OwnerAction icon={Settings} label="Настроить" primary />
          <OwnerAction icon={FileText} label="Audit log" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-[1.5rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Отчеты сети</p>
      <h4 className="mt-1 text-lg font-black text-white">Быстрый BI-срез</h4>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniMetric label="Месяц" value={money(monthRevenue)} />
        <MiniMetric label="Долги" value={money(debt)} />
        <MiniMetric label="Операций" value={payments.length} />
        <MiniMetric label="Отчетов" value="24" />
      </div>
      <OwnerMiniTable
        title="Популярные отчеты"
        headers={["Отчет", "Период", "Экспорт"]}
        rows={[
          ["Выручка и потери", "Месяц", "XLSX"],
          ["Посещаемость", "Неделя", "CSV"],
          ["Реестр операций", "Сегодня", "XLSX"]
        ]}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <OwnerAction icon={BarChart3} label="Сформировать" primary />
        <OwnerAction icon={FileSpreadsheet} label="Экспорт" />
      </div>
    </aside>
  );
}

function OwnerEduErpColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">EduERP</p>
      <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
            <span className="text-xs font-bold text-slate-200">{item}</span>
            <span className="text-[10px] font-black uppercase text-[#C5A059]">Открыть</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BookIconFallback() {
  return <CalendarDays className="h-6 w-6" />;
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

// ─────────────────────────── Schedule helpers ───────────────────────────────
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_GEN = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const GRID_START = 8;  // первый час сетки
const GRID_END = 22;   // последний час сетки
const HOUR_H = 58;     // высота часовой строки, px

// Палитра карточек — стабильный цвет на каждую группу (тёмная тема + золото)
const LESSON_PALETTE = [
  { bg: "bg-emerald-500/10", br: "border-emerald-400/25", ac: "bg-emerald-400", tx: "text-emerald-300", bar: "bg-emerald-400" },
  { bg: "bg-sky-500/10", br: "border-sky-400/25", ac: "bg-sky-400", tx: "text-sky-300", bar: "bg-sky-400" },
  { bg: "bg-violet-500/10", br: "border-violet-400/25", ac: "bg-violet-400", tx: "text-violet-300", bar: "bg-violet-400" },
  { bg: "bg-amber-500/10", br: "border-amber-400/25", ac: "bg-amber-400", tx: "text-amber-300", bar: "bg-amber-400" },
  { bg: "bg-rose-500/10", br: "border-rose-400/25", ac: "bg-rose-400", tx: "text-rose-300", bar: "bg-rose-400" },
  { bg: "bg-teal-500/10", br: "border-teal-400/25", ac: "bg-teal-400", tx: "text-teal-300", bar: "bg-teal-400" },
  { bg: "bg-[#C5A059]/12", br: "border-[#C5A059]/30", ac: "bg-[#C5A059]", tx: "text-[#C5A059]", bar: "bg-[#C5A059]" },
];
function paletteFor(key: string) {
  let h = 0;
  for (let i = 0; i < (key || "").length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return LESSON_PALETTE[h % LESSON_PALETTE.length];
}
const HALL_BARS = ["bg-emerald-400", "bg-amber-400", "bg-violet-400", "bg-sky-400", "bg-rose-400", "bg-teal-400"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Пн = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - dow);
  return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function hourFloat(d: Date) { return d.getHours() + d.getMinutes() / 60; }
function hhmm(d: Date) { return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

// Раскладка пересекающихся занятий по «дорожкам» внутри одного дня
function layoutDay(items: any[]) {
  const sorted = [...items].sort((a, b) => a._start - b._start);
  const laneEnds: number[] = [];
  const placed = sorted.map((l) => {
    let lane = laneEnds.findIndex((end) => end <= l._start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(l._end); } else { laneEnds[lane] = l._end; }
    return { ...l, _lane: lane };
  });
  return { placed, laneCount: Math.max(1, laneEnds.length) };
}

function OwnerScheduleView({ branches, groups, teachers, halls, scheduleItems, scheduleLoading, onLoadSchedule, onCreateGroup, onUpdateGroup, onDeleteGroup, onCreateLesson, onUpdateLesson, onDeleteLesson }: any) {
  const today = new Date();
  const todayIso = isoDate(today);

  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [activeForm, setActiveForm] = useState<"lesson" | "group" | null>(null);
  const [showGroups, setShowGroups] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterHallId, setFilterHallId] = useState("");
  const [lessonForm, setLessonForm] = useState({ groupId: "", startsAt: "", endsAt: "", teacherId: "", hallId: "", topic: "" });
  const [groupForm, setGroupForm] = useState({ name: "", branchId: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", level: "Начинающие", scheduleDays: "", scheduleTime: "" });
  const [saving, setSaving] = useState(false);

  // Видимый диапазон по выбранному режиму
  const range = useMemo(() => {
    if (view === "day") return { from: anchor, to: anchor, days: [anchor] };
    if (view === "week") {
      const s = startOfWeek(anchor);
      const days = Array.from({ length: 7 }, (_, i) => addDays(s, i));
      return { from: s, to: addDays(s, 6), days };
    }
    // month
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: gridStart, to: addDays(startOfWeek(last), 6), days };
  }, [view, anchor]);

  const rangeKey = `${isoDate(range.from)}_${isoDate(range.to)}_${filterBranchId}`;
  useEffect(() => {
    if (onLoadSchedule) onLoadSchedule({ from: isoDate(range.from), to: isoDate(addDays(range.to, 1)), branchId: filterBranchId || undefined });
  }, [rangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupById = useMemo(() => {
    const m: Record<string, Group> = {};
    (groups || []).forEach((g: Group) => { m[g.id] = g; });
    return m;
  }, [groups]);

  // Нормализуем занятия: парсим даты, подмешиваем данные группы
  const lessons = useMemo(() => {
    return (scheduleItems || [])
      .filter((l: any) => l.status !== "cancelled")
      .filter((l: any) => !filterBranchId || l.branchId === filterBranchId)
      .filter((l: any) => !filterTeacherId || l.teacherId === filterTeacherId)
      .filter((l: any) => !filterHallId || l.hallId === filterHallId)
      .map((l: any) => {
        const s = new Date(l.startsAt);
        const e = l.endsAt ? new Date(l.endsAt) : new Date(s.getTime() + 60 * 60000);
        const g = l.groupId ? groupById[l.groupId] : undefined;
        return {
          ...l,
          _s: s, _e: e,
          _start: hourFloat(s), _end: Math.max(hourFloat(e), hourFloat(s) + 0.5),
          _date: s,
          _capacity: g?.capacity ?? 0,
          _students: g?.studentCount ?? 0,
          _level: g?.level || "",
          _age: g?.ageGroup || "",
          _pal: paletteFor(l.groupId || l.groupName || ""),
        };
      });
  }, [scheduleItems, filterBranchId, filterTeacherId, filterHallId, groupById]);

  const lessonsOnDay = (d: Date) => lessons.filter((l: any) => sameDay(l._date, d));

  // ── KPI «Сегодня» ──
  const todayStats = useMemo(() => {
    const tl = lessons.filter((l: any) => sameDay(l._date, today));
    const seats = tl.reduce((a: number, l: any) => a + l._capacity, 0);
    const filled = tl.reduce((a: number, l: any) => a + l._students, 0);
    return {
      lessons: tl.length,
      students: filled,
      fillPct: seats > 0 ? Math.round((filled / seats) * 100) : 0,
      free: Math.max(0, seats - filled),
    };
  }, [lessons]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Загрузка залов сегодня ──
  const hallLoad = useMemo(() => {
    const tl = lessons.filter((l: any) => sameDay(l._date, today));
    return (halls || [])
      .filter((h: any) => !filterBranchId || h.branchId === filterBranchId)
      .map((h: any) => {
        const hl = tl.filter((l: any) => l.hallId === h.id);
        const seats = hl.reduce((a: number, l: any) => a + (l._capacity || h.capacity || 0), 0);
        const filled = hl.reduce((a: number, l: any) => a + l._students, 0);
        return { id: h.id, name: h.name, count: hl.length, pct: seats > 0 ? Math.round((filled / seats) * 100) : 0 };
      });
  }, [lessons, halls, filterBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel = useMemo(() => {
    if (view === "day") return `${anchor.getDate()} ${MONTHS_GEN[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (view === "week") {
      const s = range.from, e = range.to;
      const sameMonth = s.getMonth() === e.getMonth();
      return sameMonth
        ? `${s.getDate()} – ${e.getDate()} ${MONTHS_GEN[e.getMonth()]} ${e.getFullYear()}`
        : `${s.getDate()} ${MONTHS_GEN[s.getMonth()]} – ${e.getDate()} ${MONTHS_GEN[e.getMonth()]} ${e.getFullYear()}`;
    }
    return `${["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"][anchor.getMonth()]} ${anchor.getFullYear()}`;
  }, [view, anchor, range]);

  const step = (dir: number) => {
    if (view === "day") setAnchor((d) => addDays(d, dir));
    else if (view === "week") setAnchor((d) => addDays(d, dir * 7));
    else setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d); if (view === "month") setView("week"); };

  const hours = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => GRID_START + i);
  const bodyH = (GRID_END - GRID_START) * HOUR_H;

  const filteredLessons = lessons; // совместимость со старым кодом форм ниже

  const handleSaveLesson = async () => {
    if (!lessonForm.groupId || !lessonForm.startsAt || !lessonForm.endsAt) return;
    setSaving(true);
    const ok = await onCreateLesson?.({ ...lessonForm });
    setSaving(false);
    if (ok) { setLessonForm({ groupId: "", startsAt: "", endsAt: "", teacherId: "", hallId: "", topic: "" }); setActiveForm(null); }
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.branchId) return;
    setSaving(true);
    const ok = await onCreateGroup?.({ ...groupForm, ageFrom: groupForm.ageFrom ? Number(groupForm.ageFrom) : undefined, ageTo: groupForm.ageTo ? Number(groupForm.ageTo) : undefined });
    setSaving(false);
    if (ok) { setGroupForm({ name: "", branchId: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", level: "Начинающие", scheduleDays: "", scheduleTime: "" }); setActiveForm(null); }
  };

  const inputCls = "rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white w-full";
  const labelCls = "flex flex-col gap-1";
  const kicCls = "text-[10px] uppercase tracking-widest text-slate-500 font-bold";

  const selCls = "rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-[#C5A059]/40 hover:bg-white/10 transition-colors";

  return (
    <div className="space-y-5">
      {/* Заголовок + действия */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Сеть филиалов</p>
          <h2 className="text-2xl font-black text-white">Расписание занятий</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveForm(activeForm === "lesson" ? null : "lesson")} className="flex items-center gap-2 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/30 px-4 py-2 text-sm font-bold text-[#C5A059] hover:bg-[#C5A059]/25 transition-colors">
            <Plus className="w-4 h-4" /> Новый урок
          </button>
          <button onClick={() => setActiveForm(activeForm === "group" ? null : "group")} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors">
            <Plus className="w-4 h-4" /> Создать группу
          </button>
          <button onClick={() => onLoadSchedule?.({ from: isoDate(range.from), to: isoDate(addDays(range.to, 1)), branchId: filterBranchId || undefined })} title="Обновить" className="flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-slate-400 hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-4 h-4 ${scheduleLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Тулбар: фильтры · переключатель вида · навигация по датам */}
      <div className="rounded-3xl border border-white/10 bg-[#111] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500"><Filter className="w-3.5 h-3.5" /></div>
          <select value={filterBranchId} onChange={(e) => setFilterBranchId(e.target.value)} className={selCls}>
            <option value="">Все филиалы</option>
            {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filterTeacherId} onChange={(e) => setFilterTeacherId(e.target.value)} className={selCls}>
            <option value="">Все преподаватели</option>
            {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filterHallId} onChange={(e) => setFilterHallId(e.target.value)} className={selCls}>
            <option value="">Все залы</option>
            {(halls || []).filter((h: any) => !filterBranchId || h.branchId === filterBranchId).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Сегментный переключатель */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5">
            {([["day", "День"], ["week", "Неделя"], ["month", "Месяц"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${view === v ? "bg-[#C5A059] text-black" : "text-slate-400 hover:text-white"}`}>{label}</button>
            ))}
          </div>
          {/* Навигация */}
          <div className="flex items-center gap-1">
            <button onClick={() => step(-1)} className="rounded-lg bg-white/5 border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={goToday} className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors">Сегодня</button>
            <button onClick={() => step(1)} className="rounded-lg bg-white/5 border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5">
            <CalendarDays className="w-4 h-4 text-[#C5A059]" />
            <span className="text-xs font-bold text-white whitespace-nowrap">{periodLabel}</span>
          </div>
        </div>
      </div>

      {activeForm === "lesson" && (
        <div className="rounded-3xl border border-white/10 bg-[#111] p-5 space-y-4">
          <p className="text-sm font-black text-white">Новый урок</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelCls}><span className={kicCls}>Группа *</span>
              <select value={lessonForm.groupId} onChange={(e) => setLessonForm(f => ({ ...f, groupId: e.target.value }))} className={inputCls}>
                <option value="">Выберите группу</option>
                {groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Преподаватель</span>
              <select value={lessonForm.teacherId} onChange={(e) => setLessonForm(f => ({ ...f, teacherId: e.target.value }))} className={inputCls}>
                <option value="">Из группы</option>
                {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Зал</span>
              <select value={lessonForm.hallId} onChange={(e) => setLessonForm(f => ({ ...f, hallId: e.target.value }))} className={inputCls}>
                <option value="">Без зала</option>
                {(halls || []).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Начало *</span>
              <input type="datetime-local" value={lessonForm.startsAt} onChange={(e) => setLessonForm(f => ({ ...f, startsAt: e.target.value }))} className={inputCls} />
            </label>
            <label className={labelCls}><span className={kicCls}>Конец *</span>
              <input type="datetime-local" value={lessonForm.endsAt} onChange={(e) => setLessonForm(f => ({ ...f, endsAt: e.target.value }))} className={inputCls} />
            </label>
            <label className={labelCls}><span className={kicCls}>Тема</span>
              <input type="text" value={lessonForm.topic} onChange={(e) => setLessonForm(f => ({ ...f, topic: e.target.value }))} placeholder="Тема занятия" className={inputCls} />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveLesson} disabled={saving || !lessonForm.groupId || !lessonForm.startsAt} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40">{saving ? "Сохранение…" : "Создать"}</button>
            <button onClick={() => setActiveForm(null)} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400">Отмена</button>
          </div>
        </div>
      )}

      {activeForm === "group" && (
        <div className="rounded-3xl border border-white/10 bg-[#111] p-5 space-y-4">
          <p className="text-sm font-black text-white">Создать группу</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelCls}><span className={kicCls}>Название *</span>
              <input type="text" value={groupForm.name} onChange={(e) => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="Название группы" className={inputCls} />
            </label>
            <label className={labelCls}><span className={kicCls}>Филиал *</span>
              <select value={groupForm.branchId} onChange={(e) => setGroupForm(f => ({ ...f, branchId: e.target.value }))} className={inputCls}>
                <option value="">Выберите филиал</option>
                {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Преподаватель</span>
              <select value={groupForm.teacherId} onChange={(e) => setGroupForm(f => ({ ...f, teacherId: e.target.value }))} className={inputCls}>
                <option value="">Не выбрано</option>
                {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Зал</span>
              <select value={groupForm.hallId} onChange={(e) => setGroupForm(f => ({ ...f, hallId: e.target.value }))} className={inputCls}>
                <option value="">Не выбрано</option>
                {(halls || []).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Возраст от–до</span>
              <div className="flex gap-2">
                <input type="number" value={groupForm.ageFrom} onChange={(e) => setGroupForm(f => ({ ...f, ageFrom: e.target.value }))} placeholder="от" className={inputCls} min={3} />
                <input type="number" value={groupForm.ageTo} onChange={(e) => setGroupForm(f => ({ ...f, ageTo: e.target.value }))} placeholder="до" className={inputCls} min={3} />
              </div>
            </label>
            <label className={labelCls}><span className={kicCls}>Уровень</span>
              <select value={groupForm.level} onChange={(e) => setGroupForm(f => ({ ...f, level: e.target.value }))} className={inputCls}>
                {["Начинающие", "Продолжающие", "Ансамбль", "Профи"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Дни занятий</span>
              <input type="text" value={groupForm.scheduleDays} onChange={(e) => setGroupForm(f => ({ ...f, scheduleDays: e.target.value }))} placeholder="Пн, Ср, Пт" className={inputCls} />
            </label>
            <label className={labelCls}><span className={kicCls}>Время</span>
              <input type="text" value={groupForm.scheduleTime} onChange={(e) => setGroupForm(f => ({ ...f, scheduleTime: e.target.value }))} placeholder="18:30–20:00" className={inputCls} />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveGroup} disabled={saving || !groupForm.name || !groupForm.branchId} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40">{saving ? "Сохранение…" : "Создать"}</button>
            <button onClick={() => setActiveForm(null)} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400">Отмена</button>
          </div>
        </div>
      )}

      {/* Календарь + правая колонка */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {view === "month" ? (
            /* ───── Месяц ───── */
            <div className="rounded-3xl border border-white/10 bg-[#111] p-4">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((w) => <div key={w} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {range.days.map((d) => {
                  const dl = lessonsOnDay(d);
                  const inMonth = d.getMonth() === anchor.getMonth();
                  const isToday = sameDay(d, today);
                  return (
                    <button key={+d} onClick={() => { setAnchor(new Date(d)); setView("day"); }}
                      className={`min-h-[94px] rounded-xl border p-1.5 text-left transition-colors ${isToday ? "border-[#C5A059]/40 bg-[#C5A059]/[0.06]" : "border-white/5 hover:border-white/20"} ${inMonth ? "" : "opacity-35"}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isToday ? "text-[#C5A059]" : "text-slate-300"}`}>{d.getDate()}</span>
                        {dl.length > 0 && <span className="text-[9px] font-bold text-slate-500">{dl.length}</span>}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {dl.slice(0, 3).map((l: any) => (
                          <div key={l.id} className={`truncate rounded border-l-2 px-1 py-0.5 text-[8px] font-bold text-white ${l._pal.bg} ${l._pal.br}`}>{hhmm(l._s)} {l.groupName}</div>
                        ))}
                        {dl.length > 3 && <div className="px-1 text-[8px] text-slate-500">+{dl.length - 3} ещё</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ───── День / Неделя ───── */
            <div className="rounded-3xl border border-white/10 bg-[#111] overflow-hidden">
              {/* Шапка дней */}
              <div className="grid border-b border-white/5" style={{ gridTemplateColumns: `52px repeat(${range.days.length}, minmax(0, 1fr))` }}>
                <div className="py-3" />
                {range.days.map((d) => {
                  const isToday = sameDay(d, today);
                  return (
                    <div key={+d} className={`border-l border-white/5 py-2.5 text-center ${isToday ? "bg-[#C5A059]/10" : ""}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-[#C5A059]" : "text-slate-500"}`}>{WEEKDAYS[(d.getDay() + 6) % 7]}</p>
                      <p className={`text-sm font-black ${isToday ? "text-[#C5A059]" : "text-white"}`}>{d.getDate()} {MONTHS_GEN[d.getMonth()]}</p>
                    </div>
                  );
                })}
              </div>
              {/* Тело сетки */}
              <div className="relative overflow-x-auto">
                <div className="grid" style={{ gridTemplateColumns: `52px repeat(${range.days.length}, minmax(0, 1fr))` }}>
                  {/* Колонка времени */}
                  <div className="relative" style={{ height: bodyH }}>
                    {hours.map((h) => (
                      <div key={h} className="absolute right-2 text-[10px] font-bold text-slate-500" style={{ top: (h - GRID_START) * HOUR_H + 2 }}>{String(h).padStart(2, "0")}:00</div>
                    ))}
                  </div>
                  {/* Колонки дней */}
                  {range.days.map((d) => {
                    const { placed, laneCount } = layoutDay(lessonsOnDay(d));
                    const isToday = sameDay(d, today);
                    return (
                      <div key={+d} className="relative border-l border-white/5" style={{ height: bodyH }}>
                        {isToday && <div className="absolute inset-0 bg-[#C5A059]/[0.035]" />}
                        {hours.map((h) => (
                          <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: (h - GRID_START) * HOUR_H }} />
                        ))}
                        {placed.map((l: any) => {
                          const start = Math.max(l._start, GRID_START);
                          const end = Math.min(l._end, GRID_END);
                          const top = (start - GRID_START) * HOUR_H;
                          const cardH = Math.max((end - start) * HOUR_H - 4, 32);
                          const w = 100 / laneCount;
                          const fill = l._capacity > 0 ? Math.round((l._students / l._capacity) * 100) : 0;
                          return (
                            <div key={l.id} className={`group absolute overflow-hidden rounded-xl border border-l-[3px] p-1.5 ${l._pal.bg} ${l._pal.br}`}
                              style={{ top, height: cardH, left: `calc(${l._lane * w}% + 2px)`, width: `calc(${w}% - 4px)` }}>
                              <p className="truncate text-[10px] font-bold leading-tight text-white">{l.groupName || "Группа"}</p>
                              {(l._age || l._level) && <p className="truncate text-[9px] text-slate-400">{[l._age, l._level].filter(Boolean).join(" · ")}</p>}
                              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400">
                                <Clock className="h-2.5 w-2.5" />{hhmm(l._s)}
                                {l.hallName && <span className={`ml-auto truncate font-bold ${l._pal.tx}`}>{l.hallName}</span>}
                              </div>
                              {l.teacherName && cardH > 56 && <p className="truncate text-[9px] text-slate-500">{l.teacherName}</p>}
                              {l._capacity > 0 && cardH > 64 && (
                                <div className="mt-0.5">
                                  <div className="flex justify-between text-[8px] text-slate-400"><span>{l._students}/{l._capacity}</span><span>{fill}%</span></div>
                                  <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${l._pal.bar}`} style={{ width: `${Math.min(fill, 100)}%` }} /></div>
                                </div>
                              )}
                              {onDeleteLesson && (
                                <button onClick={() => onDeleteLesson(l.id)} title="Отменить" className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded bg-black/50 text-red-300 hover:bg-red-500/40 group-hover:flex"><X className="h-2.5 w-2.5" /></button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                {!range.days.some((d) => lessonsOnDay(d).length > 0) && !scheduleLoading && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <CalendarDays className="mb-2 h-8 w-8 text-slate-600" />
                    <p className="text-sm text-slate-500">Нет занятий в этом периоде</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка */}
        <aside className="space-y-4">
          {/* Сегодня */}
          <div className="rounded-3xl border border-white/10 bg-[#111] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Сегодня</p>
            <div className="mt-3 space-y-3">
              {[
                { icon: CalendarDays, val: todayStats.lessons, label: "Занятий" },
                { icon: Users, val: todayStats.students, label: "Учеников на занятиях" },
                { icon: Activity, val: `${todayStats.fillPct}%`, label: "Заполняемость" },
                { icon: MapPin, val: todayStats.free, label: "Свободных мест" },
              ].map((k, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C5A059]/10 text-[#C5A059]"><k.icon className="h-4 w-4" /></div>
                  <div><p className="text-lg font-black leading-none text-white">{k.val}</p><p className="mt-0.5 text-[11px] text-slate-500">{k.label}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Загрузка залов */}
          <div className="rounded-3xl border border-white/10 bg-[#111] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Загрузка залов сегодня</p>
            <div className="mt-3 space-y-3">
              {hallLoad.length === 0 && <p className="text-xs text-slate-500">Залы не заданы</p>}
              {hallLoad.map((h: any, i: number) => (
                <div key={h.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">{h.name}</span>
                    <span className="font-black text-white">{h.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${HALL_BARS[i % HALL_BARS.length]}`} style={{ width: `${Math.min(h.pct, 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Группы сети — сворачиваемая панель */}
      <div className="rounded-3xl border border-white/10 bg-[#111] overflow-hidden">
        <button onClick={() => setShowGroups((s) => !s)} className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Все группы сети</p>
            <p className="text-sm font-black text-white">{groups.filter((g: Group) => !filterBranchId || g.branchId === filterBranchId).length} групп</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${showGroups ? "rotate-180" : ""}`} />
        </button>
        {showGroups && (
          <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            {groups.filter((g: Group) => !filterBranchId || g.branchId === filterBranchId).map((group: Group) => (
              <div key={group.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{group.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{group.ageGroup} · {group.level}</p>
                  {(group.days?.length > 0 || group.time) && <p className="mt-0.5 text-xs text-slate-500">{group.days?.join(", ")} {group.time}</p>}
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{group.studentCount} учеников</p>
                </div>
                {onDeleteGroup && (
                  <button onClick={() => onDeleteGroup(group.id)} className="flex-shrink-0 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 transition-colors hover:bg-red-500/20">Архив</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
