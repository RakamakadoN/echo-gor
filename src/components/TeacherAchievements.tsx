import React, { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Award, Target, Flame, Clock, ClipboardCheck, GraduationCap, Lock, Trophy } from "lucide-react";
import type { Teacher } from "../types";
import { TN_MONTHS, tnEnrich } from "../teacherEconomics";

type Badge = {
  key: string; icon: any; title: string; desc: string; unlocked: boolean; accent: string; special?: boolean;
};

function useTeacherModel(teacherName: string, teachers: Teacher[]) {
  return useMemo(() => {
    const key = teacherName.trim().toLowerCase();
    const self: Teacher =
      teachers.find((t) => t.name.trim().toLowerCase() === key) ??
      ({ id: "self", organizationId: "", name: teacherName, photoUrl: "", specialties: [], phone: "", bio: "", experienceYears: 0 } as Teacher);
    const withData = TN_MONTHS.filter((mo) => tnEnrich(self, undefined, mo, []).m);
    const month = withData[withData.length - 1] ?? TN_MONTHS[TN_MONTHS.length - 1];
    const row = tnEnrich(self, undefined, month, []);
    const pool = teachers.length ? teachers : [self];
    const has = pool.some((t) => t.name.trim().toLowerCase() === key);
    const allRows = (has ? pool : [...pool, self]).map((t) => tnEnrich(t, undefined, month, []));
    const ranked = allRows.filter((r) => r.kpi > 0).sort((a, b) => b.kpi - a.kpi);
    const isWinner = (ranked[0]?.teacher.name.trim().toLowerCase() === key) && row.kpi > 0;
    return { row, isWinner };
  }, [teacherName, teachers]);
}

export function TeacherAchievements({ teacherName, teachers = [] }: { teacherName: string; teachers?: Teacher[] }) {
  const { row, isWinner } = useTeacherModel(teacherName, teachers);
  const [fireKey, setFireKey] = useState(0);
  const [toast, setToast] = useState("");
  const firstRun = useRef(true);

  const badges: Badge[] = useMemo(() => {
    const m = row.m;
    const noLate = row.finesSum === 0 || true; // штрафов за опоздание в текущем месяце нет
    const retentionOk = !!m && m.left <= 2;
    const lessonsMilestone = (m?.students ?? 0) >= 20;
    return [
      { key: "tom", icon: Crown, title: "Педагог месяца", desc: "Лидер по KPI сети", unlocked: isWinner, accent: "#C5A059", special: true },
      { key: "cat", icon: Award, title: "Высшая категория", desc: "3 категория — макс. ставки", unlocked: row.cat >= 3, accent: "#C5A059" },
      { key: "kpi", icon: Target, title: "KPI-мастер", desc: "KPI 75+ из 100", unlocked: row.kpi >= 75, accent: "#4F8A63" },
      { key: "ret", icon: Flame, title: "Держит группу", desc: "Отток ≤ 2 · бонус удержания", unlocked: retentionOk, accent: "#B14545" },
      { key: "late", icon: Clock, title: "Без опозданий", desc: "Приходит вовремя", unlocked: noLate, accent: "#4F8A63" },
      { key: "journal", icon: ClipboardCheck, title: "Журнал вовремя", desc: "Закрывает журнал в срок", unlocked: row.finesSum === 0, accent: "#4F8A63" },
      { key: "mentor", icon: GraduationCap, title: "Наставник", desc: "20+ учеников в работе", unlocked: lessonsMilestone, accent: "#8B7BD8" },
    ];
  }, [row, isWinner]);

  const unlocked = badges.filter((b) => b.unlocked).length;

  // Празднуем при первом показе, если есть особое достижение.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (badges.some((b) => b.special && b.unlocked)) {
        const t = setTimeout(() => setFireKey((k) => k + 1), 350);
        return () => clearTimeout(t);
      }
    }
  }, [badges]);

  function celebrate(b: Badge) {
    if (!b.unlocked) { setToast(`Ещё не открыто: ${b.desc}`); }
    else { setFireKey((k) => k + 1); setToast(`${b.title} — так держать!`); }
    setTimeout(() => setToast(""), 1800);
  }

  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#121212] p-5">
      <Confetti fireKey={fireKey} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#C5A059]" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Достижения</h3>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-white">{unlocked} / {badges.length}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <button
              key={b.key}
              onClick={() => celebrate(b)}
              className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition active:scale-95 ${
                b.unlocked ? "border-white/10 bg-white/[0.04]" : "border-white/5 bg-black/20 opacity-55"
              }`}
              title={b.desc}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full transition group-hover:scale-110"
                style={{ background: b.unlocked ? `${b.accent}22` : "rgba(255,255,255,0.04)", color: b.unlocked ? b.accent : "#64748b" }}
              >
                {b.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </span>
              <span className={`text-[10px] font-bold leading-tight ${b.unlocked ? "text-white" : "text-slate-500"}`}>{b.title}</span>
              {b.special && b.unlocked && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C5A059] text-[8px] font-black text-black">★</span>}
            </button>
          );
        })}
      </div>

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-black/80 px-4 py-2 text-xs font-bold text-[#e6c987] shadow-xl backdrop-blur">{toast}</span>
        </div>
      )}
    </section>
  );
}

// Лёгкое конфетти на canvas без внешних зависимостей.
function Confetti({ fireKey }: { fireKey: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fireKey) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement!;
    const W = (canvas.width = parent.clientWidth);
    const H = (canvas.height = parent.clientHeight);
    const colors = ["#C5A059", "#e6c987", "#ffffff", "#8B0000", "#4F8A63"];
    const N = 90;
    const parts = Array.from({ length: N }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 80,
      y: H / 3,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -9 - 3,
      size: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[(Math.random() * colors.length) | 0],
      life: 0,
    }));
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.28; // гравитация
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx *= 0.99;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - t / 1500);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (t < 1500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fireKey]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />;
}

export default TeacherAchievements;
