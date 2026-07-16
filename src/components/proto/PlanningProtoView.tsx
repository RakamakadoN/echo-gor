import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Branch } from "../../types";
import "./planning-proto.css";

/* ============================================================
   ПЛАНИРОВАНИЕ (БДР) — реальные данные через /api/mvp/planning/*
   Вёрстка/CSS/интерактив сохранены. Меняется только источник данных.
   Разделы без источника показывают заглушку «Данных пока нет».
   ============================================================ */
const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

/* ---------- заглушка ---------- */
const Empty = ({ children }: { children?: any }) => (
  <div className="hint" style={{ padding: 24, textAlign: "center", color: "var(--text2)", fontSize: 13 }}>{children || "Данных пока нет"}</div>
);

/* ---------- типы данных сервера ---------- */
type GroupRow = { name: string; teacher: string; check: number; permanent: number; new: number; total: number; free: number; factPrev: number; recommended: number; planned: number };
type RoomRow = { name: string; groupsCount: number; studentsCount: number; total: number; groups: GroupRow[] };
type ExpenseRow = { key?: string; label: string; planned: number; mode: "auto" | "manual"; children?: { label: string; planned: number }[] };
type Overview = {
  period: string; branchId: string | null; mode: string; source: string;
  basis: { prevMonth: number; prevYear: number; avg6: number };
  plan: { revenueLines: any[]; expenseLines: any[]; plannedRevenue: number; plannedExpense: number; plannedProfit: number; margin: number };
  fact: { revenue: number; expense: number; profit: number; margin: number; donePct: number; incomeByDirection: any[] };
  levels: { level: string; plan: number; fact: number; deviation: number; done: number }[];
  funnel: { neededSales: number; trials: number; signups: number; leads: number };
  motivation: { level: string; threshold: number; bonus: string }[];
  daily: { id?: string; date: string; revenue: number; trials: number; sales: number; comment: string; author: string }[];
  dailyAuto?: { date: string; revenue: number; sales: number }[];
  lifecycle?: {
    status: "draft" | "pending" | "active" | "closed";
    version: number;
    submittedAt?: string | null; submittedBy?: string | null;
    approvedAt?: string | null; approvedBy?: string | null;
    revisionReason?: string | null;
    history?: { version: number; action: string; by: string; at: string; reason?: string; plannedRevenue?: number; plannedExpense?: number }[];
    closedAt?: string; closedBy?: string;
    bonus?: { donePct: number; level: string | null; bonus: string | null };
  };
  detailed: {
    branchName: string; branches: { id: string; name: string }[]; groupsCount: number; studentsCount: number; fillPct: number;
    revenue: number; expense: number; profit: number; margin: number;
    byType: { group: number; mini: number; individual: number };
    byAudience: { permanent: number; new: number };
    rooms: RoomRow[]; expenses: ExpenseRow[];
    funnel: { neededSales: number; trialConv: number; trials: number; recordConv: number; records: number; leadConv: number; leads: number };
  };
};

const EMPTY_OVERVIEW: Overview = {
  period: "", branchId: null, mode: "", source: "prev_month",
  basis: { prevMonth: 0, prevYear: 0, avg6: 0 },
  plan: { revenueLines: [], expenseLines: [], plannedRevenue: 0, plannedExpense: 0, plannedProfit: 0, margin: 0 },
  fact: { revenue: 0, expense: 0, profit: 0, margin: 0, donePct: 0, incomeByDirection: [] },
  levels: [], funnel: { neededSales: 0, trials: 0, signups: 0, leads: 0 }, motivation: [], daily: [],
  detailed: {
    branchName: "", branches: [], groupsCount: 0, studentsCount: 0, fillPct: 0,
    revenue: 0, expense: 0, profit: 0, margin: 0,
    byType: { group: 0, mini: 0, individual: 0 }, byAudience: { permanent: 0, new: 0 },
    rooms: [], expenses: [], funnel: { neededSales: 0, trialConv: 0.5, trials: 0, recordConv: 0.7, records: 0, leadConv: 0.55, leads: 0 },
  },
};

/* ---------- локальные (редактируемые) формы, seed из detailed ---------- */
type LocalGroup = { id: string; zone: string; name: string; teacher: string; chek: number; post: number; new: number; max: number; factPrev: number; recommended: number; manualPlan: number };
type LocalExp = { name: string; val?: number; mode: "auto" | "manual"; items?: { name: string; val: number }[] };

function roomsToGroups(rooms: RoomRow[]): LocalGroup[] {
  const out: LocalGroup[] = [];
  rooms.forEach((r) => (r.groups || []).forEach((g, i) => out.push({
    id: `${r.name}::${i}::${g.name}`,
    zone: r.name,
    name: g.name,
    teacher: g.teacher && g.teacher !== "—" ? g.teacher : "",
    chek: g.check, post: g.permanent, new: g.new,
    max: g.total + g.free,
    factPrev: g.factPrev, recommended: g.recommended, manualPlan: 0,
  })));
  return out;
}
function expsToLocal(exps: ExpenseRow[]): LocalExp[] {
  return (exps || []).map((e) => e.children && e.children.length
    ? { name: e.label, mode: e.mode, items: e.children.map((c) => ({ name: c.label, val: c.planned })) }
    : { name: e.label, val: e.planned, mode: e.mode });
}

/* ============================================================
   Помощники
   ============================================================ */
function fmt(n: number) { return Math.round(n || 0).toLocaleString("ru-RU"); }
function parseNum(s: any) {
  const n = String(s).replace(/[\s  ]/g, "").replace("−", "-").replace(/[^0-9.-]/g, "");
  const v = parseFloat(n); return isNaN(v) ? 0 : v;
}
function loadCategory(g: LocalGroup): string {
  if (/индивид/i.test(g.name)) return "individual";
  if (/мини/i.test(g.name)) return "mini";
  return "group";
}
const gStudents = (g: LocalGroup) => g.post + g.new;
const gSum = (g: LocalGroup) => g.chek * gStudents(g);
const gPlan = (g: LocalGroup) => (g.manualPlan > 0 ? g.manualPlan : gSum(g));
const gFree = (g: LocalGroup) => Math.max(0, g.max - gStudents(g));
const gRecommend = (g: LocalGroup) => (g.recommended > 0 ? g.recommended : Math.round(g.factPrev * 1.05));
function expVal(e: LocalExp) {
  if (e.items && e.items.length) return e.items.reduce((s, it) => s + (+it.val || 0), 0);
  return +(e.val || 0);
}

const STATUS_RU: Record<string, string> = { draft: "черновик", pending: "на утверждении", active: "утверждён", closed: "месяц закрыт" };
const HIST_RU: Record<string, string> = {
  created: "План создан",
  edited: "Черновик изменён",
  submitted: "Отправлен на утверждение",
  approved: "Утверждён владельцем",
  revision_submitted: "Корректировка отправлена владельцу",
  revised_approved: "Корректировка утверждена",
  closed: "Месяц закрыт (снапшот)",
};

