/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentsRegistry — раздел «Ученики» (ТЗ).
 * Единая клиентская база студии: KPI, быстрые сегменты, фильтры,
 * цветовая таблица, LTV-сегментация, коммуникации, массовые действия,
 * поиск, пагинация и архив. Светлая CRM-тема в стиле карточки ученика.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Phone,
  MessageCircle,
  Send,
  MessageSquare,
  Eye,
  Users,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Clock,
  Download,
  Archive,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Branch, Group, Student, SubscriptionPlan, Teacher } from "../types";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import {
  SEGMENTS,
  SegmentId,
  STATUS_FILTER_OPTIONS,
  matchStatusFilter,
  getStudentState,
  getLtvSegment,
  getDebt,
  isLeft,
  LTV_SEGMENTS,
  LTV_BADGE,
  ROW_TONE_CLASS,
  STATUS_BADGE_CLASS,
  COLOR_LEGEND,
  DEFAULT_MANUAL_STATUSES,
  AUTO_STATUS_GROUPS,
} from "../studentSegments";

type StudentInput = {
  name?: string;
  branchId?: string;
  groupId?: string;
  teacherId?: string;
  parentName?: string;
  parentPhone?: string;
  status?: string;
  manualStatus?: string | null;
};

/**
 * Пресет-фильтр: задаётся извне (например, кликом по KPI в дашборде владельца),
 * чтобы открыть раздел «Ученики» с уже применённым фильтром по точному списку.
 * `ids` — точный список учеников (приоритет над сегментом/статусом);
 * `nonce` — счётчик, чтобы повторный клик по тому же пресету снова применился.
 */
export interface RegistryPreset {
  ids?: string[];
  segment?: SegmentId;
  statusFilter?: string;
  branchFilter?: string;
  label?: string;
  nonce?: number;
}

export interface StudentsRegistryProps {
  students: Student[];
  groups: Group[];
  branches: Branch[];
  teachers: Teacher[];
  adminBranchId?: string;
  onCreateStudent?: (data: StudentInput) => Promise<boolean>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean | void> | void;
  onOpenPayment?: (student: Student) => void;
  plans?: SubscriptionPlan[];
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  preset?: RegistryPreset | null;
}

/* ---------- helpers ---------- */
const money = (value: number) =>
  `${Math.round(value).toLocaleString("ru-RU").replace(/,/g, " ")} ₸`;
const digits = (phone?: string) => (phone || "").replace(/[^\d+]/g, "");
const telHref = (phone?: string) => `tel:${digits(phone)}`;
const waHref = (phone?: string) => `https://wa.me/${digits(phone).replace(/^\+/, "")}`;
const tgHref = (phone?: string) => `https://t.me/+${digits(phone).replace(/^\+/, "")}`;
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const PAGE_SIZES = [10, 25, 50];

