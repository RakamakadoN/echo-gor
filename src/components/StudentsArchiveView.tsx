/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentsArchiveView — окно «Архив» внутри раздела «Ученики» (пилюля «Архив»).
 * Две категории с фильтром:
 *   • Ушедшие      — купили ≥1 абонемент и ушли (реальный архив, archived_at).
 *   • Отказавшиеся — ушли на этапе пробных (вычисляется из воронки, в БД не переносится).
 * Показывает причину ухода, комментарий и СРОК (сколько прошло с ухода) —
 * основа для ИИ-реактивации на дашборде. Светлая тема — как реестр учеников.
 */
import { useMemo, useState, type ElementType } from "react";
import { Archive, Search, UserX, UserMinus } from "lucide-react";
import { Student, Branch } from "../types";
import { getStudentState } from "../studentSegments";

// Палитра реестра учеников (StudentsRegistry) — чтобы окно не отличалось по стилю.
const CLR = {
  border: "#DCE2E8",
  fill: "#F1F4F7",
  text: "#222B33",
  strong: "#11171D",
  muted: "#6B7682",
  second: "#46505B",
  gold: "#947C51",
};

type ArchiveStudent = {
  id: string; name: string; branchId: string; phone?: string;
  parentName?: string; parentPhone?: string; archivedAt: string; archivedBy?: string;
  archiveReason?: string; archiveComment?: string; leftOn?: string | null;
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
  return `${months} мес назад`;
}

export default function StudentsArchiveView({
  archive = [],
  students = [],
  branches = [],
  onUnarchive,
  onEditLeftOn,
}: {
  archive?: ArchiveStudent[];
  students?: Student[];
  branches?: Branch[];
  onUnarchive?: (id: string) => Promise<unknown> | void;
  onEditLeftOn?: (id: string, patch: { leftOn?: string }) => Promise<unknown> | void;
}) {
  const [cat, setCat] = useState<Cat>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMonth, setEditMonth] = useState("");
  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name || "—";

  // Унифицированная строка архива из двух источников.
  const rows = useMemo(() => {
    const fromArchive = archive.map((a) => ({
      id: a.id,
      name: a.name,
      branchId: a.branchId,
      category: (a.category || (Number(a.subscriptionsCount) >= 1 ? "left" : "declined")) as "left" | "declined",
      leftAt: a.leftOn || a.archivedAt,   // дата ухода (месяц), иначе дата переноса в архив
      reason: a.archiveReason || "",
      comment: a.archiveComment || "",
      canUnarchive: true,
      editable: true,
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
        canUnarchive: false,
        editable: false,
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

  const startEdit = (id: string, leftAt?: string) => {
    setEditId(id);
    setEditMonth((leftAt || new Date().toISOString()).slice(0, 10));
  };
  const saveEdit = async (id: string) => {
    if (!onEditLeftOn || editMonth.length !== 10) { setEditId(null); return; }
    setBusy(id);
    try { await onEditLeftOn(id, { leftOn: editMonth }); } finally { setBusy(null); setEditId(null); }
  };

  const TABS: { id: Cat; label: string; icon: ElementType }[] = [
    { id: "all", label: "Все", icon: Archive },
    { id: "left", label: "Ушедшие", icon: UserX },
    { id: "declined", label: "Отказавшиеся", icon: UserMinus },
  ];

  return (
    <div className="rounded-[14px] bg-white shadow-sm" style={{ border: `1px solid ${CLR.border}`, color: CLR.text }}>
      {/* Шапка + поиск */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${CLR.border}` }}>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: "#F2EDE2", color: CLR.gold }}>
            <Archive className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 className="text-[15px] font-black" style={{ color: CLR.strong }}>Архив учеников</h3>
            <p className="text-xs" style={{ color: CLR.muted }}>Ушедшие и отказавшиеся с сохранёнными данными — основа для рассылок и возврата.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: CLR.muted }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по имени или причине"
            className="w-64 rounded-[10px] py-2 pl-9 pr-3 text-[13px] outline-none"
            style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.text }}
          />
        </div>
      </div>

      {/* Переключатель категорий */}
      <div className="flex flex-wrap gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${CLR.border}` }}>
        {TABS.map((t) => {
          const active = cat === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setCat(t.id)}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13px] font-semibold transition"
              style={active
                ? { background: CLR.gold, border: `1px solid ${CLR.gold}`, color: "#fff" }
                : { background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className="rounded-full px-[7px] py-px text-[11px] font-semibold" style={active ? { background: "rgba(0,0,0,.15)", color: "#fff" } : { background: "rgba(0,0,0,.06)", color: CLR.muted }}>{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm" style={{ color: CLR.muted }}>
          {cat === "left" ? "Нет ушедших учеников." : cat === "declined" ? "Нет отказавшихся." : "Архив пуст."}
        </p>
      ) : (
        filtered.map((r) => (
          <div key={`${r.category}-${r.id}`} className="grid grid-cols-1 gap-3 px-5 py-3 text-sm md:grid-cols-12 md:items-start" style={{ borderBottom: `1px solid ${CLR.border}` }}>
            <div className="md:col-span-3">
              <div className="flex items-center gap-2">
                <p className="font-bold" style={{ color: CLR.strong }}>{r.name}</p>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={r.category === "left" ? { background: "#F6E9E9", color: "#B14545" } : { background: "#EAF0F3", color: "#5E8194" }}>
                  {r.category === "left" ? "Ушедший" : "Отказавшийся"}
                </span>
              </div>
              <p className="text-xs" style={{ color: CLR.muted }}>{branchName(r.branchId)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] uppercase tracking-wider" style={{ color: CLR.muted }}>Ушёл</p>
              {editId === r.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={editMonth}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setEditMonth(e.target.value)}
                    autoFocus
                    className="rounded-[8px] px-2 py-1 text-[12px] outline-none"
                    style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.text }}
                  />
                  <button onClick={() => saveEdit(r.id)} disabled={busy === r.id} className="rounded-[8px] px-2 py-1 text-[11px] font-bold" style={{ background: "#E9F0E6", color: "#4F8A63" }}>OK</button>
                  <button onClick={() => setEditId(null)} className="rounded-[8px] px-1.5 py-1 text-[11px]" style={{ color: CLR.muted }}>✕</button>
                </div>
              ) : (
                <>
                  <p style={{ color: CLR.text }}>
                    {r.leftAt ? new Date(r.leftAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    {r.editable && onEditLeftOn && (
                      <button onClick={() => startEdit(r.id, r.leftAt)} className="ml-1.5 text-[11px] font-bold" style={{ color: CLR.gold }} title="Изменить месяц ухода">✎</button>
                    )}
                  </p>
                  <p className="text-[11px]" style={{ color: CLR.muted }}>{sinceLabel(r.leftAt)}</p>
                </>
              )}
            </div>
            <div className="md:col-span-3">
              <p className="text-[11px] uppercase tracking-wider" style={{ color: CLR.muted }}>Причина</p>
              <p style={{ color: CLR.text }}>{r.reason || "—"}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-[11px] uppercase tracking-wider" style={{ color: CLR.muted }}>Комментарий</p>
              <p style={{ color: CLR.second }}>{r.comment || "—"}</p>
            </div>
            <div className="flex justify-end md:col-span-1">
              {r.canUnarchive && onUnarchive && (
                <button
                  onClick={() => unarchive(r.id)}
                  disabled={busy === r.id}
                  className="rounded-[10px] px-3 py-1.5 text-xs font-bold transition disabled:opacity-40"
                  style={{ background: "#E9F0E6", border: "1px solid #CADFCE", color: "#4F8A63" }}
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
