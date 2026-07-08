import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgePercent,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Coins,
  FileSpreadsheet,
  FileText,
  Filter,
  Megaphone,
  MessageCircle,
  NotebookText,
  Phone,
  Plus,
  Receipt,
  Search,
  Send,
  Settings,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Tags,
  User,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { Announcement, AnnouncementAudience, AuditLog, Branch, Group, Hall, Payment, Student, Teacher, AdminTask, AdminTaskStatus, AdminTaskPriority, SubscriptionPlan, LeadSource, WaitlistEntry } from "../types";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import StudentsRegistry from "./StudentsRegistry";
import GroupScheduleGrid from "./GroupScheduleGrid";
import GroupScheduleFields from "./GroupScheduleFields";
import AttendanceJournalView from "./AttendanceJournalView";
import { ProductsView } from "./OwnerExecutiveWorkspace";

// --- Лёгкая система всплывающих уведомлений (toast) ---
// Даёт видимый отклик кнопкам, у которых пока нет полноценного бэкенда,
// чтобы интерфейс не выглядел «сломанным».
let toastHandler: ((message: string) => void) | null = null;
function notify(message: string) {
  if (toastHandler) toastHandler(message);
  else if (typeof window !== "undefined") console.info("[EduErp]", message);
}

function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  useEffect(() => {
    toastHandler = (message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
    };
    return () => { toastHandler = null; };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto rounded-2xl border border-[#C5A059]/30 bg-[#161616] px-4 py-3 text-sm font-bold text-slate-100 shadow-xl shadow-black/50">
          {t.message}
        </div>
      ))}
    </div>
  );
}

// Экспорт произвольной таблицы в CSV (открывается в Excel/Numbers).
function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  notify(`Экспорт готов: ${filename}`);
}

// Открыть телефон / WhatsApp по номеру родителя.
const telHref = (phone?: string) => `tel:${(phone || "").replace(/[^\d+]/g, "")}`;
const waHref = (phone?: string) => `https://wa.me/${(phone || "").replace(/[^\d]/g, "")}`;

