import React, { useMemo, useState } from "react";
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
  Megaphone,
  Phone,
  Receipt,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  Plus,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { Announcement, Branch, Competition, ExecutiveSummary, Group, Payment, Student, Teacher } from "../types";

type StudentInput = { name?: string; branchId?: string; groupId?: string; teacherId?: string; parentName?: string; parentPhone?: string };

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
}

type OwnerTab = "dashboard" | "eduerp" | "branches" | "students" | "teachers" | "finance" | "events" | "announcements" | "analytics" | "ai" | "settings";

const ownerTabs: { id: OwnerTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", short: "Главная", icon: Activity },
  { id: "eduerp", label: "EduERP OS", short: "EduERP", icon: ClipboardList },
  { id: "branches", label: "Филиалы", short: "Филиалы", icon: Building2 },
  { id: "students", label: "Ученики", short: "Ученики", icon: Users },
  { id: "teachers", label: "Преподаватели", short: "Педагоги", icon: GraduationCap },
  { id: "finance", label: "Финансы", short: "Деньги", icon: Coins },
  { id: "events", label: "Концерты", short: "Сцена", icon: Trophy },
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
  onDeleteStudent
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
              branches={branchScorecards}
              activeStudents={activeStudents}
              newStudentsMonth={newStudentsMonth}
              teachers={teachers}
              groups={groups}
              attendanceToday={metrics.overallAttendanceRate}
              monthRevenue={monthRevenue}
              todayRevenue={todayRevenue}
              debt={debt}
              renewals={renewals}
              eventsCount={eventsCount}
            />
          )}
          {activeTab === "eduerp" && <OwnerEduErpView branches={branches} groups={groups} students={students} teachers={teachers} payments={payments} monthRevenue={monthRevenue} todayRevenue={todayRevenue} debt={debt} renewals={renewals} />}
          {activeTab === "branches" && <BranchesView branches={branchScorecards} rawBranches={branches} students={students} groups={groups} teachers={teachers} onCreateBranch={onCreateBranch} onUpdateBranch={onUpdateBranch} onDeleteBranch={onDeleteBranch} />}
          {activeTab === "students" && <StudentsNetworkView students={students} branches={branches} groups={groups} teachers={teachers} onCreateStudent={onCreateStudent} onUpdateStudent={onUpdateStudent} onDeleteStudent={onDeleteStudent} />}
          {activeTab === "teachers" && <TeachersNetworkView teachers={teachers} metrics={metrics} />}
          {activeTab === "finance" && <FinanceCenterView branches={branchScorecards} payments={payments} monthRevenue={monthRevenue} todayRevenue={todayRevenue} debt={debt} renewals={renewals} />}
          {activeTab === "events" && <EventsView competitions={competitions} branches={branches} />}
          {activeTab === "announcements" && <OwnerAnnouncementsView announcements={announcements} branches={branches} />}
          {activeTab === "analytics" && <ExecutiveAnalyticsView branches={branchScorecards} groups={groups} teachers={teachers} />}
          {activeTab === "ai" && <OwnerAiView branches={branchScorecards} renewals={renewals} debt={debt} />}
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

