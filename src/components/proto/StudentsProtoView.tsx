import { useRef, useState } from "react";
import "./students-proto.css";

/* ===================== КОНФИГ СТАТУСОВ ===================== */
const SC: Record<string, { label: string; cls: string }> = {
  no_status: { label: "Без статуса", cls: "pill-gray" },
  trial_scheduled: { label: "Записан на пробный", cls: "pill-blue" },
  trial_missed: { label: "Не пришёл на пробный", cls: "pill-red" },
  trial_rescheduled: { label: "Перезаписан", cls: "pill-amber" },
  trial_no_buy: { label: "Был, не купил", cls: "pill-orange" },
  bought: { label: "Купил абонемент", cls: "pill-green" },
  active: { label: "Активный ученик", cls: "pill-gray" },
  renewal_needed: { label: "Требует продления", cls: "pill-amber" },
  debt: { label: "Должник", cls: "pill-red" },
  next_month: { label: "Куплен следующий месяц", cls: "pill-green" },
  waitlist: { label: "Лист ожидания", cls: "pill-purple" },
  vacation: { label: "Каникулы", cls: "pill-gray" },
  left: { label: "Ушедший", cls: "pill-gray" },
};

/* ===================== MOCK-ДАННЫЕ ===================== */
const INITIAL_STUDENTS: any[] = [
  { id: 1, first: "Айгерим", last: "Болатова", phone: "+7 707 111 22 33", gender: "female", dob: "2012-03-15", branch: "Основная база", group: "Ансамбль", dur: 14, end: "30.06.2026", debt: 0, status: "active", archived: false, source: "Instagram", parent: "Жанна", comments: [] },
  { id: 2, first: "Диас", last: "Нурланов", phone: "+7 701 222 33 44", gender: "male", dob: "2013-07-22", branch: "Основная база", group: "Хип-хоп", dur: 2, end: "25.06.2026", debt: 0, status: "bought", archived: false, source: "TikTok", parent: "", comments: [] },
  { id: 3, first: "Карина", last: "Ахметова", phone: "+7 705 333 44 55", gender: "female", dob: "2010-11-08", branch: "Филиал «Жастар»", group: "Соло", dur: 8, end: "20.06.2026", debt: 16000, status: "debt", archived: false, source: "Рекомендация", parent: "Алма", comments: [] },
  { id: 4, first: "Дамир", last: "Сериков", phone: "+7 702 444 55 66", gender: "male", dob: "2015-04-01", branch: "Основная база", group: "Малыши", dur: 5, end: "22.06.2026", debt: 8000, status: "debt", archived: false, source: "Google", parent: "Айнур", comments: [] },
  { id: 5, first: "Жанна", last: "Касенова", phone: "+7 747 555 66 77", gender: "female", dob: "2008-09-30", branch: "Филиал «Достык»", group: "Ансамбль", dur: 45, end: "31.07.2026", debt: 0, status: "next_month", archived: false, source: "Instagram", parent: "", comments: [] },
  { id: 6, first: "Самат", last: "Ермеков", phone: "+7 700 666 77 88", gender: "male", dob: "2003-02-14", branch: "Основная база", group: "Хип-хоп", dur: 62, end: "28.06.2026", debt: 0, status: "active", archived: false, source: "2GIS", parent: "", comments: [] },
  { id: 7, first: "Аружан", last: "Тулегенова", phone: "+7 705 777 88 99", gender: "female", dob: "2014-06-12", branch: "Филиал «Жастар»", group: "Соло", dur: 1, end: null, debt: 0, status: "trial_scheduled", archived: false, source: "WhatsApp", parent: "Бота", comments: [] },
  { id: 8, first: "Ержан", last: "Абенов", phone: "+7 701 888 99 00", gender: "male", dob: "2014-08-05", branch: "Основная база", group: "Малыши", dur: 9, end: "18.06.2026", debt: 16000, status: "debt", archived: false, source: "Рекомендация", parent: "Асем", comments: [] },
  { id: 9, first: "Виктория", last: "Жукова", phone: "+7 707 234 56 78", gender: "female", dob: "2013-03-15", branch: "Основная база", group: "Ансамбль", dur: 22, end: "30.06.2026", debt: 0, status: "active", archived: false, source: "Instagram", parent: "Жанна Жукова", comments: [] },
  { id: 10, first: "Мадина", last: "Сапарова", phone: "+7 702 999 00 11", gender: "female", dob: "2007-12-20", branch: "Филиал «Достык»", group: "Хип-хоп", dur: 4, end: "26.06.2026", debt: 0, status: "renewal_needed", archived: false, source: "Повторный клиент", parent: "", comments: [] },
  { id: 11, first: "Алишер", last: "Касымов", phone: "+7 747 111 22 00", gender: "male", dob: "2011-05-18", branch: "Основная база", group: "Соло", dur: 3, end: "19.06.2026", debt: 16000, status: "debt", archived: false, source: "Google", parent: "Дина", comments: [] },
  { id: 12, first: "Нурлан", last: "Жумабеков", phone: "+7 701 888 77 66", gender: "male", dob: "2014-01-25", branch: "Основная база", group: "Хип-хоп", dur: 0, end: null, debt: 0, status: "trial_scheduled", archived: false, source: "2GIS", parent: "Серик", comments: [] },
  { id: 13, first: "Асель", last: "Нурпеисова", phone: "+7 700 555 44 33", gender: "female", dob: "2012-11-20", branch: "Филиал «Достык»", group: "Соло", dur: 11, end: "01.08.2026", debt: 0, status: "vacation", archived: false, source: "Instagram", parent: "", comments: [] },
  { id: 14, first: "Сабина", last: "Дюсенова", phone: "+7 747 777 66 55", gender: "female", dob: "2009-04-12", branch: "Филиал «Жастар»", group: "Ансамбль", dur: 30, end: "30.06.2026", debt: 0, status: "active", archived: false, source: "Рекомендация", parent: "", comments: [] },
  { id: 15, first: "Бекзат", last: "Оспанов", phone: "+7 702 666 55 44", gender: "male", dob: "2009-10-03", branch: "Основная база", group: "Хип-хоп", dur: 6, end: null, debt: 0, status: "left", archived: true, source: "TikTok", parent: "", comments: [] },
  { id: 16, first: "Тимур", last: "Жаксыбеков", phone: "+7 705 444 33 22", gender: "male", dob: "2014-03-10", branch: "Основная база", group: "", dur: 0, end: null, debt: 0, status: "no_status", archived: false, source: "Instagram", parent: "", comments: [] },
  { id: 17, first: "Малика", last: "Сейтова", phone: "+7 700 222 33 44", gender: "female", dob: "2012-06-18", branch: "Основная база", group: "Соло", dur: 0, end: null, debt: 0, status: "trial_no_buy", archived: false, source: "Instagram", parent: "", comments: [] },
  { id: 18, first: "Арман", last: "Бекенов", phone: "+7 702 333 44 55", gender: "male", dob: "2015-02-22", branch: "Филиал «Достык»", group: "Малыши", dur: 0, end: null, debt: 0, status: "trial_missed", archived: false, source: "TikTok", parent: "Нуржан", comments: [] },
  { id: 19, first: "Руслан", last: "Дюсенов", phone: "+7 705 000 11 22", gender: "male", dob: "2013-09-05", branch: "Основная база", group: "", dur: 0, end: null, debt: 0, status: "no_status", archived: false, source: "Другое", parent: "", comments: [] },
];

