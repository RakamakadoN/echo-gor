import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, CheckCircle2, Clock, XCircle, Camera, ChevronRight } from "lucide-react";
import type { Teacher, Group } from "../types";

type ArrivalRow = { teacherId: string; teacherName?: string; time?: string; late?: boolean; hasPhoto?: boolean };

function almatyToday(): Date {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const isoToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());

// Компактная сводка стандартов на сегодня для дашборда. Клик → полный отчёт.
export function StaffStandardsSummary({ role, teachers = [], groups = [], onOpen }: {
  role: "owner" | "branch_manager"; teachers?: Teacher[]; groups?: Group[]; onOpen?: () => void;
}) {
  const [arrivals, setArrivals] = useState<ArrivalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const roleHeader = role === "owner" ? "owner" : "branch_manager";

  useEffect(() => {
    let alive = true;
    const d = isoToday();
    fetch(`/api/mvp/staff/standards?from=${d}&to=${d}`, { headers: { "x-demo-role": roleHeader } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (alive) setArrivals(Array.isArray(data?.arrivals) ? data.arrivals : []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [roleHeader]);

  const stats = useMemo(() => {
    const wd = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][almatyToday().getDay()];
    const hasLesson = (id: string) => groups.some((g: any) => g?.teacherId === id && Array.isArray(g?.days) && g.days.includes(wd));
    const byId = new Map(arrivals.map((a) => [a.teacherId, a]));
    let onTime = 0, late = 0, noMark = 0, noPhoto = 0;
    const lateNames: string[] = [], noMarkNames: string[] = [];
    const roster = teachers.length ? teachers.map((t) => ({ id: t.id, name: t.name })) : arrivals.map((a) => ({ id: a.teacherId, name: a.teacherName || "Педагог" }));
    for (const t of roster) {
      const r = byId.get(t.id);
      if (r) { r.late ? (late++, lateNames.push(t.name.split(" ")[0])) : onTime++; if (!r.hasPhoto) noPhoto++; }
      else if (hasLesson(t.id)) { noMark++; noMarkNames.push(t.name.split(" ")[0]); }
    }
    return { onTime, late, noMark, noPhoto, lateNames, noMarkNames };
  }, [arrivals, teachers, groups]);

  const hasIssues = stats.late + stats.noMark + stats.noPhoto > 0;

  return (
    <button
      onClick={onOpen}
      className="group w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414] p-5 text-left transition hover:border-[#C5A059]/30"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#C5A059]" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Стандарты сегодня</h3>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-bold text-[#C5A059]">
          Полный отчёт <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Mini icon={CheckCircle2} value={stats.onTime} label="вовремя" tone="text-emerald-300" />
        <Mini icon={Clock} value={stats.late} label="опозданий" tone="text-amber-300" />
        <Mini icon={XCircle} value={stats.noMark} label="не отмет." tone="text-rose-300" />
        <Mini icon={Camera} value={stats.noPhoto} label="без фото" tone="text-rose-300" />
      </div>

      {!loading && (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          {hasIssues
            ? <>Требует внимания: {stats.lateNames.length ? `опоздали — ${stats.lateNames.join(", ")}. ` : ""}{stats.noMarkNames.length ? `не отметились — ${stats.noMarkNames.join(", ")}.` : ""}</>
            : "Все на месте и вовремя — отклонений нет."}
        </p>
      )}
    </button>
  );
}

function Mini({ icon: Icon, value, label, tone }: { icon: any; value: number; label: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-2.5 text-center">
      <Icon className={`mx-auto h-4 w-4 ${tone}`} />
      <div className={`mt-1 text-xl font-black ${tone}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

export default StaffStandardsSummary;