function OwnerDashboard({ branches, activeStudents, newStudentsMonth, teachers, groups, attendanceToday, monthRevenue, todayRevenue, debt, renewals, eventsCount }: any) {
  const kpis = [
    { label: "Выручка сегодня", value: money(todayRevenue), tone: "gold", detail: "+18% к среде" },
    { label: "Выручка месяца", value: money(monthRevenue), tone: "gold", detail: "план 74%" },
    { label: "Активные ученики", value: activeStudents, tone: "white", detail: `${newStudentsMonth} новых за месяц` },
    { label: "Посещаемость сегодня", value: `${attendanceToday}%`, tone: "emerald", detail: "месяц 82%" },
    { label: "Филиалов", value: branches.length, tone: "white", detail: "3 активны" },
    { label: "Преподавателей", value: teachers.length, tone: "white", detail: "загрузка 86%" },
    { label: "Групп", value: groups.length, tone: "white", detail: "7 перегружены" },
    { label: "Долги", value: money(debt), tone: "rose", detail: `${renewals} продлений` },
    { label: "Концерты", value: eventsCount, tone: "emerald", detail: "4 в подготовке" },
    { label: "Мероприятия", value: eventsCount + 6, tone: "white", detail: "месяц" },
    { label: "Новые продажи", value: "31", tone: "emerald", detail: "за 7 дней" },
    { label: "Повторные продажи", value: "71%", tone: "emerald", detail: "retention sales" }
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <div className="absolute right-[-80px] top-[-80px] h-80 w-80 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[1fr_420px] xl:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059]">Executive Network Dashboard</p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Dance Academy OS</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              CEO-центр управления всей сетью: финансы, филиалы, ученики, преподаватели, мероприятия, риски и решения на сегодня.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[#C5A059]/25 bg-[#C5A059]/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">30 секунд владельца</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniMetric label="Сегодня" value={money(todayRevenue)} />
              <MiniMetric label="Проблемы" value="3" />
              <MiniMetric label="Рост" value="+18%" />
              <MiniMetric label="AI задач" value="7" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi: any) => <OwnerKpi key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#C5A059] p-3 text-black"><Sparkles className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">AI Executive Morning Brief</p>
              <h2 className="mt-1 text-xl font-black text-white">Сеть растет, но два филиала требуют внимания</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Insight severity="Рост" text="Филиал Алматы показал рост выручки на 12% за неделю." />
            <Insight severity="Риск" text="В филиале Астана снизилась посещаемость младших групп." />
            <Insight severity="Продления" text="У 37 учеников заканчиваются абонементы в течение 7 дней." />
            <Insight severity="Команда" text="Преподаватель Аслан показал лучший результат месяца по вовлеченности." />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h2 className="text-lg font-black text-white">Карта филиалов</h2>
          <div className="mt-4 space-y-3">
            {branches.map((branch: any) => <BranchRow key={branch.branchId} branch={branch} />)}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ExecutivePanel icon={<WalletCards />} title="Финансовая динамика" text="Месяц +18%, средний чек 42 000 ₸, повторные продажи 71%." />
        <ExecutivePanel icon={<AlertTriangle />} title="Требуют внимания" text="Младшая группа Астана, 14 должников в Шымкенте, перегруз преподавателей." />
        <ExecutivePanel icon={<TrendingUp />} title="Точки роста" text="Открыть группу 8-10 лет в Алматы и усилить набор в девичье направление." />
      </div>
    </div>
  );
}

