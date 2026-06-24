/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentsRegistry — раздел «Ученики» (ТЗ + корректировка от 23 июня).
 * Единая клиентская база студии: KPI, быстрые сегменты, фильтры,
 * настраиваемая колонками таблица, LTV-сегментация, коммуникации,
 * массовые действия, поиск, пагинация, окно «Новый ученик», лист ожидания.
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
  SlidersHorizontal,
  UserPlus,
  Trash2,
} from "lucide-react";
import { Branch, Group, LeadSource, Student, SubscriptionPlan, Teacher, WaitlistEntry } from "../types";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import {
  SEGMENTS,
  SegmentId,
  STATUS_FILTER_OPTIONS,
  matchStatusFilter,
  getStudentState,
  getLtvSegment,
  isLeft,
  LTV_SEGMENTS,
  LTV_BADGE,
  ROW_TONE_CLASS,
  STATUS_BADGE_CLASS,
  COLOR_LEGEND,
  DEFAULT_MANUAL_STATUSES,
  AUTO_STATUS_GROUPS,
  formatAge,
  ageFromBirthday,
  getWaitPriority,
  formatWaitDuration,
  WAIT_PRIORITY_META,
} from "../studentSegments";

type StudentInput = {
  name?: string;
  firstName?: string;
  lastName?: string;
  branchId?: string;
  groupId?: string;
  teacherId?: string;
  parentName?: string;
  parentPhone?: string;
  phone?: string;
  gender?: string | null;
  birthday?: string | null;
  sourceId?: string | null;
  comment?: string;
  status?: string;
  manualStatus?: string | null;
};

/**
 * Пресет-фильтр: задаётся извне (например, кликом по KPI в дашборде владельца),
 * чтобы открыть раздел «Ученики» с уже применённым фильтром по точному списку.
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
  onCreateStudent?: (data: StudentInput) => Promise<string | boolean | null>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean | void> | void;
  onOpenPayment?: (student: Student) => void;
  plans?: SubscriptionPlan[];
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  preset?: RegistryPreset | null;
  /** Справочник источников (откуда о нас узнали). */
  leadSources?: LeadSource[];
  /** Активный лист ожидания (только незакрытые записи видимых учеников). */
  waitlist?: WaitlistEntry[];
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean>;
  onRemoveFromWaitlist?: (id: string, reason?: string) => Promise<boolean>;
}

/* ---------- helpers ---------- */
const money = (value: number) =>
  `${Math.round(value).toLocaleString("ru-RU").replace(/,/g, " ")} ₸`;
const digits = (phone?: string) => (phone || "").replace(/[^\d+]/g, "");
const telHref = (phone?: string) => `tel:${digits(phone)}`;
const waHref = (phone?: string) => `https://wa.me/${digits(phone).replace(/^\+/, "")}`;
const tgHref = (phone?: string) => `https://t.me/+${digits(phone).replace(/^\+/, "")}`;
const genderLabel = (g?: string | null) => (g === "male" ? "М" : g === "female" ? "Ж" : "—");

const PAGE_SIZES = [10, 25, 50];

/** Источники по умолчанию (ТЗ): если справочник пуст — показываем этот список. */
const DEFAULT_SOURCE_NAMES = [
  "Instagram", "WhatsApp", "TikTok", "Google", "2GIS", "Рекомендация", "Повторный клиент", "Другое",
];

/* ---------- настройка отображения столбцов ---------- */
type ColKey =
  | "phone" | "gender" | "age" | "branch" | "group" | "source"
  | "duration" | "subEnd" | "debt" | "ltv" | "status";

const ALL_COLUMNS: { key: ColKey; label: string; defaultOn: boolean }[] = [
  { key: "phone", label: "Телефон", defaultOn: true },
  { key: "gender", label: "Пол", defaultOn: false },
  { key: "age", label: "Возраст", defaultOn: true },
  { key: "branch", label: "Филиал", defaultOn: true },
  { key: "group", label: "Группа", defaultOn: true },
  { key: "source", label: "Источник", defaultOn: false },
  { key: "duration", label: "Продолжительность обучения", defaultOn: true },
  { key: "subEnd", label: "Дата окончания абонемента", defaultOn: true },
  { key: "debt", label: "Долг", defaultOn: true },
  { key: "ltv", label: "LTV", defaultOn: true },
  { key: "status", label: "Статус", defaultOn: true },
];
const COLS_STORAGE_KEY = "echogor-students-columns-v1";

