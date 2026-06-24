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
  ChevronUp,
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
  Archive,
  Mic2,
  PartyPopper,
  ShoppingBag,
  Package,
  Boxes,
  X
} from "lucide-react";
import { Announcement, AnnouncementAudience, Branch, Competition, ExecutiveSummary, Group, Payment, Student, SubscriptionPlan, Teacher, LeadSource, WaitlistEntry } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart as RLineChart, Line, Legend, AreaChart, Area
} from "recharts";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import StudentsRegistry, { type RegistryPreset } from "./StudentsRegistry";
import { ArchiveReasonModal } from "./ArchiveReasonModal";
import AttendanceJournalView from "./AttendanceJournalView";
import { BranchesGroupsView } from "./BranchesGroupsView";
import { computeOwnerDashboard, type DashFilters, type PeriodKey, type LevelKey, type DashExtras, type Delta, type DailyReport } from "../ownerDashboardAnalytics";

// Память состояния свёрнутых блоков дашборда — отдельно для каждого пользователя (по роли).
function useCollapsedSections(userKey: string) {
  const storageKey = `echogor:dashboard-collapsed:${userKey}`;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(collapsed)); } catch { /* noop */ }
  }, [storageKey, collapsed]);
  const isOpen = (id: string) => collapsed[id] !== true; // по умолчанию блок развёрнут
  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !(c[id] === true) }));
  return { isOpen, toggle };
}

const pctOrDash = (v: number | null) => (v === null ? "—" : `${v}%`);

// Данные универсального окна детализации (таблица или список учеников).
type DetailModalData = {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: React.ReactNode[][];
  note?: string;
  empty?: string;
  footer?: { label: string; onClick: () => void };
};

const STATUS_LABEL: Record<string, string> = {
  lead: "Лид", trial: "Пробный", active: "Активный", paused: "Пауза",
  debt: "Долг", left: "Ушёл", archived: "Архив", new: "Новый",
};

type StudentInput = { name?: string; firstName?: string; lastName?: string; branchId?: string; groupId?: string; teacherId?: string; parentName?: string; parentPhone?: string; phone?: string; gender?: string | null; birthday?: string | null; sourceId?: string | null; comment?: string; status?: string; manualStatus?: string | null };
type TrashStudent = { id: string; name: string; branchId: string; parentName: string; parentPhone: string; requestedBy: string; requestedAt: string; reason: string };
type ArchiveStudent = { id: string; name: string; branchId: string; phone?: string; parentName?: string; parentPhone?: string; archivedAt: string; archivedBy: string; archiveReason: string; archiveComment: string };
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
  onCreateStudent?: (data: StudentInput) => Promise<string | boolean | null>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  subscriptionPlans?: SubscriptionPlan[];
  studentTrash?: TrashStudent[];
  onRestoreStudent?: (id: string) => Promise<boolean>;
  onConfirmDeleteStudent?: (id: string) => Promise<boolean>;
  studentArchive?: ArchiveStudent[];
  onArchiveStudent?: (id: string, reason: string, comment: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<boolean>;
  leadSources?: LeadSource[];
  waitlist?: WaitlistEntry[];
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean>;
  onRemoveFromWaitlist?: (id: string, reason?: string) => Promise<boolean>;
  onCreateLeadSource?: (data: { name: string }) => Promise<boolean>;
  onUpdateLeadSource?: (id: string, data: { name?: string; status?: string }) => Promise<boolean>;
  onDeleteLeadSource?: (id: string) => Promise<boolean>;
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
  onCreateHall?: (data: any) => Promise<boolean>;
  onUpdateHall?: (id: string, data: any) => Promise<boolean>;
  onDeleteHall?: (id: string) => Promise<boolean>;
  onCreateLesson?: (data: any) => Promise<boolean>;
  onUpdateLesson?: (id: string, data: any) => Promise<boolean>;
  onDeleteLesson?: (id: string) => Promise<boolean>;
  onToggleAttendance?: any;
  onBulkAttendance?: any;
  journal?: any;
  onJournalTask?: (p: { studentId: string; studentName: string; title: string }) => void;
}

type OwnerTab = "dashboard" | "eduerp" | "branches" | "students" | "teachers" | "payroll" | "journal" | "schedule" | "finance" | "performances" | "products" | "documents" | "marketing" | "events" | "feed" | "announcements" | "analytics" | "ai" | "settings";

const ownerTabs: { id: OwnerTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", short: "Главная", icon: Activity },
  { id: "eduerp", label: "EduERP OS", short: "EduERP", icon: ClipboardList },
  { id: "branches", label: "Филиалы", short: "Филиалы", icon: Building2 },
  { id: "students", label: "Ученики", short: "Ученики", icon: Users },
  { id: "teachers", label: "Преподаватели", short: "Педагоги", icon: GraduationCap },
  { id: "payroll", label: "Зарплаты", short: "Зарплаты", icon: Wallet },
  { id: "journal", label: "Журнал посещаемости", short: "Журнал", icon: ClipboardList },
  { id: "schedule", label: "Расписание", short: "Расписание", icon: CalendarDays },
  { id: "finance", label: "Бухгалтерия", short: "Учёт", icon: Coins },
  { id: "performances", label: "Выступления", short: "Сцена", icon: Mic2 },
  { id: "products", label: "Товары и склад", short: "Товары", icon: ShoppingBag },
  { id: "documents", label: "Документолог", short: "Договоры", icon: FileText },
  { id: "marketing", label: "Маркетинг", short: "Маркетинг", icon: Send },
  { id: "events", label: "Концерты", short: "Концерты", icon: Trophy },
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
  studentArchive = [],
  onArchiveStudent,
  onUnarchiveStudent,
  leadSources = [],
  waitlist = [],
  onAddToWaitlist,
  onRemoveFromWaitlist,
  onCreateLeadSource,
  onUpdateLeadSource,
  onDeleteLeadSource,
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
  onCreateHall,
  onUpdateHall,
  onDeleteHall,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
  onToggleAttendance,
  onBulkAttendance,
  journal,
  onJournalTask,
}: OwnerExecutiveWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<OwnerTab>("dashboard");
  // Сворачивание бокового меню — любой раздел можно открыть на всю ширину.
  const [navCollapsed, setNavCollapsed] = useState(false);
  // Пресет-фильтр для вкладки «Ученики» — задаётся кликом по KPI/риску в дашборде.
  const [studentsPreset, setStudentsPreset] = useState<RegistryPreset | null>(null);
  const openStudentsWithPreset = (preset: RegistryPreset) => {
    setStudentsPreset({ ...preset, nonce: Date.now() });
    setActiveTab("students");
  };
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
        <aside className={`sticky top-0 hidden h-[calc(100vh-64px)] w-76 shrink-0 border-r border-white/5 bg-[#0F0F0F] p-4 ${navCollapsed ? "lg:hidden" : "lg:block"}`}>
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
          {/* Тумблер бокового меню (десктоп): спрятать/показать вкладки для полноэкранного раздела */}
          <button onClick={() => setNavCollapsed((v) => !v)}
            className="mb-3 hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 lg:inline-flex">
            {navCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {navCollapsed ? "Показать меню" : "Скрыть меню"}
          </button>
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
              rawWaitlist={waitlist}
              branchScorecards={branchScorecards}
              onNavigate={(tab: OwnerTab) => setActiveTab(tab)}
              onOpenStudents={openStudentsWithPreset}
              onTriggerAiReport={onTriggerAiReport}
              aiResult={aiResult}
              aiGenerating={aiGenerating}
            />
          )}
          {activeTab === "eduerp" && <OwnerEduErpView branches={branches} groups={groups} students={students} teachers={teachers} payments={payments} monthRevenue={monthRevenue} todayRevenue={todayRevenue} debt={debt} renewals={renewals} />}
          {activeTab === "branches" && <BranchesGroupsView branches={branchScorecards} rawBranches={branches} students={students} groups={groups} teachers={teachers} halls={halls} payments={payments} onCreateBranch={onCreateBranch} onUpdateBranch={onUpdateBranch} onDeleteBranch={onDeleteBranch} onCreateGroup={onCreateGroup} onUpdateGroup={onUpdateGroup} onDeleteGroup={onDeleteGroup} onCreateHall={onCreateHall} onUpdateHall={onUpdateHall} onDeleteHall={onDeleteHall} onOpenStudents={openStudentsWithPreset} />}
          {activeTab === "students" && <StudentsNetworkView students={students} branches={branches} groups={groups} teachers={teachers} onCreateStudent={onCreateStudent} onUpdateStudent={onUpdateStudent} onDeleteStudent={onDeleteStudent} onOpenPayment={onOpenPayment} onSellSubscription={onSellSubscription} subscriptionPlans={subscriptionPlans} studentTrash={studentTrash} onRestoreStudent={onRestoreStudent} onConfirmDeleteStudent={onConfirmDeleteStudent} studentArchive={studentArchive} onArchiveStudent={onArchiveStudent} onUnarchiveStudent={onUnarchiveStudent} leadSources={leadSources} waitlist={waitlist} onAddToWaitlist={onAddToWaitlist} onRemoveFromWaitlist={onRemoveFromWaitlist} onCreateLeadSource={onCreateLeadSource} onUpdateLeadSource={onUpdateLeadSource} onDeleteLeadSource={onDeleteLeadSource} preset={studentsPreset} />}
          {activeTab === "teachers" && <TeachersNetworkView teachers={teachers} metrics={metrics} branches={branches} students={students} groups={groups} payments={payments} onCreateTeacher={onCreateTeacher} onUpdateTeacher={onUpdateTeacher} onDeleteTeacher={onDeleteTeacher} />}
          {activeTab === "payroll" && <PayrollView teachers={teachers} students={students} groups={groups} payments={payments} />}
          {activeTab === "finance" && <BookkeepingView branches={branchScorecards} payments={payments} monthRevenue={monthRevenue} todayRevenue={todayRevenue} debt={debt} renewals={renewals} />}
          {activeTab === "performances" && <PerformancesView />}
          {activeTab === "products" && <ProductsView />}
          {activeTab === "documents" && <DocumentologistView />}
          {activeTab === "journal" && (
            <AttendanceJournalView
              role="owner"
              branches={branches}
              groups={groups}
              students={students}
              teachers={teachers}
              canEdit={true}
              onToggleAttendance={onToggleAttendance}
              onBulkAttendance={onBulkAttendance}
              onCreateTask={onJournalTask}
              journal={journal}
            />
          )}
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
          {activeTab === "marketing" && <MarketingView studentArchive={studentArchive} branches={branches} />}
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

