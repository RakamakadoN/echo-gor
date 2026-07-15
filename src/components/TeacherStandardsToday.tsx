import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardCheck, CalendarClock, Cake, Coins, CalendarDays, Camera, Presentation,
  ChevronRight, X, Sparkles, Loader2, Send, Copy, Check, Gift, Clock, CheckCircle2, RefreshCw, Mic,
} from "lucide-react";
import type { Student, Group } from "../types";
import { TeacherLessonPlanEditor } from "./TeacherLessonPlanEditor";
import { TeacherLessonSummary } from "./TeacherLessonSummary";

// «Сегодня» по Алматы (sv-SE → YYYY-MM-DD), как в остальном приложении.
function almatyToday(): Date {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const pad = (n: number) => String(n).padStart(2, "0");
const mmddOf = (iso?: string | null) => {
  if (!iso) return null;
  const p = iso.split("-");
  return p.length === 3 ? `${pad(+p[1])}-${pad(+p[2])}` : null;
};
const ageOn = (iso: string, on: Date) => {
  const [y, m, d] = iso.split("-").map(Number);
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age -= 1;
  return age;
};
const waDigits = (phone?: string) => (phone || "").replace(/\D/g, "").replace(/^8/, "7");

type BirthdayItem = { student: Student; age: number; inDays: number; groupName?: string };
type TrialItem = { studentId: string; studentName: string; phone?: string; groupName?: string; time?: string; outcome?: string };

type Props = {
  teacherName: string;
  students?: Student[];
  groups?: Group[];
  scheduleItems?: any[];
  onNavigate?: (tab: string) => void;
  onOpenLessonPlan?: (prompt: string, ctx: any) => void;
  onConfirmArrival?: () => void;
};

export function TeacherStandardsToday({
  teacherName, students = [], groups = [], scheduleItems = [],
  onNavigate, onOpenLessonPlan, onConfirmArrival,
}: Props) {
  const [bdayOpen, setBdayOpen] = useState(false);
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const [arrival, setArrival] = useState<{ time: string; late: boolean } | null>(null);
  const [planKind, setPlanKind] = useState<"lesson" | "open" | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [trialsOpen, setTrialsOpen] = useState(false);

  // Реальные пробные на сегодня.
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/teachers/trials-today", { headers: { "x-demo-role": "teacher" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && Array.isArray(d?.trials)) setTrials(d.trials); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Подтянуть статус прихода на сегодня (если уже отмечен).
  useEffect(() => {
    let alive = true;
    fetch("/api/mvp/teachers/arrival/today", { headers: { "x-demo-role": "teacher" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.arrival) setArrival({ time: d.arrival.time, late: d.arrival.late }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Ожидаемое время прихода = начало первого занятия СЕГОДНЯ.
  // Берём из расписания; если его нет — из групп по дню недели. Нет занятий → null.
  const expectedStart = useMemo(() => {
    const fromSchedule = (scheduleItems || [])
      .map((i: any) => String(i?.time || i?.startsAt || i?.start || "").match(/(\d{1,2}):(\d{2})/))
      .filter(Boolean)
      .map((mm: any) => Number(mm[1]) * 60 + Number(mm[2]));
    if (fromSchedule.length) return Math.min(...fromSchedule);
    const wd = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][almatyToday().getDay()];
    const fromGroups = groups
      .filter((g: any) => Array.isArray(g?.days) && g.days.includes(wd))
      .map((g: any) => String(g?.time || "").match(/(\d{1,2}):(\d{2})/))
      .filter(Boolean)
      .map((mm: any) => Number(mm![1]) * 60 + Number(mm![2]));
    return fromGroups.length ? Math.min(...fromGroups) : null;
  }, [scheduleItems, groups]);
  const hasLessonToday = expectedStart != null;

  const { todayBirthdays, upcoming } = useMemo(() => {
    const today = almatyToday();
    const todayKey = `${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const groupName = (s: Student) => groups.find((g) => s.groupIds?.includes(g.id))?.name;
    const todayBirthdays: BirthdayItem[] = [];
    const upcoming: BirthdayItem[] = [];
    for (const s of students) {
      const key = mmddOf(s.birthday);
      if (!key) continue;
      if (key === todayKey) {
        todayBirthdays.push({ student: s, age: ageOn(s.birthday!, today), inDays: 0, groupName: groupName(s) });
      } else {
        // ближайшие 7 дней
        for (let d = 1; d <= 7; d++) {
          const fut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
          if (`${pad(fut.getMonth() + 1)}-${pad(fut.getDate())}` === key) {
            upcoming.push({ student: s, age: ageOn(s.birthday!, fut), inDays: d, groupName: groupName(s) });
            break;
          }
        }
      }
    }
    upcoming.sort((a, b) => a.inDays - b.inDays);
    return { todayBirthdays, upcoming };
  }, [students, groups]);

  const trialsToday = trials.length;
  const lessonsToday = scheduleItems?.length || groups.length;

  const standards = [
    {
      key: "arrival",
      icon: arrival ? CheckCircle2 : hasLessonToday ? Camera : Clock,
      tone: arrival ? (arrival.late ? "rose" : "emerald") : hasLessonToday ? "amber" : "sky",
      title: "Подтвердить приход",
      sub: arrival
        ? `отмечено в ${arrival.time}${arrival.late ? " · опоздание" : " · вовремя"}`
        : hasLessonToday ? "фото на рабочем месте · вовремя" : "сегодня занятий нет",
      status: arrival ? (arrival.late ? "Поздно" : "Готово") : hasLessonToday ? "Не отмечен" : "Нет занятий",
      action: arrival ? "Изменить" : hasLessonToday ? "Отметить" : "—",
      onClick: () => { if (hasLessonToday || arrival) setArrivalOpen(true); }, highlight: false,
    },
    {
      key: "journal", icon: ClipboardCheck, tone: "emerald",
      title: "Закрыть журнал", sub: `${groups.length} групп · ${lessonsToday} занятий сегодня`,
      status: "К отметке", action: "Открыть",
      onClick: () => onNavigate?.("journal"),
    },
    {
      key: "trials", icon: CalendarDays, tone: "sky",
      title: "Пробные занятия", sub: trialsToday ? `${trialsToday} на сегодня` : "на сегодня нет",
      status: trialsToday ? String(trialsToday) : "0", action: "Список",
      onClick: () => setTrialsOpen(true), highlight: trialsToday > 0,
    },
    {
      key: "bday", icon: Cake, tone: "pink",
      title: "Поздравить с ДР", sub: todayBirthdays.length ? `${todayBirthdays.length} сегодня` : upcoming.length ? `ближайший через ${upcoming[0].inDays} дн.` : "нет в ближайшие дни",
      status: todayBirthdays.length ? String(todayBirthdays.length) : "—", action: "Открыть",
      onClick: () => setBdayOpen(true), highlight: todayBirthdays.length > 0,
    },
    {
      key: "echo", icon: Coins, tone: "gold",
      title: "Выдать ЭхоБаксы", sub: "награда за старание",
      status: "Готово", action: "Выдать",
      onClick: () => onNavigate?.("shop"),
    },
    {
      key: "plan", icon: CalendarClock, tone: "indigo",
      title: "План на урок", sub: "вы пишете — ИИ упорядочит",
      status: "План", action: "Открыть",
      onClick: () => setPlanKind("lesson"),
    },
    {
      key: "summary", icon: Mic, tone: "emerald",
      title: "Итоги урока", sub: "наговорите — ИИ разложит",
      status: "Голос", action: "Подвести",
      onClick: () => setSummaryOpen(true),
    },
    {
      key: "open", icon: Presentation, tone: "rose",
      title: "Открытый урок", sub: "для родителей · вы пишете, ИИ поможет",
      status: "План", action: "Открыть",
      onClick: () => setPlanKind("open"),
    },
  ];

  const toneCls: Record<string, string> = {
    amber: "text-amber-400 bg-amber-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
    sky: "text-sky-400 bg-sky-400/10",
    pink: "text-pink-400 bg-pink-400/10",
    gold: "text-[#C5A059] bg-[#C5A059]/10",
    indigo: "text-indigo-400 bg-indigo-400/10",
    rose: "text-rose-400 bg-rose-400/10",
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Стандарты работы сегодня</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">выполняйте по порядку</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {standards.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={s.onClick}
              className={`group flex flex-col rounded-2xl border p-3.5 text-left transition ${
                s.highlight ? "border-pink-400/40 bg-pink-400/[0.06]" : "border-white/10 bg-[#141414] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneCls[s.tone]}`}>
                  <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </span>
                {s.status && !["Готово", "К отметке", "План", "ИИ", "Не отмечен", "Голос", "Поздно", "Нет занятий", "—"].includes(s.status) && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-white">{s.status}</span>
                )}
              </div>
              <div className="mt-2.5 text-sm font-bold text-white">{s.title}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-slate-500">{s.sub}</div>
              <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-[#C5A059]">
                {s.action} <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {bdayOpen && (
        <BirthdaysModal
          teacherName={teacherName}
          today={todayBirthdays}
          upcoming={upcoming}
          onClose={() => setBdayOpen(false)}
        />
      )}

      {arrivalOpen && (
        <ArrivalCheckModal
          expectedStart={expectedStart ?? 9 * 60}
          onClose={() => setArrivalOpen(false)}
          onDone={(r) => { setArrival(r); onConfirmArrival?.(); setArrivalOpen(false); }}
        />
      )}

      {planKind && (
        <TeacherLessonPlanEditor
          kind={planKind}
          groupName={groups[0]?.name}
          groupLevel={(groups[0] as any)?.level}
          studentCount={students.length}
          onClose={() => setPlanKind(null)}
        />
      )}

      {trialsOpen && (
        <TrialsListModal trials={trials} onClose={() => setTrialsOpen(false)} onJournal={() => { setTrialsOpen(false); onNavigate?.("journal"); }} />
      )}

      {summaryOpen && (
        <TeacherLessonSummary
          groupName={groups[0]?.name}
          groupLevel={(groups[0] as any)?.level}
          studentCount={students.length}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}

const trialOutcomeLabel: Record<string, { text: string; cls: string }> = {
  pending: { text: "Ожидает", cls: "bg-amber-500/15 text-amber-300" },
  converted: { text: "Купил", cls: "bg-emerald-500/15 text-emerald-300" },
  lost: { text: "Не купил", cls: "bg-rose-500/15 text-rose-300" },
};

function TrialsListModal({ trials, onClose, onJournal }: { trials: TrialItem[]; onClose: () => void; onJournal: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-sky-400" />
            <h3 className="text-base font-black text-white">Пробные на сегодня</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          {trials.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">На сегодня пробных занятий нет.</p>
              <p className="mt-1 text-[11px] text-slate-600">Записи появляются, когда ученику ставят пробную отметку.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trials.map((t) => {
                const badge = trialOutcomeLabel[t.outcome || "pending"] || trialOutcomeLabel.pending;
                const wa = (t.phone || "").replace(/\D/g, "").replace(/^8/, "7");
                return (
                  <div key={t.studentId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sm font-black text-sky-300">
                      {t.studentName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{t.studentName}</div>
                      <div className="text-[10px] text-slate-500">{t.time ? `${t.time} · ` : ""}{t.groupName || "—"}</div>
                    </div>
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black ${badge.cls}`}>{badge.text}</span>
                    {wa && (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
                        <Send className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={onJournal} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10">
            <ClipboardCheck className="h-4 w-4" /> Открыть журнал — отметить пробные
          </button>
        </div>
      </div>
    </div>
  );
}

const minsToHHMM = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

async function compressImage(file: File, max = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

function ArrivalCheckModal({ expectedStart, onClose, onDone }: {
  expectedStart: number; onClose: () => void; onDone: (r: { time: string; late: boolean }) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = almatyToday();
  const nowMins = (() => {
    const t = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  })();
  const nowStr = minsToHHMM(nowMins);
  const late = nowMins > expectedStart + 5;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { setPhoto(await compressImage(file)); } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function submit() {
    setBusy(true);
    try {
      // Время и «опоздание» считает СЕРВЕР — отправляем только начало занятия и фото.
      const res = await fetch("/api/mvp/teachers/arrival", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({ expectedStart, photo }),
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      onDone(data?.arrival ? { time: data.arrival.time, late: data.arrival.late } : { time: nowStr, late });
    } catch {
      onDone({ time: nowStr, late });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-black text-white">Подтверждение прихода</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          {/* время + статус */}
          <div className={`mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 ${late ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${late ? "text-rose-300" : "text-emerald-300"}`} />
              <div>
                <div className="text-lg font-black text-white">{nowStr}</div>
                <div className="text-[10px] text-slate-400">начало занятия · {minsToHHMM(expectedStart)}</div>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${late ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>
              {late ? "Опоздание" : "Вовремя"}
            </span>
          </div>

          {/* фото */}
          {photo ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              <img src={photo} alt="Фото прихода" className="max-h-64 w-full object-cover" />
              <button onClick={() => inputRef.current?.click()} className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                <RefreshCw className="h-3.5 w-3.5" /> Переснять
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] text-slate-400 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]"
            >
              {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" />}
              <span className="text-sm font-bold">Сделать фото на рабочем месте</span>
              <span className="text-[10px] text-slate-500">камера или галерея</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />

          <button
            onClick={submit}
            disabled={!photo || busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black transition hover:brightness-105 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Подтвердить приход в {nowStr}
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-500">Фото увидит руководство. Приход вовремя = без штрафа.</p>
        </div>
      </div>
    </div>
  );
}

function localGreeting(name: string, teacher: string, age: number) {
  const firstName = name.split(" ")[0] || name;
  return `${firstName}, поздравляю тебя с днём рождения! 🎉 ${age ? `Пусть эти ${age} — ` : "Пусть новый год жизни станет "}годом новых побед на сцене и в жизни. Ты растёшь сильным характером и настоящим артистом — я горжусь твоими успехами в танце. Здоровья, радости и красивых выступлений! — ${teacher}`;
}

function BirthdaysModal({ teacherName, today, upcoming, onClose }: {
  teacherName: string; today: BirthdayItem[]; upcoming: BirthdayItem[]; onClose: () => void;
}) {
  const [selected, setSelected] = useState<BirthdayItem | null>(today[0] ?? upcoming[0] ?? null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate(item: BirthdayItem) {
    setSelected(item);
    setText("");
    setLoading(true);
    const fallback = localGreeting(item.student.name, teacherName, item.age);
    try {
      const res = await fetch("/api/gemini/birthday-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({
          studentName: item.student.name,
          age: item.age,
          groupName: item.groupName,
          teacherName,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setText(data?.message || fallback);
    } catch {
      setText(fallback); // мягкая деградация — работает и без ИИ
    } finally {
      setLoading(false);
    }
  }

  const phone = selected ? waDigits((selected.student as any).phone || selected.student.parentPhone) : "";
  const waHref = phone && text ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : "";

  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-400" />
            <h3 className="text-base font-black text-white">Дни рождения</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          {today.length === 0 && upcoming.length === 0 && (
            <p className="text-sm text-slate-400">В ближайшие дни дней рождения нет.</p>
          )}

          {today.length > 0 && (
            <>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-pink-300">
                <Gift className="h-3.5 w-3.5" /> Сегодня
              </div>
              <div className="mb-4 space-y-2">
                {today.map((it) => (
                  <BdayRow key={it.student.id} it={it} active={selected?.student.id === it.student.id} onPick={() => generate(it)} todayBadge />
                ))}
              </div>
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Ближайшие</div>
              <div className="mb-4 space-y-2">
                {upcoming.map((it) => (
                  <BdayRow key={it.student.id} it={it} active={selected?.student.id === it.student.id} onPick={() => generate(it)} />
                ))}
              </div>
            </>
          )}

          {selected && (
            <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Поздравление для {selected.student.name.split(" ")[0]}</span>
                <button onClick={() => generate(selected)} disabled={loading} className="flex items-center gap-1 text-[11px] font-bold text-[#C5A059] disabled:opacity-50">
                  <Sparkles className="h-3.5 w-3.5" /> {text ? "Другой вариант" : "Сгенерировать"}
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> ИИ пишет поздравление…
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Нажмите «Сгенерировать» — ИИ напишет персональный текст, его можно отредактировать."
                  className="h-32 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-slate-100 outline-none focus:border-[#C5A059]/50"
                />
              )}

              <div className="mt-3 flex gap-2">
                <button onClick={copy} disabled={!text} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 disabled:opacity-40">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} {copied ? "Скопировано" : "Копировать"}
                </button>
                <a
                  href={waHref || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition ${
                    waHref ? "bg-[#25D366] text-black hover:brightness-105" : "cursor-not-allowed bg-white/5 text-slate-600"
                  }`}
                  onClick={(e) => { if (!waHref) e.preventDefault(); }}
                >
                  <Send className="h-4 w-4" /> Отправить в WhatsApp
                </a>
              </div>
              {!phone && text && <p className="mt-2 text-[10px] text-rose-300">У ученика не указан телефон — добавьте номер, чтобы отправить.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BdayRow({ it, active, onPick, todayBadge }: { it: BirthdayItem; active?: boolean; onPick: () => void; todayBadge?: boolean }) {
  return (
    <button
      onClick={onPick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        active ? "border-[#C5A059]/40 bg-[#C5A059]/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-400/15 text-sm font-black text-pink-300">
        {it.student.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-white">{it.student.name}</div>
        <div className="text-[10px] text-slate-500">
          {todayBadge ? `исполняется ${it.age}` : `через ${it.inDays} дн. · ${it.age} лет`}{it.groupName ? ` · ${it.groupName}` : ""}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </button>
  );
}

export default TeacherStandardsToday;
