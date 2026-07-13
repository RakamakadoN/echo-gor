import { useMemo, useState } from "react";
import "./accounting-proto.css";

/* ===== MOCK-ДАННЫЕ (перенесены из прототипа) ===== */
const PERIOD_DEFAULT = "Июнь 2026";

const INCOMES_SEED: any[] = [
  { date: "2026-06-03", sum: 120000, acc: "Наличные", dir: "Абонементы", pay: "Наличные", branch: "Эхо Гор Чокина 109/1", period: "Июнь 2026", note: "Абонементы наличными" },
  { date: "2026-06-10", sum: 360000, acc: "Kaspi Pay", dir: "Абонементы", pay: "Kaspi Pay", branch: "Эхо Гор Чокина 109/1", period: "Июнь 2026", note: "Абонементы Kaspi" },
  { date: "2026-06-14", sum: 45000, acc: "Наличные", dir: "Товары", pay: "Наличные", branch: "Сатпаева 210/1", period: "Июнь 2026", note: "Продажа формы" },
  { date: "2026-06-20", sum: 150000, acc: "Расчётный счёт", dir: "Выступления", pay: "Расчётный счёт", branch: "Эхо Гор Чокина 109/1", period: "Июнь 2026", note: "Банкет" },
];

const RECON: any[] = [
  { dir: "Абонементы — наличные", crm: 120000, fact: 120000 },
  { dir: "Абонементы — Kaspi Pay", crm: 380000, fact: 360000 },
  { dir: "Товары", crm: 45000, fact: 45000 },
  { dir: "Выступления", crm: 200000, fact: 150000 },
];

const EXPENSES_SEED: any[] = [
  { payDate: "2026-05-25", period: "Июнь 2026", sum: 200000, acc: "Расчётный счёт", cat: "Аренда", branch: "Эхо Гор Чокина 109/1", status: "Проведён", note: "Аренда филиала за июнь" },
  { payDate: "2026-06-05", period: "Июнь 2026", sum: 180000, acc: "Kaspi Pay", cat: "Зарплата", branch: "Вся сеть", status: "Проведён", note: "Аванс педагогам" },
  { payDate: "2026-06-08", period: "Июнь 2026", sum: 60000, acc: "Kaspi Pay", cat: "Реклама", branch: "Вся сеть", status: "Проведён", note: "Таргет Instagram" },
  { payDate: "2026-06-12", period: "Июнь 2026", sum: 25000, acc: "Наличные", cat: "Коммунальные", branch: "Сатпаева 210/1", status: "Проведён", note: "Свет, вода" },
  { payDate: "2026-06-18", period: "Июнь 2026", sum: 40000, acc: "Наличные", cat: "Костюмы", branch: "Эхо Гор Чокина 109/1", status: "Черновик", note: "Костюмы к концерту (не проведено)" },
  { payDate: "2026-05-20", period: "Май 2026", sum: 200000, acc: "Расчётный счёт", cat: "Аренда", branch: "Эхо Гор Чокина 109/1", status: "Проведён", note: "Аренда за май" },
  { payDate: "2026-05-06", period: "Май 2026", sum: 150000, acc: "Kaspi Pay", cat: "Зарплата", branch: "Вся сеть", status: "Проведён", note: "ЗП май" },
];

const REQUESTS_SEED: any[] = [
  { id: 1, date: "2026-06-15", branch: "Сатпаева 210/1", type: "Расход", cat: "Ремонт", reason: "Замена зеркала в зале", sum: 35000, urgency: "Высокая", status: "на рассмотрении", student: "", group: "", posted: false },
  { id: 2, date: "2026-06-11", branch: "Эхо Гор Чокина 109/1", type: "Возврат", cat: "Абонемент", reason: "Возврат за неиспользованный абонемент", sum: 12000, urgency: "Средняя", status: "на рассмотрении", student: "Карина Ахметова", group: "Соло", posted: false },
  { id: 3, date: "2026-06-09", branch: "Сатпаева 210/1", type: "Расход", cat: "Материалы", reason: "Коврики для разминки", sum: 18000, urgency: "Низкая", status: "запрошено уточнение", student: "", group: "", posted: false },
];

const RETURNS_SEED: any[] = [
  { date: "2026-06-22", period: "Июнь 2026", sum: 8000, acc: "Kaspi Pay", branch: "Эхо Гор Чокина 109/1", student: "Дамир Сериков", group: "Малыши", reason: "Возврат части абонемента" },
];

const TAXES_SEED: any[] = [
  { period: "Июнь 2026", name: "ИПН (с ФОТ)", base: 330000, rate: 10, sum: 33000, status: "Начислен", due: "2026-07-15", branch: "Вся сеть" },
  { period: "Июнь 2026", name: "Соц. отчисления", base: 330000, rate: 3.5, sum: 11550, status: "Начислен", due: "2026-07-15", branch: "Вся сеть" },
  { period: "Май 2026", name: "ИПН (с ФОТ)", base: 300000, rate: 10, sum: 30000, status: "Оплачен", due: "2026-06-15", branch: "Вся сеть" },
];

const MONTH_REVENUE: any = { "Апрель 2026": 590000, "Май 2026": 620000, "Июнь 2026": 675000 };

const HISTORY_SEED: any[] = [
  { time: "2026-06-15 10:24", who: "Владелец", action: "Добавлен расход", detail: "Аренда · 200 000 ₸ · период Июнь 2026" },
];

const ACCOUNTS_SEED: any[] = [
  { name: "Kaspi Pay", icon: "💳", start: 540000, archived: false },
  { name: "Наличные", icon: "💵", start: 210000, archived: false },
  { name: "Расчётный счёт", icon: "🏦", start: 880000, archived: false },
];
const CATEGORIES_SEED = ["Аренда", "Зарплата", "Реклама", "Коммунальные", "Ремонт", "Материалы", "Костюмы", "Налоги", "Товары / форма", "Прочее"];
const DIRECTIONS_SEED = ["Абонементы", "Товары", "Выступления", "Другое"];
const BRANCHES_SEED = ["Эхо Гор Чокина 109/1", "Сатпаева 210/1"];

