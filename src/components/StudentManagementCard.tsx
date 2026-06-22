/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentManagementCard — единая «светлая» карточка управления учеником.
 * Открывается по тапу на ученика во всех кабинетах (Администратор,
 * Руководитель филиала, Владелец, Преподаватель). Дизайн — светлая CRM-карточка:
 * шапка с аватаром и статусом, ряд действий, вкладки, блок «Текущий абонемент».
 */
import React, { useMemo, useState } from "react";
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
  X,
  Trash2,
  CreditCard,
  CheckCircle2,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { Branch, Group, Student, Subscription, SubscriptionPlan, Teacher } from "../types";

/** Полезная нагрузка продажи абонемента из инлайн-формы карточки. */
export interface SellSubscriptionInput {
  studentId: string;
  branchId: string;
  groupId?: string;
  planId: string;
  startsOn: string;
  endsOn: string;
  lessonsTotal: number;
  price: number;
  discountAmount: number;
  recalc: number;
  method: "cash" | "card" | "transfer" | "kaspi" | "other";
  description?: string;
  paid: boolean;
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
  onOpenPayment?: () => void;
  /** Доступные планы абонементов организации (для формы продажи) */
  plans?: SubscriptionPlan[];
  /** Продать абонемент: создаёт student_subscription. Если задан — открывает инлайн-форму. */
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  /** Запись на пробный урок (UI-форма; вызывается при сохранении) */
  onTrial?: (payload: { date: string; time: string; note: string }) => Promise<boolean> | boolean | void;
  /** Перевод ученика в другую группу/филиал/к другому педагогу */
  onTransfer?: (payload: { groupId?: string; branchId?: string; teacherId?: string }) => Promise<boolean> | boolean | void;
}

