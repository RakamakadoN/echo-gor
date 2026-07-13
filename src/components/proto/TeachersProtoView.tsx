import { useState } from "react";
import "./teachers-proto.css";

/* =========================================================================
   Порт статического прототипа «Преподаватели — Эхо Гор CRM».
   Только рабочая область (без сайдбара/навигации/переключателя темы).
   Весь интерактив на useState, формы добавляют записи только в локальный state.
   Типы намеренно any — это визуальный порт прототипа.
   ========================================================================= */

/* ===== CONFIG ===== */
const KPI_WEIGHTS: any = { ret: 35, funnel: 30, reviews: 17.5, standards: 17.5 };
const RATES: any = { new: { 1: 1250, 2: 1500, 3: 1500 }, reg: { 1: 2500, 2: 3000, 3: 3000 }, regCont: { 3: 3500 } };
const RETENTION_BONUS: any = { 1: 0.2, 2: 0.2, 3: 0.3 };
const TEACHER_OF_MONTH_BONUS = 20000;
const MONTHS: string[] = ["Январь 2026", "Февраль 2026", "Март 2026", "Апрель 2026", "Май 2026", "Июнь 2026"];

/* ===== DATA ===== */
const INITIAL_TEACHERS: any[] = [
  {
    id: 1, name: "Аслан Плиев", initials: "АП", phone: "+7 701 441 11 22", login: "+7 701 441 11 22", pass: "aslan2026",
    spec: "Лезгинка, ансамблевая подготовка", branch: "Эхо Гор Чокина 109/1",
    cat: 3, role: "Преподаватель", status: "Активен",
    birth: "14.03.1991", hired: "02.09.2021", years: "4 г. 9 мес.", thanks: 57, ltvMonths: 7,
    fines: { "Май 2026": [{ date: "14.05.2026", reason: "Опоздание", sum: 2000, note: "Урок 18:00, пришёл без фото прихода", by: "Управляющий" }] },
    leavers: {
      "Май 2026": [
        { name: "Тимур Алиев", group: "Лезгинка · дети 8–11", branch: "Эхо Гор Чокина 109/1", date: "12.05.2026", reason: "Переезд" },
        { name: "Дана Касымова", group: "Лезгинка · взрослые (вечер)", branch: "Эхо Гор Чокина 109/1", date: "28.05.2026", reason: "Финансы" },
      ],
      "Июнь 2026": [
        { name: "Арман Беков", group: "Лезгинка · дети 8–11", branch: "Эхо Гор Чокина 109/1", date: "09.06.2026", reason: "Потеря интереса" },
      ],
    },
    byMonth: {
      "Январь 2026": { ret: 62, funnel: 55, rev: 4.6, std: 90, students: 26, newCnt: 4, regCnt: 22, regCont: 8, left: 1 },
      "Февраль 2026": { ret: 64, funnel: 58, rev: 4.7, std: 92, students: 28, newCnt: 5, regCnt: 23, regCont: 9, left: 1 },
      "Март 2026": { ret: 66, funnel: 60, rev: 4.7, std: 95, students: 29, newCnt: 4, regCnt: 25, regCont: 10, left: 2 },
      "Апрель 2026": { ret: 67, funnel: 62, rev: 4.8, std: 96, students: 30, newCnt: 5, regCnt: 25, regCont: 11, left: 1 },
      "Май 2026": { ret: 67.7, funnel: 64, rev: 4.8, std: 98, students: 31, newCnt: 6, regCnt: 25, regCont: 12, left: 2 },
      "Июнь 2026": { ret: 69, funnel: 66, rev: 4.9, std: 100, students: 31, newCnt: 6, regCnt: 25, regCont: 12, left: 1 },
    },
    groups: [
      { name: "Лезгинка · взрослые (вечер)", st: 14, free: 2, fill: 88, ret: 71, newCnt: 2, regCnt: 12, regCont: 0 },
      { name: "Ансамбль «Эхо»", st: 12, free: 0, fill: 100, ret: 74, newCnt: 0, regCnt: 0, regCont: 12 },
      { name: "Лезгинка · дети 8–11", st: 5, free: 5, fill: 50, ret: 58, newCnt: 4, regCnt: 1, regCont: 0 },
    ],
    standards: [
      { nm: "Приход вовремя (за 20 мин до урока)", det: "Фото с отметкой времени · 21/22 дн.", s: "y", type: "photo" },
      { nm: "Отметки в журнале проставлены", det: "Все занятия закрыты", s: "y", type: "journal" },
      { nm: "План работы подготовлен заранее", det: "Загружен на каждую неделю", s: "y", type: "plan" },
      { nm: "Оценка после открытого урока", det: "Проведён 18.05, оценка 9/10", s: "y", type: "open" },
      { nm: "Оценка после отчётного концерта", det: "Концерт в июне — в процессе", s: "p", type: "concert" },
    ],
    training: [
      { dir: "Начальные детские группы", st: "Аттестован", base: 1 },
      { dir: "Начальные взрослые группы", st: "Аттестован", base: 1 },
      { dir: "Продолжающие группы", st: "Аттестован", base: 1 },
      { dir: "Ансамбль", st: "Аттестован", base: 1 },
      { dir: "Лезгинка", st: "Аттестован", base: 0 },
      { dir: "Вайнахский", st: "В процессе", base: 0 },
      { dir: "Постановочная работа", st: "В процессе", base: 0 },
    ],
    attest: [
      { date: "12.05.2026", dir: "Постановочная работа", res: "Промежуточный", mark: "—", note: "Сдаёт финальную постановку до 30.06" },
      { date: "03.11.2025", dir: "Лезгинка", res: "Аттестован", mark: "9/10", note: "Отличная техника" },
    ],
    reviews: [
      { who: "Родитель, гр. дети 8–11", src: "Личный кабинет", stars: 5, text: "Сын с радостью бежит на занятия, заметный прогресс. Дисциплина без давления." },
      { who: "Ученик, ансамбль", src: "Личный кабинет", stars: 5, text: "Лучший наставник по технике лезгинки." },
    ],
    ai: {
      pos: ["Дисциплина", "Техника", "Терпение", "Удержание"], neg: ["Заполняемость детской группы", "Незавершённая аттестация"],
      verdict: "Сильный педагог 3 категории, стабильно высокий KPI и удержание. Динамика положительная.",
      rec: "Подтвердить как кандидата в «Педагоги месяца». Дать ассистента на детскую группу.",
    },
  },
  {
    id: 2, name: "Хамит Муратович", initials: "ХМ", phone: "+7 (702) 123 46 58", login: "+7 (702) 123 46 58", pass: "khamit01",
    spec: "High Heels", branch: "Сатпаева 210/1",
    cat: 1, role: "Преподаватель", status: "Стажер",
    birth: "09.07.1999", hired: "10.06.2026", years: "15 дней", thanks: 0, ltvMonths: 1,
    fines: { "Июнь 2026": [{ date: "12.06.2026", reason: "Незакрытый журнал", sum: 5000, note: "Журнал не закрыт 2 дня подряд", by: "Владелец" }] },
    leavers: {},
    byMonth: {
      "Январь 2026": null, "Февраль 2026": null, "Март 2026": null, "Апрель 2026": null, "Май 2026": null,
      "Июнь 2026": { ret: 0, funnel: 20, rev: 0, std: 40, students: 1, newCnt: 1, regCnt: 0, regCont: 0, left: 0 },
    },
    groups: [{ name: "High Heels · вводная", st: 1, free: 11, fill: 8, ret: 0, newCnt: 1, regCnt: 0, regCont: 0 }],
    standards: [
      { nm: "Приход вовремя (за 20 мин до урока)", det: "Фото не прикреплено 6/15 дн.", s: "p", type: "photo" },
      { nm: "Отметки в журнале проставлены", det: "Журнал за сегодня не закрыт", s: "n", type: "journal" },
      { nm: "План работы подготовлен заранее", det: "Загружен частично", s: "p", type: "plan" },
      { nm: "Оценка после открытого урока", det: "Ещё не проводился", s: "n", type: "open" },
      { nm: "Оценка после отчётного концерта", det: "Ещё не участвовал", s: "n", type: "concert" },
    ],
    training: [
      { dir: "Начальные взрослые группы", st: "В процессе", base: 1 },
      { dir: "Начальные детские группы", st: "Не начато", base: 1 },
      { dir: "Женская техника", st: "В процессе", base: 0 },
    ],
    attest: [{ date: "—", dir: "—", res: "Аттестаций ещё не было", mark: "—", note: "Стажёр принят 10.06.2026" }],
    reviews: [{ who: "—", src: "—", stars: 0, text: "Отзывов пока нет. Группа набирается." }],
    ai: {
      pos: ["Энергичность (отмечено наставником)"], neg: ["Не закрыт журнал", "Нет набора учеников"],
      verdict: "Стажёр на ранней стадии, данных для оценки качества недостаточно.",
      rec: "Закрепить наставника по набору группы. Проконтролировать заполнение журнала.",
    },
  },
];

