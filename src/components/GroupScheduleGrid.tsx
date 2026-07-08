/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GroupScheduleGrid — «весь график по залам». Недельная сетка: строки = зал+время,
 * колонки = дни недели, в ячейках — группы. Постоянное расписание групп берётся
 * из group.scheduleDays (какие дни) + group.scheduleTime (время) + group.hallId.
 * Тёмная тема — под кабинеты владельца/руководителя.
 */
import { useMemo } from "react";

export const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const DAY_MAP: [string, string][] = [
  ["пн", "Пн"], ["вт", "Вт"], ["ср", "Ср"], ["чт", "Чт"], ["пт", "Пт"], ["сб", "Сб"], ["вс", "Вс"],
];

/** Разобрать строку дней в набор коротких названий (устойчиво к свободному тексту). */
export function parseGroupDays(scheduleDays?: string | null): string[] {
  if (!scheduleDays) return [];
  const s = String(scheduleDays).toLowerCase();
  return DAY_MAP.filter(([token]) => s.includes(token)).map(([, code]) => code);
}

type Group = {
  id: string; name: string; hallId?: string | null;
  days?: string[]; time?: string | null;                       // смапленная группа (mapDbGroup)
  scheduleDays?: string | null; scheduleTime?: string | null;  // откат на сырые поля
  teacherName?: string | null;
};

/** Дни группы: из массива days (нормализуем к Пн..Вс), иначе парсим строку. */
function groupDays(g: Group): string[] {
  if (Array.isArray(g.days) && g.days.length) {
    const codes = g.days.map((d) => {
      const low = String(d).toLowerCase().trim();
      return (DAY_MAP.find(([t]) => low.startsWith(t)) || [null, null])[1];
    }).filter(Boolean) as string[];
    if (codes.length) return codes;
  }
  return parseGroupDays(g.scheduleDays);
}
const groupTime = (g: Group): string => (g.time || g.scheduleTime || "").toString().trim();

export default function GroupScheduleGrid({
  groups = [],
  halls = [],
  onOpenGroup,
}: {
  groups?: Group[];
  halls?: { id: string; name: string }[];
  onOpenGroup?: (id: string) => void;
}) {
  const hallName = (id?: string | null) => halls.find((h) => h.id === id)?.name || "Без зала";

  // Строки = уникальные (зал, время). Каждую группу кладём в её день-колонки.
  const rows = useMemo(() => {
    const byRow = new Map<string, { hallId: string | null; time: string; byDay: Record<string, Group[]> }>();
    for (const g of groups) {
      const days = groupDays(g);
      if (days.length === 0) continue; // без расписания в сетку не попадает
      const time = groupTime(g) || "—";
      const key = `${g.hallId || "none"}|${time}`;
      let row = byRow.get(key);
      if (!row) { row = { hallId: g.hallId || null, time, byDay: {} }; byRow.set(key, row); }
      for (const d of days) (row.byDay[d] ||= []).push(g);
    }
    return Array.from(byRow.values()).sort((a, b) =>
      hallName(a.hallId).localeCompare(hallName(b.hallId)) || a.time.localeCompare(b.time)
    );
  }, [groups, halls]);

  const withoutSchedule = groups.filter((g) => groupDays(g).length === 0);

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#111] p-8 text-center text-sm text-slate-500">
        Пока нет групп с расписанием. Добавьте группу и укажите дни и время — она появится в сетке.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#111]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 z-10 bg-[#111] px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Зал · время</th>
              {WEEK_DAYS.map((d) => (
                <th key={d} className="px-3 py-3 text-center text-[11px] font-black text-slate-400">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="sticky left-0 z-10 bg-[#111] px-4 py-3 align-top">
                  <p className="font-bold text-white">{hallName(row.hallId)}</p>
                  <p className="text-xs text-slate-500">{row.time}</p>
                </td>
                {WEEK_DAYS.map((d) => (
                  <td key={d} className="px-2 py-2 align-top">
                    <div className="flex flex-col items-stretch gap-1">
                      {(row.byDay[d] || []).map((g) => (
                        <button
                          key={g.id}
                          onClick={() => onOpenGroup?.(g.id)}
                          className="rounded-lg border border-[#C5A059]/25 bg-[#C5A059]/10 px-2 py-1.5 text-left text-xs font-bold text-[#E8C887] transition hover:bg-[#C5A059]/20"
                          title={g.teacherName ? `Педагог: ${g.teacherName}` : undefined}
                        >
                          {g.name}
                          {g.teacherName && <span className="block text-[10px] font-normal text-slate-400">{g.teacherName}</span>}
                        </button>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withoutSchedule.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-300/90">
          Без расписания ({withoutSchedule.length}): {withoutSchedule.map((g) => g.name).join(", ")}. Укажите дни и время в карточке группы.
        </div>
      )}
    </div>
  );
}