const INITIAL_WAITLIST: any[] = [
  { id: 101, first: "Камила", last: "Ахатова", phone: "+7 705 999 88 77", gender: "female", dob: "2015-07-07", branch: "Филиал «Достык»", group: "Малыши", since: "2026-05-01", comment: "" },
  { id: 102, first: "Гульнара", last: "Ержанова", phone: "+7 701 222 11 00", gender: "female", dob: "2013-04-14", branch: "Основная база", group: "Ансамбль", since: "2026-06-15", comment: "Хочет в пятницу" },
];

/* ===================== ХЕЛПЕРЫ ===================== */
const TODAY = new Date(2026, 5, 22);
const pad = (n: number) => String(n).padStart(2, "0");
const fmtMoney = (n: number) => n.toLocaleString("ru-RU") + " тг";
const fullName = (s: any) => s.first + " " + s.last;

function calcAgeYears(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  let age = TODAY.getFullYear() - d.getFullYear();
  if (TODAY.getMonth() - d.getMonth() < 0 || (TODAY.getMonth() === d.getMonth() && TODAY.getDate() < d.getDate())) age--;
  return age;
}
function ageLabel(y: number | null): string {
  if (y === null) return "—";
  const m = y % 10, c = y % 100;
  if (m === 1 && c !== 11) return y + " год";
  if (m >= 2 && m <= 4 && !(c >= 12 && c <= 14)) return y + " года";
  return y + " лет";
}
function ltvSeg(m: number): string {
  if (m < 3) return "Новый";
  if (m < 6) return "Адаптация";
  if (m < 12) return "Постоянный";
  if (m < 36) return "Лояльный";
  if (m < 60) return "Ядро студии";
  return "Легенда Эхо Гор";
}
function daysSince(iso: string): number {
  return Math.round((TODAY.getTime() - new Date(iso).getTime()) / 86400000);
}
function priLabel(d: number): { l: string; c: string } {
  return d >= 30 ? { l: "Высокий", c: "pri-h" } : d >= 7 ? { l: "Средний", c: "pri-m" } : { l: "Низкий", c: "pri-l" };
}
function conflict(s: any, action: string): string | null {
  if (action === "add_waitlist" && ["active", "next_month", "bought"].includes(s.status))
    return "У ученика уже есть активный абонемент. Добавление в лист ожидания невозможно.";
  if (action === "sell_sub" && s.archived) return "Ученик находится в архиве. Сначала восстановите ученика.";
  if (action === "sell_sub" && s.status === "next_month") return "На выбранный период у ученика уже есть оплаченный абонемент.";
  if (action === "mark" && s.status === "waitlist") return "Ученик в листе ожидания и не закреплён за активной группой.";
  if (action === "sell_group" && !s.group) return "Для продажи группового абонемента необходимо выбрать группу.";
  return null;
}

/* ===================== СЕГМЕНТЫ / КОЛОНКИ ===================== */
const SEGS: { k: string; l: string; p: (s: any) => boolean }[] = [
  { k: "all", l: "Все", p: () => true },
  { k: "active", l: "Активные", p: (s) => ["active", "bought", "next_month", "renewal_needed"].includes(s.status) },
  { k: "renewal_needed", l: "Требуют продления", p: (s) => s.status === "renewal_needed" },
  { k: "debt", l: "Должники", p: (s) => s.debt > 0 || s.status === "debt" },
  { k: "no_status", l: "Без статуса", p: (s) => s.status === "no_status" },
  { k: "trial_scheduled", l: "Записаны на пробный", p: (s) => s.status === "trial_scheduled" },
  { k: "next_month", l: "Купили следующий", p: (s) => s.status === "next_month" },
  { k: "waitlist", l: "Лист ожидания", p: (s) => s.status === "waitlist" },
  { k: "vacation", l: "Каникулы", p: (s) => s.status === "vacation" },
  { k: "vacation", l: "Вернувшиеся", p: (s) => s.status === "trial_rescheduled" },
  { k: "left", l: "Ушедшие", p: (s) => s.archived },
];

