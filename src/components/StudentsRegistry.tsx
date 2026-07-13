/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StudentsRegistry — раздел «Ученики» (ТЗ + корректировка от 23 июня).
 * Единая клиентская база студии: KPI, быстрые сегменты, фильтры,
 * настраиваемая колонками таблица, LTV-сегментация, коммуникации,
 * массовые действия, поиск, пагинация, окно «Новый ученик», лист ожидания.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveReasonModal } from "./ArchiveReasonModal";
import StatusSettings from "./StatusSettings";
import { getStatusLabel, getStatusToneRaw, getManualStatuses, TONE_FUNNEL } from "../statusConfig";
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
  ChevronDown,
  Calendar,
  UserX,
  UserMinus,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { Branch, Group, LeadSource, Student, SubscriptionPlan, Teacher, WaitlistEntry } from "../types";
import StudentManagementCard, { SellSubscriptionInput } from "./StudentManagementCard";
import StudentsArchiveView from "./StudentsArchiveView";
import { formatPhoneInput, isValidPhone, normalizePhone } from "../phone";
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
  AUTO_STATUS_GROUPS,
  formatAge,
  ageFromBirthday,
  getWaitPriority,
  formatWaitDuration,
  WAIT_PRIORITY_META,
  hasCoveringSubscription,
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
  sourceName?: string;
  skillLevel?: string | null;
  comment?: string;
  status?: string;
  manualStatus?: string | null;
  payPromiseDate?: string | null;
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
  onCreateStudent?: (data: StudentInput) => Promise<string | boolean | null | { archivedId: string; message: string }>;
  onUpdateStudent?: (id: string, data: StudentInput) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean | void> | void;
  /** Перевод в архив с обязательными комментариями (причина + свободный). */
  onArchiveStudent?: (id: string, reason: string, comment: string, leftOn?: string) => Promise<boolean | void> | void;
  onUnarchiveStudent?: (id: string) => Promise<unknown> | void;
  onEditArchive?: (id: string, patch: { leftOn?: string; reason?: string; comment?: string }) => Promise<unknown> | void;
  onBookTrial?: (id: string, payload: { date: string; time: string; note: string }) => Promise<boolean> | void;
  onDeleteTrial?: (id: string, date: string) => Promise<boolean> | void;
  studentArchive?: any[];
  onOpenPayment?: (student: Student) => void;
  plans?: SubscriptionPlan[];
  onSellSubscription?: (payload: SellSubscriptionInput) => Promise<boolean> | boolean;
  onSellSubscriptionBatch?: (items: SellSubscriptionInput[]) => Promise<boolean> | boolean;
  preset?: RegistryPreset | null;
  /** Справочник источников (откуда о нас узнали). */
  leadSources?: LeadSource[];
  /** Активный лист ожидания (только незакрытые записи видимых учеников). */
  waitlist?: WaitlistEntry[];
  onAddToWaitlist?: (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }) => Promise<boolean>;
  onRemoveFromWaitlist?: (id: string, reason?: string) => Promise<boolean>;
  /** Управление справочником источников (откуда о нас узнали). */
  onCreateLeadSource?: (data: { name: string }) => Promise<boolean>;
  onUpdateLeadSource?: (id: string, data: { name?: string; status?: string }) => Promise<boolean>;
  onDeleteLeadSource?: (id: string) => Promise<boolean>;
  /** Роль текущего кабинета для API входа ученика (owner | branch_manager | admin). */
  roleHeader?: string;
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

/** Уровни подготовки ученика (ТЗ заказчика 2026-07-11). */
const SKILL_LEVELS = ["Начинающий", "Продолжающий", "Студийный", "Ансамбль"];

/** Источники по умолчанию (ТЗ): если справочник пуст — показываем этот список. */
const DEFAULT_SOURCE_NAMES = [
  "Instagram", "WhatsApp", "TikTok", "Google", "2GIS", "Рекомендация", "Повторный клиент", "Другое",
];

/* ---------- настройка отображения столбцов ---------- */
type ColKey =
  | "phone" | "gender" | "age" | "branch" | "group" | "source"
  | "duration" | "subEnd" | "debt" | "ltv" | "status" | "skill";

const ALL_COLUMNS: { key: ColKey; label: string; defaultOn: boolean }[] = [
  { key: "phone", label: "Телефон", defaultOn: true },
  { key: "gender", label: "Пол", defaultOn: false },
  { key: "age", label: "Возраст", defaultOn: true },
  { key: "branch", label: "Филиал", defaultOn: true },
  { key: "group", label: "Группа", defaultOn: true },
  { key: "skill", label: "Уровень подготовки", defaultOn: false },
  { key: "source", label: "Источник", defaultOn: false },
  { key: "duration", label: "Продолжительность обучения", defaultOn: false },
  { key: "subEnd", label: "Дата окончания абонемента", defaultOn: true },
  { key: "debt", label: "Долг", defaultOn: true },
  { key: "ltv", label: "LTV", defaultOn: false },
  { key: "status", label: "Статус", defaultOn: true },
];
const COLS_STORAGE_KEY = "echogor-students-columns-v2";

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

/* ============================ Дизайн-токены прототипа ============================ */
/* Палитра светлой темы crm-system-eta-nine (снята с прототипа один-в-один). */
const CLR = {
  border: "#DCE2E8",
  fill: "#F1F4F7",
  text: "#222B33",
  strong: "#11171D",
  muted: "#6B7682",
  second: "#46505B",
  gold: "#947C51",
};

// Цветовые схемы иконок KPI (снято с прототипа).
const KPI_ICON: Record<string, { bg: string; color: string }> = {
  gray: { bg: "#EDF1F5", color: "#5C6772" },
  green: { bg: "#E9F0E6", color: "#4F8A63" },
  orange: { bg: "#F2EDE2", color: "#947C51" },
  red: { bg: "#F6E9E9", color: "#B14545" },
  blue: { bg: "#EAF0F3", color: "#5E8194" },
  purple: { bg: "#F2EDE2", color: "#947C51" },
};

// Пилюли статусов по тону — сопоставлены с палитрой прототипа (pill-*).
const PILL_TONE: Record<string, string> = {
  red: "bg-[#F6E9E9] text-[#B14545]",
  yellow: "bg-[#FFFBEB] text-[#92400E]",
  orange: "bg-[#FFF7ED] text-[#C2410C]",
  green: "bg-[#E9F0E6] text-[#166534]",
  blue: "bg-[#EAF0F3] text-[#1E40AF]",
  purple: "bg-[#F3E8FF] text-[#7E22CE]",
  gray: "bg-[#EDF1F5] text-[#5C6772]",
  neutral: "bg-[#EDF1F5] text-[#5C6772]",
};

// Цвет пилюли с учётом настроек «Статусы»: переопределение из org_status_config
// (ключ = statusKey авто-статуса или ТЕКСТ ручного статуса), иначе тон из getStudentState.
const pillToneOf = (s: Student, st: { statusKey: string; tone: string }): string => {
  const key = st.statusKey === "manual" ? (s.manualStatus || "") : st.statusKey;
  return getStatusToneRaw(key) || st.tone;
};

// Этапы воронки продаж — снято с прототипа (порядок, названия, подсказки, цвета).
const FUNNEL_STAGES: {
  key: string; label: string; hint?: string; icon: React.ElementType;
  bg: string; border: string; icon_c: string; val: string; hint_c: string;
}[] = [
  { key: "trial", label: "Записаны на пробный", hint: "ожидают занятия", icon: Calendar, bg: "#EFF6FF", border: "#BFDBFE", icon_c: "#3B82F6", val: "#1E40AF", hint_c: "#2563EB" },
  { key: "trial_missed", label: "Не пришли на пробный", hint: "перезаписать", icon: UserX, bg: "#FFF5F5", border: "#FECACA", icon_c: "#EF4444", val: "#B91C1C", hint_c: "#DC2626" },
  { key: "trial_rebooked", label: "Перезаписаны", hint: "ждут занятия", icon: RefreshCw, bg: "#FFFBEB", border: "#FDE68A", icon_c: "#F59E0B", val: "#B45309", hint_c: "#D97706" },
  { key: "trial_lost", label: "Были, не купили", hint: "дожать", icon: AlertTriangle, bg: "#FFF7ED", border: "#FED7AA", icon_c: "#F97316", val: "#C2410C", hint_c: "#EA580C" },
  { key: "promised", label: "Был на пробном, оплатит", hint: "обещал оплату", icon: UserCheck, bg: "#F0FDFA", border: "#99F6E4", icon_c: "#14B8A6", val: "#0F766E", hint_c: "#0D9488" },
  { key: "visitor_new", label: "Купили абонемент", hint: "новый посетитель", icon: CheckCircle2, bg: "#F0FDF4", border: "#BBF7D0", icon_c: "#22C55E", val: "#15803D", hint_c: "#16A34A" },
];