function OwnerDashboard({ rawBranches, rawStudents, rawGroups, rawTeachers, rawPayments, rawWaitlist, branchScorecards, onNavigate, onOpenStudents, onTriggerAiReport, aiResult, aiGenerating }: any) {
  const go = (tab: string) => onNavigate?.(tab);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [level, setLevel] = useState<LevelKey>("network");
  const [branchId, setBranchId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [extras, setExtras] = useState<DashExtras>({});
  // Выручка по новым направлениям (выступления, товары) — для блока «Выручка по направлениям».
  const [streamRev, setStreamRev] = useState<{ perf: any; prod: any }>({ perf: null, prod: null });
  // Список выступлений для блока на дашборде (этот месяц / предстоящие).
  const [perfList, setPerfList] = useState<any[]>([]);
  // Окно детализации, раскрываемое по клику (модальное окно с таблицей/списком).
  const [riskTable, setRiskTable] = useState<DetailModalData | null>(null);
  // Состояние сворачивания блоков — запоминается по роли пользователя.
  const { isOpen: sectionOpen, toggle: toggleSection } = useCollapsedSections("owner");

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

  // Выручка от выступлений и товаров — синхронно с выбранным периодом дашборда.
  useEffect(() => {
    let alive = true;
    const qs = period === "custom" && customStart && customEnd
      ? `period=custom&from=${customStart}&to=${customEnd}`
      : `period=${period}`;
    const get = (url: string) => fetch(url, { headers: { "x-demo-role": "owner" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([get(`/api/mvp/performances/overview?${qs}`), get(`/api/mvp/products/overview?${qs}`)])
      .then(([perf, prod]) => { if (alive) setStreamRev({ perf, prod }); });
    return () => { alive = false; };
  }, [period, customStart, customEnd]);

  // Список выступлений (для блока «Выступления» на дашборде) — грузим один раз.
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/performances", { headers: { "x-demo-role": "owner" } })
      .then((r) => (r.ok ? r.json() : { performances: [] }))
      .then((d) => { if (alive) setPerfList(d.performances || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Сводка выступлений: этот месяц и предстоящие (с чистой прибылью).
  const perfSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const ym = today.slice(0, 7);
    const active = perfList.filter((p) => p.status !== "cancelled");
    const thisMonth = active.filter((p) => String(p.eventDate).slice(0, 7) === ym);
    const upcoming = active.filter((p) => String(p.eventDate) >= today).sort((a, b) => String(a.eventDate).localeCompare(String(b.eventDate)));
    return {
      monthCount: thisMonth.length,
      monthGross: thisMonth.reduce((s, p) => s + (p.price || 0), 0),
      monthNet: thisMonth.reduce((s, p) => s + (p.netProfit ?? (p.price || 0) - (p.expense || 0)), 0),
      upcomingCount: upcoming.length,
      upcoming: upcoming.slice(0, 4),
    };
  }, [perfList]);

  // AI-инсайты по продажам, складу и выступлениям (правила, без LLM).
  const bizInsights = useMemo(() => {
    const out: { tone: "good" | "warn" | "info"; text: string }[] = [];
    const prod = streamRev.prod, perf = streamRev.perf;
    const low = prod?.lowStock || [];
    if (low.length > 0) {
      const names = low.slice(0, 4).map((x: any) => x.name).join(", ");
      out.push({ tone: "warn", text: `Пора докупить товар: ниже минимума ${low.length} поз.${names ? " — " + names : ""}.` });
    } else if (prod) {
      out.push({ tone: "good", text: "Складские остатки в норме — докупать срочно нечего." });
    }
    if (prod) {
      if (typeof prod.stockValue === "number") out.push({ tone: "info", text: `На складе товара на ${money(prod.stockValue)} по закупке (${prod.stockUnits || 0} ед.).` });
      if (prod.revenue) out.push({ tone: (prod.margin ?? 0) >= 30 ? "good" : "info", text: `Продажи за период: ${money(prod.revenue.total)}, маржа ${prod.margin ?? 0}%.` });
    }
    if (perfSummary.monthCount > 0) {
      out.push({ tone: "good", text: `Выступления в этом месяце: ${perfSummary.monthCount} на ${money(perfSummary.monthGross)}, чистая прибыль ${money(perfSummary.monthNet)}.` });
    }
    if (perfSummary.upcomingCount > 0) {
      out.push({ tone: "info", text: `Предстоит выступлений: ${perfSummary.upcomingCount}${perfSummary.upcoming[0] ? ` (ближайшее ${perfSummary.upcoming[0].eventDate})` : ""}.` });
    }
    if (perf?.outstanding > 0) out.push({ tone: "warn", text: `Не закрыта оплата по выступлениям: ${money(perf.outstanding)} (${perf.unpaidCount || 0} шт.).` });
    return out;
  }, [streamRev, perfSummary]);

  const filters: DashFilters = { period, level, branchId, groupId, teacherId, customStart, customEnd };
  const m = useMemo(
    () => computeOwnerDashboard(
      { students: rawStudents || [], payments: rawPayments || [], groups: rawGroups || [], branches: rawBranches || [], teachers: rawTeachers || [] },
      filters, new Date(), extras
    ),
    [rawStudents, rawPayments, rawGroups, rawBranches, rawTeachers, period, level, branchId, groupId, teacherId, customStart, customEnd, extras]
  );

  // Запас прочности: общее количество учеников и лист ожидания с учётом фильтра
  // (сеть / филиал / группа). Помогает понять, нужен ли набор или есть очередь.
  const capacityInfo = useMemo(() => {
    const inScope = (s: Student) => {
      if (level === "branch" && branchId) return s.branchId === branchId;
      if (level === "group" && groupId) return (s.groupIds || []).includes(groupId);
      return true;
    };
    const totalStudents = (rawStudents || []).filter(inScope).length;
    const waitInScope = (w: any) => {
      if (w.removedAt) return false;
      if (level === "branch" && branchId) return w.branchId === branchId;
      if (level === "group" && groupId) return w.groupId === groupId;
      return true;
    };
    const waitlistTotal = (rawWaitlist || []).filter(waitInScope).length;
    const capacity = m.occupancy.capacity || 0;
    const freeSpots = capacity > 0 ? Math.max(0, capacity - m.occupancy.filled) : null;
    return { totalStudents, waitlistTotal, freeSpots };
  }, [rawStudents, rawWaitlist, level, branchId, groupId, m.occupancy.capacity, m.occupancy.filled]);

  // --- хелперы для окон детализации ---
  const studentById = useMemo(() => new Map<string, Student>((rawStudents || []).map((s: Student) => [s.id, s])), [rawStudents]);
  const branchNameOf = (id?: string) => {
    const b = (rawBranches || []).find((x: Branch) => x.id === id);
    return b?.name || b?.city || "—";
  };
  const groupNamesOf = (s: Student) =>
    (rawGroups || []).filter((g: Group) => (s.groupIds || []).includes(g.id)).map((g: Group) => g.name).join(", ") || "—";
  const hasActiveSubLocal = (s: Student) => (s.subscriptions || []).some((sub) => sub.status === "active");
  const studentRows = (ids: string[]): React.ReactNode[][] =>
    ids.map((id) => studentById.get(id)).filter(Boolean).map((s) => {
      const st = s as Student;
      return [
        <span className="font-bold text-white">{st.name}</span>,
        branchNameOf(st.branchId),
        groupNamesOf(st),
        <span className={st.status === "debt" ? "text-rose-400 font-bold" : "text-slate-300"}>{STATUS_LABEL[st.status as string] || st.status || "—"}</span>,
      ];
    });

  // Открыть окно со списком учеников (по id). В футере — переход в полный раздел «Ученики».
  const openStudentsModal = (ids: string[], title: string, fullPreset?: RegistryPreset) => setRiskTable({
    title,
    subtitle: `${ids.length} ${ids.length % 10 === 1 && ids.length % 100 !== 11 ? "ученик" : ids.length % 10 >= 2 && ids.length % 10 <= 4 && (ids.length % 100 < 10 || ids.length % 100 >= 20) ? "ученика" : "учеников"}`,
    columns: ["Ученик", "Филиал", "Группа", "Статус"],
    rows: studentRows(ids),
    empty: "Список пуст.",
    footer: fullPreset && onOpenStudents ? { label: "Открыть в разделе «Ученики» ›", onClick: () => onOpenStudents({ branchFilter: level === "branch" && branchId ? branchId : "all", ...fullPreset }) } : undefined,
  });

  // Окно «показатель → значение».
  const openInfo = (title: string, pairs: [string, React.ReactNode][], note?: string) => setRiskTable({
    title, columns: ["Показатель", "Значение"], rows: pairs.map(([k, v]) => [k, v]), note,
  });

  // Совместимость: прежний openList(preset) теперь открывает окно (а не уводит на вкладку).
  const openList = (preset: RegistryPreset) => {
    let ids = preset.ids;
    if (!ids && preset.segment === "active") ids = (rawStudents || []).filter(hasActiveSubLocal).map((s: Student) => s.id);
    openStudentsModal(ids || [], preset.label || "Ученики", preset);
  };

  // Сопоставление общих рисков (m.risks) с готовыми списками ежедневного отчёта.
  const dr = m.dailyReport;
  const resolveRisk = (id: string) => {
    if (id === "renew3") return openList({ ids: dr.expiring3d.ids, label: "Истекают через 3 дня" });
    if (id === "renew7") return openList({ ids: dr.expiring7d.ids, label: "Истекают через 7 дней" });
    if (id === "debt") return openList({ ids: dr.debtors.ids, label: "Должники" });
    if (id === "overload") return openList({ ids: dr.overloadedGroups.studentIds, label: "Ученики перегруженных групп" });
    if (id === "empty") return openList({ ids: dr.lowFillGroups.studentIds, label: "Ученики низкозаполненных групп" });
    if (id.startsWith("lowret-b-") || id.startsWith("lowocc-")) {
      const bid = id.replace("lowret-b-", "").replace("lowocc-", "");
      const ids = (rawStudents || []).filter((s: Student) => s.branchId === bid).map((s: Student) => s.id);
      return openList({ ids, label: "Ученики филиала", branchFilter: bid });
    }
    return go("branches");
  };

  // Открыть подробную таблицу риска в модальном окне.
  const openGroupRetention = () => setRiskTable({
    title: "Группы с падением удержания",
    columns: ["Группа", "Педагог", "Удерж. пред. мес", "Удерж. тек. мес", "Изменение"],
    rows: m.riskTables.groupRetention.map((r) => [r.name, r.teacher, pctOrDash(r.prev), pctOrDash(r.cur), <ChangeCell value={r.change} />]),
    note: "Удержание оценивается по посещаемости (тот же прокси, что и график «удержание по дням»); история накапливается по мере отметок. Сортировка — от худших к лучшим.",
  });
  const openLowFill = () => setRiskTable({
    title: "Низкая заполняемость групп",
    columns: ["Группа", "Педагог", "Заполняемость"],
    rows: m.riskTables.lowFillGroups.map((g) => [g.name, g.teacher, `${g.fill}%`]),
    note: "Группы с заполняемостью ниже 50% — есть свободные мощности для набора.",
  });
  const openTeacherRetention = () => setRiskTable({
    title: "Низкое удержание у педагогов",
    columns: ["Педагог", "Удержание"],
    rows: m.riskTables.teacherLowRetention.map((t) => [t.name, `${t.retention}%`]),
    note: "Педагоги с удержанием ниже нормы (70%). Сортировка — от худших к лучшим.",
  });
  const openOverload = () => setRiskTable({
    title: "Перегруз групп",
    columns: ["Группа", "Педагог", "Заполняемость"],
    rows: m.riskTables.overloadGroups.map((g) => [g.name, g.teacher, `${g.fill}%`]),
    note: "Группы с загрузкой выше нормы (>90%) — кандидаты на параллельные группы / набор педагогов.",
  });

  // --- окна KPI ---
  const openRevenue = () => openInfo("Выручка за период", [
    ["Всего", <span className="font-black text-[#C5A059]">{money(m.revenue.total)}</span>],
    ["Сегодня / вчера", `${money(m.revenue.today)} / ${money(m.revenue.yesterday)}`],
    ["Новые / постоянные / вернувшиеся", `${money(m.revenue.new)} · ${money(m.revenue.regular)} · ${money(m.revenue.returning)}`],
    ["К пред. периоду", <DeltaBadge pct={m.revenue.momPct} />],
    ["Год к году", <DeltaBadge pct={m.revenue.yoyPct} />],
  ]);
  const subsTotal = m.revenue.total || 0;
  const perfTotal = streamRev.perf?.revenue?.total || 0;
  const prodTotal = streamRev.prod?.revenue?.total || 0;
  const openTotalRevenue = () => openInfo("Общая выручка за период", [
    ["Абонементы", money(subsTotal)],
    ["Выступления", money(perfTotal)],
    ["Товары", money(prodTotal)],
    ["Итого", <span className="font-black text-emerald-400">{money(subsTotal + perfTotal + prodTotal)}</span>],
  ], "Общая выручка = выручка от абонементов + выступлений + товаров.");
  const openAvgCheck = () => openInfo("Средний чек", [
    ["Все оплаты", m.avgCheck.all === null ? "—" : money(m.avgCheck.all)],
    ["Новые", m.avgCheck.new === null ? "—" : money(m.avgCheck.new)],
    ["Постоянные", m.avgCheck.regular === null ? "—" : money(m.avgCheck.regular)],
    ["Вернувшиеся", m.avgCheck.returning === null ? "—" : money(m.avgCheck.returning)],
    ["К пред. периоду", <DeltaBadge pct={m.avgCheck.momPct} />],
  ]);
  const openRetention = () => openInfo("Удержание (мес→мес)", [
    ["Удержание", m.retention.pct === null ? "—" : `${m.retention.pct}%`],
    ["Активны / всего", `${m.retention.activeStudents} / ${m.retention.totalStudents}`],
    ["Отток", m.retention.pct === null ? "—" : `${100 - m.retention.pct}%`],
    ["К пред. месяцу", <DeltaBadge pct={m.retention.momPct} />],
    ["Год к году", <DeltaBadge pct={m.retention.yoyPct} />],
  ], "Удержание — доля учеников с активным абонементом.");
  const openOccupancy = () => setRiskTable({
    title: "Заполняемость по филиалам",
    subtitle: m.occupancy.pct === null ? undefined : `Сеть: ${m.occupancy.filled} / ${m.occupancy.capacity} · ${m.occupancy.pct}%`,
    columns: ["Филиал", "Мест занято", "Заполняемость"],
    rows: m.occupancy.byBranch.map((b) => [b.name, `${b.filled} / ${b.capacity || "—"}`, pctOrDash(b.pct)]),
    empty: "Нет данных по вместимости групп.",
  });
  const openActiveSubs = () => openList({ segment: "active", label: "Активные ученики" });
  const openDebtors = () => openStudentsModal(dr.debtors.ids, "Должники", { ids: dr.debtors.ids, label: "Должники" });
  const openFuture = () => openStudentsModal(dr.futureEnrollments.ids, "Записи на будущее", { ids: dr.futureEnrollments.ids, label: "Записи на будущее" });
  const openNewStudents = () => openStudentsModal(dr.newStudents.ids, `Новые ученики · ${m.ranges.cur.label}`, { ids: dr.newStudents.ids, label: "Новые ученики" });

  // --- окна рейтингов и воронки ---
  const openBranchDetail = (id: string, name: string) =>
    openStudentsModal((rawStudents || []).filter((s: Student) => s.branchId === id).map((s: Student) => s.id), `Филиал: ${name}`, { branchFilter: id, label: `Филиал: ${name}` });
  const openTeacherDetail = (id: string, name: string) =>
    openStudentsModal((rawStudents || []).filter((s: Student) => s.teacherId === id).map((s: Student) => s.id), `Педагог: ${name}`);
  const openGroupDetail = (id: string, name: string) =>
    openStudentsModal((rawStudents || []).filter((s: Student) => (s.groupIds || []).includes(id)).map((s: Student) => s.id), `Группа: ${name}`);
  const openStatusList = (statuses: string[], title: string) =>
    openStudentsModal((rawStudents || []).filter((s: Student) => statuses.includes(s.status as string)).map((s: Student) => s.id), title);

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

      {/* 1.5 ЕЖЕДНЕВНЫЙ ОТЧЁТ РУКОВОДИТЕЛЯ */}
      <CollapsibleSection id="daily" icon={ClipboardList} title="Ежедневный отчёт руководителя" hint="Здоровье студии за 30 секунд"
        open={sectionOpen("daily")} onToggle={() => toggleSection("daily")}>
        <DailyManagerReport report={m.dailyReport} scopeLabel={m.scope.label} periodLabel={m.ranges.cur.label}
          onOpenList={openList} onGo={go} onRevenue={openRevenue} />
      </CollapsibleSection>

      {/* 1.7 ВЫРУЧКА ПО НАПРАВЛЕНИЯМ */}
      <CollapsibleSection id="streams" icon={Coins} title="Выручка по направлениям" hint="Абонементы · выступления · товары · общая"
        open={sectionOpen("streams")} onToggle={() => toggleSection("streams")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <BigKpi label="Выручка от абонементов" value={money(subsTotal)} onClick={openRevenue}
            rows={[
              { k: "К пред. периоду", v: <DeltaBadge pct={m.revenue.momPct} /> },
              { k: "Год к году", v: <DeltaBadge pct={m.revenue.yoyPct} /> },
            ]} />
          <BigKpi label="Выручка от выступлений" value={money(perfTotal)} onClick={() => go("performances")}
            rows={[
              { k: "К пред. периоду", v: <DeltaBadge pct={streamRev.perf?.revenue?.momPct ?? null} /> },
              { k: "Год к году", v: <DeltaBadge pct={streamRev.perf?.revenue?.yoyPct ?? null} /> },
              { k: "Раздел", v: <span className="text-[#C5A059]">Выступления ›</span> },
            ]} />
          <BigKpi label="Выручка от товаров" value={money(prodTotal)} onClick={() => go("products")}
            rows={[
              { k: "К пред. периоду", v: <DeltaBadge pct={streamRev.prod?.revenue?.momPct ?? null} /> },
              { k: "Год к году", v: <DeltaBadge pct={streamRev.prod?.revenue?.yoyPct ?? null} /> },
              { k: "Раздел", v: <span className="text-[#C5A059]">Товары и склад ›</span> },
            ]} />
          <BigKpi label="Общая выручка" value={money(subsTotal + perfTotal + prodTotal)} tone="emerald" onClick={openTotalRevenue}
            rows={[
              { k: "Абонементы", v: <span className="text-slate-200">{money(subsTotal)}</span> },
              { k: "Выступления", v: <span className="text-slate-200">{money(perfTotal)}</span> },
              { k: "Товары", v: <span className="text-slate-200">{money(prodTotal)}</span> },
            ]} />
        </div>
      </CollapsibleSection>

      {/* Выступления + AI-инсайты по продажам и складу */}
      <CollapsibleSection id="opsbiz" icon={Mic2} title="Выступления и склад" hint="Банкеты, продажи, остатки + AI-выводы"
        open={sectionOpen("opsbiz")} onToggle={() => toggleSection("opsbiz")}>
        <div className="grid gap-3 lg:grid-cols-3">
          <BigKpi label="Выступления в этом месяце" value={perfSummary.monthCount} onClick={() => go("performances")}
            rows={[
              { k: "Стоимость", v: <span className="text-slate-200">{money(perfSummary.monthGross)}</span> },
              { k: "Чистая прибыль", v: <span className="text-emerald-400">{money(perfSummary.monthNet)}</span> },
            ]} />
          <BigKpi label="Предстоящие выступления" value={perfSummary.upcomingCount} tone="gold" onClick={() => go("performances")}
            rows={perfSummary.upcoming.length
              ? perfSummary.upcoming.slice(0, 3).map((p: any) => ({ k: p.eventDate, v: <span className="text-slate-200 text-[11px]">{p.clientName}</span> }))
              : [{ k: "Ближайших нет", v: <span className="text-slate-500 text-[11px]">—</span> }]} />
          <BigKpi label="Товар на складе" value={streamRev.prod ? money(streamRev.prod.stockValue ?? 0) : "—"} onClick={() => go("products")}
            rows={[
              { k: "Единиц на складе", v: <span className="text-slate-200">{streamRev.prod?.stockUnits ?? "—"}</span> },
              { k: "Ниже минимума", v: <span className={streamRev.prod?.lowStock?.length ? "text-rose-400" : "text-emerald-400"}>{streamRev.prod?.lowStock?.length ?? "—"}</span> },
            ]} />
        </div>
        {/* AI-выводы (правила): здоровье студии с позиции продаж и выступлений */}
        <div className="mt-3 rounded-2xl border border-[#C5A059]/20 bg-gradient-to-br from-[#19160f] to-black p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">AI-выводы · продажи · склад · выступления</p>
          {bizInsights.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Данные накапливаются — выводы появятся после первых продаж и выступлений.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {bizInsights.map((it, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className={it.tone === "warn" ? "text-rose-400" : it.tone === "good" ? "text-emerald-400" : "text-[#C5A059]"}>•</span>
                  <span className="text-slate-100">{it.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleSection>

      {/* 2. ОСНОВНЫЕ ПОКАЗАТЕЛИ */}
      <CollapsibleSection id="kpi" icon={BarChart3} title="Основные показатели"
        open={sectionOpen("kpi")} onToggle={() => toggleSection("kpi")}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BigKpi label="Выручка" value={money(m.revenue.total)} onClick={openRevenue}
          rows={[
            { k: "К пред. периоду", v: <DeltaBadge pct={m.revenue.momPct} /> },
            { k: "Год к году", v: <DeltaBadge pct={m.revenue.yoyPct} /> },
            { k: "Сегодня / вчера", v: <span className="text-slate-200">{money(m.revenue.today)} / {money(m.revenue.yesterday)}</span> },
            { k: "Новые / пост. / верн.", v: <span className="text-slate-200 text-[11px]">{money(m.revenue.new)} · {money(m.revenue.regular)} · {money(m.revenue.returning)}</span> }
          ]} />
        <BigKpi label="Активные абонементы" value={m.activeSubs.count} onClick={openActiveSubs}
          rows={[
            { k: "К пред. месяцу", v: <DeltaBadge pct={m.activeSubs.momPct} /> },
            { k: "Год к году", v: <DeltaBadge pct={m.activeSubs.yoyPct} /> }
          ]} />
        <BigKpi label="Заполняемость" value={m.occupancy.pct === null ? "—" : `${m.occupancy.pct}%`} onClick={openOccupancy}
          rows={[
            { k: "Мест занято", v: <span className="text-slate-200">{m.occupancy.filled} / {m.occupancy.capacity || "—"}</span> },
            ...(m.occupancy.byBranch.slice(0, 2).map((b) => ({ k: b.name, v: <span className="text-slate-300">{b.pct === null ? "—" : b.pct + "%"}</span> })))
          ]} />
        <BigKpi label="Удержание (мес→мес)" value={m.retention.pct === null ? "—" : `${m.retention.pct}%`} onClick={openRetention}
          rows={[
            { k: "Активны / всего", v: <span className="text-slate-200">{m.retention.activeStudents} / {m.retention.totalStudents}</span> },
            { k: "К пред. месяцу", v: <DeltaBadge pct={m.retention.momPct} /> },
            { k: "Год к году", v: <DeltaBadge pct={m.retention.yoyPct} /> }
          ]} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BigKpi label="Средний чек" value={m.avgCheck.all === null ? "—" : money(m.avgCheck.all)} onClick={openAvgCheck}
          rows={[
            { k: "Новые", v: <span className="text-slate-200">{m.avgCheck.new === null ? "—" : money(m.avgCheck.new)}</span> },
            { k: "Постоянные", v: <span className="text-slate-200">{m.avgCheck.regular === null ? "—" : money(m.avgCheck.regular)}</span> },
            { k: "Вернувшиеся", v: <span className="text-slate-200">{m.avgCheck.returning === null ? "—" : money(m.avgCheck.returning)}</span> },
            { k: "К пред. периоду", v: <DeltaBadge pct={m.avgCheck.momPct} /> }
          ]} />
        <BigKpi label="Должники" value={m.debtors.total} tone={m.debtors.total > 0 ? "rose" : "emerald"} onClick={openDebtors}
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
        <BigKpi label="Записи на будущее" value={m.futureEnrollments.total} onClick={openFuture}
          rows={[
            ...(m.futureEnrollments.byBranch.slice(0, 2).map((b) => ({ k: b.name, v: <span className="text-slate-200">{b.n}</span> }))),
            { k: m.futureEnrollments.isProxy ? "Лиды + пробные (прокси)" : "По возрастам", v: <span className="text-slate-500 text-[11px]">{m.futureEnrollments.byAge.map((a) => `${a.label}:${a.n}`).join(" ") || "—"}</span> }
          ]} />
        <BigKpi label="Новые ученики" value={m.newStudents.hasData ? m.newStudents.period : "—"} tone="gold" onClick={openNewStudents}
          rows={[
            { k: "Сегодня", v: <span className="text-slate-200">{m.newStudents.hasData ? m.newStudents.today : "—"}</span> },
            { k: "За период", v: <span className="text-slate-200">{m.newStudents.hasData ? m.newStudents.period : "нет данных"}</span> }
          ]} />
      </div>
      {/* Запас прочности: всего учеников и лист ожидания (с учётом фильтра) */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BigKpi label="Учеников всего" value={capacityInfo.totalStudents} tone="white" onClick={onOpenStudents ? () => onOpenStudents() : undefined}
          rows={[
            { k: "Активных", v: <span className="text-slate-200">{m.retention.activeStudents}</span> },
            { k: "Свободных мест", v: <span className="text-slate-200">{capacityInfo.freeSpots === null ? "—" : capacityInfo.freeSpots}</span> }
          ]} />
        <BigKpi label="В листе ожидания" value={capacityInfo.waitlistTotal} tone={capacityInfo.waitlistTotal > 0 ? "gold" : "white"} onClick={() => go("students")}
          rows={[
            { k: "Запас прочности", v: <span className="text-slate-300 text-[11px]">{capacityInfo.waitlistTotal > 0 ? "есть кого пригласить" : "очередь пуста"}</span> },
            { k: "Свободно мест", v: <span className="text-slate-200">{capacityInfo.freeSpots === null ? "—" : capacityInfo.freeSpots}</span> }
          ]} />
      </div>
      </CollapsibleSection>

      {/* 3. РИСКИ */}
      <CollapsibleSection id="risks" icon={AlertTriangle} title="Риски" hint="Что требует решения прямо сейчас"
        open={sectionOpen("risks")} onToggle={() => toggleSection("risks")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <RiskTile severity={dr.unpaidCurrentMonth.count > 0 ? "mid" : "low"}
            title={`Не оплатили текущий месяц — ${dr.unpaidCurrentMonth.count}`} detail="Открыть список учеников ›"
            onClick={() => openList({ ids: dr.unpaidCurrentMonth.ids, label: "Не оплатили текущий месяц" })} />
          <RiskTile severity={dr.unpaidPrevMonth.count > 0 ? "high" : "low"}
            title={`Не оплатили прошлый месяц — ${dr.unpaidPrevMonth.count}`} detail="Открыть список учеников ›"
            onClick={() => openList({ ids: dr.unpaidPrevMonth.ids, label: "Не оплатили прошлый месяц" })} />
          <RiskTile severity={m.riskTables.groupRetention.length > 0 ? "mid" : "low"}
            title={`Группы с падением удержания — ${m.riskTables.groupRetention.length}`} detail="Группа · педагог · мес→мес ›"
            onClick={openGroupRetention} />
          <RiskTile severity={m.riskTables.lowFillGroups.length > 0 ? "mid" : "low"}
            title={`Низкая заполняемость групп — ${m.riskTables.lowFillGroups.length}`} detail="Группа · педагог · заполняемость ›"
            onClick={openLowFill} />
          <RiskTile severity={m.riskTables.teacherLowRetention.length > 0 ? "mid" : "low"}
            title={`Низкое удержание у педагогов — ${m.riskTables.teacherLowRetention.length}`} detail="Педагог · удержание ›"
            onClick={openTeacherRetention} />
          <RiskTile severity={m.riskTables.overloadGroups.length > 0 ? "high" : "low"}
            title={`Перегруз групп — ${m.riskTables.overloadGroups.length}`} detail="Группа · заполняемость ›"
            onClick={openOverload} />
          <RiskTile severity={(streamRev.prod?.lowStock?.length || 0) > 0 ? "high" : "low"}
            title={`Пора докупить товар — ${streamRev.prod?.lowStock?.length ?? 0}`} detail="Товары ниже минимума ›"
            onClick={() => go("products")} />
        </div>
      </CollapsibleSection>

      {/* 4. ВОРОНКА ПРОДАЖ */}
      <CollapsibleSection id="funnel" icon={Filter} title="Воронка продаж"
        open={sectionOpen("funnel")} onToggle={() => toggleSection("funnel")}>
      <div className="grid gap-4 xl:grid-cols-3">
        <FunnelDayCard title="Сегодня" data={m.funnel.today} />
        <FunnelDayCard title="Вчера" data={m.funnel.yesterday} />
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">За текущий месяц</p>
          <div className="mt-3 space-y-2.5">
            <FunnelStage label="Лиды" n={m.funnel.month.leads} conv={null} onClick={() => openStatusList(["lead"], "Лиды")} />
            <FunnelStage label="Записались" n={m.funnel.month.signed} conv={m.funnel.month.convSigned} onClick={() => openStatusList(["trial", "active"], "Записались")} />
            <FunnelStage label="Пришли" n={m.funnel.month.came} conv={m.funnel.month.convCame} onClick={() => openStatusList(["trial", "active"], "Пришли на пробный")} />
            <FunnelStage label="Купили" n={m.funnel.month.bought} conv={m.funnel.month.convBought} onClick={() => openStatusList(["active"], "Купили абонемент")} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Этапы оцениваются по статусам учеников; точная дневная воронка накапливается из событий.</p>
        </section>
      </div>
      </CollapsibleSection>

      {/* 5. ГРАФИКИ */}
      <CollapsibleSection id="charts" icon={LineChart} title="Графики"
        open={sectionOpen("charts")} onToggle={() => toggleSection("charts")}>
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
      </CollapsibleSection>

      {/* 6. AI EXECUTIVE BRIEF */}
      <CollapsibleSection id="brief" icon={Sparkles} title="AI Executive Brief"
        open={sectionOpen("brief")} onToggle={() => toggleSection("brief")}>
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
      </CollapsibleSection>

      {/* 7 + 8. ТРЕБУЮТ ВНИМАНИЯ + ТОЧКИ РОСТА */}
      <CollapsibleSection id="growth" icon={TrendingUp} title="Точки роста и внимание"
        open={sectionOpen("growth")} onToggle={() => toggleSection("growth")}>
      <div className="grid gap-4 xl:grid-cols-2">
        <ListPanel icon={AlertTriangle} tone="rose" title="Требуют внимания" items={m.attention} />
        <ListPanel icon={TrendingUp} tone="emerald" title="Точки роста" items={m.growth} />
      </div>
      </CollapsibleSection>

      {/* 10. РЕЙТИНГИ */}
      <CollapsibleSection id="ratings" icon={Trophy} title="Рейтинги" hint="Топ-5"
        open={sectionOpen("ratings")} onToggle={() => toggleSection("ratings")}>
      <div className="grid gap-4 xl:grid-cols-3">
        <RatingTabs title="Филиалы" onClick={() => go("branches")} tabs={[
          { label: "Выручка", rows: m.ratings.branches.byRevenue.map((b) => ({ name: b.name, main: money(b.revenue), sub: `удерж. ${b.retention ?? "—"}% · чек ${b.avgCheck ? money(b.avgCheck) : "—"}`, delta: b.growthPct, onClick: () => openBranchDetail(b.id, b.name) })) },
          { label: "Удержание", rows: m.ratings.branches.byRetention.map((b) => ({ name: b.name, main: b.retention === null ? "—" : `${b.retention}%`, sub: `выручка ${money(b.revenue)}`, delta: null, onClick: () => openBranchDetail(b.id, b.name) })) },
          { label: "Чек", rows: m.ratings.branches.byAvgCheck.map((b) => ({ name: b.name, main: b.avgCheck ? money(b.avgCheck) : "—", sub: `выручка ${money(b.revenue)}`, delta: null, onClick: () => openBranchDetail(b.id, b.name) })) },
          { label: "Рост", rows: m.ratings.branches.byGrowth.map((b) => ({ name: b.name, main: b.growthPct === null ? "—" : `${b.growthPct}%`, sub: `выручка ${money(b.revenue)}`, delta: b.growthPct, onClick: () => openBranchDetail(b.id, b.name) })) }
        ]} />
        <RatingTabs title="Педагоги" onClick={() => go("teachers")} tabs={[
          { label: "Ученики", rows: m.ratings.teachers.byStudents.map((t) => ({ name: t.name, main: `${t.students} уч.`, sub: `удерж. ${t.retention ?? "—"}% · ${money(t.revenue)}`, delta: null, onClick: () => openTeacherDetail(t.id, t.name) })) },
          { label: "Удержание", rows: m.ratings.teachers.byRetention.map((t) => ({ name: t.name, main: t.retention === null ? "—" : `${t.retention}%`, sub: `${t.students} уч.`, delta: null, onClick: () => openTeacherDetail(t.id, t.name) })) },
          { label: "Выручка", rows: m.ratings.teachers.byRevenue.map((t) => ({ name: t.name, main: money(t.revenue), sub: `${t.students} уч. · удерж. ${t.retention ?? "—"}%`, delta: null, onClick: () => openTeacherDetail(t.id, t.name) })) },
          { label: "Прирост", rows: m.ratings.teachers.byGrowth.map((t) => ({ name: t.name, main: t.growthPct === null ? "—" : `${t.growthPct}%`, sub: `${t.students} уч.`, delta: t.growthPct, onClick: () => openTeacherDetail(t.id, t.name) })) }
        ]} />
        <RatingTabs title="Группы" onClick={() => go("schedule")} tabs={[
          { label: "Выручка", rows: m.ratings.groups.byRevenue.map((g) => ({ name: g.name, main: money(g.revenue), sub: `запол. ${g.occupancy ?? "—"}% · удерж. ${g.retention ?? "—"}%`, delta: null, onClick: () => openGroupDetail(g.id, g.name) })) },
          { label: "Заполняемость", rows: m.ratings.groups.byOccupancy.map((g) => ({ name: g.name, main: g.occupancy === null ? "—" : `${g.occupancy}%`, sub: `выручка ${money(g.revenue)}`, delta: null, onClick: () => openGroupDetail(g.id, g.name) })) },
          { label: "Удержание", rows: m.ratings.groups.byRetention.map((g) => ({ name: g.name, main: g.retention === null ? "—" : `${g.retention}%`, sub: `выручка ${money(g.revenue)}`, delta: null, onClick: () => openGroupDetail(g.id, g.name) })) }
        ]} />
      </div>
      </CollapsibleSection>

      {/* 11. AI-АНАЛИЗ МЕСЯЦА */}
      <CollapsibleSection id="aimonth" icon={FileText} title="AI-анализ месяца"
        open={sectionOpen("aimonth")} onToggle={() => toggleSection("aimonth")}>
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
      </CollapsibleSection>

      {riskTable && <RiskTableModal data={riskTable} onClose={() => setRiskTable(null)} />}
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

// Сворачиваемый блок дашборда: заголовок-переключатель + контент (▼ Развернуть / ▲ Свернуть).
function CollapsibleSection({ id, icon: Icon, title, hint, open, onToggle, children }: {
  id: string; icon: React.ElementType; title: string; hint?: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" data-section={id}>
      <button onClick={onToggle} className="group mt-1 flex w-full items-center gap-2 text-left">
        <Icon className="h-4 w-4 text-[#C5A059]" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">{title}</h2>
        {hint && <span className="hidden text-xs text-slate-500 sm:inline">· {hint}</span>}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 transition group-hover:border-[#C5A059]/40 group-hover:text-[#C5A059]">
          {open ? <><ChevronUp className="h-3.5 w-3.5" /> Свернуть</> : <><ChevronDown className="h-3.5 w-3.5" /> Развернуть</>}
        </span>
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </section>
  );
}

// Цветная ячейка изменения удержания (мес→мес).
function ChangeCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500">—</span>;
  const good = value >= 0;
  return <span className={`font-bold ${good ? "text-emerald-400" : "text-rose-400"}`}>{value > 0 ? "+" : ""}{value}%</span>;
}

// Универсальное окно детализации с цветным градиентным заголовком.
function RiskTableModal({ data, onClose }: { data: DetailModalData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141414] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Градиентная шапка */}
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-white drop-shadow-sm">{data.title}</h3>
            {data.subtitle && <p className="mt-0.5 text-xs font-bold text-white/90">{data.subtitle}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-xl bg-black/20 p-1.5 text-white transition hover:bg-black/40"><X className="h-4 w-4" /></button>
        </div>
        {/* Тело */}
        <div className="overflow-auto p-5">
          {data.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{data.empty || "Данные накапливаются."}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  {data.columns.map((c) => <th key={c} className="py-2 pr-3 font-black">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    {r.map((cell, j) => <td key={j} className="py-2.5 pr-3 text-slate-200">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.note && <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{data.note}</p>}
        </div>
        {/* Футер (опц.) */}
        {data.footer && (
          <div className="border-t border-white/10 p-3">
            <button onClick={data.footer.onClick}
              className="w-full rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#C5A059] transition hover:bg-[#C5A059] hover:text-black">
              {data.footer.label}
            </button>
          </div>
        )}
      </div>
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

// ---------- Ежедневный отчёт руководителя: «Здоровье студии за 30 секунд» ----------
function DailyManagerReport({ report, scopeLabel, periodLabel, onOpenList, onGo, onRevenue }: {
  report: DailyReport;
  scopeLabel: string;
  periodLabel: string;
  onOpenList: (preset: RegistryPreset) => void;
  onGo: (tab: string) => void;
  onRevenue: () => void;
}) {
  const toneCls: Record<string, string> = {
    gold: "text-[#C5A059]", white: "text-white", rose: "text-rose-400", emerald: "text-emerald-400", amber: "text-amber-400",
  };
  const stats: { label: string; value: React.ReactNode; tone: string; hint?: string; onClick: () => void }[] = [
    { label: "Выручка сегодня", value: money(report.revenueToday), tone: "gold", hint: `${report.paymentsToday} ${report.paymentsToday === 1 ? "оплата" : "оплат"}`, onClick: onRevenue },
    { label: "Записи на пробный", value: `${report.trialSignups.today} / ${report.trialSignups.yesterday}`, tone: "gold", hint: "сегодня / вчера", onClick: () => onOpenList({ ids: [...report.trialSignups.todayIds, ...report.trialSignups.yesterdayIds], label: "Записи на пробный (сегодня и вчера)" }) },
    { label: "Продлили на след. период", value: report.renewedNextPeriod.count, tone: "emerald", hint: "уже купили след. месяц", onClick: () => onOpenList({ ids: report.renewedNextPeriod.ids, label: "Продлили на следующий период" }) },
    { label: "Активные абонементы", value: report.activeSubs, tone: "white", onClick: () => onOpenList({ segment: "active", label: "Активные ученики" }) },
    { label: "Должники", value: report.debtors.count, tone: report.debtors.count > 0 ? "rose" : "emerald", onClick: () => onOpenList({ ids: report.debtors.ids, label: "Должники" }) },
    { label: "Новые ученики", value: report.newStudents.count, tone: "gold", onClick: () => onOpenList({ ids: report.newStudents.ids, label: `Новые ученики · ${periodLabel}` }) },
  ];

  return (
    <section className="rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#1B160B] via-[#121212] to-black p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#C5A059] p-2.5 text-black"><ClipboardList className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Ежедневный отчёт руководителя · Здоровье студии за 30 секунд</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{report.summary}</p>
          <p className="mt-1 text-[11px] text-slate-500">{scopeLabel} · {periodLabel}</p>
        </div>
      </div>

      {/* Кликабельные показатели */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <button key={s.label} onClick={s.onClick}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition hover:border-[#C5A059]/45 hover:bg-white/[0.06]">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1.5 text-xl font-black ${toneCls[s.tone] || "text-white"}`}>{s.value}</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500 group-hover:text-[#C5A059]">
              {s.hint || "Открыть список"} <ArrowRight className="h-3 w-3" />
            </p>
          </button>
        ))}
      </div>
    </section>
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

function FunnelStage({ label, n, conv, onClick }: { label: string; n: number; conv: number | null; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition ${onClick ? "hover:border-[#C5A059]/40 hover:bg-white/[0.06]" : "cursor-default"}`}>
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <span className="flex items-center gap-3">
        <span className="text-base font-black text-white">{n}</span>
        {conv !== null && <span className="rounded-lg bg-[#C5A059]/15 px-2 py-0.5 text-[11px] font-bold text-[#C5A059]">{conv}%</span>}
      </span>
    </button>
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

type RatingRow = { name: string; main: string; sub: string; delta: number | null; onClick?: () => void };
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
          <button key={i} onClick={r.onClick} disabled={!r.onClick}
            className={`flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition ${r.onClick ? "hover:border-[#C5A059]/40 hover:bg-white/[0.06]" : "cursor-default"}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#C5A059]/15 text-xs font-black text-[#C5A059]">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{r.name}</p>
              <p className="truncate text-[11px] text-slate-500">{r.sub}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-[#C5A059]">{r.main}</p>
              {r.delta !== null && <DeltaBadge pct={r.delta} />}
            </div>
          </button>
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

function StudentsNetworkView({ students, branches, groups, teachers, onCreateStudent, onUpdateStudent, onDeleteStudent, onOpenPayment, onSellSubscription, subscriptionPlans = [], studentTrash = [], onRestoreStudent, onConfirmDeleteStudent, studentArchive = [], onArchiveStudent, onUnarchiveStudent, leadSources = [], waitlist = [], onAddToWaitlist, onRemoveFromWaitlist, onCreateLeadSource, onUpdateLeadSource, onDeleteLeadSource, preset }: {
  students: Student[];
  branches: Branch[];
  groups: Group[];
  teachers: Teacher[];
  onCreateStudent?: (data: StudentInput) => Promise<string | boolean | null>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  subscriptionPlans?: SubscriptionPlan[];
  studentTrash?: TrashStudent[];
  onRestoreStudent?: (id: string) => Promise<boolean>;
  onConfirmDeleteStudent?: (id: string) => Promise<boolean>;
  studentArchive?: ArchiveStudent[];
  onArchiveStudent?: (id: string, reason: string, comment: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<boolean>;
  leadSources?: LeadSource[];
  waitlist?: WaitlistEntry[];
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean>;
  onRemoveFromWaitlist?: (id: string, reason?: string) => Promise<boolean>;
  onCreateLeadSource?: (data: { name: string }) => Promise<boolean>;
  onUpdateLeadSource?: (id: string, data: { name?: string; status?: string }) => Promise<boolean>;
  onDeleteLeadSource?: (id: string) => Promise<boolean>;
  preset?: RegistryPreset | null;
}) {
  const [trashBusy, setTrashBusy] = useState<string | null>(null);
  // Ученик из корзины, которого владелец переводит в архив (модалка комментариев).
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [unarchiveBusy, setUnarchiveBusy] = useState<string | null>(null);
  const branchNameById = (id: string) => branches.find((b) => b.id === id)?.name || "—";
  const restore = async (t: TrashStudent) => {
    if (!onRestoreStudent) return;
    setTrashBusy(t.id);
    await onRestoreStudent(t.id);
    setTrashBusy(null);
  };
  const confirmArchive = async (reason: string, comment: string) => {
    if (!onArchiveStudent || !archiveTarget) return;
    setArchiveBusy(true);
    await onArchiveStudent(archiveTarget.id, reason, comment);
    setArchiveBusy(false);
    setArchiveTarget(null);
  };
  const unarchive = async (a: ArchiveStudent) => {
    if (!onUnarchiveStudent) return;
    if (!window.confirm(`Вернуть «${a.name}» из архива в активный реестр?`)) return;
    setUnarchiveBusy(a.id);
    await onUnarchiveStudent(a.id);
    setUnarchiveBusy(null);
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
        onArchiveStudent={onArchiveStudent}
        onOpenPayment={onOpenPayment}
        onSellSubscription={onSellSubscription}
        plans={subscriptionPlans}
        leadSources={leadSources}
        waitlist={waitlist}
        onAddToWaitlist={onAddToWaitlist}
        onRemoveFromWaitlist={onRemoveFromWaitlist}
        onCreateLeadSource={onCreateLeadSource}
        onUpdateLeadSource={onUpdateLeadSource}
        onDeleteLeadSource={onDeleteLeadSource}
        preset={preset}
      />

            <div className="overflow-hidden rounded-[2rem] border border-rose-500/20 bg-[#140f10]">
        <div className="flex items-center justify-between gap-3 border-b border-rose-500/15 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-rose-500/15 p-2.5 text-rose-400"><Trash2 className="h-5 w-5" /></div>
            <div>
              <h3 className="font-black text-white">Корзина учеников</h3>
              <p className="text-xs text-slate-500">Заявки на удаление от руководителей филиалов. Владелец возвращает ученика или переводит в архив (данные сохраняются).</p>
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
                <button onClick={() => setArchiveTarget({ id: t.id, name: t.name })} disabled={trashBusy === t.id || !onArchiveStudent} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40">В архив</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Архив учеников — сохранённая база для будущих рассылок и возврата. */}
      <div className="mt-6 overflow-hidden rounded-[2rem] border border-amber-500/20 bg-[#14110d]">
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/15 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-500/15 p-2.5 text-amber-300"><Archive className="h-5 w-5" /></div>
            <div>
              <h3 className="font-black text-white">Архив учеников</h3>
              <p className="text-xs text-slate-500">Ушедшие ученики с сохранёнными данными. Основа для маркетинговых рассылок и возврата.</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${studentArchive.length ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-slate-500"}`}>{studentArchive.length}</span>
        </div>

        {studentArchive.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">Архив пуст.</p>
        ) : (
          studentArchive.map((a) => (
            <div key={a.id} className="grid grid-cols-1 gap-3 border-b border-white/5 px-5 py-3 text-sm md:grid-cols-12 md:items-start">
              <div className="md:col-span-3">
                <p className="font-bold text-white">{a.name}</p>
                <p className="text-xs text-slate-500">{branchNameById(a.branchId)} · {a.phone || a.parentPhone || "—"}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-600">Почему ушёл</p>
                <p className="text-slate-200">{a.archiveReason || "—"}</p>
              </div>
              <div className="md:col-span-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-600">Комментарий</p>
                <p className="text-slate-300">{a.archiveComment || "—"}</p>
                <p className="mt-1 text-[11px] text-slate-600">{a.archivedBy} · {a.archivedAt ? new Date(a.archivedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
              </div>
              <div className="flex justify-end md:col-span-2">
                <button onClick={() => unarchive(a)} disabled={unarchiveBusy === a.id || !onUnarchiveStudent} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40">{unarchiveBusy === a.id ? "…" : "Вернуть"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {archiveTarget && (
        <ArchiveReasonModal
          title={`В архив: ${archiveTarget.name}`}
          subtitle="Укажите причину ухода и комментарий"
          busy={archiveBusy}
          onConfirm={confirmArchive}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
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

function TeachersNetworkView({ teachers, metrics, branches, students = [], groups = [], payments = [], onCreateTeacher, onUpdateTeacher, onDeleteTeacher }: {
  teachers: Teacher[];
  metrics: ExecutiveSummary;
  branches: Branch[];
  students?: Student[];
  groups?: Group[];
  payments?: Payment[];
  onCreateTeacher?: (data: TeacherInput) => Promise<boolean>;
  onUpdateTeacher?: (id: string, data: TeacherInput) => Promise<boolean>;
  onDeleteTeacher?: (id: string) => Promise<boolean>;
}) {
  const empty: TeacherInput = { name: "", phone: "", specialization: "", branchId: branches[0]?.id || "", role: "teacher" };
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherInput>(empty);
  const [busy, setBusy] = useState(false);
  const [cardTeacherId, setCardTeacherId] = useState<string | null>(null);
  const canManage = Boolean(onCreateTeacher);

  const branchName = (id?: string | null) => branches.find((b) => b.id === id)?.name || "— не назначен —";
  const metricFor = (id: string) => metrics.teacherPerformance.find((m) => m.teacherId === id);
  const cardTeacher = teachers.find((t) => t.id === cardTeacherId) || null;

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

  if (cardTeacher) {
    return <TeacherCard teacher={cardTeacher} metric={metricFor(cardTeacher.id)} branchName={branchName(cardTeacher.branchId)}
      students={students} groups={groups} payments={payments} onBack={() => setCardTeacherId(null)} />;
  }

  return (
    <OwnerScreen title="Преподаватели сети" subtitle="Статистика и управление персоналом. Владелец может добавлять, редактировать, архивировать сотрудников, назначать филиал и выдавать права (роль). Нажмите на преподавателя, чтобы открыть карточку с KPI, зарплатой и стажировкой.">
      {/* Performance cards */}
      <div className="grid gap-4 xl:grid-cols-3">
        {metrics.teacherPerformance.map((teacherMetric) => {
          const teacher = teachers.find((item) => item.id === teacherMetric.teacherId);
          return (
            <article key={teacherMetric.teacherId} onClick={() => setCardTeacherId(teacherMetric.teacherId)}
              className="cursor-pointer rounded-[2rem] border border-white/10 bg-[#121212] p-5 transition hover:border-[#C5A059]/40">
              {teacher && <img src={teacher.photoUrl} alt={teacher.name} className="h-20 w-20 rounded-full border border-[#C5A059]/35 object-cover" />}
              <h3 className="mt-4 text-lg font-black text-white">{teacherMetric.teacherName}</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniMetric label="Ученики" value={teacherMetric.studentsCount} />
                <MiniMetric label="Удержание" value={`${teacherMetric.retentionRate}%`} />
                <MiniMetric label="Посещ." value={`${teacherMetric.averageAttendance}%`} />
                <MiniMetric label="Спасибо" value="57" />
              </div>
              <p className="mt-3 text-xs font-bold text-[#C5A059]">Открыть карточку ›</p>
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
            <div key={t.id} onClick={() => setCardTeacherId(t.id)}
              className="grid cursor-pointer grid-cols-2 gap-2 border-b border-white/5 px-5 py-3 text-sm transition hover:bg-white/[0.03] md:grid-cols-12 md:items-center">
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
                  <button onClick={(e) => { e.stopPropagation(); startEdit(t); }} title="Редактировать" className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]"><Pencil className="h-4 w-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); remove(t); }} title="Архивировать" className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:border-red-500/40 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
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

// ===================== КАРТОЧКА ПЕДАГОГА (миграция 020) =====================
const COMP_SCHEME_LABEL: Record<string, string> = {
  percent: "% от выручки групп",
  per_lesson: "За проведённое занятие",
  fixed: "Фиксированный оклад",
  mixed: "Смешанная",
};
// Диапазоны периода на клиенте (cur/prev/yoy), синхронно с server periodRanges.
function clientPeriodRange(period: string) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const mk = (s: Date, e: Date) => ({ start: iso(s), end: iso(e) });
  const Y = d.getFullYear(), M = d.getMonth();
  switch (period) {
    case "today": { const p = new Date(d); p.setDate(p.getDate() - 1); const y = new Date(d); y.setFullYear(y.getFullYear() - 1); return { cur: mk(d, d), prev: mk(p, p), yoy: mk(y, y) }; }
    case "yesterday": { const c = new Date(d); c.setDate(c.getDate() - 1); const p = new Date(c); p.setDate(p.getDate() - 1); const y = new Date(c); y.setFullYear(y.getFullYear() - 1); return { cur: mk(c, c), prev: mk(p, p), yoy: mk(y, y) }; }
    case "week": { const e = new Date(d); const s = new Date(d); s.setDate(s.getDate() - 6); const pe = new Date(s); pe.setDate(pe.getDate() - 1); const ps = new Date(pe); ps.setDate(ps.getDate() - 6); const ys = new Date(s); ys.setFullYear(ys.getFullYear() - 1); const ye = new Date(e); ye.setFullYear(ye.getFullYear() - 1); return { cur: mk(s, e), prev: mk(ps, pe), yoy: mk(ys, ye) }; }
    case "quarter": { const q = Math.floor(M / 3); return { cur: mk(new Date(Y, q * 3, 1), new Date(Y, q * 3 + 3, 0)), prev: mk(new Date(Y, q * 3 - 3, 1), new Date(Y, q * 3, 0)), yoy: mk(new Date(Y - 1, q * 3, 1), new Date(Y - 1, q * 3 + 3, 0)) }; }
    case "year": return { cur: mk(new Date(Y, 0, 1), new Date(Y, 11, 31)), prev: mk(new Date(Y - 1, 0, 1), new Date(Y - 1, 11, 31)), yoy: mk(new Date(Y - 1, 0, 1), new Date(Y - 1, 11, 31)) };
    default: return { cur: mk(new Date(Y, M, 1), new Date(Y, M + 1, 0)), prev: mk(new Date(Y, M - 1, 1), new Date(Y, M, 0)), yoy: mk(new Date(Y - 1, M, 1), new Date(Y - 1, M + 1, 0)) };
  }
}

function TeacherCard({ teacher, metric, branchName, students, groups, payments, onBack }: {
  teacher: Teacher; metric?: any; branchName: string;
  students: Student[]; groups: Group[]; payments: Payment[]; onBack: () => void;
}) {
  const [period, setPeriod] = useState("month");
  const [card, setCard] = useState<any>(null);
  const [comp, setComp] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/mvp/teachers/${teacher.id}/card?period=${period}`, ownerHdr);
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setCard(d); setComp(d.compensation); setOnboarding(d.onboarding || []); setPayouts(d.payouts || []);
    } catch (e: any) { setError(e?.message || "Не удалось загрузить карточку"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [teacher.id, period]);

  // --- KPI из уже загруженных данных ---
  const r = useMemo(() => clientPeriodRange(period), [period]);
  const teacherGroups = useMemo(() => groups.filter((g) => g.teacherId === teacher.id), [groups, teacher.id]);
  const groupIdSet = useMemo(() => new Set(teacherGroups.map((g) => g.id)), [teacherGroups]);
  const teacherStudents = useMemo(() => students.filter((s) =>
    s.teacherId === teacher.id || (s.groupIds || []).some((gid) => groupIdSet.has(gid))), [students, teacher.id, groupIdSet]);
  const studentIdSet = useMemo(() => new Set(teacherStudents.map((s) => s.id)), [teacherStudents]);

  const inRng = (date: string, rng: { start: string; end: string }) => date >= rng.start && date <= rng.end;
  const revIn = (rng: { start: string; end: string }) => payments
    .filter((p) => p.status === "paid" && studentIdSet.has(p.studentId) && inRng(p.date, rng))
    .reduce((s, p) => s + p.amount, 0);
  const revCur = revIn(r.cur), revPrev = revIn(r.prev), revYoy = revIn(r.yoy);
  const growthPct = revPrev > 0 ? Math.round(((revCur - revPrev) / revPrev) * 1000) / 10 : null;
  const yoyPct = revYoy > 0 ? Math.round(((revCur - revYoy) / revYoy) * 1000) / 10 : null;

  const activeSubs = teacherStudents.filter((s) => (s.subscriptions || []).some((sub) => sub.status === "active")).length;
  const retention = teacherStudents.length ? Math.round((activeSubs / teacherStudents.length) * 100) : null;
  const attendance = metric?.averageAttendance ?? null;
  const capacity = teacherGroups.reduce((s, g) => s + (g.capacity || 0), 0);
  const filled = teacherGroups.reduce((s, g) => s + (g.studentCount || 0), 0);
  const occupancy = capacity > 0 ? Math.round((filled / capacity) * 100) : null;
  const ratingParts = [retention, attendance, occupancy].filter((x): x is number => x !== null);
  const rating = ratingParts.length ? Math.round(ratingParts.reduce((a, b) => a + b, 0) / ratingParts.length) : null;

  // --- Зарплата ---
  const lessonsCompleted = card?.lessonsCompleted ?? 0;
  const scheme = comp?.scheme || "percent";
  const baseAmount = (scheme === "fixed" || scheme === "mixed") ? (comp?.baseSalary || 0) : 0;
  const percentAmount = (scheme === "percent" || scheme === "mixed") ? Math.round(revCur * (comp?.percent || 0) / 100) : 0;
  const perLessonAmount = (scheme === "per_lesson" || scheme === "mixed") ? lessonsCompleted * (comp?.perLessonRate || 0) : 0;
  const salaryTotal = baseAmount + percentAmount + perLessonAmount;

  const saveComp = async (next: any) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/mvp/teachers/${teacher.id}/compensation`, { method: "PATCH", ...jsonOwnerHdr, body: JSON.stringify(next) });
      if (!res.ok) throw new Error(await res.text());
      setComp((await res.json()).compensation);
    } catch (e: any) { setError(e?.message || "Не удалось сохранить схему"); } finally { setBusy(false); }
  };
  const toggleStep = async (step: any) => {
    setOnboarding((prev) => prev.map((s) => s.id === step.id ? { ...s, done: !step.done } : s));
    try { await fetch(`/api/mvp/teachers/${teacher.id}/onboarding/${step.id}`, { method: "PATCH", ...jsonOwnerHdr, body: JSON.stringify({ done: !step.done }) }); }
    catch { load(); }
  };
  const addPayout = async (payload: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/mvp/teachers/${teacher.id}/payouts`, { method: "POST", ...jsonOwnerHdr, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setShowPayout(false); await load();
    } catch (e: any) { setError(e?.message || "Не удалось добавить выплату"); } finally { setBusy(false); }
  };
  const delPayout = async (id: string) => { setBusy(true); try { await fetch(`/api/mvp/teachers/${teacher.id}/payouts/${id}`, { method: "DELETE", headers: { "x-demo-role": "owner" } }); await load(); } finally { setBusy(false); } };

  const doneSteps = onboarding.filter((s) => s.done).length;
  const onboardPct = onboarding.length ? Math.round((doneSteps / onboarding.length) * 100) : 0;

  const payoutMonths = useMemo(() => {
    const map: Record<string, { paid: number; planned: number }> = {};
    payouts.forEach((p) => { const mo = String(p.periodStart).slice(0, 7); if (!map[mo]) map[mo] = { paid: 0, planned: 0 }; if (p.status === "paid") map[mo].paid += p.amount; else map[mo].planned += p.amount; });
    return Object.keys(map).sort().map((mo) => ({ name: mo.slice(5) + "." + mo.slice(2, 4), Выплачено: map[mo].paid, Запланировано: map[mo].planned }));
  }, [payouts]);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-slate-400 transition hover:text-white"><ChevronLeft className="h-4 w-4" /> К списку преподавателей</button>

      {/* Профиль */}
      <section className="rounded-[1.75rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#1a1710] to-black p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img src={teacher.photoUrl} alt={teacher.name} className="h-20 w-20 rounded-2xl border border-[#C5A059]/35 object-cover" />
            <div>
              <h1 className="text-2xl font-black text-white">{teacher.name}</h1>
              <p className="mt-1 text-sm text-slate-400">{teacher.specialties?.join(", ") || "Кавказский танец"}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {branchName}</span>
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {teacher.phone || "—"}</span>
                <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> стаж {teacher.experienceYears} лет</span>
                <span className="rounded-lg bg-white/5 px-2 py-0.5 font-bold text-[#C5A059]">{ROLE_LABELS[teacher.role || "teacher"]}</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Рейтинг</p>
            <p className="text-4xl font-black text-[#C5A059]">{rating === null ? "—" : rating}</p>
            <p className="text-[11px] text-slate-500">из 100</p>
          </div>
        </div>
      </section>

      {/* Период */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">KPI и качество</h3>
        <PeriodChips period={period} onChange={setPeriod} />
      </div>
      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Ученики" value={teacherStudents.length} tone="white" hint={`${teacherGroups.length} групп`} />
        <StatPill label="Удержание" value={retention === null ? "—" : `${retention}%`} hint={`активных абон. ${activeSubs}`} />
        <StatPill label="Посещаемость" value={attendance === null ? "—" : `${attendance}%`} />
        <StatPill label="Заполняемость групп" value={occupancy === null ? "—" : `${occupancy}%`} hint={`${filled} / ${capacity || "—"} мест`} />
        <StatPill label="Выручка групп" value={money(revCur)} hint={<DeltaBadge pct={growthPct} />} />
        <StatPill label="Год к году" value={yoyPct === null ? "—" : `${yoyPct > 0 ? "+" : ""}${yoyPct}%`} />
        <StatPill label="Проведено занятий" value={lessonsCompleted} tone="white" hint="за период" />
        <StatPill label="Рейтинг" value={rating === null ? "—" : `${rating}/100`} tone="emerald" />
      </div>

      {/* Группы и ученики */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Группы и ученики</h3>
        {teacherGroups.length === 0 && <p className="mt-3 text-sm text-slate-500">У педагога пока нет групп.</p>}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {teacherGroups.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div>
                <p className="text-sm font-bold text-white">{g.name}</p>
                <p className="text-[11px] text-slate-500">{g.ageGroup} · {g.scheduleText || "по расписанию"}</p>
              </div>
              <span className="text-xs text-slate-300">{g.studentCount}{g.capacity ? ` / ${g.capacity}` : ""} уч.</span>
            </div>
          ))}
        </div>
      </section>

      {/* Зарплата */}
      <CompensationBlock comp={comp} scheme={scheme} busy={busy} onSave={saveComp}
        breakdown={{ baseAmount, percentAmount, perLessonAmount, salaryTotal, revCur, lessonsCompleted }}
        onAccrue={() => { setShowPayout(true); }} />

      {/* Выплаты */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Выплаты и начисления</h3>
          <button onClick={() => setShowPayout(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#C5A059]/40 px-3 py-1.5 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10"><Plus className="h-4 w-4" /> Начислить</button>
        </div>
        {payouts.length === 0 && <p className="mt-3 text-sm text-slate-500">Выплат пока нет.</p>}
        {payoutMonths.length > 0 && (
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payoutMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `${Math.round(v / 1000)}к`} />
                <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ background: "#0b0b0b", border: "1px solid #ffffff20", borderRadius: 12 }} labelStyle={{ color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Выплачено" stackId="a" fill="#34d399" />
                <Bar dataKey="Запланировано" stackId="a" fill="#C5A059" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div>
                <p className="text-sm font-bold text-white">{money(p.amount)} <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>{p.status === "paid" ? "Выплачено" : "Запланировано"}</span></p>
                <p className="text-[11px] text-slate-500">{p.periodStart} — {p.periodEnd}{p.comment ? ` · ${p.comment}` : ""}</p>
              </div>
              <button onClick={() => delPayout(p.id)} className="rounded-lg p-1 text-slate-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Стажировка */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Стажировка / онбординг</h3>
          <span className="text-xs font-bold text-[#C5A059]">{doneSteps}/{onboarding.length} · {onboardPct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${onboardPct}%` }} />
        </div>
        <div className="mt-3 space-y-1.5">
          {onboarding.map((s) => (
            <button key={s.id} onClick={() => toggleStep(s)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-[#C5A059]/30">
              <CheckCircle className={`h-5 w-5 shrink-0 ${s.done ? "text-emerald-400" : "text-slate-600"}`} />
              <span className={`text-sm ${s.done ? "text-slate-200" : "text-slate-400"}`}>{s.title}</span>
            </button>
          ))}
        </div>
      </section>

      {showPayout && <PayoutModal busy={busy} defaultAmount={salaryTotal} period={r.cur} onClose={() => setShowPayout(false)} onSubmit={addPayout} />}
    </div>
  );
}

function CompensationBlock({ comp, scheme, busy, onSave, breakdown, onAccrue }: any) {
  const [form, setForm] = useState<any>({ scheme, baseSalary: comp?.baseSalary || 0, percent: comp?.percent || 0, perLessonRate: comp?.perLessonRate || 0 });
  useEffect(() => { setForm({ scheme: comp?.scheme || "percent", baseSalary: comp?.baseSalary || 0, percent: comp?.percent || 0, perLessonRate: comp?.perLessonRate || 0 }); }, [comp]);
  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));
  const showPercent = form.scheme === "percent" || form.scheme === "mixed";
  const showLesson = form.scheme === "per_lesson" || form.scheme === "mixed";
  const showBase = form.scheme === "fixed" || form.scheme === "mixed";
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">Зарплата</h3>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        {/* Настройка схемы */}
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Схема расчёта
            <select value={form.scheme} onChange={(e) => set("scheme", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              {Object.entries(COMP_SCHEME_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-black">{v}</option>)}
            </select></label>
          <div className="grid grid-cols-2 gap-2">
            {showBase && <ModalInput label="Оклад, ₸" type="number" value={form.baseSalary} onChange={(v) => set("baseSalary", v)} />}
            {showPercent && <ModalInput label="% от выручки" type="number" value={form.percent} onChange={(v) => set("percent", v)} />}
            {showLesson && <ModalInput label="Ставка за занятие, ₸" type="number" value={form.perLessonRate} onChange={(v) => set("perLessonRate", v)} />}
          </div>
          <button disabled={busy} onClick={() => onSave({ scheme: form.scheme, baseSalary: Number(form.baseSalary) || 0, percent: Number(form.percent) || 0, perLessonRate: Number(form.perLessonRate) || 0 })}
            className="rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black disabled:opacity-50">Сохранить схему</button>
        </div>
        {/* Расчёт за период */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1710] to-black p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Расчёт за период · {COMP_SCHEME_LABEL[scheme]}</p>
          <div className="mt-2 space-y-1.5 text-sm">
            {breakdown.baseAmount > 0 && <Row k="Оклад" v={money(breakdown.baseAmount)} />}
            {breakdown.percentAmount > 0 && <Row k={`% от выручки (${money(breakdown.revCur)})`} v={money(breakdown.percentAmount)} />}
            {breakdown.perLessonAmount > 0 && <Row k={`За занятия (${breakdown.lessonsCompleted})`} v={money(breakdown.perLessonAmount)} />}
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="font-bold text-white">Итого к выплате</span>
              <span className="text-lg font-black text-emerald-400">{money(breakdown.salaryTotal)}</span>
            </div>
          </div>
          <button onClick={onAccrue} className="mt-3 w-full rounded-xl border border-[#C5A059]/40 px-3 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10">Начислить эту сумму ›</button>
        </div>
      </div>
    </section>
  );
}

function PayoutModal({ busy, defaultAmount, period, onClose, onSubmit }: any) {
  const [amount, setAmount] = useState(String(defaultAmount || 0));
  const [status, setStatus] = useState("planned");
  const [periodStart, setPeriodStart] = useState(period?.start || new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(period?.end || new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const submit = () => { if (Number(amount) <= 0) return; onSubmit({ amount: Number(amount), status, periodStart, periodEnd, comment }); };
  return (
    <ModalShell title="Начисление педагогу" onClose={onClose}>
      <ModalInput label="Сумма, ₸" type="number" value={amount} onChange={setAmount} />
      <label className="flex flex-col gap-1 text-[11px] text-slate-400">Статус
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          <option value="planned" className="bg-black">Запланировано</option>
          <option value="paid" className="bg-black">Выплачено</option>
        </select></label>
      <ModalInput label="Период с" type="date" value={periodStart} onChange={setPeriodStart} />
      <ModalInput label="Период по" type="date" value={periodEnd} onChange={setPeriodEnd} />
      <ModalInput label="Комментарий" value={comment} onChange={setComment} full />
      <ModalActions busy={busy} onClose={onClose} onSubmit={submit} submitLabel="Начислить" />
    </ModalShell>
  );
}

// ===================== ВЕДОМОСТЬ ЗАРПЛАТ =====================
function teacherStudentIdSet(teacher: Teacher, students: Student[], groups: Group[]) {
  const gids = new Set(groups.filter((g) => g.teacherId === teacher.id).map((g) => g.id));
  return new Set(students.filter((s) => s.teacherId === teacher.id || (s.groupIds || []).some((id) => gids.has(id))).map((s) => s.id));
}

export function PayrollView({ teachers, students, groups, payments, role = "owner" }: { teachers: Teacher[]; students: Student[]; groups: Group[]; payments: Payment[]; role?: string; }) {
  const hdr = useMemo(() => ({ headers: { "x-demo-role": role } }), [role]);
  const jhdr = useMemo(() => ({ headers: { "Content-Type": "application/json", "x-demo-role": role } }), [role]);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<any>({ comp: {}, lessons: {}, paid: {} });
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const r = useMemo(() => clientPeriodRange(period), [period]);

  const load = async () => {
    try {
      const [pRes, hRes] = await Promise.all([
        fetch(`/api/mvp/teachers/payroll?period=${period}`, hdr),
        fetch(`/api/mvp/teachers/payouts/history?months=12`, hdr),
      ]);
      if (pRes.ok) setData(await pRes.json());
      if (hRes.ok) setHistory((await hRes.json()).months || []);
    } catch { /* no-op */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  const autoclose = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/mvp/lessons/autoclose`, { method: "POST", ...jhdr, body: "{}" });
      const d = await res.json();
      setMsg(`Закрыто прошедших уроков: ${d.closed ?? 0}`); await load();
    } catch (e: any) { setMsg(e?.message || "Ошибка автозакрытия"); } finally { setBusy(false); }
  };

  const rows = useMemo(() => teachers.map((t) => {
    const ids = teacherStudentIdSet(t, students, groups);
    const revenue = payments.filter((p) => p.status === "paid" && ids.has(p.studentId) && p.date >= r.cur.start && p.date <= r.cur.end).reduce((s, p) => s + p.amount, 0);
    const comp = data.comp[t.id] || { scheme: "percent", baseSalary: 0, percent: 0, perLessonRate: 0 };
    const lessons = data.lessons[t.id] || 0;
    const paid = data.paid[t.id] || 0;
    const base = (comp.scheme === "fixed" || comp.scheme === "mixed") ? comp.baseSalary : 0;
    const pct = (comp.scheme === "percent" || comp.scheme === "mixed") ? Math.round(revenue * comp.percent / 100) : 0;
    const perLesson = (comp.scheme === "per_lesson" || comp.scheme === "mixed") ? lessons * comp.perLessonRate : 0;
    const total = base + pct + perLesson;
    return { t, scheme: comp.scheme, revenue, lessons, total, paid, balance: total - paid };
  }), [teachers, students, groups, payments, data, r]);

  const totals = rows.reduce((a, x) => ({ revenue: a.revenue + x.revenue, total: a.total + x.total, paid: a.paid + x.paid, balance: a.balance + x.balance }), { revenue: 0, total: 0, paid: 0, balance: 0 });

  const accrueAll = async () => {
    const items = rows.filter((x) => x.balance > 0).map((x) => ({ teacherId: x.t.id, amount: x.balance }));
    if (items.length === 0) { setMsg("Нет сумм к начислению."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/mvp/teachers/payroll/accrue`, { method: "POST", ...jhdr, body: JSON.stringify({ items, status: "planned", periodStart: r.cur.start, periodEnd: r.cur.end }) });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json(); setMsg(`Запланировано начислений: ${d.created}`); await load();
    } catch (e: any) { setMsg(e?.message || "Ошибка начисления"); } finally { setBusy(false); }
  };

  const exportCsv = () => {
    const header = ["Педагог", "Схема", "Выручка групп", "Занятий", "Начислено", "Выплачено", "К выплате"];
    const body = rows.map((x) => [x.t.name, COMP_SCHEME_LABEL[x.scheme] || x.scheme, x.revenue, x.lessons, x.total, x.paid, x.balance]);
    body.push(["ИТОГО", "", totals.revenue, "", totals.total, totals.paid, totals.balance]);
    const csv = [header, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vedomost_${period}_${r.cur.start}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <OwnerScreen title="Зарплаты" subtitle="Зарплатная ведомость по всем педагогам за период: расчёт по индивидуальным схемам (% от выручки, оклад, за занятие, смешанная), уже выплаченное и остаток к выплате. Можно начислить всем сразу и выгрузить ведомость.">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PeriodChips period={period} onChange={setPeriod} />
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={autoclose} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:border-[#C5A059]/40 disabled:opacity-50"><CheckCircle className="h-4 w-4" /> Закрыть прошедшие уроки</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:border-[#C5A059]/40"><FileSpreadsheet className="h-4 w-4" /> Экспорт CSV</button>
          <button disabled={busy} onClick={accrueAll} className="inline-flex items-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black hover:brightness-110 disabled:opacity-50"><Wallet className="h-4 w-4" /> Начислить всем за период</button>
        </div>
      </div>

      {msg && <div className="rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-4 py-3 text-sm text-[#C5A059]">{msg}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Выручка групп" value={money(totals.revenue)} />
        <StatPill label="Фонд оплаты (начислено)" value={money(totals.total)} tone="white" />
        <StatPill label="Выплачено" value={money(totals.paid)} tone="emerald" />
        <StatPill label="К выплате" value={money(totals.balance)} tone="rose" />
      </div>

      {history.some((h) => h.planned > 0 || h.paid > 0) && (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Фонд оплаты по месяцам</h3>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history.map((h) => ({ name: h.month.slice(5) + "." + h.month.slice(2, 4), Выплачено: h.paid, Запланировано: h.planned }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `${Math.round(v / 1000)}к`} />
                <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ background: "#0b0b0b", border: "1px solid #ffffff20", borderRadius: 12 }} labelStyle={{ color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Выплачено" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Запланировано" stackId="a" fill="#C5A059" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Педагог</th>
                <th className="px-4 py-3 font-bold">Схема</th>
                <th className="px-4 py-3 text-right font-bold">Выручка групп</th>
                <th className="px-4 py-3 text-right font-bold">Занятий</th>
                <th className="px-4 py-3 text-right font-bold">Начислено</th>
                <th className="px-4 py-3 text-right font-bold">Выплачено</th>
                <th className="px-4 py-3 text-right font-bold">К выплате</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Нет педагогов.</td></tr>}
              {rows.map((x) => (
                <tr key={x.t.id} className="border-b border-white/5">
                  <td className="px-4 py-3 font-bold text-white">{x.t.name}</td>
                  <td className="px-4 py-3 text-slate-400">{COMP_SCHEME_LABEL[x.scheme] || x.scheme}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{money(x.revenue)}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{x.lessons}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{money(x.total)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{money(x.paid)}</td>
                  <td className="px-4 py-3 text-right text-rose-300">{money(x.balance)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.03] font-bold text-white">
                  <td className="px-4 py-3" colSpan={2}>ИТОГО</td>
                  <td className="px-4 py-3 text-right">{money(totals.revenue)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right">{money(totals.total)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{money(totals.paid)}</td>
                  <td className="px-4 py-3 text-right text-rose-300">{money(totals.balance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
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

// ===================== ВЫСТУПЛЕНИЯ (ТЗ §2) =====================
const PERF_TYPE_LABEL: Record<string, string> = {
  basic: "Базовый танец", interactive: "Танец с интерактивом", multi: "Несколько номеров",
  individual: "Индивидуальное выступление", other: "Другое",
};
const PERF_STATUS: Record<string, { t: string; cls: string }> = {
  planned: { t: "Запланировано", cls: "bg-sky-500/15 text-sky-300" },
  partial: { t: "Частично оплачено", cls: "bg-amber-400/15 text-amber-300" },
  paid: { t: "Оплачено", cls: "bg-emerald-500/15 text-emerald-300" },
  cancelled: { t: "Отменено", cls: "bg-slate-500/15 text-slate-400" },
};
const PAY_METHOD_LABEL: Record<string, string> = { cash: "Наличные", card: "Карта", transfer: "Перевод", kaspi: "Kaspi" };
const MODULE_PERIODS: { id: string; label: string }[] = [
  { id: "today", label: "Сегодня" }, { id: "yesterday", label: "Вчера" }, { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" }, { id: "quarter", label: "Квартал" }, { id: "year", label: "Год" },
];
const jsonOwnerHdr = { headers: { "Content-Type": "application/json", "x-demo-role": "owner" } };

// ───────────────────────────── ДОКУМЕНТОЛОГ ─────────────────────────────────
const DOC_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft:      { label: "Черновик",  cls: "border-white/15 bg-white/5 text-slate-300" },
  active:     { label: "Действует", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  expired:    { label: "Истёк",     cls: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
  terminated: { label: "Расторгнут",cls: "border-slate-600/40 bg-slate-700/20 text-slate-400" },
};
const docInputCls = "mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";

function ExpiryBadge({ doc }: { doc: any }) {
  if (doc.expired) return <span className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-300">истёк</span>;
  if (doc.expiring) return <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">через {doc.daysLeft} дн.</span>;
  if (doc.dateEnd) return <span className="text-[11px] text-slate-500">до {doc.dateEnd}</span>;
  return <span className="text-[11px] text-slate-600">бессрочный</span>;
}

export function DocumentologistView() {
  const hdr = { headers: { "x-demo-role": "owner" } };
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": "owner" } };

  const [documents, setDocuments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editDoc, setEditDoc] = useState<any | null>(null);
  const [genOpen, setGenOpen] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [d, t, c] = await Promise.all([
        fetch("/api/mvp/documents", hdr),
        fetch("/api/mvp/documents/templates", hdr),
        fetch("/api/mvp/settings/lists?kind=document_category", hdr),
      ]);
      if (!d.ok) throw new Error(await d.text());
      const dj = await d.json();
      setDocuments(dj.documents || []); setSummary(dj.summary || null);
      if (t.ok) setTemplates((await t.json()).templates || []);
      if (c.ok) setCategories(((await c.json()).items || []).map((i: any) => i.label));
    } catch (e: any) { setError(e?.message || "Не удалось загрузить договоры"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const saveDoc = async (id: string | null, payload: any) => {
    setBusy(true); setError(null);
    try {
      const url = id ? `/api/mvp/documents/${id}` : "/api/mvp/documents";
      const res = await fetch(url, { method: id ? "PATCH" : "POST", ...jhdr, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setEditDoc(null); await load();
    } catch (e: any) { setError(e?.message || "Не удалось сохранить договор"); } finally { setBusy(false); }
  };
  const deleteDoc = async (id: string) => {
    if (!confirm("Удалить договор из хранилища?")) return;
    setBusy(true);
    try { await fetch(`/api/mvp/documents/${id}`, { method: "DELETE", ...hdr }); setEditDoc(null); await load(); }
    catch (e: any) { setError(e?.message || "Не удалось удалить"); } finally { setBusy(false); }
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of documents) { const k = d.category || "Без категории"; m[k] = (m[k] || 0) + 1; }
    return m;
  }, [documents]);

  const filtered = documents.filter((d) =>
    (activeCat === "all" || (d.category || "Без категории") === activeCat) &&
    (statusFilter === "all" || d.status === statusFilter)
  );
  const folders = ["all", ...categories, ...Object.keys(counts).filter((c) => c === "Без категории")];

  return (
    <OwnerScreen
      title="Документолог"
      subtitle="Хранилище договоров по папкам-категориям и генератор новых договоров с условной логикой. Аренда, услуги (уборка, вывоз мусора), подрядчики. Контроль сроков с напоминанием об истечении.">
      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {/* Сводка по срокам */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Всего договоров" value={summary?.total ?? "—"} tone="white" />
        <StatPill label="Действуют" value={summary?.active ?? "—"} tone="emerald" />
        <StatPill label="Истекают скоро" value={summary?.expiring ?? "—"} tone="gold" hint="ближайшие 30 дней" />
        <StatPill label="Истёкшие" value={summary?.expired ?? "—"} tone="rose" />
      </section>

      {/* Договоры на контроле */}
      {documents.some((d) => d.expiring || d.expired) && (
        <section className="rounded-[1.5rem] border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /><h3 className="text-sm font-black uppercase tracking-wider text-amber-200">Договоры на контроле</h3></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {documents.filter((d) => d.expiring || d.expired).map((d) => (
              <button key={d.id} onClick={() => setEditDoc(d)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 hover:border-[#C5A059]/40">
                {d.contractor || "Договор"} · <ExpiryBadge doc={d} />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["all", "draft", "active", "expired", "terminated"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${statusFilter === s ? "border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059]" : "border border-white/10 text-slate-400 hover:text-white"}`}>
              {s === "all" ? "Все статусы" : DOC_STATUS_META[s].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditDoc({ _new: true, status: "active", currency: "₸" })} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:border-white/30"><Plus className="h-4 w-4" /> Загрузить договор</button>
          <button onClick={() => setGenOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-[#C5A059] px-3 py-2 text-xs font-black text-black hover:bg-[#d4af6a]"><FileText className="h-4 w-4" /> Создать договор</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Папки-категории */}
        <aside className="space-y-1.5">
          {folders.map((cat) => (
            <button key={cat} onClick={() => setActiveCat(cat)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${activeCat === cat ? "border border-[#C5A059]/25 bg-[#C5A059]/10 text-[#C5A059]" : "text-slate-300 hover:bg-white/5"}`}>
              <span className="truncate">{cat === "all" ? "Все папки" : cat}</span>
              <span className="ml-2 shrink-0 text-xs text-slate-500">{cat === "all" ? documents.length : (counts[cat] || 0)}</span>
            </button>
          ))}
        </aside>

        {/* Таблица договоров */}
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">В этой папке пока нет договоров.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="p-3 text-left">Контрагент</th><th className="p-3 text-left">Предмет</th><th className="p-3 text-left">Папка</th>
                <th className="p-3 text-right">Сумма</th><th className="p-3 text-left">Срок</th><th className="p-3 text-left">Статус</th><th className="p-3 text-left">Скан</th>
              </tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} onClick={() => setEditDoc(d)} className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]">
                    <td className="p-3 font-bold text-white">{d.contractor || "—"}</td>
                    <td className="p-3 text-slate-400">{d.subject || "—"}</td>
                    <td className="p-3 text-slate-400">{d.category || "—"}</td>
                    <td className="p-3 text-right text-slate-200">{d.amount ? money(d.amount) : "—"}</td>
                    <td className="p-3"><ExpiryBadge doc={d} /></td>
                    <td className="p-3"><span className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${DOC_STATUS_META[d.status]?.cls}`}>{DOC_STATUS_META[d.status]?.label}</span></td>
                    <td className="p-3">{d.scanUrl ? <span className="text-[11px] text-emerald-400">есть</span> : <span className="text-[11px] text-slate-600">нет</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editDoc && <DocEditModal doc={editDoc} categories={categories} busy={busy} onClose={() => setEditDoc(null)} onSave={saveDoc} onDelete={deleteDoc} />}
      {genOpen && <DocGeneratorModal templates={templates} busy={busy} onClose={() => setGenOpen(false)} onGenerated={() => { setGenOpen(false); load(); }} setError={setError} />}
    </OwnerScreen>
  );
}

function DocEditModal({ doc, categories, busy, onClose, onSave, onDelete }: { doc: any; categories: string[]; busy: boolean; onClose: () => void; onSave: (id: string | null, payload: any) => void; onDelete: (id: string) => void }) {
  const isNew = !!doc._new;
  const [f, setF] = useState<any>({
    category: doc.category || (categories[0] || ""), contractor: doc.contractor || "", subject: doc.subject || "",
    amount: doc.amount || "", dateStart: doc.dateStart || "", dateEnd: doc.dateEnd || "", autoRenew: !!doc.autoRenew,
    status: doc.status || "active", scanUrl: doc.scanUrl || "", comment: doc.comment || "",
  });
  const submit = () => onSave(isNew ? null : doc.id, f);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141414]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="text-base font-black text-white">{isNew ? "Новый договор" : "Карточка договора"}</h3>
          <button onClick={onClose} className="rounded-xl bg-white/5 p-1.5 text-white hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 overflow-auto p-5">
          <label className="block text-xs text-slate-400">Папка-категория
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={docInputCls}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-400">Контрагент<input value={f.contractor} onChange={(e) => setF({ ...f, contractor: e.target.value })} className={docInputCls} placeholder="ТОО / ИП / ФИО" /></label>
          <label className="block text-xs text-slate-400">Предмет договора<input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className={docInputCls} placeholder="Что предмет договора" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-slate-400">Сумма<input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={docInputCls} /></label>
            <label className="block text-xs text-slate-400">Статус
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={docInputCls}>
                {Object.entries(DOC_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-slate-400">Дата начала<input type="date" value={f.dateStart} onChange={(e) => setF({ ...f, dateStart: e.target.value })} className={docInputCls} /></label>
            <label className="block text-xs text-slate-400">Дата окончания<input type="date" value={f.dateEnd} onChange={(e) => setF({ ...f, dateEnd: e.target.value })} className={docInputCls} /></label>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={f.autoRenew} onChange={(e) => setF({ ...f, autoRenew: e.target.checked })} /> Автопролонгация</label>
          <label className="block text-xs text-slate-400">Ссылка на PDF-скан подписанного договора<input value={f.scanUrl} onChange={(e) => setF({ ...f, scanUrl: e.target.value })} className={docInputCls} placeholder="https://… или путь в хранилище" /></label>
          <label className="block text-xs text-slate-400">Комментарий<textarea value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} className={docInputCls} rows={2} /></label>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/5 px-5 py-4">
          {!isNew ? <button onClick={() => onDelete(doc.id)} className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /> Удалить</button> : <span />}
          <button onClick={submit} disabled={busy} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-black text-black hover:bg-[#d4af6a] disabled:opacity-50">{busy ? "Сохранение…" : "Сохранить"}</button>
        </div>
      </div>
    </div>
  );
}

function DocGeneratorModal({ templates, busy, onClose, onGenerated, setError }: { templates: any[]; busy: boolean; onClose: () => void; onGenerated: () => void; setError: (e: string | null) => void }) {
  const [tplId, setTplId] = useState<string>(templates[0]?.id || "");
  const tpl = templates.find((t) => t.id === tplId);
  const [values, setValues] = useState<Record<string, any>>({});
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!tpl) return;
    const v: Record<string, any> = {}; (tpl.fields || []).forEach((f: any) => { v[f.key] = ""; });
    const t: Record<string, boolean> = {}; (tpl.toggles || []).forEach((x: any) => { t[x.key] = !!x.default; });
    setValues(v); setToggles(t);
  }, [tplId]); // eslint-disable-line

  const generate = async () => {
    if (!tpl) return;
    const missing = (tpl.fields || []).filter((f: any) => f.required && !values[f.key]);
    if (missing.length) { setError(`Заполните: ${missing.map((m: any) => m.label).join(", ")}`); return; }
    setWorking(true); setError(null);
    try {
      const res = await fetch("/api/mvp/documents/generate", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "owner" }, body: JSON.stringify({ templateId: tplId, values, toggles }) });
      if (!res.ok) throw new Error(await res.text());
      const { html, filename } = await res.json();
      const blob = new Blob(["﻿", html], { type: "application/msword" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "Договор.doc"; a.click(); URL.revokeObjectURL(a.href);
      onGenerated();
    } catch (e: any) { setError(e?.message || "Не удалось сгенерировать договор"); } finally { setWorking(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141414]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-[#C5A059] to-[#d4af6a] px-5 py-4">
          <h3 className="text-base font-black text-black">Генератор договоров</h3>
          <button onClick={onClose} className="rounded-xl bg-black/15 p-1.5 text-black hover:bg-black/25"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 overflow-auto p-5">
          <label className="block text-xs text-slate-400">Тип договора
            <select value={tplId} onChange={(e) => setTplId(e.target.value)} className={docInputCls}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {tpl && (tpl.fields || []).map((f: any) => (
            <label key={f.key} className="block text-xs text-slate-400">{f.label}{f.required && <span className="text-rose-400"> *</span>}
              <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={docInputCls} />
            </label>
          ))}
          {tpl && (tpl.toggles || []).length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Условия договора</p>
              <div className="grid grid-cols-2 gap-2">
                {(tpl.toggles || []).map((x: any) => (
                  <label key={x.key} className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={!!toggles[x.key]} onChange={(e) => setToggles({ ...toggles, [x.key]: e.target.checked })} /> {x.label}</label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/5 px-5 py-4">
          <p className="mr-auto text-[11px] text-slate-500">Файл .doc скачается, договор появится в хранилище как черновик.</p>
          <button onClick={generate} disabled={working || busy || !tpl} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-black text-black hover:bg-[#d4af6a] disabled:opacity-50">{working ? "Генерация…" : "Сгенерировать"}</button>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, hint, tone = "gold" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "gold" | "emerald" | "rose" | "white" }) {
  const valColor = tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : tone === "white" ? "text-white" : "text-[#C5A059]";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1.5 text-xl font-black ${valColor}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function PeriodChips({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {MODULE_PERIODS.map((p) => (
        <button key={p.id} onClick={() => onChange(p.id)}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${period === p.id ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#C5A059]/40"}`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// Загрузка настраиваемого справочника (типы выступлений / категории товаров / уровни групп).
// Если своих значений ещё нет — бэкенд отдаёт дефолты, поэтому список не бывает пустым.
function useSettingsList(kind: string, role: string = "owner") {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/mvp/settings/lists?kind=${kind}`, { headers: { "x-demo-role": role } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => { if (alive) setItems(d.items || []); })
      .catch(() => { /* пусто — модалка просто без подсказок */ });
    return () => { alive = false; };
  }, [kind, role]);
  return items;
}

function PerformancesView() {
  const [list, setList] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [period, setPeriod] = useState("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [lRes, oRes] = await Promise.all([
        fetch(`/api/mvp/performances?status=${statusFilter}`, ownerHdr),
        fetch(`/api/mvp/performances/overview?period=${period}`, ownerHdr),
      ]);
      if (!lRes.ok) throw new Error(await lRes.text());
      setList((await lRes.json()).performances || []);
      if (oRes.ok) setOverview(await oRes.json());
    } catch (e: any) { setError(e?.message || "Не удалось загрузить выступления"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, period]);

  const selected = list.find((p) => p.id === selectedId) || null;

  const addPayment = async (perfId: string, payload: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/mvp/performances/${perfId}/payments`, { method: "POST", ...jsonOwnerHdr, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) { setError(e?.message || "Не удалось добавить оплату"); } finally { setBusy(false); }
  };
  const removePayment = async (perfId: string, pid: string) => { setBusy(true); try { await fetch(`/api/mvp/performances/${perfId}/payments/${pid}`, { method: "DELETE", headers: { "x-demo-role": "owner" } }); await load(); } finally { setBusy(false); } };
  const cancelPerf = async (id: string) => { setBusy(true); try { await fetch(`/api/mvp/performances/${id}`, { method: "PATCH", ...jsonOwnerHdr, body: JSON.stringify({ status: "cancelled" }) }); await load(); } finally { setBusy(false); } };
  const deletePerf = async (id: string) => { setBusy(true); try { await fetch(`/api/mvp/performances/${id}`, { method: "DELETE", headers: { "x-demo-role": "owner" } }); setSelectedId(null); await load(); } finally { setBusy(false); } };
  const createPerf = async (payload: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/mvp/performances`, { method: "POST", ...jsonOwnerHdr, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setShowAdd(false); await load();
    } catch (e: any) { setError(e?.message || "Не удалось создать выступление"); } finally { setBusy(false); }
  };

  const statusTabs: [string, string][] = [["all", "Все"], ["planned", "Запланированные"], ["partial", "Частично оплаченные"], ["paid", "Оплаченные"], ["cancelled", "Отменённые"]];
  const monthLabel = (m: string) => m.slice(5) + "." + m.slice(2, 4);

  return (
    <OwnerScreen title="Выступления" subtitle="Учёт коммерческих выступлений: свадьбы, банкеты, корпоративы, дни рождения, мероприятия и концерты. Несколько поступлений по одному выступлению, статусы оплаты и аналитика по выручке.">
      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {/* Аналитика за период */}
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Аналитика за период</h3>
          <PeriodChips period={period} onChange={setPeriod} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatPill label="Выступлений" value={overview?.count ?? "—"} hint={overview?.performers ? `${overview.performers} выступающих` : undefined} />
          <StatPill label="Выручка (поступления)" value={overview ? money(overview.revenue.total) : "—"} hint={overview && <DeltaBadge pct={overview.revenue.momPct} />} />
          <StatPill label="Стоимость выступлений" value={overview ? money(overview.gross ?? 0) : "—"} />
          <StatPill label="Расход" value={overview ? money(overview.expense ?? 0) : "—"} tone="rose" />
          <StatPill label="Чистая прибыль" value={overview ? money(overview.netProfit ?? 0) : "—"} tone="emerald" hint="стоимость − расход" />
          <StatPill label="Средний чек" value={overview ? money(overview.avgCheck) : "—"} />
          <StatPill label="Неоплаченных" value={overview?.unpaidCount ?? "—"} tone="rose" />
          <StatPill label="Остаток к оплате" value={overview ? money(overview.outstanding) : "—"} tone="rose" />
        </div>
        {overview?.byMonth?.length > 0 && (
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.byMonth.map((b: any) => ({ name: monthLabel(b.month), amount: b.amount }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `${Math.round(v / 1000)}к`} />
                <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ background: "#0b0b0b", border: "1px solid #ffffff20", borderRadius: 12 }} labelStyle={{ color: "#fff" }} />
                <Bar dataKey="amount" fill="#C5A059" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Фильтры по статусу + кнопка */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusTabs.map(([id, label]) => (
            <button key={id} onClick={() => setStatusFilter(id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${statusFilter === id ? "bg-white/15 text-white ring-1 ring-[#C5A059]/40" : "border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black transition hover:brightness-110">
          <Plus className="h-4 w-4" /> Добавить выступление
        </button>
      </div>

      {/* Таблица выступлений */}
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Дата</th>
                <th className="px-4 py-3 font-bold">Клиент</th>
                <th className="px-4 py-3 font-bold">Адрес</th>
                <th className="px-4 py-3 font-bold">Время</th>
                <th className="px-4 py-3 font-bold">Тип</th>
                <th className="px-4 py-3 text-right font-bold">Стоимость</th>
                <th className="px-4 py-3 text-right font-bold">Чистая прибыль</th>
                <th className="px-4 py-3 text-right font-bold">Оплачено</th>
                <th className="px-4 py-3 text-right font-bold">Остаток</th>
                <th className="px-4 py-3 font-bold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Загрузка…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Нет выступлений.</td></tr>}
              {list.map((p) => (
                <tr key={p.id} onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                  className={`cursor-pointer border-b border-white/5 transition hover:bg-white/[0.04] ${selectedId === p.id ? "bg-white/[0.05]" : ""}`}>
                  <td className="px-4 py-3 text-slate-300">{p.eventDate}</td>
                  <td className="px-4 py-3 font-bold text-white">{p.clientName}</td>
                  <td className="px-4 py-3 text-slate-400">{p.address || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{p.eventTime || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{PERF_TYPE_LABEL[p.type] || p.type}{p.performersCount ? ` · ${p.performersCount} чел.` : ""}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{money(p.price)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{p.netProfit == null ? "—" : money(p.netProfit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{p.paid == null ? "—" : money(p.paid)}</td>
                  <td className="px-4 py-3 text-right text-rose-300">{p.outstanding == null ? "—" : money(p.outstanding)}</td>
                  <td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${PERF_STATUS[p.status]?.cls}`}>{PERF_STATUS[p.status]?.t}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Карточка выбранного выступления */}
      {selected && (
        <PerformanceCard perf={selected} busy={busy} onAddPayment={addPayment} onRemovePayment={removePayment} onCancel={cancelPerf} onDelete={deletePerf} onClose={() => setSelectedId(null)} />
      )}

      {showAdd && <PerfAddModal busy={busy} onClose={() => setShowAdd(false)} onSubmit={createPerf} />}
    </OwnerScreen>
  );
}

function PerformanceCard({ perf, busy, onAddPayment, onRemovePayment, onCancel, onDelete, onClose }: any) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const submit = () => { const a = Number(amount); if (!a || a <= 0) return; onAddPayment(perf.id, { amount: a, date, method }); setAmount(""); };
  return (
    <section className="rounded-[1.75rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#1a1710] to-black p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white">{perf.clientName}</h3>
          <span className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${PERF_STATUS[perf.status]?.cls}`}>{PERF_STATUS[perf.status]?.t}</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Общая информация */}
        <div className="space-y-1.5 text-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Общая информация</p>
          <Row k="Дата мероприятия" v={perf.eventDate} />
          <Row k="Время" v={perf.eventTime || "—"} />
          <Row k="Адрес" v={perf.address || "—"} />
          <Row k="Телефон" v={perf.clientPhone || "—"} />
          <Row k="Тип выступления" v={PERF_TYPE_LABEL[perf.type] || perf.type} />
          {perf.performersCount != null && <Row k="Выступающих" v={`${perf.performersCount} чел.`} />}
          {perf.paymentMethod && <Row k="Тип оплаты" v={PAY_METHOD_LABEL[perf.paymentMethod] || perf.paymentMethod} />}
          {perf.comment && <Row k="Комментарий" v={perf.comment} />}
        </div>
        {/* Финансы */}
        <div className="space-y-1.5 text-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Финансы</p>
          <Row k="Стоимость" v={<span className="font-black text-white">{money(perf.price)}</span>} />
          <Row k="Расход" v={<span className="text-rose-300">{money(perf.expense || 0)}</span>} />
          <Row k="Чистая прибыль" v={<span className="font-black text-emerald-400">{money(perf.netProfit ?? (perf.price - (perf.expense || 0)))}</span>} />
          <Row k="Оплачено" v={<span className="text-emerald-400">{money(perf.paid)}</span>} />
          <Row k="Остаток" v={<span className="text-rose-300">{money(perf.outstanding)}</span>} />
        </div>
        {/* Поступления денег */}
        <div className="space-y-2 text-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Поступления денег</p>
          {(perf.payments || []).length === 0 && <p className="text-xs text-slate-500">Оплат пока нет.</p>}
          {(perf.payments || []).map((pay: any) => (
            <div key={pay.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div>
                <p className="text-xs font-bold text-white">{money(pay.amount)}</p>
                <p className="text-[11px] text-slate-500">{pay.date} · {PAY_METHOD_LABEL[pay.method] || pay.method}</p>
              </div>
              {perf.status !== "cancelled" && <button onClick={() => onRemovePayment(perf.id, pay.id)} className="rounded-lg p-1 text-slate-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>}
            </div>
          ))}
          <p className="pt-1 text-right text-xs text-slate-400">Итого оплачено: <span className="font-bold text-emerald-400">{money(perf.paid)}</span></p>
        </div>
      </div>

      {/* Добавить поступление */}
      {perf.status !== "cancelled" && (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/10 pt-4">
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Сумма
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" className="w-32 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" /></label>
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Дата
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" /></label>
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Способ
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              {Object.entries(PAY_METHOD_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-black">{v}</option>)}
            </select></label>
          <button disabled={busy} onClick={submit} className="rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black disabled:opacity-50">Добавить оплату</button>
          <div className="flex-1" />
          {perf.status !== "cancelled" && <button disabled={busy} onClick={() => onCancel(perf.id)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">Отменить</button>}
          <button disabled={busy} onClick={() => onDelete(perf.id)} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Удалить</button>
        </div>
      )}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="text-right text-slate-200">{v}</span>
    </div>
  );
}

function PerfAddModal({ busy, onClose, onSubmit }: any) {
  const types = useSettingsList("performance_type");
  const [f, setF] = useState<any>({ clientName: "", clientPhone: "", address: "", eventDate: new Date().toISOString().slice(0, 10), eventTime: "", type: "", performersCount: "", price: "", expense: "", paymentMethod: "cash", status: "planned", comment: "" });
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  // тип по умолчанию — первый из справочника
  useEffect(() => { if (!f.type && types[0]) set("type", types[0].label); /* eslint-disable-next-line */ }, [types]);
  const price = Number(f.price) || 0;
  const expense = Number(f.expense) || 0;
  const net = price - expense;
  const submit = () => { if (!f.clientName.trim()) return; onSubmit({ ...f, price, expense }); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[1.75rem] border border-white/10 bg-[#0f0f0f] p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-black text-white">Новое выступление</h3><button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModalInput label="Клиент *" value={f.clientName} onChange={(v) => set("clientName", v)} />
          <ModalInput label="Телефон" value={f.clientPhone} onChange={(v) => set("clientPhone", v)} />
          <ModalInput label="Адрес выступления / ресторан" value={f.address} onChange={(v) => set("address", v)} placeholder="Напр.: Достык 5 — ресторан «Алтын»" full />
          <ModalInput label="Дата" type="date" value={f.eventDate} onChange={(v) => set("eventDate", v)} />
          <ModalInput label="Время" value={f.eventTime} onChange={(v) => set("eventTime", v)} placeholder="18:00" />
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Тип выступления
            <select value={f.type} onChange={(e) => set("type", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              {types.map((t) => <option key={t.id} value={t.label} className="bg-black">{t.label}</option>)}
            </select></label>
          <ModalInput label="Кол-во выступающих" type="number" value={f.performersCount} onChange={(v) => set("performersCount", v)} placeholder="напр. 4" />
          <ModalInput label="Стоимость, ₸" type="number" value={f.price} onChange={(v) => set("price", v)} />
          <ModalInput label="Расход (выступающие, ответственный), ₸" type="number" value={f.expense} onChange={(v) => set("expense", v)} />
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Тип оплаты
            <select value={f.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              {Object.entries(PAY_METHOD_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-black">{v}</option>)}
            </select></label>
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Статус
            <select value={f.status} onChange={(e) => set("status", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              <option value="planned" className="bg-black">Запланировано</option>
              <option value="paid" className="bg-black">Оплачено</option>
            </select></label>
          <ModalInput label="Комментарий" value={f.comment} onChange={(v) => set("comment", v)} full />
        </div>
        {/* Чистая прибыль = стоимость − расход (на счёт поступает только она) */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Чистая прибыль</span>
          <span className={`text-lg font-black ${net < 0 ? "text-rose-400" : "text-emerald-400"}`}>{money(net)}</span>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300">Отмена</button>
          <button disabled={busy} onClick={submit} className="rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black disabled:opacity-50">Создать</button>
        </div>
      </div>
    </div>
  );
}

function ModalInput({ label, value, onChange, type = "text", placeholder, full }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-[11px] text-slate-400 ${full ? "sm:col-span-2" : ""}`}>{label}
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" />
    </label>
  );
}

// ===================== ТОВАРЫ И СКЛАД (ТЗ §3) =====================
export function ProductsView({ role = "owner" }: { role?: string } = {}) {
  // Роль определяет режим: владелец/управляющий — полный склад; администратор — «касса дня».
  // Заголовок x-demo-role передаётся на бэк, который сам скоупит данные (продажи админа = только сегодня).
  const isCashier = role === "admin";
  const hdr = { headers: { "x-demo-role": role } };
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": role } };

  const [tab, setTab] = useState<"products" | "sales" | "stock" | "receipts" | "writeoffs" | "orders">(isCashier ? "sales" : "products");
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [writeoffs, setWriteoffs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | "product" | "sale" | "receipt" | "writeoff">(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // Касса (админ): только справочник + сегодняшние продажи. Остальное недоступно по роли.
      const reqs = isCashier
        ? [fetch(`/api/mvp/products`, hdr), fetch(`/api/mvp/products/sales`, hdr), fetch(`/api/mvp/shop/orders`, hdr)]
        : [
            fetch(`/api/mvp/products`, hdr),
            fetch(`/api/mvp/products/sales`, hdr),
            fetch(`/api/mvp/products/stock`, hdr),
            fetch(`/api/mvp/products/receipts`, hdr),
            fetch(`/api/mvp/products/overview?period=${period}`, hdr),
            fetch(`/api/mvp/products/writeoffs`, hdr),
            fetch(`/api/mvp/shop/orders`, hdr),
          ];
      const all = await Promise.all(reqs);
      const P = all[0]; if (!P.ok) throw new Error(await P.text());
      setProducts((await P.json()).products || []);
      const S = all[1]; if (S?.ok) setSales((await S.json()).sales || []);
      if (!isCashier) {
        const ST = all[2]; if (ST?.ok) { const sd = await ST.json(); setStock(sd.stock || []); setStockSummary(sd.summary || null); }
        const R = all[3]; if (R?.ok) setReceipts((await R.json()).receipts || []);
        const O = all[4]; if (O?.ok) setOverview(await O.json());
        const W = all[5]; if (W?.ok) setWriteoffs((await W.json()).writeoffs || []);
        const ORD = all[6]; if (ORD?.ok) setOrders((await ORD.json()).orders || []);
      } else {
        const ORD = all[2]; if (ORD?.ok) setOrders((await ORD.json()).orders || []);
      }
    } catch (e: any) { setError(e?.message || "Не удалось загрузить товары"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  const post = async (url: string, payload: any, errMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", ...jhdr, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      setModal(null); await load();
    } catch (e: any) { setError(e?.message || errMsg); } finally { setBusy(false); }
  };
  const createProduct = (p: any) => post(`/api/mvp/products`, p, "Не удалось создать товар");
  const createSale = (p: any) => post(`/api/mvp/products/sales`, p, "Не удалось оформить продажу");
  const createReceipt = (p: any) => post(`/api/mvp/products/receipts`, p, "Не удалось оформить поступление");
  const createWriteoff = (p: any) => post(`/api/mvp/products/writeoffs`, p, "Не удалось оформить списание");
  const setOrderStatus = async (id: string, status: string) => {
    setBusy(true);
    try { await fetch(`/api/mvp/shop/orders/${id}`, { method: "PATCH", ...jhdr, body: JSON.stringify({ status }) }); await load(); }
    catch (e: any) { setError(e?.message || "Не удалось обновить заказ"); } finally { setBusy(false); }
  };

  const cashierRevenue = sales.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const newOrders = orders.filter((o) => o.status === "new").length;
  const ordersLabel = `Заказы${newOrders ? ` (${newOrders})` : ""}`;
  const tabs: [typeof tab, string][] = isCashier
    ? [["sales", "Продажи за сегодня"], ["products", "Каталог"], ["orders", ordersLabel]]
    : [["products", "Товары"], ["sales", "Продажи"], ["stock", "Остатки"], ["receipts", "Поступления"], ["writeoffs", "Списания"], ["orders", ordersLabel]];

  return (
    <OwnerScreen
      title={isCashier ? "Товары и касса" : "Товары и склад"}
      subtitle={isCashier
        ? "Касса дня: продажи товаров и мерча за сегодня. Оформление продажи и список сегодняшних операций. Аналитика и остатки доступны управляющему и владельцу."
        : "Учёт мерча, формы, аксессуаров и сувенирной продукции. Товары, продажи, остатки (приход − продажи) и поступления, контроль минимального остатка и аналитика по выручке и прибыли."}>
      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {/* Аналитика (владелец/управляющий) */}
      {!isCashier && (
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Аналитика за период</h3>
          <PeriodChips period={period} onChange={setPeriod} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatPill label="Выручка от товаров" value={overview ? money(overview.revenue.total) : "—"} hint={overview && <DeltaBadge pct={overview.revenue.momPct} />} />
          <StatPill label="Продано единиц" value={overview?.unitsSold ?? "—"} tone="white" />
          <StatPill label="Средний чек" value={overview ? money(overview.avgCheck) : "—"} />
          <StatPill label="Валовая прибыль" value={overview ? money(overview.grossProfit) : "—"} tone="emerald" hint={overview ? `${overview.margin}% маржинальность` : undefined} />
          <StatPill label="Товар на складе (по закупке)" value={overview ? money(overview.stockValue ?? 0) : "—"} tone="gold" hint={overview ? `${overview.stockUnits ?? 0} ед. на складе` : undefined} />
          <StatPill label="Товар на складе (по продаже)" value={overview ? money(overview.retailValue ?? 0) : "—"} tone="white" hint="потенциальная выручка остатка" />
          <StatPill label="Товары с низким остатком" value={overview?.lowStock?.length ?? "—"} tone="rose" hint="Требуют пополнения" />
        </div>
        {overview?.top?.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Топ товаров</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {overview.top.map((t: any) => (
                <span key={t.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200">{t.name} · <span className="font-bold text-[#C5A059]">{money(t.revenue)}</span> · {t.qty} шт.</span>
              ))}
            </div>
          </div>
        )}
      </section>
      )}

      {/* Касса за сегодня (администратор) */}
      {isCashier && (
        <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Касса за сегодня</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatPill label="Выручка от товаров за сегодня" value={money(cashierRevenue)} tone="emerald" />
            <StatPill label="Продаж за сегодня" value={sales.length} tone="white" />
          </div>
        </section>
      )}

      {/* Подвкладки + кнопка */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${tab === id ? "bg-white/15 text-white ring-1 ring-[#C5A059]/40" : "border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {!isCashier && tab === "products" && <button onClick={() => setModal("product")} className="inline-flex items-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black hover:brightness-110"><Plus className="h-4 w-4" /> Добавить товар</button>}
          {(tab === "products" || tab === "sales") && <button onClick={() => setModal("sale")} className="inline-flex items-center gap-2 rounded-xl border border-[#C5A059]/40 px-4 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10"><ShoppingBag className="h-4 w-4" /> Оформить продажу</button>}
          {!isCashier && (tab === "stock" || tab === "receipts") && <button onClick={() => setModal("receipt")} className="inline-flex items-center gap-2 rounded-xl border border-[#C5A059]/40 px-4 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10"><Package className="h-4 w-4" /> Оформить поступление</button>}
          {!isCashier && (tab === "stock" || tab === "writeoffs") && <button onClick={() => setModal("writeoff")} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-black text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /> Оформить списание</button>}
        </div>
      </div>

      {loading && <p className="px-1 text-sm text-slate-500">Загрузка…</p>}

      {/* ТОВАРЫ */}
      {!loading && tab === "products" && (
        <ModuleTable cols={["Товар", "Категория", "Артикул", "Цена продажи", "Закупочная", "Остаток", "Мин. остаток", "Статус"]} empty={products.length === 0}>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-white/5">
              <td className="px-4 py-3 font-bold text-white">
                <div className="flex items-center gap-2.5">
                  {p.photoUrl
                    ? <img src={p.photoUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />
                    : <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-600"><Package className="h-4 w-4" /></div>}
                  <span>{p.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-400">{p.category || "—"}</td>
              <td className="px-4 py-3 text-slate-400">{p.sku || "—"}</td>
              <td className="px-4 py-3 text-right text-white">{money(p.salePrice)}</td>
              <td className="px-4 py-3 text-right text-slate-400">{money(p.costPrice)}</td>
              <td className="px-4 py-3 text-right font-bold text-white">{p.stock} шт.</td>
              <td className="px-4 py-3 text-right text-slate-400">{p.minStock} шт.</td>
              <td className="px-4 py-3">{p.low
                ? <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-300">Нужно пополнить</span>
                : <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">В норме</span>}</td>
            </tr>
          ))}
        </ModuleTable>
      )}

      {/* ПРОДАЖИ */}
      {!loading && tab === "sales" && (
        <ModuleTable cols={["Дата", "Товар", "Кол-во", "Сумма", "Способ", "Сотрудник"]} empty={sales.length === 0}>
          {sales.map((s) => (
            <tr key={s.id} className="border-b border-white/5">
              <td className="px-4 py-3 text-slate-300">{s.date}</td>
              <td className="px-4 py-3 font-bold text-white">{s.productName}</td>
              <td className="px-4 py-3 text-slate-300">{s.qty} шт.</td>
              <td className="px-4 py-3 text-right font-bold text-emerald-400">{money(s.amount)}</td>
              <td className="px-4 py-3 text-slate-400">{PAY_METHOD_LABEL[s.method] || s.method}</td>
              <td className="px-4 py-3 text-slate-400">{s.soldBy || "—"}</td>
            </tr>
          ))}
        </ModuleTable>
      )}

      {/* ОСТАТКИ */}
      {!loading && tab === "stock" && (
        <>
          {stockSummary && (
            <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatPill label="Товара на складе" value={`${stockSummary.units} ед.`} tone="white" hint={`${stockSummary.positions} позиций`} />
              <StatPill label="Стоимость склада (по закупке)" value={money(stockSummary.stockValue)} tone="gold" />
              <StatPill label="Стоимость склада (по продаже)" value={money(stockSummary.retailValue)} />
              <StatPill label="Потенциальная наценка" value={money(stockSummary.retailValue - stockSummary.stockValue)} tone="emerald" />
            </div>
          )}
          <ModuleTable cols={["Товар", "Артикул", "Приход", "Продано", "Списано", "Остаток", "Сумма (закуп)", "Статус"]} empty={stock.length === 0}>
            {stock.map((s) => (
              <tr key={s.productId} className="border-b border-white/5">
                <td className="px-4 py-3 font-bold text-white">{s.name}</td>
                <td className="px-4 py-3 text-slate-400">{s.sku || "—"}</td>
                <td className="px-4 py-3 text-right text-slate-300">{s.received}</td>
                <td className="px-4 py-3 text-right text-slate-300">{s.sold}</td>
                <td className="px-4 py-3 text-right text-rose-300">{s.written || 0}</td>
                <td className="px-4 py-3 text-right font-bold text-white">{s.balance} шт.</td>
                <td className="px-4 py-3 text-right text-slate-300">{money(s.stockValue ?? 0)}</td>
                <td className="px-4 py-3">{s.low
                  ? <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-300">Низкий остаток</span>
                  : <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">В норме</span>}</td>
              </tr>
            ))}
          </ModuleTable>
        </>
      )}

      {/* СПИСАНИЯ */}
      {!loading && tab === "writeoffs" && (
        <ModuleTable cols={["Дата", "Товар", "Кол-во", "Причина", "Комментарий"]} empty={writeoffs.length === 0}>
          {writeoffs.map((w) => (
            <tr key={w.id} className="border-b border-white/5">
              <td className="px-4 py-3 text-slate-300">{w.date}</td>
              <td className="px-4 py-3 font-bold text-white">{w.productName}</td>
              <td className="px-4 py-3 text-slate-300">{w.qty} шт.</td>
              <td className="px-4 py-3 text-slate-400">{w.reason || "—"}</td>
              <td className="px-4 py-3 text-slate-400">{w.comment || "—"}</td>
            </tr>
          ))}
        </ModuleTable>
      )}

      {/* ПОСТУПЛЕНИЯ */}
      {!loading && tab === "receipts" && (
        <ModuleTable cols={["Дата", "Товар", "Кол-во", "Закупочная", "Комментарий"]} empty={receipts.length === 0}>
          {receipts.map((r) => (
            <tr key={r.id} className="border-b border-white/5">
              <td className="px-4 py-3 text-slate-300">{r.date}</td>
              <td className="px-4 py-3 font-bold text-white">{r.productName}</td>
              <td className="px-4 py-3 text-slate-300">{r.qty} шт.</td>
              <td className="px-4 py-3 text-right text-slate-400">{money(r.costPrice)}</td>
              <td className="px-4 py-3 text-slate-400">{r.comment || "—"}</td>
            </tr>
          ))}
        </ModuleTable>
      )}

      {/* ЗАКАЗЫ ИЗ МАГАЗИНА */}
      {!loading && tab === "orders" && (
        <ModuleTable cols={["Дата", "Покупатель", "Телефон", "Состав", "Сумма", "Статус"]} empty={orders.length === 0}>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-white/5 align-top">
              <td className="px-4 py-3 text-slate-300">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—"}</td>
              <td className="px-4 py-3 font-bold text-white">{o.customerName || "—"}</td>
              <td className="px-4 py-3 text-slate-300">{o.customerPhone || "—"}</td>
              <td className="px-4 py-3 text-slate-400">
                {(o.items || []).map((it: any, i: number) => <div key={i}>{it.productName} × {it.qty}</div>)}
                {o.comment && <div className="mt-1 text-[11px] text-slate-600">{o.comment}</div>}
              </td>
              <td className="px-4 py-3 text-right font-bold text-emerald-400">{money(o.total)}</td>
              <td className="px-4 py-3">
                <select value={o.status} disabled={busy} onChange={(e) => setOrderStatus(o.id, e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white">
                  <option value="new" className="bg-black">Новый</option>
                  <option value="confirmed" className="bg-black">Подтверждён</option>
                  <option value="ready" className="bg-black">Готов к выдаче</option>
                  <option value="done" className="bg-black">Выдан</option>
                  <option value="cancelled" className="bg-black">Отменён</option>
                </select>
              </td>
            </tr>
          ))}
        </ModuleTable>
      )}

      {modal === "product" && <ProductAddModal busy={busy} role={role} onClose={() => setModal(null)} onSubmit={createProduct} />}
      {modal === "sale" && <SaleModal busy={busy} products={products} onClose={() => setModal(null)} onSubmit={createSale} />}
      {modal === "receipt" && <ReceiptModal busy={busy} products={products} onClose={() => setModal(null)} onSubmit={createReceipt} />}
      {modal === "writeoff" && <WriteoffModal busy={busy} products={products} onClose={() => setModal(null)} onSubmit={createWriteoff} />}
    </OwnerScreen>
  );
}

function ModuleTable({ cols, empty, children }: { cols: string[]; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>{cols.map((c, i) => <th key={i} className={`px-4 py-3 font-bold ${i >= 3 && i <= 6 ? "text-right" : ""}`}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {empty ? <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-slate-500">Нет данных.</td></tr> : children}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductAddModal({ busy, onClose, onSubmit, role = "owner" }: any) {
  const categories = useSettingsList("product_category", role);
  const [f, setF] = useState<any>({ name: "", category: "", sku: "", salePrice: "", costPrice: "", minStock: "", comment: "", photoUrl: "" });
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  useEffect(() => { if (!f.category && categories[0]) set("category", categories[0].label); /* eslint-disable-next-line */ }, [categories]);

  const generatePhoto = async () => {
    if (!f.name.trim()) { setGenErr("Сначала укажите название товара"); return; }
    setGenBusy(true); setGenErr(null);
    try {
      const res = await fetch("/api/gemini/product-image", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": role }, body: JSON.stringify({ name: f.name, category: f.category, description: f.comment }) });
      if (!res.ok) { const t = await res.json().catch(() => ({})); throw new Error(t.error || "Генерация недоступна"); }
      const d = await res.json();
      if (d.dataUrl) set("photoUrl", d.dataUrl);
    } catch (e: any) { setGenErr(e?.message || "Не удалось сгенерировать фото"); }
    finally { setGenBusy(false); }
  };

  const submit = () => { if (!f.name.trim()) return; onSubmit({ ...f, salePrice: Number(f.salePrice) || 0, costPrice: Number(f.costPrice) || 0, minStock: Number(f.minStock) || 0 }); };
  return (
    <ModalShell title="Новый товар" onClose={onClose}>
      <ModalInput label="Название *" value={f.name} onChange={(v) => set("name", v)} full />
      <label className="flex flex-col gap-1 text-[11px] text-slate-400">Категория
        <select value={f.category} onChange={(e) => set("category", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          {categories.map((c) => <option key={c.id} value={c.label} className="bg-black">{c.label}</option>)}
        </select></label>
      <ModalInput label="Артикул" value={f.sku} onChange={(v) => set("sku", v)} />
      <ModalInput label="Цена продажи, ₸" type="number" value={f.salePrice} onChange={(v) => set("salePrice", v)} />
      <ModalInput label="Закупочная цена, ₸" type="number" value={f.costPrice} onChange={(v) => set("costPrice", v)} />
      <ModalInput label="Минимальный остаток" type="number" value={f.minStock} onChange={(v) => set("minStock", v)} />
      <div className="sm:col-span-2">
        <div className="flex items-end gap-2">
          <div className="flex-1"><ModalInput label="Фото товара (ссылка или сгенерировать)" value={f.photoUrl} onChange={(v) => set("photoUrl", v)} placeholder="https://…" full /></div>
          <button type="button" onClick={generatePhoto} disabled={genBusy} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C5A059]/40 px-3 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {genBusy ? "Генерация…" : "Сгенерировать"}
          </button>
        </div>
        {genErr && <p className="mt-1 text-[11px] text-rose-400">{genErr}</p>}
        {f.photoUrl ? <img src={f.photoUrl} alt="" className="mt-2 h-32 w-32 rounded-xl object-cover" /> : null}
      </div>
      <ModalInput label="Комментарий" value={f.comment} onChange={(v) => set("comment", v)} full />
      <ModalActions busy={busy} onClose={onClose} onSubmit={submit} submitLabel="Создать" />
    </ModalShell>
  );
}

function WriteoffModal({ busy, products, onClose, onSubmit }: any) {
  const REASONS = ["Брак", "Порча", "Потеря", "Подарок", "Витрина / образец", "Другое"];
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState(REASONS[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const prod = products.find((p: any) => p.id === productId);
  const submit = () => { if (!productId || Number(qty) <= 0) return; onSubmit({ productId, qty: Number(qty), reason, date, comment }); };
  return (
    <ModalShell title="Списание товара" onClose={onClose}>
      <label className="flex flex-col gap-1 text-[11px] text-slate-400 sm:col-span-2">Товар
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          {products.map((p: any) => <option key={p.id} value={p.id} className="bg-black">{p.name} · ост. {p.stock}</option>)}
        </select></label>
      <ModalInput label="Количество" type="number" value={qty} onChange={setQty} />
      <label className="flex flex-col gap-1 text-[11px] text-slate-400">Причина
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          {REASONS.map((r) => <option key={r} value={r} className="bg-black">{r}</option>)}
        </select></label>
      <ModalInput label="Дата" type="date" value={date} onChange={setDate} />
      <ModalInput label="Комментарий" value={comment} onChange={setComment} full />
      {prod && Number(qty) > prod.stock ? <div className="sm:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">Списываемое количество больше остатка ({prod.stock}).</div> : null}
      <ModalActions busy={busy} onClose={onClose} onSubmit={submit} submitLabel="Списать" />
    </ModalShell>
  );
}

function SaleModal({ busy, products, onClose, onSubmit }: any) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState("1");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const prod = products.find((p: any) => p.id === productId);
  const amount = (Number(qty) || 0) * (prod?.salePrice || 0);
  const submit = () => { if (!productId || Number(qty) <= 0) return; onSubmit({ productId, qty: Number(qty), amount, method, date }); };
  return (
    <ModalShell title="Оформить продажу" onClose={onClose}>
      <label className="flex flex-col gap-1 text-[11px] text-slate-400 sm:col-span-2">Товар
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          {products.map((p: any) => <option key={p.id} value={p.id} className="bg-black">{p.name} · {money(p.salePrice)} · ост. {p.stock}</option>)}
        </select></label>
      <ModalInput label="Количество" type="number" value={qty} onChange={setQty} />
      <label className="flex flex-col gap-1 text-[11px] text-slate-400">Способ оплаты
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          {Object.entries(PAY_METHOD_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-black">{v}</option>)}
        </select></label>
      <ModalInput label="Дата" type="date" value={date} onChange={setDate} />
      <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">Сумма к оплате: <span className="font-black text-[#C5A059]">{money(amount)}</span></div>
      <ModalActions busy={busy} onClose={onClose} onSubmit={submit} submitLabel="Провести продажу" />
    </ModalShell>
  );
}

function ReceiptModal({ busy, products, onClose, onSubmit }: any) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState("1");
  const [costPrice, setCostPrice] = useState(String(products[0]?.costPrice || ""));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const submit = () => { if (!productId || Number(qty) <= 0) return; onSubmit({ productId, qty: Number(qty), costPrice: Number(costPrice) || 0, date, comment }); };
  return (
    <ModalShell title="Поступление товара" onClose={onClose}>
      <label className="flex flex-col gap-1 text-[11px] text-slate-400 sm:col-span-2">Товар
        <select value={productId} onChange={(e) => { setProductId(e.target.value); const p = products.find((x: any) => x.id === e.target.value); if (p) setCostPrice(String(p.costPrice || "")); }} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          {products.map((p: any) => <option key={p.id} value={p.id} className="bg-black">{p.name}</option>)}
        </select></label>
      <ModalInput label="Количество" type="number" value={qty} onChange={setQty} />
      <ModalInput label="Закупочная цена, ₸" type="number" value={costPrice} onChange={setCostPrice} />
      <ModalInput label="Дата" type="date" value={date} onChange={setDate} />
      <ModalInput label="Комментарий" value={comment} onChange={setComment} full />
      <ModalActions busy={busy} onClose={onClose} onSubmit={submit} submitLabel="Оприходовать" />
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#0f0f0f] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-black text-white">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ busy, onClose, onSubmit, submitLabel }: { busy: boolean; onClose: () => void; onSubmit: () => void; submitLabel: string }) {
  return (
    <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
      <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300">Отмена</button>
      <button disabled={busy} onClick={onSubmit} className="rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black disabled:opacity-50">{submitLabel}</button>
    </div>
  );
}

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

// Маркетинг: возврат учеников из архива. Список архива + шаблон приглашения +
// массовая отправка в WhatsApp (по образцу массовых действий «Учеников»).
function MarketingView({ studentArchive = [], branches = [] }: { studentArchive?: any[]; branches?: Branch[] }) {
  const [archive, setArchive] = useState<any[]>(studentArchive);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [branchFilter, setBranchFilter] = useState("");
  const [template, setTemplate] = useState("Здравствуйте, {имя}! Это студия кавказского танца «Эхо Гор». Мы готовим новый набор и будем рады видеть вас снова — приходите на бесплатное пробное занятие. Записать вас?");
  const [sent, setSent] = useState<Set<string>>(new Set());

  // Подтянуть свежий архив (на случай, если открыли вкладку напрямую).
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/students/archive", { headers: { "x-demo-role": "owner" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setArchive(d.students || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name || "—";
  const list = archive.filter((a) => !branchFilter || a.branchId === branchFilter);
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = list.length > 0 && list.every((a) => selected.has(a.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(list.map((a) => a.id)));

  const phoneOf = (a: any) => (a.phone || a.parentPhone || "").replace(/[^\d+]/g, "");
  const msgFor = (a: any) => encodeURIComponent(template.replace(/\{имя\}/g, (a.name || "").split(" ")[0] || a.name || ""));
  const waLink = (a: any) => { const p = phoneOf(a).replace(/^\+/, ""); return p ? `https://wa.me/${p}?text=${msgFor(a)}` : ""; };

  const [autoBusy, setAutoBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const markSent = (targets: any[]) => setSent((s) => { const n = new Set(s); targets.forEach((a) => n.add(a.id)); return n; });

  const sendSelected = () => {
    const targets = list.filter((a) => selected.has(a.id) && phoneOf(a));
    targets.slice(0, 10).forEach((a) => { const url = waLink(a); if (url) window.open(url, "_blank"); });
    markSent(targets);
    setNote(`Открыто диалогов: ${Math.min(10, targets.length)}${targets.length > 10 ? ` из ${targets.length}` : ""}.`);
  };

  // Автоматическая отправка через WhatsApp API (если настроен на сервере),
  // иначе откатываемся на ручное открытие диалогов.
  const sendAuto = async () => {
    const targets = list.filter((a) => selected.has(a.id) && phoneOf(a));
    if (targets.length === 0) return;
    setAutoBusy(true); setNote(null);
    try {
      const res = await fetch("/api/mvp/marketing/broadcast", {
        method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: JSON.stringify({ template, recipients: targets.map((a) => ({ phone: phoneOf(a), name: a.name })) }),
      });
      if (res.status === 503) { setNote("Авторассылка не подключена (нужен WhatsApp Business API). Открываю диалоги вручную."); sendSelected(); return; }
      if (!res.ok) { const t = await res.json().catch(() => ({})); throw new Error(t.error || "Ошибка отправки"); }
      const d = await res.json();
      markSent(targets);
      setNote(`Автоматически отправлено: ${d.sent} из ${d.total}.`);
    } catch (e: any) { setNote(e?.message || "Не удалось отправить"); }
    finally { setAutoBusy(false); }
  };

  return (
    <OwnerScreen title="Маркетинг и возврат" subtitle="Реактивация ушедших учеников из архива: персональные приглашения вернуться на занятия. Шаблон с подстановкой имени и массовая отправка в WhatsApp.">
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatPill label="В архиве учеников" value={archive.length} tone="white" />
          <StatPill label="Выбрано для рассылки" value={selected.size} tone="gold" />
          <StatPill label="Отправлено приглашений" value={sent.size} tone="emerald" />
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Шаблон приглашения (подстановка: {"{имя}"})</span>
          <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50" />
        </label>
        <p className="mt-2 text-[11px] text-slate-500">Массовая отправка открывает диалоги WhatsApp с готовым текстом (до 10 за раз). Для полностью автоматической рассылки подключается WhatsApp Business API.</p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
          <option value="" className="bg-black">Все филиалы</option>
          {branches.map((b) => <option key={b.id} value={b.id} className="bg-black">{b.name}</option>)}
        </select>
        <button onClick={toggleAll} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">{allSelected ? "Снять выбор" : "Выбрать всех"}</button>
        <button onClick={sendSelected} disabled={selected.size === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-black text-black disabled:opacity-40">
          <Send className="h-4 w-4" /> Открыть в WhatsApp ({selected.size})
        </button>
        <button onClick={sendAuto} disabled={selected.size === 0 || autoBusy} className="inline-flex items-center gap-2 rounded-xl border border-[#25D366]/40 px-4 py-2 text-xs font-black text-[#25D366] hover:bg-[#25D366]/10 disabled:opacity-40">
          <Send className="h-4 w-4" /> {autoBusy ? "Отправка…" : "Отправить автоматически"}
        </button>
      </div>
      {note && <p className="text-xs text-slate-400">{note}</p>}

      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th className="px-4 py-3 font-bold">Ученик</th>
                <th className="px-4 py-3 font-bold">Филиал</th>
                <th className="px-4 py-3 font-bold">Телефон</th>
                <th className="px-4 py-3 font-bold">Почему ушёл</th>
                <th className="px-4 py-3 font-bold">В архиве с</th>
                <th className="px-4 py-3 font-bold">Действие</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Архив пуст — приглашать пока некого.</td></tr>}
              {list.map((a) => (
                <tr key={a.id} className={`border-b border-white/5 ${sent.has(a.id) ? "bg-emerald-500/[0.04]" : ""}`}>
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} /></td>
                  <td className="px-4 py-3 font-bold text-white">{a.name}{sent.has(a.id) && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">приглашён</span>}</td>
                  <td className="px-4 py-3 text-slate-400">{branchName(a.branchId)}</td>
                  <td className="px-4 py-3 text-slate-300">{a.phone || a.parentPhone || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{a.archiveReason || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{a.archivedAt ? new Date(a.archivedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td className="px-4 py-3">
                    {phoneOf(a)
                      ? <a href={waLink(a)} target="_blank" rel="noreferrer" onClick={() => setSent((s) => new Set(s).add(a.id))} className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 px-2.5 py-1 text-[11px] font-bold text-[#25D366] hover:bg-[#25D366]/10"><Send className="h-3.5 w-3.5" /> WhatsApp</a>
                      : <span className="text-[11px] text-slate-600">нет телефона</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </OwnerScreen>
  );
}

function NetworkSettingsView({ branches, teachers }: { branches: Branch[]; teachers: Teacher[] }) {
  return (
    <OwnerScreen title="Настройки сети" subtitle="Справочники, филиалы, роли, права доступа, тарифы, шаблоны, audit log, интеграции и лицензия.">
      {/* Настраиваемые справочники: владелец добавляет значения, остальные выбирают из готового. */}
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Справочники</h3>
        <p className="mt-1 text-xs text-slate-500">Эти списки используются в выпадающих полях. Управленцы и администраторы выбирают из готовых значений.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <SettingsListEditor kind="performance_type" title="Типы выступлений" />
          <SettingsListEditor kind="product_category" title="Категории товаров" />
          <SettingsListEditor kind="group_level" title="Уровни групп" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutivePanel icon={<Shield />} title="RBAC владельца" text="Полный доступ к сети, филиалам, финансам, ролям, настройкам, лицензии и audit log." />
        <ExecutivePanel icon={<Settings />} title="Глобальные настройки" text={`Филиалов: ${branches.length}. Преподавателей: ${teachers.length}. Управление тарифами и шаблонами уведомлений.`} />
        <ExecutivePanel icon={<CheckCircle />} title="Защищенные действия" text="Удаление филиалов, экспорт данных и доступ к чувствительным данным проходят через подтверждение и журналирование." />
        <ExecutivePanel icon={<Activity />} title="Audit log сети" text="Все действия владельца, руководителей филиалов, администраторов и преподавателей фиксируются." />
      </div>
    </OwnerScreen>
  );
}

// Редактор одного справочника (settings_lists). Владелец добавляет/удаляет значения.
function SettingsListEditor({ kind, title }: { kind: string; title: string }) {
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  const [isDefault, setIsDefault] = useState(true);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": "owner" } };

  const load = async () => {
    try {
      const r = await fetch(`/api/mvp/settings/lists?kind=${kind}`, { headers: { "x-demo-role": "owner" } });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items || []); setIsDefault(!!d.isDefault);
    } catch { /* пусто */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind]);

  const add = async () => {
    const label = val.trim();
    if (!label) return;
    setBusy(true);
    try { await fetch(`/api/mvp/settings/lists`, { method: "POST", ...jhdr, body: JSON.stringify({ kind, label }) }); setVal(""); await load(); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (id.startsWith("def:")) return; // дефолты не удаляются — добавьте свои значения
    setBusy(true);
    try { await fetch(`/api/mvp/settings/lists/${id}`, { method: "DELETE", headers: { "x-demo-role": "owner" } }); await load(); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{title}</p>
      {isDefault && <p className="mt-1 text-[10px] text-slate-600">Показаны значения по умолчанию. Добавьте своё — список станет настраиваемым.</p>}
      <div className="mt-3 space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-1.5">
            <span className="text-sm text-slate-200">{it.label}</span>
            {!it.id.startsWith("def:") && <button onClick={() => remove(it.id)} disabled={busy} className="text-slate-500 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Новое значение" className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#C5A059]/50" />
        <button onClick={add} disabled={busy || !val.trim()} className="rounded-lg bg-[#C5A059] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40">Добавить</button>
      </div>
    </div>
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
