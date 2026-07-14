import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlarmClock,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  Coins,
  DoorOpen,
  PhoneCall,
  Play,
  Receipt,
  ShoppingBag,
  Shirt,
  Sparkles,
  Square,
  Users,
  WalletCards,
} from "lucide-react";
import type { Announcement, Branch, Group, Payment, Student, Teacher, AdminTask } from "../types";

// «Сегодня» по Алматы (sv-SE → YYYY-MM-DD), как в остальном приложении. См. [[echo-gor-timezone-dates]].
function almatyDateStr(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
}
function almatyTimeStr(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Almaty",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
function almatyHumanDate(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Almaty",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}
function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", hour12: false }).format(new Date())
  );
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₸`;
}

// --- Локальное состояние смены (до появления бэкенда сверки кассы) ---
// Ключ привязан к филиалу и дате: переоткрытие страницы помнит статус и галочки.
type ShiftState = { openedAt?: string; closedAt?: string; done: Record<string, boolean> };
const emptyShift: ShiftState = { done: {} };

function shiftKey(branchId: string) {
  return `echo:admin-shift:${branchId || "_"}:${almatyDateStr()}`;
}
function loadShift(branchId: string): ShiftState {
  if (typeof window === "undefined") return { ...emptyShift };
  try {
    const raw = window.localStorage.getItem(shiftKey(branchId));
    if (!raw) return { ...emptyShift };
    const parsed = JSON.parse(raw);
    return { done: {}, ...parsed };
  } catch {
    return { ...emptyShift };
  }
}
function saveShift(branchId: string, state: ShiftState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(shiftKey(branchId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

type Props = {
  branch?: Branch;
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers: Teacher[];
  payments: Payment[];
  scheduleItems?: any[];
  tasks?: AdminTask[];
  announcements?: Announcement[];
  todayRevenue: number;
  monthRevenue: number;
  debt: number;
  renewals: Student[];
  onNavigate?: (tab: string) => void;
};

export function AdminShiftView({
  branch,
  branches,
  groups,
  students,
  teachers,
  payments,
  scheduleItems = [],
  tasks = [],
  announcements = [],
  todayRevenue,
  monthRevenue,
  debt,
  renewals,
  onNavigate,
}: Props) {
  const branchName = branch?.name || branches[0]?.name || "филиал";
  const branchId = branch?.id || branches[0]?.id || "";

  const [shift, setShift] = useState<ShiftState>(() => loadShift(branchId));
  useEffect(() => {
    setShift(loadShift(branchId));
  }, [branchId]);
  const update = (patch: Partial<ShiftState>) => {
    setShift((prev) => {
      const next = { ...prev, ...patch, done: patch.done ?? prev.done };
      saveShift(branchId, next);
      return next;
    });
  };
  const toggleDone = (key: string) =>
    update({ done: { ...shift.done, [key]: !shift.done[key] } });

  const shiftOpen = Boolean(shift.openedAt) && !shift.closedAt;
  const shiftClosed = Boolean(shift.closedAt);

  const openShift = () => update({ openedAt: almatyTimeStr(), closedAt: undefined });
  const closeShift = () => update({ closedAt: almatyTimeStr() });

  // Заявки ЭхоБаксов, ожидающие обработки (для показателя и очереди дел).
  const [echoPending, setEchoPending] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/shop/echo/orders", { headers: { "x-demo-role": "admin" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.orders) return;
        const pending = d.orders.filter((o: any) => (o.status || "pending") === "pending").length;
        setEchoPending(pending);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const today = almatyDateStr();

  // Занятия сегодня (кого встречать / консультировать).
  const lessonsToday = useMemo(() => {
    const items = (scheduleItems || []).filter((i: any) => {
      const d = String(i?.date || i?.day || "").slice(0, 10);
      return !d || d === today;
    });
    return items
      .map((i: any) => {
        const group = groups.find((g) => g.id === (i.groupId || i.group_id));
        const teacher = teachers.find((t) => t.id === (i.teacherId || i.teacher_id));
        return {
          time: String(i.time || i.startsAt || i.start || "").match(/\d{1,2}:\d{2}/)?.[0] || "",
          group: group?.name || i.groupName || "Группа",
          hall: i.hallName || i.hall || "",
          teacher: teacher?.name || i.teacherName || "",
          isTrial: Boolean(i.isTrial || i.type === "trial"),
        };
      })
      .sort((a: any, b: any) => a.time.localeCompare(b.time));
  }, [scheduleItems, groups, teachers, today]);

  const trialsToday = useMemo(() => {
    const fromSchedule = lessonsToday.filter((l) => l.isTrial).length;
    const fromStudents = students.filter((s) => (s as any).isTrial).length;
    return Math.max(fromSchedule, fromStudents);
  }, [lessonsToday, students]);

  const debtors = useMemo(
    () => students.filter((s) => s.balance < 0).sort((a, b) => a.balance - b.balance),
    [students]
  );

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== "done" && (t.status as any) !== "completed"),
    [tasks]
  );

  // --- Показатели смены ---
  const metrics = [
    { label: "Касса сегодня", value: money(todayRevenue), hint: "принято за смену", tone: "gold", icon: WalletCards, tab: "billing" },
    { label: "Выручка месяца", value: money(monthRevenue), hint: "нарастающим итогом", tone: "white", icon: Receipt, tab: "reports" },
    { label: "Долги", value: money(debt), hint: `${debtors.length} учеников`, tone: debt > 0 ? "rose" : "emerald", icon: BadgePercent, tab: "billing" },
    { label: "Продления", value: renewals.length, hint: "заканчиваются", tone: renewals.length ? "amber" : "emerald", icon: Clock, tab: "billing" },
    { label: "Пробные сегодня", value: trialsToday, hint: "встретить и записать", tone: "sky", icon: CalendarDays, tab: "calendar" },
    { label: "Заявки ЭхоБаксов", value: echoPending === null ? "…" : echoPending, hint: "к выдаче", tone: echoPending ? "gold" : "white", icon: Coins, tab: "products" },
    { label: "Прокат костюмов", value: "—", hint: "модуль скоро", tone: "muted", icon: Shirt, tab: "" },
    { label: "Посетители", value: students.length, hint: "активная база", tone: "white", icon: Users, tab: "visitors" },
  ];

  // --- Стандарты смены (чек-лист) ---
  // done — что администратор отметил вручную; open/close смены закрывают крайние пункты автоматически.
  const standards = [
    {
      key: "open",
      icon: DoorOpen,
      tone: "emerald",
      title: "Открыть смену",
      sub: shift.openedAt ? `открыта в ${shift.openedAt}` : "отметьте начало работы",
      done: Boolean(shift.openedAt),
      auto: true,
      onClick: () => (shiftOpen || shiftClosed ? undefined : openShift()),
    },
    {
      key: "halls",
      icon: Sparkles,
      tone: "sky",
      title: "Проверить залы",
      sub: "чистота и готовность · модуль скоро",
      done: Boolean(shift.done.halls),
      onClick: () => toggleDone("halls"),
    },
    {
      key: "debtors",
      icon: PhoneCall,
      tone: debtors.length ? "rose" : "emerald",
      title: "Обзвонить должников",
      sub: debtors.length ? `${debtors.length} · на ${money(debt)}` : "долгов нет",
      badge: debtors.length || undefined,
      done: Boolean(shift.done.debtors),
      action: "Список",
      onClick: () => onNavigate?.("billing"),
    },
    {
      key: "merch",
      icon: ShoppingBag,
      tone: "amber",
      title: "Остатки мерча",
      sub: "проверить и выдать заказы",
      done: Boolean(shift.done.merch),
      action: "Открыть",
      onClick: () => onNavigate?.("products"),
    },
    {
      key: "costumes",
      icon: Shirt,
      tone: "indigo",
      title: "Прокат костюмов",
      sub: "выдача и возвраты · модуль скоро",
      done: Boolean(shift.done.costumes),
      onClick: () => toggleDone("costumes"),
    },
    {
      key: "close",
      icon: WalletCards,
      tone: "gold",
      title: "Свести и закрыть кассу",
      sub: shift.closedAt ? `закрыта в ${shift.closedAt}` : shiftOpen ? "в конце смены" : "сначала откройте смену",
      done: Boolean(shift.closedAt),
      auto: true,
      onClick: () => (shiftOpen ? closeShift() : undefined),
    },
  ];

  const doneCount = standards.filter((s) => s.done).length;

  const toneText: Record<string, string> = {
    gold: "text-[#C5A059]",
    white: "text-white",
    rose: "text-rose-400",
    amber: "text-amber-400",
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    muted: "text-slate-500",
  };
  const toneBg: Record<string, string> = {
    gold: "bg-[#C5A059]/10 text-[#C5A059]",
    white: "bg-white/10 text-white",
    rose: "bg-rose-400/10 text-rose-400",
    amber: "bg-amber-400/10 text-amber-400",
    sky: "bg-sky-400/10 text-sky-400",
    emerald: "bg-emerald-400/10 text-emerald-400",
    indigo: "bg-indigo-400/10 text-indigo-400",
    muted: "bg-white/5 text-slate-500",
  };

  return (
    <div className="space-y-5">
      {/* Hero: приветствие + статус смены + касса */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <div className="absolute right-[-90px] top-[-90px] h-80 w-80 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_340px] xl:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">
              {almatyHumanDate()} · {branchName}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-white md:text-3xl" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {greeting()}! Смена администратора
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                  shiftOpen
                    ? "bg-emerald-400/15 text-emerald-300"
                    : shiftClosed
                    ? "bg-white/10 text-slate-300"
                    : "bg-amber-400/15 text-amber-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${shiftOpen ? "bg-emerald-400" : shiftClosed ? "bg-slate-400" : "bg-amber-400"}`} />
                {shiftOpen ? "Смена открыта" : shiftClosed ? "Смена закрыта" : "Смена не открыта"}
              </span>
              {shift.openedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                  <Clock className="h-3 w-3" /> {shift.openedAt}
                  {shift.closedAt ? ` – ${shift.closedAt}` : ""}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                <ClipboardCheck className="h-3 w-3" /> стандарты {doneCount}/{standards.length}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-[#C5A059]/25 bg-black/40 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Касса смены</p>
            <p className="mt-1 text-3xl font-black text-[#C5A059]">{money(todayRevenue)}</p>
            {!shiftOpen && !shiftClosed && (
              <button
                onClick={openShift}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-400"
              >
                <Play className="h-4 w-4" /> Открыть смену
              </button>
            )}
            {shiftOpen && (
              <button
                onClick={closeShift}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black transition hover:bg-[#d4b06a]"
              >
                <WalletCards className="h-4 w-4" /> Свести и закрыть смену
              </button>
            )}
            {shiftClosed && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm font-black text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Смена сведена
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Показатели смены */}
      <section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            const clickable = Boolean(m.tab);
            return (
              <button
                key={m.label}
                onClick={() => clickable && onNavigate?.(m.tab)}
                disabled={!clickable}
                className={`flex flex-col rounded-2xl border border-white/10 bg-[#0F0F0F] p-4 text-left transition ${
                  clickable ? "hover:border-white/20" : "cursor-default opacity-90"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneBg[m.tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className={`mt-3 text-xl font-black ${toneText[m.tone] || "text-white"}`}>{m.value}</span>
                <span className="mt-0.5 text-[11px] font-bold text-slate-300">{m.label}</span>
                <span className="text-[10px] text-slate-500">{m.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Стандарты смены (чек-лист) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Стандарты смены сегодня</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">отмечайте по мере выполнения</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {standards.map((s) => {
            const Icon = s.icon;
            const CheckIcon = s.done ? CheckCircle2 : s.auto ? Circle : Square;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${
                  s.done ? "border-emerald-400/30 bg-emerald-400/[0.05]" : "border-white/10 bg-[#141414]"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneBg[s.tone]}`}>
                  <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-white">{s.title}</span>
                    {s.badge ? (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300">{s.badge}</span>
                    ) : null}
                  </div>
                  <div className="truncate text-[10px] leading-tight text-slate-500">{s.sub}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {s.action && (
                    <button
                      onClick={s.onClick}
                      className="inline-flex items-center gap-0.5 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-bold text-[#C5A059] hover:bg-white/10"
                    >
                      {s.action} <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={s.onClick}
                    title={s.done ? "Выполнено" : "Отметить"}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                      s.done ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Очередь дел смены */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Сегодня в зале */}
        <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black text-white">
              <CalendarDays className="h-4 w-4 text-sky-400" /> Сегодня в зале
            </h3>
            <button onClick={() => onNavigate?.("calendar")} className="text-[11px] font-bold text-[#C5A059] hover:underline">
              Расписание
            </button>
          </div>
          {lessonsToday.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Занятий на сегодня нет</p>
          ) : (
            <ul className="space-y-2">
              {lessonsToday.slice(0, 6).map((l, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="w-12 shrink-0 text-sm font-black text-white">{l.time || "—"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-200">{l.group}</span>
                      {l.isTrial && (
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-sky-300">пробное</span>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {[l.teacher, l.hall].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Задачи от руководителя */}
        <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black text-white">
              <ClipboardCheck className="h-4 w-4 text-[#C5A059]" /> Задачи смены
            </h3>
            <button onClick={() => onNavigate?.("tasks")} className="text-[11px] font-bold text-[#C5A059] hover:underline">
              Все задачи
            </button>
          </div>
          {openTasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Открытых задач нет</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-200">{t.title}</div>
                    {(t as any).priority === "high" && (
                      <span className="text-[10px] font-bold text-rose-400">важно</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Объявления (компактно) */}
      {announcements.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0F0F0F] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <AlarmClock className="h-4 w-4 text-amber-400" /> Объявления
          </h3>
          <ul className="space-y-2">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                <div className="text-sm font-bold text-slate-200">{a.title}</div>
                <div className="line-clamp-1 text-[11px] text-slate-500">{a.content}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default AdminShiftView;