/* Колонки таблицы (порядок важен для меню и заголовков) */
const COLUMN_DEFS: any[] = [
  { id: "spec", label: "Специализация", on: true },
  { id: "branch", label: "Филиал", on: true },
  { id: "cat", label: "Категория", on: true },
  { id: "ret", label: "Удержание", on: true },
  { id: "kpi", label: "KPI", on: true },
  { id: "fines", label: "Штрафы", on: true },
  { id: "sal", label: "Ожид. ЗП", on: true },
  { id: "students", label: "Ученики", on: false },
  { id: "funnel", label: "Воронка ПУ", on: false },
  { id: "rev", label: "Отзывы (оценка)", on: false },
  { id: "std", label: "Стандарты", on: false },
  { id: "phone", label: "Телефон", on: false },
  { id: "role", label: "Права", on: true },
];

const CARD_TABS: [string, string][] = [
  ["info", "Общая"], ["kpi", "KPI"], ["groups", "Группы"], ["std", "Стандарты"],
  ["train", "Обучение"], ["att", "Аттестация"], ["rev", "Отзывы"], ["ai", "AI-анализ"], ["fines", "Штрафы"], ["sal", "Ожидаемая ЗП"],
];

const FINE_REASONS = ["Опоздание", "Незакрытый журнал", "Нет плана работы", "Нет фото прихода", "Нарушение дисциплины", "Другое"];

/* ===== HELPERS ===== */
const money = (n: number) => Math.round(n).toLocaleString("ru-RU") + " тг";
const retClass = (v: number) => (v >= 60 ? "" : v >= 40 ? "warn" : "bad");
const catName = (c: any) => c + " категория";
const starsStr = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const fillColor = (v: number) => (v >= 70 ? "var(--green)" : v >= 45 ? "var(--gold)" : "var(--red)");

function kpiComponents(m: any): any {
  if (!m) return null;
  return { ret: Math.min(100, m.ret), funnel: Math.min(100, m.funnel), reviews: Math.round((m.rev / 5) * 100), standards: m.std };
}
function kpiTotal(c: any): number {
  if (!c) return 0;
  const w = KPI_WEIGHTS;
  return Math.round((c.ret * w.ret) / 100 + (c.funnel * w.funnel) / 100 + (c.reviews * w.reviews) / 100 + (c.standards * w.standards) / 100);
}
function monthData(t: any, mn: string): any {
  return t.byMonth[mn];
}
function salary(t: any, m: any, mn: string, winnerId: number): any {
  if (!m) return null;
  const c = t.cat;
  const newSum = m.newCnt * RATES.new[c];
  const contCnt = c === 3 ? m.regCont || 0 : 0;
  const plainReg = Math.max(0, (m.regCnt || 0) - contCnt);
  const regSum = plainReg * RATES.reg[c];
  const contSum = c === 3 ? contCnt * RATES.regCont[3] : 0;
  const base = newSum + regSum + contSum;
  const retOk = m.left <= 2;
  const retBonus = retOk ? base * RETENTION_BONUS[c] : 0;
  const isWinner = winnerId === t.id;
  const tomBonus = isWinner ? TEACHER_OF_MONTH_BONUS : 0;
  const fineList = t.fines && t.fines[mn] ? t.fines[mn] : [];
  const finesSum = fineList.reduce((s: number, f: any) => s + f.sum, 0);
  return { newCnt: m.newCnt, newSum, plainReg, regSum, contCnt, contSum, base, retOk, retBonus, tomBonus, fineList, finesSum, total: base + retBonus + tomBonus - finesSum };
}

/* ===== ICONS ===== */
const IconCols = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={15} height={15}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
);
const IconCrown = () => (
  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 2h14v2H5z" /></svg>
);
const IconSpark = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></svg>
);
const IconWbadge = () => (
  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5z" /></svg>
);
const IconEdit = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
);
const IconArchive = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);

