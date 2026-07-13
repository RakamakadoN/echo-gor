import { useEffect, useMemo, useState } from "react";
import type { Student, Payment, Branch, Group, Teacher, LeadSource } from "../../types";
import "./reports-proto.css";

/* ============================================================
   ЭХО ГОР — Отчётность
   Реальные данные: props (ученики/платежи/филиалы/группы/
   преподаватели/источники) + /api/mvp/accounting/* (финансы).
   Где источника нет (рекламный бюджет/CPL/CAC/ROMI, снимки,
   AI-выводы) — заглушка «Данных пока нет».
   ============================================================ */

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const H = { "x-demo-role": "owner" } as const;

const WINBACK_OFFERS: any[] = [
  { id: "discount", name: "Скидка на возврат", text: "Здравствуйте, {name}! Мы скучаем по вам в студии «Эхо Гор» 💛 Возвращайтесь — дарим скидку 30% на первый месяц. Записать вас на удобное время?" },
  { id: "trial", name: "Бесплатное занятие", text: "Здравствуйте, {name}! В «Эхо Гор» появились новые группы и расписание. Приглашаем на бесплатное пробное занятие — просто приходите, мы будем рады вас видеть!" },
  { id: "oldprice", name: "Возврат по старой цене", text: "Здравствуйте, {name}! Только для вернувшихся учеников сохраняем прежнюю стоимость абонемента. Предложение ограничено — хотите вернуться?" },
  { id: "custom", name: "Свой текст", text: "Здравствуйте, {name}! " },
];