const SEG_LIST = [
  { k: "all", l: "Все" },
  { k: "active", l: "Активные" },
  { k: "renewal_needed", l: "Требуют продления" },
  { k: "debt", l: "Должники" },
  { k: "no_status", l: "Без статуса" },
  { k: "trial_scheduled", l: "Записаны на пробный" },
  { k: "next_month", l: "Купили следующий" },
  { k: "waitlist", l: "Лист ожидания" },
  { k: "vacation", l: "Каникулы" },
  { k: "left", l: "Ушедшие" },
];

const ALL_COLS: { k: string; l: string; always?: boolean }[] = [
  { k: "num", l: "№", always: true },
  { k: "name", l: "Имя и фамилия", always: true },
  { k: "phone", l: "Телефон" },
  { k: "branch", l: "Филиал" },
  { k: "group", l: "Группа" },
  { k: "age", l: "Возраст" },
  { k: "gender", l: "Пол" },
  { k: "dur", l: "Стаж" },
  { k: "end", l: "Окончание" },
  { k: "debt", l: "Долг" },
  { k: "ltv", l: "LTV" },
  { k: "source", l: "Источник" },
  { k: "status", l: "Статус" },
  { k: "actions", l: "Действия", always: true },
];
const DEFAULT_VIS = ["num", "name", "phone", "branch", "group", "age", "end", "debt", "status", "actions"];

/* ===================== SVG-ИКОНКИ ===================== */
const IcoPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
);
const IcoWa = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
);
const IcoTg = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);
const IcoEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IcoAddUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
);
const IcoClose = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);

const KPI_ICONS: Record<string, any> = {
  all: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
  active: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>,
  renewal_needed: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" /></svg>,
  debt: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  no_status: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  waitlist: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
};

const FUNNEL_ICONS: any[] = [
  <svg key="f1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
  <svg key="f2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  <svg key="f3" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>,
  <svg key="f4" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" /></svg>,
  <svg key="f5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
  <svg key="f6" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
];