type TabId =
  | "general"
  | "subscriptions"
  | "attendance"
  | "finance"
  | "comments"
  | "communications"
  | "family";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "Общая" },
  { id: "subscriptions", label: "Абонементы" },
  { id: "attendance", label: "Посещения" },
  { id: "finance", label: "Финансы" },
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
  onOpenPayment,
  plans = [],
  onSellSubscription,
  onTrial,
  onTransfer,
}: StudentManagementCardProps) {
  const [tab, setTab] = useState<TabId>("general");
  const [panel, setPanel] = useState<null | "trial" | "transfer" | "sell">(null);
  const [openSub, setOpenSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [trialForm, setTrialForm] = useState({ date: "", time: "", note: "" });
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

  const togglePanel = (next: "trial" | "transfer" | "sell") => {
    setDone(null);
    setPanel((prev) => (prev === next ? null : next));
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
      const ok = await onTransfer(transferForm);
      if (ok !== false) {
        const groupName = allGroups.find((g) => g.id === transferForm.groupId)?.name;
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
  const statusActive = !debt;

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
        {/* Шапка ученика */}
        <div className="flex items-start gap-4">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-amber-400/40"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-xl font-black text-white">
              {initials(student.name)}
            </div>
          )}
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
            </div>
          </div>
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
            <p className="mb-3 text-sm font-bold text-slate-700">Запись на пробный урок</p>
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
            <div className="mt-3 flex gap-2">
              <button
                onClick={submitTrial}
                disabled={busy || !trialForm.date}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-40"
              >
                {busy ? "Сохранение…" : "Записать"}
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
              {allTeachers.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500">Педагог</span>
                  <select
                    value={transferForm.teacherId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, teacherId: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">Не назначен</option>
                    {allTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
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

        {/* Форма: продать абонемент */}
        {panel === "sell" && onSellSubscription && (
          <SellSubscriptionPanel
            student={student}
            group={group}
            branch={branch}
            plans={plans}
            onClose={() => setPanel(null)}
            onSubmit={onSellSubscription}
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
            />
          )}
          {tab === "subscriptions" && (
            <SubscriptionsTab
              student={student}
              onSell={(canSell || onOpenPayment) ? handleSellClick : undefined}
              onOpenSub={setOpenSub}
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
          {tab === "family" && <FamilyTab student={student} />}
        </div>
      </div>

      {openSub && (
        <SubscriptionDetailModal
          subscription={openSub}
          student={student}
          branch={branch}
          group={group}
          onClose={() => setOpenSub(null)}
        />
      )}
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
}: {
  student: Student;
  branch?: Branch;
  subscription?: Student["subscriptions"][number];
  onOpenSub?: (sub: Subscription) => void;
}) {
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

const SELL_METHODS: { label: string; value: SellSubscriptionInput["method"] }[] = [
  { label: "Наличные", value: "cash" },
  { label: "Kaspi Pay", value: "kaspi" },
  { label: "Kaspi перевод", value: "kaspi" },
  { label: "Банковская карта", value: "card" },
  { label: "Безналичный расчёт", value: "transfer" },
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
  onClose,
}: {
  student: Student;
  group?: Group;
  branch?: Branch;
  plans: SubscriptionPlan[];
  onSubmit: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
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
  const [startDate, setStartDate] = useState(isoOf(new Date()));
  const [enabledDays, setEnabledDays] = useState<Record<number, boolean>>(
    () => Object.fromEntries(scheduleDayNums.map((d) => [d, true]))
  );
  const [disabledDates, setDisabledDates] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<null | "save" | "sell">(null);
  const [error, setError] = useState<string | null>(null);

  const plan = activePlans.find((p) => p.id === planId);
  const basePrice = plan?.price || 0;
  const targetLessons = plan?.lessonsCount && plan.lessonsCount > 0 ? plan.lessonsCount : 12;

  // Генерируем даты занятий вперёд от стартовой по выбранным дням недели до нужного количества.
  const candidates = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const days = SELL_WEEKDAYS.filter((w) => enabledDays[w.d]).map((w) => w.d);
    if (days.length === 0 || !startDate) return out;
    const [y, m, d] = startDate.split("-").map(Number);
    const cursor = new Date(y, (m || 1) - 1, d || 1);
    let guard = 0;
    while (out.length < targetLessons && guard < 400) {
      if (days.includes(cursor.getDay())) {
        out.push({ key: isoOf(cursor), label: ddmm(cursor) });
      }
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    return out;
  }, [enabledDays, startDate, targetLessons]);

  const activeDates = candidates.filter((c) => !disabledDates[c.key]);
  const lessonsTotal = activeDates.length;
  const startsOn = activeDates[0]?.key || startDate;
  const endsOn = activeDates[activeDates.length - 1]?.key || startDate;

  const disc = SELL_DISCOUNTS[discountIdx];
  const discountAmount =
    disc.kind === "custom"
      ? Math.max(0, Math.round(customDiscount) || 0)
      : disc.kind === "pct"
      ? Math.round((basePrice * (disc.pct || 0)) / 100)
      : 0;
  const recalcAmount = Math.max(0, Math.round(recalc) || 0);
  const finalPrice = Math.max(0, basePrice - discountAmount - recalcAmount);

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
    setError(null);
    setBusy(paid ? "sell" : "save");
    try {
      const ok = await onSubmit({
        studentId: student.id,
        branchId: student.branchId,
        groupId: student.groupIds?.[0],
        planId: plan.id,
        startsOn,
        endsOn,
        lessonsTotal,
        price: finalPrice,
        discountAmount,
        recalc: recalcAmount,
        method: SELL_METHODS[methodIdx].value,
        description: `Абонемент: ${plan.name}`,
        paid,
      });
      if (ok !== false) onClose();
      else setError("Не удалось сохранить абонемент");
    } catch (e: any) {
      setError(e?.message || "Не удалось сохранить абонемент");
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
          {/* Параметры */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Тип абонемента</span>
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
                <input type="number" min={0} value={customDiscount} onChange={(e) => setCustomDiscount(Number(e.target.value))} className={fieldCls} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Перерасчёт (вычтется из цены)</span>
              <input type="number" min={0} step={500} value={recalc} onChange={(e) => setRecalc(Number(e.target.value))} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">Дата начала</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldCls} />
            </label>
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
            {candidates.length > 0 && (
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

          {/* Сводка */}
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
              <SellRow k="Дата начала" v={ddmmyyyyFromIso(startsOn)} />
              <SellRow k="Дата окончания" v={ddmmyyyyFromIso(endsOn)} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t-2 border-violet-200/60 pt-3">
              <span className="text-sm font-black text-slate-700">Итоговая цена</span>
              <span className="text-xl font-black text-violet-700">{money(finalPrice)}</span>
            </div>
          </div>

          {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p>}

          {/* Кнопки */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => submit(true)}
              disabled={busy !== null}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-40"
            >
              {busy === "sell" ? "Продаём…" : "Продать абонемент"}
            </button>
            <button
              onClick={() => submit(false)}
              disabled={busy !== null}
              className="rounded-xl border border-violet-300 bg-white px-5 py-2.5 text-sm font-bold text-violet-600 transition hover:bg-violet-50 disabled:opacity-40"
            >
              {busy === "save" ? "Сохраняем…" : "Сохранить счёт"}
            </button>
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
  onClose,
}: {
  subscription: Subscription;
  student: Student;
  branch?: Branch;
  group?: Group;
  onClose: () => void;
}) {
  const s = subscription;
  const used = Math.max(0, (s.lessonsTotal || 0) - (s.lessonsLeft || 0));
  const pct = s.lessonsTotal > 0 ? Math.round((used / s.lessonsTotal) * 100) : 0;
  const statusLabel =
    s.status === "active" ? "Активный" : s.status === "suspended" ? "Приостановлен" : "Истёк";
  const statusCls =
    s.status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : s.status === "suspended"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-200 text-slate-500";
  const fmt = (iso?: string) => (iso ? ddmmyyyyFromIso(iso) : "—");

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

          <div className="mt-4 flex justify-end">
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

function SubscriptionsTab({
  student,
  onSell,
  onOpenSub,
}: {
  student: Student;
  onSell?: () => void;
  onOpenSub?: (sub: Subscription) => void;
}) {
  const subs = student.subscriptions || [];
  return (
    <div>
      <SectionHeader title="Абонементы" action="Продать" onAction={onSell} />
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
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {sub.status === "active" ? "Активный" : "Неактивный"}
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
  return (
    <div>
      <SectionHeader title="Комментарии" />
      {notes.length === 0 ? (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-400">
          Комментариев пока нет.
        </p>
      ) : (
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