/* ===== HELPERS ===== */
const money = (n: number) => Math.round(n).toLocaleString("ru-RU") + " ₸";
const nowStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const validNum = (v: any) => {
  const n = parseInt(v, 10);
  return !isNaN(n) && n > 0 ? n : null;
};
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/* ===== ИКОНКИ ===== */
const StarIcon = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
  </svg>
);
const SearchIcon = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={16} height={16}>
    <circle cx={11} cy={11} r={8} />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export function AccountingProtoView() {
  /* ===== STATE ===== */
  const [period, setPeriod] = useState(PERIOD_DEFAULT);
  const [fBranch, setFBranch] = useState("");
  const [fAccount, setFAccount] = useState("");
  const [view, setView] = useState<"ops" | "req" | "an" | "set" | "tax" | "hist">("ops");

  const [INCOMES, setINCOMES] = useState<any[]>(INCOMES_SEED);
  const [EXPENSES, setEXPENSES] = useState<any[]>(EXPENSES_SEED);
  const [REQUESTS, setREQUESTS] = useState<any[]>(REQUESTS_SEED);
  const [RETURNS, setRETURNS] = useState<any[]>(RETURNS_SEED);
  const [TAXES, setTAXES] = useState<any[]>(TAXES_SEED);
  const [HISTORY, setHISTORY] = useState<any[]>(HISTORY_SEED);

  const [ACCOUNTS, setACCOUNTS] = useState<any[]>(ACCOUNTS_SEED);
  const [CATEGORIES, setCATEGORIES] = useState<string[]>(CATEGORIES_SEED);
  const [DIRECTIONS, setDIRECTIONS] = useState<string[]>(DIRECTIONS_SEED);
  const [BRANCHES, setBRANCHES] = useState<string[]>(BRANCHES_SEED);

  const [nextReqId, setNextReqId] = useState(4);

  const [toasts, setToasts] = useState<any[]>([]);
  let toastSeq = 0;
  const toast = (msg: string, type?: string) => {
    const id = Date.now() + ++toastSeq;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const logHistory = (action: string, detail: string) => {
    setHISTORY((prev) => [{ time: nowStr(), who: "Владелец", action, detail }, ...prev]);
  };

  /* ops-фильтры */
  const [opsSearch, setOpsSearch] = useState("");
  const [opsType, setOpsType] = useState("");
  const [opsAcc, setOpsAcc] = useState("");
  const [opsCat, setOpsCat] = useState("");
  const [opsStatus, setOpsStatus] = useState("");

  /* модалки */
  const [expOpen, setExpOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);

  /* поля формы расхода */
  const [eDate, setEDate] = useState("");
  const [ePeriod, setEPeriod] = useState("Июнь 2026");
  const [eSum, setESum] = useState("");
  const [eAcc, setEAcc] = useState("");
  const [eCat, setECat] = useState("");
  const [eBranch, setEBranch] = useState("Вся сеть");
  const [eStatus, setEStatus] = useState("Проведён");
  const [eNote, setENote] = useState("");

  /* поля формы поступления */
  const [iDate, setIDate] = useState("");
  const [iSum, setISum] = useState("");
  const [iAcc, setIAcc] = useState("");
  const [iDir, setIDir] = useState("");
  const [iPay, setIPay] = useState("Наличные");
  const [iBranch, setIBranch] = useState("");
  const [iNote, setINote] = useState("");

  /* поля формы заявки */
  const [rType, setRType] = useState("Расход");
  const [rSum, setRSum] = useState("");
  const [rBranch, setRBranch] = useState("");
  const [rCat, setRCat] = useState("");
  const [rUrg, setRUrg] = useState("Низкая");
  const [rStudent, setRStudent] = useState("");
  const [rGroup, setRGroup] = useState("");
  const [rReason, setRReason] = useState("");

  /* рассмотрение заявки */
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const [revAcc, setRevAcc] = useState("");
  const [revPeriod, setRevPeriod] = useState("Июнь 2026");
  const [revNote, setRevNote] = useState("");

  /* поля формы налога */
  const [txName, setTxName] = useState("");
  const [txPeriod, setTxPeriod] = useState("Июнь 2026");
  const [txDue, setTxDue] = useState("2026-07-15");
  const [txBase, setTxBase] = useState("");
  const [txRate, setTxRate] = useState("");
  const [txSum, setTxSum] = useState("");
  const [txBranch, setTxBranch] = useState("Вся сеть");

  /* ===== ВЫЧИСЛЕНИЯ ===== */
  const activeAccounts = () => ACCOUNTS.filter((a) => !a.archived);
  const inBranch = (b: string) => !fBranch || b === fBranch || b === "Вся сеть";
  const returnsOf = (p: string) => RETURNS.filter((r) => r.period === p && inBranch(r.branch)).reduce((s, r) => s + r.sum, 0);
  const grossRevenueOf = (p: string) => INCOMES.filter((i) => i.period === p && inBranch(i.branch)).reduce((s, i) => s + i.sum, 0);
  const revenueOf = (p: string) => grossRevenueOf(p) - returnsOf(p);
  const expenseOf = (p: string) => EXPENSES.filter((e) => e.period === p && e.status === "Проведён" && inBranch(e.branch)).reduce((s, e) => s + e.sum, 0);

  const rev = revenueOf(period);
  const exp = expenseOf(period);
  const profit = rev - exp;
  const margin = rev ? (profit / rev) * 100 : 0;
  const ret = returnsOf(period);

  /* ===== СОХРАНЕНИЕ РАСХОДА ===== */
  const openExp = () => {
    setEDate("2026-06-25"); setEPeriod("Июнь 2026"); setESum(""); setENote("");
    setEAcc(activeAccounts()[0]?.name || ""); setECat(CATEGORIES[0] || ""); setEBranch("Вся сеть"); setEStatus("Проведён");
    setExpOpen(true);
  };
  const saveExp = () => {
    const sum = validNum(eSum);
    if (!sum) return toast("Сумма должна быть больше нуля", "err");
    if (!validDate(eDate)) return toast("Укажите корректную дату оплаты", "err");
    if (!eAcc) return toast("Выберите счёт списания", "err");
    if (!eCat) return toast("Выберите категорию", "err");
    setEXPENSES((prev) => [...prev, { payDate: eDate, period: ePeriod, sum, acc: eAcc, cat: eCat, branch: eBranch, status: eStatus, note: eNote }]);
    logHistory("Добавлен расход", `${eCat} · ${money(sum)} · период ${ePeriod} · ${eStatus}`);
    toast("Расход добавлен: " + money(sum) + " (" + eCat + ", период " + ePeriod + ")");
    setExpOpen(false);
  };

  /* ===== СОХРАНЕНИЕ ПОСТУПЛЕНИЯ ===== */
  const openInc = () => {
    setIDate("2026-06-25"); setISum(""); setINote("");
    setIAcc(activeAccounts()[0]?.name || ""); setIDir(DIRECTIONS[0] || ""); setIPay("Наличные"); setIBranch(BRANCHES[0] || "");
    setIncOpen(true);
  };
  const saveInc = () => {
    const sum = validNum(iSum);
    if (!sum) return toast("Сумма должна быть больше нуля", "err");
    if (!validDate(iDate)) return toast("Укажите корректную дату", "err");
    if (!iAcc) return toast("Выберите счёт", "err");
    setINCOMES((prev) => [...prev, { date: iDate, sum, acc: iAcc, dir: iDir, pay: iPay, branch: iBranch, period, note: iNote }]);
    logHistory("Добавлено поступление", `${iDir} · ${money(sum)} · счёт ${iAcc}`);
    toast("Поступление добавлено: " + money(sum));
    setIncOpen(false);
  };

  /* ===== ЗАЯВКА ===== */
  const openReq = () => {
    setRType("Расход"); setRSum(""); setRReason(""); setRStudent(""); setRGroup("");
    setRBranch(BRANCHES[0] || ""); setRCat(CATEGORIES[0] || ""); setRUrg("Низкая");
    setReqOpen(true);
  };
  const saveReq = () => {
    const sum = validNum(rSum);
    if (!sum) return toast("Сумма должна быть больше нуля", "err");
    const isReturn = rType === "Возврат";
    if (isReturn && !rStudent.trim()) return toast("Для возврата укажите ученика", "err");
    setREQUESTS((prev) => [
      {
        id: nextReqId, date: nowStr().slice(0, 10), branch: rBranch, type: rType, cat: rCat,
        reason: rReason || "—", sum, urgency: rUrg, status: "на рассмотрении",
        student: isReturn ? rStudent || "" : "", group: isReturn ? rGroup || "" : "", posted: false,
      },
      ...prev,
    ]);
    setNextReqId((n) => n + 1);
    logHistory("Создана заявка", `${rType} · ${money(sum)} · ${rBranch}`);
    toast("Заявка отправлена владельцу: " + rType + " " + money(sum));
    setReqOpen(false);
    setView("req");
  };

  /* ===== РАССМОТРЕНИЕ ЗАЯВКИ ===== */
  const openReview = (i: number) => {
    setReviewIdx(i);
    setRevAcc(activeAccounts()[0]?.name || "");
    setRevPeriod("Июнь 2026");
    setRevNote("");
    setRevOpen(true);
  };
  const closeReview = () => { setRevOpen(false); setReviewIdx(null); };
  const decideReq = (action: string) => {
    if (reviewIdx === null) return;
    const r = REQUESTS[reviewIdx];
    if (r.posted) { toast("Заявка уже проведена — повторное проведение запрещено", "err"); return; }
    if (action === "reject") {
      setREQUESTS((prev) => prev.map((x, idx) => (idx === reviewIdx ? { ...x, status: "отклонено" } : x)));
      logHistory("Заявка отклонена", `${r.type} · ${money(r.sum)} · ${r.branch}`);
      toast("Заявка отклонена"); closeReview(); setView("req"); return;
    }
    if (action === "clarify") {
      setREQUESTS((prev) => prev.map((x, idx) => (idx === reviewIdx ? { ...x, status: "запрошено уточнение" } : x)));
      logHistory("Запрошено уточнение", `${r.type} · ${money(r.sum)} · ${r.branch}`);
      toast("Запрошено уточнение у управляющего"); closeReview(); setView("req"); return;
    }
    // approve
    if (!revAcc) { toast("Выберите счёт", "err"); return; }
    if (r.type === "Возврат") {
      setRETURNS((prev) => [...prev, { date: nowStr().slice(0, 10), period: revPeriod, sum: r.sum, acc: revAcc, branch: r.branch, student: r.student || "", group: r.group || "", reason: r.reason, fromRequest: true }]);
      logHistory("Проведён возврат", `${money(r.sum)} · ${r.student || "—"} · счёт ${revAcc} · период ${revPeriod}`);
      toast("Возврат начислен: " + money(r.sum) + " со счёта " + revAcc);
    } else {
      const note = r.reason + (revNote ? " · " + revNote : "");
      setEXPENSES((prev) => [...prev, { payDate: nowStr().slice(0, 10), period: revPeriod, sum: r.sum, acc: revAcc, branch: r.branch, cat: r.cat, status: "Проведён", note, fromRequest: true }]);
      logHistory("Проведён расход по заявке", `${r.cat} · ${money(r.sum)} · счёт ${revAcc} · период ${revPeriod}`);
      toast("Расход проведён: " + money(r.sum) + " со счёта " + revAcc);
    }
    setREQUESTS((prev) => prev.map((x, idx) => (idx === reviewIdx ? { ...x, status: "выплачено / начислено", posted: true } : x)));
    closeReview(); setView("req");
  };

  /* ===== НАСТРОЙКИ ===== */
  const addItem = (listName: string, promptText: string) => {
    const v = window.prompt(promptText + ":");
    if (!v || !v.trim()) return;
    const val = v.trim();
    if (listName === "CATEGORIES") setCATEGORIES((p) => [...p, val]);
    else if (listName === "DIRECTIONS") setDIRECTIONS((p) => [...p, val]);
    else if (listName === "BRANCHES") setBRANCHES((p) => [...p, val]);
    logHistory("Добавлено в настройки", val); toast("Добавлено: " + val); setView("set");
  };
  const delItem = (listName: string, i: number) => {
    const arr = listName === "CATEGORIES" ? CATEGORIES : listName === "DIRECTIONS" ? DIRECTIONS : BRANCHES;
    const name = arr[i];
    const setter = listName === "CATEGORIES" ? setCATEGORIES : listName === "DIRECTIONS" ? setDIRECTIONS : setBRANCHES;
    setter((p) => p.filter((_, idx) => idx !== i));
    logHistory("Удалено из настроек", name); toast("Удалено: " + name); setView("set");
  };
  const addAccount = () => {
    const name = window.prompt("Название счёта:");
    if (!name || !name.trim()) return;
    const icon = window.prompt("Эмодзи-иконка (например 💳):", "💳") || "💳";
    const start = parseInt(window.prompt("Стартовый остаток, ₸:", "0") || "0", 10) || 0;
    setACCOUNTS((p) => [...p, { name: name.trim(), icon: icon.trim() || "💳", start, archived: false }]);
    logHistory("Добавлен счёт", `${name.trim()} · старт ${money(start)}`);
    toast("Счёт добавлен: " + name.trim()); setView("set");
  };
  const archiveAccount = (i: number) => {
    setACCOUNTS((p) => p.map((a, idx) => (idx === i ? { ...a, archived: true } : a)));
    logHistory("Счёт в архив", ACCOUNTS[i].name);
    toast("Счёт «" + ACCOUNTS[i].name + "» в архиве — операции сохранены, но новые на него нельзя"); setView("set");
  };
  const unarchiveAccount = (i: number) => {
    setACCOUNTS((p) => p.map((a, idx) => (idx === i ? { ...a, archived: false } : a)));
    logHistory("Счёт возвращён из архива", ACCOUNTS[i].name); toast("Счёт возвращён"); setView("set");
  };
  const delAccount = (i: number) => {
    const name = ACCOUNTS[i].name;
    if (!window.confirm("Удалить счёт «" + name + "»? По нему нет операций.")) return;
    setACCOUNTS((p) => p.filter((_, idx) => idx !== i));
    logHistory("Удалён счёт", name); toast("Счёт удалён: " + name); setView("set");
  };

  /* ===== НАЛОГИ ===== */
  const openTax = () => {
    setTxName(""); setTxBase(""); setTxRate(""); setTxSum(""); setTxDue("2026-07-15"); setTxPeriod("Июнь 2026"); setTxBranch("Вся сеть");
    setTaxOpen(true);
  };
  const calcTax = (base: string, rate: string) => {
    const b = parseFloat(base) || 0, r = parseFloat(rate) || 0;
    if (b && r) setTxSum(String(Math.round((b * r) / 100)));
  };
  const saveTax = () => {
    const name = txName.trim();
    if (!name) return toast("Введите название налога", "err");
    const sum = validNum(txSum);
    if (!sum) return toast("Введите сумму налога", "err");
    if (!validDate(txDue)) return toast("Укажите срок уплаты", "err");
    setTAXES((prev) => [...prev, { period: txPeriod, name, base: parseFloat(txBase) || 0, rate: parseFloat(txRate) || 0, sum, status: "Начислен", due: txDue, branch: txBranch }]);
    logHistory("Добавлен налог", `${name} · ${money(sum)} · период ${txPeriod}`);
    toast("Налог добавлен: " + name + " " + money(sum));
    setTaxOpen(false); setView("tax");
  };
  const payTax = (i: number) => {
    const t = TAXES[i];
    if (t.status === "Оплачен") return;
    setEXPENSES((prev) => [...prev, { payDate: nowStr().slice(0, 10), period: t.period, sum: t.sum, acc: activeAccounts()[0]?.name || "Расчётный счёт", cat: "Налоги", branch: t.branch, status: "Проведён", note: t.name }]);
    setTAXES((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "Оплачен" } : x)));
    logHistory("Оплачен налог", `${t.name} · ${money(t.sum)} · период ${t.period}`);
    toast("Налог оплачен и проведён в расходы: " + t.name + " " + money(t.sum));
    setView("tax");
  };

  /* ===== ФИЛЬТРАЦИЯ ОПЕРАЦИЙ ===== */
  const opsData = useMemo(() => {
    const q = opsSearch.toLowerCase().trim();
    let rows: any[] = [];
    EXPENSES.filter((e) => e.period === period && inBranch(e.branch)).forEach((e) => rows.push({ ...e, kind: "exp", _status: e.status, _label: e.cat, _date: e.payDate }));
    INCOMES.filter((i) => i.period === period && inBranch(i.branch)).forEach((i) => rows.push({ ...i, kind: "inc", _status: "Поступило", _label: i.dir, _date: i.date }));
    RETURNS.filter((r) => r.period === period && inBranch(r.branch)).forEach((r) => rows.push({ ...r, kind: "ret", _status: "Возврат", _label: "Возврат", _date: r.date }));
    rows = rows.filter((o) => {
      if (opsType && o.kind !== opsType) return false;
      if (opsAcc && o.acc !== opsAcc) return false;
      if (opsCat && o._label !== opsCat) return false;
      if (opsStatus && o._status !== opsStatus) return false;
      if (q) {
        const hay = [String(o.sum), o.note || "", o._label, o.acc, o.branch, o._status, o.student || ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    rows.sort((a, b) => (a._date > b._date ? -1 : 1));
    const inSum = rows.filter((o) => o.kind === "inc").reduce((s, o) => s + o.sum, 0);
    const outSum = rows.filter((o) => o.kind === "exp").reduce((s, o) => s + o.sum, 0);
    const retSum = rows.filter((o) => o.kind === "ret").reduce((s, o) => s + o.sum, 0);
    return { rows, inSum, outSum, retSum };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [EXPENSES, INCOMES, RETURNS, period, fBranch, opsSearch, opsType, opsAcc, opsCat, opsStatus]);
  const resetOpsFilters = () => { setOpsSearch(""); setOpsType(""); setOpsAcc(""); setOpsCat(""); setOpsStatus(""); };

  /* ===== АНАЛИТИКА ===== */
  const profitByMonth = (m: string) => {
    const grossRev = INCOMES.filter((i) => i.period === m).reduce((s, i) => s + i.sum, 0) || MONTH_REVENUE[m] || 0;
    const rr = RETURNS.filter((r) => r.period === m).reduce((s, r) => s + r.sum, 0);
    const ex = EXPENSES.filter((e) => e.period === m && e.status === "Проведён").reduce((s, e) => s + e.sum, 0);
    return { gross: grossRev, ret: rr, rev: grossRev - rr, exp: ex, profit: grossRev - rr - ex };
  };
  const anCats = (() => {
    const cats: any = {};
    EXPENSES.filter((e) => e.period === period && e.status === "Проведён").forEach((e) => (cats[e.cat] = (cats[e.cat] || 0) + e.sum));
    const maxC = Math.max(1, ...Object.values(cats).map(Number));
    return { entries: Object.entries(cats).sort((a: any, b: any) => b[1] - a[1]), max: maxC, raw: cats };
  })();
  const anBranches = (() => {
    const br: any = {};
    EXPENSES.filter((e) => e.period === period && e.status === "Проведён").forEach((e) => (br[e.branch] = (br[e.branch] || 0) + e.sum));
    const maxB = Math.max(1, ...Object.values(br).map(Number));
    return { entries: Object.entries(br).sort((a: any, b: any) => b[1] - a[1]), max: maxB };
  })();
  const anMonths = ["Апрель 2026", "Май 2026", "Июнь 2026"];
  const anMonthData = anMonths.map((m) => ({ m, ...profitByMonth(m) }));
  const maxP = Math.max(1, ...anMonthData.map((d) => Math.abs(d.profit)));
  const momCur = profitByMonth(period);
  const momIdx = anMonths.indexOf(period);
  const momPrevM = momIdx > 0 ? anMonths[momIdx - 1] : null;
  const momPrev = momPrevM ? profitByMonth(momPrevM) : null;

  /* ===== ЦИФРОВАЯ СВОДКА ===== */
  const matched = RECON.filter((r) => r.crm === r.fact);
  const mismatched = RECON.filter((r) => r.crm !== r.fact);
  const recDiff = mismatched.reduce((s, r) => s + (r.crm - r.fact), 0);
  const recDiffAll = RECON.reduce((s, r) => s + (r.crm - r.fact), 0);
  const subCrm = RECON.filter((r) => r.dir.startsWith("Абонементы")).reduce((s, r) => s + r.crm, 0);
  const subFact = RECON.filter((r) => r.dir.startsWith("Абонементы")).reduce((s, r) => s + r.fact, 0);
  const subOk = subCrm === subFact;
  const pending = REQUESTS.filter((r) => r.status === "на рассмотрении");
  const pendingSum = pending.reduce((s, r) => s + r.sum, 0);
  const aiDateStr = "на " + new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const topCat: any = anCats.entries[0];

  /* ===== НАЛОГИ: список за период ===== */
  const taxList = TAXES.filter((t) => t.period === period && (fBranch === "" || t.branch === fBranch || t.branch === "Вся сеть"));
  const taxTotal = taxList.reduce((s, t) => s + t.sum, 0);
  const taxPaid = taxList.filter((t) => t.status === "Оплачен").reduce((s, t) => s + t.sum, 0);

  const reqStatusBadge: any = { "на рассмотрении": "b-gold", "одобрено": "b-green", "отклонено": "b-red", "запрошено уточнение": "b-blue", "выплачено / начислено": "b-green" };
  const reviewReq = reviewIdx !== null ? REQUESTS[reviewIdx] : null;
  const reviewIsReturn = reviewReq?.type === "Возврат";

  /* ===== РЕНДЕР ===== */
  return (
    <div className="proto-accounting">
      <div className="acc-content">
        <div className="eyebrow">Финансы сети</div>
        <h1>
          Бухгалтерия <span className="owner-tag">🔒 Только владелец</span>
        </h1>
        <p className="lead">
          Учёт фактического движения денег и сверка с продажами CRM. Прибыль считается по периоду расхода. Управляющие сюда не заходят — только подают заявки.
        </p>

        {/* toolbar */}
        <div className="toolbar">
          <div className="filters">
            <select className="period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option>Июнь 2026</option>
              <option>Май 2026</option>
              <option>Апрель 2026</option>
              <option>2 квартал 2026</option>
            </select>
            <select value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
              <option value="">Вся сеть</option>
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <select value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
              <option value="">Все счета</option>
              {ACCOUNTS.map((a) => (
                <option key={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn-ghost" onClick={openInc}>+ Поступление</button>
            <button className="btn-gold" onClick={openExp}>+ Расход</button>
          </div>
        </div>

        {/* KPI */}
        <div className="tiles">
          <div className="tile">
            <div className="lbl">Выручка</div>
            <div className="val">{money(rev)}</div>
            <div className="sub">{ret > 0 ? `вал. ${money(grossRevenueOf(period))} − возвраты ${money(ret)}` : "за вычетом возвратов"}</div>
          </div>
          <div className="tile exp">
            <div className="lbl">Расходы</div>
            <div className="val">{money(exp)}</div>
            <div className="sub">проведённые, по периоду</div>
          </div>
          <div className="tile profit">
            <div className="lbl">Чистая прибыль</div>
            <div className="val">{money(profit)}</div>
            <div className="sub">выручка − расходы</div>
          </div>
          <div className="tile">
            <div className="lbl">Рентабельность</div>
            <div className="val">{(rev ? margin.toFixed(1) : "0") + "%"}</div>
            <div className="sub">прибыль / выручка</div>
          </div>
        </div>

        {/* AI daily digest */}
        <div className="ai-box">
          <div className="ttl">
            <StarIcon />
            Сводка за 10 секунд · <span>{period}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{aiDateStr}</span>
          </div>
          <div>
            <div className="digest">
              <div className={"dg " + (mismatched.length ? "warn" : "ok")}>
                <div className="dl">Сверка CRM ↔ факт</div>
                <div className="dv">{matched.length}/{RECON.length} сошлось</div>
                <div className="ds">
                  {mismatched.length ? (
                    <>
                      <span className="dot-warn">●</span> расхождение {money(recDiff)} ({mismatched.map((m) => m.dir.replace("Абонементы — ", "")).join(", ")})
                    </>
                  ) : (
                    <>
                      <span className="dot-ok">●</span> всё сходится
                    </>
                  )}
                </div>
              </div>
              <div className={"dg " + (subOk ? "ok" : "warn")}>
                <div className="dl">Абонементы: CRM → факт</div>
                <div className="dv">{money(subFact)}</div>
                <div className="ds">
                  в CRM {money(subCrm)} ·{" "}
                  {subOk ? <span className="dot-ok">● получено всё</span> : <span className="dot-warn">● недополучено {money(subCrm - subFact)}</span>}
                </div>
              </div>
              <div className={"dg " + (pending.length ? "warn" : "ok")}>
                <div className="dl">Заявки на расходы</div>
                <div className="dv">{pending.length} ждут</div>
                <div className="ds">
                  {pending.length ? (
                    <>
                      <span className="dot-warn">●</span> на {money(pendingSum)} — нужно решение
                    </>
                  ) : (
                    <>
                      <span className="dot-ok">●</span> новых нет
                    </>
                  )}
                </div>
              </div>
              <div className="dg ok">
                <div className="dl">Чистая прибыль</div>
                <div className="dv" style={{ color: "var(--ink)" }}>{money(profit)}</div>
                <div className="ds">рентабельность {margin.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, borderTop: "1px solid var(--gold-c)", paddingTop: 14 }}>
            <p>
              <b>Чистая прибыль</b> за {period}: {money(profit)} при рентабельности {margin.toFixed(1)}%.
            </p>
            {topCat && (
              <div className="pt">
                • Крупнейшая статья расходов — <b>{topCat[0]}</b> ({money(topCat[1])}).
              </div>
            )}
            {recDiffAll > 0 && (
              <div className="pt">
                • Расхождение CRM↔факт <b>{money(recDiffAll)}</b>: недополучено по Kaspi (20 000 ₸) и выступлениям (50 000 ₸). Проверить поступления.
              </div>
            )}
            <div className="pt">
              • Реклама {money(anCats.raw["Реклама"] || 0)} — в пределах нормы. Аренда учтена в июне по периоду, хотя оплачена 25 мая.
            </div>
            <div className="pt">• Рекомендация: закрыть расхождение по выступлениям — это 7.4% потенциальной выручки месяца.</div>
          </div>
        </div>

        {/* reconciliation + accounts */}
        <div className="grid2">
          <div className="card">
            <h3>Сверка CRM ↔ фактические поступления</h3>
            <table>
              <thead>
                <tr>
                  <th>Направление</th>
                  <th className="r">В CRM</th>
                  <th className="r">Факт</th>
                  <th className="r">Расхожд.</th>
                  <th className="r">Статус</th>
                </tr>
              </thead>
              <tbody>
                {RECON.map((r, i) => {
                  const diff = r.crm - r.fact;
                  const ok = diff === 0;
                  return (
                    <tr key={i}>
                      <td>{r.dir}</td>
                      <td className="r">{money(r.crm)}</td>
                      <td className="r">{money(r.fact)}</td>
                      <td className="r" style={{ color: ok ? "var(--muted)" : "var(--red)" }}>{ok ? "0 ₸" : money(diff)}</td>
                      <td className="r">
                        <span className={"badge " + (ok ? "b-green" : "b-red")}>{ok ? "Сошлось" : "Расхождение"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3>Счета</h3>
            <div className="accounts">
              {ACCOUNTS.length ? (
                ACCOUNTS.map((a, i) => {
                  const inc = INCOMES.filter((x) => x.acc === a.name && x.period === period).reduce((s, x) => s + x.sum, 0);
                  const out = EXPENSES.filter((e) => e.acc === a.name && e.period === period && e.status === "Проведён").reduce((s, e) => s + e.sum, 0);
                  const bal = a.start + inc - out;
                  return (
                    <div className="acc" key={i} onClick={() => toast("История операций: " + a.name)}>
                      <div className="nm">{a.icon} {a.name}</div>
                      <div className="bal">{money(bal)}</div>
                      <div className="flow">
                        <span className="in">+{money(inc)}</span> · <span className="out">−{money(out)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="hint">Счетов нет. Добавьте в Настройках.</p>
              )}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="vtabs">
          <button className={"vtab" + (view === "ops" ? " active" : "")} onClick={() => setView("ops")}>Операции</button>
          <button className={"vtab" + (view === "req" ? " active" : "")} onClick={() => setView("req")}>Заявки управляющих</button>
          <button className={"vtab" + (view === "an" ? " active" : "")} onClick={() => setView("an")}>Аналитика</button>
          <button className={"vtab" + (view === "set" ? " active" : "")} onClick={() => setView("set")}>Настройки</button>
          <button className={"vtab" + (view === "tax" ? " active" : "")} onClick={() => setView("tax")}>Налоги</button>
          <button className={"vtab" + (view === "hist" ? " active" : "")} onClick={() => setView("hist")}>История</button>
        </div>

        {/* VIEW: OPERATIONS */}
        {view === "ops" && (
          <div className="card">
            <h3>
              Расходы и поступления · <span>{period}</span>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--muted)" }}>в расчёт идут только «Проведён»</span>
            </h3>
            <div className="ops-filters">
              <div className="ops-search">
                <SearchIcon />
                <input placeholder="Поиск по сумме, комментарию, категории, счёту…" value={opsSearch} onChange={(e) => setOpsSearch(e.target.value)} />
              </div>
              <select value={opsType} onChange={(e) => setOpsType(e.target.value)}>
                <option value="">Все типы</option>
                <option value="inc">Доходы</option>
                <option value="exp">Расходы</option>
                <option value="ret">Возвраты</option>
              </select>
              <select value={opsAcc} onChange={(e) => setOpsAcc(e.target.value)}>
                <option value="">Все счета</option>
                {ACCOUNTS.map((a) => (
                  <option key={a.name}>{a.name}</option>
                ))}
              </select>
              <select value={opsCat} onChange={(e) => setOpsCat(e.target.value)}>
                <option value="">Все категории / направления</option>
                <optgroup label="Категории расходов">
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </optgroup>
                <optgroup label="Направления доходов">
                  {DIRECTIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </optgroup>
              </select>
              <select value={opsStatus} onChange={(e) => setOpsStatus(e.target.value)}>
                <option value="">Любой статус</option>
                <option>Проведён</option>
                <option>Черновик</option>
                <option>Отменён</option>
                <option>Поступило</option>
              </select>
              <button className="btn-sm" onClick={resetOpsFilters}>Сбросить</button>
            </div>
            <div className="ops-summary">
              <span>Найдено: <b>{opsData.rows.length}</b></span>
              <span>Доходы: <b className="in">+{money(opsData.inSum)}</b></span>
              <span>Возвраты: <b className="out">−{money(opsData.retSum)}</b></span>
              <span>Расходы: <b className="out">−{money(opsData.outSum)}</b></span>
              <span>Сальдо: <b>{money(opsData.inSum - opsData.retSum - opsData.outSum)}</b></span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Дата оплаты</th>
                  <th>Период</th>
                  <th>Тип / категория</th>
                  <th>Счёт</th>
                  <th>Филиал</th>
                  <th className="r">Сумма</th>
                  <th className="r">Статус</th>
                </tr>
              </thead>
              <tbody>
                {opsData.rows.length ? (
                  opsData.rows.map((o, i) => {
                    if (o.kind === "exp") {
                      const sb = o.status === "Проведён" ? "b-green" : o.status === "Черновик" ? "b-gray" : "b-red";
                      return (
                        <tr key={i} style={{ background: "var(--red-soft)" }}>
                          <td>{o.payDate}</td>
                          <td>{o.period}</td>
                          <td>Расход · {o.cat}</td>
                          <td>{o.acc}</td>
                          <td>{o.branch}</td>
                          <td className="r" style={{ color: "var(--red)", fontWeight: 700 }}>− {money(o.sum)}</td>
                          <td className="r"><span className={"badge " + sb}>{o.status}</span></td>
                        </tr>
                      );
                    } else if (o.kind === "ret") {
                      return (
                        <tr key={i} style={{ background: "var(--blue-soft)" }}>
                          <td>{o.date}</td>
                          <td>{o.period}</td>
                          <td>Возврат · {o.student || "—"}</td>
                          <td>{o.acc}</td>
                          <td>{o.branch}</td>
                          <td className="r" style={{ color: "var(--blue-ink)", fontWeight: 700 }}>− {money(o.sum)}</td>
                          <td className="r"><span className="badge b-blue">Возврат</span></td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={i} style={{ background: "var(--green-soft)" }}>
                        <td>{o.date}</td>
                        <td>{o.period}</td>
                        <td>Доход · {o.dir}</td>
                        <td>{o.acc}</td>
                        <td>{o.branch}</td>
                        <td className="r" style={{ color: "var(--green)", fontWeight: 700 }}>+ {money(o.sum)}</td>
                        <td className="r"><span className="badge b-green">Поступило</span></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Ничего не найдено по выбранным фильтрам</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW: REQUESTS */}
        {view === "req" && (
          <div className="card">
            <h3>
              Заявки от управляющих
              <button className="btn-sm" onClick={openReq}>+ Создать заявку</button>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Филиал</th>
                  <th>Тип</th>
                  <th>Категория</th>
                  <th>Ученик / группа</th>
                  <th>Причина</th>
                  <th className="r">Сумма</th>
                  <th className="r">Статус</th>
                  <th className="r">Действие</th>
                </tr>
              </thead>
              <tbody>
                {REQUESTS.map((r, idx) => {
                  const typeBadge = r.type === "Возврат" ? <span className="badge b-blue">Возврат</span> : <span className="badge b-gray">Расход</span>;
                  return (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.branch}</td>
                      <td>{typeBadge}</td>
                      <td>{r.cat}</td>
                      <td>
                        {r.type === "Возврат" && (r.student || r.group) ? (
                          <>
                            <b>{r.student || "—"}</b>
                            {r.group && (
                              <>
                                <br />
                                <span style={{ color: "var(--muted)", fontSize: 12 }}>{r.group}</span>
                              </>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      <td>{r.reason}</td>
                      <td className="r">{money(r.sum)}</td>
                      <td className="r"><span className={"badge " + (reqStatusBadge[r.status] || "b-gray")}>{r.status}</span></td>
                      <td className="r">
                        {r.status === "на рассмотрении" ? (
                          <button className="btn-sm" onClick={() => openReview(idx)}>Рассмотреть</button>
                        ) : r.status === "запрошено уточнение" ? (
                          <button className="btn-sm" onClick={() => openReview(idx)}>Открыть</button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="hint">
              Управляющий создаёт заявку → владелец одобряет/отклоняет → после одобрения владелец проводит расход. Для возврата указывается ученик, группа и филиал.
            </p>
          </div>
        )}

        {/* VIEW: ANALYTICS */}
        {view === "an" && (
          <>
            <div className="card">
              <h3>Сравнение с предыдущим месяцем</h3>
              <div>
                {momPrev ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Показатель</th>
                        <th className="r">{period}</th>
                        <th className="r">{momPrevM}</th>
                        <th className="r">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Выручка", momCur.rev, momPrev.rev, false],
                        ["Возвраты", momCur.ret, momPrev.ret, true],
                        ["Расходы", momCur.exp, momPrev.exp, true],
                        ["Чистая прибыль", momCur.profit, momPrev.profit, false],
                      ].map(([label, c, p, inv]: any, i) => {
                        const dl = p !== null ? c - p : null;
                        const up = inv ? dl < 0 : dl > 0;
                        const color = dl === null ? "var(--muted)" : up ? "var(--green)" : "var(--red)";
                        const arrow = dl === null ? "" : dl > 0 ? "▲" : dl < 0 ? "▼" : "";
                        return (
                          <tr key={i}>
                            <td>{label}</td>
                            <td className="r">{money(c)}</td>
                            <td className="r">{p !== null ? money(p) : "—"}</td>
                            <td className="r" style={{ color }}>{dl !== null ? arrow + " " + money(Math.abs(dl)) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="hint">Для сравнения нужен предыдущий месяц.</p>
                )}
              </div>
            </div>
            <div className="grid2">
              <div className="card">
                <h3>Расходы по категориям</h3>
                <div>
                  {anCats.entries.length ? (
                    anCats.entries.map(([k, v]: any) => (
                      <div className="barrow" key={k}>
                        <div className="bl">
                          <span>{k}</span>
                          <span>{money(v)}</span>
                        </div>
                        <div className="bar"><span style={{ width: (v / anCats.max) * 100 + "%" }} /></div>
                      </div>
                    ))
                  ) : (
                    <p className="hint">Нет проведённых расходов.</p>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>Расходы по филиалам</h3>
                <div>
                  {anBranches.entries.map(([k, v]: any) => (
                    <div className="barrow" key={k}>
                      <div className="bl">
                        <span>{k}</span>
                        <span>{money(v)}</span>
                      </div>
                      <div className="bar"><span style={{ width: (v / anBranches.max) * 100 + "%" }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <h3>Динамика чистой прибыли по месяцам</h3>
              <div>
                {anMonthData.map((d, idx) => {
                  const prev = idx > 0 ? anMonthData[idx - 1].profit : null;
                  const delta = prev !== null ? d.profit - prev : null;
                  return (
                    <div className="barrow" key={d.m}>
                      <div className="bl">
                        <span>
                          {d.m}
                          {delta !== null && (
                            <span style={{ color: delta >= 0 ? "var(--green)" : "var(--red)", fontSize: 12 }}>
                              {" "}
                              {delta >= 0 ? "▲" : "▼"} {money(Math.abs(delta))}
                            </span>
                          )}
                        </span>
                        <span style={{ color: "var(--green)" }}>{money(d.profit)}</span>
                      </div>
                      <div className="bar"><span style={{ width: (Math.abs(d.profit) / maxP) * 100 + "%", background: "var(--green)" }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* VIEW: SETTINGS */}
        {view === "set" && (
          <>
            <div className="grid2">
              <div className="card">
                <h3>
                  Счета <button className="btn-sm" onClick={addAccount}>+ Добавить счёт</button>
                </h3>
                <div>
                  {ACCOUNTS.length ? (
                    ACCOUNTS.map((a, i) => {
                      const used = INCOMES.some((x) => x.acc === a.name) || EXPENSES.some((x) => x.acc === a.name) || RETURNS.some((x) => x.acc === a.name);
                      return (
                        <div className="set-row" key={i} style={a.archived ? { opacity: 0.55 } : undefined}>
                          <span>
                            {a.icon} <b>{a.name}</b>{" "}
                            <span style={{ color: "var(--muted)", fontSize: 13 }}>· старт {money(a.start)}{a.archived ? " · в архиве" : ""}</span>
                          </span>
                          {a.archived ? (
                            <button className="btn-sm" onClick={() => unarchiveAccount(i)}>Вернуть</button>
                          ) : used ? (
                            <button className="set-del" onClick={() => archiveAccount(i)}>В архив</button>
                          ) : (
                            <button className="set-del" onClick={() => delAccount(i)}>Удалить</button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="hint">Нет счетов.</p>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>
                  Филиалы <button className="btn-sm" onClick={() => addItem("BRANCHES", "Название филиала")}>+ Добавить</button>
                </h3>
                <div>
                  {BRANCHES.length ? (
                    BRANCHES.map((b, i) => (
                      <div className="set-row" key={i}>
                        <span>{b}</span>
                        <button className="set-del" onClick={() => delItem("BRANCHES", i)}>Удалить</button>
                      </div>
                    ))
                  ) : (
                    <p className="hint">Нет филиалов.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid2">
              <div className="card">
                <h3>
                  Категории расходов <button className="btn-sm" onClick={() => addItem("CATEGORIES", "Название категории")}>+ Добавить</button>
                </h3>
                <div>
                  {CATEGORIES.map((c, i) => (
                    <div className="set-row" key={i}>
                      <span>{c}</span>
                      <button className="set-del" onClick={() => delItem("CATEGORIES", i)}>Удалить</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3>
                  Направления доходов <button className="btn-sm" onClick={() => addItem("DIRECTIONS", "Название направления")}>+ Добавить</button>
                </h3>
                <div>
                  {DIRECTIONS.map((d, i) => (
                    <div className="set-row" key={i}>
                      <span>{d}</span>
                      <button className="set-del" onClick={() => delItem("DIRECTIONS", i)}>Удалить</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* VIEW: TAXES */}
        {view === "tax" && (
          <div className="card">
            <h3>
              Налоги · <span>{period}</span> <button className="btn-sm" onClick={openTax}>+ Добавить налог</button>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Налог</th>
                  <th>Период</th>
                  <th className="r">База</th>
                  <th className="r">Ставка</th>
                  <th className="r">Сумма</th>
                  <th>Срок уплаты</th>
                  <th className="r">Статус</th>
                  <th className="r">Действие</th>
                </tr>
              </thead>
              <tbody>
                {taxList.length ? (
                  taxList.map((t) => {
                    const real = TAXES.indexOf(t);
                    const sb = t.status === "Оплачен" ? "b-green" : t.status === "Начислен" ? "b-gold" : "b-gray";
                    return (
                      <tr key={real}>
                        <td><b>{t.name}</b></td>
                        <td>{t.period}</td>
                        <td className="r">{t.base ? money(t.base) : "—"}</td>
                        <td className="r">{t.rate ? t.rate + "%" : "—"}</td>
                        <td className="r" style={{ color: "var(--red)", fontWeight: 700 }}>{money(t.sum)}</td>
                        <td>{t.due}</td>
                        <td className="r"><span className={"badge " + sb}>{t.status}</span></td>
                        <td className="r">
                          {t.status === "Начислен" ? <button className="btn-sm" onClick={() => payTax(real)}>Оплатить</button> : "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Нет налогов за период</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="ops-summary">
              <span>Начислено: <b>{money(taxTotal)}</b></span>
              <span>Оплачено: <b className="in">{money(taxPaid)}</b></span>
              <span>К оплате: <b className="out">{money(taxTotal - taxPaid)}</b></span>
            </div>
            <p className="hint">Налоги учитываются отдельно. Оплаченные налоги можно провести как расход категории «Налоги» в выбранном периоде.</p>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === "hist" && (
          <div className="card">
            <h3>
              История изменений <span style={{ fontWeight: 600, fontSize: 13, color: "var(--muted)" }}>не удаляется</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Дата и время</th>
                  <th>Кто</th>
                  <th>Действие</th>
                  <th>Детали</th>
                </tr>
              </thead>
              <tbody>
                {HISTORY.length ? (
                  HISTORY.map((h, i) => (
                    <tr key={i}>
                      <td>{h.time}</td>
                      <td>{h.who}</td>
                      <td><b>{h.action}</b></td>
                      <td>{h.detail}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>История пуста</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== МОДАЛКА: НОВЫЙ РАСХОД ===== */}
      <div className={"overlay" + (expOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setExpOpen(false); }}>
        <div className="sheet">
          <div className="sheet-head">
            <h2>Новый расход</h2>
            <button className="close" onClick={() => setExpOpen(false)}>×</button>
          </div>
          <div className="sheet-body">
            <div className="form-grid">
              <div className="field"><label>Дата оплаты *</label><input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} /></div>
              <div className="field">
                <label>Период расхода *</label>
                <select value={ePeriod} onChange={(e) => setEPeriod(e.target.value)}>
                  <option>Июнь 2026</option><option>Май 2026</option><option>Июль 2026</option><option>Апрель 2026</option>
                </select>
              </div>
              <div className="field"><label>Сумма, ₸ *</label><input type="number" placeholder="150000" value={eSum} onChange={(e) => setESum(e.target.value)} /></div>
              <div className="field">
                <label>Счёт списания *</label>
                <select value={eAcc} onChange={(e) => setEAcc(e.target.value)}>
                  {activeAccounts().map((a) => (<option key={a.name}>{a.name}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Категория *</label>
                <select value={eCat} onChange={(e) => setECat(e.target.value)}>
                  {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Филиал</label>
                <select value={eBranch} onChange={(e) => setEBranch(e.target.value)}>
                  <option>Вся сеть</option>
                  {BRANCHES.map((b) => (<option key={b}>{b}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Статус</label>
                <select value={eStatus} onChange={(e) => setEStatus(e.target.value)}>
                  <option>Проведён</option><option>Черновик</option><option>Отменён</option>
                </select>
              </div>
              <div className="field"><label>Чек / файл</label><button className="btn-sm" type="button" onClick={() => toast("Прикрепление чека")}>📎 Прикрепить</button></div>
              <div className="field full"><label>Комментарий</label><input placeholder="Например: аренда филиала за июнь" value={eNote} onChange={(e) => setENote(e.target.value)} /></div>
            </div>
            <p className="hint">
              Дата оплаты и период расхода — разные поля. В прибыль расход попадает по <b>периоду</b> (например, аренда за июнь учтётся в июне, даже если оплачена в мае).
            </p>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setExpOpen(false)}>Отмена</button>
              <button className="btn-gold" onClick={saveExp}>Провести расход</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== МОДАЛКА: НОВОЕ ПОСТУПЛЕНИЕ ===== */}
      <div className={"overlay" + (incOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setIncOpen(false); }}>
        <div className="sheet">
          <div className="sheet-head">
            <h2>Новое поступление</h2>
            <button className="close" onClick={() => setIncOpen(false)}>×</button>
          </div>
          <div className="sheet-body">
            <div className="form-grid">
              <div className="field"><label>Дата *</label><input type="date" value={iDate} onChange={(e) => setIDate(e.target.value)} /></div>
              <div className="field"><label>Сумма, ₸ *</label><input type="number" placeholder="120000" value={iSum} onChange={(e) => setISum(e.target.value)} /></div>
              <div className="field">
                <label>Счёт *</label>
                <select value={iAcc} onChange={(e) => setIAcc(e.target.value)}>
                  {activeAccounts().map((a) => (<option key={a.name}>{a.name}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Направление *</label>
                <select value={iDir} onChange={(e) => setIDir(e.target.value)}>
                  {DIRECTIONS.map((d) => (<option key={d}>{d}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Способ оплаты</label>
                <select value={iPay} onChange={(e) => setIPay(e.target.value)}>
                  <option>Наличные</option><option>Kaspi Pay</option><option>Расчётный счёт</option>
                </select>
              </div>
              <div className="field">
                <label>Филиал</label>
                <select value={iBranch} onChange={(e) => setIBranch(e.target.value)}>
                  {BRANCHES.map((b) => (<option key={b}>{b}</option>))}
                </select>
              </div>
              <div className="field full"><label>Комментарий</label><input placeholder="Комментарий" value={iNote} onChange={(e) => setINote(e.target.value)} /></div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setIncOpen(false)}>Отмена</button>
              <button className="btn-gold" onClick={saveInc}>Добавить</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== МОДАЛКА: НОВАЯ ЗАЯВКА ===== */}
      <div className={"overlay" + (reqOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setReqOpen(false); }}>
        <div className="sheet">
          <div className="sheet-head">
            <h2>Новая заявка</h2>
            <button className="close" onClick={() => setReqOpen(false)}>×</button>
          </div>
          <div className="sheet-body">
            <div className="form-grid">
              <div className="field">
                <label>Тип *</label>
                <select value={rType} onChange={(e) => setRType(e.target.value)}>
                  <option>Расход</option><option>Возврат</option>
                </select>
              </div>
              <div className="field"><label>Сумма, ₸ *</label><input type="number" placeholder="12000" value={rSum} onChange={(e) => setRSum(e.target.value)} /></div>
              <div className="field">
                <label>Филиал *</label>
                <select value={rBranch} onChange={(e) => setRBranch(e.target.value)}>
                  {BRANCHES.map((b) => (<option key={b}>{b}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Категория</label>
                <select value={rCat} onChange={(e) => setRCat(e.target.value)}>
                  {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Срочность</label>
                <select value={rUrg} onChange={(e) => setRUrg(e.target.value)}>
                  <option>Низкая</option><option>Средняя</option><option>Высокая</option>
                </select>
              </div>
              {rType === "Возврат" && (
                <div className="field"><label>Ученик</label><input placeholder="ФИО ученика" value={rStudent} onChange={(e) => setRStudent(e.target.value)} /></div>
              )}
              {rType === "Возврат" && (
                <div className="field"><label>Группа</label><input placeholder="Например: Соло, Ансамбль" value={rGroup} onChange={(e) => setRGroup(e.target.value)} /></div>
              )}
              <div className="field full"><label>Причина / комментарий</label><input placeholder="За что возврат / на что расход" value={rReason} onChange={(e) => setRReason(e.target.value)} /></div>
            </div>
            {rType === "Возврат" && (
              <p className="hint">Для возврата укажите ученика и группу — это связывает заявку с клиентом и филиалом для отчётности.</p>
            )}
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setReqOpen(false)}>Отмена</button>
              <button className="btn-gold" onClick={saveReq}>Отправить заявку</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== МОДАЛКА: РАССМОТРЕНИЕ ЗАЯВКИ ===== */}
      <div className={"overlay" + (revOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) closeReview(); }}>
        <div className="sheet">
          <div className="sheet-head">
            <h2>{reviewReq ? (reviewIsReturn ? "Возврат" : "Расход") + " · заявка от управляющего" : "Рассмотрение заявки"}</h2>
            <button className="close" onClick={closeReview}>×</button>
          </div>
          <div className="sheet-body">
            <div className="rev-details">
              {reviewReq && (
                <>
                  <div className="rd"><span>Тип</span><b>{reviewReq.type}</b></div>
                  <div className="rd"><span>Сумма</span><b style={{ color: reviewIsReturn ? "var(--blue-ink)" : "var(--red)" }}>{money(reviewReq.sum)}</b></div>
                  <div className="rd"><span>Филиал</span><b>{reviewReq.branch}</b></div>
                  <div className="rd"><span>Категория</span><b>{reviewReq.cat}</b></div>
                  {reviewIsReturn && (
                    <>
                      <div className="rd"><span>Ученик</span><b>{reviewReq.student || "—"}</b></div>
                      <div className="rd"><span>Группа</span><b>{reviewReq.group || "—"}</b></div>
                    </>
                  )}
                  <div className="rd"><span>Причина</span><b>{reviewReq.reason}</b></div>
                  <div className="rd"><span>Срочность</span><b>{reviewReq.urgency}</b></div>
                  <div className="rd"><span>Дата заявки</span><b>{reviewReq.date}</b></div>
                </>
              )}
            </div>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="field">
                <label>Счёт списания / зачисления *</label>
                <select value={revAcc} onChange={(e) => setRevAcc(e.target.value)}>
                  {activeAccounts().map((a) => (<option key={a.name}>{a.name}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Период расхода *</label>
                <select value={revPeriod} onChange={(e) => setRevPeriod(e.target.value)}>
                  <option>Июнь 2026</option><option>Май 2026</option><option>Июль 2026</option>
                </select>
              </div>
              <div className="field full"><label>Комментарий владельца</label><input placeholder="Необязательно" value={revNote} onChange={(e) => setRevNote(e.target.value)} /></div>
            </div>
            <p className="hint">
              {reviewReq
                ? reviewIsReturn
                  ? "При одобрении сумма зачтётся как ВОЗВРАТ — спишется со счёта и уменьшит выручку периода (отдельная статья «Возвраты»). У ученика " + (reviewReq.student || "—") + " зафиксируется возврат."
                  : "При одобрении расход спишется с выбранного счёта и сразу станет проведённой операцией за выбранный период."
                : ""}
            </p>
            <div className="modal-foot" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-sm" style={{ borderColor: "var(--red-c)", color: "var(--red)" }} onClick={() => decideReq("reject")}>Отклонить</button>
                <button className="btn-sm" onClick={() => decideReq("clarify")}>Запросить уточнение</button>
              </div>
              <button className="btn-gold" onClick={() => decideReq("approve")}>
                {reviewIsReturn ? "Одобрить и начислить возврат" : "Одобрить и провести расход"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== МОДАЛКА: НОВЫЙ НАЛОГ ===== */}
      <div className={"overlay" + (taxOpen ? " open" : "")} onClick={(e) => { if (e.target === e.currentTarget) setTaxOpen(false); }}>
        <div className="sheet">
          <div className="sheet-head">
            <h2>Новый налог</h2>
            <button className="close" onClick={() => setTaxOpen(false)}>×</button>
          </div>
          <div className="sheet-body">
            <div className="form-grid">
              <div className="field full"><label>Название налога *</label><input placeholder="ИПН, Соц. отчисления, ОСМС…" value={txName} onChange={(e) => setTxName(e.target.value)} /></div>
              <div className="field">
                <label>Период *</label>
                <select value={txPeriod} onChange={(e) => setTxPeriod(e.target.value)}>
                  <option>Июнь 2026</option><option>Май 2026</option><option>Июль 2026</option>
                </select>
              </div>
              <div className="field"><label>Срок уплаты *</label><input type="date" value={txDue} onChange={(e) => setTxDue(e.target.value)} /></div>
              <div className="field"><label>База, ₸</label><input type="number" placeholder="330000" value={txBase} onChange={(e) => { setTxBase(e.target.value); calcTax(e.target.value, txRate); }} /></div>
              <div className="field"><label>Ставка, %</label><input type="number" step="0.1" placeholder="10" value={txRate} onChange={(e) => { setTxRate(e.target.value); calcTax(txBase, e.target.value); }} /></div>
              <div className="field"><label>Сумма налога, ₸ *</label><input type="number" placeholder="33000" value={txSum} onChange={(e) => setTxSum(e.target.value)} /></div>
              <div className="field">
                <label>Филиал</label>
                <select value={txBranch} onChange={(e) => setTxBranch(e.target.value)}>
                  <option>Вся сеть</option>
                  {BRANCHES.map((b) => (<option key={b}>{b}</option>))}
                </select>
              </div>
            </div>
            <p className="hint">Сумма считается как база × ставка, либо введите вручную.</p>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setTaxOpen(false)}>Отмена</button>
              <button className="btn-gold" onClick={saveTax}>Добавить</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ТОСТЫ ===== */}
      <div className="toasts">
        {toasts.map((t) => (
          <div className={"toast" + (t.type === "err" ? " err" : "")} key={t.id}>
            <span className="dot" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccountingProtoView;