/* ========================================================================= */
export function TeachersProtoView() {
  const [teachers, setTeachers] = useState<any[]>(INITIAL_TEACHERS);
  const [fMonth, setFMonth] = useState<string>(MONTHS[MONTHS.length - 1]);
  const [fBranch, setFBranch] = useState<string>("");
  const [fCat, setFCat] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("");
  const [winnerId, setWinnerId] = useState<number>(1);

  const [columns, setColumns] = useState<any[]>(COLUMN_DEFS.map((c) => ({ ...c })));
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const [detailKind, setDetailKind] = useState<string | null>(null);
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  const [cardId, setCardId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("info");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ name: "", phone: "", birth: "", hired: "", br: "Эхо Гор Чокина 109/1", ct: "1", rl: "Преподаватель", spec: "", st: "Активен", login: "", pass: "", loginTouched: false, ava: "+" });

  const [payOpen, setPayOpen] = useState(false);
  const [payWho, setPayWho] = useState<number>(INITIAL_TEACHERS[0].id);
  const [payMonth, setPayMonth] = useState<string>(MONTHS[MONTHS.length - 1]);

  const [finesLogOpen, setFinesLogOpen] = useState(false);
  const [logMonth, setLogMonth] = useState<string>("");
  const [logWho, setLogWho] = useState<string>("");

  const [fineOpen, setFineOpen] = useState(false);
  const [fineId, setFineId] = useState<number | null>(null);
  const [fineMonth, setFineMonth] = useState<string>(MONTHS[MONTHS.length - 1]);
  const [fineReason, setFineReason] = useState<string>("Опоздание");
  const [fineSum, setFineSum] = useState<string>("");
  const [fineNote, setFineNote] = useState<string>("");
  const [fineBy, setFineBy] = useState<string>("Владелец");

  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  /* ===== toast ===== */
  const toast = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, msg }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2600);
  };

  /* ===== derived ===== */
  const filtered = teachers.filter(
    (t) => (!fBranch || t.branch === fBranch) && (!fCat || catName(t.cat) === fCat) && (!fStatus || t.status === fStatus)
  );
  const withM = teachers.map((t) => ({ t, m: monthData(t, fMonth) })).filter((x) => x.m);
  const avgRet = withM.length ? withM.reduce((s, x) => s + x.m.ret, 0) / withM.length : 0;
  const avgKpi = withM.length ? withM.reduce((s, x) => s + kpiTotal(kpiComponents(x.m)), 0) / withM.length : 0;

  /* Педагог месяца: ИИ-предложение = лучший KPI */
  let best: any = null, bestK = -1;
  withM.forEach((x) => { const k = kpiTotal(kpiComponents(x.m)); if (k > bestK) { bestK = k; best = x.t; } });
  const winner = teachers.find((t) => t.id === winnerId) || best;

  /* ===== actions ===== */
  const showDetail = (kind: string) => { setDetailKind(kind); };
  const closeDetail = () => setDetailKind(null);
  const toggleSub = (id: string) => setOpenSubs((s) => ({ ...s, [id]: !s[id] }));
  const approveTOM = (id: number) => { setWinnerId(id); const t = teachers.find((x) => x.id === id); toast("Педагог месяца утверждён: " + t.name + " (+20 000 тг)"); };

  const openCard = (id: number) => { setCardId(id); setActiveTab("info"); setDetailKind(null); };
  const closeCard = () => setCardId(null);

  const toggleCol = (id: string, on: boolean) => setColumns((cols) => cols.map((c) => (c.id === id ? { ...c, on } : c)));

  const openForm = (id?: number) => {
    if (typeof id === "number") {
      const t = teachers.find((x) => x.id === id);
      setEditId(id);
      setForm({ name: t.name, phone: t.phone, birth: "", hired: "", br: t.branch, ct: String(t.cat), rl: t.role, spec: t.spec, st: t.status, login: t.login || t.phone, pass: t.pass || "", loginTouched: false, ava: t.initials });
    } else {
      setEditId(null);
      setForm({ name: "", phone: "", birth: "", hired: "", br: "Эхо Гор Чокина 109/1", ct: "1", rl: "Преподаватель", spec: "", st: "Активен", login: "", pass: "", loginTouched: false, ava: "+" });
    }
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);
  const genPass = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setForm((f: any) => ({ ...f, pass: p }));
    toast("Пароль сгенерирован: " + p);
  };
  const saveForm = () => {
    const name = form.name.trim();
    if (!name) { toast("Введите ФИО"); return; }
    if (!form.phone.trim()) { toast("Введите телефон"); return; }
    const parts = name.split(" ");
    const initials = ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).toUpperCase();
    if (editId) {
      setTeachers((list) => list.map((t) => t.id === editId ? {
        ...t, name, phone: form.phone, spec: form.spec, branch: form.br, cat: +form.ct, role: form.rl, status: form.st,
        initials, login: form.login.trim() || form.phone.trim(), pass: form.pass,
      } : t));
      toast("Сохранено: " + name);
    } else {
      setTeachers((list) => {
        const id = Math.max(...list.map((t) => t.id)) + 1;
        const cat = +form.ct;
        const nt = {
          id, name, initials, phone: form.phone, spec: form.spec || "—", branch: form.br, cat, role: form.rl, status: form.st,
          login: form.login.trim() || form.phone.trim(), pass: form.pass,
          birth: "—", hired: form.hired || "—", years: "новый", thanks: 0, ltvMonths: 0, fines: {}, leavers: {},
          byMonth: Object.fromEntries(MONTHS.map((mn) => [mn, null])),
          groups: [],
          standards: [
            { nm: "Приход вовремя (за 20 мин до урока)", det: "Нет данных", s: "n", type: "photo" },
            { nm: "Отметки в журнале проставлены", det: "Нет данных", s: "n", type: "journal" },
            { nm: "План работы подготовлен заранее", det: "Нет данных", s: "n", type: "plan" },
            { nm: "Оценка после открытого урока", det: "Ещё не проводился", s: "n", type: "open" },
            { nm: "Оценка после отчётного концерта", det: "Ещё не участвовал", s: "n", type: "concert" },
          ],
          training: [],
          attest: [{ date: "—", dir: "—", res: "Аттестаций ещё не было", mark: "—", note: "Новый сотрудник" }],
          reviews: [{ who: "—", src: "—", stars: 0, text: "Отзывов пока нет." }],
          ai: { pos: ["—"], neg: ["—"], verdict: "Новый сотрудник, данных пока нет.", rec: "Запустить программу обучения и набор группы." },
        };
        return [...list, nt];
      });
      toast("Добавлен преподаватель: " + name);
    }
    closeForm();
  };
  const archive = (id: number) => {
    const t = teachers.find((x) => x.id === id);
    if (window.confirm("Архивировать преподавателя «" + t.name + "»? Это действие можно отменить в разделе «Архив».")) {
      setTeachers((list) => list.filter((x) => x.id !== id));
      toast("В архив: " + t.name);
    }
  };

  const markArrival = (name: string) => toast("📷 Камера: фото прихода для " + name + " — штамп времени поставит сервер");
  const uploadPlan = (name: string) => toast("📎 Выбор файла плана работы для " + name);

  const openFinesLog = () => { setLogMonth(fMonth); setLogWho(""); setFinesLogOpen(true); };
  const closeFinesLog = () => setFinesLogOpen(false);

  const openPayroll = () => { setPayWho(teachers[0].id); setPayMonth(MONTHS[MONTHS.length - 1]); setPayOpen(true); };
  const closePayroll = () => setPayOpen(false);

  const openFine = (id: number, mn?: string) => {
    setFineId(id);
    setFineMonth(mn || fMonth);
    setFineReason("Опоздание");
    setFineSum("");
    setFineNote("");
    setFineBy("Владелец");
    setFineOpen(true);
  };
  const openFineFromLog = () => {
    const id = logWho ? +logWho : teachers[0].id;
    setFinesLogOpen(false);
    openFine(id, logMonth || undefined);
  };
  const closeFine = () => setFineOpen(false);
  const saveFine = () => {
    const sum = parseInt(fineSum, 10);
    if (!sum || sum <= 0) { toast("Введите сумму штрафа"); return; }
    const t = teachers.find((x) => x.id === fineId);
    const mn = fineMonth;
    const d = new Date();
    const date = String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
    setTeachers((list) => list.map((x) => {
      if (x.id !== fineId) return x;
      const fines = { ...(x.fines || {}) };
      fines[mn] = [...(fines[mn] || []), { date, reason: fineReason, sum, note: fineNote.trim(), by: fineBy }];
      return { ...x, fines };
    }));
    toast("Штраф начислен: " + t.name + " — " + money(sum) + " (" + fineReason + ")");
    setFineOpen(false);
    if (cardId != null) setActiveTab("fines");
  };

  /* ===== cell renderer ===== */
  const renderCell = (id: string, t: any, m: any, k: number, sal: any): any => {
    switch (id) {
      case "spec": return t.spec;
      case "branch": return t.branch;
      case "cat": return <span className="badge b-role">{catName(t.cat)}</span>;
      case "ret": return m ? (<><div className={"meter " + retClass(m.ret)}><span style={{ width: m.ret + "%" }} /></div><small style={{ color: "var(--muted)" }}>{m.ret}%</small></>) : "—";
      case "kpi": return <b>{m ? k : "—"}</b>;
      case "fines": return sal && sal.finesSum ? <span style={{ color: "var(--red)", fontWeight: 700 }}>− {money(sal.finesSum)}</span> : <span style={{ color: "var(--muted)" }}>—</span>;
      case "sal": return sal ? money(sal.total) : "—";
      case "students": return m ? m.students : "—";
      case "funnel": return m ? m.funnel + "%" : "—";
      case "rev": return m && m.rev ? m.rev.toFixed(1) + " ★" : "—";
      case "std": return m ? m.std + "%" : "—";
      case "phone": return t.phone;
      case "role": return <span className="badge b-role">{t.role}</span>;
      default: return "—";
    }
  };
  const activeCols = columns.filter((c) => c.on);

  /* ===== detail rows ===== */
  const detailActionsBar = (
    <div className="modal-foot" style={{ justifyContent: "flex-start", marginBottom: 6 }}>
      <button className="btn-sm" onClick={openFinesLog} style={{ borderColor: "#EBC4B6", color: "var(--red)" }}>Штрафы</button>
      <button className="btn-sm" onClick={openPayroll}>Рассчитать ЗП</button>
      <button className="btn-sm" onClick={() => openForm()}>+ Добавить преподавателя</button>
    </div>
  );
  const detailRow = (t: any, right: any) => (
    <div className="drow" key={t.id} onClick={() => openCard(t.id)}>
      <div><div className="nm">{t.name}</div><div className="meta">{catName(t.cat)} · {t.branch}</div></div>
      <div style={{ textAlign: "right" }}>{right}</div>
    </div>
  );

  const renderDetail = () => {
    const mn = fMonth;
    const list = teachers.filter((t) => monthData(t, mn));
    let title = "";
    let rows: any = null;
    if (detailKind === "all") {
      title = "Все преподаватели сети";
      rows = teachers.map((t) => { const m = monthData(t, mn); return detailRow(t, <><b>{m ? m.students : 0}</b> уч. · {t.status}</>); });
    } else if (detailKind === "active") {
      title = "Активные преподаватели";
      rows = teachers.filter((t) => t.status === "Активен").map((t) => { const m = monthData(t, mn); return detailRow(t, <><b>{m ? m.students : 0}</b> уч.</>); });
    } else if (detailKind === "intern") {
      title = "Стажёры";
      rows = teachers.filter((t) => t.status === "Стажер").map((t) => detailRow(t, <>принят {t.hired}</>));
    } else if (detailKind === "ret") {
      title = "Удержание по педагогам · " + mn;
      rows = list.map((t) => {
        const m = monthData(t, mn);
        const lv = t.leavers && t.leavers[mn] ? t.leavers[mn] : [];
        const subId = "ret" + t.id;
        return (
          <div key={t.id}>
            <div className="drow" onClick={() => toggleSub(subId)}>
              <div><div className="nm">{t.name} {lv.length ? <span style={{ color: "var(--gold-ink)", fontSize: 13 }}>· показать ушедших ▾</span> : null}</div><div className="meta">{catName(t.cat)} · {t.branch}</div></div>
              <div style={{ textAlign: "right" }}><b>{m.ret}%</b> · ушло {m.left}</div>
            </div>
            {lv.length && openSubs[subId] ? (
              <div style={{ padding: "0 0 10px 0" }}>
                <table className="sal-table"><thead><tr><th>Ученик</th><th>Группа</th><th>Филиал</th><th>Дата ухода</th><th>Причина</th></tr></thead>
                  <tbody>{lv.map((s: any, i: number) => (<tr key={i}><td><b>{s.name}</b></td><td>{s.group}</td><td>{s.branch}</td><td>{s.date}</td><td>{s.reason}</td></tr>))}</tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      });
    } else if (detailKind === "kpi") {
      title = "KPI по педагогам · " + mn;
      rows = list.map((t) => {
        const m = monthData(t, mn); const c = kpiComponents(m); const k = kpiTotal(c); const w = KPI_WEIGHTS;
        const subId = "kpi" + t.id;
        const part = (label: string, val: number, wt: number, i: number) => (<tr key={i}><td>{label}</td><td className="r">{val}</td><td className="r">{wt}%</td><td className="r"><b>{((val * wt) / 100).toFixed(1)}</b></td></tr>);
        return (
          <div key={t.id}>
            <div className="drow" onClick={() => toggleSub(subId)}>
              <div><div className="nm">{t.name} <span style={{ color: "var(--gold-ink)", fontSize: 13 }}>· показать формулу ▾</span></div><div className="meta">{catName(t.cat)} · {t.branch}</div></div>
              <div style={{ textAlign: "right" }}><b>{k}</b>/100</div>
            </div>
            {openSubs[subId] ? (
              <div style={{ padding: "0 0 10px 0" }}>
                <table className="sal-table"><thead><tr><th>Компонент</th><th className="r">Балл</th><th className="r">Вес</th><th className="r">Вклад</th></tr></thead>
                  <tbody>
                    {part("Удержание из мес. в мес.", c.ret, w.ret, 0)}
                    {part("Воронка ПУ (приход → покупка)", c.funnel, w.funnel, 1)}
                    {part("Отзывы родителей", c.reviews, w.reviews, 2)}
                    {part("Выполнение стандартов", c.standards, w.standards, 3)}
                    <tr style={{ background: "var(--gold-soft)" }}><td><b>Итоговый KPI</b></td><td className="r" /><td className="r" /><td className="r"><b>{k}/100</b></td></tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      });
    }
    const hasRows = Array.isArray(rows) && rows.length > 0;
    return (
      <div className={"detail" + (detailKind ? " open" : "")}>
        <div className="dh"><b>{title}</b><button className="x" onClick={closeDetail}>×</button></div>
        <div className="dbody">
          {hasRows ? detailActionsBar : null}
          {hasRows ? rows : <p className="note">Нет данных за выбранный месяц.</p>}
        </div>
      </div>
    );
  };

  /* ===== salary detail (shared card tab + payroll) ===== */
  const salaryDetail = (t: any, m: any, sal: any, mn: string, variant: "card" | "payroll") => {
    if (!sal) return <p className="note">За {mn} расчёта нет — нет учеников в этом месяце.</p>;
    return (
      <>
        <div className="sal-hero">
          <div className="k">{variant === "card" ? "Ожидаемая ЗП · " + mn : "ЗП к начислению · " + mn}</div>
          <div className="v">{money(sal.total)}</div>
          <div className="sub">{variant === "card" ? "прогноз в реальном времени · " + catName(t.cat) + " · обновляется по ходу месяца" : t.name + " · " + catName(t.cat)}</div>
        </div>
        <h4>Детализация по группам</h4>
        <table className="sal-table">
          <thead><tr><th>Группа</th><th className="r">Новенькие</th><th className="r">Постоянные</th><th className="r">Продолж.</th><th className="r">Сумма</th></tr></thead>
          <tbody>
            {t.groups.map((g: any, i: number) => {
              const c = t.cat;
              const contInG = c === 3 ? g.regCont || 0 : 0;
              const plainInG = Math.max(0, g.regCnt || 0);
              const gnew = g.newCnt * RATES.new[c];
              const greg = plainInG * RATES.reg[c];
              const gcont = c === 3 ? contInG * RATES.regCont[3] : 0;
              return (
                <tr key={i}><td>{g.name}</td><td className="r">{g.newCnt}×{RATES.new[c]}</td><td className="r">{plainInG}×{RATES.reg[c]}</td><td className="r">{c === 3 ? contInG + "×" + RATES.regCont[3] : "—"}</td><td className="r"><b>{money(gnew + greg + gcont)}</b></td></tr>
              );
            })}
          </tbody>
        </table>
        <h4>Итоговый расчёт</h4>
        {sal.newCnt ? <div className="sal-line"><span>Новенькие · {sal.newCnt} × {money(RATES.new[t.cat])}</span><span>{money(sal.newSum)}</span></div> : null}
        {sal.plainReg ? <div className="sal-line"><span>Постоянные · {sal.plainReg} × {money(RATES.reg[t.cat])}</span><span>{money(sal.regSum)}</span></div> : null}
        {sal.contCnt ? <div className="sal-line"><span>Постоянные, продолжающая · {sal.contCnt} × {money(RATES.regCont[3])}</span><span>{money(sal.contSum)}</span></div> : null}
        <div className="sal-line"><span><b>Базовая часть</b></span><span><b>{money(sal.base)}</b></span></div>
        <div className="sal-line">
          <span>Бонус удержания {sal.retOk ? "(+" + RETENTION_BONUS[t.cat] * 100 + "%" + (variant === "card" ? ", ушло ≤2" : "") + ")" : "(не начислен" + (variant === "card" ? ", ушло >2" : "") + ")"}</span>
          <span className={sal.retOk ? "pos" : ""}>{sal.retOk ? "+ " + money(sal.retBonus) : money(0)}</span>
        </div>
        <div className="sal-line">
          <span>Бонус «Педагог месяца»{variant === "card" ? (sal.tomBonus ? "" : " (не присвоен)") : ""}</span>
          <span className={sal.tomBonus ? "pos" : ""}>{sal.tomBonus ? "+ " + money(sal.tomBonus) : money(0)}</span>
        </div>
        {sal.fineList.map((f: any, i: number) => (
          <div className="sal-line" key={i}><span style={{ color: "var(--red)" }}>Штраф · {f.reason} <span style={{ color: "var(--muted)", fontSize: 13 }}>({f.date}{variant === "card" ? (f.note ? " · " + f.note : "") : f.by ? " · " + f.by : ""})</span></span><span style={{ color: "var(--red)", fontWeight: 700 }}>− {money(f.sum)}</span></div>
        ))}
        <div className="sal-line"><span>Штрафы итого {sal.finesSum ? "" : "(нет)"}</span><span style={{ color: "var(--red)", fontWeight: 700 }}>{sal.finesSum ? "− " + money(sal.finesSum) : money(0)}</span></div>
        <div className="sal-line total"><span>Итого к выплате</span><span>{money(sal.total)}</span></div>
        {variant === "card" ? (
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-gold" onClick={() => toast("ЗП начислена: " + t.name + " — " + money(sal.total))}>Начислить ЗП</button>
            <button className="btn-sm" onClick={() => setActiveTab("fines")} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Управлять штрафами →</button>
          </div>
        ) : (
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-gold" onClick={() => toast("ЗП начислена: " + t.name + " — " + money(sal.total) + " за " + mn)}>Начислить и провести</button>
            <button className="btn-sm" onClick={() => openFine(t.id, mn)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Начислить штраф</button>
          </div>
        )}
        <p className="note">{variant === "card" ? "Ставки и бонусы — по системе оплаты Эхо Гор 2025–2026. Виден педагогу, владельцу и управляющему." : "Считается автоматически из учеников групп. По системе оплаты Эхо Гор 2025–2026."}</p>
      </>
    );
  };

  /* ===== fines tab (карточка педагога) ===== */
  const finesTab = (t: any) => {
    const mn = fMonth;
    const all = t.fines || {};
    let allRows: any[] = [];
    Object.keys(all).forEach((month) => { (all[month] || []).forEach((f: any) => allRows.push({ ...f, month })); });
    const monthSum = (all[mn] || []).reduce((s: number, f: any) => s + f.sum, 0);
    const totalSum = allRows.reduce((s, f) => s + f.sum, 0);
    allRows = allRows.slice().sort((a, b) => (b.month === mn ? 1 : 0) - (a.month === mn ? 1 : 0));
    return (
      <>
        <div className="grid2" style={{ marginBottom: 8 }}>
          <div className="kpi"><div className="v" style={{ color: "var(--red)" }}>{money(monthSum)}</div><div className="k">Штрафы за {mn}</div></div>
          <div className="kpi"><div className="v" style={{ color: "var(--red)" }}>{money(totalSum)}</div><div className="k">Всего штрафов (история)</div></div>
        </div>
        <div className="modal-foot" style={{ justifyContent: "flex-start", margin: "6px 0 14px" }}>
          <button className="btn-sm" onClick={() => openFine(t.id)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>+ Начислить штраф</button>
        </div>
        {!allRows.length ? <p className="note">Штрафов нет. Чистая история.</p> : (
          <>
            <h4>История штрафов</h4>
            {allRows.map((f, i) => (
              <div className="row-item" key={i}>
                <div><div className="ttl" style={{ color: "var(--red)" }}>{f.reason} · {money(f.sum)}</div>
                  <div className="det">{f.month} · {f.date}{f.note ? " · " + f.note : ""} · начислил: {f.by || "—"}</div></div>
                <div><span className={"badge " + (f.month === mn ? "b-red" : "b-gray")}>{f.month === mn ? "текущий месяц" : f.month}</span></div>
              </div>
            ))}
            <p className="note">Штрафы вычитаются из итоговой ЗП автоматически. Начисляют владелец и управляющий.</p>
          </>
        )}
      </>
    );
  };

  /* ===== card panes ===== */
  const renderCardPanes = (t: any, m: any) => {
    const comp = kpiComponents(m); const k = kpiTotal(comp); const sal = salary(t, m, fMonth, winnerId);
    const pane = (key: string, body: any, extra?: any) => (
      <div className={"pane" + (activeTab === key ? " active" : "")} id={"pane-" + key} key={key} style={extra}>{body}</div>
    );
    const sLabel: any = { y: "✓", n: "✕", p: "~" };
    const stdBtn = (x: any) => {
      if (x.type === "photo") return <button className="btn-sm" onClick={() => markArrival(t.name)}>📷 Отметить приход</button>;
      if (x.type === "plan") return <button className="btn-sm" onClick={() => uploadPlan(t.name)}>📎 Загрузить план</button>;
      if (x.type === "journal") return <button className="btn-sm" onClick={() => toast("Открыт раздел «Журнал посещаемости»")}>Открыть журнал</button>;
      return <button className="btn-sm" onClick={() => toast("Запрос оценки отправлен родителям")}>Запросить оценку</button>;
    };
    const tb = (s: string) => (s === "Аттестован" ? "b-green" : s === "В процессе" ? "b-role" : "b-gray");
    const base = t.training.filter((x: any) => x.base);
    const extra = t.training.filter((x: any) => !x.base);
    const kpiRows = comp ? [["Удержание из мес. в мес.", comp.ret, KPI_WEIGHTS.ret], ["Воронка ПУ (приход → покупка)", comp.funnel, KPI_WEIGHTS.funnel], ["Отзывы родителей", comp.reviews, KPI_WEIGHTS.reviews], ["Выполнение стандартов", comp.standards, KPI_WEIGHTS.standards]] : [];

    return [
      /* INFO */
      pane("info", (
        <>
          <h4>Основная информация</h4>
          <div className="grid3">
            <div className="info"><div className="k">Телефон</div><div className="v">{t.phone}</div></div>
            <div className="info"><div className="k">Дата рождения</div><div className="v">{t.birth}</div></div>
            <div className="info"><div className="k">Принят на работу</div><div className="v">{t.hired}</div></div>
            <div className="info"><div className="k">Стаж работы</div><div className="v">{t.years}</div></div>
            <div className="info"><div className="k">LTV учеников</div><div className="v">{t.ltvMonths} мес.</div></div>
            <div className="info"><div className="k">Категория</div><div className="v">{catName(t.cat)}</div></div>
            <div className="info"><div className="k">Роль</div><div className="v">{t.role}</div></div>
            <div className="info"><div className="k">Статус</div><div className="v">{t.status}</div></div>
            <div className="info"><div className="k">Специализация</div><div className="v">{t.spec}</div></div>
          </div>
          <h4>Доступ в личный кабинет</h4>
          <div className="grid3">
            <div className="info"><div className="k">Логин</div><div className="v">{t.login || t.phone}</div></div>
            <div className="info"><div className="k">Пароль</div><div className="v">{t.pass ? "••••••••" : <span style={{ color: "var(--muted)" }}>не задан</span>}</div></div>
            <div className="info"><div className="k">Кабинет</div><div className="v" style={{ color: "var(--green)" }}>{t.pass ? "Активен" : "Нет доступа"}</div></div>
          </div>
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-sm" onClick={() => { closeCard(); openForm(t.id); }}>Редактировать карточку</button>
            {t.pass ? <button className="btn-sm" onClick={() => toast("Данные для входа отправлены: " + (t.login || t.phone))}>Отправить доступ педагогу</button> : null}
          </div>
        </>
      )),
      /* KPI */
      pane("kpi", (
        !comp ? <p className="note">За {fMonth} данных нет — педагог в этом месяце не работал.</p> : (
          <>
            <div className="kpi final" style={{ marginBottom: 18 }}><div className="v">{k}</div><div className="k">Итоговый KPI за {fMonth} · из 100</div></div>
            {kpiRows.map((r: any, i: number) => (
              <div className="kbar" key={i}>
                <div className="hd"><span className="nm">{r[0]}</span><span><span className="wt">вес {r[2]}% · </span><span className="sc">{r[1]}</span></span></div>
                <div className="track"><div className="fill" style={{ width: r[1] + "%", background: fillColor(r[1]) }} /></div>
              </div>
            ))}
            <p className="note">Итог = удержание×{KPI_WEIGHTS.ret}% + воронка×{KPI_WEIGHTS.funnel}% + отзывы×{KPI_WEIGHTS.reviews}% + стандарты×{KPI_WEIGHTS.standards}%. Влияет на категорию, звание «Педагог месяца» и бонусы.</p>
          </>
        )
      )),
      /* GROUPS */
      pane("groups", (
        <>
          <h4>Закреплённые группы</h4>
          {t.groups.map((g: any, i: number) => (
            <div className="row-item" key={i}>
              <div><div className="ttl">{g.name}</div><div className="det">{g.st} учеников · свободно {g.free} · удержание {g.ret}%</div></div>
              <div style={{ textAlign: "right" }}><div className={"meter " + retClass(g.fill)} style={{ marginLeft: "auto" }}><span style={{ width: g.fill + "%" }} /></div><small style={{ color: "var(--muted)" }}>заполн. {g.fill}%</small></div>
            </div>
          ))}
        </>
      )),
      /* STANDARDS */
      pane("std", (
        <>
          <h4>Базовые стандарты · {fMonth}</h4>
          {t.standards.map((x: any, i: number) => (
            <div className="std" key={i}><div className={"ck " + x.s}>{sLabel[x.s]}</div><div className="body"><div className="nm">{x.nm}</div><div className="det">{x.det}</div></div><div className="act">{stdBtn(x)}</div></div>
          ))}
          <p className="note"><b>Как это фиксируется:</b> приход — фото с серверным штампом времени и геометкой филиала, сравнивается с расписанием (вовремя = за 20 мин). План — файл/текст с привязкой к неделе. Оценки — через личный кабинет родителя и авто-запрос после открытого урока/концерта. Выполнение стандартов даёт % (вес {KPI_WEIGHTS.standards}% в KPI) и влияет на бонусы и звание.</p>
        </>
      )),
      /* TRAIN */
      pane("train", (
        <>
          <div className="sec-label">Базовая программа</div>
          {base.map((x: any, i: number) => (<div className="train-item" key={"b" + i}><div className="hd"><span className="nm">{x.dir}</span><span className={"badge " + tb(x.st)}>{x.st}</span></div></div>))}
          <div className="sec-label">Дополнительные направления</div>
          {extra.map((x: any, i: number) => (<div className="train-item" key={"e" + i}><div className="hd"><span className="nm">{x.dir}</span><span className={"badge " + tb(x.st)}>{x.st}</span></div></div>))}
        </>
      )),
      /* ATT */
      pane("att", (
        <>
          <h4>История аттестаций</h4>
          {t.attest.map((a: any, i: number) => (
            <div className="row-item" key={i}>
              <div><div className="ttl">{a.dir} {a.mark !== "—" ? "· " + a.mark : ""}</div><div className="det">{a.note}</div></div>
              <div style={{ textAlign: "right" }}><span className={"badge " + (a.res === "Аттестован" ? "b-green" : "b-gray")}>{a.res}</span><div className="det">{a.date}</div></div>
            </div>
          ))}
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}><button className="btn-sm" onClick={() => toast("Назначить аттестацию (только владелец)")}>Назначить аттестацию</button></div>
          <p className="note">История сохраняется бессрочно.</p>
        </>
      )),
      /* REV */
      pane("rev", (
        <>
          <h4>Отзывы и оценки</h4>
          {t.reviews.map((r: any, i: number) => (
            <div className="review" key={i}><div className="hd"><div><span className="stars">{r.stars ? starsStr(r.stars) : ""}</span> <span className="src">{r.who} · {r.src}</span></div></div><p>{r.text}</p></div>
          ))}
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-sm" onClick={() => toast("Загрузить отзыв (скрин/фото/видео/ссылка)")}>Прикрепить отзыв</button>
            <button className="btn-sm" onClick={() => toast("Ссылка на оценку отправлена родителям в WhatsApp")}>Запросить у родителей</button>
          </div>
        </>
      )),
      /* AI */
      pane("ai", (
        <div className="ai-box">
          <div className="ttl"><IconSpark />AI-анализ работы · {fMonth}</div>
          <div className="sec-label">Сильные стороны</div><div className="pill-list">{t.ai.pos.map((p: string, i: number) => (<span className="pill b-green" key={i}>{p}</span>))}</div>
          <div className="sec-label">Замечания</div><div className="pill-list">{t.ai.neg.map((p: string, i: number) => (<span className="pill b-red" key={i}>{p}</span>))}</div>
          <div className="sec-label">Заключение</div><p>{t.ai.verdict}</p>
          <div className="sec-label">Рекомендация по «Педагогу месяца»</div><p>{t.ai.rec}</p>
        </div>
      )),
      /* FINES */
      pane("fines", finesTab(t)),
      /* SAL */
      pane("sal", salaryDetail(t, m, sal, fMonth, "card")),
    ];
  };

  /* ===== fines log rows ===== */
  const renderFinesLog = () => {
    let rows: any[] = [];
    teachers.forEach((t) => {
      if (logWho && +logWho !== t.id) return;
      const all = t.fines || {};
      Object.keys(all).forEach((month) => {
        if (logMonth && logMonth !== month) return;
        (all[month] || []).forEach((f: any) => rows.push({ ...f, month, tName: t.name, tCat: t.cat, tId: t.id }));
      });
    });
    const total = rows.reduce((s, f) => s + f.sum, 0);
    return (
      <>
        <div className="kpi" style={{ marginBottom: 14, background: "var(--red-soft)" }}><div className="v" style={{ color: "var(--red)" }}>{money(total)}</div><div className="k">Сумма штрафов по фильтру · {rows.length} шт.</div></div>
        <div className="modal-foot" style={{ justifyContent: "flex-start", marginBottom: 14 }}>
          <button className="btn-sm" onClick={openFineFromLog} style={{ borderColor: "var(--red)", color: "var(--red)" }}>+ Начислить новый штраф</button>
        </div>
        {!rows.length ? <p className="note">Штрафов по выбранному фильтру нет.</p> : rows.map((f, i) => (
          <div className="row-item" key={i}><div>
            <div className="ttl" style={{ color: "var(--red)" }}>{f.tName} · {f.reason} · {money(f.sum)}</div>
            <div className="det">{catName(f.tCat)} · {f.month} · {f.date}{f.note ? " · " + f.note : ""} · начислил: {f.by || "—"}</div></div></div>
        ))}
      </>
    );
  };

  const cardTeacher = cardId != null ? teachers.find((t) => t.id === cardId) : null;
  const cardMonth = cardTeacher ? monthData(cardTeacher, fMonth) : null;
  const payTeacher = teachers.find((t) => t.id === payWho) || teachers[0];
  const payM = payTeacher ? monthData(payTeacher, payMonth) : null;
  const paySal = payTeacher ? salary(payTeacher, payM, payMonth, winnerId) : null;
  const fineTeacher = fineId != null ? teachers.find((t) => t.id === fineId) : null;

  /* ========================================================================= */
  return (
    <div className="proto-teachers">
      <h1>Преподаватели сети</h1>
      <p className="lead">Статистика и развитие педагогического состава. Выберите месяц — пересчитаются KPI, удержание и зарплата. Нажмите на показатель или преподавателя, чтобы раскрыть детали.</p>

      <div className="dash-bar">
        <div className="filters">
          <select className="month" value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
            {MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}
          </select>
          <select value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
            <option value="">Вся сеть</option>
            <option>Эхо Гор Чокина 109/1</option>
            <option>Сатпаева 210/1</option>
          </select>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="">Все категории</option>
            <option>1 категория</option><option>2 категория</option><option>3 категория</option>
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Любой статус</option>
            <option>Активен</option><option>Стажер</option>
          </select>
        </div>
      </div>

      {/* TEACHER OF MONTH BANNER */}
      <div className="tom">
        {winner ? (
          <>
            <div className="crown"><IconCrown /></div>
            <div className="info">
              <div className="elbl">Педагог месяца · {fMonth}</div>
              <div className="nm">{winner.name} · {catName(winner.cat)}</div>
              <div className="ai-tag"><IconSpark />ИИ предлагает: <b>&nbsp;{best ? best.name : "—"}</b> (KPI {bestK}). Бонус +20 000 тг</div>
            </div>
            <div className="btns">
              <button className="btn-sm primary" onClick={() => approveTOM(best ? best.id : winner.id)}>Утвердить выбор ИИ</button>
              <button className="btn-sm" onClick={() => showDetail("kpi")}>Сравнить педагогов</button>
            </div>
          </>
        ) : (
          <div className="info"><div className="elbl">Педагог месяца</div><div className="nm">Нет данных за месяц</div></div>
        )}
      </div>

      {/* TILES */}
      <div className="tiles">
        <div className="tile" onClick={() => showDetail("all")}><div className="lbl">Всего</div><div className="val">{teachers.length}</div><div className="sub">в сети →</div></div>
        <div className="tile" onClick={() => showDetail("active")}><div className="lbl">Активные</div><div className="val">{teachers.filter((t) => t.status === "Активен").length}</div><div className="sub">работают →</div></div>
        <div className="tile" onClick={() => showDetail("intern")}><div className="lbl">Стажёры</div><div className="val">{teachers.filter((t) => t.status === "Стажер").length}</div><div className="sub">статус «Стажер» →</div></div>
        <div className="tile" onClick={() => showDetail("ret")}><div className="lbl">Ср. удержание</div><div className="val">{avgRet.toFixed(1)}%</div><div className="sub">м/м · детально →</div></div>
        <div className="tile" onClick={() => showDetail("kpi")}><div className="lbl">Ср. KPI</div><div className="val">{Math.round(avgKpi)}</div><div className="sub">из 100 · детально →</div></div>
      </div>

      {/* DETAIL PANEL */}
      {detailKind ? renderDetail() : null}

      {/* SPOTLIGHT CARDS */}
      <div className="cards">
        {filtered.map((t) => {
          const m = monthData(t, fMonth); const k = kpiTotal(kpiComponents(m)); const win = winnerId === t.id;
          const sal = salary(t, m, fMonth, winnerId); const fSum = sal ? sal.finesSum : 0;
          return (
            <div className={"tcard" + (win ? " winner" : "")} key={t.id}>
              <div className="catpill">{catName(t.cat)}</div>
              {win ? <div className="wbadge"><IconWbadge />Педагог месяца</div> : null}
              <div className="top"><div className="ava">{t.initials}</div><h3>{t.name}</h3></div>
              <div className="stat-grid">
                <div className="st"><div className="k">Ученики</div><div className="v">{m ? m.students : "—"}</div></div>
                <div className="st"><div className="k">Удержание</div><div className="v">{m ? m.ret + "%" : "—"}</div></div>
                <div className="st"><div className="k">KPI</div><div className="v">{m ? k : "—"}</div></div>
                <div className="st"><div className="k">Ожид. ЗП</div><div className="v" style={{ fontSize: 17 }}>{sal ? money(sal.total) : "—"}</div></div>
              </div>
              {fSum ? <div style={{ background: "var(--red-soft)", color: "var(--red)", borderRadius: 12, padding: "10px 14px", fontWeight: 700, fontSize: 14, marginBottom: 16, display: "flex", justifyContent: "space-between" }}><span>Штрафы за месяц</span><span>− {money(fSum)}</span></div> : null}
              <button className="open-link" onClick={() => openCard(t.id)}>Открыть карточку ›</button>
            </div>
          );
        })}
      </div>

      {/* COUNT ROW + ACTIONS */}
      <div className="count-row">
        <span className="cnt">{filtered.length} преподавателей в сети</span>
        <div className="actions">
          <div className="colcfg">
            <button className="colcfg-btn" onClick={(e) => { e.stopPropagation(); setColMenuOpen((v) => !v); }}><IconCols />Показатели</button>
            <div className={"colcfg-menu" + (colMenuOpen ? " open" : "")} style={{ left: "auto", right: 0 }}>
              <div className="ttl">Колонки таблицы</div>
              <div className="colcfg-row locked"><input type="checkbox" checked disabled readOnly /> Преподаватель</div>
              {columns.map((c) => (
                <label className="colcfg-row" key={c.id}><input type="checkbox" checked={c.on} onChange={(e) => toggleCol(c.id, e.target.checked)} /> {c.label}</label>
              ))}
              <div className="colcfg-row locked"><input type="checkbox" checked disabled readOnly /> Действия</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={openFinesLog} style={{ borderColor: "#EBC4B6", color: "var(--red)" }}>Штрафы</button>
          <button className="btn-ghost" onClick={openPayroll}>Рассчитать ЗП</button>
          <button className="btn-gold" onClick={() => openForm()}>+ Добавить преподавателя</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Преподаватель</th>
              {activeCols.map((c) => (<th key={c.id}>{c.label}</th>))}
              <th style={{ textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const m = monthData(t, fMonth); const k = kpiTotal(kpiComponents(m)); const sal = salary(t, m, fMonth, winnerId);
              return (
                <tr key={t.id} onClick={() => openCard(t.id)}>
                  <td className="who"><b>{t.name}</b><span>{t.phone} · {m ? m.students : 0} уч.</span></td>
                  {activeCols.map((c) => (<td key={c.id}>{renderCell(c.id, t, m, k, sal)}</td>))}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      <button className="icn" title="Редактировать" onClick={() => openForm(t.id)}><IconEdit /></button>
                      <button className="icn" title="Архивировать" onClick={() => archive(t.id)}><IconArchive /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CARD MODAL */}
      {cardTeacher ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeCard(); }}>
          <div className="sheet">
            <div className="sheet-head">
              <div className="ava">{cardTeacher.initials}</div>
              <div><h2>{cardTeacher.name}</h2><div className="meta">{cardTeacher.spec} · {cardTeacher.branch} · {catName(cardTeacher.cat)} · {fMonth}</div></div>
              <button className="close" onClick={closeCard}>×</button>
            </div>
            <div className="tabs">
              {CARD_TABS.map(([key, label]) => (
                <button className={"tab" + (activeTab === key ? " active" : "")} key={key} onClick={() => setActiveTab(key)}>{label}</button>
              ))}
            </div>
            <div>{renderCardPanes(cardTeacher, cardMonth)}</div>
          </div>
        </div>
      ) : null}

      {/* ADD / EDIT FORM MODAL */}
      {formOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="sheet" style={{ maxWidth: 680 }}>
            <div className="sheet-head">
              <div><h2>{editId ? "Редактирование: " + (teachers.find((t) => t.id === editId)?.name || "") : "Новый преподаватель"}</h2><div className="meta">Заполните карточку сотрудника</div></div>
              <button className="close" onClick={closeForm}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="avatar-pick" style={{ marginBottom: 16 }}>
                <div className="ava">{form.ava}</div>
                <button className="btn-sm" onClick={() => toast("Загрузка фото — выбор файла")}>Загрузить фото</button>
              </div>
              <div className="form-grid">
                <div className="field full"><label>ФИО *</label><input value={form.name} placeholder="Иванов Иван" onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
                <div className="field"><label>Телефон *</label><input value={form.phone} placeholder="+7 ___ ___ __ __" onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value, login: f.loginTouched ? f.login : e.target.value }))} /></div>
                <div className="field"><label>Дата рождения</label><input type="date" value={form.birth} onChange={(e) => setForm((f: any) => ({ ...f, birth: e.target.value }))} /></div>
                <div className="field"><label>Дата приёма</label><input type="date" value={form.hired} onChange={(e) => setForm((f: any) => ({ ...f, hired: e.target.value }))} /></div>
                <div className="field"><label>Филиал *</label><select value={form.br} onChange={(e) => setForm((f: any) => ({ ...f, br: e.target.value }))}><option>Эхо Гор Чокина 109/1</option><option>Сатпаева 210/1</option></select></div>
                <div className="field"><label>Категория</label><select value={form.ct} onChange={(e) => setForm((f: any) => ({ ...f, ct: e.target.value }))}><option value="1">1 категория</option><option value="2">2 категория</option><option value="3">3 категория</option></select></div>
                <div className="field"><label>Роль</label><select value={form.rl} onChange={(e) => setForm((f: any) => ({ ...f, rl: e.target.value }))}><option>Преподаватель</option><option>Администратор</option><option>Управляющий</option></select></div>
                <div className="field full"><label>Специализация</label><input value={form.spec} placeholder="Лезгинка, High Heels..." onChange={(e) => setForm((f: any) => ({ ...f, spec: e.target.value }))} /></div>
                <div className="field"><label>Статус</label><select value={form.st} onChange={(e) => setForm((f: any) => ({ ...f, st: e.target.value }))}><option>Активен</option><option>Стажер</option></select></div>
              </div>
              <div className="sec-label" style={{ marginTop: 20 }}>Доступ в личный кабинет</div>
              <div className="form-grid">
                <div className="field"><label>Логин (телефон)</label><input value={form.login} placeholder="Подставится из телефона" onChange={(e) => setForm((f: any) => ({ ...f, login: e.target.value, loginTouched: true }))} /></div>
                <div className="field"><label>Пароль</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" value={form.pass} placeholder="Пароль для входа" style={{ flex: 1 }} onChange={(e) => setForm((f: any) => ({ ...f, pass: e.target.value }))} />
                    <button className="btn-sm" type="button" onClick={genPass}>Сгенерировать</button>
                  </div>
                </div>
              </div>
              <p className="note">Логин по умолчанию = номер телефона. Педагог входит в личный кабинет и видит свои KPI, ЗП, штрафы, обучение. Пароль в рабочей системе хранится в зашифрованном виде на сервере.</p>
              <div className="modal-foot">
                <button className="btn-ghost" onClick={closeForm}>Отмена</button>
                <button className="btn-gold" onClick={saveForm}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* PAYROLL MODAL */}
      {payOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closePayroll(); }}>
          <div className="sheet">
            <div className="sheet-head">
              <div><h2>Расчёт зарплаты</h2><div className="meta">Автоматически из учеников групп · по системе оплаты Эхо Гор</div></div>
              <button className="close" onClick={closePayroll}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="form-grid" style={{ marginBottom: 8 }}>
                <div className="field"><label>Преподаватель</label><select value={payWho} onChange={(e) => setPayWho(+e.target.value)}>{teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                <div className="field"><label>Месяц</label><select value={payMonth} onChange={(e) => setPayMonth(e.target.value)}>{MONTHS.map((mn) => (<option key={mn} value={mn}>{mn}</option>))}</select></div>
              </div>
              <div>{salaryDetail(payTeacher, payM, paySal, payMonth, "payroll")}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* FINES LOG MODAL */}
      {finesLogOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeFinesLog(); }}>
          <div className="sheet">
            <div className="sheet-head">
              <div><h2>Журнал штрафов</h2><div className="meta">Все штрафы по сети · вычитаются из ЗП автоматически</div></div>
              <button className="close" onClick={closeFinesLog}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="form-grid" style={{ marginBottom: 8 }}>
                <div className="field"><label>Месяц</label><select value={logMonth} onChange={(e) => setLogMonth(e.target.value)}><option value="">Все месяцы</option>{MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}</select></div>
                <div className="field"><label>Преподаватель</label><select value={logWho} onChange={(e) => setLogWho(e.target.value)}><option value="">Все преподаватели</option>{teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
              </div>
              <div>{renderFinesLog()}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* FINE MODAL */}
      {fineOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeFine(); }}>
          <div className="sheet" style={{ maxWidth: 520 }}>
            <div className="sheet-head">
              <div><h2>Начислить штраф</h2><div className="meta">{fineTeacher ? fineTeacher.name + " · " + catName(fineTeacher.cat) : ""}</div></div>
              <button className="close" onClick={closeFine}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="form-grid">
                <div className="field"><label>Причина *</label><select value={fineReason} onChange={(e) => setFineReason(e.target.value)}>{FINE_REASONS.map((r) => (<option key={r}>{r}</option>))}</select></div>
                <div className="field"><label>Сумма, тг *</label><input type="number" value={fineSum} placeholder="2000" onChange={(e) => setFineSum(e.target.value)} /></div>
                <div className="field"><label>Месяц</label><select value={fineMonth} onChange={(e) => setFineMonth(e.target.value)}>{MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}</select></div>
                <div className="field"><label>Кто начислил</label><select value={fineBy} onChange={(e) => setFineBy(e.target.value)}><option>Владелец</option><option>Управляющий</option></select></div>
                <div className="field full"><label>Комментарий</label><textarea rows={2} value={fineNote} placeholder="Детали нарушения" onChange={(e) => setFineNote(e.target.value)} /></div>
              </div>
              <p className="note">Штраф вычитается из итоговой ЗП. Педагог видит причину, сумму, дату и кто начислил.</p>
              <div className="modal-foot">
                <button className="btn-ghost" onClick={closeFine}>Отмена</button>
                <button className="btn-gold" onClick={saveFine}>Начислить штраф</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* TOASTS */}
      <div className="toasts">
        {toasts.map((t) => (<div className="toast" key={t.id}><span className="dot" /><span>{t.msg}</span></div>))}
      </div>
    </div>
  );
}

export default TeachersProtoView;
