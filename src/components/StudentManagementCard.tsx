/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentManagementCard — единая «светлая» карточка управления учеником.
 * Открывается по тапу на ученика во всех кабинетах (Администратор,
 * Руководитель филиала, Владелец, Преподаватель). Дизайн — светлая CRM-карточка:
 * шапка с аватаром и статусом, ряд действий, вкладки, блок «Текущий абонемент».
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  GraduationCap,
  Plus,
  MessageCircle,
  ArrowLeftRight,
  Pencil,
  Phone,
  Clock,
  X,
  Trash2,
  Archive,
  CreditCard,
  CheckCircle2,
  Wallet,
  ChevronRight,
  TrendingUp,
  Award,
  Megaphone,
  QrCode,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";
import QRCode from "qrcode";
import { Branch, Group, LeadSource, Student, Subscription, SubscriptionPlan, Teacher } from "../types";
import { getEnrollmentMonths, formatDuration, getLtvSegment, getTrialInfo, LTV_BADGE } from "../studentSegments";
import { requestDataRefresh } from "../dataRefresh";
import { toast } from "../toast";
import { parseGroupDays } from "./GroupScheduleGrid";

/** Полезная нагрузка продажи абонемента из инлайн-формы карточки. */
export interface SellSubscriptionInput {
  studentId: string;
  branchId: string;
  groupId?: string;
  planId: string;
  startsOn: string;
  endsOn: string;
  soldOn?: string;      // дата продажи (день оформления)
  amountPaid?: number;  // внесено (тг); меньше price → долг
  lessonsTotal: number;
  price: number;
  discountAmount: number;
  recalc: number;
  method: "cash" | "card" | "transfer" | "kaspi" | "other";
  description?: string;
  paid: boolean;
  kind?: "group" | "individual";
}

export interface StudentManagementCardProps {
  student: Student;
  group?: Group;
  branch?: Branch;
  teacher?: Teacher;
  /** Подзаголовок-крошки слева сверху, по умолчанию «Все ученики / {группа}» */
  breadcrumbRoot?: string;
  /** Полные списки для формы перевода ученика */
  allGroups?: Group[];
  allBranches?: Branch[];
  allTeachers?: Teacher[];
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Отметить уход / отправить ученика в архив (модалка причины у родителя). */
  onArchive?: () => void;
  /** Сменить статус ученика вручную (значение из statusOptions). */
  onSetStatus?: (value: string) => void | Promise<boolean | void> | boolean;
  /** Опции для выпадающего списка смены статуса. */
  statusOptions?: { value: string; label: string }[];
  onOpenPayment?: () => void;
  /** Доступные планы абонементов организации (для формы продажи) */
  plans?: SubscriptionPlan[];
  /** Справочник рекламных источников (для отображения «Откуда узнал»). */
  leadSources?: LeadSource[];
  /** Продать абонемент: создаёт student_subscription. Если задан — открывает инлайн-форму. */
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  /** Пакетная продажа периода (разбивка по календарным месяцам). */
  onSellSubscriptionBatch?: (items: SellSubscriptionInput[]) => Promise<boolean> | boolean;
  /** Запись на пробный урок (UI-форма; вызывается при сохранении) */
  onTrial?: (payload: { date: string; time: string; note: string }) => Promise<boolean> | boolean | void;
  /** Удалить запись на пробный урок по дате. */
  onDeleteTrial?: (date: string) => Promise<boolean> | boolean | void;
  /** Панель, раскрытая при открытии карточки (например "trial" из листа ожидания). */
  initialPanel?: "trial" | "transfer" | "sell" | "access";
  /** Перевод ученика в другую группу/филиал/к другому педагогу */
  onTransfer?: (payload: { groupId?: string; branchId?: string; teacherId?: string }) => Promise<boolean> | boolean | void;
  /** Добавить ученика в лист ожидания (ТЗ «Лист ожидания»). */
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean> | boolean;
  /** true — ученик уже состоит в активном листе ожидания (кнопка становится неактивной). */
  inWaitlist?: boolean;
  /** Показывать блок «Вход ученика» (QR/ссылка). Только для владельца/руководителя/админа. */
  canGrantAccess?: boolean;
  /** Значение заголовка x-demo-role для API доступа (owner | branch_manager | admin). */
  roleHeader?: string;
}

type TabId =
  | "general"
  | "subscriptions"
  | "attendance"
  | "finance"
  | "recalcs"
  | "comments"
  | "communications"
  | "family"
  | "history";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "Общая" },
  { id: "subscriptions", label: "Абонементы" },
  { id: "attendance", label: "Посещения" },
  { id: "finance", label: "Финансы" },
  { id: "recalcs", label: "Справки" },
  { id: "history", label: "История" },
  { id: "comments", label: "Комментарии" },
  { id: "communications", label: "Коммуникации" },
  { id: "family", label: "Семья" },
];

const money = (value: number) =>
  `${Math.round(value).toLocaleString("ru-RU").replace(/,/g, " ")} тг`;

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const phoneDigits = (phone?: string) => (phone || "").replace(/[^\d+]/g, "");
const waHref = (phone?: string) =>
  `https://wa.me/${phoneDigits(phone).replace(/^\+/, "")}`;
const telHref = (phone?: string) => `tel:${phoneDigits(phone)}`;

