/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * studentSegments — чистые хелперы для раздела «Ученики».
 * Реализуют ТЗ: расчёт продолжительности обучения, LTV-сегментацию,
 * автоматические статусы, цветовые обозначения строк и предикаты
 * быстрых сегментов / фильтров. Никаких сайд-эффектов — только данные.
 */
import { Student, Subscription } from "./types";

/* ============================ Время / даты ============================ */

const MS_DAY = 24 * 60 * 60 * 1000;

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Полных месяцев между двумя датами (>= 0). */
const monthsBetween = (from: Date, to: Date): number => {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
};

/**
 * Продолжительность обучения в месяцах.
 * Берём дату регистрации (createdAt); если её нет — самую раннюю дату
 * начала абонемента; иначе 0.
 */
export const getEnrollmentMonths = (student: Student, now: Date = new Date()): number => {
  const created = parseDate(student.createdAt);
  if (created) return monthsBetween(created, now);
  const subDates = (student.subscriptions || [])
    .map((s) => parseDate(s.validUntil))
    .filter((d): d is Date => Boolean(d));
  if (subDates.length) {
    const earliest = new Date(Math.min(...subDates.map((d) => d.getTime())));
    return monthsBetween(earliest, now);
  }
  return 0;
};

/**
 * Возраст из даты рождения (или готового числа). Корректное русское склонение:
 * «1 год», «8 лет», «13 лет», «22 года», «23 года».
 */
export const ruAgeWord = (age: number): string => {
  const n = Math.abs(age) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return "лет";
  if (n1 === 1) return "год";
  if (n1 >= 2 && n1 <= 4) return "года";
  return "лет";
};

export const ageFromBirthday = (birthday?: string | null): number | null => {
  const d = parseDate(birthday);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return Math.max(0, age);
};

/** «13 лет», «8 лет», «23 года». Берёт birthday, иначе готовое age. */
export const formatAge = (student: Student): string => {
  const age = ageFromBirthday(student.birthday) ?? student.age ?? null;
  if (age == null || age <= 0) return "—";
  return `${age} ${ruAgeWord(age)}`;
};

