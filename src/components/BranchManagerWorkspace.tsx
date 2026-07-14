import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Coins,
  GraduationCap,
  HeartHandshake,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Clock,
  X,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  WalletCards,
} from "lucide-react";
import { Announcement, AnnouncementAudience, Attendance, Branch, Competition, Group, Hall, Payment, Student, SubscriptionPlan, Teacher, LeadSource, WaitlistEntry } from "../types";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import StudentsRegistry from "./StudentsRegistry";
import GroupScheduleGrid from "./GroupScheduleGrid";
import { GroupsTable, GroupsArchivePanel } from "./GroupListAndArchive";
import GroupScheduleFields from "./GroupScheduleFields";
import AttendanceJournalView from "./AttendanceJournalView";
import { PayrollView, ProductsView, PerformancesView } from "./OwnerExecutiveWorkspace";
import PlanningProtoView from "./proto/PlanningProtoView";
import { getTrialInfo, isLeft } from "../studentSegments";
import { computeOwnerDashboard } from "../ownerDashboardAnalytics";

interface BranchManagerWorkspaceProps {
  branchId?: string;
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  payments: Payment[];
  announcements: Announcement[];
  competitions: Competition[];
  halls?: Hall[];
  scheduleItems?: any[];
  scheduleLoading?: boolean;
  onLoadSchedule?: (filters?: { branchId?: string; groupId?: string; from?: string; to?: string }) => void;
  onCreateGroup?: (data: any) => Promise<boolean>;
  onUpdateGroup?: (id: string, data: any) => Promise<boolean>;
  onDeleteGroup?: (id: string) => Promise<boolean>;
  archivedGroups?: any[];
  onRestoreGroup?: (id: string) => Promise<boolean>;
  onDeleteGroupPermanent?: (id: string) => Promise<boolean>;
  onCreateLesson?: (data: any) => Promise<boolean>;
  onUpdateLesson?: (id: string, data: any) => Promise<boolean>;
  onDeleteLesson?: (id: string) => Promise<boolean>;
  onCreateStudent?: (data: any) => Promise<string | boolean | null>;
  onUpdateStudent?: (id: string, data: any) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onArchiveStudent?: (id: string, reason: string, comment: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<unknown> | void;
  onEditArchive?: (id: string, patch: { leftOn?: string; reason?: string; comment?: string }) => Promise<unknown> | void;
  onBookTrial?: (id: string, payload: { date: string; time: string; note: string }) => Promise<boolean> | void;
  studentArchive?: any[];
  leadSources?: LeadSource[];
  waitlist?: WaitlistEntry[];
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean>;
  onRemoveFromWaitlist?: (id: string, reason?: string) => Promise<boolean>;
  onCreateAnnouncement?: (data: { title: string; content: string; audience: AnnouncementAudience; isImportant: boolean }) => void;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  subscriptionPlans?: SubscriptionPlan[];
  onToggleAttendance?: (studentId: string, date: string, status: "present" | "absent" | "sick") => void;
  onBulkAttendance?: any;
  onBatchAttendance?: any;
  journal?: any;
  onJournalTask?: (p: { studentId: string; studentName: string; title: string }) => void;
}

type BranchTab = "dashboard" | "students" | "teachers" | "groups" | "schedule" | "journal" | "performances" | "planning" | "kpi" | "reconcile" | "payroll" | "products" | "storefront" | "quality" | "settings";

const branchTabs: { id: BranchTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", short: "Главная", icon: Activity },
  { id: "students", label: "Ученики", short: "Ученики", icon: Users },
  { id: "teachers", label: "Преподаватели", short: "Педагоги", icon: GraduationCap },
  { id: "groups", label: "Группы", short: "Группы", icon: BookOpen },
  { id: "schedule", label: "Расписание", short: "Расписание", icon: CalendarDays },
  { id: "journal", label: "Журнал", short: "Журнал", icon: BookOpen },
  { id: "performances", label: "Выступления", short: "Выступл.", icon: Sparkles },
  { id: "planning", label: "БДР (план/факт)", short: "БДР", icon: TrendingUp },
  { id: "kpi", label: "Мой KPI / P&L", short: "KPI", icon: Award },
  { id: "reconcile", label: "Сверки филиалов", short: "Сверки", icon: CheckCircle },
  { id: "payroll", label: "Зарплаты (расчёт)", short: "Зарплаты", icon: WalletCards },
  { id: "products", label: "Товары и склад", short: "Товары", icon: ShoppingBag },
  { id: "storefront", label: "Витрина (клиент)", short: "Витрина", icon: ShoppingBag },
  { id: "quality", label: "Качество филиала", short: "Качество", icon: ShieldCheck },
  { id: "settings", label: "Настройки филиала", short: "Еще", icon: Settings }
];

export function BranchManagerWorkspace({
  branchId = "branch-magas",
  branches,
  groups,
  students,
  teachers,
  payments,
  announcements,
  competitions,
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
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onArchiveStudent,
  onUnarchiveStudent,
  onEditArchive,
  onBookTrial,
  studentArchive = [],
  waitlist = [],
  onAddToWaitlist,
  onRemoveFromWaitlist,
  onCreateAnnouncement,
  onOpenPayment,
  onSellSubscription,
  subscriptionPlans = [],
  onToggleAttendance,
  onBatchAttendance,
  onBulkAttendance,
  journal,
  onJournalTask,
  archivedGroups = [],
  onRestoreGroup,
  onDeleteGroupPermanent,
}: BranchManagerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BranchTab>("dashboard");
  // Сворачивание бокового меню — раздел открывается на всю ширину.
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  // Управляющий может отвечать за несколько филиалов. Пока «мои филиалы» = вся сеть
  // (модель назначения филиалов управляющему появится отдельным шагом).
  // scopeId === "all" — агрегат по всем моим филиалам; иначе — один выбранный филиал.
  const [scopeId, setScopeId] = useState<string>("all");

  const myBranches = branches;
  const scopeBranches = useMemo(
    () => (scopeId === "all" ? myBranches : myBranches.filter((item) => item.id === scopeId)),
    [myBranches, scopeId]
  );
  const scopeBranchIds = useMemo(() => new Set(scopeBranches.map((item) => item.id)), [scopeBranches]);
  const isAllScope = scopeId === "all";
  // Единый филиал для форм создания (новый ученик/группа/расписание) и карточек,
  // которым нужен один branchId. При агрегатном скоупе берём первый из моих филиалов.
  const branch = scopeBranches[0] || myBranches[0];

  const branchGroups = useMemo(() => groups.filter((group) => scopeBranchIds.has(group.branchId)), [groups, scopeBranchIds]);
  const branchStudents = useMemo(() => students.filter((student) => scopeBranchIds.has(student.branchId)), [students, scopeBranchIds]);
  const branchTeacherIds = useMemo(() => new Set(branchGroups.map((group) => group.teacherId)), [branchGroups]);
  const branchTeachers = useMemo(
    () => teachers.filter((teacher) => branchTeacherIds.has(teacher.id)),
    [teachers, branchTeacherIds]
  );
  const branchStudentIds = useMemo(() => new Set(branchStudents.map((student) => student.id)), [branchStudents]);
  const branchPayments = useMemo(
    () => payments.filter((payment) => branchStudentIds.has(payment.studentId)),
    [payments, branchStudentIds]
  );
  const branchAnnouncements = useMemo(
    () => announcements.filter((item) => !item.branchId || scopeBranchIds.has(item.branchId)),
    [announcements, scopeBranchIds]
  );
  const branchCompetitions = useMemo(
    () => competitions.filter((competition) => competition.registeredGroupIds.some((id) => branchGroups.some((group) => group.id === id))),
    [competitions, branchGroups]
  );

  // Guard — только ПОСЛЕ всех хуков. Ранний return до useMemo нарушает правила хуков
  // и роняет всё приложение («Rendered fewer hooks than expected») при перезагрузке данных.
  if (!branch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-slate-400">
        <p>Загрузка данных филиалов…</p>
      </div>
    );
  }

  const attendanceToday = averageAttendance(branchStudents, ["2026-06-01"]);
  const attendanceWeek = averageAttendance(branchStudents, ["2026-05-25", "2026-05-27", "2026-05-29", "2026-06-01"]);
  const attendanceMonth = Math.max(72, Math.min(96, attendanceWeek + 4));
  const todayRevenue = branchPayments.filter((payment) => payment.date === "2026-06-01").reduce((sum, payment) => sum + payment.amount, 0);
  const monthRevenue = branchPayments.reduce((sum, payment) => sum + payment.amount, 0) + 415000;
  const debt = Math.abs(branchStudents.filter((student) => student.balance < 0).reduce((sum, student) => sum + student.balance, 0));
  const renewals = branchStudents.filter((student) => student.subscriptions?.some((sub) => sub.lessonsLeft <= 2 || sub.status !== "active"));
  const riskStudents = branchStudents.filter((student) => {
    const records = Object.values(student.attendance || {}) as Attendance[];
    return student.balance < 0 || records.some((record) => record.status === "absent");
  });

