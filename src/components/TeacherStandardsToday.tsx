import React, { useMemo, useState } from "react";
import {
  ClipboardCheck, CalendarClock, Cake, Coins, CalendarDays, Camera, Presentation,
  ChevronRight, X, Sparkles, Loader2, Send, Copy, Check, Gift,
} from "lucide-react";
import type { Student, Group } from "../types";

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

  const { todayBirthdays, upcoming } = useMemo(() => {
    const today = almatyToday();
    const todayKey = `${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const groupName = (s: Student) => groups.find((g) => g.id === s.groupId)?.name;
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

  const trialsToday = useMemo(() => {
    // Пробные на сегодня: из отметок ученика (isTrial) или из расписания.
    const fromStudents = students.filter((s) => (s as any).isTrial).length;
    const fromSchedule = (scheduleItems || []).filter((i: any) => i?.isTrial || i?.type === "trial").length;
    return Math.max(fromStudents, fromSchedule);
  }, [students, scheduleItems]);

  const lessonsToday = scheduleItems?.length || groups.length;

  const standards = [
    {
      key: "arrival", icon: Camera, tone: "amber",
      title: "Подтвердить приход", sub: "фото на рабочем месте · вовремя",
      status: "Не отмечен", action: "Отметить",
      onClick: () => onConfirmArrival?.(),
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
      onClick: () => onNavigate?.("journal"),
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
      title: "План на урок", sub: "ИИ поможет составить",
      status: "ИИ", action: "Составить",
      onClick: () => onOpenLessonPlan?.("Составь план занятия на сегодня", { groupName: groups[0]?.name, studentCount: students.length }),
    },
    {
      key: "open", icon: Presentation, tone: "rose",
      title: "Открытый урок", sub: "для родителей · раз в месяц",
      status: "План", action: "Наметить",
      onClick: () => onOpenLessonPlan?.("Составь сценарий открытого урока для родителей: структура, номера, вовлечение родителей", { groupName: groups[0]?.name, studentCount: students.length }),
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
                {s.status && s.status !== "Готово" && s.status !== "К отметке" && s.status !== "План" && s.status !== "ИИ" && s.status !== "Не отмечен" && (
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