/** «1 год 8 месяцев», «5 месяцев», «меньше месяца». */
export const formatDuration = (months: number): string => {
  if (months <= 0) return "меньше месяца";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearWord = (n: number) => (n === 1 ? "год" : n >= 2 && n <= 4 ? "года" : "лет");
  const monthWord = (n: number) =>
    n === 1 ? "месяц" : n >= 2 && n <= 4 ? "месяца" : "месяцев";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${yearWord(years)}`);
  if (rest > 0) parts.push(`${rest} ${monthWord(rest)}`);
  return parts.join(" ");
};

/* ============================ LTV-сегментация ============================ */

export type LtvSegment =
  | "Новый"
  | "Адаптация"
  | "Постоянный"
  | "Лояльный"
  | "Ядро студии"
  | "Легенда Эхо Гор";

export const LTV_SEGMENTS: LtvSegment[] = [
  "Новый",
  "Адаптация",
  "Постоянный",
  "Лояльный",
  "Ядро студии",
  "Легенда Эхо Гор",
];

/** ТЗ §5: сегмент по продолжительности обучения (в месяцах). */
export const getLtvSegmentByMonths = (months: number): LtvSegment => {
  if (months < 3) return "Новый";
  if (months < 6) return "Адаптация";
  if (months < 12) return "Постоянный";
  if (months < 36) return "Лояльный"; // 1–3 года
  if (months < 60) return "Ядро студии"; // 3–5 лет
  return "Легенда Эхо Гор"; // > 5 лет
};

export const getLtvSegment = (student: Student, now: Date = new Date()): LtvSegment =>
  getLtvSegmentByMonths(getEnrollmentMonths(student, now));

/** Цвет бейджа LTV (Tailwind). */
export const LTV_BADGE: Record<LtvSegment, string> = {
  "Новый": "bg-sky-100 text-sky-700",
  "Адаптация": "bg-teal-100 text-teal-700",
  "Постоянный": "bg-slate-100 text-slate-600",
  "Лояльный": "bg-violet-100 text-violet-700",
  "Ядро студии": "bg-amber-100 text-amber-700",
  "Легенда Эхо Гор": "bg-gradient-to-r from-amber-200 to-orange-200 text-orange-800",
};

/* ============================ Абонемент / долг ============================ */

/** Активный (или последний) абонемент. */
export const getPrimarySubscription = (student: Student): Subscription | undefined =>
  (student.subscriptions || []).find((s) => s.status === "active") ||
  (student.subscriptions || [])[0];

/** Дата окончания текущего абонемента (Date | null). */
export const getSubscriptionEnd = (student: Student): Date | null =>
  parseDate(getPrimarySubscription(student)?.validUntil);

/** «31.05.2026» / «—». */
export const formatRuDate = (d: Date | null): string =>
  d
    ? d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

/** Сумма долга (положительное число тг), 0 если долга нет. */
export const getDebt = (student: Student): number =>
  student.balance < 0 ? Math.abs(student.balance) : 0;

/** Признак частичной задолженности (0 < долг < стоимость абонемента). */
export const isPartialDebt = (student: Student): boolean => {
  const debt = getDebt(student);
  if (debt <= 0) return false;
  const price = getPrimarySubscription(student)?.price ?? 0;
  return price > 0 ? debt < price : false;
};

/** Куплен ли следующий месяц (есть абонемент, начинающийся/действующий за пределами текущего периода). */
export const hasNextMonthPaid = (student: Student, now: Date = new Date()): boolean => {
  const subs = student.subscriptions || [];
  const active = subs.filter((s) => s.status === "active");
  if (active.length >= 2) return true; // куплено два периода вперёд
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  // абонемент с автопродлением или действующий заметно дольше текущего месяца
  return active.some((s) => {
    const until = parseDate(s.validUntil);
    return Boolean(s.isAutoRenew) || (until ? until > endOfMonth : false);
  });
};

/** Требуют продления (ТЗ, уточнение заказчика) = НЕТ активного абонемента,
 *  покрывающего текущий месяц. Без «скоро закончится»/«мало занятий». */
export const needsRenewal = (student: Student, now: Date = new Date()): boolean => {
  if (isLeft(student) || isPaused(student)) return false;
  const active = (student.subscriptions || []).filter((s) => s.status === "active");
  // Покрыт ли текущий момент действующим абонементом (без даты окончания = бессрочный).
  const covered = active.some((s) => { const u = parseDate(s.validUntil); return !u || u.getTime() >= now.getTime(); });
  return !covered;
};

/** Частично оплачено: ученик занимается И в группе, И индивидуально (в истории есть
 *  оба типа абонемента), но сейчас оплачен/действует только один из них. */
export const isPartiallyPaid = (student: Student, now: Date = new Date()): boolean => {
  if (isLeft(student) || isPaused(student)) return false;
  const subs = student.subscriptions || [];
  const hasHistory = (kind: string) => subs.some((s) => (s.kind || "group") === kind);
  if (!(hasHistory("group") && hasHistory("individual"))) return false; // нет обоих типов — не про частичную оплату
  const activeCovering = (kind: string) => subs.some((s) => s.status === "active" && (s.kind || "group") === kind
    && (() => { const u = parseDate(s.validUntil); return !u || u.getTime() >= now.getTime(); })());
  const g = activeCovering("group"), i = activeCovering("individual");
  return (g && !i) || (!g && i); // один оплачен, другой — нет
};

/* ============================ Флаги статуса (по БД) ============================ */
/* status в БД: lead | trial | active | paused | debt | left | archived
   + опционально вернувшийся (поле returned / manualStatus). */

export const isLeft = (s: Student): boolean =>
  s.status === "left" || s.status === "archived";
export const isPaused = (s: Student): boolean => s.status === "paused";
export const isTrial = (s: Student): boolean =>
  s.status === "trial" || s.status === "lead";
export const isReturned = (s: Student): boolean =>
  (s as any).returned === true ||
  s.status === "returned" ||
  (s.manualStatus || "").toLowerCase().includes("верн");

/* ============================ Воронка пробных уроков ============================ */
/* Корректировка ТЗ «Ученики» (заказчик, 24 июня): статусы воронки продаж
   считаются автоматически по отметкам пробных уроков в журнале посещаемости.
   «Был (+)» → present; «Не был (−)» → absent; результат пробного — trialOutcome
   ('converted' = купил абонемент, 'lost' = был, но не купил). */

export interface TrialInfo {
  /** Сколько раз ученик был записан на пробный урок (число пробных отметок). */
  count: number;
  /** На скольких пробных присутствовал. */
  attended: number;
  /** Сколько пробных пропустил (не пришёл). */
  missed: number;
  /** Купил абонемент после пробного. */
  converted: boolean;
  /** Был на пробном, но абонемент не купил. */
  lost: boolean;
  /** Превышен регламент перезаписи (более 2 пробных). */
  overLimit: boolean;
}

/** Анализ пробных уроков ученика по журналу посещаемости. */
export const getTrialInfo = (student: Student): TrialInfo => {
  const records = Object.values(student.attendance || {}).filter(
    (a): a is NonNullable<typeof a> => Boolean(a) && (Boolean(a.isTrial) || a.status === "trial")
  );
  let attended = 0;
  let missed = 0;
  let converted = false;
  let lost = false;
  for (const a of records) {
    if (a.status === "absent") missed += 1;
    else attended += 1; // present / trial / excused — фактически пришёл
    if (a.trialOutcome === "converted") converted = true;
    if (a.trialOutcome === "lost") lost = true;
  }
  return { count: records.length, attended, missed, converted, lost, overLimit: records.length > 2 };
};

/* ============================ Автоматический статус ============================ */

export type RowTone =
  | "red"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray"
  | "neutral";

export interface StudentState {
  enrollmentMonths: number;
  durationLabel: string;
  ltv: LtvSegment;
  subscriptionEnd: Date | null;
  subscriptionEndLabel: string;
  debt: number;
  statusKey: string;
  statusLabel: string;
  tone: RowTone;
  /** Количество пробных уроков (для отображения «ПУ ×N» в воронке). */
  trialCount: number;
  /** Превышен регламент перезаписи на пробный (более 2 раз). */
  trialOverLimit: boolean;
}

/**
 * ТЗ §2 + §6: вычисляет цвет строки и человекочитаемый статус.
 * Приоритет: ушёл → каникулы/пауза → ручной статус → вернувшийся →
 * долг → требует продления → куплен следующий месяц → новый → активный.
 */
export const getStudentState = (student: Student, now: Date = new Date()): StudentState => {
  const enrollmentMonths = getEnrollmentMonths(student, now);
  const ltv = getLtvSegmentByMonths(enrollmentMonths);
  const subscriptionEnd = getSubscriptionEnd(student);
  const debt = getDebt(student);
  const trial = getTrialInfo(student);
  const hasActiveSub = (student.subscriptions || []).some((s) => s.status === "active");
  // Промис «…оплатит» считается ВЫПОЛНЕННЫМ, когда абонемент уже оплачен (есть
  // активный) — тогда ручной статус не показываем, ученик идёт по авто-логике.
  const promiseFulfilled = /оплат/i.test(student.manualStatus || "") && hasActiveSub;

  let statusKey = "active";
  let statusLabel = "Активный";
  let tone: RowTone = "neutral";

  if (isLeft(student)) {
    statusKey = "left";
    statusLabel = "Ушедший ученик";
    tone = "gray";
  } else if (student.manualStatus && !promiseFulfilled) {
    // Ручной статус (выставлен управляющим) приоритетнее авто-«паузы»:
    // «Каникулы»/«Медпауза» ставят status=paused, но показать надо сам ручной статус.
    statusKey = "manual";
    const promise = parseDate(student.payPromiseDate);
    if (promise && /оплат/i.test(student.manualStatus)) {
      const overdue = promise.getTime() < now.getTime();
      statusLabel = `${student.manualStatus} до ${formatRuDate(promise)}`;
      tone = overdue ? "red" : "yellow";
    } else {
      statusLabel = student.manualStatus;
      tone = isReturned(student) ? "purple" : "neutral";
    }
  } else if (isPaused(student)) {
    statusKey = "paused";
    statusLabel = "Замороженный абонемент";
    tone = "neutral";
  } else if (
    !hasActiveSub &&
    !trial.converted &&
    (student.status === "lead" || student.status === "trial" || isTrial(student) || trial.count > 0)
  ) {
    // ── Воронка пробных уроков (автоматические статусы) ──
    if (trial.attended > 0 && trial.lost) {
      statusKey = "trial_lost";
      statusLabel = "Пришёл на пробный, не купил";
      tone = "yellow";
    } else if (trial.missed > 0) {
      if (trial.count >= 2) {
        statusKey = "trial_rebooked";
        statusLabel = "Перезаписан на пробный урок";
        tone = "yellow";
      } else {
        statusKey = "trial_missed";
        statusLabel = "Не пришёл на пробный урок";
        tone = "red";
      }
    } else if (trial.count >= 2) {
      statusKey = "trial_rebooked";
      statusLabel = "Перезаписан на пробный урок";
      tone = "yellow";
    } else if (trial.count >= 1 || student.status === "trial") {
      statusKey = "trial";
      statusLabel = "Записан на пробный урок";
      tone = "blue";
    } else {
      statusKey = "lead";
      statusLabel = "Новый лид";
      tone = "blue";
    }
  } else if (trial.converted && !hasActiveSub) {
    statusKey = "visitor_new";
    statusLabel = "Новый посетитель";
    tone = "green";
  } else if (isReturned(student)) {
    statusKey = "returned";
    statusLabel = "Вернувшийся ученик";
    tone = "purple";
  } else if (debt > 0) {
    if (isPartialDebt(student)) {
      statusKey = "debt_partial";
      statusLabel = "Частичный долг";
      tone = "yellow";
    } else if (!getPrimarySubscription(student) || getPrimarySubscription(student)?.status === "expired") {
      statusKey = "debt_prev";
      statusLabel = "Не оплачен прошлый месяц";
      tone = "red";
    } else {
      statusKey = "debt_current";
      statusLabel = "Не оплачен текущий месяц";
      tone = "red";
    }
  } else if (isPartiallyPaid(student, now)) {
    // Занимается в группе и индивидуально — оплачен только один тип.
    statusKey = "partially_paid";
    statusLabel = "Частично оплачено";
    tone = "yellow";
  } else if (student.status === "lead") {
    statusKey = "lead";
    statusLabel = "Новый лид";
    tone = "blue";
  } else if (isTrial(student)) {
    statusKey = "trial";
    statusLabel = "Записан на пробный урок";
    tone = "blue";
  } else if (!getPrimarySubscription(student) || getPrimarySubscription(student)?.status === "expired") {
    statusKey = "not_renewed";
    statusLabel = "Не продлил абонемент";
    tone = "red";
  } else if (hasNextMonthPaid(student, now)) {
    statusKey = "next_paid";
    statusLabel = "Куплен следующий месяц";
    tone = "green";
  } else if (enrollmentMonths < 1) {
    statusKey = "new";
    statusLabel = "Новый ученик";
    tone = "blue";
  } else {
    statusKey = "active";
    statusLabel = "Активный";
    tone = "neutral";
  }

  return {
    enrollmentMonths,
    durationLabel: formatDuration(enrollmentMonths),
    ltv,
    subscriptionEnd,
    subscriptionEndLabel: formatRuDate(subscriptionEnd),
    debt,
    statusKey,
    statusLabel,
    tone,
    trialCount: trial.count,
    trialOverLimit: trial.overLimit,
  };
};

/** Цвет фона строки таблицы по тону. */
export const ROW_TONE_CLASS: Record<RowTone, string> = {
  red: "bg-rose-50 hover:bg-rose-100/70",
  yellow: "bg-amber-50 hover:bg-amber-100/70",
  green: "bg-emerald-50 hover:bg-emerald-100/70",
  blue: "bg-sky-50 hover:bg-sky-100/70",
  purple: "bg-violet-50 hover:bg-violet-100/70",
  gray: "bg-slate-100 hover:bg-slate-200/70 text-slate-500",
  neutral: "bg-white hover:bg-slate-50",
};

/** Цвет бейджа статуса по тону. */
export const STATUS_BADGE_CLASS: Record<RowTone, string> = {
  red: "bg-rose-100 text-rose-700",
  yellow: "bg-amber-100 text-amber-700",
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-sky-100 text-sky-700",
  purple: "bg-violet-100 text-violet-700",
  gray: "bg-slate-200 text-slate-500",
  neutral: "bg-slate-100 text-slate-600",
};

/* ============================ Быстрые сегменты ============================ */

export type SegmentId =
  | "all"
  | "active"
  | "renewal"
  | "debtors"
  | "new"
  | "returned"
  | "next_month"
  | "waitlist"
  | "vacation"
  | "left"
  | "partially_paid"
  | "loyal"
  | "core"
  | "legends";

export interface SegmentDef {
  id: SegmentId;
  label: string;
  match: (s: Student, now?: Date) => boolean;
}

const isWaitlist = (s: Student): boolean =>
  (s.manualStatus || "").toLowerCase().includes("лист ожид") || s.status === "lead";
const isVacation = (s: Student): boolean =>
  isPaused(s) || (s.manualStatus || "").toLowerCase().includes("каникул");

/** ТЗ §4: набор быстрых сегментов в верхней панели. */
export const SEGMENTS: SegmentDef[] = [
  { id: "all", label: "Все ученики", match: () => true },
  { id: "active", label: "Активные", match: (s) => !isLeft(s) && s.status === "active" },
  { id: "renewal", label: "Требуют продления", match: (s, now) => !isLeft(s) && needsRenewal(s, now) },
  { id: "debtors", label: "Должники", match: (s) => !isLeft(s) && getDebt(s) > 0 },
  { id: "new", label: "Новые", match: (s, now) => !isLeft(s) && (isTrial(s) || getEnrollmentMonths(s, now) < 1) },
  { id: "returned", label: "Вернувшиеся", match: (s) => !isLeft(s) && isReturned(s) },
  { id: "next_month", label: "Купили следующий", match: (s, now) => !isLeft(s) && hasNextMonthPaid(s, now) },
  { id: "waitlist", label: "Лист ожидания", match: (s) => !isLeft(s) && isWaitlist(s) },
  { id: "vacation", label: "Каникулы", match: (s) => !isLeft(s) && isVacation(s) },
  { id: "left", label: "Ушедшие", match: (s) => isLeft(s) },
  { id: "partially_paid", label: "Частично оплачено", match: (s, now) => !isLeft(s) && isPartiallyPaid(s, now) },
  { id: "loyal", label: "Лояльные", match: (s, now) => !isLeft(s) && getLtvSegment(s, now) === "Лояльный" },
  { id: "core", label: "Ядро студии", match: (s, now) => !isLeft(s) && getLtvSegment(s, now) === "Ядро студии" },
  { id: "legends", label: "Легенды Эхо Гор", match: (s, now) => !isLeft(s) && getLtvSegment(s, now) === "Легенда Эхо Гор" },
];

/* ============================ Фильтр по статусу ============================ */

export const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Все статусы" },
  { value: "active", label: "Активные" },
  { value: "renewal", label: "Требуют продления" },
  { value: "debtors", label: "Должники" },
  { value: "new", label: "Новый ученик" },
  { value: "returned", label: "Вернувшийся" },
  { value: "next_month", label: "Куплен следующий месяц" },
  { value: "partially_paid", label: "Частично оплачено" },
  { value: "vacation", label: "Каникулы" },
  { value: "waitlist", label: "Лист ожидания" },
  { value: "left", label: "Ушедшие" },
];

export const matchStatusFilter = (student: Student, value: string, now: Date = new Date()): boolean => {
  if (value === "all") return true;
  const seg = SEGMENTS.find((x) => x.id === (value as SegmentId));
  if (seg) return seg.match(student, now);
  // Ручной статус: точное совпадение (фильтр по любому ручному статусу).
  return (student.manualStatus || "") === value;
};

/* ============================ Справочные данные UI ============================ */

/** ТЗ §2: легенда цветов. */
export const COLOR_LEGEND: { tone: RowTone; dot: string; text: string }[] = [
  { tone: "red", dot: "bg-rose-500", text: "Красный — не продлил абонемент / долг за прошлый месяц" },
  { tone: "yellow", dot: "bg-amber-400", text: "Жёлтый — частичная задолженность" },
  { tone: "green", dot: "bg-emerald-500", text: "Зелёный — куплен следующий месяц" },
  { tone: "blue", dot: "bg-sky-500", text: "Синий — новый ученик" },
  { tone: "purple", dot: "bg-violet-500", text: "Фиолетовый — вернувшийся ученик" },
  { tone: "gray", dot: "bg-slate-400", text: "Серый — ушедший ученик" },
];

/** ТЗ §7: ручные статусы по умолчанию. */
export const DEFAULT_MANUAL_STATUSES: string[] = [
  "Был на пробном, оплатит",
  "Каникулы",
  "Лист ожидания",
  "Медицинская пауза",
  "Временно отсутствует",
  "Индивидуальный график",
];

/** ТЗ §6: автоматические статусы (для справочной панели). */
export const AUTO_STATUS_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Воронка продаж",
    items: [
      "Новый лид",
      "Записан на пробный урок",
      "Не пришёл на пробный урок",
      "Перезаписан на пробный урок",
      "Пришёл на пробный, не купил",
      "Новый посетитель",
    ],
  },
  {
    title: "Постоянные ученики",
    items: [
      "Есть активный абонемент",
      "Не оплачен текущий месяц",
      "Не оплачен прошлый месяц",
      "Новый оплативший",
      "Вернувшийся ученик",
      "Куплен следующий месяц",
      "Замороженный абонемент",
      "Ушедший ученик",
    ],
  },
];

/* ============================ Лист ожидания ============================ */
/* ТЗ «Лист ожидания»: приоритет определяется по дате постановки в очередь.
   Чем дольше человек ждёт, тем выше приоритет.
   Высокий — ожидание > 30 дней; Средний — 7–30 дней; Низкий — < 7 дней. */

export type WaitPriority = "high" | "medium" | "low";

export const getWaitDays = (addedAt: string, now: Date = new Date()): number => {
  const d = parseDate(addedAt);
  if (!d) return 0;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / MS_DAY));
};

export const getWaitPriority = (addedAt: string, now: Date = new Date()): WaitPriority => {
  const days = getWaitDays(addedAt, now);
  if (days > 30) return "high";
  if (days >= 7) return "medium";
  return "low";
};

export const WAIT_PRIORITY_META: Record<WaitPriority, { label: string; badge: string; dot: string }> = {
  high: { label: "Высокий", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  medium: { label: "Средний", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  low: { label: "Низкий", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

/** «3 дня», «1 день», «больше месяца» — человекочитаемое время ожидания. */
export const formatWaitDuration = (addedAt: string, now: Date = new Date()): string => {
  const days = getWaitDays(addedAt, now);
  if (days === 0) return "сегодня";
  const n1 = days % 10;
  const n = days % 100;
  const word = n > 10 && n < 20 ? "дней" : n1 === 1 ? "день" : n1 >= 2 && n1 <= 4 ? "дня" : "дней";
  return `${days} ${word}`;
};
