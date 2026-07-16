import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgePercent,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Menu,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Download,
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
  History,
  PieChart,
  Lock,
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
  Upload,
  Camera,
  Bot,
  X
} from "lucide-react";
import ownerLogoDay from "../assets/images/logo_sidebar_day.png";
import ownerLogoNight from "../assets/images/logo_sidebar_night.png";
import { Announcement, AnnouncementAudience, Branch, Competition, ExecutiveSummary, Group, Payment, Student, SubscriptionPlan, Teacher, LeadSource, WaitlistEntry } from "../types";
import {
  TN_KPI_WEIGHTS, TN_RATES, TN_RET_BONUS, TN_TOM_BONUS, TN_MONTHS, TN_SEED,
  tnInitials, tnCatName, tnKpiComponents, tnKpiTotal, tnSalary, tnEnrich,
} from "../teacherEconomics";
import type { TnGroupBreak, TnMonth, TnFine, TnSeed, TnRow } from "../teacherEconomics";
import { StaffStandardsView } from "./StaffStandardsView";
import { StandardsHealthAlert } from "./StandardsHealthAlert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart as RLineChart, Line, Legend, AreaChart, Area
} from "recharts";
import { ResponsiveContainer } from "./SafeResponsiveContainer";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import { statusSwatch } from "../statusConfig";
import { hasCoveringSubscription } from "../studentSegments";
import StudentsRegistry, { type RegistryPreset } from "./StudentsRegistry";
import ReactivationPanel from "./ReactivationPanel";
import GroupScheduleGrid from "./GroupScheduleGrid";
import GroupScheduleFields from "./GroupScheduleFields";
import { ArchiveReasonModal } from "./ArchiveReasonModal";
import AttendanceJournalView from "./AttendanceJournalView";
import { BranchesGroupsView } from "./BranchesGroupsView";
// Тяжёлые вкладки владельца грузятся лениво — только при первом открытии,
// чтобы не раздувать основной чанк OwnerExecutiveWorkspace (перф-оптимизация).
const AiHubView = React.lazy(() => import("./AiHubView"));
const TeachersProtoView = React.lazy(() => import("./proto/TeachersProtoView"));
const AccountingProtoView = React.lazy(() => import("./proto/AccountingProtoView"));
const PlanningProtoView = React.lazy(() => import("./proto/PlanningProtoView"));
const ReportsProtoView = React.lazy(() => import("./proto/ReportsProtoView"));
import { useOwnerSectionSettings, SectionSettingsDrawer, SectionGearButton, type ResolvedTab } from "./OwnerSectionSettings";
import { CostumeOverdueBanner } from "./CostumeOverdueBanner";
import { CostumeCatalogSettings } from "./CostumeCatalogSettings";
import { SubscriptionPlansManager } from "./SubscriptionPlansManager";
import StatusSettings from "./StatusSettings";
import { computeOwnerDashboard, type DashFilters, type PeriodKey, type LevelKey, type DashExtras, type Delta, type DailyReport } from "../ownerDashboardAnalytics";
import { requestDataRefresh } from "../dataRefresh";

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
type ArchiveStudent = { id: string; name: string; branchId: string; phone?: string; parentName?: string; parentPhone?: string; archivedAt: string; archivedBy: string; archiveReason: string; archiveComment: string; subscriptionsCount?: number; category?: "left" | "declined" };
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
  onCreateStudent?: (data: StudentInput) => Promise<string | boolean | null | { archivedId: string; message: string }>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  onSellSubscriptionBatch?: (items: SellSubscriptionInput[]) => Promise<any> | any;
  onDeleteTrial?: (studentId: string, date: string) => Promise<any> | any;
  subscriptionPlans?: SubscriptionPlan[];
  studentTrash?: TrashStudent[];
  onRestoreStudent?: (id: string) => Promise<boolean>;
  onConfirmDeleteStudent?: (id: string) => Promise<boolean>;
  studentArchive?: ArchiveStudent[];
  onArchiveStudent?: (id: string, reason: string, comment: string, leftOn?: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<boolean>;
  onEditArchive?: (id: string, patch: { leftOn?: string; reason?: string; comment?: string }) => Promise<boolean | void> | void;
  onBookTrial?: (id: string, payload: { date: string; time: string; note: string }) => Promise<boolean> | void;
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
  archivedGroups?: any[];
  onRestoreGroup?: (id: string) => Promise<boolean>;
  onDeleteGroupPermanent?: (id: string) => Promise<boolean>;
  onCreateHall?: (data: any) => Promise<boolean>;
  onUpdateHall?: (id: string, data: any) => Promise<boolean>;
  onDeleteHall?: (id: string) => Promise<boolean>;
  onCreateLesson?: (data: any) => Promise<boolean>;
  onUpdateLesson?: (id: string, data: any) => Promise<boolean>;
  onDeleteLesson?: (id: string) => Promise<boolean>;
  onToggleAttendance?: any;
  onBatchAttendance?: any;
  onBulkAttendance?: any;
  journal?: any;
  onJournalTask?: (p: { studentId: string; studentName: string; title: string }) => void;
  onCreatePlan?: (data: any) => Promise<boolean>;
  onUpdatePlan?: (id: string, data: any) => Promise<boolean>;
  onDeletePlan?: (id: string) => Promise<boolean>;
  /** false, пока показан экран входа. Стартовые анимации ждут завершения входа. */
  entered?: boolean;
}

type OwnerTab = "dashboard" | "branches" | "students" | "teachers" | "payroll" | "journal" | "schedule" | "finance" | "planning" | "meetings" | "reports" | "performances" | "products" | "documents" | "marketing" | "events" | "feed" | "announcements" | "analytics" | "ai" | "aihub" | "settings";

// Аудит #37: смысловая группировка 17 разделов в сайдбаре (заголовки секций).
// Считается по id в рендере — не трогает механику переупорядочивания разделов.
const TAB_GROUP: Record<string, string> = {
  dashboard: "Обзор",
  branches: "Люди", students: "Люди", teachers: "Люди",
  journal: "Учебный процесс", schedule: "Учебный процесс", performances: "Учебный процесс",
  finance: "Деньги", planning: "Деньги", products: "Деньги", reports: "Деньги",
  meetings: "Коммуникации", marketing: "Коммуникации", feed: "Коммуникации", announcements: "Коммуникации", aihub: "Коммуникации",
  settings: "Система",
};

const ownerTabs: { id: OwnerTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Главная", short: "Главная", icon: Activity },
  { id: "branches", label: "Филиалы", short: "Филиалы", icon: Building2 },
  { id: "students", label: "Ученики", short: "Ученики", icon: Users },
  { id: "teachers", label: "Преподаватели", short: "Педагоги", icon: GraduationCap },
  { id: "journal", label: "Журнал посещаемости", short: "Журнал", icon: ClipboardList },
  { id: "schedule", label: "Расписание", short: "Расписание", icon: CalendarDays },
  { id: "finance", label: "Бухгалтерия", short: "Учёт", icon: Coins },
  { id: "planning", label: "Планирование (БДР)", short: "План", icon: LineChart },
  { id: "meetings", label: "Планёрки", short: "Планёрки", icon: CalendarClock },
  { id: "reports", label: "Отчётность", short: "Отчёты", icon: FileSpreadsheet },
  { id: "performances", label: "Выступления", short: "Сцена", icon: Mic2 },
  { id: "products", label: "Товары и склад", short: "Товары", icon: ShoppingBag },
  { id: "marketing", label: "Маркетинг", short: "Маркетинг", icon: Send },
  { id: "feed", label: "Афиша СНГ", short: "Афиша", icon: CalendarDays },
  { id: "announcements", label: "Объявления", short: "Связь", icon: Megaphone },
  { id: "aihub", label: "AI-центр", short: "AI-центр", icon: Bot },
  { id: "settings", label: "Настройки сети", short: "Еще", icon: Settings }
];
// Удалённые вкладки (документолог, аналитика, концерты, AI Assistant) — всё это
// уже есть в дашборде/других разделах. Их render-блоки ниже остаются как dead code,
// но в меню и hash-роутинг больше не попадают (ownerTabs — единственный источник).

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
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  studentTrash = [],
  onRestoreStudent,
  onConfirmDeleteStudent,
  studentArchive = [],
  onArchiveStudent,
  onUnarchiveStudent,
  onEditArchive,
  onBookTrial,
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
  archivedGroups = [],
  onRestoreGroup,
  onDeleteGroupPermanent,
  onCreateHall,
  onUpdateHall,
  onDeleteHall,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
  onToggleAttendance,
  onBatchAttendance,
  onBulkAttendance,
  journal,
  onJournalTask,
  entered = true,
}: OwnerExecutiveWorkspaceProps) {
  // Активная вкладка синхронизирована с адресом браузера (#dashboard, #students…),
  // чтобы кнопка «назад» возвращала на предыдущую вкладку, а не выкидывала с сайта.
  const [activeTab, setActiveTab] = useState<OwnerTab>(() => {
    if (typeof window === "undefined") return "dashboard";
    const h = window.location.hash.replace(/^#/, "");
    return ownerTabs.some((t) => t.id === h) ? (h as OwnerTab) : "dashboard";
  });
  // true → смена вкладки пришла от «назад/вперёд» браузера; тогда новую запись
  // в историю не добавляем (иначе история зациклится).
  const fromPopState = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (fromPopState.current) { fromPopState.current = false; return; }
    const target = `#${activeTab}`;
    if (window.location.hash !== target) {
      window.history.pushState({ ownerTab: activeTab }, "", target);
    }
  }, [activeTab]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const h = window.location.hash.replace(/^#/, "");
      const tab = ownerTabs.some((t) => t.id === h) ? (h as OwnerTab) : "dashboard";
      fromPopState.current = true;
      setActiveTab(tab);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Настройки разделов от Владельца (переименование/видимость/порядок/акцент/роли/описание).
  const sectionSettings = useOwnerSectionSettings(ownerTabs);
  const [settingsForTab, setSettingsForTab] = useState<OwnerTab | null>(null);
  const activeResolved = sectionSettings.resolvedTabs.find((t) => t.id === activeTab);
  const drawerTab = settingsForTab ? sectionSettings.resolvedTabs.find((t) => t.id === settingsForTab) || null : null;
  // Сворачивание бокового меню — любой раздел можно открыть на всю ширину.
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  // Мобильная шторка «Ещё» — доступ ко всем разделам с телефона.
  const [moreOpen, setMoreOpen] = useState(false);
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
        managerName: branch?.managerName || "Управляющий",
        teachersCount,
        newLeads: 0,
        retention: Math.max(0, Math.round(100 - metrics.churnRate)),
        status
      };
    });
  }, [branches, groups, metrics.branchMetrics]);

  return (
    <div className="min-h-full bg-[#080808] text-slate-200">
      {/* Раскладка на всю ширину: сайдбар прижат к левому краю и НЕ уезжает при
          зуме браузера (раньше mx-auto max-w-[1560px] центрировал и сдвигал его). */}
      <div className="flex w-full gap-0 lg:gap-5">
        <aside className={`sticky top-3 my-3 ml-3 hidden h-[calc(100vh-88px)] w-64 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#0F0F0F] shadow-sm ${navCollapsed ? "lg:hidden" : "lg:flex"}`}>
          {/* Лого-бокс (референс .eg-logo-box): фирменный логотип ЭХОГОР.
              Тёмный вариант (тёмные буквы) для светлой темы, светлый — для тёмной.
              Переключение через CSS-классы day-logo/night-logo в index.css. */}
          <div className="border-b border-white/5 px-6 py-5">
            <img src={ownerLogoDay} alt="Эхо Гор" className="day-logo w-full max-w-[168px]" />
            <img src={ownerLogoNight} alt="Эхо Гор" className="night-logo w-full max-w-[168px]" />
          </div>
          {/* Навигация (референс .nav) — прокручиваемая */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {(() => {
              // Раскладываем вкладки по группам (бакетам): заголовок секции печатается
              // РОВНО ОДИН РАЗ. Порядок групп — по первому появлению их вкладок,
              // внутри группы — пользовательский порядок (section-settings умеет
              // переупорядочивать, поэтому старый «заголовок по смене соседа» повторял
              // заголовки, когда вкладки одной группы шли не подряд).
              const order: string[] = [];
              const byGroup = new Map<string, typeof sectionSettings.visibleTabs>();
              sectionSettings.visibleTabs.forEach((tab) => {
                const g = TAB_GROUP[tab.id] || "";
                if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
                byGroup.get(g)!.push(tab);
              });
              return order.map((g) => (
                <React.Fragment key={g || "_ungrouped"}>
                  {g && <p className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-wider text-slate-600 first:pt-0">{g}</p>}
                  {byGroup.get(g)!.map((tab) => (
                    <OwnerNavButton
                      key={tab.id}
                      tab={tab}
                      active={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id as OwnerTab)}
                    />
                  ))}
                </React.Fragment>
              ));
            })()}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pt-6 lg:pb-8">
          {/* Топбар (референс .eg-topbar): тумблер меню + строка поиска */}
          <div className="mb-4 hidden items-center gap-4 lg:flex">
            <button onClick={() => setNavCollapsed((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10">
              {navCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {navCollapsed ? "Показать меню" : "Скрыть меню"}
            </button>
            <div className="flex max-w-[440px] flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Поиск учеников, групп, оплат…"
                className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-0"
              />
            </div>
            <button
              onClick={() => setSettingsForTab(activeTab)}
              title={`Настройки раздела «${activeResolved?.effectiveLabel || ""}»`}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]"
            >
              <Settings className="h-4 w-4" />
              Настроить раздел
            </button>
          </div>
          <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/5 bg-[#080808]/90 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C5A059] text-black"><Crown className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Владелец сети</p>
                <h1 className="truncate text-base font-black text-white">{activeResolved?.effectiveLabel || "CEO Command Center"}</h1>
              </div>
              <SectionGearButton onClick={() => setSettingsForTab(activeTab)} className="h-9 w-9" />
            </div>
          </div>

          {/* key=activeTab → контейнер перемонтируется при смене вкладки и
              заново проигрывает мягкую анимацию появления (см. .owner-tab-view). */}
          <div key={`${activeTab}-${entered ? "in" : "wait"}`} className="owner-tab-view">
          <React.Suspense fallback={<div className="flex items-center justify-center py-24 text-sm font-semibold text-slate-500">Загрузка раздела…</div>}>
          {activeTab === "dashboard" && <div className="mb-4"><CostumeOverdueBanner role="owner" /></div>}
          {activeTab === "dashboard" && (
            <OwnerDashboard
              rawBranches={branches}
              rawStudents={students}
              rawGroups={groups}
              rawTeachers={teachers}
              rawPayments={payments}
              rawWaitlist={waitlist}
              studentArchive={studentArchive}
              branchScorecards={branchScorecards}
              onNavigate={(tab: OwnerTab) => setActiveTab(tab)}
              onOpenStudents={openStudentsWithPreset}
              onTriggerAiReport={onTriggerAiReport}
              aiResult={aiResult}
              aiGenerating={aiGenerating}
            />
          )}
          {activeTab === "branches" && <BranchesGroupsView branches={branchScorecards} rawBranches={branches} students={students} groups={groups} teachers={teachers} halls={halls} payments={payments} onCreateBranch={onCreateBranch} onUpdateBranch={onUpdateBranch} onDeleteBranch={onDeleteBranch} onCreateGroup={onCreateGroup} onUpdateGroup={onUpdateGroup} onDeleteGroup={onDeleteGroup} onCreateHall={onCreateHall} onUpdateHall={onUpdateHall} onDeleteHall={onDeleteHall} onOpenStudents={openStudentsWithPreset} />}
          {activeTab === "students" && <StudentsNetworkView students={students} branches={branches} groups={groups} teachers={teachers} onCreateStudent={onCreateStudent} onUpdateStudent={onUpdateStudent} onDeleteStudent={onDeleteStudent} onOpenPayment={onOpenPayment} onSellSubscription={onSellSubscription} subscriptionPlans={subscriptionPlans} studentTrash={studentTrash} onRestoreStudent={onRestoreStudent} onConfirmDeleteStudent={onConfirmDeleteStudent} studentArchive={studentArchive} onArchiveStudent={onArchiveStudent} onUnarchiveStudent={onUnarchiveStudent} onEditArchive={onEditArchive} onBookTrial={onBookTrial} leadSources={leadSources} waitlist={waitlist} onAddToWaitlist={onAddToWaitlist} onRemoveFromWaitlist={onRemoveFromWaitlist} onCreateLeadSource={onCreateLeadSource} onUpdateLeadSource={onUpdateLeadSource} onDeleteLeadSource={onDeleteLeadSource} preset={studentsPreset} />}
          {activeTab === "teachers" && <TeachersProtoView teachers={teachers} branches={branches} groups={groups} students={students} />}
          {activeTab === "finance" && <AccountingProtoView branches={branches} />}
          {activeTab === "planning" && <PlanningProtoView branches={branches} />}
          {activeTab === "meetings" && <MeetingsView />}
          {activeTab === "reports" && <ReportsProtoView students={students} payments={payments} branches={branches} groups={groups} teachers={teachers} leadSources={leadSources} />}
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
              onBatchAttendance={onBatchAttendance}
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
              archivedGroups={archivedGroups}
              onRestoreGroup={onRestoreGroup}
              onDeleteGroupPermanent={onDeleteGroupPermanent}
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
          {activeTab === "aihub" && <AiHubView roleHeader="owner" />}
          {activeTab === "marketing" && <MarketingView studentArchive={studentArchive} branches={branches} groups={groups} teachers={teachers} />}
          {activeTab === "settings" && <NetworkSettingsView branches={branches} teachers={teachers} subscriptionPlans={subscriptionPlans} onCreatePlan={onCreatePlan} onUpdatePlan={onUpdatePlan} onDeletePlan={onDeletePlan} />}
          </React.Suspense>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#080808]/95 px-2 pt-2 backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {sectionSettings.mobileTabs.slice(0, 4).map((tab) => (
          <OwnerMobileNav key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id as OwnerTab); setMoreOpen(false); }} />
        ))}
        <button onClick={() => setMoreOpen((v) => !v)} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-black uppercase ${moreOpen || !sectionSettings.mobileTabs.slice(0, 4).some((t) => t.id === activeTab) ? "text-[#C5A059]" : "text-slate-500"}`}>
          <Menu className="h-5 w-5" />
          <span className="max-w-full truncate px-1">Ещё</span>
        </button>
      </nav>

      {/* Шторка «Ещё»: все разделы с телефона */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0F0F0F] px-4 pt-3" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Все разделы</p>
              <button onClick={() => setMoreOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sectionSettings.visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as OwnerTab); setMoreOpen(false); }}
                    className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center ${active ? "border-[#C5A059]/40 bg-[#C5A059]/10 text-[#C5A059]" : "border-white/5 bg-white/[0.03] text-slate-300 active:bg-white/10"}`}
                  >
                    <Icon className="h-5 w-5" style={{ color: active ? (tab.accent || "#C5A059") : undefined }} />
                    <span className="line-clamp-2 text-[10px] font-bold leading-tight">{tab.effectiveLabel || tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SectionSettingsDrawer tab={drawerTab} api={sectionSettings} onClose={() => setSettingsForTab(null)} />
    </div>
  );
}

// Выполнение плана БДР + ожидаемая чистая прибыль (сеть и по филиалам).
type BdrProfit = {
  plannedRevenue: number | null; plannedExpense: number | null;
  factRevenue: number; factExpense: number; forecastRevenue: number;
  plannedProfit: number | null; expectedProfit: number | null; factProfit: number;
};
type BdrRow = { branchId: string; name: string; plan: number | null; fact: number; pct: number | null } & Partial<BdrProfit>;
type BdrData = { period: string; network: ({ plan: number | null; fact: number; pct: number | null } & Partial<BdrProfit>) | null; byBranch: BdrRow[] };

function OwnerDashboard({ rawBranches, rawStudents, rawGroups, rawTeachers, rawPayments, rawWaitlist, studentArchive = [], branchScorecards, onNavigate, onOpenStudents, onTriggerAiReport, aiResult, aiGenerating }: any) {
  const go = (tab: string) => onNavigate?.(tab);
  // Локальные «сегодня» и «текущий месяц» (не toISOString — часовой пояс!).
  const localToday = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  // Режим периода (ТЗ 13.07): конкретный месяц / конкретный день / произвольный период.
  const [period, setPeriod] = useState<PeriodKey>("monthpick");
  const [monthValue, setMonthValue] = useState<string>(localToday.slice(0, 7)); // YYYY-MM
  const [dayValue, setDayValue] = useState<string>(localToday);                  // YYYY-MM-DD
  // Независимые фильтры: филиал + группа + педагог применяются вместе.
  const [branchId, setBranchId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  // Начало/конец выбранного периода для серверных выборок (выступления/товары).
  const monthEndOf = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const last = new Date(y, m, 0);
    return `${y}-${String(m).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  };
  const rangeFrom = period === "monthpick" ? `${monthValue}-01` : period === "day" ? dayValue : customStart;
  const rangeTo = period === "monthpick" ? (monthValue === localToday.slice(0, 7) ? localToday : monthEndOf(monthValue)) : period === "day" ? dayValue : customEnd;
  const [extras, setExtras] = useState<DashExtras>({});
  // Выручка по новым направлениям (выступления, товары) — для блока «Выручка по направлениям».
  const [streamRev, setStreamRev] = useState<{ perf: any; prod: any }>({ perf: null, prod: null });
  // Список выступлений для блока на дашборде (этот месяц / предстоящие).
  const [perfList, setPerfList] = useState<any[]>([]);
  // Окно детализации, раскрываемое по клику (модальное окно с таблицей/списком).
  const [riskTable, setRiskTable] = useState<DetailModalData | null>(null);
  // Состояние сворачивания блоков — запоминается по роли пользователя.
  const { isOpen: sectionOpen, toggle: toggleSection } = useCollapsedSections("owner");
  // Вкладки дашборда: информация упорядочена по темам, без дублей (ТЗ заказчика).
  const [dashTab, setDashTab] = useState<"today" | "finance" | "sales" | "retention" | "ratings" | "standards">("today");
  // Заявки на расходы и возвраты, ожидающие решения владельца.
  const [expenseReqs, setExpenseReqs] = useState<any[]>([]);
  const [refundReqs, setRefundReqs] = useState<any[]>([]);
  const [reqBusy, setReqBusy] = useState<string | null>(null);
  // Выполнение плана БДР: план — вкладка «Планирование (БДР)», факт — оплаты месяца.
  const [bdr, setBdr] = useState<BdrData | null>(null);

  const loadRequests = () => {
    const get = (url: string) => fetch(url, { headers: { "x-demo-role": "owner" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    get("/api/mvp/accounting/expense-requests?status=pending").then((d) => setExpenseReqs(d?.requests || []));
    get("/api/mvp/accounting/refund-requests?status=pending").then((d) => setRefundReqs(d?.requests || []));
  };
  useEffect(() => { loadRequests(); }, []);

  useEffect(() => {
    let alive = true;
    // Аудит #13: БДР теперь следует за выбранным месяцем (monthValue), а не всегда
    // за текущим — раньше при выборе прошлого месяца показывался БДР за этот месяц.
    const period = monthValue || localToday.slice(0, 7);
    fetch(`/api/mvp/owner/bdr-progress?period=${period}`, { headers: { "x-demo-role": "owner" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setBdr(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [monthValue, localToday]);

  // Одобрить / отклонить заявку (расход или возврат) прямо с дашборда.
  const decideRequest = async (kind: "expense" | "refund", id: string, action: "approve" | "reject") => {
    setReqBusy(id);
    try {
      await fetch(`/api/mvp/accounting/${kind}-requests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: "{}",
      });
      loadRequests();
    } finally { setReqBusy(null); }
  };

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
  // Новые режимы (месяц/день) сервер не знает — передаём их как custom-диапазон.
  useEffect(() => {
    let alive = true;
    const qs = (period === "custom" || period === "monthpick" || period === "day") && rangeFrom && rangeTo
      ? `period=custom&from=${rangeFrom}&to=${rangeTo}`
      : `period=${period}`;
    const get = (url: string) => fetch(url, { headers: { "x-demo-role": "owner" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([get(`/api/mvp/performances/overview?${qs}`), get(`/api/mvp/products/overview?${qs}`)])
      .then(([perf, prod]) => { if (alive) setStreamRev({ perf, prod }); });
    return () => { alive = false; };
  }, [period, rangeFrom, rangeTo]);

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

  const filters: DashFilters = {
    period, branchId, groupId, teacherId,
    customStart: period === "monthpick" ? monthValue : period === "day" ? dayValue : customStart,
    customEnd,
  };
  const m = useMemo(
    () => computeOwnerDashboard(
      { students: rawStudents || [], payments: rawPayments || [], groups: rawGroups || [], branches: rawBranches || [], teachers: rawTeachers || [], archive: studentArchive || [] },
      filters, new Date(), extras
    ),
    [rawStudents, rawPayments, rawGroups, rawBranches, rawTeachers, studentArchive, period, monthValue, dayValue, branchId, groupId, teacherId, customStart, customEnd, extras]
  );

  // Запас прочности: общее количество учеников и лист ожидания с учётом фильтра
  // (сеть / филиал / группа). Помогает понять, нужен ли набор или есть очередь.
  const capacityInfo = useMemo(() => {
    const inScope = (s: Student) =>
      (!branchId || s.branchId === branchId) && (!groupId || (s.groupIds || []).includes(groupId));
    const totalStudents = (rawStudents || []).filter(inScope).length;
    const waitInScope = (w: any) => {
      if (w.removedAt) return false;
      return (!branchId || w.branchId === branchId) && (!groupId || w.groupId === groupId);
    };
    const waitlistTotal = (rawWaitlist || []).filter(waitInScope).length;
    const capacity = m.occupancy.capacity || 0;
    const freeSpots = capacity > 0 ? Math.max(0, capacity - m.occupancy.filled) : null;
    return { totalStudents, waitlistTotal, freeSpots };
  }, [rawStudents, rawWaitlist, branchId, groupId, m.occupancy.capacity, m.occupancy.filled]);

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
    footer: fullPreset && onOpenStudents ? { label: "Открыть в разделе «Ученики» ›", onClick: () => onOpenStudents({ branchFilter: branchId || "all", ...fullPreset }) } : undefined,
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
  // Клик по «Выручка сегодня» открывает СПИСОК ОПЛАТ за сегодня (ТЗ заказчика).
  const PAY_METHOD_LABEL: Record<string, string> = { card: "Карта", cash: "Наличные", transfer: "Перевод", kaspi: "Kaspi" };
  const openPaymentsToday = () => {
    // Локальная дата: toISOString в UTC+5 отдаёт «вчера» до 5 утра.
    const nowD = new Date();
    const todayIso = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(nowD.getDate()).padStart(2, "0")}`;
    const todays = (rawPayments || []).filter((p: Payment) => p.status === "paid" && p.date === todayIso);
    setRiskTable({
      title: "Оплаты за сегодня",
      subtitle: `${todays.length} ${todays.length === 1 ? "оплата" : todays.length >= 2 && todays.length <= 4 ? "оплаты" : "оплат"} · ${money(todays.reduce((s: number, p: Payment) => s + p.amount, 0))}`,
      columns: ["Ученик", "Сумма", "Способ", "Назначение"],
      rows: todays.map((p: Payment) => {
        const st = studentById.get(p.studentId);
        return [
          <span className="font-bold text-white">{st?.name || "—"}</span>,
          <span className="font-black text-[#C5A059]">{money(p.amount)}</span>,
          PAY_METHOD_LABEL[p.method as string] || p.method || "—",
          p.description || "—",
        ];
      }),
      empty: "Сегодня оплат ещё не было.",
    });
  };
  // Окно «План БДР по филиалам»: план из «Планирования (БДР)», факт — оплаты месяца.
  const openBdr = () => setRiskTable({
    title: "Выполнение плана БДР по филиалам",
    subtitle: bdr?.network?.plan
      ? `Сеть: ${money(bdr.network.fact)} из ${money(bdr.network.plan)} · ${bdr.network.pct}%`
      : "План на текущий месяц не задан",
    columns: ["Филиал", "План", "Факт", "% выполнения"],
    rows: (bdr?.byBranch || []).map((b) => [
      b.name,
      b.plan === null ? <span className="text-slate-500">не задан</span> : money(b.plan),
      money(b.fact),
      b.pct === null ? "—" : <span className={`font-black ${b.pct >= 100 ? "text-emerald-400" : b.pct >= 70 ? "text-amber-400" : "text-rose-400"}`}>{b.pct}%</span>,
    ]),
    empty: "Нет данных по филиалам.",
    note: "План задаётся во вкладке «Планирование (БДР)». Факт — оплаченные платежи текущего месяца.",
    footer: { label: "Открыть Планирование (БДР) ›", onClick: () => go("planning") },
  });
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
  // Ряды для мини-графиков карточек выручки (последние 6 месяцев).
  const subsSeries = ((m.charts?.revenueByMonth || []) as any[]).slice(-6).map((x) => Number(x.cur) || 0);
  const perfSeries = ((streamRev.perf?.byMonth || []) as any[]).slice(-6).map((x) => Number(x.amount) || 0);
  const prodSeries = ((streamRev.prod?.byMonth || []) as any[]).slice(-6).map((x) => Number(x.amount) || 0);
  const totalSeries = (() => {
    const len = Math.max(subsSeries.length, perfSeries.length, prodSeries.length);
    const at = (a: number[], i: number) => a[a.length - len + i] ?? 0;
    return Array.from({ length: len }, (_, i) => at(subsSeries, i) + at(perfSeries, i) + at(prodSeries, i));
  })();
  const STREAM_COLORS = { subs: "#16A34A", perf: "#7C3AED", prod: "#2563EB", total: "#C5A059" };
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
    // Аудит #21: это НЕ отток (ушедшие), а доля без активного абонемента —
    // «отток за месяц» считается отдельно (churn.left/pct). Разные метрики.
    ["Без активного абонемента", m.retention.pct === null ? "—" : `${100 - m.retention.pct}%`],
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

  // Режимы периода (ТЗ 13.07): конкретный месяц / день по выбору / период по выбору.
  const periodModes: { id: PeriodKey; label: string }[] = [
    { id: "monthpick", label: "Месяц" }, { id: "day", label: "День" }, { id: "custom", label: "Период" },
  ];
  const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const [mvYear, mvMonth] = monthValue.split("-");
  const yearOptions = (() => { const y = Number(localToday.slice(0, 4)); return [y - 2, y - 1, y, y + 1].map(String); })();
  // Группы в выпадашке — только выбранного филиала (если он выбран).
  const groupOptions = (rawGroups || []).filter((g: Group) => !branchId || g.branchId === branchId);
  const hasScopeFilter = Boolean(branchId || groupId || teacherId);
  const dateInputCls = "rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-[#C5A059]/40";

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <div className="space-y-5">
      {/* 1. ФИЛЬТРЫ: период (месяц/день/диапазон) + филиал · группа · педагог */}
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">{greeting}, владелец</p>
            <h1 className="mt-1.5 text-2xl font-black text-white md:text-3xl">Главный экран сети</h1>
            <p className="mt-1 text-sm text-slate-400">{m.scope.label} · {m.ranges.cur.label} · {m.scope.students} учеников</p>
          </div>
          <div className="flex flex-col gap-2">
            {/* Период: режим + значение */}
            <div className="flex flex-wrap items-center gap-1.5">
              {periodModes.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${period === p.id ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#C5A059]/40"}`}>
                  {p.label}
                </button>
              ))}
              {period === "monthpick" && (
                <>
                  <select value={mvMonth} onChange={(e) => setMonthValue(`${mvYear}-${e.target.value}`)}
                    className="rounded-xl border border-[#C5A059]/30 bg-black/40 px-2.5 py-1.5 text-xs font-bold text-slate-100 outline-none">
                    {MONTH_NAMES.map((label, i) => (
                      <option key={i} value={String(i + 1).padStart(2, "0")}>{label}</option>
                    ))}
                  </select>
                  <select value={mvYear} onChange={(e) => setMonthValue(`${e.target.value}-${mvMonth}`)}
                    className="rounded-xl border border-[#C5A059]/30 bg-black/40 px-2.5 py-1.5 text-xs font-bold text-slate-100 outline-none">
                    {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </>
              )}
              {period === "day" && (
                <input type="date" value={dayValue} onChange={(e) => e.target.value && setDayValue(e.target.value)} className={dateInputCls} />
              )}
              {period === "custom" && (
                <>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={dateInputCls} />
                  <span className="text-slate-500">—</span>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className={dateInputCls} />
                </>
              )}
            </div>
            {/* Область: филиал + группа + педагог — независимые фильтры */}
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterSelect value={branchId} onChange={(v) => { setBranchId(v); if (v && groupId && !(rawGroups || []).some((g: Group) => g.id === groupId && g.branchId === v)) setGroupId(""); }}
                placeholder="Все филиалы"
                options={(rawBranches || []).map((b: Branch) => ({ value: b.id, label: b.name || b.city }))} />
              <FilterSelect value={groupId} onChange={setGroupId} placeholder="Все группы"
                options={groupOptions.map((g: Group) => ({ value: g.id, label: g.name }))} />
              <FilterSelect value={teacherId} onChange={setTeacherId} placeholder="Все педагоги"
                options={(rawTeachers || []).map((t: Teacher) => ({ value: t.id, label: t.name }))} />
              {hasScopeFilter && (
                <button onClick={() => { setBranchId(""); setGroupId(""); setTeacherId(""); }}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-slate-400 transition hover:text-white">
                  <X className="h-3 w-3" /> Сбросить
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Вкладки дашборда: информация упорядочена по темам, без дублей (ТЗ заказчика). */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "today", label: "Сегодня", icon: ClipboardList, badge: expenseReqs.length + refundReqs.length + dr.trialYesterdayLost.count + dr.trialYesterdayMissed.count },
          { id: "finance", label: "Финансы", icon: Coins, badge: 0 },
          { id: "sales", label: "Продажи", icon: Filter, badge: 0 },
          { id: "retention", label: "Удержание", icon: TrendingUp, badge: 0 },
          { id: "ratings", label: "Рейтинги и AI", icon: Trophy, badge: 0 },
          { id: "standards", label: "Стандарты работы", icon: Shield, badge: 0 },
        ] as { id: typeof dashTab; label: string; icon: React.ElementType; badge: number }[]).map((t) => {
          const TabIcon = t.icon;
          return (
            <button key={t.id} onClick={() => setDashTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${dashTab === t.id ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#C5A059]/40 hover:text-white"}`}>
              <TabIcon className="h-3.5 w-3.5" /> {t.label}
              {t.badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${dashTab === t.id ? "bg-black/20 text-black" : "bg-rose-500/25 text-rose-300"}`}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {dashTab === "today" && (<>
      {/* ОТЧЁТЫ ДЛЯ ПЛАНЁРОК: итоги недели (баннер по понедельникам) и месяца */}
      <PlanningReports rawStudents={rawStudents} rawPayments={rawPayments} rawGroups={rawGroups}
        rawBranches={rawBranches} rawTeachers={rawTeachers} studentArchive={studentArchive} extras={extras} bdr={bdr} />

      {/* КРАТКИЙ ОТЧЁТ ИИ ПО ИТОГАМ НА СЕГОДНЯ */}
      <AiDailyBrief m={m} bdr={bdr} pendingExpenses={expenseReqs.length} pendingRefunds={refundReqs.length} />

      {/* ЗДОРОВЬЕ СТУДИИ ЗА 30 СЕКУНД */}
      <CollapsibleSection id="daily" icon={ClipboardList} title="Здоровье студии за 30 секунд" hint="Ключевые показатели дня — всё кликабельно"
        locked open={sectionOpen("daily")} onToggle={() => toggleSection("daily")}>
        <StandardsHealthAlert role="owner" teachers={rawTeachers} groups={rawGroups} onOpen={() => setDashTab("standards")} />
        <DailyManagerReport m={m} bdr={bdr} scopeLabel={m.scope.label} periodLabel={m.ranges.cur.label}
          onOpenList={openList} onPayments={openPaymentsToday} onRetention={openRetention} onAvgCheck={openAvgCheck}
          onRevenue={openRevenue} onBdr={openBdr} onOccupancy={openOccupancy} />
      </CollapsibleSection>

      {/* КЛЮЧЕВЫЕ ПРОЦЕНТЫ — кольца прогресса (акцентная карточка с тёплым градиентом) */}
      <div className="accent-card rounded-[2rem] border border-[#C5A059]/25 p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#C5A059] p-2.5 text-black"><LineChart className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Ключевые проценты</p>
            <p className="mt-1 text-sm text-slate-400">Заполненность · удержание · выполнение плана БДР</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <ProgressRing pct={m.occupancy.pct} label="Заполненность" color="#5E8194" />
          <ProgressRing pct={m.retention.pct} label="Удержание" color="#4F8A63" />
          <ProgressRing pct={bdr?.network?.pct ?? null} label="План БДР" color="#947C51" />
        </div>
      </div>

      {/* ТРЕБУЮТ РЕШЕНИЯ: заявки на расходы/возвраты + необработанные пробные */}
      <CollapsibleSection id="decisions" icon={CheckCircle} title="Требуют решения" hint="Заявки филиалов и вчерашние пробные"
        locked open={sectionOpen("decisions")} onToggle={() => toggleSection("decisions")}>
        <ApprovalsPanel expenseReqs={expenseReqs} refundReqs={refundReqs} busyId={reqBusy} onDecide={decideRequest} branchNameOf={branchNameOf} />
        <div className="grid gap-3 sm:grid-cols-2">
          <RiskTile severity={dr.trialYesterdayLost.count > 0 ? "high" : "low"}
            title={`Вчера был на пробном, не купил — ${dr.trialYesterdayLost.count}`} detail="Не обработан управляющим · связаться ›"
            onClick={() => openList({ ids: dr.trialYesterdayLost.ids, label: "Вчера был на пробном, не купил" })} />
          <RiskTile severity={dr.trialYesterdayMissed.count > 0 ? "mid" : "low"}
            title={`Вчера не пришёл на пробный — ${dr.trialYesterdayMissed.count}`} detail="Не обработан · перезаписать ›"
            onClick={() => openList({ ids: dr.trialYesterdayMissed.ids, label: "Вчера не пришёл на пробный" })} />
        </div>
      </CollapsibleSection>
      </>)}

      {dashTab === "standards" && <StaffStandardsView role="owner" teachers={rawTeachers} groups={rawGroups} />}

      {dashTab === "finance" && (<>
      {/* ВЫРУЧКА ПО НАПРАВЛЕНИЯМ */}
      <CollapsibleSection id="streams" icon={Coins} title="Выручка по направлениям" hint="Абонементы · выступления · товары · общая выручка"
        locked open={sectionOpen("streams")} onToggle={() => toggleSection("streams")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StreamCard label="Выручка от абонементов" value={money(subsTotal)} color={STREAM_COLORS.subs}
            momPct={m.revenue.momPct} yoyPct={m.revenue.yoyPct} series={subsSeries} onClick={openRevenue} />
          <StreamCard label="Выручка от выступлений" value={money(perfTotal)} color={STREAM_COLORS.perf}
            momPct={streamRev.perf?.revenue?.momPct ?? null} yoyPct={streamRev.perf?.revenue?.yoyPct ?? null}
            series={perfSeries} onClick={() => go("performances")} />
          <StreamCard label="Выручка от товаров" value={money(prodTotal)} color={STREAM_COLORS.prod}
            momPct={streamRev.prod?.revenue?.momPct ?? null} yoyPct={streamRev.prod?.revenue?.yoyPct ?? null}
            series={prodSeries} onClick={() => go("products")} />
          <StreamCard label="Общая выручка" value={money(subsTotal + perfTotal + prodTotal)} color={STREAM_COLORS.total}
            momPct={null} yoyPct={null} series={totalSeries} onClick={openTotalRevenue}
            footer={<>
              <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">Абонементы</span><span className="text-xs font-bold text-slate-300">{money(subsTotal)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">Выступления</span><span className="text-xs font-bold text-slate-300">{money(perfTotal)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">Товары</span><span className="text-xs font-bold text-slate-300">{money(prodTotal)}</span></div>
            </>} />
        </div>
      </CollapsibleSection>

      {/* ПЛАН БДР ПО ФИЛИАЛАМ */}
      <CollapsibleSection id="bdr" icon={LineChart} title="План БДР по филиалам" hint="План — из «Планирования (БДР)» · факт — оплаты месяца"
        locked open={sectionOpen("bdr")} onToggle={() => toggleSection("bdr")}>
        <BdrProgressPanel bdr={bdr} onGoPlanning={() => go("planning")} />
      </CollapsibleSection>

      {/* Выступления + AI-инсайты по продажам и складу */}
      <CollapsibleSection id="opsbiz" icon={Mic2} title="Выступления и склад" hint="Банкеты, продажи, остатки + AI-выводы"
        locked open={sectionOpen("opsbiz")} onToggle={() => toggleSection("opsbiz")}>
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

      {/* ГРАФИКИ ФИНАНСОВ */}
      <CollapsibleSection id="fincharts" icon={LineChart} title="Графики" hint="Выручка и средний чек по месяцам"
        locked open={sectionOpen("fincharts")} onToggle={() => toggleSection("fincharts")}>
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
      </div>
      </CollapsibleSection>
      </>)}

      {dashTab === "sales" && (<>
      {/* ВОРОНКА ПРОДАЖ: запись → пришёл → купил (без лидов, ТЗ заказчика) */}
      <CollapsibleSection id="funnel" icon={Filter} title="Воронка продаж" hint="Запись → пришёл → купил · конверсии в %"
        locked open={sectionOpen("funnel")} onToggle={() => toggleSection("funnel")}>
      <div className="grid gap-4 xl:grid-cols-3">
        <FunnelDayCard title="Сегодня" data={m.funnel.today} />
        <FunnelDayCard title="Вчера" data={m.funnel.yesterday} />
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">За выбранный период</p>
          <div className="mt-3 space-y-2.5">
            <FunnelStage label="Записались на пробный" n={m.funnel.month.signed} conv={null} onClick={() => openStatusList(["trial"], "Записаны на пробный")} />
            <FunnelStage label="Пришли на пробный" n={m.funnel.month.came} conv={m.funnel.month.convCame} onClick={() => openStatusList(["trial", "active"], "Пришли на пробный")} />
            <FunnelStage label="Купили" n={m.funnel.month.bought} conv={m.funnel.month.convBought} onClick={() => openStatusList(["active"], "Купили абонемент")} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Запись и приход — по отметкам пробных уроков в журнале; «купили» — первая покупка абонемента в периоде. Проценты — конверсия из предыдущего этапа.</p>
        </section>
      </div>
      </CollapsibleSection>

      {/* ПРОДАЖИ ЗА ПЕРИОД */}
      <CollapsibleSection id="saleskpi" icon={BarChart3} title="Продажи за период" hint="Абонементы · покупатели · новые · записи на будущее"
        locked open={sectionOpen("saleskpi")} onToggle={() => toggleSection("saleskpi")}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BigKpi label="Продано абонементов" value={m.sales.soldSubs} onClick={openRevenue}
          rows={[
            { k: "Уникальных покупателей", v: <span className="text-slate-200">{m.sales.uniqueBuyers}</span> },
            { k: "Почему различаются", v: <span className="text-slate-500 text-[11px]">у ученика может быть 2 абонемента</span> }
          ]} />
        <BigKpi label="Уникальных покупателей" value={m.sales.uniqueBuyers} tone="white" onClick={openRevenue}
          rows={[
            { k: "Средний чек", v: <span className="text-slate-200">{m.avgCheck.all === null ? "—" : money(m.avgCheck.all)}</span> },
            { k: "Выручка периода", v: <span className="text-slate-200">{money(m.revenue.total)}</span> }
          ]} />
        <BigKpi label="Новые ученики" value={m.newStudents.hasData ? m.newStudents.period : "—"} tone="gold" onClick={openNewStudents}
          rows={[
            { k: "Сегодня", v: <span className="text-slate-200">{m.newStudents.hasData ? m.newStudents.today : "—"}</span> },
            { k: "За период", v: <span className="text-slate-200">{m.newStudents.hasData ? m.newStudents.period : "нет данных"}</span> }
          ]} />
        <BigKpi label="Записи на будущее" value={m.futureEnrollments.total} onClick={openFuture}
          rows={[
            ...(m.futureEnrollments.byBranch.slice(0, 2).map((b) => ({ k: b.name, v: <span className="text-slate-200">{b.n}</span> }))),
            { k: m.futureEnrollments.isProxy ? "Лиды + пробные (прокси)" : "По возрастам", v: <span className="text-slate-500 text-[11px]">{m.futureEnrollments.byAge.map((a) => `${a.label}:${a.n}`).join(" ") || "—"}</span> }
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
      </>)}

      {dashTab === "retention" && (<>
      {/* УДЕРЖАНИЕ И БАЗА */}
      <CollapsibleSection id="retkpi" icon={TrendingUp} title="Удержание и база" hint="Конверсия из месяца в месяц · отток · должники · заполняемость"
        locked open={sectionOpen("retkpi")} onToggle={() => toggleSection("retkpi")}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BigKpi label="Удержание (мес→мес)" value={m.retention.pct === null ? "—" : `${m.retention.pct}%`} tone="emerald" onClick={openRetention}
          rows={[
            { k: "Активны / всего", v: <span className="text-slate-200">{m.retention.activeStudents} / {m.retention.totalStudents}</span> },
            { k: "К пред. месяцу", v: <DeltaBadge pct={m.retention.momPct} /> },
            { k: "Год к году", v: <DeltaBadge pct={m.retention.yoyPct} /> }
          ]} />
        <BigKpi label="Отток за месяц" value={m.churn.left} tone={m.churn.left > 0 ? "rose" : "emerald"} onClick={() => go("marketing")}
          rows={[
            { k: "Процент оттока", v: <span className="text-slate-200">{m.churn.pct === null ? "—" : `${m.churn.pct}%`}</span> },
            { k: "Кто это", v: <span className="text-slate-500 text-[11px]">ушедшие в архив в этом месяце</span> }
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
        <BigKpi label="Заполняемость" value={m.occupancy.pct === null ? "—" : `${m.occupancy.pct}%`} onClick={openOccupancy}
          rows={[
            { k: "Мест занято", v: <span className="text-slate-200">{m.occupancy.filled} / {m.occupancy.capacity || "—"}</span> },
            ...(m.occupancy.byBranch.slice(0, 2).map((b) => ({ k: b.name, v: <span className="text-slate-300">{b.pct === null ? "—" : b.pct + "%"}</span> })))
          ]} />
      </div>
      </CollapsibleSection>

      {/* ЛОЯЛЬНОСТЬ (LTV): средний срок обучения и разбивка по месяцам */}
      <CollapsibleSection id="ltv" icon={GraduationCap} title="Лояльность (LTV)" hint="Средний срок обучения · сколько учеников занимается 1–2, 3–4… месяцев"
        locked open={sectionOpen("ltv")} onToggle={() => toggleSection("ltv")}>
        <LtvPanel ltv={m.ltv} onOpenBucket={(ids, label) => openStudentsModal(ids, label, { ids, label })} />
      </CollapsibleSection>

      {/* РЕКОМЕНДАЦИИ ПО НАБОРУ: статус набора по группам + куда и сколько набрать */}
      <CollapsibleSection id="recruit" icon={Megaphone} title="Рекомендации по набору" hint="Набор открыт/закрыт по группам · куда и сколько учеников набрать"
        locked open={sectionOpen("recruit")} onToggle={() => toggleSection("recruit")}>
        <EnrollmentPlanner groups={rawGroups || []} branches={rawBranches || []} teachers={rawTeachers || []} branchId={branchId} onGoMarketing={() => go("marketing")} />
      </CollapsibleSection>

      {/* РИСКИ ПО ГРУППАМ И ФИЛИАЛАМ */}
      <CollapsibleSection id="risks" icon={AlertTriangle} title="Риски" hint="Группы и филиалы, требующие внимания"
        locked open={sectionOpen("risks")} onToggle={() => toggleSection("risks")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RiskTile severity={m.riskTables.overloadGroups.length > 0 ? "high" : "low"}
            title={`Перегруженные группы — ${m.riskTables.overloadGroups.length}`} detail="Близко к пределу ›"
            onClick={openOverload} />
          <RiskTile severity={m.riskTables.lowFillGroups.length > 0 ? "mid" : "low"}
            title={`Низкая заполняемость — ${m.riskTables.lowFillGroups.length}`} detail="Меньше 50% мест ›"
            onClick={openLowFill} />
          <RiskTile severity={dr.retentionDropBranches.count > 0 ? "mid" : "low"}
            title={`Филиалы с падением удержания — ${dr.retentionDropBranches.count}`} detail="Удержание ниже нормы ›"
            onClick={() => openList({ ids: dr.retentionDropBranches.studentIds, label: "Филиалы с падением удержания" })} />
          <RiskTile severity={m.riskTables.teacherLowRetention.length > 0 ? "mid" : "low"}
            title={`Педагоги с низким удержанием — ${m.riskTables.teacherLowRetention.length}`} detail="Ниже нормы 70% ›"
            onClick={openTeacherRetention} />
        </div>
      </CollapsibleSection>

      {/* ГРАФИКИ УДЕРЖАНИЯ */}
      <CollapsibleSection id="retcharts" icon={LineChart} title="Графики удержания" hint="Удержание по месяцам · активные абонементы"
        locked open={sectionOpen("retcharts")} onToggle={() => toggleSection("retcharts")}>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Удержание по месяцам" subtitle="накапливается из месячных снапшотов" empty={m.charts.retentionByMonth.every((p) => p.value === null)}>
          <ResponsiveContainer width="100%" height="100%">
            <RLineChart data={m.charts.retentionByMonth} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} width={34} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, "Удержание"]} />
              <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
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
      </div>
      </CollapsibleSection>

      {/* ВЕРНУТЬ УШЕДШИХ (ИИ-реактивация) */}
      <CollapsibleSection id="reactivation" icon={RefreshCw} title="Вернуть ушедших" hint="ИИ-реактивация архива"
        locked open={sectionOpen("reactivation")} onToggle={() => toggleSection("reactivation")}>
        <ReactivationPanel archive={studentArchive} roleHeader="owner" minMonths={2} />
      </CollapsibleSection>
      </>)}

      {dashTab === "ratings" && (<>
      {/* ТРЕБУЮТ ВНИМАНИЯ + ТОЧКИ РОСТА — по категориям (ТЗ 13.07) */}
      <CollapsibleSection id="growth" icon={TrendingUp} title="Точки роста и внимание"
        locked open={sectionOpen("growth")} onToggle={() => toggleSection("growth")}>
      <div className="grid gap-4 xl:grid-cols-2">
        <CategorizedPanel icon={AlertTriangle} tone="rose" title="Требуют внимания" groups={m.attentionGroups} />
        <CategorizedPanel icon={TrendingUp} tone="emerald" title="Точки роста" groups={m.growthGroups} />
      </div>
      </CollapsibleSection>

      {/* 10. РЕЙТИНГИ */}
      <CollapsibleSection id="ratings" icon={Trophy} title="Рейтинги" hint="Топ-5"
        locked open={sectionOpen("ratings")} onToggle={() => toggleSection("ratings")}>
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
        locked open={sectionOpen("aimonth")} onToggle={() => toggleSection("aimonth")}>
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
            `Воронка: запись ${m.funnel.month.signed} → пришли ${m.funnel.month.came} → купили ${m.funnel.month.bought}`,
            `Конверсия в покупку: ${m.funnel.month.convBought === null ? "—" : m.funnel.month.convBought + "%"}`,
            `Продано абонементов: ${m.sales.soldSubs} (${m.sales.uniqueBuyers} покупателей)`
          ]} />
          <AnalysisBlock title="Удержание" lines={[
            `Удержание: ${m.retention.pct === null ? "—" : m.retention.pct + "%"}`,
            `Без активного абонемента: ${m.retention.pct === null ? "—" : (100 - m.retention.pct) + "%"}`,
            `Отток за месяц (ушли): ${m.churn.left}${m.churn.pct !== null ? ` (${m.churn.pct}%)` : ""}`,
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
      </>)}

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
function CollapsibleSection({ id, icon: Icon, title, hint, open, onToggle, children, locked = false }: {
  id: string; icon: React.ElementType; title: string; hint?: string; open: boolean; onToggle: () => void; children: React.ReactNode; locked?: boolean;
}) {
  // locked — нескладной режим: статичная шапка-заголовок без стрелки, контент всегда развёрнут (как на макете дашборда).
  if (locked) {
    return (
      <section className="space-y-3" data-section={id}>
        <div className="mt-1 flex w-full items-center gap-2">
          <Icon className="h-4 w-4 text-[#C5A059]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">{title}</h2>
          {hint && <span className="hidden text-xs text-slate-500 sm:inline">· {hint}</span>}
        </div>
        <div className="space-y-3">{children}</div>
      </section>
    );
  }
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
  // Аудит #42: экспорт любого списка дашборда в CSV (Excel открывает напрямую).
  const exportCsv = () => {
    const cellText = (c: any): string => {
      if (c === null || c === undefined) return "";
      if (typeof c === "string" || typeof c === "number") return String(c);
      if (typeof c === "object" && "props" in c && typeof c.props?.children === "string") return c.props.children;
      return "";
    };
    const esc = (s: string) => /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    const lines = [data.columns.map(esc).join(";"), ...data.rows.map((r) => r.map((c) => esc(cellText(c))).join(";"))];
    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const safeTitle = String(data.title || "список").replace(/[^\wа-яА-ЯёЁ]+/g, "_").slice(0, 40);
    a.download = `${safeTitle}_${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141414] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Градиентная шапка */}
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-white drop-shadow-sm">{data.title}</h3>
            {data.subtitle && <p className="mt-0.5 text-xs font-bold text-white/90">{data.subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {data.rows.length > 0 && (
              <button onClick={exportCsv} title="Скачать список в CSV (Excel)"
                className="flex items-center gap-1.5 rounded-xl bg-black/20 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-black/40">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            )}
            <button onClick={onClose} className="rounded-xl bg-black/20 p-1.5 text-white transition hover:bg-black/40"><X className="h-4 w-4" /></button>
          </div>
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
      <p className={`mt-1.5 text-2xl font-black ${valColor}`}>
        {(typeof value === "string" || typeof value === "number") ? <CountUpText text={String(value)} /> : value}
      </p>
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

// «Набегающее» число: плавно считает от 0 до target при появлении (easeOutCubic).
// format форматирует ТЕКУЩЕЕ значение (деньги/проценты/штуки). Уважает reduce-motion.
function CountUp({ to, format, durationMs = 1500 }: { to: number; format?: (n: number) => string; durationMs?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setVal(to); return; }
    let startTs = 0;
    const tick = (now: number) => {
      if (!startTs) startTs = now;
      const t = Math.min(1, (now - startTs) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(to * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setVal(to);
    };
    raf.current = requestAnimationFrame(tick);
    // Страховка: если rAF затормозит (фоновая вкладка/headless), точное значение
    // всё равно выставится по таймеру — цифра никогда не «застрянет» неверной.
    const guard = window.setTimeout(() => setVal(to), durationMs + 80);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); window.clearTimeout(guard); };
  }, [to, durationMs]);
  return <>{format ? format(val) : String(Math.round(val))}</>;
}

// «Умный» count-up для уже отформатированного значения: находит целое число
// (с пробелами-разделителями) внутри строки, сохраняет префикс/суффикс
// («₸», «%», «/80» и т.п.) и анимирует только число. Дроби и «—» — как есть.
function CountUpText({ text, durationMs = 1500 }: { text: string; durationMs?: number }) {
  const s = String(text);
  const m = s.match(/^(\D*?)(\d[\d\s]*\d|\d)(\s*\D*)$/);
  const hasDecimal = /[.,]\d/.test(s);
  const target = m && !hasDecimal ? parseInt(m[2].replace(/\s/g, ""), 10) : NaN;
  const animate = Boolean(m) && !hasDecimal && Number.isFinite(target);
  const [v, setV] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!animate) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(target); return; }
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      setV(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf.current = requestAnimationFrame(tick); else setV(target);
    };
    raf.current = requestAnimationFrame(tick);
    const guard = window.setTimeout(() => setV(target), durationMs + 80);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); window.clearTimeout(guard); };
  }, [target, animate, durationMs]);
  if (!animate || !m) return <>{s}</>;
  return <>{m[1]}{new Intl.NumberFormat("ru-RU").format(Math.round(v))}{m[3]}</>;
}