interface AdminEduErpWorkspaceProps {
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  payments: Payment[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
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
  onToggleAttendance?: (studentId: string, date: string, status: "present" | "absent" | "sick") => void;
  onCreateStudent?: (data: any) => Promise<string | boolean | null>;
  onUpdateStudent?: (id: string, data: any) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onArchiveStudent?: (id: string, reason: string, comment: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<unknown> | void;
  onEditArchive?: (id: string, patch: { leftOn?: string; reason?: string; comment?: string }) => Promise<unknown> | void;
  onBookTrial?: (id: string, payload: { date: string; time: string; note: string }) => Promise<boolean> | void;
  studentArchive?: any[];
  waitlist?: WaitlistEntry[];
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean>;
  onRemoveFromWaitlist?: (id: string, reason?: string) => Promise<boolean>;
  onCreateAnnouncement?: (data: { title: string; content: string; audience: AnnouncementAudience; isImportant: boolean }) => void;
  onOpenPayment?: (student: Student) => void;
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  tasks?: AdminTask[];
  subscriptionPlans?: SubscriptionPlan[];
  leadSources?: LeadSource[];
  onCreateTask?: (data: any) => Promise<boolean>;
  onUpdateTask?: (id: string, data: any) => Promise<boolean>;
  onDeleteTask?: (id: string) => Promise<boolean>;
  onCreatePlan?: (data: any) => Promise<boolean>;
  onUpdatePlan?: (id: string, data: any) => Promise<boolean>;
  onDeletePlan?: (id: string) => Promise<boolean>;
  onCreateLeadSource?: (data: any) => Promise<boolean>;
  onUpdateLeadSource?: (id: string, data: any) => Promise<boolean>;
  onDeleteLeadSource?: (id: string) => Promise<boolean>;
  onBulkAttendance?: any;
  journal?: any;
  onJournalTask?: (p: { studentId: string; studentName: string; title: string }) => void;
}

type AdminTab =
  | "dashboard"
  | "visitors"
  | "journal"
  | "calendar"
  | "billing"
  | "products"
  | "reports"
  | "messages"
  | "tasks"
  | "org"
  | "settings";

const tabs: { id: AdminTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Дашборд", short: "Главная", icon: Activity },
  { id: "visitors", label: "Посетители", short: "Ученики", icon: Users },
  { id: "journal", label: "Журнал", short: "Журнал", icon: ClipboardList },
  { id: "calendar", label: "Расписание", short: "Календарь", icon: CalendarDays },
  { id: "billing", label: "Счета и абонементы", short: "Оплата", icon: Receipt },
  { id: "products", label: "Товары и мерч", short: "Товары", icon: ShoppingBag },
  { id: "reports", label: "Отчеты", short: "Отчеты", icon: BarChart3 },
  { id: "messages", label: "Рассылки", short: "Связь", icon: Send },
  { id: "tasks", label: "Задачи", short: "Задачи", icon: CheckCircle },
  { id: "org", label: "Организация", short: "Орг", icon: Building2 },
  { id: "settings", label: "Справочники", short: "Еще", icon: Settings }
];

export function AdminEduErpWorkspace({
  branches,
  groups,
  students,
  teachers,
  payments,
  announcements,
  auditLogs,
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
  onToggleAttendance,
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
  tasks = [],
  subscriptionPlans = [],
  leadSources = [],
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  onCreateLeadSource,
  onUpdateLeadSource,
  onDeleteLeadSource,
  onBulkAttendance,
  journal,
  onJournalTask,
}: AdminEduErpWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  // Сворачивание бокового меню — раздел открывается на всю ширину.
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const branchMatch = branchFilter === "all" || student.branchId === branchFilter;
      const queryMatch =
        !query ||
        student.name.toLowerCase().includes(query) ||
        student.parentName.toLowerCase().includes(query) ||
        student.parentPhone.toLowerCase().includes(query);
      return branchMatch && queryMatch;
    });
  }, [branchFilter, search, students]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7);
  const monthRevenue = payments
    .filter((payment) => (payment.date || "").startsWith(monthPrefix))
    .reduce((sum, payment) => sum + payment.amount, 0);
  const todayRevenue = payments.filter((payment) => payment.date === todayStr).reduce((sum, payment) => sum + payment.amount, 0);
  const debt = Math.abs(students.filter((student) => student.balance < 0).reduce((sum, student) => sum + student.balance, 0));
  const renewals = students.filter((student) => student.subscriptions.some((subscription) => subscription.lessonsLeft <= 2 || subscription.status !== "active"));
  const attendanceRate = students.length
    ? Math.round(
        students.reduce((sum, student) => {
          const records = Object.values(student.attendance || {});
          if (!records.length) return sum;
          return sum + Math.round((records.filter((record) => record.status === "present").length / records.length) * 100);
        }, 0) / Math.max(1, students.length)
      )
    : 0;

  return (
    <div className="min-h-full bg-[#080808] text-slate-200">
      <ToastHost />
      <div className="mx-auto flex max-w-[1560px] gap-0 lg:gap-5">
        <aside className={`sticky top-0 hidden h-[calc(100vh-64px)] w-64 shrink-0 flex-col border-r border-white/5 bg-[#0F0F0F] ${navCollapsed ? "lg:hidden" : "lg:flex"}`}>
          <div className="border-b border-white/5 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C5A059] text-black">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Администратор</p>
                <h2 className="text-lg font-black leading-tight text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>ЭХО ГОР</h2>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {tabs.map((tab) => (
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
          <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/5 bg-[#080808]/90 px-4 py-3 backdrop-blur-xl md:-mx-6 md:px-6 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C5A059] text-black">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">Администратор</p>
                <h1 className="text-base font-black text-white">Операционный центр</h1>
              </div>
            </div>
          </header>

          {activeTab === "dashboard" && (
            <DashboardView
              branches={branches}
              groups={groups}
              students={students}
              teachers={teachers}
              todayRevenue={todayRevenue}
              monthRevenue={monthRevenue}
              debt={debt}
              renewals={renewals}
              attendanceRate={attendanceRate}
              announcements={announcements}
              auditLogs={auditLogs}
            />
          )}
          {activeTab === "visitors" && (
            <VisitorsView
              students={students}
              groups={groups}
              branches={branches}
              teachers={teachers}
              payments={payments}
              search={search}
              branchFilter={branchFilter}
              setSearch={setSearch}
              setBranchFilter={setBranchFilter}
              adminBranchId={branches[0]?.id || ""}
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
              leadSources={leadSources}
              waitlist={waitlist}
              onAddToWaitlist={onAddToWaitlist}
              onRemoveFromWaitlist={onRemoveFromWaitlist}
              onCreateLeadSource={onCreateLeadSource}
              onUpdateLeadSource={onUpdateLeadSource}
              onDeleteLeadSource={onDeleteLeadSource}
            />
          )}
          {activeTab === "journal" && (
            <AttendanceJournalView
              role="admin"
              branches={branches}
              groups={groups}
              students={students}
              teachers={teachers}
              currentBranchId={branches?.[0]?.id}
              canEdit={true}
              onToggleAttendance={onToggleAttendance as any}
              onBulkAttendance={onBulkAttendance as any}
              onCreateTask={onJournalTask}
              journal={journal}
            />
          )}
          {activeTab === "calendar" && (
            <CalendarView
              groups={groups}
              teachers={teachers}
              branches={branches}
              halls={halls}
              scheduleItems={scheduleItems}
              scheduleLoading={scheduleLoading}
              onLoadSchedule={onLoadSchedule}
              onCreateLesson={onCreateLesson}
              onUpdateLesson={onUpdateLesson}
              onDeleteLesson={onDeleteLesson}
              onCreateGroup={onCreateGroup}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
            />
          )}
          {activeTab === "billing" && <BillingView students={students} groups={groups} branches={branches} payments={payments} debt={debt} renewals={renewals} onOpenPayment={onOpenPayment} />}
          {activeTab === "products" && <ProductsView role="admin" />}
          {activeTab === "reports" && <ReportsView branches={branches} groups={groups} students={students} payments={payments} teachers={teachers} todayRevenue={todayRevenue} monthRevenue={monthRevenue} attendanceRate={attendanceRate} />}
          {activeTab === "messages" && <MessagesView announcements={announcements} branches={branches} groups={groups} onCreateAnnouncement={onCreateAnnouncement} />}
          {activeTab === "tasks" && <TasksView auditLogs={auditLogs} students={students} tasks={tasks} adminBranchId={branches[0]?.id || ""} onCreateTask={onCreateTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />}
          {activeTab === "org" && <OrganizationView branches={branches} groups={groups} teachers={teachers} students={students} />}
          {activeTab === "settings" && <SettingsView branches={branches} groups={groups} subscriptionPlans={subscriptionPlans} leadSources={leadSources} onCreatePlan={onCreatePlan} onUpdatePlan={onUpdatePlan} onDeletePlan={onDeletePlan} onCreateLeadSource={onCreateLeadSource} onUpdateLeadSource={onUpdateLeadSource} onDeleteLeadSource={onDeleteLeadSource} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#080808]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {tabs.slice(0, 5).map((tab) => (
          <MobileNavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </nav>
    </div>
  );
}

function DashboardView({ branches, groups, students, teachers, todayRevenue, monthRevenue, debt, renewals, attendanceRate, announcements, auditLogs }: any) {
  const kpis = [
    { label: "Выручка сегодня", value: money(todayRevenue), detail: "касса филиалов", tone: "gold" },
    { label: "Выручка месяца", value: money(monthRevenue), detail: "абонементы и разовые", tone: "gold" },
    { label: "Посетители", value: students.length, detail: "активная база", tone: "white" },
    { label: "Посещаемость", value: `${attendanceRate}%`, detail: "по журналам", tone: "emerald" },
    { label: "Долги", value: money(debt), detail: "нужны счета", tone: "rose" },
    { label: "Продления", value: renewals.length, detail: "в ближайшие 7 дней", tone: "rose" },
    { label: "Группы", value: groups.length, detail: `${teachers.length} преподавателей`, tone: "white" },
    { label: "Филиалы", value: branches.length, detail: "Казахстан", tone: "white" }
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <div className="absolute right-[-90px] top-[-90px] h-80 w-80 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[1fr_420px] xl:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059]">Dance Academy OS / Admin Core</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Функционал EduERP перенесен в структуру</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              Один рабочий контур администратора: дашборд, посетители, журнал, календарь, счета, отчеты, рассылки, задачи, организация и справочники.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[#C5A059]/25 bg-[#C5A059]/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">AI операционный помощник</p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <InsightLine text={`${renewals.length} абонементов требуют продления в ближайшее время.`} />
              <InsightLine text="Счета можно отправить группам с долгом через SMS и email." />
              <InsightLine text="Журнал за сегодня ожидает отметок по группам." />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Операционные модули" kicker="Полный охват">
          <div className="grid gap-3 md:grid-cols-2">
            <ModuleCard icon={Users} title="Посетители" text="Фильтры, карточка, родитель, статус, баланс, абонемент, посещения, импорт." />
            <ModuleCard icon={ClipboardList} title="Журнал" text="Филиал, группа, месяц, отметки посещаемости, загрузка справок." />
            <ModuleCard icon={CalendarDays} title="Расписание" text="События, преподаватель, пробное занятие, серия занятий, переносы." />
            <ModuleCard icon={Receipt} title="Счета" text="Массовое выставление счетов, SMS/email, скидки, итоговая стоимость." />
            <ModuleCard icon={Send} title="Рассылки" text="Шаблоны, сценарии, история, запланированные сообщения." />
            <ModuleCard icon={BarChart3} title="Отчеты" text="Выручка, взаиморасчеты, посещаемость, реестр операций, реклама." />
          </div>
        </Panel>

        <Panel title="Лента филиала" kicker="Последние события">
          <TimelineItem icon={Bell} title={announcements[0]?.title || "Объявление школы"} text="Опубликовано для родителей и учеников." />
          <TimelineItem icon={WalletCards} title="Счета к отправке" text="Сформируйте список получателей и отправьте счета." />
          <TimelineItem icon={FileText} title="Audit log" text={`${auditLogs.length} действий в журнале системы.`} />
          <TimelineItem icon={Sparkles} title="AI контроль" text="Система выделяет долги, падение посещаемости и просроченные задачи." />
        </Panel>
      </div>
    </div>
  );
}

// Раздел «Ученики» (ТЗ): полноценный реестр клиентской базы.
function VisitorsView({ students, groups, branches, teachers, adminBranchId, onCreateStudent, onUpdateStudent, onDeleteStudent, onArchiveStudent, onUnarchiveStudent, onEditArchive, onBookTrial, studentArchive = [], onOpenPayment, onSellSubscription, plans, leadSources, waitlist, onAddToWaitlist, onRemoveFromWaitlist, onCreateLeadSource, onUpdateLeadSource, onDeleteLeadSource }: any) {
  return (
    <StudentsRegistry
      roleHeader="admin"
      studentArchive={studentArchive}
      onUnarchiveStudent={onUnarchiveStudent}
      onEditArchive={onEditArchive} onBookTrial={onBookTrial}
      students={students}
      groups={groups}
      branches={branches}
      teachers={teachers}
      adminBranchId={adminBranchId}
      onCreateStudent={onCreateStudent}
      onUpdateStudent={onUpdateStudent}
      onDeleteStudent={onDeleteStudent}
      onArchiveStudent={onArchiveStudent}
      onOpenPayment={onOpenPayment}
      onSellSubscription={onSellSubscription}
      plans={plans}
      leadSources={leadSources}
      waitlist={waitlist}
      onAddToWaitlist={onAddToWaitlist}
      onRemoveFromWaitlist={onRemoveFromWaitlist}
      onCreateLeadSource={onCreateLeadSource}
      onUpdateLeadSource={onUpdateLeadSource}
      onDeleteLeadSource={onDeleteLeadSource}
    />
  );
}

// Прежний вариант списка (оставлен для справки, не используется).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function VisitorsViewLegacy({ students, groups, branches, teachers, payments, search, branchFilter, setSearch, setBranchFilter, adminBranchId, onCreateStudent, onUpdateStudent, onDeleteStudent, onOpenPayment }: any) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const selectedStudent = students.find((student: Student) => student.id === selectedStudentId) || students[0];

  const emptyForm = { name: "", age: "", groupId: "", teacherId: "", parentName: "", parentPhone: "" };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const canManage = Boolean(onCreateStudent || onUpdateStudent);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (student: Student) => {
    setEditingId(student.id);
    setForm({
      name: student.name || "",
      age: student.age ? String(student.age) : "",
      groupId: student.groupIds?.[0] || (student as any).groupId || "",
      teacherId: student.teacherId || "",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || ""
    });
    setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      branchId: adminBranchId || branches[0]?.id,
      age: form.age ? Number(form.age) : undefined,
      groupId: form.groupId || undefined,
      teacherId: form.teacherId || undefined,
      parentName: form.parentName || undefined,
      parentPhone: form.parentPhone || undefined
    };
    const ok = editingId ? await onUpdateStudent?.(editingId, payload) : await onCreateStudent?.(payload);
    setSaving(false);
    if (ok) { setShowForm(false); setEditingId(null); setForm(emptyForm); }
  };
  const handleDelete = async (student: Student) => {
    if (!onDeleteStudent) return;
    if (!window.confirm(`Переместить ученика «${student.name}» в корзину? Окончательное удаление подтвердит владелец сети.`)) return;
    await onDeleteStudent(student.id);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        kicker="Посетители"
        title="CRM учеников и родителей"
        text="Аналог раздела Посетители: фильтры, таблица, карточка, создание задач, импорт, статусы, платежные правила и рассылки."
        actions={["Импорт", "Создать задачу"]}
      />
      <div className="rounded-[2rem] border border-white/10 bg-[#111] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти посетителя, родителя или телефон" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#C5A059]" />
          </div>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]">
            <option value="all">Все филиалы</option>
            {branches.map((branch: Branch) => <option key={branch.id} value={branch.id}>{branch.city}</option>)}
          </select>
          {canManage && (
            <button onClick={showForm ? () => setShowForm(false) : openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black"><Plus className="h-4 w-4" /> {showForm ? "Скрыть" : "Новый ученик"}</button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <div className="rounded-[2rem] border border-white/10 bg-[#111] p-5 space-y-4">
          <p className="text-sm font-black text-white">{editingId ? "Редактировать ученика" : "Новый ученик"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Имя ученика *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Имя и фамилия" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Возраст</span>
              <input type="number" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} placeholder="Напр. 9" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Группа</span>
              <select value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="">Без группы</option>
                {groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Преподаватель</span>
              <select value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="">Из группы</option>
                {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Родитель</span>
              <input value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} placeholder="ФИО родителя" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Телефон родителя</span>
              <input value={form.parentPhone} onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))} placeholder="+7 ..." className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-[#D4AF70] disabled:opacity-40">
              {saving ? "Сохранение…" : editingId ? "Сохранить" : "Добавить ученика"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400 transition-colors hover:bg-white/10">Отмена</button>
          </div>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Нажмите на посетителя</p>
            <h2 className="mt-1 text-xl font-black text-white">Список посетителей</h2>
          </div>
          {/* Mobile card list (md-) */}
          <div className="space-y-3 p-4 md:hidden">
            {students.slice(0, 10).map((student: Student) => {
              const branch = branches.find((item: Branch) => item.id === student.branchId);
              const group = groups.find((item: Group) => item.id === (student.groupIds?.[0] || (student as any).groupId));
              const active = selectedStudent?.id === student.id;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left transition active:scale-[0.99] ${active ? "border-[#C5A059]/40 bg-[#C5A059]/10" : ""}`}
                >
                  <img src={student.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">{student.name}</p>
                    <p className="truncate text-xs text-slate-400">{student.parentPhone} · {branch?.city || "Филиал"} · {group?.name || "Группа"}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge label={student.balance < 0 ? "Не оплачен" : "Активен"} warning={student.balance < 0} />
                      <span className={`text-sm font-black ${student.balance < 0 ? "text-rose-300" : "text-emerald-300"}`}>{money(student.balance)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Full table (md+) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  {["Имя", "Телефон", "Контакты", "Родитель", "Статус", "Возраст", "Филиал", "Группа", "Абонемент", "Баланс"].map((header) => (
                    <th key={header} className="p-4 font-black">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 10).map((student: Student) => {
                  const branch = branches.find((item: Branch) => item.id === student.branchId);
                  const group = groups.find((item: Group) => item.id === (student.groupIds?.[0] || (student as any).groupId));
                  const active = selectedStudent?.id === student.id;
                  return (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`cursor-pointer border-t border-white/5 transition hover:bg-[#C5A059]/10 ${active ? "bg-[#C5A059]/15" : ""}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={student.photoUrl} alt="" className="h-10 w-10 rounded-2xl object-cover" />
                          <div>
                            <p className="font-black text-white">{student.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">Открыть карточку</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-400">{student.parentPhone}</td>
                      <td className="p-4">
                        <div className="flex gap-1.5">
                          <ContactIcon icon={Phone} title="Позвонить" href={telHref(student.parentPhone)} />
                          <ContactIcon icon={MessageCircle} title="WhatsApp" href={waHref(student.parentPhone)} />
                          <ContactIcon icon={Send} title="SMS" href={`sms:${(student.parentPhone || "").replace(/[^\d+]/g, "")}`} />
                        </div>
                      </td>
                      <td className="p-4 text-slate-400">{student.parentName}</td>
                      <td className="p-4"><StatusBadge label={student.balance < 0 ? "Не оплачен" : "Активен"} warning={student.balance < 0} /></td>
                      <td className="p-4 text-slate-400">{student.age} лет</td>
                      <td className="p-4 text-slate-400">{branch?.city || "Филиал"}</td>
                      <td className="p-4 text-slate-400">{group?.name || "Группа"}</td>
                      <td className="p-4 text-slate-400">{student.subscriptions[0]?.name || "Нет"}</td>
                      <td className={`p-4 font-black ${student.balance < 0 ? "text-rose-300" : "text-emerald-300"}`}>{money(student.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {selectedStudent && (
          <StudentManagementCard
            student={selectedStudent}
            group={groups.find((group: Group) => group.id === (selectedStudent.groupIds?.[0] || (selectedStudent as any).groupId))}
            branch={branches.find((branch: Branch) => branch.id === selectedStudent.branchId)}
            teacher={teachers.find((teacher: Teacher) => teacher.id === selectedStudent.teacherId)}
            allGroups={groups}
            allBranches={branches}
            allTeachers={teachers}
            onClose={() => setSelectedStudentId("")}
            onEdit={canManage ? () => openEdit(selectedStudent) : undefined}
            onDelete={onDeleteStudent ? () => handleDelete(selectedStudent) : undefined}
            onOpenPayment={onOpenPayment ? () => onOpenPayment(selectedStudent) : undefined}
            onTransfer={onUpdateStudent ? (payload: any) => onUpdateStudent(selectedStudent.id, payload) : undefined}
          />
        )}
      </div>
    </div>
  );
}

function StudentDetailPanel({ student, group, branch, teacher, payments, onEdit, onDelete, onOpenPayment }: { student: Student; group?: Group; branch?: Branch; teacher?: Teacher; payments: Payment[]; onEdit?: () => void; onDelete?: () => void; onOpenPayment?: () => void }) {
  const [detailTab, setDetailTab] = useState<"profile" | "invoices" | "balance" | "subscriptions" | "attendance" | "tasks" | "messages" | "parents">("profile");
  const attendanceRecords = Object.values(student.attendance || {});
  const presentCount = attendanceRecords.filter((record) => record.status === "present").length;
  const attendancePercent = attendanceRecords.length ? Math.round((presentCount / attendanceRecords.length) * 100) : 82;
  const subscription = student.subscriptions[0];
  const invoiceRows = [
    ["INV-2026-06", "Июнь 2026", subscription?.name || "Абонемент", money(Math.max(0, 45000 + student.balance)), student.balance < 0 ? "К отправке" : "Оплачен"],
    ["INV-2026-05", "Май 2026", "Обучение", money(45000), "Оплачен"],
    ["INV-2026-04", "Апрель 2026", "Обучение", money(45000), "Оплачен"]
  ];
  const balanceRows = [
    ["Текущий баланс", money(student.balance), student.balance < 0 ? "Долг" : "Депозит"],
    ["Выручка будущих периодов", money(Math.max(0, (subscription?.lessonsLeft || 0) * 3500)), "Абонемент"],
    ["Скидки и корректировки", student.balance < 0 ? "0 ₸" : "3 000 ₸", "Активно"]
  ];
  const taskRows = [
    ["Позвонить родителю", student.parentName, "Сегодня", student.balance < 0 ? "В работе" : "Новая"],
    ["Проверить продление", student.name, "7 дней", (subscription?.lessonsLeft || 0) <= 2 ? "Срочно" : "План"],
    ["Обновить комментарий", student.name, "После занятия", "Новая"]
  ];
  const messageRows = [
    ["SMS", "Напоминание об оплате", student.parentPhone, student.balance < 0 ? "Запланировано" : "Не требуется"],
    ["Push", "Расписание занятия", student.name, "Доставлено"],
    ["Email", "Счет за месяц", student.parentName, student.balance < 0 ? "Готов к отправке" : "Оплачен"]
  ];
  const tabs: { id: typeof detailTab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Профайл", icon: User },
    { id: "invoices", label: "Счета", icon: Receipt },
    { id: "balance", label: "Баланс", icon: WalletCards },
    { id: "subscriptions", label: "Абонементы", icon: BadgePercent },
    { id: "attendance", label: "Посещение", icon: ClipboardList },
    { id: "tasks", label: "Задачи", icon: CheckCircle },
    { id: "messages", label: "Рассылка", icon: Send },
    { id: "parents", label: "Родители", icon: UserRound }
  ];

  return (
    <aside className="rounded-[2rem] border border-[#C5A059]/20 bg-gradient-to-br from-[#171717] to-[#0A0A0A] p-5 xl:sticky xl:top-5 xl:self-start">
      <div className="flex items-start gap-4">
        <img src={student.photoUrl} alt="" className="h-20 w-20 rounded-[1.5rem] border border-white/10 object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Карточка посетителя</p>
          <h2 className="mt-1 text-2xl font-black text-white">{student.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{student.age} лет / {student.artistLevel}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniInfo label="Статус" value={student.balance < 0 ? "Не оплачен" : "Активен"} tone={student.balance < 0 ? "rose" : "emerald"} />
        <MiniInfo label="Баланс" value={money(student.balance)} tone={student.balance < 0 ? "rose" : "gold"} />
        <MiniInfo label="Посещаемость" value={`${attendancePercent}%`} tone="emerald" />
        <MiniInfo label="Занятий" value={`${subscription?.lessonsLeft ?? 0}/${subscription?.lessonsTotal ?? 0}`} tone="white" />
      </div>

      <div className="mt-5 grid gap-3">
        <DetailBlock icon={User} label="Родитель" value={student.parentName} sub={student.parentPhone} />
        <DetailBlock icon={Building2} label="Филиал и группа" value={branch ? `${branch.city}, ${branch.address}` : "Филиал"} sub={group?.name || "Группа не выбрана"} />
        <DetailBlock icon={BookOpen} label="Преподаватель" value={teacher?.name || "Не назначен"} sub={teacher?.specialties?.join(", ") || "Специализация"} />
        <DetailBlock icon={Receipt} label="Абонемент" value={subscription?.name || "Нет активного абонемента"} sub={subscription ? `до ${subscription.validUntil}, ${subscription.lessonsLeft} занятий` : "Нужно оформить"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {onOpenPayment && (
          <button onClick={onOpenPayment} className="inline-flex items-center gap-2 rounded-xl bg-[#C5A059] px-3 py-2 text-xs font-black text-black transition hover:bg-[#D4AF70]">
            <Receipt className="h-3.5 w-3.5" /> Принять оплату
          </button>
        )}
        {onEdit && (
          <button onClick={onEdit} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/10">
            <Settings className="h-3.5 w-3.5" /> Редактировать
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-300 transition hover:bg-rose-500/20">
            В корзину
          </button>
        )}
        <ActionButton icon={Phone} label="Позвонить" onClick={() => window.open(telHref(student.parentPhone))} />
        <ActionButton icon={MessageCircle} label="WhatsApp" onClick={() => window.open(waHref(student.parentPhone), "_blank")} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-2xl border border-white/10 bg-black/25 p-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${detailTab === tab.id ? "bg-[#C5A059] text-black" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {detailTab === "profile" && (
          <DetailTabShell title="Профайл" kicker="Анкета посетителя">
            <div className="grid gap-3">
              <MiniTable
                headers={["Поле", "Значение"]}
                rows={[
                  ["Фамилия / Имя", student.name],
                  ["Имя родителя", student.parentName],
                  ["Филиал", branch?.city || "Филиал"],
                  ["Группа", group?.name || "Группа не выбрана"],
                  ["Телефон", student.parentPhone],
                  ["Статус", student.balance < 0 ? "Не оплачен текущий месяц" : "Активен"],
                  ["Рекламный источник", "Instagram / WhatsApp / Звонок"],
                  ["Дата рождения", `${student.age} лет`],
                  ["Комментарий", student.notes[0]?.content || "Комментариев пока нет"]
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <ActionButton icon={FileText} label="История статусов" />
                <ActionButton icon={ShieldCheck} label="Архив" />
                <ActionButton icon={CheckCircle} label="Сохранить" primary />
              </div>
            </div>
          </DetailTabShell>
        )}

        {detailTab === "invoices" && (
          <DetailTabShell title="Счета" kicker="Выставление и отправка">
            <MiniTable headers={["№", "Номер", "Дата создания", "Дата отправки", "Дата оплаты", "Счет", "Сумма", "Оплата", "Статус"]} rows={invoiceRows.map((row, index) => [index + 1, row[0], row[1], "Не отправлен", row[4] === "Оплачен" ? row[1] : "-", row[2], row[3], row[4] === "Оплачен" ? "Да" : "Нет", row[4]])} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton icon={Coins} label="Оплатить" primary />
              <ActionButton icon={Send} label="Отправить" />
              <ActionButton icon={FileText} label="Редактировать" />
              <ActionButton icon={FileSpreadsheet} label="Удалить" />
            </div>
          </DetailTabShell>
        )}

        {detailTab === "balance" && (
          <DetailTabShell title="Баланс" kicker="Взаиморасчеты">
            <p className="mb-3 text-sm font-black text-white">Актуальный баланс: {money(student.balance)}</p>
            <MiniTable headers={["Идентификатор", "Тип операции", "Номер", "Дата", "Расход", "Приход", "Баланс"]} rows={balanceRows.map((row, index) => [`B-${student.id}-${index + 1}`, row[2], row[0], "02.06.2026", row[2] === "Долг" ? row[1] : "0 ₸", row[2] !== "Долг" ? row[1] : "0 ₸", money(student.balance)])} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton icon={FileText} label="Корректировка" />
              <ActionButton icon={Coins} label="Пополнить" primary />
              <ActionButton icon={WalletCards} label="Возврат" />
              <ActionButton icon={FileSpreadsheet} label="Экспорт" onClick={() => exportCsv(`balance-${student.name}.csv`, ["Идентификатор", "Тип операции", "Номер", "Расход/Приход", "Баланс"], balanceRows.map((row, index) => [`B-${student.id}-${index + 1}`, row[2], row[0], row[1], money(student.balance)]))} />
            </div>
            <div className="mt-3 rounded-2xl border border-[#C5A059]/20 bg-[#C5A059]/10 p-3 text-xs leading-relaxed text-slate-300">
              Баланс собирает пополнения, возвраты, оплату абонемента, разовые оплаты, корректировки и резерв баланса.
            </div>
          </DetailTabShell>
        )}

        {detailTab === "subscriptions" && (
          <DetailTabShell title="Абонементы" kicker="Абонементы / Справки">
            <div className="grid gap-3">
              <MiniTable
                headers={["ID", "Счет", "Тип", "Группа", "Месяц", "Дата начала", "Дата окончания", "Скидка", "Справка", "Кол-во занятий", "Стоимость", "Оплачено"]}
                rows={student.subscriptions.map((item, index) => [item.id, `INV-${index + 1}`, item.name, group?.name || "Группа", "06.2026", "01.06.2026", item.validUntil, "0", "-", item.lessonsTotal, money(item.price), item.status === "active" ? "Да" : "Нет"])}
              />
              {student.subscriptions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-400">Действует до {item.validUntil}. Осталось {item.lessonsLeft} из {item.lessonsTotal} занятий.</p>
                    </div>
                    <StatusBadge label={item.status === "active" ? "Активен" : "Пауза"} warning={item.status !== "active"} />
                  </div>
                </div>
              ))}
              <DetailBlock icon={Bell} label="Автоотправка ПП" value={student.balance < 0 ? "Запланировать счет" : "Не требуется"} sub="Статус сценария рассылки по платежному правилу" />
              <MiniTable
                headers={["Месяц действия", "Кол-во дней", "Файл", "Группа", "Счет", "Дата создания", "Создано"]}
                rows={[["06.2026", "0", "Нет файла", group?.name || "Группа", "Не связан", "02.06.2026", "Администратор"]]}
              />
            </div>
          </DetailTabShell>
        )}

        {detailTab === "attendance" && (
          <DetailTabShell title="Посещения" kicker="Журнал ученика">
            <MiniTable
              headers={["Дата", "Статус", "Кто отметил"]}
              rows={(attendanceRecords.length ? attendanceRecords : [
                { date: "2026-06-02", status: "unmarked", markedBy: "Не отмечено" },
                { date: "2026-05-30", status: "present", markedBy: teacher?.name || "Преподаватель" },
                { date: "2026-05-27", status: "absent", markedBy: teacher?.name || "Преподаватель" }
              ]).slice(0, 6).map((record: any) => [record.date, attendanceLabel(record.status), record.markedBy || "Система"])}
            />
            <div className="mt-3">
              <MiniTable
                headers={["Тренировка №", "Подарок подарен", "Редактировать"]}
                rows={[[1, "Нет", "Изменить"], [5, "Нет", "Изменить"], [10, "Нет", "Изменить"]]}
              />
            </div>
          </DetailTabShell>
        )}

        {detailTab === "tasks" && (
          <DetailTabShell title="Задачи" kicker="CRM контроль">
            <MiniTable headers={["Задача", "Кому", "Дедлайн", "Статус"]} rows={taskRows} />
            <div className="mt-3"><ActionButton icon={Plus} label="Новая задача" primary /></div>
          </DetailTabShell>
        )}

        {detailTab === "messages" && (
          <DetailTabShell title="Рассылка" kicker="История и создание рассылки">
            <MiniTable headers={["№", "ID", "Дата", "Канал", "Предмет", "Адрес", "Сообщение", "Статус", "Инициатор"]} rows={messageRows.map((row, index) => [index + 1, `N-${index + 3197}`, "02.06.2026", row[0], row[1], row[2], "Текст сообщения", row[3], "Администратор"])} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton icon={Send} label="С шаблоном" primary />
              <ActionButton icon={MessageCircle} label="Без шаблона" />
            </div>
          </DetailTabShell>
        )}

        {detailTab === "parents" && (
          <DetailTabShell title="Родители" kicker="Связанные родители">
            <MiniTable
              headers={["№", "ФИО", "Имя родителя", "Номер телефона"]}
              rows={[[1, student.parentName, student.parentName.split(" ")[0] || student.parentName, student.parentPhone]]}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton icon={Plus} label="Добавить" primary />
              <ActionButton icon={Search} label="Найти" />
            </div>
          </DetailTabShell>
        )}
      </div>
    </aside>
  );
}

function JournalView({ groups, students, branches, onToggleAttendance }: any) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [saving, setSaving] = useState<string | null>(null); // studentId being saved

  const selectedGroup = groups.find((g: Group) => g.id === selectedGroupId);
  const groupStudents = students.filter((s: Student) =>
    s.groupIds?.includes(selectedGroupId) || (s as any).groupId === selectedGroupId
  );

  // Build last-7-days dates for the summary columns
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const statusColor = (status: string) => {
    if (status === "present") return "bg-emerald-500 text-black";
    if (status === "absent") return "bg-red-800 text-white";
    if (status === "sick") return "bg-amber-500 text-black";
    return "bg-white/10 text-slate-500";
  };
  const statusLabel = (status: string) => {
    if (status === "present") return "П";
    if (status === "absent") return "Н";
    if (status === "sick") return "Б";
    return "·";
  };

  const handleToggle = async (studentId: string, status: "present" | "absent" | "sick") => {
    if (!onToggleAttendance) return;
    setSaving(studentId);
    await onToggleAttendance(studentId, selectedDate, status);
    setSaving(null);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        kicker="Журнал посещаемости"
        title="Отметки занятий по группам"
        text="Выберите группу и дату. Отмечайте присутствие, отсутствие или болезнь для каждого ученика."
        actions={[]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Группа</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white min-w-[200px]"
          >
            {groups.map((g: Group) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Дата занятия</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        {/* Attendance marking panel */}
        <Panel title={`Отметки: ${selectedDate}`} kicker={selectedGroup?.name || "Группа"}>
          {groupStudents.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">В группе нет учеников или группа не выбрана.</p>
          ) : (
            <div className="space-y-2">
              {groupStudents.map((student: Student) => {
                const att = student.attendance?.[selectedDate];
                const current = att?.status || "unmarked";
                const isSaving = saving === student.id;
                return (
                  <div key={student.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/30 border border-white/5 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={student.photoUrl} alt={student.name} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{student.name}</p>
                        <p className="text-[10px] text-slate-500">{student.parentPhone}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {(["present", "absent", "sick"] as const).map((s) => (
                        <button
                          key={s}
                          disabled={isSaving}
                          onClick={() => handleToggle(student.id, s)}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition-all ${
                            current === s ? statusColor(s) : "bg-white/5 text-slate-500 hover:bg-white/10"
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
          <div className="mt-4 flex gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-emerald-500" /> П — Присутствовал</span>
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-red-800" /> Н — Не явился</span>
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-amber-500" /> Б — Болен</span>
          </div>
        </Panel>

        {/* 7-day summary table */}
        <Panel title="Сводка за 7 дней" kicker={selectedGroup?.name || "Группа"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="pb-3 pr-4 font-bold">Ученик</th>
                  {last7.map((d) => (
                    <th key={d} className={`pb-3 px-1 text-center font-bold ${d === todayStr ? "text-[#C5A059]" : ""}`}>
                      {new Date(d + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "numeric" })}
                    </th>
                  ))}
                  <th className="pb-3 pl-4 font-bold text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {groupStudents.map((student: Student) => {
                  const total = last7.filter((d) => student.attendance?.[d]?.status !== "unmarked" && student.attendance?.[d]).length;
                  const present = last7.filter((d) => student.attendance?.[d]?.status === "present").length;
                  const rate = total ? Math.round((present / total) * 100) : null;
                  return (
                    <tr key={student.id} className="border-t border-white/5">
                      <td className="py-2.5 pr-4 font-bold text-white whitespace-nowrap">{student.name}</td>
                      {last7.map((d) => {
                        const s = student.attendance?.[d]?.status || "unmarked";
                        return (
                          <td key={d} className={`py-2.5 px-1 text-center ${d === todayStr ? "bg-[#C5A059]/5 rounded" : ""}`}>
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${
                              s !== "unmarked" ? statusColor(s) : "text-slate-600"
                            }`}>
                              {statusLabel(s)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-4 text-right font-bold">
                        {rate !== null
                          ? <span className={rate >= 80 ? "text-emerald-400" : rate >= 60 ? "text-amber-400" : "text-red-400"}>{rate}%</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CalendarView({ groups, teachers, branches, halls, scheduleItems, scheduleLoading, onLoadSchedule, onCreateLesson, onUpdateLesson, onDeleteLesson, onCreateGroup, onUpdateGroup, onDeleteGroup }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [lessonForm, setLessonForm] = useState({ groupId: "", startsAt: "", endsAt: "", teacherId: "", hallId: "", topic: "" });
  const [groupForm, setGroupForm] = useState({ name: "", branchId: "", teacherId: "", hallId: "", ageFrom: "", ageTo: "", level: "Начинающие", scheduleDays: "", scheduleTime: "" });
  const [saving, setSaving] = useState(false);
  const [activeForm, setActiveForm] = useState<"lesson" | "group" | null>(null);
  const [schedMode, setSchedMode] = useState<"list" | "halls">("list");

  useEffect(() => {
    if (onLoadSchedule) onLoadSchedule({ from: today, to: weekAhead });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = (scheduleItems || []).filter((l: any) => l.status !== "cancelled");

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

  return (
    <div className="space-y-5">
      <SectionHeader
        kicker="Расписание занятий"
        title="Занятия и группы"
        text="Создавайте уроки и группы, назначайте преподавателей и залы."
        actions={[]}
      />

      <div className="flex gap-3 flex-wrap">
        <button onClick={() => setActiveForm(activeForm === "lesson" ? null : "lesson")} className="flex items-center gap-2 rounded-xl bg-[#C5A059]/15 border border-[#C5A059]/30 px-4 py-2 text-sm font-bold text-[#C5A059] hover:bg-[#C5A059]/25 transition-colors">
          <Plus className="w-4 h-4" /> Добавить урок
        </button>
        <button onClick={() => setActiveForm(activeForm === "group" ? null : "group")} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors">
          <Plus className="w-4 h-4" /> Создать группу
        </button>
        <button onClick={() => onLoadSchedule?.({ from: today, to: weekAhead })} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">
          Обновить
        </button>
        <div className="ml-auto flex rounded-xl bg-white/5 border border-white/10 p-0.5">
          {([["list", "Список"], ["halls", "По залам"]] as const).map(([m, label]) => (
            <button key={m} onClick={() => setSchedMode(m)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${schedMode === m ? "bg-[#C5A059] text-black" : "text-slate-400 hover:text-white"}`}>{label}</button>
          ))}
        </div>
      </div>

      {schedMode === "halls" && <GroupScheduleGrid groups={groups} halls={halls || []} />}

      {activeForm === "lesson" && (
        <Panel title="Новый урок" kicker="Форма">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Группа *</span>
              <select value={lessonForm.groupId} onChange={(e) => setLessonForm(f => ({ ...f, groupId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Выберите группу</option>
                {groups.map((g: Group) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Преподаватель</span>
              <select value={lessonForm.teacherId} onChange={(e) => setLessonForm(f => ({ ...f, teacherId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Из группы</option>
                {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Начало *</span>
              <input type="datetime-local" value={lessonForm.startsAt} onChange={(e) => setLessonForm(f => ({ ...f, startsAt: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Конец *</span>
              <input type="datetime-local" value={lessonForm.endsAt} onChange={(e) => setLessonForm(f => ({ ...f, endsAt: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Зал</span>
              <select value={lessonForm.hallId} onChange={(e) => setLessonForm(f => ({ ...f, hallId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Без зала</option>
                {(halls || []).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Тема</span>
              <input type="text" value={lessonForm.topic} onChange={(e) => setLessonForm(f => ({ ...f, topic: e.target.value }))} placeholder="Напр. «Лезгинка — базовые движения»" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSaveLesson} disabled={saving || !lessonForm.groupId || !lessonForm.startsAt || !lessonForm.endsAt} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40 hover:bg-[#D4AF70] transition-colors">
              {saving ? "Сохранение…" : "Создать урок"}
            </button>
            <button onClick={() => setActiveForm(null)} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Отмена</button>
          </div>
        </Panel>
      )}

      {activeForm === "group" && (
        <Panel title="Новая группа" kicker="Форма">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Название *</span>
              <input type="text" value={groupForm.name} onChange={(e) => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="Напр. «Младший ансамбль»" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Филиал *</span>
              <select value={groupForm.branchId} onChange={(e) => setGroupForm(f => ({ ...f, branchId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Выберите филиал</option>
                {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Преподаватель</span>
              <select value={groupForm.teacherId} onChange={(e) => setGroupForm(f => ({ ...f, teacherId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Не выбрано</option>
                {teachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Зал</span>
              <select value={groupForm.hallId} onChange={(e) => setGroupForm(f => ({ ...f, hallId: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">Не выбрано</option>
                {(halls || []).map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Возраст от</span>
              <input type="number" value={groupForm.ageFrom} onChange={(e) => setGroupForm(f => ({ ...f, ageFrom: e.target.value }))} min={3} max={99} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Возраст до</span>
              <input type="number" value={groupForm.ageTo} onChange={(e) => setGroupForm(f => ({ ...f, ageTo: e.target.value }))} min={3} max={99} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Уровень</span>
              <select value={groupForm.level} onChange={(e) => setGroupForm(f => ({ ...f, level: e.target.value }))} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
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
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSaveGroup} disabled={saving || !groupForm.name || !groupForm.branchId} className="rounded-xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black disabled:opacity-40 hover:bg-[#D4AF70] transition-colors">
              {saving ? "Сохранение…" : "Создать группу"}
            </button>
            <button onClick={() => setActiveForm(null)} className="rounded-xl bg-white/5 px-5 py-2 text-sm font-bold text-slate-400 hover:bg-white/10 transition-colors">Отмена</button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-2" hidden={schedMode === "halls"}>
        {/* Upcoming lessons */}
        <Panel title="Ближайшие уроки" kicker={scheduleLoading ? "Загрузка…" : `${upcoming.length} занятий`}>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">{scheduleLoading ? "Загрузка расписания…" : "Нет предстоящих занятий. Добавьте урок выше."}</p>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 10).map((lesson: any) => (
                <div key={lesson.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{lesson.groupName || "Группа"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(lesson.startsAt).toLocaleString("ru-RU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {lesson.teacherName && ` · ${lesson.teacherName}`}
                      {lesson.hallName && ` · ${lesson.hallName}`}
                    </p>
                    {lesson.topic && <p className="mt-0.5 text-xs text-[#C5A059]">{lesson.topic}</p>}
                  </div>
                  {onDeleteLesson && (
                    <button onClick={() => onDeleteLesson(lesson.id)} className="flex-shrink-0 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors">
                      Отменить
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Groups list */}
        <Panel title="Группы" kicker={`${groups.length} активных`}>
          <div className="space-y-3">
            {groups.map((group: Group) => (
              <div key={group.id} className="flex items-start justify-between gap-3 rounded-xl bg-black/25 border border-white/10 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">{group.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{group.ageGroup} · {group.level}</p>
                  {(group.days?.length > 0 || group.time) && (
                    <p className="mt-0.5 text-xs text-slate-500">{group.days?.join(", ")} {group.time}</p>
                  )}
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{group.studentCount} учеников</p>
                </div>
                {onDeleteGroup && (
                  <button onClick={() => { if (window.confirm(`Архивировать группу «${group.name}»? Ученики сохранятся.`)) onDeleteGroup(group.id); }} className="flex-shrink-0 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors">
                    Архив
                  </button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const PAYMENT_METHOD_LABELS: Record<string, string> = { card: "Карта", cash: "Наличные", transfer: "Перевод", kaspi: "Kaspi" };
const PAYMENT_TYPE_LABELS: Record<string, string> = { subscription: "Абонемент", single: "Разовое", uniform: "Форма", concert: "Концерт" };

function BillingView({ students, groups, branches, payments, debt, renewals, onOpenPayment }: any) {
  const collected = payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
  const debtors = students.filter((student: Student) => student.balance < 0);
  const recentPayments = [...payments].sort((a: Payment, b: Payment) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const studentName = (id: string) => students.find((s: Student) => s.id === id)?.name || "—";
  const branchName = (id: string) => branches.find((b: Branch) => b.id === id)?.city || "Филиал";

  return (
    <div className="space-y-5">
      <SectionHeader kicker="Стоимость" title="Абонементы, счета, скидки и промокоды" text="Абонементы, продления, массовое выставление счетов, история платежей, реестр операций, скидки, промокоды и справки." actions={["Показать счета", "Отправить"]} />
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Долг" value={money(debt)} detail={`${debtors.length} должников`} tone="rose" />
        <KpiCard label="Продления" value={renewals.length} detail="скоро истекают" tone="gold" />
        <KpiCard label="Платежей" value={payments.length} detail="в базе филиала" tone="white" />
        <KpiCard label="Собрано" value={money(collected)} detail="по платежам" tone="emerald" />
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Должники</p>
            <h2 className="mt-1 text-xl font-black text-white">Ученики с отрицательным балансом</h2>
          </div>
        </div>
        {debtors.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">Долгов нет — все ученики оплачены.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {debtors.map((student: Student) => {
              const group = groups.find((g: Group) => g.id === (student.groupIds?.[0] || (student as any).groupId));
              return (
                <div key={student.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <img src={student.photoUrl} alt="" className="h-10 w-10 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">{student.name}</p>
                    <p className="truncate text-xs text-slate-400">{group?.name || "Без группы"} · {student.parentPhone}</p>
                  </div>
                  <span className="text-sm font-black text-rose-300">{money(student.balance)}</span>
                  {onOpenPayment && (
                    <button onClick={() => onOpenPayment(student)} className="inline-flex items-center gap-2 rounded-xl bg-[#C5A059] px-3 py-2 text-xs font-black text-black transition hover:bg-[#D4AF70]">
                      <Receipt className="h-3.5 w-3.5" /> Принять оплату
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">История платежей</p>
        {recentPayments.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-[#111] px-5 py-6 text-sm text-slate-400">Платежей пока нет.</div>
        ) : (
          <DataTable
            headers={["Дата", "Посетитель", "Филиал", "Тип", "Способ", "Сумма"]}
            rows={recentPayments.map((payment: Payment) => [
              payment.date,
              studentName(payment.studentId),
              branchName(payment.branchId),
              PAYMENT_TYPE_LABELS[payment.type] || payment.type,
              PAYMENT_METHOD_LABELS[payment.method] || payment.method,
              money(payment.amount)
            ])}
          />
        )}
      </div>
    </div>
  );
}

function ReportsView({ branches, groups, students, payments, teachers, todayRevenue, monthRevenue, attendanceRate }: any) {
  const studentList: Student[] = students || [];
  const paymentList: Payment[] = payments || [];
  const branchName = (id?: string) => branches.find((b: Branch) => b.id === id)?.city || branches.find((b: Branch) => b.id === id)?.name || "—";
  const groupName = (id?: string) => groups.find((g: Group) => g.id === id)?.name || "—";
  const teacherName = (id?: string) => teachers.find((t: Teacher) => t.id === id)?.name || "—";
  const studentName = (id?: string) => studentList.find((s) => s.id === id)?.name || id || "—";
  const sGid = (s: Student) => s.groupIds?.[0] || (s as any).groupId;
  const attendancePct = (s: Student) => {
    const records = Object.values(s.attendance || {});
    if (!records.length) return 0;
    return Math.round((records.filter((r: any) => r.status === "present").length / records.length) * 100);
  };

  // Каждый отчёт — реальная выгрузка CSV из текущих данных кабинета.
  const reports: { title: string; build: () => { headers: string[]; rows: (string | number)[][] } }[] = [
    {
      title: "Реестр операций",
      build: () => ({
        headers: ["Дата", "Ученик", "Сумма", "Тип", "Статус"],
        rows: paymentList.map((p) => [p.date || "", studentName(p.studentId), p.amount, (p as any).type || "оплата", p.status])
      })
    },
    {
      title: "Отчет о выручке и потерях",
      build: () => {
        const byMonth = new Map<string, number>();
        paymentList.forEach((p) => {
          const m = (p.date || "").slice(0, 7);
          if (m) byMonth.set(m, (byMonth.get(m) || 0) + p.amount);
        });
        return { headers: ["Месяц", "Выручка"], rows: [...byMonth.entries()].sort().map(([m, v]) => [m, v]) };
      }
    },
    {
      title: "Выгрузка посетителей с привязкой к тренерам",
      build: () => ({
        headers: ["Ученик", "Филиал", "Группа", "Преподаватель", "Родитель", "Телефон", "Баланс", "Статус"],
        rows: studentList.map((s) => [s.name, branchName(s.branchId), groupName(sGid(s)), teacherName(s.teacherId), s.parentName || "", s.parentPhone || "", s.balance, s.status || ""])
      })
    },
    {
      title: "Проданные абонементы",
      build: () => ({
        headers: ["Ученик", "Абонемент", "Осталось занятий", "Действует до", "Статус"],
        rows: studentList.flatMap((s) => (s.subscriptions || []).map((sub) => [s.name, sub.name, sub.lessonsLeft, sub.validUntil || "", sub.status]))
      })
    },
    {
      title: "Отчет о посещаемости",
      build: () => ({
        headers: ["Ученик", "Группа", "Посещаемость, %"],
        rows: studentList.map((s) => [s.name, groupName(sGid(s)), attendancePct(s)])
      })
    },
    {
      title: "Должники",
      build: () => ({
        headers: ["Ученик", "Филиал", "Родитель", "Телефон", "Долг"],
        rows: studentList.filter((s) => s.balance < 0).map((s) => [s.name, branchName(s.branchId), s.parentName || "", s.parentPhone || "", Math.abs(s.balance)])
      })
    },
    {
      title: "Отчет о заполненности групп",
      build: () => ({
        headers: ["Группа", "Филиал", "Учеников", "Вместимость", "Заполненность, %"],
        rows: groups.map((g: Group) => {
          const cnt = studentList.filter((s) => sGid(s) === g.id).length;
          const cap = (g as any).capacity || 0;
          return [g.name, branchName(g.branchId), cnt, cap || "—", cap ? Math.round((cnt / cap) * 100) : 0];
        })
      })
    },
    {
      title: "Отчет о ДР посетителей",
      build: () => ({
        headers: ["Ученик", "Возраст", "Группа", "Телефон"],
        rows: studentList.map((s) => [s.name, (s as any).age || "—", groupName(sGid(s)), s.parentPhone || ""])
      })
    }
  ];

  const occupancy = (() => {
    const withCap = groups.filter((g: Group) => (g as any).capacity > 0);
    if (!withCap.length) return Math.round((groups.length / Math.max(1, branches.length * 4)) * 100);
    const totalCap = withCap.reduce((s: number, g: Group) => s + ((g as any).capacity || 0), 0);
    const totalStud = withCap.reduce((s: number, g: Group) => s + studentList.filter((st) => sGid(st) === g.id).length, 0);
    return totalCap ? Math.round((totalStud / totalCap) * 100) : 0;
  })();

  const runExport = (title: string, build: () => { headers: string[]; rows: (string | number)[][] }) => {
    const { headers, rows } = build();
    if (!rows.length) { notify(`${title}: нет данных для выгрузки`); return; }
    const stamp = new Date().toISOString().slice(0, 10);
    exportCsv(`${title.replace(/[^\wа-яА-Я]+/g, "_")}_${stamp}.csv`, headers, rows);
    notify(`${title}: выгружено строк — ${rows.length}`);
  };

  return (
    <div className="space-y-5">
      <SectionHeader kicker="Аналитика" title="Отчеты и экспорт" text="Отчёты формируются из текущих данных кабинета и выгружаются в CSV (Excel). Период берётся по загруженным записям филиала." actions={[]} />
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Сегодня" value={money(todayRevenue)} detail="касса" tone="gold" />
        <KpiCard label="Месяц" value={money(monthRevenue)} detail="рост сети" tone="gold" />
        <KpiCard label="Посещаемость" value={`${attendanceRate}%`} detail="по группам" tone="emerald" />
        <KpiCard label="Заполненность" value={`${occupancy}%`} detail="залы" tone="white" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const count = report.build().rows.length;
          return (
            <div key={report.title} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#C5A059]/15 p-2 text-[#C5A059]"><BarChart3 className="h-4 w-4" /></div>
                <div>
                  <h3 className="text-sm font-black text-white">{report.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">Строк к выгрузке: {count}. Экспорт в CSV.</p>
                </div>
              </div>
              <button onClick={() => runExport(report.title, report.build)} disabled={!count} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-40">
                <FileSpreadsheet className="h-4 w-4" /> Экспорт CSV
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ANNOUNCEMENT_AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: "parents", label: "Родители" },
  { value: "students", label: "Ученики" },
  { value: "all", label: "Все" },
  { value: "teachers", label: "Преподаватели" }
];

function MessagesView({ announcements, onCreateAnnouncement }: any) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("parents");
  const [isImportant, setIsImportant] = useState(false);
  const canPost = Boolean(onCreateAnnouncement);

  const handleSend = () => {
    if (!canPost || !title.trim() || !content.trim()) return;
    onCreateAnnouncement({ title: title.trim(), content: content.trim(), audience, isImportant });
    setTitle("");
    setContent("");
    setIsImportant(false);
  };

  return (
    <div className="space-y-5">
      <SectionHeader kicker="Рассылки" title="Сценарии, шаблоны и история сообщений" text="Шаблоны рассылок, будущая отправка, SMS/email/push, массовые объявления и история статусов доставки." actions={["Запланировать"]} />
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Новое объявление" kicker="Публикация в ленту">
          <div className="grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Заголовок *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр. «Продление абонементов»" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Текст *</span>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Текст сообщения для родителей и учеников" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Аудитория</span>
              <select value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
                {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} className="h-4 w-4 accent-[#C5A059]" />
              Отметить как важное
            </label>
            <button onClick={handleSend} disabled={!canPost || !title.trim() || !content.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#D4AF70] disabled:opacity-40">
              <Send className="h-4 w-4" /> Опубликовать
            </button>
            {!canPost && <p className="text-xs text-slate-500">Публикация недоступна в этом режиме.</p>}
          </div>
        </Panel>
        {announcements.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-[#111] px-5 py-6 text-sm text-slate-400">Объявлений пока нет.</div>
        ) : (
          <DataTable
            headers={["Дата", "Предмет", "Сообщение", "Важное", "Инициатор"]}
            rows={announcements.slice(0, 8).map((item: Announcement) => [item.date, item.title, item.content.slice(0, 44) + (item.content.length > 44 ? "…" : ""), item.isImportant ? "Да" : "—", item.authorName])}
          />
        )}
      </div>
    </div>
  );
}

const TASK_STATUS_LABEL: Record<AdminTaskStatus, string> = {
  new: "Новая", in_progress: "В работе", done: "Выполнена", cancelled: "Отменена", overdue: "Просрочена"
};
const TASK_STATUS_TONE: Record<AdminTaskStatus, string> = {
  new: "bg-sky-500/15 text-sky-300", in_progress: "bg-amber-500/15 text-amber-300",
  done: "bg-emerald-500/15 text-emerald-300", cancelled: "bg-slate-500/15 text-slate-400",
  overdue: "bg-rose-500/15 text-rose-300"
};
const TASK_PRIORITY_LABEL: Record<AdminTaskPriority, string> = { low: "Низкий", normal: "Обычный", high: "Высокий" };

function TasksView({ auditLogs, students, tasks, adminBranchId, onCreateTask, onUpdateTask, onDeleteTask }: any) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<AdminTaskPriority>("normal");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = Boolean(onCreateTask);

  const submit = async () => {
    if (!canManage || !title.trim()) return;
    setBusy(true);
    const ok = await onCreateTask({ title: title.trim(), dueAt: dueAt || null, priority, studentId: studentId || null, branchId: adminBranchId || undefined });
    setBusy(false);
    if (ok) { setTitle(""); setDueAt(""); setPriority("normal"); setStudentId(""); }
  };

  const list: AdminTask[] = tasks || [];
  const openCount = list.filter((t) => t.status !== "done" && t.status !== "cancelled").length;

  return (
    <div className="space-y-5">
      <SectionHeader kicker="Задачи" title="Задачи администратора, дедлайны и реестр" text={`${openCount} активных задач. Задачи хранятся в базе: создание, смена статуса, привязка к ученику и удаление.`} actions={[]} />
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Новая задача" kicker="Добавить в реестр">
          <div className="grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Что сделать *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр. «Перезвонить родителю»" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Дедлайн</span>
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Приоритет</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value as AdminTaskPriority)} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
                  <option value="low">Низкий</option>
                  <option value="normal">Обычный</option>
                  <option value="high">Высокий</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ученик (необязательно)</span>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white">
                <option value="">— не привязывать —</option>
                {students.map((s: Student) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <button onClick={submit} disabled={!canManage || !title.trim() || busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#D4AF70] disabled:opacity-40">
              <Plus className="h-4 w-4" /> Добавить задачу
            </button>
            {!canManage && <p className="text-xs text-slate-500">Создание недоступно в этом режиме.</p>}
          </div>
        </Panel>
        <div className="space-y-4">
          {list.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-[#111] px-5 py-6 text-sm text-slate-400">Задач пока нет. Добавьте первую через форму слева.</div>
          ) : (
            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111]">
              <div className="divide-y divide-white/5">
                {list.map((t) => (
                  <div key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${TASK_STATUS_TONE[t.status] || "bg-white/10 text-slate-300"}`}>{TASK_STATUS_LABEL[t.status] || t.status}</span>
                        {t.priority === "high" && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-300">Важно</span>}
                      </div>
                      <p className="mt-1 truncate font-bold text-white">{t.title}</p>
                      <p className="text-xs text-slate-500">
                        {t.dueAt ? `Дедлайн: ${t.dueAt}` : "Без срока"}{t.studentName ? ` · ${t.studentName}` : ""} · {TASK_PRIORITY_LABEL[t.priority] || t.priority}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {t.status !== "in_progress" && t.status !== "done" && (
                        <button onClick={() => onUpdateTask?.(t.id, { status: "in_progress" })} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-white/10">В работу</button>
                      )}
                      {t.status !== "done" && (
                        <button onClick={() => onUpdateTask?.(t.id, { status: "done" })} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-white/10">Готово</button>
                      )}
                      <button onClick={() => onDeleteTask?.(t.id)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-white/10">Удалить</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <Panel title="История изменений" kicker="Audit log">
            {auditLogs.slice(0, 5).map((log: AuditLog) => <TimelineItem key={log.id} icon={FileText} title={log.action} text={log.details} />)}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function OrganizationView({ branches, groups, teachers }: any) {
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Организация" title="Сотрудники, родители, филиалы, группы и территории" text="Справочник организационной структуры: пользователи, роли, филиалы Казахстана, группы, залы, возрастные категории и направления." actions={[]} />
      <div className="grid gap-4 xl:grid-cols-3">
        <DirectoryPanel icon={UserRound} title="Преподаватели" count={teachers.length} items={teachers.map((teacher: Teacher) => teacher.name)} />
        <DirectoryPanel icon={Building2} title="Филиалы" count={branches.length} items={branches.map((branch: Branch) => `${branch.city}, ${branch.address}`)} />
        <DirectoryPanel icon={BookOpen} title="Группы" count={groups.length} items={groups.map((group: Group) => group.name)} />
      </div>
    </div>
  );
}

function PlansDirectory({ plans, onCreatePlan, onUpdatePlan, onDeletePlan }: any) {
  const canManage = Boolean(onCreatePlan);
  const [form, setForm] = useState({ name: "", lessonsCount: "", durationDays: "", price: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const list: SubscriptionPlan[] = plans || [];

  const save = async () => {
    if (!form.name.trim()) return;
    const data = { name: form.name.trim(), lessonsCount: Number(form.lessonsCount) || 0, durationDays: Number(form.durationDays) || 30, price: Number(form.price) || 0 };
    const ok = editingId ? await onUpdatePlan?.(editingId, data) : await onCreatePlan?.(data);
    if (ok) { setForm({ name: "", lessonsCount: "", durationDays: "", price: "" }); setEditingId(null); }
  };
  const edit = (p: SubscriptionPlan) => { setEditingId(p.id); setForm({ name: p.name, lessonsCount: String(p.lessonsCount), durationDays: String(p.durationDays), price: String(p.price) }); };

  return (
    <Panel title="Абонементы" kicker={`${list.length} в справочнике`}>
      {canManage && (
        <div className="mb-4 grid gap-2 sm:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_auto] sm:items-end">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Название" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <input type="number" value={form.lessonsCount} onChange={(e) => setForm((f) => ({ ...f, lessonsCount: e.target.value }))} placeholder="Занятий" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <input type="number" value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))} placeholder="Дней" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="Цена ₸" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <button onClick={save} disabled={!form.name.trim()} className="rounded-xl bg-[#C5A059] px-3 py-2 text-sm font-black text-black hover:bg-[#D4AF70] disabled:opacity-40">{editingId ? "Сохранить" : "Добавить"}</button>
        </div>
      )}
      <div className="space-y-2">
        {list.length === 0 && <p className="text-xs text-slate-500">Абонементов пока нет.</p>}
        {list.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{p.name}</p>
              <p className="text-xs text-slate-500">{p.lessonsCount} занятий · {p.durationDays} дн. · {money(p.price)}{p.status !== "active" ? " · архив" : ""}</p>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-2">
                <button onClick={() => edit(p)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10">Изм.</button>
                <button onClick={() => onDeletePlan?.(p.id)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-white/10">Удалить</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LeadSourcesDirectory({ leadSources, onCreateLeadSource, onUpdateLeadSource, onDeleteLeadSource }: any) {
  const canManage = Boolean(onCreateLeadSource);
  const [name, setName] = useState("");
  const list: LeadSource[] = leadSources || [];
  const add = async () => {
    if (!name.trim()) return;
    const ok = await onCreateLeadSource?.({ name: name.trim() });
    if (ok) setName("");
  };
  return (
    <Panel title="Рекламные источники" kicker={`${list.length} в справочнике`}>
      {canManage && (
        <div className="mb-4 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр. «Instagram», «Сарафан»" className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <button onClick={add} disabled={!name.trim()} className="rounded-xl bg-[#C5A059] px-3 py-2 text-sm font-black text-black hover:bg-[#D4AF70] disabled:opacity-40">Добавить</button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {list.length === 0 && <p className="text-xs text-slate-500">Источников пока нет.</p>}
        {list.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-slate-200">
            {s.name}
            {canManage && <button onClick={() => onDeleteLeadSource?.(s.id)} className="text-rose-400 hover:text-rose-300">×</button>}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function SettingsView({ branches, subscriptionPlans, leadSources, onCreatePlan, onUpdatePlan, onDeletePlan, onCreateLeadSource, onUpdateLeadSource, onDeleteLeadSource }: any) {
  // Справочники без отдельных таблиц в БД — пока информационные карточки.
  const directories = [
    ["Статусы посетителей", "Пользовательские и системные статусы"],
    ["Скидки", "Процент, дни, филиалы"],
    ["Промокоды", "Код, лимит, срок, статистика"],
    ["Справки", "Медицинские справки и компенсации"],
    ["Возраст групп", "Возрастные категории"],
    ["Интеграции", "SMS, email, платежи, внешние формы"]
  ];
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Справочники" title="Настройки операционного ядра" text="Абонементы и рекламные источники подключены к базе — изменения сохраняются. Остальные справочники появятся по мере добавления таблиц." actions={[]} />
      <div className="grid gap-4 xl:grid-cols-2">
        <PlansDirectory plans={subscriptionPlans} onCreatePlan={onCreatePlan} onUpdatePlan={onUpdatePlan} onDeletePlan={onDeletePlan} />
        <LeadSourcesDirectory leadSources={leadSources} onCreateLeadSource={onCreateLeadSource} onUpdateLeadSource={onUpdateLeadSource} onDeleteLeadSource={onDeleteLeadSource} />
      </div>
      <Panel title="Прочие справочники" kicker="В разработке">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {directories.map(([title, text]) => <ModuleCard key={title} icon={Tags} title={title} text={text} />)}
        </div>
      </Panel>
      <Panel title="RBAC администратора" kicker="Ограничения">
        <div className="grid gap-3 md:grid-cols-3">
          <Permission title="Можно" text="Создавать посетителей, родителей, задачи, счета, рассылки и расписание." ok />
          <Permission title="Ограничено" text={`Работать с ${branches.length} филиалами по выданным правам.`} ok />
          <Permission title="Нельзя" text="Менять лицензию, удалять сеть, управлять глобальными правами владельца." />
        </div>
      </Panel>
    </div>
  );
}

function NavButton({ tab, active, onClick }: { key?: React.Key; tab: { label: string; icon: React.ElementType }; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${active ? "bg-[#C5A059] text-black" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{tab.label}</span>
    </button>
  );
}

function MobileNavButton({ tab, active, onClick }: { key?: React.Key; tab: { short: string; icon: React.ElementType }; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-black ${active ? "bg-[#C5A059] text-black" : "text-slate-500"}`}>
      <Icon className="h-4 w-4" />
      <span>{tab.short}</span>
    </button>
  );
}

function SectionHeader({ kicker, title, text, actions }: { kicker: string; title: string; text: string; actions: string[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] to-[#0C0C0C] p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">{kicker}</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{text}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <button key={action} onClick={() => notify(`${action} — функция в разработке`)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition hover:opacity-90 ${index === 0 ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/5 text-slate-200"}`}>
              {index === 0 ? <Plus className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
              {action}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Panel({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#111] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">{kicker}</p>
      <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KpiCard({ label, value, detail, tone }: { key?: React.Key; label: string; value: string | number; detail: string; tone: string }) {
  const colors: Record<string, string> = {
    gold: "text-[#C5A059]",
    rose: "text-rose-300",
    emerald: "text-emerald-300",
    white: "text-white"
  };
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-[#111] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${colors[tone] || colors.white}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, text }: { key?: React.Key; icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#C5A059]/15 p-2 text-[#C5A059]"><Icon className="h-4 w-4" /></div>
        <div>
          <h3 className="text-sm font-black text-white">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title }: { key?: React.Key; title: string }) {
  return <ModuleCard icon={BarChart3} title={title} text="Фильтры по периоду, филиалу, группе. Поддержка формирования и экспорта." />;
}

function DirectoryPanel({ icon, title, count, items }: { icon: React.ElementType; title: string; count: number; items: string[] }) {
  return (
    <Panel title={title} kicker={`${count} записей`}>
      <div className="space-y-2">
        {items.slice(0, 6).map((item) => <ModuleCard key={item} icon={icon} title={item} text="Карточка, статус, редактирование и история изменений." />)}
      </div>
    </Panel>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111]">
      {/* Mobile card list (md-) */}
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-2 font-black text-white">{row[0]}</p>
            <dl className="space-y-1">
              {row.slice(1).map((cell, cellIndex) => (
                <div key={`${rowIndex}-${cellIndex}`} className="flex items-start justify-between gap-3 text-xs">
                  <dt className="text-slate-500">{headers[cellIndex + 1]}</dt>
                  <dd className="text-right font-semibold text-slate-300">{cell}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {/* Full table (md+) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-slate-500">
            <tr>{headers.map((header) => <th key={header} className="p-4 font-black">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-white/5">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className={`p-4 ${cellIndex === 0 ? "font-bold text-white" : "text-slate-400"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimelineItem({ icon: Icon, title, text }: { key?: React.Key; icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="mb-3 flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 last:mb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#C5A059]"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
      </div>
    </div>
  );
}

function SelectStub({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <div className="mt-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white">{value}</div>
    </label>
  );
}

function ToggleRow({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <span className="text-sm font-bold text-white">{label}</span>
      <span className={`h-6 w-11 rounded-full p-1 ${active ? "bg-[#C5A059]" : "bg-white/10"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${active ? "translate-x-5" : ""}`} />
      </span>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{ok ? "Был" : "Нет"}</span>;
}

function ContactIcon({ icon: Icon, href, title, onClick }: { icon: React.ElementType; href?: string; title?: string; onClick?: () => void }) {
  const className = "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#C5A059] transition hover:border-[#C5A059]/40 hover:bg-[#C5A059]/10";
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={title} onClick={stop} className={className}>
        <Icon className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <button type="button" title={title} onClick={(e) => { stop(e); (onClick ?? (() => notify(`${title || "Контакт"} — функция в разработке`)))(); }} className={className}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function StatusBadge({ label, warning = false }: { label: string; warning?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${warning ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
      {label}
    </span>
  );
}

function MiniInfo({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  const colors: Record<string, string> = {
    gold: "text-[#C5A059]",
    rose: "text-rose-300",
    emerald: "text-emerald-300",
    white: "text-white"
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-base font-black ${colors[tone] || colors.white}`}>{value}</p>
    </div>
  );
}

function DetailBlock({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-[#C5A059]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-black text-white">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, primary = false, onClick }: { icon: React.ElementType; label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick ?? (() => notify(`${label} — функция в разработке`))} className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-wider transition ${primary ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function DetailTabShell({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">{kicker}</p>
      <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead className="bg-white/[0.04] text-[9px] uppercase tracking-widest text-slate-500">
          <tr>{headers.map((header) => <th key={header} className="p-3 font-black">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-white/5">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className={`p-3 ${cellIndex === 0 ? "font-black text-white" : "text-slate-400"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function attendanceLabel(status: string) {
  if (status === "present") return "Был";
  if (status === "absent") return "Не был";
  if (status === "sick") return "Справка";
  return "Не отмечено";
}

function InsightLine({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-2xl border border-[#C5A059]/15 bg-black/20 p-3">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
      <p className="text-xs leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}

function Permission({ title, text, ok = false }: { title: string; text: string; ok?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${ok ? "border-emerald-500/20 bg-emerald-500/10" : "border-rose-500/20 bg-rose-500/10"}`}>
      <p className={`text-sm font-black ${ok ? "text-emerald-300" : "text-rose-300"}`}>{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}
