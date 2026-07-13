import { Fragment, useMemo, useState } from "react";
import "./planning-proto.css";

/* ============================================================
   Данные-заглушки (mock). Портированы из статического прототипа.
   ============================================================ */
const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const GROUPS_ASTANA: any[] = [
  { zone: "Зал №2", name: "Ансамбль", type: "Ансамбль", teacher: "", chek: 17176, post: 17, new: 0, max: 18, retention: 90, factPrev: 292904, factPrev2: 257975, manualPlan: 0 },
  { zone: "Зал №2", name: "Мужская взрослая 17:00", type: "Взрослая", teacher: "", chek: 21900, post: 10, new: 0, max: 22, retention: 90, factPrev: 209310, factPrev2: 199563, manualPlan: 0 },
  { zone: "Зал №2", name: "Мужская взрослая 18:30", type: "Взрослая", teacher: "", chek: 20143, post: 7, new: 0, max: 22, retention: 90, factPrev: 143220, factPrev2: 137439, manualPlan: 0 },
  { zone: "Зал №2", name: "Младший ансамбль", type: "Ансамбль", teacher: "", chek: 19961, post: 17, new: 0, max: 21, retention: 90, factPrev: 351547, factPrev2: 302746, manualPlan: 0 },
  { zone: "Зал №1", name: "Мужская студия Сб Вс (Хамит)", type: "Взрослая", teacher: "Хамит", chek: 18914, post: 28, new: 0, max: 10, retention: 90, factPrev: 516272, factPrev2: 468250, manualPlan: 0 },
  { zone: "Зал №1", name: "Мужская начальный Вт Чт (Тимур)", type: "Начальная", teacher: "Тимур", chek: 18338, post: 19, new: 1, max: 23, retention: 90, factPrev: 347843, factPrev2: 348696, manualPlan: 0 },
  { zone: "Зал №1", name: "Продолжающая группа Сб Вс (Тимур)", type: "Продолжающая", teacher: "Тимур", chek: 20444, post: 27, new: 0, max: 22, retention: 90, factPrev: 509733, factPrev2: 501115, manualPlan: 0 },
  { zone: "Зал №1", name: "Взрослая продолжающая Сб Вс (Дэйси)", type: "Продолжающая", teacher: "Дэйси", chek: 19089, post: 15, new: 0, max: 20, retention: 90, factPrev: 287619, factPrev2: 273819, manualPlan: 0 },
  { zone: "Зал №1", name: "Девичья Ср Пт  (Дэйси)", type: "Взрослая", teacher: "Дэйси", chek: 19550, post: 12, new: 3, max: 15, retention: 90, factPrev: 278193, factPrev2: 282252, manualPlan: 0 },
  { zone: "Зал №1", name: "Девичья 10:15 сб/вс (Дэйси)", type: "Взрослая", teacher: "Дэйси", chek: 20130, post: 27, new: 0, max: 22, retention: 90, factPrev: 557220, factPrev2: 478783, manualPlan: 0 },
  { zone: "Зал №1", name: "Взрослая начальная Сб Вс (Мерей)", type: "Начальная", teacher: "Мерей", chek: 20174, post: 23, new: 0, max: 15, retention: 90, factPrev: 475489, factPrev2: 453673, manualPlan: 0 },
  { zone: "Зал №1", name: "Взрослая продолжающая Сб Вс (Мерей)", type: "Продолжающая", teacher: "Мерей", chek: 19684, post: 19, new: 0, max: 22, retention: 90, factPrev: 360619, factPrev2: 337257, manualPlan: 0 },
  { zone: "Зал №1", name: "Девичья 10:00 (Анжела)", type: "Взрослая", teacher: "Анжела", chek: 18572, post: 22, new: 0, max: 25, retention: 90, factPrev: 426740, factPrev2: 378807, manualPlan: 0 },
  { zone: "Зал №1", name: "Женская продолжающая Анжела", type: "Продолжающая", teacher: "", chek: 19851, post: 37, new: 0, max: 7, retention: 90, factPrev: 684583, factPrev2: 656293, manualPlan: 0 },
  { zone: "Зал №1", name: "Девичья 3-4 года (Анжела)", type: "Детская", teacher: "Анжела", chek: 20273, post: 11, new: 0, max: 22, retention: 90, factPrev: 229731, factPrev2: 215091, manualPlan: 0 },
  { zone: "Зал №1", name: "Женская студия Анжела", type: "Взрослая", teacher: "", chek: 18357, post: 14, new: 0, max: 17, retention: 90, factPrev: 263404, factPrev2: 252413, manualPlan: 0 },
  { zone: "Зал №1", name: "Женская взрослая Анжела 19:30", type: "Взрослая", teacher: "", chek: 18559, post: 16, new: 1, max: 22, retention: 90, factPrev: 312256, factPrev2: 320625, manualPlan: 0 },
  { zone: "Зал №1", name: "Грузинская группа", type: "Другое", teacher: "", chek: 19709, post: 11, new: 0, max: 11, retention: 90, factPrev: 210123, factPrev2: 207538, manualPlan: 0 },
  { zone: "Зал №1", name: "Девичья продолжающая вт/чт (Анжела)", type: "Продолжающая", teacher: "Анжела", chek: 19420, post: 22, new: 0, max: 22, retention: 90, factPrev: 439126, factPrev2: 412967, manualPlan: 0 },
  { zone: "Зал №1", name: "Мужская 10:00 (Ислам)", type: "Взрослая", teacher: "Ислам", chek: 20700, post: 20, new: 0, max: 22, retention: 90, factPrev: 427257, factPrev2: 397783, manualPlan: 0 },
  { zone: "Зал №1", name: "Продолжающая (Ислам)", type: "Продолжающая", teacher: "Ислам", chek: 20167, post: 12, new: 0, max: 12, retention: 90, factPrev: 244809, factPrev2: 214516, manualPlan: 0 },
  { zone: "Зал №3", name: "Мини группа взрослая Ср Пт (Медина)", type: "Мини-группа", teacher: "Медина", chek: 16375, post: 7, new: 4, max: 10, retention: 90, factPrev: 171051, factPrev2: 165807, manualPlan: 0 },
  { zone: "Зал №3", name: "Мини-группа взрослая ПН Ср (Хамит)", type: "Мини-группа", teacher: "Хамит", chek: 20389, post: 6, new: 3, max: 10, retention: 90, factPrev: 170724, factPrev2: 167461, manualPlan: 0 },
  { zone: "Зал №3", name: "Индивидуальные Хамит", type: "Индивидуальные", teacher: "", chek: 47000, post: 6, new: 1, max: 6, retention: 90, factPrev: 306999, factPrev2: 302323, manualPlan: 0 },
  { zone: "Зал №3", name: "Мини-группа детская Пн Ср (Хамит)", type: "Мини-группа", teacher: "Хамит", chek: 18750, post: 8, new: 1, max: 4, retention: 90, factPrev: 169195, factPrev2: 157119, manualPlan: 0 },
  { zone: "Зал №3", name: "Мини группа детская Вт Чт (Тимур)", type: "Мини-группа", teacher: "Тимур", chek: 24219, post: 4, new: 0, max: 6, retention: 90, factPrev: 93787, factPrev2: 88092, manualPlan: 0 },
  { zone: "Зал №3", name: "Мини-группа взрослая Вт Чт (Дэйси)", type: "Мини-группа", teacher: "Дэйси", chek: 22656, post: 8, new: 0, max: 2, retention: 90, factPrev: 173038, factPrev2: 183265, manualPlan: 0 },
  { zone: "Зал №3", name: "Индивидуальные Дэйси", type: "Индивидуальные", teacher: "", chek: 22500, post: 2, new: 0, max: 0, retention: 90, factPrev: 45191, factPrev2: 43437, manualPlan: 0 },
  { zone: "Зал №3", name: "Индивидуальный Тимур", type: "Индивидуальные", teacher: "", chek: 36750, post: 1, new: 0, max: 1, retention: 90, factPrev: 34627, factPrev2: 36091, manualPlan: 0 },
  { zone: "Зал №3", name: "Индивидуальные Медина", type: "Индивидуальные", teacher: "", chek: 44063, post: 1, new: 1, max: 1, retention: 90, factPrev: 82947, factPrev2: 82232, manualPlan: 0 },
  { zone: "Зал №3", name: "Индивидуальные Дана", type: "Индивидуальные", teacher: "", chek: 27625, post: 2, new: 0, max: 1, retention: 90, factPrev: 57937, factPrev2: 53570, manualPlan: 0 },
].map((g, i) => ({ ...g, id: "g" + i }));