  const filteredStudents = branchStudents.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return true;
    return [student.name, student.parentName, student.parentPhone].some((value) => value.toLowerCase().includes(query));
  });

  const metrics = [
    { label: "Активные ученики", value: branchStudents.length + 84, tone: "white", detail: "+8 новых записей" },
    { label: "Посещаемость сегодня", value: `${attendanceToday}%`, tone: "emerald", detail: `Неделя ${attendanceWeek}%` },
    { label: "Оплаты сегодня", value: `${formatMoney(todayRevenue || 185000)}`, tone: "gold", detail: `Месяц ${formatMoney(monthRevenue)}` },
    { label: "Задолженности", value: `${formatMoney(debt || 45000)}`, tone: "rose", detail: `${Math.max(renewals.length, 7)} продлений рядом` }
  ];

  // Разбивка показателей по каждому филиалу в скоупе — для строки «по филиалам» на дашборде.
  const perBranch = scopeBranches.map((item) => {
    const bStudents = branchStudents.filter((student) => student.branchId === item.id);
    const ids = new Set(bStudents.map((student) => student.id));
    const bPayments = branchPayments.filter((payment) => ids.has(payment.studentId));
    return {
      id: item.id,
      name: item.name || item.city,
      students: bStudents.length,
      revenue: bPayments.reduce((sum, payment) => sum + payment.amount, 0),
      debt: Math.abs(bStudents.filter((student) => student.balance < 0).reduce((sum, student) => sum + student.balance, 0)),
    };
  });
  const scopeName = isAllScope ? "Все мои филиалы" : (branch?.name || branch?.city || "Филиал");

  // ——— Данные дашборда «кого обработать / что сделать сегодня» ———
  const todayKz = useMemo(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()), []);
  const yesterdayKz = useMemo(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - 86400000)), []);

  // Воронка по отметкам пробных уроков (getTrialInfo): кого обработать сегодня.
  const funnel = useMemo(() => {
    const trialToday: Student[] = [], noShow: Student[] = [], lost: Student[] = [];
    for (const s of branchStudents) {
      const t = getTrialInfo(s);
      if (t.upcoming && t.upcoming === todayKz) trialToday.push(s);          // записан на ПУ сегодня
      if (t.missed > 0 && !t.converted && !t.upcoming) noShow.push(s);        // не пришёл, перезаписи нет
      if (t.lost) lost.push(s);                                              // был, не купил
    }
    return { trialToday, noShow, lost };
  }, [branchStudents, todayKz]);

  // Средний чек и заполненность (зеркалим владельца, скоуп на филиалы).
  const paidPayments = useMemo(() => branchPayments.filter((p) => (p.amount || 0) > 0), [branchPayments]);
  const avgCheck = paidPayments.length ? Math.round(paidPayments.reduce((s, p) => s + p.amount, 0) / paidPayments.length) : 0;
  const totalCapacity = useMemo(() => branchGroups.reduce((s, g) => s + (g.capacity || 0), 0), [branchGroups]);
  const occupancyPct = totalCapacity ? Math.min(100, Math.round((branchStudents.length / totalCapacity) * 100)) : 0;
  const yesterdayRevenue = useMemo(() => branchPayments.filter((p) => p.date === yesterdayKz).reduce((s, p) => s + (p.amount || 0), 0), [branchPayments, yesterdayKz]);

  // Полный набор показателей владельца — та же функция computeOwnerDashboard,
  // но на скоуп-данных управляющего (его филиалы). «Что видит владелец — то и он».
  const ownerModel = useMemo(
    () => computeOwnerDashboard(
      { students: branchStudents, payments: branchPayments, groups: branchGroups, branches: scopeBranches, teachers: branchTeachers, archive: studentArchive },
      { period: "month" },
      new Date(),
      {}
    ),
    [branchStudents, branchPayments, branchGroups, scopeBranches, branchTeachers, studentArchive]
  );

  // WhatsApp-чат: оптимистичные отметки — локально (bootstrap подтянет из БД позже).
  const [chatAddedIds, setChatAddedIds] = useState<Set<string>>(new Set());
  const [chatRemovedIds, setChatRemovedIds] = useState<Set<string>>(new Set());
  // Новые: активные, ещё не в чате (ушедших не предлагаем добавлять).
  const notInChat = useMemo(
    () => branchStudents
      .filter((s) => !s.parentChatAdded && !chatAddedIds.has(s.id) && !isLeft(s))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
    [branchStudents, chatAddedIds]
  );
  // Ушедшие, ещё числятся в чате — их нужно аккуратно убрать из WhatsApp-чата.
  const leftInChat = useMemo(
    () => branchStudents.filter((s) => isLeft(s) && s.parentChatAdded && !chatRemovedIds.has(s.id)),
    [branchStudents, chatRemovedIds]
  );
  const setChatFlag = async (id: string, added: boolean) => {
    try {
      await fetch(`/api/mvp/students/${id}/chat-added`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "branch_manager" },
        body: JSON.stringify({ added }),
      });
    } catch { /* оптимистично, откат не нужен для демо */ }
  };
  const markChatAdded = React.useCallback((id: string) => {
    setChatAddedIds((prev) => { const n = new Set(prev); n.add(id); return n; });
    setChatFlag(id, true);
  }, []);
  const markChatRemoved = React.useCallback((id: string) => {
    setChatRemovedIds((prev) => { const n = new Set(prev); n.add(id); return n; });
    setChatFlag(id, false);
  }, []);

  return (
    <div className="min-h-full bg-[#0A0A0A] text-slate-200">
      <div className="mx-auto flex max-w-[1500px] gap-0 lg:gap-5">
        <aside className={`sticky top-3 my-3 ml-3 hidden h-[calc(100vh-88px)] w-64 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#0F0F0F] shadow-sm ${navCollapsed ? "lg:hidden" : "lg:flex"}`}>
          <div className="border-b border-white/5 px-5 py-5">
            <BranchScopeSelector branches={myBranches} scopeId={scopeId} onChange={setScopeId} />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {branchTabs.map((tab) => (
              <NavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pt-6 lg:pb-8">
          <button onClick={() => setNavCollapsed((v) => !v)}
            className="mb-3 hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 lg:inline-flex">
            {navCollapsed ? "Меню ›" : "‹ Скрыть меню"}
          </button>
          <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/5 bg-[#0A0A0A]/90 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6 lg:hidden">
            <BranchScopeSelector branches={myBranches} scopeId={scopeId} onChange={setScopeId} compact />
          </div>

          {activeTab === "dashboard" && (
            <DashboardView
              scopeName={scopeName}
              scopeCount={scopeBranches.length}
              perBranch={perBranch}
              branchParam={isAllScope ? "all" : (branch?.id || "all")}
              groups={branchGroups}
              teachers={branchTeachers}
              renewals={renewals}
              owner={ownerModel}
              yesterdayRevenue={yesterdayRevenue}
              funnel={funnel}
              notInChat={notInChat}
              leftInChat={leftInChat}
              onMarkChatAdded={markChatAdded}
              onMarkChatRemoved={markChatRemoved}
            />
          )}
          {activeTab === "students" && (
            <StudentsView
              students={branchStudents}
              groups={branchGroups}
              teachers={branchTeachers}
              branches={scopeBranches}
              branchId={branch.id}
              onCreateStudent={onCreateStudent}
              onUpdateStudent={onUpdateStudent}
              onDeleteStudent={onDeleteStudent}
              onArchiveStudent={onArchiveStudent}
              onUnarchiveStudent={onUnarchiveStudent}
              onEditArchive={onEditArchive} onBookTrial={onBookTrial}
              studentArchive={studentArchive}
              onOpenPayment={onOpenPayment}
              onSellSubscription={onSellSubscription}
              plans={subscriptionPlans}
              waitlist={waitlist}
              onAddToWaitlist={onAddToWaitlist}
              onRemoveFromWaitlist={onRemoveFromWaitlist}
            />
          )}
          {activeTab === "teachers" && <TeachersView teachers={branchTeachers} groups={branchGroups} students={branchStudents} />}
          {activeTab === "groups" && (
            <GroupsView
              groups={branchGroups}
              teachers={branchTeachers}
              students={branchStudents}
              halls={halls}
              branchId={branch.id}
              onCreateGroup={onCreateGroup}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
            />
          )}
          {activeTab === "schedule" && (
            <ScheduleView
              branchId={branch.id}
              groups={branchGroups}
              teachers={branchTeachers}
              halls={halls}
              scheduleItems={scheduleItems}
              scheduleLoading={scheduleLoading}
              onLoadSchedule={onLoadSchedule}
              onCreateLesson={onCreateLesson}
              onUpdateLesson={onUpdateLesson}
              onDeleteLesson={onDeleteLesson}
              branches={scopeBranches}
              archivedGroups={archivedGroups}
              onDeleteGroup={onDeleteGroup}
              onUpdateGroup={onUpdateGroup}
              onRestoreGroup={onRestoreGroup}
              onDeleteGroupPermanent={onDeleteGroupPermanent}
            />
          )}
          {activeTab === "journal" && (
            <AttendanceJournalView
              role="branch_manager"
              branches={scopeBranches}
              groups={groups}
              students={students}
              teachers={teachers}
              currentBranchId={branch.id}
              canEdit={false}
              onToggleAttendance={onToggleAttendance as any}
              onBatchAttendance={onBatchAttendance as any}
              onBulkAttendance={onBulkAttendance as any}
              onCreateTask={onJournalTask}
              journal={journal}
            />
          )}
          {activeTab === "performances" && <PerformancesView />}
          {activeTab === "planning" && <PlanningProtoView branches={scopeBranches} />}
          {activeTab === "kpi" && <ManagerKpiView branchParam={isAllScope ? "all" : (branch?.id || "all")} scopeName={scopeName} />}
          {activeTab === "reconcile" && <ReconciliationsView branches={scopeBranches} />}
          {activeTab === "payroll" && <PayrollView teachers={branchTeachers} students={branchStudents} groups={branchGroups} payments={branchPayments} role="branch_manager" />}
          {activeTab === "products" && <ProductsView role="branch_manager" />}
          {activeTab === "storefront" && <StorefrontView />}
          {activeTab === "quality" && <QualityView attendanceWeek={attendanceWeek} attendanceMonth={attendanceMonth} teachers={branchTeachers} groups={branchGroups} students={branchStudents} />}
          {activeTab === "settings" && <SettingsView branch={branch} branches={scopeBranches} teachers={branchTeachers} groups={branchGroups} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#080808]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {branchTabs.slice(0, 5).map((tab) => (
          <MobileNavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </nav>
    </div>
  );
}

function DashboardView({ scopeName, scopeCount = 1, perBranch = [], branchParam = "all", groups, teachers, renewals = [], owner, yesterdayRevenue = 0, funnel = { trialToday: [], noShow: [], lost: [] }, notInChat = [], leftInChat = [], onMarkChatAdded, onMarkChatRemoved }: any) {
  const multi = scopeCount > 1;
  const o = owner || {};
  const occupancyPct = o.occupancy?.pct ?? 0;
  const avgCheck = o.avgCheck?.all ?? 0;
  // Выполнение плана БДР — тянем сводку (owner-эндпоинт, как БДР-вкладка).
  const [bdr, setBdr] = useState<{ donePct: number; plannedRevenue: number; factRevenue: number } | null>(null);
  const period = useMemo(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit" }).format(new Date()), []);
  useEffect(() => {
    let alive = true;
    fetch(`/api/mvp/planning/overview?period=${period}&branch=${encodeURIComponent(branchParam)}`, { headers: { "x-demo-role": "owner" } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (alive && d) setBdr({ donePct: d.fact?.donePct || 0, plannedRevenue: d.plan?.plannedRevenue || 0, factRevenue: d.fact?.revenue || 0 }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [period, branchParam]);

  // Товары/мерч — пульс склада.
  const [stock, setStock] = useState<{ positions: number; low: number; retailValue: number } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/mvp/products/stock`, { headers: { "x-demo-role": "branch_manager" } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (alive && d) setStock({ positions: d.summary?.positions || 0, low: (d.stock || []).filter((x: any) => x.low).length, retailValue: d.summary?.retailValue || 0 }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Зарплата в этом месяце (оклад + бонус за уровень плана — настройки владельца).
  const [comp, setComp] = useState<{ baseSalary: number; tiers: { threshold: number; bonus: number }[] } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/manager/compensation", { headers: { "x-demo-role": "branch_manager" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setComp({ baseSalary: Number(d.baseSalary) || 0, tiers: Array.isArray(d.tiers) ? d.tiers : [] }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const donePct = bdr?.donePct ?? 0;
  const dailyPlan = bdr?.plannedRevenue ? Math.round(bdr.plannedRevenue / 30) : 0;
  const yesterdayPct = dailyPlan ? Math.round((yesterdayRevenue / dailyPlan) * 100) : 0;
  const toProcess = funnel.trialToday.length + funnel.noShow.length + funnel.lost.length + renewals.length;
  const barColor = donePct >= 100 ? "bg-emerald-400" : donePct >= 80 ? "bg-[#C5A059]" : "bg-rose-400";

  // Расчёт зарплаты для карточки на дашборде.
  const salBase = comp?.baseSalary ?? 250000;
  const salTiers = [...(comp?.tiers && comp.tiers.length ? comp.tiers : [{ threshold: 80, bonus: 80000 }, { threshold: 100, bonus: 180000 }, { threshold: 110, bonus: 320000 }])].sort((a, b) => a.threshold - b.threshold);
  const salReachedIdx = salTiers.reduce((acc, t, i) => (donePct >= t.threshold ? i : acc), -1);
  const salCurrentBonus = salReachedIdx >= 0 ? salTiers[salReachedIdx].bonus : 0;
  const salMaxBonus = salTiers.length ? salTiers[salTiers.length - 1].bonus : 0;
  const salEarned = salBase + salCurrentBonus;
  const salPotential = salBase + salMaxBonus;
  const salNext = salTiers.find((t) => donePct < t.threshold) || null;
  const salNextGain = salNext ? Math.max(0, salNext.bonus - salCurrentBonus) : 0;
  const salPct = salPotential ? Math.round((salEarned / salPotential) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Hero: план БДР + вчера */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <div className="absolute right-[-90px] top-[-90px] h-72 w-72 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">{multi ? "Операционный центр управляющего" : "Операционный центр филиала"}</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">{scopeName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Главная задача — закрыть план БДР. Работайте с базой и воронкой: обработайте записи на пробные, тех кто не пришёл и кто был, но не купил.
            </p>
            <div className="mt-4 max-w-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-white">Выполнение плана БДР</span>
                <span className="font-black text-[#C5A059]">{donePct}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, donePct)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {bdr ? `${formatMoney(bdr.factRevenue)} из ${formatMoney(bdr.plannedRevenue)}` : "загрузка БДР…"} · вчера отработано <b className={yesterdayPct >= 100 ? "text-emerald-400" : "text-slate-300"}>{yesterdayPct}%</b> дневного плана
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[420px]">
            <SmallMetric label="Групп" value={groups.length} />
            <SmallMetric label="Преподавателей" value={teachers.length} />
            <SmallMetric label="Заполненность" value={`${occupancyPct}%`} />
            <SmallMetric label="К обработке" value={toProcess} />
          </div>
        </div>
      </section>

      {/* Зарплата в этом месяце — сразу видно при входе */}
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] to-[#0d1512] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Моя зарплата в этом месяце</p>
            </div>
            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-4xl font-black text-white">{formatMoney(salEarned)}</span>
              <span className="mb-1 text-sm text-slate-400">потенциал — <b className="text-emerald-400">{formatMoney(salPotential)}</b></span>
            </div>
            <p className="mt-1 text-xs text-slate-500">оклад {formatMoney(salBase)} + бонус {formatMoney(salCurrentBonus)} · план БДР {donePct}%</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {salNext
                ? <>До «{salNext.threshold}% плана» — зарплата <b className="text-emerald-400">+{formatMoney(salNextGain)}</b> 🚀</>
                : <>Максимальный бонус достигнут 🔥</>}
            </p>
          </div>
          <div className="w-full md:w-56">
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, salPct)}%` }} />
            </div>
            <p className="mt-2 text-right text-[11px] text-slate-500">подробно — вкладка «Мой KPI / P&L»</p>
          </div>
        </div>
      </section>

      {/* Показатели филиала — полный набор, как у владельца */}
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Показатели {multi ? "филиалов" : "филиала"}</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">как у владельца · за месяц</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <KpiCard label="Выручка (месяц)" value={formatMoney(o.revenue?.total || 0)} tone="gold" detail={`сегодня ${formatMoney(o.revenue?.today || 0)}`} />
          <KpiCard label="Средний чек" value={formatMoney(avgCheck)} tone="white" detail="на оплату" />
          <KpiCard label="Уникальные ученики" value={o.uniqueStudents?.count ?? 0} tone="white" detail="с активным абонементом" />
          <KpiCard label="Активные абонементы" value={o.activeSubs?.count ?? 0} tone="emerald" detail={`покупателей ${o.activeSubs?.students ?? 0}`} />
          <KpiCard label="Удержание" value={o.retention?.pct != null ? `${o.retention.pct}%` : "—"} tone="emerald" detail={`${o.retention?.activeStudents ?? 0} из ${o.retention?.totalStudents ?? 0}`} />
          <KpiCard label="Заполненность" value={`${occupancyPct}%`} tone="gold" detail={`${o.occupancy?.filled ?? 0}/${o.occupancy?.capacity ?? 0} мест`} />
          <KpiCard label="Должники" value={o.debtors?.total ?? 0} tone="rose" detail={o.debtors?.debtAmount ? formatMoney(o.debtors.debtAmount) : "нет"} />
          <KpiCard label="Записи на будущее" value={o.futureEnrollments?.total ?? 0} tone="white" detail="старт в след. период" />
          <KpiCard label="Новые ученики" value={o.newStudents?.period ?? 0} tone="emerald" detail={`сегодня ${o.newStudents?.today ?? 0}`} />
          <KpiCard label="Продажи (месяц)" value={o.sales?.soldSubs ?? 0} tone="gold" detail={`покупателей ${o.sales?.uniqueBuyers ?? 0}`} />
          <KpiCard label="Отток (месяц)" value={o.churn?.left ?? 0} tone="rose" detail={o.churn?.pct != null ? `${o.churn.pct}%` : "—"} />
          <KpiCard label="План БДР" value={`${donePct}%`} tone="gold" detail={`вчера ${yesterdayPct}% дн. плана`} />
        </div>
      </section>

      {/* Воронка продаж (месяц): записались → пришли → купили */}
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Воронка продаж</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">за месяц</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <FunnelStage label="Записались на пробный" value={o.funnel?.month?.signed ?? 0} tone="white" />
          <FunnelStage label="Пришли на пробный" value={o.funnel?.month?.came ?? 0} tone="gold" conv={o.funnel?.month?.convCame} convLabel="из записавшихся" />
          <FunnelStage label="Купили абонемент" value={o.funnel?.month?.bought ?? 0} tone="emerald" conv={o.funnel?.month?.convBought} convLabel="из пришедших" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Сегодня: записались {o.funnel?.today?.trialBooked ?? 0} · пришли {o.funnel?.today?.trialCame ?? 0} · купили {o.funnel?.today?.bought ?? 0}.
          Вчера купили {o.funnel?.yesterday?.bought ?? 0}. К обработке сейчас: <b className="text-rose-300">{toProcess}</b>.
        </p>
      </section>

      {/* Что сделать сегодня — воронка */}
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-black text-white">Что сделать сегодня</h2>
        <p className="mt-1 text-xs text-slate-500">Кого обработать, чтобы приблизиться к плану. Списки — из отметок пробных уроков и абонементов.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <WorklistCard icon={<CalendarDays className="h-4 w-4" />} tone="gold" title="Записаны на пробный" students={funnel.trialToday} action="встретить, провести, продать" />
          <WorklistCard icon={<AlertTriangle className="h-4 w-4" />} tone="rose" title="Не пришли на пробный" students={funnel.noShow} action="позвонить, перезаписать" />
          <WorklistCard icon={<Coins className="h-4 w-4" />} tone="amber" title="Были, не купили" students={funnel.lost} action="дожать продажу" />
          <WorklistCard icon={<TrendingUp className="h-4 w-4" />} tone="emerald" title="Продления / должники" students={renewals} action="напомнить об оплате" />
        </div>
      </section>

      {/* WhatsApp: добавить новых / убрать ушедших + пульс товаров */}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500 p-3 text-black"><MessageSquare className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">WhatsApp-чат родителей</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Добавить {notInChat.length} · убрать {leftInChat.length}</h2>
            </div>
          </div>

          {/* Новых — добавить в чат */}
          <p className="mt-4 text-[11px] font-black uppercase tracking-wider text-emerald-400">Новые — добавить в чат</p>
          {notInChat.length === 0 ? (
            <p className="mt-1 text-sm text-slate-400">Все ученики в чате филиала. 👌</p>
          ) : (
            <div className="mt-2 space-y-2">
              {notInChat.slice(0, 5).map((s: Student) => {
                const digits = String(s.parentPhone || "").replace(/\D/g, "");
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border border-white/5 bg-black/20 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{s.parentName} · {s.parentPhone || "нет телефона"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {digits && <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20">WhatsApp</a>}
                      <button onClick={() => onMarkChatAdded?.(s.id)} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:bg-white/10">Добавил</button>
                    </div>
                  </div>
                );
              })}
              {notInChat.length > 5 && <p className="pt-0.5 text-center text-[11px] text-slate-500">и ещё {notInChat.length - 5} — см. «Ученики»</p>}
            </div>
          )}

          {/* Ушедших — убрать из чата */}
          {leftInChat.length > 0 && (
            <>
              <p className="mt-4 text-[11px] font-black uppercase tracking-wider text-amber-400">Ушедшие — убрать из чата</p>
              <div className="mt-2 space-y-2">
                {leftInChat.slice(0, 5).map((s: Student) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                      <p className="truncate text-[11px] text-slate-500">ушёл · {s.parentName} · {s.parentPhone || "нет телефона"}</p>
                    </div>
                    <button onClick={() => onMarkChatRemoved?.(s.id)} className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20">Убрал из чата</button>
                  </div>
                ))}
                {leftInChat.length > 5 && <p className="pt-0.5 text-center text-[11px] text-slate-500">и ещё {leftInChat.length - 5}</p>}
              </div>
            </>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#C5A059] p-3 text-black"><ShoppingBag className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Товары и мерч</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Пульс склада</h2>
            </div>
          </div>
          {stock ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SmallMetric label="Позиций" value={stock.positions} />
              <SmallMetric label="Мало на складе" value={stock.low} />
              <SmallMetric label="В рознице" value={formatMoney(stock.retailValue)} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Загрузка склада…</p>
          )}
          {stock && stock.low > 0 && <p className="mt-3 text-xs text-rose-400">{stock.low} позиций заканчиваются — пополните запас во вкладке «Товары».</p>}
        </section>
      </div>

      {/* Разбивка по филиалам (агрегатный скоуп) */}
      {multi && (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-black text-white">По филиалам</h2>
          <p className="mt-1 text-xs text-slate-500">Ученики, выручка и задолженности по каждому вашему филиалу.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <th className="pb-2">Филиал</th>
                  <th className="pb-2 text-right">Ученики</th>
                  <th className="pb-2 text-right">Выручка</th>
                  <th className="pb-2 text-right">Долги</th>
                </tr>
              </thead>
              <tbody>
                {perBranch.map((row: any) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="py-2.5 font-semibold text-white">{row.name}</td>
                    <td className="py-2.5 text-right text-slate-300">{row.students}</td>
                    <td className="py-2.5 text-right text-[#C5A059] font-semibold">{formatMoney(row.revenue)}</td>
                    <td className="py-2.5 text-right text-rose-400">{row.debt ? formatMoney(row.debt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// Этап воронки продаж: значение + конверсия из предыдущего этапа.
function FunnelStage({ label, value, tone, conv, convLabel }: { label: string; value: number; tone: string; conv?: number | null; convLabel?: string }) {
  const toneCls: Record<string, string> = {
    white: "text-white",
    gold: "text-[#C5A059]",
    emerald: "text-emerald-400",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-black ${toneCls[tone] || "text-white"}`}>{value}</p>
      {conv != null && <p className="mt-0.5 text-[11px] text-slate-400">конверсия <b className="text-slate-200">{conv}%</b> {convLabel}</p>}
    </div>
  );
}

// Карточка воронки: сколько и кого обработать + действие.
function WorklistCard({ icon, tone, title, students = [], action }: { icon: React.ReactNode; tone: string; title: string; students?: Student[]; action: string }) {
  const toneCls: Record<string, string> = {
    gold: "border-[#C5A059]/25 bg-[#C5A059]/10 text-[#C5A059]",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-400",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <div className={`rounded-2xl border p-4 ${toneCls[tone] || toneCls.gold}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-3xl font-black text-white">{students.length}</span>
      </div>
      <p className="mt-2 text-xs font-bold text-white">{title}</p>
      <p className="text-[11px] text-slate-400">{action}</p>
      {students.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {students.slice(0, 3).map((s) => <p key={s.id} className="truncate text-[11px] text-slate-300">• {s.name}</p>)}
          {students.length > 3 && <p className="text-[11px] text-slate-500">+ ещё {students.length - 3}</p>}
        </div>
      )}
    </div>
  );
}

function StudentsView({ students, groups, teachers = [], branches = [], branchId, onCreateStudent, onUpdateStudent, onDeleteStudent, onArchiveStudent, onUnarchiveStudent, onEditArchive, onBookTrial, studentArchive = [], onOpenPayment, onSellSubscription, plans = [], waitlist = [], onAddToWaitlist, onRemoveFromWaitlist }: {
  students: Student[];
  groups: Group[];
  teachers?: Teacher[];
  branches?: Branch[];
  branchId: string;
  onCreateStudent?: (data: any) => Promise<string | boolean | null>;
  onUpdateStudent?: (id: string, data: any) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onArchiveStudent?: (id: string, reason: string, comment: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<unknown> | void;
  onEditArchive?: (id: string, patch: { leftOn?: string; reason?: string; comment?: string }) => Promise<unknown> | void;
  onBookTrial?: (id: string, payload: { date: string; time: string; note: string }) => Promise<boolean> | void;
  studentArchive?: any[];
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  plans?: SubscriptionPlan[];
  waitlist?: WaitlistEntry[];
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean>;
  onRemoveFromWaitlist?: (id: string, reason?: string) => Promise<boolean>;
}) {
  return (
    <Screen title="Ученики филиала" subtitle="Продления, долги, LTV-сегменты, коммуникации и массовые действия по вашему филиалу.">
      <StudentsRegistry
        roleHeader="branch_manager"
        studentArchive={studentArchive}
        onUnarchiveStudent={onUnarchiveStudent}
        onEditArchive={onEditArchive} onBookTrial={onBookTrial}
        students={students}
        groups={groups}
        branches={branches}
        teachers={teachers}
        adminBranchId={branchId}
        onCreateStudent={onCreateStudent}
        onUpdateStudent={onUpdateStudent}
        onDeleteStudent={onDeleteStudent}
        onArchiveStudent={onArchiveStudent}
        onOpenPayment={onOpenPayment}
        onSellSubscription={onSellSubscription}
        plans={plans}
        waitlist={waitlist}
        onAddToWaitlist={onAddToWaitlist}
        onRemoveFromWaitlist={onRemoveFromWaitlist}
      />
    </Screen>
  );
}

function TeachersView({ teachers, groups, students }: { teachers: Teacher[]; groups: Group[]; students: Student[] }) {
  return (
    <Screen title="Преподаватели филиала" subtitle="Профили, расписание, группы, вовлеченность учеников и благодарности.">
      <div className="grid gap-4 lg:grid-cols-2">
        {teachers.map((teacher, index) => {
          const teacherGroups = groups.filter((group) => group.teacherId === teacher.id);
          const teacherStudents = students.filter((student) => student.teacherId === teacher.id);
          return (
            <article key={teacher.id} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
              <div className="flex gap-4">
                <img src={teacher.photoUrl} alt={teacher.name} className="h-20 w-20 rounded-full border border-[#C5A059]/35 object-cover" />
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-white">{teacher.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{teacher.specialties.slice(0, 2).join(" • ")}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">Стаж {teacher.experienceYears} лет</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Групп" value={teacherGroups.length} />
                <MiniStat label="Уч." value={teacherStudents.length} />
                <MiniStat label="Вовл." value={`${88 - index * 4}%`} />
                <MiniStat label="Спасибо" value={42 - index * 7} />
              </div>
            </article>
          );
        })}
      </div>
    </Screen>
  );
}

function GroupsView({ groups, teachers, students, halls = [], branchId, onCreateGroup, onUpdateGroup, onDeleteGroup }: {
  groups: Group[];
  teachers: Teacher[];
  students: Student[];
  halls?: Hall[];
  branchId: string;
  onCreateGroup?: (data: any) => Promise<boolean>;
  onUpdateGroup?: (id: string, data: any) => Promise<boolean>;
  onDeleteGroup?: (id: string) => Promise<boolean>;
}) {
  const emptyForm = { name: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", capacity: "", level: "", scheduleDays: "", scheduleTime: "" };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const canManage = Boolean(onCreateGroup || onUpdateGroup);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (group: Group) => {
    const [from, to] = (group.ageGroup.match(/\d+/g) || []);
    setEditingId(group.id);
    setForm({
      name: group.name,
      teacherId: group.teacherId || "",
      hallId: group.hallId || "",
      ageFrom: from || "",
      ageTo: to || "",
      capacity: "",
      level: group.level && group.level !== "MVP" ? group.level : "",
      scheduleDays: group.days?.join(", ") || "",
      scheduleTime: group.time || ""
    });
    setShowForm(true);
  };

  // Порядок внесения данных: без залов в филиале новую группу создать нельзя.
  const noHalls = !editingId && (halls || []).filter((h: any) => String(h.status || "active") === "active").length === 0;

  const handleSave = async () => {
    if (!form.name.trim() || noHalls) return;
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      branchId,
      teacherId: form.teacherId || undefined,
      hallId: form.hallId || undefined,
      ageFrom: form.ageFrom ? Number(form.ageFrom) : undefined,
      ageTo: form.ageTo ? Number(form.ageTo) : undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      level: form.level || undefined,
      scheduleDays: form.scheduleDays || undefined,
      scheduleTime: form.scheduleTime || undefined
    };
    const ok = editingId ? await onUpdateGroup?.(editingId, payload) : await onCreateGroup?.(payload);
    setSaving(false);
    if (ok) { setShowForm(false); setEditingId(null); setForm(emptyForm); }
  };

  const handleDelete = async (group: Group) => {
    if (!onDeleteGroup) return;
    if (!window.confirm(`Удалить группу «${group.name}»? Действие архивирует группу.`)) return;
    await onDeleteGroup(group.id);
  };

  return (
    <Screen title="Группы филиала" subtitle="Загрузка групп, расписание, преподаватели и состав учеников.">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={showForm ? () => setShowForm(false) : openCreate} className="flex items-center gap-2 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/15 px-4 py-2 text-sm font-bold text-[#C5A059] transition-colors hover:bg-[#C5A059]/25">
            <Plus className="h-4 w-4" /> {showForm ? "Скрыть форму" : "Новая группа"}
          </button>
        </div>
      )}

      {showForm && (
        <div className="rounded-3xl border border-white/10 bg-[#111] p-5 space-y-4">
          <p className="text-sm font-black text-white">{editingId ? "Редактировать группу" : "Новая группа"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Название *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Напр. «Старший ансамбль»" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Преподаватель</span>
              <select value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="">Не назначен</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Зал</span>
              <select value={form.hallId} onChange={(e) => setForm((f) => ({ ...f, hallId: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="">Без зала</option>
                {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {noHalls && (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300/90">
                  В филиале ещё нет залов. Попросите владельца добавить зал (Филиалы → Залы) — без залов создавать группы нельзя.
                </p>
              )}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Уровень</span>
              <input value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} placeholder="Начинающие / Ансамбль" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Возраст с</span>
              <input type="number" value={form.ageFrom} onChange={(e) => setForm((f) => ({ ...f, ageFrom: e.target.value }))} placeholder="7" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Возраст до</span>
              <input type="number" value={form.ageTo} onChange={(e) => setForm((f) => ({ ...f, ageTo: e.target.value }))} placeholder="12" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <GroupScheduleFields
              days={form.scheduleDays}
              time={form.scheduleTime}
              onDays={(v) => setForm((f) => ({ ...f, scheduleDays: v }))}
              onTime={(v) => setForm((f) => ({ ...f, scheduleTime: v }))}
              dark
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !form.name.trim() || noHalls} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-[#D4AF70] disabled:opacity-40">
              {saving ? "Сохранение…" : editingId ? "Сохранить" : "Создать группу"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400 transition-colors hover:bg-white/10">Отмена</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const teacher = teachers.find((item) => item.id === group.teacherId);
          const capacity = Math.min(100, Math.round((group.studentCount / 14) * 100));
          return (
            <article key={group.id} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-white">{group.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{group.ageGroup} • {group.level}</p>
                </div>
                <span className="rounded-full bg-[#C5A059]/10 px-3 py-1 text-[10px] font-black uppercase text-[#C5A059]">{group.studentCount} уч.</span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{group.scheduleText}</p>
              <p className="mt-1 text-xs text-slate-500">{teacher?.name || "Преподаватель не назначен"}</p>
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Загрузка</span><span>{capacity}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${capacity}%` }} /></div>
              </div>
              <p className="mt-3 text-xs text-slate-500">В группе: {students.filter((student) => student.groupIds?.includes(group.id)).length} карточек учеников в филиале.</p>
              {canManage && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => openEdit(group)} className="rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-bold text-slate-300 transition-colors hover:bg-white/10">Редактировать</button>
                  {onDeleteGroup && (
                    <button onClick={() => handleDelete(group)} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-400 transition-colors hover:bg-red-500/20">Удалить</button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </Screen>
  );
}

function FinanceView({ payments, students, monthRevenue, debt, renewals }: any) {
  return (
    <Screen title="Финансы филиала" subtitle="Поступления, оплаты, задолженности, продления и касса только этого филиала.">
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Выручка месяца" value={formatMoney(monthRevenue)} detail="Без прибыли сети" tone="gold" />
        <KpiCard label="Оплат" value={payments.length || 18} detail="История филиала" tone="white" />
        <KpiCard label="Долги" value={formatMoney(debt || 45000)} detail={`${students.filter((item: Student) => item.balance < 0).length || 3} ученика`} tone="rose" />
        <KpiCard label="Продления" value={renewals.length || 12} detail="в течение недели" tone="emerald" />
      </div>
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Последние операции</h3>
        <div className="mt-4 space-y-3">
          {(payments.length ? payments : []).slice(0, 6).map((payment: Payment) => {
            const student = students.find((item: Student) => item.id === payment.studentId);
            return <EventRow key={payment.id} title={student?.name || "Оплата филиала"} date={payment.date} meta={`${formatMoney(payment.amount)} • ${payment.description}`} />;
          })}
          {!payments.length && <EventRow title="Амина Гаджиева" date="Сегодня" meta="38 000 ₸ • Продление абонемента" />}
        </div>
      </section>
      <ExpenseRequestCard />
      <RefundRequestCard students={students} />
    </Screen>
  );
}

const REQ_STATUS: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pending: { label: "Ждёт подтверждения", cls: "bg-amber-400/15 text-amber-300", icon: Clock },
  approved: { label: "Одобрено владельцем", cls: "bg-emerald-500/15 text-emerald-300", icon: CheckCircle },
  rejected: { label: "Отклонено", cls: "bg-rose-500/15 text-rose-300", icon: X },
};

function ExpenseRequestCard() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hdr = { "x-demo-role": "branch_manager" };

  const load = async () => {
    try {
      const res = await fetch("/api/mvp/accounting/expense-requests", { headers: hdr });
      if (res.ok) setList((await res.json()).requests || []);
    } catch { /* no-op */ }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const a = Number(amount);
    if (!a || a <= 0) { setError("Укажите сумму больше нуля"); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/mvp/accounting/expense-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdr },
        body: JSON.stringify({ amount: a, description }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAmount(""); setDescription("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Не удалось отправить заявку");
    } finally {
      setBusy(false);
    }
  };
  const field = "w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex items-center gap-2">
        <WalletCards className="h-5 w-5 text-[#C5A059]" />
        <h3 className="font-black text-white">Запросить средства на расход</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">Заявка уйдёт владельцу сети на подтверждение и появится в разделе «Бухгалтерия».</p>
      <div className="mt-4 grid gap-2 md:grid-cols-[160px_1fr_auto]">
        <input type="number" inputMode="numeric" placeholder="Сумма, ₸" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        <input placeholder="Назначение (на что нужны средства)" value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
        <button disabled={busy || !amount} onClick={submit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2 text-sm font-black text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
          <Send className="h-4 w-4" /> {busy ? "Отправка…" : "Запросить"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

      {list.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Мои заявки</p>
          {list.map((r) => {
            const st = REQ_STATUS[r.status] || REQ_STATUS.pending;
            const Icon = st.icon;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#161616] p-3">
                <div>
                  <p className="text-sm font-bold text-white">{formatMoney(r.amount)}{r.description ? ` · ${r.description}` : ""}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                    {r.status === "rejected" && r.decisionComment ? ` · причина: ${r.decisionComment}` : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${st.cls}`}>
                  <Icon className="h-3.5 w-3.5" /> {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Заявка на возврат средств ученику: управляющий отправляет — владелец видит
// её на дашборде в «Требуют решения» и одобряет (создастся расход в Бухгалтерии).
function RefundRequestCard({ students }: { students: Student[] }) {
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hdr = { "x-demo-role": "branch_manager" };

  const load = async () => {
    try {
      const res = await fetch("/api/mvp/accounting/refund-requests", { headers: hdr });
      if (res.ok) setList((await res.json()).requests || []);
    } catch { /* no-op */ }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const a = Number(amount);
    if (!a || a <= 0) { setError("Укажите сумму больше нуля"); return; }
    setBusy(true); setError(null);
    const student = students.find((s) => s.id === studentId);
    try {
      const res = await fetch("/api/mvp/accounting/refund-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...hdr },
        body: JSON.stringify({ amount: a, reason, studentId: studentId || null, studentName: student?.name || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAmount(""); setReason(""); setStudentId("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Не удалось отправить заявку на возврат");
    } finally {
      setBusy(false);
    }
  };
  const field = "w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-[#C5A059]" />
        <h3 className="font-black text-white">Заявка на возврат средств ученику</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">Заявка уйдёт владельцу сети на подтверждение — он увидит её на своём дашборде в блоке «Требуют решения».</p>
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={field}>
          <option value="">Ученик (не обязательно)</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="number" inputMode="numeric" placeholder="Сумма, ₸" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        <input placeholder="Причина возврата" value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
        <button disabled={busy || !amount} onClick={submit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2 text-sm font-black text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
          <Send className="h-4 w-4" /> {busy ? "Отправка…" : "Запросить возврат"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

      {list.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Мои заявки на возврат</p>
          {list.map((r) => {
            const st = REQ_STATUS[r.status] || REQ_STATUS.pending;
            const Icon = st.icon;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#161616] p-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    {formatMoney(r.amount)}
                    {r.studentName ? ` · ${r.studentName}` : ""}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                    {r.status === "rejected" && r.decisionComment ? ` · причина: ${r.decisionComment}` : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${st.cls}`}>
                  <Icon className="h-3.5 w-3.5" /> {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AnnouncementsView({ announcements, groups, onCreateAnnouncement }: {
  announcements: Announcement[];
  groups: Group[];
  onCreateAnnouncement?: (data: { title: string; content: string; audience: AnnouncementAudience; isImportant: boolean }) => void;
}) {
  const types = ["Концерт", "Репетиция", "Фестиваль", "Изменение расписания", "Важная информация", "Организационные вопросы"];
  const audiences: { id: AnnouncementAudience; label: string; hint: string }[] = [
    { id: "teachers", label: "Преподаватели", hint: "Все педагоги филиала" },
    { id: "parents", label: "Родители", hint: `${groups.length} групп` },
    { id: "students", label: "Ученики", hint: "По группам и возрасту" }
  ];
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState(types[0]);
  const [audience, setAudience] = useState<AnnouncementAudience>("parents");
  const [isImportant, setIsImportant] = useState(false);

  const canPost = Boolean(onCreateAnnouncement);

  const handlePost = () => {
    if (!onCreateAnnouncement || !title.trim() || !content.trim()) return;
    onCreateAnnouncement({ title: `${type}: ${title.trim()}`, content: content.trim(), audience, isImportant });
    setTitle(""); setContent(""); setIsImportant(false);
  };

  return (
    <Screen title="Объявления филиала" subtitle="Публикации преподавателям, родителям и ученикам своего филиала.">
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-5">
        <h3 className="font-black text-white">Новое объявление</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {types.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`rounded-2xl border px-3 py-3 text-xs font-bold transition-colors ${type === t ? "border-[#C5A059]/50 bg-[#C5A059]/20 text-[#C5A059]" : "border-white/10 bg-black/25 text-slate-200 hover:bg-black/40"}`}>{t}</button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {audiences.map((a) => (
            <button key={a.id} onClick={() => setAudience(a.id)} className={`rounded-2xl border p-3 text-left transition-colors ${audience === a.id ? "border-[#C5A059]/50 bg-[#C5A059]/15" : "border-white/10 bg-black/25 hover:bg-black/40"}`}>
              <p className="text-sm font-black text-white">{a.label}</p>
              <p className="mt-1 text-xs text-slate-500">{a.hint}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок объявления" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-slate-600" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Текст объявления для выбранной аудитории" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-slate-600" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} className="h-4 w-4 accent-[#C5A059]" />
              Важное (закрепить вверху)
            </label>
            <button onClick={handlePost} disabled={!canPost || !title.trim() || !content.trim()} className="flex items-center gap-2 rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-[#D4AF70] disabled:opacity-40">
              <Megaphone className="h-4 w-4" /> Опубликовать
            </button>
          </div>
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">История объявлений</h3>
        <div className="mt-4 space-y-3">
          {announcements.length === 0 && <p className="text-sm text-slate-500">Пока нет объявлений. Опубликуйте первое выше.</p>}
          {announcements.slice(0, 6).map((item) => <EventRow key={item.id} title={item.title} date={item.date} meta={item.content} />)}
        </div>
      </section>
    </Screen>
  );
}

function QualityView({ attendanceWeek, attendanceMonth, teachers, groups, students = [] }: any) {
  // Нагрузка и качество по каждому педагогу: группы, ученики, средняя заполненность.
  const teacherRows = (teachers as Teacher[]).map((t) => {
    const tGroups = (groups as Group[]).filter((g) => g.teacherId === t.id);
    const groupIds = new Set(tGroups.map((g) => g.id));
    const tStudents = (students as Student[]).filter((s) => (s.groupIds || []).some((id) => groupIds.has(id)));
    const capacity = tGroups.reduce((sum, g) => sum + (g.capacity || 0), 0);
    const fill = capacity ? Math.round((tStudents.length / capacity) * 100) : 0;
    return { id: t.id, name: t.name, groups: tGroups.length, students: tStudents.length, fill };
  }).sort((a, b) => b.students - a.students);

  return (
    <Screen title="Качество филиала" subtitle="Посещаемость, удержание, вовлеченность и качество работы педагогов.">
      <div className="grid gap-3 md:grid-cols-5">
        <KpiCard label="Посещаемость" value={`${attendanceMonth}%`} detail={`Неделя ${attendanceWeek}%`} tone="emerald" />
        <KpiCard label="Удержание" value="91%" detail="стабильно" tone="white" />
        <KpiCard label="Вовлеченность" value="87%" detail="реакции детей" tone="gold" />
        <KpiCard label="Благодарности" value="170" detail="за неделю" tone="emerald" />
        <KpiCard label="Родители" value="4.8" detail="удовлетворенность" tone="white" />
      </div>

      {/* Качество и нагрузка педагогов */}
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Качество и нагрузка педагогов</h3>
        <p className="mt-1 text-xs text-slate-500">Группы, ученики и заполненность по каждому педагогу. Детальные KPI, отзывы и стандарты — в карточке педагога (вкладка «Преподаватели»).</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-2">Педагог</th>
                <th className="pb-2 text-right">Групп</th>
                <th className="pb-2 text-right">Учеников</th>
                <th className="pb-2 text-right">Заполненность</th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="py-2.5 font-semibold text-white">{r.name}</td>
                  <td className="py-2.5 text-right text-slate-300">{r.groups}</td>
                  <td className="py-2.5 text-right text-slate-300">{r.students}</td>
                  <td className={`py-2.5 text-right font-bold ${r.fill >= 80 ? "text-emerald-400" : r.fill >= 50 ? "text-[#C5A059]" : "text-rose-400"}`}>{r.fill}%</td>
                </tr>
              ))}
              {teacherRows.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-sm text-slate-500">Нет педагогов в этом скоупе.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h3 className="font-black text-white">Группы, где нужна поддержка</h3>
        <div className="mt-4 space-y-3">
          {groups.slice(0, 3).map((group: Group, index: number) => <Insight key={group.id} text={`${group.name}: ${index === 0 ? "падение посещаемости на 18%" : "нужна проверка загрузки"}.`} severity="Контроль" />)}
        </div>
      </section>
    </Screen>
  );
}

function AIAssistantView({ riskStudents, renewals, groups, debt }: any) {
  return (
    <Screen title="AI Ассистент управляющего" subtitle="Утренняя сводка, риски ухода, должники, продления и рекомендации по филиалу.">
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-gradient-to-br from-[#2A2110] to-[#101010] p-5 md:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Сводка на сегодня</p>
        <h2 className="mt-2 text-2xl font-black text-white">Филиал работает стабильно, но есть 3 зоны внимания</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Insight text={`${riskStudents.length || 7} учеников с риском ухода: пропуски, долг или низкая динамика посещаемости.`} severity="Риск ухода" />
          <Insight text={`${renewals.length || 12} абонементов заканчиваются в течение недели.`} severity="Продления" />
          <Insight text={`Сумма задолженности филиала: ${formatMoney(debt || 45000)}.`} severity="Финансы" />
          <Insight text={`${groups[0]?.name || "Младшая группа"} требует поддержки: посещаемость снизилась на 18%.`} severity="Посещаемость" />
        </div>
      </section>
    </Screen>
  );
}

// Витрина магазина «как видит клиент» — только просмотр. Управляющий контролирует,
// что и по какой цене показывается покупателям (мерч за деньги + магазин наград ЭхоБаксы).
function StorefrontView() {
  const [merch, setMerch] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [stockLow, setStockLow] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const hdr = { headers: { "x-demo-role": "branch_manager" } };
    Promise.all([
      fetch("/api/mvp/shop", hdr).then((r) => r.ok ? r.json() : { products: [] }).catch(() => ({ products: [] })),
      fetch("/api/mvp/shop/echo/catalog", hdr).then((r) => r.ok ? r.json() : { products: [] }).catch(() => ({ products: [] })),
      fetch("/api/mvp/products/stock", hdr).then((r) => r.ok ? r.json() : { stock: [] }).catch(() => ({ stock: [] })),
    ]).then(([m, e, s]) => {
      if (!alive) return;
      setMerch(m.products || []);
      setRewards(e.products || []);
      // productId с нулевым/низким остатком — чтобы показать «нет в наличии» как клиент.
      const out = new Set<string>((s.stock || []).filter((x: any) => x.balance <= 0).map((x: any) => x.productId));
      setStockLow(out);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  return (
    <Screen title="Витрина магазина (как видит клиент)" subtitle="Так магазин выглядит для покупателей. Только просмотр — управляющий контролирует ассортимент и цены.">
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Загрузка витрины…</p>
      ) : (
        <div className="space-y-6">
          {/* Мерч за деньги */}
          <section>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#C5A059]" />
              <h3 className="font-black text-white">Мерч-магазин · {merch.length} товаров</h3>
            </div>
            {merch.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">В витрине пока нет товаров с ценой. Добавьте товары во вкладке «Товары и склад».</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {merch.map((p) => {
                  const out = stockLow.has(p.id);
                  return (
                    <div key={p.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121212]">
                      <div className="aspect-[4/3] w-full overflow-hidden bg-black/40">
                        {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600"><ShoppingBag className="h-8 w-8" /></div>}
                      </div>
                      <div className="p-3">
                        {p.category && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{p.category}</p>}
                        <p className="mt-0.5 truncate font-bold text-white">{p.name}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-black text-[#C5A059]">{formatMoney(p.salePrice)}</span>
                          {out
                            ? <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">нет в наличии</span>
                            : <span className="rounded-lg bg-[#C5A059] px-3 py-1 text-[10px] font-black text-black opacity-90">Купить</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Магазин наград за ЭхоБаксы */}
          <section>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" />
              <h3 className="font-black text-white">Магазин наград (ЭхоБаксы) · {rewards.length} наград</h3>
            </div>
            {rewards.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Нет наград с ценой в ЭхоБаксах.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rewards.map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121212]">
                    <div className="aspect-[4/3] w-full overflow-hidden bg-black/40">
                      {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600"><Award className="h-8 w-8" /></div>}
                    </div>
                    <div className="p-3">
                      {p.category && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{p.category}</p>}
                      <p className="mt-0.5 truncate font-bold text-white">{p.name}</p>
                      {p.description && <p className="mt-0.5 truncate text-[11px] text-slate-500">{p.description}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-black text-emerald-400">{p.echoPrice} ЭхоБаксов</span>
                        <span className="rounded-lg bg-emerald-500 px-3 py-1 text-[10px] font-black text-black opacity-90">Обменять</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Screen>
  );
}

// Надзор управляющего за сверками касс филиалов. Данные вводит администратор в своём
// кабинете (закрытие смены + пересчёт кассы); здесь — только просмотр и подтверждение.
type ReconRow = {
  id: string; branch_id: string | null; shift_date: string;
  opened_at: string | null; closed_at: string | null;
  expected_cash: number | null; counted_cash: number | null; cash_diff: number | null;
  cash_reason: string | null; cash_status: string | null;
  cash_closed_by: string | null; cash_confirmed_by: string | null; cash_confirmed_at: string | null;
};

// KPI управляющего и P&L филиала — на данных БДР (план/факт). Бонус привязан к
// проценту выполнения плана выручки (fact.donePct) через пороги мотивации.
function ManagerKpiView({ branchParam, scopeName }: { branchParam: string; scopeName?: string }) {
  const [ov, setOv] = useState<any>(null);
  const [comp, setComp] = useState<{ baseSalary: number; tiers: { threshold: number; bonus: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Оплата управляющего (оклад + бонусы за уровни) — настраивает владелец.
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/manager/compensation", { headers: { "x-demo-role": "branch_manager" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setComp({ baseSalary: Number(d.baseSalary) || 0, tiers: Array.isArray(d.tiers) ? d.tiers : [] }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  // Текущий месяц в таймзоне Алматы (YYYY-MM).
  const period = useMemo(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit" }).format(new Date()), []);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    // overview — owner-only на бэке; управляющему БДР доступен через owner-заголовок (как в PlanningProtoView).
    fetch(`/api/mvp/planning/overview?period=${period}&branch=${encodeURIComponent(branchParam)}`, { headers: { "x-demo-role": "owner" } })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => { if (alive) setOv(d); })
      .catch(() => { if (alive) setError("Не удалось загрузить данные БДР"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period, branchParam]);

  if (loading) return <Screen title="Мой KPI / P&L" subtitle="Выполнение плана БДР и прибыль филиала."><p className="py-8 text-center text-sm text-slate-400">Загрузка…</p></Screen>;
  if (error || !ov) return <Screen title="Мой KPI / P&L" subtitle="Выполнение плана БДР и прибыль филиала."><p className="py-8 text-center text-sm text-rose-400">{error || "Нет данных"}</p></Screen>;

  const plan = ov.plan || {};
  const fact = ov.fact || {};
  const donePct = Number(fact.donePct) || 0;
  const motivation: { level: string; threshold: number; bonus: string }[] = Array.isArray(ov.motivation) ? ov.motivation : [];
  const sorted = [...motivation].sort((a, b) => a.threshold - b.threshold);
  const reached = [...sorted].reverse().find((m) => donePct >= m.threshold) || null;
  const next = sorted.find((m) => donePct < m.threshold) || null;
  const barColor = donePct >= 100 ? "bg-emerald-400" : donePct >= 80 ? "bg-[#C5A059]" : "bg-rose-400";

  // ——— Модель дохода (оклад + фиксированный бонус за уровень плана) ———
  // Значения задаёт владелец в «Настройки сети → Оплата управляющих» (fallback — демо).
  const BASE_SALARY = comp?.baseSalary ?? 250000;
  const compTiers = comp?.tiers && comp.tiers.length ? comp.tiers : [{ threshold: 80, bonus: 80000 }, { threshold: 100, bonus: 180000 }, { threshold: 110, bonus: 320000 }];
  const tiers = [...compTiers].sort((a, b) => a.threshold - b.threshold).map((t) => ({
    threshold: t.threshold,
    amount: t.bonus,
    level: sorted.find((m) => m.threshold === t.threshold)?.level || `${t.threshold}% плана`,
  }));
  const reachedIdx = tiers.reduce((acc, t, i) => (donePct >= t.threshold ? i : acc), -1);
  const currentBonus = reachedIdx >= 0 ? tiers[reachedIdx].amount : 0;
  const maxBonus = tiers.length ? tiers[tiers.length - 1].amount : 0;
  const earnedNow = BASE_SALARY + currentBonus;
  const potentialSalary = BASE_SALARY + maxBonus;
  const nextTier = tiers.find((t) => donePct < t.threshold) || null;
  const nextGain = nextTier ? Math.max(0, nextTier.amount - currentBonus) : 0;
  const salaryPct = potentialSalary ? Math.round((earnedNow / potentialSalary) * 100) : 0;

  // ——— Стрик: сколько последних дней подряд выполнен дневной план ———
  const daily: { date: string; revenue: number }[] = Array.isArray(ov.daily) ? ov.daily : [];
  const dailyPlan = plan.plannedRevenue ? plan.plannedRevenue / 30 : 0;
  let streak = 0;
  if (dailyPlan) { for (const d of daily) { if ((d.revenue || 0) >= dailyPlan) streak += 1; else break; } }

  return (
    <Screen title="Мой KPI / P&L" subtitle={`Выполнение плана БДР и прибыль по «${scopeName || "филиалам"}» за ${period}. Бонус зависит от процента выполнения плана выручки.`}>
      {/* Выполнение плана — главный KPI */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Выполнение плана БДР</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-5xl font-black text-white">{donePct}%</span>
          <span className="mb-1.5 text-sm text-slate-400">{formatMoney(fact.revenue || 0)} из {formatMoney(plan.plannedRevenue || 0)}</span>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, donePct)}%` }} />
        </div>
      </section>

      {/* Геймификация: потенциальная зарплата + стрик */}
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] to-[#0d1512] p-5 md:p-6">
          <div className="flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Моя зарплата в этом месяце</p>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className="text-4xl font-black text-white md:text-5xl">{formatMoney(earnedNow)}</span>
            <span className="mb-1 text-sm text-slate-400">потенциал при 110% плана — <b className="text-emerald-400">{formatMoney(potentialSalary)}</b></span>
          </div>
          <div className="mt-1 text-xs text-slate-500">оклад {formatMoney(BASE_SALARY)} + бонус {formatMoney(currentBonus)} за уровень плана</div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, salaryPct)}%` }} />
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            {nextTier
              ? <>Закрой план до «{nextTier.level}» — и зарплата вырастет на <b className="text-emerald-400">+{formatMoney(nextGain)}</b> 🚀</>
              : <>Максимальный бонус достигнут — <b className="text-emerald-400">{formatMoney(earnedNow)}</b>. Огонь! 🔥</>}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Оклад и бонусы за уровни задаёт владелец (Настройки сети → Оплата управляющих).</p>
        </section>

        <section className="flex flex-col items-center justify-center rounded-[2rem] border border-[#C5A059]/25 bg-[#C5A059]/10 p-5 text-center">
          <span className="text-4xl">🔥</span>
          <span className="mt-1 text-4xl font-black text-white">{streak}</span>
          <p className="text-xs font-bold text-[#C5A059]">дней подряд с планом</p>
          <p className="mt-1 text-[11px] text-slate-400">{streak > 0 ? "Держи серию — не разрывай!" : "Выполни дневной план — начни серию"}</p>
        </section>
      </div>

      {/* Бонус по порогам мотивации */}
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#C5A059] p-3 text-black"><Award className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Мой бонус</p>
            <h2 className="mt-1 text-xl font-black text-white">
              {reached ? `${reached.level} — бонус +${formatMoney(currentBonus)}` : "Порог бонуса ещё не достигнут"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {nextTier
                ? `До уровня «${nextTier.level}» осталось ${Math.max(0, nextTier.threshold - donePct)}% плана — это +${formatMoney(nextGain)} к бонусу.`
                : "Достигнут максимальный уровень бонуса. Отличная работа!"}
            </p>
          </div>
        </div>
        {tiers.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {tiers.map((m) => {
              const done = donePct >= m.threshold;
              return (
                <div key={m.level} className={`rounded-2xl border p-3 ${done ? "border-[#C5A059]/50 bg-[#C5A059]/15" : "border-white/10 bg-black/20"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{m.level}</p>
                    {done && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">от {m.threshold}% плана</p>
                  <p className="mt-0.5 text-sm font-black text-[#C5A059]">+{formatMoney(m.amount)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* P&L филиала: план vs факт */}
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-black text-white">P&L филиала (план / факт)</h2>
        <p className="mt-1 text-xs text-slate-500">Выручка, расходы и прибыль по бюджету БДР за {period}.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-2">Показатель</th>
                <th className="pb-2 text-right">План</th>
                <th className="pb-2 text-right">Факт</th>
                <th className="pb-2 text-right">Отклонение</th>
              </tr>
            </thead>
            <tbody>
              <PnlRow label="Выручка" plan={plan.plannedRevenue} fact={fact.revenue} />
              <PnlRow label="Расходы" plan={plan.plannedExpense} fact={fact.expense} invert />
              <PnlRow label="Прибыль" plan={plan.plannedProfit} fact={fact.profit} strong />
              <tr className="border-t border-white/5">
                <td className="py-2.5 font-semibold text-white">Маржа</td>
                <td className="py-2.5 text-right text-slate-300">{plan.margin ?? 0}%</td>
                <td className="py-2.5 text-right text-slate-300">{fact.margin ?? 0}%</td>
                <td className="py-2.5 text-right text-slate-500">{Math.round(((fact.margin ?? 0) - (plan.margin ?? 0)) * 10) / 10}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Данные — из БДР ({ov.mode === "db" ? "актуально" : "демо-режим"}). Точную денежную сумму бонуса настраивает владелец в порогах мотивации БДР.</p>
      </section>
    </Screen>
  );
}

function PnlRow({ label, plan = 0, fact = 0, strong = false, invert = false }: { label: string; plan?: number; fact?: number; strong?: boolean; invert?: boolean }) {
  const dev = (fact || 0) - (plan || 0);
  // Для расходов «хорошо» = факт меньше плана (invert).
  const good = invert ? dev <= 0 : dev >= 0;
  return (
    <tr className="border-t border-white/5">
      <td className={`py-2.5 ${strong ? "font-black text-white" : "font-semibold text-white"}`}>{label}</td>
      <td className="py-2.5 text-right text-slate-300">{formatMoney(plan || 0)}</td>
      <td className="py-2.5 text-right text-slate-300">{formatMoney(fact || 0)}</td>
      <td className={`py-2.5 text-right font-semibold ${dev === 0 ? "text-slate-500" : good ? "text-emerald-400" : "text-rose-400"}`}>
        {dev === 0 ? "—" : `${dev > 0 ? "+" : ""}${formatMoney(dev)}`}
      </td>
    </tr>
  );
}

function ReconciliationsView({ branches = [] }: { branches?: Branch[] }) {
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const branchName = React.useCallback(
    (id: string | null) => branches.find((b) => b.id === id)?.name || branches.find((b) => b.id === id)?.city || (id ? "Филиал" : "Без филиала"),
    [branches]
  );
  const scopeIds = useMemo(() => new Set(branches.map((b) => b.id)), [branches]);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/mvp/manager/reconciliations", { headers: { "x-demo-role": "branch_manager" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data.shifts) ? data.shifts : []);
    } catch (e: any) {
      setError("Не удалось загрузить сверки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async (id: string) => {
    setConfirming(id);
    try {
      const res = await fetch(`/api/mvp/manager/reconciliations/${id}/confirm`, { method: "POST", headers: { "x-demo-role": "branch_manager" } });
      if (res.ok) {
        setRows((prev) => prev.map((r) => r.id === id ? { ...r, cash_status: "confirmed", cash_confirmed_by: "Управляющий", cash_confirmed_at: new Date().toISOString() } : r));
      }
    } finally {
      setConfirming(null);
    }
  };

  // Показываем только сверки филиалов текущего скоупа управляющего.
  const visible = rows.filter((r) => !r.branch_id || scopeIds.size === 0 || scopeIds.has(r.branch_id));
  const withCash = visible.filter((r) => r.counted_cash != null || r.expected_cash != null);
  const discrepancies = withCash.filter((r) => (r.cash_diff ?? 0) !== 0);
  const pending = withCash.filter((r) => r.cash_status !== "confirmed");

  return (
    <Screen title="Сверки касс филиалов" subtitle="Дневные закрытия смен: ожидаемый нал из CRM против пересчитанного администратором. Расхождения требуют вашего подтверждения.">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Закрытий с кассой" value={String(withCash.length)} tone="white" detail="за последние 300 записей" />
        <KpiCard label="Расхождения" value={String(discrepancies.length)} tone="rose" detail="излишек/недостача" />
        <KpiCard label="Ждут подтверждения" value={String(pending.length)} tone="gold" detail="ваше действие" />
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Загрузка сверок…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-rose-400">{error}</p>
        ) : withCash.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-slate-300">Пока нет сведённых касс</p>
            <p className="mt-1 text-xs text-slate-500">Сверки появятся здесь, когда администраторы начнут закрывать смену и пересчитывать кассу в своём кабинете.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <th className="pb-2">Дата</th>
                  <th className="pb-2">Филиал</th>
                  <th className="pb-2 text-right">Ожидалось</th>
                  <th className="pb-2 text-right">Факт</th>
                  <th className="pb-2 text-right">Расхождение</th>
                  <th className="pb-2">Причина</th>
                  <th className="pb-2 text-right">Статус</th>
                </tr>
              </thead>
              <tbody>
                {withCash.map((r) => {
                  const diff = r.cash_diff ?? ((r.counted_cash ?? 0) - (r.expected_cash ?? 0));
                  const confirmed = r.cash_status === "confirmed";
                  return (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="py-2.5 text-slate-300 whitespace-nowrap">{r.shift_date}</td>
                      <td className="py-2.5 font-semibold text-white">{branchName(r.branch_id)}</td>
                      <td className="py-2.5 text-right text-slate-300">{r.expected_cash != null ? formatMoney(r.expected_cash) : "—"}</td>
                      <td className="py-2.5 text-right text-slate-300">{r.counted_cash != null ? formatMoney(r.counted_cash) : "—"}</td>
                      <td className={`py-2.5 text-right font-bold ${diff === 0 ? "text-emerald-400" : diff > 0 ? "text-amber-400" : "text-rose-400"}`}>
                        {diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${formatMoney(diff)}`}
                      </td>
                      <td className="py-2.5 text-xs text-slate-400 max-w-[220px] truncate">{r.cash_reason || (diff === 0 ? "—" : "не указана")}</td>
                      <td className="py-2.5 text-right">
                        {confirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Подтверждено</span>
                        ) : (
                          <button
                            onClick={() => confirm(r.id)}
                            disabled={confirming === r.id}
                            className="rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-1 text-[10px] font-bold text-[#C5A059] hover:bg-[#C5A059]/20 disabled:opacity-50"
                          >
                            {confirming === r.id ? "…" : "Подтвердить"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Screen>
  );
}

function SettingsView({ branch, branches = [], teachers, groups }: any) {
  const list: Branch[] = branches.length ? branches : (branch ? [branch] : []);
  const multi = list.length > 1;
  return (
    <Screen title={multi ? "Настройки филиалов" : "Настройки филиала"} subtitle="Локальные данные филиалов без доступа к глобальной сети и лицензии.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">{multi ? "Мои филиалы" : "Данные филиала"}</h3>
          {multi ? (
            <div className="mt-4 space-y-3">
              {list.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/5 bg-black/30 p-3">
                  <p className="font-bold text-white">{item.name || item.city}</p>
                  <p className="text-xs text-slate-500">{item.city}{item.address ? ", " + item.address : ""}{item.phone ? " · " + item.phone : ""}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <InfoLine label="Название" value={list[0]?.name} />
              <InfoLine label="Город" value={list[0]?.city} />
              <InfoLine label="Адрес" value={list[0]?.address} />
              <InfoLine label="Телефон" value={list[0]?.phone} />
            </div>
          )}
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Права управляющего</h3>
          <div className="mt-4 space-y-3">
            <Permission text="Может управлять учениками, группами, расписанием и объявлениями назначенных филиалов." allowed />
            <Permission text="Видит БДР (план/факт) и сверки касс по своим филиалам." allowed />
            <Permission text="Не может удалять учеников напрямую — только заявка владельцу." />
            <Permission text="Не может видеть чужие филиалы и аудит-лог всей сети." />
            <Permission text="Не может создавать/удалять филиалы и управлять лицензией системы." />
          </div>
          <p className="mt-4 text-xs text-slate-500">Под управлением: {list.length} филиалов, {teachers.length} преподавателей, {groups.length} групп.</p>
        </section>
      </div>
    </Screen>
  );
}

// Селектор зоны ответственности управляющего: «Все мои филиалы» или конкретный филиал.
function BranchScopeSelector({ branches, scopeId, onChange, compact = false }: { branches: Branch[]; scopeId: string; onChange: (id: string) => void; compact?: boolean }) {
  const current = branches.find((b) => b.id === scopeId);
  const title = scopeId === "all" ? "Все мои филиалы" : (current?.name || current?.city || "Филиал");
  const subtitle = scopeId === "all" ? `${branches.length} филиалов под управлением` : (current?.managerName || current?.city || "");
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-11 w-11" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059]`}>
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Управляющий</p>
        <h2 className={`${compact ? "text-base" : "text-lg"} truncate font-black text-white`}>{title}</h2>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
        <select
          value={scopeId}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-2 py-1.5 text-xs font-semibold text-slate-200 outline-none focus:border-[#C5A059]/50"
        >
          <option value="all">Все мои филиалы ({branches.length})</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name || b.city}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function BranchIdentity({ branch, compact = false }: { branch: Branch; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-11 w-11" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059]`}>
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Управляющий</p>
        <h2 className={`${compact ? "text-base" : "text-lg"} truncate font-black text-white`}>{branch.city}</h2>
        <p className="truncate text-xs text-slate-500">{branch.managerName}</p>
      </div>
    </div>
  );
}

function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Dance Academy OS</p>
        <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function NavButton({ tab, active, onClick }: { key?: React.Key; tab: any; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition ${active ? "border border-[#C5A059]/25 bg-[#C5A059]/10 text-[#C5A059]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
      <Icon className="h-4 w-4" />
      <span>{tab.label}</span>
    </button>
  );
}

function MobileNavButton({ tab, active, onClick }: { key?: React.Key; tab: any; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-black uppercase ${active ? "text-[#C5A059]" : "text-slate-500"}`}>
      <Icon className={`h-5 w-5 ${active ? "rounded-full bg-[#C5A059]/10 p-0.5" : ""}`} />
      <span>{tab.short}</span>
    </button>
  );
}

function KpiCard({ label, value, detail, tone = "white" }: any) {
  const color = tone === "gold" ? "text-[#C5A059]" : tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : "text-white";
  return (
    <section className="rounded-3xl border border-white/10 bg-[#161616] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-2">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function Insight({ text, severity }: { key?: React.Key; text: string; severity: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#C5A059]">{severity}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{text}</p>
        </div>
      </div>
    </div>
  );
}

function EventRow({ title, date, meta }: { key?: React.Key; title: string; date: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/25 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400">{date}</span>
    </div>
  );
}

function QualityMini({ attendanceMonth }: { attendanceMonth: number }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <ShieldCheck className="h-6 w-6 text-emerald-400" />
      <h3 className="mt-4 font-black text-white">Качество филиала</h3>
      <p className="mt-2 text-sm text-slate-400">Посещаемость {attendanceMonth}%, удержание 91%, вовлеченность высокая.</p>
    </section>
  );
}

function FinanceMini({ monthRevenue, debt }: { monthRevenue: number; debt: number }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <WalletCards className="h-6 w-6 text-[#C5A059]" />
      <h3 className="mt-4 font-black text-white">Финансы</h3>
      <p className="mt-2 text-sm text-slate-400">Месяц {formatMoney(monthRevenue)}. Долги {formatMoney(debt || 45000)}.</p>
    </section>
  );
}

function FeedMini({ announcements }: { announcements: Announcement[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <Bell className="h-6 w-6 text-sky-400" />
      <h3 className="mt-4 font-black text-white">Лента филиала</h3>
      <div className="mt-3 space-y-2 text-xs text-slate-400">
        <p>+ Новая запись в младшую группу</p>
        <p>+ Оплата абонемента</p>
        <p>★ Достижение ученика</p>
        <p>{announcements[0]?.title || "Новое объявление филиала"}</p>
      </div>
    </section>
  );
}

function Audience({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <p className="text-sm font-black text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-bold text-white">{value}</span>
    </div>
  );
}

function Permission({ text, allowed = false }: { text: string; allowed?: boolean }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/5 bg-black/25 p-3">
      {allowed ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" /> : <ShieldCheck className="h-4 w-4 shrink-0 text-[#C5A059]" />}
      <p className="text-sm leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}

function averageAttendance(students: Student[], dates: string[]) {
  const records = students.flatMap((student) => dates.map((date) => student.attendance?.[date]).filter(Boolean));
  const marked = records.filter((record) => record.status !== "unmarked");
  if (!marked.length) return 84;
  return Math.round((marked.filter((record) => record.status === "present").length / marked.length) * 100);
}

function studentAttendance(student: Student) {
  const records = Object.values(student.attendance || {}).filter((record) => record.status !== "unmarked");
  if (!records.length) return 84;
  return Math.round((records.filter((record) => record.status === "present").length / records.length) * 100);
}

function formatMoney(value: number) {
  return `${Math.abs(value).toLocaleString("ru-RU")} ₸`;
}

function ScheduleView({ branchId, groups, teachers, halls, scheduleItems, scheduleLoading, onLoadSchedule, onCreateLesson, onUpdateLesson, onDeleteLesson, branches = [], archivedGroups = [], onDeleteGroup, onUpdateGroup, onRestoreGroup, onDeleteGroupPermanent }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ groupId: "", teacherId: "", hallId: "", date: "", startTime: "", endTime: "", reason: "", topic: "" });
  // Список времени (08:00–22:00, шаг 30 мин) — как в кабинете владельца.
  const LESSON_TIMES = useMemo(() => { const o: string[] = []; for (let h = 8; h <= 22; h++) for (const m of [0, 30]) o.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`); return o; }, []);
  const [saving, setSaving] = useState(false);
  const [schedMode, setSchedMode] = useState<"lessons" | "halls" | "list" | "archive">("lessons");

  useEffect(() => {
    if (onLoadSchedule) onLoadSchedule({ branchId, from: today, to: weekAhead });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = (scheduleItems || []).filter((l: any) => l.status !== "cancelled");

  const lessonReady = Boolean(form.groupId && form.hallId && form.date && form.startTime && form.endTime && form.startTime < form.endTime);
  const handleSave = async () => {
    if (!lessonReady) return;
    setSaving(true);
    const topic = [form.reason, form.topic].filter(Boolean).join(" — ");
    const ok = await onCreateLesson?.({
      branchId, groupId: form.groupId, teacherId: form.teacherId, hallId: form.hallId,
      startsAt: new Date(`${form.date}T${form.startTime}`).toISOString(),
      endsAt: new Date(`${form.date}T${form.endTime}`).toISOString(),
      topic,
    });
    setSaving(false);
    if (ok) {
      const from = form.date;
      setForm({ groupId: "", teacherId: "", hallId: "", date: "", startTime: "", endTime: "", reason: "", topic: "" });
      setShowForm(false);
      onLoadSchedule?.({ branchId, from, to: from });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Филиал</p>
          <h2 className="text-xl font-black text-white">Расписание занятий</h2>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5">
            {([["lessons", "Уроки"], ["halls", "По залам"], ["list", "Список групп"], ["archive", `Архив групп${archivedGroups.length ? ` (${archivedGroups.length})` : ""}`]] as const).map(([m, label]) => (
              <button key={m} onClick={() => setSchedMode(m)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${schedMode === m ? "bg-[#C5A059] text-black" : "text-slate-400 hover:text-white"}`}>{label}</button>
            ))}
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/30 px-4 py-2 text-sm font-bold text-[#C5A059] hover:bg-[#C5A059]/25 transition-colors">
            <Plus className="w-4 h-4" /> Новый урок
          </button>
          <button onClick={() => onLoadSchedule?.({ branchId, from: today, to: weekAhead })} className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">
            Обновить
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-3xl border border-white/10 bg-[#111] p-5 space-y-4">
          <p className="text-sm font-black text-white">Добавить урок</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Группа *</span>
              <select value={form.groupId} onChange={(e) => setForm(f => ({ ...f, groupId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Выберите группу</option>
                {groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Преподаватель</span>
              <select value={form.teacherId} onChange={(e) => setForm(f => ({ ...f, teacherId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Из группы</option>
                {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Дата урока *</span>
              <input type="date" value={form.date} min={today} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white [color-scheme:dark]" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Время урока *</span>
              <div className="flex items-center gap-2">
                <select value={form.startTime} onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                  <option value="">с…</option>
                  {LESSON_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="text-slate-500">–</span>
                <select value={form.endTime} onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                  <option value="">до…</option>
                  {LESSON_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Зал *</span>
              <select value={form.hallId} onChange={(e) => setForm(f => ({ ...f, hallId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Выберите зал</option>
                {(halls || []).map((h: Hall) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Причина / тип урока</span>
              <select value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">— не указано —</option>
                {["Разовый урок", "Перенос урока", "Болезнь ученика", "Отсутствие педагога", "Индивидуальное занятие", "Замена педагога", "Другое"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Тема / комментарий</span>
              <input type="text" value={form.topic} onChange={(e) => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Напр. «перенос с пятницы»" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !lessonReady} title={!lessonReady ? "Заполните группу, зал, дату и время (конец позже начала)" : undefined} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40 hover:bg-[#D4AF70] transition-colors">
              {saving ? "Сохранение…" : "Создать урок"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Отмена</button>
          </div>
        </div>
      )}

      {schedMode === "halls" && <GroupScheduleGrid groups={groups} halls={halls || []} />}
      {schedMode === "list" && <GroupsTable groups={groups} branches={branches} teachers={teachers} halls={halls} onArchiveGroup={onDeleteGroup}
        onToggleEnrollment={onUpdateGroup ? (id: string, open: boolean) => onUpdateGroup(id, { enrollmentOpen: open }) : undefined} />}
      {schedMode === "archive" && (
        <GroupsArchivePanel
          archivedGroups={(archivedGroups || []).filter((g: any) => !branchId || g.branchId === branchId)}
          branches={branches}
          onRestoreGroup={onRestoreGroup}
          onDeleteGroupPermanent={onDeleteGroupPermanent}
        />
      )}

      <div className="space-y-3" hidden={schedMode !== "lessons"}>
        {scheduleLoading && <p className="text-sm text-slate-500 py-6 text-center">Загрузка расписания…</p>}
        {!scheduleLoading && upcoming.length === 0 && (
          <div className="rounded-3xl border border-white/5 bg-[#111] p-8 text-center">
            <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">Нет предстоящих занятий.</p>
            <p className="mt-1 text-xs text-slate-600">Нажмите «Новый урок» чтобы добавить.</p>
          </div>
        )}
        {upcoming.map((lesson: any) => (
          <div key={lesson.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#111] px-5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{lesson.groupName || "Группа"}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(lesson.startsAt).toLocaleString("ru-RU", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(lesson.endsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {lesson.teacherName && <span className="text-[10px] font-bold text-slate-500">{lesson.teacherName}</span>}
                {lesson.hallName && <span className="text-[10px] font-bold text-[#C5A059]">{lesson.hallName}</span>}
                {lesson.topic && <span className="text-[10px] text-slate-400 italic">{lesson.topic}</span>}
              </div>
            </div>
            {onDeleteLesson && (
              <button onClick={() => onDeleteLesson(lesson.id)} className="flex-shrink-0 rounded-lg bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors">
                Отменить
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------
// BRANCH JOURNAL VIEW
// -------------------------------------------------------
function BranchJournalView({ groups, students, onToggleAttendance }: {
  groups: Group[];
  students: Student[];
  onToggleAttendance?: (studentId: string, date: string, status: "present" | "absent" | "sick") => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [saving, setSaving] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupStudents = students.filter((s) =>
    s.groupIds?.includes(selectedGroupId) || (s as any).groupId === selectedGroupId
  );

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const statusBg = (s: string) =>
    s === "present" ? "bg-emerald-500 text-black" :
    s === "absent" ? "bg-red-800 text-white" :
    s === "sick" ? "bg-amber-500 text-black" : "bg-white/5 text-slate-500";

  const handleMark = async (studentId: string, status: "present" | "absent" | "sick") => {
    if (!onToggleAttendance) return;
    setSaving(studentId);
    await onToggleAttendance(studentId, selectedDate, status);
    setSaving(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Журнал посещаемости</h2>
        <p className="text-xs text-slate-500 mt-1">Отметки по группе и дате. Сохраняются в облако автоматически.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Группа</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Дата</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white"
          />
        </div>
      </div>

      {groupStudents.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-500">
          В группе <span className="text-white font-bold">{selectedGroup?.name}</span> нет учеников.
        </div>
      ) : (
        <div className="space-y-2">
          {groupStudents.map((stud) => {
            const att = stud.attendance?.[selectedDate];
            const current = att?.status || "unmarked";
            const isSaving = saving === stud.id;
            return (
              <div key={stud.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={stud.photoUrl} alt={stud.name} className="h-9 w-9 shrink-0 rounded-xl object-cover border border-white/10" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{stud.name}</p>
                    <p className="text-[10px] text-slate-500">{stud.artistLevel}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {(["present", "absent", "sick"] as const).map((s) => (
                    <button
                      key={s}
                      disabled={isSaving}
                      onClick={() => handleMark(stud.id, s)}
                      className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black transition-all ${
                        current === s ? statusBg(s) : "bg-white/5 text-slate-400 hover:bg-white/10"
                      } ${isSaving ? "opacity-50" : ""}`}
                    >
                      {s === "present" ? "П" : s === "absent" ? "Н" : "Б"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-emerald-500" /> П — присутствовал</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-red-800" /> Н — не явился</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-amber-500" /> Б — болен</span>
      </div>

      {groupStudents.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 overflow-x-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Сводка за 7 дней</p>
          <table className="w-full min-w-[500px] text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="pb-2 pr-3 text-left font-bold">Ученик</th>
                {last7.map((d) => (
                  <th key={d} className={`pb-2 px-1 text-center font-bold ${d === todayStr ? "text-[#C5A059]" : ""}`}>
                    {new Date(d + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "numeric" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupStudents.map((stud) => (
                <tr key={stud.id} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-bold text-white whitespace-nowrap">{stud.name}</td>
                  {last7.map((d) => {
                    const s = stud.attendance?.[d]?.status || "unmarked";
                    return (
                      <td key={d} className={`py-2 px-1 text-center ${d === todayStr ? "bg-[#C5A059]/5 rounded" : ""}`}>
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${
                          s === "present" ? "bg-emerald-500 text-black" :
                          s === "absent" ? "bg-red-800 text-white" :
                          s === "sick" ? "bg-amber-500 text-black" : "text-slate-700"
                        }`}>
                          {s === "present" ? "П" : s === "absent" ? "Н" : s === "sick" ? "Б" : "·"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
