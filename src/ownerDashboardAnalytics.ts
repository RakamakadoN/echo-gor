// Аналитический движок главного дашборда владельца «Эхо Гор».
// Чистые функции: считают все секции ТЗ из массивов, которые кабинет владельца
// уже получает из /api/mvp/bootstrap (students, payments, groups, branches, teachers).
// Везде, где исторических данных пока нет, значение возвращается как null —
// UI показывает «нет данных / накапливается», а не выдуманную цифру.

import type { Branch, Group, Student, Payment, Teacher } from "./types";

export type PeriodKey = "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom";
export type LevelKey = "network" | "branch" | "group" | "teacher";

export interface DashFilters {
  period: PeriodKey;
  level: LevelKey;
  branchId?: string;
  groupId?: string;
  teacherId?: string;
  customStart?: string; // YYYY-MM-DD
  customEnd?: string;    // YYYY-MM-DD
}

// Снапшоты/события приходят с сервера (forward-collectors). Пока таблицы пусты —
// просто отсутствуют, и YoY/воронка по дням деградируют в «нет данных».
export interface MetricsSnapshot {
  periodMonth: string; // YYYY-MM-01
  branchId: string | null;
  revenue: number;
  activeSubscriptions: number;
  avgCheck: number;
  retentionRate: number;
  attendanceRate: number;
  newStudents: number;
}
export interface FunnelDay { leads: number; trialBooked: number; trialCame: number; bought: number; }
export interface DashExtras {
  snapshots?: MetricsSnapshot[];
  funnelToday?: FunnelDay;
  funnelYesterday?: FunnelDay;
  // future enrollments by start date / debtor aging — если сервер посчитал из сырых таблиц
  futureEnrollments?: { total: number; byBranch: Record<string, number>; byAge: Record<string, number> } | null;
  debtorAging?: { d1_7: number; d8_14: number; d14plus: number } | null;
}

// ---------- даты ----------
const DAY = 86400000;
// Русское склонение по числу: plural(n, "товар", "товара", "товаров").
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (s: string) => (s || "").slice(0, 7);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export interface DateRange { start: string; end: string; label: string; }

export function resolveRanges(period: PeriodKey, now: Date, customStart?: string, customEnd?: string) {
  const today = startOfDay(now);
  let cur: DateRange;
  let prev: DateRange;     // предыдущий аналогичный период (MoM-логика)
  let yoy: DateRange;      // тот же период год назад

  const mk = (s: Date, e: Date, label: string): DateRange => ({ start: iso(s), end: iso(e), label });
  const yearShift = (r: DateRange): DateRange => {
    const s = new Date(r.start); const e = new Date(r.end);
    s.setFullYear(s.getFullYear() - 1); e.setFullYear(e.getFullYear() - 1);
    return { start: iso(s), end: iso(e), label: "год назад" };
  };

  switch (period) {
    case "today": {
      cur = mk(today, today, "Сегодня");
      prev = mk(addDays(today, -1), addDays(today, -1), "вчера");
      yoy = yearShift(cur); break;
    }
    case "yesterday": {
      const y = addDays(today, -1);
      cur = mk(y, y, "Вчера");
      prev = mk(addDays(today, -2), addDays(today, -2), "позавчера");
      yoy = yearShift(cur); break;
    }
    case "week": {
      const dow = (today.getDay() + 6) % 7; // пн=0
      const s = addDays(today, -dow);
      cur = mk(s, today, "Текущая неделя");
      prev = mk(addDays(s, -7), addDays(s, -1), "прошлая неделя");
      yoy = yearShift({ start: iso(s), end: iso(addDays(s, 6)), label: "" }); break;
    }
    case "quarter": {
      const q = Math.floor(today.getMonth() / 3);
      const s = new Date(today.getFullYear(), q * 3, 1);
      cur = mk(s, today, "Квартал");
      const ps = new Date(today.getFullYear(), q * 3 - 3, 1);
      const pe = new Date(today.getFullYear(), q * 3, 0);
      prev = mk(ps, pe, "прошлый квартал");
      yoy = yearShift({ start: iso(s), end: iso(new Date(today.getFullYear(), q * 3 + 3, 0)), label: "" }); break;
    }
    case "year": {
      const s = new Date(today.getFullYear(), 0, 1);
      cur = mk(s, today, "Год");
      prev = mk(new Date(today.getFullYear() - 1, 0, 1), new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()), "прошлый год");
      yoy = prev; break;
    }
    case "custom": {
      const s = customStart ? new Date(customStart) : new Date(today.getFullYear(), today.getMonth(), 1);
      const e = customEnd ? new Date(customEnd) : today;
      const len = Math.max(0, Math.round((e.getTime() - s.getTime()) / DAY));
      cur = mk(s, e, "Период");
      prev = mk(addDays(s, -(len + 1)), addDays(s, -1), "предыдущий период");
      yoy = yearShift(cur); break;
    }
    case "month":
    default: {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      cur = mk(s, today, "Текущий месяц");
      const ps = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const pe = new Date(today.getFullYear(), today.getMonth(), 0);
      prev = mk(ps, pe, "прошлый месяц");
      yoy = yearShift({ start: iso(s), end: iso(new Date(today.getFullYear(), today.getMonth() + 1, 0)), label: "" }); break;
    }
  }
  return { cur, prev, yoy };
}

const inRange = (date: string, r: DateRange) => !!date && date >= r.start && date <= r.end;
const isPaid = (p: Payment) => p.status === "paid";

