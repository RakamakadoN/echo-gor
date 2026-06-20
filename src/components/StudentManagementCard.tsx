/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentManagementCard — единая «светлая» карточка управления учеником.
 * Открывается по тапу на ученика во всех кабинетах (Администратор,
 * Руководитель филиала, Владелец, Преподаватель). Дизайн — светлая CRM-карточка:
 * шапка с аватаром и статусом, ряд действий, вкладки, блок «Текущий абонемент».
 */
import React, { useState } from "react";
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
} from "lucide-react";
import { Branch, Group, Student, Teacher } from "../types";

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
  onSellSubscription?: () => void;
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
  onSellSubscription,
  onTrial,
  onTransfer,
}: StudentManagementCardProps) {
  const [tab, setTab] = useState<TabId>("general");
  const [panel, setPanel] = useState<null | "trial" | "transfer">(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [trialForm, setTrialForm] = useState({ date: "", time: "", note: "" });
  const [transferForm, setTransferForm] = useState({
    groupId: student.groupIds?.[0] || "",
    branchId: student.branchId || "",
    teacherId: student.teacherId || "",
  });

  const sellHandler = onSellSubscription || onOpenPayment;

  const togglePanel = (next: "trial" | "transfer") => {
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
          {sellHandler && (
            <button
              onClick={() => sellHandler()}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600"
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
            />
          )}
          {tab === "subscriptions" && (
            <SubscriptionsTab student={student} onSell={onSellSubscription || onOpenPayment} />
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
}: {
  student: Student;
  branch?: Branch;
  subscription?: Student["subscriptions"][number];
}) {
  return (
    <div>
      <SectionHeader title="Текущий абонемент" action="Все абонементы" />
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:grid-cols-4">
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

function SubscriptionsTab({
  student,
  onSell,
}: {
  student: Student;
  onSell?: () => void;
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
          <div
            key={sub.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-bold text-slate-800">{sub.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                до {sub.validUntil} · осталось {sub.lessonsLeft}/{sub.lessonsTotal} занятий
              </p>
            </div>
            <div className="text-right">
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
          </div>
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