const BRANCHES: any[] = [
  { id: "astana203", name: "Астана 203", manager: "Анель", groups: GROUPS_ASTANA },
  { id: "polnoformat", name: "Полноформат", manager: "Марат", groups: [] },
];

const FUNNEL = { lead2signup: 0.55, signup2visit: 0.7, visit2buy: 0.5, retention: 0.85 };

const DEFAULT_EXPENSES: any[] = [
  { name: "Аренда", val: 1080450, mode: "auto" },
  { name: "Ком. услуги", val: 55000, mode: "auto" },
  { name: "Зарплаты", mode: "auto", items: [
    { name: "Педагог · Хамит", val: 420000 }, { name: "Педагог · Тимур", val: 480000 },
    { name: "Педагог · Дэйси", val: 390000 }, { name: "Управляющий · Анель", val: 350000 },
    { name: "Администратор", val: 250000 }, { name: "Прочий персонал", val: 729025 },
  ] },
  { name: "Бонусы", mode: "auto", items: [
    { name: "Бонус управляющего", val: 180000 }, { name: "Бонусы педагогов", val: 153700 },
  ] },
  { name: "Хоз. товары", val: 140000, mode: "manual" },
  { name: "Маркетинг", val: 340000, mode: "auto" },
  { name: "Сотовая связь и подписки", val: 147230, mode: "manual" },
];

