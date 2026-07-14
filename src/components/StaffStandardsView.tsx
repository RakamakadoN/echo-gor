import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Clock, CheckCircle2, AlertTriangle, XCircle, Camera, Coins,
  Loader2, RefreshCw, Check, X,
} from "lucide-react";
import type { Teacher, Group } from "../types";

type ArrivalRow = { teacherId: string; teacherName?: string; date: string; time?: string; late?: boolean; hasPhoto?: boolean };
type Period = "today" | "week" | "month";

function almatyToday(): Date {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const money = (n: number) => `${new Intl.NumberFormat("ru-RU").format(Math.round(n))} ₸`;

function periodRange(p: Period): { from: string; to: string } {
  const today = almatyToday();
  const to = iso(today);
  if (p === "today") return { from: to, to };
  if (p === "week") { const f = new Date(today); f.setDate(f.getDate() - 6); return { from: iso(f), to }; }
  const f = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: iso(f), to };
}

export function StaffStandardsView({ role, teachers = [], groups = [] }: { role: "owner" | "branch_manager"; teachers?: Teacher[]; groups?: Group[] }) {
  const weekdayToday = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][almatyToday().getDay()];
  const teacherHasLessonToday = (teacherId: string) =>
    groups.some((g: any) => g?.teacherId === teacherId && Array.isArray(g?.days) && g.days.includes(weekdayToday));
  const [period, setPeriod] = useState<Period>("today");
  const [rows, setRows] = useState<ArrivalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fineFor, setFineFor] = useState<{ teacherId: string; teacherName: string; reason: string; amount: number; date: string } | null>(null);
  const [charged, setCharged] = useState<Record<string, boolean>>({});

  const range = useMemo(() => periodRange(period), [period]);
  const roleHeader = role === "owner" ? "owner" : "branch_manager";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/mvp/staff/standards?from=${range.from}&to=${range.to}`, { headers: { "x-demo-role": roleHeader } });
      const data = res.ok ? await res.json() : null;
      setRows(Array.isArray(data?.arrivals) ? data.arrivals : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  // Сводка по педагогам за период.
  const perTeacher = useMemo(() => {
    const byId = new Map<string, ArrivalRow[]>();
    for (const r of rows) {
      const k = r.teacherId || r.teacherName || "—";
      if (!byId.has(k)) byId.set(k, []);
      byId.get(k)!.push(r);
    }
    // База — список педагогов; мержим с приходами (по id или имени).
    const base = teachers.length ? teachers.map((t) => ({ id: t.id, name: t.name })) : [];
    const seen = new Set<string>();
    const list = base.map((t) => {
      const recs = byId.get(t.id) || [...byId.entries()].find(([k]) => (byId.get(k)?.[0]?.teacherName || "").trim().toLowerCase() === t.name.trim().toLowerCase())?.[1] || [];
      recs.forEach((r) => seen.add(r.teacherId || r.teacherName || ""));
      return { id: t.id, name: t.name, recs };
    });
    // Приходы от педагогов вне списка (например demo-сессия «Педагог»).
    for (const [k, recs] of byId.entries()) {
      if (seen.has(k)) continue;
      if (list.some((l) => l.recs === recs)) continue;
      list.push({ id: k, name: recs[0]?.teacherName || "Педагог", recs });
    }
    return list;
  }, [rows, teachers]);

  const totals = useMemo(() => {
    let onTime = 0, late = 0, noMark = 0, noPhoto = 0;
    for (const t of perTeacher) {
      if (period === "today") {
        const r = t.recs[0];
        if (!r) { if (teacherHasLessonToday(t.id)) noMark++; }
        else { r.late ? late++ : onTime++; if (!r.hasPhoto) noPhoto++; }
      } else {
        late += t.recs.filter((r) => r.late).length;
        onTime += t.recs.filter((r) => !r.late).length;
        noPhoto += t.recs.filter((r) => !r.hasPhoto).length;
      }
    }
    return { onTime, late, noMark, noPhoto };
  }, [perTeacher, period]);

  async function charge() {
    if (!fineFor) return;
    const key = `${fineFor.teacherId}:${fineFor.date}:${fineFor.reason}`;
    try {
      await fetch("/api/mvp/teachers/penalties", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({
          teacherId: fineFor.teacherId, teacherName: fineFor.teacherName,
          reason: fineFor.reason, amount: fineFor.amount,
          period_month: fineFor.date.slice(0, 7),
          created_by: role === "owner" ? "Владелец" : "Управляющий",
          comment: `${fineFor.reason} · ${fineFor.date}`,
        }),
      });
      setCharged((c) => ({ ...c, [key]: true }));
    } catch { /* ignore */ }
    setFineFor(null);
  }

  const periods: { id: Period; label: string }[] = [
    { id: "today", label: "Сегодня" }, { id: "week", label: "Неделя" }, { id: "month", label: "Месяц" },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#171717] to-black p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#C5A059]" />
            <div>
              <h2 className="text-base font-black text-white">Стандарты работы сотрудников</h2>
              <p className="text-[11px] text-slate-500">Приход вовремя, фото на месте, дисциплина. Штраф — только с вашего подтверждения.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5">
              {periods.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${period === p.id ? "bg-[#C5A059] text-black" : "text-slate-300 hover:text-white"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 disabled:opacity-40">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Вовремя" value={totals.onTime} tone="emerald" icon={CheckCircle2} />
          <Stat label="Опоздания" value={totals.late} tone="amber" icon={Clock} />
          {period === "today" ? <Stat label="Не отметились" value={totals.noMark} tone="rose" icon={XCircle} />
            : <Stat label="Отметок" value={totals.onTime + totals.late} tone="slate" icon={CheckCircle2} />}
          <Stat label="Без фото" value={totals.noPhoto} tone="rose" icon={Camera} />
        </div>
      </section>

      {loading && <p className="py-6 text-center text-sm text-slate-500">Загрузка…</p>}

      {!loading && (
        <div className="space-y-2">
          {perTeacher.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Нет данных по педагогам за период.</p>}
          {perTeacher.map((t) => (
            <TeacherStandardRow
              key={t.id}
              teacher={t}
              period={period}
              expectedToday={teacherHasLessonToday(t.id)}
              charged={charged}
              onFine={(reason, amount, date) => setFineFor({ teacherId: t.id, teacherName: t.name, reason, amount, date })}
            />
          ))}
        </div>
      )}

      {fineFor && (
        <FineConfirmModal fine={fineFor} onChange={setFineFor} onConfirm={charge} onCancel={() => setFineFor(null)} />
      )}
    </div>
  );
}

function Stat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: string; icon: any }) {
  const c = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : tone === "rose" ? "text-rose-300" : "text-slate-300";
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <Icon className={`h-4 w-4 ${c}`} />
      <div className={`mt-1.5 text-2xl font-black ${c}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

