import React, { useMemo, useState } from "react";
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
  ShieldCheck,
  Sparkles,
  Tags,
  User,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";
import { Announcement, AuditLog, Branch, Group, Payment, Student, Teacher } from "../types";

interface AdminEduErpWorkspaceProps {
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  payments: Payment[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
}

type AdminTab =
  | "dashboard"
  | "visitors"
  | "journal"
  | "calendar"
  | "billing"
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
  auditLogs
}: AdminEduErpWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
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

  const monthRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0) + 2850000;
  const todayRevenue = payments.filter((payment) => payment.date === "2026-06-01").reduce((sum, payment) => sum + payment.amount, 0) + 184000;
  const debt = Math.abs(students.filter((student) => student.balance < 0).reduce((sum, student) => sum + student.balance, 0)) + 126000;
  const renewals = students.filter((student) => student.subscriptions.some((subscription) => subscription.lessonsLeft <= 2 || subscription.status !== "active"));
  const attendanceRate = Math.round(
    students.reduce((sum, student) => {
      const records = Object.values(student.attendance || {});
      if (!records.length) return sum + 82;
      return sum + Math.round((records.filter((record) => record.status === "present").length / records.length) * 100);
    }, 0) / Math.max(1, students.length)
  );

  return (
    <div className="min-h-full bg-[#080808] text-slate-200">
      <div className="mx-auto flex max-w-[1560px] gap-0 lg:gap-5">
        <aside className="sticky top-0 hidden h-[calc(100vh-64px)] w-76 shrink-0 border-r border-white/5 bg-[#0F0F0F] p-4 lg:block">
          <section className="rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#2B2315] to-[#111] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C5A059] text-black">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">EduERP parity</p>
                <h2 className="text-lg font-black text-white">Операционный центр</h2>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Перенос функционала: посетители, журнал, расписание, финансы, отчеты, рассылки, задачи и справочники.
            </p>
          </section>

          <nav className="mt-5 space-y-1">
            {tabs.map((tab) => (
              <NavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
            ))}
          </nav>

          <section className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Администратор</p>
            <p className="mt-2 text-sm font-bold text-white">Операции без доступа к лицензии</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Может вести учеников, журнал, счета и рассылки. Глобальные права сети остаются у владельца.
            </p>
          </section>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pt-6 lg:pb-8">
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
              students={filteredStudents}
              groups={groups}
              branches={branches}
              teachers={teachers}
              payments={payments}
              search={search}
              branchFilter={branchFilter}
              setSearch={setSearch}
              setBranchFilter={setBranchFilter}
            />
          )}
          {activeTab === "journal" && <JournalView groups={groups} students={students} />}
          {activeTab === "calendar" && <CalendarView groups={groups} teachers={teachers} branches={branches} />}
          {activeTab === "billing" && <BillingView students={students} groups={groups} payments={payments} debt={debt} renewals={renewals} />}
          {activeTab === "reports" && <ReportsView branches={branches} groups={groups} todayRevenue={todayRevenue} monthRevenue={monthRevenue} attendanceRate={attendanceRate} />}
          {activeTab === "messages" && <MessagesView announcements={announcements} branches={branches} groups={groups} />}
          {activeTab === "tasks" && <TasksView auditLogs={auditLogs} students={students} />}
          {activeTab === "org" && <OrganizationView branches={branches} groups={groups} teachers={teachers} />}
          {activeTab === "settings" && <SettingsView branches={branches} groups={groups} />}
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
    { label: "Посетители", value: students.length + 2063, detail: "активная база", tone: "white" },
    { label: "Посещаемость", value: `${attendanceRate}%`, detail: "по журналам", tone: "emerald" },
    { label: "Долги", value: money(debt), detail: "нужны счета", tone: "rose" },
    { label: "Продления", value: Math.max(renewals.length, 37), detail: "в ближайшие 7 дней", tone: "rose" },
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
              <InsightLine text="37 абонементов требуют продления на этой неделе." />
              <InsightLine text="Счета можно отправить группам с долгом через SMS и email." />
              <InsightLine text="Журнал за сегодня ожидает отметок в 3 группах." />
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

