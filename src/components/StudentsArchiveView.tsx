/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentsArchiveView — отдельное окно «Архив» раздела «Ученики».
 * Две категории с фильтром:
 *   • Ушедшие      — купили ≥1 абонемент и ушли (реальный архив, archived_at).
 *   • Отказавшиеся — ушли на этапе пробных (вычисляется из воронки, в БД не переносится).
 * Показывает причину ухода, комментарий и СРОК (сколько прошло с ухода) —
 * основа для ИИ-реактивации на дашборде.
 */
import { useMemo, useState, type ElementType } from "react";
import { Archive, Search, UserX, UserMinus } from "lucide-react";
import { Student, Branch } from "../types";
import { getStudentState } from "../studentSegments";

type ArchiveStudent = {
  id: string; name: string; branchId: string; phone?: string;
  parentName?: string; parentPhone?: string; archivedAt: string; archivedBy?: string;
  archiveReason?: string; archiveComment?: string;
  subscriptionsCount?: number; category?: "left" | "declined";
};

type Cat = "all" | "left" | "declined";

/** Человекочитаемый срок с даты ухода: «3 мес назад», «12 дней назад», «сегодня». */
function sinceLabel(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return "сегодня";
  if (days < 30) {
    const n1 = days % 10, n = days % 100;
    const w = n > 10 && n < 20 ? "дней" : n1 === 1 ? "день" : n1 >= 2 && n1 <= 4 ? "дня" : "дней";
    return `${days} ${w} назад`;
  }
  const months = Math.floor(days / 30);
  const m1 = months % 10, m = months % 100;
  const w = m > 10 && m < 20 ? "мес" : m1 === 1 ? "мес" : "мес"; // «мес» универсально
  return `${months} ${w} назад`;
}

export default function StudentsArchiveView({
  archive = [],
  students = [],
  branches = [],
  onUnarchive,
}: {
  archive?: ArchiveStudent[];
  students?: Student[];
  branches?: Branch[];
  onUnarchive?: (id: string) => Promise<unknown> | void;
}) {
  const [cat, setCat] = useState<Cat>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name || "—";

  // Унифицированная строка архива из двух источников.
  const rows = useMemo(() => {
    const fromArchive = archive.map((a) => ({
      id: a.id,
      name: a.name,
      branchId: a.branchId,
      category: (a.category || (Number(a.subscriptionsCount) >= 1 ? "left" : "declined")) as "left" | "declined",
      leftAt: a.archivedAt,
      reason: a.archiveReason || "",
      comment: a.archiveComment || "",
      statusLabel: "",
      canUnarchive: true,
    }));
    // Отказавшиеся из активного списка: провал воронки пробных (вычисляемо).
    const declinedFromActive = students
      .map((s) => ({ s, st: getStudentState(s) }))
      .filter(({ st }) => st.statusKey === "trial_lost" || st.statusKey === "trial_missed")
      .map(({ s, st }) => ({
        id: s.id,
        name: s.name,
        branchId: (s as any).branchId,
        category: "declined" as const,
        leftAt: (s as any).createdAt || "",
        reason: st.statusLabel,
        comment: "",
        statusLabel: st.statusLabel,
        canUnarchive: false,
      }));
    return [...fromArchive, ...declinedFromActive];
  }, [archive, students]);

  const counts = useMemo(() => ({
    all: rows.length,
    left: rows.filter((r) => r.category === "left").length,
    declined: rows.filter((r) => r.category === "declined").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => cat === "all" || r.category === cat)
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || (r.reason || "").toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.leftAt || 0).getTime() - new Date(a.leftAt || 0).getTime());
  }, [rows, cat, q]);

  const unarchive = async (id: string) => {
    if (!onUnarchive) return;
    setBusy(id);
    try { await onUnarchive(id); } finally { setBusy(null); }
  };

  const TABS: { id: Cat; label: string; icon: ElementType }[] = [
    { id: "all", label: "Все", icon: Archive },
    { id: "left", label: "Ушедшие", icon: UserX },
    { id: "declined", label: "Отказавшиеся", icon: UserMinus },
  ];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-amber-500/20 bg-[#14110d]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/15 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-500/15 p-2.5 text-amber-300"><Archive className="h-5 w-5" /></div>
          <div>
            <h3 className="font-black text-white">Архив учеников</h3>
            <p className="text-xs text-slate-500">Ушедшие и отказавшиеся с сохранёнными данными. Основа для рассылок и возврата.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по имени или причине"
            className="w-64 rounded-xl border border-white/10 bg-[#0C0C0C] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-500/40"
          />
        </div>
      </div>

      {/* Переключатель категорий */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 px-5 py-3">
        {TABS.map((t) => {
          const active = cat === t.id;
          const n = counts[t.id];
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setCat(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${active ? "bg-amber-500/20 text-amber-200" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-amber-500/30 text-amber-100" : "bg-white/10 text-slate-500"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          {cat === "left" ? "Нет ушедших учеников." : cat === "declined" ? "Нет отказавшихся." : "Архив пуст."}
        </p>
      ) : (
        filtered.map((r) => (
          <div key={`${r.category}-${r.id}`} className="grid grid-cols-1 gap-3 border-b border-white/5 px-5 py-3 text-sm md:grid-cols-12 md:items-start">
            <div className="md:col-span-3">
              <div className="flex items-center gap-2">
                <p className="font-bold text-white">{r.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.category === "left" ? "bg-rose-500/15 text-rose-300" : "bg-sky-500/15 text-sky-300"}`}>
                  {r.category === "left" ? "Ушедший" : "Отказавшийся"}
                </span>
              </div>
              <p className="text-xs text-slate-500">{branchName(r.branchId)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">Ушёл</p>
              <p className="text-slate-200">{sinceLabel(r.leftAt)}</p>
              {r.leftAt && <p className="text-[11px] text-slate-600">{new Date(r.leftAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}</p>}
            </div>
            <div className="md:col-span-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">Причина</p>
              <p className="text-slate-200">{r.reason || "—"}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">Комментарий</p>
              <p className="text-slate-300">{r.comment || "—"}</p>
            </div>
            <div className="flex justify-end md:col-span-1">
              {r.canUnarchive && onUnarchive && (
                <button
                  onClick={() => unarchive(r.id)}
                  disabled={busy === r.id}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40"
                >
                  {busy === r.id ? "…" : "Вернуть"}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