export default function StudentsRegistry({
  students,
  groups,
  branches,
  teachers,
  adminBranchId,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onOpenPayment,
  plans = [],
  onSellSubscription,
  preset,
}: StudentsRegistryProps) {
  const now = useMemo(() => new Date(), []);
  const canManage = Boolean(onCreateStudent || onUpdateStudent);

  // Оптимистичные правки (статус/ручной статус) — переживают перезагрузку bootstrap.
  const [overrides, setOverrides] = useState<Record<string, Partial<Student>>>({});
  const data: Student[] = useMemo(
    () => students.map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s)),
    [students, overrides]
  );

  const [segment, setSegment] = useState<SegmentId>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [ltvFilter, setLtvFilter] = useState("all");
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archive" | "all">("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Пресет-фильтр по точному списку id (приходит из дашборда владельца).
  const [presetIds, setPresetIds] = useState<Set<string> | null>(null);
  const [presetLabel, setPresetLabel] = useState<string | null>(null);

  const clearPreset = () => { setPresetIds(null); setPresetLabel(null); };

  // Применяем входящий пресет (по nonce — чтобы повторный клик сработал снова).
  useEffect(() => {
    if (!preset) return;
    if (preset.ids && preset.ids.length >= 0 && (preset.ids.length > 0 || preset.label)) {
      // точный список — сбрасываем прочие фильтры, показываем всех (вкл. архив)
      setPresetIds(new Set(preset.ids));
      setPresetLabel(preset.label || null);
      setSegment("all");
      setStatusFilter("all");
      setGroupFilter("all");
      setLtvFilter("all");
      setArchiveFilter("all");
      setSearch("");
      setBranchFilter(preset.branchFilter || "all");
    } else {
      // нативный фильтр по сегменту/статусу
      clearPreset();
      setSegment((preset.segment as SegmentId) || "all");
      setStatusFilter(preset.statusFilter || "all");
      setBranchFilter(preset.branchFilter || "all");
      setLtvFilter("all");
      setGroupFilter("all");
      setArchiveFilter("active");
      setSearch("");
      setPresetLabel(preset.label || null);
    }
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.nonce]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [massNote, setMassNote] = useState<string | null>(null);

  const groupName = (id?: string) => groups.find((g) => g.id === id)?.name || "—";
  const branchName = (id?: string) => {
    const b = branches.find((x) => x.id === id);
    return b?.name || b?.city || "—";
  };
  const studentGroupId = (s: Student) => s.groupIds?.[0] || (s as any).groupId || "";

  /* ---------- фильтрация ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((s) => {
      // точный список из пресета имеет приоритет над остальными фильтрами
      if (presetIds) {
        if (!presetIds.has(s.id)) return false;
        if (q) {
          const hay = [s.name, s.parentName, s.parentPhone, (s as any).phone, groupName(studentGroupId(s))]
            .filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }
      // архив
      if (segment === "left") {
        if (!isLeft(s)) return false;
      } else if (archiveFilter === "active" && isLeft(s)) {
        return false;
      } else if (archiveFilter === "archive" && !isLeft(s)) {
        return false;
      }
      // быстрый сегмент
      const seg = SEGMENTS.find((x) => x.id === segment);
      if (seg && !seg.match(s, now)) return false;
      // фильтр статуса
      if (!matchStatusFilter(s, statusFilter, now)) return false;
      // филиал
      if (branchFilter !== "all" && s.branchId !== branchFilter) return false;
      // группа
      if (groupFilter !== "all" && studentGroupId(s) !== groupFilter) return false;
      // LTV
      if (ltvFilter !== "all" && getLtvSegment(s, now) !== ltvFilter) return false;
      // поиск
      if (q) {
        const hay = [
          s.name,
          s.parentName,
          s.parentPhone,
          (s as any).phone,
          groupName(studentGroupId(s)),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, segment, statusFilter, branchFilter, groupFilter, ltvFilter, archiveFilter, search, now, presetIds]);

  // сброс страницы при смене фильтров
  const filterKey = `${segment}|${statusFilter}|${branchFilter}|${groupFilter}|${ltvFilter}|${archiveFilter}|${search}|${pageSize}|${presetIds ? presetIds.size : "-"}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  /* ---------- KPI ---------- */
  const kpis = useMemo(() => {
    const active = data.filter((s) => !isLeft(s));
    const count = (id: SegmentId) =>
      data.filter((s) => SEGMENTS.find((x) => x.id === id)!.match(s, now)).length;
    return [
      { label: "Всего учеников", value: data.length, icon: Users, tone: "text-slate-700", bg: "bg-slate-100" },
      { label: "Активные", value: active.filter((s) => s.status === "active").length, icon: UserCheck, tone: "text-emerald-600", bg: "bg-emerald-50" },
      { label: "Требуют продления", value: count("renewal"), icon: RefreshCw, tone: "text-amber-600", bg: "bg-amber-50" },
      { label: "Должники", value: count("debtors"), icon: AlertTriangle, tone: "text-rose-600", bg: "bg-rose-50" },
      { label: "Новые", value: count("new"), icon: Sparkles, tone: "text-sky-600", bg: "bg-sky-50" },
      { label: "Лист ожидания", value: count("waitlist"), icon: Clock, tone: "text-violet-600", bg: "bg-violet-50" },
    ];
  }, [data, now]);

  /* ---------- выбор строк ---------- */
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((s) => selected.has(s.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach((s) => next.delete(s.id));
      else pageRows.forEach((s) => next.add(s.id));
      return next;
    });
  };
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  const selectedStudents = data.filter((s) => selected.has(s.id));

  /* ---------- массовые действия ---------- */
  const applyOverride = (id: string, patch: Partial<Student>) =>
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const massSetStatus = async (value: string) => {
    if (!value) return;
    const manual = DEFAULT_MANUAL_STATUSES.includes(value);
    const payload: StudentInput = manual
      ? { manualStatus: value, status: value === "Каникулы" || value === "Медицинская пауза" ? "paused" : undefined }
      : { status: value, manualStatus: null };
    for (const s of selectedStudents) {
      applyOverride(s.id, manual ? { manualStatus: value } : { status: value, manualStatus: null });
      if (onUpdateStudent) await onUpdateStudent(s.id, payload);
    }
    setMassNote(`Статус «${value}» применён к ${selectedStudents.length} ученикам`);
    clearSelection();
  };

  const massTransferGroup = async (groupId: string) => {
    if (!groupId || !onUpdateStudent) return;
    for (const s of selectedStudents) {
      applyOverride(s.id, { groupIds: [groupId] });
      await onUpdateStudent(s.id, { groupId });
    }
    setMassNote(`${selectedStudents.length} учеников переведены в «${groupName(groupId)}»`);
    clearSelection();
  };

  const massWhatsApp = () => {
    const targets = selectedStudents.map((s) => s.parentPhone).filter(Boolean);
    targets.slice(0, 5).forEach((p) => window.open(waHref(p), "_blank"));
    setMassNote(
      targets.length > 5
        ? `Открыты первые 5 диалогов из ${targets.length}. Для массовой рассылки подключите WhatsApp API.`
        : `Открыто диалогов: ${targets.length}`
    );
  };

  const massArchive = async () => {
    if (!onDeleteStudent) return;
    if (!window.confirm(`Перевести в архив ${selectedStudents.length} учеников? История сохранится.`)) return;
    for (const s of selectedStudents) {
      applyOverride(s.id, { status: "left" });
      await onDeleteStudent(s.id);
    }
    setMassNote(`В архив переведено: ${selectedStudents.length}`);
    clearSelection();
  };

  const exportCsv = (rows: Student[]) => {
    const header = [
      "Имя и фамилия", "Телефон", "Филиал", "Группа",
      "Продолжительность обучения", "Дата окончания абонемента",
      "Долг", "LTV-сегмент", "Статус",
    ];
    const lines = rows.map((s) => {
      const st = getStudentState(s, now);
      return [
        s.name,
        s.parentPhone || (s as any).phone || "",
        branchName(s.branchId),
        groupName(studentGroupId(s)),
        st.durationLabel,
        st.subscriptionEndLabel,
        st.debt ? String(st.debt) : "0",
        st.ltv,
        st.statusLabel,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";");
    });
    const csv = "﻿" + [header.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ученики_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- форма ученика ---------- */
  const emptyForm = { name: "", age: "", branchId: adminBranchId || branches[0]?.id || "", groupId: "", teacherId: "", parentName: "", parentPhone: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({
      name: s.name || "",
      age: s.age ? String(s.age) : "",
      branchId: s.branchId || branches[0]?.id || "",
      groupId: studentGroupId(s),
      teacherId: s.teacherId || "",
      parentName: s.parentName || "",
      parentPhone: s.parentPhone || "",
    });
    setShowForm(true);
  };
  const saveForm = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: StudentInput = {
      name: form.name.trim(),
      branchId: form.branchId || adminBranchId || branches[0]?.id,
      groupId: form.groupId || undefined,
      teacherId: form.teacherId || undefined,
      parentName: form.parentName || undefined,
      parentPhone: form.parentPhone || undefined,
    };
    const ok = editingId ? await onUpdateStudent?.(editingId, payload) : await onCreateStudent?.(payload);
    setSaving(false);
    if (ok) { setShowForm(false); setEditingId(null); setForm(emptyForm); }
  };

  const openStudent = data.find((s) => s.id === openId) || null;
  const visibleGroups = branchFilter === "all" ? groups : groups.filter((g) => g.branchId === branchFilter);

  return (
    <div className="space-y-5 text-slate-900">
      {/* Заголовок */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" /> Ученики
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Клиентская база студии</h1>
          <p className="text-sm text-slate-400">Продления, долги, LTV-сегменты, коммуникации и массовые действия.</p>
        </div>
        {canManage && (
          <button onClick={showForm ? () => setShowForm(false) : openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-amber-600">
            <Plus className="h-4 w-4" /> {showForm ? "Скрыть форму" : "Добавить ученика"}
          </button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${k.bg}`}>
              <k.icon className={`h-4 w-4 ${k.tone}`} />
            </div>
            <p className="text-2xl font-black">{k.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Форма ученика */}
      {showForm && canManage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-black">{editingId ? "Редактировать ученика" : "Новый ученик"}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Имя и фамилия *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Введите имя и фамилию" />
            <Input label="Телефон" value={form.parentPhone} onChange={(v) => setForm((f) => ({ ...f, parentPhone: v }))} placeholder="+7 ..." />
            <Select label="Филиал" value={form.branchId} onChange={(v) => setForm((f) => ({ ...f, branchId: v }))} options={branches.map((b) => ({ value: b.id, label: b.name || b.city }))} />
            <Select label="Группа" value={form.groupId} onChange={(v) => setForm((f) => ({ ...f, groupId: v }))} options={[{ value: "", label: "Без группы" }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} />
            <Select label="Преподаватель" value={form.teacherId} onChange={(v) => setForm((f) => ({ ...f, teacherId: v }))} options={[{ value: "", label: "Из группы" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]} />
            <Input label="Имя родителя" value={form.parentName} onChange={(v) => setForm((f) => ({ ...f, parentName: v }))} placeholder="ФИО родителя" />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={saveForm} disabled={saving || !form.name.trim()} className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-40">
              {saving ? "Сохранение…" : editingId ? "Сохранить" : "Сохранить и открыть"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50">Отмена</button>
          </div>
        </div>
      )}

      {/* Активный пресет-фильтр (из дашборда владельца) */}
      {presetLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="font-bold text-amber-800">
            Фильтр из дашборда: {presetLabel}
            {presetIds ? ` · найдено ${filtered.length}` : ""}
          </span>
          <button onClick={clearPreset} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black text-amber-700 transition hover:bg-amber-100">
            <X className="h-3.5 w-3.5" /> Сбросить фильтр
          </button>
        </div>
      )}

      {/* Быстрые сегменты */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SEGMENTS.map((seg) => {
          const active = !presetIds && segment === seg.id;
          return (
            <button
              key={seg.id}
              onClick={() => { clearPreset(); setSegment(seg.id); }}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {seg.label}
            </button>
          );
        })}
      </div>

      {/* Фильтры + поиск */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_auto_auto_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск: имя, телефон, родитель, группа" className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-amber-400" />
        </div>
        <FilterSelect value={presetIds ? "all" : statusFilter} onChange={(v) => { clearPreset(); setStatusFilter(v); }} options={STATUS_FILTER_OPTIONS} />
        <FilterSelect value={branchFilter} onChange={(v) => { clearPreset(); setBranchFilter(v); }} options={[{ value: "all", label: "Все филиалы" }, ...branches.map((b) => ({ value: b.id, label: b.name || b.city }))]} />
        <FilterSelect value={presetIds ? "all" : groupFilter} onChange={(v) => { clearPreset(); setGroupFilter(v); }} options={[{ value: "all", label: "Все группы" }, ...visibleGroups.map((g) => ({ value: g.id, label: g.name }))]} />
        <FilterSelect value={presetIds ? "all" : ltvFilter} onChange={(v) => { clearPreset(); setLtvFilter(v); }} options={[{ value: "all", label: "Все LTV" }, ...LTV_SEGMENTS.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect value={archiveFilter} onChange={(v) => { clearPreset(); setArchiveFilter(v as any); }} options={[{ value: "active", label: "Активные" }, { value: "archive", label: "Архив" }, { value: "all", label: "Все" }]} />
      </div>

      {/* Уведомление массового действия */}
      {massNote && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
          <span>{massNote}</span>
          <button onClick={() => setMassNote(null)} className="rounded-lg p-1 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Панель массовых действий */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <span className="font-black text-amber-700">Выбрано: {selected.size}</span>
          <span className="text-slate-300">|</span>
          <select onChange={(e) => { massSetStatus(e.target.value); e.target.value = ""; }} defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
            <option value="" disabled>Изменить статус…</option>
            <option value="active">Активный</option>
            <option value="paused">Заморозить абонемент</option>
            {DEFAULT_MANUAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {onUpdateStudent && (
            <select onChange={(e) => { massTransferGroup(e.target.value); e.target.value = ""; }} defaultValue="" className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
              <option value="" disabled>Перевести в группу…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <MassBtn icon={MessageCircle} label="WhatsApp" onClick={massWhatsApp} />
          <MassBtn icon={Download} label="Excel" onClick={() => exportCsv(selectedStudents)} />
          {onDeleteStudent && <MassBtn icon={Archive} label="В архив" tone="rose" onClick={massArchive} />}
          <button onClick={clearSelection} className="ml-auto rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white">Снять выделение</button>
        </div>
      )}

      {/* Таблица + боковая панель ученика */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="w-10 p-3"><input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="h-4 w-4 accent-amber-500" /></th>
                <th className="p-3 font-black">№</th>
                <th className="p-3 font-black">Имя и фамилия</th>
                <th className="p-3 font-black">Телефон</th>
                <th className="p-3 font-black">Филиал</th>
                <th className="p-3 font-black">Группа</th>
                <th className="p-3 font-black">Продолжительность</th>
                <th className="p-3 font-black">Окончание абон.</th>
                <th className="p-3 font-black">Долг</th>
                <th className="p-3 font-black">LTV-сегмент</th>
                <th className="p-3 font-black">Статус</th>
                <th className="p-3 font-black">Действия</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><td colSpan={12} className="p-10 text-center text-sm text-slate-400">Ученики не найдены</td></tr>
              )}
              {pageRows.map((s, i) => {
                const st = getStudentState(s, now);
                const phone = s.parentPhone || (s as any).phone || "—";
                return (
                  <tr key={s.id} className={`border-b border-slate-100 text-slate-700 transition ${ROW_TONE_CLASS[st.tone]} ${openId === s.id ? "ring-2 ring-inset ring-amber-400" : ""}`}>
                    <td className="p-3"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} className="h-4 w-4 accent-amber-500" /></td>
                    <td className="p-3 text-slate-400">{page * pageSize + i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-black text-white">{initials(s.name)}</div>
                        )}
                        <button onClick={() => setOpenId(s.id)} className="text-left font-bold text-slate-900 hover:text-amber-600">{s.name}</button>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500">{phone}</td>
                    <td className="p-3 text-slate-500">{branchName(s.branchId)}</td>
                    <td className="p-3 text-slate-500">{groupName(studentGroupId(s))}</td>
                    <td className="p-3 text-slate-500">{st.durationLabel}</td>
                    <td className="p-3 text-slate-500">{st.subscriptionEndLabel}</td>
                    <td className={`p-3 font-bold ${st.debt > 0 ? "text-rose-600" : "text-slate-400"}`}>{st.debt > 0 ? money(st.debt) : "0 ₸"}</td>
                    <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LTV_BADGE[st.ltv]}`}>{st.ltv}</span></td>
                    <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_CLASS[st.tone]}`}>{st.statusLabel}</span></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <IconLink icon={MessageCircle} title="WhatsApp" href={waHref(phone)} tone="text-emerald-600 hover:bg-emerald-50" />
                        <IconLink icon={Phone} title="Позвонить" href={telHref(phone)} tone="text-slate-500 hover:bg-slate-100" />
                        <IconLink icon={Send} title="Telegram" href={tgHref(phone)} tone="text-sky-600 hover:bg-sky-50" />
                        <IconBtn icon={MessageSquare} title="Комментарий" onClick={() => setOpenId(s.id)} tone="text-violet-600 hover:bg-violet-50" />
                        <IconBtn icon={Eye} title="Открыть карточку" onClick={() => setOpenId(s.id)} tone="text-slate-500 hover:bg-slate-100" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
          <p className="text-slate-400">
            Показано {filtered.length === 0 ? 0 : page * pageSize + 1}–{Math.min(filtered.length, (page + 1) * pageSize)} из {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => exportCsv(filtered)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" /> Экспорт
            </button>
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 disabled:opacity-30 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-bold text-slate-600">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 disabled:opacity-30 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / стр</option>)}
            </select>
          </div>
        </div>
      </div>

      {openStudent && (
        <aside className="w-full shrink-0 xl:w-[420px] xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <StudentManagementCard
            student={openStudent}
            group={groups.find((g) => g.id === studentGroupId(openStudent))}
            branch={branches.find((b) => b.id === openStudent.branchId)}
            teacher={teachers.find((t) => t.id === openStudent.teacherId)}
            allGroups={groups}
            allBranches={branches}
            allTeachers={teachers}
            onClose={() => setOpenId(null)}
            onEdit={canManage ? () => openEdit(openStudent) : undefined}
            onDelete={onDeleteStudent ? async () => { await onDeleteStudent(openStudent.id); applyOverride(openStudent.id, { status: "left" }); setOpenId(null); } : undefined}
            onOpenPayment={onOpenPayment ? () => onOpenPayment(openStudent) : undefined}
            plans={plans}
            onSellSubscription={onSellSubscription}
            onTransfer={onUpdateStudent ? (payload) => onUpdateStudent(openStudent.id, payload) : undefined}
          />
        </aside>
      )}
      </div>

      {/* Легенда + статусы */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-black">Цветовые обозначения</p>
          <ul className="grid gap-2">
            {COLOR_LEGEND.map((l) => (
              <li key={l.tone} className="flex items-center gap-2.5 text-sm text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} /> {l.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-black">Статусы</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {AUTO_STATUS_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{g.title}</p>
                <ul className="space-y-1 text-xs text-slate-600">{g.items.map((i) => <li key={i}>· {i}</li>)}</ul>
              </div>
            ))}
            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">Ручные статусы</p>
              <ul className="space-y-1 text-xs text-slate-600">{DEFAULT_MANUAL_STATUSES.map((i) => <li key={i}>· {i}</li>)}</ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ---------- мелкие UI ---------- */
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400" />
    </label>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function IconLink({ icon: Icon, href, title, tone }: { icon: React.ElementType; href: string; title: string; tone: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={title} className={`rounded-lg p-1.5 transition ${tone}`}>
      <Icon className="h-4 w-4" />
    </a>
  );
}
function IconBtn({ icon: Icon, onClick, title, tone }: { icon: React.ElementType; onClick: () => void; title: string; tone: string }) {
  return (
    <button onClick={onClick} title={title} className={`rounded-lg p-1.5 transition ${tone}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
}
function MassBtn({ icon: Icon, label, onClick, tone = "slate" }: { icon: React.ElementType; label: string; onClick: () => void; tone?: "slate" | "rose" }) {
  const cls = tone === "rose" ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
