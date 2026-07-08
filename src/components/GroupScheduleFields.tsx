/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GroupScheduleFields — поля расписания в форме группы: дни недели галочками
 * и время работы всплывающими списками (с / до). Заменяет свободный ввод —
 * благодаря этому дни всегда парсятся и группа попадает в сетку «по залам».
 * Хранит дни как строку «Пн,Ср,Пт», время как «18:00–20:00».
 */
import { WEEK_DAYS } from "./GroupScheduleGrid";

// Список времени: 08:00–22:00 с шагом 30 минут.
const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 22; h++) for (const m of [0, 30]) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  return out;
})();

function parseRange(time?: string): [string, string] {
  if (!time) return ["", ""];
  const [a, b] = String(time).split(/[–—-]/).map((s) => s.trim());
  return [a || "", b || ""];
}
const toDays = (csv?: string): string[] => (csv || "").split(",").map((s) => s.trim()).filter(Boolean);

export default function GroupScheduleFields({
  days, time, onDays, onTime, dark = true,
}: {
  days: string; time: string;
  onDays: (v: string) => void; onTime: (v: string) => void;
  dark?: boolean;
}) {
  const selected = new Set(toDays(days));
  const [start, end] = parseRange(time);
  const toggle = (d: string) => {
    const next = new Set(selected);
    if (next.has(d)) next.delete(d); else next.add(d);
    onDays(WEEK_DAYS.filter((x) => next.has(x)).join(","));
  };
  const setStart = (s: string) => onTime(`${s}${end ? `–${end}` : ""}`);
  const setEnd = (e: string) => onTime(`${start || "18:00"}${e ? `–${e}` : ""}`);

  const dayCls = (on: boolean) => dark
    ? (on ? "bg-[#C5A059] text-black border-[#C5A059]" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10")
    : (on ? "bg-[#947C51] text-white border-[#947C51]" : "bg-[#F1F4F7] text-[#46505B] border-[#DCE2E8] hover:bg-[#E9EEF3]");
  const selCls = dark ? "bg-white/5 border-white/10 text-white" : "bg-[#F1F4F7] border-[#DCE2E8] text-[#222B33]";
  const lblCls = dark ? "text-slate-500" : "text-[#6B7682]";

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <div>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${lblCls}`}>Дни недели *</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {WEEK_DAYS.map((d) => (
            <button key={d} type="button" onClick={() => toggle(d)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${dayCls(selected.has(d))}`}>
              {selected.has(d) ? "✓ " : ""}{d}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${lblCls}`}>Время с *</span>
          <select value={start} onChange={(e) => setStart(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm outline-none ${selCls}`}>
            <option value="">—</option>
            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <span className={`pb-2.5 text-sm ${lblCls}`}>–</span>
        <label className="flex flex-col gap-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${lblCls}`}>до</span>
          <select value={end} onChange={(e) => setEnd(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm outline-none ${selCls}`}>
            <option value="">—</option>
            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