function BranchesView({ branches, rawBranches, students, groups, teachers, onCreateBranch, onUpdateBranch, onDeleteBranch }: {
  branches: any[];
  rawBranches: Branch[];
  students: Student[];
  groups: Group[];
  teachers: Teacher[];
  onCreateBranch?: (data: { name: string; city: string; address?: string; phone?: string }) => Promise<boolean>;
  onUpdateBranch?: (id: string, data: { name?: string; city?: string; address?: string; phone?: string }) => Promise<boolean>;
  onDeleteBranch?: (id: string) => Promise<boolean>;
}) {
  const empty = { name: "", city: "", address: "", phone: "" };
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
    <OwnerScreen title="Филиалы сети" subtitle="Все филиалы, руководители, финансы, посещаемость. Владелец может добавлять, редактировать и архивировать филиалы.">
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
    </OwnerScreen>
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
          <aside className="rounded-[2rem] border border-[#C5A059]/20 bg-gradient-to-br from-[#171717] to-[#0A0A0A] p-5 xl:sticky xl:top-5 xl:self-start">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Карточка посетителя EduERP</p>
            <h3 className="mt-1 text-2xl font-black text-white">{selectedStudent.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{selectedBranch?.city || "Филиал"} / {selectedGroup?.name || "Группа"}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniMetric label="Баланс" value={money(selectedStudent.balance)} />
              <MiniMetric label="Занятий" value={`${selectedSubscription?.lessonsLeft ?? 0}/${selectedSubscription?.lessonsTotal ?? 0}`} />
              <MiniMetric label="Преподаватель" value={selectedTeacher?.name?.split(" ")[0] || "Нет"} />
              <MiniMetric label="Статус" value={selectedStudent.balance < 0 ? "Долг" : "ОК"} />
            </div>
            <div className="mt-5 grid gap-3">
              <OwnerMiniTable
                title="Счета"
                headers={["Номер", "Сумма", "Статус"]}
                rows={[["INV-06", money(Math.max(0, 45000 + selectedStudent.balance)), selectedStudent.balance < 0 ? "К отправке" : "Оплачен"], ["INV-05", money(45000), "Оплачен"]]}
              />
              <OwnerMiniTable
                title="Баланс"
                headers={["Операция", "Расход", "Приход"]}
                rows={[["Абонемент", selectedStudent.balance < 0 ? money(Math.abs(selectedStudent.balance)) : "0 ₸", selectedStudent.balance > 0 ? money(selectedStudent.balance) : "0 ₸"], ["Корректировка", "0 ₸", "0 ₸"]]}
              />
              <OwnerMiniTable
                title="Задачи и рассылки"
                headers={["Тип", "Дедлайн", "Статус"]}
                rows={[["Проверить продление", "08.06.2026", selectedStudent.balance < 0 ? "Срочно" : "План"], ["SMS счет", "Сегодня", selectedStudent.balance < 0 ? "Готов" : "Не нужен"]]}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <OwnerAction icon={Receipt} label="Счет" primary />
              <OwnerAction icon={Send} label="Рассылка" />
              <OwnerAction icon={CheckCircle} label="Задача" />
              <OwnerAction icon={FileText} label="История" />
            </div>
          </aside>
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

function StudentsNetworkView({ students, branches, groups, teachers, onCreateStudent, onUpdateStudent, onDeleteStudent }: {
  students: Student[];
  branches: Branch[];
  groups: Group[];
  teachers: Teacher[];
  onCreateStudent?: (data: StudentInput) => Promise<boolean>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
}) {
  const empty = { name: "", parentName: "", parentPhone: "", branchId: branches[0]?.id || "", groupId: "", teacherId: "" };
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentInput>(empty);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const canManage = Boolean(onCreateStudent);

  const hasActiveSub = (s: Student) => (s.subscriptions || []).some((sub) => sub.status === "active");
  const noSub = students.filter((s) => !hasActiveSub(s)).length;
  const debtors = students.filter((s) => s.balance < 0).length;
  const activeSubs = students.reduce((n, s) => n + (s.subscriptions || []).filter((sub) => sub.status === "active").length, 0);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || "—";
  const groupName = (s: Student) => groups.find((g) => s.groupIds?.includes(g.id))?.name || "—";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name || "—";

  const startAdd = () => { setEditingId(null); setForm(empty); setAdding(true); };
  const startEdit = (s: Student) => {
    setAdding(false);
    setEditingId(s.id);
    setForm({ name: s.name, parentName: s.parentName, parentPhone: s.parentPhone, branchId: s.branchId, groupId: s.groupIds?.[0] || "", teacherId: s.teacherId || "" });
  };
  const cancel = () => { setAdding(false); setEditingId(null); setForm(empty); };

  const submit = async () => {
    if (!form.name?.trim() || !form.branchId) return;
    setBusy(true);
    let ok = false;
    if (adding && onCreateStudent) ok = await onCreateStudent(form);
    else if (editingId && onUpdateStudent) ok = await onUpdateStudent(editingId, form);
    setBusy(false);
    if (ok) cancel();
  };

  const remove = async (s: Student) => {
    if (!onDeleteStudent) return;
    if (!window.confirm(`Архивировать ученика «${s.name}»? История оплат и посещений сохранится.`)) return;
    await onDeleteStudent(s.id);
  };

  const filtered = students.filter((s) =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) || (s.parentName || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <OwnerScreen title="Ученики сети" subtitle="Вся база учеников. Владелец может добавлять, редактировать, архивировать учеников и назначать филиал, группу и преподавателя.">
      <div className="grid gap-3 md:grid-cols-4">
        <OwnerKpi label="Всего учеников" value={students.length} detail="по сети" />
        <OwnerKpi label="Активные абонементы" value={activeSubs} detail="оплачено" tone="emerald" />
        <OwnerKpi label="Без абонемента" value={noSub} detail="риск оттока" tone="rose" />
        <OwnerKpi label="Должники" value={debtors} detail="отрицательный баланс" tone="gold" />
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или родителю…"
            className="w-full max-w-xs rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50"
          />
          {!adding && editingId === null && (
            <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
              <Plus className="h-4 w-4" /> Добавить ученика
            </button>
          )}
        </div>
      )}

      {(adding || editingId !== null) && (
        <StudentForm
          title={adding ? "Новый ученик" : "Редактирование ученика"}
          form={form}
          setForm={setForm}
          branches={branches}
          groups={groups}
          teachers={teachers}
          busy={busy}
          onSubmit={submit}
          onCancel={cancel}
        />
      )}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#121212]">
        <div className="hidden grid-cols-12 gap-2 border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid">
          <span className="col-span-3">Ученик</span>
          <span className="col-span-2">Филиал</span>
          <span className="col-span-2">Группа</span>
          <span className="col-span-2">Преподаватель</span>
          <span className="col-span-2">Абонемент</span>
          <span className="col-span-1 text-right">Действия</span>
        </div>
        {filtered.map((s) => (
          <div key={s.id} className="grid grid-cols-2 gap-2 border-b border-white/5 px-5 py-3 text-sm md:grid-cols-12 md:items-center">
            <div className="col-span-3">
              <p className="font-bold text-white">{s.name}</p>
              <p className="text-xs text-slate-500">{s.parentName} · {s.parentPhone || "—"}</p>
            </div>
            <span className="col-span-2 text-slate-300">{branchName(s.branchId)}</span>
            <span className="col-span-2 text-slate-300">{groupName(s)}</span>
            <span className="col-span-2 text-slate-300">{teacherName(s.teacherId)}</span>
            <span className="col-span-2">
              {hasActiveSub(s)
                ? <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">активен</span>
                : <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-400">нет</span>}
            </span>
            {canManage && (
              <div className="col-span-1 flex justify-end gap-1">
                <button onClick={() => startEdit(s)} title="Редактировать" className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(s)} title="Архивировать" className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:border-red-500/40 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-500">Ученики не найдены.</p>}
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

function TeachersNetworkView({ teachers, metrics }: { teachers: Teacher[]; metrics: ExecutiveSummary }) {
  return (
    <OwnerScreen title="Преподаватели сети" subtitle="Статистика, вовлеченность, благодарности, удержание групп и результаты выступлений.">
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
    </OwnerScreen>
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

function EventsView({ competitions, branches }: { competitions: Competition[]; branches: Branch[] }) {
  return (
    <OwnerScreen title="Концерты и мероприятия" subtitle="Календарь концертов, фестивали, конкурсы, участие филиалов, преподавателей и учеников.">
      <div className="grid gap-4 lg:grid-cols-2">
        {competitions.map((event) => (
          <article key={event.id} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C5A059]">{event.date} • {event.location}</p>
            <h3 className="mt-2 text-lg font-black text-white">{event.title}</h3>
            <p className="mt-2 text-sm text-slate-400">Участвуют филиалы: {branches.slice(0, 2).map((branch) => branch.city).join(", ")}.</p>
          </article>
        ))}
      </div>
    </OwnerScreen>
  );
}

function OwnerAnnouncementsView({ announcements, branches }: { announcements: Announcement[]; branches: Branch[] }) {
  const audiences = ["Вся сеть", "Филиалы", "Преподаватели", "Родители", "Ученики"];
  return (
    <OwnerScreen title="Объявления владельца" subtitle="Публикации всей сети, филиалам, преподавателям, родителям и ученикам.">
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-5">
        <h3 className="font-black text-white">Новая публикация сети</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {audiences.map((audience) => <button key={audience} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-xs font-bold text-slate-200">{audience}</button>)}
        </div>
        <p className="mt-4 text-xs text-slate-500">Поддержка: закрепленное, срочное, запланированное объявление. Филиалов: {branches.length}.</p>
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        {announcements.slice(0, 4).map((item) => <ExecutivePanel key={item.id} icon={<Bell />} title={item.title} text={item.content} />)}
      </div>
    </OwnerScreen>
  );
}

function ExecutiveAnalyticsView({ branches, groups, teachers }: any) {
  return (
    <OwnerScreen title="Executive Analytics" subtitle="Рост сети, удержание, загрузка преподавателей, загрузка групп и эффективность филиалов.">
      <div className="grid gap-4 xl:grid-cols-3">
        <ExecutivePanel icon={<LineChart />} title="Рост сети" text="Новые ученики +14%, выручка +18%, повторные продажи 71%." />
        <ExecutivePanel icon={<Users />} title="Удержание" text="Retention 91%, средний срок обучения 14 месяцев, риск ухода 37 учеников." />
        <ExecutivePanel icon={<GraduationCap />} title="Загрузка преподавателей" text={`${teachers.length} преподавателей, средняя загрузка 86%, 2 зоны перегруза.`} />
        <ExecutivePanel icon={<BookIconFallback />} title="Загрузка групп" text={`${groups.length} групп, 7 перегружены, 4 требуют набора.`} />
        <ExecutivePanel icon={<Building2 />} title="Эффективность филиалов" text={`${branches.length} филиала, 1 требует вмешательства, 1 в зоне внимания.`} />
        <ExecutivePanel icon={<WalletCards />} title="Финансы" text="Средний чек 42 000 ₸, рост MoM +18%, долги требуют контроля." />
      </div>
    </OwnerScreen>
  );
}

function OwnerAiView({ branches, renewals, debt }: any) {
  return (
    <OwnerScreen title="AI Executive Assistant" subtitle="Автоматически находит проблемные филиалы, группы, риски оттока, сильных преподавателей и точки роста.">
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-gradient-to-br from-[#2A2110] to-[#101010] p-5 md:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Сводка владельца</p>
        <h2 className="mt-2 text-2xl font-black text-white">Сегодня сеть требует 4 управленческих решения</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Insight severity="Филиал" text={`${branches.find((branch: any) => branch.status !== "healthy")?.city || "Астана"} требует внимания: падение посещаемости младших групп.`} />
          <Insight severity="Абонементы" text={`${renewals} абонементов заканчиваются в течение недели.`} />
          <Insight severity="Финансы" text={`Задолженность сети: ${money(debt)}. AI рекомендует отдельную кампанию напоминаний.`} />
          <Insight severity="Рост" text="Открыть дополнительную группу 8-10 лет в самом загруженном филиале." />
        </div>
      </section>
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

function OwnerKpi({ label, value, detail, tone = "white" }: { key?: React.Key; label: string; value: React.ReactNode; detail: string; tone?: string }) {
  const color = tone === "gold" ? "text-[#C5A059]" : tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : "text-white";
  return (
    <section className="rounded-3xl border border-white/10 bg-[#161616] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
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

function ExecutivePanel({ icon, title, text }: { key?: React.Key; icon: React.ReactNode; title: string; text: string }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">{icon}</div>
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