function VisitorsView({ students, groups, branches, teachers, payments, search, branchFilter, setSearch, setBranchFilter }: any) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const selectedStudent = students.find((student: Student) => student.id === selectedStudentId) || students[0];

  return (
    <div className="space-y-5">
      <SectionHeader
        kicker="Посетители"
        title="CRM учеников и родителей"
        text="Аналог раздела Посетители: фильтры, таблица, карточка, создание задач, импорт, статусы, платежные правила и рассылки."
        actions={["Добавить", "Импорт", "Создать задачу"]}
      />
      <div className="rounded-[2rem] border border-white/10 bg-[#111] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_160px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти посетителя, родителя или телефон" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#C5A059]" />
          </div>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#C5A059]">
            <option value="all">Все филиалы</option>
            {branches.map((branch: Branch) => <option key={branch.id} value={branch.id}>{branch.city}</option>)}
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black"><Filter className="h-4 w-4" /> Фильтр</button>
        </div>
      </div>
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
                          <ContactIcon icon={Phone} />
                          <ContactIcon icon={MessageCircle} />
                          <ContactIcon icon={Send} />
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
          <StudentDetailPanel
            student={selectedStudent}
            group={groups.find((group: Group) => group.id === (selectedStudent.groupIds?.[0] || (selectedStudent as any).groupId))}
            branch={branches.find((branch: Branch) => branch.id === selectedStudent.branchId)}
            teacher={teachers.find((teacher: Teacher) => teacher.id === selectedStudent.teacherId)}
            payments={payments.filter((payment: Payment) => payment.studentId === selectedStudent.id)}
          />
        )}
      </div>
    </div>
  );
}