function TeacherStandardRow({ teacher, period, expectedToday, charged, onFine }: {
  teacher: { id: string; name: string; recs: ArrivalRow[] };
  period: Period;
  expectedToday?: boolean;
  charged: Record<string, boolean>;
  onFine: (reason: string, amount: number, date: string) => void;
}) {
  const initials = teacher.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const today = periodRange("today").from;

  if (period === "today") {
    const r = teacher.recs[0];
    const status = !r ? (expectedToday ? "nomark" : "nolesson") : r.late ? "late" : "ontime";
    const badge = status === "ontime" ? { t: `Вовремя · ${r!.time}`, c: "bg-emerald-500/15 text-emerald-300" }
      : status === "late" ? { t: `Опоздание · ${r!.time}`, c: "bg-amber-500/15 text-amber-300" }
      : status === "nolesson" ? { t: "Нет занятий", c: "bg-white/5 text-slate-400" }
      : { t: "Не отметился", c: "bg-rose-500/15 text-rose-300" };
    const lateKey = `${teacher.id}:${today}:Опоздание`;
    const photoKey = `${teacher.id}:${today}:Нет фото прихода`;
    return (
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C5A059]/15 text-sm font-black text-[#C5A059]">{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-white">{teacher.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${badge.c}`}>{badge.t}</span>
              {r && (r.hasPhoto
                ? <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">📷 фото есть</span>
                : <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">нет фото</span>)}
            </div>
          </div>
        </div>
        {(status === "late" || status === "nomark" || (r && !r.hasPhoto)) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
            {status === "late" && (
              charged[lateKey]
                ? <Charged text="Штраф за опоздание начислен" />
                : <FineBtn label="Штраф за опоздание?" onClick={() => onFine("Опоздание", 2000, today)} />
            )}
            {r && !r.hasPhoto && (
              charged[photoKey]
                ? <Charged text="Штраф за фото начислен" />
                : <FineBtn label="Штраф: нет фото?" onClick={() => onFine("Нет фото прихода", 2000, today)} />
            )}
            {status === "nomark" && <span className="text-[11px] text-slate-500">Не подтвердил приход сегодня</span>}
          </div>
        )}
      </div>
    );
  }

  // Неделя/месяц — агрегат + инциденты опозданий.
  const marked = teacher.recs.length;
  const lates = teacher.recs.filter((r) => r.late);
  const noPhoto = teacher.recs.filter((r) => !r.hasPhoto).length;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141414] p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C5A059]/15 text-sm font-black text-[#C5A059]">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">{teacher.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-slate-400">отмечено {marked}</span>
            <span className={`rounded-full px-2 py-0.5 ${lates.length ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-slate-400"}`}>опозданий {lates.length}</span>
            <span className={`rounded-full px-2 py-0.5 ${noPhoto ? "bg-rose-500/15 text-rose-300" : "bg-white/5 text-slate-400"}`}>без фото {noPhoto}</span>
          </div>
        </div>
      </div>
      {lates.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
          {lates.map((r) => {
            const k = `${teacher.id}:${r.date}:Опоздание`;
            return (
              <div key={r.date} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">{r.date} · опоздание {r.time}</span>
                {charged[k] ? <Charged text="начислен" /> : <FineBtn label="Штраф?" onClick={() => onFine("Опоздание", 2000, r.date)} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FineBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20">
      <Coins className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
function Charged({ text }: { text: string }) {
  return <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300"><Check className="h-3.5 w-3.5" /> {text}</span>;
}

function FineConfirmModal({ fine, onChange, onConfirm, onCancel }: {
  fine: { teacherId: string; teacherName: string; reason: string; amount: number; date: string };
  onChange: (f: any) => void; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /><h3 className="text-base font-black text-white">Начислить штраф?</h3></div>
          <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          <p className="text-sm text-slate-300">Педагог <b className="text-white">{fine.teacherName}</b> — <b className="text-amber-300">{fine.reason}</b> ({fine.date}).</p>
          <p className="mt-1 text-[11px] text-slate-500">Система предлагает штраф. Начислять или нет — решаете вы.</p>

          <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Сумма штрафа</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input type="number" value={fine.amount} onChange={(e) => onChange({ ...fine, amount: Number(e.target.value) })}
              className="w-40 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-amber-500/50" />
            <span className="text-sm text-slate-400">₸</span>
            <div className="ml-auto flex gap-1.5">
              {[1000, 2000, 5000].map((a) => (
                <button key={a} onClick={() => onChange({ ...fine, amount: a })} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10">{money(a)}</button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={onCancel} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">Не начислять</button>
            <button onClick={onConfirm} disabled={!fine.amount} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-black transition hover:brightness-105 disabled:opacity-40">
              <Coins className="h-4 w-4" /> Начислить {money(fine.amount)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffStandardsView;
