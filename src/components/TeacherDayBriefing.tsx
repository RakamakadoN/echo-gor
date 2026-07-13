import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, Sun, CalendarDays, UserPlus, GraduationCap, Loader2, RefreshCw } from "lucide-react";
import type { Student, Group } from "../types";

function almatyNow() {
  const dt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const get = (t: string) => dt.find((p) => p.type === t)?.value || "";
  const hour = Number(get("hour"));
  return { weekday: get("weekday"), hour };
}
const daysBetween = (iso?: string) => {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / 86400000;
};

type Props = {
  teacherName: string;
  photoUrl?: string;
  groups?: Group[];
  students?: Student[];
  scheduleItems?: any[];
};

export function TeacherDayBriefing({ teacherName, photoUrl, groups = [], students = [], scheduleItems = [] }: Props) {
  const [ai, setAi] = useState<{ summary: string; recommendations: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const facts = useMemo(() => {
    const { weekday, hour } = almatyNow();
    const greet = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
    const firstName = teacherName.split(" ")[0] || teacherName;

    // График сегодня: из расписания или из групп.
    const schedule =
      (scheduleItems || [])
        .filter((i: any) => i?.status !== "cancelled")
        .map((i: any) => {
          const t = String(i?.time || i?.startsAt || "").match(/(\d{1,2}:\d{2})/)?.[1] || "";
          return { time: t, name: i?.groupName || "Группа" };
        })
        .filter((s: any) => s.name) ||
      [];
    const scheduleFromGroups = groups.map((g: any) => ({ time: g.time || "", name: g.name }));
    const list = schedule.length ? schedule : scheduleFromGroups;

    // Новенькие: статус trial/lead/new или регистрация за последние 30 дней.
    const newStudents = students
      .filter((s: any) => {
        const st = String(s.status || s.computedStatus || "").toLowerCase();
        return ["trial", "lead", "new"].includes(st) || (s as any).isTrial || daysBetween(s.createdAt) <= 30;
      })
      .map((s) => s.name.split(" ")[0])
      .slice(0, 8);

    // Занятий за учебный год: уникальные даты отметок посещаемости у учеников педагога.
    const dates = new Set<string>();
    for (const s of students) {
      const att = (s as any).attendance || {};
      for (const key of Object.keys(att)) {
        const d = key.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        if (d) dates.add(d);
      }
    }
    const totalLessonsYear = Math.max(dates.size, groups.length * 36); // оценка при нехватке данных

    return { weekday, greet, firstName, list, newStudents, totalLessonsYear };
  }, [teacherName, groups, students, scheduleItems]);

  const localReco = useMemo(() => {
    const r: string[] = [];
    if (facts.newStudents.length) r.push(`Уделите внимание новеньким (${facts.newStudents.join(", ")}) — помогите влиться и почувствовать успех.`);
    r.push("Не забудьте подготовиться к занятию: план, музыка, разминка.");
    r.push("Отметьте посещаемость и подтвердите приход вовремя — без штрафов.");
    r.push("Похвалите за старание и выдайте ЭхоБаксы отличившимся.");
    return r.slice(0, 4);
  }, [facts]);

  async function loadAi() {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini/teacher-daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({
          teacherName,
          weekday: facts.weekday,
          groupsCount: groups.length,
          schedule: facts.list,
          newStudents: facts.newStudents,
          totalLessonsYear: facts.totalLessonsYear,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAi({ summary: data?.summary || "", recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [] });
    } catch {
      setAi(null); // фолбэк на локальный текст
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAi(); /* eslint-disable-next-line */ }, []);

  const recommendations = ai?.recommendations?.length ? ai.recommendations : localReco;
  const scheduleStr = facts.list.length
    ? facts.list.map((s: any) => `${s.time ? s.time + " " : ""}${s.name}`).join(" · ")
    : "занятий на сегодня не запланировано";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#241d10] via-[#141414] to-black p-5 shadow-2xl md:p-6">
      <div className="absolute right-[-70px] top-[-70px] h-56 w-56 rounded-full bg-[#C5A059]/15 blur-3xl" />

      <div className="relative flex items-start gap-4">
        {photoUrl && (
          <img src={photoUrl} alt={teacherName} className="hidden h-16 w-16 shrink-0 rounded-2xl border border-[#C5A059]/40 object-cover sm:block" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059]">
            <Sun className="h-3.5 w-3.5" /> Сводка дня · {facts.weekday}
          </div>
          <h2 className="mt-1 text-xl font-black text-white md:text-2xl">
            {facts.greet}, {facts.firstName}!
          </h2>

          {loading ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> ИИ готовит сводку…
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {ai?.summary || `Сегодня у вас ${groups.length} ${plural(groups.length, "группа", "группы", "групп")}. График: ${scheduleStr}.${facts.newStudents.length ? ` Новенькие: ${facts.newStudents.join(", ")} — окружите вниманием.` : ""}`}
            </p>
          )}
        </div>
      </div>

      {/* факты */}
      <div className="relative mt-4 grid grid-cols-3 gap-2.5">
        <MiniStat icon={CalendarDays} label="Групп сегодня" value={String(groups.length)} />
        <MiniStat icon={UserPlus} label="Новеньких" value={String(facts.newStudents.length)} />
        <MiniStat icon={GraduationCap} label="Занятий за год" value={`~${facts.totalLessonsYear}`} />
      </div>

      {/* новенькие по именам */}
      {facts.newStudents.length > 0 && (
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Новенькие:</span>
          {facts.newStudents.map((n) => (
            <span key={n} className="rounded-lg bg-[#C5A059]/12 px-2 py-0.5 text-[11px] font-bold text-[#C5A059]">{n}</span>
          ))}
        </div>
      )}

      {/* рекомендации */}
      <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" /> Рекомендации на день
          </div>
          <button onClick={loadAi} disabled={loading} className="flex items-center gap-1 text-[10px] font-bold text-[#C5A059] disabled:opacity-40">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Обновить
          </button>
        </div>
        <ul className="space-y-1.5">
          {recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A059]" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative mt-3 text-sm font-bold text-[#e6c987]">Удачного дня — вы ведёте школу вперёд! 🔥</p>
    </section>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <Icon className="h-4 w-4 text-[#C5A059]" />
      <div className="mt-1.5 text-lg font-black text-white">{value}</div>
      <div className="text-[10px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export default TeacherDayBriefing;
