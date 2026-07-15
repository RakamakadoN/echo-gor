import { useCallback, useEffect, useMemo, useState } from "react";
import type { Branch } from "../../types";
import { KassaView } from "./KassaView";
import "./accounting-proto.css";

/* ===== БУХГАЛТЕРИЯ — реальные данные через /api/mvp/accounting/* =====
   Разделы без эндпоинта (сверка CRM↔факт) показывают заглушку «Данных пока нет».
   Налоги/История строятся из реальных операций. */
const PERIOD_DEFAULT = "Июнь 2026";
const H = { "x-demo-role": "owner" } as const;
const HJ = { "Content-Type": "application/json", "x-demo-role": "owner" } as const;

/* ===== HELPERS ===== */
const money = (n: number) => Math.round(n || 0).toLocaleString("ru-RU") + " ₸";
const nowStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const validNum = (v: any) => {
  const n = parseInt(v, 10);
  return !isNaN(n) && n > 0 ? n : null;
};
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const ymToLabel = (ym: string) => {
  const [y, m] = String(ym).split("-");
  const idx = parseInt(m, 10) - 1;
  return idx >= 0 && idx < 12 ? `${MONTHS_RU[idx]} ${y}` : String(ym);
};
const labelToYm = (label: string) => {
  const parts = String(label).split(" ");
  const idx = MONTHS_RU.indexOf(parts[0]);
  return idx >= 0 && parts[1] ? `${parts[1]}-${String(idx + 1).padStart(2, "0")}` : "";
};
const dateToLabel = (d: string) => ymToLabel(String(d).slice(0, 7));
const periodMonthStart = (label: string) => {
  const ym = labelToYm(label);
  return ym ? `${ym}-01` : new Date().toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const iconForKind = (kind?: string) => (kind === "bank" ? "🏦" : kind === "card" ? "💳" : kind === "cash" ? "💵" : "💰");

/* ===== ЗАГЛУШКА ===== */
const Empty = ({ children }: { children?: any }) => (
  <div className="hint" style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>{children || "Данных пока нет"}</div>
);

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

type OverviewData = {
  accounts: any[];
  categories: any[];
  cashflow: { months: string[]; incomeRows: any[]; expenseRows: any[]; incomeByMonth: number[]; expenseByMonth: number[]; netByMonth: number[] };
  pnl: any[];
  calendar: any[];
  totals: { income: number; expense: number; profit: number; plannedIn: number; plannedOut: number; balanceTotal: number };
};
const EMPTY_OVERVIEW: OverviewData = {
  accounts: [], categories: [],
  cashflow: { months: [], incomeRows: [], expenseRows: [], incomeByMonth: [], expenseByMonth: [], netByMonth: [] },
  pnl: [], calendar: [], totals: { income: 0, expense: 0, profit: 0, plannedIn: 0, plannedOut: 0, balanceTotal: 0 },
};

export function AccountingProtoView({ branches = [] }: { branches?: Branch[] }) {
  /* ===== STATE ===== */
  const [period, setPeriod] = useState(PERIOD_DEFAULT);
  const [fBranch, setFBranch] = useState("");
  const [fAccount, setFAccount] = useState("");
  const [view, setView] = useState<"kassa" | "ops" | "req" | "an" | "set" | "tax" | "hist">("kassa");

  /* ---- данные с сервера ---- */
  const [overview, setOverview] = useState<OverviewData>(EMPTY_OVERVIEW);
  const [operations, setOperations] = useState<any[]>([]);
  const [expReqs, setExpReqs] = useState<any[]>([]);
  const [refundReqs, setRefundReqs] = useState<any[]>([]);

  /* ---- локальные списки-справочники (seed из реальных данных) ---- */
  const [ACCOUNTS, setACCOUNTS] = useState<any[]>([]);
  const [CATEGORIES, setCATEGORIES] = useState<string[]>([]);
  const [DIRECTIONS, setDIRECTIONS] = useState<string[]>([]);
  const [BRANCHES, setBRANCHES] = useState<string[]>([]);
  const [HISTORY, setHISTORY] = useState<any[]>([]);

  /* ---- реальные справочники статей и реестр налогов ---- */
  const [CATOBJS, setCATOBJS] = useState<any[]>([]);
  const [TAXES_REG, setTAXES_REG] = useState<any[]>([]);

  /* ===== ЗАГРУЗКА ===== */
  const load = useCallback(async () => {
    try {
      const [ovR, opR, erR, rrR] = await Promise.all([
        fetch("/api/mvp/accounting/overview", { headers: H }),
        fetch("/api/mvp/accounting/operations", { headers: H }),
        fetch("/api/mvp/accounting/expense-requests", { headers: H }),
        fetch("/api/mvp/accounting/refund-requests", { headers: H }),
      ]);
      const ov = ovR.ok ? await ovR.json() : {};
      const op = opR.ok ? await opR.json() : {};
      const er = erR.ok ? await erR.json() : {};
      const rr = rrR.ok ? await rrR.json() : {};
      setOverview({
        accounts: ov.accounts || [],
        categories: ov.categories || [],
        cashflow: ov.cashflow || EMPTY_OVERVIEW.cashflow,
        pnl: ov.pnl || [],
        calendar: ov.calendar || [],
        totals: ov.totals || EMPTY_OVERVIEW.totals,
      });
      setOperations(op.operations || []);
      setExpReqs(er.requests || []);
      setRefundReqs(rr.requests || []);
    } catch {
      /* сеть/сервер недоступны — оставляем пустые состояния, не падаем */
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* реальный список статей (доходы/расходы) */
  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch("/api/mvp/accounting/categories", { headers: H });
      const j = r.ok ? await r.json() : {};
      setCATOBJS(Array.isArray(j.categories) ? j.categories.filter((c: any) => c.isActive !== false) : []);
    } catch { /* недоступно — оставляем пусто */ }
  }, []);
  /* реальный реестр налогов */
  const loadTaxes = useCallback(async () => {
    try {
      const r = await fetch("/api/mvp/accounting/taxes", { headers: H });
      const j = r.ok ? await r.json() : {};
      setTAXES_REG(Array.isArray(j.taxes) ? j.taxes.filter((t: any) => t.isActive !== false) : []);
    } catch { /* недоступно — оставляем пусто */ }
  }, []);
  useEffect(() => { loadCategories(); loadTaxes(); }, [loadCategories, loadTaxes]);

  /* объединённый список статей: реальные из /categories + встречающиеся в overview (для резолва имён скрытых) */
  const allCats = useMemo(() => {
    const map = new Map<string, any>();
    (overview.categories || []).forEach((c: any) => map.set(c.id, c));
    CATOBJS.forEach((c: any) => map.set(c.id, c));
    return Array.from(map.values());
  }, [overview.categories, CATOBJS]);

  /* объекты статей для настроек (с id — для переименования/удаления) */
  const catSrc = CATOBJS.length ? CATOBJS : overview.categories;
  const expenseCats = useMemo(() => catSrc.filter((c: any) => c.kind === "expense"), [catSrc]);
  const incomeCats = useMemo(() => catSrc.filter((c: any) => c.kind === "income"), [catSrc]);

  /* seed справочников из реальных данных */
  useEffect(() => {
    setACCOUNTS(overview.accounts.map((a) => ({
      id: a.id, name: a.name, kind: a.kind, currency: a.currency,
      icon: iconForKind(a.kind), start: Number(a.openingBalance) || 0, balance: Number(a.balance) || 0, archived: false,
    })));
  }, [overview.accounts]);
  useEffect(() => {
    const src = CATOBJS.length ? CATOBJS : overview.categories;
    setCATEGORIES(src.filter((c: any) => c.kind === "expense").map((c: any) => c.name));
    setDIRECTIONS(src.filter((c: any) => c.kind === "income").map((c: any) => c.name));
  }, [CATOBJS, overview.categories]);
  useEffect(() => { setBRANCHES((branches || []).map((b) => b.name)); }, [branches]);

  /* дефолтный период — последний месяц с данными */
  const monthLabels = useMemo(() => (overview.cashflow.months || []).map(ymToLabel), [overview.cashflow.months]);
  useEffect(() => {
    if (monthLabels.length && !monthLabels.includes(period)) setPeriod(monthLabels[monthLabels.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthLabels]);

  /* резолверы имён/id */
  const catById = useCallback((id?: string) => allCats.find((c) => c.id === id)?.name || "Без статьи", [allCats]);
  const catId = useCallback((name: string, kind: "income" | "expense") =>
    allCats.find((c) => c.name === name && c.kind === kind)?.id
    || allCats.find((c) => c.name === name)?.id || null, [allCats]);
  const accById = useCallback((id?: string) => overview.accounts.find((a) => a.id === id)?.name || "—", [overview.accounts]);
  const accId = useCallback((name: string) => ACCOUNTS.find((a) => a.name === name)?.id || overview.accounts.find((a) => a.name === name)?.id || null, [ACCOUNTS, overview.accounts]);
  const branchName = useCallback((id?: string | null) => branches.find((b) => b.id === id)?.name || "Вся сеть", [branches]);
  const branchIdByName = useCallback((name: string) => (name === "Вся сеть" ? null : branches.find((b) => b.name === name)?.id || null), [branches]);

  /* ===== ТОСТЫ / ИСТОРИЯ (сессионная) ===== */
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
  /* базовая история — из последних операций */
  useEffect(() => {
    setHISTORY(operations.slice(0, 50).map((o) => ({
      time: o.date, who: "—",
      action: o.type === "income" ? "Поступление" : "Расход",
      detail: `${catById(o.categoryId)} · ${money(Number(o.amount))}`,
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations, overview.categories]);

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

  /* поля формы налога (реестр) */
  const [txName, setTxName] = useState("");
  const [txBaseType, setTxBaseType] = useState("revenue");
  const [txRate, setTxRate] = useState("");
  const [txFixed, setTxFixed] = useState("");
  const [txPeriodType, setTxPeriodType] = useState("month");
  const [txCat, setTxCat] = useState("");
  const [txAcc, setTxAcc] = useState("");
  const [txBranch, setTxBranch] = useState("Вся сеть");
  const [txComment, setTxComment] = useState("");

  /* ===== ПРОИЗВОДНЫЕ ОТ ОПЕРАЦИЙ (реальные) ===== */
  const activeAccounts = () => ACCOUNTS.filter((a) => !a.archived);
  const inBranch = (b: string) => !fBranch || b === fBranch || b === "Вся сеть";

  const INCOMES = useMemo(() => operations.filter((o) => o.type === "income").map((o) => ({
    id: o.id, date: o.date, sum: Number(o.amount), acc: accById(o.accountId), dir: catById(o.categoryId),
    pay: accById(o.accountId), branch: "Вся сеть", period: dateToLabel(o.date), note: o.description || o.counterparty || "", status: o.status,
  })), [operations, accById, catById]);
  const EXPENSES = useMemo(() => operations.filter((o) => o.type === "expense").map((o) => ({
    id: o.id, payDate: o.date, period: dateToLabel(o.date), sum: Number(o.amount), acc: accById(o.accountId),
    cat: catById(o.categoryId), branch: "Вся сеть", status: o.status === "planned" ? "Черновик" : "Проведён", note: o.description || o.counterparty || "",
  })), [operations, accById, catById]);
  const RETURNS: any[] = [];

  const returnsOf = (_p: string) => 0;
  const grossRevenueOf = (p: string) => INCOMES.filter((i) => i.period === p && inBranch(i.branch)).reduce((s, i) => s + i.sum, 0);

  /* KPI ← pnl текущего месяца (реальные) */
  const pnlRow = overview.pnl.find((p) => p.month === labelToYm(period));
  const rev = pnlRow ? Number(pnlRow.revenue) : grossRevenueOf(period);
  const exp = pnlRow ? Number(pnlRow.expense) : EXPENSES.filter((e) => e.period === period && e.status === "Проведён").reduce((s, e) => s + e.sum, 0);
  const profit = pnlRow ? Number(pnlRow.profit) : rev - exp;
  const margin = pnlRow ? Number(pnlRow.margin) : rev ? (profit / rev) * 100 : 0;
  const ret = returnsOf(period);

  /* ===== СОХРАНЕНИЕ РАСХОДА (реально) ===== */
  const openExp = () => {
    setEDate(today()); setEPeriod(period); setESum(""); setENote("");
    setEAcc(activeAccounts()[0]?.name || ""); setECat(CATEGORIES[0] || ""); setEBranch("Вся сеть"); setEStatus("Проведён");
    setExpOpen(true);
  };
  const saveExp = async () => {
    const sum = validNum(eSum);
    if (!sum) return toast("Сумма должна быть больше нуля", "err");
    if (!validDate(eDate)) return toast("Укажите корректную дату оплаты", "err");
    if (!eAcc) return toast("Выберите счёт списания", "err");
    if (!eCat) return toast("Выберите категорию", "err");
    try {
      const res = await fetch("/api/mvp/accounting/operations", {
        method: "POST", headers: HJ,
        body: JSON.stringify({ type: "expense", status: eStatus === "Проведён" ? "actual" : "planned", amount: sum, date: eDate, categoryId: catId(eCat, "expense"), accountId: accId(eAcc), branchId: branchIdByName(eBranch), description: eNote || null }),
      });
      if (!res.ok) return toast("Не удалось сохранить расход", "err");
      logHistory("Добавлен расход", `${eCat} · ${money(sum)} · ${eStatus}`);
      toast("Расход добавлен: " + money(sum) + " (" + eCat + ")");
      setExpOpen(false); await load();
    } catch { toast("Ошибка сети", "err"); }
  };

  /* ===== СОХРАНЕНИЕ ПОСТУПЛЕНИЯ (реально) ===== */
  const openInc = () => {
    setIDate(today()); setISum(""); setINote("");
    setIAcc(activeAccounts()[0]?.name || ""); setIDir(DIRECTIONS[0] || ""); setIPay("Наличные"); setIBranch(BRANCHES[0] || "");
    setIncOpen(true);
  };
  const saveInc = async () => {
    const sum = validNum(iSum);
    if (!sum) return toast("Сумма должна быть больше нуля", "err");
    if (!validDate(iDate)) return toast("Укажите корректную дату", "err");
    if (!iAcc) return toast("Выберите счёт", "err");
    try {
      const res = await fetch("/api/mvp/accounting/operations", {
        method: "POST", headers: HJ,
        body: JSON.stringify({ type: "income", status: "actual", amount: sum, date: iDate, categoryId: catId(iDir, "income"), accountId: accId(iAcc), branchId: branchIdByName(iBranch), description: iNote || null }),
      });
      if (!res.ok) return toast("Не удалось сохранить поступление", "err");
      logHistory("Добавлено поступление", `${iDir} · ${money(sum)} · счёт ${iAcc}`);
      toast("Поступление добавлено: " + money(sum));
      setIncOpen(false); await load();
    } catch { toast("Ошибка сети", "err"); }
  };

  /* ===== СОЗДАНИЕ ЗАЯВКИ (реально) ===== */
  const openReq = () => {
    setRType("Расход"); setRSum(""); setRReason(""); setRStudent(""); setRGroup("");
    setRBranch(BRANCHES[0] || ""); setRCat(CATEGORIES[0] || ""); setRUrg("Низкая");
    setReqOpen(true);
  };
  const saveReq = async () => {
    const sum = validNum(rSum);
    if (!sum) return toast("Сумма должна быть больше нуля", "err");
    const isReturn = rType === "Возврат";
    if (isReturn && !rStudent.trim()) return toast("Для возврата укажите ученика", "err");
    try {
      const branchId = branchIdByName(rBranch);
      const res = isReturn
        ? await fetch("/api/mvp/accounting/refund-requests", { method: "POST", headers: HJ, body: JSON.stringify({ amount: sum, studentName: rStudent.trim(), reason: rReason || null, branchId }) })
        : await fetch("/api/mvp/accounting/expense-requests", { method: "POST", headers: HJ, body: JSON.stringify({ amount: sum, categoryId: catId(rCat, "expense"), description: rReason || null, branchId }) });
      if (!res.ok) return toast("Не удалось создать заявку", "err");
      logHistory("Создана заявка", `${rType} · ${money(sum)} · ${rBranch}`);
      toast("Заявка отправлена: " + rType + " " + money(sum));
      setReqOpen(false); await load(); setView("req");
    } catch { toast("Ошибка сети", "err"); }
  };

  /* ===== ЗАЯВКИ (реальные из expense-requests + refund-requests) ===== */
  const statusRu = (s: string) => (s === "pending" ? "на рассмотрении" : s === "approved" ? "выплачено / начислено" : s === "rejected" ? "отклонено" : s);
  const REQUESTS = useMemo(() => {
    const exp = expReqs.map((r) => ({
      id: "e" + r.id, _id: r.id, _kind: "expense", date: String(r.createdAt || "").slice(0, 10), branch: branchName(r.branchId),
      type: "Расход", cat: catById(r.categoryId), reason: r.description || "—", sum: Number(r.amount), urgency: "—",
      status: statusRu(r.status), student: "", group: "", posted: r.status !== "pending",
    }));
    const ref = refundReqs.map((r) => ({
      id: "r" + r.id, _id: r.id, _kind: "refund", date: String(r.createdAt || "").slice(0, 10), branch: branchName(r.branchId),
      type: "Возврат", cat: "Возврат", reason: r.reason || "—", sum: Number(r.amount), urgency: "—",
      status: statusRu(r.status), student: r.studentName || "", group: "", posted: r.status !== "pending",
    }));
    return [...exp, ...ref].sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [expReqs, refundReqs, branchName, catById]);

  /* ===== РАССМОТРЕНИЕ ЗАЯВКИ (реально) ===== */
  const openReview = (i: number) => {
    setReviewIdx(i);
    setRevAcc(activeAccounts()[0]?.name || "");
    setRevPeriod(period);
    setRevNote("");
    setRevOpen(true);
  };
  const closeReview = () => { setRevOpen(false); setReviewIdx(null); };
  const decideReq = async (action: string) => {
    if (reviewIdx === null) return;
    const r = REQUESTS[reviewIdx];
    if (!r) return;
    if (r.posted) { toast("Заявка уже обработана", "err"); return; }
    const base = r._kind === "refund" ? "refund-requests" : "expense-requests";
    if (action === "clarify") { toast("Уточнение недоступно — одобрите или отклоните", "err"); return; }
    try {
      if (action === "reject") {
        const res = await fetch(`/api/mvp/accounting/${base}/${r._id}/reject`, { method: "POST", headers: HJ, body: JSON.stringify({ comment: revNote || null }) });
        if (!res.ok) return toast("Не удалось отклонить заявку", "err");
        logHistory("Заявка отклонена", `${r.type} · ${money(r.sum)} · ${r.branch}`);
        toast("Заявка отклонена"); closeReview(); await load(); setView("req"); return;
      }
      // approve
      if (!revAcc) { toast("Выберите счёт", "err"); return; }
      const res = await fetch(`/api/mvp/accounting/${base}/${r._id}/approve`, {
        method: "POST", headers: HJ,
        body: JSON.stringify({ accountId: accId(revAcc), date: periodMonthStart(revPeriod), comment: revNote || null }),
      });
      if (!res.ok) return toast("Не удалось одобрить заявку", "err");
      if (r.type === "Возврат") { logHistory("Проведён возврат", `${money(r.sum)} · ${r.student || "—"} · счёт ${revAcc}`); toast("Возврат начислен: " + money(r.sum)); }
      else { logHistory("Проведён расход по заявке", `${r.cat} · ${money(r.sum)} · счёт ${revAcc}`); toast("Расход проведён: " + money(r.sum)); }
      closeReview(); await load(); setView("req");
    } catch { toast("Ошибка сети", "err"); }
  };

  /* ===== НАСТРОЙКИ: СТАТЬИ (реально через /accounting/categories) ===== */
  const addCategory = async (kind: "income" | "expense") => {
    const v = window.prompt(kind === "income" ? "Название направления доходов:" : "Название статьи расходов:");
    if (!v || !v.trim()) return;
    try {
      const res = await fetch("/api/mvp/accounting/categories", { method: "POST", headers: HJ, body: JSON.stringify({ name: v.trim(), kind }) });
      if (!res.ok) return toast("Не удалось добавить статью", "err");
      logHistory("Добавлена статья", `${v.trim()} · ${kind === "income" ? "доход" : "расход"}`);
      toast("Статья добавлена: " + v.trim());
      await loadCategories(); await load(); setView("set");
    } catch { toast("Ошибка сети", "err"); }
  };
  const renameCategory = async (c: any) => {
    const v = window.prompt("Новое название статьи:", c.name);
    if (!v || !v.trim() || v.trim() === c.name) return;
    try {
      const res = await fetch(`/api/mvp/accounting/categories/${c.id}`, { method: "PATCH", headers: HJ, body: JSON.stringify({ name: v.trim() }) });
      if (!res.ok) return toast("Не удалось переименовать статью", "err");
      logHistory("Переименована статья", `${c.name} → ${v.trim()}`);
      toast("Статья переименована");
      await loadCategories(); await load(); setView("set");
    } catch { toast("Ошибка сети", "err"); }
  };
  const deleteCategory = async (c: any) => {
    if (!window.confirm("Скрыть статью «" + c.name + "»?")) return;
    try {
      const res = await fetch(`/api/mvp/accounting/categories/${c.id}`, { method: "DELETE", headers: HJ });
      if (!res.ok) return toast("Не удалось скрыть статью", "err");
      logHistory("Скрыта статья", c.name);
      toast("Статья скрыта: " + c.name);
      await loadCategories(); await load(); setView("set");
    } catch { toast("Ошибка сети", "err"); }
  };

  /* ===== НАСТРОЙКИ: СЧЕТА (реально через /accounting/accounts) ===== */
  const addAccount = async () => {
    const name = window.prompt("Название счёта:");
    if (!name || !name.trim()) return;
    const kindIn = (window.prompt("Тип счёта: cash / bank / card", "cash") || "cash").trim();
    const kind = ["cash", "bank", "card"].includes(kindIn) ? kindIn : "cash";
    const start = parseInt(window.prompt("Стартовый остаток, ₸:", "0") || "0", 10) || 0;
    try {
      const res = await fetch("/api/mvp/accounting/accounts", { method: "POST", headers: HJ, body: JSON.stringify({ name: name.trim(), kind, currency: "KZT", openingBalance: start }) });
      if (!res.ok) return toast("Не удалось создать счёт", "err");
      logHistory("Добавлен счёт", `${name.trim()} · старт ${money(start)}`);
      toast("Счёт добавлен: " + name.trim()); await load(); setView("set");
    } catch { toast("Ошибка сети", "err"); }
  };
  const editAccount = async (a: any) => {
    const v = window.prompt("Название счёта:", a.name);
    if (!v || !v.trim() || v.trim() === a.name) return;
    try {
      const res = await fetch(`/api/mvp/accounting/accounts/${a.id}`, { method: "PATCH", headers: HJ, body: JSON.stringify({ name: v.trim() }) });
      if (!res.ok) return toast("Не удалось изменить счёт", "err");
      logHistory("Изменён счёт", `${a.name} → ${v.trim()}`);
      toast("Счёт изменён: " + v.trim()); await load(); setView("set");
    } catch { toast("Ошибка сети", "err"); }
  };
  const archiveAccount = async (a: any) => {
    if (!window.confirm("Скрыть (архивировать) счёт «" + a.name + "»?")) return;
    try {
      const res = await fetch(`/api/mvp/accounting/accounts/${a.id}`, { method: "DELETE", headers: HJ });
      if (!res.ok) return toast("Не удалось скрыть счёт", "err");
      logHistory("Скрыт счёт", a.name);
      toast("Счёт скрыт: " + a.name); await load(); setView("set");
    } catch { toast("Ошибка сети", "err"); }
  };

  /* ===== НАЛОГИ (реестр через /accounting/taxes) ===== */
  const baseTypeRu = (b?: string) => (b === "revenue" ? "С выручки" : b === "profit" ? "С прибыли" : b === "payroll" ? "С ФОТ" : b === "fixed" ? "Фикс. сумма" : b || "—");
  const taxPeriodRu = (p?: string) => (p === "month" ? "Ежемесячно" : p === "quarter" ? "Ежеквартально" : p === "year" ? "Ежегодно" : p || "—");
  const openTax = () => {
    setTxName(""); setTxBaseType("revenue"); setTxRate(""); setTxFixed(""); setTxPeriodType("month");
    setTxCat(CATEGORIES[0] || ""); setTxAcc(activeAccounts()[0]?.name || ""); setTxBranch("Вся сеть"); setTxComment("");
    setTaxOpen(true);
  };
  const saveTax = async () => {
    const name = txName.trim();
    if (!name) return toast("Введите название налога", "err");
    const isFixed = txBaseType === "fixed";
    const rate = parseFloat(txRate) || 0;
    const fixedAmount = validNum(txFixed);
    if (isFixed && !fixedAmount) return toast("Введите фиксированную сумму", "err");
    if (!isFixed && !rate) return toast("Введите ставку, %", "err");
    try {
      const res = await fetch("/api/mvp/accounting/taxes", {
        method: "POST", headers: HJ,
        body: JSON.stringify({
          name, baseType: txBaseType, rate: isFixed ? 0 : rate, fixedAmount: isFixed ? fixedAmount : 0,
          period: txPeriodType, categoryId: txCat ? catId(txCat, "expense") : null,
          accountId: txAcc ? accId(txAcc) : null, branchId: branchIdByName(txBranch), comment: txComment || null,
        }),
      });
      if (!res.ok) return toast("Не удалось создать налог", "err");
      logHistory("Добавлен налог в реестр", `${name} · ${baseTypeRu(txBaseType)}`);
      toast("Налог добавлен в реестр: " + name);
      setTaxOpen(false); await loadTaxes(); setView("tax");
    } catch { toast("Ошибка сети", "err"); }
  };
  const delTax = async (t: any) => {
    if (!window.confirm("Удалить налог «" + t.name + "» из реестра?")) return;
    try {
      const res = await fetch(`/api/mvp/accounting/taxes/${t.id}`, { method: "DELETE", headers: HJ });
      if (!res.ok) return toast("Не удалось удалить налог", "err");
      logHistory("Удалён налог", t.name);
      toast("Налог удалён: " + t.name); await loadTaxes(); setView("tax");
    } catch { toast("Ошибка сети", "err"); }
  };
  /* предлагаемая сумма к оплате: ставка% × база периода (из overview.totals); фикс — fixedAmount */
  const taxSuggested = (t: any) => {
    if (t.baseType === "fixed") return Number(t.fixedAmount) || 0;
    const base = t.baseType === "revenue" ? Number(overview.totals.income || 0) : t.baseType === "profit" ? Number(overview.totals.profit || 0) : 0;
    return base ? Math.round((base * (Number(t.rate) || 0)) / 100) : 0;
  };
  const payTax = async (t: any) => {
    const sug = taxSuggested(t);
    const input = window.prompt(`Сумма к оплате по «${t.name}», ₸:`, sug ? String(sug) : "");
    if (input === null) return;
    const amount = validNum(input);
    if (!amount) return toast("Введите сумму к оплате", "err");
    try {
      const res = await fetch(`/api/mvp/accounting/taxes/${t.id}/pay`, {
        method: "POST", headers: HJ,
        body: JSON.stringify({ amount, accountId: t.accountId || accId(activeAccounts()[0]?.name || "") || null, date: today() }),
      });
      if (!res.ok) return toast("Не удалось провести налог", "err");
      logHistory("Оплачен налог", `${t.name} · ${money(amount)}`);
      toast("Налог проведён: " + t.name + " " + money(amount));
      await load(); await loadTaxes(); setView("tax");
    } catch { toast("Ошибка сети", "err"); }
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
  }, [EXPENSES, INCOMES, period, fBranch, opsSearch, opsType, opsAcc, opsCat, opsStatus]);
  const resetOpsFilters = () => { setOpsSearch(""); setOpsType(""); setOpsAcc(""); setOpsCat(""); setOpsStatus(""); };

  /* ===== АНАЛИТИКА (← cashflow + pnl) ===== */
  const monthIdx = overview.cashflow.months.indexOf(labelToYm(period));
  const anCats = (() => {
    const entries = overview.cashflow.expenseRows
      .map((r: any) => [r.category, monthIdx >= 0 ? Number(r.byMonth[monthIdx]) || 0 : Number(r.total) || 0] as [string, number])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const raw: any = {}; entries.forEach(([k, v]) => (raw[k] = v));
    return { entries, max: Math.max(1, ...entries.map(([, v]) => v)), raw };
  })();
  const pnlByLabel = (label: string) => overview.pnl.find((p) => p.month === labelToYm(label));
  const monthMetrics = (label: string) => {
    const p = pnlByLabel(label);
    return { rev: p ? Number(p.revenue) : 0, ret: 0, exp: p ? Number(p.expense) : 0, profit: p ? Number(p.profit) : 0 };
  };
  const anMonths = monthLabels;
  const anMonthData = anMonths.map((m) => ({ m, ...monthMetrics(m) }));
  const maxP = Math.max(1, ...anMonthData.map((d) => Math.abs(d.profit)));
  const momCur = monthMetrics(period);
  const momIdx = anMonths.indexOf(period);
  const momPrevM = momIdx > 0 ? anMonths[momIdx - 1] : null;
  const momPrev = momPrevM ? monthMetrics(momPrevM) : null;

  /* ===== СВЕРКА CRM↔ФАКТ — эндпоинта нет ===== */
  const RECON: any[] = [];
  const matched = RECON.filter((r) => r.crm === r.fact);
  const mismatched = RECON.filter((r) => r.crm !== r.fact);
  const recDiff = mismatched.reduce((s, r) => s + (r.crm - r.fact), 0);

  const pending = REQUESTS.filter((r) => r.status === "на рассмотрении");
  const pendingSum = pending.reduce((s, r) => s + r.sum, 0);
  const aiDateStr = "на " + new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const topCat: any = anCats.entries[0];

  /* ===== НАЛОГИ: реестр (фильтр по филиалу) ===== */
  const taxList = useMemo(
    () => TAXES_REG.filter((t) => fBranch === "" || t.branchId == null || branchName(t.branchId) === fBranch),
    [TAXES_REG, fBranch, branchName]
  );

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
              {monthLabels.length ? (
                [...monthLabels].reverse().map((m) => <option key={m}>{m}</option>)
              ) : (
                <option>{period}</option>
              )}
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
            <div className="sub">{ret > 0 ? `вал. ${money(grossRevenueOf(period))} − возвраты ${money(ret)}` : "за период"}</div>
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
              <div className="dg">
                <div className="dl">Сверка CRM ↔ факт</div>
                <div className="ds" style={{ marginTop: 6 }}><span style={{ color: "var(--muted)" }}>Данных пока нет</span></div>
              </div>
              <div className="dg">
                <div className="dl">Абонементы: CRM → факт</div>
                <div className="ds" style={{ marginTop: 6 }}><span style={{ color: "var(--muted)" }}>Данных пока нет</span></div>
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
            {(overview.totals.plannedIn > 0 || overview.totals.plannedOut > 0) && (
              <div className="pt">
                • Плановые: поступления <b>{money(overview.totals.plannedIn)}</b>, платежи <b>{money(overview.totals.plannedOut)}</b>.
              </div>
            )}
          </div>
        </div>

        {/* reconciliation + accounts */}
        <div className="grid2">
          <div className="card">
            <h3>Сверка CRM ↔ фактические поступления</h3>
            {RECON.length ? (
              <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Направление</th>
                    <th className="r tabular-nums">В CRM</th>
                    <th className="r tabular-nums">Факт</th>
                    <th className="r tabular-nums">Расхожд.</th>
                    <th className="r tabular-nums">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {RECON.map((r, i) => {
                    const diff = r.crm - r.fact;
                    const ok = diff === 0;
                    return (
                      <tr key={i}>
                        <td>{r.dir}</td>
                        <td className="r tabular-nums">{money(r.crm)}</td>
                        <td className="r tabular-nums">{money(r.fact)}</td>
                        <td className="r tabular-nums" style={{ color: ok ? "var(--muted)" : "var(--red)" }}>{ok ? "0 ₸" : money(diff)}</td>
                        <td className="r tabular-nums">
                          <span className={"badge " + (ok ? "b-green" : "b-red")}>{ok ? "Сошлось" : "Расхождение"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            ) : (
              <Empty>Сверка CRM ↔ факт появится, когда будет источник данных</Empty>
            )}
          </div>
          <div className="card">
            <h3>Счета</h3>
            <div className="accounts">
              {ACCOUNTS.length ? (
                ACCOUNTS.map((a, i) => {
                  const inc = INCOMES.filter((x) => x.acc === a.name && x.period === period).reduce((s, x) => s + x.sum, 0);
                  const out = EXPENSES.filter((e) => e.acc === a.name && e.period === period && e.status === "Проведён").reduce((s, e) => s + e.sum, 0);
                  return (
                    <div className="acc" key={i} onClick={() => toast("Счёт: " + a.name)}>
                      <div className="nm">{a.icon} {a.name}</div>
                      <div className="bal">{money(a.balance)}</div>
                      <div className="flow">
                        <span className="in">+{money(inc)}</span> · <span className="out">−{money(out)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Empty>Счетов нет. Добавьте в Настройках.</Empty>
              )}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="vtabs">
          <button className={"vtab" + (view === "kassa" ? " active" : "")} onClick={() => setView("kassa")}>Касса</button>
          <button className={"vtab" + (view === "ops" ? " active" : "")} onClick={() => setView("ops")}>Операции</button>
          <button className={"vtab" + (view === "req" ? " active" : "")} onClick={() => setView("req")}>Заявки управляющих</button>
          <button className={"vtab" + (view === "an" ? " active" : "")} onClick={() => setView("an")}>Аналитика</button>
          <button className={"vtab" + (view === "set" ? " active" : "")} onClick={() => setView("set")}>Настройки</button>
          <button className={"vtab" + (view === "tax" ? " active" : "")} onClick={() => setView("tax")}>Налоги</button>
          <button className={"vtab" + (view === "hist" ? " active" : "")} onClick={() => setView("hist")}>История</button>
        </div>

        {/* VIEW: КАССА */}
        {view === "kassa" && <KassaView />}

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
            <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Дата оплаты</th>
                  <th>Период</th>
                  <th>Тип / категория</th>
                  <th>Счёт</th>
                  <th>Филиал</th>
                  <th className="r tabular-nums">Сумма</th>
                  <th className="r tabular-nums">Статус</th>
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
                          <td className="r tabular-nums" style={{ color: "var(--red)", fontWeight: 700 }}>− {money(o.sum)}</td>
                          <td className="r tabular-nums"><span className={"badge " + sb}>{o.status}</span></td>
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
                          <td className="r tabular-nums" style={{ color: "var(--blue-ink)", fontWeight: 700 }}>− {money(o.sum)}</td>
                          <td className="r tabular-nums"><span className="badge b-blue">Возврат</span></td>
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
                        <td className="r tabular-nums" style={{ color: "var(--green)", fontWeight: 700 }}>+ {money(o.sum)}</td>
                        <td className="r tabular-nums"><span className="badge b-green">Поступило</span></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Данных пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* VIEW: REQUESTS */}
        {view === "req" && (
          <div className="card">
            <h3>
              Заявки от управляющих
              <button className="btn-sm" onClick={openReq}>+ Создать заявку</button>
            </h3>
            <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Филиал</th>
                  <th>Тип</th>
                  <th>Категория</th>
                  <th>Ученик / группа</th>
                  <th>Причина</th>
                  <th className="r tabular-nums">Сумма</th>
                  <th className="r tabular-nums">Статус</th>
                  <th className="r tabular-nums">Действие</th>
                </tr>
              </thead>
              <tbody>
                {REQUESTS.length ? (
                  REQUESTS.map((r, idx) => {
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
                        <td className="r tabular-nums">{money(r.sum)}</td>
                        <td className="r tabular-nums"><span className={"badge " + (reqStatusBadge[r.status] || "b-gray")}>{r.status}</span></td>
                        <td className="r tabular-nums">
                          {r.status === "на рассмотрении" ? (
                            <button className="btn-sm" onClick={() => openReview(idx)}>Рассмотреть</button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Данных пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            <p className="hint">
              Управляющий создаёт заявку → владелец одобряет/отклоняет. При одобрении расход/возврат сразу проводится как фактическая операция.
            </p>
          </div>
        )}

        {/* VIEW: ANALYTICS */}
        {view === "an" && (
          <>
            <div className="card">
              <h3>Сравнение с предыдущим месяцем</h3>
              <div style={{ overflowX: "auto" }}>
                {momPrev ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Показатель</th>
                        <th className="r tabular-nums">{period}</th>
                        <th className="r tabular-nums">{momPrevM}</th>
                        <th className="r tabular-nums">Δ</th>
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
                            <td className="r tabular-nums">{money(c)}</td>
                            <td className="r tabular-nums">{p !== null ? money(p) : "—"}</td>
                            <td className="r tabular-nums" style={{ color }}>{dl !== null ? arrow + " " + money(Math.abs(dl)) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <Empty>Для сравнения нужен предыдущий месяц с данными</Empty>
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
                    <Empty>Нет проведённых расходов за период</Empty>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>Расходы по филиалам</h3>
                <Empty>Разбивка по филиалам пока недоступна</Empty>
              </div>
            </div>
            <div className="card">
              <h3>Динамика чистой прибыли по месяцам</h3>
              <div>
                {anMonthData.length ? (
                  anMonthData.map((d, idx) => {
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
                  })
                ) : (
                  <Empty />
                )}
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
                    ACCOUNTS.map((a, i) => (
                      <div className="set-row" key={i}>
                        <span>
                          {a.icon} <b>{a.name}</b>{" "}
                          <span style={{ color: "var(--muted)", fontSize: 13 }}>· старт {money(a.start)}</span>
                        </span>
                        <span style={{ display: "flex", gap: 8 }}>
                          <button className="btn-sm" onClick={() => editAccount(a)}>Изменить</button>
                          <button className="set-del" onClick={() => archiveAccount(a)}>Скрыть</button>
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty>Нет счетов</Empty>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>
                  Филиалы <span style={{ fontWeight: 600, fontSize: 13, color: "var(--muted)" }}>справочник сети</span>
                </h3>
                <div>
                  {BRANCHES.length ? (
                    BRANCHES.map((b, i) => (
                      <div className="set-row" key={i}>
                        <span>{b}</span>
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>только просмотр</span>
                      </div>
                    ))
                  ) : (
                    <Empty>Нет филиалов</Empty>
                  )}
                </div>
              </div>
            </div>
            <div className="grid2">
              <div className="card">
                <h3>
                  Статьи расходов <button className="btn-sm" onClick={() => addCategory("expense")}>+ Добавить</button>
                </h3>
                <div>
                  {expenseCats.length ? (
                    expenseCats.map((c: any) => (
                      <div className="set-row" key={c.id}>
                        <span>{c.name}</span>
                        <span style={{ display: "flex", gap: 8 }}>
                          <button className="btn-sm" onClick={() => renameCategory(c)}>Изменить</button>
                          <button className="set-del" onClick={() => deleteCategory(c)}>Скрыть</button>
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty>Нет статей расходов</Empty>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>
                  Статьи доходов <button className="btn-sm" onClick={() => addCategory("income")}>+ Добавить</button>
                </h3>
                <div>
                  {incomeCats.length ? (
                    incomeCats.map((c: any) => (
                      <div className="set-row" key={c.id}>
                        <span>{c.name}</span>
                        <span style={{ display: "flex", gap: 8 }}>
                          <button className="btn-sm" onClick={() => renameCategory(c)}>Изменить</button>
                          <button className="set-del" onClick={() => deleteCategory(c)}>Скрыть</button>
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty>Нет статей доходов</Empty>
                  )}
                </div>
              </div>
            </div>
            <p className="hint">Счета и статьи доходов/расходов сохраняются на сервере и используются в операциях и налогах. Филиалы редактируются в разделе «Филиалы» сети.</p>
          </>
        )}

        {/* VIEW: TAXES */}
        {view === "tax" && (
          <div className="card">
            <h3>
              Налоги · реестр <button className="btn-sm" onClick={openTax}>+ Добавить налог</button>
            </h3>
            <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Налог</th>
                  <th>База</th>
                  <th className="r tabular-nums">Ставка / сумма</th>
                  <th>Периодичность</th>
                  <th>Статья · счёт</th>
                  <th className="r tabular-nums">Статус</th>
                  <th className="r tabular-nums">Действие</th>
                </tr>
              </thead>
              <tbody>
                {taxList.length ? (
                  taxList.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.name}</b>{t.comment ? <><br /><span style={{ color: "var(--muted)", fontSize: 12 }}>{t.comment}</span></> : null}</td>
                      <td>{baseTypeRu(t.baseType)}</td>
                      <td className="r tabular-nums" style={{ fontWeight: 700 }}>
                        {t.baseType === "fixed" ? money(Number(t.fixedAmount) || 0) : (Number(t.rate) || 0) + "%"}
                      </td>
                      <td>{taxPeriodRu(t.period)}</td>
                      <td>
                        {catById(t.categoryId)}
                        <br />
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{accById(t.accountId)}</span>
                      </td>
                      <td className="r tabular-nums"><span className="badge b-green">Активен</span></td>
                      <td className="r tabular-nums">
                        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="btn-sm" onClick={() => payTax(t)}>Оплатить</button>
                          <button className="set-del" onClick={() => delTax(t)}>Удалить</button>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Данных пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            <div className="ops-summary">
              <span>Налогов в реестре: <b>{taxList.length}</b></span>
            </div>
            <p className="hint">Реестр налогов. «Оплатить» проводит фактический расход по налогу за выбранный период; для налогов с базой (выручка/прибыль) сумма предлагается по данным периода, но подтверждается вручную.</p>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === "hist" && (
          <div className="card">
            <h3>
              История операций <span style={{ fontWeight: 600, fontSize: 13, color: "var(--muted)" }}>последние записи</span>
            </h3>
            <div style={{ overflowX: "auto" }}>
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
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Данных пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
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
                <label>Период расхода</label>
                <select value={ePeriod} onChange={(e) => setEPeriod(e.target.value)}>
                  {monthLabels.length ? [...monthLabels].reverse().map((m) => <option key={m}>{m}</option>) : <option>{ePeriod}</option>}
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
                  <option>Проведён</option><option>Черновик</option>
                </select>
              </div>
              <div className="field"><label>Чек / файл</label><button className="btn-sm" type="button" onClick={() => toast("Прикрепление чека")}>📎 Прикрепить</button></div>
              <div className="field full"><label>Комментарий</label><input placeholder="Например: аренда филиала за июнь" value={eNote} onChange={(e) => setENote(e.target.value)} /></div>
            </div>
            <p className="hint">
              Расход проводится по дате оплаты. Статус «Черновик» — плановая операция, «Проведён» — фактическая.
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
              <p className="hint">Для возврата укажите ученика — это связывает заявку с клиентом и филиалом для отчётности.</p>
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
                  {monthLabels.length ? [...monthLabels].reverse().map((m) => <option key={m}>{m}</option>) : <option>{revPeriod}</option>}
                </select>
              </div>
              <div className="field full"><label>Комментарий владельца</label><input placeholder="Необязательно" value={revNote} onChange={(e) => setRevNote(e.target.value)} /></div>
            </div>
            <p className="hint">
              {reviewReq
                ? reviewIsReturn
                  ? "При одобрении сумма спишется со счёта как возврат ученику " + (reviewReq.student || "—") + " и станет фактической операцией."
                  : "При одобрении расход спишется с выбранного счёта и сразу станет проведённой операцией."
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

      {/* ===== МОДАЛКА: НОВЫЙ НАЛОГ (реестр) ===== */}
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
                <label>Тип базы *</label>
                <select value={txBaseType} onChange={(e) => setTxBaseType(e.target.value)}>
                  <option value="revenue">С выручки</option>
                  <option value="profit">С прибыли</option>
                  <option value="payroll">С ФОТ</option>
                  <option value="fixed">Фиксированная сумма</option>
                </select>
              </div>
              <div className="field">
                <label>Периодичность *</label>
                <select value={txPeriodType} onChange={(e) => setTxPeriodType(e.target.value)}>
                  <option value="month">Ежемесячно</option>
                  <option value="quarter">Ежеквартально</option>
                  <option value="year">Ежегодно</option>
                </select>
              </div>
              {txBaseType === "fixed" ? (
                <div className="field"><label>Фикс. сумма, ₸ *</label><input type="number" placeholder="33000" value={txFixed} onChange={(e) => setTxFixed(e.target.value)} /></div>
              ) : (
                <div className="field"><label>Ставка, % *</label><input type="number" step="0.1" placeholder="10" value={txRate} onChange={(e) => setTxRate(e.target.value)} /></div>
              )}
              <div className="field">
                <label>Статья расхода</label>
                <select value={txCat} onChange={(e) => setTxCat(e.target.value)}>
                  <option value="">— не выбрана —</option>
                  {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Счёт списания</label>
                <select value={txAcc} onChange={(e) => setTxAcc(e.target.value)}>
                  <option value="">— не выбран —</option>
                  {activeAccounts().map((a) => (<option key={a.name}>{a.name}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Филиал</label>
                <select value={txBranch} onChange={(e) => setTxBranch(e.target.value)}>
                  <option>Вся сеть</option>
                  {BRANCHES.map((b) => (<option key={b}>{b}</option>))}
                </select>
              </div>
              <div className="field full"><label>Комментарий</label><input placeholder="Необязательно" value={txComment} onChange={(e) => setTxComment(e.target.value)} /></div>
            </div>
            <p className="hint">Запись добавляется в реестр налогов. Фактический расход проводится позже кнопкой «Оплатить» в списке налогов — сумма подтверждается вручную.</p>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setTaxOpen(false)}>Отмена</button>
              <button className="btn-gold" onClick={saveTax}>Добавить в реестр</button>
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
