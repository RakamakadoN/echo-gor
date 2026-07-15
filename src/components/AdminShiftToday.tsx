import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  BadgePercent,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  Coins,
  DoorOpen,
  Loader2,
  PhoneCall,
  Play,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Shirt,
  Sparkles,
  Square,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { Announcement, Branch, Group, Payment, Student, Teacher, AdminTask } from "../types";
import { CostumeOverdueBanner } from "./CostumeOverdueBanner";
import { toast } from "../toast";

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

// Сжатие фото перед отправкой (как в контроле прихода педагога).
async function compressImage(file: File, max = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

// Статус смены с бэкенда.
type ShiftStatus = {
  openedAt: string | null;
  closedAt: string | null;
  openPhoto: string | null;
  closePhoto: string | null;
  hallPhotos: { time: string; hall: string | null; photo: string }[];
  expectedCash?: number | null;
  countedCash?: number | null;
  cashDiff?: number | null;
  cashStatus?: string | null;
  cashReason?: string | null;
  cashClosedBy?: string | null;
} | null;

type ShiftSummary = {
  subscriptions: { count: number; sum: number };
  merch: { count: number; sum: number };
  costumes: { count: number; sum: number };
  byMethod: Record<string, number>;
  total: number;
};

// Ручные галочки (без фото) — в localStorage по филиалу/дате.
function ticksKey(branchId: string) {
  return `echo:admin-shift-ticks:${branchId || "_"}:${almatyDateStr()}`;
}
function loadTicks(branchId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ticksKey(branchId)) || "{}");
  } catch {
    return {};
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

  const [shift, setShift] = useState<ShiftStatus>(null);
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => loadTicks(branchId));
  const [photoModal, setPhotoModal] = useState<null | { action: "open" | "hall"; title: string; hint: string }>(null);
  const [closeOpen, setCloseOpen] = useState(false);

  useEffect(() => {
    // Локальный кэш — мгновенно; серверные галочки перекроют ниже (аудит #31).
    setTicks(loadTicks(branchId));
  }, [branchId]);

  // Подтянуть статус смены на сегодня (вместе с чек-листом с сервера).
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/admin/shift/today", { headers: { "x-demo-role": "admin" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) {
          setShift(d.shift ?? null);
          if (d.shift?.checklist && typeof d.shift.checklist === "object") setTicks(d.shift.checklist);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggleTick = (key: string) => {
    setTicks((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Локальный кэш — офлайн-резерв; основное хранение на сервере (руководство видит).
      try { window.localStorage.setItem(ticksKey(branchId), JSON.stringify(next)); } catch { /* ignore quota */ }
      fetch("/api/mvp/admin/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "admin" },
        body: JSON.stringify({ action: "tick", item: key, value: next[key] }),
      }).catch(() => { /* офлайн — останется локальный кэш */ });
      return next;
    });
  };

  const shiftOpen = Boolean(shift?.openedAt) && !shift?.closedAt;
  const shiftClosed = Boolean(shift?.closedAt);
  const hallsDone = (shift?.hallPhotos?.length || 0) > 0;

  // Заявки ЭхоБаксов, ожидающие обработки.
  const [echoPending, setEchoPending] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/shop/echo/orders", { headers: { "x-demo-role": "admin" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.orders) return;
        setEchoPending(d.orders.filter((o: any) => (o.status || "pending") === "pending").length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Костюмы, сейчас в прокате (не возвращены).
  const [rentedCount, setRentedCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/costumes", { headers: { "x-demo-role": "admin" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.rentals) return;
        setRentedCount(d.rentals.filter((x: any) => x.status === "active").length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const today = almatyDateStr();

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

  // Отправить фото-действие смены на бэкенд. Возвращает true при успехе.
  const submitPhoto = async (action: "open" | "hall", photo: string): Promise<boolean> => {
    if (!photo) return false; // страховка: без фото не подтверждаем
    const res = await fetch("/api/mvp/admin/shift", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-role": "admin" },
      body: JSON.stringify({ action, photo, time: almatyTimeStr() }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error(e.error || "Не удалось сохранить"); return false; }
    const d = await res.json();
    setShift(d.shift ?? null);
    toast.success(action === "open" ? "Смена открыта" : "Фото зала добавлено");
    return true;
  };

  const metrics = [
    { label: "Касса за смену", value: money(todayRevenue), hint: "принято сегодня", tone: "gold", icon: WalletCards, tab: "reports" },
    { label: "Пробные сегодня", value: trialsToday, hint: "встретить и записать", tone: "sky", icon: CalendarDays, tab: "calendar" },
    { label: "Заявки ЭхоБаксов", value: echoPending === null ? "…" : echoPending, hint: "к выдаче", tone: echoPending ? "gold" : "white", icon: Coins, tab: "echo" },
    { label: "Костюмы в прокате", value: rentedCount === null ? "…" : rentedCount, hint: "выдано · вернуть", tone: rentedCount ? "indigo" : "white", icon: Shirt, tab: "prokat" },
    { label: "Посетители", value: students.length, hint: "активная база", tone: "white", icon: Users, tab: "visitors" },
  ];

  const standards = [
    {
      key: "open",
      icon: DoorOpen,
      tone: "emerald",
      title: "Открыть смену",
      sub: shift?.openedAt ? `фото · открыта в ${shift.openedAt}` : "фото на рабочем месте",
      done: Boolean(shift?.openedAt),
      action: shift?.openedAt ? undefined : "Фото",
      onClick: () =>
        shift?.openedAt ? undefined : setPhotoModal({ action: "open", title: "Открыть смену", hint: "Сделайте фото на рабочем месте — приход на смену" }),
    },
    {
      key: "halls",
      icon: Sparkles,
      tone: hallsDone ? "emerald" : "sky",
      title: "Проверить залы",
      sub: hallsDone ? `${shift?.hallPhotos.length} фото загружено` : "фото чистых залов",
      badge: shift?.hallPhotos.length || undefined,
      done: hallsDone,
      action: "Фото",
      onClick: () => setPhotoModal({ action: "hall", title: "Фото зала", hint: "Сфотографируйте чистый и готовый зал" }),
    },
    {
      key: "merch",
      icon: ShoppingBag,
      tone: "amber",
      title: "Остатки мерча",
      sub: "проверить и выдать заказы",
      done: Boolean(ticks.merch),
      action: "Открыть",
      onClick: () => onNavigate?.("products"),
      onCheck: () => toggleTick("merch"),
    },
    {
      key: "costumes",
      icon: Shirt,
      tone: rentedCount ? "indigo" : "emerald",
      title: "Прокат костюмов",
      sub: rentedCount ? `${rentedCount} в прокате · вернуть` : "выдача и возвраты",
      badge: rentedCount || undefined,
      done: Boolean(ticks.costumes),
      action: "Открыть",
      onClick: () => onNavigate?.("prokat"),
      onCheck: () => toggleTick("costumes"),
    },
    {
      key: "close",
      icon: WalletCards,
      tone: "gold",
      title: "Свести и закрыть кассу",
      sub: shift?.closedAt
        ? shift.cashStatus === "mismatch"
          ? `закрыта в ${shift.closedAt} · расхождение`
          : `закрыта в ${shift.closedAt} · деньги сошлись`
        : shiftOpen ? "сверить продажи и закрыть" : "сначала откройте смену",
      done: Boolean(shift?.closedAt),
      action: shiftOpen ? "Свести" : undefined,
      onClick: () => (shiftOpen ? setCloseOpen(true) : undefined),
    },
  ];

  const doneCount = standards.filter((s) => s.done).length;

  const toneText: Record<string, string> = {
    gold: "text-[#C5A059]", white: "text-white", rose: "text-rose-400", amber: "text-amber-400",
    sky: "text-sky-400", emerald: "text-emerald-400", indigo: "text-indigo-400", muted: "text-slate-500",
  };
  const toneBg: Record<string, string> = {
    gold: "bg-[#C5A059]/10 text-[#C5A059]", white: "bg-white/10 text-white", rose: "bg-rose-400/10 text-rose-400",
    amber: "bg-amber-400/10 text-amber-400", sky: "bg-sky-400/10 text-sky-400", emerald: "bg-emerald-400/10 text-emerald-400",
    indigo: "bg-indigo-400/10 text-indigo-400", muted: "bg-white/5 text-slate-500",
  };

  const photoStrip = [
    shift?.openPhoto ? { label: `Приход ${shift.openedAt || ""}`, photo: shift.openPhoto } : null,
    ...(shift?.hallPhotos || []).map((h) => ({ label: `Зал ${h.time}`, photo: h.photo })),
    shift?.closePhoto ? { label: `Уход ${shift.closedAt || ""}`, photo: shift.closePhoto } : null,
  ].filter(Boolean) as { label: string; photo: string }[];

  return (
    <div className="space-y-5">
      {/* Уведомление о просроченных костюмах — только если есть */}
      <CostumeOverdueBanner role="admin" onOpen={() => onNavigate?.("prokat")} />

      {/* Hero */}
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
                  shiftOpen ? "bg-emerald-400/15 text-emerald-300" : shiftClosed ? "bg-white/10 text-slate-300" : "bg-amber-400/15 text-amber-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${shiftOpen ? "bg-emerald-400" : shiftClosed ? "bg-slate-400" : "bg-amber-400"}`} />
                {shiftOpen ? "Смена открыта" : shiftClosed ? "Смена закрыта" : "Смена не открыта"}
              </span>
              {shift?.openedAt && (
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
            <p className="mt-1 text-3xl font-black tabular-nums text-[#C5A059]">{money(todayRevenue)}</p>
            {!shiftOpen && !shiftClosed && (
              <button
                onClick={() => setPhotoModal({ action: "open", title: "Открыть смену", hint: "Сделайте фото на рабочем месте — приход на смену" })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-400"
              >
                <Play className="h-4 w-4" /> Открыть смену
              </button>
            )}
            {shiftOpen && (
              <button
                onClick={() => setCloseOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black transition hover:bg-[#d4b06a]"
              >
                <WalletCards className="h-4 w-4" /> Свести и закрыть смену
              </button>
            )}
            {shiftClosed && (
              <div className={`mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${
                shift?.cashStatus === "mismatch" ? "bg-rose-500/15 text-rose-300" : "bg-white/5 text-emerald-300"
              }`}>
                <CheckCircle2 className="h-4 w-4" />
                {shift?.cashStatus === "mismatch" ? "Закрыта · расхождение кассы" : "Смена закрыта · деньги сошлись"}
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

      {/* Стандарты смены */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Стандарты смены сегодня</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">приход/уход/залы — по фото</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {standards.map((s) => {
            const Icon = s.icon;
            const hasManualCheck = Boolean((s as any).onCheck);
            const CheckIcon = s.done ? CheckCircle2 : hasManualCheck ? Square : Circle;
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
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black text-white">{s.badge}</span>
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
                      {s.action === "Фото" && <Camera className="h-3 w-3" />}
                      {s.action} {s.action !== "Фото" && <ChevronRight className="h-3 w-3" />}
                    </button>
                  )}
                  {hasManualCheck && (
                    <button
                      onClick={(s as any).onCheck}
                      title={s.done ? "Выполнено" : "Отметить"}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                        s.done ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  )}
                  {!hasManualCheck && s.done && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Фотоотчёт смены */}
      {photoStrip.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0F0F0F] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Camera className="h-4 w-4 text-[#C5A059]" /> Фотоотчёт смены
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {photoStrip.map((p, i) => (
              <div key={i} className="shrink-0">
                <img src={p.photo} alt={p.label} className="h-24 w-24 rounded-xl border border-white/10 object-cover" />
                <div className="mt-1 w-24 truncate text-center text-[10px] text-slate-400">{p.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Очередь дел смены */}
      <section>
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
                    <div className="truncate text-[10px] text-slate-500">{[l.teacher, l.hall].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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

      {photoModal && (
        <PhotoCaptureModal
          title={photoModal.title}
          hint={photoModal.hint}
          onClose={() => setPhotoModal(null)}
          onSubmit={async (photo) => {
            const ok = await submitPhoto(photoModal.action, photo);
            if (ok) setPhotoModal(null); // при ошибке модалка остаётся — можно переснять и повторить
          }}
        />
      )}

      {closeOpen && (
        <CloseShiftModal
          onClose={() => setCloseOpen(false)}
          onDone={(s) => { setShift(s); setCloseOpen(false); }}
        />
      )}
    </div>
  );
}

// Модалка закрытия смены: показывает продажи за день (абонементы+мерч+прокат) и
// требует подтверждения «деньги сошлись / не сошлись». Расхождение видят руководители.
function CloseShiftModal({ onClose, onDone }: { onClose: () => void; onDone: (shift: ShiftStatus) => void }) {
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mismatch, setMismatch] = useState(false);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Аудит #7: раньше при сбое загрузки сводки summary оставался null → вечный спиннер,
  // и смену нельзя было закрыть. Теперь — явная ошибка и кнопка «Повторить».
  const loadSummary = React.useCallback(() => {
    setLoading(true);
    setLoadErr(null);
    let alive = true;
    fetch("/api/mvp/admin/shift/summary", { headers: { "x-demo-role": "admin" } })
      .then(async (r) => {
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "Сервер не отдал сводку"); }
        return r.json();
      })
      .then((d) => { if (alive) { setSummary(d); setLoading(false); } })
      .catch((e) => { if (alive) { setLoadErr(e?.message || "Нет связи с сервером"); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => { const cancel = loadSummary(); return cancel; }, [loadSummary]);

  const methodLabels: Record<string, string> = { cash: "Наличные", kaspi: "Kaspi", card: "Карта", transfer: "Перевод" };

  async function submit(matched: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/mvp/admin/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "admin" },
        body: JSON.stringify({ action: "close", matched, countedCash: counted === "" ? null : Number(counted), cashReason: reason || null }),
      });
      if (res.ok) { const d = await res.json(); toast.success(matched ? "Смена закрыта · деньги сошлись" : "Смена закрыта · расхождение передано руководителю"); onDone(d.shift ?? null); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Не удалось закрыть смену"); }
    } catch { toast.error("Ошибка сети при закрытии"); } finally {
      setBusy(false);
    }
  }

  const total = summary?.total ?? 0;

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0F0F0F] p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-black text-white">
            <WalletCards className="h-4 w-4 text-[#C5A059]" /> Сверка кассы и закрытие
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : loadErr ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-semibold text-rose-300">{loadErr}</p>
            <p className="text-xs text-slate-500">Не удалось загрузить сводку кассы за смену.</p>
            <button onClick={loadSummary} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
              <RefreshCw className="h-4 w-4" /> Повторить
            </button>
          </div>
        ) : !summary ? (
          <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-400">Продажи за смену по данным СРМ. Сверьте с фактической кассой.</p>
            <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <Row label="Абонементы" v={summary.subscriptions} />
              <Row label="Товары и мерч" v={summary.merch} />
              <Row label="Прокат костюмов" v={summary.costumes} />
              <div className="my-1 border-t border-white/10" />
              {Object.entries(summary.byMethod).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs text-slate-400"><span>{methodLabels[k] || k}</span><span>{money(Number(v))}</span></div>
              ))}
              <div className="mt-1 flex justify-between border-t border-white/10 pt-2 text-base font-black text-[#C5A059]">
                <span>Итого в СРМ</span><span>{money(total)}</span>
              </div>
            </div>

            {!mismatch ? (
              <div className="mt-4 space-y-2">
                <button onClick={() => submit(true)} disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-400 disabled:opacity-40">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Деньги сошлись — закрыть смену
                </button>
                <button onClick={() => setMismatch(true)} disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/40 px-4 py-3 text-sm font-black text-rose-300 transition hover:bg-rose-400/10">
                  Не сошлись
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">
                  Расхождение увидят владелец и управляющий. Укажите фактическую сумму и причину.
                </div>
                <input type="number" inputMode="numeric" value={counted} onChange={(e) => setCounted(e.target.value)}
                  placeholder="Фактически в кассе, ₸"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#C5A059]/50 focus:outline-none" />
                {counted !== "" && (
                  <div className="flex justify-between px-1 text-xs font-bold">
                    <span className="text-slate-400">Разница</span>
                    <span className={Number(counted) - total < 0 ? "text-rose-400" : "text-amber-400"}>{money(Number(counted) - total)}</span>
                  </div>
                )}
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                  placeholder="Причина расхождения"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#C5A059]/50 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => setMismatch(false)} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5">Назад</button>
                  <button onClick={() => submit(false)} disabled={busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-400 disabled:opacity-40">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Закрыть с расхождением
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: { count: number; sum: number } }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{label} <span className="text-slate-600">· {v.count}</span></span>
      <span className="font-bold text-white">{money(v.sum)}</span>
    </div>
  );
}

// Модалка захвата фото (камера на телефоне / выбор файла), с превью и отправкой.
export function PhotoCaptureModal({
  title,
  hint,
  onClose,
  onSubmit,
}: {
  title: string;
  hint: string;
  onClose: () => void;
  onSubmit: (photo: string) => Promise<void>;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setPhoto(await compressImage(file));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!photo) return;
    setBusy(true);
    try {
      await onSubmit(photo);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0F0F0F] p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-black text-white">
            <Camera className="h-4 w-4 text-[#C5A059]" /> {title}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-400">{hint}</p>

        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />

        {photo ? (
          <div className="relative">
            <img src={photo} alt="фото" className="max-h-72 w-full rounded-2xl border border-white/10 object-cover" />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white hover:bg-black/90"
            >
              Переснять
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 text-slate-400 hover:border-[#C5A059]/40 hover:text-slate-200"
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-7 w-7" />}
            <span className="text-sm font-bold">Сделать фото</span>
          </button>
        )}

        <button
          onClick={submit}
          disabled={!photo || busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black transition hover:bg-[#d4b06a] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Подтвердить
        </button>
      </div>
    </div>
  );
}

export default AdminShiftView;