export interface Delta { abs: number | null; pct: number | null; }
function delta(cur: number, base: number | null): Delta {
  if (base === null || base === undefined) return { abs: null, pct: null };
  const abs = cur - base;
  const pct = base === 0 ? (cur === 0 ? 0 : null) : Math.round((abs / base) * 1000) / 10;
  return { abs, pct };
}

// ---------- сегментация платежей (new / regular / returning) ----------
type Seg = "new" | "regular" | "returning";
function segmentPayments(payments: Payment[]) {
  const byStudent = new Map<string, Payment[]>();
  payments.filter(isPaid).forEach((p) => {
    const list = byStudent.get(p.studentId) || [];
    list.push(p); byStudent.set(p.studentId, list);
  });
  const seg = new Map<string, Seg>(); // paymentId -> seg
  byStudent.forEach((list) => {
    list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    list.forEach((p, i) => {
      if (i === 0) { seg.set(p.id, "new"); return; }
      const prevDate = list[i - 1].date;
      const gap = prevDate ? (new Date(p.date).getTime() - new Date(prevDate).getTime()) / DAY : 0;
      seg.set(p.id, gap > 60 ? "returning" : "regular");
    });
  });
  return seg;
}

function revenueBySeg(payments: Payment[], r: DateRange, seg: Map<string, Seg>) {
  const out = { all: 0, new: 0, regular: 0, returning: 0, count: 0 };
  payments.filter(isPaid).forEach((p) => {
    if (!inRange(p.date, r)) return;
    out.all += p.amount; out.count += 1;
    out[seg.get(p.id) || "regular"] += p.amount;
  });
  return out;
}

// ---------- посещаемость ----------
function attendanceRate(students: Student[], r?: DateRange) {
  let present = 0, marked = 0;
  students.forEach((s) => {
    Object.values(s.attendance || {}).forEach((a) => {
      if (!a || a.status === "unmarked") return;
      if (r && !inRange(a.date, r)) return;
      marked += 1;
      if (a.status === "present") present += 1;
    });
  });
  return marked ? Math.round((present / marked) * 100) : null;
}

