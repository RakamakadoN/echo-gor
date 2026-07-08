/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Раздел «Журнал посещаемости» (ТЗ). Единый компонент для всех ролей:
 * владелец / управляющий / администратор / педагог. Ролевой скоуп задаётся
 * пропсами (currentBranchId / currentTeacherId / canEdit).
 */
import { useEffect, useMemo, useState } from "react";
import { parseGroupDays } from "./GroupScheduleGrid";
import {
  Users, UserX, ShoppingCart, ClipboardCheck, Clock, CheckCircle2, XCircle,
  AlertCircle, RotateCcw, Flag, MessageCircle, IdCard, BadgePlus, CalendarClock,
  ListChecks, BarChart3, Paperclip, X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
} from "lucide-react";
import type {
  Student, Group, Branch, Teacher, JournalDashboard, Recalculation,
  AttendanceStatus, AbsenceReason, JournalGroupStats,
} from "../types";

type Role = "owner" | "admin" | "teacher" | "branch_manager";

export interface JournalApi {
  loadDashboard: (params: { branchId?: string | null; groupId?: string | null; from?: string; to?: string }) => Promise<JournalDashboard & { _names?: Record<string, string> }>;
  loadRecalculations?: (studentId?: string) => Promise<Recalculation[]>;
  createRecalculation?: (payload: Partial<Recalculation>) => Promise<unknown>;
  setPayLater?: (studentId: string, enabled: boolean) => Promise<unknown>;
}

interface Props {
  role: Role;
  branches: Branch[];
  groups: Group[];
  students: Student[];
  teachers?: Teacher[];
  currentBranchId?: string | null;   // закреплённый филиал (admin / branch_manager)
  currentTeacherId?: string | null;  // педагог видит только свои группы
  canEdit?: boolean;                 // можно ли проставлять/корректировать отметки
  onToggleAttendance?: (studentId: string, date: string, status: AttendanceStatus, opts?: { absenceReason?: AbsenceReason | null; isTrial?: boolean }) => void | Promise<unknown>;
  onBulkAttendance?: (groupId: string, date: string, status: AttendanceStatus) => Promise<number> | void;
  onCreateTask?: (payload: { studentId: string; studentName: string; title: string }) => void;
  journal: JournalApi;
}

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const REASONS: { id: AbsenceReason; label: string }[] = [
  { id: "illness", label: "Болезнь" },
  { id: "certificate", label: "Справка" },
  { id: "left", label: "Уехал" },
  { id: "family", label: "Семейные обстоятельства" },
  { id: "no_notice", label: "Не предупредил" },
  { id: "other", label: "Другое" },
];

const STATUS_META: Record<string, { short: string; label: string; cell: string; dot: string }> = {
  present:  { short: "✓", label: "Был",                 cell: "bg-emerald-500/90 text-black",  dot: "bg-emerald-500" },
  absent:   { short: "✕", label: "Не был",              cell: "bg-red-700 text-white",         dot: "bg-red-700" },
  excused:  { short: "!", label: "Уважительная причина", cell: "bg-sky-500/90 text-black",      dot: "bg-sky-500" },
  recalc:   { short: "↻", label: "Перерасчёт",          cell: "bg-amber-500/90 text-black",    dot: "bg-amber-500" },
  trial:    { short: "⚑", label: "Пробный урок",        cell: "bg-violet-500/90 text-white",   dot: "bg-violet-500" },
  sick:     { short: "Б", label: "Болел (старое)",      cell: "bg-amber-500/90 text-black",    dot: "bg-amber-500" },
  unmarked: { short: "—", label: "Не отмечено",         cell: "bg-white/5 text-slate-500",     dot: "bg-white/10" },
};

// Локальная дата YYYY-MM-DD БЕЗ перевода в UTC (иначе для UTC+N дата уезжает на день назад).
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayIso = () => iso(new Date());

function studentInGroup(s: Student, groupId: string) {
  return s.groupIds?.includes(groupId) || (s as any).groupId === groupId;
}

