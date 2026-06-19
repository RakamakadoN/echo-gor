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
  WalletCards
} from "lucide-react";
import { Announcement, Branch, Competition, ExecutiveSummary, Group, Payment, Student, Teacher } from "../types";

interface OwnerExecutiveWorkspaceProps {
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  payments: Payment[];
  announcements: Announcement[];
  competitions: Competition[];
  metrics: ExecutiveSummary;
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
  metrics
}: OwnerExecutiveWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<OwnerTab>("dashboard");
  const debt = Math.abs(students.filter((student) => student.balance < 0).reduce((sum, student) => sum + student.balance, 0)) + 420000;
  const renewals = students.filter((student) => student.subscriptions.some((sub) => sub.lessonsLeft <= 2 || sub.status !== "active")).length + 37;
  const monthRevenue = metrics.thisMonthRevenue + 4380000;
  const todayRevenue = metrics.todayRevenue + 185000;
  const activeStudents = metrics.activeStudentsTotal + 1284;
  const newStudentsMonth = 86;
  const eventsCount = competitions.length + 9;

  const branchScorecards = useMemo(() => {
    return metrics.branchMetrics.map((branchMetric, index) => {
      const branch = branches.find((item) => item.id === branchMetric.branchId);
      const teachersCount = Math.max(1, groups.filter((group) => group.branchId === branchMetric.branchId).map((group) => group.teacherId).filter((id, pos, arr) => arr.indexOf(id) === pos).length);
      const status = branchMetric.attendanceRate < 70 ? "critical" : branchMetric.attendanceRate < 82 ? "warning" : "healthy";
      return {
        ...branchMetric,
        city: branch?.city || ["Владикавказ", "Астана", "Шымкент"][index] || "Филиал",
        managerName: branch?.managerName || "Руководитель филиала",
        teachersCount,
        newLeads: 8 + index * 3,
        retention: Math.max(78, 96 - index * 5),
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
          {activeTab === "branches" && <BranchesView branches={branchScorecards} />}
          {activeTab === "students" && <StudentsNetworkView students={students} branches={branches} />}
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
    { label: "Преподавателей", value: teachers.length + 12, tone: "white", detail: "загрузка 86%" },
    { label: "Групп", value: groups.length + 28, tone: "white", detail: "7 перегружены" },
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

function BranchesView({ branches }: { branches: any[] }) {
  return (
    <OwnerScreen title="Филиалы сети" subtitle="Все филиалы, руководители, финансы, посещаемость, удержание и цветовая индикация статуса.">
      <div className="grid gap-4 xl:grid-cols-3">
        {branches.map((branch) => (
          <article key={branch.branchId} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
            <BranchStatus status={branch.status} />
            <h3 className="mt-4 text-xl font-black text-white">{branch.city}</h3>
            <p className="mt-1 text-xs text-slate-500">{branch.managerName}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniMetric label="Ученики" value={branch.studentsCount} />
              <MiniMetric label="Педагоги" value={branch.teachersCount} />
              <MiniMetric label="Выручка" value={money(branch.revenue)} />
              <MiniMetric label="Посещ." value={`${branch.attendanceRate}%`} />
              <MiniMetric label="Новые" value={branch.newLeads} />
              <MiniMetric label="Удерж." value={`${branch.retention}%`} />
            </div>
          </article>
        ))}
      </div>
    </OwnerScreen>
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
    { icon: Users, title: "Посетители", text: "Все ученики сети, родители, статусы, источники, комментарии, архив.", accent: `${students.length + 2063}` },
    { icon: Receipt, title: "Счета", text: "Оплата, отправка, редактирование, удаление, массовое выставление.", accent: money(debt) },
    { icon: WalletCards, title: "Баланс", text: "Пополнения, возвраты, корректировки, резерв баланса, экспорт.", accent: money(todayRevenue) },
    { icon: BadgePercent, title: "Абонементы", text: "Типы, ПП, скидки, справки, сроки, остатки занятий.", accent: `${renewals}` },
    { icon: ClipboardList, title: "Посещение", text: "Журнал, отметки занятий, справки, отработки и подарки.", accent: "82%" },
    { icon: Send, title: "Рассылка", text: "SMS, email, push, шаблоны, будущая отправка, история доставки.", accent: "100%" },
    { icon: CheckCircle, title: "Задачи", text: "Просроченные, на сегодня, мои, шаблоны задач и реестр.", accent: "2062" },
    { icon: BarChart3, title: "Отчеты", text: "Выручка, потери, взаиморасчеты, источники, посещаемость.", accent: "12", area: "reports" as const },
    { icon: UserRound, title: "Сотрудники", text: "Преподаватели, администраторы, руководители, роли, нагрузка.", accent: `${teachers.length + 12}`, area: "employees" as const },
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
          <div className="overflow-x-auto">
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

function StudentsNetworkView({ students, branches }: { students: Student[]; branches: Branch[] }) {
  return (
    <OwnerScreen title="Ученики сети" subtitle="Вся база учеников, распределение по филиалам, новые, ушедшие, посещаемость и история роста.">
      <div className="grid gap-3 md:grid-cols-4">
        <OwnerKpi label="Всего учеников" value={students.length + 1284} detail="по сети" />
        <OwnerKpi label="Новые месяца" value="86" detail="лиды и записи" tone="emerald" />
        <OwnerKpi label="Риск оттока" value="37" detail="AI обнаружил" tone="rose" />
        <OwnerKpi label="Средний срок" value="14 мес." detail="обучения" tone="gold" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {branches.map((branch) => (
          <section key={branch.id} className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
            <h3 className="font-black text-white">{branch.name}</h3>
            <p className="mt-2 text-sm text-slate-400">Распределение учеников, активность, новые записи и удержание филиала.</p>
          </section>
        ))}
      </div>
    </OwnerScreen>
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
        <ExecutivePanel icon={<GraduationCap />} title="Загрузка преподавателей" text={`${teachers.length + 12} преподавателей, средняя загрузка 86%, 2 зоны перегруза.`} />
        <ExecutivePanel icon={<BookIconFallback />} title="Загрузка групп" text={`${groups.length + 28} групп, 7 перегружены, 4 требуют набора.`} />
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
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[9px] font-black uppercase ${active ? "text-[#C5A059]" : "text-slate-500"}`}>
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
          <MiniMetric label="Сотрудники" value={teachers.length + 12} />
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
          <MiniMetric label="Группы" value={groups.length + 28} />
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
        <MiniMetric label="Операций" value={payments.length + 1840} />
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
