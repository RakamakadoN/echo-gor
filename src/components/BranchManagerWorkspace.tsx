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
  Users,
  WalletCards,
} from "lucide-react";
import { Announcement, AnnouncementAudience, Attendance, Branch, Competition, Group, Hall, Payment, Student, SubscriptionPlan, Teacher, LeadSource, WaitlistEntry } from "../types";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import StudentsRegistry from "./StudentsRegistry";
import GroupScheduleGrid from "./GroupScheduleGrid";
import GroupScheduleFields from "./GroupScheduleFields";
import AttendanceJournalView from "./AttendanceJournalView";
import { PayrollView, ProductsView } from "./OwnerExecutiveWorkspace";

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
  journal?: any;
  onJournalTask?: (p: { studentId: string; studentName: string; title: string }) => void;
}

type BranchTab = "dashboard" | "students" | "teachers" | "groups" | "schedule" | "journal" | "finance" | "payroll" | "products" | "announcements" | "quality" | "ai" | "settings";

const branchTabs: { id: BranchTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", short: "Главная", icon: Activity },
  { id: "students", label: "Ученики", short: "Ученики", icon: Users },
  { id: "teachers", label: "Преподаватели", short: "Педагоги", icon: GraduationCap },
  { id: "groups", label: "Группы", short: "Группы", icon: BookOpen },
  { id: "schedule", label: "Расписание", short: "Расписание", icon: CalendarDays },
  { id: "journal", label: "Журнал", short: "Журнал", icon: BookOpen },
  { id: "finance", label: "Финансы", short: "Финансы", icon: Coins },
  { id: "payroll", label: "Зарплаты", short: "Зарплаты", icon: WalletCards },
  { id: "products", label: "Товары и мерч", short: "Товары", icon: ShoppingBag },
  { id: "announcements", label: "Объявления", short: "Связь", icon: Megaphone },
  { id: "quality", label: "Качество филиала", short: "Качество", icon: ShieldCheck },
  { id: "ai", label: "AI Ассистент", short: "AI", icon: Sparkles },
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
  onBulkAttendance,
  journal,
  onJournalTask,
}: BranchManagerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<BranchTab>("dashboard");
  // Сворачивание бокового меню — раздел открывается на всю ширину.
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const branch = branches.find((item) => item.id === branchId);

  const branchGroups = useMemo(() => groups.filter((group) => group.branchId === branch?.id), [groups, branch?.id]);
  const branchStudents = useMemo(() => students.filter((student) => student.branchId === branch?.id), [students, branch?.id]);
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
    () => announcements.filter((item) => !item.branchId || item.branchId === branch?.id),
    [announcements, branch?.id]
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
        <p>Загрузка данных филиала или филиал не найден...</p>
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

  return (
    <div className="min-h-full bg-[#0A0A0A] text-slate-200">
      <div className="mx-auto flex max-w-[1500px] gap-0 lg:gap-5">
        <aside className={`sticky top-0 hidden h-[calc(100vh-64px)] w-64 shrink-0 flex-col border-r border-white/5 bg-[#0F0F0F] ${navCollapsed ? "lg:hidden" : "lg:flex"}`}>
          <div className="border-b border-white/5 px-5 py-5">
            <BranchIdentity branch={branch} />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {branchTabs.map((tab) => (
              <NavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
            ))}
          </nav>
          <div className="border-t border-white/5 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]" style={{ fontFamily: "'Oswald', sans-serif" }}>Культура · Сила · Характер</div>
            <div className="mt-1.5 text-xs leading-relaxed text-slate-400">Казахстан · обучаем от 5 лет</div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pt-6 lg:pb-8">
          <button onClick={() => setNavCollapsed((v) => !v)}
            className="mb-3 hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 lg:inline-flex">
            {navCollapsed ? "Меню ›" : "‹ Скрыть меню"}
          </button>
          <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/5 bg-[#0A0A0A]/90 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6 lg:hidden">
            <BranchIdentity branch={branch} compact />
          </div>

          {activeTab === "dashboard" && (
            <DashboardView
              branch={branch}
              metrics={metrics}
              attendanceWeek={attendanceWeek}
              attendanceMonth={attendanceMonth}
              groups={branchGroups}
              teachers={branchTeachers}
              competitions={branchCompetitions}
              announcements={branchAnnouncements}
              riskStudents={riskStudents}
              renewals={renewals}
              monthRevenue={monthRevenue}
              debt={debt}
            />
          )}
          {activeTab === "students" && (
            <StudentsView
              students={branchStudents}
              groups={branchGroups}
              teachers={branchTeachers}
              branches={branch ? [branch] : []}
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
            />
          )}
          {activeTab === "journal" && (
            <AttendanceJournalView
              role="branch_manager"
              branches={branches}
              groups={groups}
              students={students}
              teachers={teachers}
              currentBranchId={branchId}
              canEdit={false}
              onToggleAttendance={onToggleAttendance as any}
              onBulkAttendance={onBulkAttendance as any}
              onCreateTask={onJournalTask}
              journal={journal}
            />
          )}
          {activeTab === "finance" && <FinanceView payments={branchPayments} students={branchStudents} monthRevenue={monthRevenue} debt={debt} renewals={renewals} />}
          {activeTab === "payroll" && <PayrollView teachers={branchTeachers} students={branchStudents} groups={branchGroups} payments={branchPayments} role="branch_manager" />}
          {activeTab === "products" && <ProductsView role="branch_manager" />}
          {activeTab === "announcements" && <AnnouncementsView announcements={branchAnnouncements} groups={branchGroups} onCreateAnnouncement={onCreateAnnouncement} />}
          {activeTab === "quality" && <QualityView attendanceWeek={attendanceWeek} attendanceMonth={attendanceMonth} teachers={branchTeachers} groups={branchGroups} />}
          {activeTab === "ai" && <AIAssistantView riskStudents={riskStudents} renewals={renewals} groups={branchGroups} debt={debt} />}
          {activeTab === "settings" && <SettingsView branch={branch} teachers={branchTeachers} groups={branchGroups} />}
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

function DashboardView({ branch, metrics, attendanceWeek, attendanceMonth, groups, teachers, competitions, announcements, riskStudents, renewals, monthRevenue, debt }: any) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <div className="absolute right-[-90px] top-[-90px] h-72 w-72 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Операционный центр филиала</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">{branch.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              {branch.city}, {branch.address}. Руководитель видит только этот филиал: учеников, группы, преподавателей, финансы и качество.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[560px]">
            <SmallMetric label="Преподавателей" value={teachers.length} />
            <SmallMetric label="Групп" value={groups.length} />
            <SmallMetric label="Неделя" value={`${attendanceWeek}%`} />
            <SmallMetric label="Месяц" value={`${attendanceMonth}%`} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric: any) => <KpiCard key={metric.label} {...metric} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#C5A059] p-3 text-black"><Sparkles className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">AI сводка утра</p>
              <h2 className="mt-1 text-xl font-black text-white">Сегодня нужно внимание к посещаемости и продлениям</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Insight text="В младшей группе посещаемость снизилась на 18% за последнюю неделю." severity="Внимание" />
            <Insight text={`${Math.max(renewals.length, 12)} абонементов заканчиваются в течение недели.`} severity="Продления" />
            <Insight text="Преподаватель Аслан показывает высокую вовлеченность учеников." severity="Сильная зона" />
            <Insight text={`${riskStudents.length || 7} учеников имеют риск ухода: пропуски или долг.`} severity="Риск" />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-black text-white">Ближайшие мероприятия</h2>
          <div className="mt-4 space-y-3">
            <EventRow title="Репетиция старшего ансамбля" date="Сегодня 19:30" meta="Зал Алатау" />
            <EventRow title={competitions[0]?.title || "Отчетный концерт филиала"} date="25 июня" meta="Главная сцена" />
            <EventRow title="Собрание родителей младших групп" date="Пятница 18:00" meta="Организационные вопросы" />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <QualityMini attendanceMonth={attendanceMonth} />
        <FinanceMini monthRevenue={monthRevenue} debt={debt} />
        <FeedMini announcements={announcements} />
      </div>
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

  const handleSave = async () => {
    if (!form.name.trim()) return;
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
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-[#D4AF70] disabled:opacity-40">
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

function QualityView({ attendanceWeek, attendanceMonth, teachers, groups }: any) {
  return (
    <Screen title="Качество филиала" subtitle="Посещаемость, удержание, вовлеченность, благодарности и удовлетворенность родителей.">
      <div className="grid gap-3 md:grid-cols-5">
        <KpiCard label="Посещаемость" value={`${attendanceMonth}%`} detail={`Неделя ${attendanceWeek}%`} tone="emerald" />
        <KpiCard label="Удержание" value="91%" detail="стабильно" tone="white" />
        <KpiCard label="Вовлеченность" value="87%" detail="реакции детей" tone="gold" />
        <KpiCard label="Благодарности" value="170" detail="за неделю" tone="emerald" />
        <KpiCard label="Родители" value="4.8" detail="удовлетворенность" tone="white" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Группы, где нужна поддержка</h3>
          <div className="mt-4 space-y-3">
            {groups.slice(0, 3).map((group: Group, index: number) => <Insight key={group.id} text={`${group.name}: ${index === 0 ? "падение посещаемости на 18%" : "нужна проверка загрузки"}.`} severity="Контроль" />)}
          </div>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Сильные зоны преподавателей</h3>
          <div className="mt-4 space-y-3">
            {teachers.slice(0, 3).map((teacher: Teacher) => <Insight key={teacher.id} text={`${teacher.name}: высокая вовлеченность и регулярные благодарности учеников.`} severity="Сила" />)}
          </div>
        </section>
      </div>
    </Screen>
  );
}

function AIAssistantView({ riskStudents, renewals, groups, debt }: any) {
  return (
    <Screen title="AI Ассистент руководителя" subtitle="Утренняя сводка, риски ухода, должники, продления и рекомендации по филиалу.">
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

function SettingsView({ branch, teachers, groups }: any) {
  return (
    <Screen title="Настройки филиала" subtitle="Локальные данные филиала без доступа к глобальной сети и лицензии.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Данные филиала</h3>
          <div className="mt-4 space-y-3 text-sm">
            <InfoLine label="Название" value={branch.name} />
            <InfoLine label="Город" value={branch.city} />
            <InfoLine label="Адрес" value={branch.address} />
            <InfoLine label="Телефон" value={branch.phone} />
          </div>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Права руководителя</h3>
          <div className="mt-4 space-y-3">
            <Permission text="Может управлять учениками, группами, расписанием и объявлениями своего филиала." allowed />
            <Permission text="Не может видеть другие филиалы и общую прибыль сети." />
            <Permission text="Не может создавать или удалять филиалы." />
            <Permission text="Не может управлять лицензией системы." />
          </div>
          <p className="mt-4 text-xs text-slate-500">В филиале: {teachers.length} преподавателей, {groups.length} групп.</p>
        </section>
      </div>
    </Screen>
  );
}

function BranchIdentity({ branch, compact = false }: { branch: Branch; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-11 w-11" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059]`}>
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Руководитель филиала</p>
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

function ScheduleView({ branchId, groups, teachers, halls, scheduleItems, scheduleLoading, onLoadSchedule, onCreateLesson, onUpdateLesson, onDeleteLesson }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ groupId: "", startsAt: "", endsAt: "", teacherId: "", hallId: "", topic: "" });
  const [saving, setSaving] = useState(false);
  const [schedMode, setSchedMode] = useState<"lessons" | "halls">("lessons");

  useEffect(() => {
    if (onLoadSchedule) onLoadSchedule({ branchId, from: today, to: weekAhead });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = (scheduleItems || []).filter((l: any) => l.status !== "cancelled");

  const handleSave = async () => {
    if (!form.groupId || !form.startsAt || !form.endsAt) return;
    setSaving(true);
    const ok = await onCreateLesson?.({ ...form, branchId });
    setSaving(false);
    if (ok) { setForm({ groupId: "", startsAt: "", endsAt: "", teacherId: "", hallId: "", topic: "" }); setShowForm(false); }
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
            {([["lessons", "Уроки"], ["halls", "По залам"]] as const).map(([m, label]) => (
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
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Начало *</span>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Конец *</span>
              <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Зал</span>
              <select value={form.hallId} onChange={(e) => setForm(f => ({ ...f, hallId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Без зала</option>
                {(halls || []).map((h: Hall) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Тема</span>
              <input type="text" value={form.topic} onChange={(e) => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Напр. «Базовые движения»" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !form.groupId || !form.startsAt || !form.endsAt} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40 hover:bg-[#D4AF70] transition-colors">
              {saving ? "Сохранение…" : "Создать урок"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Отмена</button>
          </div>
        </div>
      )}

      {schedMode === "halls" && <GroupScheduleGrid groups={groups} halls={halls || []} />}

      <div className="space-y-3" hidden={schedMode === "halls"}>
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