// Мини-график (спарклайн) из вертикальных баров — как на макете дашборда.
function Sparkbars({ series, color }: { series: number[]; color: string }) {
  const data = series && series.length ? series : [0];
  const max = Math.max(1, ...data);
  return (
    <div className="mt-3 flex h-9 items-end gap-[3px]">
      {data.map((v, i) => (
        <div key={i} className="spark-bar flex-1 rounded-t-[3px]"
          style={{ height: `${Math.max(6, Math.round((v / max) * 100))}%`, backgroundColor: color, opacity: 0.35 + 0.65 * (v / max), animationDelay: `${i * 45}ms` }} />
      ))}
    </div>
  );
}

// Кольцо прогресса: анимированное SVG-кольцо + число в центре (count-up).
// pct = null → показываем «—». color задаёт цвет дуги.
function ProgressRing({ pct, label, color, size = 92 }: { pct: number | null; label: string; color: string; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const real = pct === null ? 0 : Math.max(0, pct);           // реальное число (может быть >100)
  const arcTarget = Math.min(100, real);                       // дуга упирается в 100%
  const [frac, setFrac] = useState(0);                         // прогресс анимации 0→1
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setFrac(1); return; }
    let start = 0; let raf = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / 1500);
      setFrac(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick); else setFrac(1);
    };
    raf = requestAnimationFrame(tick);
    const guard = window.setTimeout(() => setFrac(1), 1600);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(guard); };
  }, [real]);
  const arc = arcTarget * frac;      // заполнение дуги (0..100)
  const centerNum = real * frac;     // число в центре (реальное, до 106% и т.п.)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-black/10" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - (arc / 100) * circ} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-black" style={{ color }}>
          {pct === null ? "—" : `${Math.round(centerNum)}%`}
        </div>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

// Карточка направления выручки с цветной цифрой, двумя дельтами и мини-графиком.
// Повторяет блок «Основные показатели» из макета (абонементы/выступления/товары/общая).
function StreamCard({ label, value, momPct, yoyPct, series, color, onClick, footer }: {
  label: string; value: React.ReactNode; momPct: number | null; yoyPct: number | null;
  series: number[]; color: string; onClick?: () => void; footer?: React.ReactNode;
}) {
  return (
    <section onClick={onClick} className={`rounded-[1.75rem] border border-white/10 bg-[#141414] p-4 transition hover:border-[#C5A059]/40 ${onClick ? "cursor-pointer" : ""}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-black" style={{ color }}>
        {(typeof value === "string" || typeof value === "number") ? <CountUpText text={String(value)} /> : value}
      </p>
      {(momPct !== null || yoyPct !== null) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {momPct !== null && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">к пред. периоду <DeltaBadge pct={momPct} /></span>}
          {yoyPct !== null && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">к прошлому году <DeltaBadge pct={yoyPct} /></span>}
        </div>
      )}
      {footer && <div className="mt-2 space-y-1 border-t border-white/5 pt-2">{footer}</div>}
      <Sparkbars series={series} color={color} />
    </section>
  );
}

function RiskTile({ severity, title, detail, onClick }: { key?: React.Key; severity: "high" | "mid" | "info" | "low"; title: string; detail: string; onClick?: () => void }) {
  const styles = severity === "high" ? "border-rose-500/30 bg-rose-500/10" : severity === "mid" ? "border-amber-400/30 bg-amber-400/10" : severity === "info" ? "border-sky-500/30 bg-sky-500/10" : "border-white/10 bg-white/[0.03]";
  const dot = severity === "high" ? "bg-rose-500" : severity === "mid" ? "bg-amber-400" : severity === "info" ? "bg-sky-500" : "bg-slate-500";
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

// ---------- «Здоровье студии за 30 секунд» ----------
// 8 главных показателей дня (ТЗ заказчика): клик по выручке открывает СПИСОК
// ОПЛАТ; ученики и абонементы — два разных показателя; вместо «истекают через
// N дней» — неоплаты текущего/прошлого месяца; добавлены удержание, средний
// чек и % выполнения плана БДР.
// KPI-карточка «Здоровья студии» по образцу заказчика: заголовок с иконкой,
// крупная цифра слева, справа сравнение «мес. назад / год назад» (или доп. текст).
function HealthKpi({ icon: Icon, label, value, valueTone = "white", momPct, yoyPct, extra, onClick }: {
  icon: React.ElementType; label: string; value: React.ReactNode;
  valueTone?: "gold" | "white" | "rose" | "emerald" | "amber";
  momPct?: number | null; yoyPct?: number | null; extra?: React.ReactNode; onClick?: () => void;
}) {
  const valColor = { gold: "text-[#C5A059]", white: "text-white", rose: "text-rose-400", emerald: "text-emerald-400", amber: "text-amber-400" }[valueTone];
  const hasCompare = momPct !== undefined || yoyPct !== undefined;
  return (
    <section onClick={onClick}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition ${onClick ? "cursor-pointer hover:border-[#C5A059]/45 hover:bg-white/[0.06]" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-[#C5A059]" />
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`text-2xl font-black leading-none ${valColor}`}>{(typeof value === "string" || typeof value === "number") ? <CountUpText text={String(value)} /> : value}</p>
        {(hasCompare || extra) && (
          <div className="shrink-0 space-y-0.5 text-right">
            {momPct !== undefined && (
              <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500">мес. назад <DeltaBadge pct={momPct ?? null} /></div>
            )}
            {yoyPct !== undefined && (
              <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500">год назад <DeltaBadge pct={yoyPct ?? null} /></div>
            )}
            {extra}
          </div>
        )}
      </div>
    </section>
  );
}

function DailyManagerReport({ m, bdr, scopeLabel, periodLabel, onOpenList, onPayments, onRetention, onAvgCheck, onRevenue, onBdr, onOccupancy }: {
  m: any;
  bdr: BdrData | null;
  scopeLabel: string;
  periodLabel: string;
  onOpenList: (preset: RegistryPreset) => void;
  onPayments: () => void;
  onRetention: () => void;
  onAvgCheck: () => void;
  onRevenue: () => void;
  onBdr: () => void;
  onOccupancy: () => void;
}) {
  const report = m.dailyReport as DailyReport;
  const bdrPct = bdr?.network?.pct ?? null;
  const openActive = () => onOpenList({ segment: "active", label: "Ученики с активным абонементом" });
  const intFmt = (n: number) => String(Math.round(n));

  // Компактные плитки-действия (клик открывает список/окно).
  // num/format → значение «набегает» от 0 при появлении вкладки.
  const actions: { label: string; value: React.ReactNode; tone: string; hint?: string; onClick: () => void; num?: number; format?: (n: number) => string }[] = [
    { label: "Выручка сегодня", value: money(report.revenueToday), num: report.revenueToday, format: money, tone: "gold", hint: `${report.paymentsToday} ${report.paymentsToday === 1 ? "оплата" : report.paymentsToday >= 2 && report.paymentsToday <= 4 ? "оплаты" : "оплат"} — список`, onClick: onPayments },
    { label: "Записи на пробный", value: report.upcomingTrials.count, num: report.upcomingTrials.count, format: intFmt, tone: report.upcomingTrials.count > 0 ? "gold" : "white", hint: "на будущие даты", onClick: () => onOpenList({ ids: report.upcomingTrials.ids, label: "Записаны на пробный (будущие даты)" }) },
    { label: "Не оплачен текущий месяц", value: report.unpaidCurrentMonth.count, num: report.unpaidCurrentMonth.count, format: intFmt, tone: report.unpaidCurrentMonth.count > 0 ? "rose" : "emerald", hint: "открыть список", onClick: () => onOpenList({ ids: report.unpaidCurrentMonth.ids, label: "Не оплатили текущий месяц" }) },
    { label: "Не оплатили прошлый месяц", value: report.unpaidPrevMonth.count, num: report.unpaidPrevMonth.count, format: intFmt, tone: report.unpaidPrevMonth.count > 0 ? "amber" : "emerald", hint: "открыть список", onClick: () => onOpenList({ ids: report.unpaidPrevMonth.ids, label: "Не оплатили прошлый месяц" }) },
  ];
  const toneCls: Record<string, string> = { gold: "text-[#C5A059]", white: "text-white", rose: "text-rose-400", emerald: "text-emerald-400", amber: "text-amber-400" };

  return (
    <section className="rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#1B160B] via-[#121212] to-black p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#C5A059] p-2.5 text-black"><ClipboardList className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Здоровье студии за 30 секунд</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{report.summary}</p>
          <p className="mt-1 text-[11px] text-slate-500">{scopeLabel} · {periodLabel}</p>
        </div>
      </div>

      {/* Ключевые KPI со сравнением мес/год назад (формат образца) */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <HealthKpi icon={Wallet} label="Выручка за период" value={money(m.revenue.total)} valueTone="gold" momPct={m.revenue.momPct} yoyPct={m.revenue.yoyPct} onClick={onRevenue} />
        <HealthKpi icon={Users} label="Уникальных учеников" value={m.uniqueStudents.count} valueTone="white" momPct={m.uniqueStudents.momPct} yoyPct={m.uniqueStudents.yoyPct} onClick={openActive} />
        <HealthKpi icon={Ticket} label="Активных абонементов" value={m.activeSubs.count} valueTone="white" momPct={m.activeSubs.momPct} yoyPct={m.activeSubs.yoyPct} onClick={openActive} />
        <HealthKpi icon={CreditCard} label="Средний чек" value={m.avgCheck.all === null ? "—" : money(m.avgCheck.all)} valueTone="gold" momPct={m.avgCheck.momPct} yoyPct={m.avgCheck.yoyPct} onClick={onAvgCheck} />
        <HealthKpi icon={TrendingUp} label="Удержание (мес→мес)" value={m.retention.pct === null ? "—" : `${m.retention.pct}%`} valueTone="emerald" momPct={m.retention.momPct} yoyPct={m.retention.yoyPct} onClick={onRetention} />
        <HealthKpi icon={LineChart} label="План БДР" value={bdrPct === null ? "—" : `${bdrPct}%`} valueTone={bdrPct === null ? "white" : bdrPct >= 100 ? "emerald" : bdrPct >= 70 ? "amber" : "rose"} onClick={onBdr}
          extra={<p className="text-[11px] text-slate-500">{bdr?.network?.plan ? `${money(bdr.network.fact)} из ${money(bdr.network.plan)}` : "план не задан"}</p>} />
        <HealthKpi icon={BarChart3} label="Заполненность" value={m.occupancy.pct === null ? "—" : `${m.occupancy.pct}%`} valueTone="white" onClick={onOccupancy}
          extra={<p className="text-[11px] text-slate-500">{m.occupancy.capacity ? `${m.occupancy.filled} / ${m.occupancy.capacity} мест` : "мест не задано"}</p>} />
        <HealthKpi icon={UserRound} label="Свободных мест" value={m.occupancy.freeSpots === null ? "—" : `${m.occupancy.freeSpots} шт.`} valueTone={m.occupancy.freeSpots && m.occupancy.freeSpots > 0 ? "emerald" : "white"} onClick={onOccupancy}
          extra={<p className="text-[11px] text-slate-500">{m.occupancy.capacity ? "по всем группам" : "укажите вместимость"}</p>} />
        <HealthKpi icon={Wallet} label="Ожид. чистая прибыль"
          value={bdr?.network?.expectedProfit == null ? "—" : (bdr.network.expectedProfit >= 0 ? money(bdr.network.expectedProfit) : `−${money(Math.abs(bdr.network.expectedProfit))}`)}
          valueTone={bdr?.network?.expectedProfit == null ? "white" : bdr.network.expectedProfit >= 0 ? "emerald" : "rose"} onClick={onBdr}
          extra={<p className="text-[11px] text-slate-500">{bdr?.network?.plannedExpense != null ? "прогноз выручки − план расходов" : "нужен план расходов в БДР"}</p>} />
      </div>

      {/* Быстрые действия дня */}
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {actions.map((s) => (
          <button key={s.label} onClick={s.onClick}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition hover:border-[#C5A059]/45 hover:bg-white/[0.06]">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1.5 text-xl font-black ${toneCls[s.tone] || "text-white"}`}>
              {s.num !== undefined ? <CountUp to={s.num} format={s.format} /> : s.value}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-500 group-hover:text-[#C5A059]">
              {s.hint || "Открыть список"} <ArrowRight className="h-3 w-3" />
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- Краткий отчёт ИИ по итогам на сегодня ----------
// БДР и прогноз по темпу, сравнение с тем же днём прошлого месяца, отток и
// удержание, заполненность и сколько записей на пробный нужно для заполнения.
// ---------- Отчёты для планёрок (ТЗ 14.07) ----------
// Итоги недели (баннер-напоминание по понедельникам) и итоги месяца по клику.
// ИИ собирает деловой отчёт под совещание из того же движка, что дашборд.
function PlanningReports({ rawStudents, rawPayments, rawGroups, rawBranches, rawTeachers, studentArchive, extras, bdr }: any) {
  const [busy, setBusy] = useState<null | "week" | "month">(null);
  const [report, setReport] = useState<{ kind: "week" | "month"; data: any } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Область отчёта (ТЗ 14.07): управляющий / филиал / группа / педагог.
  // «Управляющий» под капотом = его филиал (значение селектора — branchId).
  const [scopeBranch, setScopeBranch] = useState("");   // выбран через «Филиал» или «Управляющий»
  const [scopeGroup, setScopeGroup] = useState("");
  const [scopeTeacher, setScopeTeacher] = useState("");
  const branchesList: Branch[] = rawBranches || [];
  const managers = branchesList.filter((b) => (b.managerName || "").trim()).map((b) => ({ value: b.id, label: `${b.managerName} · ${b.name || b.city}` }));
  const groupOpts = (rawGroups || []).filter((g: Group) => !scopeBranch || g.branchId === scopeBranch).map((g: Group) => ({ value: g.id, label: g.name }));
  const scopeLabelOf = () => {
    if (scopeTeacher) return "Педагог: " + ((rawTeachers || []).find((t: Teacher) => t.id === scopeTeacher)?.name || "—");
    if (scopeGroup) return "Группа: " + ((rawGroups || []).find((g: Group) => g.id === scopeGroup)?.name || "—");
    if (scopeBranch) { const b = branchesList.find((x) => x.id === scopeBranch); return "Филиал: " + (b?.name || b?.city || "—") + (b?.managerName ? ` (управляющий ${b.managerName})` : ""); }
    return "Вся сеть";
  };
  const hasScope = Boolean(scopeBranch || scopeGroup || scopeTeacher);

  const now = new Date();
  const isMonday = now.getDay() === 1;
  // Метка «на этой неделе итоги уже открывали» — чтобы баннер не мозолил.
  const weekKey = (() => { const d = new Date(now); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return `echogor:weekly-report:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })();
  const [weekDone, setWeekDone] = useState<boolean>(() => { try { return !!localStorage.getItem(weekKey); } catch { return false; } });

  const localMonth = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();

  const collect = (mm: any) => ({
    период: mm.ranges.cur.label,
    выручка: mm.revenue.total, выручка_к_пред_периоду_pct: mm.revenue.momPct, выручка_год_назад_pct: mm.revenue.yoyPct,
    средний_чек: mm.avgCheck.all, средний_чек_к_пред_pct: mm.avgCheck.momPct,
    уникальных_учеников: mm.uniqueStudents.count, уникальных_к_пред_pct: mm.uniqueStudents.momPct,
    активных_абонементов: mm.activeSubs.count,
    удержание_pct: mm.retention.pct, удержание_к_пред_pct: mm.retention.momPct,
    отток_ушло: mm.churn.left, отток_pct: mm.churn.pct,
    новых_учеников: mm.newStudents.period,
    воронка: mm.funnel.month,
    продано_абонементов: mm.sales.soldSubs, уникальных_покупателей: mm.sales.uniqueBuyers,
    заполненность_pct: mm.occupancy.pct, свободных_мест: mm.occupancy.freeSpots,
    должники: mm.debtors.total,
    БДР: bdr?.network ? { план: bdr.network.plan, факт: bdr.network.fact, процент: bdr.network.pct, ожидаемая_прибыль: bdr.network.expectedProfit, план_прибыли: bdr.network.plannedProfit } : null,
    БДР_по_филиалам: (bdr?.byBranch || []).map((b: any) => ({ филиал: b.name, план: b.plan, факт: b.fact, процент: b.pct, ожидаемая_прибыль: b.expectedProfit })),
    топ_филиал: mm.ratings?.branches?.byRevenue?.[0]?.name,
    топ_педагог_удержание: mm.ratings?.teachers?.byRetention?.[0]?.name,
    требуют_внимания: mm.attentionGroups,
    точки_роста: mm.growthGroups,
  });

  const gen = async (kind: "week" | "month") => {
    setBusy(kind); setErr(null); setReport(null);
    try {
      const base: any = kind === "week" ? { period: "week" } : { period: "monthpick", customStart: localMonth };
      const filters: any = { ...base, branchId: scopeBranch || undefined, groupId: scopeGroup || undefined, teacherId: scopeTeacher || undefined };
      const mm = computeOwnerDashboard(
        { students: rawStudents || [], payments: rawPayments || [], groups: rawGroups || [], branches: rawBranches || [], teachers: rawTeachers || [], archive: studentArchive || [] },
        filters, new Date(), extras
      );
      const metrics: any = collect(mm);
      metrics.область = scopeLabelOf();
      // БДР под выбранную область: филиал — его план; группа/педагог — БДР не применим.
      if (scopeBranch) {
        const br = (bdr?.byBranch || []).find((b: any) => b.branchId === scopeBranch);
        metrics.БДР = br ? { план: br.plan, факт: br.fact, процент: br.pct, ожидаемая_прибыль: br.expectedProfit, план_прибыли: br.plannedProfit } : null;
        metrics.БДР_по_филиалам = br ? [{ филиал: br.name, план: br.plan, факт: br.fact, процент: br.pct }] : [];
      } else if (scopeGroup || scopeTeacher) {
        metrics.БДР = null; metrics.БДР_по_филиалам = [];
      }
      const res = await fetch("/api/gemini/period-report", {
        method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: JSON.stringify({ kind, metrics, scopeLabel: scopeLabelOf() }),
      });
      if (res.status === 503) { setErr("ИИ недоступен: на сервере не настроен ключ Gemini."); return; }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Ошибка генерации");
      setReport({ kind, data: await res.json() });
      if (kind === "week") { try { localStorage.setItem(weekKey, "1"); } catch { /* no-op */ } setWeekDone(true); }
    } catch (e: any) { setErr(e?.message || "Не удалось сформировать отчёт"); }
    finally { setBusy(null); }
  };

  return (
    <>
      {/* Баннер-напоминание по понедельникам */}
      {isMonday && !weekDone && (
        <button onClick={() => gen("week")} disabled={busy !== null}
          className="flex w-full items-center gap-3 rounded-[2rem] border border-[#C5A059]/40 bg-gradient-to-r from-[#C5A059]/15 to-transparent p-4 text-left transition hover:brightness-110 disabled:opacity-60">
          <div className="rounded-2xl bg-[#C5A059] p-2.5 text-black"><CalendarClock className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Понедельник — время недельной планёрки</p>
            <p className="mt-0.5 text-xs text-slate-400">Нажмите, чтобы ИИ собрал итоги прошедшей недели и задачи на текущую.</p>
          </div>
          <span className="shrink-0 rounded-xl bg-[#C5A059] px-3 py-2 text-xs font-black text-black">{busy === "week" ? "Готовлю…" : "Итоги недели ›"}</span>
        </button>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Отчёты для планёрок</p>
            <p className="mt-1 text-xs text-slate-500">ИИ соберёт готовый отчёт под совещание — по всей сети или по выбранной области. Можно скопировать в планёрку.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => gen("week")} disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:border-[#C5A059]/40 hover:text-white disabled:opacity-50">
              <CalendarClock className="h-3.5 w-3.5" /> {busy === "week" ? "Готовлю…" : "Итоги недели"}
            </button>
            <button onClick={() => gen("month")} disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C5A059] px-3.5 py-2 text-xs font-black text-black transition hover:brightness-110 disabled:opacity-50">
              <FileText className="h-3.5 w-3.5" /> {busy === "month" ? "Готовлю…" : "Итоги месяца"}
            </button>
          </div>
        </div>
        {/* Фильтры области: управляющий / филиал / группа / педагог */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterSelect value={managers.some((mn) => mn.value === scopeBranch) ? scopeBranch : ""} onChange={(v) => { setScopeBranch(v); setScopeGroup(""); }}
            placeholder="Управляющий" options={managers} />
          <FilterSelect value={scopeBranch} onChange={(v) => { setScopeBranch(v); if (v && scopeGroup && !(rawGroups || []).some((g: Group) => g.id === scopeGroup && g.branchId === v)) setScopeGroup(""); }}
            placeholder="Все филиалы" options={branchesList.map((b) => ({ value: b.id, label: b.name || b.city }))} />
          <FilterSelect value={scopeGroup} onChange={setScopeGroup} placeholder="Все группы" options={groupOpts} />
          <FilterSelect value={scopeTeacher} onChange={setScopeTeacher} placeholder="Все педагоги" options={(rawTeachers || []).map((t: Teacher) => ({ value: t.id, label: t.name }))} />
          {hasScope && (
            <button onClick={() => { setScopeBranch(""); setScopeGroup(""); setScopeTeacher(""); }}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-slate-400 transition hover:text-white">
              <X className="h-3 w-3" /> Сбросить
            </button>
          )}
          <span className="text-[11px] text-slate-500">Отчёт: <span className="font-bold text-slate-300">{scopeLabelOf()}</span></span>
        </div>
        {err && <p className="mt-3 text-xs text-rose-300">{err}</p>}
      </section>

      {report && <PlanningReportModal kind={report.kind} data={report.data} onClose={() => setReport(null)} />}
    </>
  );
}

function PlanningReportModal({ kind, data, onClose }: { kind: "week" | "month"; data: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const focus = Array.isArray(data?.focus) ? data.focus : [];
  const fullText = [
    data?.title || (kind === "week" ? "Итоги недели" : "Итоги месяца"),
    data?.tldr ? `\n${data.tldr}` : "",
    ...sections.map((s: any) => `\n${s.title}\n` + (s.points || []).map((p: string) => `— ${p}`).join("\n")),
    focus.length ? `\nЗадачи-приоритеты:\n` + focus.map((f: string) => `• ${f}`).join("\n") : "",
  ].filter(Boolean).join("\n");
  const copy = async () => { try { await navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no-op */ } };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-6 w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-[#141414]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-[#C5A059] to-[#d4b06a] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/70">{kind === "week" ? "Недельная планёрка" : "Месячная планёрка"}</p>
            <h3 className="mt-0.5 text-lg font-black text-black">{data?.title || (kind === "week" ? "Итоги недели" : "Итоги месяца")}</h3>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={copy} className="rounded-xl bg-black/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-black transition hover:bg-black/30">{copied ? "Скопировано ✓" : "Копировать"}</button>
            <button onClick={onClose} className="rounded-xl bg-black/20 p-1.5 text-black transition hover:bg-black/30"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          {data?.tldr && <p className="rounded-2xl border border-[#C5A059]/20 bg-[#C5A059]/[0.06] p-3.5 text-sm leading-relaxed text-slate-100">{data.tldr}</p>}
          <div className="mt-4 space-y-4">
            {sections.map((s: any, i: number) => (
              <div key={i}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C5A059]">{s.title}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {(s.points || []).map((p: string, j: number) => <li key={j} className="flex gap-2 text-sm text-slate-200"><span className="text-[#C5A059]">•</span><span>{p}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
          {focus.length > 0 && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Задачи-приоритеты{kind === "week" ? " на неделю" : " на месяц"}</p>
              <ul className="mt-1.5 space-y-1.5">
                {focus.map((f: string, i: number) => <li key={i} className="flex gap-2 text-sm text-slate-100"><span className="text-emerald-400">✓</span><span>{f}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AiDailyBrief({ m, bdr, pendingExpenses, pendingRefunds }: {
  m: any;
  bdr: BdrData | null;
  pendingExpenses: number;
  pendingRefunds: number;
}) {
  const now = new Date();
  const dayN = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lines: { tone: "good" | "warn" | "info"; text: string }[] = [];

  const nw = bdr?.network;
  if (nw && nw.plan) {
    const forecastPct = Math.round(((nw.fact / Math.max(1, dayN)) * daysInMonth / nw.plan) * 100);
    const paceOk = (nw.pct || 0) >= Math.round((dayN / daysInMonth) * 100);
    lines.push({ tone: paceOk ? "good" : "warn", text: `План БДР выполнен на ${nw.pct}% (${money(nw.fact)} из ${money(nw.plan)}). Прогноз к концу месяца по текущему темпу — ~${forecastPct}%.` });
  } else {
    lines.push({ tone: "info", text: "План БДР на этот месяц не задан — заполните «Планирование (БДР)», и здесь появятся % выполнения и прогноз." });
  }

  if (m.mtd.pct !== null) {
    lines.push({ tone: m.mtd.pct >= 0 ? "good" : "warn", text: `Выручка с начала месяца — ${money(m.mtd.cur)}: на ${Math.abs(m.mtd.pct)}% ${m.mtd.pct >= 0 ? "выше" : "ниже"}, чем к этому же дню прошлого месяца (${money(m.mtd.prev)}).` });
  } else {
    lines.push({ tone: "info", text: `Выручка с начала месяца — ${money(m.mtd.cur)} (данных прошлого месяца для сравнения пока нет).` });
  }

  lines.push({
    tone: m.churn.left > 0 ? "warn" : "good",
    text: `Удержание ${m.retention.pct === null ? "—" : m.retention.pct + "%"} · отток за месяц: ${m.churn.left} ${m.churn.left === 1 ? "ушедший" : "ушедших"}${m.churn.pct !== null && m.churn.left > 0 ? ` (${m.churn.pct}% базы)` : ""}.`,
  });

  if (m.occupancy.pct !== null) {
    const t = m.trialsToFill;
    lines.push({
      tone: m.occupancy.pct >= 85 ? "good" : "info",
      text: `Общая заполненность ${m.occupancy.pct}% (${m.occupancy.filled} из ${m.occupancy.capacity} мест).${t.needed ? ` Чтобы заполнить группы, нужно ещё ~${t.needed} записей на пробный (конверсия запись→покупка ${t.convPct}%).` : t.needed === 0 ? " Свободных мест нет — группы заполнены." : ""}`,
    });
  }

  const pending = pendingExpenses + pendingRefunds;
  if (pending > 0) {
    lines.push({ tone: "warn", text: `Ждут вашего решения: ${pendingExpenses} заяв. на расходы и ${pendingRefunds} на возврат — блок «Требуют решения» ниже.` });
  }

  return (
    <section className="rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#19160f] via-[#121212] to-black p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#C5A059] p-2.5 text-black"><Sparkles className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Краткий отчёт ИИ · итоги на сегодня</p>
          <ul className="mt-2 space-y-1.5">
            {lines.map((l, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className={l.tone === "warn" ? "text-rose-400" : l.tone === "good" ? "text-emerald-400" : "text-[#C5A059]"}>•</span>
                <span className="text-slate-100">{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------- «Требуют решения»: заявки на расходы и возвраты ----------
// Владелец одобряет/отклоняет прямо с дашборда; одобрение создаёт операцию в Бухгалтерии.
function ApprovalsPanel({ expenseReqs, refundReqs, busyId, onDecide, branchNameOf }: {
  expenseReqs: any[];
  refundReqs: any[];
  busyId: string | null;
  onDecide: (kind: "expense" | "refund", id: string, action: "approve" | "reject") => void;
  branchNameOf: (id?: string) => string;
}) {
  const total = expenseReqs.length + refundReqs.length;
  const renderCard = (kind: "expense" | "refund", r: any) => (
    <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#161616] p-3.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-bold text-white">
          {money(r.amount)}
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${kind === "refund" ? "bg-rose-500/15 text-rose-300" : "bg-sky-500/15 text-sky-300"}`}>
            {kind === "refund" ? "Возврат" : "Расход"}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {branchNameOf(r.branchId)} · {r.requestedByName || "—"}
          {kind === "refund" && r.studentName ? ` · ученик: ${r.studentName}` : ""}
        </p>
        {(r.description || r.reason) && <p className="mt-0.5 text-xs text-slate-500">{r.description || r.reason}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button disabled={busyId === r.id} onClick={() => onDecide(kind, r.id, "approve")}
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50">
          <CheckCircle className="h-3.5 w-3.5" /> Одобрить
        </button>
        <button disabled={busyId === r.id} onClick={() => onDecide(kind, r.id, "reject")}
          className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50">
          <X className="h-3.5 w-3.5" /> Отклонить
        </button>
      </div>
    </div>
  );
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Заявки на расходы и возвраты</p>
        <span className={`text-xs font-bold ${total ? "text-amber-400" : "text-slate-500"}`}>{total ? `${total} ждут решения` : "всё обработано"}</span>
      </div>
      {total === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Новых заявок нет. Управляющие создают заявки в своих кабинетах — они появятся здесь для одобрения.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {refundReqs.map((r) => renderCard("refund", r))}
          {expenseReqs.map((r) => renderCard("expense", r))}
        </div>
      )}
    </section>
  );
}

// ---------- План БДР по филиалам: план / факт / % с прогресс-барами ----------
function BdrProgressPanel({ bdr, onGoPlanning }: {
  bdr: BdrData | null;
  onGoPlanning: () => void;
}) {
  const rows = bdr?.byBranch || [];
  const nw = bdr?.network;
  // Ожидаемая чистая прибыль = прогноз выручки к концу месяца − плановые расходы.
  const profitColor = (v: number | null | undefined) => v == null ? "text-slate-500" : v >= 0 ? "text-emerald-400" : "text-rose-400";
  const profitVal = (v: number | null | undefined) => v == null ? "—" : (v >= 0 ? money(v) : `−${money(Math.abs(v))}`);
  const hasProfit = nw && (nw.expectedProfit != null || nw.plannedProfit != null || rows.some((r) => r.expectedProfit != null));
  const barColor = (pct: number | null) => pct === null ? "bg-white/10" : pct >= 100 ? "bg-emerald-400" : pct >= 70 ? "bg-amber-400" : "bg-rose-400";
  const pctColor = (pct: number | null) => pct === null ? "text-slate-500" : pct >= 100 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-rose-400";
  const bar = (pct: number | null) => (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${Math.min(100, pct || 0)}%` }} />
    </div>
  );
  const noPlan = !nw?.plan && rows.every((r) => r.plan === null);
  if (noPlan) {
    return (
      <section className="rounded-[2rem] border border-dashed border-white/15 bg-[#121212] p-6 text-center">
        <p className="text-sm text-slate-400">План БДР на текущий месяц не задан — выполнение плана считать не из чего.</p>
        <button onClick={onGoPlanning}
          className="mt-3 rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black transition hover:brightness-110">
          Заполнить в «Планировании (БДР)» ›
        </button>
      </section>
    );
  }
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      {nw?.plan ? (
        <div className="mb-4 rounded-2xl border border-[#C5A059]/20 bg-[#C5A059]/5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-white">Вся сеть</p>
            <p className={`shrink-0 text-sm font-black ${pctColor(nw.pct)}`}>{nw.pct}% · {money(nw.fact)} из {money(nw.plan)}</p>
          </div>
          <div className="mt-2">{bar(nw.pct)}</div>
        </div>
      ) : null}
      <div className="space-y-3">
        {rows.map((b) => (
          <div key={b.branchId}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-slate-200">{b.name}</p>
              <p className={`shrink-0 text-xs font-bold ${pctColor(b.pct)}`}>
                {b.plan === null ? "план не задан" : `${b.pct}% · ${money(b.fact)} из ${money(b.plan)}`}
              </p>
            </div>
            <div className="mt-1.5">{bar(b.pct)}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-slate-500">План — из вкладки «Планирование (БДР)» (в т.ч. планы по филиалам). Факт — оплаченные платежи текущего месяца.</p>

      {/* Ожидаемая чистая прибыль: прогноз выручки к концу месяца − плановые расходы */}
      {hasProfit && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Ожидаемая чистая прибыль</p>
          <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3.5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Вся сеть</p>
                <p className="mt-0.5 text-[11px] text-slate-500">прогноз выручки {money(nw!.forecastRevenue ?? nw!.fact)} − план расходов {nw!.plannedExpense != null ? money(nw!.plannedExpense) : "не задан"}</p>
              </div>
              <p className={`shrink-0 text-2xl font-black ${profitColor(nw!.expectedProfit)}`}>{profitVal(nw!.expectedProfit)}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>план прибыли: <span className={profitColor(nw!.plannedProfit)}>{profitVal(nw!.plannedProfit)}</span></span>
              <span>факт на сегодня: <span className={profitColor(nw!.factProfit)}>{profitVal(nw!.factProfit)}</span></span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {rows.map((b) => (
              <div key={b.branchId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-200">{b.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    прогноз {money(b.forecastRevenue ?? b.fact)} − расходы {b.plannedExpense != null ? money(b.plannedExpense) : "план не задан"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-base font-black ${profitColor(b.expectedProfit)}`}>{profitVal(b.expectedProfit)}</p>
                  <p className="text-[10px] text-slate-500">факт {profitVal(b.factProfit)}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Ожидаемая прибыль = прогноз выручки к концу месяца (по текущему темпу) − плановые расходы из БДР. «Факт на сегодня» = поступления − фактические расходы Бухгалтерии.</p>
        </div>
      )}
    </section>
  );
}