// Быстрые сегменты (чипы) — снято с прототипа: порядок и подписи.
const SEG_CHIPS: { id: string; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "renewal", label: "Не оплачен текущий месяц" },
  { id: "prev_unpaid", label: "Не оплачен прошлый месяц" },
  { id: "debtors", label: "Должники" },
  { id: "trial", label: "Записаны на пробный" },
  { id: "next_month", label: "Купили следующий" },
  { id: "waitlist", label: "Лист ожидания" },
  { id: "vacation", label: "Каникулы" },
  { id: "left", label: "Ушедшие" },
];

export default function StudentsRegistry({
  students,
  groups,
  branches,
  teachers,
  adminBranchId,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onArchiveStudent,
  onUnarchiveStudent,
  onEditArchive,
  onBookTrial,
  onDeleteTrial,
  studentArchive = [],
  onOpenPayment,
  plans = [],
  onSellSubscription,
  onSellSubscriptionBatch,
  preset,
  leadSources = [],
  waitlist = [],
  onAddToWaitlist,
  onRemoveFromWaitlist,
  onCreateLeadSource,
  onUpdateLeadSource,
  onDeleteLeadSource,
  roleHeader = "owner",
}: StudentsRegistryProps) {
  const now = useMemo(() => new Date(), []);
  const canManage = Boolean(onCreateStudent || onUpdateStudent);

  // Оптимистичные правки (статус/ручной статус) — переживают перезагрузку bootstrap.
  const [overrides, setOverrides] = useState<Record<string, Partial<Student>>>({});
  // Модалка «дата обещанной оплаты» (для ручного статуса «… оплатит»).
  const [promptPromise, setPromptPromise] = useState<{ ids: string[]; value: string } | null>(null);
  const [promiseDateVal, setPromiseDateVal] = useState("");
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

  const [view, setView] = useState<"registry" | "waitlist" | "archive" | "history">("registry");
  // Модалка перевода в архив (массово). Хранит выбранных учеников и busy-состояние.
  const [archiveModal, setArchiveModal] = useState<Student[] | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const [segment, setSegment] = useState<SegmentId>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [ltvFilter, setLtvFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [archiveFilter, setArchiveFilter] = useState<"active" | "archive" | "all">("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Видимые столбцы (с сохранением выбора пользователя).
  const [columns, setColumns] = useState<Record<ColKey, boolean>>(loadColumnPrefs);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showStatusSettings, setShowStatusSettings] = useState(false);
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
  // Панель, которую карточка откроет сразу (например «Пригласить на пробный» из ЛО).
  const [cardPanel, setCardPanel] = useState<"trial" | null>(null);
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
  const [showSources, setShowSources] = useState(false);
  const canManageSources = Boolean(onCreateLeadSource || onUpdateLeadSource || onDeleteLeadSource);

  const groupName = (id?: string) => groups.find((g) => g.id === id)?.name || "—";
  const branchName = (id?: string) => {
    const b = branches.find((x) => x.id === id);
    return b?.name || b?.city || "—";
  };
  const sourceName = (id?: string | null) => leadSources.find((s) => s.id === id)?.name || "—";
  const studentGroupId = (s: Student) => s.groupIds?.[0] || (s as any).groupId || "";
  // Воронка пробных пройдена: у ученика есть (или был) купленный абонемент —
  // бейджи «ПУ ×N» и дата пробного в списке больше не показываются (ТЗ).
  const funnelDone = (s: Student) => (s.subscriptions || []).some((x) => x.status !== "deleted");
  // Все группы ученика (основная + группы действующих абонементов) — через запятую.
  const studentGroupNames = (s: Student) => {
    const ids = s.groupIds?.length ? s.groupIds : [(s as any).groupId].filter(Boolean);
    return ids.map((id: string) => groupName(id)).filter((n: string) => n !== "—").join(", ") || "—";
  };
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
      if (seg && !seg.match(s, now, { waitlistIds: waitlistStudentIds })) return false;
      // «Записаны на пробный» — обычный сегмент (trial + trial_rebooked), спец-кейс убран.
      if (!matchStatusFilter(s, statusFilter, now, { waitlistIds: waitlistStudentIds })) return false;
      if (branchFilter !== "all" && s.branchId !== branchFilter) return false;
      // Фильтр по группе учитывает ВСЕ группы ученика (мульти-группы), не только основную.
      if (groupFilter !== "all" && !(s.groupIds || []).includes(groupFilter)) return false;
      if (ltvFilter !== "all" && getLtvSegment(s, now) !== ltvFilter) return false;
      if (skillFilter !== "all" && (s.skillLevel || "") !== skillFilter) return false;
      if (q) {
        const hay = [s.name, s.parentName, studentPhone(s), groupName(studentGroupId(s))]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, segment, statusFilter, branchFilter, groupFilter, ltvFilter, archiveFilter, search, now, presetIds, waitlistStudentIds]);

  const filterKey = `${segment}|${statusFilter}|${branchFilter}|${groupFilter}|${ltvFilter}|${archiveFilter}|${search}|${pageSize}|${presetIds ? presetIds.size : "-"}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) { setLastKey(filterKey); setPage(0); }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  /* ---------- KPI ---------- */
  const kpis = useMemo(() => {
    const count = (id: SegmentId) =>
      data.filter((s) => SEGMENTS.find((x) => x.id === id)!.match(s, now, { waitlistIds: waitlistStudentIds })).length;
    // «Ушли в этом месяце» — из РЕАЛЬНОГО архива (studentArchive), а не из активного
    // списка: связка с окном «Архив». Дата ухода = left_on (иначе archived_at).
    const leftThisMonth = studentArchive.filter((a: any) => {
      const raw = a.leftOn || a.archivedAt;
      if (!raw) return false;
      const dt = new Date(raw);
      return !isNaN(dt.getTime()) && dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).length;
    return [
      { kpiKey: "total", label: "Всего учеников", value: data.length, icon: Users, color: "gray" },
      // «Активные» = сегмент (есть действующий абонемент), НЕ сырой status из БД.
      { kpiKey: "active", label: "Активные", value: count("active"), icon: UserCheck, color: "green" },
      { kpiKey: "renewal", label: "Не оплачен текущий месяц", value: count("renewal"), icon: RefreshCw, color: "orange" },
      { kpiKey: "debtors", label: "Должники", value: count("debtors"), icon: AlertTriangle, color: "red" },
      { kpiKey: "waitlist", label: "Лист ожидания", value: activeWaitlist.length, icon: Clock, color: "purple" },
      { kpiKey: "left", label: "Ушли в этом месяце", value: leftThisMonth, icon: UserMinus, color: "red" },
    ];
  }, [data, now, activeWaitlist.length, studentArchive, waitlistStudentIds]);

  /* ---------- Воронка продаж (по автоматическим статусам пробных уроков) ---------- */
  const funnel = useMemo(() => {
    const buckets: Record<string, string[]> = {
      lead: [], trial: [], trial_missed: [], trial_rebooked: [], trial_lost: [], promised: [], visitor_new: [],
    };
    for (const s of data) {
      if (isLeft(s)) continue;
      const st = getStudentState(s, now);
      // «Купили абонемент» = все купившие: сразу после пробного (visitor_new),
      // новый ученик этого месяца (new) и купившие на БУДУЩИЙ месяц (next_paid) —
      // покупка на следующий период тоже покупка (ТЗ заказчика).
      // «Был на пробном, оплатит» — ручной промис оплаты (ТЗ заказчика).
      const key = ["next_paid", "new"].includes(st.statusKey)
        ? "visitor_new"
        : st.statusKey === "manual" && /оплат/i.test(s.manualStatus || "")
        ? "promised"
        : st.statusKey;
      if (buckets[key]) buckets[key].push(s.id);
    }
    return buckets;
  }, [data, now]);

  const openFunnel = (key: string, label: string) => {
    const ids = funnel[key] || [];
    setView("registry");
    setSegment("all"); setStatusFilter("all"); setGroupFilter("all");
    setLtvFilter("all"); setArchiveFilter("all"); setSearch("");
    setPresetIds(new Set(ids));
    setPresetLabel(`Воронка продаж · ${label}`);
    setPage(0);
  };

  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollToList = () => {
    requestAnimationFrame(() =>
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const openKpi = (key: string, label: string) => {
    if (key === "waitlist") {
      setView("waitlist");
      scrollToList();
      return;
    }
    // «Ушли в этом месяце» связаны с архивом — открываем окно «Архив».
    if (key === "left") {
      setView("archive");
      scrollToList();
      return;
    }
    setView("registry");
    setSegment("all");
    setStatusFilter("all");
    setBranchFilter("all");
    setGroupFilter("all");
    setLtvFilter("all");
    setSearch("");
    if (key === "total") {
      clearPreset();
      setArchiveFilter("all");
    } else {
      const ids = data
        .filter((s) => {
          if (key === "active") return !isLeft(s) && s.status === "active";
          if (key === "renewal") return SEGMENTS.find((x) => x.id === "renewal")!.match(s, now, { waitlistIds: waitlistStudentIds });
          if (key === "debtors") return SEGMENTS.find((x) => x.id === "debtors")!.match(s, now, { waitlistIds: waitlistStudentIds });
          return false;
        })
        .map((s) => s.id);
      setArchiveFilter("all");
      setPresetIds(new Set(ids));
      setPresetLabel("Показатель · " + label);
    }
    setPage(0);
    scrollToList();
  };

  // Рекомендации «Магомеда»: кого дожать (был на пробном, не купил) и кого перезаписать (не пришёл).
  const recommendations = useMemo(() => {
    const byId = (id: string) => data.find((s) => s.id === id);
    const lost = (funnel.trial_lost || []).map(byId).filter(Boolean) as Student[];
    const missed = (funnel.trial_missed || []).map(byId).filter(Boolean) as Student[];
    return { lost, missed };
  }, [funnel, data]);

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

  // Применить статус к ученикам (общая логика). Ручной «оплатит» несёт дату дожима.
  const applyStatus = async (ids: string[], value: string, promiseDate: string | null) => {
    const manual = getManualStatuses().includes(value);
    const payload: StudentInput = manual
      ? { manualStatus: value, status: value === "Каникулы" || value === "Медицинская пауза" ? "paused" : undefined, ...(promiseDate !== null ? { payPromiseDate: promiseDate } : {}) }
      : { status: value, manualStatus: null, payPromiseDate: null };
    for (const id of ids) {
      applyOverride(id, manual ? { manualStatus: value, ...(promiseDate ? { payPromiseDate: promiseDate } : {}) } : { status: value, manualStatus: null, payPromiseDate: null });
      if (onUpdateStudent) await onUpdateStudent(id, payload);
    }
  };

  // Ручной статус «… оплатит» требует дату обещанной оплаты (спрашиваем календарём).
  const needsPromiseDate = (value: string) => getManualStatuses().includes(value) && /оплат/i.test(value);

  // Статус воронки «пробный/оплатит/вводный» подразумевает, что ученик ещё НЕ
  // оплатил. Вешать его на ученика с действующим абонементом нельзя — это ломает
  // реальность (и раньше приводило к путанице с абонементами). Блокируем и
  // объясняем последствие (система-помощник).
  const isTrialPromiseStatus = (value: string) => /оплат|пробн|вводн/i.test(value);
  const statusBlockReason = (student: Student, value: string): string | null => {
    if (isTrialPromiseStatus(value) && hasCoveringSubscription(student)) {
      return `У ученика есть действующий абонемент — статус «${value}» для тех, кто ещё не оплатил, поэтому назначить его нельзя. Сначала удалите/завершите абонемент, если ученик действительно вернулся в воронку.`;
    }
    return null;
  };
  // Модалка-предупреждение о последствиях (показываем ТОЛЬКО когда они есть).
  const [statusWarn, setStatusWarn] = useState<{ names: string; reason: string } | null>(null);

  const massSetStatus = async (value: string) => {
    if (!value) return;
    // Отсекаем учеников с действующим абонементом от «пробный/оплатит»-статусов.
    const blocked = selectedStudents.filter((s) => statusBlockReason(s, value));
    const allowed = selectedStudents.filter((s) => !statusBlockReason(s, value));
    if (blocked.length) {
      setStatusWarn({
        names: blocked.map((s) => s.name).join(", "),
        reason: `У этих учеников есть действующий абонемент — статус «${value}» (для ещё не оплативших) им не назначается. ${allowed.length ? `Применю к остальным (${allowed.length}).` : "Применять некому."}`,
      });
      if (!allowed.length) return;
    }
    const ids = allowed.map((s) => s.id);
    if (needsPromiseDate(value)) { setPromiseDateVal(new Date().toISOString().slice(0, 10)); setPromptPromise({ ids, value }); return; }
    await applyStatus(ids, value, null);
    setMassNote(`Статус «${value}» применён к ${ids.length} ученикам`);
    clearSelection();
  };

  // Смена статуса одного ученика (для карточки).
  const setStudentStatus = async (id: string, value: string) => {
    if (!value || !onUpdateStudent) return;
    const student = students.find((s) => s.id === id);
    const reason = student ? statusBlockReason(student, value) : null;
    if (reason) { setStatusWarn({ names: student!.name, reason }); return; }
    if (needsPromiseDate(value)) { setPromiseDateVal(new Date().toISOString().slice(0, 10)); setPromptPromise({ ids: [id], value }); return; }
    await applyStatus([id], value, null);
    setMassNote(`Статус «${value}» обновлён`);
  };

  // Подтверждение даты обещанной оплаты из модалки-календаря → применяем статус.
  const confirmPromiseDate = async () => {
    if (!promptPromise) return;
    const { ids, value } = promptPromise;
    setPromptPromise(null);
    await applyStatus(ids, value, promiseDateVal || null);
    setMassNote(`Статус «${value}» применён`);
    if (ids.length > 1) clearSelection();
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

  const massTransferBranch = async (branchId: string) => {
    if (!branchId || !onUpdateStudent) return;
    for (const s of selectedStudents) {
      applyOverride(s.id, { branchId });
      await onUpdateStudent(s.id, { branchId });
    }
    setMassNote(`${selectedStudents.length} учеников переведены в филиал «${branchName(branchId)}»`);
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

  // Открыть модалку архива для выбранных (комментарии обязательны).
  const massArchive = () => {
    if (!onArchiveStudent || selectedStudents.length === 0) return;
    setArchiveModal(selectedStudents);
  };

  const confirmArchive = async (reason: string, comment: string, leftOn: string) => {
    if (!onArchiveStudent || !archiveModal) return;
    setArchiveBusy(true);
    let ok = 0;
    for (const s of archiveModal) {
      const res = await onArchiveStudent(s.id, reason, comment, leftOn);
      if (res !== false) ok += 1;
    }
    setArchiveBusy(false);
    setArchiveModal(null);
    setMassNote(`В архив переведено: ${ok}`);
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
    sourceId: "", parentName: "", comment: "", skillLevel: "",
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
      skillLevel: s.skillLevel || "",
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const formAge = useMemo(() => {
    const a = ageFromBirthday(form.birthday);
    return a == null ? null : a;
  }, [form.birthday]);

  const formValid = form.firstName.trim() && form.lastName.trim() && isValidPhone(form.phone) && form.branchId;

  const saveForm = async () => {
    if (!formValid) return;
    setSaving(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    // Источник: реальный id справочника, а ярлык "name:…" из дефолтного списка
    // передаём именем — сервер сам найдёт/создаст источник в справочнике (раньше терялся).
    const realSourceId = form.sourceId && !form.sourceId.startsWith("name:") ? form.sourceId : null;
    const sourceName = form.sourceId.startsWith("name:") ? form.sourceId.slice(5) : undefined;
    const payload: StudentInput = {
      name: fullName,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(form.phone) || undefined,
      parentPhone: normalizePhone(form.phone) || undefined,
      gender: form.gender || null,
      birthday: form.birthday || null,
      branchId: form.branchId || adminBranchId || branches[0]?.id,
      groupId: form.groupId || undefined,
      sourceId: realSourceId,
      sourceName,
      skillLevel: form.skillLevel || null,
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
    // Тёзка найден в архиве: предлагаем восстановить вместо создания дубля (ТЗ).
    if (result && typeof result === "object" && "archivedId" in result) {
      setRestoreCandidate({ id: result.archivedId, message: result.message, name: fullName });
      return;
    }
    if (result) {
      closeForm();
      // ТЗ: после сохранения сразу открыть карточку нового ученика.
      if (typeof result === "string") {
        setView("registry");
        setOpenId(result);
      }
    }
  };

  // Восстановление тёзки из архива вместо создания дубля + открытие его карточки.
  const [restoreCandidate, setRestoreCandidate] = useState<{ id: string; message: string; name: string } | null>(null);
  const restoreFromArchive = async () => {
    if (!restoreCandidate || !onUnarchiveStudent) return;
    const id = restoreCandidate.id;
    setRestoreCandidate(null);
    await onUnarchiveStudent(id);
    closeForm();
    // ТЗ: после восстановления сразу открыть карточку, чтобы не искать по списку.
    setView("registry");
    setOpenId(id);
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
        <h1 className="text-[28px] font-black leading-tight tracking-tight" style={{ color: CLR.strong }}>Клиентская база студии</h1>
        {canManage && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl px-[18px] py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95" style={{ background: CLR.gold }}>
            <UserPlus className="h-4 w-4" /> Добавить ученика
          </button>
        )}
      </div>

      {/* Переключатель: Реестр / Лист ожидания — пилюли прототипа */}
      <div className="flex flex-wrap gap-2">
        {([["registry", "Реестр", data.length], ["waitlist", "Лист ожидания", activeWaitlist.length], ["archive", "Архив", studentArchive.length], ["history", "История действий", null]] as const).map(([id, label, cnt]) => {
          const on = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13px] font-semibold transition"
              style={on
                ? { background: CLR.gold, border: `1.5px solid ${CLR.gold}`, color: "#fff" }
                : { background: CLR.fill, border: `1.5px solid ${CLR.border}`, color: CLR.second }}
            >
              {label}
              {cnt !== null && <span className="rounded-full px-[7px] py-px text-[11px] font-semibold" style={on ? { background: "rgba(0,0,0,.15)", color: "#fff" } : { background: "rgba(0,0,0,.08)", color: CLR.muted }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* ───── Основные показатели ───── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase" style={{ letterSpacing: "0.88px", color: CLR.muted }}>Основные показатели</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => {
            const kTone = getStatusToneRaw(k.kpiKey) || k.color;
            const ic = KPI_ICON[kTone] || KPI_ICON.gray;
            const kLabel = getStatusLabel(k.kpiKey, k.label);
            return (
              <div key={k.label} onClick={() => openKpi(k.kpiKey, k.label)} role="button" tabIndex={0} className="cursor-pointer rounded-[14px] bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ border: `1px solid ${CLR.border}` }}>
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: ic.bg, color: ic.color }}>
                  <k.icon className="h-[18px] w-[18px]" />
                </div>
                <p className="text-[28px] font-extrabold leading-none" style={{ color: CLR.strong }}>{k.value}</p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.55px", color: CLR.muted }}>{kLabel}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───── Воронка продаж ───── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase" style={{ letterSpacing: "0.88px", color: CLR.muted }}>Воронка продаж</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {FUNNEL_STAGES.map((st, i) => {
            const ids = funnel[st.key] || [];
            const fTone = getStatusToneRaw("funnel:" + st.key);
            const fc = fTone ? TONE_FUNNEL[fTone] : st;
            const fLabel = getStatusLabel("funnel:" + st.key, st.label);
            return (
              <button
                key={st.key}
                onClick={() => openFunnel(st.key, st.label)}
                className="group relative flex flex-col items-start rounded-[14px] px-4 py-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: fc.bg, border: `1px solid ${fc.border}` }}
              >
                <div className="flex w-full items-center justify-between">
                  <st.icon className="h-[18px] w-[18px]" style={{ color: fc.icon_c }} />
                  <span className="text-[11px] font-bold" style={{ color: CLR.muted }}>{i + 1}</span>
                </div>
                <p className="mt-1.5 text-[26px] font-extrabold leading-none" style={{ color: fc.val }}>{ids.length}</p>
                <p className="mt-1 text-[12px] font-semibold leading-tight" style={{ color: CLR.text }}>{fLabel}</p>
                {st.hint && <p className="mt-1 text-[11px] font-semibold" style={{ color: fc.hint_c }}>{st.hint}</p>}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={listRef} />

      {view === "archive" ? (
        <StudentsArchiveView
          archive={studentArchive}
          students={data}
          branches={branches}
          onUnarchive={onUnarchiveStudent ? async (id: string) => {
            await onUnarchiveStudent(id);
            // ТЗ: после восстановления сразу открыть карточку ученика.
            setView("registry");
            setOpenId(id);
          } : undefined}
          onEditLeftOn={onEditArchive}
        />
      ) : view === "waitlist" ? (
        <WaitlistTable
          rows={waitlistRows}
          branches={branches}
          groups={groups}
          branchName={branchName}
          groupName={groupName}
          studentGroupId={studentGroupId}
          studentPhone={studentPhone}
          onOpen={(id) => { setView("registry"); setOpenId(id); }}
          onInvite={onBookTrial ? (id) => { setView("registry"); setCardPanel("trial"); setOpenId(id); } : undefined}
          onRemove={onRemoveFromWaitlist ? removeFromWaitlist : undefined}
          now={now}
        />
      ) : view === "history" ? (
        <ActionHistoryView roleHeader={roleHeader} />
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
          <div className="flex flex-wrap gap-2 pb-1">
            {SEG_CHIPS.map((seg) => {
              const active = !presetIds && segment === seg.id;
              return (
                <button
                  key={seg.id}
                  onClick={() => { clearPreset(); setSegment(seg.id as any); }}
                  className="whitespace-nowrap rounded-full px-3.5 py-[7px] text-[13px] font-semibold transition"
                  style={active
                    ? { background: CLR.gold, border: `1px solid ${CLR.gold}`, color: "#fff" }
                    : { background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}
                >
                  {seg.label}
                </button>
              );
            })}
          </div>

          {/* Фильтры + поиск + настройка таблицы */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: CLR.muted }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени, телефону…" className="w-full rounded-[10px] py-2 pl-9 pr-3 text-[13px] outline-none" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.text }} />
            </div>
            <FilterSelect value={presetIds ? "all" : statusFilter} onChange={(v) => { clearPreset(); setStatusFilter(v); }} options={[...STATUS_FILTER_OPTIONS, ...getManualStatuses().map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={branchFilter} onChange={(v) => { clearPreset(); setBranchFilter(v); }} options={[{ value: "all", label: "Все филиалы" }, ...branches.map((b) => ({ value: b.id, label: b.name || b.city }))]} />
            <FilterSelect value={presetIds ? "all" : groupFilter} onChange={(v) => { clearPreset(); setGroupFilter(v); }} options={[{ value: "all", label: "Все группы" }, ...visibleGroups.map((g) => ({ value: g.id, label: g.name }))]} />
            <FilterSelect value={presetIds ? "all" : ltvFilter} onChange={(v) => { clearPreset(); setLtvFilter(v); }} options={[{ value: "all", label: "Все LTV" }, ...LTV_SEGMENTS.map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={skillFilter} onChange={(v) => { clearPreset(); setSkillFilter(v); }} options={[{ value: "all", label: "Все уровни" }, ...SKILL_LEVELS.map((l) => ({ value: l, label: l }))]} />
            {/* Архив вынесен в отдельную вкладку «Архив» — список показывает только активных. */}
            <button onClick={() => setShowColumnConfig((v) => !v)} className="inline-flex items-center justify-center gap-2 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition" style={showColumnConfig ? { background: "#F2EDE2", border: `1px solid ${CLR.gold}`, color: CLR.gold } : { background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}>
              <SlidersHorizontal className="h-4 w-4" /> Настроить таблицу
            </button>
            <button onClick={() => setShowStatusSettings(true)} className="inline-flex items-center justify-center gap-2 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}>
              <SlidersHorizontal className="h-4 w-4" /> Статусы
            </button>
          </div>

          {/* Конфигуратор столбцов */}
          {showColumnConfig && (
            <div className="rounded-[14px] bg-white p-4 shadow-sm" style={{ border: `1px solid ${CLR.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: CLR.strong }}>Включите нужные столбцы</p>
                <button onClick={() => setShowColumnConfig(false)} className="rounded-lg p-1 hover:bg-[#F1F4F7]" style={{ color: CLR.muted }}><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {ALL_COLUMNS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2 text-sm hover:bg-[#F7F9FB]" style={{ border: `1px solid ${CLR.border}` }}>
                    <input type="checkbox" checked={colOn(c.key)} onChange={() => toggleCol(c.key)} className="h-4 w-4" style={{ accentColor: CLR.gold }} />
                    <span className="font-medium" style={{ color: CLR.second }}>{c.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs" style={{ color: CLR.muted }}>Имя и фамилия, № и действия отображаются всегда. Выбор сохраняется на этом устройстве.</p>
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
            <div className="flex flex-wrap items-center gap-2 rounded-[14px] p-3 text-sm" style={{ background: "#F2EDE2", border: `1px solid ${CLR.gold}` }}>
              <span className="font-bold" style={{ color: CLR.gold }}>Выбрано: {selected.size}</span>
              <span style={{ color: CLR.border }}>|</span>
              {onUpdateStudent && (
                <select onChange={(e) => { massTransferGroup(e.target.value); e.target.value = ""; }} defaultValue="" className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#fff", border: `1px solid ${CLR.border}`, color: CLR.second }}>
                  <option value="" disabled>Группа…</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              {onUpdateStudent && (
                <select onChange={(e) => { massTransferBranch(e.target.value); e.target.value = ""; }} defaultValue="" className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#fff", border: `1px solid ${CLR.border}`, color: CLR.second }}>
                  <option value="" disabled>Филиал…</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name || b.city}</option>)}
                </select>
              )}
              <select onChange={(e) => { massSetStatus(e.target.value); e.target.value = ""; }} defaultValue="" className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#fff", border: `1px solid ${CLR.border}`, color: CLR.second }}>
                <option value="" disabled>Статус…</option>
                <option value="active">Активный</option>
                <option value="paused">Заморозить абонемент</option>
                {getManualStatuses().map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <MassBtn icon={MessageCircle} label="WhatsApp" onClick={massWhatsApp} />
              <MassBtn icon={Download} label="Excel" onClick={() => exportCsv(selectedStudents)} />
              {onArchiveStudent && <MassBtn icon={Archive} label="В архив" tone="rose" onClick={massArchive} />}
              <button onClick={clearSelection} className="ml-auto rounded-[10px] px-3 py-1.5 text-[12px] font-semibold hover:bg-white" style={{ color: CLR.muted }}>Снять выделение</button>
            </div>
          )}

          {/* Мобильный вид — карточки вместо таблицы */}
          <div className="space-y-2 md:hidden">
            {pageRows.length === 0 && (
              <div className="rounded-[16px] bg-white px-4 py-10 text-center text-[14px]" style={{ border: `1px solid ${CLR.border}`, color: CLR.muted }}>Никого не найдено по текущим фильтрам</div>
            )}
            {pageRows.map((s) => {
              const st = getStudentState(s, now);
              const phone = studentPhone(s) || "—";
              return (
                <div key={s.id} className="rounded-[16px] bg-white p-3.5 shadow-sm" style={{ border: `1px solid ${openId === s.id ? CLR.gold : CLR.border}` }}>
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} className="mt-1 h-4 w-4 shrink-0" style={{ accentColor: CLR.gold }} />
                    <button onClick={() => setOpenId(s.id)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-bold" style={{ color: CLR.text }}>{s.name}</span>
                        {waitlistStudentIds.has(s.id) && <Clock className="h-3.5 w-3.5 shrink-0 text-violet-500" />}
                      </div>
                      <div className="mt-0.5 truncate text-[12px]" style={{ color: CLR.muted }}>{branchName(s.branchId)} · {studentGroupNames(s)}</div>
                    </button>
                    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${waitlistStudentIds.has(s.id) ? PILL_TONE.purple : PILL_TONE[pillToneOf(s, st)] || PILL_TONE.gray}`}>{waitlistStudentIds.has(s.id) ? "В листе ожидания" : st.statusLabel}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: CLR.second }}>
                    <span>{phone}</span>
                    {colOn("age") && <span>{formatAge(s)}</span>}
                    {st.debt > 0 && <span className="font-bold" style={{ color: st.partialDebt > 0 ? "#B45309" : "#B14545" }}>{st.partialDebt > 0 ? "Частичный долг" : "Долг"} {money(st.debt)}</span>}
                    {colOn("ltv") && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${LTV_BADGE[st.ltv]}`}>{st.ltv}</span>}
                    {/* Бейджи пробных скрываются после покупки абонемента — воронка пройдена (ТЗ). */}
                    {!funnelDone(s) && st.trialCount > 0 && <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${st.trialOverLimit ? "bg-[#F6E9E9] text-[#B14545]" : "bg-[#EDF1F5] text-[#5C6772]"}`}>ПУ ×{st.trialCount}</span>}
                    {!funnelDone(s) && st.trialDate && <span className="inline-flex rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">ПУ {new Date(st.trialDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</span>}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1 border-t pt-2" style={{ borderColor: "#EEF1F4" }}>
                    <IconLink icon={Phone} title="Позвонить" href={telHref(phone)} tone="text-slate-500 hover:bg-slate-100" />
                    <IconLink icon={MessageCircle} title="WhatsApp" href={waHref(phone)} tone="text-emerald-600 hover:bg-emerald-50" />
                    <IconLink icon={Send} title="Telegram" href={tgHref(phone)} tone="text-sky-600 hover:bg-sky-50" />
                    <button onClick={() => setOpenId(s.id)} className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}>
                      <Eye className="h-3.5 w-3.5" /> Карточка
                    </button>
                  </div>
                </div>
              );
            })}
            {/* Пагинация (мобильная) */}
            <div className="flex items-center justify-between rounded-[16px] bg-white px-3.5 py-2.5" style={{ border: `1px solid ${CLR.border}` }}>
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-[10px] p-2 disabled:opacity-30" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-[12px] font-semibold" style={{ color: CLR.second }}>{page + 1} / {totalPages} · {filtered.length} чел.</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="rounded-[10px] p-2 disabled:opacity-30" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Таблица */}
          <div className="hidden overflow-hidden rounded-[16px] bg-white shadow-sm md:block" style={{ border: `1px solid ${CLR.border}` }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead style={{ background: CLR.fill }}>
                  <tr style={{ borderBottom: `1px solid ${CLR.border}` }}>
                    {[
                      <input key="chk" type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="h-4 w-4" style={{ accentColor: CLR.gold }} />,
                      "№", "Имя и фамилия",
                      colOn("phone") && "Телефон", colOn("gender") && "Пол", colOn("age") && "Возраст",
                      colOn("branch") && "Филиал", colOn("group") && "Группа", colOn("skill") && "Уровень", colOn("source") && "Источник",
                      colOn("duration") && "Продолжительность", colOn("subEnd") && "Окончание",
                      colOn("debt") && "Долг", colOn("ltv") && "LTV-сегмент", colOn("status") && "Статус", "Действия",
                    ].filter((v) => v !== false).map((label, idx) => (
                      <th key={idx} className={`px-3.5 py-3 text-[11px] font-bold uppercase ${idx === 0 ? "w-10" : ""}`} style={{ letterSpacing: "0.55px", color: CLR.muted }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr><td colSpan={colCount} className="px-4 py-12 text-center text-[14px]" style={{ color: CLR.muted }}>Никого не найдено по текущим фильтрам</td></tr>
                  )}
                  {pageRows.map((s, i) => {
                    const st = getStudentState(s, now);
                    const phone = studentPhone(s) || "—";
                    return (
                      <tr key={s.id} className={`transition hover:bg-[#F7F9FB] ${openId === s.id ? "ring-2 ring-inset" : ""}`} style={{ borderBottom: "1px solid #EEF1F4", ...(openId === s.id ? { boxShadow: `inset 0 0 0 2px ${CLR.gold}` } : {}) }}>
                        <td className="px-3.5 py-3"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} className="h-4 w-4" style={{ accentColor: CLR.gold }} /></td>
                        <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.muted }}>{page * pageSize + i + 1}</td>
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setOpenId(s.id)} className="text-left text-[13px] font-semibold hover:underline" style={{ color: CLR.text }}>{s.name}</button>
                            {waitlistStudentIds.has(s.id) && (
                              <span title="В листе ожидания" className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600"><Clock className="h-3 w-3" /></span>
                            )}
                          </div>
                        </td>
                        {colOn("phone") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{phone}</td>}
                        {colOn("gender") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{genderLabel(s.gender)}</td>}
                        {colOn("age") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{formatAge(s)}</td>}
                        {colOn("branch") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{branchName(s.branchId)}</td>}
                        {colOn("group") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{studentGroupNames(s)}</td>}
                        {colOn("skill") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{s.skillLevel || "—"}</td>}
                        {colOn("source") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{sourceName(s.sourceId)}</td>}
                        {colOn("duration") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{st.durationLabel}</td>}
                        {colOn("subEnd") && <td className="px-3.5 py-3 text-[13px]" style={{ color: CLR.second }}>{st.subscriptionEndLabel}</td>}
                        {colOn("debt") && <td className="px-3.5 py-3 text-[13px] font-semibold" style={{ color: st.debt > 0 ? "#B14545" : CLR.muted }}>{st.debt > 0 ? money(st.debt) : "—"}</td>}
                        {colOn("ltv") && <td className="px-3.5 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LTV_BADGE[st.ltv]}`}>{st.ltv}</span></td>}
                        {colOn("status") && (
                          <td className="px-3.5 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${waitlistStudentIds.has(s.id) ? PILL_TONE.purple : PILL_TONE[pillToneOf(s, st)] || PILL_TONE.gray}`}>{waitlistStudentIds.has(s.id) ? "В листе ожидания" : st.statusLabel}</span>
                              {/* Бейджи пробных скрываются после покупки — воронка пройдена (ТЗ). */}
                              {!funnelDone(s) && st.trialCount > 0 && (
                                <span
                                  title={st.trialOverLimit ? "Превышен регламент: более 2 пробных уроков" : "Количество пробных уроков"}
                                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${st.trialOverLimit ? "bg-[#F6E9E9] text-[#B14545]" : "bg-[#EDF1F5] text-[#5C6772]"}`}
                                >
                                  ПУ ×{st.trialCount}
                                </span>
                              )}
                              {!funnelDone(s) && st.trialDate && (
                                <span
                                  title="Дата пробного урока (актуальная запись)"
                                  className="inline-flex items-center rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700"
                                >
                                  ПУ {new Date(st.trialDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                                </span>
                              )}
                              {st.partialDebt > 0 && (
                                <span
                                  title="Частичный долг: внесено меньше стоимости абонемента"
                                  className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                                >
                                  частичный долг {money(st.partialDebt)}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-1">
                            <IconLink icon={Phone} title="Позвонить" href={telHref(phone)} tone="text-slate-500 hover:bg-slate-100" />
                            <IconLink icon={MessageCircle} title="WhatsApp" href={waHref(phone)} tone="text-emerald-600 hover:bg-emerald-50" />
                            <IconLink icon={Send} title="Telegram" href={tgHref(phone)} tone="text-sky-600 hover:bg-sky-50" />
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
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]" style={{ borderTop: `1px solid ${CLR.border}` }}>
              <p style={{ color: CLR.muted }}>
                Показано {filtered.length === 0 ? 0 : page * pageSize + 1}–{Math.min(filtered.length, (page + 1) * pageSize)} из {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => exportCsv(filtered)} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}>
                  <Download className="h-3.5 w-3.5" /> Экспорт
                </button>
                <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-[10px] p-1.5 disabled:opacity-30" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-[12px] font-semibold" style={{ color: CLR.second }}>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="rounded-[10px] p-1.5 disabled:opacity-30" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}><ChevronRight className="h-4 w-4" /></button>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-[10px] px-2 py-1.5 text-[12px] font-semibold" style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}>
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / стр</option>)}
                </select>
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
          onManageSources={canManageSources ? () => setShowSources(true) : undefined}
        />
      )}

      {/* Управление справочником источников */}
      {showSources && canManageSources && (
        <SourcesManagerModal
          sources={leadSources}
          onCreate={onCreateLeadSource}
          onUpdate={onUpdateLeadSource}
          onDelete={onDeleteLeadSource}
          onClose={() => setShowSources(false)}
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
                onClose={() => { setOpenId(null); setCardPanel(null); }}
                initialPanel={cardPanel || undefined}
                onArchive={onArchiveStudent ? () => { setOpenId(null); setArchiveModal([openStudent]); } : undefined}
                onSetStatus={onUpdateStudent ? (value) => setStudentStatus(openStudent.id, value) : undefined}
                onTrial={onBookTrial ? (payload) => onBookTrial(openStudent.id, payload) : undefined}
                onDeleteTrial={onDeleteTrial ? (date) => onDeleteTrial(openStudent.id, date) : undefined}
                statusOptions={[{ value: "active", label: "Активный" }, { value: "paused", label: "Заморозить абонемент" }, ...getManualStatuses().map((s) => ({ value: s, label: s }))]}
                onEdit={canManage ? () => { setOpenId(null); openEdit(openStudent); } : undefined}
                onDelete={onDeleteStudent ? async () => { await onDeleteStudent(openStudent.id); applyOverride(openStudent.id, { status: "left" }); setOpenId(null); } : undefined}
                onOpenPayment={onOpenPayment ? () => onOpenPayment(openStudent) : undefined}
                plans={plans}
                leadSources={leadSources}
                onSellSubscription={onSellSubscription}
                onSellSubscriptionBatch={onSellSubscriptionBatch}
                onTransfer={onUpdateStudent ? (payload) => onUpdateStudent(openStudent.id, payload) : undefined}
                onAddToWaitlist={onAddToWaitlist}
                inWaitlist={waitlistStudentIds.has(openStudent.id)}
                canGrantAccess={canManage}
                roleHeader={roleHeader}
              />
            </div>
          </div>
        </div>
      )}

      {showStatusSettings && <StatusSettings roleHeader={roleHeader} onClose={() => setShowStatusSettings(false)} />}

      {/* Тёзка в архиве: восстановить вместо создания дубля (ТЗ). */}
      {restoreCandidate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setRestoreCandidate(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-black text-slate-900">Ученик уже есть в архиве</p>
            <p className="mt-2 text-sm text-slate-600">{restoreCandidate.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {onUnarchiveStudent && (
                <button
                  onClick={restoreFromArchive}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  Восстановить из архива
                </button>
              )}
              <button
                onClick={() => setRestoreCandidate(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {archiveModal && (() => {
        const withSub = archiveModal.filter((s) => hasCoveringSubscription(s));
        const warning = withSub.length === 0 ? undefined
          : archiveModal.length === 1
            ? "У ученика есть действующий абонемент. В архив переводят ушедших — убедитесь, что он действительно перестал ходить (или сначала завершите/удалите абонемент)."
            : `У ${withSub.length} из ${archiveModal.length} выбранных есть действующий абонемент. Обычно в архив переводят ушедших — проверьте список.`;
        return (
        <ArchiveReasonModal
          title={archiveModal.length === 1 ? `В архив: ${archiveModal[0].name}` : `В архив: ${archiveModal.length} учеников`}
          subtitle="Укажите причину ухода и комментарий"
          busy={archiveBusy}
          warning={warning}
          onConfirm={confirmArchive}
          onCancel={() => setArchiveModal(null)}
        />
        );
      })()}

      {/* Дата обещанной оплаты — всплывающий календарь (заменяет window.prompt). */}
      {promptPromise && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={() => setPromptPromise(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" style={{ border: `1px solid ${CLR.border}` }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black" style={{ color: CLR.strong }}>Дата обещанной оплаты</h3>
            <p className="mt-1 text-xs" style={{ color: CLR.muted }}>Статус «{promptPromise.value}» — до какого числа ученик обещал оплатить.</p>
            <input
              type="date"
              value={promiseDateVal}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPromiseDateVal(e.target.value)}
              autoFocus
              className="mt-3 w-full rounded-[10px] px-3 py-2 text-sm outline-none"
              style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.text }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPromptPromise(null)} className="rounded-[10px] px-4 py-2 text-sm font-bold" style={{ border: `1px solid ${CLR.border}`, color: CLR.second }}>Отмена</button>
              <button onClick={confirmPromiseDate} className="rounded-[10px] px-4 py-2 text-sm font-black text-white" style={{ background: CLR.gold }}>Сохранить статус</button>
            </div>
          </div>
        </div>
      )}

      {/* Предупреждение о последствиях смены статуса (показываем только когда они есть) */}
      {statusWarn && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4" onClick={() => setStatusWarn(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" style={{ border: `1px solid ${CLR.border}` }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black" style={{ color: "#B14545" }}>Так статус поставить нельзя</h3>
            <p className="mt-1 text-xs font-bold" style={{ color: CLR.strong }}>{statusWarn.names}</p>
            <p className="mt-2 text-sm" style={{ color: CLR.second }}>{statusWarn.reason}</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setStatusWarn(null)} className="rounded-[10px] px-4 py-2 text-sm font-black text-white" style={{ background: CLR.gold }}>Понятно</button>
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
  rows, branches, groups, branchName, groupName, studentGroupId, studentPhone, onOpen, onInvite, onRemove, now,
}: {
  rows: WaitRow[];
  branches: Branch[];
  groups: Group[];
  branchName: (id?: string) => string;
  groupName: (id?: string) => string;
  studentGroupId: (s: Student) => string;
  studentPhone: (s: Student) => string;
  onOpen: (studentId: string) => void;
  /** Пригласить на пробный урок: открывает карточку с раскрытой панелью пробного. */
  onInvite?: (studentId: string) => void;
  onRemove?: (entryId: string) => void;
  now: Date;
}) {
  // Фильтры по филиалу и желаемой группе (корректировка ТЗ — заказчик, 24 июня).
  const [wlBranch, setWlBranch] = useState("all");
  const [wlGroup, setWlGroup] = useState("all");
  const wantBranchOf = (r: WaitRow) => r.entry.branchId || r.student?.branchId || "";
  const wantGroupOf = (r: WaitRow) => r.entry.groupId || (r.student ? studentGroupId(r.student) : "");
  const visibleGroups = wlBranch === "all" ? groups : groups.filter((g) => g.branchId === wlBranch);
  const filteredRows = rows.filter((r) => {
    if (wlBranch !== "all" && wantBranchOf(r) !== wlBranch) return false;
    if (wlGroup !== "all" && wantGroupOf(r) !== wlGroup) return false;
    return true;
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div>
          <p className="text-sm font-black">Лист ожидания</p>
          <p className="text-xs text-slate-400">Очередь по дате постановки: кому звонить первым, в какой филиал и группу хотел попасть, сколько ждёт.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={wlBranch}
            onChange={(v) => { setWlBranch(v); setWlGroup("all"); }}
            options={[{ value: "all", label: "Все филиалы" }, ...branches.map((b) => ({ value: b.id, label: b.name || b.city }))]}
          />
          <FilterSelect
            value={wlGroup}
            onChange={setWlGroup}
            options={[{ value: "all", label: "Все группы" }, ...visibleGroups.map((g) => ({ value: g.id, label: g.name }))]}
          />
        </div>
      </div>
      {/* Мобильные карточки листа ожидания */}
      <div className="space-y-2 p-3 md:hidden">
        {filteredRows.length === 0 && (
          <div className="rounded-xl border border-slate-200 px-4 py-8 text-center text-sm text-slate-400">{rows.length === 0 ? "Лист ожидания пуст." : "По выбранным фильтрам никого нет."}</div>
        )}
        {filteredRows.map((r) => {
          const s = r.student!;
          const phone = studentPhone(s) || "—";
          const prio = getWaitPriority(r.entry.addedAt, now);
          const meta = WAIT_PRIORITY_META[prio];
          const wantBranch = r.entry.branchId || s.branchId;
          const wantGroup = r.entry.groupId || studentGroupId(s);
          return (
            <div key={r.entry.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onOpen(s.id)} className="min-w-0 text-left">
                  <p className="truncate text-[14px] font-bold text-slate-900">{s.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">{branchName(wantBranch)} · {groupName(wantGroup)}</p>
                </button>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>
              </div>
              <p className="mt-1.5 text-[12px] text-slate-500">{phone} · ждёт {formatWaitDuration(r.entry.addedAt, now)}</p>
              {r.entry.comment && <p className="mt-1 line-clamp-2 text-[12px] text-slate-400">{r.entry.comment}</p>}
              <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2">
                <IconLink icon={Phone} title="Позвонить" href={telHref(phone)} tone="text-slate-500 hover:bg-slate-100" />
                <IconLink icon={MessageCircle} title="WhatsApp" href={waHref(phone)} tone="text-emerald-600 hover:bg-emerald-50" />
                <IconLink icon={Send} title="Telegram" href={tgHref(phone)} tone="text-sky-600 hover:bg-sky-50" />
                {onInvite && <IconBtn icon={Calendar} title="Пригласить на пробный урок" onClick={() => onInvite(s.id)} tone="text-sky-600 hover:bg-sky-50" />}
                <IconBtn icon={UserPlus} title="Записать в группу" onClick={() => onOpen(s.id)} tone="text-amber-600 hover:bg-amber-50" />
                {onRemove && <span className="ml-auto"><IconBtn icon={Trash2} title="Удалить из листа" onClick={() => onRemove(r.entry.id)} tone="text-rose-500 hover:bg-rose-50" /></span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
            {filteredRows.length === 0 && (
              <tr><td colSpan={12} className="p-10 text-center text-sm text-slate-400">{rows.length === 0 ? "Лист ожидания пуст. Добавьте ученика из его карточки кнопкой «Добавить в лист ожидания»." : "По выбранным фильтрам никого нет."}</td></tr>
            )}
            {filteredRows.map((r, i) => {
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
                      {onInvite && <IconBtn icon={Calendar} title="Пригласить на пробный урок" onClick={() => onInvite(s.id)} tone="text-sky-600 hover:bg-sky-50" />}
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

/* ============================ История действий ============================ */
/* ТЗ заказчика: кто что делал по датам (добавлял/сохранял/удалял). Данные —
   audit_logs (сервер пишет каждую мутацию), подписи готовит сервер. */
function ActionHistoryView({ roleHeader }: { roleHeader: string }) {
  const [logs, setLogs] = useState<{ at: string; who: string; role: string | null; action: string; detail: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/mvp/audit-logs?limit=300", { headers: { "x-demo-role": roleHeader } });
        if (r.ok && alive) setLogs((await r.json()).logs || []);
      } catch { /* ignore */ } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [roleHeader]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Загрузка истории…</div>;
  if (!logs.length) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">История действий пока пуста.</div>;

  // Группировка по дням, свежие сверху.
  const byDay = new Map<string, typeof logs>();
  for (const l of logs) {
    const day = (l.at || "").slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(l);
  }
  const dayLabel = (iso: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (iso === today) return "Сегодня";
    if (iso === yest) return "Вчера";
    return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  };
  const ROLE_LABEL: Record<string, string> = { owner: "Владелец", branch_manager: "Управляющий", admin: "Админ", teacher: "Педагог", student: "Ученик" };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-sm font-black">История действий</p>
        <p className="text-xs text-slate-400">Кто и что делал в системе: добавления, изменения, продажи, удаления. Последние {logs.length} действий.</p>
      </div>
      <div className="max-h-[640px] space-y-4 overflow-y-auto p-4">
        {Array.from(byDay.entries()).map(([day, items]) => (
          <div key={day}>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">{dayLabel(day)}</p>
            <div className="space-y-1.5">
              {items.map((l, i) => (
                <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-slate-400">{(l.at || "").slice(11, 16)}</span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-px text-[10px] font-bold uppercase text-slate-500">{ROLE_LABEL[l.role || ""] || l.role || "—"}</span>
                  <span className="font-bold text-slate-800">{l.action}</span>
                  {l.detail && <span className="text-slate-500">· {l.detail}</span>}
                  <span className="ml-auto text-xs text-slate-400">{l.who}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ Окно «Новый ученик» ============================ */
function StudentFormModal({
  editing, form, setField, branches, groups, sourceOptions, age, valid, saving, onSave, onClose, onManageSources,
}: {
  editing: boolean;
  form: { firstName: string; lastName: string; phone: string; gender: "" | "male" | "female"; birthday: string; branchId: string; groupId: string; sourceId: string; parentName: string; comment: string; skillLevel: string };
  setField: (patch: Partial<{ firstName: string; lastName: string; phone: string; gender: "" | "male" | "female"; birthday: string; branchId: string; groupId: string; sourceId: string; parentName: string; comment: string; skillLevel: string }>) => void;
  branches: Branch[];
  groups: Group[];
  sourceOptions: { value: string; label: string }[];
  age: number | null;
  valid: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onManageSources?: () => void;
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
          <FInput label="Телефон *" value={form.phone} onChange={(v) => setField({ phone: formatPhoneInput(v) })} placeholder="+7 (701) 001-11-22" invalid={Boolean(form.phone) && !isValidPhone(form.phone)} hint={Boolean(form.phone) && !isValidPhone(form.phone) ? "Введите номер полностью: +7 и 10 цифр" : undefined} />
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
          <label className="flex flex-col gap-1">
            <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Источник (откуда о нас узнали)
              {onManageSources && (
                <button type="button" onClick={onManageSources} className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 transition hover:text-amber-700">
                  <SlidersHorizontal className="h-3 w-3" /> Изменить список
                </button>
              )}
            </span>
            <select value={form.sourceId} onChange={(e) => setField({ sourceId: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400">
              {[{ value: "", label: "Не указан" }, ...sourceOptions].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <FSelect label="Уровень подготовки" value={form.skillLevel} onChange={(v) => setField({ skillLevel: v })} options={[{ value: "", label: "Не указан" }, ...SKILL_LEVELS.map((l) => ({ value: l, label: l }))]} />
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

/* ============================ Управление источниками ============================ */
function SourcesManagerModal({
  sources, onCreate, onUpdate, onDelete, onClose,
}: {
  sources: LeadSource[];
  onCreate?: (data: { name: string }) => Promise<boolean>;
  onUpdate?: (id: string, data: { name?: string; status?: string }) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!newName.trim() || !onCreate) return;
    setBusy(true);
    const ok = await onCreate({ name: newName.trim() });
    setBusy(false);
    if (ok) setNewName("");
  };
  const saveEdit = async () => {
    if (!editId || !editName.trim() || !onUpdate) return;
    setBusy(true);
    const ok = await onUpdate(editId, { name: editName.trim() });
    setBusy(false);
    if (ok) { setEditId(null); setEditName(""); }
  };
  const remove = async (id: string, name: string) => {
    if (!onDelete) return;
    if (!window.confirm(`Удалить источник «${name}»? У существующих учеников он станет «не указан».`)) return;
    setBusy(true);
    await onDelete(id);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-12 w-full max-w-md rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" /> Справочник
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-tight">Источники привлечения</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3 p-6">
          {onCreate && (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="Новый источник (напр. Билборд)"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <button onClick={add} disabled={busy || !newName.trim()} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-40">
                <Plus className="h-4 w-4" /> Добавить
              </button>
            </div>
          )}

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
            {sources.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-400">Источников пока нет. Добавьте первый выше.</li>
            )}
            {sources.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                {editId === s.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }}
                      className="flex-1 rounded-lg border border-amber-300 px-2.5 py-1.5 text-sm outline-none"
                      autoFocus
                    />
                    <button onClick={saveEdit} disabled={busy} className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-black text-white hover:bg-emerald-600">Сохранить</button>
                    <button onClick={() => { setEditId(null); setEditName(""); }} className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-100">Отмена</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-semibold text-slate-700">{s.name}</span>
                    {onUpdate && <IconBtn icon={SlidersHorizontal} title="Переименовать" onClick={() => { setEditId(s.id); setEditName(s.name); }} tone="text-slate-500 hover:bg-slate-100" />}
                    {onDelete && <IconBtn icon={Trash2} title="Удалить" onClick={() => remove(s.id, s.name)} tone="text-rose-500 hover:bg-rose-50" />}
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">Источники используются в окне нового ученика и в фильтрах. Изменения видят все сотрудники.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- мелкие UI ---------- */
function FInput({ label, value, onChange, placeholder, invalid, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; invalid?: boolean; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`rounded-xl border px-3 py-2 text-sm outline-none ${invalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-amber-400"}`} />
      {hint && <span className="text-[10px] text-rose-500">{hint}</span>}
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
function RecoBlock({
  tone, title, subtitle, students, phoneOf, groupOf, onOpen, actionLabel,
}: {
  tone: "amber" | "rose";
  title: string;
  subtitle: string;
  students: Student[];
  phoneOf: (s: Student) => string;
  groupOf: (s: Student) => string;
  onOpen: (id: string) => void;
  actionLabel: string;
}) {
  const head = tone === "amber" ? "text-amber-700" : "text-rose-700";
  const dot = tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  const waHref = (phone: string) => `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
  return (
    <div className="rounded-xl border border-white/60 bg-white/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <p className={`text-sm font-black ${head}`}>{title}</p>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">{students.length}</span>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">{subtitle}</p>
      {students.length === 0 ? (
        <p className="text-xs text-slate-400">Никого — всё под контролем.</p>
      ) : (
        <div className="grid gap-1.5">
          {students.slice(0, 5).map((s) => {
            const phone = phoneOf(s);
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
                <button onClick={() => onOpen(s.id)} className="min-w-0 text-left">
                  <p className="truncate text-sm font-bold text-slate-700">{s.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{groupOf(s)} · {actionLabel}</p>
                </button>
                {phone && (
                  <a href={waHref(phone)} target="_blank" rel="noreferrer" title="WhatsApp" className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })}
          {students.length > 5 && (
            <p className="text-[11px] font-bold text-slate-400">…и ещё {students.length - 5}</p>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  // appearance-none + bg-white + явный шрифт и chevron: на узких колонках
  // нативный select «замыливался» (текст наезжал на стрелку). Теперь рендерится чётко.
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[8rem] cursor-pointer appearance-none rounded-[10px] py-2 pl-3 pr-9 text-[13px] font-medium outline-none transition"
        style={{ background: CLR.fill, border: `1px solid ${CLR.border}`, color: CLR.second }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: CLR.muted }} />
    </div>
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
