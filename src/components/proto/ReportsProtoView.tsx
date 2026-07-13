import { useState } from "react";
import "./reports-proto.css";

/* ============================================================
   ЭХО ГОР — Отчётность (порт статического прототипа)
   Данные-заглушки (в оригинале читались из БДР в localStorage).
   ============================================================ */

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const CONV = { lead2signup: 0.55, signup2visit: 0.7, visit2buy: 0.5, buy2renew: 0.85 };

const LEAD_SOURCES = ["WhatsApp", "Instagram", "Facebook", "TikTok", "Google", "2GIS", "Рекомендации", "Другое"];

const BRANCHES_REP: any[] = [
  { id: "astana203", name: "Астана 203" },
  { id: "polnoformat", name: "Полноформат" },
];

/* Единый набор-заглушка (в проде — агрегаты из БДР) */
const MOCK_BDR: any = {
  groups: [
    { name: "Вокал · младшие", zone: "Астана 203", teacher: "Алия К.", chek: 25000, post: 14, new: 4, manualPlan: 0 },
    { name: "Гитара · база", zone: "Астана 203", teacher: "Дамир Т.", chek: 30000, post: 11, new: 3, manualPlan: 0 },
    { name: "Фортепиано", zone: "Астана 203", teacher: "Сауле М.", chek: 35000, post: 9, new: 2, manualPlan: 0 },
    { name: "Хореография", zone: "Полноформат", teacher: "Инкар Б.", chek: 22000, post: 16, new: 5, manualPlan: 0 },
    { name: "Барабаны", zone: "Полноформат", teacher: "Ерлан С.", chek: 28000, post: 8, new: 3, manualPlan: 0 },
    { name: "Академ · сольфеджио", zone: "Полноформат", teacher: "Жанна Р.", chek: 20000, post: 12, new: 4, manualPlan: 0 },
  ],
  expenses: [
    { name: "Аренда", mode: "auto", val: 450000 },
    { name: "Зарплаты преподавателей", mode: "auto", val: 520000 },
    { name: "Реклама", mode: "manual", val: 340000 },
    { name: "Коммунальные", mode: "auto", val: 95000 },
    { name: "Инвентарь", mode: "manual", val: 60000 },
  ],
};

const DEMO_REFUSALS: any[] = [
  { name: "Иванов А.", phone: "+7 707 100 20 30", reason: "Неудобное расписание", date: "2026-06-05", comment: "" },
  { name: "Петрова М.", phone: "+7 701 200 30 40", reason: "Дорого", date: "2026-06-12", comment: "" },
  { name: "Сидоров К.", phone: "+7 705 300 40 50", reason: "Неудобное расписание", date: "2026-06-18", comment: "" },
];

const WINBACK_OFFERS: any[] = [
  { id: "discount", name: "Скидка на возврат", text: "Здравствуйте, {name}! Мы скучаем по вам в студии «Эхо Гор» 💛 Возвращайтесь — дарим скидку 30% на первый месяц. Записать вас на удобное время?" },
  { id: "trial", name: "Бесплатное занятие", text: "Здравствуйте, {name}! В «Эхо Гор» появились новые группы и расписание. Приглашаем на бесплатное пробное занятие — просто приходите, мы будем рады вас видеть!" },
  { id: "oldprice", name: "Возврат по старой цене", text: "Здравствуйте, {name}! Только для вернувшихся учеников сохраняем прежнюю стоимость абонемента. Предложение ограничено — хотите вернуться?" },
  { id: "custom", name: "Свой текст", text: "Здравствуйте, {name}! " },
];

const MKT_BUDGET = 340000;