const DEFAULT_FACT_INCOME: any[] = [
  { name: "Продажи абонементов", val: 12400000, mode: "auto", manual: false },
  { name: "Продажа товаров", val: 1850000, mode: "auto", manual: false },
  { name: "Выступления", val: 1200000, mode: "auto", manual: false },
  { name: "Банкеты", val: 650000, mode: "auto", manual: false },
  { name: "Возвраты", val: -200000, mode: "manual", manual: true },
];

const DEFAULT_FACT_EXPENSE: any[] = [
  { name: "Зарплаты", val: 2580000, mode: "auto", manual: false },
  { name: "Аренда", val: 1080450, mode: "auto", manual: false },
  { name: "Маркетинг", val: 320000, mode: "auto", manual: false },
  { name: "Коммунальные", val: 62000, mode: "auto", manual: false },
  { name: "Прочее", val: 180000, mode: "manual", manual: true },
];

const PF_DATA: any[] = [
  { lvl: 0, name: "Доходы", plan: 9177185, fact: 9029007 },
  { lvl: 1, name: "Групповые", plan: 8628449, fact: 8474882 },
  { lvl: 1, name: "Мини-группы", plan: 882486, fact: 810500 },
  { lvl: 1, name: "Индивидуальные", plan: 551500, fact: 554125 },
];

const DEFAULT_MOT_SCALE: any[] = [
  { from: 0, to: 80, bonus: 0 },
  { from: 80, to: 90, bonus: 50000 },
  { from: 90, to: 100, bonus: 150000 },
  { from: 100, to: 110, bonus: 250000 },
  { from: 110, to: 999, bonus: 400000 },
];

const SOURCE_OPTS = [
  { title: "Прошлый месяц", desc: "Май 2026: 27,4 млн ₸", k: 1.0 },
  { title: "Прошлый год", desc: "Июнь 2025: 24,1 млн ₸", k: 0.88 },
  { title: "Среднее значение", desc: "6 мес: 26,0 млн ₸", k: 0.95 },
  { title: "Вручную", desc: "С нуля", k: 0 },
];

/* ============================================================
   Помощники
   ============================================================ */