const hasActiveSub = (s: Student) => (s.subscriptions || []).some((sub) => sub.status === "active");
const retentionOf = (subset: Student[]) => subset.length ? Math.round((subset.filter(hasActiveSub).length / subset.length) * 100) : null;
const RETENTION_NORM = 70; // норма удержания, %
// топ-N по числовому критерию, null-значения всегда в конце
function topBy<T>(arr: T[], val: (x: T) => number | null, n = 5): T[] {
  return [...arr].sort((a, b) => {
    const av = val(a), bv = val(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av;
  }).slice(0, n);
}

// ---------- основной расчёт ----------
export interface BranchRating { id: string; name: string; revenue: number; retention: number | null; avgCheck: number | null; growthPct: number | null }
export interface TeacherRating { id: string; name: string; students: number; retention: number | null; revenue: number; growthPct: number | null }
export interface GroupRating { id: string; name: string; revenue: number; occupancy: number | null; retention: number | null }

// ---------- Ежедневный отчёт руководителя («Здоровье студии за 30 секунд») ----------
// Каждый показатель/риск несёт точный список id, чтобы клик открыл вкладку
// «Ученики» с уже применённым фильтром по релевантному списку. Списки считаются
// внутри выбранной области (period + филиал/уровень), поэтому переход автоматически
// сохраняет период и филиал из дашборда.
export interface DailyReportEntry { count: number; ids: string[]; }
export interface DailyRiskItem {
  id: string;
  severity: "high" | "mid" | "low";
  title: string;
  detail: string;
  count: number;
  kind: "students" | "groups" | "branches";
  studentIds: string[]; // кого показать во вкладке «Ученики»
  label: string;        // подпись применённого фильтра
}
export interface DailyReport {
  date: string;
  revenueToday: number;
  paymentsToday: number;
  activeSubs: number;
  debtors: DailyReportEntry;
  newStudents: DailyReportEntry;        // новые за выбранный период
  futureEnrollments: DailyReportEntry;  // записаны на будущее (лиды/пробные)
  expiring3d: DailyReportEntry;         // истекают ЧЕРЕЗ 3 дня (в ближайшие 3 дня)
  expiring7d: DailyReportEntry;
  expiring14d: DailyReportEntry;
  unpaidCurrentMonth: DailyReportEntry;
  unpaidPrevMonth: DailyReportEntry;
  overloadedGroups: { count: number; groupIds: string[]; studentIds: string[] };
  lowFillGroups: { count: number; groupIds: string[]; studentIds: string[] };
  retentionDropBranches: { count: number; branchIds: string[]; studentIds: string[] };
  risks: DailyRiskItem[];
  summary: string;
}

export interface OwnerDashboardModel {
  filters: DashFilters;
  ranges: ReturnType<typeof resolveRanges>;
  dailyReport: DailyReport;
  scope: { students: number; groups: number; branches: number; teachers: number; label: string };
  revenue: {
    total: number; today: number; yesterday: number;
    new: number; regular: number; returning: number;
    momPct: number | null; yoyPct: number | null;
  };
  avgCheck: { all: number | null; new: number | null; regular: number | null; returning: number | null; momPct: number | null };
  activeSubs: { count: number; momPct: number | null; yoyPct: number | null };
  occupancy: { pct: number | null; filled: number; capacity: number; byBranch: { id: string; name: string; pct: number | null; filled: number; capacity: number }[] };
  retention: { pct: number | null; activeStudents: number; totalStudents: number; momPct: number | null; yoyPct: number | null };
  debtors: { total: number; debtAmount: number; aging: { d1_7: number; d8_14: number; d14plus: number } | null };
  futureEnrollments: { total: number; byBranch: { name: string; n: number }[]; byAge: { label: string; n: number }[]; isProxy: boolean };
  newStudents: { period: number; today: number; hasData: boolean };
  renewals: { d3: number; d7: number; d14: number };
  funnel: {
    today: FunnelDay | null; yesterday: FunnelDay | null;
    month: { leads: number; signed: number; came: number; bought: number; convSigned: number | null; convCame: number | null; convBought: number | null };
  };
  charts: {
    revenueByMonth: { month: string; cur: number; prev: number | null }[];
    avgCheckByMonth: { month: string; cur: number | null; prev: number | null }[];
    subsByMonth: { month: string; value: number | null }[];
    retentionByMonth: { month: string; value: number | null }[];
    retentionByDay: { day: string; value: number | null }[] | null;
  };
  risks: { id: string; severity: "high" | "mid" | "low"; title: string; detail: string }[];
  attention: string[];
  growth: string[];
  brief: string[];
  ratings: {
    branches: { byRevenue: BranchRating[]; byRetention: BranchRating[]; byAvgCheck: BranchRating[]; byGrowth: BranchRating[] };
    teachers: { byStudents: TeacherRating[]; byRetention: TeacherRating[]; byRevenue: TeacherRating[]; byGrowth: TeacherRating[] };
    groups: { byRevenue: GroupRating[]; byOccupancy: GroupRating[]; byRetention: GroupRating[] };
  };
}

export function computeOwnerDashboard(
  all: { students: Student[]; payments: Payment[]; groups: Group[]; branches: Branch[]; teachers: Teacher[] },
  filters: DashFilters,
  now: Date = new Date(),
  extras: DashExtras = {}
): OwnerDashboardModel {
  const ranges = resolveRanges(filters.period, now, filters.customStart, filters.customEnd);
  const todayStr = iso(startOfDay(now));
  const yStr = iso(addDays(startOfDay(now), -1));

  // --- область видимости (уровень анализа) ---
  let students = all.students.slice();
  let groups = all.groups.slice();
  let branches = all.branches.slice();
  const teachers = all.teachers.slice();
  let scopeLabel = "Вся сеть";

  if (filters.level === "branch" && filters.branchId) {
    branches = branches.filter((b) => b.id === filters.branchId);
    groups = groups.filter((g) => g.branchId === filters.branchId);
    students = students.filter((s) => s.branchId === filters.branchId);
    scopeLabel = "Филиал: " + (branches[0]?.name || branches[0]?.city || "—");
  } else if (filters.level === "group" && filters.groupId) {
    groups = groups.filter((g) => g.id === filters.groupId);
    const gids = new Set(groups.map((g) => g.id));
    students = students.filter((s) => (s.groupIds || []).some((id) => gids.has(id)));
    branches = branches.filter((b) => groups.some((g) => g.branchId === b.id));
    scopeLabel = "Группа: " + (groups[0]?.name || "—");
  } else if (filters.level === "teacher" && filters.teacherId) {
    groups = groups.filter((g) => g.teacherId === filters.teacherId);
    students = students.filter((s) => s.teacherId === filters.teacherId);
    branches = branches.filter((b) => groups.some((g) => g.branchId === b.id));
    scopeLabel = "Педагог: " + (teachers.find((t) => t.id === filters.teacherId)?.name || "—");
  }

  const studentIds = new Set(students.map((s) => s.id));
  const payments = all.payments.filter((p) => studentIds.has(p.studentId));
  const seg = segmentPayments(payments);

  // --- выручка ---
  const curRev = revenueBySeg(payments, ranges.cur, seg);
  const prevRev = revenueBySeg(payments, ranges.prev, seg);
  const yoyRev = revenueBySeg(payments, ranges.yoy, seg);
  const todayRev = payments.filter((p) => isPaid(p) && p.date === todayStr).reduce((s, p) => s + p.amount, 0);
  const yRev = payments.filter((p) => isPaid(p) && p.date === yStr).reduce((s, p) => s + p.amount, 0);
  // если в прошлом периоде/году не было ни одного платежа — данных нет (null), а не «-100%»
  const prevHas = prevRev.count > 0;
  const yoyHas = yoyRev.count > 0;

  const avgAll = curRev.count ? Math.round(curRev.all / curRev.count) : null;
  const segCount = (s: Seg) => payments.filter((p) => isPaid(p) && inRange(p.date, ranges.cur) && (seg.get(p.id) || "regular") === s).length;
  const cNew = segCount("new"), cReg = segCount("regular"), cRet = segCount("returning");
  const prevAvg = prevRev.count ? prevRev.all / prevRev.count : null;

  // --- активные абонементы ---
  const activeSubsCount = students.reduce((c, s) => c + (s.subscriptions || []).filter((sub) => sub.status === "active").length, 0);

  // --- заполняемость ---
  const occGroups = groups.filter((g) => (g.capacity ?? 0) > 0);
  const filledTotal = occGroups.reduce((s, g) => s + (g.studentCount ?? 0), 0);
  const capTotal = occGroups.reduce((s, g) => s + (g.capacity ?? 0), 0);
  const occByBranch = branches.map((b) => {
    const bg = occGroups.filter((g) => g.branchId === b.id);
    const f = bg.reduce((s, g) => s + (g.studentCount ?? 0), 0);
    const c = bg.reduce((s, g) => s + (g.capacity ?? 0), 0);
    return { id: b.id, name: b.name || b.city, filled: f, capacity: c, pct: c ? Math.round((f / c) * 100) : null };
  });

  // --- удержание (прокси: доля учеников с активным абонементом) ---
  const activeStud = students.filter(hasActiveSub).length;
  const retentionPct = students.length ? Math.round((activeStud / students.length) * 100) : null;

  // --- должники ---
  const debtorStudents = students.filter((s) => (s.balance ?? 0) < 0 || s.status === "debt");
  const debtAmount = debtorStudents.reduce((s, st) => s + Math.abs(Math.min(0, st.balance ?? 0)), 0);

  // --- продления (активные абонементы, истекающие через N дней) ---
  // «Через N дней» = дата окончания наступает в ближайшие N дней (включительно).
  const withinIds = (days: number) => {
    const limit = iso(addDays(startOfDay(now), days));
    const ids = new Set<string>();
    students.forEach((s) => (s.subscriptions || []).forEach((sub) => {
      if (sub.status === "active" && sub.validUntil && sub.validUntil >= todayStr && sub.validUntil <= limit) ids.add(s.id);
    }));
    return Array.from(ids);
  };
  const exp3 = withinIds(3), exp7 = withinIds(7), exp14 = withinIds(14);
  const renewals = { d3: exp3.length, d7: exp7.length, d14: exp14.length };

  // --- новые ученики ---
  const hasCreated = students.some((s) => s.createdAt);
  const newPeriodStudents = students.filter((s) => s.createdAt && inRange(s.createdAt.slice(0, 10), ranges.cur));
  const newTodayStudents = students.filter((s) => s.createdAt && s.createdAt.slice(0, 10) === todayStr);
  const newPeriod = newPeriodStudents.length;
  const newToday = newTodayStudents.length;

  // --- воронка ---
  const leads = students.filter((s) => s.status === "lead").length;
  const trials = students.filter((s) => s.status === "trial").length;
  const active = students.filter((s) => s.status === "active").length;
  const signed = trials + active; // дошли до пробного и дальше
  const came = active + trials;   // упрощение при отсутствии событий
  const bought = active;
  const month = {
    leads, signed, came: trials + active, bought,
    convSigned: leads ? Math.round((signed / Math.max(leads, signed)) * 100) : null,
    convCame: signed ? Math.round((came / signed) * 100) : null,
    convBought: came ? Math.round((bought / Math.max(came, bought)) * 100) : null
  };

  // --- графики: помесячно за тек. и пред. год ---
  const months: string[] = [];
  for (let m = 0; m < 12; m++) months.push(String(m + 1).padStart(2, "0"));
  const curY = now.getFullYear();
  const sumMonth = (year: number, m: number) => payments.filter((p) => isPaid(p) && p.date && p.date.slice(0, 7) === `${year}-${String(m + 1).padStart(2, "0")}`).reduce((s, p) => s + p.amount, 0);
  const cntMonth = (year: number, m: number) => payments.filter((p) => isPaid(p) && p.date && p.date.slice(0, 7) === `${year}-${String(m + 1).padStart(2, "0")}`).length;
  const anyPrevYear = payments.some((p) => p.date && Number(p.date.slice(0, 4)) === curY - 1);
  const revenueByMonth = months.map((mm, i) => ({ month: mm, cur: sumMonth(curY, i), prev: anyPrevYear ? sumMonth(curY - 1, i) : null }));
  const avgCheckByMonth = months.map((mm, i) => {
    const c = cntMonth(curY, i), pc = cntMonth(curY - 1, i);
    return { month: mm, cur: c ? Math.round(sumMonth(curY, i) / c) : null, prev: anyPrevYear && pc ? Math.round(sumMonth(curY - 1, i) / pc) : null };
  });
  // активные абонементы / удержание помесячно — только из снапшотов
  const snaps = (extras.snapshots || []).filter((s) => s.branchId === (filters.level === "branch" ? filters.branchId : null) || filters.level === "network");
  const subsByMonth = months.map((mm, i) => {
    const key = `${curY}-${mm}-01`;
    const sn = snaps.find((s) => s.periodMonth === key);
    return { month: mm, value: sn ? sn.activeSubscriptions : (i === now.getMonth() ? activeSubsCount : null) };
  });
  const retentionByMonth = months.map((mm, i) => {
    const key = `${curY}-${mm}-01`;
    const sn = snaps.find((s) => s.periodMonth === key);
    return { month: mm, value: sn ? sn.retentionRate : (i === now.getMonth() ? retentionPct : null) };
  });
  // удержание по дням за 30 дней — из посещаемости как доступный прокси
  let retentionByDay: { day: string; value: number | null }[] | null = [];
  for (let d = 29; d >= 0; d--) {
    const day = iso(addDays(startOfDay(now), -d));
    const r: DateRange = { start: day, end: day, label: "" };
    retentionByDay.push({ day: day.slice(5), value: attendanceRate(students, r) });
  }
  if (retentionByDay.every((p) => p.value === null)) retentionByDay = null;

  // --- удержание MoM/YoY из снапшотов ---
  const networkSnaps = (extras.snapshots || []).filter((s) => filters.level === "network" ? s.branchId === null : s.branchId === filters.branchId);
  const snapAt = (back: number) => {
    const d = new Date(curY, now.getMonth() - back, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    return networkSnaps.find((s) => s.periodMonth === key);
  };
  const snPrev = snapAt(1), snYoY = snapAt(12);

  // --- риски ---
  const risks: OwnerDashboardModel["risks"] = [];
  if (renewals.d3 > 0) risks.push({ id: "renew3", severity: "high", title: `${renewals.d3} абонем. истекают за 3 дня`, detail: "Срочно связаться для продления" });
  else if (renewals.d7 > 0) risks.push({ id: "renew7", severity: "mid", title: `${renewals.d7} абонем. истекают за 7 дней`, detail: "Запланировать звонки на продление" });
  if (debtorStudents.length > 0) risks.push({ id: "debt", severity: debtorStudents.length > 5 ? "high" : "mid", title: `${debtorStudents.length} должников`, detail: debtAmount > 0 ? `Сумма задолженности: ${debtAmount.toLocaleString("ru-RU")} ₸` : "Требуется сверка оплат" });
  const overloaded = occGroups.filter((g) => g.capacity && g.studentCount / g.capacity > 0.9);
  const over100 = occGroups.filter((g) => g.capacity && g.studentCount / g.capacity > 1);
  if (overloaded.length > 0) risks.push({ id: "overload", severity: over100.length > 0 ? "high" : "mid", title: `${overloaded.length} групп перегружены (>90%)`, detail: over100.length > 0 ? `${over100.length} групп свыше 100% — нужен набор педагогов` : "Близко к пределу вместимости" });
  const halfEmpty = occGroups.filter((g) => g.capacity && g.studentCount / g.capacity < 0.5);
  if (halfEmpty.length > 0) risks.push({ id: "empty", severity: "low", title: `${halfEmpty.length} полупустых групп (<50%)`, detail: "Свободные мощности — усилить набор" });
  const lastSale = payments.filter(isPaid).map((p) => p.date).sort().slice(-1)[0];
  const noSaleDays = lastSale ? Math.round((startOfDay(now).getTime() - new Date(lastSale).getTime()) / DAY) : null;
  if (payments.some(isPaid) && noSaleDays !== null && noSaleDays >= 14) risks.push({ id: "nosale", severity: "high", title: "Нет новых продаж 14+ дней", detail: `Последняя оплата ${noSaleDays} дн. назад` });
  if (prevHas && curRev.all < prevRev.all * 0.9) risks.push({ id: "revdrop", severity: "high", title: "Падение выручки к пред. периоду", detail: `${delta(curRev.all, prevRev.all).pct}% относительно периода «${ranges.prev.label}»` });
  if (yoyHas && curRev.all < yoyRev.all * 0.9) risks.push({ id: "revdropy", severity: "mid", title: "Падение выручки год-к-году", detail: `${delta(curRev.all, yoyRev.all).pct}% к прошлому году` });
  if (prevAvg !== null && avgAll !== null && avgAll < prevAvg * 0.9) risks.push({ id: "checkdrop", severity: "mid", title: "Падение среднего чека", detail: `${delta(avgAll, prevAvg).pct}% относительно периода «${ranges.prev.label}»` });
  occByBranch.filter((b) => b.pct !== null && b.pct < 50).forEach((b) => risks.push({ id: "lowocc-" + b.id, severity: "low", title: `Низкая заполняемость: ${b.name}`, detail: `${b.pct}% — ниже нормы` }));
  // низкое удержание (ниже нормы) — филиалы и педагоги
  branches.forEach((b) => {
    const bs = students.filter((s) => s.branchId === b.id);
    const r = retentionOf(bs);
    if (r !== null && bs.length >= 3 && r < RETENTION_NORM) risks.push({ id: "lowret-b-" + b.id, severity: "mid", title: `Низкое удержание: ${b.name || b.city}`, detail: `${r}% — ниже нормы ${RETENTION_NORM}%` });
  });
  teachers.forEach((t) => {
    const ts = students.filter((s) => s.teacherId === t.id);
    const r = retentionOf(ts);
    if (r !== null && ts.length >= 3 && r < RETENTION_NORM) risks.push({ id: "lowret-t-" + t.id, severity: "low", title: `Низкое удержание у педагога ${t.name}`, detail: `${r}% — ниже нормы ${RETENTION_NORM}%` });
  });
  // падение посещаемости относительно предыдущего периода
  const attCur = attendanceRate(students, ranges.cur);
  const attPrev = attendanceRate(students, ranges.prev);
  if (attCur !== null && attPrev !== null && attCur < attPrev * 0.9) risks.push({ id: "attdrop", severity: "mid", title: "Падение посещаемости", detail: `${delta(attCur, attPrev).pct}% относительно периода «${ranges.prev.label}»` });

  // --- рейтинги ---
  const revByBranch = (id: string, r?: DateRange) => payments.filter((p) => isPaid(p) && p.branchId === id && (!r || inRange(p.date, r))).reduce((s, p) => s + p.amount, 0);
  const retByBranch = (id: string) => {
    const bs = students.filter((s) => s.branchId === id);
    return bs.length ? Math.round((bs.filter(hasActiveSub).length / bs.length) * 100) : null;
  };
  const avgByBranch = (id: string) => {
    const ps = payments.filter((p) => isPaid(p) && p.branchId === id && inRange(p.date, ranges.cur));
    return ps.length ? Math.round(ps.reduce((s, p) => s + p.amount, 0) / ps.length) : null;
  };
  const revByStudents = (ids: Set<string>, r?: DateRange) => payments.filter((p) => isPaid(p) && ids.has(p.studentId) && (!r || inRange(p.date, r))).reduce((s, p) => s + p.amount, 0);

  const branchBase = branches.map((b) => ({
    id: b.id, name: b.name || b.city,
    revenue: revByBranch(b.id, ranges.cur),
    retention: retByBranch(b.id),
    avgCheck: avgByBranch(b.id),
    growthPct: delta(revByBranch(b.id, ranges.cur), revByBranch(b.id, ranges.prev) || null).pct
  }));
  const branchRatings = {
    byRevenue: topBy(branchBase, (x) => x.revenue),
    byRetention: topBy(branchBase, (x) => x.retention),
    byAvgCheck: topBy(branchBase, (x) => x.avgCheck),
    byGrowth: topBy(branchBase, (x) => x.growthPct)
  };

  const teacherBase = teachers.map((t) => {
    const ts = students.filter((s) => s.teacherId === t.id);
    const ids = new Set(ts.map((s) => s.id));
    return {
      id: t.id, name: t.name, students: ts.length,
      retention: retentionOf(ts),
      revenue: revByStudents(ids, ranges.cur),
      growthPct: delta(revByStudents(ids, ranges.cur), revByStudents(ids, ranges.prev) || null).pct
    };
  }).filter((t) => t.students > 0);
  const teacherRatings = {
    byStudents: topBy(teacherBase, (x) => x.students),
    byRetention: topBy(teacherBase, (x) => x.retention),
    byRevenue: topBy(teacherBase, (x) => x.revenue),
    byGrowth: topBy(teacherBase, (x) => x.growthPct)
  };

  const groupBase = groups.map((g) => {
    const gs = students.filter((s) => (s.groupIds || []).includes(g.id));
    const ids = new Set(gs.map((s) => s.id));
    return {
      id: g.id, name: g.name,
      revenue: revByStudents(ids, ranges.cur),
      occupancy: g.capacity ? Math.round((g.studentCount / g.capacity) * 100) : null,
      retention: retentionOf(gs)
    };
  });
  const groupRatings = {
    byRevenue: topBy(groupBase, (x) => x.revenue),
    byOccupancy: topBy(groupBase, (x) => x.occupancy),
    byRetention: topBy(groupBase, (x) => x.retention)
  };

  // --- AI-блоки (правила) ---
  const momRevPct = prevHas ? delta(curRev.all, prevRev.all).pct : null;
  const brief: string[] = [];
  if (momRevPct !== null) brief.push(`Выручка ${momRevPct >= 0 ? "выросла" : "снизилась"} на ${Math.abs(momRevPct)}% относительно периода «${ranges.prev.label}» (${curRev.all.toLocaleString("ru-RU")} ₸).`);
  else brief.push(`Выручка периода: ${curRev.all.toLocaleString("ru-RU")} ₸ (нет данных за прошлый период для сравнения).`);
  if (renewals.d7 > 0) brief.push(`${renewals.d7} учеников требуют продления в ближайшие 7 дней.`);
  if (over100.length > 0) brief.push(`${over100.length} групп перегружены (>100%).`);
  else if (overloaded.length > 0) brief.push(`${overloaded.length} групп близки к пределу заполняемости.`);
  const worstBranch = occByBranch.filter((b) => b.pct !== null).sort((a, b) => (a.pct! - b.pct!))[0];
  if (worstBranch && worstBranch.pct !== null && worstBranch.pct < 60) brief.push(`В филиале ${worstBranch.name} низкая заполняемость (${worstBranch.pct}%).`);
  brief.push(`Сегодня: ${newToday > 0 ? newToday + " новых учеников" : "новых учеников нет"}, продажи на ${todayRev.toLocaleString("ru-RU")} ₸.`);

  const attention: string[] = risks.filter((r) => r.severity !== "low").map((r) => `${r.title} — ${r.detail}`);
  if (attention.length === 0) attention.push("Острых проблем нет — ключевые показатели в норме.");

  const growth: string[] = [];
  halfEmpty.forEach((g) => growth.push(`Свободные места в группе «${g.name}» (${g.capacity ? Math.round(g.studentCount / g.capacity * 100) : 0}%) — усилить набор.`));
  const topTeacher = teacherRatings.byRetention[0];
  if (topTeacher && topTeacher.retention !== null) growth.push(`Лучшее удержание у педагога ${topTeacher.name} (${topTeacher.retention}%) — масштабировать подход.`);
  const topBranch = branchRatings.byRevenue[0];
  if (topBranch) growth.push(`Филиал ${topBranch.name} — лидер по выручке (${topBranch.revenue.toLocaleString("ru-RU")} ₸).`);
  if (over100.length > 0) growth.push(`Перегруженные группы (${over100.length}) — кандидаты на открытие параллельных групп / набор педагогов.`);
  if (growth.length === 0) growth.push("Резервы роста: расширять успешные группы и удерживать заполняемость.");

  // future enrollments
  // Прокси для «записей на будущее»: лиды + записанные на пробный (будущие записи).
  const prospects = students.filter((s) => s.status === "lead" || s.status === "trial");
  const futureEnrollments = (() => {
    if (extras.futureEnrollments) {
      const e = extras.futureEnrollments;
      return {
        total: e.total,
        byBranch: Object.entries(e.byBranch).map(([id, n]) => ({ name: branches.find((b) => b.id === id)?.name || id, n })),
        byAge: Object.entries(e.byAge).map(([label, n]) => ({ label, n })),
        isProxy: false
      };
    }
    const byBranch = branches.map((b) => ({ name: b.name || b.city, n: prospects.filter((s) => s.branchId === b.id).length })).filter((x) => x.n > 0);
    const ageBucket = (a: number) => a <= 6 ? "до 6" : a <= 9 ? "7–9" : a <= 12 ? "10–12" : a <= 15 ? "13–15" : "16+";
    const ageMap = new Map<string, number>();
    prospects.forEach((s) => ageMap.set(ageBucket(s.age || 12), (ageMap.get(ageBucket(s.age || 12)) || 0) + 1));
    return { total: prospects.length, byBranch, byAge: Array.from(ageMap, ([label, n]) => ({ label, n })), isProxy: true };
  })();

  // ---------- Ежедневный отчёт руководителя ----------
  // Доп. метрики, которых не было в движке: не оплатившие текущий/прошлый месяц,
  // перегруженные / низкозаполненные группы, филиалы с падением удержания.
  const paymentsTodayCount = payments.filter((p) => isPaid(p) && p.date === todayStr).length;

  // «Зачисленные» ученики, от которых ждём оплату (исключаем лидов/пробных/паузу/ушедших).
  const isEnrolled = (s: Student) => s.status !== "lead" && s.status !== "trial" && s.status !== "paused" && s.status !== "left" && s.status !== "archived";
  const curMonthKey = `${curY}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(curY, now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const paidInMonth = (studentId: string, mk: string) =>
    payments.some((p) => isPaid(p) && p.studentId === studentId && monthKey(p.date) === mk);
  // Считаем только при наличии платёжной истории, иначе метрика шумит (нет данных).
  const hasPaymentHistory = payments.some(isPaid);
  const unpaidCurrent = hasPaymentHistory ? students.filter((s) => isEnrolled(s) && !paidInMonth(s.id, curMonthKey)) : [];
  const unpaidPrev = hasPaymentHistory ? students.filter((s) => isEnrolled(s) && !paidInMonth(s.id, prevMonthKey)) : [];

  // Перегруженные (>90%) и низкозаполненные (<50%) группы + их ученики.
  const studentsOfGroups = (gids: Set<string>) =>
    students.filter((s) => (s.groupIds || []).some((id) => gids.has(id))).map((s) => s.id);
  const overloadedGroupIds = overloaded.map((g) => g.id);
  const lowFillGroupIds = halfEmpty.map((g) => g.id);

  // Филиалы с падением удержания: если есть снапшот прошлого месяца по филиалу —
  // сравниваем; иначе fallback на «удержание ниже нормы».
  const branchSnap = (bid: string) => (extras.snapshots || []).find((sn) => sn.branchId === bid && sn.periodMonth === `${prevMonthKey}-01`);
  const retentionDropBranchList = branches.filter((b) => {
    const cur = retByBranch(b.id);
    if (cur === null) return false;
    const sn = branchSnap(b.id);
    if (sn) return cur < sn.retentionRate * 0.95; // падение ≥5%
    const bs = students.filter((s) => s.branchId === b.id);
    return bs.length >= 3 && cur < RETENTION_NORM; // нет истории — ниже нормы
  });
  const retentionDropBranchIds = retentionDropBranchList.map((b) => b.id);
  const studentsOfBranches = (bids: Set<string>) => students.filter((s) => bids.has(s.branchId)).map((s) => s.id);

  const dailyRisks: DailyRiskItem[] = [];
  const pushRisk = (id: string, severity: "high" | "mid" | "low", title: string, detail: string, kind: DailyRiskItem["kind"], studentIds: string[], label: string) => {
    if (studentIds.length === 0) return;
    dailyRisks.push({ id, severity, title, detail, count: studentIds.length, kind, studentIds, label });
  };
  pushRisk("d-exp3", "high", `Абонементы истекают через 3 дня — ${exp3.length}`, "Срочно связаться для продления", "students", exp3, "Истекают через 3 дня");
  pushRisk("d-exp7", "mid", `Абонементы истекают через 7 дней — ${exp7.length}`, "Запланировать продление", "students", exp7, "Истекают через 7 дней");
  pushRisk("d-exp14", "low", `Абонементы истекают через 14 дней — ${exp14.length}`, "Взять на контроль", "students", exp14, "Истекают через 14 дней");
  pushRisk("d-debt", debtorStudents.length > 5 ? "high" : "mid", `Должники — ${debtorStudents.length}`, debtAmount > 0 ? `Сумма: ${debtAmount.toLocaleString("ru-RU")} ₸` : "Сверка оплат", "students", debtorStudents.map((s) => s.id), "Должники");
  pushRisk("d-unpaidcur", "mid", `Не оплатили текущий месяц — ${unpaidCurrent.length}`, "Нет оплаты за текущий месяц", "students", unpaidCurrent.map((s) => s.id), "Не оплатили текущий месяц");
  pushRisk("d-unpaidprev", "high", `Не оплатили прошлый месяц — ${unpaidPrev.length}`, "Задолженность за прошлый месяц", "students", unpaidPrev.map((s) => s.id), "Не оплатили прошлый месяц");
  pushRisk("d-overload", over100.length > 0 ? "high" : "mid", `Перегруженные группы — ${overloaded.length}`, over100.length > 0 ? `${over100.length} групп свыше 100%` : "Близко к пределу", "groups", studentsOfGroups(new Set(overloadedGroupIds)), "Ученики перегруженных групп");
  pushRisk("d-lowfill", "low", `Группы с низкой заполненностью — ${halfEmpty.length}`, "Свободные мощности — усилить набор", "groups", studentsOfGroups(new Set(lowFillGroupIds)), "Ученики низкозаполненных групп");
  pushRisk("d-retdrop", "mid", `Филиалы с падением удержания — ${retentionDropBranchList.length}`, "Удержание ниже нормы/падает", "branches", studentsOfBranches(new Set(retentionDropBranchIds)), "Ученики филиалов с падением удержания");

  // Краткий AI-вывод (правила).
  const highCount = dailyRisks.filter((r) => r.severity === "high").length;
  const stateWord = highCount === 0 ? "в стабильном состоянии" : highCount <= 2 ? "требует внимания" : "в напряжённом состоянии";
  const attnNames: string[] = [];
  retentionDropBranchList.slice(0, 2).forEach((b) => attnNames.push(`филиал ${b.name || b.city}`));
  overloaded.slice(0, 2).forEach((g) => attnNames.push(`группа «${g.name}»`));
  if (attnNames.length === 0) halfEmpty.slice(0, 1).forEach((g) => attnNames.push(`группа «${g.name}»`));
  const summaryParts = [
    `Сегодня студия ${stateWord}.`,
    `${prospects.length} ${plural(prospects.length, "новая запись", "новые записи", "новых записей")}, ${paymentsTodayCount} ${plural(paymentsTodayCount, "новая оплата", "новые оплаты", "новых оплат")}, ${debtorStudents.length} ${plural(debtorStudents.length, "должник", "должника", "должников")}.`,
    `Через 3 дня ${plural(exp3.length, "истекает", "истекают", "истекают")} ${exp3.length} ${plural(exp3.length, "абонемент", "абонемента", "абонементов")}.`,
  ];
  if (attnNames.length > 0) summaryParts.push(`Требуют внимания: ${attnNames.slice(0, 3).join(", ")}.`);
  const dailySummary = summaryParts.join(" ");

  const dailyReport: DailyReport = {
    date: todayStr,
    revenueToday: todayRev,
    paymentsToday: paymentsTodayCount,
    activeSubs: activeSubsCount,
    debtors: { count: debtorStudents.length, ids: debtorStudents.map((s) => s.id) },
    newStudents: { count: newPeriod, ids: newPeriodStudents.map((s) => s.id) },
    futureEnrollments: { count: prospects.length, ids: prospects.map((s) => s.id) },
    expiring3d: { count: exp3.length, ids: exp3 },
    expiring7d: { count: exp7.length, ids: exp7 },
    expiring14d: { count: exp14.length, ids: exp14 },
    unpaidCurrentMonth: { count: unpaidCurrent.length, ids: unpaidCurrent.map((s) => s.id) },
    unpaidPrevMonth: { count: unpaidPrev.length, ids: unpaidPrev.map((s) => s.id) },
    overloadedGroups: { count: overloaded.length, groupIds: overloadedGroupIds, studentIds: studentsOfGroups(new Set(overloadedGroupIds)) },
    lowFillGroups: { count: halfEmpty.length, groupIds: lowFillGroupIds, studentIds: studentsOfGroups(new Set(lowFillGroupIds)) },
    retentionDropBranches: { count: retentionDropBranchList.length, branchIds: retentionDropBranchIds, studentIds: studentsOfBranches(new Set(retentionDropBranchIds)) },
    risks: dailyRisks,
    summary: dailySummary,
  };

  return {
    filters, ranges, dailyReport,
    scope: { students: students.length, groups: groups.length, branches: branches.length, teachers: teachers.length, label: scopeLabel },
    revenue: {
      total: curRev.all, today: todayRev, yesterday: yRev,
      new: curRev.new, regular: curRev.regular, returning: curRev.returning,
      momPct: momRevPct, yoyPct: yoyHas ? delta(curRev.all, yoyRev.all).pct : null
    },
    avgCheck: {
      all: avgAll,
      new: cNew ? Math.round(curRev.new / cNew) : null,
      regular: cReg ? Math.round(curRev.regular / cReg) : null,
      returning: cRet ? Math.round(curRev.returning / cRet) : null,
      momPct: prevAvg !== null && avgAll !== null ? delta(avgAll, prevAvg).pct : null
    },
    activeSubs: {
      count: activeSubsCount,
      momPct: snPrev ? delta(activeSubsCount, snPrev.activeSubscriptions).pct : null,
      yoyPct: snYoY ? delta(activeSubsCount, snYoY.activeSubscriptions).pct : null
    },
    occupancy: { pct: capTotal ? Math.round((filledTotal / capTotal) * 100) : null, filled: filledTotal, capacity: capTotal, byBranch: occByBranch },
    retention: {
      pct: retentionPct, activeStudents: activeStud, totalStudents: students.length,
      momPct: snPrev ? delta(retentionPct ?? 0, snPrev.retentionRate).pct : null,
      yoyPct: snYoY ? delta(retentionPct ?? 0, snYoY.retentionRate).pct : null
    },
    debtors: { total: debtorStudents.length, debtAmount, aging: extras.debtorAging ?? null },
    futureEnrollments,
    newStudents: { period: newPeriod, today: newToday, hasData: hasCreated },
    renewals,
    funnel: { today: extras.funnelToday ?? null, yesterday: extras.funnelYesterday ?? null, month },
    charts: { revenueByMonth, avgCheckByMonth, subsByMonth, retentionByMonth, retentionByDay },
    risks, attention, growth, brief,
    ratings: { branches: branchRatings, teachers: teacherRatings, groups: groupRatings }
  };
}