// ---------- Рекомендации по набору ----------
// Статус набора хранится на группе (enrollment_open, миграция 044): владелец
// переключает прямо здесь, управляющие видят тот же флаг. Система считает,
// куда и сколько учеников можно набрать (только группы с ОТКРЫТЫМ набором),
// и ведёт в «Маркетинг» — собирать заявки рассылкой или рекламным оффером.
function EnrollmentPlanner({ groups, branches, teachers, branchId, onGoMarketing }: {
  groups: Group[]; branches: Branch[]; teachers: Teacher[]; branchId?: string; onGoMarketing: () => void;
}) {
  // Групп в сети 60+ — список показываем ТОЛЬКО по выбранному филиалу.
  // Свой селектор внутри блока; фильтр филиала с дашборда подхватывается.
  const [selBranch, setSelBranch] = useState<string>(branchId || (branches.length === 1 ? branches[0].id : ""));
  useEffect(() => { if (branchId) setSelBranch(branchId); }, [branchId]);
  // Оптимистичное переключение: локальный override до перезагрузки bootstrap.
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const isOpen = (g: Group) => override[g.id] ?? (g.enrollmentOpen !== false);
  const toggle = async (g: Group) => {
    const next = !isOpen(g);
    setBusyId(g.id);
    setOverride((o) => ({ ...o, [g.id]: next }));
    try {
      const res = await fetch(`/api/mvp/groups/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: JSON.stringify({ enrollmentOpen: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      requestDataRefresh();
    } catch {
      setOverride((o) => ({ ...o, [g.id]: !next })); // откат
    } finally { setBusyId(null); }
  };
  const branchNameOf = (id?: string) => { const b = branches.find((x) => x.id === id); return b?.name || b?.city || "—"; };
  const teacherNameOf = (id?: string) => teachers.find((t) => t.id === id)?.name || "—";

  const allRows = groups
    .filter((g) => (g as any).status !== "archived")
    .map((g) => {
      const cap = g.capacity || 0;
      const free = cap > 0 ? Math.max(0, cap - (g.studentCount || 0)) : null;
      return { g, cap, free, open: isOpen(g) };
    });
  // Сводка по сети — из всех групп; список — только выбранного филиала.
  const netOpen = allRows.filter((r) => r.open);
  const netCanRecruit = netOpen.reduce((s, r) => s + (r.free ?? 0), 0);
  const rows = allRows
    .filter((r) => !selBranch || r.g.branchId === selBranch)
    .sort((a, b) => (b.free ?? -1) - (a.free ?? -1));
  const openRows = rows.filter((r) => r.open);
  const closedCount = rows.length - openRows.length;
  const canRecruit = openRows.reduce((s, r) => s + (r.free ?? 0), 0);
  const noCapacityCount = rows.filter((r) => r.cap === 0).length;
  const recruitTargets = openRows.filter((r) => (r.free ?? 0) > 0);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      {/* Сводка-рекомендация */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Куда набирать</p>
          {selBranch ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
              {recruitTargets.length > 0
                ? <>Набор открыт в {openRows.length} из {rows.length} групп филиала — можно набрать ещё <span className="font-black text-[#C5A059]">{canRecruit}</span> учеников. Приоритет: {recruitTargets.slice(0, 3).map((r) => `«${r.g.name}» (${r.free} мест)`).join(", ")}.</>
                : openRows.length === 0
                  ? "Набор закрыт во всех группах филиала — рекомендации появятся, когда откроете набор."
                  : "Свободных мест в группах с открытым набором нет — можно открыть параллельные группы или расширить вместимость."}
              {closedCount > 0 && ` Закрыт набор: ${closedCount} групп.`}
            </p>
          ) : (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
              По сети набор открыт в {netOpen.length} из {allRows.length} групп{netCanRecruit > 0 ? <> — всего можно набрать ещё <span className="font-black text-[#C5A059]">{netCanRecruit}</span> учеников</> : ""}. Выберите филиал, чтобы увидеть группы и управлять набором.
            </p>
          )}
          {selBranch && noCapacityCount > 0 && (
            <p className="mt-1 text-[11px] text-amber-400">У {noCapacityCount} групп не задана вместимость — укажите её в настройках группы, иначе свободные места не считаются.</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button onClick={onGoMarketing}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#C5A059] px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110">
            <Megaphone className="h-3.5 w-3.5" /> В Маркетинг: собрать заявки ›
          </button>
          <select value={selBranch} onChange={(e) => setSelBranch(e.target.value)}
            className="rounded-xl border border-[#C5A059]/30 bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-100 outline-none">
            <option value="">Выберите филиал…</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name || b.city}</option>)}
          </select>
        </div>
      </div>

      {/* Группы выбранного филиала со статусом набора */}
      <div className="mt-4 space-y-2">
        {!selBranch && <p className="py-6 text-center text-sm text-slate-500">Групп в сети {allRows.length} — выберите филиал, чтобы не листать все сразу.</p>}
        {selBranch && rows.map(({ g, cap, free, open }) => (
          <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#161616] px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{g.name}</p>
              <p className="truncate text-[11px] text-slate-500">{branchNameOf(g.branchId)} · {teacherNameOf(g.teacherId)}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-300">
              {cap > 0 ? <>{g.studentCount || 0} / {cap}{free !== null && free > 0 && open ? <span className="text-emerald-400"> · +{free}</span> : null}</> : <span className="text-slate-500">мест не задано</span>}
            </span>
            <button disabled={busyId === g.id} onClick={() => toggle(g)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition disabled:opacity-50 ${open ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-400" : "bg-rose-400"}`} />
              {open ? "Набор открыт" : "Набор закрыт"}
            </button>
          </div>
        ))}
        {selBranch && rows.length === 0 && <p className="py-6 text-center text-sm text-slate-500">В этом филиале групп пока нет.</p>}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Клик по статусу переключает набор — это видят и управляющие. Группы с закрытым набором не попадают в рекомендации и рекламные офферы. Тот же переключатель есть в «Расписании».</p>
    </section>
  );
}

