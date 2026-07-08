/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GroupsTable + GroupsArchivePanel — общий «Список групп» (сортировка
 * филиал → педагог → название) и «Архив групп» (восстановить / удалить навсегда)
 * для кабинетов руководителя филиала и администратора. Тёмная тема.
 */

type NamedRef = { id: string; name?: string; city?: string };

const refName = (list: NamedRef[] | undefined, id?: string | null, fallback = "—") =>
  (list || []).find((x) => x.id === id)?.name || (list || []).find((x) => x.id === id)?.city || fallback;

export function GroupsTable({
  groups = [],
  branches = [],
  teachers = [],
  halls = [],
  onArchiveGroup,
}: {
  groups?: any[];
  branches?: NamedRef[];
  teachers?: NamedRef[];
  halls?: NamedRef[];
  onArchiveGroup?: (id: string) => void;
}) {
  const sorted = [...groups].sort((a, b) =>
    refName(branches, a.branchId).localeCompare(refName(branches, b.branchId)) ||
    refName(teachers, a.teacherId, "Не назначен").localeCompare(refName(teachers, b.teacherId, "Не назначен")) ||
    String(a.name).localeCompare(String(b.name))
  );
  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#111]">
      <table className="w-full min-w-[720px] text-sm">
        <thead><tr className="border-b border-white/10 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
          <th className="px-4 py-3">Группа</th><th className="px-3 py-3">Филиал</th><th className="px-3 py-3">Педагог</th><th className="px-3 py-3">Зал</th><th className="px-3 py-3">Расписание</th><th className="px-3 py-3 text-center">Учеников</th><th className="px-3 py-3" />
        </tr></thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Активных групп нет.</td></tr>
          ) : sorted.map((g: any) => (
            <tr key={g.id} className="border-b border-white/5">
              <td className="px-4 py-2.5 font-bold text-white">{g.name}</td>
              <td className="px-3 py-2.5 text-slate-300">{refName(branches, g.branchId)}</td>
              <td className="px-3 py-2.5 text-slate-300">{refName(teachers, g.teacherId, "Не назначен")}</td>
              <td className="px-3 py-2.5 text-slate-400">{refName(halls, g.hallId)}</td>
              <td className="px-3 py-2.5 text-slate-400">{[(g.days || []).join(", "), g.time].filter(Boolean).join(" · ") || "—"}</td>
              <td className="px-3 py-2.5 text-center text-slate-300">{g.studentCount ?? 0}</td>
              <td className="px-3 py-2.5 text-right">
                {onArchiveGroup && (
                  <button onClick={() => { if (window.confirm(`Архивировать группу «${g.name}»?`)) onArchiveGroup(g.id); }} className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-300">В архив</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GroupsArchivePanel({
  archivedGroups = [],
  branches = [],
  onRestoreGroup,
  onDeleteGroupPermanent,
}: {
  archivedGroups?: any[];
  branches?: NamedRef[];
  onRestoreGroup?: (id: string) => Promise<boolean> | boolean | void;
  onDeleteGroupPermanent?: (id: string) => Promise<boolean> | boolean | void;
}) {
  if (!archivedGroups.length) {
    return <div className="rounded-3xl border border-white/10 bg-[#111] p-8 text-center text-sm text-slate-500">Архив групп пуст.</div>;
  }
  return (
    <div className="space-y-2">
      {archivedGroups.map((g: any) => (
        <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111] px-4 py-3">
          <div>
            <p className="font-bold text-white">{g.name}</p>
            <p className="text-xs text-slate-500">{refName(branches, g.branchId)} · {[(g.days || []).join(", "), g.time].filter(Boolean).join(" · ") || "без расписания"}</p>
          </div>
          <div className="flex gap-2">
            {onRestoreGroup && (
              <button onClick={() => onRestoreGroup(g.id)} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20">Восстановить</button>
            )}
            {onDeleteGroupPermanent && (
              <button onClick={() => { if (window.confirm(`Удалить группу «${g.name}» НАВСЕГДА? Отменить нельзя.`)) onDeleteGroupPermanent(g.id); }} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20">Удалить</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