const loadColumnPrefs = (): Record<ColKey, boolean> => {
  const base = Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c.defaultOn])) as Record<ColKey, boolean>;
  try {
    const raw = window.localStorage.getItem(COLS_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      ALL_COLUMNS.forEach((c) => { if (typeof saved[c.key] === "boolean") base[c.key] = saved[c.key]; });
    }
  } catch { /* ignore */ }
  return base;
};

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
  leadSources = [],
  waitlist = [],
  onAddToWaitlist,
  onRemoveFromWaitlist,
}: StudentsRegistryProps) {
  const now = useMemo(() => new Date(), []);
  const canManage = Boolean(onCreateStudent || onUpdateStudent);

  // Оптимистичные правки (статус/ручной статус) — переживают перезагрузку bootstrap.
  const [overrides, setOverrides] = useState<Record<string, Partial<Student>>>({});
  const data: Student[] = useMemo(
    () => students.map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s)),
    [students, overrides]
  );

  // Активный лист ожидания по ученикам видимого реестра.
  const studentIdSet = useMemo(() => new Set(data.map((s) => s.id)), [data]);
  const activeWaitlist = useMemo(
    () => waitlist.filter((w) => !w.removedAt && studentIdSet.has(w.studentId)),
    [waitlist, studentIdSet]
  );
  const waitlistStudentIds = useMemo(() => new Set(activeWaitlist.map((w) => w.studentId)), [activeWaitlist]);

  const [view, setView] = useState<"registry" | "waitlist">("registry");

  const [segment, setSegment] = useState<SegmentId>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [ltvFilter, setLtvFilter] = useState("all");
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archive" | "all">("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Видимые столбцы (с сохранением выбора пользователя).
  const [columns, setColumns] = useState<Record<ColKey, boolean>>(loadColumnPrefs);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  useEffect(() => {
    try { window.localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(columns)); } catch { /* ignore */ }
  }, [columns]);
  const colOn = (k: ColKey) => columns[k];
  const toggleCol = (k: ColKey) => setColumns((p) => ({ ...p, [k]: !p[k] }));

  // Пресет-фильтр по точному списку id (приходит из дашборда владельца).
  const [presetIds, setPresetIds] = useState<Set<string> | null>(null);
  const [presetLabel, setPresetLabel] = useState<string | null>(null);
  const clearPreset = () => { setPresetIds(null); setPresetLabel(null); };

  useEffect(() => {
    if (!preset) return;
    setView("registry");
    if (preset.ids && preset.ids.length >= 0 && (preset.ids.length > 0 || preset.label)) {
      setPresetIds(new Set(preset.ids));
      setPresetLabel(preset.label || null);
      setSegment("all"); setStatusFilter("all"); setGroupFilter("all");
      setLtvFilter("all"); setArchiveFilter("all"); setSearch("");
      setBranchFilter(preset.branchFilter || "all");
    } else {
      clearPreset();
      setSegment((preset.segment as SegmentId) || "all");
      setStatusFilter(preset.statusFilter || "all");
      setBranchFilter(preset.branchFilter || "all");
      setLtvFilter("all"); setGroupFilter("all"); setArchiveFilter("active"); setSearch("");
      setPresetLabel(preset.label || null);
    }
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.nonce]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [drawerIn, setDrawerIn] = useState(false);
  useEffect(() => {
    if (openId) {
      const t = requestAnimationFrame(() => setDrawerIn(true));
      return () => cancelAnimationFrame(t);
    }
    setDrawerIn(false);
  }, [openId]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [massNote, setMassNote] = useState<string | null>(null);

  const groupName = (id?: string) => groups.find((g) => g.id === id)?.name || "—";
  const branchName = (id?: string) => {
    const b = branches.find((x) => x.id === id);
    return b?.name || b?.city || "—";
  };
  const sourceName = (id?: string | null) => leadSources.find((s) => s.id === id)?.name || "—";
  const studentGroupId = (s: Student) => s.groupIds?.[0] || (s as any).groupId || "";
  const studentPhone = (s: Student) => s.phone || s.parentPhone || (s as any).phone || "";

  /* ---------- фильтрация ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((s) => {
      if (presetIds) {
        if (!presetIds.has(s.id)) return false;
        if (q) {
          const hay = [s.name, s.parentName, studentPhone(s), groupName(studentGroupId(s))]
            .filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }
      if (segment === "left") {
        if (!isLeft(s)) return false;
      } else if (archiveFilter === "active" && isLeft(s)) {
        return false;
      } else if (archiveFilter === "archive" && !isLeft(s)) {
        return false;
      }
      const seg = SEGMENTS.find((x) => x.id === segment);
      if (seg && !seg.match(s, now)) return false;
      if (!matchStatusFilter(s, statusFilter, now)) return false;
      if (branchFilter !== "all" && s.branchId !== branchFilter) return false;
      if (groupFilter !== "all" && studentGroupId(s) !== groupFilter) return false;
      if (ltvFilter !== "all" && getLtvSegment(s, now) !== ltvFilter) return false;
      if (q) {
        const hay = [s.name, s.parentName, studentPhone(s), groupName(studentGroupId(s))]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, segment, statusFilter, branchFilter, groupFilter, ltvFilter, archiveFilter, search, now, presetIds]);

  const filterKey = `${segment}|${statusFilter}|${branchFilter}|${groupFilter}|${ltvFilter}|${archiveFilter}|${search}|${pageSize}|${presetIds ? presetIds.size : "-"}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) { setLastKey(filterKey); setPage(0); }

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
      { label: "Лист ожидания", value: activeWaitlist.length, icon: Clock, tone: "text-violet-600", bg: "bg-violet-50" },
    ];
  }, [data, now, activeWaitlist.length]);

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
    const targets = selectedStudents.map((s) => studentPhone(s)).filter(Boolean);
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
      "Имя и фамилия", "Телефон", "Пол", "Возраст", "Филиал", "Группа", "Источник",
      "Продолжительность обучения", "Дата окончания абонемента", "Долг", "LTV-сегмент", "Статус",
    ];
    const lines = rows.map((s) => {
      const st = getStudentState(s, now);
      return [
        s.name, studentPhone(s), genderLabel(s.gender), formatAge(s),
        branchName(s.branchId), groupName(studentGroupId(s)), sourceName(s.sourceId),
        st.durationLabel, st.subscriptionEndLabel,
        st.debt ? String(st.debt) : "0", st.ltv, st.statusLabel,
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

  /* ---------- окно «Новый ученик» ---------- */
  const emptyForm = {
    firstName: "", lastName: "", phone: "", gender: "" as "" | "male" | "female",
    birthday: "", branchId: adminBranchId || branches[0]?.id || "", groupId: "",
    sourceId: "", parentName: "", comment: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const setField = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, branchId: adminBranchId || branches[0]?.id || "" }); setShowForm(true); };
  const openEdit = (s: Student) => {
    const [first, ...rest] = (s.name || "").trim().split(/\s+/);
    setEditingId(s.id);
    setForm({
      firstName: first || "",
      lastName: rest.join(" ") || "",
      phone: studentPhone(s),
      gender: (s.gender as any) || "",
      birthday: s.birthday || "",
      branchId: s.branchId || branches[0]?.id || "",
      groupId: studentGroupId(s),
      sourceId: s.sourceId || "",
      parentName: s.parentName || "",
      comment: s.comment || "",
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const formAge = useMemo(() => {
    const a = ageFromBirthday(form.birthday);
    return a == null ? null : a;
  }, [form.birthday]);

  const formValid = form.firstName.trim() && form.lastName.trim() && form.phone.trim() && form.branchId;

  const saveForm = async () => {
    if (!formValid) return;
    setSaving(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    // Источник: реальный id справочника или null (ярлыки "name:" из дефолтного списка не персистим).
    const realSourceId = form.sourceId && !form.sourceId.startsWith("name:") ? form.sourceId : null;
    const payload: StudentInput = {
      name: fullName,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      parentPhone: form.phone.trim() || undefined,
      gender: form.gender || null,
      birthday: form.birthday || null,
      branchId: form.branchId || adminBranchId || branches[0]?.id,
      groupId: form.groupId || undefined,
      sourceId: realSourceId,
      parentName: form.parentName || undefined,
      comment: form.comment || undefined,
      status: editingId ? undefined : "lead", // ТЗ: новый ученик → 🟢 Новый лид
    };
    if (editingId) {
      const ok = await onUpdateStudent?.(editingId, payload);
      setSaving(false);
      if (ok) closeForm();
      return;
    }
    const result = await onCreateStudent?.(payload);
    setSaving(false);
    if (result) {
      closeForm();
      // ТЗ: после сохранения сразу открыть карточку нового ученика.
      if (typeof result === "string") {
        setView("registry");
        setOpenId(result);
      }
    }
  };

  const openStudent = data.find((s) => s.id === openId) || null;
  const visibleGroups = branchFilter === "all" ? groups : groups.filter((g) => g.branchId === branchFilter);
  const formGroups = form.branchId ? groups.filter((g) => g.branchId === form.branchId) : groups;

  // Источники для окна: справочник, иначе дефолтный список ТЗ (как ярлыки).
  const sourceOptions = leadSources.length
    ? leadSources.map((s) => ({ value: s.id, label: s.name }))
    : DEFAULT_SOURCE_NAMES.map((n) => ({ value: `name:${n}`, label: n }));

  const colCount = 3 /* checkbox + № + имя */ + ALL_COLUMNS.filter((c) => colOn(c.key)).length + 1 /* действия */;

  /* ---------- лист ожидания ---------- */
  const waitlistRows = useMemo(() => {
    const byStudent = new Map(data.map((s) => [s.id, s]));
    return activeWaitlist
      .map((w) => ({ entry: w, student: byStudent.get(w.studentId) }))
      .filter((r) => r.student)
      .sort((a, b) => new Date(a.entry.addedAt).getTime() - new Date(b.entry.addedAt).getTime());
  }, [activeWaitlist, data]);

  const removeFromWaitlist = async (entryId: string) => {
    if (!onRemoveFromWaitlist) return;
    if (!window.confirm("Убрать ученика из листа ожидания? Запись сохранится в истории.")) return;
    await onRemoveFromWaitlist(entryId, "manual");
  };

  return (
    <div className="space-y-5 text-slate-900">
      {/* Заголовок */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" /> Ученики
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Клиентская база студии</h1>
          <p className="text-sm text-slate-400">Продления, долги, LTV-сегменты, коммуникации, лист ожидания и массовые действия.</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-amber-600">
            <UserPlus className="h-4 w-4" /> Добавить ученика
          </button>
        )}
      </div>

      {/* Переключатель: Реестр / Лист ожидания */}
      <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
        {([["registry", "Реестр", data.length], ["waitlist", "Лист ожидания", activeWaitlist.length]] as const).map(([id, label, cnt]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-bold transition ${
              view === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${view === id ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"}`}>{cnt}</span>
          </button>
        ))}
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

      {view === "waitlist" ? (
        <WaitlistTable
          rows={waitlistRows}
          branchName={branchName}
          groupName={groupName}
          studentGroupId={studentGroupId}
          studentPhone={studentPhone}
          onOpen={(id) => { setView("registry"); setOpenId(id); }}
          onRemove={onRemoveFromWaitlist ? removeFromWaitlist : undefined}
          now={now}
        />
      ) : (
        <>
          {/* Активный пресет-фильтр */}
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

          {/* Фильтры + поиск + настройка таблицы */}
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_auto_auto_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск: имя, телефон, родитель, группа" className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-amber-400" />
            </div>
            <FilterSelect value={presetIds ? "all" : statusFilter} onChange={(v) => { clearPreset(); setStatusFilter(v); }} options={STATUS_FILTER_OPTIONS} />
            <FilterSelect value={branchFilter} onChange={(v) => { clearPreset(); setBranchFilter(v); }} options={[{ value: "all", label: "Все филиалы" }, ...branches.map((b) => ({ value: b.id, label: b.name || b.city }))]} />
            <FilterSelect value={presetIds ? "all" : groupFilter} onChange={(v) => { clearPreset(); setGroupFilter(v); }} options={[{ value: "all", label: "Все группы" }, ...visibleGroups.map((g) => ({ value: g.id, label: g.name }))]} />
            <FilterSelect value={presetIds ? "all" : ltvFilter} onChange={(v) => { clearPreset(); setLtvFilter(v); }} options={[{ value: "all", label: "Все LTV" }, ...LTV_SEGMENTS.map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={archiveFilter} onChange={(v) => { clearPreset(); setArchiveFilter(v as any); }} options={[{ value: "active", label: "Активные" }, { value: "archive", label: "Архив" }, { value: "all", label: "Все" }]} />
            <button onClick={() => setShowColumnConfig((v) => !v)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${showColumnConfig ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <SlidersHorizontal className="h-4 w-4" /> Настроить таблицу
            </button>
          </div>

          {/* Конфигуратор столбцов */}
          {showColumnConfig && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black">Отображаемые столбцы</p>
                <button onClick={() => setShowColumnConfig(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {ALL_COLUMNS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={colOn(c.key)} onChange={() => toggleCol(c.key)} className="h-4 w-4 accent-amber-500" />
                    <span className="font-semibold text-slate-600">{c.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Имя и фамилия, № и действия отображаются всегда. Выбор сохраняется на этом устройстве.</p>
            </div>
          )}

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

          {/* Таблица */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="w-10 p-3"><input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="h-4 w-4 accent-amber-500" /></th>
                    <th className="p-3 font-black">№</th>
                    <th className="p-3 font-black">Имя и фамилия</th>
                    {colOn("phone") && <th className="p-3 font-black">Телефон</th>}
                    {colOn("gender") && <th className="p-3 font-black">Пол</th>}
                    {colOn("age") && <th className="p-3 font-black">Возраст</th>}
                    {colOn("branch") && <th className="p-3 font-black">Филиал</th>}
                    {colOn("group") && <th className="p-3 font-black">Группа</th>}
                    {colOn("source") && <th className="p-3 font-black">Источник</th>}
                    {colOn("duration") && <th className="p-3 font-black">Продолжительность</th>}
                    {colOn("subEnd") && <th className="p-3 font-black">Окончание абон.</th>}
                    {colOn("debt") && <th className="p-3 font-black">Долг</th>}
                    {colOn("ltv") && <th className="p-3 font-black">LTV-сегмент</th>}
                    {colOn("status") && <th className="p-3 font-black">Статус</th>}
                    <th className="p-3 font-black">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr><td colSpan={colCount} className="p-10 text-center text-sm text-slate-400">Ученики не найдены</td></tr>
                  )}
                  {pageRows.map((s, i) => {
                    const st = getStudentState(s, now);
                    const phone = studentPhone(s) || "—";
                    return (
                      <tr key={s.id} className={`border-b border-slate-100 text-slate-700 transition ${ROW_TONE_CLASS[st.tone]} ${openId === s.id ? "ring-2 ring-inset ring-amber-400" : ""}`}>
                        <td className="p-3"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} className="h-4 w-4 accent-amber-500" /></td>
                        <td className="p-3 text-slate-400">{page * pageSize + i + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setOpenId(s.id)} className="text-left font-bold text-slate-900 hover:text-amber-600">{s.name}</button>
                            {waitlistStudentIds.has(s.id) && (
                              <span title="В листе ожидания" className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600"><Clock className="h-3 w-3" /></span>
                            )}
                          </div>
                        </td>
                        {colOn("phone") && <td className="p-3 text-slate-500">{phone}</td>}
                        {colOn("gender") && <td className="p-3 text-slate-500">{genderLabel(s.gender)}</td>}
                        {colOn("age") && <td className="p-3 text-slate-500">{formatAge(s)}</td>}
                        {colOn("branch") && <td className="p-3 text-slate-500">{branchName(s.branchId)}</td>}
                        {colOn("group") && <td className="p-3 text-slate-500">{groupName(studentGroupId(s))}</td>}
                        {colOn("source") && <td className="p-3 text-slate-500">{sourceName(s.sourceId)}</td>}
                        {colOn("duration") && <td className="p-3 text-slate-500">{st.durationLabel}</td>}
                        {colOn("subEnd") && <td className="p-3 text-slate-500">{st.subscriptionEndLabel}</td>}
                        {colOn("debt") && <td className={`p-3 font-bold ${st.debt > 0 ? "text-rose-600" : "text-slate-400"}`}>{st.debt > 0 ? money(st.debt) : "0 ₸"}</td>}
                        {colOn("ltv") && <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LTV_BADGE[st.ltv]}`}>{st.ltv}</span></td>}
                        {colOn("status") && <td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE_CLASS[st.tone]}`}>{st.statusLabel}</span></td>}
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
        </>
      )}

      {/* Окно «Новый ученик» / «Редактировать» — модальное */}
      {showForm && canManage && (
        <StudentFormModal
          editing={Boolean(editingId)}
          form={form}
          setField={setField}
          branches={branches}
          groups={formGroups}
          sourceOptions={sourceOptions}
          age={formAge}
          valid={Boolean(formValid)}
          saving={saving}
          onSave={saveForm}
          onClose={closeForm}
        />
      )}

      {/* Карточка ученика — выезжающая панель справа */}
      {openStudent && (
        <div className="fixed inset-0 z-50">
          <div
            className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${drawerIn ? "opacity-100" : "opacity-0"}`}
            onClick={() => setOpenId(null)}
          />
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-slate-50 shadow-2xl ring-1 ring-black/10 transition-transform duration-200 ease-out ${drawerIn ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="p-3 sm:p-4">
              <StudentManagementCard
                student={openStudent}
                group={groups.find((g) => g.id === studentGroupId(openStudent))}
                branch={branches.find((b) => b.id === openStudent.branchId)}
                teacher={teachers.find((t) => t.id === openStudent.teacherId)}
                allGroups={groups}
                allBranches={branches}
                allTeachers={teachers}
                onClose={() => setOpenId(null)}
                onEdit={canManage ? () => { setOpenId(null); openEdit(openStudent); } : undefined}
                onDelete={onDeleteStudent ? async () => { await onDeleteStudent(openStudent.id); applyOverride(openStudent.id, { status: "left" }); setOpenId(null); } : undefined}
                onOpenPayment={onOpenPayment ? () => onOpenPayment(openStudent) : undefined}
                plans={plans}
                onSellSubscription={onSellSubscription}
                onTransfer={onUpdateStudent ? (payload) => onUpdateStudent(openStudent.id, payload) : undefined}
                onAddToWaitlist={onAddToWaitlist}
                inWaitlist={waitlistStudentIds.has(openStudent.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Лист ожидания ============================ */
type WaitRow = { entry: WaitlistEntry; student?: Student };

function WaitlistTable({
  rows, branchName, groupName, studentGroupId, studentPhone, onOpen, onRemove, now,
}: {
  rows: WaitRow[];
  branchName: (id?: string) => string;
  groupName: (id?: string) => string;
  studentGroupId: (s: Student) => string;
  studentPhone: (s: Student) => string;
  onOpen: (studentId: string) => void;
  onRemove?: (entryId: string) => void;
  now: Date;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div>
          <p className="text-sm font-black">Лист ожидания</p>
          <p className="text-xs text-slate-400">Очередь по дате постановки: кому звонить первым, в какой филиал и группу хотел попасть, сколько ждёт.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-3 font-black">№</th>
              <th className="p-3 font-black">Имя и фамилия</th>
              <th className="p-3 font-black">Телефон</th>
              <th className="p-3 font-black">Пол</th>
              <th className="p-3 font-black">Возраст</th>
              <th className="p-3 font-black">Филиал</th>
              <th className="p-3 font-black">Группа</th>
              <th className="p-3 font-black">Дата постановки</th>
              <th className="p-3 font-black">Ожидание</th>
              <th className="p-3 font-black">Приоритет</th>
              <th className="p-3 font-black">Комментарий</th>
              <th className="p-3 font-black">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={12} className="p-10 text-center text-sm text-slate-400">Лист ожидания пуст. Добавьте ученика из его карточки кнопкой «Добавить в лист ожидания».</td></tr>
            )}
            {rows.map((r, i) => {
              const s = r.student!;
              const phone = studentPhone(s) || "—";
              const prio = getWaitPriority(r.entry.addedAt, now);
              const meta = WAIT_PRIORITY_META[prio];
              const addedLabel = new Date(r.entry.addedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
              const wantBranch = r.entry.branchId || s.branchId;
              const wantGroup = r.entry.groupId || studentGroupId(s);
              return (
                <tr key={r.entry.id} className="border-b border-slate-100 text-slate-700 transition hover:bg-slate-50">
                  <td className="p-3 text-slate-400">{i + 1}</td>
                  <td className="p-3"><button onClick={() => onOpen(s.id)} className="text-left font-bold text-slate-900 hover:text-amber-600">{s.name}</button></td>
                  <td className="p-3 text-slate-500">{phone}</td>
                  <td className="p-3 text-slate-500">{genderLabel(s.gender)}</td>
                  <td className="p-3 text-slate-500">{formatAge(s)}</td>
                  <td className="p-3 text-slate-500">{branchName(wantBranch)}</td>
                  <td className="p-3 text-slate-500">{groupName(wantGroup)}</td>
                  <td className="p-3 text-slate-500">{addedLabel}</td>
                  <td className="p-3 text-slate-500">{formatWaitDuration(r.entry.addedAt, now)}</td>
                  <td className="p-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span></td>
                  <td className="max-w-[200px] truncate p-3 text-slate-500" title={r.entry.comment || ""}>{r.entry.comment || "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <IconLink icon={Phone} title="Позвонить" href={telHref(phone)} tone="text-slate-500 hover:bg-slate-100" />
                      <IconLink icon={MessageCircle} title="WhatsApp" href={waHref(phone)} tone="text-emerald-600 hover:bg-emerald-50" />
                      <IconLink icon={Send} title="Telegram" href={tgHref(phone)} tone="text-sky-600 hover:bg-sky-50" />
                      <IconBtn icon={UserPlus} title="Записать в группу" onClick={() => onOpen(s.id)} tone="text-amber-600 hover:bg-amber-50" />
                      {onRemove && <IconBtn icon={Trash2} title="Удалить из листа ожидания" onClick={() => onRemove(r.entry.id)} tone="text-rose-500 hover:bg-rose-50" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        Приоритет: <span className="font-bold text-rose-600">Высокий</span> — ожидание более 30 дней; <span className="font-bold text-amber-600">Средний</span> — 7–30 дней; <span className="font-bold text-slate-500">Низкий</span> — менее 7 дней. При продаже абонемента ученик автоматически уходит из листа (история сохраняется).
      </div>
    </div>
  );
}

/* ============================ Окно «Новый ученик» ============================ */
function StudentFormModal({
  editing, form, setField, branches, groups, sourceOptions, age, valid, saving, onSave, onClose,
}: {
  editing: boolean;
  form: { firstName: string; lastName: string; phone: string; gender: "" | "male" | "female"; birthday: string; branchId: string; groupId: string; sourceId: string; parentName: string; comment: string };
  setField: (patch: Partial<{ firstName: string; lastName: string; phone: string; gender: "" | "male" | "female"; birthday: string; branchId: string; groupId: string; sourceId: string; parentName: string; comment: string }>) => void;
  branches: Branch[];
  groups: Group[];
  sourceOptions: { value: string; label: string }[];
  age: number | null;
  valid: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" /> {editing ? "Карточка" : "Новый ученик"}
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-tight">{editing ? "Редактировать ученика" : "Создать ученика"}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <FInput label="Имя *" value={form.firstName} onChange={(v) => setField({ firstName: v })} placeholder="Имя" />
          <FInput label="Фамилия *" value={form.lastName} onChange={(v) => setField({ lastName: v })} placeholder="Фамилия" />
          <FInput label="Телефон *" value={form.phone} onChange={(v) => setField({ phone: v })} placeholder="+7 ..." />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Пол</span>
            <div className="flex gap-2">
              {([["male", "Мужской"], ["female", "Женский"]] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setField({ gender: form.gender === val ? "" : val })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${form.gender === val ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Дата рождения</span>
            <div className="flex items-center gap-2">
              <input type="date" value={form.birthday} onChange={(e) => setField({ birthday: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400" />
              {age != null && <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{age} {age % 10 === 1 && age % 100 !== 11 ? "год" : age % 10 >= 2 && age % 10 <= 4 && (age % 100 < 10 || age % 100 >= 20) ? "года" : "лет"}</span>}
            </div>
          </div>
          <FSelect label="Филиал *" value={form.branchId} onChange={(v) => setField({ branchId: v, groupId: "" })} options={branches.map((b) => ({ value: b.id, label: b.name || b.city }))} />
          <FSelect label="Группа" value={form.groupId} onChange={(v) => setField({ groupId: v })} options={[{ value: "", label: "Без группы" }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} />
          <FSelect label="Источник (откуда о нас узнали)" value={form.sourceId} onChange={(v) => setField({ sourceId: v })} options={[{ value: "", label: "Не указан" }, ...sourceOptions]} />
          <FInput label="Имя родителя" value={form.parentName} onChange={(v) => setField({ parentName: v })} placeholder="Для семейного кабинета" />
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Комментарий</span>
            <textarea value={form.comment} onChange={(e) => setField({ comment: e.target.value })} rows={3} placeholder="Свободное текстовое поле" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400" />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50">Отмена</button>
          <button onClick={onSave} disabled={saving || !valid} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-40">
            {saving ? "Сохранение…" : editing ? "Сохранить" : "Сохранить и открыть карточку"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- мелкие UI ---------- */
function FInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400" />
    </label>
  );
}
function FSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
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