function fmt(n: number) {
  return Math.round(n).toLocaleString("ru-RU");
}
function bdrRevenue(b: any) {
  if (!b || !b.groups) return 0;
  return b.groups.reduce((s: number, g: any) => s + (g.manualPlan > 0 ? g.manualPlan : g.chek * (g.post + g.new)), 0);
}
function bdrExpense(b: any) {
  if (!b || !b.expenses) return 0;
  return b.expenses.reduce((s: number, e: any) => {
    if (e.items && e.items.length) return s + e.items.reduce((ss: number, it: any) => ss + (+it.val || 0), 0);
    return s + (+e.val || 0);
  }, 0);
}
function seasonNote(m: number) {
  if (m === 5 || m === 6 || m === 7) return "летний сезон (традиционный спад посещаемости)";
  if (m === 8) return "старт нового учебного года (пик набора)";
  if (m === 11) return "новогодние праздники";
  if (m === 4) return "период отчётных концертов";
  return "";
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

export function ReportsProtoView() {
  const now = new Date();
  const nowMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [subtab, setSubtab] = useState("fin");
  const [period, setPeriod] = useState("month");
  const [monthVal, setMonthVal] = useState(nowMonthVal);
  const [dateVal, setDateVal] = useState(now.toISOString().slice(0, 10));
  const [fromVal, setFromVal] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
  const [toVal, setToVal] = useState(now.toISOString().slice(0, 10));
  const [scope, setScope] = useState("all");
  const [finType, setFinType] = useState("all");
  const [cmpPeriod, setCmpPeriod] = useState("prev");
  const [ownerComment, setOwnerComment] = useState("");
  const [leads, setLeads] = useState<any[]>([
    { source: "Instagram", count: 120, campaign: "Летний набор", comment: "" },
    { source: "WhatsApp", count: 85, campaign: "Рекомендации", comment: "" },
    { source: "2GIS", count: 40, campaign: "Карточка", comment: "" },
    { source: "TikTok", count: 60, campaign: "Reels", comment: "" },
  ]);
  const [winbackOpen, setWinbackOpen] = useState(false);
  const [wbMonth, setWbMonth] = useState("all");
  const [wbReason, setWbReason] = useState("all");
  const [wbOfferId, setWbOfferId] = useState("discount");
  const [wbText, setWbText] = useState(WINBACK_OFFERS[0].text);
  const [toast, setToast] = useState("");

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
    const b = BRANCHES_REP.filter((x) => x.id === scope)[0];
    return b ? b.name : "—";
  }

  const b = MOCK_BDR;
  const rev = bdrRevenue(b);
  const exp = bdrExpense(b);
  const profit = rev - exp;
  const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0;
  const totalLeads = leads.reduce((s, l) => s + (+l.count || 0), 0);

  const showMonthInput = period === "month" || period === "quarter" || period === "year";
  const showDateInput = period === "today" || period === "yesterday" || period === "week";
  const showRange = period === "custom";

  /* ---- 1. Финансовые операции ---- */
  const ops: any[] = [];
  b.groups.forEach((g: any) => {
    const sum = g.manualPlan > 0 ? g.manualPlan : g.chek * (g.post + g.new);
    if (sum <= 0) return;
    ops.push({ date: label, branch: scopeName(), group: g.zone || "", who: g.name, type: "subs", typeLabel: "Абонементы (план)", sum, pay: "—", resp: g.teacher || "—" });
  });
  b.expenses.forEach((e: any) => {
    const val = e.items && e.items.length ? e.items.reduce((s: number, it: any) => s + (+it.val || 0), 0) : +e.val || 0;
    if (val <= 0) return;
    ops.push({ date: label, branch: scopeName(), group: "—", who: e.name, type: "expense", typeLabel: "Расход", sum: -val, pay: e.mode === "auto" ? "из бухгалтерии" : "вручную", resp: "—" });
  });
  const finFiltered = finType === "all" ? ops : ops.filter((o) => o.type === finType);
  const emptyTypes: any = { goods: "Продажа товаров", shows: "Выступления", refund: "Возвраты", income: "Поступления" };

  /* ---- 2. Абонементы ---- */
  const students = b.groups.reduce((s: number, g: any) => s + g.post + g.new, 0);
  const avgChek = b.groups.length ? Math.round(b.groups.reduce((s: number, g: any) => s + g.chek, 0) / b.groups.length) : 0;

  /* ---- 3. Пробные и отказы ---- */
  const t_signup = Math.round(totalLeads * CONV.lead2signup);
  const t_visit = Math.round(t_signup * CONV.signup2visit);
  const t_buy = Math.round(t_visit * CONV.visit2buy);
  const t_noShow = t_signup - t_visit;
  const t_noBuy = t_visit - t_buy;
  const refusals = DEMO_REFUSALS;
  const byReason: any = {};
  refusals.forEach((r) => { byReason[r.reason] = (byReason[r.reason] || 0) + 1; });
  const topReason = Object.keys(byReason).sort((a, c) => byReason[c] - byReason[a])[0];
  const topPct = topReason && refusals.length ? Math.round((byReason[topReason] / refusals.length) * 100) : 0;

  /* ---- 4. Маркетинг ---- */
  const m_signup = Math.round(totalLeads * CONV.lead2signup);
  const m_visit = Math.round(m_signup * CONV.signup2visit);
  const m_buy = Math.round(m_visit * CONV.visit2buy);
  const m_renew = Math.round(m_buy * CONV.buy2renew);
  const spent = MKT_BUDGET;
  const cpl = totalLeads > 0 ? Math.round(spent / totalLeads) : 0;
  const cac = m_buy > 0 ? Math.round(spent / m_buy) : 0;
  let newRev = 0;
  b.groups.forEach((g: any) => {
    const tot = g.post + g.new;
    if (tot > 0) {
      const plan = g.manualPlan > 0 ? g.manualPlan : g.chek * tot;
      newRev += plan * (g.new / tot);
    }
  });
  newRev = Math.round(newRev);
  const romi = spent > 0 ? Math.round(((newRev - spent) / spent) * 100) : 0;

  /* ---- 5. AI + сравнение ---- */
  const ai_buy = Math.round(totalLeads * CONV.lead2signup * CONV.signup2visit * CONV.visit2buy);
  const ai_cac = ai_buy > 0 ? Math.round(spent / ai_buy) : 0;
  const season = seasonNote(month);
  const prevRev =
    cmpPeriod === "prev" ? Math.round(rev * 0.94) :
    cmpPeriod === "year" ? Math.round(rev * 0.82) :
    cmpPeriod === "avg3" ? Math.round(rev * 0.97) : Math.round(rev * 0.9);
  const dev = prevRev > 0 ? Math.round(((rev - prevRev) / prevRev) * 100) : 0;
  const cmpLabel =
    cmpPeriod === "prev" ? "Предыдущий месяц" :
    cmpPeriod === "year" ? "Тот же месяц год назад" :
    cmpPeriod === "avg3" ? "Среднее за 3 мес" : "Среднее за 12 мес";

  /* ---- Winback ---- */
  const churn = DEMO_REFUSALS;
  const wbReasons = Object.keys(churn.reduce((a: any, c: any) => { if (c.reason) a[c.reason] = 1; return a; }, {}));
  const wbMonths = Object.keys(churn.reduce((a: any, c: any) => { if (c.date) a[c.date.slice(0, 7)] = 1; return a; }, {})).sort().reverse();
  const wbFiltered = churn.filter((c: any) => {
    if (wbMonth !== "all" && (!c.date || c.date.slice(0, 7) !== wbMonth)) return false;
    if (wbReason !== "all" && c.reason !== wbReason) return false;
    return true;
  });

  function delLead(i: number) {
    setLeads(leads.filter((_, idx) => idx !== i));
  }
  function addLead() {
    const src = window.prompt("Источник (" + LEAD_SOURCES.join(" / ") + "):", "Instagram");
    if (src === null) return;
    const cnt = window.prompt("Количество лидов:", "0");
    if (cnt === null) return;
    const camp = window.prompt("Кампания:", "") || "";
    setLeads([...leads, { source: src || "Другое", count: parseInt(cnt) || 0, campaign: camp, comment: "" }]);
  }
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

  const filterSelStyle: any = { fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: "1px solid var(--border-c)", background: "var(--control)", color: "var(--text)", cursor: "pointer" };

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
            <button className="btn btn-brand" onClick={() => flash("📸 Снимок периода «" + label + "» сохранён — данные заморожены")}>📸 Сохранить снимок периода</button>
            <span style={{ fontSize: 11, color: "var(--text2)" }} title="Пока снимки хранятся в этом браузере. С подключением базы — в Supabase, доступны отовсюду.">ⓘ хранится локально</span>
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
            {BRANCHES_REP.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
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
            <KpiCard lbl="Поступления" val={fmt(rev) + " ₸"} sub="план из БДР" />
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
                    <th>Дата</th><th>Филиал</th><th>Группа</th><th>Ученик/группа</th><th>Тип</th>
                    <th style={{ textAlign: "right" }}>Сумма</th><th>Оплата</th><th>Ответственный</th>
                  </tr>
                </thead>
                <tbody>
                  {finFiltered.length ? finFiltered.map((o, i) => (
                    <tr key={i}>
                      <td>{o.date}</td><td>{o.branch}</td><td>{o.group}</td><td>{o.who}</td><td>{o.typeLabel}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: o.sum < 0 ? "var(--red-c)" : "var(--heading)" }}>{(o.sum < 0 ? "−" : "") + fmt(Math.abs(o.sum)) + " ₸"}</td>
                      <td>{o.pay}</td><td>{o.resp}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text2)", padding: 18 }}>Нет операций этого типа за период</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {finType !== "all" && emptyTypes[finType] && (
              <div className="rep-stub" style={{ marginTop: 14 }}>Операции типа «{emptyTypes[finType]}» появятся с подключением модулей <b>Бухгалтерия</b> и <b>Продажа товаров</b>.</div>
            )}
            {finType === "all" && (
              <div className="rep-stub" style={{ marginTop: 14 }}>Сейчас показаны абонементы и расходы из БДР. Товары, выступления, возвраты подтянутся из <b>Бухгалтерии</b> и <b>Абонементов</b>.</div>
            )}
            <div className="rep-export">
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в PDF — подключается при интеграции с базой")}>📄 PDF</button>
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в Excel — подключается при интеграции с базой")}>📊 Excel</button>
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в WhatsApp — подключается при интеграции с базой")}>💬 WhatsApp</button>
              <button className="btn btn-secondary" onClick={() => flash("Экспорт «Финансовые операции» в Email — подключается при интеграции с базой")}>✉️ Email</button>
            </div>
          </div>
        </div>

        {/* ===== 2. АБОНЕМЕНТЫ ===== */}
        <div className={"rep-panel" + (subtab === "subs" ? " active" : "")}>
          <div className="kpi-cards">
            <KpiCard lbl="Активных учеников" val={fmt(students)} sub="из плана БДР" />
            <KpiCard lbl="Средний чек" val={fmt(avgChek) + " ₸"} />
            <KpiCard lbl="Продаж за период" val="—" sub="из Абонементов" />
            <KpiCard lbl="Сумма продаж" val="—" sub="из Абонементов" />
          </div>
          <div className="rep-card">
            <h3>Отчёт по абонементам</h3>
            <div className="rep-stub">Отчёт по абонементам (ФИО, тип, дата продажи, дата начала действия, срок, скидка, стоимость, оплата) подтянется автоматически из вкладки <b>«Продажа абонементов»</b>. Поддержит два независимых фильтра: по <b>дате продажи</b> и по <b>дате начала действия</b> — для анализа ранних продаж и продаж на будущие периоды.</div>
          </div>
        </div>

        {/* ===== 3. ПРОБНЫЕ И ОТКАЗЫ ===== */}
        <div className={"rep-panel" + (subtab === "trials" ? " active" : "")}>
          <div className="kpi-cards">
            <KpiCard lbl="Записано" val={fmt(t_signup)} />
            <KpiCard lbl="Пришло" val={fmt(t_visit)} sub={Math.round(CONV.signup2visit * 100) + "% от записи"} />
            <KpiCard lbl="Купило" val={fmt(t_buy)} sub={Math.round(CONV.visit2buy * 100) + "% от прихода"} color="var(--green-c)" />
            <KpiCard lbl="Не купило" val={fmt(t_noBuy)} color="var(--red-c)" />
          </div>
          <div className="rep-card">
            <h3>Воронка пробных уроков</h3>
            <div className="funnel-row head"><span>Этап</span><span>Количество</span><span>Конверсия</span><span>Не прошло</span></div>
            <FunRow name="Записано на пробный" cnt={t_signup} conv="—" lost={0} />
            <FunRow name="Пришло на пробный" cnt={t_visit} conv={Math.round(CONV.signup2visit * 100) + "%"} lost={t_noShow} />
            <FunRow name="Купило абонемент" cnt={t_buy} conv={Math.round(CONV.visit2buy * 100) + "%"} lost={t_noBuy} />
          </div>
          <div className="rep-card">
            <h3>История отказов и причины ухода
              <button className="btn btn-brand" style={{ float: "right", padding: "6px 14px", fontSize: 12 }} onClick={() => setWinbackOpen(!winbackOpen)}>↩ Запустить возврат с оффером</button>
            </h3>
            <div className="rep-tablewrap">
              <table className="rep-table">
                <thead><tr><th>Ученик</th><th>Причина</th><th>Дата</th><th>Комментарий</th></tr></thead>
                <tbody>
                  {refusals.map((r, i) => (
                    <tr key={i}><td>{r.name}</td><td>{r.reason}</td><td>{r.date}</td><td>{r.comment || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rep-stub" style={{ marginTop: 12 }}>Пока показаны примеры. Реальные ушедшие появятся здесь, когда админ отметит уход кнопкой <b>«Отметить как ушедшего»</b> в карточке ученика.</div>
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
              <div className="rep-stub" style={{ marginTop: 14 }}>Полностью автоматическая рассылка подключается через <b>WhatsApp Business API</b> при интеграции с сервером. Сейчас — отправка в один клик по каждому.</div>
            </div>
          )}

          <div className="ai-block">
            <h4>✦ AI-анализ причин ухода</h4>
            <p>Основная причина ухода за период — <b>«{topReason || "—"}»</b> ({topPct}% случаев).</p>
            <p>Рекомендация: если причина связана с расписанием — рассмотрите открытие дополнительных вечерних групп в будни. Если «дорого» — проработайте рассрочку и акции на длительные абонементы.</p>
          </div>
        </div>

        {/* ===== 4. МАРКЕТИНГ ===== */}
        <div className={"rep-panel" + (subtab === "mkt" ? " active" : "")}>
          <div className="kpi-cards">
            <KpiCard lbl="Рекл. бюджет" val={fmt(MKT_BUDGET) + " ₸"} />
            <KpiCard lbl="Потрачено" val={fmt(spent) + " ₸"} sub="из Бухгалтерии" />
            <KpiCard lbl="Лиды" val={fmt(totalLeads)} sub="вручную" />
            <KpiCard lbl="CPL" val={fmt(cpl) + " ₸"} sub="стоимость лида" />
            <KpiCard lbl="CAC" val={fmt(cac) + " ₸"} sub="стоимость клиента" />
            <KpiCard lbl="ROMI" val={romi + "%"} sub="возврат на маркетинг" color={romi >= 0 ? "var(--green-c)" : "var(--red-c)"} />
            <KpiCard lbl="Новых клиентов" val={fmt(m_buy)} />
            <KpiCard lbl="Выручка новых" val={fmt(newRev) + " ₸"} />
            <KpiCard lbl="Средний чек" val={fmt(avgChek) + " ₸"} />
          </div>
          <div className="rep-card">
            <h3>Воронка продаж · от лида до продления</h3>
            <div className="funnel-row head"><span>Этап</span><span>Количество</span><span>Конверсия</span><span>Стоимость</span></div>
            <FunRowCost name="Лиды" cnt={totalLeads} conv="—" cost={cpl} />
            <FunRowCost name="Запись на пробный" cnt={m_signup} conv={Math.round(CONV.lead2signup * 100) + "%"} cost={m_signup > 0 ? Math.round(spent / m_signup) : 0} />
            <FunRowCost name="Приход" cnt={m_visit} conv={Math.round(CONV.signup2visit * 100) + "%"} cost={m_visit > 0 ? Math.round(spent / m_visit) : 0} />
            <FunRowCost name="Покупка" cnt={m_buy} conv={Math.round(CONV.visit2buy * 100) + "%"} cost={cac} />
            <FunRowCost name="Продление" cnt={m_renew} conv={Math.round(CONV.buy2renew * 100) + "%"} cost="—" />
          </div>
          <div className="rep-card">
            <h3>Лиды по источникам <button className="btn btn-secondary" style={{ float: "right", padding: "5px 12px", fontSize: 12 }} onClick={addLead}>+ Внести лиды</button></h3>
            <div className="rep-tablewrap">
              <table className="rep-table">
                <thead><tr><th>Источник</th><th>Кампания</th><th style={{ textAlign: "right" }}>Лиды</th><th style={{ textAlign: "right" }}>CPL</th><th>Комментарий</th><th></th></tr></thead>
                <tbody>
                  {leads.map((l, i) => {
                    const lcpl = l.count > 0 && totalLeads > 0 ? Math.round((spent * (l.count / totalLeads)) / l.count) : 0;
                    return (
                      <tr key={i}>
                        <td>{l.source}</td><td>{l.campaign || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(l.count)}</td>
                        <td style={{ textAlign: "right" }}>{fmt(lcpl)} ₸</td>
                        <td>{l.comment || "—"}</td>
                        <td><span onClick={() => delLead(i)} style={{ cursor: "pointer", color: "var(--text2)" }}>✕</span></td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid var(--border-c)" }}>
                    <td style={{ fontWeight: 700 }}>Итого</td><td></td>
                    <td style={{ textAlign: "right", fontWeight: 800 }}>{fmt(totalLeads)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="rep-stub" style={{ marginTop: 12 }}>Расходы на маркетинг подтягиваются из <b>Бухгалтерии</b> (без повторного ввода). Лиды вводятся вручную маркетологом, т.к. CRM не имеет доступа к рекламным кабинетам Meta/Google.</div>
          </div>
        </div>

        {/* ===== 5. AI-ОТЧЁТЫ ===== */}
        <div className={"rep-panel" + (subtab === "ai" ? " active" : "")}>
          <div className="ai-block">
            <h4>✦ AI-отчёт за {label}</h4>
            <p>📊 Поступления <b>{fmt(rev)} ₸</b>, расходы {fmt(exp)} ₸, прибыль <b>{fmt(profit)} ₸</b>.</p>
            <p>📣 Маркетинг: {fmt(totalLeads)} лидов, ~{fmt(ai_buy)} новых клиентов, CAC {fmt(ai_cac)} ₸.</p>
            {season && <p>📅 Сезонность: {season} — учитываю это при сравнении и не сопоставляю период напрямую с обычными месяцами.</p>}
            <p>💡 Рекомендация: усильте источники с низким CPL и проработайте удержание — продление существующих дешевле привлечения новых.</p>
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
            <div className="rep-tablewrap">
              <table className="rep-table">
                <thead><tr><th>Показатель</th><th style={{ textAlign: "right" }}>Текущий</th><th style={{ textAlign: "right" }}>{cmpLabel}</th><th style={{ textAlign: "right" }}>Отклонение</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Поступления</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(rev)}</td>
                    <td style={{ textAlign: "right" }}>{fmt(prevRev)}</td>
                    <td style={{ textAlign: "right", color: dev >= 0 ? "var(--green-c)" : "var(--red-c)", fontWeight: 700 }}>{(dev >= 0 ? "+" : "") + dev}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="rep-card">
            <h3>Комментарий владельца</h3>
            <textarea value={ownerComment} onChange={(e) => setOwnerComment(e.target.value)} placeholder="Ваш комментарий к отчёту за период…" style={{ width: "100%", minHeight: 80, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, padding: 10, borderRadius: 10, border: "1px solid var(--border-c)", background: "var(--control)", color: "var(--text)", resize: "vertical" }} />
            <button className="btn btn-brand" style={{ marginTop: 10 }} onClick={() => flash("Комментарий сохранён")}>Сохранить комментарий</button>
          </div>
        </div>

        {/* ===== 6. ИСТОРИЯ ===== */}
        <div className={"rep-panel" + (subtab === "history" ? " active" : "")}>
          <div className="rep-card">
            <h3>История сохранённых отчётов</h3>
            <div className="rep-stub">Сохранённых снимков пока нет. Нажмите <b>«Сохранить снимок периода»</b>, чтобы заморозить показатели закрытого месяца — потом их не сдвинут даже правки старых операций.</div>
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
