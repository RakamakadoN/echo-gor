import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Teacher, Group } from "../types";

type ArrivalRow = { teacherId: string; teacherName?: string; late?: boolean; hasPhoto?: boolean };

const isoToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
function weekdayShort(): string {
  const s = isoToday(); const [y, m, d] = s.split("-").map(Number);
  return ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][new Date(y, m - 1, d).getDay()];
}

// Отклонения от стандартов на сегодня — компактный алерт для «Здоровья студии».
// Показывается ТОЛЬКО при наличии отклонений.
export function StandardsHealthAlert({ role, teachers = [], groups = [], onOpen }: {
  role: "owner" | "branch_manager"; teachers?: Teacher[]; groups?: Group[]; onOpen?: () => void;
}) {
  const [arrivals, setArrivals] = useState<ArrivalRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const roleHeader = role === "owner" ? "owner" : "branch_manager";

  useEffect(() => {
    let alive = true;
    const d = isoToday();
    fetch(`/api/mvp/staff/standards?from=${d}&to=${d}`, { headers: { "x-demo-role": roleHeader } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (alive) setArrivals(Array.isArray(data?.arrivals) ? data.arrivals : []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [roleHeader]);

  const dev = useMemo(() => {
    const wd = weekdayShort();
    const hasLesson = (id: string) => groups.some((g: any) => g?.teacherId === id && Array.isArray(g?.days) && g.days.includes(wd));
    const byId = new Map(arrivals.map((a) => [a.teacherId, a]));
    const late: string[] = [], noMark: string[] = [], noPhoto: string[] = [];
    const roster = teachers.length ? teachers.map((t) => ({ id: t.id, name: t.name })) : arrivals.map((a) => ({ id: a.teacherId, name: a.teacherName || "Педагог" }));
    for (const t of roster) {
      const r = byId.get(t.id);
      const first = t.name.split(" ")[0];
      if (r) { if (r.late) late.push(first); if (!r.hasPhoto) noPhoto.push(first); }
      else if (hasLesson(t.id)) noMark.push(first);
    }
    return { late, noMark, noPhoto, total: late.length + noMark.length + noPhoto.length };
  }, [arrivals, teachers, groups]);

  if (!loaded || dev.total === 0) return null; // при наличии — иначе ничего

  const parts: string[] = [];
  if (dev.late.length) parts.push(`опоздали — ${dev.late.join(", ")}`);
  if (dev.noMark.length) parts.push(`не отметились — ${dev.noMark.join(", ")}`);
  if (dev.noPhoto.length) parts.push(`без фото — ${dev.noPhoto.join(", ")}`);

  return (
    <button onClick={onOpen} className="group flex w-full items-center gap-3 rounded-2xl border border-rose-500/50 bg-[#3a1116] px-4 py-3 text-left transition hover:bg-[#461419]">
      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
      <div className="min-w-0 flex-1">
        {/* Произвольные hex-классы: дневная тема перекрашивает text-white/text-slate-* в тёмный,
            а фон #3a1116 остаётся тёмным в обеих темах — поэтому светлый текст задаём напрямую. */}
        <div className="text-xs font-black uppercase tracking-wider text-[#ffffff]">Отклонения от стандартов · {dev.total}</div>
        <div className="mt-0.5 text-[11px] font-medium leading-relaxed text-[#f6ccd1]">{parts.join(" · ")}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-rose-300 transition group-hover:translate-x-0.5" />
    </button>
  );
}

export default StandardsHealthAlert;