function fmt(n: number) { return Math.round(n).toLocaleString("ru-RU"); }
function parseNum(s: any) {
  const n = String(s).replace(/[\s  ]/g, "").replace("−", "-").replace(/[^0-9.-]/g, "");
  const v = parseFloat(n); return isNaN(v) ? 0 : v;
}
function loadCategory(g: any): string {
  if (g.max <= 1) return "individual";
  if (g.max <= 6) return "mini";
  return "group";
}
const gStudents = (g: any) => g.post + g.new;
const gSum = (g: any) => g.chek * gStudents(g);
const gPlan = (g: any) => (g.manualPlan > 0 ? g.manualPlan : gSum(g));
const gFree = (g: any) => Math.max(0, g.max - gStudents(g));
function gRecommend(g: any) {
  const avg = (g.factPrev + g.factPrev2) / 2;
  const potential = gFree(g) * g.chek * 0.4;
  return Math.round(avg + potential);
}
function expVal(e: any) {
  if (e.items && e.items.length) return e.items.reduce((s: number, it: any) => s + (+it.val || 0), 0);
  return +e.val || 0;
}

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
export function PlanningProtoView() {
  const now = new Date();
  const [tab, setTab] = useState("plan");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [branchId, setBranchId] = useState("astana203");
  const [groups, setGroups] = useState<any[]>(() => (BRANCHES[0].groups as any[]).map((g) => ({ ...g })));
  const [collapsed, setCollapsed] = useState(false);
  const [zoneCollapsed, setZoneCollapsed] = useState<Record<string, boolean>>({});
  const [summaryScope, setSummaryScope] = useState("all");
  const [summaryDetail, setSummaryDetail] = useState<string | null>(null);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [expenses, setExpenses] = useState<any[]>(() => JSON.parse(JSON.stringify(DEFAULT_EXPENSES)));
  const [expExpanded, setExpExpanded] = useState<Record<number, boolean>>({ 2: true, 3: true });
  const [funnelNeed, setFunnelNeed] = useState("20");
  const [factIncome, setFactIncome] = useState<any[]>(() => JSON.parse(JSON.stringify(DEFAULT_FACT_INCOME)));
  const [factExpense, setFactExpense] = useState<any[]>(() => JSON.parse(JSON.stringify(DEFAULT_FACT_EXPENSE)));
  const [tasksDone, setTasksDone] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [motScale, setMotScale] = useState<any[]>(() => JSON.parse(JSON.stringify(DEFAULT_MOT_SCALE)));
  const [motOklad, setMotOklad] = useState(350000);
  const [motStep, setMotStep] = useState(3);
  const [recoMsg, setRecoMsg] = useState<string | null>(null);

  /* ---------- производные величины ---------- */
  const revenueTotal = useMemo(() => groups.reduce((s, g) => s + gPlan(g), 0), [groups]);
  const expenseTotal = useMemo(() => expenses.reduce((s, e) => s + expVal(e), 0), [expenses]);
  const planProfit = revenueTotal - expenseTotal;
  const planMargin = revenueTotal > 0 ? Math.round((planProfit / revenueTotal) * 100) : 0;

  const studentsTotal = groups.reduce((s, g) => s + gStudents(g), 0);
  const freeTotal = groups.reduce((s, g) => s + gFree(g), 0);
  const capacityTotal = groups.reduce((s, g) => s + g.max, 0);
  const avgChek = groups.length ? Math.round(groups.reduce((s, g) => s + g.chek, 0) / groups.length) : 0;
  const fillRate = capacityTotal ? Math.round((studentsTotal / capacityTotal) * 100) : 0;

  const factIncomeTotal = factIncome.reduce((s, x) => s + (+x.val || 0), 0);
  const factExpenseTotal = factExpense.reduce((s, x) => s + (+x.val || 0), 0);

  const curPeriodLabel = `${MONTHS_RU[month]} ${year}`;
  const zones = useMemo(() => {
    const z: string[] = [];
    groups.forEach((g) => { if (z.indexOf(g.zone) < 0) z.push(g.zone); });
    return z;
  }, [groups]);

  /* ---------- обновления групп ---------- */
  function setGroupField(id: string, field: string, raw: string) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, [field]: parseNum(raw) } : g)));
  }
  function delGroup(id: string) {
    setGroups((gs) => gs.filter((g) => g.id !== id));
  }
  function onBranchChange(id: string) {
    setBranchId(id);
    const b = BRANCHES.find((x) => x.id === id);
    setGroups((b ? (b.groups as any[]) : []).map((g) => ({ ...g })));
    setCollapsed(false);
  }
  function pickSource(idx: number) {
    setSourceIdx(idx);
    const k = SOURCE_OPTS[idx].k;
    setGroups((gs) => gs.map((g) => (k === 0
      ? { ...g, post: 0, new: 0, manualPlan: 0 }
      : { ...g, post: Math.round(g.post * k), manualPlan: 0 })));
  }
  function calcRecommendations() {
    setGroups((gs) => gs.map((g) => ({ ...g, manualPlan: gRecommend(g) })));
    const b = BRANCHES.find((x) => x.id === branchId);
    const needProlong = Math.round(studentsTotal * (1 - FUNNEL.retention));
    const needNew = Math.round(freeTotal * 0.4);
    const needPU = Math.round(needNew / FUNNEL.visit2buy);
    setRecoMsg(
      `По филиалу «${b ? b.name : "—"}» рекомендуется план ${fmt(revenueTotal)} ₸. ` +
      `Основание: заполненность ${fillRate}%, свободно ${freeTotal} мест, средний чек ${fmt(avgChek)} ₸. ` +
      `Для выполнения: ~${needProlong} продлений, ~${needNew} новых абонементов, ~${needPU} пробных уроков.`
    );
  }

  /* ---------- обновления расходов ---------- */
  function setExpVal(idx: number, raw: string) {
    setExpenses((es) => es.map((e, i) => (i === idx ? { ...e, val: parseNum(raw) } : e)));
  }
  function setExpItemVal(idx: number, j: number, raw: string) {
    setExpenses((es) => es.map((e, i) => (i === idx ? { ...e, items: e.items.map((it: any, k: number) => (k === j ? { ...it, val: parseNum(raw) } : it)) } : e)));
  }
  function toggleExpMode(idx: number) {
    setExpenses((es) => es.map((e, i) => (i === idx ? { ...e, mode: e.mode === "auto" ? "manual" : "auto" } : e)));
  }
  function delExp(idx: number) {
    setExpenses((es) => es.filter((_, i) => i !== idx));
  }
  function toggleExpExpand(idx: number) {
    setExpExpanded((m) => ({ ...m, [idx]: !m[idx] }));
  }

  /* ---------- факт ---------- */
  function setFactVal(which: "income" | "expense", idx: number, raw: string) {
    const setter = which === "income" ? setFactIncome : setFactExpense;
    setter((arr) => arr.map((e, i) => (i === idx ? { ...e, val: parseNum(raw), manual: true, mode: "manual" } : e)));
  }
  function delFact(which: "income" | "expense", idx: number) {
    const setter = which === "income" ? setFactIncome : setFactExpense;
    setter((arr) => arr.filter((_, i) => i !== idx));
  }

  /* ---------- воронка ---------- */
  const needNew = parseNum(funnelNeed || 20);
  const needVisits = FUNNEL.visit2buy > 0 ? Math.ceil(needNew / FUNNEL.visit2buy) : 0;
  const needSignups = FUNNEL.signup2visit > 0 ? Math.ceil(needVisits / FUNNEL.signup2visit) : 0;
  const needLeads = FUNNEL.lead2signup > 0 ? Math.ceil(needSignups / FUNNEL.lead2signup) : 0;

  /* ---------- ежедневный отчёт ---------- */
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const passed = now.getDate();
  const daysLeft = Math.max(1, daysInMonth - passed);
  const dailyFact = factIncomeTotal > 0 ? factIncomeTotal : Math.round(revenueTotal * passed / daysInMonth);
  const dailyLeft = Math.max(0, revenueTotal - dailyFact);
  const perDay = Math.round(dailyLeft / daysLeft);
  const dailyPct = revenueTotal > 0 ? Math.round((dailyFact / revenueTotal) * 100) : 0;
  const forecast = passed > 0 ? Math.min(150, Math.round((dailyFact / passed) * daysInMonth / revenueTotal * 100)) : 0;
  function bonusForPct(pct: number) {
    for (const s of motScale) { if (pct >= s.from && pct < s.to) return s.bonus; }
    return motScale[motScale.length - 1].bonus;
  }
  const curBonus = bonusForPct(dailyPct);
  const foreBonus = bonusForPct(forecast);
  const salary = motOklad + foreBonus;
  const R = 52, C = 2 * Math.PI * R, ringPct = Math.min(100, dailyPct), dash = (C * ringPct) / 100;
  const ringColor = dailyPct >= 100 ? "#3a9d5d" : dailyPct >= 80 ? "#d4b46a" : dailyPct >= 50 ? "#e0a458" : "#c0654a";
  function coachMessage(pct: number) {
    if (pct >= 100) return <>Огонь! План закрыт на <b>{pct}%</b>. Держи планку — каждый день выше нормы укрепляет твой стрик и бонус.</>;
    if (pct >= 90) return <>Ты почти у цели — <b>{pct}%</b>. Осталось совсем чуть-чуть. Закрой задачи ниже и выйдешь на 100% уже сегодня.</>;
    if (pct >= 70) return <>Хороший темп, <b>{pct}%</b>. Прогноз {forecast}%. Сфокусируйся на продлениях и пробных — это твой самый быстрый рост.</>;
    if (pct >= 50) return <>Ты на половине пути — <b>{pct}%</b>. Не сбавляй. Выполни задачи дня, и прогноз пойдёт вверх.</>;
    return <>Старт положен — <b>{pct}%</b>. Главное сейчас — ритм. Закрывай по 2-3 задачи в день, и план станет реальным.</>;
  }
  const dailyTasks = useMemo(() => {
    const needProlong = Math.max(1, Math.round(studentsTotal * (1 - FUNNEL.retention) / daysLeft * 3));
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

  /* ---------- AI ---------- */
  const factPrevSum = groups.reduce((s, g) => s + g.factPrev, 0);
  const factPrev2Sum = groups.reduce((s, g) => s + g.factPrev2, 0);
  const aiFact = factIncomeTotal > 0 ? factIncomeTotal : Math.round(revenueTotal * 0.53);
  const aiPct = revenueTotal > 0 ? Math.round((aiFact / revenueTotal) * 100) : 0;
  const devPrev = factPrevSum > 0 ? Math.round(((revenueTotal - factPrevSum) / factPrevSum) * 100) : 0;
  const devPrev2 = factPrev2Sum > 0 ? Math.round(((revenueTotal - factPrev2Sum) / factPrev2Sum) * 100) : 0;
  const worst = useMemo(() => {
    let w: any = null;
    groups.forEach((g) => {
      const fill = g.max > 0 ? gStudents(g) / g.max : 1;
      if (!w || fill < w.fill) w = { g, fill };
    });
    return w;
  }, [groups]);
  const prob = Math.max(40, Math.min(98, aiPct + Math.round((100 - fillRate) / -3) + 45));

  /* ---------- мотивация ---------- */
  const motCurBonus = motScale[motStep] ? motScale[motStep].bonus : 0;
  const motSalary = motOklad + motCurBonus;

  /* ---------- разбивка сводки ---------- */
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

  function branchRevenue(b: any) {
    return (b.groups || []).reduce((s: number, g: any) => s + (g.manualPlan > 0 ? g.manualPlan : g.chek * (g.post + g.new)), 0);
  }
  const scopeRevenue = summaryScope === "all"
    ? BRANCHES.reduce((s, b) => s + branchRevenue(b), 0)
    : summaryScope === branchId ? revenueTotal : branchRevenue(BRANCHES.find((x) => x.id === summaryScope) || { groups: [] });
  const scopeExpense = expenseTotal;
  const scopeProfit = scopeRevenue - scopeExpense;
  const scopeMargin = scopeRevenue > 0 ? Math.round((scopeProfit / scopeRevenue) * 100) : 0;

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
          <span className="bdr-status" style={{ background: "var(--gold-bg)", color: "var(--gold-c)" }}>БДР · черновик</span>
          <button className="btn btn-brand">+ Создать БДР</button>
          <button className="btn btn-secondary">История</button>
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
              <select className="period-sel" style={{ fontSize: 12, padding: "5px 10px" }} value={summaryScope} onChange={(e) => setSummaryScope(e.target.value)}>
                <option value="all">Вся сеть</option>
                {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div className="sum-row" onClick={() => setSummaryDetail(summaryDetail === "rev" ? null : "rev")}>
                <span className="lbl">Выручка</span><span className="val" style={{ color: "var(--heading)" }}>{fmt(scopeRevenue)} ₸</span>
              </div>
              <div className="sum-row" onClick={() => setSummaryDetail(summaryDetail === "exp" ? null : "exp")}>
                <span className="lbl">Расходы</span><span className="val" style={{ color: "var(--red)" }}>{fmt(scopeExpense)} ₸</span>
              </div>
              <div className="sum-row" onClick={() => setSummaryDetail(summaryDetail === "pro" ? null : "pro")}>
                <span className="lbl">Ожидаемая прибыль · {scopeMargin}%</span><span className="val" style={{ color: "var(--green)" }}>{fmt(scopeProfit)} ₸</span>
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
                {summaryDetail === "pro" && <><b>Прибыль = Выручка − Расходы</b><br />{fmt(scopeRevenue)} − {fmt(scopeExpense)} = {fmt(scopeProfit)} ₸</>}
              </div>
            )}
          </div>
        </div>

        {/* Источник плана */}
        <div className="source-card">
          <div className="source-title">Создать план на основе</div>
          <div className="source-sub">CRM автоматически подставит цифры. Любую сумму можно изменить вручную.</div>
          <div className="source-opts">
            {SOURCE_OPTS.map((o, i) => (
              <div key={i} className={"source-opt" + (sourceIdx === i ? " on" : "")} onClick={() => pickSource(i)}>
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
              <select className="period-sel" value={branchId} onChange={(e) => onBranchChange(e.target.value)}>
                {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className="btn btn-secondary" style={{ padding: "7px 12px", fontSize: 12 }}>+ Открыть направление</button>
              <button className="btn btn-brand" style={{ padding: "7px 12px", fontSize: 12 }} onClick={calcRecommendations}>✦ Рассчитать рекомендации</button>
              <span className="mode-pill auto"><span className="auto-dot" />авто из абонементов</span>
            </div>
          </div>
          {/* Шапка филиала */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--gold-bg)", borderRadius: 12, margin: 14, cursor: "pointer" }} onClick={() => setCollapsed((c) => !c)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, display: "inline-block", transform: `rotate(${collapsed ? "-90deg" : "0"})` }}>▾</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--heading)" }}>{BRANCHES.find((b) => b.id === branchId)?.name || "—"}</div>
                <div style={{ fontSize: 11.5, color: "var(--text2)" }}>{groups.length} групп · {studentsTotal} учеников · заполненность {fillRate}%</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, textAlign: "right", fontSize: 12 }}>
              <div><div style={{ color: "var(--text2)" }}>Выручка</div><div style={{ fontWeight: 800, color: "var(--heading)" }}>{fmt(revenueTotal)}</div></div>
              <div><div style={{ color: "var(--text2)" }}>Расходы</div><div style={{ fontWeight: 800, color: "var(--red)" }}>{fmt(expenseTotal)}</div></div>
              <div><div style={{ color: "var(--text2)" }}>Прибыль</div><div style={{ fontWeight: 800, color: "var(--green)" }}>{fmt(planProfit)}</div></div>
            </div>
          </div>
          {!collapsed && (groups.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text2)", fontSize: 13 }}>Группы этого филиала ещё не подтянулись из вкладки «Группы». Выберите другой филиал.</div>
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
          <div className="tree-head"><h3>Расходы</h3><button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>+ Категория</button></div>
          <table>
            <thead><tr><th>Категория</th><th className="num">План, ₸</th><th className="num">Режим</th><th /></tr></thead>
            <tbody>
              {expenses.map((e, idx) => {
                const hasItems = e.items && e.items.length;
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
                          : <input value={e.val || 0} onChange={(ev) => setExpVal(idx, ev.target.value)} />}
                      </td>
                      <td className="num"><span className={"mode-pill " + (e.mode || "manual")} style={{ cursor: "pointer" }} onClick={() => toggleExpMode(idx)}>{e.mode === "auto" ? "авто" : "вручную"}</span></td>
                      <td className="num"><span style={{ cursor: "pointer", color: "var(--text2)", fontWeight: 700, padding: "0 6px" }} onClick={() => delExp(idx)}>✕</span></td>
                    </tr>
                    {hasItems && open && e.items.map((it: any, j: number) => (
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
            <div className="funnel-arrow">↓ конверсия пробный→покупка {Math.round(FUNNEL.visit2buy * 100)}%</div>
            <div className="funnel-step"><span>Провести пробных уроков</span><b>{needVisits}</b></div>
            <div className="funnel-arrow">↓ запись→приход {Math.round(FUNNEL.signup2visit * 100)}%</div>
            <div className="funnel-step"><span>Записать на пробный</span><b>{needSignups}</b></div>
            <div className="funnel-arrow">↓ лид→запись {Math.round(FUNNEL.lead2signup * 100)}%</div>
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
      </div>

      {/* ============ ФАКТ БДР ============ */}
      <div className={"panel" + (tab === "fact" ? " active" : "")}>
        <div className="bdr-summary">
          <div className="sum-card" style={{ gridColumn: "1 / -1" }}>
            <h4><span>Факт БДР · {curPeriodLabel}</span><span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>авто из CRM</span></h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div className="sum-row"><span className="lbl">Поступления</span><span className="val" style={{ color: "var(--heading)" }}>{fmt(factIncomeTotal)} ₸</span></div>
              <div className="sum-row"><span className="lbl">Расходы</span><span className="val" style={{ color: "var(--red)" }}>{fmt(factExpenseTotal)} ₸</span></div>
              <div className="sum-row"><span className="lbl">Прибыль · {factIncomeTotal > 0 ? Math.round((factIncomeTotal - factExpenseTotal) / factIncomeTotal * 100) : 0}%</span><span className="val" style={{ color: "var(--green)" }}>{fmt(factIncomeTotal - factExpenseTotal)} ₸</span></div>
            </div>
          </div>
        </div>
        <div className="slabel">Поступления · автоматически из CRM</div>
        <div className="tree-card"><FactTable which="income" col="Источник" rows={factIncome} onVal={setFactVal} onDel={delFact} /></div>
        <div className="slabel">Расходы (факт) · из Бухгалтерии</div>
        <div className="tree-card"><FactTable which="expense" col="Категория" rows={factExpense} onVal={setFactVal} onDel={delFact} /></div>
      </div>

      {/* ============ ПЛАН / ФАКТ ============ */}
      <div className={"panel" + (tab === "pf" ? " active" : "")}>
        <div className="slabel">Выполнение плана · по уровням</div>
        <div className="tree-card">
          <table>
            <thead><tr><th>Уровень</th><th className="num">План</th><th className="num">Факт</th><th className="num">Отклонение</th><th className="num">Выполнение</th></tr></thead>
            <tbody>
              {PF_DATA.map((r, i) => {
                const dev = r.fact - r.plan, pct = Math.round((r.fact / r.plan) * 100);
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
              })}
            </tbody>
          </table>
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
          <DailyCard lbl="Потенциальная ЗП" val={fmt(salary)} cls="green" />
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
        <div className="slabel" style={{ marginTop: 18 }}>Заработок управляющего</div>
        <div className="daily-grid">
          <DailyCard lbl="Оклад" val={fmt(motOklad)} />
          <DailyCard lbl={`Текущий бонус (${dailyPct}%)`} val={fmt(curBonus)} cls="brand" />
          <DailyCard lbl={`Прогноз бонуса (${forecast}%)`} val={fmt(foreBonus)} cls="green" />
          <DailyCard lbl="Итого к выплате" val={fmt(salary)} cls="green" />
        </div>
      </div>

      {/* ============ AI АНАЛИТИКА ============ */}
      <div className={"panel" + (tab === "ai" ? " active" : "")}>
        <div className="ai-prob">
          <div className="ai-prob-circle"><span>{prob}%</span></div>
          <div className="ai-prob-text">
            <h4>Вероятность выполнения плана — {prob}%</h4>
            <p>План {fmt(revenueTotal)} ₸. Заполненность сети {fillRate}%.</p>
          </div>
        </div>
        <div className="ai-card">
          <div className="ai-lbl">✦ AI-аналитик · {curPeriodLabel}</div>
          <div className="ai-text">
            <p>📊 План {devPrev >= 0 ? "выше" : "ниже"} прошлого месяца на {Math.abs(devPrev)}%, {devPrev2 >= 0 ? "выше" : "ниже"} позапрошлого на {Math.abs(devPrev2)}%.</p>
            <p>📉 {worst ? `Основное отклонение — группа «${worst.g.name}» (заполнена на ${Math.round(worst.fill * 100)}%).` : ""}</p>
            <p>💰 Свободно {freeTotal} мест · средний чек {fmt(avgChek)} ₸ — есть потенциал дозагрузки.</p>
          </div>
        </div>
        <div className="ai-recs">
          <h4>Рекомендации для выполнения плана</h4>
          {dailyTasks.map((t) => (
            <div key={t.id} className="rec-item"><div className="rec-check">✓</div><div className="rec-text">{t.text}</div></div>
          ))}
        </div>
      </div>

      {/* ============ МОТИВАЦИЯ ============ */}
      <div className={"panel" + (tab === "mot" ? " active" : "")}>
        <div className="slabel">Настройки мотивации · полностью редактируются владельцем</div>
        <div className="mot-card">
          <div className="mot-head">
            <div className="mot-mgr">
              <div className="mot-avatar">АН</div>
              <div>
                <div className="mot-name">Анель Нурбекова</div>
                <div className="mot-branch">Астана 203 · оклад <input className="inline-input" style={{ width: 90, textAlign: "left" }} value={motOklad} onChange={(e) => setMotOklad(parseNum(e.target.value))} /> ₸</div>
              </div>
            </div>
            <div className="mot-salary"><div className="mot-salary-lbl">Прогноз ЗП</div><div className="mot-salary-val">{fmt(motSalary)} ₸</div></div>
          </div>
          <div className="kpi-ladder">
            {motScale.map((s, i) => (
              <div key={i} className={"ladder-step" + (i === motStep ? " current" : i < motStep ? " reached" : "")} onClick={() => setMotStep(i)}>
                <div className="ladder-pct">{s.to >= 999 ? s.from + "%+" : s.from + "–" + (s.to - 1) + "%"}</div>
                <input className="ladder-input" value={s.bonus} onClick={(e) => e.stopPropagation()} onChange={(e) => setMotScale((sc) => sc.map((x, k) => (k === i ? { ...x, bonus: parseNum(e.target.value) } : x)))} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 10 }}>Все суммы редактируются. Кликните на ступень, чтобы выбрать текущее выполнение.</div>
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
function FactTable({ which, col, rows, onVal, onDel }: any) {
  const total = rows.reduce((s: number, x: any) => s + (+x.val || 0), 0);
  return (
    <table style={{ width: "100%" }}>
      <thead><tr><th style={{ textAlign: "left" }}>{col}</th><th className="num">Факт, ₸</th><th className="num">Режим</th><th /></tr></thead>
      <tbody>
        {rows.map((e: any, idx: number) => (
          <tr key={idx} className="tree-row lvl1">
            <td>{e.name}{e.manual ? <span style={{ fontSize: 10, color: "var(--gold-c)" }} title="Изменено вручную"> ✎ вручную</span> : null}</td>
            <td className="num editable-cell"><input value={e.val} onChange={(ev) => onVal(which, idx, ev.target.value)} /></td>
            <td className="num"><span className={"mode-pill " + e.mode}>{e.mode === "auto" ? "авто" : "вручную"}</span></td>
            <td className="num"><span style={{ cursor: "pointer", color: "var(--text2)", fontWeight: 700, padding: "0 6px" }} onClick={() => onDel(which, idx)}>✕</span></td>
          </tr>
        ))}
        <tr style={{ borderTop: "2px solid var(--border-c)" }}>
          <td style={{ fontWeight: 700 }}>Итого</td>
          <td className="num" style={{ fontWeight: 800 }}>{fmt(total)}</td>
          <td colSpan={2} />
        </tr>
      </tbody>
    </table>
  );
}

export default PlanningProtoView;