function hasActiveSub(s: Student) {
  const t = todayIso();
  return (s.subscriptions || []).some((sub) => sub.status === "active" && ((sub.lessonsLeft || 0) > 0 || (sub.validUntil && sub.validUntil >= t)));
}

// Даты занятий группы в выбранном месяце по её расписанию (group.days).
function groupLessonDates(group: Group | undefined, year: number, month: number): string[] {
  if (!group) return [];
  // Устойчивый парсинг дней («Пн,Ср» и «Понедельник среда»). Без расписания —
  // пусто (не подставляем фейковые дни): показываем только фактические занятия.
  const days = parseGroupDays((group.days || []).join(" "));
  if (!days.length) return [];
  const out: string[] = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= last; day++) {
    const d = new Date(year, month, day);
    if (days.includes(WEEKDAYS[d.getDay()])) out.push(iso(d));
  }
  return out;
}

// Карточка-показатель дашборда.
function MetricCard({ icon: Icon, tone, value, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${active ? "border-[#C5A059] bg-[#C5A059]/10" : "border-white/10 bg-white/[0.04] hover:border-white/20"}`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block text-xl font-black leading-none text-white">{value}</span>
        <span className="mt-1 block truncate text-[11px] font-semibold text-slate-400">{label}</span>
      </span>
    </button>
  );
}

export default function AttendanceJournalView(props: Props) {
  const { role, branches, groups, students, teachers = [], currentBranchId, currentTeacherId, canEdit = true, onToggleAttendance, onBulkAttendance, onCreateTask, journal } = props;

  const now = new Date();
  const [branchId, setBranchId] = useState<string | null>(role === "owner" ? null : currentBranchId || null);
  const [month, setMonth] = useState<number>(now.getMonth());
  const [year, setYear] = useState<number>(now.getFullYear());

  // Видимые группы по роли.
  const visibleGroups = useMemo(() => {
    let gs = groups;
    if (role === "teacher" && currentTeacherId) gs = gs.filter((g) => g.teacherId === currentTeacherId);
    else if (role !== "owner" && currentBranchId) gs = gs.filter((g) => g.branchId === currentBranchId);
    if (branchId) gs = gs.filter((g) => g.branchId === branchId);
    return gs;
  }, [groups, role, currentTeacherId, currentBranchId, branchId]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  useEffect(() => {
    if (!visibleGroups.find((g) => g.id === selectedGroupId)) setSelectedGroupId(visibleGroups[0]?.id || "");
  }, [visibleGroups, selectedGroupId]);

  const selectedGroup = visibleGroups.find((g) => g.id === selectedGroupId);
  const teacherName = (id?: string) => teachers.find((t) => t.id === id)?.name || "—";

  // Ученики группы, отфильтрованные по ТЗ §8 (без архивных / ушедших / без группы).
  const HIDDEN = new Set(["archived", "left", "waitlist", "lead"]);
  const HIDDEN_MANUAL = new Set(["Лист ожидания", "Каникулы", "Архив"]);
  const groupStudents = useMemo(() =>
    students
      .filter((s) => studentInGroup(s, selectedGroupId))
      .filter((s) => !HIDDEN.has(String(s.status)) && !HIDDEN_MANUAL.has(String(s.manualStatus || "")))
  , [students, selectedGroupId]);

  // Сегментация (ТЗ §8): активные / не оплатили но ходят / пробные.
  const segActive = groupStudents.filter((s) => hasActiveSub(s) && s.status !== "trial");
  const segTrial = groupStudents.filter((s) => s.status === "trial");
  const segUnpaid = groupStudents.filter((s) => !hasActiveSub(s) && s.status !== "trial");

  const lessonDates = useMemo(() => groupLessonDates(selectedGroup, year, month), [selectedGroup, year, month]);

  // --- Дашборд (серверные показатели) ---
  const [dash, setDash] = useState<(JournalDashboard & { _names?: Record<string, string> }) | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const refreshDash = () => {
    const from = iso(new Date(year, month, 1));
    const to = iso(new Date(year, month + 1, 0));
    journal.loadDashboard({ branchId, from, to })
      .then((d) => { setDash(d); if (d._names) setNames(d._names); })
      .catch(() => setDash(null));
  };
  useEffect(refreshDash, [branchId, month, year]);

  const nameOf = (id: string) => names[id] || students.find((s) => s.id === id)?.name || "Ученик";

  // --- Локальное состояние UI ---
  const [saving, setSaving] = useState<string | null>(null);
  const [cellMenu, setCellMenu] = useState<{ studentId: string; date: string } | null>(null);
  const [showMass, setShowMass] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRecalc, setShowRecalc] = useState<Student | null>(null);
  const [detail, setDetail] = useState<null | "visited" | "unpaid" | "trialNotBought" | "trialBought">(null);
  // «Развернуть журнал»: скрывает дашборд и боковые панели, оставляя группу + таблицу на всю ширину.
  const [expanded, setExpanded] = useState(false);

  const mark = async (studentId: string, date: string, status: AttendanceStatus, opts?: { absenceReason?: AbsenceReason | null }) => {
    if (!onToggleAttendance) return;
    // Педагог ставит только «был/не был». Пробный определяется автоматически по
    // статусу ученика «Пробный урок» — система сама помечает посещение пробным.
    const st = students.find((s) => s.id === studentId);
    const isTrial = st?.status === "trial" ? true : undefined;
    setSaving(studentId + date);
    try { await onToggleAttendance(studentId, date, status, { ...(opts || {}), isTrial }); } finally { setSaving(null); refreshDash(); }
    setCellMenu(null);
  };

  const massMark = async (status: AttendanceStatus, date: string) => {
    if (!onBulkAttendance || !selectedGroupId) return;
    await onBulkAttendance(selectedGroupId, date, status);
    setShowMass(false);
    refreshDash();
  };

  const stats = useMemo<JournalGroupStats>(() => {
    const totalCells = lessonDates.length * groupStudents.length;
    let visits = 0, misses = 0;
    const missByStudent = new Map<string, number>();
    groupStudents.forEach((s) => {
      lessonDates.forEach((d) => {
        const st = s.attendance?.[d]?.status;
        if (st === "present" || st === "excused" || st === "trial") visits++;
        else if (st === "absent" || st === "sick") { misses++; missByStudent.set(s.id, (missByStudent.get(s.id) || 0) + 1); }
      });
    });
    const frequent = [...missByStudent.entries()].filter(([, n]) => n >= 3)
      .map(([id, n]) => ({ studentId: id, name: nameOf(id), misses: n })).sort((a, b) => b.misses - a.misses);
    const noMiss = groupStudents.filter((s) => !missByStudent.get(s.id) && lessonDates.some((d) => s.attendance?.[d]))
      .map((s) => ({ studentId: s.id, name: s.name }));
    return {
      groupId: selectedGroupId,
      lessonsCount: lessonDates.length,
      visitsCount: visits,
      missesCount: misses,
      avgAttendance: lessonDates.length ? Math.round((visits / lessonDates.length) * 10) / 10 : 0,
      attendanceRate: totalCells ? Math.round((visits / totalCells) * 100) : 0,
      frequentMissers: frequent,
      noMissStudents: noMiss,
    };
  }, [lessonDates, groupStudents, selectedGroupId]);

  const fmtDay = (d: string) => { const x = new Date(d); return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}`; };
  const fmtWd = (d: string) => WEEKDAYS[new Date(d).getDay()];

  const detailList = (): { id: string; name: string }[] => {
    if (!dash || !detail) return [];
    return dash[detail].studentIds.map((id) => ({ id, name: nameOf(id) }));
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Заголовок + фильтры */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Журнал посещаемости</h2>
          <p className="mt-1 text-xs text-slate-500">Отметка «был / не был». Пробные и статус «не оплатили, но ходят» система определяет сама.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 self-stretch rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {expanded ? "Свернуть" : "Развернуть журнал"}
          </button>
          {role === "owner" && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Филиал</span>
              <select value={branchId || ""} onChange={(e) => setBranchId(e.target.value || null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <option value="">Все филиалы</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Месяц</span>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
              <button onClick={() => { const m = month - 1; if (m < 0) { setMonth(11); setYear(year - 1); } else setMonth(m); }} className="rounded-lg p-1 text-slate-400 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[110px] text-center text-sm font-bold text-white">{MONTHS[month]} {year}</span>
              <button onClick={() => { const m = month + 1; if (m > 11) { setMonth(0); setYear(year + 1); } else setMonth(m); }} className="rounded-lg p-1 text-slate-400 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </label>
        </div>
      </div>

      {/* Дашборд-показатели (ТЗ §2) — скрываются в режиме «Развернуть журнал» */}
      {!expanded && (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard icon={Users} tone="bg-sky-500/15 text-sky-300" value={dash?.visited.count ?? "—"} label="Посетили занятия" active={detail === "visited"} onClick={() => setDetail(detail === "visited" ? null : "visited")} />
        <MetricCard icon={UserX} tone="bg-amber-500/15 text-amber-300" value={dash?.unpaid.count ?? "—"} label="Посещают без оплаты" active={detail === "unpaid"} onClick={() => setDetail(detail === "unpaid" ? null : "unpaid")} />
        <MetricCard icon={UserX} tone="bg-red-500/15 text-red-300" value={dash?.trialNotBought.count ?? "—"} label="Были на ПУ и не купили" active={detail === "trialNotBought"} onClick={() => setDetail(detail === "trialNotBought" ? null : "trialNotBought")} />
        <MetricCard icon={ShoppingCart} tone="bg-emerald-500/15 text-emerald-300" value={dash?.trialBought.count ?? "—"} label="Купили после ПУ" active={detail === "trialBought"} onClick={() => setDetail(detail === "trialBought" ? null : "trialBought")} />
        <MetricCard icon={Clock} tone="bg-rose-500/15 text-rose-300" value={dash?.openJournals.length ?? "—"} label="Группы без отметок" active={false} onClick={() => { const el = document.getElementById("kpi-open-journals"); el?.scrollIntoView({ behavior: "smooth" }); }} />
      </div>
      )}

      {/* Раскрытый список показателя */}
      {!expanded && detail && dash && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">{({ visited: "Посетили занятия", unpaid: "Посещают без оплаты", trialNotBought: "Были на ПУ и не купили", trialBought: "Купили после ПУ" } as any)[detail]} — {detailList().length}</h4>
            <button onClick={() => setDetail(null)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          {detailList().length === 0 ? <p className="text-xs text-slate-500">Список пуст.</p> : (
            <div className="flex flex-wrap gap-2">
              {detailList().map((x) => <span key={x.id} className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-200">{x.name}</span>)}
            </div>
          )}
        </div>
      )}

      {/* KPI: педагоги не закрыли журнал (ТЗ §3) */}
      {!expanded && (
      <div id="kpi-open-journals" className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-rose-300" />
          <h3 className="text-sm font-black text-white">Педагоги не закрыли журнал после занятий</h3>
          <span className="ml-auto rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-200">{dash?.openJournals.length ?? 0}</span>
        </div>
        {!dash || dash.openJournals.length === 0 ? (
          <p className="text-xs text-slate-400">Все журналы закрыты вовремя.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr><th className="py-1 pr-4 font-bold">Педагог</th><th className="py-1 pr-4 font-bold">Группа</th><th className="py-1 pr-4 font-bold">Время</th><th className="py-1 pr-4 font-bold">Статус</th><th className="py-1 font-bold">Не отмечено</th></tr>
              </thead>
              <tbody>
                {dash.openJournals.map((o) => (
                  <tr key={o.lessonId} className="border-t border-white/5">
                    <td className="py-2 pr-4 font-semibold text-white">{o.teacherName}</td>
                    <td className="py-2 pr-4 text-slate-300">{o.groupName}</td>
                    <td className="py-2 pr-4 text-slate-400">{o.timeLabel}</td>
                    <td className="py-2 pr-4"><span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-bold text-rose-200">Не закрыт</span></td>
                    <td className="py-2 font-bold text-amber-200">{o.unmarkedCount} уч.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Выбор группы — сверху, на всю ширину (ТЗ заказчика). */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Группа</h3>
          <span className="text-[11px] text-slate-500">{visibleGroups.length} групп</span>
        </div>
        {visibleGroups.length === 0 ? (
          <p className="px-1 text-xs text-slate-500">Нет доступных групп.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleGroups.map((g) => {
              const active = g.id === selectedGroupId;
              const cnt = students.filter((s) => studentInGroup(s, g.id)).length;
              return (
                <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-all ${active ? "border-[#C5A059] bg-[#C5A059]/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
                  <p className="truncate text-sm font-bold text-white">{g.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{g.time || g.scheduleText} · {teacherName(g.teacherId)} · {cnt} уч.</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Таблица журнала — на всю ширину */}
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">Журнал группы: {selectedGroup?.name || "—"}</h3>
              <p className="text-[11px] text-slate-500">{lessonDates.length} занятий · {groupStudents.length} учеников</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowStats(true)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"><BarChart3 className="h-4 w-4" /> Статистика</button>
              {canEdit && <button onClick={() => setShowMass(true)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"><ListChecks className="h-4 w-4" /> Массовая отметка</button>}
            </div>
          </div>

          {groupStudents.length === 0 || lessonDates.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-500">
              {groupStudents.length === 0 ? "В группе нет учеников для отображения." : "В выбранном месяце нет занятий по расписанию группы."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-[#0c0c0c] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Ученик</th>
                    {lessonDates.map((d) => (
                      <th key={d} className="px-1.5 py-2 text-center text-[10px] font-bold text-slate-400">
                        <div>{fmtDay(d)}</div><div className="text-slate-600">{fmtWd(d)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[{ label: "Активные ученики", list: segActive, tone: "text-emerald-300" }, { label: "Не оплатили, но ходят", list: segUnpaid, tone: "text-amber-300" }, { label: "Пробные уроки", list: segTrial, tone: "text-violet-300" }].map((seg) => seg.list.length === 0 ? null : (
                    <FragmentRows key={seg.label} seg={seg} lessonDates={lessonDates} saving={saving} canEdit={canEdit}
                      onCell={(studentId, date) => canEdit && setCellMenu(cellMenu?.studentId === studentId && cellMenu?.date === date ? null : { studentId, date })}
                      cellMenu={cellMenu} onMark={mark} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Легенда */}
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-500">
            {(["present", "absent", "trial", "unmarked"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded ${STATUS_META[s].dot}`} /> {STATUS_META[s].label}</span>
            ))}
          </div>
        </div>

        {/* Панели «без оплаты»/«ПУ» — под таблицей, скрываются в развёрнутом режиме */}
        {!expanded && (
        <div className="grid gap-3 md:grid-cols-2">
          <RailCard title="Посещают без оплаты" count={dash?.unpaid.count ?? 0} ids={dash?.unpaid.studentIds || []} students={students} nameOf={nameOf}
            onAction={(s) => ({ student: s })} journal={journal} onCreateTask={onCreateTask} onRefresh={refreshDash} setShowRecalc={setShowRecalc} canEdit={canEdit} />
          <RailCard title="Были на ПУ и не купили" count={dash?.trialNotBought.count ?? 0} ids={dash?.trialNotBought.studentIds || []} students={students} nameOf={nameOf}
            onAction={(s) => ({ student: s })} journal={journal} onCreateTask={onCreateTask} onRefresh={refreshDash} setShowRecalc={setShowRecalc} canEdit={canEdit} />
        </div>
        )}
      </div>

      {/* Модалки */}
      {showMass && <MassMarkModal groupName={selectedGroup?.name} dates={lessonDates} onClose={() => setShowMass(false)} onApply={massMark} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
      {showRecalc && <RecalcModal student={showRecalc} journal={journal} onClose={() => setShowRecalc(null)} onDone={() => { setShowRecalc(null); refreshDash(); }} />}
      {cellMenu && (
        <CellMenu state={cellMenu} student={students.find((s) => s.id === cellMenu.studentId)}
          onClose={() => setCellMenu(null)} onMark={mark} />
      )}
    </div>
  );
}

// Группа строк сегмента (активные / без оплаты / пробные).
// Дата зачисления ученика: ранняя дата начала абонемента, иначе дата регистрации.
// До неё педагог не должен ставить отметки (ТЗ: только за период абонемента).
function enrolledFrom(s: Student): string | null {
  const subStarts = (s.subscriptions || []).map((x) => (x as any).startsOn).filter(Boolean) as string[];
  const created = (s as any).createdAt ? String((s as any).createdAt).slice(0, 10) : null;
  const all = [...subStarts, ...(created ? [created] : [])].filter(Boolean).sort();
  return all[0] || null;
}

function FragmentRows({ seg, lessonDates, saving, canEdit, onCell, cellMenu, onMark }: any) {
  return (
    <>
      <tr><td colSpan={lessonDates.length + 1} className={`sticky left-0 bg-[#0c0c0c] px-2 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider ${seg.tone}`}>{seg.label}</td></tr>
      {seg.list.map((s: Student) => {
        const from = enrolledFrom(s);
        return (
        <tr key={s.id} className="group">
          <td className="sticky left-0 z-10 bg-[#0c0c0c] px-2 py-1.5">
            <span className="block max-w-[220px] truncate text-sm font-semibold tracking-tight text-white" title={s.name}>{s.name}</span>
          </td>
          {lessonDates.map((d: string) => {
            // До зачисления ученика — ячейка недоступна (отметок нет и ставить нельзя).
            if (from && d < from) {
              return (
                <td key={d} className="px-1 py-1 text-center">
                  <span className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-white/[0.02] text-[11px] text-slate-700" title={`Ученик зачислен ${new Date(from).toLocaleDateString("ru-RU")}`}>·</span>
                </td>
              );
            }
            const st = (s.attendance?.[d]?.status || "unmarked") as string;
            const meta = STATUS_META[st] || STATUS_META.unmarked;
            const isSaving = saving === s.id + d;
            const open = cellMenu?.studentId === s.id && cellMenu?.date === d;
            return (
              <td key={d} className="px-1 py-1 text-center">
                <button disabled={!canEdit || isSaving} onClick={() => onCell(s.id, d)}
                  className={`mx-auto grid h-7 w-7 place-items-center rounded-lg text-[11px] font-black transition-all ${meta.cell} ${open ? "ring-2 ring-[#C5A059]" : ""} ${canEdit ? "hover:opacity-80" : "cursor-default"} ${isSaving ? "opacity-40" : ""}`}>
                  {meta.short}
                </button>
              </td>
            );
          })}
        </tr>
        );
      })}
    </>
  );
}

// Попап отметки ячейки: только «Был» / «Не был» (+снять). Пробный определяется
// автоматически по статусу ученика, причины/перерасчёт убраны по ТЗ заказчика.
function CellMenu({ state, student, onClose, onMark }: any) {
  const isTrial = student?.status === "trial";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#11121A] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">{student?.name}</p>
            <p className="text-[11px] text-slate-500">{new Date(state.date).toLocaleDateString("ru-RU")}{isTrial ? " · пробный урок" : ""}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatusBtn icon={CheckCircle2} label="Был" tone="bg-emerald-500/15 text-emerald-300" onClick={() => onMark(state.studentId, state.date, "present")} />
          <StatusBtn icon={XCircle} label="Не был" tone="bg-red-500/15 text-red-300" onClick={() => onMark(state.studentId, state.date, "absent")} />
          <StatusBtn icon={X} label="Снять" tone="bg-white/5 text-slate-400" onClick={() => onMark(state.studentId, state.date, "unmarked")} />
        </div>
        {isTrial && <p className="mt-3 text-[11px] text-violet-300/80">Пробный урок: отметка «Был» = пришёл на пробный, «Не был» = не пришёл.</p>}
      </div>
    </div>
  );
}

function StatusBtn({ icon: Icon, label, tone, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition-all hover:opacity-80 ${tone}`}>
      <Icon className="h-5 w-5" /><span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}

// Правый рейл с быстрыми действиями.
function RailCard({ title, count, ids, students, nameOf, journal, onCreateTask, onRefresh, setShowRecalc, canEdit }: any) {
  const list = (ids as string[]).slice(0, 6);
  const find = (id: string): Student | undefined => students.find((s: Student) => s.id === id);
  const wa = (s?: Student) => { if (s?.parentPhone) window.open(`https://wa.me/${s.parentPhone.replace(/\D/g, "")}`, "_blank"); };
  const payLater = async (s?: Student) => { if (s && journal.setPayLater) { await journal.setPayLater(s.id, true); onRefresh(); } };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white">{title}</h3>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">{count}</span>
      </div>
      {list.length === 0 ? <p className="text-[11px] text-slate-500">Пусто.</p> : (
        <div className="space-y-1.5">
          {list.map((id) => {
            const s = find(id);
            return (
              <div key={id} className="rounded-xl bg-white/[0.04] px-2.5 py-2">
                <p className="truncate text-xs font-semibold text-white">{nameOf(id)}</p>
                <div className="mt-1.5 flex gap-1">
                  <RailAct icon={MessageCircle} title="WhatsApp" onClick={() => wa(s)} />
                  <RailAct icon={IdCard} title="Карточка" onClick={() => {}} />
                  {canEdit && <RailAct icon={BadgePlus} title="Оплатит позже" onClick={() => payLater(s)} />}
                  {canEdit && <RailAct icon={RotateCcw} title="Перерасчёт" onClick={() => s && setShowRecalc(s)} />}
                  {onCreateTask && <RailAct icon={ClipboardCheck} title="Задача" onClick={() => s && onCreateTask({ studentId: s.id, studentName: s.name, title: `Связаться: ${s.name}` })} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RailAct({ icon: Icon, title, onClick }: any) {
  return <button title={title} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"><Icon className="h-3.5 w-3.5" /></button>;
}

// Массовая отметка (ТЗ §7).
function MassMarkModal({ groupName, dates, onClose, onApply }: any) {
  const [date, setDate] = useState<string>(dates[dates.length - 1] || todayIso());
  return (
    <Modal title={`Массовая отметка · ${groupName || ""}`} onClose={onClose}>
      <label className="mb-3 block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Дата занятия</span>
        <select value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          {dates.map((d: string) => <option key={d} value={d}>{new Date(d).toLocaleDateString("ru-RU")}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onApply("present", date)} className="rounded-xl bg-emerald-500/15 px-3 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/25">Все «Был»</button>
        <button onClick={() => onApply("absent", date)} className="rounded-xl bg-red-500/15 px-3 py-3 text-sm font-bold text-red-300 hover:bg-red-500/25">Все «Не был»</button>
        <button onClick={() => onApply("excused", date)} className="rounded-xl bg-sky-500/15 px-3 py-3 text-sm font-bold text-sky-300 hover:bg-sky-500/25">Все «Уваж.»</button>
        <button onClick={() => onApply("unmarked", date)} className="rounded-xl bg-white/5 px-3 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">Снять отметки</button>
      </div>
    </Modal>
  );
}

// Статистика посещаемости (ТЗ §11).
function StatsModal({ stats, onClose }: { stats: JournalGroupStats; onClose: () => void }) {
  const Row = ({ k, v }: any) => <div className="flex items-center justify-between border-b border-white/5 py-2 text-sm"><span className="text-slate-400">{k}</span><span className="font-bold text-white">{v}</span></div>;
  return (
    <Modal title="Статистика посещаемости" onClose={onClose}>
      <Row k="Количество занятий" v={stats.lessonsCount} />
      <Row k="Количество посещений" v={stats.visitsCount} />
      <Row k="Количество пропусков" v={stats.missesCount} />
      <Row k="Средняя посещаемость" v={`${stats.avgAttendance} уч./занятие`} />
      <Row k="Процент посещаемости" v={`${stats.attendanceRate}%`} />
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">Частые пропуски (3+)</p>
        {stats.frequentMissers.length === 0 ? <p className="text-xs text-slate-500">Нет.</p> :
          <div className="flex flex-wrap gap-1.5">{stats.frequentMissers.map((m) => <span key={m.studentId} className="rounded-lg bg-rose-500/15 px-2 py-1 text-xs text-rose-200">{m.name} · {m.misses}</span>)}</div>}
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">Без пропусков</p>
        {stats.noMissStudents.length === 0 ? <p className="text-xs text-slate-500">Нет.</p> :
          <div className="flex flex-wrap gap-1.5">{stats.noMissStudents.map((m) => <span key={m.studentId} className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">{m.name}</span>)}</div>}
      </div>
    </Modal>
  );
}

// Перерасчёт (ТЗ §10).
function RecalcModal({ student, journal, onClose, onDone }: { student: Student; journal: JournalApi; onClose: () => void; onDone: () => void }) {
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [lessons, setLessons] = useState("0");
  const [reason, setReason] = useState<AbsenceReason>("illness");
  const [amount, setAmount] = useState("0");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<{ name: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, url: String(reader.result) });
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!journal.createRecalculation) return;
    setBusy(true); setErr(null);
    try {
      await journal.createRecalculation({
        studentId: student.id, periodFrom: periodFrom || null, periodTo: periodTo || null,
        lessonsCount: Number(lessons) || 0, reason, amount: Number(amount) || 0, comment,
        attachmentUrl: file?.url || null, attachmentName: file?.name || null,
      });
      onDone();
    } catch (e: any) { setErr(e?.message || "Не удалось сохранить перерасчёт"); } finally { setBusy(false); }
  };

  return (
    <Modal title={`Перерасчёт · ${student.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-500">Период с</span><input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></label>
        <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-500">по</span><input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></label>
        <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-500">Кол-во занятий</span><input type="number" value={lessons} onChange={(e) => setLessons(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></label>
        <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-500">Сумма, ₸</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></label>
      </div>
      <label className="mt-2 block"><span className="mb-1 block text-[11px] font-bold text-slate-500">Причина</span>
        <select value={reason} onChange={(e) => setReason(e.target.value as AbsenceReason)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          {REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <label className="mt-2 block"><span className="mb-1 block text-[11px] font-bold text-slate-500">Комментарий</span><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></label>
      <label className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400 hover:border-white/30 cursor-pointer">
        <Paperclip className="h-4 w-4" /> {file ? file.name : "Прикрепить справку (фото / PDF / изображение)"}
        <input type="file" accept="image/*,.pdf" onChange={onFile} className="hidden" />
      </label>
      {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      <p className="mt-2 text-[11px] text-slate-500">Перерасчёт будет автоматически предложен при следующей продаже абонемента.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5">Отмена</button>
        <button onClick={submit} disabled={busy} className="rounded-xl bg-[#C5A059] px-4 py-2 text-sm font-black text-black hover:opacity-90 disabled:opacity-50">{busy ? "Сохранение…" : "Оформить перерасчёт"}</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#11121A] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