/* ===================== КОМПОНЕНТ ===================== */
export function StudentsProtoView() {
  const [students, setStudents] = useState<any[]>(INITIAL_STUDENTS);
  const [waitlist, setWaitlist] = useState<any[]>(INITIAL_WAITLIST);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activeSeg, setActiveSeg] = useState("all");
  const [view, setView] = useState<"registry" | "waitlist">("registry");

  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fBranch, setFBranch] = useState("all");
  const [fGroup, setFGroup] = useState("all");
  const [fLtv, setFLtv] = useState("all");
  const [fArch, setFArch] = useState("active");

  const [visCols, setVisCols] = useState<Set<string>>(new Set(DEFAULT_VIS));
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [modal, setModal] = useState<string | null>(null);

  // форма нового ученика
  const [nFirst, setNFirst] = useState("");
  const [nLast, setNLast] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nDob, setNDob] = useState("");
  const [nGender, setNGender] = useState("female");
  const [nBranch, setNBranch] = useState("Основная база");
  const [nGroup, setNGroup] = useState("");
  const [nSource, setNSource] = useState("Instagram");
  const [nParent, setNParent] = useState("");
  const [nComment, setNComment] = useState("");

  const [colDraft, setColDraft] = useState<Set<string>>(new Set(DEFAULT_VIS));
  const [mgG, setMgG] = useState("Ансамбль");
  const [mgB, setMgB] = useState("Основная база");
  const [mgS, setMgS] = useState("no_status");
  const [dcInp, setDcInp] = useState("");

  const [toasts, setToasts] = useState<any[]>([]);
  const toastId = useRef(0);

  /* ---------- toast ---------- */
  function toast(msg: string, type: "ok" | "err" | "wrn" = "ok") {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, type, out: false }]);
    const ttl = type === "err" ? 5000 : 3200;
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 200);
    }, ttl);
  }

  /* ---------- фильтрация ---------- */
  function computeFiltered(): any[] {
    const def = SEGS.find((d) => d.k === activeSeg) || SEGS[0];
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (fArch === "active" && s.archived) return false;
      if (fArch === "archive" && !s.archived) return false;
      if (!def.p(s)) return false;
      if (fStatus !== "all" && s.status !== fStatus) return false;
      if (fBranch !== "all" && s.branch !== fBranch) return false;
      if (fGroup !== "all" && s.group !== fGroup) return false;
      if (fLtv !== "all" && ltvSeg(s.dur) !== fLtv) return false;
      if (q && ![s.first, s.last, s.phone, s.parent, s.group].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function filterBySeg(key: string) {
    setActiveSeg(key);
    setFStatus(SC[key] ? key : "all");
    setView("registry");
  }

  /* ---------- выбор / массовые ---------- */
  function toggleSel(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    const rows = computeFiltered();
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((s) => (checked ? next.add(s.id) : next.delete(s.id)));
      return next;
    });
  }

  /* ---------- drawer ---------- */
  function openDrawer(id: number) {
    setDrawerId(id);
    setDcInp("");
  }
  function closeDrawer() {
    setDrawerId(null);
  }
  function changeStatus(id: number, v: string) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status: v, archived: v === "left" ? true : s.archived } : s)));
    toast(`Статус: ${SC[v]?.label}`, "ok");
  }
  function addComment() {
    if (drawerId === null) return;
    const t = dcInp.trim();
    if (!t) return;
    const date = `${pad(TODAY.getDate())}.${pad(TODAY.getMonth() + 1)}.${TODAY.getFullYear()}`;
    setStudents((prev) => prev.map((s) => (s.id === drawerId ? { ...s, comments: [{ date, text: t }, ...s.comments] } : s)));
    setDcInp("");
  }
  function addToWaitlist(sid: number) {
    const s = students.find((x) => x.id === sid);
    if (!s) return;
    const c = conflict(s, "add_waitlist");
    if (c) {
      toast(c, "err");
      return;
    }
    if (waitlist.find((w) => w.id === sid)) {
      toast(`${fullName(s)} уже в листе ожидания`, "wrn");
      return;
    }
    setWaitlist((prev) => [
      { id: s.id, first: s.first, last: s.last, phone: s.phone, gender: s.gender, dob: s.dob, branch: s.branch, group: s.group || "", since: TODAY.toISOString().slice(0, 10), comment: "" },
      ...prev,
    ]);
    setStudents((prev) => prev.map((x) => (x.id === sid ? { ...x, status: "waitlist" } : x)));
    closeDrawer();
    toast(`${fullName(s)} добавлен в лист ожидания`, "ok");
  }

  /* ---------- waitlist ---------- */
  function enrollWl(wid: number) {
    const w = waitlist.find((x) => x.id === wid);
    if (!w) return;
    setWaitlist((prev) => prev.filter((x) => x.id !== wid));
    setStudents((prev) => prev.map((s) => (s.id === wid ? { ...s, status: "trial_scheduled" } : s)));
    toast(`${w.first} ${w.last} записан в группу`, "ok");
  }
  function removeWl(wid: number) {
    setWaitlist((prev) => prev.filter((x) => x.id !== wid));
    toast("Удалён из листа", "ok");
  }

  /* ---------- новый ученик ---------- */
  function saveNewStudent() {
    const first = nFirst.trim(), last = nLast.trim(), phone = nPhone.trim();
    if (!first || !last || !phone) {
      toast("Заполните: Имя, Фамилия, Телефон", "err");
      return;
    }
    const id = Date.now();
    setStudents((prev) => [
      ...prev,
      { id, first, last, phone, gender: nGender, dob: nDob || null, branch: nBranch, group: nGroup, dur: 0, end: null, debt: 0, status: "no_status", archived: false, source: nSource, parent: nParent.trim(), comments: [] },
    ]);
    setModal(null);
    toast("Ученик создан — статус «Без статуса»", "ok");
    setTimeout(() => openDrawer(id), 200);
    setNFirst(""); setNLast(""); setNPhone(""); setNDob(""); setNParent(""); setNComment("");
    setNGender("female"); setNGroup(""); setNSource("Instagram"); setNBranch("Основная база");
  }

  /* ---------- настройка колонок ---------- */
  function openColCustomizer() {
    setColDraft(new Set(visCols));
    setModal("colCustomizer");
  }
  function toggleColDraft(k: string) {
    setColDraft((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  function applyColSettings() {
    const next = new Set(colDraft);
    next.add("actions");
    setVisCols(next);
    setModal(null);
    toast("Таблица обновлена", "ok");
  }

  /* ---------- массовые действия ---------- */
  function doMassGroup() {
    setStudents((prev) => prev.map((s) => (selected.has(s.id) ? { ...s, group: mgG } : s)));
    setModal(null);
    toast(`Группа → ${mgG}`, "ok");
  }
  function doMassBranch() {
    setStudents((prev) => prev.map((s) => (selected.has(s.id) ? { ...s, branch: mgB } : s)));
    setModal(null);
    toast(`Филиал → ${mgB}`, "ok");
  }
  function doMassStatus() {
    setStudents((prev) => prev.map((s) => (selected.has(s.id) ? { ...s, status: mgS, archived: mgS === "left" ? true : s.archived } : s)));
    setModal(null);
    toast(`Статус изменён у ${selected.size} уч.`, "ok");
  }
  function massWa() {
    if (!selected.size) return;
    toast(`WhatsApp → ${selected.size} ученикам`, "ok");
  }
  function massComment() {
    if (!selected.size) return;
    const t = window.prompt("Комментарий:");
    if (!t) return;
    const d = `${pad(TODAY.getDate())}.${pad(TODAY.getMonth() + 1)}.${TODAY.getFullYear()}`;
    setStudents((prev) => prev.map((s) => (selected.has(s.id) ? { ...s, comments: [{ date: d, text: t }, ...s.comments] } : s)));
    toast(`Добавлено ${selected.size} уч.`, "ok");
  }
  function massExport() {
    if (!selected.size) return;
    const rows = students.filter((s) => selected.has(s.id));
    const h = ["Имя", "Фамилия", "Телефон", "Статус"];
    const lines = [h.join(";"), ...rows.map((s) => [s.first, s.last, s.phone, SC[s.status]?.label].join(";"))];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ученики.csv";
    a.click();
    toast(`Выгружено ${rows.length} уч.`, "ok");
  }
  function massArchive() {
    if (!selected.size) return;
    const n = selected.size;
    setStudents((prev) => prev.map((s) => (selected.has(s.id) ? { ...s, archived: true, status: "left" } : s)));
    setSelected(new Set());
    toast(`${n} уч. в архиве`, "ok");
  }

  /* ---------- производные данные ---------- */
  const na = students.filter((s) => !s.archived);
  const kpiItems = [
    { icon: KPI_ICONS.all, ic: "gray", n: students.length, l: "Всего учеников", seg: "all" },
    { icon: KPI_ICONS.active, ic: "green", n: na.filter((s) => ["active", "bought", "next_month"].includes(s.status)).length, l: "Активные", seg: "active" },
    { icon: KPI_ICONS.renewal_needed, ic: "orange", n: na.filter((s) => s.status === "renewal_needed").length, l: "Требуют продления", seg: "renewal_needed" },
    { icon: KPI_ICONS.debt, ic: "red", n: na.filter((s) => s.debt > 0 || s.status === "debt").length, l: "Должники", seg: "debt" },
    { icon: KPI_ICONS.no_status, ic: "blue", n: na.filter((s) => s.status === "no_status").length, l: "Без статуса", seg: "no_status" },
    { icon: KPI_ICONS.waitlist, ic: "purple", n: waitlist.length, l: "Лист ожидания", seg: "waitlist" },
  ];
  const funnelSteps = [
    { k: "no_status", l: "Без статуса", hint: "нет целевых действий", n: 1, cls: "fc1" },
    { k: "trial_scheduled", l: "Записаны на пробный", hint: "ожидают занятия", n: 2, cls: "fc2" },
    { k: "trial_missed", l: "Не пришли на пробный", hint: "перезаписать", n: 3, cls: "fc3" },
    { k: "trial_rescheduled", l: "Перезаписаны", hint: "ждут занятия", n: 4, cls: "fc4" },
    { k: "trial_no_buy", l: "Были, не купили", hint: "дожать", n: 5, cls: "fc5" },
    { k: "bought", l: "Купили абонемент", hint: "новый посетитель", n: 6, cls: "fc6" },
  ];

  const cols = ALL_COLS.filter((c) => c.always || visCols.has(c.k));
  const filtered = computeFiltered();
  const selAllChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const drawerStudent = drawerId !== null ? students.find((s) => s.id === drawerId) : null;
  const badge1 = students.filter((s) => !s.archived).length;
  const badge2 = waitlist.length;

  /* ---------- рендер ячейки ---------- */
  function renderCell(c: any, s: any, idx: number) {
    const age = calcAgeYears(s.dob);
    const ltv = ltvSeg(s.dur);
    const ltvG = ltv === "Ядро студии" || ltv === "Легенда Эхо Гор";
    const cfg = SC[s.status] || SC.no_status;
    switch (c.k) {
      case "num": return <td key={c.k} className="td-num">{idx}</td>;
      case "name": return <td key={c.k} className="td-name">{fullName(s)}</td>;
      case "phone": return <td key={c.k} className="td-phone">{s.phone}</td>;
      case "branch": return <td key={c.k}>{s.branch}</td>;
      case "group": return <td key={c.k}>{s.group || <span className="td-dim">—</span>}</td>;
      case "age": return <td key={c.k}>{ageLabel(age)}</td>;
      case "gender": return <td key={c.k}>{s.gender === "female" ? "Ж" : "М"}</td>;
      case "dur": return <td key={c.k}>{s.dur} мес.</td>;
      case "end": return <td key={c.k}>{s.end || "—"}</td>;
      case "debt": return <td key={c.k} className={"td-debt " + (s.debt ? "" : "no")}>{s.debt ? fmtMoney(s.debt) : "—"}</td>;
      case "ltv": return <td key={c.k}><span className={"ltv " + (ltvG ? "gold" : "")}>{ltv}</span></td>;
      case "source": return <td key={c.k}>{s.source || "—"}</td>;
      case "status": return <td key={c.k}><span className={"pill " + cfg.cls}><span className="dot" />{cfg.label}</span></td>;
      case "actions": return (
        <td key={c.k} onClick={(e) => e.stopPropagation()}>
          <div className="row-acts">
            <button className="ract" title="Позвонить" onClick={() => window.open("tel:" + s.phone.replace(/\s/g, ""))}><IcoPhone /></button>
            <button className="ract" title="WhatsApp" onClick={() => toast(`WhatsApp: ${fullName(s)}`, "ok")}><IcoWa /></button>
            <button className="ract" title="Telegram" onClick={() => toast(`Telegram: ${fullName(s)}`, "ok")}><IcoTg /></button>
            <button className="ract" title="Открыть карточку" onClick={() => openDrawer(s.id)}><IcoEye /></button>
          </div>
        </td>
      );
      default: return <td key={c.k}>—</td>;
    }
  }

  return (
    <div className="proto-students">
      <div className="content">
        {/* ЗАГОЛОВОК РАБОЧЕЙ ОБЛАСТИ */}
        <div className="page-head">
          <div className="page-label">СРМ С коррективами</div>
          <div className="page-title">Ученики (Итоговая версия)</div>
          <div className="page-sub">Вся база учеников: продления, долги, LTV-сегменты, коммуникации и массовые действия. Владелец видит все филиалы.</div>
        </div>

        {/* SECTION HEADER */}
        <div className="section-eyebrow">Ученики</div>
        <div className="section-title-row">
          <div>
            <div className="section-title">Клиентская база студии</div>
            <div className="section-sub">Продления, долги, LTV-сегменты, коммуникации, лист ожидания и массовые действия.</div>
          </div>
          <button className="btn-add" onClick={() => setModal("addStudent")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
            Добавить ученика
          </button>
        </div>

        {/* VIEW TABS */}
        <div className="view-tabs">
          <button className={"view-tab " + (view === "registry" ? "active" : "")} onClick={() => setView("registry")}>Реестр <span className="badge">{badge1}</span></button>
          <button className={"view-tab " + (view === "waitlist" ? "active" : "")} onClick={() => setView("waitlist")}>Лист ожидания <span className="badge">{badge2}</span></button>
        </div>

        {/* REGISTRY VIEW */}
        {view === "registry" && (
          <div>
            {/* KPI */}
            <div className="kpi-label">Основные показатели</div>
            <div className="kpi-grid">
              {kpiItems.map((i) => (
                <div key={i.seg + i.l} className="kpi-card" onClick={() => filterBySeg(i.seg)}>
                  <div className={"kpi-icon " + i.ic}>{i.icon}</div>
                  <div className="kpi-number">{i.n}</div>
                  <div className="kpi-name">{i.l}</div>
                </div>
              ))}
            </div>

            {/* FUNNEL */}
            <div className="kpi-label">Воронка продаж</div>
            <div className="funnel-grid">
              {funnelSteps.map((st, i) => (
                <div key={st.k} className={"funnel-card " + st.cls} onClick={() => filterBySeg(st.k)}>
                  <div className="funnel-num">{st.n}</div>
                  <div className="funnel-icon">{FUNNEL_ICONS[i]}</div>
                  <div className="funnel-value">{na.filter((s) => s.status === st.k).length}</div>
                  <div className="funnel-name">{st.l}</div>
                  <div className="funnel-hint">{st.hint}</div>
                </div>
              ))}
            </div>

            {/* SEGMENTS */}
            <div className="segs">
              {SEG_LIST.map((s) => (
                <button key={s.k} className={"seg " + (activeSeg === s.k ? "active" : "")} onClick={() => filterBySeg(s.k)}>{s.l}</button>
              ))}
            </div>

            {/* FILTER ROW */}
            <div className="filter-row">
              <div className="search-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7E8893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" placeholder="Поиск по имени, телефону…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="fsel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="all">Все статусы</option>
                <option value="no_status">Без статуса</option>
                <option value="trial_scheduled">Записан на пробный</option>
                <option value="trial_missed">Не пришёл на пробный</option>
                <option value="trial_rescheduled">Перезаписан</option>
                <option value="trial_no_buy">Был, не купил</option>
                <option value="bought">Купил абонемент</option>
                <option value="active">Активный ученик</option>
                <option value="renewal_needed">Требует продления</option>
                <option value="debt">Должник</option>
                <option value="next_month">Куплен следующий месяц</option>
                <option value="waitlist">Лист ожидания</option>
                <option value="vacation">Каникулы</option>
                <option value="left">Ушедший</option>
              </select>
              <select className="fsel" value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
                <option value="all">Все филиалы</option>
                <option>Основная база</option>
                <option>Филиал «Жастар»</option>
                <option>Филиал «Достык»</option>
              </select>
              <select className="fsel" value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
                <option value="all">Все группы</option>
                <option>Ансамбль</option><option>Соло</option><option>Хип-хоп</option><option>Малыши</option>
              </select>
              <select className="fsel" value={fLtv} onChange={(e) => setFLtv(e.target.value)}>
                <option value="all">Все LTV</option>
                <option>Новый</option><option>Адаптация</option><option>Постоянный</option>
                <option>Лояльный</option><option>Ядро студии</option><option>Легенда Эхо Гор</option>
              </select>
              <select className="fsel" value={fArch} onChange={(e) => setFArch(e.target.value)}>
                <option value="active">Активные</option>
                <option value="archive">Архив</option>
                <option value="all">Все</option>
              </select>
              <button className="btn-customize" onClick={openColCustomizer}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
                Настроить таблицу
              </button>
            </div>

            {/* TABLE */}
            <div className="table-wrap">
              <div className="tbl-scroll">
                <table>
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={selAllChecked} onChange={(e) => toggleAll(e.target.checked)} /></th>
                      {cols.map((c) => <th key={c.k}>{c.l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id} className={"row " + (selected.has(s.id) ? "sel" : "")} onClick={() => openDrawer(s.id)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(s.id)} onChange={(e) => toggleSel(s.id, e.target.checked)} />
                        </td>
                        {cols.map((c) => renderCell(c, s, i + 1))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && <div className="empty-row">Никого не найдено по текущим фильтрам</div>}
            </div>
          </div>
        )}

        {/* WAITLIST VIEW */}
        {view === "waitlist" && (
          <div>
            <div className="table-wrap">
              <div className="tbl-scroll">
                <table>
                  <thead>
                    <tr><th>#</th><th>Имя и фамилия</th><th>Телефон</th><th>Пол</th><th>Возраст</th><th>Филиал</th><th>Группа</th><th>В очереди с</th><th>Ожидание</th><th>Приоритет</th><th>Комментарий</th><th>Действия</th></tr>
                  </thead>
                  <tbody>
                    {waitlist.map((w, i) => {
                      const age = calcAgeYears(w.dob);
                      const d = daysSince(w.since);
                      const p = priLabel(d);
                      return (
                        <tr key={w.id}>
                          <td className="td-num">{i + 1}</td>
                          <td className="td-name">{w.first} {w.last}</td>
                          <td className="td-phone">{w.phone}</td>
                          <td>{w.gender === "female" ? "Ж" : "М"}</td>
                          <td>{ageLabel(age)}</td>
                          <td>{w.branch}</td>
                          <td>{w.group || "—"}</td>
                          <td>{w.since.split("-").reverse().join(".")}</td>
                          <td>{d} дн.</td>
                          <td><span className={"pri " + p.c}>{p.l}</span></td>
                          <td className="wl-comment">{w.comment || "—"}</td>
                          <td>
                            <div className="row-acts">
                              <button className="ract" onClick={() => toast(`Звоним ${w.first}`, "ok")}><IcoPhone /></button>
                              <button className="ract" onClick={() => toast(`WhatsApp: ${w.first} ${w.last}`, "ok")}><IcoWa /></button>
                              <button className="ract" style={{ color: "var(--green)" }} onClick={() => enrollWl(w.id)}><IcoAddUser /></button>
                              <button className="ract" style={{ color: "var(--red)" }} onClick={() => removeWl(w.id)}><IcoClose /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {waitlist.length === 0 && <div className="empty-row">Лист ожидания пуст</div>}
            </div>
          </div>
        )}
      </div>

      {/* MASS BAR */}
      <div className={"mass-bar " + (selected.size > 0 ? "show" : "")}>
        <span className="mc">Выбрано {selected.size}</span>
        <button onClick={() => setModal("massGroup")}>Группа</button>
        <button onClick={() => setModal("massBranch")}>Филиал</button>
        <button onClick={() => setModal("massStatus")}>Статус</button>
        <button onClick={massWa}>WhatsApp</button>
        <button onClick={massComment}>Комментарий</button>
        <button onClick={massExport}>Excel</button>
        <button className="danger" onClick={massArchive}>В архив</button>
      </div>

      {/* DRAWER */}
      <div className={"drawer-ov " + (drawerStudent ? "open" : "")} onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}>
        <div className="drawer">
          {drawerStudent && (() => {
            const s = drawerStudent;
            const cfg = SC[s.status] || SC.no_status;
            const age = calcAgeYears(s.dob);
            const c1 = conflict(s, "add_waitlist");
            const c2 = conflict(s, "sell_sub");
            const c3 = conflict(s, "sell_group");
            const c4 = conflict(s, "mark");
            return (
              <>
                <div className="drawer-hd">
                  <div className="drawer-hd-top">
                    <div className="drawer-hd-name">{fullName(s)}</div>
                    <button className="drawer-close" onClick={closeDrawer}>✕</button>
                  </div>
                  <div className="drawer-chips">
                    <span className={"pill " + cfg.cls}><span className="dot" />{cfg.label}</span>
                    {s.group ? <span className="dchip">{s.group}</span> : <span className="dchip td-dim">Без группы</span>}
                    <span className="dchip">{s.branch}</span>
                    {age !== null && <span className="dchip">{ageLabel(age)}</span>}
                  </div>
                </div>
                <div className="drawer-body">
                  <div className="drawer-sec">
                    <div className="drawer-acts">
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: "7px 12px" }}>☎ Позвонить</button>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: "7px 12px" }} onClick={() => toast(`WhatsApp: ${fullName(s)}`, "ok")}>WhatsApp</button>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: "7px 12px" }} onClick={() => toast(`Telegram: ${fullName(s)}`, "ok")}>Telegram</button>
                    </div>
                    <div className="dl">
                      <dt>Телефон</dt><dd>{s.phone}</dd>
                      <dt>Пол</dt><dd>{s.gender === "female" ? "Женский" : "Мужской"}</dd>
                      {s.dob && (<><dt>Дата рождения</dt><dd>{s.dob.split("-").reverse().join(".")}{age !== null ? " (" + ageLabel(age) + ")" : ""}</dd></>)}
                      {s.parent && (<><dt>Родитель</dt><dd>{s.parent}</dd></>)}
                      <dt>Источник</dt><dd>{s.source || "—"}</dd>
                      <dt>Стаж</dt><dd>{s.dur} мес. · {ltvSeg(s.dur)}</dd>
                      {s.end && (<><dt>Окончание</dt><dd>{s.end}</dd></>)}
                      {s.debt ? (<><dt>Долг</dt><dd style={{ color: "var(--red)", fontWeight: 700 }}>{fmtMoney(s.debt)}</dd></>) : null}
                    </div>
                  </div>

                  <div className="drawer-sec">
                    <div className="drawer-label">Действия</div>
                    {c2 && <div className="conflict"><WarnIcon />{c2}</div>}
                    {c3 && <div className="conflict warn"><WarnIcon />{c3}</div>}
                    {c4 && <div className="conflict"><WarnIcon />{c4}</div>}
                    <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 8, ...(c2 ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}
                      onClick={() => toast(c2 ? c2 : "Открываем окно продажи…", c2 ? "err" : "ok")}>
                      + Продать абонемент
                    </button>
                    {c1
                      ? <div className="conflict warn" style={{ marginTop: 0 }}><WarnIcon />{c1}</div>
                      : <button className="btn btn-wait" onClick={() => addToWaitlist(s.id)}>+ Добавить в лист ожидания</button>}
                  </div>

                  <div className="drawer-sec">
                    <div className="drawer-label">Изменить статус</div>
                    <select className="status-sel" value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)}>
                      {Object.entries(SC).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>

                  <div className="drawer-sec">
                    <div className="drawer-label">Комментарии</div>
                    <div>
                      {s.comments.length
                        ? s.comments.map((c: any, i: number) => <div key={i} className="dc-item"><div className="dc-meta">{c.date}</div>{c.text}</div>)
                        : <div className="dc-empty">Пока нет комментариев</div>}
                    </div>
                    <div className="dc-inp-row">
                      <input className="dc-inp" placeholder="Добавить комментарий…" value={dcInp} onChange={(e) => setDcInp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} />
                      <button className="btn btn-primary" style={{ padding: "8px 13px", fontSize: 12 }} onClick={addComment}>+</button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ADD STUDENT MODAL */}
      <div className={"modal-ov " + (modal === "addStudent" ? "open" : "")}>
        <div className="modal-box">
          <div className="modal-hd"><h3>Новый ученик</h3><p>Статус «Без статуса» · После сохранения откроется карточка</p></div>
          <div className="modal-body">
            <div className="fgrid">
              <div className="f"><label>Имя <span className="req">*</span></label><input type="text" placeholder="Айгерим" value={nFirst} onChange={(e) => setNFirst(e.target.value)} /></div>
              <div className="f"><label>Фамилия <span className="req">*</span></label><input type="text" placeholder="Болатова" value={nLast} onChange={(e) => setNLast(e.target.value)} /></div>
              <div className="f"><label>Телефон <span className="req">*</span></label><input type="tel" placeholder="+7 707 …" value={nPhone} onChange={(e) => setNPhone(e.target.value)} /></div>
              <div className="f">
                <label>Дата рождения</label>
                <input type="date" value={nDob} onChange={(e) => setNDob(e.target.value)} />
                <div className="age-hint">{nDob && calcAgeYears(nDob) !== null && (calcAgeYears(nDob) as number) >= 0 ? ageLabel(calcAgeYears(nDob)) : ""}</div>
              </div>
              <div className="f fg-full">
                <label>Пол</label>
                <div className="radio-row">
                  <label className={"radio-opt " + (nGender === "female" ? "on" : "")} onClick={() => setNGender("female")}>Женский</label>
                  <label className={"radio-opt " + (nGender === "male" ? "on" : "")} onClick={() => setNGender("male")}>Мужской</label>
                </div>
              </div>
              <div className="f"><label>Филиал <span className="req">*</span></label><select value={nBranch} onChange={(e) => setNBranch(e.target.value)}><option>Основная база</option><option>Филиал «Жастар»</option><option>Филиал «Достык»</option></select></div>
              <div className="f"><label>Группа</label><select value={nGroup} onChange={(e) => setNGroup(e.target.value)}><option value="">— не выбрана —</option><option>Ансамбль</option><option>Соло</option><option>Хип-хоп</option><option>Малыши</option></select></div>
              <div className="f"><label>Источник</label><select value={nSource} onChange={(e) => setNSource(e.target.value)}><option>Instagram</option><option>WhatsApp</option><option>TikTok</option><option>Google</option><option>2GIS</option><option>Рекомендация</option><option>Повторный клиент</option><option>Другое</option></select></div>
              <div className="f"><label>Имя родителя</label><input type="text" placeholder="Жанна" value={nParent} onChange={(e) => setNParent(e.target.value)} /></div>
              <div className="f fg-full"><label>Комментарий</label><textarea rows={2} placeholder="Любые заметки…" value={nComment} onChange={(e) => setNComment(e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Отмена</button>
            <button className="btn btn-primary" onClick={saveNewStudent}>Сохранить и открыть карточку →</button>
          </div>
        </div>
      </div>

      {/* COL CUSTOMIZER */}
      <div className={"modal-ov " + (modal === "colCustomizer" ? "open" : "")}>
        <div className="modal-box" style={{ maxWidth: 420 }}>
          <div className="modal-hd"><h3>Настроить таблицу</h3><p>Включите нужные столбцы</p></div>
          <div className="col-list">
            {ALL_COLS.filter((c) => !c.always).map((c) => (
              <label key={c.k} className={"col-item " + (colDraft.has(c.k) ? "on" : "")} onClick={() => toggleColDraft(c.k)}>
                <input type="checkbox" checked={colDraft.has(c.k)} readOnly />{c.l}
              </label>
            ))}
          </div>
          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Отмена</button>
            <button className="btn btn-primary" onClick={applyColSettings}>Применить</button>
          </div>
        </div>
      </div>

      {/* MASS: ГРУППА */}
      <div className={"modal-ov " + (modal === "massGroup" ? "open" : "")}>
        <div className="modal-box" style={{ maxWidth: 340 }}>
          <div className="modal-hd"><h3>Перевести в группу</h3></div>
          <div className="modal-body"><div className="f"><label>Группа</label><select value={mgG} onChange={(e) => setMgG(e.target.value)}><option>Ансамбль</option><option>Соло</option><option>Хип-хоп</option><option>Малыши</option></select></div></div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setModal(null)}>Отмена</button><button className="btn btn-primary" onClick={doMassGroup}>Перевести</button></div>
        </div>
      </div>

      {/* MASS: ФИЛИАЛ */}
      <div className={"modal-ov " + (modal === "massBranch" ? "open" : "")}>
        <div className="modal-box" style={{ maxWidth: 340 }}>
          <div className="modal-hd"><h3>Сменить филиал</h3></div>
          <div className="modal-body"><div className="f"><label>Филиал</label><select value={mgB} onChange={(e) => setMgB(e.target.value)}><option>Основная база</option><option>Филиал «Жастар»</option><option>Филиал «Достык»</option></select></div></div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setModal(null)}>Отмена</button><button className="btn btn-primary" onClick={doMassBranch}>Сохранить</button></div>
        </div>
      </div>

      {/* MASS: СТАТУС */}
      <div className={"modal-ov " + (modal === "massStatus" ? "open" : "")}>
        <div className="modal-box" style={{ maxWidth: 340 }}>
          <div className="modal-hd"><h3>Изменить статус</h3></div>
          <div className="modal-body"><div className="f"><label>Новый статус</label>
            <select value={mgS} onChange={(e) => setMgS(e.target.value)}>
              <option value="no_status">Без статуса</option>
              <option value="trial_scheduled">Записан на пробный</option>
              <option value="trial_missed">Не пришёл на пробный</option>
              <option value="trial_rescheduled">Перезаписан</option>
              <option value="trial_no_buy">Был, не купил</option>
              <option value="bought">Купил абонемент</option>
              <option value="active">Активный ученик</option>
              <option value="renewal_needed">Требует продления</option>
              <option value="debt">Должник</option>
              <option value="next_month">Куплен следующий месяц</option>
              <option value="vacation">Каникулы</option>
              <option value="left">Ушедший</option>
            </select>
          </div></div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setModal(null)}>Отмена</button><button className="btn btn-primary" onClick={doMassStatus}>Применить</button></div>
        </div>
      </div>

      {/* TOASTS */}
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className={"toast " + t.type + (t.out ? " out" : "")}>{t.msg}</div>)}
      </div>
    </div>
  );
}

export default StudentsProtoView;