const TABS = [
  { id: "plan", label: "План БДР" },
  { id: "fact", label: "Факт БДР" },
  { id: "pf", label: "План / Факт" },
  { id: "daily", label: "Ежедневный отчёт" },
  { id: "ai", label: "AI Аналитика" },
  { id: "mot", label: "Настройки мотивации" },
];

/* ============================================================
   Компонент
   ============================================================ */
export function PlanningProtoView({ branches = [], role = "owner" }: { branches?: Branch[]; role?: "owner" | "branch_manager" }) {
  const now = new Date();
  // Заголовки с реальной ролью пользователя: сервер пускает owner и branch_manager,
  // подмена «все ходят как owner» больше не нужна.
  const H = useMemo(() => ({ "x-demo-role": role } as const), [role]);
  const HJ = useMemo(() => ({ "Content-Type": "application/json", "x-demo-role": role } as const), [role]);
  const canEditMotivation = role === "owner";
  const [tab, setTab] = useState("plan");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [branchId, setBranchId] = useState("all");

  const [ov, setOv] = useState<Overview>(EMPTY_OVERVIEW);
  const [loaded, setLoaded] = useState(false);

  /* локальные редактируемые формы */
  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [expenses, setExpenses] = useState<LocalExp[]>([]);
  const [motRows, setMotRows] = useState<{ level: string; threshold: number; bonus: string }[]>([]);

  const [collapsed, setCollapsed] = useState(false);
  const [zoneCollapsed, setZoneCollapsed] = useState<Record<string, boolean>>({});
  const [summaryDetail, setSummaryDetail] = useState<string | null>(null);
  const [expExpanded, setExpExpanded] = useState<Record<number, boolean>>({ 2: true, 3: true });
  const [funnelNeed, setFunnelNeed] = useState("20");
  const [tasksDone, setTasksDone] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [motStep, setMotStep] = useState(0);
  const [recoMsg, setRecoMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ежедневный отчёт — форма добавления */
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [dDate, setDDate] = useState(todayStr);
  const [dRevenue, setDRevenue] = useState("");
  const [dTrials, setDTrials] = useState("");
  const [dSales, setDSales] = useState("");
  const [dComment, setDComment] = useState("");

  const period = `${year}-${String(month + 1).padStart(2, "0")}`;

  /* ---------- загрузка ---------- */
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/mvp/planning/overview?period=${period}&branch=${branchId}`, { headers: H });
      if (!res.ok) { setLoaded(true); return; }
      const data: Overview = await res.json();
      setOv({ ...EMPTY_OVERVIEW, ...data, detailed: { ...EMPTY_OVERVIEW.detailed, ...(data.detailed || {}) } });
      setGroups(roomsToGroups(data.detailed?.rooms || []));
      setExpenses(expsToLocal(data.detailed?.expenses || []));
      setMotRows((data.motivation || []).map((m) => ({ ...m })));
      setMotStep(0);
      setFunnelNeed(String(data.detailed?.funnel?.neededSales || data.funnel?.neededSales || 20));
      setCollapsed(false);
      setLoaded(true);
    } catch {
      /* сервер недоступен — оставляем пустые состояния, не падаем */
      setLoaded(true);
    }
  }, [period, branchId]);
  useEffect(() => { load(); }, [load]);

  /* конверсии воронки — из detailed.funnel */
  const CONV = {
    visit2buy: ov.detailed.funnel.trialConv || 0.5,
    signup2visit: ov.detailed.funnel.recordConv || 0.7,
    lead2signup: ov.detailed.funnel.leadConv || 0.55,
    retention: 0.85,
  };

  /* ---------- производные (из локальных редактируемых форм = реальный detailed) ---------- */
  const revenueTotal = useMemo(() => groups.reduce((s, g) => s + gPlan(g), 0), [groups]);
  const expenseTotal = useMemo(() => expenses.reduce((s, e) => s + expVal(e), 0), [expenses]);
  const planProfit = revenueTotal - expenseTotal;
  const planMargin = revenueTotal > 0 ? Math.round((planProfit / revenueTotal) * 100) : 0;

  const studentsTotal = groups.reduce((s, g) => s + gStudents(g), 0);
  const freeTotal = groups.reduce((s, g) => s + gFree(g), 0);
  const capacityTotal = groups.reduce((s, g) => s + g.max, 0);
  const avgChek = groups.length ? Math.round(groups.reduce((s, g) => s + g.chek, 0) / groups.length) : 0;
  const fillRate = capacityTotal ? Math.round((studentsTotal / capacityTotal) * 100) : 0;

  const curPeriodLabel = `${MONTHS_RU[month]} ${year}`;
  const zones = useMemo(() => {
    const z: string[] = [];
    groups.forEach((g) => { if (z.indexOf(g.zone) < 0) z.push(g.zone); });
    return z;
  }, [groups]);

  const branchOptions = useMemo(() => [{ id: "all", name: "Вся сеть" }, ...branches.map((b) => ({ id: b.id, name: b.name }))], [branches]);
  const scopeName = branchId === "all" ? (ov.detailed.branchName ? `Вся сеть` : "Вся сеть") : (branches.find((b) => b.id === branchId)?.name || ov.detailed.branchName || "Филиал");

  /* ---------- обновления групп ---------- */
  function setGroupField(id: string, field: keyof LocalGroup, raw: string) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, [field]: parseNum(raw) } : g)));
  }
  function delGroup(id: string) { setGroups((gs) => gs.filter((g) => g.id !== id)); }
  function calcRecommendations() {
    setGroups((gs) => gs.map((g) => ({ ...g, manualPlan: gRecommend(g) })));
    const needProlong = Math.round(studentsTotal * (1 - CONV.retention));
    const needNew = Math.round(freeTotal * 0.4);
    const needPU = CONV.visit2buy > 0 ? Math.round(needNew / CONV.visit2buy) : 0;
    setRecoMsg(
      `По скоупу «${scopeName}» рекомендуется план ${fmt(revenueTotal)} ₸. ` +
      `Основание: заполненность ${fillRate}%, свободно ${freeTotal} мест, средний чек ${fmt(avgChek)} ₸. ` +
      `Для выполнения: ~${needProlong} продлений, ~${needNew} новых абонементов, ~${needPU} пробных уроков.`
    );
  }

  /* ---------- обновления расходов ---------- */
  function setExpValFn(idx: number, raw: string) { setExpenses((es) => es.map((e, i) => (i === idx ? { ...e, val: parseNum(raw) } : e))); }
  function setExpItemVal(idx: number, j: number, raw: string) {
    setExpenses((es) => es.map((e, i) => (i === idx ? { ...e, items: (e.items || []).map((it, k) => (k === j ? { ...it, val: parseNum(raw) } : it)) } : e)));
  }
  function toggleExpMode(idx: number) { setExpenses((es) => es.map((e, i) => (i === idx ? { ...e, mode: e.mode === "auto" ? "manual" : "auto" } : e))); }
  function delExp(idx: number) { setExpenses((es) => es.filter((_, i) => i !== idx)); }
  function toggleExpExpand(idx: number) { setExpExpanded((m) => ({ ...m, [idx]: !m[idx] })); }

  /* ---------- сохранение бюджета (POST budget) ---------- */
  const saveBudget = useCallback(async (source?: string) => {
    setSaving(true);
    try {
      const body = {
        period,
        branchId: branchId === "all" ? null : branchId,
        source: source || ov.source,
        revenueLines: groups.map((g) => ({ direction: g.name, planned: gPlan(g), mode: g.manualPlan > 0 ? "manual" : "auto" })),
        expenseLines: expenses.map((e) => ({ category: e.name, planned: expVal(e), mode: e.mode })),
      };
      const res = await fetch("/api/mvp/planning/budget", { method: "POST", headers: HJ, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setOv((prev) => ({ ...prev, ...data, detailed: prev.detailed }));
      else if (data?.error) setRecoMsg(`⚠ ${data.error}`);
    } catch { /* игнорируем сетевую ошибку, локальные формы сохранены */ }
    finally { setSaving(false); }
  }, [HJ, period, branchId, ov.source, groups, expenses]);

  function pickSource(key: string) { saveBudget(key); }

  /* ---------- жизненный цикл плана ---------- */
  const lc = ov.lifecycle;
  const lcStatus = lc?.status || "draft";
  const lifecycleCall = useCallback(async (action: "submit" | "approve" | "close") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/mvp/planning/${action}`, {
        method: "POST", headers: HJ,
        body: JSON.stringify({ period, branchId: branchId === "all" ? null : branchId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setOv((prev) => ({ ...prev, ...data, detailed: prev.detailed }));
      else if (data?.error) setRecoMsg(`⚠ ${data.error}`);
    } catch { /* сеть недоступна */ }
    finally { setSaving(false); }
  }, [HJ, period, branchId]);

  const requestRevision = useCallback(async () => {
    const reason = window.prompt("Причина корректировки (обязательно, сохранится в истории плана):", "");
    if (!reason || reason.trim().length < 5) return;
    setSaving(true);
    try {
      const body: any = { period, branchId: branchId === "all" ? null : branchId, reason: reason.trim() };
      if (groups.length) {
        body.revenueLines = groups.map((g) => ({ direction: g.name, planned: gPlan(g), mode: g.manualPlan > 0 ? "manual" : "auto" }));
        body.expenseLines = expenses.map((e) => ({ category: e.name, planned: expVal(e), mode: e.mode }));
      }
      const res = await fetch("/api/mvp/planning/revise", { method: "POST", headers: HJ, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setOv((prev) => ({ ...prev, ...data, detailed: prev.detailed }));
      else if (data?.error) setRecoMsg(`⚠ ${data.error}`);
    } catch { /* сеть недоступна */ }
    finally { setSaving(false); }
  }, [HJ, period, branchId, groups, expenses]);

  /* ---------- воронка ---------- */
  const needNew = parseNum(funnelNeed || 20);
  const needVisits = CONV.visit2buy > 0 ? Math.ceil(needNew / CONV.visit2buy) : 0;
  const needSignups = CONV.signup2visit > 0 ? Math.ceil(needVisits / CONV.signup2visit) : 0;
  const needLeads = CONV.lead2signup > 0 ? Math.ceil(needSignups / CONV.lead2signup) : 0;

  /* ---------- ежедневный отчёт ---------- */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const passed = (year === now.getFullYear() && month === now.getMonth()) ? now.getDate() : daysInMonth;
  const daysLeft = Math.max(1, daysInMonth - passed);
  const dailyFact = (ov.daily || []).reduce((s, d) => s + (+d.revenue || 0), 0);
  const dailyLeft = Math.max(0, revenueTotal - dailyFact);
  const perDay = Math.round(dailyLeft / daysLeft);
  const dailyPct = revenueTotal > 0 ? Math.round((dailyFact / revenueTotal) * 100) : 0;
  const forecast = passed > 0 && revenueTotal > 0 ? Math.min(150, Math.round((dailyFact / passed) * daysInMonth / revenueTotal * 100)) : 0;

  /* достигнутый уровень мотивации по факту выполнения (реальные пороги) */
  const reachedTier = useMemo(() => {
    let best: { level: string; threshold: number; bonus: string } | null = null;
    (ov.motivation || []).forEach((m) => { if (dailyPct >= m.threshold && (!best || m.threshold > best.threshold)) best = m; });
    return best;
  }, [ov.motivation, dailyPct]);

  const R = 52, C = 2 * Math.PI * R, ringPct = Math.min(100, dailyPct), dash = (C * ringPct) / 100;
  const ringColor = dailyPct >= 100 ? "#3a9d5d" : dailyPct >= 80 ? "#d4b46a" : dailyPct >= 50 ? "#e0a458" : "#c0654a";
  function coachMessage(pct: number) {
    if (pct >= 100) return <>Огонь! План закрыт на <b>{pct}%</b>. Держи планку — каждый день выше нормы укрепляет твой стрик.</>;
    if (pct >= 90) return <>Ты почти у цели — <b>{pct}%</b>. Осталось совсем чуть-чуть. Закрой задачи ниже и выйдешь на 100%.</>;
    if (pct >= 70) return <>Хороший темп, <b>{pct}%</b>. Прогноз {forecast}%. Сфокусируйся на продлениях и пробных.</>;
    if (pct >= 50) return <>Ты на половине пути — <b>{pct}%</b>. Не сбавляй. Выполни задачи дня, и прогноз пойдёт вверх.</>;
    return <>Старт положен — <b>{pct}%</b>. Главное сейчас — ритм. Закрывай по 2-3 задачи в день.</>;
  }
  const dailyTasks = useMemo(() => {
    const needProlong = Math.max(1, Math.round(studentsTotal * (1 - CONV.retention) / daysLeft * 3));
    const needPU = Math.max(1, Math.round(freeTotal * 0.4 / daysLeft * 2));
    return [
      { id: "prolong", text: `Продлить ${needProlong} учеников с истекающими абонементами`, pts: 30 },
      { id: "pu", text: `Провести ${needPU} пробных урока по записанным лидам`, pts: 25 },
      { id: "sale", text: "Закрыть 2 продажи после пробного", pts: 20 },
      { id: "fill", text: `Дозаполнить группы со свободными местами (${freeTotal} свободно)`, pts: 15 },
      { id: "call", text: "Обзвонить должников и вернуть 1-2 ушедших", pts: 10 },
    ];
  }, [studentsTotal, freeTotal, daysLeft]);
  const doneCount = dailyTasks.filter((t) => tasksDone[t.id]).length;
  function toggleTask(t: any) {
    setTasksDone((m) => {
      const nm = { ...m };
      if (nm[t.id]) { delete nm[t.id]; setPoints((p) => Math.max(0, p - t.pts)); }
      else {
        nm[t.id] = true; setPoints((p) => p + t.pts);
        if (dailyTasks.every((x) => nm[x.id])) { setStreak((s) => s + 1); setPoints((p) => p + 50); }
      }
      return nm;
    });
  }
  async function addDaily() {
    const rev = parseNum(dRevenue);
    if (!dDate || rev <= 0) return;
    try {
      const res = await fetch("/api/mvp/planning/daily", {
        method: "POST", headers: HJ,
        // Автора проставляет сервер из сессии; отчёт привязан к выбранному филиалу.
        body: JSON.stringify({ date: dDate, revenue: rev, trials: parseNum(dTrials), sales: parseNum(dSales), comment: dComment.trim(), branchId: branchId === "all" ? null : branchId }),
      });
      if (res.ok) {
        const r = await res.json();
        setOv((prev) => ({ ...prev, daily: r.daily || prev.daily }));
        setDRevenue(""); setDTrials(""); setDSales(""); setDComment("");
      }
    } catch { /* сеть недоступна */ }
  }
  async function delDaily(id?: string) {
    if (!id) return;
    try {
      const res = await fetch(`/api/mvp/planning/daily/${encodeURIComponent(id)}`, { method: "DELETE", headers: H });
      if (res.ok) setOv((prev) => ({ ...prev, daily: (prev.daily || []).filter((d) => d.id !== id) }));
    } catch { /* сеть недоступна */ }
  }

  /* ---------- разбивка сводки (локально из групп) ---------- */
  const byCat = useMemo(() => {
    const r: any = { group: 0, mini: 0, individual: 0 };
    groups.forEach((g) => { const c = loadCategory(g); r[c] = (r[c] || 0) + gPlan(g); });
    return r;
  }, [groups]);
  const byAud = useMemo(() => {
    const res = { post: 0, new: 0 };
    groups.forEach((g) => {
      const tot = gStudents(g); if (tot <= 0) return;
      res.post += gPlan(g) * (g.post / tot); res.new += gPlan(g) * (g.new / tot);
    });
    return { post: Math.round(res.post), new: Math.round(res.new) };
  }, [groups]);

  /* ---------- мотивация ---------- */
  function setMotBonus(i: number, val: string) { setMotRows((rs) => rs.map((r, k) => (k === i ? { ...r, bonus: val } : r))); }
  function setMotThreshold(i: number, val: string) { setMotRows((rs) => rs.map((r, k) => (k === i ? { ...r, threshold: parseNum(val) } : r))); }
  async function saveMotivation() {
    setSaving(true);
    try {
      const res = await fetch("/api/mvp/planning/motivation", { method: "PATCH", headers: HJ, body: JSON.stringify({ motivation: motRows }) });
      if (res.ok) { const r = await res.json(); setOv((prev) => ({ ...prev, motivation: r.motivation || motRows })); }
    } catch { /* сеть недоступна */ }
    finally { setSaving(false); }
  }
  const motInitials = (ov.detailed.branchName || scopeName || "Ф").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const hasGroups = groups.length > 0;

  /* ============================================================ */
  return (
    <div className="proto-planning">
      {/* ЗАГОЛОВОК */}
      <div className="page-head">
        <div>
          <div className="page-title">Планирование (БДР)</div>
          <div className="page-sub">Бюджет доходов и расходов · контроль плана · мотивация · прогнозы по всей сети</div>
        </div>
        <div className="head-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select className="period-sel" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS_RU.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className="period-sel" value={year} onChange={(e) => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="bdr-status" style={{ background: "var(--gold-bg)", color: "var(--gold-c)" }}>
            БДР · {!loaded ? "загрузка…" : `${STATUS_RU[lcStatus] || lcStatus}${lcStatus === "active" || lcStatus === "closed" ? ` · v${lc?.version || 1}` : ""}${ov.mode === "mock" ? " · демо" : ""}`}
          </span>
          {loaded && lcStatus === "draft" && (
            <>
              <button className="btn btn-brand" disabled={saving || !hasGroups} onClick={() => saveBudget()}>{saving ? "Сохранение…" : "Сохранить черновик"}</button>
              <button className="btn btn-secondary" disabled={saving} onClick={() => lifecycleCall("submit")}>На утверждение</button>
            </>
          )}
          {loaded && lcStatus === "pending" && (role === "owner" ? (
            <button className="btn btn-brand" disabled={saving} onClick={() => lifecycleCall("approve")}>{saving ? "…" : "Утвердить план"}</button>
          ) : (
            <>
              <button className="btn btn-secondary" disabled={saving || !hasGroups} onClick={() => saveBudget()}>Сохранить черновик</button>
              <span className="bdr-status" style={{ background: "var(--gold-bg)", color: "var(--gold-c)" }}>ждёт владельца{lc?.submittedBy ? ` · ${lc.submittedBy}` : ""}</span>
            </>
          ))}
          {loaded && lcStatus === "active" && (
            <button className="btn btn-brand" disabled={saving} onClick={requestRevision} title="План утверждён и зафиксирован — изменения через корректировку с причиной">{saving ? "…" : "Корректировка…"}</button>
          )}
          {loaded && lcStatus === "closed" && (
            <span className="bdr-status" style={{ background: "var(--ok-bg, rgba(127,176,137,.15))", color: "var(--green, #7FB089)" }}>
              🔒 зафиксирован{lc?.bonus?.level ? ` · уровень ${lc.bonus.level}` : ""}
            </span>
          )}
          <button className="btn btn-secondary" onClick={() => load()}>Обновить</button>
        </div>
      </div>

      {/* SUBTABS */}
      <div className="subtabs">
        {TABS.map((t) => (
          <button key={t.id} className={"subtab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ============ ПЛАН БДР ============ */}
      <div className={"panel" + (tab === "plan" ? " active" : "")}>
        {/* Сводка */}
        <div className="bdr-summary">
          <div className="sum-card" style={{ gridColumn: "1 / -1" }}>
            <h4>
              <span>Общие показатели · План БДР · {curPeriodLabel}</span>
              <select className="period-sel" style={{ fontSize: 12, padding: "5px 10px" }} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </h4>
            {!hasGroups ? <Empty /> : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div className="sum-row" onClick={() => setSummaryDetail(summaryDetail === "rev" ? null : "rev")}>
                    <span className="lbl">Выручка</span><span className="val" style={{ color: "var(--heading)" }}>{fmt(revenueTotal)} ₸</span>
                  </div>
                  <div className="sum-row" onClick={() => setSummaryDetail(summaryDetail === "exp" ? null : "exp")}>
                    <span className="lbl">Расходы</span><span className="val" style={{ color: "var(--red)" }}>{fmt(expenseTotal)} ₸</span>
                  </div>
                  <div className="sum-row" onClick={() => setSummaryDetail(summaryDetail === "pro" ? null : "pro")}>
                    <span className="lbl">Ожидаемая прибыль · {planMargin}%</span><span className="val" style={{ color: "var(--green)" }}>{fmt(planProfit)} ₸</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-c)" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", padding: "0 10px 4px", textTransform: "uppercase", letterSpacing: ".04em" }}>По типу занятий</div>
                    <MiniRow lbl="Групповые абонементы" val={byCat.group} />
                    <MiniRow lbl="Мини-группы" val={byCat.mini} />
                    <MiniRow lbl="Индивидуальные" val={byCat.individual} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", padding: "0 10px 4px", textTransform: "uppercase", letterSpacing: ".04em" }}>По аудитории</div>
                    <MiniRow lbl="Постоянные ученики" val={byAud.post} />
                    <MiniRow lbl="Новые ученики" val={byAud.new} />
                  </div>
                </div>
                {summaryDetail && (
                  <div className="sum-detail">
                    {summaryDetail === "rev" && <><b>Выручка по группам:</b><br />{groups.map((g) => `${g.name} — ${fmt(gPlan(g))} ₸`).join("; ")}</>}
                    {summaryDetail === "exp" && <><b>Расходы по категориям:</b><br />{expenses.map((e) => `${e.name} — ${fmt(expVal(e))} ₸`).join("; ")}</>}
                    {summaryDetail === "pro" && <><b>Прибыль = Выручка − Расходы</b><br />{fmt(revenueTotal)} − {fmt(expenseTotal)} = {fmt(planProfit)} ₸</>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Источник плана */}
        <div className="source-card">
          <div className="source-title">Создать план на основе</div>
          <div className="source-sub">CRM автоматически подставит цифры. Любую сумму можно изменить вручную.</div>
          <div className="source-opts">
            {[
              { key: "prev_month", title: "Прошлый месяц", desc: loaded && ov.basis.prevMonth ? `${fmt(ov.basis.prevMonth)} ₸` : "Данных пока нет" },
              { key: "prev_year", title: "Прошлый год", desc: loaded && ov.basis.prevYear ? `${fmt(ov.basis.prevYear)} ₸` : "Данных пока нет" },
              { key: "avg6", title: "Среднее значение", desc: loaded && ov.basis.avg6 ? `6 мес: ${fmt(ov.basis.avg6)} ₸` : "Данных пока нет" },
              { key: "manual", title: "Вручную", desc: "С нуля" },
            ].map((o) => (
              <div key={o.key} className={"source-opt" + (ov.source === o.key ? " on" : "")} onClick={() => pickSource(o.key)}>
                <div className="source-opt-title">{o.title}</div>
                <div className="source-opt-desc">{o.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Выручка по группам */}
        <div className="slabel">Планирование доходов · детально по группам</div>
        <div className="tree-card">
          <div className="tree-head" style={{ flexWrap: "wrap", gap: 10 }}>
            <h3>Выручка по группам</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
              <label style={{ fontSize: 12.5, color: "var(--text2)", fontWeight: 600 }}>Филиал:</label>
              <select className="period-sel" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className="btn btn-brand" style={{ padding: "7px 12px", fontSize: 12 }} onClick={calcRecommendations} disabled={!hasGroups}>✦ Рассчитать рекомендации</button>
              <span className="mode-pill auto"><span className="auto-dot" />авто из абонементов</span>
            </div>
          </div>
          {/* Шапка филиала */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--gold-bg)", borderRadius: 12, margin: 14, cursor: "pointer" }} onClick={() => setCollapsed((c) => !c)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, display: "inline-block", transform: `rotate(${collapsed ? "-90deg" : "0"})` }}>▾</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--heading)" }}>{scopeName}</div>
                <div style={{ fontSize: 11.5, color: "var(--text2)" }}>{groups.length} групп · {studentsTotal} учеников · заполненность {fillRate}%</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, textAlign: "right", fontSize: 12 }}>
              <div><div style={{ color: "var(--text2)" }}>Выручка</div><div style={{ fontWeight: 800, color: "var(--heading)" }}>{fmt(revenueTotal)}</div></div>
              <div><div style={{ color: "var(--text2)" }}>Расходы</div><div style={{ fontWeight: 800, color: "var(--red)" }}>{fmt(expenseTotal)}</div></div>
              <div><div style={{ color: "var(--text2)" }}>Прибыль</div><div style={{ fontWeight: 800, color: "var(--green)" }}>{fmt(planProfit)}</div></div>
            </div>
          </div>
          {!collapsed && (!hasGroups ? (
            <Empty>{loaded ? "Группы этого филиала ещё не подтянулись — данных пока нет." : "Загрузка…"}</Empty>
          ) : (
            <div style={{ padding: "0 14px 14px" }}>
              {zones.map((zone) => {
                const zg = groups.filter((g) => g.zone === zone);
                const zsum = zg.reduce((s, g) => s + gPlan(g), 0);
                const zst = zg.reduce((s, g) => s + gStudents(g), 0);
                const zc = !!zoneCollapsed[zone];
                return (
                  <div key={zone} style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--inset)", borderRadius: 9, fontWeight: 700, fontSize: 12.5, color: "var(--heading)", cursor: "pointer" }} onClick={() => setZoneCollapsed((m) => ({ ...m, [zone]: !m[zone] }))}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, display: "inline-block", transform: `rotate(${zc ? "-90deg" : "0"})` }}>▾</span>
                        {zone} · {zg.length} гр · {zst} уч
                      </span>
                      <span>{fmt(zsum)} ₸</span>
                    </div>
                    {!zc && (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                          <thead>
                            <tr style={{ fontSize: 10.5, color: "var(--text2)", textAlign: "right" }}>
                              <th style={{ textAlign: "left", padding: "5px 6px" }}>Группа</th>
                              <th style={{ padding: "5px 4px", textAlign: "left" }}>Педагог</th>
                              <th style={{ padding: "5px 4px" }}>Чек</th>
                              <th style={{ padding: "5px 4px" }}>Пост</th>
                              <th style={{ padding: "5px 4px" }}>Нов</th>
                              <th style={{ padding: "5px 4px" }}>Всего</th>
                              <th style={{ padding: "5px 4px" }}>Своб</th>
                              <th style={{ padding: "5px 4px" }}>Факт пр. мес.</th>
                              <th style={{ padding: "5px 4px" }}>Реком.</th>
                              <th style={{ padding: "5px 4px" }}>План</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {zg.map((g) => {
                              const total = gStudents(g), free = gFree(g), over = total > g.max && g.max > 0;
                              const rec = gRecommend(g), plan = gPlan(g);
                              return (
                                <tr key={g.id} style={{ borderBottom: "1px solid var(--border-c)" }}>
                                  <td style={{ padding: "4px 6px", fontSize: 12, fontWeight: 600, color: "var(--heading)" }}>{g.name}</td>
                                  <td style={{ textAlign: "left", fontSize: 12, color: "var(--text2)" }}>{g.teacher || <span style={{ opacity: 0.5 }}>—</span>}</td>
                                  <td style={{ textAlign: "right" }}><input className="grp-input" style={{ width: 64 }} value={g.chek} onChange={(e) => setGroupField(g.id, "chek", e.target.value)} /></td>
                                  <td style={{ textAlign: "right" }}><input className="grp-input" style={{ width: 38 }} value={g.post} onChange={(e) => setGroupField(g.id, "post", e.target.value)} /></td>
                                  <td style={{ textAlign: "right" }}><input className="grp-input" style={{ width: 38 }} value={g.new} onChange={(e) => setGroupField(g.id, "new", e.target.value)} /></td>
                                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: 12, color: over ? "var(--red)" : undefined }}>{total}</td>
                                  <td style={{ textAlign: "right", fontSize: 12, color: "var(--text2)" }}>{free}</td>
                                  <td style={{ textAlign: "right", fontSize: 11.5, color: "var(--text2)" }}>{fmt(g.factPrev)}</td>
                                  <td style={{ textAlign: "right", fontSize: 11.5, color: "var(--gold-c)", fontWeight: 600 }}>{fmt(rec)}</td>
                                  <td style={{ textAlign: "right" }}><input className="grp-input" style={{ width: 78, fontWeight: 700 }} value={g.manualPlan > 0 ? g.manualPlan : plan} onChange={(e) => setGroupField(g.id, "manualPlan", e.target.value)} /></td>
                                  <td style={{ textAlign: "right", paddingRight: 4 }}><span title="Удалить" style={{ cursor: "pointer", color: "var(--text2)", fontWeight: 700 }} onClick={() => delGroup(g.id)}>✕</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {recoMsg && (
          <div className="ai-card" style={{ marginTop: 14 }}>
            <div className="ai-lbl">✦ Рекомендация системы</div>
            <div className="ai-text"><p>{recoMsg}</p></div>
          </div>
        )}

        {/* Расходы */}
        <div className="slabel">Планирование расходов · ЗП и бонусы раскрываются по людям ▾</div>
        <div className="tree-card">
          <div className="tree-head"><h3>Расходы</h3></div>
          {expenses.length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>Категория</th><th className="num">План, ₸</th><th className="num">Режим</th><th /></tr></thead>
              <tbody>
                {expenses.map((e, idx) => {
                  const hasItems = !!(e.items && e.items.length);
                  const open = !!expExpanded[idx];
                  const sum = expVal(e);
                  return (
                    <Fragment key={"e" + idx}>
                      <tr className="tree-row lvl1">
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {hasItems
                              ? <span style={{ cursor: "pointer", fontSize: 11, display: "inline-block", transform: `rotate(${open ? "0" : "-90"}deg)`, color: "var(--text2)" }} onClick={() => toggleExpExpand(idx)}>▾</span>
                              : <span style={{ width: 11, display: "inline-block" }} />}
                            <span style={{ fontWeight: 600 }}>{e.name}</span>
                          </span>
                        </td>
                        <td className="num editable-cell">
                          {hasItems
                            ? <span style={{ fontWeight: 700, paddingRight: 6 }}>{fmt(sum)}</span>
                            : <input value={e.val || 0} onChange={(ev) => setExpValFn(idx, ev.target.value)} />}
                        </td>
                        <td className="num"><span className={"mode-pill " + (e.mode || "manual")} style={{ cursor: "pointer" }} onClick={() => toggleExpMode(idx)}>{e.mode === "auto" ? "авто" : "вручную"}</span></td>
                        <td className="num"><span style={{ cursor: "pointer", color: "var(--text2)", fontWeight: 700, padding: "0 6px" }} onClick={() => delExp(idx)}>✕</span></td>
                      </tr>
                      {hasItems && open && (e.items || []).map((it, j) => (
                        <tr key={"e" + idx + "i" + j} className="tree-row" style={{ background: "var(--inset)" }}>
                          <td style={{ paddingLeft: 34, fontSize: 12, color: "var(--text2)" }}>{it.name}</td>
                          <td className="num editable-cell"><input style={{ width: 90 }} value={it.val || 0} onChange={(ev) => setExpItemVal(idx, j, ev.target.value)} /></td>
                          <td className="num" />
                          <td className="num" />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Воронка */}
        <div className="slabel">Воронка продаж · сколько действий нужно для плана</div>
        <div className="tree-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Нужно новых продаж:</label>
            <input className="inline-input" style={{ width: 70 }} value={funnelNeed} onChange={(e) => setFunnelNeed(e.target.value)} />
            <span style={{ fontSize: 12, color: "var(--text2)" }}>— система посчитает пробные, записи и лиды по конверсиям</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="funnel-step"><span>Нужно новых продаж</span><b>{needNew}</b></div>
            <div className="funnel-arrow">↓ конверсия пробный→покупка {Math.round(CONV.visit2buy * 100)}%</div>
            <div className="funnel-step"><span>Провести пробных уроков</span><b>{needVisits}</b></div>
            <div className="funnel-arrow">↓ запись→приход {Math.round(CONV.signup2visit * 100)}%</div>
            <div className="funnel-step"><span>Записать на пробный</span><b>{needSignups}</b></div>
            <div className="funnel-arrow">↓ лид→запись {Math.round(CONV.lead2signup * 100)}%</div>
            <div className="funnel-step"><span>Нужно лидов</span><b>{needLeads}</b></div>
          </div>
        </div>

        {/* KPI итоги */}
        <div className="kpi-grid" style={{ marginTop: 20 }}>
          <div className="kpi"><div className="kpi-top"><div className="kpi-ic brand">₸</div></div><div className="kpi-val">{fmt(revenueTotal)}</div><div className="kpi-lbl">Плановая выручка</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-ic red">−</div></div><div className="kpi-val">{fmt(expenseTotal)}</div><div className="kpi-lbl">Плановые расходы</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-ic green">✓</div></div><div className="kpi-val" style={{ color: "var(--green)" }}>{fmt(planProfit)}</div><div className="kpi-lbl">Плановая прибыль</div></div>
          <div className="kpi"><div className="kpi-top"><div className="kpi-ic blue">%</div></div><div className="kpi-val">{planMargin}%</div><div className="kpi-lbl">Рентабельность</div></div>
        </div>

        {/* История версий плана */}
        {(lc?.history?.length || 0) > 0 && (
          <>
            <div className="slabel" style={{ marginTop: 20 }}>История плана · версии и решения</div>
            <div className="tree-card" style={{ padding: 12 }}>
              {[...(lc?.history || [])].reverse().slice(0, 8).map((h, i) => (
                <div key={i} className="task-item" style={{ cursor: "default" }}>
                  <div className="task-text">
                    <b>{HIST_RU[h.action] || h.action}</b> · v{h.version} · {String(h.at || "").slice(0, 16).replace("T", " ")} · {h.by}
                    {h.reason ? <span style={{ color: "var(--text2)" }}> — «{h.reason}»</span> : null}
                    {typeof h.plannedRevenue === "number" ? <span style={{ color: "var(--text2)", fontSize: 11 }}> · план {fmt(h.plannedRevenue)} ₸</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ============ ФАКТ БДР ============ */}
      <div className={"panel" + (tab === "fact" ? " active" : "")}>
        <div className="bdr-summary">
          <div className="sum-card" style={{ gridColumn: "1 / -1" }}>
            <h4><span>Факт БДР · {curPeriodLabel}</span><span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>авто из CRM</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div className="sum-row"><span className="lbl">Поступления</span><span className="val" style={{ color: "var(--heading)" }}>{fmt(ov.fact.revenue)} ₸</span></div>
              <div className="sum-row"><span className="lbl">Расходы</span><span className="val" style={{ color: "var(--red)" }}>{fmt(ov.fact.expense)} ₸</span></div>
              <div className="sum-row"><span className="lbl">Прибыль · {ov.fact.margin}%</span><span className="val" style={{ color: "var(--green)" }}>{fmt(ov.fact.profit)} ₸</span></div>
            </div>
          </div>
        </div>
        <div className="slabel">Поступления · автоматически из CRM</div>
        <div className="tree-card">
          {(ov.fact.incomeByDirection || []).length === 0 ? <Empty /> : (
            <table style={{ width: "100%" }}>
              <thead><tr><th style={{ textAlign: "left" }}>Направление</th><th className="num">План, ₸</th><th className="num">Факт, ₸</th></tr></thead>
              <tbody>
                {ov.fact.incomeByDirection.map((r: any, idx: number) => (
                  <tr key={idx} className="tree-row lvl1">
                    <td>{r.direction}</td>
                    <td className="num">{fmt(r.plan)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmt(r.fact)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--border-c)" }}>
                  <td style={{ fontWeight: 700 }}>Итого</td>
                  <td className="num" style={{ fontWeight: 700 }}>{fmt(ov.fact.incomeByDirection.reduce((s: number, r: any) => s + (+r.plan || 0), 0))}</td>
                  <td className="num" style={{ fontWeight: 800 }}>{fmt(ov.fact.revenue)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="slabel">Расходы (факт) · из Бухгалтерии</div>
        <div className="tree-card">
          {ov.fact.expense > 0 ? (
            <table style={{ width: "100%" }}>
              <thead><tr><th style={{ textAlign: "left" }}>Категория</th><th className="num">Факт, ₸</th></tr></thead>
              <tbody>
                <tr className="tree-row lvl1"><td>Все расходы (агрегат)</td><td className="num" style={{ fontWeight: 800 }}>{fmt(ov.fact.expense)}</td></tr>
              </tbody>
            </table>
          ) : <Empty />}
          <Empty>Детализация фактических расходов по строкам пока недоступна</Empty>
        </div>
      </div>

      {/* ============ ПЛАН / ФАКТ ============ */}
      <div className={"panel" + (tab === "pf" ? " active" : "")}>
        <div className="slabel">Выполнение плана · по уровням</div>
        <div className="tree-card">
          {(ov.levels || []).length === 0 ? <Empty /> : (
            <table>
              <thead><tr><th>Уровень</th><th className="num">План</th><th className="num">Факт</th><th className="num">Отклонение</th><th className="num">Выполнение</th></tr></thead>
              <tbody>
                {(() => {
                  const planSum = ov.levels.reduce((s, l) => s + l.plan, 0);
                  const factSum = ov.levels.reduce((s, l) => s + l.fact, 0);
                  const rows = [
                    { lvl: 0, name: "Доходы", plan: planSum, fact: factSum },
                    ...ov.levels.map((l) => ({ lvl: 1, name: l.level, plan: l.plan, fact: l.fact })),
                  ];
                  return rows.map((r, i) => {
                    const dev = r.fact - r.plan, pct = r.plan > 0 ? Math.round((r.fact / r.plan) * 100) : 0;
                    const bar = pct >= 100 ? "good" : pct >= 90 ? "mid" : "bad";
                    return (
                      <tr key={i} className={"tree-row lvl" + r.lvl}>
                        <td>{r.name}</td>
                        <td className="num">{fmt(r.plan)}</td>
                        <td className="num">{fmt(r.fact)}</td>
                        <td className={"num " + (dev >= 0 ? "dev-pos" : "dev-neg")}>{dev >= 0 ? "+" : ""}{fmt(dev)}</td>
                        <td className="num"><span className="pf-bar-wrap"><span className={"pf-bar " + bar} style={{ width: Math.min(pct, 100) + "%" }} /></span>{pct}%</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ============ ЕЖЕДНЕВНЫЙ ОТЧЁТ ============ */}
      <div className={"panel" + (tab === "daily" ? " active" : "")}>
        <div className="slabel">Ежедневный отчёт управляющего</div>
        <div className="game-hero">
          <div className="ring">
            <svg width="120" height="120">
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="10" />
              <circle cx="60" cy="60" r={R} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${C}`} />
            </svg>
            <div className="ring-label"><div className="ring-pct">{dailyPct}%</div><div className="ring-sub">выполнено</div></div>
          </div>
          <div className="game-stats">
            <div className="gstat"><div className="gstat-val">🔥 {streak}</div><div className="gstat-lbl">дней подряд</div></div>
            <div className="gstat"><div className="gstat-val">⭐ {points}</div><div className="gstat-lbl">очков</div></div>
            <div className="gstat"><div className="gstat-val">{forecast}%</div><div className="gstat-lbl">прогноз</div></div>
          </div>
          <div className="coach-msg">👨‍🏫 {coachMessage(dailyPct)}</div>
        </div>
        <div className="daily-grid" style={{ marginTop: 16 }}>
          <DailyCard lbl="План месяца" val={fmt(revenueTotal)} />
          <DailyCard lbl="Факт" val={fmt(dailyFact)} cls="brand" />
          <DailyCard lbl="До плана" val={fmt(dailyLeft)} cls="red" />
          <DailyCard lbl="Нужно в день" val={fmt(perDay)} cls="brand" />
          <DailyCard lbl="Осталось дней" val={String(daysLeft)} />
          <DailyCard lbl="Уровень мотивации" val={reachedTier ? reachedTier.level : "—"} cls="green" />
        </div>

        <div className="slabel" style={{ marginTop: 20 }}>Задачи на сегодня · {doneCount} из {dailyTasks.length} · закрой план</div>
        <div>
          {dailyTasks.map((t) => {
            const done = !!tasksDone[t.id];
            return (
              <div key={t.id} className={"task-item" + (done ? " done" : "")} onClick={() => toggleTask(t)}>
                <div className="task-check">{done ? "✓" : ""}</div>
                <div className="task-text">{t.text}</div>
                <div className="task-pts">+{t.pts} ⭐</div>
              </div>
            );
          })}
        </div>

        <div className="slabel" style={{ marginTop: 18 }}>Мотивация управляющего · по факту выполнения</div>
        {reachedTier ? (
          <div className="daily-grid">
            <DailyCard lbl="Выполнение плана" val={dailyPct + "%"} cls="brand" />
            <DailyCard lbl="Достигнутый уровень" val={reachedTier.level} />
            <div className="daily-card" style={{ gridColumn: "span 2" }}>
              <div className="daily-card-lbl">Бонус за уровень</div>
              <div className="daily-card-val green" style={{ fontSize: 15 }}>{reachedTier.bonus}</div>
            </div>
          </div>
        ) : <Empty>Пороги мотивации ещё не достигнуты или не заданы</Empty>}

        <div className="slabel" style={{ marginTop: 18 }}>История ежедневных отчётов</div>
        <div className="tree-card" style={{ padding: 14 }}>
          {(() => {
            const t = (ov.dailyAuto || []).find((a) => a.date === todayStr);
            return t ? (
              <div style={{ marginBottom: 10, fontSize: 12.5, color: "var(--text2)" }}>
                Автофакт из платежей CRM за сегодня: <b style={{ color: "var(--heading)" }}>{fmt(t.revenue)} ₸</b> · продаж {t.sales}.
                Отчёт дополняет цифры комментарием и пробными — выручку система сверит с платежами.
              </div>
            ) : null;
          })()}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <input className="inline-input" style={{ width: 130 }} type="date" value={dDate} onChange={(e) => setDDate(e.target.value)} />
            <input className="inline-input" style={{ width: 110 }} placeholder="Выручка ₸" value={dRevenue} onChange={(e) => setDRevenue(e.target.value)} />
            <input className="inline-input" style={{ width: 80 }} placeholder="Пробных" value={dTrials} onChange={(e) => setDTrials(e.target.value)} />
            <input className="inline-input" style={{ width: 80 }} placeholder="Продаж" value={dSales} onChange={(e) => setDSales(e.target.value)} />
            <input className="inline-input" style={{ flex: 1, minWidth: 160 }} placeholder="Комментарий" value={dComment} onChange={(e) => setDComment(e.target.value)} />
            <button className="btn btn-brand" style={{ padding: "7px 12px", fontSize: 12 }} onClick={addDaily}>+ Добавить</button>
          </div>
          {(ov.daily || []).length === 0 ? <Empty /> : (ov.daily || []).map((d, i) => (
            <div key={d.id || i} className="task-item" style={{ cursor: "default" }}>
              <div className="task-text">
                <b>{d.date}</b> · {fmt(d.revenue)} ₸ · пробных {d.trials} · продаж {d.sales}
                {d.comment ? <span style={{ color: "var(--text2)" }}> — {d.comment}</span> : null}
                <span style={{ color: "var(--text2)", fontSize: 11 }}> · {d.author}</span>
                {(() => {
                  const auto = (ov.dailyAuto || []).find((a) => a.date === d.date);
                  return auto && Math.abs(auto.revenue - d.revenue) > Math.max(1000, auto.revenue * 0.1)
                    ? <span style={{ color: "var(--red)", fontSize: 11, fontWeight: 700 }}> · ⚠ по платежам {fmt(auto.revenue)} ₸</span>
                    : null;
                })()}
              </div>
              {d.id && (
                <span title="Удалить отчёт" style={{ cursor: "pointer", color: "var(--text2)", fontWeight: 700, padding: "0 6px" }} onClick={() => delDaily(d.id)}>✕</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ AI АНАЛИТИКА ============ */}
      <div className={"panel" + (tab === "ai" ? " active" : "")}>
        <div className="slabel">Факт за период · реальные показатели</div>
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-val">{fmt(ov.fact.revenue)}</div><div className="kpi-lbl">Факт выручки</div></div>
          <div className="kpi"><div className="kpi-val">{fmt(ov.fact.expense)}</div><div className="kpi-lbl">Факт расходов</div></div>
          <div className="kpi"><div className="kpi-val" style={{ color: "var(--green)" }}>{fmt(ov.fact.profit)}</div><div className="kpi-lbl">Факт прибыли</div></div>
          <div className="kpi"><div className="kpi-val">{ov.fact.donePct}%</div><div className="kpi-lbl">Выполнение плана</div></div>
        </div>
        <div className="slabel" style={{ marginTop: 18 }}>AI-аналитик</div>
        <div className="ai-card">
          <div className="ai-lbl">✦ AI-аналитик · {curPeriodLabel}</div>
          <Empty>Аналитика ИИ пока недоступна — данных нет</Empty>
        </div>
      </div>

      {/* ============ МОТИВАЦИЯ ============ */}
      <div className={"panel" + (tab === "mot" ? " active" : "")}>
        <div className="slabel">Настройки мотивации · полностью редактируются владельцем</div>
        <div className="mot-card">
          <div className="mot-head">
            <div className="mot-mgr">
              <div className="mot-avatar">{motInitials}</div>
              <div>
                <div className="mot-name">{ov.detailed.branchName || scopeName}</div>
                <div className="mot-branch">Мотивация управляющего · пороги плана</div>
              </div>
            </div>
            <div className="mot-salary">
              <div className="mot-salary-lbl">Выбранный уровень</div>
              <div className="mot-salary-val" style={{ fontSize: 14 }}>{motRows[motStep]?.bonus || "—"}</div>
            </div>
          </div>
          {motRows.length === 0 ? <Empty /> : (
            <>
              <div className="kpi-ladder">
                {motRows.map((s, i) => (
                  <div key={i} className={"ladder-step" + (i === motStep ? " current" : i < motStep ? " reached" : "")} onClick={() => setMotStep(i)}>
                    <div className="ladder-pct">
                      <input className="ladder-input" style={{ width: 54, textAlign: "center" }} value={s.threshold} disabled={!canEditMotivation} onClick={(e) => e.stopPropagation()} onChange={(e) => setMotThreshold(i, e.target.value)} />%
                    </div>
                    <input className="ladder-input" value={s.bonus} disabled={!canEditMotivation} onClick={(e) => e.stopPropagation()} onChange={(e) => setMotBonus(i, e.target.value)} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                {canEditMotivation ? (
                  <>
                    <button className="btn btn-brand" style={{ padding: "7px 14px", fontSize: 12 }} disabled={saving} onClick={saveMotivation}>{saving ? "Сохранение…" : "Сохранить лестницу"}</button>
                    <div style={{ fontSize: 11.5, color: "var(--text2)" }}>Порог (%) и бонус редактируются. Кликните на ступень, чтобы выбрать текущий уровень.</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11.5, color: "var(--text2)" }}>Пороги и бонусы настраивает владелец — управляющему лестница доступна для просмотра.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- мелкие подкомпоненты ---------- */
function MiniRow({ lbl, val }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", fontSize: 12 }}>
      <span style={{ color: "var(--text2)" }}>{lbl}</span>
      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(val)} ₸</span>
    </div>
  );
}
function DailyCard({ lbl, val, cls }: any) {
  return (
    <div className="daily-card">
      <div className="daily-card-lbl">{lbl}</div>
      <div className={"daily-card-val " + (cls || "")}>{val}</div>
    </div>
  );
}

export default PlanningProtoView;