function StudentDetailPanel({ student, group, branch, teacher, payments }: { student: Student; group?: Group; branch?: Branch; teacher?: Teacher; payments: Payment[] }) {
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
        <ActionButton icon={Plus} label="ПУ" />
        <ActionButton icon={CalendarDays} label="O" />
        <ActionButton icon={BadgePercent} label="1" />
        <ActionButton icon={BadgePercent} label="U" />
        <ActionButton icon={Phone} label="Позвонить" />
        <ActionButton icon={MessageCircle} label="WhatsApp" />
        <ActionButton icon={Receipt} label="Счет" primary />
        <ActionButton icon={CheckCircle} label="Задача" />
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
              <ActionButton icon={FileSpreadsheet} label="Экспорт" />
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

function JournalView({ groups, students }: any) {
  const dates = ["02.06", "04.06", "06.06", "09.06"];
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Журнал" title="Посещаемость, справки и отметки занятий" text="Фильтр по филиалу, группе и месяцу. Преподаватель отмечает посещения, администратор видит статус журнала и прикрепленные справки." actions={["Загрузить справку", "Сохранить журнал"]} />
      <Panel title="Журнал группы" kicker="Июнь 2026">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <SelectStub label="Филиал" value="Алматы" />
          <SelectStub label="Группа" value={groups[0]?.name || "Ансамбль"} />
          <SelectStub label="Месяц" value="Июнь 2026" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-slate-500">
              <tr><th className="p-3">Посетитель</th>{dates.map((date) => <th key={date} className="p-3">{date}</th>)}<th className="p-3">Справка</th></tr>
            </thead>
            <tbody>
              {students.slice(0, 6).map((student: Student, index: number) => (
                <tr key={student.id} className="border-t border-white/5">
                  <td className="p-3 font-bold text-white">{student.name}</td>
                  {dates.map((date, dateIndex) => <td key={date} className="p-3"><StatusDot ok={(index + dateIndex) % 4 !== 0} /></td>)}
                  <td className="p-3 text-xs text-slate-400">{index % 3 === 0 ? "Загружена" : "Нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function CalendarView({ groups, teachers, branches }: any) {
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Расписание занятий" title="Календарь событий и регулярных занятий" text="Создание события, назначение преподавателя, выбор дней недели, пробное занятие, применение ко всем или последующим занятиям." actions={["Добавить событие", "Перенести занятие"]} />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Форма события" kicker="Добавить / редактировать">
          <div className="grid gap-3">
            <SelectStub label="Филиал" value={branches[0]?.city || "Алматы"} />
            <SelectStub label="Группа" value={groups[0]?.name || "Группа"} />
            <SelectStub label="Преподаватель" value={teachers[0]?.name || "Преподаватель"} />
            <div className="grid grid-cols-2 gap-3">
              <SelectStub label="Дата" value="02.06.2026" />
              <SelectStub label="Время" value="18:30" />
            </div>
            <ToggleRow label="Доступно пробное занятие" active />
            <ToggleRow label="Применить ко всем последующим" />
          </div>
        </Panel>
        <Panel title="Неделя филиала" kicker="Залы и группы">
          <div className="grid gap-3 md:grid-cols-2">
            {groups.slice(0, 6).map((group: Group) => (
              <div key={group.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm font-black text-white">{group.name}</p>
                <p className="mt-1 text-xs text-slate-400">{group.days.join(", ")} / {group.time} / {group.ageGroup}</p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{group.level}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function BillingView({ students, groups, payments, debt, renewals }: any) {
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Стоимость" title="Абонементы, счета, скидки и промокоды" text="Абонементы, продления, массовое выставление счетов, история платежей, реестр операций, скидки, промокоды и справки." actions={["Показать счета", "Отправить", "Добавить оплату"]} />
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Долг" value={money(debt)} detail="к взысканию" tone="rose" />
        <KpiCard label="Продления" value={Math.max(renewals.length, 37)} detail="неделя" tone="gold" />
        <KpiCard label="Платежи" value={payments.length + 214} detail="реестр операций" tone="white" />
        <KpiCard label="Абонементы" value="8" detail="типов доступно" tone="emerald" />
      </div>
      <DataTable
        headers={["Филиал", "Группа", "Посетитель", "Абонемент", "Посещение", "Итого", "Скидка", "SMS", "Email"]}
        rows={students.slice(0, 7).map((student: Student) => [
          "Алматы",
          groups.find((group: Group) => group.id === (student.groupIds?.[0] || (student as any).groupId))?.name || "Группа",
          student.name,
          student.subscriptions[0]?.name || "Стандарт",
          `${student.subscriptions[0]?.lessonsLeft || 0} занятий`,
          money(Math.max(0, 45000 + student.balance)),
          student.balance < 0 ? "0" : "10%",
          "Да",
          "Да"
        ])}
      />
    </div>
  );
}

function ReportsView({ branches, groups, todayRevenue, monthRevenue, attendanceRate }: any) {
  const reports = [
    "Руководители по месяцам",
    "Отчет о выручке и потерях",
    "Взаиморасчеты",
    "Выгрузка посетителей с привязкой к тренерам",
    "Отчет по рекламному источнику",
    "Отчет о заполненности",
    "Реестр операций",
    "Проданные абонементы",
    "Отчет о ДР посетителей",
    "Отчет о посещаемости",
    "Отчет по задачам",
    "Реестр задач"
  ];
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Аналитика" title="Отчеты и экспорт" text="Все отчеты EduERP собраны в одном BI-центре с фильтрами день, неделя, месяц, филиал, группа и экспортом." actions={["Сформировать", "Экспорт"]} />
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Сегодня" value={money(todayRevenue)} detail="касса" tone="gold" />
        <KpiCard label="Месяц" value={money(monthRevenue)} detail="рост сети" tone="gold" />
        <KpiCard label="Посещаемость" value={`${attendanceRate}%`} detail="по группам" tone="emerald" />
        <KpiCard label="Заполненность" value={`${Math.round((groups.length / Math.max(1, branches.length * 4)) * 100)}%`} detail="залы" tone="white" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => <ReportCard key={report} title={report} />)}
      </div>
    </div>
  );
}

function MessagesView({ announcements, branches, groups }: any) {
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Рассылки" title="Сценарии, шаблоны и история сообщений" text="Шаблоны рассылок, будущая отправка, SMS/email/push, массовые объявления и история статусов доставки." actions={["Создать сценарий", "Запланировать"]} />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Новая рассылка" kicker="Безопасная коммуникация">
          <div className="grid gap-3">
            <SelectStub label="Аудитория" value="Родители филиала" />
            <SelectStub label="Филиал" value={branches[0]?.city || "Алматы"} />
            <SelectStub label="Группа" value={groups[0]?.name || "Все группы"} />
            <SelectStub label="Канал" value="Push + SMS + Email" />
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-300">Напоминание о продлении абонемента и расписании занятий.</div>
          </div>
        </Panel>
        <DataTable
          headers={["Дата", "Предмет", "Сообщение", "Статус", "Инициатор"]}
          rows={announcements.slice(0, 6).map((item: Announcement) => [item.date, item.title, item.content.slice(0, 44) + "...", "Успешно", item.authorName])}
        />
      </div>
    </div>
  );
}

function TasksView({ auditLogs, students }: any) {
  const tasks = [
    ["Перезвонить родителю", students[0]?.parentName || "Родитель", "Сегодня", "В работе"],
    ["Проверить оплату", students[1]?.parentName || "Родитель", "Завтра", "Новая"],
    ["Закрыть пропуски", students[2]?.parentName || "Родитель", "02.06", "Просрочена"],
    ["Подготовить счет", students[3]?.parentName || "Родитель", "03.06", "Новая"]
  ];
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Задачи" title="Шаблоны задач, дедлайны и реестр" text="Системные задачи по триггерам: новый лид, пробное занятие, долг, продление, пропуск, закрытие задачи с комментарием." actions={["Добавить задачу", "Шаблоны"]} />
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <DataTable headers={["Задача", "Посетитель", "Дедлайн", "Статус"]} rows={tasks} />
        <Panel title="История изменений" kicker="Audit log">
          {auditLogs.slice(0, 5).map((log: AuditLog) => <TimelineItem key={log.id} icon={FileText} title={log.action} text={log.details} />)}
        </Panel>
      </div>
    </div>
  );
}

function OrganizationView({ branches, groups, teachers }: any) {
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Организация" title="Сотрудники, родители, филиалы, группы и территории" text="Справочник организационной структуры: пользователи, роли, филиалы Казахстана, группы, залы, возрастные категории и направления." actions={["Добавить сотрудника", "Добавить группу"]} />
      <div className="grid gap-4 xl:grid-cols-3">
        <DirectoryPanel icon={UserRound} title="Сотрудники" count={teachers.length + 12} items={teachers.map((teacher: Teacher) => teacher.name)} />
        <DirectoryPanel icon={Building2} title="Филиалы" count={branches.length} items={branches.map((branch: Branch) => `${branch.city}, ${branch.address}`)} />
        <DirectoryPanel icon={BookOpen} title="Группы" count={groups.length} items={groups.map((group: Group) => group.name)} />
      </div>
    </div>
  );
}

function SettingsView({ branches, groups }: any) {
  const directories = [
    ["Статусы посетителей", "Пользовательские и системные статусы"],
    ["Рекламные источники", "Каналы, источники, территории"],
    ["Абонементы", "Тип, цена, срок, доступно занятий"],
    ["Скидки", "Процент, дни, рубли, филиалы"],
    ["Промокоды", "Код, лимит, срок, статистика"],
    ["Справки", "Медицинские справки и компенсации"],
    ["Возраст групп", "Возрастные категории"],
    ["Архив", "Статусы, посетители, скидки, сотрудники"],
    ["Интеграции", "SMS, email, платежи, внешние формы"]
  ];
  return (
    <div className="space-y-5">
      <SectionHeader kicker="Справочники" title="Настройки операционного ядра" text="Все сущности, которые нужны для полноценного переноса EduERP: статусы, источники, стоимость, архивы, интеграции и политики." actions={["Добавить", "Редактировать"]} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {directories.map(([title, text]) => <ModuleCard key={title} icon={Tags} title={title} text={text} />)}
      </div>
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
            <button key={action} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider ${index === 0 ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/5 text-slate-200"}`}>
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

function ContactIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#C5A059]">
      <Icon className="h-3.5 w-3.5" />
    </span>
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

function ActionButton({ icon: Icon, label, primary = false }: { icon: React.ElementType; label: string; primary?: boolean }) {
  return (
    <button className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-wider transition ${primary ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"}`}>
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