function fmt(n: number) {
  return Math.round(n || 0).toLocaleString("ru-RU");
}
function onlyDigits(p: any) {
  return String(p || "").replace(/[^\d]/g, "");
}
function monthName(ym: string) {
  const p = ym.split("-");
  const m = +p[1] - 1;
  return (MONTHS_RU[m] || "") + " " + p[0];
}
function winbackMsg(c: any, tpl: string) {
  return tpl.replace(/\{name\}/g, (c.name || "").split(" ")[0] || c.name || "");
}
function datePart(s: any) {
  return String(s || "").slice(0, 10);
}
function almatyToday() {
  try {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
function addDays(ymd: string, n: number) {
  const d = new Date((ymd || almatyToday()) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function lastDayOf(y: number, m1: number) {
  return new Date(y, m1, 0).getDate();
}

/* ===== ЗАГЛУШКА «Данных пока нет» ===== */
function Empty({ children }: { children?: any }) {
  return <div className="rep-stub">{children || "Данных пока нет"}</div>;
}

function KpiCard({ lbl, val, sub, color }: any) {
  return (
    <div className="kpi-c">
      <div className="kpi-c-lbl">{lbl}</div>
      <div className="kpi-c-val" style={color ? { color } : undefined}>{val}</div>
      {sub ? <div className="kpi-c-sub">{sub}</div> : null}
    </div>
  );
}

const SUBTABS: any[] = [
  { id: "fin", label: "Финансовые операции" },
  { id: "subs", label: "Абонементы" },
  { id: "trials", label: "Пробные и отказы" },
  { id: "mkt", label: "Маркетинг" },
  { id: "ai", label: "AI-отчёты" },
  { id: "history", label: "История" },
];

interface ReportsProtoViewProps {
  students?: Student[];
  payments?: Payment[];
  branches?: Branch[];
  groups?: Group[];
  teachers?: Teacher[];
  leadSources?: LeadSource[];
}

export function ReportsProtoView({
  students = [],
  payments = [],
  branches = [],
  groups = [],
  teachers = [],
  leadSources = [],
}: ReportsProtoViewProps) {
  const now = new Date();
  const nowMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = almatyToday();

  const [subtab, setSubtab] = useState("fin");
  const [period, setPeriod] = useState("month");
  const [monthVal, setMonthVal] = useState(nowMonthVal);
  const [dateVal, setDateVal] = useState(todayStr);
  const [fromVal, setFromVal] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
  const [toVal, setToVal] = useState(todayStr);
  const [scope, setScope] = useState("all");
  const [finType, setFinType] = useState("all");
  const [cmpPeriod, setCmpPeriod] = useState("prev");
  const [ownerComment, setOwnerComment] = useState("");
  const [winbackOpen, setWinbackOpen] = useState(false);
  const [wbMonth, setWbMonth] = useState("all");
  const [wbReason, setWbReason] = useState("all");
  const [wbOfferId, setWbOfferId] = useState("discount");
  const [wbText, setWbText] = useState(WINBACK_OFFERS[0].text);
  const [toast, setToast] = useState("");

  /* ===== ФИНАНСЫ (реальные, /api/mvp/accounting/*) ===== */
  const [operations, setOperations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pnl, setPnl] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ovR, opR] = await Promise.all([
          fetch("/api/mvp/accounting/overview", { headers: H }),
          fetch("/api/mvp/accounting/operations", { headers: H }),
        ]);
        const ov = ovR.ok ? await ovR.json() : {};
        const op = opR.ok ? await opR.json() : {};
        if (!alive) return;
        setCategories(ov.categories || []);
        setAccounts(ov.accounts || []);
        setPnl(ov.pnl || []);
        setOperations(op.operations || []);
      } catch {
        /* 403/503/сеть — оставляем пустые состояния, без падения */
      }
    })();
    return () => { alive = false; };
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2400);
  }

  const [yStr, mStr] = monthVal.split("-");
  const year = +yStr;
  const month = +mStr - 1;
  const day = dateVal ? +dateVal.split("-")[2] : now.getDate();

  function periodLabel() {
    if (period === "month") return MONTHS_RU[month] + " " + year;
    if (period === "year") return "" + year;
    if (period === "quarter") return "Q" + (Math.floor(month / 3) + 1) + " " + year;
    if (period === "today") return "Сегодня · " + day + " " + MONTHS_RU[month];
    if (period === "yesterday") return "Вчера";
    if (period === "week") return "Неделя · " + day + " " + MONTHS_RU[month];
    if (period === "custom") return (fromVal || "") + " — " + (toVal || "");
    return MONTHS_RU[month] + " " + year;
  }
  const label = periodLabel();

  function scopeName() {
    if (scope === "all") return "Вся сеть";
    const br = branches.find((x) => x.id === scope);
    return br ? br.name : "—";
  }

  /* ---- диапазон периода [pFrom, pTo] в YYYY-MM-DD ---- */
  const [pFrom, pTo] = useMemo(() => {
    if (period === "today") { const d = dateVal || todayStr; return [d, d]; }
    if (period === "yesterday") { const d = addDays(dateVal || todayStr, -1); return [d, d]; }
    if (period === "week") { const end = dateVal || todayStr; return [addDays(end, -6), end]; }
    if (period === "month") { const from = `${monthVal}-01`; const to = `${monthVal}-${String(lastDayOf(year, month + 1)).padStart(2, "0")}`; return [from, to]; }
    if (period === "quarter") { const q = Math.floor(month / 3); const sm = q * 3 + 1; const em = q * 3 + 3; return [`${year}-${String(sm).padStart(2, "0")}-01`, `${year}-${String(em).padStart(2, "0")}-${String(lastDayOf(year, em)).padStart(2, "0")}`]; }
    if (period === "year") return [`${year}-01-01`, `${year}-12-31`];
    if (period === "custom") return [fromVal || "0000-01-01", toVal || "9999-12-31"];
    return [`${monthVal}-01`, `${monthVal}-${String(lastDayOf(year, month + 1)).padStart(2, "0")}`];
  }, [period, dateVal, monthVal, fromVal, toVal, year, month, todayStr]);

  const inPeriod = (s: any) => { const d = datePart(s); return !!d && d >= pFrom && d <= pTo; };
  const inScope = (branchId: any) => scope === "all" || branchId === scope;

  const showMonthInput = period === "month" || period === "quarter" || period === "year";
  const showDateInput = period === "today" || period === "yesterday" || period === "week";
  const showRange = period === "custom";

  const catById = (id?: string) => categories.find((c) => c.id === id)?.name || "Без статьи";
  const accById = (id?: string) => accounts.find((a) => a.id === id)?.name || "—";
  const filterSelStyle: any = { fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: "1px solid var(--border-c)", background: "var(--control)", color: "var(--text)", cursor: "pointer" };

  /* ---- 1. Финансовые операции (реальные из бухгалтерии) ---- */
  const opInScope = (o: any) => scope === "all" || !o.branchId || o.branchId === scope;
  const periodOps = operations.filter((o) => inPeriod(o.date) && opInScope(o));
  const rev = periodOps.filter((o) => o.type === "income").reduce((s, o) => s + Number(o.amount || 0), 0);
  const exp = periodOps.filter((o) => o.type === "expense").reduce((s, o) => s + Number(o.amount || 0), 0);
  const profit = rev - exp;
  const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0;

  const opRows = periodOps.map((o) => {
    const cat = catById(o.categoryId);
    const isExp = o.type === "expense";
    return {
      date: datePart(o.date), branch: scopeName(), group: "—",
      who: o.description || cat, cat, type: o.type,
      typeLabel: isExp ? "Расход" : "Поступление",
      sum: isExp ? -Number(o.amount || 0) : Number(o.amount || 0),
      pay: accById(o.accountId), resp: "—",
    };
  });
  function matchFinType(r: any) {
    if (finType === "all") return true;
    if (finType === "expense") return r.type === "expense";
    if (finType === "income") return r.type === "income";
    const c = String(r.cat || "").toLowerCase();
    if (finType === "subs") return r.type === "income" && /абонемент/.test(c);
    if (finType === "goods") return r.type === "income" && /товар/.test(c);
    if (finType === "shows") return r.type === "income" && /(выступ|концерт)/.test(c);
    if (finType === "refund") return /возврат/.test(c);
    return true;
  }
  const finFiltered = opRows.filter(matchFinType);

  /* ---- 2. Абонементы (реальные из платежей + подписок) ---- */
  const subPayments = payments.filter((p) => p.type === "subscription" && inPeriod(p.date) && inScope(p.branchId));
  const subCount = subPayments.length;
  const subSum = subPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const subAvg = subCount ? Math.round(subSum / subCount) : 0;
  const activeStudents = students.filter((s) => inScope(s.branchId) && ((s.computedStatus || s.status) === "active")).length;
  const subRows: any[] = [];
  students.forEach((s) => {
    if (!inScope(s.branchId)) return;
    (s.subscriptions || []).forEach((sub: any) => {
      const when = sub.soldOn || sub.startsOn;
      if (!inPeriod(when)) return;
      subRows.push({ name: s.name, type: sub.name, soldOn: datePart(when), starts: datePart(sub.startsOn), status: sub.status, price: Number(sub.price || 0) });
    });
  });

  /* ---- 3. Пробные и отказы (реальные из посещаемости и архива) ---- */
  let tBooked = 0, tConverted = 0, tLost = 0;
  students.forEach((s) => {
    if (!inScope(s.branchId)) return;
    let trialInPeriod = false, outcome: string | null = null;
    Object.values(s.attendance || {}).forEach((a: any) => {
      if (a && a.isTrial && inPeriod(a.date)) {
        trialInPeriod = true;
        if (a.trialOutcome === "converted") outcome = "converted";
        else if (a.trialOutcome === "lost" && outcome !== "converted") outcome = "lost";
        else if (!outcome) outcome = a.trialOutcome || "pending";
      }
    });
    if (!trialInPeriod && (s.computedStatus || s.status) === "trial" && inPeriod(s.createdAt)) { trialInPeriod = true; outcome = "pending"; }
    if (trialInPeriod) { tBooked++; if (outcome === "converted") tConverted++; else if (outcome === "lost") tLost++; }
  });
  const tAttended = tConverted + tLost;
  const t_noShow = Math.max(0, tBooked - tAttended);

  const refusals = students
    .filter((s) => inScope(s.branchId) && (s.archivedAt || ["left", "archived"].includes(s.computedStatus || "") || ["left", "archived"].includes(s.status || "")))
    .map((s) => ({ name: s.name, phone: s.parentPhone || s.phone || "", reason: s.archiveReason || "—", date: datePart(s.archivedAt), comment: s.archiveComment || "" }));
  const byReason: any = {};
  refusals.forEach((r) => { byReason[r.reason] = (byReason[r.reason] || 0) + 1; });
  const reasonRows = Object.keys(byReason).sort((a, c) => byReason[c] - byReason[a]).map((k) => ({ reason: k, count: byReason[k], pct: refusals.length ? Math.round((byReason[k] / refusals.length) * 100) : 0 }));

  /* ---- Winback (реальные ушедшие) ---- */
  const churn = refusals;
  const wbReasons = Object.keys(churn.reduce((a: any, c: any) => { if (c.reason && c.reason !== "—") a[c.reason] = 1; return a; }, {}));
  const wbMonths = Object.keys(churn.reduce((a: any, c: any) => { if (c.date) a[c.date.slice(0, 7)] = 1; return a; }, {})).sort().reverse();
  const wbFiltered = churn.filter((c: any) => {
    if (wbMonth !== "all" && (!c.date || c.date.slice(0, 7) !== wbMonth)) return false;
    if (wbReason !== "all" && c.reason !== wbReason) return false;
    return true;
  });

  /* ---- 4. Маркетинг (лиды реальные; рекламные метрики — нет данных) ---- */
  const sourceName = (id?: string | null) => leadSources.find((ls) => ls.id === id)?.name || "Без источника";
  const leadStudents = students.filter((s) => inScope(s.branchId) && inPeriod(s.createdAt));
  const totalLeads = leadStudents.length;
  const bySourceMap: any = {};
  leadStudents.forEach((s) => { const n = sourceName(s.sourceId); bySourceMap[n] = (bySourceMap[n] || 0) + 1; });
  const leadRows = Object.keys(bySourceMap).map((n) => ({ source: n, count: bySourceMap[n], pct: totalLeads ? Math.round((bySourceMap[n] / totalLeads) * 100) : 0 }));
  let f_trial = 0, f_attend = 0, f_buy = 0, f_renew = 0, newRev = 0;
  leadStudents.forEach((s) => {
    const atts = Object.values(s.attendance || {}) as any[];
    const hasTrial = atts.some((a) => a && a.isTrial) || (s.computedStatus || s.status) === "trial";
    const attended = atts.some((a) => a && a.isTrial && (a.trialOutcome === "converted" || a.trialOutcome === "lost"));
    const subs = (s.subscriptions || []).filter((x: any) => x.status !== "deleted");
    if (hasTrial) f_trial++;
    if (attended) f_attend++;
    if (subs.length > 0) f_buy++;
    if (subs.length > 1) f_renew++;
    subs.forEach((sub: any) => { if (inPeriod(sub.soldOn || sub.startsOn)) newRev += Number(sub.price || 0); });
  });

  /* ---- 5. Сравнение периодов (реальный P&L из бухгалтерии) ---- */
  const cmpLabel =
    cmpPeriod === "prev" ? "Предыдущий месяц" :
    cmpPeriod === "year" ? "Тот же месяц год назад" :
    cmpPeriod === "avg3" ? "Среднее за 3 мес" : "Среднее за 12 мес";
  const cmp = useMemo(() => {
    if (!pnl.length) return null;
    let curIdx = pnl.findIndex((p) => p.month === monthVal);
    if (curIdx < 0) curIdx = pnl.length - 1;
    const cur = pnl[curIdx];
    if (!cur) return null;
    const curRev = Number(cur.revenue || 0);
    let cmpRev: number | null = null;
    if (cmpPeriod === "prev") { const p = pnl[curIdx - 1]; cmpRev = p ? Number(p.revenue || 0) : null; }
    else if (cmpPeriod === "year") {
      const cm = String(cur.month).split("-"); const target = `${+cm[0] - 1}-${cm[1]}`;
      const p = pnl.find((x) => x.month === target); cmpRev = p ? Number(p.revenue || 0) : null;
    } else if (cmpPeriod === "avg3") {
      const prev = pnl.slice(Math.max(0, curIdx - 3), curIdx); cmpRev = prev.length ? Math.round(prev.reduce((s, p) => s + Number(p.revenue || 0), 0) / prev.length) : null;
    } else if (cmpPeriod === "avg12") {
      const prev = pnl.slice(Math.max(0, curIdx - 12), curIdx); cmpRev = prev.length ? Math.round(prev.reduce((s, p) => s + Number(p.revenue || 0), 0) / prev.length) : null;
    }
    const dev = cmpRev != null && cmpRev > 0 ? Math.round(((curRev - cmpRev) / cmpRev) * 100) : null;
    return { curRev, cmpRev, dev, monthLabel: monthName(cur.month) };
  }, [pnl, monthVal, cmpPeriod]);

  function onOfferChange(id: string) {
    setWbOfferId(id);
    const o = WINBACK_OFFERS.filter((x) => x.id === id)[0];
    if (o) setWbText(o.text);
  }
  function sendAllWinback() {
    const withPhone = wbFiltered.filter((c: any) => onlyDigits(c.phone));
    if (!withPhone.length) { flash("Нет получателей с телефоном"); return; }
    withPhone.forEach((c: any) => {
      const url = "https://wa.me/" + onlyDigits(c.phone) + "?text=" + encodeURIComponent(winbackMsg(c, wbText));
      window.open(url, "_blank");
    });
    flash("Открыто " + withPhone.length + " чатов WhatsApp");
  }

  return (
    <div className="proto-reports">
      <div className="bdr">
        {/* ===== ШАПКА ===== */}
        <div className="page-head">
          <div>
            <div className="page-title">Отчётность</div>
            <div className="page-sub">Единый аналитический центр · что произошло · почему · что делать дальше</div>
          </div>
          <div className="head-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-brand" onClick={() => flash("📸 Снимок периода «" + label + "» — сохранение снимков появится с подключением хранилища")}>📸 Сохранить снимок периода</button>
            <span style={{ fontSize: 11, color: "var(--text2)" }} title="Персистентности снимков в системе пока нет.">ⓘ снимки пока не хранятся</span>
          </div>
        </div>

        {/* ===== ЕДИНЫЕ ФИЛЬТРЫ ===== */}
        <div className="rep-filters">
          <label className="flabel">Период:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Сегодня</option>
            <option value="yesterday">Вчера</option>
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="quarter">Квартал</option>
            <option value="year">Год</option>
            <option value="custom">Произвольный</option>
          </select>
          {showMonthInput && <input type="month" value={monthVal} onChange={(e) => setMonthVal(e.target.value)} />}
          {showDateInput && <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />}
          {showRange && (
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="date" value={fromVal} onChange={(e) => setFromVal(e.target.value)} />
              <span style={{ color: "var(--text2)", fontSize: 12 }}>—</span>
              <input type="date" value={toVal} onChange={(e) => setToVal(e.target.value)} />
            </span>
          )}
          <label className="flabel" style={{ marginLeft: 8 }}>Область:</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">Вся сеть</option>
            {branches.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--gold-c)", fontWeight: 700, marginLeft: "auto" }}>{label}</span>
        </div>

        {/* ===== ПОДРАЗДЕЛЫ ===== */}
        <div className="rep-subtabs">
          {SUBTABS.map((t) => (
            <div key={t.id} className={"rep-subtab" + (subtab === t.id ? " active" : "")} onClick={() => setSubtab(t.id)}>{t.label}</div>
          ))}
        </div>

        {/* ===== 1. ФИНАНСОВЫЕ ОПЕРАЦИИ ===== */}
        <div className={"rep-panel" + (subtab === "fin" ? " active" : "")}>
          <div className="kpi-cards">
            <KpiCard lbl="Поступления" val={fmt(rev) + " ₸"} sub="за период" />
            <KpiCard lbl="Расходы" val={fmt(exp) + " ₸"} color="var(--red-c)" />
            <KpiCard lbl="Прибыль" val={fmt(profit) + " ₸"} sub={margin + "% маржа"} color="var(--green-c)" />
            <KpiCard lbl="Операций" val={fmt(finFiltered.length)} sub="показано" />
          </div>
          <div className="rep-card">
            <h3>Реестр финансовых операций</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              <label className="flabel">Тип операции:</label>
              <select value={finType} onChange={(e) => setFinType(e.target.value)} style={filterSelStyle}>
                <option value="all">Все операции</option>
                <option value="subs">Абонементы</option>
                <option value="goods">Товары</option>
                <option value="shows">Выступления</option>
                <option value="refund">Возвраты</option>
                <option value="expense">Расходы</option>
                <option value="income">Поступления</option>
              </select>
            </div>
            <div className="rep-tablewrap">
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Дата</th><th>Филиал</th><th>Статья</th><th>Описание</th><th>Тип</th>
                    <th style={{ textAlign: "right" }}>Сумма</th><th>Счёт</th><th>Ответственный</th>
                  </tr>
                </thead>
                <tbody>
                  {finFiltered.length ? finFiltered.map((o, i) => (
                    <tr key={i}>
                      <td>{o.date}</td><td>{o.branch}</td><td>{o.cat}</td><td>{o.who}</td><td>{o.typeLabel}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: o.sum < 0 ? "var(--red-c)" : "var(--heading)" }}>{(o.sum < 0 ? "−" : "") + fmt(Math.abs(o.sum)) + " ₸"}</td>
                      <td>{o.pay}</td><td>{o.resp}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text2)", padding: 18 }}>Данных пока нет — операций этого типа за период не найдено</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="rep-export">
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в PDF — появится позже")}>📄 PDF</button>
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в Excel — появится позже")}>📊 Excel</button>
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в WhatsApp — появится позже")}>💬 WhatsApp</button>
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в Email — появится позже")}>✉️ Email</button>
            </div>
          </div>
        </div>

        {/* ===== 2. АБОНЕМЕНТЫ ===== */}
        <div className={"rep-panel" + (subtab === "subs" ? " active" : "")}>
          <div className="kpi-cards">
            <KpiCard lbl="Активных учеников" val={fmt(activeStudents)} sub="статус «активен»" />
            <KpiCard lbl="Средний чек" val={subAvg ? fmt(subAvg) + " ₸" : "—"} sub={subAvg ? "по продажам периода" : "Данных пока нет"} />
            <KpiCard lbl="Продаж за период" val={fmt(subCount)} sub="платежи · абонементы" />
            <KpiCard lbl="Сумма продаж" val={fmt(subSum) + " ₸"} sub="за период" color="var(--green-c)" />
          </div>
          <div className="rep-card">
            <h3>Отчёт по абонементам</h3>
            {subRows.length ? (
              <div className="rep-tablewrap">
                <table className="rep-table">
                  <thead><tr><th>Ученик</th><th>Тип</th><th>Дата продажи</th><th>Начало</th><th>Статус</th><th style={{ textAlign: "right" }}>Стоимость</th></tr></thead>
                  <tbody>
                    {subRows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.name}</td><td>{r.type || "—"}</td><td>{r.soldOn || "—"}</td><td>{r.starts || "—"}</td>
                        <td>{r.status === "active" ? "Активен" : r.status === "expired" ? "Истёк" : r.status === "suspended" ? "Приостановлен" : r.status || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(r.price)} ₸</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--border-c)" }}>
                      <td style={{ fontWeight: 700 }} colSpan={5}>Итого продаж</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{fmt(subRows.reduce((s, r) => s + r.price, 0))} ₸</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Данных пока нет — продаж абонементов за выбранный период не найдено</Empty>
            )}
          </div>
        </div>

        {/* ===== 3. ПРОБНЫЕ И ОТКАЗЫ ===== */}
        <div className={"rep-panel" + (subtab === "trials" ? " active" : "")}>
          <div className="kpi-cards">
            <KpiCard lbl="Записано на пробный" val={fmt(tBooked)} />
            <KpiCard lbl="Пришло" val={fmt(tAttended)} sub={tBooked > 0 ? Math.round((tAttended / tBooked) * 100) + "% от записи" : "—"} />
            <KpiCard lbl="Купило" val={fmt(tConverted)} sub={tAttended > 0 ? Math.round((tConverted / tAttended) * 100) + "% от прихода" : "—"} color="var(--green-c)" />
            <KpiCard lbl="Не купило" val={fmt(tLost)} color="var(--red-c)" />
          </div>
          <div className="rep-card">
            <h3>Воронка пробных уроков</h3>
            {tBooked > 0 ? (
              <>
                <div className="funnel-row head"><span>Этап</span><span>Количество</span><span>Конверсия</span><span>Не прошло</span></div>
                <FunRow name="Записано на пробный" cnt={tBooked} conv="—" lost={0} />
                <FunRow name="Пришло на пробный" cnt={tAttended} conv={tBooked > 0 ? Math.round((tAttended / tBooked) * 100) + "%" : "—"} lost={t_noShow} />
                <FunRow name="Купило абонемент" cnt={tConverted} conv={tAttended > 0 ? Math.round((tConverted / tAttended) * 100) + "%" : "—"} lost={tLost} />
              </>
            ) : (
              <Empty>Данных пока нет — пробных уроков за период не отмечено. Пробные считаются по отметкам посещаемости с признаком «пробное».</Empty>
            )}
          </div>
          <div className="rep-card">
            <h3>История отказов и причины ухода
              <button className="btn btn-brand" style={{ float: "right", padding: "6px 14px", fontSize: 12 }} onClick={() => setWinbackOpen(!winbackOpen)}>↩ Запустить возврат с оффером</button>
            </h3>
            {refusals.length ? (
              <div className="rep-tablewrap">
                <table className="rep-table">
                  <thead><tr><th>Ученик</th><th>Причина</th><th>Дата</th><th>Комментарий</th></tr></thead>
                  <tbody>
                    {refusals.map((r, i) => (
                      <tr key={i}><td>{r.name}</td><td>{r.reason}</td><td>{r.date || "—"}</td><td>{r.comment || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Данных пока нет — ушедших учеников не найдено. Записи появятся, когда ученик будет переведён в архив с указанием причины.</Empty>
            )}
          </div>

          {winbackOpen && (
            <div className="rep-card" style={{ border: "2px solid var(--gold-c)" }}>
              <h3>↩ Рассылка для возврата ушедших</h3>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <label className="flabel">Кому:</label>
                <select value={wbMonth} onChange={(e) => setWbMonth(e.target.value)} style={filterSelStyle}>
                  <option value="all">Все месяцы</option>
                  {wbMonths.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
                </select>
                <select value={wbReason} onChange={(e) => setWbReason(e.target.value)} style={filterSelStyle}>
                  <option value="all">Все причины</option>
                  {wbReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <label className="flabel" style={{ marginLeft: 8 }}>Оффер:</label>
                <select value={wbOfferId} onChange={(e) => onOfferChange(e.target.value)} style={filterSelStyle}>
                  {WINBACK_OFFERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <textarea value={wbText} onChange={(e) => setWbText(e.target.value)} style={{ width: "100%", minHeight: 70, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, padding: 10, borderRadius: 10, border: "1px solid var(--border-c)", background: "var(--control)", color: "var(--text)", resize: "vertical" }} />
              <div style={{ fontSize: 11.5, color: "var(--text2)", margin: "6px 0 14px" }}><b>{"{name}"}</b> заменяется на имя. Отправка — по кнопке у каждого (откроется WhatsApp с готовым текстом).</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <button className="btn btn-brand" onClick={sendAllWinback}>💬 Открыть все в WhatsApp</button>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>Получателей: {wbFiltered.length}</span>
              </div>
              <div className="rep-tablewrap">
                <table className="rep-table">
                  <thead><tr><th>Ученик</th><th>Причина</th><th>Дата ухода</th><th>Сообщение</th><th style={{ textAlign: "right" }}>Отправить</th></tr></thead>
                  <tbody>
                    {wbFiltered.length ? wbFiltered.map((c, i) => {
                      const msg = winbackMsg(c, wbText);
                      const phone = onlyDigits(c.phone);
                      const waUrl = phone ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg) : "";
                      return (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td style={{ color: "var(--text2)" }}>{c.reason || "—"}</td>
                          <td style={{ fontSize: 12, color: "var(--text2)" }}>{c.date || "—"}</td>
                          <td style={{ fontSize: 12, color: "var(--text2)", maxWidth: 300 }}>{msg}</td>
                          <td style={{ textAlign: "right" }}>
                            {waUrl
                              ? <a href={waUrl} target="_blank" rel="noreferrer" className="btn btn-brand" style={{ padding: "5px 12px", fontSize: 12, textDecoration: "none" }}>💬 WhatsApp</a>
                              : <span style={{ fontSize: 11, color: "var(--text2)" }}>нет телефона</span>}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text2)", padding: 14 }}>Нет получателей по фильтрам</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="ai-block">
            <h4>Распределение причин ухода</h4>
            {reasonRows.length ? (
              <div className="rep-tablewrap">
                <table className="rep-table">
                  <thead><tr><th>Причина</th><th style={{ textAlign: "right" }}>Учеников</th><th style={{ textAlign: "right" }}>Доля</th></tr></thead>
                  <tbody>
                    {reasonRows.map((r, i) => (
                      <tr key={i}><td>{r.reason}</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(r.count)}</td><td style={{ textAlign: "right" }}>{r.pct}%</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="rep-stub" style={{ marginTop: 12 }}>Показано фактическое распределение причин ухода. AI-анализ и рекомендации — данных пока нет.</div>
              </div>
            ) : (
              <Empty>Данных пока нет</Empty>
            )}
          </div>
        </div>

        {/* ===== 4. МАРКЕТИНГ ===== */}
        <div className={"rep-panel" + (subtab === "mkt" ? " active" : "")}>
          <div className="kpi-cards">
            <KpiCard lbl="Рекл. бюджет" val="—" sub="Данных пока нет" color="var(--text2)" />
            <KpiCard lbl="Потрачено" val="—" sub="Данных пока нет" color="var(--text2)" />
            <KpiCard lbl="Лиды" val={fmt(totalLeads)} sub="новые ученики за период" />
            <KpiCard lbl="CPL" val="—" sub="Данных пока нет" color="var(--text2)" />
            <KpiCard lbl="CAC" val="—" sub="Данных пока нет" color="var(--text2)" />
            <KpiCard lbl="ROMI" val="—" sub="Данных пока нет" color="var(--text2)" />
            <KpiCard lbl="Купили абонемент" val={fmt(f_buy)} />
            <KpiCard lbl="Выручка новых" val={fmt(newRev) + " ₸"} color="var(--green-c)" />
            <KpiCard lbl="Средний чек" val={subAvg ? fmt(subAvg) + " ₸" : "—"} sub={subAvg ? undefined : "Данных пока нет"} />
          </div>
          <div className="rep-card">
            <h3>Воронка · от лида до продления</h3>
            {totalLeads > 0 ? (
              <>
                <div className="funnel-row head"><span>Этап</span><span>Количество</span><span>Конверсия</span><span>Стоимость</span></div>
                <FunRowCost name="Лиды (новые ученики)" cnt={totalLeads} conv="—" cost="—" />
                <FunRowCost name="Записаны на пробный" cnt={f_trial} conv={totalLeads > 0 ? Math.round((f_trial / totalLeads) * 100) + "%" : "—"} cost="—" />
                <FunRowCost name="Пришли на пробный" cnt={f_attend} conv={f_trial > 0 ? Math.round((f_attend / f_trial) * 100) + "%" : "—"} cost="—" />
                <FunRowCost name="Купили абонемент" cnt={f_buy} conv={f_attend > 0 ? Math.round((f_buy / f_attend) * 100) + "%" : "—"} cost="—" />
                <FunRowCost name="Продлили" cnt={f_renew} conv={f_buy > 0 ? Math.round((f_renew / f_buy) * 100) + "%" : "—"} cost="—" />
                <div className="rep-stub" style={{ marginTop: 12 }}>Стоимость этапов (CPL/CAC) — данных о рекламных расходах в системе пока нет.</div>
              </>
            ) : (
              <Empty>Данных пока нет — новых учеников (лидов) за период не найдено</Empty>
            )}
          </div>
          <div className="rep-card">
            <h3>Лиды по источникам <button className="btn btn-secondary" style={{ float: "right", padding: "5px 12px", fontSize: 12 }} onClick={() => flash("Ручной ввод лидов и рекламных расходов появится с модулем «Маркетинг»")}>+ Внести лиды</button></h3>
            {leadRows.length ? (
              <div className="rep-tablewrap">
                <table className="rep-table">
                  <thead><tr><th>Источник</th><th style={{ textAlign: "right" }}>Лиды</th><th style={{ textAlign: "right" }}>Доля</th><th style={{ textAlign: "right" }}>CPL</th></tr></thead>
                  <tbody>
                    {leadRows.map((l, i) => (
                      <tr key={i}>
                        <td>{l.source}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(l.count)}</td>
                        <td style={{ textAlign: "right" }}>{l.pct}%</td>
                        <td style={{ textAlign: "right", color: "var(--text2)" }}>—</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--border-c)" }}>
                      <td style={{ fontWeight: 700 }}>Итого</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{fmt(totalLeads)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
                <div className="rep-stub" style={{ marginTop: 12 }}>Источники берутся из карточек учеников (откуда о нас узнали). CPL и рекламные расходы — данных пока нет.</div>
              </div>
            ) : (
              <Empty>Данных пока нет — источников лидов за период не найдено</Empty>
            )}
          </div>
        </div>

        {/* ===== 5. AI-ОТЧЁТЫ ===== */}
        <div className={"rep-panel" + (subtab === "ai" ? " active" : "")}>
          <div className="ai-block">
            <h4>Сводка за {label}</h4>
            <p>📊 Поступления <b>{fmt(rev)} ₸</b>, расходы {fmt(exp)} ₸, прибыль <b>{fmt(profit)} ₸</b> ({margin}% маржа).</p>
            <p>📣 Маркетинг: {fmt(totalLeads)} новых учеников, {fmt(f_buy)} купили абонемент.</p>
            <div className="rep-stub" style={{ marginTop: 8 }}>AI-выводы, сезонность и рекомендации — данных пока нет. Показаны только фактические показатели.</div>
          </div>
          <div className="rep-card">
            <h3>Сравнение периодов</h3>
            <div className="rep-filters" style={{ marginBottom: 14 }}>
              <label className="flabel">Сравнить с:</label>
              <select value={cmpPeriod} onChange={(e) => setCmpPeriod(e.target.value)}>
                <option value="prev">Предыдущим месяцем</option>
                <option value="year">Тем же месяцем прошлого года</option>
                <option value="avg3">Средним за 3 месяца</option>
                <option value="avg12">Средним за 12 месяцев</option>
              </select>
            </div>
            {cmp ? (
              <div className="rep-tablewrap">
                <table className="rep-table">
                  <thead><tr><th>Показатель</th><th style={{ textAlign: "right" }}>Текущий ({cmp.monthLabel})</th><th style={{ textAlign: "right" }}>{cmpLabel}</th><th style={{ textAlign: "right" }}>Отклонение</th></tr></thead>
                  <tbody>
                    <tr>
                      <td>Поступления</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(cmp.curRev)}</td>
                      <td style={{ textAlign: "right" }}>{cmp.cmpRev != null ? fmt(cmp.cmpRev) : "нет данных"}</td>
                      <td style={{ textAlign: "right", color: cmp.dev == null ? "var(--text2)" : cmp.dev >= 0 ? "var(--green-c)" : "var(--red-c)", fontWeight: 700 }}>{cmp.dev == null ? "—" : (cmp.dev >= 0 ? "+" : "") + cmp.dev + "%"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Данных пока нет — помесячный P&L из бухгалтерии недоступен</Empty>
            )}
          </div>
          <div className="rep-card">
            <h3>Комментарий владельца</h3>
            <textarea value={ownerComment} onChange={(e) => setOwnerComment(e.target.value)} placeholder="Ваш комментарий к отчёту за период…" style={{ width: "100%", minHeight: 80, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, padding: 10, borderRadius: 10, border: "1px solid var(--border-c)", background: "var(--control)", color: "var(--text)", resize: "vertical" }} />
            <button className="btn btn-brand" style={{ marginTop: 10 }} onClick={() => flash("Комментарий сохранён в этой сессии")}>Сохранить комментарий</button>
          </div>
        </div>

        {/* ===== 6. ИСТОРИЯ ===== */}
        <div className={"rep-panel" + (subtab === "history" ? " active" : "")}>
          <div className="rep-card">
            <h3>История сохранённых отчётов</h3>
            <Empty>Данных пока нет — сохранённых снимков нет. Персистентное хранилище снимков появится позже.</Empty>
          </div>
        </div>
      </div>

      {toast && <div className="proto-toast">{toast}</div>}
    </div>
  );
}

function FunRow({ name, cnt, conv, lost }: any) {
  return (
    <div className="funnel-row">
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ fontWeight: 700 }}>{fmt(cnt)}</span>
      <span style={{ color: "var(--gold-c)" }}>{conv}</span>
      <span style={{ color: "var(--red-c)" }}>{lost > 0 ? "−" + fmt(lost) : "—"}</span>
    </div>
  );
}

function FunRowCost({ name, cnt, conv, cost }: any) {
  return (
    <div className="funnel-row">
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ fontWeight: 700 }}>{fmt(cnt)}</span>
      <span style={{ color: "var(--gold-c)" }}>{conv}</span>
      <span>{cost === "—" ? "—" : fmt(cost) + " ₸"}</span>
    </div>
  );
}

export default ReportsProtoView;