// ---------- Лояльность (LTV): средний срок обучения + разбивка по месяцам ----------
// Показывает, сколько учеников занимается 1–2 / 3–4 / 5–6 / 7–8 / 9–12 месяцев
// и больше года — где студия теряет аудиторию, а где её ядро.
function LtvPanel({ ltv, onOpenBucket }: {
  ltv: { avgMonths: number | null; avgRevenue: number | null; buckets: { key: string; label: string; count: number; ids: string[] }[] };
  onOpenBucket: (ids: string[], label: string) => void;
}) {
  const total = ltv.buckets.reduce((s, b) => s + b.count, 0);
  const max = Math.max(1, ...ltv.buckets.map((b) => b.count));
  // Цвет от «новичков» к «ядру»: короткий срок — нейтральный, длинный — золотой.
  const BUCKET_COLORS = ["#38bdf8", "#34d399", "#a3e635", "#fbbf24", "#f59e0b", "#C5A059"];
  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      {/* Сводка */}
      <section className="rounded-[2rem] border border-white/10 bg-[#141414] p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Средний срок обучения</p>
        <p className="mt-1.5 text-3xl font-black text-[#C5A059]">
          {ltv.avgMonths === null ? "—" : `${ltv.avgMonths} мес`}
        </p>
        <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">Средний LTV (выручка на ученика)</span>
            <span className="shrink-0 text-xs font-bold text-slate-200">{ltv.avgRevenue === null ? "—" : money(ltv.avgRevenue)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">Учеников в расчёте</span>
            <span className="shrink-0 text-xs font-bold text-slate-200">{total}</span>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Срок — от даты регистрации ученика (как в его карточке). Лиды и пробные не считаются — у них ещё нет срока обучения.</p>
      </section>
      {/* Разбивка по длительности */}
      <section className="rounded-[2rem] border border-white/10 bg-[#141414] p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Сколько учеников занимается</p>
        <div className="mt-3 space-y-2.5">
          {ltv.buckets.map((b, i) => {
            const share = total ? Math.round((b.count / total) * 100) : 0;
            return (
              <button key={b.key} onClick={() => b.count > 0 && onOpenBucket(b.ids, `Занимаются ${b.label.toLowerCase()}`)}
                className={`group block w-full text-left ${b.count > 0 ? "cursor-pointer" : "cursor-default"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white">{b.label}</span>
                  <span className="shrink-0 text-xs font-black text-slate-200">
                    {b.count} <span className="font-bold text-slate-500">· {share}%</span>
                  </span>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full transition group-hover:brightness-125"
                    style={{ width: `${Math.max(b.count > 0 ? 4 : 0, Math.round((b.count / max) * 100))}%`, background: BUCKET_COLORS[i] || "#C5A059" }} />
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Провал в середине шкалы — слабое место удержания: аудитория уходит, не дойдя до «ядра». Клик по строке — список учеников.</p>
      </section>
    </div>
  );
}

function FunnelDayCard({ title, data }: { title: string; data: { leads: number; trialBooked: number; trialCame: number; bought: number } | null }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">{title}</p>
      {data ? (
        <div className="mt-3 grid grid-cols-3 gap-3">
          <MiniMetric label="Запись на пробный" value={data.trialBooked} />
          <MiniMetric label="Пришли" value={data.trialCame} />
          <MiniMetric label="Купили" value={data.bought} />
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

// Панель с подкатегориями (ТЗ 13.07): пункты сгруппированы по темам с подзаголовками.
function CategorizedPanel({ icon: Icon, tone, title, groups }: {
  icon: React.ElementType; tone: "rose" | "emerald"; title: string; groups: { title: string; items: string[] }[];
}) {
  const c = tone === "rose" ? "text-rose-400" : "text-emerald-400";
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className={`flex items-center gap-2 ${c}`}><Icon className="h-4 w-4" /><h2 className="text-sm font-black uppercase tracking-wider">{title}</h2></div>
      <div className="mt-3 space-y-4">
        {(groups || []).map((g, gi) => (
          <div key={gi}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{g.title}</p>
            <ul className="mt-1.5 space-y-1.5">
              {g.items.map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-200"><span className={c}>•</span><span>{t}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
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
    <OwnerScreen title="Филиалы сети" subtitle="Все филиалы, управляющие, финансы, посещаемость. Владелец может добавлять, редактировать и архивировать филиалы и группы.">
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
  const emptyForm = { name: "", branchId: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", capacity: "", level: "Начинающие", scheduleDays: "", scheduleTime: "", format: "group" };
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
      format: g.format === "individual" ? "individual" : "group",
    });
  };
  const cancel = () => { setAdding(false); setEditingId(null); setForm(emptyForm); };

  // Порядок внесения данных: без залов в филиале новую группу создать нельзя.
  const activeBranchHalls = (branchId: string) =>
    (halls || []).filter((h: any) => h.branchId === branchId && String(h.status || "active") === "active");
  const noHalls = adding && Boolean(form.branchId) && activeBranchHalls(form.branchId).length === 0;

  const submit = async () => {
    if (!form.name.trim() || !form.branchId || noHalls) return;
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
      format: form.format,
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
            <label className="block"><span className={kicCls}>Формат *</span>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={inputCls}>
                <option value="group">Групповая</option>
                <option value="individual">Индивидуальные занятия</option>
              </select>
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
              {noHalls && (
                <p className="mt-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300/90">
                  В этом филиале ещё нет залов. Сначала добавьте зал (Филиалы → Залы) — без залов создавать группы нельзя.
                </p>
              )}
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
            <button disabled={busy || !form.name.trim() || !form.branchId || noHalls} onClick={submit} className="rounded-2xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
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
                <p className="mt-1 text-xs text-slate-500">{branchName(g.branchId)} · {g.format === "individual" ? "Индивидуальные занятия" : "Групповая"} · {g.ageGroup || "Все возрасты"} · {g.level}</p>
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
    { icon: UserRound, title: "Сотрудники", text: "Преподаватели, администраторы, управляющие, роли, нагрузка.", accent: `${teachers.length}`, area: "employees" as const },
    { icon: Settings, title: "Справочники", text: "Филиалы, группы, статусы, источники, стоимость, интеграции.", accent: "18", area: "directories" as const }
  ];

  const reportCategories = [
    {
      title: "Финансовые отчеты",
      text: "Контроль денег сети, долгов, повторных продаж и потерь по филиалам.",
      items: ["Управляющие по месяцам", "Отчет о выручке и потерях", "Взаиморасчеты", "Реестр операций", "Проданные абонементы", "Средний чек"]
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
      items: ["Управляющие", "Администраторы", "Преподаватели", "Стажеры", "Уволенные / архив", "Без назначенного филиала"]
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
      text: "Операции, которые нужны владельцу и управляющим.",
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

function StudentsNetworkView({ students, branches, groups, teachers, onCreateStudent, onUpdateStudent, onDeleteStudent, onOpenPayment, onSellSubscription, subscriptionPlans = [], studentTrash = [], onRestoreStudent, onConfirmDeleteStudent, studentArchive = [], onArchiveStudent, onUnarchiveStudent, onEditArchive, onBookTrial, leadSources = [], waitlist = [], onAddToWaitlist, onRemoveFromWaitlist, onCreateLeadSource, onUpdateLeadSource, onDeleteLeadSource, preset }: {
  students: Student[];
  branches: Branch[];
  groups: Group[];
  teachers: Teacher[];
  onCreateStudent?: (data: StudentInput) => Promise<string | boolean | null | { archivedId: string; message: string }>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  onSellSubscriptionBatch?: (items: SellSubscriptionInput[]) => Promise<any> | any;
  onDeleteTrial?: (studentId: string, date: string) => Promise<any> | any;
  subscriptionPlans?: SubscriptionPlan[];
  studentTrash?: TrashStudent[];
  onRestoreStudent?: (id: string) => Promise<boolean>;
  onConfirmDeleteStudent?: (id: string) => Promise<boolean>;
  studentArchive?: ArchiveStudent[];
  onArchiveStudent?: (id: string, reason: string, comment: string, leftOn?: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<boolean>;
  onEditArchive?: (id: string, patch: { leftOn?: string; reason?: string; comment?: string }) => Promise<boolean | void> | void;
  onBookTrial?: (id: string, payload: { date: string; time: string; note: string }) => Promise<boolean> | void;
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
  const confirmArchive = async (reason: string, comment: string, leftOn: string) => {
    if (!onArchiveStudent || !archiveTarget) return;
    setArchiveBusy(true);
    await onArchiveStudent(archiveTarget.id, reason, comment, leftOn);
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
        roleHeader="owner"
        studentArchive={studentArchive}
        onUnarchiveStudent={onUnarchiveStudent}
        onEditArchive={onEditArchive} onBookTrial={onBookTrial}
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
              <p className="text-xs text-slate-500">Заявки на удаление от управляющих. Владелец возвращает ученика или переводит в архив (данные сохраняются).</p>
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

      {/* Архив вынесен в отдельную вкладку «Архив» (StudentsArchiveView). */}

      {archiveTarget && (
        <ArchiveReasonModal
          title={`В архив: ${archiveTarget.name}`}
          subtitle="Укажите причину ухода и комментарий"
          busy={archiveBusy}
          warning={hasCoveringSubscription(archiveTarget)
            ? "У ученика есть действующий абонемент. В архив переводят ушедших — убедитесь, что он действительно перестал ходить (или сначала завершите/удалите абонемент)."
            : undefined}
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

// Модель KPI/ЗП/категории/штрафов преподавателя вынесена в ../teacherEconomics (общая с кабинетом педагога).

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

  // Штрафы преподавателей (журнал + начисление).
  const [penalties, setPenalties] = useState<any[]>([]);
  const [penaltyTotal, setPenaltyTotal] = useState(0);
  const [showPenaltyJournal, setShowPenaltyJournal] = useState(false);
  const [showChargePenalty, setShowChargePenalty] = useState(false);
  const loadPenalties = async () => {
    try {
      const res = await fetch("/api/mvp/teachers/penalties", ownerHdr);
      if (res.ok) { const j = await res.json(); setPenalties(j.penalties || []); setPenaltyTotal(j.total || 0); }
    } catch { /* демо */ }
  };
  useEffect(() => { loadPenalties(); /* eslint-disable-next-line */ }, []);
  const chargePenalty = async (payload: any) => {
    setBusy(true);
    try {
      const res = await fetch("/api/mvp/teachers/penalties", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "owner" }, body: JSON.stringify(payload) });
      if (res.ok) { setShowChargePenalty(false); await loadPenalties(); }
    } catch { /* демо */ } finally { setBusy(false); }
  };
  const removePenalty = async (id: string) => {
    try { await fetch(`/api/mvp/teachers/penalties/${id}`, { method: "DELETE", headers: { "x-demo-role": "owner" } }); await loadPenalties(); } catch { /* демо */ }
  };

  const branchName = (id?: string | null) => branches.find((b) => b.id === id)?.name || "— не назначен —";
  const metricFor = (id: string) => metrics.teacherPerformance.find((m) => m.teacherId === id);
  const cardTeacher = teachers.find((t) => t.id === cardTeacherId) || null;

  // ── Фильтры и вычисленные профили (референс «Преподаватели сети») ──
  const [tnMonth, setTnMonth] = useState("Июнь 2026");
  const [tnBranch, setTnBranch] = useState("");
  const [tnCat, setTnCat] = useState("");
  const [tnStatus, setTnStatus] = useState("");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [showColMenu, setShowColMenu] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  // Видимость колонок таблицы. По умолчанию — как в референсе: основные включены,
  // расширенные (ученики/воронка/отзывы/стандарты/телефон) выключены.
  const [extraCols, setExtraCols] = useState<Record<string, boolean>>({
    spec: true, branch: true, cat: true, ret: true, kpi: true, fines: true, sal: true, role: true,
    students: false, funnel: false, rev: false, std: false, phone: false,
  });

  const tnBranchName = (t: Teacher, seedBranch: string) => seedBranch || branchName(t.branchId);
  const enriched = useMemo(
    () => teachers.map((t) => tnEnrich(t, metricFor(t.id), tnMonth, penalties)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teachers, metrics, tnMonth, penalties]
  );
  // Кандидат ИИ = максимальный KPI среди работавших в месяце.
  const aiBest = useMemo(() => {
    let best: TnRow | null = null;
    enriched.forEach((e) => { if (e.m && (!best || e.kpi > best.kpi)) best = e; });
    return best;
  }, [enriched]);
  const effectiveWinnerId = winnerId ?? aiBest?.teacher.id ?? null;

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((e) => { const b = tnBranchName(e.teacher, e.branch); if (b && b !== "— не назначен —") set.add(b); });
    return Array.from(set);
  }, [enriched]);

  const filtered = useMemo(() => enriched.filter((e) =>
    (!tnBranch || tnBranchName(e.teacher, e.branch) === tnBranch) &&
    (!tnCat || tnCatName(e.cat) === tnCat) &&
    (!tnStatus || e.status === tnStatus)
  ), [enriched, tnBranch, tnCat, tnStatus]);

  const withM = enriched.filter((e) => e.m);
  const avgRet = withM.length ? withM.reduce((s, e) => s + (e.m!.ret), 0) / withM.length : 0;
  const avgKpi = withM.length ? Math.round(withM.reduce((s, e) => s + e.kpi, 0) / withM.length) : 0;
  const activeCount = teachers.filter((t) => tnEnrich(t, metricFor(t.id), tnMonth, penalties).status === "Активен").length;
  const internCount = teachers.length - activeCount;

  const tnSalaryOf = (e: TnRow) => tnSalary(e.m, e.cat, effectiveWinnerId === e.teacher.id, e.finesSum);
  const approveTom = () => { if (aiBest) setWinnerId(aiBest.teacher.id); };

  const TN_COLS: { id: string; label: string; cell: (e: TnRow) => React.ReactNode }[] = [
    { id: "spec", label: "Специализация", cell: (e) => <span className="text-slate-300">{e.spec}</span> },
    { id: "branch", label: "Филиал", cell: (e) => <span className="text-slate-300">{tnBranchName(e.teacher, e.branch)}</span> },
    { id: "cat", label: "Категория", cell: (e) => <span className="rounded-full bg-[#C5A059]/12 px-2.5 py-1 text-xs font-black text-[#C5A059]">{tnCatName(e.cat)}</span> },
    { id: "ret", label: "Удержание", cell: (e) => e.m ? (
      <div className="min-w-[80px]">
        <div className="h-[7px] w-20 overflow-hidden rounded bg-white/10"><span className="block h-full rounded" style={{ width: `${e.m.ret}%`, background: e.m.ret >= 60 ? "#4F8A63" : e.m.ret >= 40 ? "#C5A059" : "#B14545" }} /></div>
        <small className="text-slate-500">{e.m.ret}%</small>
      </div>
    ) : <span className="text-slate-500">—</span> },
    { id: "kpi", label: "KPI", cell: (e) => <b className="text-white">{e.m ? e.kpi : "—"}</b> },
    { id: "fines", label: "Штрафы", cell: (e) => e.finesSum ? <span className="font-bold text-rose-400">− {money(e.finesSum)}</span> : <span className="text-slate-500">—</span> },
    { id: "sal", label: "Ожид. ЗП", cell: (e) => { const s = tnSalaryOf(e); return <span className={`font-bold ${s && s.total < 0 ? "text-rose-400" : "text-white"}`}>{s ? money(s.total) : "—"}</span>; } },
    { id: "students", label: "Ученики", cell: (e) => <span className="text-slate-300">{e.m ? e.m.students : "—"}</span> },
    { id: "funnel", label: "Воронка ПУ", cell: (e) => <span className="text-slate-300">{e.m ? `${e.m.funnel}%` : "—"}</span> },
    { id: "rev", label: "Отзывы (оценка)", cell: (e) => <span className="text-slate-300">{e.m && e.m.rev ? `${e.m.rev.toFixed(1)} ★` : "—"}</span> },
    { id: "std", label: "Стандарты", cell: (e) => <span className="text-slate-300">{e.m ? `${e.m.std}%` : "—"}</span> },
    { id: "phone", label: "Телефон", cell: (e) => <span className="text-slate-300">{e.phone || "—"}</span> },
    { id: "role", label: "Права", cell: (e) => <span className="rounded-full bg-[#C5A059]/12 px-2.5 py-1 text-xs font-black text-[#C5A059]">{ROLE_LABELS[e.teacher.role || "teacher"]}</span> },
  ];
  // Преподаватель и Действия закреплены всегда; остальные колонки — по переключателям.
  const visibleCols = TN_COLS.filter((c) => extraCols[c.id]);

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
    <OwnerScreen title="Преподаватели сети" subtitle="Статистика и развитие педагогического состава. Выберите месяц — пересчитаются KPI, удержание и зарплата. Нажмите на показатель или преподавателя, чтобы раскрыть детали.">
      {/* Фильтры */}
      <div className="flex flex-wrap gap-2.5">
        <select value={tnMonth} onChange={(e) => setTnMonth(e.target.value)}
          className="rounded-full border border-[#C5A059]/40 bg-[#C5A059]/12 px-4 py-2.5 text-sm font-bold text-[#C5A059] outline-none">
          {TN_MONTHS.map((mo) => <option key={mo} value={mo}>{mo}</option>)}
        </select>
        <select value={tnBranch} onChange={(e) => setTnBranch(e.target.value)}
          className="rounded-full border border-white/10 bg-[#121212] px-4 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-[#C5A059]/50">
          <option value="">Вся сеть</option>
          {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={tnCat} onChange={(e) => setTnCat(e.target.value)}
          className="rounded-full border border-white/10 bg-[#121212] px-4 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-[#C5A059]/50">
          <option value="">Все категории</option>
          <option>1 категория</option><option>2 категория</option><option>3 категория</option>
        </select>
        <select value={tnStatus} onChange={(e) => setTnStatus(e.target.value)}
          className="rounded-full border border-white/10 bg-[#121212] px-4 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-[#C5A059]/50">
          <option value="">Любой статус</option>
          <option>Активен</option><option>Стажер</option>
        </select>
      </div>

      {/* Педагог месяца */}
      {(() => {
        const winner = enriched.find((e) => e.teacher.id === effectiveWinnerId) || aiBest;
        return (
          <section className="rounded-[1.75rem] border border-[#C5A059]/25 bg-gradient-to-r from-[#C5A059]/[0.12] to-transparent p-3.5">
            <div className="flex flex-wrap items-center gap-5 rounded-[1.4rem] bg-[#121212] px-6 py-5">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#C5A059] shadow-[0_6px_16px_rgba(197,160,89,0.4)]">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-[200px] flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#C5A059]">Педагог месяца · {tnMonth}</p>
                {winner ? (
                  <>
                    <h3 className="mt-0.5 text-2xl font-black text-white">{winner.teacher.name} · {tnCatName(winner.cat)}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" /> ИИ предлагает: <b className="text-slate-200">{aiBest?.teacher.name || "—"}</b> (KPI {aiBest?.kpi ?? 0}). Бонус +20 000 тг
                    </p>
                  </>
                ) : <h3 className="mt-0.5 text-2xl font-black text-white">Нет данных за месяц</h3>}
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={approveTom} className="rounded-full bg-[#C5A059] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-105">Утвердить выбор ИИ</button>
                <button onClick={() => setShowColMenu(false)} className="rounded-full border border-white/10 bg-[#121212] px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-[#C5A059]/50 hover:text-[#C5A059]">Сравнить педагогов</button>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Плитки */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
        <TnTile label="Всего" value={teachers.length} sub="в сети →" />
        <TnTile label="Активные" value={activeCount} sub="работают →" />
        <TnTile label="Стажёры" value={internCount} sub="статус «Стажер» →" />
        <TnTile label="Ср. удержание" value={`${avgRet.toFixed(1)}%`} sub="м/м · детально →" />
        <TnTile label="Ср. KPI" value={avgKpi} sub="из 100 · детально →" />
      </div>

      {/* Карточки-спотлайт */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((e) => {
          const sal = tnSalaryOf(e);
          const win = effectiveWinnerId === e.teacher.id;
          return (
            <article key={e.teacher.id} className={`relative rounded-3xl bg-[#121212] p-7 shadow-sm transition hover:-translate-y-0.5 ${win ? "border-2 border-[#C5A059]" : "border border-white/10"}`}>
              <span className="absolute left-5 top-5 rounded-full bg-[#C5A059]/12 px-3 py-1 text-[11px] font-black text-[#C5A059]">{tnCatName(e.cat)}</span>
              {win && (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-[#C5A059] px-3 py-1 text-[11px] font-black text-white">
                  <Crown className="h-3 w-3" /> Педагог месяца
                </span>
              )}
              <div className="flex flex-col items-center text-center">
                <div className="mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/[0.06] text-3xl font-black text-slate-400">{e.initials}</div>
                <h3 className="mt-4 text-xl font-black text-white">{e.teacher.name}</h3>
              </div>
              <div className="my-6 grid grid-cols-2 gap-3">
                <TnStat label="Ученики" value={e.m ? e.m.students : "—"} />
                <TnStat label="Удержание" value={e.m ? `${e.m.ret}%` : "—"} />
                <TnStat label="KPI" value={e.m ? e.kpi : "—"} />
                <TnStat label="Ожид. ЗП" value={sal ? money(sal.total) : "—"} small tone={sal && sal.total < 0 ? "rose" : "default"} />
              </div>
              {e.finesSum > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-400">
                  <span>Штрафы за месяц</span><span>− {money(e.finesSum)}</span>
                </div>
              )}
              <button onClick={() => setCardTeacherId(e.teacher.id)} className="text-[15px] font-black text-[#C5A059] hover:underline">Открыть карточку ›</button>
            </article>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-500">Преподаватели не найдены.</p>}
      </div>

      {/* Тулбар */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-400">{filtered.length} преподавателей в сети</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <button onClick={() => setShowColMenu((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121212] px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-[#C5A059]/50 hover:text-[#C5A059]">
              <Filter className="h-4 w-4" /> Показатели
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-12 z-30 w-60 rounded-2xl border border-white/10 bg-[#121212] p-2 shadow-xl">
                <p className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Колонки таблицы</p>
                {/* Закреплённая колонка — всегда видна */}
                <label className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500">
                  <input type="checkbox" checked disabled className="h-4 w-4 accent-[#C5A059] opacity-60" />
                  Преподаватель
                </label>
                {TN_COLS.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.04]">
                    <input type="checkbox" checked={!!extraCols[c.id]} onChange={(ev) => setExtraCols((s) => ({ ...s, [c.id]: ev.target.checked }))} className="h-4 w-4 accent-[#C5A059]" />
                    {c.label}
                  </label>
                ))}
                <label className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500">
                  <input type="checkbox" checked disabled className="h-4 w-4 accent-[#C5A059] opacity-60" />
                  Действия
                </label>
              </div>
            )}
          </div>
          {canManage && (
            <>
              <button onClick={() => setShowPenaltyJournal(true)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121212] px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-rose-400/50 hover:text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-400" /> Штрафы{penalties.length > 0 ? ` · ${penalties.length}` : ""}
              </button>
              <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-full bg-[#C5A059] px-5 py-2.5 text-sm font-black text-black shadow-[0_6px_16px_rgba(197,160,89,0.35)] transition hover:brightness-105">
                <Plus className="h-4 w-4" /> Добавить преподавателя
              </button>
            </>
          )}
        </div>
      </div>

      {showPenaltyJournal && (
        <PenaltyJournalModal penalties={penalties} teachers={teachers} months={TN_MONTHS} month={tnMonth} onClose={() => setShowPenaltyJournal(false)}
          onCharge={() => { setShowPenaltyJournal(false); setShowChargePenalty(true); }} onRemove={removePenalty} />
      )}
      {showChargePenalty && (
        <ChargePenaltyModal teachers={teachers} busy={busy} onClose={() => setShowChargePenalty(false)} onSubmit={chargePenalty} />
      )}
      {(adding || editingId !== null) && (
        <TeacherForm
          title={adding ? "Новый преподаватель" : "Редактирование преподавателя"}
          form={form} setForm={setForm} branches={branches} busy={busy} onSubmit={submit} onCancel={cancel}
        />
      )}

      {/* Мобильные карточки преподавателей */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 && <div className="rounded-[1.25rem] border border-white/10 bg-[#121212] px-4 py-8 text-center text-sm text-slate-500">Преподаватели не найдены.</div>}
        {filtered.map((e) => (
          <div key={e.teacher.id} className="rounded-[1.25rem] border border-white/10 bg-[#121212] p-4">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setCardTeacherId(e.teacher.id)} className="min-w-0 text-left">
                <b className="block truncate text-[15px] font-bold text-white">{e.teacher.name}</b>
                <span className="text-[12px] text-slate-500">{e.phone || "—"} · {e.m ? e.m.students : 0} уч.</span>
              </button>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => startEdit(e.teacher)} title="Редактировать" className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 text-slate-400"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(e.teacher)} title="Архивировать" className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 text-slate-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2" onClick={() => setCardTeacherId(e.teacher.id)}>
              {visibleCols.map((c) => (
                <div key={c.id} className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
                  <div className="mt-0.5 text-sm">{c.cell(e)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Таблица */}
      <div className="hidden overflow-x-auto rounded-[1.25rem] border border-white/10 bg-[#121212] md:block">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-wider text-slate-500">Преподаватель</th>
              {visibleCols.map((c) => <th key={c.id} className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-wider text-slate-500">{c.label}</th>)}
              <th className="px-6 py-4 text-right text-[12px] font-black uppercase tracking-wider text-slate-500">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.teacher.id} onClick={() => setCardTeacherId(e.teacher.id)} className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03]">
                <td className="px-6 py-4">
                  <b className="block text-[15px] font-bold text-white">{e.teacher.name}</b>
                  <span className="text-[13px] text-slate-500">{e.phone || "—"} · {e.m ? e.m.students : 0} уч.</span>
                </td>
                {visibleCols.map((c) => <td key={c.id} className="px-6 py-4 text-sm">{c.cell(e)}</td>)}
                <td className="px-6 py-4" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(e.teacher)} title="Редактировать" className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 bg-[#121212] text-slate-400 transition hover:border-[#C5A059]/50 hover:text-[#C5A059]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(e.teacher)} title="Архивировать" className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/10 bg-[#121212] text-slate-400 transition hover:border-rose-400/50 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={visibleCols.length + 2} className="px-6 py-6 text-center text-sm text-slate-500">Преподаватели не найдены.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </OwnerScreen>
  );
}

function TnTile({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="cursor-pointer rounded-2xl border border-transparent bg-[#121212] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C5A059]/50">
      <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1.5 text-3xl font-black text-white">{value}</p>
      <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>
    </div>
  );
}

function TnStat({ label, value, small, tone = "default" }: { label: string; value: React.ReactNode; small?: boolean; tone?: "default" | "rose" }) {
  return (
    <div className="rounded-[14px] bg-white/[0.04] px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 font-black ${small ? "text-[17px]" : "text-[22px]"} ${tone === "rose" ? "text-rose-400" : "text-white"}`}>{value}</p>
    </div>
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
            <div key={g.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{g.name}</p>
                <p className="truncate text-[11px] text-slate-500">{g.ageGroup} · {g.scheduleText || "по расписанию"}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-300">{g.studentCount}{g.capacity ? ` / ${g.capacity}` : ""} уч.</span>
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
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{money(p.amount)} <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>{p.status === "paid" ? "Выплачено" : "Запланировано"}</span></p>
                <p className="truncate text-[11px] text-slate-500">{p.periodStart} — {p.periodEnd}{p.comment ? ` · ${p.comment}` : ""}</p>
              </div>
              <button onClick={() => delPayout(p.id)} className="shrink-0 rounded-lg p-1 text-slate-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
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
  const [penalties, setPenalties] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const r = useMemo(() => clientPeriodRange(period), [period]);

  const load = async () => {
    try {
      const [pRes, hRes, penRes] = await Promise.all([
        fetch(`/api/mvp/teachers/payroll?period=${period}`, hdr),
        fetch(`/api/mvp/teachers/payouts/history?months=12`, hdr),
        fetch(`/api/mvp/teachers/penalties`, hdr),
      ]);
      if (pRes.ok) setData(await pRes.json());
      if (hRes.ok) setHistory((await hRes.json()).months || []);
      if (penRes.ok) setPenalties((await penRes.json()).penalties || []);
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

  // Штраф педагога за период: матчим по teacherId, иначе по имени; фильтр по месяцу периода.
  const startM = r.cur.start.slice(0, 7);
  const endM = r.cur.end.slice(0, 7);
  const penaltyFor = (t: Teacher) => penalties
    .filter((p) => ((p.teacherId && p.teacherId === t.id) || (!p.teacherId && p.teacherName === t.name)) && p.period_month >= startM && p.period_month <= endM)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

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
    const penalty = penaltyFor(t);
    const net = total - penalty;               // к начислению после штрафов
    return { t, scheme: comp.scheme, revenue, lessons, total, penalty, net, paid, balance: net - paid };
  }), [teachers, students, groups, payments, data, r, penalties]);

  const totals = rows.reduce((a, x) => ({ revenue: a.revenue + x.revenue, total: a.total + x.total, penalty: a.penalty + x.penalty, net: a.net + x.net, paid: a.paid + x.paid, balance: a.balance + x.balance }), { revenue: 0, total: 0, penalty: 0, net: 0, paid: 0, balance: 0 });

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
    const header = ["Педагог", "Схема", "Выручка групп", "Занятий", "Начислено", "Штраф", "Выплачено", "К выплате"];
    const body = rows.map((x) => [x.t.name, COMP_SCHEME_LABEL[x.scheme] || x.scheme, x.revenue, x.lessons, x.total, x.penalty, x.paid, x.balance]);
    body.push(["ИТОГО", "", totals.revenue, "", totals.total, totals.penalty, totals.paid, totals.balance]);
    const csv = [header, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vedomost_${period}_${r.cur.start}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <OwnerScreen title="Зарплаты" subtitle="Зарплатная ведомость по всем педагогам за период: расчёт по индивидуальным схемам (% от выручки, оклад, за занятие, смешанная), штрафы за период вычитаются автоматически, уже выплаченное и остаток к выплате. Можно начислить всем сразу и выгрузить ведомость.">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PeriodChips period={period} onChange={setPeriod} />
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={autoclose} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:border-[#C5A059]/40 disabled:opacity-50"><CheckCircle className="h-4 w-4" /> Закрыть прошедшие уроки</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:border-[#C5A059]/40"><FileSpreadsheet className="h-4 w-4" /> Экспорт CSV</button>
          {role === "branch_manager" ? (
            <button disabled={busy} onClick={() => setMsg("Ведомость рассчитана. Начисление проводит владелец — передайте расчёт (Экспорт CSV) или запросите начисление у владельца.")} className="inline-flex items-center gap-2 rounded-xl border border-[#C5A059]/40 bg-[#C5A059]/10 px-4 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/20 disabled:opacity-50"><Wallet className="h-4 w-4" /> Запросить начисление у владельца</button>
          ) : (
            <button disabled={busy} onClick={accrueAll} className="inline-flex items-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black hover:brightness-110 disabled:opacity-50"><Wallet className="h-4 w-4" /> Начислить всем за период</button>
          )}
        </div>
      </div>

      {role === "branch_manager" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
          Управляющий <b className="text-slate-200">ведёт расчёт</b> зарплат и отправляет заявку — само начисление проводит владелец.
        </div>
      )}

      {msg && <div className="rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-4 py-3 text-sm text-[#C5A059]">{msg}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatPill label="Выручка групп" value={money(totals.revenue)} />
        <StatPill label="Фонд оплаты (начислено)" value={money(totals.total)} tone="white" />
        <StatPill label="Штрафы" value={totals.penalty > 0 ? `− ${money(totals.penalty)}` : money(0)} tone="rose" />
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

      {/* Мобильные карточки зарплат */}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 && <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">Нет педагогов.</div>}
        {rows.map((x) => (
          <div key={x.t.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{x.t.name}</p>
                <p className="text-[11px] text-slate-500">{COMP_SCHEME_LABEL[x.scheme] || x.scheme} · {x.lessons} занятий</p>
              </div>
              <span className="shrink-0 text-sm font-black text-white">{money(x.total)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <span className="text-slate-400">Выручка групп: <b className="text-slate-200">{money(x.revenue)}</b></span>
              <span className="text-slate-400">Штраф: <b className="text-rose-300">{x.penalty > 0 ? `− ${money(x.penalty)}` : "—"}</b></span>
              <span className="text-slate-400">Выплачено: <b className="text-emerald-400">{money(x.paid)}</b></span>
              <span className="text-slate-400">К выплате: <b className="text-rose-300">{money(x.balance)}</b></span>
            </div>
          </div>
        ))}
        {rows.length > 0 && (
          <div className="rounded-[1.5rem] border border-[#C5A059]/25 bg-[#C5A059]/5 p-4 text-[12px]">
            <p className="font-black uppercase tracking-wider text-white">Итого</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
              <span className="text-slate-400">Начислено: <b className="text-white">{money(totals.total)}</b></span>
              <span className="text-slate-400">Штрафы: <b className="text-rose-300">{totals.penalty > 0 ? `− ${money(totals.penalty)}` : "—"}</b></span>
              <span className="text-slate-400">Выплачено: <b className="text-emerald-400">{money(totals.paid)}</b></span>
              <span className="text-slate-400">К выплате: <b className="text-rose-300">{money(totals.balance)}</b></span>
            </div>
          </div>
        )}
      </div>

      <section className="hidden overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Педагог</th>
                <th className="px-4 py-3 font-bold">Схема</th>
                <th className="px-4 py-3 text-right font-bold">Выручка групп</th>
                <th className="px-4 py-3 text-right font-bold">Занятий</th>
                <th className="px-4 py-3 text-right font-bold">Начислено</th>
                <th className="px-4 py-3 text-right font-bold">Штраф</th>
                <th className="px-4 py-3 text-right font-bold">Выплачено</th>
                <th className="px-4 py-3 text-right font-bold">К выплате</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Нет педагогов.</td></tr>}
              {rows.map((x) => (
                <tr key={x.t.id} className="border-b border-white/5">
                  <td className="px-4 py-3 font-bold text-white">{x.t.name}</td>
                  <td className="px-4 py-3 text-slate-400">{COMP_SCHEME_LABEL[x.scheme] || x.scheme}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{money(x.revenue)}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{x.lessons}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{money(x.total)}</td>
                  <td className="px-4 py-3 text-right text-rose-300">{x.penalty > 0 ? `− ${money(x.penalty)}` : "—"}</td>
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
                  <td className="px-4 py-3 text-right text-rose-300">{totals.penalty > 0 ? `− ${money(totals.penalty)}` : "—"}</td>
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
  const [login, setLogin] = useState(form.phone || "");
  const [password, setPassword] = useState("");
  const genPassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    setPassword(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  };
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

      {/* Доступ в личный кабинет */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#C5A059]">Доступ в личный кабинет</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Логин (телефон)</span>
            <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder={form.phone || "+7 ..."} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Пароль</span>
            <div className="mt-1 flex gap-2">
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="—" className="w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50" />
              <button type="button" onClick={genPassword} className="shrink-0 rounded-xl border border-[#C5A059]/40 bg-[#C5A059]/10 px-3 py-2 text-xs font-bold text-[#C5A059] hover:bg-[#C5A059]/15">Сгенерировать</button>
            </div>
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Логин по умолчанию = номер телефона. Педагог входит в личный кабинет и видит свои KPI, ЗП, штрафы, обучение. Пароль в рабочей системе хранится в зашифрованном виде на сервере.</p>
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
  const [tab, setTab] = useState<"ops" | "requests" | "analytics" | "settings" | "taxes" | "history">("ops");
  const [data, setData] = useState<AcctOverview | null>(null);
  const [ops, setOps] = useState<AcctOp[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("expense");
  const [fPeriod, setFPeriod] = useState("Июнь 2026");
  const [fBranch, setFBranch] = useState("");
  const [fAccount, setFAccount] = useState("");
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
    { id: "ops", label: "Операции", icon: Receipt },
    { id: "requests", label: "Заявки управляющих", icon: Send, badge: pendingCount },
    { id: "analytics", label: "Аналитика", icon: PieChart },
    { id: "settings", label: "Настройки", icon: Settings },
    { id: "taxes", label: "Налоги", icon: BadgePercent },
    { id: "history", label: "История", icon: History },
  ];

  return (
    <OwnerScreen eyebrow="Финансы сети" title="Бухгалтерия"
      badge={<span className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/10 px-3 py-1 text-[11px] font-bold text-[#C5A059]"><Lock className="h-3 w-3" /> Только владелец</span>}
      subtitle="Учёт фактического движения денег и сверка с продажами CRM. Прибыль считается по периоду расхода. Управляющие сюда не заходят — только подают заявки.">
      {/* Тулбар как в прототипе: слева фильтры (период/филиал/счёт), справа кнопки */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={fPeriod} onChange={(e) => setFPeriod(e.target.value)}
            className="rounded-xl border border-[#C5A059]/30 bg-[#161616] px-3 py-2 text-xs font-bold text-slate-100 outline-none">
            {["Июнь 2026", "Май 2026", "Апрель 2026", "2 квартал 2026"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fBranch} onChange={(e) => setFBranch(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-xs font-bold text-slate-100 outline-none">
            <option value="">Вся сеть</option>
            {(branches || []).map((b: any, i: number) => <option key={b.branchId || i} value={b.branchName || b.name}>{b.branchName || b.name || "Филиал"}</option>)}
          </select>
          <select value={fAccount} onChange={(e) => setFAccount(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-xs font-bold text-slate-100 outline-none">
            <option value="">Все счета</option>
            {(data?.accounts || []).map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#161616] px-3 py-2.5 text-xs font-bold text-slate-300 hover:text-white">
            <RefreshCw className="h-4 w-4" /> Обновить
          </button>
          <button onClick={() => { setAddType("income"); setShowAdd(true); }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
            <Plus className="h-4 w-4" /> Поступление
          </button>
          <button onClick={() => { setAddType("expense"); setShowAdd(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-[#C5A059] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
            <Plus className="h-4 w-4" /> Расход
          </button>
        </div>
      </div>

      {/* Вкладки-разделы (vtabs) — ниже тулбара, как в прототипе */}
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

      {error && tab !== "taxes" && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
      {loading && !data && tab !== "taxes" && <div className="rounded-3xl border border-white/10 bg-[#121212] p-8 text-center text-sm text-slate-500">Загрузка данных бухгалтерии…</div>}

      {/* Постоянная шапка: KPI + «Сводка за 10 секунд» + Сверка/Счета — всегда видна над вкладками, как на скрине */}
      {data && <AcctHeaderSummary data={data} ops={ops} branches={branches} requests={requests} period={fPeriod} />}

      {/* Разделённые вкладки под шапкой */}
      {data && (
        <>
          {tab === "ops" && <AcctOpsTab data={data} ops={ops} onDelete={deleteOp} busy={busy} period={fPeriod} />}
          {tab === "requests" && <AcctRequestsTab data={data} requests={requests} onDecide={decideRequest} busy={busy} />}
          {tab === "analytics" && <AcctAnalyticsTab data={data} branches={branches} />}
          {tab === "settings" && <AcctSettingsTab data={data} ops={ops} />}
          {tab === "history" && <AcctHistoryTab ops={ops} requests={requests} data={data} />}
        </>
      )}

      {/* Налоги — self-contained, видны и в mock-режиме */}
      {tab === "taxes" && <AcctTaxesTab />}

      {showAdd && data && (
        <AcctAddOperation categories={data.categories} accounts={data.accounts} busy={busy} defaultType={addType}
          onClose={() => setShowAdd(false)} onSubmit={createOp} />
      )}
    </OwnerScreen>
  );
}

// Общие демо-данные сверки CRM ↔ факт (используются и в «Обзоре», и во вкладке «Сверка»).
const ACCT_RECON = [
  { dir: "Абонементы — наличные", crm: 120_000, fact: 120_000 },
  { dir: "Абонементы — Kaspi Pay", crm: 380_000, fact: 360_000 },
  { dir: "Товары", crm: 45_000, fact: 45_000 },
  { dir: "Выступления", crm: 200_000, fact: 150_000 },
].map((r) => ({ ...r, diff: r.crm - r.fact }));

// Сверка CRM ↔ факт: «Сводка за 10 секунд» + таблица сверки направлений.
function AcctReconcileTab() {
  const rows = ACCT_RECON;
  const totalDiff = rows.reduce((s, r) => s + r.diff, 0);
  const matched = rows.filter((r) => r.diff === 0).length;
  return (
    <div className="space-y-5">
      {/* Сводка за 10 секунд */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OwnerKpi label="Выручка" value={money(667_000)} detail="вал 675 000 − возвраты 8 000" tone="gold" icon={TrendingUp} />
        <OwnerKpi label="Сверка CRM ↔ факт" value={`${matched}/${rows.length} сошлось`} detail={`расхождение ${money(totalDiff)}`} tone="rose" icon={Shield} />
        <OwnerKpi label="Абонементы CRM → факт" value={money(480_000)} detail="в CRM 500 000 · недополучено 20 000" tone="rose" icon={WalletCards} />
        <OwnerKpi label="Чистая прибыль" value={money(202_000)} detail="рентабельность 30.3%" tone="emerald" icon={BarChart3} />
      </div>

      {/* Таблица сверки */}
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="border-b border-white/10 px-4 py-3"><h4 className="text-sm font-black text-white">Сверка CRM ↔ фактические поступления</h4></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Направление</th><th className="px-4 py-2 text-right font-bold">В CRM</th><th className="px-4 py-2 text-right font-bold">Факт</th><th className="px-4 py-2 text-right font-bold">Расхожд.</th><th className="px-4 py-2 font-bold">Статус</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-4 py-2 font-bold text-white">{r.dir}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{money(r.crm)}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{money(r.fact)}</td>
                  <td className={`px-4 py-2 text-right font-bold ${r.diff === 0 ? "text-slate-500" : "text-rose-300"}`}>{r.diff === 0 ? "0 ₸" : money(r.diff)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${r.diff === 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{r.diff === 0 ? "Сошлось" : "Расхождение"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#1a1710] to-black p-5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#C5A059]" /><h4 className="text-sm font-black uppercase tracking-wider text-white">Вывод</h4></div>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">Расхождение CRM↔факт {money(totalDiff)}: недополучено по Kaspi Pay (20 000 ₸) и выступлениям (50 000 ₸). Это ≈7.4% потенциальной выручки месяца — рекомендуется закрыть в первую очередь по выступлениям. Проверьте поступления и статусы оплат.</p>
      </section>
    </div>
  );
}

// Налоги: режим, база, расчёт, сроки. Демо-параметры (упрощёнка РК), настраиваются владельцем.
function AcctTaxesTab() {
  const base = 667_000;        // налогооблагаемый оборот за период
  const rate = 3;              // упрощённая декларация, 3% с оборота
  const tax = Math.round(base * rate / 100);
  const ipn = Math.round(tax / 2);
  const social = tax - ipn;
  const periods = [
    { period: "1 полугодие 2026", base: 3_980_000, tax: 119_400, status: "Уплачен", due: "25.08.2026" },
    { period: "2 полугодие 2025", base: 3_510_000, tax: 105_300, status: "Уплачен", due: "25.02.2026" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OwnerKpi label="Налоговый режим" value="Упрощёнка" detail="ФНО 910.00 · 3% с оборота" tone="gold" icon={Landmark} />
        <OwnerKpi label="База за период" value={money(base)} detail="облагаемый оборот" tone="white" icon={Coins} />
        <OwnerKpi label="Налог к уплате" value={money(tax)} detail={`ставка ${rate}%`} tone="rose" icon={BadgePercent} />
        <OwnerKpi label="Срок уплаты" value="25 числа" detail="по полугодию" tone="white" icon={CalendarClock} />
      </div>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        <h4 className="text-sm font-black text-white">Расчёт налога за период</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatPill label="ИПН (1.5%)" value={money(ipn)} />
          <StatPill label="Социальный налог (1.5%)" value={money(social)} />
          <StatPill label="Итого к уплате" value={money(tax)} tone="rose" />
        </div>
        <p className="mt-3 text-xs text-slate-500">Демо-параметры режима РК (упрощённая декларация). Ставки, режим и сроки настраиваются под организацию. Соц. отчисления и ОПВ за сотрудников считаются отдельно в зарплатном блоке.</p>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="border-b border-white/10 px-4 py-3"><h4 className="text-sm font-black text-white">История начислений</h4></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Период</th><th className="px-4 py-2 text-right font-bold">База</th><th className="px-4 py-2 text-right font-bold">Налог</th><th className="px-4 py-2 font-bold">Срок</th><th className="px-4 py-2 font-bold">Статус</th></tr></thead>
            <tbody>
              {periods.map((p, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-4 py-2 font-bold text-white">{p.period}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{money(p.base)}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{money(p.tax)}</td>
                  <td className="px-4 py-2 text-slate-400">{p.due}</td>
                  <td className="px-4 py-2"><span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// Постоянная шапка бухгалтерии: KPI + «Сводка за 10 секунд» + Сверка/Счета.
// Всегда видна над вкладками (Операции/Заявки/Аналитика/…), как на референс-скрине.
function AcctHeaderSummary({ data, ops = [], branches = [], requests = [], period = "" }: { data: AcctOverview; ops?: AcctOp[]; branches?: any[]; requests?: any[]; period?: string }) {
  const { totals } = data;
  const margin = totals.income > 0 ? (totals.profit / totals.income) * 100 : 0;
  const isRet = (o: AcctOp) => o.type === "return" || o.type === "refund";
  // Приход / расход по каждому счёту из фактических операций (для карточек «Счета»).
  const accFlow = (id: string) => {
    const inn = ops.filter((o) => o.accountId === id && o.type === "income").reduce((s, o) => s + o.amount, 0);
    const out = ops.filter((o) => o.accountId === id && (o.type === "expense" || isRet(o))).reduce((s, o) => s + o.amount, 0);
    return { inn, out };
  };

  // Данные для «Сводки за 10 секунд» (сверка + заявки).
  const recon = ACCT_RECON;
  const reconMatched = recon.filter((r) => r.diff === 0).length;
  const reconDiff = recon.reduce((s, r) => s + r.diff, 0);
  const abonCrm = recon.filter((r) => r.dir.includes("Абонементы")).reduce((s, r) => s + r.crm, 0);
  const abonFact = recon.filter((r) => r.dir.includes("Абонементы")).reduce((s, r) => s + r.fact, 0);
  const pending = (requests || []).filter((r) => r.status === "pending");
  const pendingSum = pending.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const potentialPct = totals.income > 0 ? (reconDiff / (totals.income + reconDiff)) * 100 : 0;
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const DigestCard = ({ label, value, note, tone }: { label: string; value: string; note: React.ReactNode; tone: "rose" | "emerald" | "gold" }) => (
    <div className="rounded-2xl border border-white/10 bg-[#121212] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${tone === "rose" ? "text-rose-400" : tone === "emerald" ? "text-emerald-400" : "text-[#C5A059]"}`}>{value}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{note}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OwnerKpi label="Выручка" value={money(totals.income)} detail="за вычетом возвратов" tone="emerald" icon={ArrowUpRight} />
        <OwnerKpi label="Расходы" value={money(totals.expense)} detail="проведённые, по периоду" tone="rose" icon={ArrowDownRight} />
        <OwnerKpi label="Чистая прибыль" value={money(totals.profit)} detail="выручка − расходы" tone={totals.profit >= 0 ? "emerald" : "rose"} icon={TrendingUp} />
        <OwnerKpi label="Рентабельность" value={`${margin.toFixed(1)}%`} detail="прибыль / выручка" tone={margin >= 0 ? "gold" : "rose"} icon={BarChart3} />
      </div>

      {/* AI-сводка «за 10 секунд» — 4 подкарточки + разбор, как в прототипе */}
      <section className="rounded-[2rem] border border-[#C5A059]/25 bg-[#C5A059]/[0.06] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#C5A059]" />
          <h3 className="text-sm font-black uppercase tracking-wider text-[#C5A059]">Сводка за 10 секунд</h3>
          <span className="ml-auto text-[11px] font-bold text-slate-500">на {today}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DigestCard label="Сверка CRM ↔ факт" value={`${reconMatched}/${recon.length} сошлось`} tone="rose"
            note={reconDiff > 0 ? <>расхождение {money(reconDiff)} (Kaspi Pay, Выступления)</> : "всё сошлось"} />
          <DigestCard label="Абонементы: CRM → факт" value={money(abonFact)} tone="rose"
            note={<>в CRM {money(abonCrm)} · <span className="text-rose-400">недополучено {money(abonCrm - abonFact)}</span></>} />
          <DigestCard label="Заявки на расходы" value={`${pending.length} ждут`} tone="rose"
            note={pending.length > 0 ? <>на {money(pendingSum)} — нужно решение</> : "новых заявок нет"} />
          <DigestCard label="Чистая прибыль" value={money(totals.profit)} tone="emerald"
            note={`рентабельность ${margin.toFixed(1)}%`} />
        </div>
        <div className="mt-4 border-t border-[#C5A059]/20 pt-4 text-sm leading-relaxed text-slate-200">
          <p><b className="text-white">Чистая прибыль</b> за период: {money(totals.profit)} при рентабельности {margin.toFixed(1)}%.</p>
          <ul className="mt-2 space-y-1.5 text-slate-300">
            <li>• Расхождение CRM↔факт <b className="text-white">{money(reconDiff)}</b>: недополучено по Kaspi (20 000 ₸) и выступлениям (50 000 ₸). Проверить поступления.</li>
            <li>• Рекомендация: закрыть расхождение по выступлениям — это {potentialPct.toFixed(1)}% потенциальной выручки месяца.</li>
          </ul>
        </div>
      </section>

      {/* Сверка ↔ Счета — двухколоночный грид на главном экране, как в прототипе */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#121212]">
          <div className="px-5 pt-5"><h3 className="font-black text-white">Сверка CRM ↔ фактические поступления</h3></div>
          <div className="overflow-x-auto">
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-2 font-bold">Направление</th><th className="px-5 py-2 text-right font-bold">В CRM</th><th className="px-5 py-2 text-right font-bold">Факт</th><th className="px-5 py-2 text-right font-bold">Расхожд.</th><th className="px-5 py-2 text-right font-bold">Статус</th></tr></thead>
              <tbody>
                {recon.map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-5 py-3 font-bold text-white">{r.dir}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{money(r.crm)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{money(r.fact)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${r.diff === 0 ? "text-slate-500" : "text-rose-300"}`}>{r.diff === 0 ? "0 ₸" : money(r.diff)}</td>
                    <td className="px-5 py-3 text-right"><span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${r.diff === 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{r.diff === 0 ? "Сошлось" : "Расхождение"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Счета</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.accounts.map((a) => {
              const Icon = accountIcon(a.kind);
              const { inn, out } = accFlow(a.id);
              return (
                <div key={a.id} className="rounded-2xl border border-white/10 bg-[#161616] p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#C5A059]" />
                    <p className="text-xs font-bold text-white">{a.name}</p>
                  </div>
                  <p className="mt-2 text-xl font-black text-white">{money(a.balance)}</p>
                  <p className="mt-1 text-[11px]"><span className="text-emerald-400">+{money(inn)}</span> <span className="text-slate-600">·</span> <span className="text-rose-400">−{money(out)}</span></p>
                </div>
              );
            })}
            {data.accounts.length === 0 && <p className="text-sm text-slate-500">Счета не заведены.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Вкладка «Аналитика»: чистый поток по месяцам, разбивки статей, ДДС, ОПиУ,
//    платёжный календарь и выручка по филиалам — всё из фактических данных API.
function AcctAnalyticsTab({ data, branches = [] }: { data: AcctOverview; branches?: any[] }) {
  const { cashflow } = data;
  const maxNet = Math.max(1, ...cashflow.netByMonth.map((v) => Math.abs(v)));
  const topExpense = [...cashflow.expenseRows].sort((a, b) => b.total - a.total).slice(0, 6);
  const topIncome = [...cashflow.incomeRows].sort((a, b) => b.total - a.total).slice(0, 6);
  const maxExp = Math.max(1, ...topExpense.map((r) => r.total));
  const maxInc = Math.max(1, ...topIncome.map((r) => r.total));

  const Breakdown = ({ title, rows, max, tone }: { title: string; rows: AcctRow[]; max: number; tone: "emerald" | "rose" }) => (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <h3 className="font-black text-white">{title}</h3>
      {rows.length === 0 ? <p className="mt-4 text-sm text-slate-500">Нет данных.</p> : (
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-slate-300">{r.category}</span>
                <span className={`font-bold ${tone === "emerald" ? "text-emerald-400" : "text-rose-400"}`}>{money(r.total)}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-500/70" : "bg-rose-500/70"}`} style={{ width: `${Math.max(3, (r.total / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-5">
      {/* Чистый денежный поток по месяцам */}
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

      {/* Разбивки доходов/расходов по статьям */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Структура расходов" rows={topExpense} max={maxExp} tone="rose" />
        <Breakdown title="Структура доходов" rows={topIncome} max={maxInc} tone="emerald" />
      </div>

      {/* ДДС и ОПиУ — детальные таблицы */}
      <AcctCashflowTab data={data} />
      <AcctPnlTab data={data} />

      {/* Платёжный календарь */}
      <AcctCalendarTab data={data} />

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

// ── Вкладка «Настройки»: счета, статьи доходов/расходов, налоговый режим и
//    параметры учёта. Показываем фактическую конфигурацию из API.
function AcctSettingsTab({ data, ops = [] }: { data: AcctOverview; ops?: AcctOp[] }) {
  const incomeCats = data.categories.filter((c) => c.kind === "income");
  const expenseCats = data.categories.filter((c) => c.kind === "expense");
  const kindLabel = (k: string) => k === "bank" ? "Расчётный счёт" : k === "card" ? "Карта / Kaspi" : "Наличные";

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white">Счета и кассы</h3>
          <span className="text-[11px] text-slate-500">{data.accounts.length} счёт(ов)</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr><th className="p-3 font-bold">Счёт</th><th className="p-3 font-bold">Тип</th><th className="p-3 font-bold">Валюта</th><th className="p-3 text-right font-bold">Стартовый остаток</th><th className="p-3 text-right font-bold">Текущий остаток</th></tr>
            </thead>
            <tbody>
              {data.accounts.map((a) => {
                const Icon = accountIcon(a.kind);
                return (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="p-3"><span className="inline-flex items-center gap-2 font-bold text-white"><Icon className="h-4 w-4 text-[#C5A059]" />{a.name}</span></td>
                    <td className="p-3 text-slate-400">{kindLabel(a.kind)}</td>
                    <td className="p-3 text-slate-400">{a.currency || "₸"}</td>
                    <td className="p-3 text-right text-slate-300">{money(a.openingBalance)}</td>
                    <td className="p-3 text-right font-bold text-white">{money(a.balance)}</td>
                  </tr>
                );
              })}
              {data.accounts.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-500">Счета не заведены.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Статьи доходов <span className="text-slate-500">· {incomeCats.length}</span></h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {incomeCats.map((c) => <span key={c.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">{c.name}</span>)}
            {incomeCats.length === 0 && <p className="text-sm text-slate-500">Статьи доходов не заданы.</p>}
          </div>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Статьи расходов <span className="text-slate-500">· {expenseCats.length}</span></h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {expenseCats.map((c) => <span key={c.id} className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300">{c.name}</span>)}
            {expenseCats.length === 0 && <p className="text-sm text-slate-500">Статьи расходов не заданы.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Параметры учёта</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatPill label="Налоговый режим" value="Упрощёнка · 3%" hint="ФНО 910.00" />
          <StatPill label="Признание прибыли" value="По периоду расхода" hint="cash-basis" />
          <StatPill label="Всего операций" value={String(ops.length)} hint="в базе" />
        </div>
        <p className="mt-3 text-xs text-slate-500">Настройки режима, статей и счетов конфигурируются под организацию. В расчёт прибыли идут только операции со статусом «Проведён».</p>
      </section>
    </div>
  );
}

// ── Вкладка «История»: единая лента фактических операций и решений по заявкам.
function AcctHistoryTab({ ops = [], requests = [], data }: { ops?: AcctOp[]; requests?: any[]; data: AcctOverview }) {
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name || "Без статьи";
  const accName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name || "—";
  const isRet = (o: AcctOp) => o.type === "return" || o.type === "refund";

  type Ev = { ts: number; date: string; kind: "op" | "req"; title: string; sub: string; amount: number; sign: "+" | "−"; tone: "emerald" | "rose" | "slate"; tag: string };
  const events: Ev[] = [];
  for (const o of ops) {
    const ret = isRet(o);
    events.push({
      ts: new Date(o.date).getTime(), date: o.date, kind: "op",
      title: `${ret ? "Возврат" : o.type === "income" ? "Доход" : "Расход"} · ${catName(o.categoryId)}`,
      sub: `${accName(o.accountId)}${o.counterparty ? ` · ${o.counterparty}` : ""}${o.description ? ` · ${o.description}` : ""}`,
      amount: o.amount, sign: ret || o.type === "expense" ? "−" : "+",
      tone: ret ? "slate" : o.type === "income" ? "emerald" : "rose",
      tag: ret ? "Возврат" : o.status === "planned" ? "Черновик" : o.type === "income" ? "Поступило" : "Проведён",
    });
  }
  for (const r of requests.filter((r) => r.status !== "pending")) {
    const approved = r.status === "approved";
    events.push({
      ts: new Date(r.decidedAt || r.createdAt).getTime(), date: r.decidedAt || r.createdAt, kind: "req",
      title: `Заявка ${approved ? "одобрена" : "отклонена"} · ${r.description || "без описания"}`,
      sub: `${r.requestedByName || "Управляющий"}${r.decidedBy ? ` → ${r.decidedBy}` : ""}${r.decisionComment ? ` · ${r.decisionComment}` : ""}`,
      amount: Number(r.amount) || 0, sign: "−", tone: approved ? "emerald" : "slate",
      tag: approved ? "Одобрено" : "Отклонено",
    });
  }
  events.sort((a, b) => b.ts - a.ts);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-white">История операций и решений</h3>
        <span className="text-[11px] text-slate-500">{events.length} событ.</span>
      </div>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Событий пока нет.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {events.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#161616] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${e.tone === "emerald" ? "bg-emerald-500/15 text-emerald-400" : e.tone === "rose" ? "bg-rose-500/15 text-rose-400" : "bg-slate-500/15 text-slate-300"}`}>
                  {e.kind === "req" ? <Send className="h-4 w-4" /> : e.sign === "+" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{e.title}</p>
                  <p className="truncate text-[11px] text-slate-500">{new Date(e.date).toLocaleDateString("ru-RU")} · {e.sub}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300">{e.tag}</span>
                <span className={`text-sm font-black ${e.tone === "emerald" ? "text-emerald-400" : e.tone === "rose" ? "text-rose-400" : "text-slate-300"}`}>{e.sign}{money(e.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {c.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{c.category}{c.counterparty ? ` · ${c.counterparty}` : ""}</p>
                    <p className="truncate text-[11px] text-slate-500">{new Date(c.date).toLocaleDateString("ru-RU")} · {c.account}{c.description ? ` · ${c.description}` : ""}</p>
                  </div>
                </div>
                <p className={`shrink-0 text-sm font-black ${c.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>{c.type === "income" ? "+" : "−"}{money(c.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AcctOpsTab({ data, ops, onDelete, busy, period = "" }: { data: AcctOverview; ops: AcctOp[]; onDelete: (id: string) => void; busy: boolean; period?: string }) {
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("");
  const [fAcc, setFAcc] = useState("");
  const [fStatus, setFStatus] = useState("");
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name || "Без статьи";
  const accName = (id: string | null) => data.accounts.find((a) => a.id === id)?.name || "—";
  const isReturn = (o: AcctOp) => o.type === "return" || o.type === "refund";

  const rows = ops.filter((o) => {
    if (fType === "inc" && o.type !== "income") return false;
    if (fType === "exp" && o.type !== "expense") return false;
    if (fType === "ret" && !isReturn(o)) return false;
    if (fAcc && o.accountId !== fAcc) return false;
    if (fStatus && o.status !== fStatus) return false;
    if (q) {
      const hay = `${money(o.amount)} ${catName(o.categoryId)} ${accName(o.accountId)} ${o.counterparty || ""} ${o.description || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase().trim())) return false;
    }
    return true;
  });

  const income = rows.filter((o) => o.type === "income").reduce((s, o) => s + o.amount, 0);
  const returns = rows.filter(isReturn).reduce((s, o) => s + o.amount, 0);
  const expense = rows.filter((o) => o.type === "expense").reduce((s, o) => s + o.amount, 0);
  const balance = income - returns - expense;
  const reset = () => { setQ(""); setFType(""); setFAcc(""); setFStatus(""); };
  const statusLabel = (o: AcctOp) => isReturn(o) ? "Возврат" : o.status === "planned" ? "Черновик" : o.type === "income" ? "Поступило" : "Проведён";
  const selCls = "rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-xs font-bold text-slate-100 outline-none";

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-black text-white">Расходы и поступления{period ? ` · ${period}` : ""}</h3>
        <span className="text-xs text-slate-500">в расчёт идут только «Проведён»</span>
      </div>

      {/* Поиск + фильтры */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#161616] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по сумме, комментарию, категории, счёту…"
            className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-0" />
        </div>
        <select value={fType} onChange={(e) => setFType(e.target.value)} className={selCls}>
          <option value="">Все типы</option><option value="inc">Доходы</option><option value="exp">Расходы</option><option value="ret">Возвраты</option>
        </select>
        <select value={fAcc} onChange={(e) => setFAcc(e.target.value)} className={selCls}>
          <option value="">Все счета</option>
          {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selCls}>
          <option value="">Любой статус</option><option value="actual">Проведён</option><option value="planned">Черновик</option>
        </select>
        <button onClick={reset} className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">Сбросить</button>
      </div>

      {/* Итоговая строка */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs">
        <span className="text-slate-400">Найдено: <b className="text-white">{rows.length}</b></span>
        <span className="text-slate-400">Доходы: <b className="text-emerald-400">+{money(income)}</b></span>
        <span className="text-slate-400">Возвраты: <b className="text-rose-300">−{money(returns)}</b></span>
        <span className="text-slate-400">Расходы: <b className="text-rose-400">−{money(expense)}</b></span>
        <span className="text-slate-400">Сальдо: <b className="text-white">{money(balance)}</b></span>
      </div>

      {/* Мобильные карточки операций */}
      <div className="mt-3 space-y-2 md:hidden">
        {rows.length === 0 && <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-slate-500">Операций не найдено.</div>}
        {rows.map((o) => {
          const ret = isReturn(o);
          const tone = ret ? "text-slate-300" : o.type === "income" ? "text-emerald-400" : "text-rose-400";
          return (
            <div key={o.id} className={`rounded-2xl border border-white/5 p-3.5 ${ret ? "bg-white/[0.02]" : o.type === "income" ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{ret ? "Возврат" : o.type === "income" ? "Доход" : "Расход"} · {catName(o.categoryId)}</p>
                  {o.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{o.description}</p>}
                </div>
                <span className={`shrink-0 text-sm font-black ${tone}`}>{ret || o.type === "expense" ? "−" : "+"}{money(o.amount)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span>{new Date(o.date).toLocaleDateString("ru-RU")}</span>
                <span>{accName(o.accountId)}</span>
                {o.counterparty && <span>{o.counterparty}</span>}
                <span className={`rounded-lg px-2 py-0.5 font-bold ${ret ? "bg-slate-500/15 text-slate-300" : o.status === "planned" ? "bg-amber-400/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{statusLabel(o)}</span>
                <button disabled={busy} onClick={() => onDelete(o.id)} className="ml-auto rounded-lg p-1.5 text-slate-500 hover:text-rose-400" title="Удалить"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="p-3">Дата оплаты</th>
              <th className="p-3">Период</th>
              <th className="p-3">Тип / категория</th>
              <th className="p-3">Счёт</th>
              <th className="p-3">Контрагент</th>
              <th className="p-3 text-right">Сумма</th>
              <th className="p-3">Статус</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const ret = isReturn(o);
              const tone = ret ? "text-slate-300" : o.type === "income" ? "text-emerald-400" : "text-rose-400";
              const rowBg = ret ? "" : o.type === "income" ? "bg-emerald-500/[0.03]" : "bg-rose-500/[0.03]";
              return (
                <tr key={o.id} className={`border-t border-white/5 ${rowBg}`}>
                  <td className="p-3 text-sm text-slate-300">{new Date(o.date).toLocaleDateString("ru-RU")}</td>
                  <td className="p-3 text-sm text-slate-400">{period || monthLabel(String(o.date).slice(0, 7))}</td>
                  <td className="p-3 text-sm text-white">{ret ? "Возврат" : o.type === "income" ? "Доход" : "Расход"} · {catName(o.categoryId)}{o.description ? <span className="block text-[11px] text-slate-500">{o.description}</span> : null}</td>
                  <td className="p-3 text-sm text-slate-400">{accName(o.accountId)}</td>
                  <td className="p-3 text-sm text-slate-400">{o.counterparty || "—"}</td>
                  <td className={`p-3 text-right text-sm font-black ${tone}`}>{ret || o.type === "expense" ? "−" : "+"}{money(o.amount)}</td>
                  <td className="p-3">
                    <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${ret ? "bg-slate-500/15 text-slate-300" : o.status === "planned" ? "bg-amber-400/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{statusLabel(o)}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button disabled={busy} onClick={() => onDelete(o.id)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400" title="Удалить">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-sm text-slate-500">Операций не найдено.</td></tr>}
          </tbody>
        </table>
      </div>
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

function AcctAddOperation({ categories, accounts, busy, defaultType = "expense", onClose, onSubmit }: {
  categories: AcctOverview["categories"]; accounts: AcctOverview["accounts"]; busy: boolean; defaultType?: "income" | "expense";
  onClose: () => void; onSubmit: (p: any) => void;
}) {
  const [type, setType] = useState<"income" | "expense">(defaultType);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#161616] p-5" onClick={(e) => e.stopPropagation()}>
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
            <div className="overflow-x-auto">
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
            </div>
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
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanErr, setScanErr] = useState<string | null>(null);
  // Загрузка скана: изображения уменьшаем до 1400px (читаемость документа), PDF берём как есть
  const onPickScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImg && !isPdf) { setScanErr("Поддерживаются изображения и PDF"); return; }
    if (isPdf && file.size > 8 * 1024 * 1024) { setScanErr("PDF больше 8 МБ — загрузите ссылку на файл"); return; }
    setScanErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (isPdf) { setF((s: any) => ({ ...s, scanUrl: String(reader.result) })); return; }
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { setF((s: any) => ({ ...s, scanUrl: String(reader.result) })); return; }
        ctx.drawImage(img, 0, 0, w, h);
        setF((s: any) => ({ ...s, scanUrl: canvas.toDataURL("image/jpeg", 0.85) }));
      };
      img.onerror = () => setScanErr("Не удалось прочитать изображение");
      img.src = String(reader.result);
    };
    reader.onerror = () => setScanErr("Не удалось загрузить файл");
    reader.readAsDataURL(file);
  };
  const isPdfScan = typeof f.scanUrl === "string" && f.scanUrl.startsWith("data:application/pdf");
  const hasImgScan = typeof f.scanUrl === "string" && f.scanUrl && !isPdfScan;
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
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-400">Скан подписанного договора (изображение / PDF)
              <div className="flex items-center gap-2">
                <input value={isPdfScan ? "" : f.scanUrl} onChange={(e) => setF({ ...f, scanUrl: e.target.value })} className={docInputCls} placeholder="https://… или путь в хранилище" />
                <input ref={scanRef} type="file" accept="image/*,application/pdf" onChange={onPickScan} className="hidden" />
                <button type="button" onClick={() => scanRef.current?.click()} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C5A059]/40 px-3 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10"><Upload className="h-4 w-4" /> Загрузить</button>
              </div>
            </label>
            {scanErr && <p className="text-[11px] text-rose-400">{scanErr}</p>}
            {hasImgScan && <div className="flex items-start gap-2"><img src={f.scanUrl} alt="скан" className="h-32 w-auto max-w-[12rem] rounded-xl border border-white/10 object-contain" /><button type="button" onClick={() => setF({ ...f, scanUrl: "" })} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-400">Убрать</button></div>}
            {isPdfScan && <div className="flex items-center gap-2 text-[11px] text-slate-300"><FileText className="h-4 w-4 text-[#C5A059]" /> PDF загружен<button type="button" onClick={() => setF({ ...f, scanUrl: "" })} className="rounded-lg border border-white/10 px-2 py-1 font-bold text-slate-400 hover:text-rose-400">Убрать</button></div>}
          </div>
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

export function PerformancesView() {
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

      {/* Мобильные карточки выступлений */}
      <div className="space-y-2 md:hidden">
        {loading && <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">Загрузка…</div>}
        {!loading && list.length === 0 && <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">Нет выступлений.</div>}
        {list.map((p) => (
          <button key={p.id} onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
            className={`w-full rounded-[1.5rem] border p-4 text-left ${selectedId === p.id ? "border-[#C5A059]/40 bg-white/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{p.clientName}</p>
                <p className="text-[11px] text-slate-500">{p.eventDate}{p.eventTime ? ` · ${p.eventTime}` : ""} · {PERF_TYPE_LABEL[p.type] || p.type}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${PERF_STATUS[p.status]?.cls}`}>{PERF_STATUS[p.status]?.t}</span>
            </div>
            {p.address && <p className="mt-1 truncate text-[11px] text-slate-500">{p.address}</p>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
              <span className="text-slate-400">Стоимость: <b className="text-white">{money(p.price)}</b></span>
              <span className="text-slate-400">Прибыль: <b className="text-emerald-400">{p.netProfit == null ? "—" : money(p.netProfit)}</b></span>
              <span className="text-slate-400">Остаток: <b className="text-rose-300">{p.outstanding == null ? "—" : money(p.outstanding)}</b></span>
            </div>
          </button>
        ))}
      </div>

      {/* Таблица выступлений */}
      <section className="hidden overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02] md:block">
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
export function ProductsView({ role = "owner", initialTab }: { role?: string; initialTab?: string } = {}) {
  // Роль определяет режим: владелец/управляющий — полный склад; администратор — «касса дня».
  // Заголовок x-demo-role передаётся на бэк, который сам скоупит данные (продажи админа = только сегодня).
  const isCashier = role === "admin";
  const hdr = { headers: { "x-demo-role": role } };
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": role } };

  const [tab, setTab] = useState<"products" | "sales" | "stock" | "receipts" | "writeoffs" | "orders" | "echo" | "echoOrders">((initialTab as any) || (isCashier ? "sales" : "products"));
  const [products, setProducts] = useState<any[]>([]);
  const [echoOrders, setEchoOrders] = useState<any[]>([]);
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
  const [editProduct, setEditProduct] = useState<any | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // Касса (админ): только справочник + сегодняшние продажи. Остальное недоступно по роли.
      const reqs = isCashier
        ? [fetch(`/api/mvp/products`, hdr), fetch(`/api/mvp/products/sales`, hdr), fetch(`/api/mvp/shop/orders`, hdr), fetch(`/api/mvp/shop/echo/orders`, hdr)]
        : [
            fetch(`/api/mvp/products`, hdr),
            fetch(`/api/mvp/products/sales`, hdr),
            fetch(`/api/mvp/products/stock`, hdr),
            fetch(`/api/mvp/products/receipts`, hdr),
            fetch(`/api/mvp/products/overview?period=${period}`, hdr),
            fetch(`/api/mvp/products/writeoffs`, hdr),
            fetch(`/api/mvp/shop/orders`, hdr),
            fetch(`/api/mvp/shop/echo/orders`, hdr),
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
        const EO = all[7]; if (EO?.ok) setEchoOrders((await EO.json()).orders || []);
      } else {
        const ORD = all[2]; if (ORD?.ok) setOrders((await ORD.json()).orders || []);
        const EO = all[3]; if (EO?.ok) setEchoOrders((await EO.json()).orders || []);
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
  const updateProduct = async (p: any) => {
    if (!editProduct) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/mvp/products/${editProduct.id}`, { method: "PATCH", ...jhdr, body: JSON.stringify(p) });
      if (!res.ok) throw new Error(await res.text());
      setEditProduct(null); await load();
    } catch (e: any) { setError(e?.message || "Не удалось изменить товар"); } finally { setBusy(false); }
  };
  const toggleProductActive = async (p: any) => {
    setBusy(true);
    try { await fetch(`/api/mvp/products/${p.id}`, { method: "PATCH", ...jhdr, body: JSON.stringify({ isActive: !(p.isActive !== false) }) }); await load(); }
    catch (e: any) { setError(e?.message || "Не удалось изменить статус"); } finally { setBusy(false); }
  };
  const createSale = (p: any) => post(`/api/mvp/products/sales`, p, "Не удалось оформить продажу");
  const createReceipt = (p: any) => post(`/api/mvp/products/receipts`, p, "Не удалось оформить поступление");
  const createWriteoff = (p: any) => post(`/api/mvp/products/writeoffs`, p, "Не удалось оформить списание");
  const setOrderStatus = async (id: string, status: string) => {
    setBusy(true);
    try { await fetch(`/api/mvp/shop/orders/${id}`, { method: "PATCH", ...jhdr, body: JSON.stringify({ status }) }); await load(); }
    catch (e: any) { setError(e?.message || "Не удалось обновить заказ"); } finally { setBusy(false); }
  };
  // Выдать (issue) / отменить (cancel) заявку на обмен ЭхоБаксов.
  const decideEchoOrder = async (id: string, action: "issue" | "cancel", reason?: string) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/mvp/shop/echo/orders/${id}`, { method: "PATCH", ...jhdr, body: JSON.stringify({ action, reason }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({} as any))).error || "Не удалось обработать заявку");
      await load();
    } catch (e: any) { setError(e?.message || "Не удалось обработать заявку"); } finally { setBusy(false); }
  };

  const cashierRevenue = sales.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const newOrders = orders.filter((o) => o.status === "new").length;
  const ordersLabel = `Заказы${newOrders ? ` (${newOrders})` : ""}`;
  const pendingEcho = echoOrders.filter((o) => o.status === "pending").length;
  const echoOrdersLabel = `Заявки ЭхоБаксов${pendingEcho ? ` (${pendingEcho})` : ""}`;
  const tabs: [typeof tab, string][] = isCashier
    ? [["sales", "Продажи за сегодня"], ["products", "Каталог"], ["orders", ordersLabel], ["echoOrders", echoOrdersLabel]]
    : [["products", "Товары"], ["sales", "Продажи"], ["stock", "Остатки"], ["receipts", "Поступления"], ["writeoffs", "Списания"], ["orders", ordersLabel], ["echo", "ЭхоБаксы"], ["echoOrders", echoOrdersLabel]];

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
        <ModuleTable cols={["Товар", "Категория", "Цена продажи", "ЭхоБаксы", "Остаток", "Статус", ...(isCashier ? [] : ["Действия"])]} empty={products.length === 0}>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-white/5">
              <td className="px-4 py-3 font-bold text-white">
                <div className="flex items-center gap-2.5">
                  {p.photoUrl
                    ? <img src={p.photoUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />
                    : <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-600"><Package className="h-4 w-4" /></div>}
                  <div className="min-w-0">
                    <span>{p.name}</span>
                    {p.description && <p className="max-w-xs truncate text-[11px] font-normal text-slate-500">{p.description}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-400">{p.category || "—"}</td>
              <td className="px-4 py-3 text-right text-white">{money(p.salePrice)}</td>
              <td className="px-4 py-3 text-right">{p.echoPrice > 0 ? <span className="font-bold text-[#C5A059]">{p.echoPrice} ⭐</span> : <span className="text-slate-600">—</span>}</td>
              <td className="px-4 py-3 text-right font-bold text-white">{p.stock} шт.{p.low && <span className="ml-1 text-[10px] text-rose-300">низкий</span>}</td>
              <td className="px-4 py-3">{p.isActive !== false
                ? <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">Активен</span>
                : <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-400">Отключён</span>}</td>
              {!isCashier && (
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditProduct(p)} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-200 hover:border-[#C5A059]/40 hover:text-white">Изменить</button>
                    <button onClick={() => toggleProductActive(p)} disabled={busy} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-white disabled:opacity-50">{p.isActive !== false ? "Отключить" : "Включить"}</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </ModuleTable>
      )}

      {/* ЭХОБАКСЫ — начисление ученикам */}
      {!loading && tab === "echo" && <EchoGrantPanel role={role} />}

      {!loading && tab === "echoOrders" && <EchoOrdersInbox orders={echoOrders} busy={busy} onDecide={decideEchoOrder} />}

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
      {editProduct && <ProductAddModal busy={busy} role={role} initial={editProduct} onClose={() => setEditProduct(null)} onSubmit={updateProduct} />}
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

function ProductAddModal({ busy, onClose, onSubmit, role = "owner", initial = null }: any) {
  const categories = useSettingsList("product_category", role);
  const isEdit = !!initial;
  const [f, setF] = useState<any>({
    name: initial?.name || "", category: initial?.category || "", sku: initial?.sku || "",
    salePrice: initial?.salePrice ?? "", costPrice: initial?.costPrice ?? "", minStock: initial?.minStock ?? "",
    comment: initial?.comment || "", description: initial?.description || "",
    echoPrice: initial?.echoPrice ?? "", isActive: initial ? initial.isActive !== false : true,
    photoUrl: initial?.photoUrl || "",
  });
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  useEffect(() => { if (!f.category && categories[0]) set("category", categories[0].label); /* eslint-disable-next-line */ }, [categories]);

  // Загрузка фото с устройства: уменьшаем до 600px и сжимаем в JPEG, чтобы не раздувать базу
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // позволяем выбрать тот же файл повторно
    if (!file) return;
    if (!file.type.startsWith("image/")) { setGenErr("Выберите файл изображения"); return; }
    setGenErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { set("photoUrl", String(reader.result)); return; }
        ctx.drawImage(img, 0, 0, w, h);
        set("photoUrl", canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => setGenErr("Не удалось прочитать изображение");
      img.src = String(reader.result);
    };
    reader.onerror = () => setGenErr("Не удалось загрузить файл");
    reader.readAsDataURL(file);
  };

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

  const submit = () => { if (!f.name.trim()) return; onSubmit({ ...f, salePrice: Number(f.salePrice) || 0, costPrice: Number(f.costPrice) || 0, minStock: Number(f.minStock) || 0, echoPrice: Number(f.echoPrice) || 0, isActive: !!f.isActive }); };
  return (
    <ModalShell title={isEdit ? "Изменить товар" : "Новый товар"} onClose={onClose}>
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
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1"><ModalInput label="Фото товара (загрузить, ссылка или сгенерировать)" value={f.photoUrl} onChange={(v) => set("photoUrl", v)} placeholder="https://…" full /></div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C5A059]/40 px-3 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10">
            <Upload className="h-4 w-4" /> Загрузить
          </button>
          <button type="button" onClick={generatePhoto} disabled={genBusy} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C5A059]/40 px-3 py-2 text-xs font-black text-[#C5A059] hover:bg-[#C5A059]/10 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {genBusy ? "Генерация…" : "Сгенерировать"}
          </button>
        </div>
        {genErr && <p className="mt-1 text-[11px] text-rose-400">{genErr}</p>}
        {f.photoUrl ? (
          <div className="mt-2 flex items-start gap-2">
            <img src={f.photoUrl} alt="" className="h-32 w-32 rounded-xl object-cover" />
            <button type="button" onClick={() => set("photoUrl", "")} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-400">Убрать</button>
          </div>
        ) : null}
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-slate-400 sm:col-span-2">Описание (показывается в кабинете ученика)
        <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Короткое описание товара / награды" className="resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600" />
      </label>
      <ModalInput label="Цена в ЭхоБаксах (0 — не в магазине наград)" type="number" value={f.echoPrice} onChange={(v) => set("echoPrice", v)} />
      <label className="flex items-center gap-2 self-end text-sm text-slate-200">
        <input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-[#C5A059]" />
        Товар активен (виден в магазине и кассе)
      </label>
      <ModalInput label="Комментарий (внутренний)" value={f.comment} onChange={(v) => set("comment", v)} full />
      <ModalActions busy={busy} onClose={onClose} onSubmit={submit} submitLabel={isEdit ? "Сохранить" : "Создать"} />
    </ModalShell>
  );
}

// Панель начисления ЭхоБаксов ученикам (владелец/управляющий/админ).
export function EchoGrantPanel({ role }: { role: string }) {
  const hdr = { headers: { "x-demo-role": role } };
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": role } };
  const [students, setStudents] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<any | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [wallet, setWallet] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const loadStudents = async () => {
    try { const r = await fetch("/api/mvp/shop/echo/students", hdr); if (r.ok) setStudents((await r.json()).students || []); }
    catch { /* ignore */ }
  };
  useEffect(() => { loadStudents(); /* eslint-disable-next-line */ }, []);
  const openStudent = async (s: any) => {
    setSel(s); setWallet(null); setErr(null); setOk(null);
    try { const r = await fetch(`/api/mvp/shop/echo/wallet?studentId=${encodeURIComponent(s.id)}`, hdr); if (r.ok) setWallet(await r.json()); } catch { /* ignore */ }
  };
  const grant = async (sign: number) => {
    if (!sel) return;
    const amt = (Number(amount) || 0) * sign;
    if (!amt) { setErr("Укажите количество ЭхоБаксов"); return; }
    setBusy(true); setErr(null); setOk(null);
    try {
      const res = await fetch("/api/mvp/shop/echo/grant", { method: "POST", ...jhdr, body: JSON.stringify({ studentId: sel.id, amount: amt, reason }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Не удалось");
      const j = await res.json();
      setOk(`${amt > 0 ? "Начислено" : "Списано"} ${Math.abs(amt)} ⭐. Баланс: ${j.balance} ⭐`);
      setAmount(""); setReason("");
      await Promise.all([loadStudents(), openStudent({ ...sel })]);
    } catch (e: any) { setErr(e?.message || "Ошибка"); } finally { setBusy(false); }
  };

  const filtered = students.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск ученика…" className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#C5A059]/40 focus:outline-none" />
        </div>
        <div className="mt-2 max-h-[420px] space-y-1 overflow-y-auto">
          {filtered.length === 0 && <p className="py-6 text-center text-xs text-slate-500">Учеников нет</p>}
          {filtered.map((s) => (
            <button key={s.id} onClick={() => openStudent(s)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${sel?.id === s.id ? "border border-[#C5A059]/25 bg-[#C5A059]/10 text-white" : "text-slate-300 hover:bg-white/5"}`}>
              <span className="truncate">{s.name}</span>
              <span className="ml-2 shrink-0 font-bold text-[#C5A059]">{s.balance} ⭐</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        {!sel ? (
          <p className="py-16 text-center text-sm text-slate-500">Выберите ученика слева, чтобы начислить или списать ЭхоБаксы.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-white">{sel.name}</h3>
                <p className="text-xs text-slate-500">Баланс кошелька</p>
              </div>
              <p className="shrink-0 text-3xl font-black text-[#C5A059] tabular-nums">{wallet?.balance ?? sel.balance} ⭐</p>
            </div>
            {err && <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
            {ok && <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{ok}</p>}
            <div className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr]">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Кол-во ⭐" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#C5A059]/40 focus:outline-none" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="За что (напр. «Победа на конкурсе», «Без пропусков»)" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#C5A059]/40 focus:outline-none" />
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => grant(1)} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black hover:bg-[#d4af6a] disabled:opacity-50"><Plus className="h-4 w-4" /> Начислить</button>
              <button onClick={() => grant(-1)} disabled={busy} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-50">Списать</button>
            </div>

            <h4 className="mt-6 text-[11px] uppercase tracking-wider text-slate-500">История операций</h4>
            <div className="mt-2 space-y-1.5">
              {(!wallet || wallet.transactions.length === 0) && <p className="py-4 text-center text-xs text-slate-600">Операций пока нет</p>}
              {wallet?.transactions?.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className={`font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-rose-300"}`}>{t.amount >= 0 ? "+" : ""}{t.amount} ⭐</span>
                    <span className="ml-2 text-slate-400">{t.reason || (t.kind === "purchase" ? "Покупка" : "Начисление")}</span>
                  </div>
                  <span className="ml-2 shrink-0 text-[11px] text-slate-600">{t.createdAt ? new Date(t.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : ""}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// Инбокс заявок на обмен ЭхоБаксов (ТЗ «Магазин» Блок 1): персонал видит заявки
// своего филиала, подтверждает выдачу (списываются баксы + товар со склада) или
// отменяет с причиной.
const ECHO_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "🟡 Ожидает выдачи", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  issued: { label: "🟢 Выдано", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  cancelled: { label: "🔴 Отменено", cls: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
};
function EchoOrdersInbox({ orders, busy, onDecide }: { orders: any[]; busy: boolean; onDecide: (id: string, action: "issue" | "cancel", reason?: string) => void }) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const shown = filter === "pending" ? orders.filter((o) => o.status === "pending") : orders;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const fmtDate = (s?: string) => s ? new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([["pending", `Ожидают выдачи${pendingCount ? ` (${pendingCount})` : ""}`], ["all", "Все заявки"]] as [typeof filter, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`rounded-full px-4 py-1.5 text-xs font-black transition ${filter === id ? "bg-[#C5A059] text-black" : "border border-white/10 text-slate-400 hover:text-white"}`}>{label}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] py-16 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">{filter === "pending" ? "Нет заявок, ожидающих выдачи." : "Заявок на обмен ЭхоБаксов пока нет."}</p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((o) => {
            const st = ECHO_STATUS_META[o.status] || ECHO_STATUS_META.pending;
            const enough = (Number(o.balance) || 0) >= (Number(o.echoPrice) || 0);
            return (
              <article key={o.id} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#121212]">
                <div className="flex gap-4 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-black">
                    {o.productPhoto ? <img src={o.productPhoto} alt={o.productName} className="h-full w-full object-cover" /> : <ShoppingBag className="h-8 w-8 text-[#C5A059]/60" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-base font-black text-white">{o.productName}</h3>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-black text-[#C5A059]">{o.echoPrice} ⭐</p>
                    <p className="mt-1 truncate text-sm font-bold text-white">{o.studentName || "Ученик"}</p>
                    <p className="text-[11px] text-slate-500">
                      {[o.branchName && `📍 ${o.branchName}`, o.groupName && `👥 ${o.groupName}`, o.teacherName && `👨‍🏫 ${o.teacherName}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Баланс: <span className={enough ? "text-emerald-400" : "text-rose-300"}>{o.balance} ⭐</span> · Заявка: {fmtDate(o.createdAt)}
                    </p>
                    {o.status === "cancelled" && o.cancelReason && <p className="mt-1 text-[11px] text-rose-300/80">Причина отмены: {o.cancelReason}</p>}
                    {o.status !== "pending" && o.decidedBy && <p className="text-[11px] text-slate-600">{o.status === "issued" ? "Выдал" : "Отменил"}: {o.decidedBy} · {fmtDate(o.decidedAt)}</p>}
                  </div>
                </div>

                {o.status === "pending" && (
                  <div className="border-t border-white/5 bg-black/20 p-3">
                    {cancelId === o.id ? (
                      <div className="space-y-2">
                        <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина отмены (необязательно)"
                          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600" />
                        <div className="flex gap-2">
                          <button disabled={busy} onClick={() => { onDecide(o.id, "cancel", reason.trim() || undefined); setCancelId(null); setReason(""); }}
                            className="flex-1 rounded-xl bg-rose-500/90 px-3 py-2 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50">Подтвердить отмену</button>
                          <button disabled={busy} onClick={() => { setCancelId(null); setReason(""); }}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 hover:text-white">Назад</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button disabled={busy || !enough} title={enough ? "" : "У ученика недостаточно ЭхоБаксов"} onClick={() => onDecide(o.id, "issue")}
                          className={`flex-1 rounded-xl px-3 py-2 text-xs font-black transition ${enough ? "bg-emerald-500/90 text-white hover:bg-emerald-500" : "cursor-not-allowed border border-white/10 text-slate-500"}`}>✅ Выдать товар</button>
                        <button disabled={busy} onClick={() => setCancelId(o.id)}
                          className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-black text-rose-300 hover:bg-rose-500/10">Отменить</button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
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
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-[#141414] p-6 shadow-2xl">
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
            <div className="overflow-x-auto">
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
function MarketingView({ studentArchive = [], branches = [], groups = [], teachers = [] }: { studentArchive?: any[]; branches?: Branch[]; groups?: Group[]; teachers?: Teacher[] }) {
  // Две вкладки (ТЗ 13.07): рассылка архивированным ушедшим и рекламный оффер от ИИ.
  const [mkTab, setMkTab] = useState<"broadcast" | "offer">("broadcast");
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
    <OwnerScreen title="Маркетинг" subtitle="Возврат ушедших и набор новых: рассылка по архиву и рекламные офферы, которые ИИ собирает под конкретную группу, филиал и аудиторию.">
      {/* Вкладки маркетинга */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "broadcast", label: "Рассылка ушедшим", icon: Send },
          { id: "offer", label: "Рекламный оффер (ИИ)", icon: Sparkles },
        ] as { id: typeof mkTab; label: string; icon: React.ElementType }[]).map((t) => {
          const TabIcon = t.icon;
          return (
            <button key={t.id} onClick={() => setMkTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${mkTab === t.id ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#C5A059]/40 hover:text-white"}`}>
              <TabIcon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {mkTab === "offer" && <AdOfferStudio groups={groups} branches={branches} teachers={teachers} />}

      {mkTab === "broadcast" && (<>
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

      {/* Мобильные карточки архива для рассылки */}
      <div className="space-y-2 md:hidden">
        {list.length === 0 && <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">Архив пуст — приглашать пока некого.</div>}
        {list.map((a) => (
          <div key={a.id} className={`rounded-[1.5rem] border border-white/10 p-3.5 ${sent.has(a.id) ? "bg-emerald-500/[0.04]" : "bg-white/[0.02]"}`}>
            <div className="flex items-start gap-2.5">
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="mt-1 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{a.name}{sent.has(a.id) && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">приглашён</span>}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{branchName(a.branchId)} · {a.phone || a.parentPhone || "—"}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{a.archiveReason || "—"}{a.archivedAt ? ` · с ${new Date(a.archivedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
              </div>
              {phoneOf(a)
                ? <a href={waLink(a)} target="_blank" rel="noreferrer" onClick={() => setSent((s) => new Set(s).add(a.id))} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#25D366]/40 px-2.5 py-1.5 text-[11px] font-bold text-[#25D366]"><Send className="h-3.5 w-3.5" /> WA</a>
                : <span className="shrink-0 text-[11px] text-slate-600">нет тел.</span>}
            </div>
          </div>
        ))}
      </div>

      <section className="hidden overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02] md:block">
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
      </>)}
    </OwnerScreen>
  );
}

// ---------- Рекламный оффер (ИИ) ----------
// Владелец выбирает группу с ОТКРЫТЫМ набором — ИИ собирает объявление:
// заголовок, текст, CTA, на кого таргетировать и хэштеги. Учитываются филиал,
// адрес, расписание, возраст и свободные места. Если ключ Gemini не настроен —
// собираем оффер по шаблону из тех же данных.
function AdOfferStudio({ groups, branches, teachers }: { groups: Group[]; branches: Branch[]; teachers: Teacher[] }) {
  const openGroups = groups.filter((g) => (g as any).status !== "archived" && g.enrollmentOpen !== false);
  const [groupId, setGroupId] = useState<string>("");
  const [wishes, setWishes] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<{ headline: string; offer: string; cta: string; audience: string; hashtags: string[]; source: "ai" | "template" } | null>(null);
  const [copied, setCopied] = useState(false);

  const g = openGroups.find((x) => x.id === groupId) || null;
  const branch = g ? branches.find((b) => b.id === g.branchId) : null;
  const teacher = g ? teachers.find((t) => t.id === g.teacherId) : null;
  const freeSpots = g && (g.capacity || 0) > 0 ? Math.max(0, (g.capacity || 0) - (g.studentCount || 0)) : null;

  // Резервный оффер без ИИ — из тех же данных, что уходят в промпт.
  const templateOffer = () => ({
    headline: `Набор в группу «${g!.name}» — ${branch?.name || "Эхо Гор"}`,
    offer: `Открыт набор в группу «${g!.name}» школы кавказского танца «Эхо Гор»${branch ? ` (филиал ${branch.name}${branch.address ? `, ${branch.address}` : ""})` : ""}. ${g!.ageGroup && g!.ageGroup !== "Все возрасты" ? `Приглашаем учеников ${g!.ageGroup}. ` : ""}Занятия: ${g!.scheduleText || "по расписанию"}.${teacher ? ` Педагог — ${teacher.name}.` : ""} Осанка, характер, культура и сцена — всё по-настоящему.${freeSpots !== null && freeSpots > 0 ? ` Свободно всего ${freeSpots} мест.` : ""}`,
    cta: "Запишитесь на бесплатный пробный урок — просто ответьте на это объявление.",
    audience: `Родители детей${g!.ageGroup && g!.ageGroup !== "Все возрасты" ? ` ${g!.ageGroup}` : ""} рядом с адресом филиала${branch?.address ? ` (${branch.address})` : ""}; интересы: танцы, спорт, культура Кавказа.`,
    hashtags: ["#эхогор", "#кавказскиетанцы", "#лезгинка", branch?.city ? `#${String(branch.city).toLowerCase().replace(/\s+/g, "")}` : "#танцыдлядетей"],
    source: "template" as const,
  });

  const generate = async () => {
    if (!g) { setNote("Сначала выберите группу."); return; }
    setBusy(true); setNote(null); setCopied(false);
    try {
      const res = await fetch("/api/gemini/ad-offer", {
        method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: JSON.stringify({
          groupName: g.name,
          branchName: branch?.name || "",
          address: branch?.address || "",
          schedule: g.scheduleText || "",
          ageGroup: g.ageGroup || "",
          teacherName: teacher?.name || "",
          freeSpots,
          extraWishes: wishes,
        }),
      });
      if (res.status === 503) {
        setResult(templateOffer());
        setNote("ИИ недоступен (не настроен ключ Gemini) — собрал оффер по шаблону из данных группы.");
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Ошибка генерации");
      const d = await res.json();
      setResult({ headline: d.headline || "", offer: d.offer || "", cta: d.cta || "", audience: d.audience || "", hashtags: Array.isArray(d.hashtags) ? d.hashtags : [], source: "ai" });
    } catch (e: any) {
      setResult(templateOffer());
      setNote(`ИИ не ответил (${e?.message || "ошибка"}) — собрал оффер по шаблону.`);
    } finally { setBusy(false); }
  };

  const fullText = result ? `${result.headline}\n\n${result.offer}\n\n${result.cta}\n\n${(result.hashtags || []).join(" ")}` : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no-op */ }
  };

  const field = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Оффер для рекламного креатива</p>
        <p className="mt-1 text-xs text-slate-500">Выберите группу с открытым набором — ИИ соберёт объявление с учётом филиала, адреса, расписания и аудитории. Статус набора переключается на дашборде: Удержание → «Рекомендации по набору».</p>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setResult(null); }} className={field}>
            <option value="">Группа (набор открыт)</option>
            {openGroups.map((x) => {
              const b = branches.find((bb) => bb.id === x.branchId);
              const free = (x.capacity || 0) > 0 ? Math.max(0, (x.capacity || 0) - (x.studentCount || 0)) : null;
              return <option key={x.id} value={x.id}>{x.name} · {b?.name || "—"}{free !== null ? ` · свободно ${free}` : ""}</option>;
            })}
          </select>
          <input value={wishes} onChange={(e) => setWishes(e.target.value)} placeholder="Пожелания к офферу (акция, тон, акцент) — не обязательно" className={field} />
          <button onClick={generate} disabled={busy || !groupId}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {busy ? "Генерация…" : "Сформировать оффер"}
          </button>
        </div>
        {openGroups.length === 0 && <p className="mt-3 text-xs text-amber-400">Нет групп с открытым набором. Откройте набор на дашборде: Удержание → «Рекомендации по набору».</p>}
        {g && (
          <p className="mt-3 text-[11px] text-slate-500">
            В оффер уйдёт: {branch?.name || "—"}{branch?.address ? ` · ${branch.address}` : ""} · {g.scheduleText || "расписание не задано"} · {g.ageGroup || "все возрасты"}{teacher ? ` · педагог ${teacher.name}` : ""}{freeSpots !== null ? ` · свободно ${freeSpots} мест` : " · вместимость не задана"}
          </p>
        )}
        {note && <p className="mt-2 text-xs text-amber-400">{note}</p>}
      </section>

      {result && (
        <section className="rounded-[1.75rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#19160f] to-black p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">{result.source === "ai" ? "Оффер от ИИ" : "Оффер по шаблону"}</p>
              <h3 className="mt-2 text-lg font-black text-white">{result.headline}</h3>
            </div>
            <button onClick={copy} className="shrink-0 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#C5A059] transition hover:bg-[#C5A059] hover:text-black">
              {copied ? "Скопировано ✓" : "Скопировать"}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{result.offer}</p>
          <p className="mt-3 text-sm font-bold text-emerald-300">{result.cta}</p>
          {result.hashtags?.length > 0 && (
            <p className="mt-2 text-xs text-[#C5A059]">{result.hashtags.join(" ")}</p>
          )}
          {result.audience && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Кому показывать (таргетинг)</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{result.audience}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

type SettingsSub = "staff" | "plans" | "statuses" | "dicts";
const SETTINGS_SUBS: { id: SettingsSub; label: string; icon: React.ElementType }[] = [
  { id: "staff", label: "Сотрудники", icon: Users },
  { id: "plans", label: "Тарифы", icon: Coins },
  { id: "statuses", label: "Статусы учеников", icon: ClipboardList },
  { id: "dicts", label: "Справочники", icon: Settings },
];

// Редактор оплаты управляющих (только владелец): оклад + бонусы за уровни плана БДР.
// Значения читает вкладка «Мой KPI / P&L» у управляющего.
function ManagerCompensationEditor() {
  const [baseSalary, setBaseSalary] = useState(0);
  const [tiers, setTiers] = useState<{ threshold: number; bonus: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mvp/manager/compensation", { headers: { "x-demo-role": "owner" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setBaseSalary(Number(d.baseSalary) || 0); setTiers(Array.isArray(d.tiers) ? d.tiers : []); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setTier = (i: number, key: "threshold" | "bonus", v: number) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [key]: v } : t)));
  const addTier = () => setTiers((prev) => [...prev, { threshold: 0, bonus: 0 }]);
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/mvp/manager/compensation", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-demo-role": "owner" },
        body: JSON.stringify({ baseSalary, tiers }),
      });
      setMsg(res.ok ? "Сохранено ✓" : "Ошибка сохранения");
    } catch {
      setMsg("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Оплата управляющих</h3>
          <p className="mt-1 text-xs text-slate-500">Оклад + бонусы за уровни выполнения плана БДР. Управляющий видит это в своём кабинете («Мой KPI / P&L»): текущая и потенциальная зарплата.</p>
        </div>
        <button onClick={save} disabled={saving || loading} className="rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Загрузка…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="max-w-xs">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Оклад (₸ / месяц)</label>
            <input type="number" min={0} value={baseSalary} onChange={(e) => setBaseSalary(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#C5A059]/50" />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Бонусы за уровни плана</p>
            <div className="mt-2 space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">при</span>
                  <input type="number" min={0} value={t.threshold} onChange={(e) => setTier(i, "threshold", Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 rounded-xl border border-white/10 bg-black/40 px-2 py-1.5 text-sm font-semibold text-white outline-none focus:border-[#C5A059]/50" />
                  <span className="text-xs text-slate-500">% плана → бонус</span>
                  <input type="number" min={0} value={t.bonus} onChange={(e) => setTier(i, "bonus", Math.max(0, Number(e.target.value) || 0))}
                    className="w-32 rounded-xl border border-white/10 bg-black/40 px-2 py-1.5 text-sm font-semibold text-[#C5A059] outline-none focus:border-[#C5A059]/50" />
                  <span className="text-xs text-slate-500">₸</span>
                  <button onClick={() => removeTier(i)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 hover:border-rose-500/40 hover:text-rose-400">Удалить</button>
                </div>
              ))}
            </div>
            <button onClick={addTier} className="mt-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-[#C5A059]/40">+ Добавить уровень</button>
          </div>

          {msg && <p className={`text-sm ${msg.includes("✓") ? "text-emerald-400" : "text-rose-400"}`}>{msg}</p>}
        </div>
      )}
    </section>
  );
}

function NetworkSettingsView({ branches, teachers, subscriptionPlans = [], onCreatePlan, onUpdatePlan, onDeletePlan }: { branches: Branch[]; teachers: Teacher[]; subscriptionPlans?: SubscriptionPlan[]; onCreatePlan?: (data: any) => Promise<boolean>; onUpdatePlan?: (id: string, data: any) => Promise<boolean>; onDeletePlan?: (id: string) => Promise<boolean> }) {
  const [showStatusSettings, setShowStatusSettings] = useState(false);
  const [sub, setSub] = useState<SettingsSub>("staff");
  return (
    <OwnerScreen title="Настройки сети" subtitle="Всё управление в одном месте: сотрудники и доступы, тарифы, статусы учеников, справочники.">
      {/* Подвкладки — вся конфигурация сети собрана и разложена по разделам. */}
      <div className="flex flex-wrap gap-2">
        {SETTINGS_SUBS.map((s) => {
          const Icon = s.icon;
          const active = sub === s.id;
          return (
            <button key={s.id} onClick={() => setSub(s.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${active ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"}`}>
              <Icon className="h-4 w-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {sub === "staff" && (
        <div className="space-y-5">
          <EmployeesManager branches={branches} />
          {/* Оплата управляющих: оклад + бонусы за уровни выполнения плана БДР. */}
          <ManagerCompensationEditor />
        </div>
      )}

      {sub === "plans" && (
        <div className="space-y-5">
          <SubscriptionPlansManager plans={subscriptionPlans} branches={branches} onCreatePlan={onCreatePlan} onUpdatePlan={onUpdatePlan} onDeletePlan={onDeletePlan} />
          {/* Каталог костюмов для проката: владелец/управляющий заводят, админ выдаёт/принимает. */}
          <CostumeCatalogSettings role="owner" />
        </div>
      )}

      {sub === "statuses" && (
        <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Статусы учеников</h3>
              <p className="mt-1 text-xs text-slate-500">Цвета автостатусов и список ручных статусов (Каникулы, Заморозка и т.д.). Автостатусы система ставит сама — их переименовать нельзя.</p>
            </div>
            <button onClick={() => setShowStatusSettings(true)} className="rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
              Настроить статусы
            </button>
          </div>
        </section>
      )}
      {showStatusSettings && <StatusSettings roleHeader="owner" onClose={() => setShowStatusSettings(false)} />}

      {sub === "dicts" && (
        <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Справочники</h3>
          <p className="mt-1 text-xs text-slate-500">Эти списки используются в выпадающих полях. Управленцы и администраторы выбирают из готовых значений.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <LeadSourcesEditor />
            <SettingsListEditor kind="performance_type" title="Типы выступлений" />
            <SettingsListEditor kind="product_category" title="Категории товаров" />
            <SettingsListEditor kind="group_level" title="Уровни групп" />
            <SettingsListEditor kind="penalty_reason" title="Причины штрафов" />
            <SettingsListEditor kind="document_category" title="Категории документов" />
          </div>
          <div className="mt-4 rounded-2xl border border-white/5 bg-black/30 p-4 text-xs text-slate-500">
            <p className="font-bold text-slate-300">Настройки, живущие в своих разделах (по контексту):</p>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li><span className="text-slate-300">Залы</span> — вкладка «Филиалы» (у каждого филиала свои залы).</li>
              <li><span className="text-slate-300">Статьи доходов/расходов, счета</span> — вкладка «Бухгалтерия» → «Настройки».</li>
              <li><span className="text-slate-300">Мотивация (бонусы за план)</span> — вкладка «Планирование (БДР)».</li>
            </ul>
          </div>
        </section>
      )}
    </OwnerScreen>
  );
}

// ── Раздел «Сотрудники» (Настройки сети): администраторы и управляющие. ────────
// Заводим учётные записи с логином/паролем/ролью/статусом/филиалами (до 2) —
// эти данные работают при входе (миграция 046). Педагоги добавляются во вкладке
// «Преподаватели»; здесь — только admin и branch_manager.
type StaffRow = { id: string; name: string; login: string; role: string; status: string; branchIds?: string[]; branchId?: string | null; hasPassword?: boolean };
const STAFF_ROLE_LABEL: Record<string, string> = { admin: "Администратор", branch_manager: "Управляющий", teacher: "Преподаватель", owner: "Владелец" };

function EmployeesManager({ branches }: { branches: Branch[] }) {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/mvp/staff", { headers: { "x-demo-role": "owner" } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || `Ошибка ${r.status}`); return; }
      setRows(d.staff || []);
    } catch { setErr("Нет связи с сервером"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (row: StaffRow) => {
    if (!window.confirm(`Удалить сотрудника «${row.name}»? Вход в систему станет недоступен.`)) return;
    try {
      const r = await fetch(`/api/mvp/teachers/${row.id}`, { method: "DELETE", headers: { "x-demo-role": "owner" } });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d?.error || "Не удалось удалить"); return; }
      await load(); requestDataRefresh();
    } catch { setErr("Нет связи с сервером"); }
  };

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row: StaffRow) => { setEditing(row); setShowForm(true); };

  const branchLabel = (ids?: string[], single?: string | null) => {
    const list = (ids && ids.length ? ids : (single ? [single] : []));
    if (!list.length) return "—";
    return list.map((id) => branches.find((b) => b.id === id)?.name || "?").join(", ");
  };

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Сотрудники · администраторы и управляющие</h3>
          <p className="mt-1 text-xs text-slate-500">Логин, пароль, роль, статус и филиалы (до 2). Эти данные работают при входе в личный кабинет. Педагогов добавляйте во вкладке «Преподаватели».</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-black text-black transition hover:bg-[#d4b06a]">
          <Plus className="h-4 w-4" /> Добавить сотрудника
        </button>
      </div>

      {err && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{err}</p>}

      <div className="mt-4 space-y-2">
        {loading && <p className="text-xs text-slate-500">Загрузка…</p>}
        {!loading && rows.length === 0 && <p className="text-xs text-slate-600">Пока нет администраторов и управляющих. Нажмите «Добавить сотрудника».</p>}
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{row.name}</span>
                <span className="rounded-full bg-[#C5A059]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#C5A059]">{STAFF_ROLE_LABEL[row.role] || row.role}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${row.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>{row.status === "active" ? "Активен" : "Неактивен"}</span>
                {!row.hasPassword && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">нет пароля</span>}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Логин: <span className="text-slate-300">{row.login || "—"}</span> · Филиалы: {branchLabel(row.branchIds, row.branchId)}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => openEdit(row)} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/10" title="Редактировать"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(row)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" title="Удалить"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <EmployeeForm
          branches={branches}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await load(); requestDataRefresh(); }}
        />
      )}
    </section>
  );
}

function EmployeeForm({ branches, initial, onClose, onSaved }: { branches: Branch[]; initial: StaffRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name || "");
  const [login, setLogin] = useState(initial?.login || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initial?.role === "branch_manager" ? "branch_manager" : "admin");
  const [status, setStatus] = useState(initial?.status === "inactive" ? "inactive" : "active");
  const [branchIds, setBranchIds] = useState<string[]>(initial?.branchIds && initial.branchIds.length ? initial.branchIds : (initial?.branchId ? [initial.branchId] : []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hdr = { "Content-Type": "application/json", "x-demo-role": "owner" };

  const toggleBranch = (id: string) => {
    setBranchIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return cur; // максимум 2 филиала
      return [...cur, id];
    });
  };

  const save = async () => {
    if (!name.trim()) { setErr("Введите имя"); return; }
    if (!login.trim()) { setErr("Введите логин"); return; }
    if (!isEdit && !password) { setErr("Задайте пароль для входа"); return; }
    setBusy(true); setErr(null);
    const body: any = { name: name.trim(), login: login.trim(), role, status, branchIds };
    if (password) body.password = password;
    try {
      const url = isEdit ? `/api/mvp/teachers/${initial!.id}` : "/api/mvp/teachers";
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: hdr, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || `Ошибка ${r.status}`); return; }
      onSaved();
    } catch { setErr("Нет связи с сервером"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[10040] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-[#161616] to-[#0A0A0A] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">{isEdit ? "Редактировать сотрудника" : "Новый сотрудник"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 block">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Имя *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Фамилия Имя" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/60" />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Логин *</span>
            <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Телефон или логин" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/60" />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{isEdit ? "Новый пароль" : "Пароль *"}</span>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? "Оставьте пустым — без изменений" : "Пароль для входа"} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/60" />
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Роль</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/60">
              <option value="admin">Администратор</option>
              <option value="branch_manager">Управляющий</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Статус</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/60">
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Филиалы (до 2)</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {branches.length === 0 && <span className="text-xs text-slate-600">Сначала создайте филиалы во вкладке «Филиалы».</span>}
              {branches.map((b) => {
                const on = branchIds.includes(b.id);
                const disabled = !on && branchIds.length >= 2;
                return (
                  <button key={b.id} type="button" onClick={() => toggleBranch(b.id)} disabled={disabled}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${on ? "bg-[#C5A059] text-black" : disabled ? "border border-white/5 text-slate-600" : "border border-white/10 text-slate-300 hover:bg-white/10"}`}>
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {err && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5">Отмена</button>
          <button onClick={save} disabled={busy} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-black text-black transition hover:bg-[#d4b06a] disabled:opacity-50">{busy ? "Сохранение…" : "Сохранить"}</button>
        </div>
      </div>
    </div>
  );
}

// Редактор рекламных источников (lead_sources): откуда ученики узнают о студии.
// Значения появляются в поле «Рекламный источник» карточки ученика и в отчётах.
function LeadSourcesEditor() {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": "owner" } };

  const load = async () => {
    try {
      const r = await fetch("/api/mvp/lead-sources", { headers: { "x-demo-role": "owner" } });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.sources || []);
    } catch { /* пусто */ }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const name = val.trim();
    if (!name) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/mvp/lead-sources", { method: "POST", ...jhdr, body: JSON.stringify({ name }) });
      if (!r.ok) { const b = await r.json().catch(() => ({})); setErr(b.error || `Ошибка ${r.status}`); return; }
      setVal(""); await load();
    } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/mvp/lead-sources/${id}`, { method: "DELETE", headers: { "x-demo-role": "owner" } });
      if (!r.ok) { const b = await r.json().catch(() => ({})); setErr(b.error || `Ошибка ${r.status}`); return; }
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Рекламные источники</p>
      <p className="mt-1 text-[10px] text-slate-600">Откуда узнают о студии: Instagram, сарафан и т.д. Выбираются в карточке ученика, считаются в отчётах по рекламе.</p>
      <div className="mt-3 space-y-1.5">
        {items.length === 0 && <p className="text-xs text-slate-600">Пока пусто — добавьте первый источник.</p>}
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-1.5">
            <span className="text-sm text-slate-200">{it.name}</span>
            <button onClick={() => remove(it.id)} disabled={busy} className="text-slate-500 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      {err && <p className="mt-2 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300">{err}</p>}
      <div className="mt-3 flex gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Например: Instagram" className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#C5A059]/50" />
        <button onClick={add} disabled={busy || !val.trim()} className="rounded-lg bg-[#C5A059] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40">Добавить</button>
      </div>
    </div>
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

// ===================== ОТЧЁТНОСТЬ (единый аналитический центр) =====================
const REPORT_PERIODS: [string, string][] = [["today", "Сегодня"], ["yesterday", "Вчера"], ["week", "Неделя"], ["month", "Месяц"], ["quarter", "Квартал"], ["year", "Год"]];
const PAY_TYPE_LABEL: Record<string, string> = { subscription: "Абонемент", single: "Разовое", uniform: "Форма / товары", concert: "Выступление" };
const PAY_METHOD_RU: Record<string, string> = { card: "Карта", cash: "Наличные", transfer: "Перевод", kaspi: "Kaspi" };

function ReportsView({ students = [], payments = [], branches = [], groups = [], teachers = [], leadSources = [] }: any) {
  const [tab, setTab] = useState<"fin" | "subs" | "trials" | "marketing" | "ai" | "history">("fin");
  const [period, setPeriod] = useState("month");
  const [scope, setScope] = useState("all");
  const [opType, setOpType] = useState("all");
  const [comment, setComment] = useState("");
  const [snapshots, setSnapshots] = useState<any[]>([]);

  useEffect(() => {
    try {
      const c = window.localStorage.getItem("echogor_report_comment"); if (c) setComment(c);
      const s = window.localStorage.getItem("echogor_report_snaps"); if (s) setSnapshots(JSON.parse(s));
    } catch { /* no-op */ }
  }, []);

  const r = useMemo(() => clientPeriodRange(period), [period]);
  const inScope = (branchId: string) => scope === "all" || branchId === scope;
  const inCur = (date: string) => date >= r.cur.start && date <= r.cur.end;
  const inRange = (date: string, rg: { start: string; end: string }) => date >= rg.start && date <= rg.end;

  const curPays = useMemo(() => payments.filter((p: Payment) => inScope(p.branchId) && inCur(p.date)), [payments, r, scope]);
  const scopedStudents = useMemo(() => students.filter((s: Student) => inScope(s.branchId)), [students, scope]);

  const revenue = (list: Payment[]) => list.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const branchName = (id: string) => branches.find((b: any) => (b.id || b.branchId) === id)?.name || "—";
  const studentName = (id: string) => students.find((s: Student) => s.id === id)?.name || "—";

  const filteredOps = useMemo(() => curPays.filter((p: Payment) => opType === "all" || p.type === opType), [curPays, opType]);

  // ── экспорт ──
  const download = (name: string, content: string, mime: string) => {
    const blob = new Blob(["﻿" + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };
  const exportExcel = () => {
    const header = ["Дата", "Ученик", "Тип", "Способ", "Сумма", "Статус"];
    const body = filteredOps.map((p: Payment) => [p.date, studentName(p.studentId), PAY_TYPE_LABEL[p.type] || p.type, PAY_METHOD_RU[p.method] || p.method, p.amount, p.status === "paid" ? "Проведён" : "Ожидание"]);
    body.push(["ИТОГО", "", "", "", revenue(filteredOps), ""]);
    const csv = [header, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    download(`otchet_${period}_${r.cur.start}.csv`, csv, "text/csv;charset=utf-8;");
  };
  const summaryText = () => `Отчёт «Эхо Гор» за период ${r.cur.start}–${r.cur.end}\nПоступления: ${money(revenue(curPays))}\nОпераций: ${curPays.length}\nУчеников в области: ${scopedStudents.length}`;
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(summaryText())}`, "_blank");
  const shareEmail = () => window.open(`mailto:?subject=${encodeURIComponent("Отчёт Эхо Гор")}&body=${encodeURIComponent(summaryText())}`, "_blank");
  const exportPdf = () => window.print();

  const saveSnapshot = () => {
    const snap = { id: Date.now(), period, scope: scope === "all" ? "Вся сеть" : branchName(scope), date: new Date().toLocaleString("ru-RU"), revenue: revenue(curPays), ops: curPays.length };
    const next = [snap, ...snapshots].slice(0, 20);
    setSnapshots(next);
    try { window.localStorage.setItem("echogor_report_snaps", JSON.stringify(next)); } catch { /* no-op */ }
  };
  const saveComment = () => { try { window.localStorage.setItem("echogor_report_comment", comment); } catch { /* no-op */ } };

  const tabs: { id: typeof tab; label: string; icon: React.ElementType }[] = [
    { id: "fin", label: "Финансовые операции", icon: Receipt },
    { id: "subs", label: "Абонементы", icon: WalletCards },
    { id: "trials", label: "Пробные и отказы", icon: Filter },
    { id: "marketing", label: "Маркетинг", icon: Send },
    { id: "ai", label: "AI-отчёты", icon: Sparkles },
    { id: "history", label: "История", icon: Clock },
  ];

  return (
    <OwnerScreen title="Отчётность" subtitle="Единый аналитический центр: что произошло, почему и что делать дальше. Финансы, абонементы, пробные и отказы, маркетинг, AI-выводы и история отчётов. Экспорт в PDF/Excel, отправка в WhatsApp и на почту.">
      {/* Период + область + снимок */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {REPORT_PERIODS.map(([id, label]) => (
              <button key={id} onClick={() => setPeriod(id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${period === id ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#C5A059]/40"}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-white">
              <option value="all" className="bg-black">Вся сеть</option>
              {branches.map((b: any) => <option key={b.id || b.branchId} value={b.id || b.branchId} className="bg-black">{b.name}</option>)}
            </select>
            <button onClick={saveSnapshot} className="inline-flex items-center gap-1.5 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-1.5 text-xs font-bold text-[#C5A059]"><Camera className="h-3.5 w-3.5" /> Сохранить снимок периода</button>
          </div>
        </div>
      </section>

      {/* Под-вкладки */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${tab === t.id ? "bg-white/15 text-white ring-1 ring-[#C5A059]/40" : "border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "fin" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatPill label="Поступления" value={money(revenue(curPays))} tone="emerald" />
            <StatPill label="Операций" value={curPays.length} tone="white" />
            <StatPill label="Возвраты" value={money(0)} tone="rose" />
            <StatPill label="Средний чек" value={money(curPays.length ? Math.round(revenue(curPays) / Math.max(1, curPays.filter((p: Payment) => p.status === "paid").length)) : 0)} />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {[["all", "Все операции"], ["subscription", "Абонементы"], ["uniform", "Товары"], ["concert", "Выступления"], ["single", "Разовые"]].map(([id, label]) => (
                <button key={id} onClick={() => setOpType(id)} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${opType === id ? "bg-white/15 text-white ring-1 ring-[#C5A059]/40" : "border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={exportPdf} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"><FileText className="h-3.5 w-3.5" /> PDF</button>
              <button onClick={exportExcel} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
              <button onClick={shareWhatsApp} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"><Phone className="h-3.5 w-3.5" /> WhatsApp</button>
              <button onClick={shareEmail} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"><Send className="h-3.5 w-3.5" /> Email</button>
            </div>
          </div>
          <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
            <div className="border-b border-white/10 px-4 py-3"><h4 className="text-sm font-black text-white">Реестр финансовых операций</h4></div>
            {/* Мобайл: список операций карточками */}
            <div className="divide-y divide-white/5 md:hidden">
              {filteredOps.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Нет операций за период.</p>}
              {filteredOps.slice(0, 200).map((p: Payment) => (
                <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{studentName(p.studentId)}</p>
                    <p className="text-[11px] text-slate-500">{p.date} · {PAY_TYPE_LABEL[p.type] || p.type} · {PAY_METHOD_RU[p.method] || p.method}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-emerald-400">{money(p.amount)}</p>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{p.status === "paid" ? "Проведён" : "Ожидание"}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Дата</th><th className="px-4 py-2 font-bold">Ученик</th><th className="px-4 py-2 font-bold">Тип</th><th className="px-4 py-2 font-bold">Способ</th><th className="px-4 py-2 text-right font-bold">Сумма</th><th className="px-4 py-2 font-bold">Статус</th></tr></thead>
                <tbody>
                  {filteredOps.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Нет операций за период.</td></tr>}
                  {filteredOps.slice(0, 200).map((p: Payment) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="px-4 py-2 text-slate-400">{p.date}</td>
                      <td className="px-4 py-2 font-bold text-white">{studentName(p.studentId)}</td>
                      <td className="px-4 py-2 text-slate-300">{PAY_TYPE_LABEL[p.type] || p.type}</td>
                      <td className="px-4 py-2 text-slate-400">{PAY_METHOD_RU[p.method] || p.method}</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-400">{money(p.amount)}</td>
                      <td className="px-4 py-2"><span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{p.status === "paid" ? "Проведён" : "Ожидание"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "subs" && <ReportsSubsTab students={scopedStudents} payments={curPays} />}
      {tab === "trials" && <ReportsTrialsTab students={scopedStudents} />}
      {tab === "marketing" && <ReportsMarketingTab students={scopedStudents} leadSources={leadSources} />}
      {tab === "ai" && <ReportsAiTab students={scopedStudents} curRevenue={revenue(curPays)} ops={curPays.length} period={period} />}
      {tab === "history" && (
        <ReportsHistoryTab
          cur={revenue(curPays)}
          prev={revenue(payments.filter((p: Payment) => inScope(p.branchId) && inRange(p.date, r.prev)))}
          yoy={revenue(payments.filter((p: Payment) => inScope(p.branchId) && inRange(p.date, r.yoy)))}
          comment={comment} setComment={setComment} onSaveComment={saveComment}
          snapshots={snapshots}
        />
      )}
    </OwnerScreen>
  );
}

function ReportsSubsTab({ students, payments }: any) {
  const active = students.filter((s: Student) => (s.status || "") === "active").length;
  const debt = students.filter((s: Student) => (s.status || "") === "debt" || s.balance < 0).length;
  const subRevenue = payments.filter((p: Payment) => p.type === "subscription" && p.status === "paid").reduce((s: number, p: Payment) => s + p.amount, 0);
  const subCount = payments.filter((p: Payment) => p.type === "subscription").length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Активные абонементы" value={active} tone="emerald" />
        <StatPill label="Должники" value={debt} tone="rose" />
        <StatPill label="Продано абонементов" value={subCount} tone="white" />
        <StatPill label="Выручка по абонементам" value={money(subRevenue)} />
      </div>
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
        <h4 className="text-sm font-black text-white">Отчёт по абонементам</h4>
        <p className="mt-2 text-slate-400">Активных учеников: {active}. Должников: {debt}. За период продано {subCount} абонементов на {money(subRevenue)}. Проверьте истекающие абонементы в разделе «Ученики» → фильтр «Не оплачен текущий месяц».</p>
      </section>
    </div>
  );
}

function ReportsTrialsTab({ students }: any) {
  const st = (v: string) => students.filter((s: Student) => (s.status || "") === v).length;
  const leftList = students.filter((s: Student) => (s.status || "") === "left" || (s.status || "") === "archived");
  const funnel = [
    { label: "Лиды", value: st("lead") },
    { label: "Записаны на пробный", value: st("trial") },
    { label: "Активные (купили)", value: st("active") },
  ];
  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        <h4 className="text-sm font-black text-white">Воронка пробных уроков</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {funnel.map((f) => <div key={f.label}><StatPill label={f.label} value={f.value} tone={f.label.startsWith("Актив") ? "emerald" : "white"} /></div>)}
        </div>
      </section>
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h4 className="text-sm font-black text-white">История отказов и причины ухода</h4>
          <span className="text-[11px] text-slate-500">Ушедших: {leftList.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Ученик</th><th className="px-4 py-2 font-bold">Причина ухода</th><th className="px-4 py-2 text-right font-bold"></th></tr></thead>
            <tbody>
              {leftList.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">Отказов нет.</td></tr>}
              {leftList.slice(0, 100).map((s: Student) => (
                <tr key={s.id} className="border-t border-white/5">
                  <td className="px-4 py-2 font-bold text-white">{s.name}</td>
                  <td className="px-4 py-2 text-slate-400">{s.archiveReason || "—"}</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => window.open(`https://wa.me/${(s.parentPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent("Здравствуйте! Скучаем по вам в Эхо Гор — возвращайтесь, для вас спецпредложение 🎁")}`, "_blank")} className="rounded-lg border border-[#C5A059]/30 bg-[#C5A059]/10 px-2.5 py-1 text-[11px] font-bold text-[#C5A059]">↩ Возврат с оффером</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportsMarketingTab({ students, leadSources }: any) {
  const bySource = (leadSources || []).map((ls: any) => ({
    name: ls.name,
    count: students.filter((s: Student) => s.sourceId === ls.id).length,
  })).sort((a: any, b: any) => b.count - a.count);
  const noSource = students.filter((s: Student) => !s.sourceId).length;
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="border-b border-white/10 px-4 py-3"><h4 className="text-sm font-black text-white">Лиды по источникам</h4></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Источник</th><th className="px-4 py-2 text-right font-bold">Учеников</th></tr></thead>
            <tbody>
              {bySource.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500">Источники не заданы.</td></tr>}
              {bySource.map((s: any) => (
                <tr key={s.name} className="border-t border-white/5"><td className="px-4 py-2 font-bold text-white">{s.name}</td><td className="px-4 py-2 text-right text-[#C5A059]">{s.count}</td></tr>
              ))}
              {noSource > 0 && <tr className="border-t border-white/5"><td className="px-4 py-2 text-slate-400">Без источника</td><td className="px-4 py-2 text-right text-slate-400">{noSource}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
        <h4 className="text-sm font-black text-white">Воронка продаж · от лида до продления</h4>
        <p className="mt-2">Лиды → пробное → покупка → продление. Детальная воронка по статусам — во вкладке «Пробные и отказы» и в разделе «Ученики».</p>
      </section>
    </div>
  );
}

function ReportsAiTab({ students, curRevenue, ops, period }: any) {
  const active = students.filter((s: Student) => (s.status || "") === "active").length;
  const debt = students.filter((s: Student) => (s.status || "") === "debt" || s.balance < 0).length;
  const left = students.filter((s: Student) => (s.status || "") === "left" || (s.status || "") === "archived").length;
  const insights = [
    `За период (${period}) поступления ${money(curRevenue)} по ${ops} операциям. Средний чек ${money(ops ? Math.round(curRevenue / ops) : 0)}.`,
    `Активных учеников ${active}, должников ${debt}. ${debt > 0 ? `Рекомендуется кампания напоминаний — это ${money(debt * 16000)} потенциального возврата.` : "Задолженностей нет — отличная собираемость."}`,
    `Отток: ${left} ушедших. ${left > 0 ? "Запустите возврат с оффером во вкладке «Пробные и отказы»." : "Оттока нет."}`,
    `Фокус недели: удержание активных (${active}) и добор пробных. Сравните период с прошлым во вкладке «История».`,
  ];
  return (
    <section className="rounded-[1.75rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#1a1710] to-black p-5">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#C5A059]" /><h4 className="text-sm font-black uppercase tracking-wider text-white">AI-отчёт по периоду</h4></div>
      <ul className="mt-4 space-y-3">
        {insights.map((t, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"><span className="mt-0.5 text-[#C5A059]">›</span><span>{t}</span></li>
        ))}
      </ul>
    </section>
  );
}

function ReportsHistoryTab({ cur, prev, yoy, comment, setComment, onSaveComment, snapshots }: any) {
  const delta = (a: number, b: number) => b ? Math.round(((a - b) / b) * 100) : 0;
  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        <h4 className="text-sm font-black text-white">Сравнение периодов · выручка</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatPill label="Текущий период" value={money(cur)} tone="gold" />
          <StatPill label="Пред. период" value={money(prev)} hint={`${delta(cur, prev) >= 0 ? "+" : ""}${delta(cur, prev)}% MoM`} />
          <StatPill label="Тот же период год назад" value={money(yoy)} hint={`${delta(cur, yoy) >= 0 ? "+" : ""}${delta(cur, yoy)}% YoY`} />
        </div>
      </section>
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5">
        <h4 className="text-sm font-black text-white">Комментарий владельца</h4>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Заметки, выводы, план действий на период…" className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/40" />
        <div className="mt-2 flex justify-end"><button onClick={onSaveComment} className="rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black">Сохранить комментарий</button></div>
      </section>
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02]">
        <div className="border-b border-white/10 px-4 py-3"><h4 className="text-sm font-black text-white">История сохранённых отчётов</h4></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Снимок</th><th className="px-4 py-2 font-bold">Область</th><th className="px-4 py-2 text-right font-bold">Поступления</th><th className="px-4 py-2 text-right font-bold">Операций</th></tr></thead>
            <tbody>
              {(!snapshots || snapshots.length === 0) && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">Снимков пока нет. Нажмите «Сохранить снимок периода».</td></tr>}
              {(snapshots || []).map((s: any) => (
                <tr key={s.id} className="border-t border-white/5"><td className="px-4 py-2 text-slate-300">{s.date}</td><td className="px-4 py-2 text-slate-400">{s.scope}</td><td className="px-4 py-2 text-right text-emerald-400">{money(s.revenue)}</td><td className="px-4 py-2 text-right text-slate-300">{s.ops}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ===================== ШТРАФЫ ПРЕПОДАВАТЕЛЕЙ =====================
const PENALTY_REASONS = ["Опоздание", "Незакрытый журнал", "Нет плана работы", "Нет фото прихода", "Нарушение дисциплины", "Другое"];

// «тг» как в референсе Эхо Гор (в остальном приложении money() использует ₸).
const tg = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} тг`;

// ── Расчёт зарплаты: автоматически из учеников групп по системе оплаты Эхо Гор ──
function SalaryCalcModal({ teachers, metricFor, penalties, months, month, effectiveWinnerId, onClose, onCharge }: any) {
  const seeded = teachers.filter((t: Teacher) => TN_SEED[t.name.trim().toLowerCase()]);
  const list: Teacher[] = seeded.length ? seeded : teachers;
  const [tid, setTid] = useState<string>(list[0]?.id || "");
  const [mo, setMo] = useState<string>(month);
  const [done, setDone] = useState(false);

  const teacher = teachers.find((t: Teacher) => t.id === tid) || list[0];
  const row = teacher ? tnEnrich(teacher, metricFor(teacher.id), mo, penalties) : null;
  const m = row?.m || null;
  const isWinner = effectiveWinnerId === teacher?.id;
  const sal = tnSalary(m, row?.cat || 1, isWinner, row?.finesSum || 0);

  const cat = row?.cat || 1;
  const newRate = TN_RATES.new[cat] || 0;
  const regRate = TN_RATES.reg[cat] || 0;
  const contRate = TN_RATES.regCont[cat] || 0;
  const newCnt = m?.newCnt || 0;
  const contCnt = cat === 3 ? (m?.regCont || 0) : 0;
  const plainReg = Math.max(0, (m?.regCnt || 0) - contCnt);
  const newSum = newCnt * newRate, regSum = plainReg * regRate, contSum = contCnt * contRate;

  // Детализация по группам: из seed, иначе одна сводная строка из месячных итогов.
  const groups: TnGroupBreak[] = m?.groups?.length
    ? m.groups
    : m ? [{ name: row?.spec || "Все группы", newCnt, regCnt: plainReg, contCnt }] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-[#0f0f0f] max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Шапка */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-7 py-6">
          <div>
            <h3 className="text-2xl font-black text-white">Расчёт зарплаты</h3>
            <p className="mt-1 text-sm text-slate-500">Автоматически из учеников групп · по системе оплаты Эхо Гор</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-7 py-6">
          {/* Селекторы */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Преподаватель
              <select value={tid} onChange={(e) => { setTid(e.target.value); setDone(false); }}
                className="rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-[#C5A059]/50">
                {list.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></label>
            <label className="flex flex-col gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Месяц
              <select value={mo} onChange={(e) => { setMo(e.target.value); setDone(false); }}
                className="rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-[#C5A059]/50">
                {months.map((x: string) => <option key={x} value={x}>{x}</option>)}
              </select></label>
          </div>

          {/* Итоговое число */}
          <div className="mt-5 rounded-[1.5rem] border border-[#C5A059]/30 bg-[#C5A059]/12 px-6 py-7 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">ЗП к начислению · {mo.toUpperCase()}</p>
            <p className="mt-2 text-5xl font-black text-white tabular-nums break-words leading-tight">{sal ? tg(sal.total) : "—"}</p>
            <p className="mt-2 text-sm text-slate-500">{teacher?.name} · {tnCatName(cat)}</p>
          </div>

          {!m ? (
            <p className="mt-6 rounded-2xl border border-white/10 bg-[#121212] px-4 py-6 text-center text-sm text-slate-500">Нет данных за выбранный месяц.</p>
          ) : (
            <>
              {/* Детализация по группам */}
              <p className="mt-7 text-[12px] font-black uppercase tracking-wider text-slate-500">Детализация по группам</p>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">Группа</th>
                      <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Новенькие</th>
                      <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Постоянные</th>
                      <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Продолж.</th>
                      <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, i) => {
                      const gsum = g.newCnt * newRate + g.regCnt * regRate + g.contCnt * contRate;
                      return (
                        <tr key={i} className="border-t border-white/5">
                          <td className="px-5 py-3.5 text-slate-300">{g.name}</td>
                          <td className="px-5 py-3.5 text-right text-slate-400">{g.newCnt}×{newRate.toLocaleString("ru-RU")}</td>
                          <td className="px-5 py-3.5 text-right text-slate-400">{g.regCnt}×{regRate.toLocaleString("ru-RU")}</td>
                          <td className="px-5 py-3.5 text-right text-slate-400">{g.contCnt}×{(contRate || 3500).toLocaleString("ru-RU")}</td>
                          <td className="px-5 py-3.5 text-right font-black text-white">{tg(gsum)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Итоговый расчёт */}
              <p className="mt-7 text-[12px] font-black uppercase tracking-wider text-slate-500">Итоговый расчёт</p>
              <div className="mt-2 space-y-0.5">
                <SalaryRow label={`Новенькие · ${newCnt} × ${newRate.toLocaleString("ru-RU")} тг`} value={tg(newSum)} />
                <SalaryRow label={`Постоянные · ${plainReg} × ${regRate.toLocaleString("ru-RU")} тг`} value={tg(regSum)} />
                {contCnt > 0 && <SalaryRow label={`Постоянные, продолжающая · ${contCnt} × ${contRate.toLocaleString("ru-RU")} тг`} value={tg(contSum)} />}
                <SalaryRow label="Базовая часть" value={tg(sal!.base)} strong />
                {sal!.retBonus > 0 && <SalaryRow label={`Бонус удержания (+${Math.round(TN_RET_BONUS[cat] * 100)}%)`} value={`+ ${tg(sal!.retBonus)}`} tone="emerald" />}
                {sal!.tomBonus > 0 && <SalaryRow label="Бонус «Педагог месяца»" value={`+ ${tg(sal!.tomBonus)}`} tone="emerald" />}
                <SalaryRow label={sal!.finesSum > 0 ? "Штрафы итого" : "Штрафы итого (нет)"} value={sal!.finesSum > 0 ? `− ${tg(sal!.finesSum)}` : "0 тг"} tone="rose" />
                <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-base font-black text-white">Итого к выплате</span>
                  <span className="text-base font-black text-white">{tg(sal!.total)}</span>
                </div>
              </div>
            </>
          )}

          {/* Действия */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button disabled={!m || done} onClick={() => setDone(true)}
              className="rounded-full bg-[#C5A059] px-6 py-3 text-sm font-black text-black shadow-[0_6px_16px_rgba(197,160,89,0.35)] transition hover:brightness-105 disabled:opacity-50">
              {done ? "Начислено ✓" : "Начислить и провести"}
            </button>
            <button onClick={onCharge}
              className="rounded-full border border-white/10 bg-[#121212] px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-rose-400/50 hover:text-rose-300">
              Начислить штраф
            </button>
          </div>
          <p className="mt-4 text-[12px] text-slate-500">Считается автоматически из учеников групп. По системе оплаты Эхо Гор 2025–2026.</p>
        </div>
      </div>
    </div>
  );
}

function SalaryRow({ label, value, strong, tone = "default" }: { label: string; value: string; strong?: boolean; tone?: "default" | "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : "text-white";
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3.5">
      <span className={`text-sm ${strong ? "font-black text-white" : "text-slate-300"}`}>{label}</span>
      <span className={`text-sm ${strong ? "font-black" : "font-bold"} ${color}`}>{value}</span>
    </div>
  );
}

// ── Журнал штрафов: все штрафы по сети, фильтр по месяцу и педагогу ──
function PenaltyJournalModal({ penalties, teachers, months, month, onClose, onCharge, onRemove }: any) {
  const [fMonth, setFMonth] = useState<string>(month || "");
  const [fTeacher, setFTeacher] = useState<string>("");

  // Только реальные штрафы из базы (teacher_penalties). Seed-мокапы убраны.
  const all = useMemo(() => {
    return (penalties || []).map((p: any) => ({
      id: p.id, source: "db",
      teacherId: p.teacherId, teacherName: p.teacherName, cat: undefined,
      reason: p.reason, amount: p.amount, month: p.period_month, date: p.date || p.created_at, comment: p.comment, by: p.created_by || "Владелец",
    }));
  }, [penalties]);

  const teacherNames = useMemo<string[]>(() => (Array.from(new Set(all.map((r: any) => String(r.teacherName || "")))).filter(Boolean) as string[]), [all]);
  const filtered = all.filter((r) => (!fMonth || r.month === fMonth) && (!fTeacher || r.teacherName === fTeacher));
  const total = filtered.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-[#0f0f0f] max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-7 py-6">
          <div>
            <h3 className="text-2xl font-black text-white">Журнал штрафов</h3>
            <p className="mt-1 text-sm text-slate-500">Все штрафы по сети · вычитаются из ЗП автоматически</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-7 py-6">
          {/* Фильтры */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Месяц
              <select value={fMonth} onChange={(e) => setFMonth(e.target.value)}
                className="rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-[#C5A059]/50">
                <option value="">Все месяцы</option>
                {months.map((x: string) => <option key={x} value={x}>{x}</option>)}
              </select></label>
            <label className="flex flex-col gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">Преподаватель
              <select value={fTeacher} onChange={(e) => setFTeacher(e.target.value)}
                className="rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-[#C5A059]/50">
                <option value="">Все преподаватели</option>
                {teacherNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
          </div>

          {/* Сумма по фильтру */}
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#121212] px-6 py-7 text-center">
            <p className="text-4xl font-black text-white tabular-nums break-words leading-tight">{tg(total)}</p>
            <p className="mt-2 text-sm text-slate-500">Сумма штрафов по фильтру · {filtered.length} шт.</p>
          </div>

          <button onClick={onCharge}
            className="mt-4 rounded-full border border-white/10 bg-[#121212] px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-[#C5A059]/50 hover:text-[#C5A059]">
            + Начислить новый штраф
          </button>

          {/* Список */}
          <div className="mt-6 space-y-5">
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Штрафов по фильтру нет.</p>}
            {filtered.map((r) => (
              <div key={r.id} className="group flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-black text-rose-400">{r.teacherName} · {r.reason} · {tg(r.amount)}</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {[r.cat ? tnCatName(r.cat) : null, r.month, r.date, r.comment, `начислил: ${r.by}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {r.source === "db" && (
                  <button onClick={() => onRemove(r.id)} className="mt-1 shrink-0 text-slate-500 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChargePenaltyModal({ teachers, busy, onClose, onSubmit }: any) {
  const [f, setF] = useState<any>({ teacherId: teachers[0]?.id || "", reason: PENALTY_REASONS[0], amount: "", period_month: new Date().toISOString().slice(0, 7), created_by: "Владелец", comment: "" });
  // Причины штрафов — из настраиваемого справочника (settings_lists), с дефолтами.
  const [reasons, setReasons] = useState<string[]>(PENALTY_REASONS);
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/settings/lists?kind=penalty_reason", { headers: { "x-demo-role": "owner" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const items = (d?.items || []).map((x: any) => x.label || x.value || x).filter(Boolean); if (alive && items.length) setReasons(items); })
      .catch(() => { /* останутся дефолты */ });
    return () => { alive = false; };
  }, []);
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const submit = () => {
    const amount = Number(f.amount);
    if (!amount || amount <= 0) return;
    const t = teachers.find((x: any) => x.id === f.teacherId);
    onSubmit({ ...f, amount, teacherName: t?.name || "Преподаватель" });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#0f0f0f] p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-black text-white">Начислить штраф</h3><button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 grid gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Преподаватель
            <select value={f.teacherId} onChange={(e) => set("teacherId", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              {teachers.map((t: any) => <option key={t.id} value={t.id} className="bg-black">{t.name}</option>)}
            </select></label>
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Причина *
            <select value={f.reason} onChange={(e) => set("reason", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              {reasons.map((r) => <option key={r} value={r} className="bg-black">{r}</option>)}
            </select></label>
          <ModalInput label="Сумма, ₸ *" type="number" value={f.amount} onChange={(v) => set("amount", v)} />
          <ModalInput label="Месяц (вычесть из ЗП)" type="month" value={f.period_month} onChange={(v) => set("period_month", v)} />
          <label className="flex flex-col gap-1 text-[11px] text-slate-400">Кто начислил
            <select value={f.created_by} onChange={(e) => set("created_by", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
              <option value="Владелец" className="bg-black">Владелец</option>
              <option value="Управляющий" className="bg-black">Управляющий</option>
            </select></label>
          <ModalInput label="Комментарий" value={f.comment} onChange={(v) => set("comment", v)} full />
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Штраф вычитается из итоговой ЗП. Педагог видит причину, сумму, дату и кто начислил.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300">Отмена</button>
          <button disabled={busy} onClick={submit} className="rounded-xl bg-rose-500/90 px-4 py-2 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50">Начислить штраф</button>
        </div>
      </div>
    </div>
  );
}

// ===================== ПЛАНИРОВАНИЕ (БДР) =====================
// Бюджет доходов и расходов сети: план по группам/расходам, факт из CRM и Бухгалтерии,
// сверка план/факт по уровням, воронка продаж, ежедневный отчёт и настройки мотивации.
const PLAN_PERIODS = ["2026-04", "2026-05", "2026-06", "2026-07"];
const planMonthLabel = (p: string) => {
  const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const [y, m] = p.split("-");
  return `${months[Number(m) - 1]} ${y}`;
};

// ============================ ПЛАНЁРКИ ============================
// Совещания сети: создание, участники, итоги, история + поиск. AI-слой:
// запись речи в браузере (Web Speech API) → текст → «Собрать итоги AI»
// (/api/gemini/meeting-summary) → итоги, задачи, ответственные, сроки.

const MEETING_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Черновик", cls: "border-slate-500/30 bg-slate-500/10 text-slate-300" },
  held: { label: "Проведена", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  archived: { label: "В архиве", cls: "border-white/10 bg-white/5 text-slate-400" },
};

function fmtMeetingDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
}

export function MeetingsView() {
  const hdr = { headers: { "x-demo-role": "owner" } };
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": "owner" } };

  const [meetings, setMeetings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async (query = "") => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/mvp/meetings${query ? `?q=${encodeURIComponent(query)}` : ""}`, hdr);
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      setMeetings(j.meetings || []); setSummary(j.summary || null);
    } catch (e: any) { setError(e?.message || "Не удалось загрузить планёрки"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  // Поиск с задержкой.
  useEffect(() => { const t = setTimeout(() => load(q.trim()), 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  return (
    <OwnerScreen
      title="Планёрки"
      subtitle="Совещания сети: создание планёрки, участники, текстовые итоги и задачи. Включите запись — речь превратится в текст, а AI соберёт итоги, задачи, ответственных и сроки. Вся история с поиском.">
      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatPill label="Всего планёрок" value={summary?.total ?? "—"} tone="white" />
        <StatPill label="Открытых задач" value={summary?.openTasks ?? "—"} tone="gold" hint="не отмечены выполненными" />
        <StatPill label="В этом месяце" value={summary?.thisMonth ?? "—"} tone="emerald" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию, итогам, участникам, задачам…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#C5A059]/40 focus:outline-none" />
        </div>
        <button onClick={() => setEditing({ _new: true, status: "draft", date: new Date().toISOString().slice(0, 10), participants: [], items: [] })}
          className="flex items-center gap-1.5 rounded-xl bg-[#C5A059] px-3 py-2 text-xs font-black text-black hover:bg-[#d4af6a]">
          <Plus className="h-4 w-4" /> Новая планёрка
        </button>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">Загрузка…</p>
        ) : meetings.length === 0 ? (
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] py-16 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm text-slate-400">{q ? "Ничего не найдено." : "Планёрок пока нет — создайте первую."}</p>
          </div>
        ) : (
          meetings.map((m) => (
            <button key={m.id} onClick={() => setEditing(m)}
              className="flex w-full items-center gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-[#C5A059]/40 hover:bg-white/[0.04]">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                <span className="text-[10px] uppercase text-slate-500">{new Date(m.date + "T00:00:00").toLocaleDateString("ru-RU", { month: "short" })}</span>
                <span className="text-lg font-black leading-none text-white">{new Date(m.date + "T00:00:00").getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold text-white">{m.title}</h3>
                  <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${MEETING_STATUS_META[m.status]?.cls}`}>{MEETING_STATUS_META[m.status]?.label}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {m.summary ? m.summary : (m.agenda || "Итоги ещё не заполнены")}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {Array.isArray(m.participants) ? m.participants.length : 0} участн.</span>
                  {m.itemsCount > 0 && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {m.itemsCount - m.openItems}/{m.itemsCount} задач</span>}
                  {m.openItems > 0 && <span className="flex items-center gap-1 text-amber-400"><Clock className="h-3 w-3" /> {m.openItems} открыто</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
            </button>
          ))
        )}
      </div>

      {editing && <MeetingModal meeting={editing} jhdr={jhdr} hdr={hdr} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(q.trim()); }} setError={setError} />}
    </OwnerScreen>
  );
}

function MeetingModal({ meeting, jhdr, hdr, onClose, onSaved, setError }: {
  meeting: any; jhdr: any; hdr: any; onClose: () => void; onSaved: () => void; setError: (s: string | null) => void;
}) {
  const isNew = !!meeting._new;
  const [id, setId] = useState<string | null>(isNew ? null : meeting.id);
  const [title, setTitle] = useState(meeting.title || "");
  const [date, setDate] = useState(meeting.date || new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState(meeting.status || "draft");
  const [participantsText, setParticipantsText] = useState((meeting.participants || []).join(", "));
  const [agenda, setAgenda] = useState(meeting.agenda || "");
  const [transcript, setTranscript] = useState(meeting.transcript || "");
  const [summaryText, setSummaryText] = useState(meeting.summary || "");
  const [items, setItems] = useState<any[]>(meeting.items || []);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  const participants = participantsText.split(",").map((s) => s.trim()).filter(Boolean);

  // ---- Запись речи в браузере (Web Speech API), ru-RU ----
  const toggleRecording = () => {
    if (recording) { try { recRef.current?.stop(); } catch {} setRecording(false); return; }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setRecError("Браузер не поддерживает распознавание речи. Используйте Chrome или введите заметки вручную."); return; }
    setRecError(null);
    const rec = new SR();
    rec.lang = "ru-RU"; rec.continuous = true; rec.interimResults = true;
    let finalBuf = "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalBuf += t + " "; else interim += t;
      }
      if (finalBuf) { setTranscript((prev: string) => (prev ? prev + " " : "") + finalBuf.trim()); finalBuf = ""; }
    };
    rec.onerror = (e: any) => { setRecError("Ошибка записи: " + (e?.error || "неизвестно")); setRecording(false); };
    rec.onend = () => { if (recRef.current === rec && recording) { try { rec.start(); } catch {} } };
    recRef.current = rec;
    try { rec.start(); setRecording(true); } catch (e: any) { setRecError("Не удалось начать запись"); }
  };
  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  // Сохранить планёрку (создать или обновить). Возвращает id.
  const persist = async (): Promise<string | null> => {
    const payload = { title, date, status, participants, agenda, summary: summaryText, transcript };
    const url = id ? `/api/mvp/meetings/${id}` : "/api/mvp/meetings";
    const res = await fetch(url, { method: id ? "PATCH" : "POST", ...jhdr, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(await res.text());
    const j = await res.json();
    const newId = j.meeting?.id || id;
    if (newId && newId !== id) setId(newId);
    return newId;
  };

  const saveItems = async (mid: string, list: any[]) => {
    const res = await fetch(`/api/mvp/meetings/${mid}/items`, { method: "PUT", ...jhdr, body: JSON.stringify({ items: list }) });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()).items || [];
  };

  const onSaveAll = async () => {
    if (!title.trim()) { setError("Укажите название планёрки"); return; }
    setBusy(true); setError(null);
    try {
      const mid = await persist();
      if (mid) await saveItems(mid, items);
      onSaved();
    } catch (e: any) { setError(e?.message || "Не удалось сохранить"); }
    finally { setBusy(false); }
  };

  const onDelete = async () => {
    if (!id) { onClose(); return; }
    if (!confirm("Удалить планёрку вместе с задачами?")) return;
    setBusy(true);
    try { await fetch(`/api/mvp/meetings/${id}`, { method: "DELETE", ...hdr }); onSaved(); }
    catch (e: any) { setError(e?.message || "Не удалось удалить"); }
    finally { setBusy(false); }
  };

  // AI: расшифровка/заметки → итоги + задачи.
  const onAiSummarize = async () => {
    const text = (transcript || "").trim();
    if (!text) { setRecError("Сначала запишите речь или введите заметки встречи."); return; }
    setAiBusy(true); setError(null); setRecError(null);
    try {
      const res = await fetch("/api/gemini/meeting-summary", { method: "POST", ...jhdr, body: JSON.stringify({ transcript: text, title, participants, meetingDate: date }) });
      if (!res.ok) {
        const msg = res.status === 503 ? "AI недоступен: не настроен ключ Gemini на сервере." : (await res.text());
        throw new Error(msg);
      }
      const j = await res.json();
      let sum = j.summary || "";
      if (Array.isArray(j.decisions) && j.decisions.length) sum += (sum ? "\n\n" : "") + "Решения:\n— " + j.decisions.join("\n— ");
      setSummaryText(sum || summaryText);
      const aiItems = (j.actionItems || []).map((it: any) => ({ title: it.title || "", assignee: it.assignee || "", dueDate: it.dueDate || "", done: false, source: "ai" })).filter((it: any) => it.title);
      if (aiItems.length) setItems((prev: any[]) => [...prev, ...aiItems]);
      if (status === "draft") setStatus("held");
    } catch (e: any) { setError(e?.message || "AI не смог обработать текст"); }
    finally { setAiBusy(false); }
  };

  const addItem = () => setItems((p) => [...p, { title: "", assignee: "", dueDate: "", done: false, source: "manual" }]);
  const updItem = (i: number, patch: any) => setItems((p) => p.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const delItem = (i: number) => setItems((p) => p.filter((_, k) => k !== i));

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#C5A059]/40 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-6 w-full max-w-3xl rounded-[1.75rem] border border-white/10 bg-[#0F0F0F] p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название планёрки (напр. «Итоги недели»)"
              className="w-full bg-transparent text-lg font-black text-white placeholder:text-slate-600 focus:outline-none" />
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">Дата</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">Статус</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="draft">Черновик</option>
              <option value="held">Проведена</option>
              <option value="archived">В архиве</option>
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">Участники (через запятую)</span>
          <input value={participantsText} onChange={(e) => setParticipantsText(e.target.value)} placeholder="Асланбек, Магомед, Фатима…" className={inputCls} />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">Повестка (необязательно)</span>
          <input value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="О чём говорим" className={inputCls} />
        </label>

        {/* Запись речи + заметки */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">Запись / заметки встречи</span>
            <div className="flex gap-2">
              <button onClick={toggleRecording}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${recording ? "bg-rose-500/90 text-white" : "border border-white/10 text-slate-200 hover:border-white/30"}`}>
                <Mic2 className="h-4 w-4" /> {recording ? "Остановить запись" : "Запись речи"}
                {recording && <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-white" />}
              </button>
              <button onClick={onAiSummarize} disabled={aiBusy}
                className="flex items-center gap-1.5 rounded-xl bg-[#C5A059] px-3 py-1.5 text-xs font-black text-black hover:bg-[#d4af6a] disabled:opacity-50">
                <Sparkles className="h-4 w-4" /> {aiBusy ? "Обработка…" : "Собрать итоги AI"}
              </button>
            </div>
          </div>
          {recError && <p className="mt-2 text-[11px] text-amber-400">{recError}</p>}
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={4}
            placeholder="Здесь появится распознанная речь. Можно печатать и вручную. Затем нажмите «Собрать итоги AI»."
            className={`mt-2 ${inputCls} resize-y`} />
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-slate-500">Итоги встречи</span>
          <textarea value={summaryText} onChange={(e) => setSummaryText(e.target.value)} rows={4} placeholder="Итоги — заполняются вручную или собираются AI." className={`${inputCls} resize-y`} />
        </label>

        {/* Задачи */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">Задачи ({items.length})</span>
            <button onClick={addItem} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-200 hover:border-white/30"><Plus className="h-3.5 w-3.5" /> Добавить</button>
          </div>
          <div className="mt-2 space-y-2">
            {items.length === 0 && <p className="rounded-xl border border-dashed border-white/10 py-4 text-center text-xs text-slate-600">Задач нет. Добавьте вручную или соберите AI.</p>}
            {items.map((it, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
                <button onClick={() => updItem(i, { done: !it.done })} className={`shrink-0 rounded-md border p-1 ${it.done ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300" : "border-white/15 text-slate-500"}`}>
                  <CheckCircle className="h-4 w-4" />
                </button>
                <input value={it.title} onChange={(e) => updItem(i, { title: e.target.value })} placeholder="Что сделать"
                  className={`min-w-[8rem] flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-[#C5A059]/40 focus:outline-none ${it.done ? "line-through opacity-60" : ""}`} />
                <input value={it.assignee || ""} onChange={(e) => updItem(i, { assignee: e.target.value })} placeholder="Ответственный"
                  className="w-36 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-[#C5A059]/40 focus:outline-none" />
                <input type="date" value={it.dueDate || ""} onChange={(e) => updItem(i, { dueDate: e.target.value })}
                  className="w-36 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white focus:border-[#C5A059]/40 focus:outline-none" />
                {it.source === "ai" && <span className="rounded-md border border-[#C5A059]/30 bg-[#C5A059]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#C5A059]">AI</span>}
                <button onClick={() => delItem(i)} className="shrink-0 rounded-md p-1 text-slate-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button onClick={onDelete} disabled={busy} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
            {isNew ? "Отмена" : "Удалить"}
          </button>
          <button onClick={onSaveAll} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-black text-black hover:bg-[#d4af6a] disabled:opacity-50">
            {busy ? "Сохранение…" : "Сохранить планёрку"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PLAN_MONTHS_FULL = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function PlanningView() {
  const [tab, setTab] = useState<"plan" | "planfact" | "daily" | "ai" | "motivation">("plan");
  const [period, setPeriod] = useState("2026-07");
  const [created, setCreated] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/mvp/planning/overview?period=${period}`, ownerHdr);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: any) { setError(e?.message || "Не удалось загрузить план"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  const saveBudget = async (payload: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/mvp/planning/budget`, { method: "POST", ...jsonOwnerHdr, body: JSON.stringify({ period, ...payload }) });
      if (res.ok) setData(await res.json());
    } catch { /* mock */ } finally { setBusy(false); }
  };
  const saveMotivation = async (rows: any[]) => {
    setBusy(true);
    try {
      await fetch(`/api/mvp/planning/motivation`, { method: "PATCH", ...jsonOwnerHdr, body: JSON.stringify({ motivation: rows }) });
      setData((d: any) => ({ ...d, motivation: rows }));
    } catch { /* mock */ } finally { setBusy(false); }
  };
  const addDaily = async (payload: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/mvp/planning/daily`, { method: "POST", ...jsonOwnerHdr, body: JSON.stringify(payload) });
      if (res.ok) { const j = await res.json(); setData((d: any) => ({ ...d, daily: j.daily })); }
    } catch { /* mock */ } finally { setBusy(false); }
  };

  const tabs: { id: typeof tab; label: string; icon: React.ElementType }[] = [
    { id: "plan", label: "План БДР", icon: LineChart },
    { id: "planfact", label: "План / Факт", icon: BarChart3 },
    { id: "daily", label: "Ежедневный отчёт", icon: ClipboardList },
    { id: "ai", label: "AI Аналитика", icon: Sparkles },
    { id: "motivation", label: "Настройки мотивации", icon: Trophy },
  ];

  const [yy, mm] = period.split("-");
  const setMonth = (m: string) => setPeriod(`${yy}-${m}`);
  const setYear = (y: string) => setPeriod(`${y}-${mm}`);
  const selCls = "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white focus:border-[#C5A059]/40 focus:outline-none";

  return (
    <OwnerScreen title="Планирование (БДР)" subtitle="Бюджет доходов и расходов · контроль плана · мотивация · прогнозы по всей сети">
      {error && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">Демо-режим: {error.length > 120 ? "сервер недоступен, показаны демонстрационные данные." : error}</div>}

      {/* Панель управления периодом */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={mm} onChange={(e) => setMonth(e.target.value)} className={selCls}>
          {PLAN_MONTHS_FULL.map((label, i) => (
            <option key={i} value={String(i + 1).padStart(2, "0")}>{label}</option>
          ))}
        </select>
        <select value={yy} onChange={(e) => setYear(e.target.value)} className={selCls}>
          {["2025", "2026", "2027"].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className={`rounded-xl border px-3 py-2 text-xs font-bold ${created ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
          {created ? "БДР создан" : "БДР не создан"}
        </span>
        <button onClick={() => setCreated(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black transition hover:brightness-110">
          <Plus className="h-4 w-4" /> Создать БДР
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-300 hover:border-[#C5A059]/40">
          <History className="h-4 w-4" /> История
        </button>
      </div>

      {/* Под-вкладки */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${tab === t.id ? "bg-white/15 text-white ring-1 ring-[#C5A059]/40" : "border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-slate-500">Загрузка…</div>}

      {data && !loading && (
        <>
          {tab === "plan" && <PlanTab data={data} period={period} busy={busy} onSave={saveBudget} />}
          {tab === "planfact" && <PlanVsFactTab data={data} />}
          {tab === "daily" && <PlanDailyTab data={data} period={period} />}
          {tab === "ai" && <PlanAiTab data={data} period={period} />}
          {tab === "motivation" && <PlanMotivationTab data={data} busy={busy} onSave={saveMotivation} />}
        </>
      )}
    </OwnerScreen>
  );
}

// План БДР (по прототипу): общие показатели, план на основе, доходы по группам
// (филиал → залы → группы), расходы с раскрытием ЗП/бонусов, воронка продаж.
function PlanTab({ data, period, busy, onSave }: any) {
  const d = data.detailed || {};
  const clone = (x: any) => JSON.parse(JSON.stringify(x || []));
  const [rooms, setRooms] = useState<any[]>(() => clone(d.rooms));
  const [expenses, setExpenses] = useState<any[]>(() => clone(d.expenses));
  const [neededSales, setNeededSales] = useState<number>(d.funnel?.neededSales ?? 20);
  const [basis, setBasis] = useState<string>("prev_month");
  const [openRooms, setOpenRooms] = useState<Record<number, boolean>>(() => Object.fromEntries((d.rooms || []).map((_: any, i: number) => [i, true])));
  const [openExp, setOpenExp] = useState<Record<string, boolean>>({});
  const [openIncome, setOpenIncome] = useState(true);
  const [openExpenses, setOpenExpenses] = useState(true);
  const [openFunnel, setOpenFunnel] = useState(true);
  const [branchFilter, setBranchFilter] = useState("all");

  useEffect(() => {
    setRooms(clone(d.rooms)); setExpenses(clone(d.expenses));
    setNeededSales(d.funnel?.neededSales ?? 20);
    setOpenRooms(Object.fromEntries((d.rooms || []).map((_: any, i: number) => [i, true])));
    /* eslint-disable-next-line */
  }, [data]);

  const numCls = "rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-center text-sm text-white focus:border-[#C5A059]/40 focus:outline-none";
  const mln = (v: number) => `${(v / 1_000_000).toFixed(1).replace(".", ",")} млн ₸`;

  // ---- Живой пересчёт ----
  const roomStudents = (r: any) => r.groups.reduce((s: number, g: any) => s + (Number(g.permanent) || 0) + (Number(g.new) || 0), 0);
  const roomTotal = (r: any) => r.groups.reduce((s: number, g: any) => s + (Number(g.planned) || 0), 0);
  const revenue = rooms.reduce((s, r) => s + roomTotal(r), 0);
  const studentsCount = rooms.reduce((s, r) => s + roomStudents(r), 0);
  const groupsCount = rooms.reduce((s, r) => s + r.groups.length, 0);
  const capacityTotal = rooms.reduce((s, r) => s + r.groups.reduce((a: number, g: any) => a + (Number(g.permanent) || 0) + (Number(g.new) || 0) + (Number(g.free) || 0), 0), 0);
  const fillPct = capacityTotal ? Math.round((studentsCount / capacityTotal) * 100) : 0;

  const expSum = (e: any) => e.children ? e.children.reduce((s: number, c: any) => s + (Number(c.planned) || 0), 0) : (Number(e.planned) || 0);
  const expense = expenses.reduce((s, e) => s + expSum(e), 0);
  const profit = revenue - expense;
  const margin = revenue ? Math.round((profit / revenue) * 100) : 0;

  const allGroups = rooms.flatMap((r) => r.groups);
  const isInd = (n: string) => /индивид/i.test(n);
  const isMini = (n: string) => /мини/i.test(n);
  const individual = allGroups.filter((g) => isInd(g.name)).reduce((s, g) => s + (Number(g.planned) || 0), 0);
  const mini = allGroups.filter((g) => !isInd(g.name) && isMini(g.name)).reduce((s, g) => s + (Number(g.planned) || 0), 0);
  const groupRev = revenue - individual - mini;
  const newRev = allGroups.reduce((s, g) => s + (Number(g.check) || 0) * (Number(g.new) || 0), 0);
  const permRev = revenue - newRev;

  const trialConv = d.funnel?.trialConv ?? 0.5, recordConv = d.funnel?.recordConv ?? 0.7, leadConv = d.funnel?.leadConv ?? 0.55;
  const trials = Math.ceil(neededSales / trialConv);
  const records = Math.ceil(trials / recordConv);
  const leads = Math.ceil(records / leadConv);

  // ---- Мутаторы ----
  const updGroup = (ri: number, gi: number, key: string, val: any) =>
    setRooms((rs) => rs.map((r, i) => i !== ri ? r : { ...r, groups: r.groups.map((g: any, j: number) => j !== gi ? g : { ...g, [key]: val }) }));
  const delGroup = (ri: number, gi: number) =>
    setRooms((rs) => rs.map((r, i) => i !== ri ? r : { ...r, groups: r.groups.filter((_: any, j: number) => j !== gi) }));
  const updExp = (key: string, val: number) => setExpenses((es) => es.map((e) => e.key !== key ? e : { ...e, planned: val }));
  const updChild = (key: string, ci: number, val: number) => setExpenses((es) => es.map((e) => e.key !== key ? e : { ...e, children: e.children.map((c: any, j: number) => j !== ci ? c : { ...c, planned: val }) }));
  const addChild = (key: string) => setExpenses((es) => es.map((e) => e.key !== key ? e : { ...e, children: [...(e.children || []), { label: "Новая строка", planned: 0 }] }));
  const delExp = (key: string) => setExpenses((es) => es.filter((e) => e.key !== key));

  // ---- План на основе ----
  const [py, pm] = (period || "2026-07").split("-");
  const prevMi = (Number(pm) + 10) % 12;
  const prevMonthLabel = `${PLAN_MONTHS_FULL[prevMi]} ${prevMi === 11 ? Number(py) - 1 : py}`;
  const prevYearLabel = `${PLAN_MONTHS_FULL[Number(pm) - 1]} ${Number(py) - 1}`;
  const basisCards = [
    { src: "prev_month", title: "Прошлый месяц", sub: `${prevMonthLabel}: ${mln(data.basis.prevMonth)}` },
    { src: "prev_year", title: "Прошлый год", sub: `${prevYearLabel}: ${mln(data.basis.prevYear)}` },
    { src: "avg", title: "Среднее значение", sub: `6 мес: ${mln(data.basis.avg6)}` },
    { src: "manual", title: "Вручную", sub: "С нуля" },
  ];

  const Chevron = ({ open }: { open: boolean }) => open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />;

  return (
    <div className="space-y-5">
      {/* Общие показатели */}
      <section className="rounded-[1.5rem] border border-white/10 bg-[#141414] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black text-white">Общие показатели · План БДР · {PLAN_MONTHS_FULL[Number(pm) - 1]} {py}</h3>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white focus:border-[#C5A059]/40 focus:outline-none">
            <option value="all">Вся сеть</option>
            {(d.branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-4 border-b border-white/10 pb-4 sm:grid-cols-3">
          <div><p className="text-[11px] font-bold text-slate-400">Выручка</p><p className="mt-1 text-2xl font-black text-white">{money(revenue)}</p></div>
          <div><p className="text-[11px] font-bold text-slate-400">Расходы</p><p className="mt-1 text-2xl font-black text-white">{money(expense)}</p></div>
          <div><p className="text-[11px] font-bold text-slate-400">Ожидаемая прибыль · {margin}%</p><p className="mt-1 text-2xl font-black text-white">{money(profit)}</p></div>
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">По типу занятий</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Групповые абонементы</span><span className="font-bold text-white">{money(groupRev)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Мини-группы</span><span className="font-bold text-white">{money(mini)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Индивидуальные</span><span className="font-bold text-white">{money(individual)}</span></div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">По аудитории</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Постоянные ученики</span><span className="font-bold text-white">{money(permRev)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Новые ученики</span><span className="font-bold text-white">{money(newRev)}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Создать план на основе */}
      <section className="rounded-[1.5rem] border border-white/10 bg-[#141414] p-5">
        <h4 className="text-sm font-black text-white">Создать план на основе</h4>
        <p className="mt-1 text-xs text-slate-400">CRM автоматически подставит цифры. Любую сумму можно изменить вручную.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {basisCards.map((c) => (
            <button key={c.src} disabled={busy} onClick={() => setBasis(c.src)}
              className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${basis === c.src ? "border-[#C5A059] bg-[#C5A059]/10" : "border-white/10 bg-white/[0.03] hover:border-[#C5A059]/40"}`}>
              <p className="text-sm font-black text-white">{c.title}</p>
              <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ПЛАНИРОВАНИЕ ДОХОДОВ — детально по группам */}
      <div>
        <button onClick={() => setOpenIncome((v) => !v)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">
          <Chevron open={openIncome} /> Планирование доходов · детально по группам
        </button>
        {openIncome && (
          <section className="mt-3 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414]">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
              <h4 className="text-base font-black text-white">Выручка по группам</h4>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-400">Филиал:
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-white focus:outline-none">
                    <option value="all">{d.branchName || "Все"}</option>
                    {(d.branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                <button className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"><Plus className="h-3.5 w-3.5" /> Открыть направление</button>
                <button className="inline-flex items-center gap-1 rounded-lg bg-[#C5A059] px-2.5 py-1 text-[11px] font-black text-black hover:brightness-110"><Sparkles className="h-3.5 w-3.5" /> Рассчитать рекомендации</button>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> авто из абонементов</span>
              </div>
            </div>

            {/* Свод по филиалу */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#C5A059]/10 px-4 py-3">
              <div>
                <p className="text-sm font-black text-white">{d.branchName || "Филиал"}</p>
                <p className="text-xs text-slate-400">{groupsCount} групп · {studentsCount} учеников · заполненность {fillPct}%</p>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className="text-[10px] font-bold uppercase text-slate-500">Выручка</p><p className="text-sm font-black text-white">{money(revenue)}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-500">Расходы</p><p className="text-sm font-black text-rose-400">{money(expense)}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-500">Прибыль</p><p className="text-sm font-black text-[#C5A059]">{money(profit)}</p></div>
              </div>
            </div>

            {/* Залы */}
            {rooms.map((r, ri) => (
              <div key={ri} className="border-b border-white/10 last:border-0">
                <button onClick={() => setOpenRooms((o) => ({ ...o, [ri]: !o[ri] }))}
                  className="flex w-full items-center justify-between bg-white/[0.03] px-4 py-2.5 text-left">
                  <span className="flex items-center gap-1.5 text-sm font-black text-white"><Chevron open={openRooms[ri]} /> {r.name} · {r.groups.length} гр · {roomStudents(r)} уч</span>
                  <span className="text-sm font-black text-white">{money(roomTotal(r))}</span>
                </button>
                {openRooms[ri] && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-left text-sm">
                      <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2 font-bold">Группа</th>
                          <th className="px-2 py-2 font-bold">Педагог</th>
                          <th className="px-2 py-2 text-center font-bold">Чек</th>
                          <th className="px-2 py-2 text-center font-bold">Пост</th>
                          <th className="px-2 py-2 text-center font-bold">Нов</th>
                          <th className="px-2 py-2 text-center font-bold">Всего</th>
                          <th className="px-2 py-2 text-center font-bold">Своб</th>
                          <th className="px-2 py-2 text-right font-bold">Факт пр. мес.</th>
                          <th className="px-2 py-2 text-right font-bold">Реком.</th>
                          <th className="px-2 py-2 text-right font-bold">План</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.groups.map((gr: any, gi: number) => (
                          <tr key={gi} className="border-t border-white/5">
                            <td className="px-4 py-2 font-bold text-white">{gr.name}</td>
                            <td className="px-2 py-2 text-slate-400">{gr.teacher || "—"}</td>
                            <td className="px-2 py-2 text-center"><input type="number" value={gr.check} onChange={(e) => updGroup(ri, gi, "check", Number(e.target.value))} className={`${numCls} w-20`} /></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={gr.permanent} onChange={(e) => updGroup(ri, gi, "permanent", Number(e.target.value))} className={`${numCls} w-14`} /></td>
                            <td className="px-2 py-2 text-center"><input type="number" value={gr.new} onChange={(e) => updGroup(ri, gi, "new", Number(e.target.value))} className={`${numCls} w-14`} /></td>
                            <td className={`px-2 py-2 text-center font-black ${Number(gr.free) <= 0 ? "text-rose-400" : "text-white"}`}>{(Number(gr.permanent) || 0) + (Number(gr.new) || 0)}</td>
                            <td className="px-2 py-2 text-center text-slate-400">{gr.free}</td>
                            <td className="px-2 py-2 text-right text-slate-400">{Number(gr.factPrev).toLocaleString("ru-RU")}</td>
                            <td className="px-2 py-2 text-right font-bold text-[#C5A059]">{Number(gr.recommended).toLocaleString("ru-RU")}</td>
                            <td className="px-2 py-2 text-right"><input type="number" value={gr.planned} onChange={(e) => updGroup(ri, gi, "planned", Number(e.target.value))} className={`${numCls} w-24 text-right`} /></td>
                            <td className="px-2 py-2 text-center"><button onClick={() => delGroup(ri, gi)} className="text-slate-500 hover:text-rose-400"><X className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>

      {/* ПЛАНИРОВАНИЕ РАСХОДОВ */}
      <div>
        <button onClick={() => setOpenExpenses((v) => !v)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">
          <Chevron open={openExpenses} /> Планирование расходов · ЗП и бонусы раскрываются по людям
        </button>
        {openExpenses && (
          <section className="mt-3 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h4 className="text-base font-black text-white">Расходы</h4>
              <button onClick={() => setExpenses((es) => [...es, { key: `cat-${Date.now()}`, label: "Новая категория", planned: 0, mode: "manual" }])}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"><Plus className="h-3.5 w-3.5" /> Категория</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Категория</th><th className="px-4 py-2 text-right font-bold">План, ₸</th><th className="px-4 py-2 font-bold">Режим</th><th className="px-2 py-2"></th></tr></thead>
                <tbody>
                  {expenses.map((e) => (
                    <React.Fragment key={e.key}>
                      <tr className="border-t border-white/5">
                        <td className="px-4 py-2">
                          {e.children ? (
                            <button onClick={() => setOpenExp((o) => ({ ...o, [e.key]: !o[e.key] }))} className="flex items-center gap-1.5 font-black text-white">
                              <Chevron open={!!openExp[e.key]} /> {e.label}
                            </button>
                          ) : <span className="font-black text-white">{e.label}</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {e.children ? <span className="font-black text-white">{Number(expSum(e)).toLocaleString("ru-RU")}</span>
                            : <input type="number" value={e.planned} onChange={(ev) => updExp(e.key, Number(ev.target.value))} className={`${numCls} w-32 text-right`} />}
                        </td>
                        <td className="px-4 py-2">{e.mode === "auto" ? <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">авто</span> : <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">вручную</span>}</td>
                        <td className="px-2 py-2"><button onClick={() => delExp(e.key)} className="text-slate-500 hover:text-rose-400"><X className="h-4 w-4" /></button></td>
                      </tr>
                      {e.children && openExp[e.key] && (
                        <>
                          {e.children.map((c: any, ci: number) => (
                            <tr key={ci} className="border-t border-white/5 bg-white/[0.02]">
                              <td className="py-1.5 pl-10 pr-4 text-slate-400">{c.label}</td>
                              <td className="px-4 py-1.5 text-right"><input type="number" value={c.planned} onChange={(ev) => updChild(e.key, ci, Number(ev.target.value))} className={`${numCls} w-32 text-right`} /></td>
                              <td colSpan={2}></td>
                            </tr>
                          ))}
                          <tr className="border-t border-white/5 bg-white/[0.02]">
                            <td className="py-1.5 pl-10 pr-4" colSpan={4}>
                              <button onClick={() => addChild(e.key)} className="text-[11px] font-bold text-[#C5A059] hover:brightness-110">+ добавить строку</button>
                            </td>
                          </tr>
                        </>
                      )}
                    </React.Fragment>
                  ))}
                  <tr className="border-t border-white/10 bg-white/[0.03]"><td className="px-4 py-2 font-black text-white">Итого расходы</td><td className="px-4 py-2 text-right font-black text-rose-400">{money(expense)}</td><td colSpan={2}></td></tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* ВОРОНКА ПРОДАЖ */}
      <div>
        <button onClick={() => setOpenFunnel((v) => !v)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">
          <Chevron open={openFunnel} /> Воронка продаж · сколько действий нужно для плана
        </button>
        {openFunnel && (
          <section className="mt-3 rounded-[1.5rem] border border-white/10 bg-[#141414] p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-slate-300">Нужно новых продаж:</span>
              <input type="number" value={neededSales} onChange={(e) => setNeededSales(Math.max(0, Number(e.target.value)))} className={`${numCls} w-20`} />
              <span className="text-xs text-slate-500">— система посчитает пробные, записи и лиды по конверсиям</span>
            </div>
            <div className="mt-4 space-y-1">
              {[
                { label: "Нужно новых продаж", value: neededSales, conv: `конверсия пробный→покупка ${Math.round(trialConv * 100)}%` },
                { label: "Провести пробных уроков", value: trials, conv: `запись→приход ${Math.round(recordConv * 100)}%` },
                { label: "Записать на пробный", value: records, conv: `лид→запись ${Math.round(leadConv * 100)}%` },
                { label: "Нужно лидов", value: leads, conv: null },
              ].map((row, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                    <span className="text-sm font-bold text-white">{row.label}</span>
                    <span className="text-xl font-black text-[#C5A059]">{row.value}</span>
                  </div>
                  {row.conv && <p className="py-0.5 text-center text-[11px] text-slate-500">↓ {row.conv}</p>}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Итоговые карточки */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { badge: null, value: money(revenue).replace(" ₸", ""), label: "Плановая выручка", cls: "text-white" },
          { badge: "−", value: money(expense).replace(" ₸", ""), label: "Плановые расходы", cls: "text-white", badgeCls: "bg-rose-500/15 text-rose-400" },
          { badge: "✓", value: money(profit).replace(" ₸", ""), label: "Плановая прибыль", cls: "text-emerald-400", badgeCls: "bg-emerald-500/15 text-emerald-400" },
          { badge: "%", value: `${margin}%`, label: "Рентабельность", cls: "text-white", badgeCls: "bg-white/10 text-slate-400" },
        ].map((c, i) => (
          <div key={i} className="rounded-[1.25rem] border border-white/10 bg-[#141414] p-5">
            {c.badge && <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black ${c.badgeCls}`}>{c.badge}</span>}
            <p className={`mt-2 text-2xl font-black ${c.cls}`}>{c.value}</p>
            <p className="mt-1 text-xs text-slate-400">{c.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

// Факт БДР: поступления по направлениям + расходы.
function PlanFactRevenueTab({ data }: any) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Поступления (факт)" value={money(data.fact.revenue)} tone="emerald" hint="из CRM" />
        <StatPill label="Расходы (факт)" value={money(data.fact.expense)} tone="rose" hint="из Бухгалтерии" />
        <StatPill label="Прибыль (факт)" value={money(data.fact.profit)} tone="emerald" />
        <StatPill label="Выполнение плана" value={`${data.fact.donePct}%`} />
      </div>
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414]">
        <div className="border-b border-white/10 px-4 py-3"><h4 className="text-sm font-black text-white">Поступления по направлениям</h4></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Направление</th><th className="px-4 py-2 text-right font-bold">План</th><th className="px-4 py-2 text-right font-bold">Факт</th><th className="px-4 py-2 text-right font-bold">Выполнение</th></tr></thead>
            <tbody>
              {data.fact.incomeByDirection.map((r: any, i: number) => {
                const pct = r.plan ? Math.round((r.fact / r.plan) * 100) : 0;
                return (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-4 py-2 font-bold text-white">{r.direction}</td>
                    <td className="px-4 py-2 text-right text-slate-300">{money(r.plan)}</td>
                    <td className="px-4 py-2 text-right text-emerald-400">{money(r.fact)}</td>
                    <td className="px-4 py-2 text-right"><span className={pct >= 100 ? "text-emerald-400" : pct >= 75 ? "text-amber-300" : "text-rose-300"}>{pct}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// План / Факт: сворачиваемая таблица «Выполнение плана по уровням» + график.
// Родительская строка «Доходы» агрегирует вложенные форматы (Групповые / Мини-группы / …).
function PlanVsFactTab({ data }: any) {
  const [openLevels, setOpenLevels] = useState(true);
  const chart = data.fact.incomeByDirection.map((r: any) => ({ name: r.direction, План: r.plan, Факт: r.fact }));
  const rows: any[] = data.levels || [];
  const total = rows.reduce(
    (a, l) => ({ plan: a.plan + l.plan, fact: a.fact + l.fact }),
    { plan: 0, fact: 0 }
  );
  const totalDev = total.fact - total.plan;
  const totalDone = total.plan ? Math.round((total.fact / total.plan) * 100) : 0;
  const nf = (v: number) => Math.round(v).toLocaleString("ru-RU");

  const DevCell = ({ v }: { v: number }) => (
    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${v < 0 ? "text-rose-500" : v > 0 ? "text-emerald-600" : "text-slate-500"}`}>
      {v > 0 ? "+" : ""}{nf(v)}
    </td>
  );
  const DoneCell = ({ v }: { v: number }) => {
    const pct = Math.max(0, Math.min(100, v));
    return (
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-black/10">
            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: v >= 100 ? "#4F8A63" : v >= 90 ? "#947C51" : v >= 75 ? "#C99A3E" : "#B14545" }} />
          </span>
          <span className="w-10 text-right tabular-nums font-bold text-slate-700">{v}%</span>
        </div>
      </td>
    );
  };

  return (
    <div className="space-y-5">
      <section>
        <button onClick={() => setOpenLevels((s) => !s)} className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-700">
          {openLevels ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Выполнение плана · по уровням
        </button>
        {openLevels && (
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Уровень</th>
                    <th className="px-4 py-3 text-right font-bold">План</th>
                    <th className="px-4 py-3 text-right font-bold">Факт</th>
                    <th className="px-4 py-3 text-right font-bold">Отклонение</th>
                    <th className="px-4 py-3 text-right font-bold">Выполнение</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Родительская строка-итог */}
                  <tr className="border-t border-white/5 bg-[#C5A059]/10">
                    <td className="px-4 py-3 font-black text-white">Доходы</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-white">{nf(total.plan)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-white">{nf(total.fact)}</td>
                    <DevCell v={totalDev} />
                    <DoneCell v={totalDone} />
                  </tr>
                  {/* Вложенные форматы */}
                  {rows.map((l, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-4 py-3 pl-8 font-semibold text-slate-200">{l.level}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-300">{nf(l.plan)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-300">{nf(l.fact)}</td>
                      <DevCell v={l.deviation} />
                      <DoneCell v={l.done} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#141414] p-5">
        <h4 className="text-sm font-black text-white">План vs Факт по направлениям</h4>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(v / 1_000_000)}М`} />
              <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ background: "#0b0b0b", border: "1px solid #ffffff20", borderRadius: 12 }} labelStyle={{ color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="План" fill="#64748b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Факт" fill="#C5A059" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

// Ежедневный отчёт управляющего — геймифицированный дашборд «Здоровье плана за 30 секунд».
const nfmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

function PlanDailyTab({ data, period }: any) {
  const d = data.detailed || {};
  const planMonth: number = d.revenue ?? data.plan?.plannedRevenue ?? 0;
  const freeSeats: number =
    (d.rooms || []).flatMap((r: any) => r.groups || []).reduce((s: number, g: any) => s + (g.free || 0), 0) || 0;

  // Осталось рабочих дней в выбранном месяце.
  const [yy, mm] = String(period || "").split("-").map(Number);
  const today = new Date();
  const daysInMonth = yy && mm ? new Date(yy, mm, 0).getDate() : 30;
  const isCurrentMonth = !!yy && !!mm && today.getFullYear() === yy && today.getMonth() + 1 === mm;
  const daysLeft = isCurrentMonth ? Math.max(0, daysInMonth - today.getDate()) : daysInMonth;

  // Геймификация управляющего (мотивационный слой поверх БДР).
  const donePct = 177;         // выполнение плана
  const forecastPct = 150;     // прогноз к концу месяца
  const streak = 0;            // дней подряд выше нормы
  const salaryBase = 350_000;
  const bonusForecast = 400_000;
  const potentialSalary = salaryBase + bonusForecast; // 750 000
  const toPlan = Math.max(0, Math.round(planMonth * (Math.max(0, 100 - donePct) / 100)));

  // Задачи дня.
  const tasks = [
    { t: "Продлить 8 учеников с истекающими абонементами", pts: 30 },
    { t: "Провести 2 пробных урока по записанным лидам", pts: 25 },
    { t: "Закрыть 2 продажи после пробного", pts: 20 },
    { t: `Дозаполнить группы со свободными местами (${freeSeats || 70} свободно)`, pts: 15 },
    { t: "Обзвонить должников и вернуть 1-2 ушедших", pts: 10 },
  ];
  const [done, setDone] = useState<boolean[]>(() => tasks.map(() => false));
  const toggle = (i: number) => setDone((s) => s.map((v, j) => (j === i ? !v : v)));
  const doneCount = done.filter(Boolean).length;
  const points = tasks.reduce((s, t, i) => s + (done[i] ? t.pts : 0), 0);

  // Кольцо прогресса.
  const R = 52, C = 2 * Math.PI * R;
  const fill = Math.min(donePct, 100) / 100;

  return (
    <div className="space-y-5">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">▾ Ежедневный отчёт управляющего</p>

      {/* Мотивационный баннер */}
      <div
        className="flex flex-col items-center gap-6 rounded-[1.75rem] p-6 lg:flex-row"
        style={{ background: "linear-gradient(135deg,#41505F 0%,#2C3945 55%,#20293300 100%), linear-gradient(135deg,#41505F,#20293350)" }}
      >
        <div className="flex items-center gap-6" style={{ color: "#EEF2F6" }}>
          <div className="relative h-[120px] w-[120px] shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={R} fill="none" stroke="#5BAF67" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - fill)} transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[26px] font-black leading-none" style={{ color: "#F4F7FA" }}>{donePct}%</span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: "#AEBCC9" }}>Выполнено</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black leading-none">🔥 {streak}</p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#AEBCC9" }}>дней подряд</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black leading-none">⭐ {points}</p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#AEBCC9" }}>очков</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black leading-none">{forecastPct}%</p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#AEBCC9" }}>прогноз</p>
            </div>
          </div>
        </div>
        <div className="flex-1 rounded-2xl px-5 py-4 text-sm leading-relaxed" style={{ background: "rgba(255,255,255,0.08)", color: "#E6ECF2" }}>
          🏆 Огонь! План закрыт на <b style={{ color: "#E7A24C" }}>{donePct}%</b>. Держи планку — каждый день выше нормы укрепляет твой стрик и бонус.
        </div>
      </div>

      {/* KPI-карточки */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DailyKpi label="План месяца" value={nfmt(planMonth)} />
        <DailyKpi label="Факт" value="" />
        <DailyKpi label="До плана" value={nfmt(toPlan)} tone="danger" />
        <DailyKpi label="Нужно в день" value="" />
        <DailyKpi label="Осталось дней" value={String(daysLeft)} />
        <DailyKpi label="Потенциальная ЗП" value={nfmt(potentialSalary)} tone="ok" />
      </div>

      {/* Задачи на сегодня */}
      <div>
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          Задачи на сегодня · {doneCount} из {tasks.length} · закрой план
        </p>
        <div className="space-y-2.5">
          {tasks.map((task, i) => (
            <button
              key={i} onClick={() => toggle(i)}
              className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#141414] px-4 py-3.5 text-left transition hover:border-[#C5A059]/40 ${done[i] ? "opacity-60" : ""}`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${done[i] ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400"}`}>
                {done[i] && <CheckCircle className="h-3.5 w-3.5" />}
              </span>
              <span className={`flex-1 text-sm font-bold text-white ${done[i] ? "line-through" : ""}`}>{task.t}</span>
              <span className="shrink-0 text-xs font-black text-[#C5A059]">+{task.pts} ⭐</span>
            </button>
          ))}
        </div>
      </div>

      {/* Заработок управляющего */}
      <div>
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Заработок управляющего</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DailyKpi label="Оклад" value={nfmt(salaryBase)} />
          <DailyKpi label={`Текущий бонус (${donePct}%)`} value="" />
          <DailyKpi label={`Прогноз бонуса (${forecastPct}%)`} value={nfmt(bonusForecast)} tone="ok" />
          <DailyKpi label="Итого к выплате" value={nfmt(potentialSalary)} tone="ok" />
        </div>
      </div>
    </div>
  );
}

function DailyKpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  const valColor = tone === "ok" ? "text-emerald-600" : tone === "danger" ? "text-rose-700" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${valColor}`}>{value || " "}</p>
    </div>
  );
}

// AI Аналитика — текстовые инсайты по плану/факту (вычисляются из данных).
function PlanAiTab({ data, period }: any) {
  const gap = data.plan.plannedRevenue - data.fact.revenue;
  const worst = [...data.fact.incomeByDirection].sort((a: any, b: any) => (a.fact / a.plan) - (b.fact / b.plan))[0];
  const best = [...data.fact.incomeByDirection].sort((a: any, b: any) => (b.fact / b.plan) - (a.fact / a.plan))[0];
  const insights = [
    `Выполнение плана выручки за ${planMonthLabel(period)}: ${data.fact.donePct}% (${money(data.fact.revenue)} из ${money(data.plan.plannedRevenue)}). До плана осталось ${money(gap)}.`,
    `Лучшее направление — «${best.direction}» (${Math.round((best.fact / best.plan) * 100)}% плана). Самое отстающее — «${worst.direction}» (${Math.round((worst.fact / worst.plan) * 100)}% плана), требует внимания.`,
    `Чтобы закрыть план, нужно ещё ~${data.funnel.neededSales} продаж: записать ${data.funnel.trials} на пробный и привлечь ${data.funnel.leads} лидов.`,
    `Плановая рентабельность ${data.plan.margin}%. При текущем факте прибыль ${money(data.fact.profit)} — ${data.fact.profit >= data.plan.plannedProfit ? "план по прибыли достигнут" : "ниже плана, контролируйте расходы"}.`,
  ];
  return (
    <section className="rounded-[1.75rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#1a1710] to-black p-5">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#C5A059]" /><h4 className="text-sm font-black uppercase tracking-wider text-white">AI-аналитика плана</h4></div>
      <ul className="mt-4 space-y-3">
        {insights.map((t, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
            <span className="mt-0.5 text-[#C5A059]">›</span><span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Настройки мотивации — редактируются владельцем.
function PlanMotivationTab({ data, busy, onSave }: any) {
  const [rows, setRows] = useState<any[]>(data.motivation);
  useEffect(() => { setRows(data.motivation); }, [data]);
  const dirty = JSON.stringify(rows) !== JSON.stringify(data.motivation);
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h4 className="text-sm font-black text-white">Настройки мотивации · пороги выполнения плана и бонусы</h4>
        <button onClick={() => setRows([...rows, { level: "Новый уровень", threshold: 0, bonus: "" }])} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white"><Plus className="h-3.5 w-3.5" /> Уровень</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2 font-bold">Уровень</th><th className="px-4 py-2 text-right font-bold">Порог, %</th><th className="px-4 py-2 font-bold">Бонус</th><th className="px-2 py-2"></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-4 py-2"><input value={r.level} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, level: e.target.value } : x))} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-white" /></td>
                <td className="px-4 py-2 text-right"><input type="number" value={r.threshold} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, threshold: Number(e.target.value) } : x))} className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-right text-white" /></td>
                <td className="px-4 py-2"><input value={r.bonus} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, bonus: e.target.value } : x))} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-white" /></td>
                <td className="px-2 py-2"><button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-white/10 px-4 py-3">
        <button disabled={busy || !dirty} onClick={() => onSave(rows)} className="rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black disabled:opacity-40">{dirty ? "Сохранить мотивацию" : "Сохранено"}</button>
      </div>
    </section>
  );
}

function OwnerScreen({ title, subtitle, children, eyebrow = "CEO Network Command", badge }: { title: string; subtitle: string; children: React.ReactNode; eyebrow?: string; badge?: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C5A059]">{eyebrow}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-white md:text-[38px]">{title}</h1>
          {badge}
        </div>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function OwnerNavButton({ tab, active, onClick, onOpenSettings }: { key?: React.Key; tab: any; active: boolean; onClick: () => void; onOpenSettings?: () => void }) {
  const Icon = tab.icon;
  const accent = tab.accent || "#C5A059";
  const label = tab.effectiveLabel || tab.label;
  return (
    <div
      className={`group flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition ${active ? "border border-[#C5A059]/25 bg-[#C5A059]/10" : "border border-transparent hover:bg-white/5"}`}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" style={{ color: active ? accent : undefined }} />
        <span className={`truncate ${active ? "" : "text-slate-400 group-hover:text-white"}`} style={{ color: active ? accent : undefined }}>{label}</span>
      </button>
      {onOpenSettings && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
          title="Настройки раздела"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-[#C5A059] focus:opacity-100 group-hover:opacity-100"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function OwnerMobileNav({ tab, active, onClick }: { key?: React.Key; tab: any; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-black uppercase ${active ? "text-[#C5A059]" : "text-slate-500"}`}>
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate px-1">{tab.short || tab.effectiveLabel || tab.label}</span>
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
          <MiniMetric label="Управляющие" value={branches.length} />
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

// AI: свободные окна студии — эвристические подсказки по загрузке залов и педагогов.
/** Карточка группы во вкладке «Расписание» с инлайн-редактированием (ТЗ 2026-07-12):
 *  название, дни, время и срок действия правятся на месте — без ухода в «Филиалы». */
function ScheduleGroupCard({ group, onUpdateGroup, onDeleteGroup }: any) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: group.name || "",
    days: (group.days || []).join(", "),
    time: group.time || "",
    endDate: (group as any).endDate || "",
    format: ((group as any).format === "individual" ? "individual" : "group") as "group" | "individual",
  });
  const save = async () => {
    if (!onUpdateGroup || !f.name.trim()) return;
    setBusy(true);
    const ok = await onUpdateGroup(group.id, {
      name: f.name.trim(),
      scheduleDays: f.days.trim() || null,
      scheduleTime: f.time.trim() || null,
      endDate: f.endDate || null,
      format: f.format,
    });
    setBusy(false);
    if (ok !== false) setEditing(false);
  };
  const inputCls = "w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder-slate-600";
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      {!editing ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{group.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{(group as any).format === "individual" ? "индивидуальные" : "групповая"} · {group.ageGroup} · {group.level}</p>
            {(group.days?.length > 0 || group.time) && <p className="mt-0.5 text-xs text-slate-500">{group.days?.join(", ")} {group.time}</p>}
            {(group as any).endDate && <p className="mt-0.5 text-[11px] text-amber-400/80">действует до {(group as any).endDate}</p>}
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{group.studentCount} учеников</p>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-1.5">
            {onUpdateGroup && (
              <button onClick={() => setEditing(true)} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 transition-colors hover:bg-white/10">Изменить</button>
            )}
            {onDeleteGroup && (
              <button onClick={() => onDeleteGroup(group.id)} className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 transition-colors hover:bg-red-500/20">Архив</button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="Название группы" className={inputCls} />
          <select value={f.format} onChange={(e) => setF((s) => ({ ...s, format: e.target.value as "group" | "individual" }))} className={inputCls}>
            <option value="group">Групповая</option>
            <option value="individual">Индивидуальные занятия</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={f.days} onChange={(e) => setF((s) => ({ ...s, days: e.target.value }))} placeholder="Дни: Пн, Ср, Пт" className={inputCls} />
            <input value={f.time} onChange={(e) => setF((s) => ({ ...s, time: e.target.value }))} placeholder="Время: 18:00–19:00" className={inputCls} />
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-slate-500">Действует до (пусто — бессрочно)</span>
            <input type="date" value={f.endDate} onChange={(e) => setF((s) => ({ ...s, endDate: e.target.value }))} className={inputCls} />
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !f.name.trim()} className="rounded-lg bg-[#C5A059] px-3 py-1.5 text-[11px] font-black text-black hover:bg-[#D4AF70] disabled:opacity-40">{busy ? "Сохранение…" : "Сохранить"}</button>
            <button onClick={() => setEditing(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white">Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleAiWindows({ hallLoad, halls, teachers, todayStats }: any) {
  const [answer, setAnswer] = useState<{ q: string; a: React.ReactNode } | null>(null);
  const loads: any[] = [...(hallLoad || [])].sort((a, b) => a.pct - b.pct);
  const freest = loads[0];
  const busiest = loads[loads.length - 1];
  const hallNames: string[] = (halls || []).map((h: any) => h.name);
  const mainHall = (halls || []).find((h: any) => /главн/i.test(h.name)) || halls?.[0];
  const mainLoad = (hallLoad || []).find((h: any) => h.id === mainHall?.id);
  const teacherNames: string[] = (teachers || []).map((t: any) => t.name);

  const questions: { q: string; build: () => React.ReactNode }[] = [
    {
      q: "Где открыть детскую группу?",
      build: () => freest
        ? <>Утром (10:00–12:00) свободнее всего <b className="text-white">{freest.name}</b> — загрузка {freest.pct}%. Подходит для малышей: спокойное время, нет пересечения со старшими.</>
        : <>Залы ещё не заданы — добавьте зал в разделе «Филиалы и группы».</>,
    },
    {
      q: "Где взрослая группа вечером?",
      build: () => freest
        ? <>Вечерний слот 19:00–20:30: рекомендую <b className="text-white">{freest.name}</b> (сейчас {freest.pct}%). {busiest && busiest.id !== freest.id ? <>Избегайте «{busiest.name}» — там пик {busiest.pct}%.</> : null}</>
        : <>Нет данных по залам.</>,
    },
    {
      q: "Когда свободен Главный зал?",
      build: () => mainHall
        ? <><b className="text-white">{mainHall.name}</b>: дневная загрузка {mainLoad ? `${mainLoad.pct}%` : "—"}. Свободные окна — будни до 14:00 и после 21:00. {todayStats ? <>Сегодня свободно мест: {todayStats.free}.</> : null}</>
        : <>Главный зал не найден среди залов: {hallNames.join(", ") || "—"}.</>,
    },
    {
      q: "У кого из педагогов есть окна?",
      build: () => teacherNames.length
        ? <>Меньше всего занятий у: <b className="text-white">{teacherNames.slice(0, 2).join(", ")}</b>. Им можно поставить дополнительную группу или замену. Всего педагогов: {teacherNames.length}.</>
        : <>Преподаватели не заданы.</>,
    },
  ];

  return (
    <div className="rounded-3xl border border-[#C5A059]/25 bg-gradient-to-br from-[#1a1710] to-[#0d0d0d] p-4">
      <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[#C5A059]" /><p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">AI: свободные окна студии</p></div>
      <div className="mt-3 space-y-1.5">
        {questions.map((item) => (
          <button key={item.q} onClick={() => setAnswer({ q: item.q, a: item.build() })}
            className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${answer?.q === item.q ? "border-[#C5A059]/50 bg-[#C5A059]/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#C5A059]/40 hover:text-white"}`}>
            {item.q}
          </button>
        ))}
      </div>
      {answer && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-slate-200">
          {answer.a}
        </div>
      )}
    </div>
  );
}

function OwnerScheduleView({ branches, groups, teachers, halls, scheduleItems, scheduleLoading, onLoadSchedule, onCreateGroup, onUpdateGroup, onDeleteGroup, onCreateLesson, onUpdateLesson, onDeleteLesson, archivedGroups = [], onRestoreGroup, onDeleteGroupPermanent }: any) {
  const today = new Date();
  const todayIso = isoDate(today);

  // Mobile-first: на телефоне открываем «День» (неделя не влезает), на десктопе — «Неделю».
  const [view, setView] = useState<"day" | "week" | "month" | "halls" | "list" | "archive">("halls");
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [activeForm, setActiveForm] = useState<"lesson" | "group" | null>(null);
  const [showGroups, setShowGroups] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterHallId, setFilterHallId] = useState("");
  const [lessonForm, setLessonForm] = useState({ branchId: "", groupId: "", teacherId: "", hallId: "", date: "", startTime: "", endTime: "", topic: "", reason: "" });
  // Список времени для выпадашек урока (08:00–22:00, шаг 30 мин).
  const LESSON_TIMES = useMemo(() => { const o: string[] = []; for (let h = 8; h <= 22; h++) for (const m of [0, 30]) o.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`); return o; }, []);
  const [groupForm, setGroupForm] = useState({ name: "", branchId: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", level: "Начинающие", scheduleDays: "", scheduleTime: "", startDate: "", endDate: "", format: "group" });
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

  // Занятия на графике = реальные уроки (schedule_lessons) + повторяющиеся блоки
  // групп по их дням/времени (Пн/Ср 18:30–20:00 → каждую неделю в периоде группы).
  const lessons = useMemo(() => {
    const passFilters = (branchId: any, teacherId: any, hallId: any) =>
      (!filterBranchId || branchId === filterBranchId) &&
      (!filterTeacherId || teacherId === filterTeacherId) &&
      (!filterHallId || hallId === filterHallId);

    // 1) Реальные уроки.
    const real = (scheduleItems || [])
      .filter((l: any) => l.status !== "cancelled")
      .filter((l: any) => passFilters(l.branchId, l.teacherId, l.hallId))
      .map((l: any) => ({ ...l, _virtual: false }));
    const realKey = new Set(real.map((l: any) => `${l.groupId}_${new Date(l.startsAt).toDateString()}`));

    // 2) Виртуальные блоки из расписания групп.
    const DAY_IDX: Record<string, number> = { "вс": 0, "пн": 1, "вт": 2, "ср": 3, "чт": 4, "пт": 5, "сб": 6 };
    const parseHM = (s: string) => { const [h, m] = String(s).trim().split(":").map((x) => parseInt(x, 10)); return { h: h || 0, m: m || 0 }; };
    const virtual: any[] = [];
    (groups || []).forEach((g: any) => {
      const days: string[] = g.days || [];
      if (!days.length || !g.time || !passFilters(g.branchId, g.teacherId, g.hallId)) return;
      const wantIdx = new Set(days.map((d) => DAY_IDX[String(d).trim().toLowerCase()]).filter((x) => x !== undefined));
      if (!wantIdx.size) return;
      const [t1, t2] = String(g.time).split(/[–—-]/).map((s: string) => s.trim());
      const sHM = parseHM(t1 || "18:30");
      const eHM = t2 ? parseHM(t2) : { h: sHM.h + 1, m: sHM.m };
      const gStart = g.startDate ? new Date(String(g.startDate).slice(0, 10) + "T00:00:00") : null;
      const gEnd = g.endDate ? new Date(String(g.endDate).slice(0, 10) + "T23:59:59") : null;
      range.days.forEach((d: Date) => {
        if (!wantIdx.has(d.getDay())) return;
        if (gStart && d < gStart) return;
        if (gEnd && d > gEnd) return;
        if (realKey.has(`${g.id}_${d.toDateString()}`)) return;
        const s = new Date(d); s.setHours(sHM.h, sHM.m, 0, 0);
        const e = new Date(d); e.setHours(eHM.h, eHM.m, 0, 0);
        if (e <= s) e.setTime(s.getTime() + 90 * 60000);
        virtual.push({
          id: `grp-${g.id}-${isoDate(d)}`, groupId: g.id, groupName: g.name,
          branchId: g.branchId, teacherId: g.teacherId, hallId: g.hallId,
          startsAt: s.toISOString(), endsAt: e.toISOString(), status: "scheduled", _virtual: true,
        });
      });
    });

    // 3) Нормализация.
    return [...real, ...virtual].map((l: any) => {
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
  }, [scheduleItems, filterBranchId, filterTeacherId, filterHallId, groupById, groups, range]);

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

  const lessonReady = Boolean(lessonForm.branchId && lessonForm.groupId && lessonForm.hallId && lessonForm.date && lessonForm.startTime && lessonForm.endTime && lessonForm.startTime < lessonForm.endTime);
  const handleSaveLesson = async () => {
    if (!lessonReady) return;
    setSaving(true);
    // Причина (перенос/болезнь/отсутствие педагога) — в примечании урока.
    const topic = [lessonForm.reason, lessonForm.topic].filter(Boolean).join(" — ");
    // Локальное время → ISO с учётом зоны (иначе Postgres трактует как UTC и время уезжает).
    const startsAt = new Date(`${lessonForm.date}T${lessonForm.startTime}`).toISOString();
    const endsAt = new Date(`${lessonForm.date}T${lessonForm.endTime}`).toISOString();
    const ok = await onCreateLesson?.({ branchId: lessonForm.branchId, groupId: lessonForm.groupId, teacherId: lessonForm.teacherId, hallId: lessonForm.hallId, startsAt, endsAt, topic });
    setSaving(false);
    if (ok) {
      const d = new Date(`${lessonForm.date}T00:00:00`); d.setHours(0, 0, 0, 0);
      const from = lessonForm.date;
      const to = isoDate(addDays(d, 1)); // до следующего дня, иначе урок в 09:00 не попадёт в диапазон
      setLessonForm({ branchId: "", groupId: "", teacherId: "", hallId: "", date: "", startTime: "", endTime: "", topic: "", reason: "" });
      setActiveForm(null);
      // Показать созданный урок: сбрасываем фильтры, переходим на его день, грузим график.
      setFilterBranchId(""); setFilterTeacherId(""); setFilterHallId("");
      setAnchor(d); setView("day");
      onLoadSchedule?.({ from, to });
    }
  };

  // Порядок внесения данных: без залов в филиале новую группу создать нельзя.
  const groupFormNoHalls = Boolean(groupForm.branchId) &&
    (halls || []).filter((h: any) => h.branchId === groupForm.branchId && String(h.status || "active") === "active").length === 0;

  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.branchId || groupFormNoHalls) return;
    setSaving(true);
    const ok = await onCreateGroup?.({ ...groupForm, ageFrom: groupForm.ageFrom ? Number(groupForm.ageFrom) : undefined, ageTo: groupForm.ageTo ? Number(groupForm.ageTo) : undefined });
    setSaving(false);
    if (ok) { setGroupForm({ name: "", branchId: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", level: "Начинающие", scheduleDays: "", scheduleTime: "", startDate: "", endDate: "", format: "group" }); setActiveForm(null); }
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Сегментный переключатель */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5">
            {([["day", "День"], ["week", "Неделя"], ["month", "Месяц"], ["halls", "По залам"], ["list", "Список групп"], ["archive", `Архив групп${archivedGroups.length ? ` (${archivedGroups.length})` : ""}`]] as const).map(([v, label]) => (
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
            <label className={labelCls}><span className={kicCls}>Филиал *</span>
              <select value={lessonForm.branchId} onChange={(e) => setLessonForm(f => ({ ...f, branchId: e.target.value, groupId: "" }))} className={inputCls}>
                <option value="">Выберите филиал</option>
                {(branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.name || b.city}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Группа *</span>
              <select value={lessonForm.groupId} onChange={(e) => setLessonForm(f => ({ ...f, groupId: e.target.value }))} className={inputCls}>
                <option value="">Выберите группу</option>
                {groups.filter((g: Group) => !lessonForm.branchId || g.branchId === lessonForm.branchId).map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Преподаватель</span>
              <select value={lessonForm.teacherId} onChange={(e) => setLessonForm(f => ({ ...f, teacherId: e.target.value }))} className={inputCls}>
                <option value="">Из группы</option>
                {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Зал *</span>
              <select value={lessonForm.hallId} onChange={(e) => setLessonForm(f => ({ ...f, hallId: e.target.value }))} className={inputCls}>
                <option value="">Выберите зал</option>
                {(halls || []).filter((h: any) => !lessonForm.branchId || h.branchId === lessonForm.branchId).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Дата урока *</span>
              <input type="date" value={lessonForm.date} min={isoDate(today)} onChange={(e) => setLessonForm(f => ({ ...f, date: e.target.value }))} className={`${inputCls} [color-scheme:dark]`} />
            </label>
            <label className={labelCls}><span className={kicCls}>Время урока *</span>
              <div className="flex items-center gap-2">
                <select value={lessonForm.startTime} onChange={(e) => setLessonForm(f => ({ ...f, startTime: e.target.value }))} className={inputCls}>
                  <option value="">с…</option>
                  {LESSON_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-slate-500">–</span>
                <select value={lessonForm.endTime} onChange={(e) => setLessonForm(f => ({ ...f, endTime: e.target.value }))} className={inputCls}>
                  <option value="">до…</option>
                  {LESSON_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </label>
            <label className={labelCls}><span className={kicCls}>Причина / тип урока</span>
              <select value={lessonForm.reason} onChange={(e) => setLessonForm(f => ({ ...f, reason: e.target.value }))} className={inputCls}>
                <option value="">— не указано —</option>
                {["Разовый урок", "Перенос урока", "Болезнь ученика", "Отсутствие педагога", "Индивидуальное занятие", "Замена педагога", "Другое"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={kicCls}>Тема / комментарий</span>
              <input type="text" value={lessonForm.topic} onChange={(e) => setLessonForm(f => ({ ...f, topic: e.target.value }))} placeholder="Напр. «перенос с пятницы»" className={inputCls} />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveLesson} disabled={saving || !lessonReady} title={!lessonReady ? "Заполните филиал, группу, зал, дату и время (конец позже начала)" : undefined} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40">{saving ? "Сохранение…" : "Создать"}</button>
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
            <label className={labelCls}><span className={kicCls}>Формат *</span>
              <select value={groupForm.format} onChange={(e) => setGroupForm(f => ({ ...f, format: e.target.value }))} className={inputCls}>
                <option value="group">Групповая</option>
                <option value="individual">Индивидуальные занятия</option>
              </select>
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
                {(halls || []).filter((h: any) => !groupForm.branchId || h.branchId === groupForm.branchId).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {groupFormNoHalls && (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300/90">
                  В этом филиале ещё нет залов. Сначала добавьте зал (Филиалы → Залы) — без залов создавать группы нельзя.
                </p>
              )}
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
            <GroupScheduleFields
              days={groupForm.scheduleDays}
              time={groupForm.scheduleTime}
              onDays={(v) => setGroupForm(f => ({ ...f, scheduleDays: v }))}
              onTime={(v) => setGroupForm(f => ({ ...f, scheduleTime: v }))}
              dark
            />
            <label className={labelCls}><span className={kicCls}>Период работы группы</span>
              <div className="flex items-center gap-2">
                <input type="date" value={groupForm.startDate} onChange={(e) => setGroupForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} title="Дата начала" />
                <span className="text-slate-500">—</span>
                <input type="date" value={groupForm.endDate} onChange={(e) => setGroupForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} title="Дата окончания" />
              </div>
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveGroup} disabled={saving || !groupForm.name || !groupForm.branchId || groupFormNoHalls} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40">{saving ? "Сохранение…" : "Создать"}</button>
            <button onClick={() => setActiveForm(null)} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400">Отмена</button>
          </div>
        </div>
      )}

      {/* Календарь + правая колонка */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {view === "archive" ? (
            /* ───── Архив групп ───── */
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
              <div className="border-b border-white/10 px-5 py-4">
                <h3 className="font-black text-white">Архив групп</h3>
                <p className="text-xs text-slate-500">Заархивированные группы. Ученики и история сохранены — можно восстановить.</p>
              </div>
              {archivedGroups.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Архив групп пуст.</p>
              ) : (
                archivedGroups.map((g: any) => (
                  <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
                    <div>
                      <p className="font-bold text-white">{g.name}</p>
                      <p className="text-xs text-slate-500">{(halls || []).find((h: any) => h.id === g.hallId)?.name || "Без зала"} · {g.scheduleText || "—"}</p>
                    </div>
                    <div className="flex gap-2">
                      {onRestoreGroup && (
                        <button onClick={() => onRestoreGroup(g.id)} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20">
                          Восстановить
                        </button>
                      )}
                      {onDeleteGroupPermanent && (
                        <button onClick={() => { if (window.confirm(`Удалить группу «${g.name}» НАВСЕГДА? Отменить нельзя. Ученики отвяжутся от группы.`)) onDeleteGroupPermanent(g.id); }} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20">
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : view === "list" ? (
            /* ───── Список групп (сортировка: филиал → педагог) ───── */
            (() => {
              const bName = (id: string) => { const b = (branches || []).find((x: any) => x.id === id); return b?.name || b?.city || "—"; };
              const tName = (id: string) => (teachers || []).find((x: any) => x.id === id)?.name || "Не назначен";
              const hName = (id: string) => (halls || []).find((x: any) => x.id === id)?.name || "—";
              const sorted = [...(groups || [])]
                .filter((g: any) => (!filterBranchId || g.branchId === filterBranchId) && (!filterTeacherId || g.teacherId === filterTeacherId) && (!filterHallId || g.hallId === filterHallId))
                .sort((a: any, b: any) => bName(a.branchId).localeCompare(bName(b.branchId)) || tName(a.teacherId).localeCompare(tName(b.teacherId)) || String(a.name).localeCompare(String(b.name)));
              return (
                <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#111]">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead><tr className="border-b border-white/10 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-4 py-3">Группа</th><th className="px-3 py-3">Филиал</th><th className="px-3 py-3">Педагог</th><th className="px-3 py-3">Зал</th><th className="px-3 py-3">Расписание</th><th className="px-3 py-3 text-center">Учеников</th><th className="px-3 py-3 text-center">Набор</th><th className="px-3 py-3" />
                    </tr></thead>
                    <tbody>
                      {sorted.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Активных групп нет.</td></tr>
                      ) : sorted.map((g: any) => (
                        <tr key={g.id} className="border-b border-white/5">
                          <td className="px-4 py-2.5 font-bold text-white">{g.name}</td>
                          <td className="px-3 py-2.5 text-slate-300">{bName(g.branchId)}</td>
                          <td className="px-3 py-2.5 text-slate-300">{tName(g.teacherId)}</td>
                          <td className="px-3 py-2.5 text-slate-400">{hName(g.hallId)}</td>
                          <td className="px-3 py-2.5 text-slate-400">{[(g.days || []).join(", "), g.time].filter(Boolean).join(" · ") || "—"}</td>
                          <td className="px-3 py-2.5 text-center text-slate-300">{g.studentCount ?? 0}</td>
                          <td className="px-3 py-2.5 text-center">
                            {/* Набор открыт/закрыт — тот же флаг, что в «Рекомендациях по набору» на дашборде */}
                            <button
                              disabled={!onUpdateGroup}
                              onClick={() => onUpdateGroup?.(g.id, { enrollmentOpen: !(g.enrollmentOpen !== false) })}
                              title="Переключить набор"
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition ${g.enrollmentOpen !== false ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"} ${onUpdateGroup ? "cursor-pointer hover:brightness-125" : "cursor-default"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${g.enrollmentOpen !== false ? "bg-emerald-400" : "bg-rose-400"}`} />
                              {g.enrollmentOpen !== false ? "Открыт" : "Закрыт"}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {onDeleteGroup && <button onClick={() => { if (window.confirm(`Архивировать группу «${g.name}»?`)) onDeleteGroup(g.id); }} className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-300">В архив</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          ) : view === "halls" ? (
            /* ───── Весь график по залам (недельная сетка) ───── */
            <GroupScheduleGrid
              groups={(groups || []).filter((g: any) =>
                (!filterBranchId || g.branchId === filterBranchId) &&
                (!filterTeacherId || g.teacherId === filterTeacherId) &&
                (!filterHallId || g.hallId === filterHallId))}
              halls={halls || []}
            />
          ) : view === "month" ? (
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
              {/* Общий горизонтальный скролл: шапка дней едет вместе с сеткой (mobile-first) */}
              <div className="overflow-x-auto">
              <div style={{ minWidth: range.days.length > 1 ? 52 + range.days.length * 96 : undefined }}>
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
              <div className="relative">
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
                              {onDeleteLesson && !l._virtual && (
                                <button onClick={() => onDeleteLesson(l.id)} title="Отменить урок" className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded bg-black/50 text-red-300 hover:bg-red-500/40 group-hover:flex"><X className="h-2.5 w-2.5" /></button>
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

          {/* AI: свободные окна студии */}
          <ScheduleAiWindows hallLoad={hallLoad} halls={halls} teachers={teachers} todayStats={todayStats} />
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
              <ScheduleGroupCard
                key={group.id}
                group={group}
                onUpdateGroup={onUpdateGroup}
                onDeleteGroup={onDeleteGroup}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