export default function StudentManagementCard({
  student,
  group,
  branch,
  teacher,
  breadcrumbRoot = "Все ученики",
  allGroups = [],
  allBranches = [],
  allTeachers = [],
  onClose,
  onEdit,
  onDelete,
  onArchive,
  onSetStatus,
  statusOptions = [],
  onOpenPayment,
  plans = [],
  leadSources = [],
  onSellSubscription,
  onSellSubscriptionBatch,
  onTrial,
  onDeleteTrial,
  initialPanel,
  onTransfer,
  onAddToWaitlist,
  inWaitlist = false,
  canGrantAccess = false,
  roleHeader = "owner",
}: StudentManagementCardProps) {
  const [tab, setTab] = useState<TabId>("general");
  const [panel, setPanel] = useState<null | "trial" | "transfer" | "sell" | "access">(initialPanel || null);
  // «Пригласить на пробный» из листа ожидания: карточка открывается с нужной панелью.
  useEffect(() => { if (initialPanel) setPanel(initialPanel); }, [student.id, initialPanel]);
  const [openSub, setOpenSub] = useState<Subscription | null>(null);
  // Локальный оверлей удалённых абонементов (§3): помечаем «Удалён» сразу после запроса.
  const [subDeletes, setSubDeletes] = useState<Record<string, Partial<Subscription>>>({});
  const mergeDel = (s: Subscription): Subscription => (subDeletes[s.id] ? { ...s, ...subDeletes[s.id] } : s);
  const deleteSub = async (subId: string, reason: string, comment: string) => {
    const res = await fetch(`/api/mvp/student-subscriptions/${subId}`, { method: "DELETE", headers: accessHeaders(), body: JSON.stringify({ reason, comment }) });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as any).error || "Не удалось удалить абонемент");
    setSubDeletes((m) => ({ ...m, [subId]: { status: "deleted", cancelReason: reason, cancelComment: comment || null, deletedAt: new Date().toISOString(), deletedBy: "вы" } }));
    // Перезагрузить глобальный список — иначе после закрытия карточки удалённый
    // абонемент «воскресает» активным и статус ученика не пересчитывается.
    requestDataRefresh();
  };
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [waitlisted, setWaitlisted] = useState(inWaitlist);
  // Сброс состояния кнопки при переключении на другого ученика в той же панели.
  useEffect(() => { setWaitlisted(inWaitlist); }, [student.id, inWaitlist]);

  const addToWaitlist = async () => {
    if (!onAddToWaitlist || waitlisted) return;
    // ТЗ: лист ожидания только для новых лидов — быстрые проверки до запроса
    // (сервер валидирует то же самое и остаётся источником правды).
    if ((student.subscriptions || []).length > 0) {
      setDone("У ученика уже есть (или был) абонемент — лист ожидания только для новых лидов");
      return;
    }
    if (getTrialInfo(student).upcoming) {
      setDone("Ученик записан на пробный урок — сначала закройте или удалите запись");
      return;
    }
    setBusy(true);
    try {
      const ok = await onAddToWaitlist({
        studentId: student.id,
        branchId: student.branchId || null,
        groupId: student.groupIds?.[0] || null,
        comment: null,
      });
      if (ok !== false) {
        setWaitlisted(true);
        setDone("Ученик добавлен в лист ожидания");
      }
    } finally {
      setBusy(false);
    }
  };

  const [trialForm, setTrialForm] = useState({ date: "", time: "", note: "" });
  const [manualTrial, setManualTrial] = useState(false);
  // Выбор месяца записи (ТЗ): 0 = текущий, 1 = следующий, 2 = через один.
  const [trialMonthOffset, setTrialMonthOffset] = useState(0);

  // Доступные слоты пробного урока из расписания группы — все занятия ВЫБРАННОГО
  // месяца (в текущем — начиная с сегодня). Время подставляется из графика группы.
  const trialSlots = useMemo(() => {
    // Устойчиво к «Пн,Ср» и «Понедельник среда»: сводим к коротким кодам, затем к номерам.
    const dayNums = parseGroupDays((group?.days || []).join(" "))
      .map((d) => SHORT_WD_TO_NUM[d])
      .filter((n) => n !== undefined);
    if (!dayNums.length) return [] as { iso: string; label: string; time: string }[];
    const out: { iso: string; label: string; time: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth() + trialMonthOffset, 1);
    const cursor = trialMonthOffset === 0 ? new Date(today) : monthStart;
    const limit = new Date(today.getFullYear(), today.getMonth() + trialMonthOffset + 1, 1);
    while (cursor < limit) {
      if (dayNums.includes(cursor.getDay())) {
        out.push({
          iso: isoOf(cursor),
          label: `${FULL_WEEKDAY[cursor.getDay()]}, ${ddmm(cursor)}`,
          time: group?.time || "",
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [group, trialMonthOffset]);

  // Подписи месяцев для переключателя записи на пробный.
  const trialMonthLabel = (offset: number) => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + offset, 1)
      .toLocaleDateString("ru-RU", { month: "long" });
  };
  const [transferForm, setTransferForm] = useState({
    groupId: student.groupIds?.[0] || "",
    branchId: student.branchId || "",
    teacherId: student.teacherId || "",
  });

  // Если задан onSellSubscription — кнопка открывает инлайн-форму, иначе старая модалка оплаты.
  const canSell = Boolean(onSellSubscription);
  const handleSellClick = () => {
    if (onSellSubscription) togglePanel("sell");
    else if (onOpenPayment) onOpenPayment();
  };

  const togglePanel = (next: "trial" | "transfer" | "sell" | "access") => {
    setDone(null);
    setPanel((prev) => (prev === next ? null : next));
  };

  // ——— Вход ученика по ссылке/QR (владелец/руководитель/админ) ———
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessErr, setAccessErr] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<null | { enabled: boolean; level: "junior" | "senior"; levelManual: "junior" | "senior" | null; autoLevel: "junior" | "senior"; token: string | null; code: string | null }>(null);
  const [accessCodeCopied, setAccessCodeCopied] = useState(false);
  const [accessLevelPick, setAccessLevelPick] = useState<"auto" | "junior" | "senior">("auto");
  const [accessQr, setAccessQr] = useState<string>("");
  const [accessCopied, setAccessCopied] = useState(false);

  const accessUrl = accessStatus?.token ? `${window.location.origin}/?student=${accessStatus.token}` : "";
  const accessHeaders = () => ({ "Content-Type": "application/json", "x-demo-role": roleHeader });

  // Удаление пробного урока: если родитель не передал обработчик (карточка
  // открыта из воркспейса владельца/админа/педагога, а не из реестра) —
  // карточка САМА вызывает API и обновляет данные. Кнопка доступна везде.
  const deleteTrialFallback = async (date: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/mvp/students/${student.id}/trial`, {
        method: "DELETE", headers: accessHeaders(), body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Не удалось удалить пробный урок");
        return false;
      }
      toast.success("Пробный урок удалён");
      requestDataRefresh();
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Не удалось удалить пробный урок");
      return false;
    }
  };
  const deleteTrial = onDeleteTrial || deleteTrialFallback;

  // Подтянуть текущее состояние доступа при открытии панели / смене ученика.
  useEffect(() => {
    if (panel !== "access" || !canGrantAccess) return;
    let alive = true;
    setAccessErr(null); setAccessQr(""); setAccessCopied(false);
    (async () => {
      try {
        const r = await fetch(`/api/mvp/students/${student.id}/access`, { headers: { "x-demo-role": roleHeader } });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось загрузить статус");
        const d = await r.json();
        if (!alive) return;
        setAccessStatus(d);
        setAccessLevelPick(d.levelManual ?? "auto");
      } catch (e: any) {
        if (alive) setAccessErr(e?.message || "Ошибка загрузки");
      }
    })();
    return () => { alive = false; };
  }, [panel, student.id, canGrantAccess, roleHeader]);

  // Сгенерировать QR по текущей ссылке.
  useEffect(() => {
    if (!accessUrl) { setAccessQr(""); return; }
    let alive = true;
    QRCode.toDataURL(accessUrl, { width: 220, margin: 1 })
      .then((url) => { if (alive) setAccessQr(url); })
      .catch(() => { if (alive) setAccessQr(""); });
    return () => { alive = false; };
  }, [accessUrl]);

  const grantAccess = async () => {
    setAccessBusy(true); setAccessErr(null); setAccessCopied(false);
    try {
      const r = await fetch(`/api/mvp/students/${student.id}/access`, {
        method: "POST", headers: accessHeaders(), body: JSON.stringify({ level: accessLevelPick }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось выдать доступ");
      const d = await r.json();
      setAccessStatus(d);
      setAccessLevelPick(d.levelManual ?? "auto");
      setDone(d.enabled ? "Доступ выдан — ссылка и QR готовы" : "Готово");
    } catch (e: any) {
      setAccessErr(e?.message || "Ошибка");
    } finally {
      setAccessBusy(false);
    }
  };

  const revokeAccess = async () => {
    setAccessBusy(true); setAccessErr(null);
    try {
      const r = await fetch(`/api/mvp/students/${student.id}/access`, { method: "DELETE", headers: accessHeaders() });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Не удалось отозвать");
      setAccessStatus((s) => (s ? { ...s, enabled: false, token: null } : s));
      setAccessQr("");
      setDone("Доступ отозван");
    } catch (e: any) {
      setAccessErr(e?.message || "Ошибка");
    } finally {
      setAccessBusy(false);
    }
  };

  const copyAccessUrl = async () => {
    if (!accessUrl) return;
    try { await navigator.clipboard.writeText(accessUrl); setAccessCopied(true); setTimeout(() => setAccessCopied(false), 1800); } catch { /* clipboard недоступен */ }
  };
  const copyAccessCode = async () => {
    if (!accessStatus?.code) return;
    try { await navigator.clipboard.writeText(accessStatus.code); setAccessCodeCopied(true); setTimeout(() => setAccessCodeCopied(false), 1800); } catch { /* clipboard недоступен */ }
  };

  const submitTrial = async () => {
    setBusy(true);
    try {
      if (onTrial) await onTrial(trialForm);
      setDone(`Пробный урок записан${trialForm.date ? `: ${trialForm.date}${trialForm.time ? `, ${trialForm.time}` : ""}` : ""}`);
      setPanel(null);
    } finally {
      setBusy(false);
    }
  };

  const submitTransfer = async () => {
    if (!onTransfer) return;
    setBusy(true);
    try {
      // Педагог закреплён за группой: подтягиваем его автоматически по выбранной группе.
      const targetGroup = allGroups.find((g) => g.id === transferForm.groupId);
      const ok = await onTransfer({
        groupId: transferForm.groupId,
        branchId: transferForm.branchId,
        teacherId: targetGroup?.teacherId || "",
      });
      if (ok !== false) {
        const groupName = targetGroup?.name;
        setDone(`Ученик переведён${groupName ? ` в «${groupName}»` : ""}`);
        setPanel(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const subscription =
    student.subscriptions?.find((item) => item.status === "active") ||
    student.subscriptions?.[0];
  const debt = student.balance < 0;
  // Частичный долг (внесено меньше цены) НЕ красит статус в «Долг» —
  // показывается отдельной янтарной подсветкой рядом (ТЗ заказчика).
  const partialDebt = debt && subscription && Math.abs(student.balance) < (subscription.price || 0)
    ? Math.abs(student.balance)
    : 0;
  const statusActive = !debt || partialDebt > 0;

  const attendanceRecords = Object.values(student.attendance || {});
  const presentCount = attendanceRecords.filter(
    (record) => record.status === "present"
  ).length;
  const attendancePercent = attendanceRecords.length
    ? Math.round((presentCount / attendanceRecords.length) * 100)
    : 0;

  const groupLabel = group?.name || group?.level || "Без группы";
  const branchLabel = branch?.name || branch?.city || "Основная база";
  const teacherLabel = teacher?.name || "Не назначен";

  // ── Аналитика ученика для карточки: LTV-статус, срок, выручка, средний LTV, источник ──
  const insights = useMemo(() => {
    const months = getEnrollmentMonths(student);
    const ltv = getLtvSegment(student);
    const totalRevenue = (student.subscriptions || []).reduce(
      (sum, s) => sum + (Number(s.price) || 0),
      0
    );
    const avgPerMonth = months > 0 ? Math.round(totalRevenue / months) : totalRevenue;
    const sourceName =
      leadSources.find((s) => s.id === student.sourceId)?.name ||
      (student.sourceId ? "—" : "Не указан");
    return {
      months,
      ltv,
      durationLabel: months > 0 ? formatDuration(months) : "меньше месяца",
      totalRevenue,
      avgPerMonth,
      sourceName,
    };
  }, [student, leadSources]);

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-xl">
      {/* Верхняя строка: бренд + крошки + закрыть */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
            CRM · Карточка ученика
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {breadcrumbRoot} / {groupLabel}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Шапка ученика (без аватара — ТЗ: карточка компактная и информативная) */}
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                {student.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  statusActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    statusActive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {statusActive ? "Активный" : "Долг"}
              </span>
              {partialDebt > 0 && (
                <span
                  title="Внесено меньше стоимости абонемента"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"
                >
                  частичный долг {money(partialDebt)}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                {student.age} лет
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                {branchLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                {groupLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-slate-400" />
                Педагог: {teacherLabel.split(" ")[0]}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${LTV_BADGE[insights.ltv]}`}
              >
                <Award className="h-3.5 w-3.5" />
                {insights.ltv}
              </span>
            </div>
          </div>
        </div>

        {/* Аналитика ученика: продолжительность, выручка, средний LTV, источник */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InsightCard
            icon={Clock}
            tone="violet"
            label="Стаж занятий"
            value={insights.durationLabel}
            hint="продолжительность в студии"
          />
          <InsightCard
            icon={Wallet}
            tone="emerald"
            label="Выручка за всё время"
            value={money(insights.totalRevenue)}
            hint="сумма всех абонементов"
          />
          <InsightCard
            icon={TrendingUp}
            tone="amber"
            label="Средний LTV / мес"
            value={money(insights.avgPerMonth)}
            hint={`за ${insights.durationLabel}`}
          />
          <InsightCard
            icon={Megaphone}
            tone="sky"
            label="Рекламный источник"
            value={insights.sourceName}
            hint="откуда узнал о студии"
          />
        </div>

        {/* Кнопки действий */}
        <div className="mt-5 flex flex-wrap gap-2">
          {(canSell || onOpenPayment) && (
            <button
              onClick={handleSellClick}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition ${
                panel === "sell"
                  ? "bg-rose-600"
                  : "bg-rose-500 hover:bg-rose-600"
              }`}
            >
              <Plus className="h-4 w-4" /> Продать абонемент
            </button>
          )}
          <button
            onClick={() => togglePanel("trial")}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              panel === "trial"
                ? "border-rose-300 bg-rose-50 text-rose-600"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Calendar className="h-4 w-4 text-slate-400" /> Пробный урок
          </button>
          <a
            href={waHref(student.parentPhone)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-600 transition hover:bg-emerald-100"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          {onAddToWaitlist && (
            <button
              onClick={addToWaitlist}
              disabled={busy || waitlisted}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                waitlisted
                  ? "border-violet-200 bg-violet-50 text-violet-600"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Clock className="h-4 w-4 text-violet-500" /> {waitlisted ? "В листе ожидания" : "Добавить в лист ожидания"}
            </button>
          )}
          {onTransfer && (
            <button
              onClick={() => togglePanel("transfer")}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                panel === "transfer"
                  ? "border-rose-300 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ArrowLeftRight className="h-4 w-4 text-slate-400" /> Перевести
            </button>
          )}
          {canGrantAccess && (
            <button
              onClick={() => togglePanel("access")}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                panel === "access"
                  ? "border-[#C5A059] bg-[#C5A059]/10 text-[#8a6d2f]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <QrCode className="h-4 w-4 text-[#C5A059]" /> Вход ученика
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4 text-slate-400" /> Редактировать
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-500 transition hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" /> В корзину
            </button>
          )}
          {onArchive && (
            <button
              onClick={onArchive}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-600 transition hover:bg-amber-50"
            >
              <Archive className="h-4 w-4" /> В архив
            </button>
          )}
          {onSetStatus && statusOptions.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v) onSetStatus(v); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <option value="" disabled>Изменить статус…</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Подтверждение действия */}
        {done && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {done}
          </div>
        )}

        {/* Форма: пробный урок */}
        {panel === "trial" && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Запись на пробный урок</p>
              <button
                onClick={() => { setManualTrial((v) => !v); setTrialForm((f) => ({ ...f, date: "", time: "" })); }}
                className="text-xs font-bold text-rose-500 transition hover:text-rose-600"
              >
                {manualTrial ? "← Из расписания группы" : "Указать дату вручную"}
              </button>
            </div>

            {/* Доступное расписание группы — админ выбирает слот, время подставляется автоматически */}
            {!manualTrial ? (
              <>
                {/* Выбор месяца (ТЗ): запись доступна на текущий и два следующих месяца */}
                <div className="mb-2 inline-flex rounded-xl border border-slate-200 bg-white p-1">
                  {[0, 1, 2].map((off) => (
                    <button
                      key={off}
                      type="button"
                      onClick={() => { setTrialMonthOffset(off); setTrialForm((f) => ({ ...f, date: "", time: "" })); }}
                      className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition ${
                        trialMonthOffset === off ? "bg-rose-50 text-rose-600" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {trialMonthLabel(off)}
                    </button>
                  ))}
                </div>
                <p className="mb-2 text-xs font-semibold text-slate-500">
                  Доступные занятия{group?.name ? ` · ${group.name}` : ""}
                  {group?.time ? ` · ${group.time}` : ""}
                </p>
                {trialSlots.length === 0 && (
                  <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    В этом месяце занятий по расписанию группы не осталось — выберите другой месяц или укажите дату вручную.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {trialSlots.map((slot) => {
                    const on = trialForm.date === slot.iso;
                    return (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => setTrialForm((f) => ({ ...f, date: slot.iso, time: slot.time }))}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                          on
                            ? "border-rose-300 bg-rose-50 text-rose-600"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {on && <CheckCircle2 className="h-3.5 w-3.5" />}
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {slot.label}{slot.time ? ` · ${slot.time}` : ""}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-3 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500">Заметка</span>
                  <input
                    type="text"
                    value={trialForm.note}
                    onChange={(e) => setTrialForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Комментарий"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400"
                  />
                </label>
              </>
            ) : (
              <>
                {trialSlots.length === 0 && (
                  <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    У группы не задано расписание — укажите дату и время вручную или настройте график группы в разделе «Филиалы и группы».
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Дата</span>
                    <input
                      type="date"
                      value={trialForm.date}
                      onChange={(e) => setTrialForm((f) => ({ ...f, date: e.target.value }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Время</span>
                    <input
                      type="time"
                      value={trialForm.time}
                      onChange={(e) => setTrialForm((f) => ({ ...f, time: e.target.value }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500">Заметка</span>
                    <input
                      type="text"
                      value={trialForm.note}
                      onChange={(e) => setTrialForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="Комментарий"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400"
                    />
                  </label>
                </div>
              </>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={submitTrial}
                disabled={busy || !trialForm.date}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-40"
              >
                {busy ? "Сохранение…" : "Записать на пробный"}
              </button>
              <button
                onClick={() => setPanel(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Форма: перевод ученика */}
        {panel === "transfer" && onTransfer && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-bold text-slate-700">Перевод ученика</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Группа</span>
                <select
                  value={transferForm.groupId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, groupId: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="">Без группы</option>
                  {allGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              {allBranches.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500">Филиал</span>
                  <select
                    value={transferForm.branchId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, branchId: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    {allBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {/* Педагог не выбирается вручную: за каждой группой закреплён один педагог,
                  он подтягивается автоматически по выбранной группе. */}
              {transferForm.groupId && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500">Педагог</span>
                  <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                    <GraduationCap className="h-4 w-4 text-slate-400" />
                    {allTeachers.find((t) => t.id === allGroups.find((g) => g.id === transferForm.groupId)?.teacherId)?.name || "Закреплён за группой"}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={submitTransfer}
                disabled={busy}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-40"
              >
                {busy ? "Перевод…" : "Перевести"}
              </button>
              <button
                onClick={() => setPanel(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Панель: вход ученика по ссылке/QR (владелец/руководитель/админ) */}
        {panel === "access" && canGrantAccess && (
          <div className="mt-3 rounded-2xl border border-[#C5A059]/40 bg-[#FBF7EE] p-4">
            <div className="mb-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#C5A059]" />
              <p className="text-sm font-bold text-slate-800">Вход ученика по телефону</p>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Ученик заходит на экране входа по своему номеру телефона и стандартному паролю. Отдельный код/QR не нужен.
            </p>

            {/* Данные для входа: телефон + стандартный пароль */}
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Номер телефона (логин)</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="select-all font-mono text-base font-black text-slate-800">{student.phone || student.parentPhone || "—"}</span>
                  {(student.phone || student.parentPhone) && (
                    <button
                      onClick={async () => { try { await navigator.clipboard.writeText(student.phone || student.parentPhone || ""); setAccessCopied(true); setTimeout(() => setAccessCopied(false), 1800); } catch { /* clipboard недоступен */ } }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      {accessCopied ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Скоп.</> : <><Copy className="h-3.5 w-3.5 text-slate-400" /> Тел.</>}
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Пароль (у всех одинаковый)</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="select-all font-mono text-base font-black tracking-[0.25em] text-slate-800">12345</span>
                  <button
                    onClick={async () => { try { await navigator.clipboard.writeText("12345"); setAccessCodeCopied(true); setTimeout(() => setAccessCodeCopied(false), 1800); } catch { /* clipboard недоступен */ } }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    {accessCodeCopied ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Скоп.</> : <><Copy className="h-3.5 w-3.5 text-slate-400" /> Пароль</>}
                  </button>
                </div>
              </div>
            </div>

            <p className="mb-2 text-xs text-slate-500">
              Уровень кабинета: «Маленькая» группа видит только Главную, Наклейки и Достижения; «Взрослая» — все разделы.
              По умолчанию — по возрасту{typeof student.age === "number" ? ` (сейчас ${student.age} лет → «${accessStatus?.autoLevel === "junior" ? "маленькая" : "взрослая"}»)` : ""}.
            </p>

            {/* Выбор уровня прав */}
            <div className="mb-3 grid grid-cols-3 gap-2">
              {([
                { key: "auto", label: "По возрасту" },
                { key: "junior", label: "Маленькая" },
                { key: "senior", label: "Взрослая" },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setAccessLevelPick(opt.key)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    accessLevelPick === opt.key
                      ? "border-[#C5A059] bg-[#C5A059] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {accessErr && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{accessErr}</div>
            )}

            <button
              onClick={grantAccess}
              disabled={accessBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C5A059] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#b3914c] disabled:opacity-40"
            >
              <KeyRound className="h-4 w-4" /> {accessBusy ? "Сохраняем…" : "Сохранить уровень доступа"}
            </button>
          </div>
        )}

        {/* Форма: продать абонемент */}
        {panel === "sell" && onSellSubscription && (
          <SellSubscriptionPanel
            student={student}
            group={group}
            branch={branch}
            plans={plans}
            onClose={() => setPanel(null)}
            onSubmit={onSellSubscription}
            onSubmitBatch={onSellSubscriptionBatch}
          />
        )}

        {/* Вкладки */}
        <div className="mt-5 flex gap-5 overflow-x-auto border-b border-slate-100">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative whitespace-nowrap pb-3 text-sm font-bold transition ${
                tab === item.id
                  ? "text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {item.label}
              {tab === item.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-rose-500" />
              )}
            </button>
          ))}
        </div>

        {/* Контент вкладок */}
        <div className="mt-5">
          {tab === "general" && (
            <GeneralTab
              student={student}
              branch={branch}
              subscription={subscription}
              onOpenSub={setOpenSub}
              onDeleteTrial={deleteTrial}
            />
          )}
          {tab === "subscriptions" && (
            <SubscriptionsTab
              student={student}
              subs={(student.subscriptions || []).map(mergeDel)}
              onSell={(canSell || onOpenPayment) ? handleSellClick : undefined}
              onOpenSub={setOpenSub}
              onDeleteTrial={deleteTrial}
            />
          )}
          {tab === "attendance" && (
            <AttendanceTab
              student={student}
              percent={attendancePercent}
              present={presentCount}
              total={attendanceRecords.length}
            />
          )}
          {tab === "finance" && (
            <FinanceTab student={student} onOpenPayment={onOpenPayment} />
          )}
          {tab === "comments" && <CommentsTab student={student} />}
          {tab === "communications" && (
            <CommunicationsTab student={student} />
          )}
          {tab === "recalcs" && <RecalcsTab studentId={student.id} roleHeader={roleHeader} />}
          {tab === "history" && <HistoryTab studentId={student.id} roleHeader={roleHeader} />}
          {tab === "family" && <FamilyTab student={student} />}
        </div>
      </div>

      {openSub && (
        <SubscriptionDetailModal
          subscription={mergeDel(openSub)}
          student={student}
          branch={branch}
          group={group}
          canDelete={["owner", "branch_manager", "admin"].includes(roleHeader)}
          onDelete={deleteSub}
          onClose={() => setOpenSub(null)}
        />
      )}
    </div>
  );
}

function InsightCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  tone: "violet" | "emerald" | "amber" | "sky";
  label: string;
  value: string;
  hint?: string;
}) {
  const toneCls: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg ${toneCls[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="truncate text-sm font-black text-slate-800" title={value}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/* ---------- Вкладки ---------- */

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-bold text-rose-500 transition hover:text-rose-600"
        >
          {action} →
        </button>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function GeneralTab({
  student,
  branch,
  subscription,
  onOpenSub,
  onDeleteTrial,
}: {
  student: Student;
  branch?: Branch;
  subscription?: Student["subscriptions"][number];
  onOpenSub?: (sub: Subscription) => void;
  onDeleteTrial?: (date: string) => Promise<boolean> | boolean | void;
}) {
  // Актуальный пробный урок (ТЗ): ближайшая предстоящая запись, иначе последняя прошедшая.
  const trialDate = (() => {
    const dates = Object.entries(student.attendance || {})
      .filter(([, r]: any) => r && r.isTrial)
      .map(([d]) => d)
      .sort();
    if (!dates.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    return dates.find((d) => d >= today) || dates[dates.length - 1];
  })();
  // Подтверждение удаления пробного (если записали/продали неправильно).
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div>
      <SectionHeader title="Текущий абонемент" action="Все абонементы" />
      <div
        onClick={subscription && onOpenSub ? () => onOpenSub(subscription) : undefined}
        className={`grid grid-cols-2 gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:grid-cols-4 ${
          subscription && onOpenSub ? "cursor-pointer transition hover:border-amber-300 hover:bg-amber-100/70" : ""
        }`}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70">
            Тип
          </p>
          <p className="mt-1 font-black text-slate-800">
            {subscription?.name || "Нет"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70">
            Стоимость
          </p>
          <p className="mt-1 font-black text-slate-800">
            {subscription ? money(subscription.price) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70">
            Дата окончания
          </p>
          <p className="mt-1 font-black text-slate-800">
            {subscription?.validUntil || "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70">
            Статус
          </p>
          <span
            className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
              subscription?.status === "active"
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {subscription?.status === "active"
              ? "Активный"
              : subscription?.status === "expired"
              ? "Истёк"
              : subscription?.status === "suspended"
              ? "Приостановлен"
              : "—"}
          </span>
        </div>
      </div>

      {/* Пробный урок (ТЗ): актуальная дата записи + удаление, если записали неправильно.
          У оплатившего (есть активный абонемент) блок не показывается — воронка пройдена. */}
      {trialDate && !(student.subscriptions || []).some((x) => x.status === "active") && (
        <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-sky-700/70">Пробный урок</span>
            <span className="ml-auto font-black text-slate-800">
              {new Date(trialDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
            {onDeleteTrial && (
              <button
                type="button"
                title="Удалить запись на пробный урок"
                onClick={() => setConfirmDel(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" /> Удалить
              </button>
            )}
          </div>
          {confirmDel && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3">
              <p className="text-sm font-bold text-slate-700">
                Удалить запись на пробный урок {new Date(trialDate).toLocaleDateString("ru-RU")}?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => { setConfirmDel(false); await onDeleteTrial?.(trialDate); }}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Да, удалить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDel(false)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <Field label="Телефон родителя" value={student.parentPhone || "—"} />
        <Field label="Родитель" value={student.parentName || "—"} />
        <Field
          label="Адрес"
          value={branch ? `${branch.city}, ${branch.address}` : "—"}
        />
        <Field label="Уровень" value={student.artistLevel} />
        <Field
          label="Заметка педагога"
          value={student.notes?.[0]?.content || "Комментариев пока нет"}
        />
      </div>
    </div>
  );
}

// ——— Справочники формы продажи ———
const SELL_WEEKDAYS: { label: string; d: number }[] = [
  { label: "Пн", d: 1 },
  { label: "Вт", d: 2 },
  { label: "Ср", d: 3 },
  { label: "Чт", d: 4 },
  { label: "Пт", d: 5 },
  { label: "Сб", d: 6 },
  { label: "Вс", d: 0 },
];

// Полные названия дней + сопоставление коротких меток группы (["Пн","Ср"]) с номером дня недели.
const FULL_WEEKDAY: Record<number, string> = {
  1: "Понедельник", 2: "Вторник", 3: "Среда", 4: "Четверг", 5: "Пятница", 6: "Суббота", 0: "Воскресенье",
};
const SHORT_WD_TO_NUM: Record<string, number> = {
  "Пн": 1, "Вт": 2, "Ср": 3, "Чт": 4, "Пт": 5, "Сб": 6, "Вс": 0,
};

const SELL_DISCOUNTS: { label: string; kind: "none" | "pct" | "custom"; pct?: number }[] = [
  { label: "Без скидки", kind: "none" },
  { label: "Семейная скидка (10%)", kind: "pct", pct: 10 },
  { label: "Акция (15%)", kind: "pct", pct: 15 },
  { label: "Ручная скидка", kind: "custom" },
  { label: "Скидка руководителя (20%)", kind: "pct", pct: 20 },
];

// Счёт поступления: по требованию заказчика оставляем только два варианта —
// наличный расчёт и Kaspi Pay.
const SELL_METHODS: { label: string; value: SellSubscriptionInput["method"] }[] = [
  { label: "Наличные", value: "cash" },
  { label: "Kaspi Pay", value: "kaspi" },
];
const DEFAULT_METHOD_IDX = 1; // Kaspi Pay по умолчанию

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoOf = (dt: Date) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
const ddmm = (dt: Date) => `${pad2(dt.getDate())}.${pad2(dt.getMonth() + 1)}`;
const ddmmyyyyFromIso = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

function SellSubscriptionPanel({
  student,
  group,
  branch,
  plans,
  onSubmit,
  onSubmitBatch,
  onClose,
}: {
  student: Student;
  group?: Group;
  branch?: Branch;
  plans: SubscriptionPlan[];
  onSubmit: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  /** Пакетная продажа периода: N месячных абонементов одной операцией. */
  onSubmitBatch?: (items: SellSubscriptionInput[]) => Promise<boolean> | boolean;
  onClose: () => void;
}) {
  const activePlans = plans.filter((p) => p.status !== "archived");
  // Дни тренировок из расписания выбранной группы (["Пн","Ср","Пт"] → [1,3,5]); если не заданы — Пн/Ср/Пт.
  const groupDayNums = (group?.days || [])
    .map((d) => SHORT_WD_TO_NUM[d])
    .filter((n) => n !== undefined);
  const scheduleDayNums = groupDayNums.length ? groupDayNums : [1, 3, 5];
  const groupTime = group?.time || "";
  const [planId, setPlanId] = useState(activePlans[0]?.id || "");
  const [discountIdx, setDiscountIdx] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);
  const [recalc, setRecalc] = useState(0);
  const [methodIdx, setMethodIdx] = useState(DEFAULT_METHOD_IDX);
  // Дата продажи не вводится вручную — система сама ставит день оформления.
  const saleDate = isoOf(new Date());
  const [amountPaid, setAmountPaid] = useState("");               // внесено (пусто = полная оплата)
  const [startDate, setStartDate] = useState(isoOf(new Date()));  // дата НАЧАЛА = первый урок абонемента
  const [enabledDays, setEnabledDays] = useState<Record<number, boolean>>(
    () => Object.fromEntries(scheduleDayNums.map((d) => [d, true]))
  );
  const [disabledDates, setDisabledDates] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<null | "save" | "sell">(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"group" | "individual">("group");
  // Режим продажи (ТЗ «Логика продажи абонементов»): один месяц или период
  // с автоматической разбивкой по календарным месяцам.
  const [mode, setMode] = useState<"single" | "period">("single");
  const [periodEnd, setPeriodEnd] = useState("");
  // Ручная правка цены сегмента периода (ключ = ГГГГ-ММ); пусто = авторасчёт.
  const [segPrices, setSegPrices] = useState<Record<string, string>>({});
  // Ручная правка цены одиночного месяца (D2): пусто = пропорциональный авторасчёт.
  const [priceEdit, setPriceEdit] = useState("");

  const plan = activePlans.find((p) => p.id === planId);
  const basePrice = plan?.price || 0;
  const targetLessons = plan?.lessonsCount && plan.lessonsCount > 0 ? plan.lessonsCount : 12;
  // Режим тарифа (ТЗ): месячный — в абонемент входят ВСЕ занятия календарного
  // месяца без доплаты (групповые); по количеству — строго lessonsCount
  // (индивидуальные всегда по количеству).
  const monthMode = kind !== "individual" && plan?.billingMode !== "lessons";
  const lessonsCap = monthMode ? 999 : targetLessons;

  // ТЗ: один абонемент = один КАЛЕНДАРНЫЙ месяц. Срок — до последнего дня
  // месяца первого урока (не «месяц от старта», который пересекал границу).
  const subEndIso = useMemo(() => {
    if (!startDate) return startDate;
    const [y, m] = startDate.split("-").map(Number);
    return isoOf(new Date(y, m || 1, 0)); // 0-й день следующего месяца = конец текущего
  }, [startDate]);

  const candidates = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const days = SELL_WEEKDAYS.filter((w) => enabledDays[w.d]).map((w) => w.d);
    if (days.length === 0 || !startDate) return out;
    const [y, m, d] = startDate.split("-").map(Number);
    const cursor = new Date(y, (m || 1) - 1, d || 1);
    const limit = new Date(y, m || 1, 1); // не включая — до конца календарного месяца
    while (cursor < limit && out.length < lessonsCap) {
      if (days.includes(cursor.getDay())) {
        out.push({ key: isoOf(cursor), label: ddmm(cursor) });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [enabledDays, startDate, lessonsCap]);

  // Сколько занятий в ПОЛНОМ месяце по выбранным дням — база пропорции месячного тарифа.
  const fullMonthLessons = useMemo(() => {
    const days = SELL_WEEKDAYS.filter((w) => enabledDays[w.d]).map((w) => w.d);
    if (!days.length || !startDate) return 0;
    const [y, m] = startDate.split("-").map(Number);
    let count = 0;
    const cursor = new Date(y, (m || 1) - 1, 1);
    const limit = new Date(y, m || 1, 1);
    while (cursor < limit && count < 999) {
      if (days.includes(cursor.getDay())) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }, [enabledDays, startDate]);

  const activeDates = candidates.filter((c) => !disabledDates[c.key]);
  const lessonsTotal = activeDates.length;
  const startsOn = activeDates[0]?.key || startDate;
  const endsOn = subEndIso; // срок абонемента — до конца календарного месяца

  const disc = SELL_DISCOUNTS[discountIdx];
  // Пропорциональный авторасчёт неполного месяца (ТЗ §3). База пропорции:
  // месячный тариф — занятия ПОЛНОГО месяца (9 из 9 = полная цена, доплаты нет);
  // тариф по количеству — lessonsCount тарифа. Менеджер может исправить сумму.
  const prorationBase = monthMode ? fullMonthLessons : targetLessons;
  const proratedBase = prorationBase > 0 && lessonsTotal < prorationBase
    ? Math.round((basePrice * lessonsTotal) / prorationBase)
    : basePrice;
  const effectiveBase = priceEdit !== "" ? Math.max(0, Math.round(Number(priceEdit) || 0)) : proratedBase;
  const discountAmount =
    disc.kind === "custom"
      ? Math.max(0, Math.round(customDiscount) || 0)
      : disc.kind === "pct"
      ? Math.round((effectiveBase * (disc.pct || 0)) / 100)
      : 0;
  const recalcAmount = Math.max(0, Math.round(recalc) || 0);
  const finalPrice = Math.max(0, effectiveBase - discountAmount - recalcAmount);
  // Внесено: пусто = полная оплата. Меньше стоимости → долг.
  const paidNum = amountPaid === "" ? finalPrice : Math.min(finalPrice, Math.max(0, Math.round(Number(amountPaid) || 0)));
  const debtLeft = Math.max(0, finalPrice - paidNum);

  // Сегменты периода (режим «Период»): разбивка по календарным месяцам,
  // в каждом — даты занятий по выбранным дням недели (кап = занятия тарифа).
  const segments = useMemo(() => {
    if (mode !== "period" || !startDate || !periodEnd || periodEnd < startDate) return [];
    const days = SELL_WEEKDAYS.filter((w) => enabledDays[w.d]).map((w) => w.d);
    if (!days.length) return [];
    const out: { monthKey: string; from: string; to: string; dates: string[] }[] = [];
    const [ye, me, de] = periodEnd.split("-").map(Number);
    const endD = new Date(ye, (me || 1) - 1, de || 1);
    let [y, m, d] = startDate.split("-").map(Number);
    let cursor = new Date(y, (m || 1) - 1, d || 1);
    while (cursor <= endD && out.length < 12) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const segEnd = monthEnd < endD ? monthEnd : endD;
      const dates: string[] = [];
      const c2 = new Date(cursor);
      while (c2 <= segEnd && dates.length < lessonsCap) {
        if (days.includes(c2.getDay())) dates.push(isoOf(c2));
        c2.setDate(c2.getDate() + 1);
      }
      out.push({ monthKey: isoOf(cursor).slice(0, 7), from: isoOf(cursor), to: isoOf(segEnd), dates });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return out;
  }, [mode, startDate, periodEnd, enabledDays, lessonsCap]);

  // Занятий в полном месяце (для пропорции месячного тарифа в разбивке периода).
  const monthFullLessons = (monthKey: string) => {
    const days = SELL_WEEKDAYS.filter((w) => enabledDays[w.d]).map((w) => w.d);
    const [y, m] = monthKey.split("-").map(Number);
    let n = 0;
    const cur = new Date(y, (m || 1) - 1, 1);
    const lim = new Date(y, m || 1, 1);
    while (cur < lim) { if (days.includes(cur.getDay())) n += 1; cur.setDate(cur.getDate() + 1); }
    return n;
  };
  const segAutoPrice = (seg: { monthKey: string; dates: string[] }) => {
    const full = monthMode ? monthFullLessons(seg.monthKey) : targetLessons;
    return full > 0 && seg.dates.length < full ? Math.round((basePrice * seg.dates.length) / full) : basePrice;
  };
  const segPrice = (seg: { monthKey: string; dates: string[] }) => {
    const manual = segPrices[seg.monthKey];
    return manual !== undefined && manual !== "" ? Math.max(0, Math.round(Number(manual) || 0)) : segAutoPrice(seg);
  };
  const periodTotal = segments.reduce((sum, s) => sum + segPrice(s), 0);

  const toggleDay = (d: number) => setEnabledDays((prev) => ({ ...prev, [d]: !prev[d] }));
  const toggleDate = (key: string) => setDisabledDates((prev) => ({ ...prev, [key]: !prev[key] }));

  const submit = async (paid: boolean) => {
    if (!plan) {
      setError("Выберите тип абонемента");
      return;
    }
    if (lessonsTotal === 0) {
      setError("Выберите хотя бы одно занятие");
      return;
    }
    // Строгий запрет переплаты (ТЗ): внести больше стоимости нельзя.
    if (amountPaid !== "" && Math.round(Number(amountPaid) || 0) > finalPrice) {
      setError(`«Внесено» больше стоимости абонемента (${money(finalPrice)}) — уменьшите сумму.`);
      return;
    }
    setError(null);
    setBusy(paid ? "sell" : "save");
    try {
      const ok = await onSubmit({
        studentId: student.id,
        branchId: student.branchId,
        groupId: kind === "individual" ? undefined : student.groupIds?.[0],
        planId: plan.id,
        startsOn,
        endsOn,
        soldOn: saleDate,
        amountPaid: paidNum,
        lessonsTotal,
        price: finalPrice,
        discountAmount,
        recalc: recalcAmount,
        method: SELL_METHODS[methodIdx].value,
        description: `${kind === "individual" ? "Индивидуальный абонемент" : "Абонемент"}: ${plan.name}`,
        paid,
        kind,
      });
      if (ok !== false) onClose();
      else setError("Не удалось сохранить абонемент");
    } catch (e: any) {
      setError(e?.message || "Не удалось сохранить абонемент");
    } finally {
      setBusy(null);
    }
  };

  // Пакетная продажа периода: N месячных абонементов одной операцией (ТЗ §5).
  const submitBatch = async () => {
    if (!plan || !onSubmitBatch) return;
    if (!segments.length) {
      setError("Укажите период: дату начала и дату окончания");
      return;
    }
    if (segments.some((s) => s.dates.length === 0)) {
      setError("В одном из месяцев не получилось ни одного занятия — проверьте дни недели");
      return;
    }
    setError(null);
    setBusy("sell");
    try {
      const items: SellSubscriptionInput[] = segments.map((seg) => ({
        studentId: student.id,
        branchId: student.branchId,
        groupId: kind === "individual" ? undefined : student.groupIds?.[0],
        planId: plan.id,
        startsOn: seg.dates[0] || seg.from,
        endsOn: seg.to,
        soldOn: saleDate,
        amountPaid: segPrice(seg),
        lessonsTotal: seg.dates.length,
        price: segPrice(seg),
        discountAmount: 0,
        recalc: 0,
        method: SELL_METHODS[methodIdx].value,
        description: `${kind === "individual" ? "Индивидуальный абонемент" : "Абонемент"}: ${plan.name} (${seg.monthKey})`,
        paid: true,
        kind,
      }));
      const ok = await onSubmitBatch(items);
      if (ok !== false) onClose();
      else setError("Не удалось оформить пакет абонементов");
    } catch (e: any) {
      setError(e?.message || "Не удалось оформить пакет абонементов");
    } finally {
      setBusy(null);
    }
  };

  const fieldCls =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300";

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="bg-gradient-to-r from-violet-500 via-rose-500 to-amber-400 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-black text-white">
          <Wallet className="h-4 w-4" /> Продать абонемент
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <Users className="h-3.5 w-3.5" /> {student.name}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <MapPin className="h-3.5 w-3.5" /> {branch?.name || "Филиал"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <Users className="h-3.5 w-3.5" /> {group?.name || "Без группы"}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <Calendar className="h-3.5 w-3.5" /> Счёт от {ddmmyyyyFromIso(isoOf(new Date()))}
          </span>
        </div>
      </div>

      {activePlans.length === 0 ? (
        <div className="p-4 text-sm text-slate-500">
          Нет доступных планов абонементов. Создайте их в справочнике «Абонементы».
          <div className="mt-3">
            <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50">
              Закрыть
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {/* Режим: один месяц / период с разбивкой по месяцам (ТЗ §5) */}
          {onSubmitBatch && (
            <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {([["single", "Один месяц"], ["period", "Период (несколько месяцев)"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setMode(id); setError(null); }}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                    mode === id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {/* Параметры */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Форма занятий</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as "group" | "individual")} className={fieldCls}>
                <option value="group">Групповой</option>
                <option value="individual">Индивидуальный</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Тариф</span>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={fieldCls}>
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.lessonsCount} зан. · {money(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Скидка</span>
              <select value={discountIdx} onChange={(e) => setDiscountIdx(Number(e.target.value))} className={fieldCls}>
                {SELL_DISCOUNTS.map((d, i) => (
                  <option key={i} value={i}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            {disc.kind === "custom" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Размер ручной скидки (тг)</span>
                <input type="number" min={0} value={customDiscount || ""} placeholder="0" onChange={(e) => setCustomDiscount(Number(e.target.value))} className={fieldCls} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Перерасчёт (вычтется из цены)</span>
              <input type="number" min={0} step={500} value={recalc || ""} placeholder="0" onChange={(e) => setRecalc(Number(e.target.value))} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Первый урок (дата начала)</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldCls} />
            </label>
            {mode === "period" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Окончание периода</span>
                <input type="date" value={periodEnd} min={startDate} onChange={(e) => setPeriodEnd(e.target.value)} className={fieldCls} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Счёт поступления</span>
              <select value={methodIdx} onChange={(e) => setMethodIdx(Number(e.target.value))} className={fieldCls}>
                {SELL_METHODS.map((m, i) => (
                  <option key={i} value={i}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Расписание группы */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Расписание занятий{group?.name ? ` · ${group.name}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {scheduleDayNums.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                    enabledDays[d] ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${enabledDays[d] ? "bg-violet-500" : "bg-slate-300"}`} />
                  {FULL_WEEKDAY[d]}{groupTime ? ` ${groupTime}` : ""}
                </button>
              ))}
            </div>
            {mode === "single" && candidates.length > 0 && (
              <>
                <p className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Конкретные даты ({lessonsTotal} из {candidates.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((c) => {
                    const on = !disabledDates[c.key];
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggleDate(c.key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                          on ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400 line-through"
                        }`}
                      >
                        {on && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Сводка одиночного месяца */}
          {mode === "single" && (
          <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-amber-50 p-4">
            <p className="mb-3 text-sm font-black text-slate-800">Информация об абонементе</p>
            <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <SellRow k="Ученик" v={student.name} />
              <SellRow k="Филиал" v={branch?.name || "—"} />
              <SellRow k="Группа" v={group?.name || "—"} />
              <SellRow k="Тип абонемента" v={plan?.name || "—"} />
              <SellRow k="Количество занятий" v={`${lessonsTotal} занятий`} />
              <SellRow k="Базовая стоимость" v={money(basePrice)} />
              <SellRow k="Скидка" v={discountAmount > 0 ? `−${money(discountAmount)}` : "—"} tone={discountAmount > 0 ? "rose" : undefined} />
              <SellRow k="Перерасчёт" v={recalcAmount > 0 ? `−${money(recalcAmount)}` : "—"} tone={recalcAmount > 0 ? "rose" : undefined} />
              <SellRow k="Способ оплаты" v={SELL_METHODS[methodIdx].label} />
              <SellRow k="Дата продажи" v={`${ddmmyyyyFromIso(saleDate)} (сегодня)`} />
              <SellRow k="Первый урок" v={ddmmyyyyFromIso(startsOn)} />
              <SellRow k="Действует до" v={`${ddmmyyyyFromIso(endsOn)} (конец месяца)`} />
            </div>
            {/* Неполный месяц: пропорциональный авторасчёт, редактируется вручную (ТЗ §3) */}
            {prorationBase > 0 && lessonsTotal < prorationBase && (
              <div className="mt-3 grid gap-3 border-t border-violet-200/40 pt-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500">
                    Стоимость за {lessonsTotal} зан. (авторасчёт {money(proratedBase)}, можно исправить)
                  </span>
                  <input type="number" min={0} step={500} value={priceEdit}
                    placeholder={String(proratedBase)}
                    onChange={(e) => setPriceEdit(e.target.value)} className={fieldCls} />
                </label>
                <div className="text-right text-xs text-slate-400">Полный месяц — {money(basePrice)}</div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t-2 border-violet-200/60 pt-3">
              <span className="text-sm font-black text-slate-700">Итоговая цена</span>
              <span className="text-xl font-black text-violet-700">{money(finalPrice)}</span>
            </div>
            <div className="mt-3 grid gap-3 border-t border-violet-200/40 pt-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Внесено (тг)</span>
                <input type="number" min={0} max={finalPrice} step={500} value={amountPaid}
                  placeholder={`Полностью — ${money(finalPrice)}`}
                  onChange={(e) => setAmountPaid(e.target.value)} className={fieldCls} />
              </label>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500">Долг</p>
                <p className={`text-lg font-black ${debtLeft > 0 ? "text-rose-600" : "text-emerald-600"}`}>{debtLeft > 0 ? money(debtLeft) : "нет"}</p>
              </div>
            </div>
          </div>
          )}

          {/* Предпросмотр периода: каждый календарный месяц — отдельный абонемент (ТЗ §5) */}
          {mode === "period" && (
            <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-amber-50 p-4">
              <p className="mb-3 text-sm font-black text-slate-800">Разбивка периода по месяцам</p>
              {segments.length === 0 ? (
                <p className="text-sm text-slate-500">Укажите дату начала и дату окончания периода — система разобьёт его по календарным месяцам.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="py-1.5 pr-3 font-black">Месяц</th>
                          <th className="py-1.5 pr-3 font-black">Период</th>
                          <th className="py-1.5 pr-3 font-black">Занятий</th>
                          <th className="py-1.5 font-black">Сумма (можно исправить)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segments.map((seg) => (
                          <tr key={seg.monthKey} className="border-t border-violet-100/70">
                            <td className="py-2 pr-3 font-bold text-slate-800">
                              {new Date(seg.from).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">{ddmmyyyyFromIso(seg.from)} — {ddmmyyyyFromIso(seg.to)}</td>
                            <td className="py-2 pr-3 text-slate-600">{seg.dates.length}</td>
                            <td className="py-2">
                              <input
                                type="number" min={0} step={500}
                                value={segPrices[seg.monthKey] ?? ""}
                                placeholder={String(segAutoPrice(seg))}
                                onChange={(e) => setSegPrices((m) => ({ ...m, [seg.monthKey]: e.target.value }))}
                                className={`${fieldCls} w-32`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t-2 border-violet-200/60 pt-3">
                    <span className="text-sm font-black text-slate-700">Итого за {segments.length} мес.</span>
                    <span className="text-xl font-black text-violet-700">{money(periodTotal)}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Будет создано {segments.length} отдельных абонементов — по одному на календарный месяц (для помесячной отчётности). Оплата — полная за каждый месяц.
                  </p>
                </>
              )}
            </div>
          )}

          {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p>}

          {/* Кнопки */}
          <div className="mt-4 flex flex-wrap gap-2">
            {mode === "single" ? (
              <button
                onClick={() => submit(true)}
                disabled={busy !== null}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-40"
              >
                {busy === "sell" ? "Продаём…" : "Продать абонемент"}
              </button>
            ) : (
              <button
                onClick={submitBatch}
                disabled={busy !== null || segments.length === 0}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-40"
              >
                {busy === "sell" ? "Оформляем…" : `Продать ${segments.length || ""} абонемент${segments.length === 1 ? "" : segments.length >= 2 && segments.length <= 4 ? "а" : "ов"}`}
              </button>
            )}
            <button
              onClick={onClose}
              disabled={busy !== null}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SellRow({ k, v, tone }: { k: string; v: string; tone?: "rose" }) {
  return (
    <div className="flex items-center justify-between border-b border-violet-100/60 py-1 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className={`font-bold ${tone === "rose" ? "text-rose-600" : "text-slate-800"}`}>{v}</span>
    </div>
  );
}

function SubscriptionDetailModal({
  subscription,
  student,
  branch,
  group,
  canDelete,
  onDelete,
  onClose,
}: {
  subscription: Subscription;
  student: Student;
  branch?: Branch;
  group?: Group;
  canDelete?: boolean;
  onDelete?: (subId: string, reason: string, comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const s = subscription;
  const used = Math.max(0, (s.lessonsTotal || 0) - (s.lessonsLeft || 0));
  const pct = s.lessonsTotal > 0 ? Math.round((used / s.lessonsTotal) * 100) : 0;
  const isDeleted = s.status === "deleted";
  const statusLabel =
    s.status === "active" ? "Активный" : s.status === "deleted" ? "Удалён" : s.status === "suspended" ? "Приостановлен" : "Истёк";
  const statusCls =
    s.status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : s.status === "deleted"
      ? "bg-rose-100 text-rose-700"
      : s.status === "suspended"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-200 text-slate-500";
  const fmt = (iso?: string) => (iso ? ddmmyyyyFromIso(iso) : "—");
  const [confirming, setConfirming] = useState(false);
  const [delReason, setDelReason] = useState("");
  const [delComment, setDelComment] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const doDelete = async () => {
    if (!delReason.trim() || !onDelete) return;
    setDelBusy(true); setDelErr(null);
    try { await onDelete(s.id, delReason.trim(), delComment.trim()); onClose(); }
    catch (e: any) { setDelErr(e?.message || "Не удалось удалить"); }
    finally { setDelBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="relative bg-gradient-to-r from-violet-500 via-rose-500 to-amber-400 px-5 py-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-xs font-bold uppercase tracking-wide text-white/80">Абонемент</p>
          <p className="mt-1 text-lg font-black text-white">{s.name}</p>
          <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusCls}`}>
            {statusLabel}
          </span>
        </div>

        <div className="p-5">
          {/* Чипы */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              <Users className="h-3.5 w-3.5 text-slate-400" /> {student.name}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400" /> {branch?.name || "Филиал"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              <Users className="h-3.5 w-3.5 text-slate-400" /> {group?.name || "Без группы"}
            </span>
          </div>

          {/* Прогресс занятий */}
          <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-500/80">Занятия</p>
                <p className="mt-1 text-2xl font-black text-slate-800">
                  {s.lessonsLeft}
                  <span className="text-base font-bold text-slate-400"> / {s.lessonsTotal}</span>
                </p>
                <p className="text-xs text-slate-500">осталось из всего</p>
              </div>
              <p className="text-xs font-bold text-slate-500">проведено {used}</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-violet-100">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-rose-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Детали */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <DetailRow k="Тип абонемента" v={s.name} />
            <DetailRow k="Статус" v={statusLabel} />
            <DetailRow k="Занятий всего" v={`${s.lessonsTotal}`} />
            <DetailRow k="Осталось занятий" v={`${s.lessonsLeft}`} />
            <DetailRow k="Проведено" v={`${used}`} />
            <DetailRow k="Дата начала" v={fmt(s.startsOn)} />
            <DetailRow k="Дата окончания" v={fmt(s.validUntil)} />
            <DetailRow k="Стоимость" v={money(s.price)} />
            {(s.discountAmount || 0) > 0 && (
              <DetailRow k="Скидка/перерасчёт" v={`−${money(s.discountAmount || 0)}`} tone="rose" />
            )}
            <DetailRow k="Автопродление" v={s.isAutoRenew ? "Включено" : "Выключено"} last />
          </div>

          {/* Инфо об удалении (§3): удалённый абонемент не исчезает, а показывает причину */}
          {isDeleted && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-sm">
              <p className="font-black text-rose-700">Абонемент удалён</p>
              <DetailRow k="Причина" v={s.cancelReason || "—"} />
              {s.cancelComment && <DetailRow k="Комментарий" v={s.cancelComment} />}
              <DetailRow k="Кто удалил" v={s.deletedBy || "—"} />
              <DetailRow k="Когда" v={s.deletedAt ? new Date(s.deletedAt).toLocaleString("ru-RU") : "—"} last />
            </div>
          )}

          {/* Форма удаления с причиной */}
          {!isDeleted && confirming && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
              <p className="text-sm font-black text-rose-700">Удаление абонемента</p>
              <p className="mt-0.5 text-xs text-slate-500">Абонемент сохранится в истории со статусом «Удалён».</p>
              <input value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder="Причина удаления *"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400" />
              <input value={delComment} onChange={(e) => setDelComment(e.target.value)} placeholder="Комментарий (необязательно)"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400" />
              {delErr && <p className="mt-2 text-xs font-bold text-rose-600">{delErr}</p>}
              <div className="mt-3 flex gap-2">
                <button onClick={doDelete} disabled={!delReason.trim() || delBusy}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-40">
                  {delBusy ? "Удаление…" : "Подтвердить удаление"}
                </button>
                <button onClick={() => { setConfirming(false); setDelErr(null); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Назад</button>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-between gap-2">
            {!isDeleted && canDelete && onDelete && !confirming ? (
              <button onClick={() => setConfirming(true)}
                className="rounded-xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50">
                Удалить абонемент
              </button>
            ) : <span />}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ k, v, tone, last }: { k: string; v: string; tone?: "rose"; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 text-sm ${last ? "" : "border-b border-slate-200/70"}`}>
      <span className="text-slate-500">{k}</span>
      <span className={`font-bold ${tone === "rose" ? "text-rose-600" : "text-slate-800"}`}>{v}</span>
    </div>
  );
}

// История действий ученика (§16): лента событий из бэкенда.
function HistoryTab({ studentId, roleHeader }: { studentId: string; roleHeader: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/mvp/students/${studentId}/history`, { headers: { "x-demo-role": roleHeader } });
        if (r.ok && alive) setEvents((await r.json()).events || []);
      } catch { /* ignore */ } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [studentId, roleHeader]);

  const ICON: Record<string, string> = { created: "➕", status: "🔄", payment: "💰", sub_buy: "🎫", sub_del: "🗑️", echo: "⭐", archive: "📦", trash: "🗂️" };
  if (loading) return <p className="p-4 text-sm text-slate-400">Загрузка истории…</p>;
  if (!events.length) return <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-400">История действий пуста.</p>;
  return (
    <div className="space-y-2">
      {events.map((e, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3">
          <span className="text-lg leading-none">{ICON[e.type] || "•"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">{e.title}</p>
            {e.detail && <p className="text-xs text-slate-500">{e.detail}</p>}
            <p className="mt-0.5 text-[11px] text-slate-400">{e.at ? new Date(e.at).toLocaleString("ru-RU") : ""}{e.by ? ` · ${e.by}` : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Вкладка «Справки»: перерасчёты ученика с причинами и приложенными справками (ТЗ §перерасчёт).
// Причины — зеркало REASONS из AttendanceJournalView (там создаётся перерасчёт).
const RECALC_REASON_LABELS: Record<string, string> = {
  illness: "Болезнь",
  certificate: "Справка",
  left: "Уехал",
  family: "Семейные обстоятельства",
  no_notice: "Не предупредил",
  other: "Другое",
};
const RECALC_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Ожидает", cls: "bg-amber-100 text-amber-700" },
  applied: { label: "Применён", cls: "bg-emerald-100 text-emerald-600" },
  cancelled: { label: "Отменён", cls: "bg-slate-200 text-slate-500" },
};

function RecalcsTab({ studentId, roleHeader }: { studentId: string; roleHeader: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/mvp/recalculations?studentId=${studentId}`, { headers: { "x-demo-role": roleHeader } });
        if (r.ok && alive) setRows((await r.json()).recalculations || []);
      } catch { /* ignore */ } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [studentId, roleHeader]);

  if (loading) return <p className="p-4 text-sm text-slate-400">Загрузка справок…</p>;
  if (!rows.length) {
    return (
      <div>
        <SectionHeader title="Справки и перерасчёты" />
        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-400">
          Перерасчётов пока нет. Они создаются из журнала посещаемости (кнопка «Перерасчёт»), справка прикрепляется там же.
        </p>
      </div>
    );
  }
  return (
    <div>
      <SectionHeader title="Справки и перерасчёты" />
      <div className="grid gap-3">
        {rows.map((r) => {
          const st = RECALC_STATUS_LABELS[r.status] || RECALC_STATUS_LABELS.pending;
          const isImage = (r.attachmentUrl || "").startsWith("data:image");
          return (
            <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-slate-800">
                  {RECALC_REASON_LABELS[r.reason] || r.reason || "Без причины"}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                <span className="ml-auto text-sm font-black text-slate-800">{money(r.amount)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {r.periodFrom && r.periodTo ? `Период: ${r.periodFrom} — ${r.periodTo} · ` : ""}
                {r.lessonsCount ? `Занятий: ${r.lessonsCount} · ` : ""}
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ru-RU") : ""}
                {r.createdByName ? ` · ${r.createdByName}` : ""}
              </p>
              {r.comment && <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>}
              {r.attachmentUrl && (
                <div className="mt-2">
                  {isImage && (
                    <img src={r.attachmentUrl} alt="Справка" className="mb-2 max-h-40 rounded-xl border border-slate-100" />
                  )}
                  <a
                    href={r.attachmentUrl}
                    download={r.attachmentName || `spravka-${(r.createdAt || "").slice(0, 10)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
                  >
                    📎 {r.attachmentName || "Скачать справку"}
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubscriptionsTab({
  student,
  subs: props_subs,
  onSell,
  onOpenSub,
  onDeleteTrial,
}: {
  student: Student;
  subs?: Subscription[];
  onSell?: () => void;
  onOpenSub?: (sub: Subscription) => void;
  onDeleteTrial?: (date: string) => Promise<boolean> | boolean | void;
}) {
  const subs = props_subs ?? (student.subscriptions || []);
  // Пробные уроки отображаются вместе с абонементами — ВСЯ история (ТЗ заказчика),
  // свежие сверху; каждый можно удалить (если записали/продали неправильно).
  const trials = Object.entries(student.attendance || {})
    .filter(([, r]: any) => r && (r.isTrial || r.status === "trial"))
    .sort(([a], [b]) => b.localeCompare(a));
  const [confirmTrialDel, setConfirmTrialDel] = useState<string | null>(null);
  const trialRowLabel = (status: string) =>
    status === "unmarked" ? "Записан"
    : ["present", "excused", "trial"].includes(status) ? "Был"
    : "Не пришёл";
  return (
    <div>
      <SectionHeader title="Абонементы" action="Продать" onAction={onSell} />
      {trials.length > 0 && (
        <div className="mb-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700/70">
            Пробные уроки ({trials.length}){getTrialInfo(student).converted ? " · купил после пробного" : ""}
          </p>
          <div className="mt-2 space-y-1.5">
            {trials.map(([date, rec]: any) => (
              <div key={date}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-slate-800">
                    {new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">{trialRowLabel(rec.status)}</span>
                  {onDeleteTrial && (
                    <button
                      type="button"
                      onClick={() => setConfirmTrialDel(date)}
                      className="ml-auto inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Удалить
                    </button>
                  )}
                </div>
                {confirmTrialDel === date && (
                  <div className="mt-2 rounded-xl border border-rose-200 bg-white p-3">
                    <p className="text-sm font-bold text-slate-700">Удалить запись на пробный урок {new Date(date).toLocaleDateString("ru-RU")}?</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => { setConfirmTrialDel(null); await onDeleteTrial?.(date); }}
                        className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        Да, удалить
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmTrialDel(null)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {subs.length === 0 && (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-400">
          Активных абонементов нет.
        </p>
      )}
      <div className="grid gap-3">
        {subs.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => onOpenSub?.(sub)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
          >
            <div>
              <p className="font-bold text-slate-800">{sub.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                до {sub.validUntil} · осталось {sub.lessonsLeft}/{sub.lessonsTotal} занятий
              </p>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="font-black text-slate-800">{money(sub.price)}</p>
                <span
                  className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    sub.status === "active"
                      ? "bg-emerald-100 text-emerald-600"
                      : sub.status === "deleted"
                      ? "bg-rose-100 text-rose-600"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {sub.status === "active" ? "Активный" : sub.status === "deleted" ? "Удалён" : "Неактивный"}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AttendanceTab({
  student,
  percent,
  present,
  total,
}: {
  student: Student;
  percent: number;
  present: number;
  total: number;
}) {
  const records = Object.entries(student.attendance || {})
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12);
  const tone: Record<string, string> = {
    present: "bg-emerald-100 text-emerald-600",
    absent: "bg-rose-100 text-rose-600",
    sick: "bg-amber-100 text-amber-600",
    unmarked: "bg-slate-100 text-slate-400",
  };
  const labelMap: Record<string, string> = {
    present: "Был",
    absent: "Пропуск",
    sick: "Болел",
    unmarked: "Не отмечен",
  };
  return (
    <div>
      <SectionHeader title="Посещения" />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Посещаемость" value={`${percent}%`} />
        <Stat label="Был на занятиях" value={String(present)} />
        <Stat label="Всего отметок" value={String(total)} />
      </div>
      {records.length === 0 ? (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-400">
          Отметок о посещении пока нет.
        </p>
      ) : (
        <div className="grid gap-2">
          {records.map(([date, record]) => (
            <div
              key={date}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5"
            >
              <span className="text-sm text-slate-500">{date}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  tone[record.status] || tone.unmarked
                }`}
              >
                {labelMap[record.status] || record.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinanceTab({
  student,
  onOpenPayment,
}: {
  student: Student;
  onOpenPayment?: () => void;
}) {
  const debt = student.balance < 0;
  return (
    <div>
      <SectionHeader title="Финансы" action={onOpenPayment ? "Принять оплату" : undefined} onAction={onOpenPayment} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 ${
            debt
              ? "border-rose-200 bg-rose-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Текущий баланс
          </p>
          <p
            className={`mt-1 text-2xl font-black ${
              debt ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {money(student.balance)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {debt ? "Есть задолженность" : "Оплачено / депозит"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Платёжный статус
          </p>
          <p className="mt-1 text-lg font-bold text-slate-700">
            {student.paymentStatus || (debt ? "Не оплачен" : "Активен")}
          </p>
          {onOpenPayment && (
            <button
              onClick={onOpenPayment}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-600"
            >
              <CreditCard className="h-3.5 w-3.5" /> Принять оплату
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentsTab({ student }: { student: Student }) {
  const notes = student.notes || [];
  // Свободный комментарий из формы редактирования (students.comment) — без этого
  // блока введённое там «пропадало»: вкладка показывала только заметки педагогов.
  const cardComment = (student.comment || "").trim();
  return (
    <div>
      <SectionHeader title="Комментарии" />
      {cardComment && (
        <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-bold text-slate-700">Комментарий из карточки</p>
          <p className="mt-1.5 text-sm text-slate-600">{cardComment}</p>
        </div>
      )}
      {notes.length === 0 && !cardComment ? (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-400">
          Комментариев пока нет.
        </p>
      ) : notes.length === 0 ? null : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">
                  {note.teacherName}
                </p>
                <span className="text-xs text-slate-400">{note.date}</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunicationsTab({ student }: { student: Student }) {
  const phone = student.parentPhone;
  const channels = [
    { label: "Позвонить", sub: phone || "Нет номера", href: telHref(phone), tone: "text-slate-700" },
    { label: "WhatsApp", sub: "Написать в WhatsApp", href: waHref(phone), tone: "text-emerald-600" },
    { label: "SMS", sub: "Отправить SMS", href: `sms:${phoneDigits(phone)}`, tone: "text-slate-700" },
  ];
  return (
    <div>
      <SectionHeader title="Коммуникации" />
      <div className="grid gap-2">
        {channels.map((channel) => (
          <a
            key={channel.label}
            href={channel.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-400" />
              <div>
                <p className={`text-sm font-bold ${channel.tone}`}>
                  {channel.label}
                </p>
                <p className="text-xs text-slate-400">{channel.sub}</p>
              </div>
            </div>
            <span className="text-slate-300">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FamilyTab({ student }: { student: Student }) {
  const guardians =
    student.guardians && student.guardians.length > 0
      ? student.guardians
      : [
          {
            id: "legacy",
            fullName: student.parentName || "Родитель",
            phone: student.parentPhone || "—",
            email: undefined as string | undefined,
            telegram: undefined as string | undefined,
          },
        ];
  return (
    <div>
      <SectionHeader title="Семья" />
      <div className="grid gap-3">
        {guardians.map((guardian) => (
          <div
            key={guardian.id}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <p className="font-bold text-slate-800">{guardian.fullName}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              <span>{guardian.phone}</span>
              {guardian.email && <span>{guardian.email}</span>}
              {guardian.telegram && <span>{guardian.telegram}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
      <p className="text-lg font-black text-slate-800">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}
