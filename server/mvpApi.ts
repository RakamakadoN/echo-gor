import type express from "express";
import {
  initialAnnouncements,
  initialAuditLogs,
  initialBranches,
  initialGroups,
  initialHalls,
  initialPayments,
  initialStudents,
  initialTeachers,
  initialOrganizations,
  initialFinanceTransactions,
  getExecutiveSummary
} from "../src/dataMock";
import { ArtistLevel, type Attendance, type Payment, type Student } from "../src/types";
import {
  createVideoRenderJob,
  getVideoJob,
  getVideoJobs,
  listVideoTemplates,
} from "./video/videoGeneration";
import {
  runParser,
  normalize,
  supabaseUpsert,
  type RawCandidate,
  type EventType,
  type Audience,
} from "./danceEventsParser";

type MvpSession = {
  userId: string;
  organizationId: string;
  role: "owner" | "branch_manager" | "admin" | "teacher" | "student";
  branchId: string | null;   // mock-data branch key (see src/dataMock.ts)
  dbBranchId: string | null; // real Supabase branch UUID (see db/seed_mvp_demo.sql)
  fullName: string;
  studentId?: string;                 // задан только для сессии ученика (вход по токену)
  accessLevel?: "junior" | "senior";  // уровень прав кабинета ученика
};

// Возраст (включительно), до которого ученик по умолчанию считается «маленькой»
// группой (junior). Старше — «взрослая» (senior). Владелец может переопределить
// уровень вручную (students.access_level). См. миграцию 032.
const JUNIOR_MAX_AGE = 10;

// Вкладки кабинета, доступные каждому уровню (совпадает с фронтом StudentArtistCabinet).
const JUNIOR_TABS = ["Главная", "Наклейки", "Достижения"];
const SENIOR_TABS = ["Главная", "Наклейки", "Достижения", "Мой путь", "Паспорт", "Сообщество", "Магазин", "Выступления", "Видео"];

// Кто может выдавать/отзывать вход ученику.
const accessGrantStaff = ["owner", "branch_manager", "admin"];

// Стандартный пароль ученика (один для всех). Вход — по номеру телефона + этот пароль.
const STUDENT_STANDARD_PASSWORD = "12345";

// Эффективный уровень: ручное переопределение приоритетнее авто-расчёта по возрасту.
// Возраст неизвестен (null/undefined/некорректный) → безопасный минимум «junior»
// («маленькая» группа), персонал при желании переопределит вручную.
function effectiveAccessLevel(manual: string | null | undefined, age: number | null | undefined): "junior" | "senior" {
  if (manual === "junior" || manual === "senior") return manual;
  if (age === null || age === undefined) return "junior";
  const a = Number(age);
  if (!Number.isFinite(a) || a <= 0) return "junior";
  return a <= JUNIOR_MAX_AGE ? "junior" : "senior";
}

function tabsForLevel(level: "junior" | "senior") {
  return level === "junior" ? JUNIOR_TABS : SENIOR_TABS;
}

// Хранилище токенов доступа учеников. В mock-режиме — единственный источник;
// в Supabase-режиме — кэш (наполняется при выдаче и при входе), чтобы getSession
// оставался синхронным. token -> { studentId, level, branchId }.
const studentAccessTokens = new Map<string, { studentId: string; level: "junior" | "senior"; branchId: string | null }>();
function newAccessToken() {
  const rnd = () => (globalThis.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`);
  return `st_${rnd()}${rnd()}`.replace(/-/g, "");
}
// Короткий код входа ученика (для ручного ввода): 6 знаков без похожих
// символов (без 0/O/1/I/L). Нормализация ввода — normalizeAccessCode.
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newAccessCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ACCESS_CODE_ALPHABET[Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length)];
  return s;
}
function normalizeAccessCode(raw: string) {
  // Алфавит кода не содержит O/0/I/1/L, поэтому просто приводим к верхнему
  // регистру и убираем всё, кроме букв/цифр (пробелы, дефисы и т.п.).
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

// Organization UUID — MUST match the organizations row seeded in db/seed_mvp_demo.sql.
const orgId = "00000000-0000-0000-0000-000000000001";
// Almaty branch UUID from db/seed_mvp_demo.sql (the only seeded branch with staff/students).
const demoBranchAlmaty = "00000000-0000-0000-0000-000000000101";

// Имена демо-сессий = названия ролей (ТЗ заказчика 2026-07-12): вымышленных
// сотрудников в истории быть не должно, пока нет настоящей авторизации.
const demoUsers: MvpSession[] = [
  { userId: "00000000-0000-0000-0000-000000001001", organizationId: orgId, role: "owner", branchId: null, dbBranchId: null, fullName: "Владелец" },
  { userId: "00000000-0000-0000-0000-000000001002", organizationId: orgId, role: "branch_manager", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "Управляющий" },
  { userId: "00000000-0000-0000-0000-000000001003", organizationId: orgId, role: "admin", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "Администратор" },
  { userId: "00000000-0000-0000-0000-000000001004", organizationId: orgId, role: "teacher", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "Педагог" }
];

// Демо-филиал из seed может отсутствовать в реальной БД (филиалы пересоздавали) —
// тогда руководитель/админ/педагог видели ПУСТОЙ кабинет (0 групп/учеников).
// Лениво перепривязываем демо-сессии к первому реальному филиалу организации.
let demoBranchChecked = false;
async function ensureDemoBranchBinding() {
  if (demoBranchChecked || !supabaseEnabled) return;
  try {
    const branches = await supabaseFetch<any[]>("branches", `select=id&organization_id=eq.${orgId}&status=neq.archived&order=created_at.asc`);
    const ids = new Set(branches.map((b) => b.id));
    if (!ids.has(demoBranchAlmaty)) {
      const fallback = branches[0]?.id || null;
      for (const s of demoUsers) if (s.dbBranchId) s.dbBranchId = fallback;
    }
    demoBranchChecked = true;
  } catch { /* повторим на следующем запросе */ }
}

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Считаем ключ "ненастроенным", если он пустой или остался плейсхолдером из .env.example.
// Иначе непустая заглушка (напр. "PASTE...") включала бы Supabase, и запись падала бы
// с 401 — а без обработки ошибок это подвешивало бы запрос (кнопка «Сохранение...»).
const isPlaceholder = (value?: string) => {
  if (!value) return true;
  const v = value.trim();
  if (v.length < 20) return true; // реальный service_role JWT длинный
  return /^(paste|your|changeme|placeholder|<|xxx)/i.test(v);
};
const supabaseEnabled = Boolean(supabaseUrl && supabaseKey && !isPlaceholder(supabaseKey));

function getSession(req: express.Request): MvpSession {
  // Сессия ученика: вход по токену из ссылки/QR (x-student-token).
  // Разрешается только по уже известному токену (наполняется при выдаче доступа
  // персоналом и при /student-auth), поэтому getSession остаётся синхронным.
  const studentToken = String(req.headers["x-student-token"] || "");
  if (studentToken) {
    const rec = studentAccessTokens.get(studentToken);
    if (rec) {
      return {
        userId: `student-${rec.studentId}`,
        organizationId: orgId,
        role: "student",
        branchId: rec.branchId,
        dbBranchId: rec.branchId,
        fullName: "Ученик",
        studentId: rec.studentId,
        accessLevel: rec.level,
      };
    }
  }
  const roleHeader = String(req.headers["x-demo-role"] || "owner");
  const userHeader = String(req.headers["x-demo-user-id"] || "");
  const byUser = demoUsers.find((user) => user.userId === userHeader);
  if (byUser) return byUser;
  return demoUsers.find((user) => user.role === roleHeader) || demoUsers[0];
}

function canSeeBranch(session: MvpSession, branchId?: string | null) {
  if (session.role === "owner" || !branchId) return true;
  // Accept either the mock branch key or the real Supabase branch UUID,
  // so branch-scoped roles work in both mock and Supabase modes.
  return branchId === session.branchId || branchId === session.dbBranchId;
}

async function supabaseFetch<T>(table: string, query = "select=*", init: RequestInit = {}): Promise<T> {
  if (!supabaseEnabled) {
    throw new Error("Supabase is not configured");
  }

  const separator = query ? (query.includes("?") ? "&" : "?") : "";
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${separator}${query}`, {
    ...init,
    headers: {
      apikey: supabaseKey!,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  // Запросы с Prefer: return=minimal (а также 204 No Content) возвращают пустое тело —
  // response.json() на нём падает с "Unexpected end of JSON input". Возвращаем undefined.
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// Статья дохода «Абонементы» для авто-привязки поступлений от продаж.
// Кэшируем id по организации, чтобы не искать на каждой продаже.
const incomeCatCache: Record<string, string> = {};
async function ensureIncomeCategoryId(orgId: string): Promise<string | null> {
  if (!supabaseEnabled) return null;
  if (incomeCatCache[orgId]) return incomeCatCache[orgId];
  try {
    const found = await supabaseFetch<any[]>("finance_categories", `select=id&organization_id=eq.${orgId}&kind=eq.income&name=eq.${encodeURIComponent("Абонементы")}&limit=1`);
    if (found[0]?.id) { incomeCatCache[orgId] = found[0].id; return found[0].id; }
    const created = await supabaseFetch<any[]>("finance_categories", "", { method: "POST", body: JSON.stringify({ organization_id: orgId, name: "Абонементы", kind: "income", sort: 1 }) });
    if (created[0]?.id) { incomeCatCache[orgId] = created[0].id; return created[0].id; }
  } catch { /* не блокируем продажу из-за статьи */ }
  return null;
}

// Дата в часовом поясе студии (Казахстан). Чистые даты (YYYY-MM-DD) не трогаем;
// таймстампы (paid_at и т.п.) приходят из PostgREST в UTC — без сдвига ночная
// оплата (00:00–05:00 по Астане) уезжала бы на «вчера».
const KZ_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" });
const toDate = (value?: string | null) => {
  if (!value) return KZ_DATE.format(new Date());
  if (!value.includes("T")) return value.slice(0, 10); // уже дата без времени
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : KZ_DATE.format(d);
};

// Журналирование смены статуса ученика (forward-collector для воронки лидов).
// Тихо игнорирует ошибки: сбор аналитики не должен ломать основной CRUD.
async function logStatusEvent(session: MvpSession, studentId: string, toStatus: string | null | undefined, fromStatus: string | null | undefined, branchId?: string | null) {
  if (!supabaseEnabled || !toStatus || toStatus === fromStatus) return;
  try {
    await supabaseFetch("student_status_events", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: branchId || null,
        student_id: studentId,
        from_status: fromStatus || null,
        to_status: toStatus,
        source: "api",
        created_by: session.fullName || session.role
      })
    });
  } catch { /* no-op */ }
}

function fallbackPayload(session: MvpSession) {
  const branchFiltered = session.role === "owner"
    ? initialBranches
    : initialBranches.filter((branch) => branch.id === session.branchId);
  const branchIds = new Set(branchFiltered.map((branch) => branch.id));
  
  const groups = initialGroups.filter((group) => {
    if (session.role === "owner") return true;
    if (session.role === "teacher") return group.teacherId === session.userId;
    return branchIds.has(group.branchId);
  });
  const groupIds = new Set(groups.map((group) => group.id));
  
  const students = initialStudents.filter((student) => {
    const branchOk = session.role === "owner" || branchIds.has(student.branchId);
    const teacherOk = session.role !== "teacher" || student.teacherId === session.userId || student.groupIds.some(id => groupIds.has(id));
    return branchOk && teacherOk;
  });
  const studentIds = new Set(students.map((student) => student.id));
  const payments = initialPayments.filter((payment) => studentIds.has(payment.studentId));

  return {
    mode: "mock",
    session,
    organizations: initialOrganizations,
    branches: branchFiltered,
    halls: initialHalls.filter((hall) => session.role === "owner" || branchIds.has(hall.branchId)),
    teachers: initialTeachers,
    tasks: [],
    subscriptionPlans: [],
    leadSources: [],
    groups,
    students,
    waitlist: [],
    announcements: initialAnnouncements,
    payments,
    financeTransactions: initialFinanceTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branchFiltered, groups, students, payments, initialTeachers)
  };
}

function mapDbTask(row: any, studentNameById?: Map<string, string>) {
  return {
    id: row.id,
    branchId: row.branch_id || null,
    studentId: row.student_id || null,
    studentName: row.student_id ? (studentNameById?.get(row.student_id) || null) : null,
    assignedTo: row.assigned_to || null,
    title: row.title,
    description: row.description || null,
    status: row.status || "new",
    priority: row.priority || "normal",
    dueAt: row.due_at ? toDate(row.due_at) : null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at || null
  };
}

function mapDbPlan(row: any) {
  return {
    id: row.id,
    name: row.name,
    lessonsCount: row.lessons_count ?? 0,
    durationDays: row.duration_days ?? 0,
    price: Number(row.price || 0),
    status: row.status || "active",
    // 'month' — все занятия календарного месяца без доплаты; 'lessons' — строго по числу занятий.
    billingMode: row.billing_mode === "lessons" ? "lessons" : "month",
    // 'group' — групповой тариф, 'individual' — индивидуальный (фильтр при продаже).
    format: row.format === "individual" ? "individual" : "group",
    // Филиал, где действует тариф (null = во всех) — у филиалов разные цены.
    branchId: row.branch_id || null
  };
}

function mapDbLeadSource(row: any) {
  return { id: row.id, name: row.name, status: row.status || "active" };
}

// Источник рекламы: id из справочника, либо НАЙТИ/СОЗДАТЬ по имени (sourceName).
// Раньше выбор из дефолтного списка (пустой справочник) молча терялся — «не указан».
async function resolveSourceId(session: MvpSession, payload: any): Promise<string | null> {
  if (payload.sourceId) return payload.sourceId;
  const name = String(payload.sourceName || "").trim();
  if (!name) return null;
  // В lead_sources НЕТ organization_id (общий справочник) — не добавлять его в запросы.
  const found = await supabaseFetch<any[]>(
    "lead_sources",
    `select=id&name=ilike.${encodeURIComponent(name)}&limit=1`
  ).catch(() => [] as any[]);
  if (found[0]) return found[0].id;
  const ins = await supabaseFetch<any[]>("lead_sources", "", {
    method: "POST",
    body: JSON.stringify({ name, status: "active" }),
  }).catch(() => [] as any[]);
  return ins[0]?.id || null;
}

function mapDbWaitlist(row: any) {
  return {
    id: row.id,
    studentId: row.student_id,
    branchId: row.branch_id || null,
    groupId: row.group_id || null,
    comment: row.comment || null,
    addedAt: row.added_at,
    removedAt: row.removed_at || null,
    removedReason: row.removed_reason || null
  };
}

function mapDbUserToTeacher(user: any) {
  return {
    id: user.id,
    organizationId: user.organization_id,
    name: user.full_name,
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&q=80",
    specialties: user.specialization ? [user.specialization] : ["Кавказский танец"],
    phone: user.phone || "",
    bio: "Преподаватель школы Эхо Гор.",
    experienceYears: 5,
    branchId: user.branch_id || null,
    role: user.role || "teacher"
  };
}

// Автостатус ученика (ТЗ §5–6): вычисляется из реальных данных. Приоритет:
// архив → корзина → ручной статус → активный абонемент → «абонемент закончился» →
// пробный → без статуса. (Долг/пробный-детали расширяются отдельно.)
function deriveStudentStatus(row: any, subs: any[]): string {
  if (row.archived_at) return "archived";
  if (row.deletion_requested_at) return "trash";
  const manual = String(row.manual_status || "").trim();
  if (manual) return manual; // ручной статус приоритетнее авто
  const today = new Date().toISOString().slice(0, 10);
  const active = (subs || []).filter((x) => x.status === "active" && (!x.ends_on || String(x.ends_on).slice(0, 10) >= today));
  if (active.length) return "active";
  const everHadSub = (subs || []).some((x) => x.status !== "archived");
  if (everHadSub) return "expired"; // абонемент закончился
  if (row.status === "trial") return "trial";
  return "no_status";
}

// Авто-перенос «отказа» в архив (ТЗ): ученик ушёл на этапе воронки пробных
// (не пришёл / пришёл, но не купил) и последний пробный был ≥ AUTO_DECLINE_DAYS
// дней назад. Консервативно: только статус trial/lead, без единого абонемента,
// с реальной отметкой пробного и без конверсии. Идемпотентно (проверяем archived_at).
const AUTO_DECLINE_DAYS = 14;
function isAutoDeclinedArchive(row: any, subs: any[], attendance: Record<string, any>): boolean {
  if (row.archived_at || row.deletion_requested_at) return false;
  if ((subs || []).length > 0) return false; // купил хоть раз — это «ушедший», не «отказ»
  const st = String(row.status || "");
  if (st !== "trial" && st !== "lead") return false;
  const trialDates: string[] = [];
  for (const [date, rec] of Object.entries(attendance || {})) {
    const r: any = rec;
    if (r?.isTrial || r?.status === "trial") {
      if (r?.trialOutcome === "converted") return false; // купил после пробного — не отказ
      trialDates.push(String(date).slice(0, 10));
    }
  }
  if (trialDates.length === 0) return false; // не было пробного — не трогаем
  const last = trialDates.sort()[trialDates.length - 1];
  const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
  return days >= AUTO_DECLINE_DAYS;
}

function mapDbStudent(row: any, attendanceByStudent: Map<string, Record<string, Attendance>>, subsByStudent: Map<string, any[]>): Student {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "Ученик";
  return {
    id: row.id,
    organizationId: row.organization_id,
    name,
    age: row.birthday ? Math.max(4, new Date().getFullYear() - new Date(row.birthday).getFullYear()) : 12,
    photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&q=80",
    branchId: row.branch_id,
    // Ученик может заниматься в НЕСКОЛЬКИХ группах (ТЗ 2026-07-12): основная
    // группа + группы действующих абонементов. Первая — основная (studentGroupId).
    groupIds: (() => {
      const today = new Date().toISOString().slice(0, 10);
      const ids: string[] = row.group_id ? [row.group_id] : [];
      for (const sub of subsByStudent.get(row.id) || []) {
        if (sub.status === "active" && sub.group_id && (!sub.ends_on || sub.ends_on >= today) && !ids.includes(sub.group_id)) {
          ids.push(sub.group_id);
        }
      }
      return ids;
    })(),
    teacherId: row.teacher_id || "",
    createdAt: row.created_at || undefined,
    status: row.status || undefined,
    manualStatus: row.manual_status || null,
    skillLevel: row.skill_level || null,
    computedStatus: deriveStudentStatus(row, subsByStudent.get(row.id) || []),
    returned: Boolean(row.returned_at),
    payLater: Boolean(row.pay_later),
    payPromiseDate: row.pay_promise_date || null,
    archivedAt: row.archived_at || null,
    archiveReason: row.archive_reason || null,
    archiveComment: row.archive_comment || null,
    archivedBy: row.archived_by || null,
    gender: row.gender || null,
    birthday: row.birthday || null,
    phone: row.phone || "",
    sourceId: row.source_id || null,
    comment: row.comment || "",
    waitlistAddedAt: row.__waitlist_added_at || null,
    parentName: row.parent_name || "Родитель",
    parentPhone: row.parent_phone || "",
    balance: computeStudentBalance(subsByStudent.get(row.id) || [], row.status),
    artistLevel: ArtistLevel.FIRST_STEP,
    artistLevelPoints: 0,
    achievements: [],
    performances: [],
    notes: [],
    attendance: attendanceByStudent.get(row.id) || {},
    subscriptions: (subsByStudent.get(row.id) || []).map((sub) => ({
      id: sub.id,
      studentId: sub.student_id,
      name: sub.plan_name || "Абонемент",
      price: Number(sub.price || 0),
      lessonsTotal: sub.lessons_total || 0,
      lessonsLeft: sub.lessons_left || 0,
      validUntil: sub.ends_on,
      isAutoRenew: false,
      status: sub.status === "active" ? "active" : sub.status === "archived" ? "deleted" : "expired",
      startsOn: sub.starts_on,
      soldOn: sub.sold_on || sub.created_at || null,
      amountPaid: sub.amount_paid != null ? Number(sub.amount_paid) : null,
      discountAmount: Number(sub.discount_amount || 0),
      groupId: sub.group_id || null,
      kind: sub.kind || "group",
      cancelReason: sub.cancel_reason || null,
      cancelComment: sub.cancel_comment || null,
      deletedBy: sub.deleted_by || null,
      deletedAt: sub.deleted_at || null
    }))
  };
}

function mapDbPayment(row: any): Payment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    studentId: row.student_id,
    amount: Number(row.amount || 0),
    date: toDate(row.paid_at),
    type: "subscription",
    description: row.comment || "Оплата",
    method: row.method || "cash",
    status: row.status === "paid" ? "paid" : "pending"
  };
}

function mapDbSubscription(row: any, planName?: string) {
  return {
    id: row.id,
    studentId: row.student_id,
    name: planName || row.plan_name || "Абонемент",
    price: Number(row.price || 0),
    lessonsTotal: row.lessons_total || 0,
    lessonsLeft: row.lessons_left || 0,
    validUntil: row.ends_on,
    isAutoRenew: false,
    status: row.status === "active" ? "active" : row.status === "archived" ? "deleted" : "expired",
    startsOn: row.starts_on,
    soldOn: row.sold_on || row.created_at || null,
    amountPaid: row.amount_paid != null ? Number(row.amount_paid) : null,
    discountAmount: Number(row.discount_amount || 0),
    groupId: row.group_id || null,
    kind: row.kind || "group",
    cancelReason: row.cancel_reason || null,
    cancelComment: row.cancel_comment || null,
    deletedBy: row.deleted_by || null,
    deletedAt: row.deleted_at || null
  };
}

async function dbBootstrap(session: MvpSession) {
  const orgFilter = `organization_id=eq.${session.organizationId}`;
  
  const [branches, halls, users, groups, studentsRaw, paymentsRaw, lessons, attendanceRaw, subscriptionsRaw, plans, financeTransactions, tasksRaw, leadSourcesRaw, waitlistRaw] = await Promise.all([
    supabaseFetch<any[]>("branches", `select=*&${orgFilter}&status=neq.archived`),
    supabaseFetch<any[]>("halls", `select=*`), // Halls are filtered by branch in mapping
    supabaseFetch<any[]>("users", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("groups", `select=*&${orgFilter}&status=neq.archived`),
    supabaseFetch<any[]>("students", `select=*&${orgFilter}&status=neq.archived&deletion_requested_at=is.null&archived_at=is.null`),
    supabaseFetch<any[]>("payments", `select=*&${orgFilter}&order=paid_at.desc`),
    supabaseFetch<any[]>("schedule_lessons", `select=*&order=starts_at.desc`), // Cross-org lessons are unlikely but we keep mapping safe
    supabaseFetch<any[]>("attendance", "select=*"),
    supabaseFetch<any[]>("student_subscriptions", `select=*&status=neq.archived`),
    supabaseFetch<any[]>("subscription_plans", `select=*&${orgFilter}&status=eq.active`),
    supabaseFetch<any[]>("finance_transactions", `select=*&${orgFilter}&order=created_at.desc`),
    // tasks/lead_sources не имеют organization_id — фильтруем по филиалу в коде
    supabaseFetch<any[]>("tasks", `select=*&order=created_at.desc`).catch(() => [] as any[]),
    supabaseFetch<any[]>("lead_sources", `select=*&order=name.asc`).catch(() => [] as any[]),
    // активный лист ожидания (миграция 021); .catch — если миграция ещё не применена
    supabaseFetch<any[]>("student_waitlist", `select=*&${orgFilter}&removed_at=is.null&order=added_at.asc`).catch(() => [] as any[])
  ]);

  // Дата постановки в активный лист ожидания — по ученику.
  const waitlistAddedByStudent = new Map<string, string>();
  waitlistRaw.forEach((w) => { if (!waitlistAddedByStudent.has(w.student_id)) waitlistAddedByStudent.set(w.student_id, w.added_at); });

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const attendanceByStudent = new Map<string, Record<string, Attendance>>();
  const subsByStudent = new Map<string, any[]>();

  attendanceRaw.forEach((row) => {
    const lesson = lessonById.get(row.lesson_id);
    if (!lesson) return;
    const date = toDate(lesson.starts_at);
    const current = attendanceByStudent.get(row.student_id) || {};
    current[date] = {
      date,
      status: row.status === "unknown" ? "unmarked" : row.status,
      markedBy: row.marked_by || undefined,
      note: row.comment || undefined,
      absenceReason: row.absence_reason || null,
      isTrial: Boolean(row.is_trial) || undefined,
      trialOutcome: row.trial_outcome || null
    };
    attendanceByStudent.set(row.student_id, current);
  });

  subscriptionsRaw.forEach((sub) => {
    const plan = planById.get(sub.plan_id);
    const list = subsByStudent.get(sub.student_id) || [];
    list.push({ ...sub, plan_name: plan?.name });
    subsByStudent.set(sub.student_id, list);
  });

  const teacherUsers = users.filter((user) => user.role === "teacher" && user.status !== "archived");
  const teachers = teacherUsers.map(mapDbUserToTeacher);
  const groupsMapped = groups.map((group) => ({
    id: group.id,
    organizationId: group.organization_id,
    branchId: group.branch_id,
    name: group.name,
    teacherId: group.teacher_id || "",
    hallId: group.hall_id || "",
    // Расписание группы из БД (раньше здесь было жёстко days:[], time:"" — из-за
    // этого расписание не отображалось нигде: сетка, календарь, пробный, журнал).
    scheduleText: [group.schedule_days, group.schedule_time].filter(Boolean).join(" ") || "По расписанию",
    days: group.schedule_days ? String(group.schedule_days).split(",").map((d: string) => d.trim()) : [],
    time: group.schedule_time || "",
    status: group.status || "active",
    startDate: group.start_date || null,
    endDate: group.end_date || null,
    // ЛОВУШКА двойного маппинга: mapDbGroup format отдаёт, а bootstrap — забывал.
    // Из-за этого формат «терялся» после перезагрузки (всегда «групповой»).
    format: group.format === "individual" ? "individual" : "group",
    ageGroup: group.age_from && group.age_to ? `${group.age_from}-${group.age_to} лет` : "Все возрасты",
    ageFrom: group.age_from ?? null,
    ageTo: group.age_to ?? null,
    capacity: group.capacity ?? 0,
    level: group.level || "MVP",
    // Набор открыт/закрыт (миграция 044) — для рекомендаций по набору.
    enrollmentOpen: group.enrollment_open !== false,
    studentCount: studentsRaw.filter((student) => student.group_id === group.id).length
  }));

  // Role-based scoping (mirrors fallbackPayload): owner sees everything;
  // branch_manager/admin see only their branch; teacher sees only their own students/groups.
  const isOwner = session.role === "owner";
  const branchAllowed = (branchId?: string | null) => isOwner || branchId === session.dbBranchId;

  const students = studentsRaw
    .filter((student) => {
      if (isOwner) return true;
      if (session.role === "teacher") {
        const group = groupById.get(student.group_id);
        return group?.teacher_id === session.userId;
      }
      return student.branch_id === session.dbBranchId;
    })
    .map((student) => {
      const group = groupById.get(student.group_id);
      return mapDbStudent({ ...student, teacher_id: student.teacher_id || group?.teacher_id, __waitlist_added_at: waitlistAddedByStudent.get(student.id) || null }, attendanceByStudent, subsByStudent);
    });

  // Кэш автостатуса (§5–6): пишем computed_status обратно только для изменившихся
  // учеников. Fire-and-forget — на ответ не влияет (в students уже есть computedStatus).
  for (const s of studentsRaw) {
    const next = deriveStudentStatus(s, subsByStudent.get(s.id) || []);
    if (next !== (s.computed_status || null)) {
      supabaseFetch("students", `id=eq.${s.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ computed_status: next }) }).catch(() => { /* кэш, не критично */ });
    }
  }

  // Авто-перенос отказов в архив (ТЗ): фоново, идемпотентно. Дата ухода отказа =
  // сегодня (день авто-переноса). Причина фиксируется — её видит ИИ-реактивация.
  const autoArchiveNow = new Date().toISOString();
  for (const s of studentsRaw) {
    if (isAutoDeclinedArchive(s, subsByStudent.get(s.id) || [], attendanceByStudent.get(s.id) || {})) {
      supabaseFetch("students", `id=eq.${s.id}&organization_id=eq.${session.organizationId}&archived_at=is.null`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          archived_at: autoArchiveNow,
          left_on: autoArchiveNow.slice(0, 10),
          archive_reason: "Отказ (не купил после пробного)",
          archive_comment: `Автоматически перенесён в архив через ${AUTO_DECLINE_DAYS} дней после пробного без покупки.`,
          archived_by: "Система",
        })
      }).catch(() => { /* авто-архив, не критично */ });
    }
  }

  const visibleStudentIds = new Set(students.map((student) => student.id));
  const waitlist = waitlistRaw
    .filter((w) => visibleStudentIds.has(w.student_id))
    .map(mapDbWaitlist);
  // Платежи фильтруем по ФИЛИАЛУ (роль), а не по списку активных учеников:
  // иначе оплаты архивных/ушедших исчезали из реестра, и он расходился с ДДС.
  const payments = paymentsRaw.filter((payment) => !payment.branch_id || branchAllowed(payment.branch_id)).map(mapDbPayment);

  const branchesVisible = branches
    .filter((branch) => branchAllowed(branch.id))
    .map((branch) => ({
      id: branch.id,
      organizationId: branch.organization_id,
      name: branch.name,
      city: branch.city,
      address: branch.address,
      managerName: branch.manager_name || users.find((user) => user.id === branch.manager_id)?.full_name || "Руководитель",
      phone: branch.phone || "",
      comment: branch.comment || "",
      status: branch.status || "active",
      hallsCount: halls.filter((hall) => hall.branch_id === branch.id).length
    }));

  const hallsVisible = halls
    .filter((hall) => branchAllowed(hall.branch_id))
    .map((hall) => ({ id: hall.id, branchId: hall.branch_id, name: hall.name, capacity: hall.capacity || 0, description: hall.description || "", status: hall.status || "active" }));

  const groupsVisible = groupsMapped.filter((group) => {
    if (isOwner) return true;
    if (session.role === "teacher") return group.teacherId === session.userId;
    return group.branchId === session.dbBranchId;
  });

  const studentNameById = new Map(
    studentsRaw.map((s) => [s.id, [s.first_name, s.last_name].filter(Boolean).join(" ") || s.full_name || "Ученик"])
  );
  const tasks = tasksRaw
    .filter((task) => isOwner || !task.branch_id || task.branch_id === session.dbBranchId)
    .map((task) => mapDbTask(task, studentNameById));
  const subscriptionPlans = plans.map(mapDbPlan);
  const leadSources = leadSourcesRaw.map(mapDbLeadSource);

  return {
    mode: "supabase",
    session,
    organizations: initialOrganizations,
    branches: branchesVisible,
    halls: hallsVisible,
    teachers,
    tasks,
    subscriptionPlans,
    leadSources,
    groups: groupsVisible,
    students,
    waitlist,
    announcements: initialAnnouncements,
    payments,
    financeTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branchesVisible as any, groupsVisible as any, students as any, payments as any, teachers as any)
  };
}

// Идемпотентный upsert посещаемости. Если миграция 016 ещё не применена и новые
// колонки (absence_reason / is_trial / trial_outcome) отсутствуют, повторяем без них,
// чтобы базовая отметка не падала из-за дрейфа схемы.
async function upsertAttendanceRows(rows: Record<string, any>[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const opts = (body: any) => ({
    method: "POST" as const,
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body),
  });
  try {
    return await supabaseFetch<any[]>("attendance", "on_conflict=lesson_id,student_id", opts(rows));
  } catch (error: any) {
    const base = rows.map(({ absence_reason, is_trial, trial_outcome, ...rest }) => rest);
    return await supabaseFetch<any[]>("attendance", "on_conflict=lesson_id,student_id", opts(base));
  }
}

// Баланс ученика в тенге (отрицательный = долг). Считаем недоплату по активным
// абонементам: price − amount_paid. amount_paid = null → данных нет (легаси), по
// такому абонементу долг не считаем. Если данных о внесении нет вовсе — откат к
// старому флагу status='debt' (−1), чтобы не терять ранее помеченные долги.
function computeStudentBalance(subs: any[], rawStatus: string): number {
  let debt = 0;
  let hasData = false;
  for (const s of subs || []) {
    if (s.status !== "active") continue;
    if (s.amount_paid == null) continue;
    hasData = true;
    const shortfall = (Number(s.price) || 0) - Number(s.amount_paid);
    if (shortfall > 0) debt += shortfall;
  }
  if (hasData) return debt > 0 ? -debt : 0;
  return rawStatus === "debt" ? -1 : 0;
}

// Активный абонемент: статус active и (остались занятия ИЛИ срок не истёк).
function hasActiveSubscription(subs: any[], todayStr: string): boolean {
  return subs.some((s) =>
    s.status === "active" && ((Number(s.lessons_left) || 0) > 0 || (s.ends_on && String(s.ends_on) >= todayStr)),
  );
}

function emptyJournalDashboard(from: string, to: string) {
  return {
    rangeFrom: from,
    rangeTo: to,
    visited: { count: 0, studentIds: [] as string[] },
    unpaid: { count: 0, studentIds: [] as string[] },
    trialNotBought: { count: 0, studentIds: [] as string[] },
    trialBought: { count: 0, studentIds: [] as string[] },
    openJournals: [] as any[],
  };
}

function mapDbRecalc(row: any, studentName?: string) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || null,
    studentId: row.student_id,
    studentName: studentName || row.student_name || undefined,
    subscriptionId: row.subscription_id || null,
    periodFrom: row.period_from || null,
    periodTo: row.period_to || null,
    lessonsCount: Number(row.lessons_count || 0),
    reason: row.reason || null,
    amount: Number(row.amount || 0),
    comment: row.comment || null,
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    status: row.status || "pending",
    createdByName: row.created_by_name || null,
    createdAt: row.created_at || null,
    appliedAt: row.applied_at || null,
  };
}

export function registerMvpApi(app: express.Express) {
  // Демо-филиал сессий должен указывать на реальный филиал (см. ensureDemoBranchBinding).
  app.use("/api/mvp", (_req, _res, next) => { ensureDemoBranchBinding().finally(next); });

  // ── Безопасность: запрос обязан объявить, кто он. ──────────────────────────
  // Раньше запрос БЕЗ каких-либо заголовков идентификации по умолчанию получал
  // роль owner (см. getSession) — аноним становился владельцем сети.
  // Теперь: нет x-demo-role и нет x-student-token → 401. Публичные исключения —
  // только эндпоинты входа (список демо-пользователей, демо-логин, вход ученика).
  // Это НЕ настоящая аутентификация (заголовку по-прежнему верим — блокер №1
  // аудита закрывается полноценным auth), но убирает самый грубый провал:
  // «пустой» запрос больше не владелец.
  const PUBLIC_MVP_PATHS = new Set([
    "/session/demo-users",
    "/session/demo-login",
    "/student-auth",
  ]);
  app.use("/api/mvp", (req, res, next) => {
    if (PUBLIC_MVP_PATHS.has(req.path)) return next();
    const hasRole = Boolean(req.headers["x-demo-role"]);
    const hasStudentToken = Boolean(req.headers["x-student-token"]);
    if (!hasRole && !hasStudentToken) {
      return res.status(401).json({ error: "Не авторизовано: укажите роль или войдите как ученик" });
    }
    return next();
  });

  // ── Аудит-лог: фиксируем каждую мутацию (все не-GET запросы). ───────────────
  // Пишем после ответа (res.on("finish")), чтобы не замедлять обработку.
  // В Supabase-режиме — в таблицу audit_logs (см. миграцию 001); в mock-режиме —
  // в консоль сервера. actor_id/branch_id намеренно null: демо-идентификаторы
  // могут отсутствовать в users/branches и уронят FK; сведения о пользователе
  // кладём в after_data. При появлении настоящей auth сюда встанет реальный actor_id.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app.use("/api/mvp", (req, res, next) => {
    if (req.method === "GET") return next();
    res.on("finish", () => {
      try {
        const session = getSession(req);
        const parts = req.path.split("/").filter(Boolean); // напр. ["students","<id>"]
        const entityType = parts[0] || "unknown";
        const maybeId = parts.find((p) => UUID_RE.test(p)) || null;
        const record = {
          actor_id: null as string | null,
          branch_id: null as string | null,
          entity_type: entityType,
          entity_id: maybeId,
          action: req.method,
          after_data: {
            path: req.originalUrl,
            status: res.statusCode,
            role: session.role,
            user: session.fullName || null,
            body: req.body && Object.keys(req.body).length ? JSON.stringify(req.body).slice(0, 1000) : null,
          },
          ip_address: req.ip || null,
          user_agent: String(req.headers["user-agent"] || "").slice(0, 300) || null,
        };
        if (supabaseEnabled) {
          supabaseFetch("audit_logs", "", { method: "POST", body: JSON.stringify(record) })
            .catch((e: any) => console.warn("[audit] не записан:", e?.message || e));
        } else {
          console.log(`[audit] ${record.action} ${record.after_data.path} · ${record.after_data.role} · HTTP ${record.after_data.status}`);
        }
      } catch (e: any) {
        console.warn("[audit] ошибка формирования записи:", e?.message || e);
      }
    });
    return next();
  });

  // Оборачивает async-обработчик: при отклонённом промисе всегда отправляет JSON-ответ,
  // а не оставляет запрос висеть. Express 4 не ловит rejection из async-хендлеров
  // автоматически — без этого ошибка Supabase подвешивала бы фронт (кнопка «Сохранение...»).
  const ah = (fn: (req: express.Request, res: express.Response) => Promise<unknown>) =>
    (req: express.Request, res: express.Response) => {
      Promise.resolve(fn(req, res)).catch((error: any) => {
        console.error("[mvpApi] Ошибка обработчика:", error?.message || error);
        if (!res.headersSent) {
          res.status(500).json({ error: error?.message || "Внутренняя ошибка сервера" });
        }
      });
    };

  app.get("/api/mvp/session/demo-users", (_req, res) => {
    res.json({ users: demoUsers });
  });

  app.post("/api/mvp/session/demo-login", (req, res) => {
    const requested = req.body?.userId || req.body?.role;
    const session = demoUsers.find((user) => user.userId === requested || user.role === requested) || demoUsers[0];
    res.json({ session });
  });

  app.get("/api/mvp/bootstrap", async (req, res) => {
    const session = getSession(req);
    try {
      const payload = supabaseEnabled ? await dbBootstrap(session) : fallbackPayload(session);
      res.json(payload);
    } catch (error: any) {
      res.status(503).json({ ...fallbackPayload(session), error: error.message });
    }
  });

  app.get("/api/mvp/kpi", async (req, res) => {
    const session = getSession(req);
    try {
      const payload = supabaseEnabled ? await dbBootstrap(session) : fallbackPayload(session);
      res.json({ mode: payload.mode, metrics: payload.metrics });
    } catch (error: any) {
      const payload = fallbackPayload(session);
      res.status(503).json({ mode: payload.mode, metrics: payload.metrics, error: error.message });
    }
  });

  // --- Главный дашборд владельца: доп. данные из forward-collector таблиц ---
  // Снапшоты (YoY) + дневная воронка из журнала статус-событий. Пустые таблицы
  // отдают пустые структуры — фронт деградирует в «нет данных / накапливается».
  app.get("/api/mvp/owner/extras", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Только владелец" });
    if (!supabaseEnabled) return res.json({ snapshots: [], funnelToday: null, funnelYesterday: null });
    try {
      const orgFilter = `organization_id=eq.${session.organizationId}`;
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const dayStart = (d: string) => `${d}T00:00:00`;
      const dayEnd = (d: string) => `${d}T23:59:59`;
      const [snapsRaw, evToday, evYest, invoicesRaw, futureSubs, studentsLite] = await Promise.all([
        supabaseFetch<any[]>("metrics_snapshots", `select=*&${orgFilter}&order=period_month.asc`),
        supabaseFetch<any[]>("student_status_events", `select=to_status,source&${orgFilter}&occurred_at=gte.${dayStart(today)}&occurred_at=lte.${dayEnd(today)}`),
        supabaseFetch<any[]>("student_status_events", `select=to_status,source&${orgFilter}&occurred_at=gte.${dayStart(yesterday)}&occurred_at=lte.${dayEnd(yesterday)}`),
        supabaseFetch<any[]>("invoices", `select=due_on,status&${orgFilter}&due_on=lt.${today}&status=in.(sent,overdue)`),
        supabaseFetch<any[]>("student_subscriptions", `select=student_id,branch_id,starts_on&starts_on=gt.${today}`),
        supabaseFetch<any[]>("students", `select=id,branch_id,birthday&${orgFilter}&status=neq.archived&archived_at=is.null`)
      ]);
      const snapshots = snapsRaw.map((s) => ({
        periodMonth: toDate(s.period_month), branchId: s.branch_id,
        revenue: Number(s.revenue || 0), activeSubscriptions: s.active_subscriptions || 0,
        activeStudents: s.active_students || 0,
        avgCheck: Number(s.avg_check || 0), retentionRate: Number(s.retention_rate || 0),
        attendanceRate: Number(s.attendance_rate || 0), newStudents: s.new_students || 0
      }));
      const funnel = (rows: any[]) => ({
        leads: rows.filter((r) => r.to_status === "lead").length,
        trialBooked: rows.filter((r) => r.to_status === "trial").length,
        trialCame: rows.filter((r) => r.to_status === "trial").length,
        // «Купили» = только события ПРОДАЖИ (source='sale' пишет createSubscriptionSale).
        // Ручная смена статуса на active продажей не считается.
        bought: rows.filter((r) => r.source === "sale").length
      });

      // Должники по срокам просрочки — из реальных счетов (если они есть).
      const ageDays = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
      let debtorAging: { d1_7: number; d8_14: number; d14plus: number } | null = null;
      if (invoicesRaw.length) {
        debtorAging = { d1_7: 0, d8_14: 0, d14plus: 0 };
        invoicesRaw.forEach((inv) => {
          if (!inv.due_on) return;
          const a = ageDays(inv.due_on);
          if (a >= 1 && a <= 7) debtorAging!.d1_7 += 1;
          else if (a >= 8 && a <= 14) debtorAging!.d8_14 += 1;
          else if (a > 14) debtorAging!.d14plus += 1;
        });
      }

      // Записи на будущий период — абонементы с датой старта позже сегодня.
      let futureEnrollments: { total: number; byBranch: Record<string, number>; byAge: Record<string, number> } | null = null;
      if (futureSubs.length) {
        const stById = new Map(studentsLite.map((s) => [s.id, s]));
        const ageOf = (bd?: string | null) => (bd ? Math.max(0, new Date().getFullYear() - new Date(bd).getFullYear()) : null);
        const bucket = (a: number | null) => (a === null ? "—" : a <= 6 ? "до 6" : a <= 9 ? "7–9" : a <= 12 ? "10–12" : a <= 15 ? "13–15" : "16+");
        const byBranch: Record<string, number> = {};
        const byAge: Record<string, number> = {};
        futureSubs.forEach((sub) => {
          const st = stById.get(sub.student_id);
          const br = sub.branch_id || st?.branch_id;
          if (br) byBranch[br] = (byBranch[br] || 0) + 1;
          const b = bucket(ageOf(st?.birthday));
          byAge[b] = (byAge[b] || 0) + 1;
        });
        futureEnrollments = { total: futureSubs.length, byBranch, byAge };
      }

      res.json({ snapshots, funnelToday: funnel(evToday), funnelYesterday: funnel(evYest), debtorAging, futureEnrollments });
    } catch (error: any) {
      res.status(503).json({ snapshots: [], funnelToday: null, funnelYesterday: null, error: error.message });
    }
  });

  // Записать снапшот текущего месяца (сеть + по филиалам). Накапливает историю для YoY.
  app.post("/api/mvp/owner/snapshot", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Только владелец" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const orgFilter = `organization_id=eq.${session.organizationId}`;
      const now = new Date();
      const monthPrefix = now.toISOString().slice(0, 7);
      const periodMonth = `${monthPrefix}-01`;
      const [branches, students, payments, subs] = await Promise.all([
        supabaseFetch<any[]>("branches", `select=id&${orgFilter}&status=neq.archived`),
        supabaseFetch<any[]>("students", `select=id,branch_id,status,computed_status,created_at&${orgFilter}&status=neq.archived&archived_at=is.null`),
        supabaseFetch<any[]>("payments", `select=amount,branch_id,paid_at,status&${orgFilter}`),
        supabaseFetch<any[]>("student_subscriptions", `select=branch_id,status`)
      ]);
      const paidThisMonth = payments.filter((p) => p.status === "paid" && String(p.paid_at || "").slice(0, 7) === monthPrefix);
      const build = (branchId: string | null) => {
        const bs = branchId ? students.filter((s) => s.branch_id === branchId) : students;
        const bp = branchId ? paidThisMonth.filter((p) => p.branch_id === branchId) : paidThisMonth;
        const bsub = branchId ? subs.filter((s) => s.branch_id === branchId) : subs;
        const revenue = bp.reduce((s, p) => s + Number(p.amount || 0), 0);
        const activeSubs = bsub.filter((s) => s.status === "active").length;
        // §5–6: активность считаем по кэшу автостатуса (точнее сырого status);
        // если кэш ещё не заполнен bootstrap'ом — откат на сырой status.
        const activeStud = bs.filter((s) => (s.computed_status || s.status) === "active").length;
        return {
          organization_id: session.organizationId, branch_id: branchId, period_month: periodMonth,
          revenue, active_students: activeStud, active_subscriptions: activeSubs,
          avg_check: bp.length ? Math.round(revenue / bp.length) : 0,
          retention_rate: bs.length ? Math.round((activeStud / bs.length) * 100) : 0,
          attendance_rate: 0,
          new_students: bs.filter((s) => String(s.created_at || "").slice(0, 7) === monthPrefix).length,
          payments_count: bp.length, computed_at: now.toISOString()
        };
      };
      const rows = [build(null), ...branches.map((b) => build(b.id))];
      // Идемпотентно: удаляем снапшоты текущего месяца, затем вставляем свежие.
      await supabaseFetch("metrics_snapshots", `organization_id=eq.${session.organizationId}&period_month=eq.${periodMonth}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      });
      await supabaseFetch("metrics_snapshots", "", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(rows)
      });
      res.json({ ok: true, written: rows.length, periodMonth });
    } catch (error: any) {
      // Снапшот — фоновая запись истории (форвард-коллектор). Не роняем клиента
      // 5xx, если что-то ещё не засеяно/не готово — просто помечаем как пропуск.
      res.json({ ok: false, skipped: true, error: error?.message });
    }
  });

  // Выполнение плана БДР по филиалам: план — из planning_budgets (вкладка
  // «Планирование (БДР)»), факт — реальные оплаты месяца из payments.
  // Если план на месяц не задан — plan/pct = null, UI подскажет заполнить БДР.
  app.get("/api/mvp/owner/bdr-progress", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Только владелец" });
    const period = String(req.query.period || new Date().toISOString().slice(0, 7)); // YYYY-MM
    if (!supabaseEnabled) return res.json({ period, network: null, byBranch: [] });
    try {
      const orgFilter = `organization_id=eq.${session.organizationId}`;
      const [budgets, payments, branches, expenses] = await Promise.all([
        supabaseFetch<any[]>("planning_budgets", `select=branch_id,planned_revenue,planned_expense&${orgFilter}&period_month=eq.${period}&status=eq.active`),
        supabaseFetch<any[]>("payments", `select=amount,branch_id,paid_at,status&${orgFilter}`),
        supabaseFetch<any[]>("branches", `select=id,name,city&${orgFilter}&status=neq.archived`),
        // Фактические расходы месяца из Бухгалтерии (для «факт. прибыли»).
        supabaseFetch<any[]>("finance_transactions", `select=amount,branch_id,operation_date,type,status&${orgFilter}&type=eq.expense&status=eq.actual`).catch(() => [] as any[]),
      ]);
      const paid = payments.filter((p) => p.status === "paid" && String(p.paid_at || "").slice(0, 7) === period);
      const exp = (expenses || []).filter((e) => String(e.operation_date || "").slice(0, 7) === period);
      const factOf = (branchId: string | null) =>
        (branchId ? paid.filter((p) => p.branch_id === branchId) : paid).reduce((s, p) => s + Number(p.amount || 0), 0);
      const factExpOf = (branchId: string | null) =>
        (branchId ? exp.filter((e) => e.branch_id === branchId) : exp).reduce((s, e) => s + Number(e.amount || 0), 0);
      const budgetRow = (branchId: string | null) => budgets.find((b) => (b.branch_id || null) === branchId);
      const planOf = (branchId: string | null) => {
        const row = budgetRow(branchId);
        return row ? Number(row.planned_revenue || 0) : null;
      };
      const planExpOf = (branchId: string | null) => {
        const row = budgetRow(branchId);
        return row ? Number(row.planned_expense || 0) : null;
      };
      // План сети: строка branch_id=null, иначе сумма планов филиалов.
      const branchPlans = branches.map((b) => planOf(b.id));
      const networkPlan = planOf(null) ?? (branchPlans.some((p) => p !== null)
        ? branchPlans.reduce((s: number, p) => s + (p || 0), 0)
        : null);
      const branchPlanExps = branches.map((b) => planExpOf(b.id));
      const networkPlanExp = planExpOf(null) ?? (branchPlanExps.some((p) => p !== null)
        ? branchPlanExps.reduce((s: number, p) => s + (p || 0), 0)
        : null);
      const pct = (fact: number, plan: number | null) =>
        plan && plan > 0 ? Math.round((fact / plan) * 100) : null;

      // Прогноз выручки к концу месяца по текущему темпу (только для текущего месяца).
      const almaty = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
      const isCur = period === almaty.slice(0, 7);
      const dayN = isCur ? Number(almaty.slice(8, 10)) : 0;
      const [py, pm] = period.split("-").map(Number);
      const daysInMonth = new Date(py, pm, 0).getDate();
      const forecastOf = (fact: number) => (isCur && dayN > 0 ? Math.round((fact / dayN) * daysInMonth) : fact);

      // Прибыль: план (planRev−planExp), ожидаемая (прогноз выручки−план расходов),
      // факт на сегодня (факт выручки−факт расходов).
      const profitBlock = (branchId: string | null) => {
        const planRev = planOf(branchId), planExp = planExpOf(branchId);
        const factRev = factOf(branchId), factExp = factExpOf(branchId);
        const forecastRev = forecastOf(factRev);
        return {
          plannedRevenue: planRev, plannedExpense: planExp,
          factRevenue: factRev, factExpense: factExp, forecastRevenue: forecastRev,
          plannedProfit: planRev !== null && planExp !== null ? planRev - planExp : null,
          expectedProfit: planExp !== null ? forecastRev - planExp : null,
          factProfit: factRev - factExp,
        };
      };
      // Для сети план/факт расходов из суммы филиалов, если по сети строки нет.
      const netFactExp = factExpOf(null);
      const netFactRev = factOf(null);
      const netForecast = forecastOf(netFactRev);
      const networkProfit = {
        plannedRevenue: networkPlan, plannedExpense: networkPlanExp,
        factRevenue: netFactRev, factExpense: netFactExp, forecastRevenue: netForecast,
        plannedProfit: networkPlan !== null && networkPlanExp !== null ? networkPlan - networkPlanExp : null,
        expectedProfit: networkPlanExp !== null ? netForecast - networkPlanExp : null,
        factProfit: netFactRev - netFactExp,
      };
      const byBranch = branches.map((b) => {
        const plan = planOf(b.id);
        const fact = factOf(b.id);
        return { branchId: b.id, name: b.name || b.city, plan, fact, pct: pct(fact, plan), ...profitBlock(b.id) };
      });
      res.json({
        period,
        network: { plan: networkPlan, fact: netFactRev, pct: pct(netFactRev, networkPlan), ...networkProfit },
        byBranch,
      });
    } catch (error: any) {
      res.status(503).json({ period, network: null, byBranch: [], error: error?.message });
    }
  });

  app.get("/api/mvp/video/templates", (_req, res) => {
    res.json({ templates: listVideoTemplates() });
  });

  app.get("/api/mvp/video/jobs", (_req, res) => {
    res.json({ jobs: getVideoJobs() });
  });

  app.get("/api/mvp/video/jobs/:jobId", (req, res) => {
    const job = getVideoJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Video render job not found" });
    }
    res.json({ job });
  });

  app.post("/api/mvp/video/render", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }

    try {
      const data = supabaseEnabled ? await dbBootstrap(session) : fallbackPayload(session);
      const job = createVideoRenderJob(data as any, {
        templateId: payload.templateId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        format: payload.format,
        priority: payload.priority,
        requestedBy: session.userId,
      });
      res.status(202).json({ job });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Unable to create video render job" });
    }
  });

  app.post("/api/mvp/students", ah(async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.name || !payload.branchId) {
      return res.status(400).json({ error: "name and branchId are required" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }

    // Имя/фамилия: либо явные поля, либо разбор строки name по пробелу.
    const [splitFirst, ...splitRest] = String(payload.name).trim().split(/\s+/);
    const firstName = payload.firstName || splitFirst || payload.name;
    const lastName = payload.lastName || splitRest.join(" ") || "-";

    // ТЗ заказчика: две карточки с одинаковыми именем+фамилией создавать нельзя.
    // Если тёзка в АРХИВЕ — подсказываем восстановить его вместо дубля.
    // Валидационное чтение без .catch — ошибка не должна пропускать дубли.
    if (String(firstName).trim() && String(lastName).trim() && lastName !== "-") {
      const dupes = await supabaseFetch<any[]>(
        "students",
        `select=id,status,archived_at&organization_id=eq.${session.organizationId}` +
        `&first_name=ilike.${encodeURIComponent(String(firstName).trim())}` +
        `&last_name=ilike.${encodeURIComponent(String(lastName).trim())}&limit=5`
      );
      const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`;
      const isArchived = (d: any) => d.status === "archived" || Boolean(d.archived_at);
      const activeDup = dupes.find((d) => !isArchived(d));
      if (activeDup) {
        return res.status(409).json({
          error: `Ученик «${fullName}» уже есть в базе — дубль создавать нельзя. Откройте его карточку в реестре.`,
          duplicateId: activeDup.id,
        });
      }
      const archivedDup = dupes.find(isArchived);
      if (archivedDup) {
        return res.status(409).json({
          error: `Ученик «${fullName}» уже есть в АРХИВЕ. Восстановить его вместо создания новой карточки?`,
          archivedId: archivedDup.id,
        });
      }
    }

    const inserted = await supabaseFetch<any[]>("students", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        group_id: payload.groupId || null,
        source_id: await resolveSourceId(session, payload),
        first_name: firstName,
        last_name: lastName,
        gender: payload.gender || null,
        birthday: payload.birthday || null,
        phone: payload.phone || null,
        teacher_id: payload.teacherId || null,
        parent_name: payload.parentName || null,
        parent_phone: payload.parentPhone || null,
        status: payload.status || "lead",
        manual_status: payload.manualStatus || null,
        skill_level: payload.skillLevel || null,
        comment: payload.comment || null
      })
    });
    await logStatusEvent(session, inserted[0]?.id, inserted[0]?.status, null, payload.branchId);
    res.status(201).json({ student: inserted[0] });
  }));

  app.patch("/api/mvp/students/:id", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    if (payload.branchId && !canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const updates: Record<string, unknown> = {};
    if (payload.firstName !== undefined || payload.lastName !== undefined) {
      if (payload.firstName !== undefined) updates.first_name = payload.firstName || "-";
      if (payload.lastName !== undefined) updates.last_name = payload.lastName || "-";
    } else if (payload.name !== undefined) {
      const [firstName, ...rest] = String(payload.name).trim().split(/\s+/);
      updates.first_name = firstName || payload.name;
      updates.last_name = rest.join(" ") || "-";
    }
    if (payload.branchId !== undefined) updates.branch_id = payload.branchId;
    if (payload.groupId !== undefined) updates.group_id = payload.groupId || null;
    if (payload.sourceId !== undefined || payload.sourceName !== undefined) {
      updates.source_id = await resolveSourceId(session, payload);
    }
    if (payload.teacherId !== undefined) updates.teacher_id = payload.teacherId || null;
    if (payload.gender !== undefined) updates.gender = payload.gender || null;
    if (payload.birthday !== undefined) updates.birthday = payload.birthday || null;
    if (payload.phone !== undefined) updates.phone = payload.phone || null;
    if (payload.parentName !== undefined) updates.parent_name = payload.parentName || null;
    if (payload.parentPhone !== undefined) updates.parent_phone = payload.parentPhone || null;
    if (payload.comment !== undefined) updates.comment = payload.comment || null;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.manualStatus !== undefined) updates.manual_status = payload.manualStatus || null;
    if (payload.skillLevel !== undefined) updates.skill_level = payload.skillLevel || null;
    if (payload.payPromiseDate !== undefined) updates.pay_promise_date = payload.payPromiseDate || null;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Нет полей для обновления" });
    }
    try {
      // Умный перевод (ТЗ): нельзя перевести ученика в другую группу, пока у него
      // действует абонемент в ТЕКУЩЕЙ группе — журнал и оплаты привязаны к ней.
      if (payload.groupId !== undefined) {
        const cur = (await supabaseFetch<any[]>(
          "students",
          `select=group_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&limit=1`
        ).catch(() => [] as any[]))[0];
        const oldGroup = cur?.group_id || null;
        const newGroup = payload.groupId || null;
        if (oldGroup && newGroup !== oldGroup) {
          const today = new Date().toISOString().slice(0, 10);
          // Любой НЕ закончившийся активный абонемент группы блокирует перевод —
          // включая купленный на будущий месяц (starts_on в будущем).
          const activeInOld = await supabaseFetch<any[]>(
            "student_subscriptions",
            `select=ends_on,starts_on&student_id=eq.${req.params.id}&group_id=eq.${oldGroup}&status=eq.active&or=(ends_on.is.null,ends_on.gte.${today})&limit=1`
          );
          if (activeInOld.length > 0) {
            const until = activeInOld[0].ends_on ? ` (до ${activeInOld[0].ends_on})` : "";
            return res.status(409).json({
              error: `У ученика активный абонемент в текущей группе${until}. Удалите абонемент или дождитесь его окончания, чтобы перевести в другую группу.`,
            });
          }
        }
      }
      // Гардрейл (и на сервере, не только в UI): «пробный/оплатит»-статус — для
      // ещё не оплативших; ученику с действующим абонементом его ставить нельзя.
      const wantsTrialPromise =
        (typeof payload.manualStatus === "string" && /оплат|пробн|вводн/i.test(payload.manualStatus)) ||
        payload.status === "trial" || payload.status === "lead";
      if (wantsTrialPromise) {
        const today = new Date().toISOString().slice(0, 10);
        const startNextMonth = new Date(); startNextMonth.setDate(1); startNextMonth.setMonth(startNextMonth.getMonth() + 1);
        const nextMonthStr = startNextMonth.toISOString().slice(0, 10);
        const activeSubs = await supabaseFetch<any[]>(
          "student_subscriptions",
          `select=id&student_id=eq.${req.params.id}&status=eq.active&or=(ends_on.is.null,ends_on.gte.${today})&starts_on=lt.${nextMonthStr}&limit=1`
        ).catch(() => [] as any[]);
        if (activeSubs.length > 0) {
          return res.status(409).json({ error: "У ученика есть действующий абонемент — статус для неоплативших (пробный/оплатит/лид) назначить нельзя. Сначала завершите или удалите абонемент." });
        }
      }
      // Прежний статус — чтобы зафиксировать переход в журнале воронки.
      let prevStatus: string | undefined;
      if (payload.status !== undefined) {
        const before = await supabaseFetch<any[]>("students", `select=status,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
        prevStatus = before[0]?.status;
      }
      const rows = await supabaseFetch<any[]>(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Ученик не найден" });
      if (payload.status !== undefined) await logStatusEvent(session, rows[0].id, rows[0].status, prevStatus, rows[0].branch_id);
      res.json({ student: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить ученика" });
    }
  });

  // DELETE = заявка на удаление: ученик перемещается в корзину.
  // Окончательное удаление (archived) подтверждает только владелец через /confirm-delete.
  app.delete("/api/mvp/students/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const existing = await supabaseFetch<any[]>(
        "students",
        `select=id,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
      );
      if (!existing[0]) return res.status(404).json({ error: "Ученик не найден" });
      if (!canSeeBranch(session, existing[0].branch_id)) {
        return res.status(403).json({ error: "Branch access denied" });
      }
      const requestedBy = ({ owner: "Владелец", branch_manager: "Руководитель филиала", admin: "Администратор", teacher: "Преподаватель" } as Record<string, string>)[session.role] || session.role;
      const rows = await supabaseFetch<any[]>(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({
          deletion_requested_at: new Date().toISOString(),
          deletion_requested_by: requestedBy,
          deletion_reason: (req.body && req.body.reason) || null
        }) }
      );
      res.json({ student: rows[0], trashed: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось переместить ученика в корзину" });
    }
  });

  // ===== Лист ожидания (student_waitlist) =====
  // Поставить ученика в лист ожидания (ТЗ «Лист ожидания»). Идемпотентно:
  // активный пункт у ученика только один (уникальный индекс), поэтому при повторе
  // обновляем существующий.
  app.post("/api/mvp/waitlist", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId) return res.status(400).json({ error: "studentId is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    if (payload.branchId && !canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      // ТЗ заказчика: лист ожидания — только для НОВЫХ ЛИДОВ. Ученик с историей
      // покупок или с открытой записью на пробный в ЛО не попадает.
      // Валидационные чтения без .catch(()=>[]) — ошибка чтения не должна
      // молча пропускать невалидные данные (fail closed).
      // Удалённые (откаченные) абонементы историей не считаются — после полного
      // отката ученик снова лид и может попасть в лист ожидания.
      const anySubs = await supabaseFetch<any[]>(
        "student_subscriptions",
        `select=id&student_id=eq.${payload.studentId}&status=neq.archived&limit=1`
      );
      if (anySubs[0]) {
        return res.status(409).json({ error: "У ученика уже есть (или был) абонемент — лист ожидания только для новых лидов." });
      }
      const openTrial = await supabaseFetch<any[]>(
        "attendance",
        `select=id&student_id=eq.${payload.studentId}&is_trial=eq.true&status=eq.unknown&limit=1`
      );
      if (openTrial[0]) {
        return res.status(409).json({ error: "Ученик записан на пробный урок — в лист ожидания добавить нельзя. Сначала закройте или удалите запись на пробный." });
      }
      // Обещал оплатить («Был на пробном, оплатит») — это этап воронки оплаты,
      // а не кандидат в очередь: сначала снимите ручной статус.
      const stuManual = (await supabaseFetch<any[]>(
        "students",
        `select=manual_status&id=eq.${payload.studentId}&limit=1`
      ))[0];
      if (/оплат/i.test(String(stuManual?.manual_status || ""))) {
        return res.status(409).json({ error: "У ученика статус «Был на пробном, оплатит» — он ждёт оплаты, в лист ожидания добавлять нельзя. Сначала снимите ручной статус." });
      }
      const existing = await supabaseFetch<any[]>(
        "student_waitlist",
        `select=id&${`organization_id=eq.${session.organizationId}`}&student_id=eq.${payload.studentId}&removed_at=is.null`
      );
      const body = {
        organization_id: session.organizationId,
        student_id: payload.studentId,
        branch_id: payload.branchId || null,
        group_id: payload.groupId || null,
        comment: payload.comment || null
      };
      let rows: any[];
      if (existing[0]) {
        rows = await supabaseFetch<any[]>(
          "student_waitlist",
          `id=eq.${existing[0].id}`,
          { method: "PATCH", body: JSON.stringify({ branch_id: body.branch_id, group_id: body.group_id, comment: body.comment }) }
        );
      } else {
        rows = await supabaseFetch<any[]>("student_waitlist", "", { method: "POST", body: JSON.stringify(body) });
      }
      res.status(201).json({ entry: mapDbWaitlist(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось добавить в лист ожидания" });
    }
  });

  // Убрать из листа ожидания (закрыть пункт). По умолчанию reason='manual';
  // при зачислении в группу с абонементом фронт/бэк передаёт reason='enrolled'.
  app.delete("/api/mvp/waitlist/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const reason = (req.body && req.body.reason) || "manual";
      const rows = await supabaseFetch<any[]>(
        "student_waitlist",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&removed_at=is.null`,
        { method: "PATCH", body: JSON.stringify({ removed_at: new Date().toISOString(), removed_reason: reason }) }
      );
      res.json({ entry: rows[0] ? mapDbWaitlist(rows[0]) : null, removed: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось убрать из листа ожидания" });
    }
  });

  // Корзина учеников — только владелец сети.
  app.get("/api/mvp/students/trash", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") {
      return res.status(403).json({ error: "Только владелец видит корзину учеников" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const rows = await supabaseFetch<any[]>(
        "students",
        `select=*&organization_id=eq.${session.organizationId}&status=neq.archived&deletion_requested_at=not.is.null&order=deletion_requested_at.desc`
      );
      const students = rows.map((row) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "Ученик",
        branchId: row.branch_id,
        parentName: row.parent_name || "",
        parentPhone: row.parent_phone || "",
        requestedBy: row.deletion_requested_by || "—",
        requestedAt: row.deletion_requested_at,
        reason: row.deletion_reason || ""
      }));
      res.json({ students });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить корзину" });
    }
  });

  // Восстановить из корзины — только владелец.
  app.post("/api/mvp/students/:id/restore", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") {
      return res.status(403).json({ error: "Только владелец может восстанавливать учеников" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const rows = await supabaseFetch<any[]>(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ deletion_requested_at: null, deletion_requested_by: null, deletion_reason: null }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Ученик не найден" });
      res.json({ student: rows[0], restored: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось восстановить ученика" });
    }
  });

  // Подтвердить удаление (архивирование) — только владелец.
  app.post("/api/mvp/students/:id/confirm-delete", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") {
      return res.status(403).json({ error: "Только владелец может подтвердить удаление" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      const rows = await supabaseFetch<any[]>(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived", deletion_requested_at: null }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Ученик не найден" });
      res.json({ student: rows[0], archived: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить ученика" });
    }
  });

  // ===== Архив учеников (сохранение базы для маркетинга) =====
  // В архив переводят владелец / руководитель / администратор (в рамках своих филиалов).
  // Два комментария обязательны: «Почему он ушёл?» (reason) и свободный (comment).
  // Данные ученика сохраняются; ученик исчезает из активного реестра, но виден в Архиве.
  // Редактирование архивной карточки: дата ухода / причина / комментарий.
  app.patch("/api/mvp/students/:id/archive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const existing = await supabaseFetch<any[]>(
      "students",
      `select=id,branch_id,archived_at&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
    );
    if (!existing[0]) return res.status(404).json({ error: "Ученик не найден" });
    if (!existing[0].archived_at) return res.status(400).json({ error: "Ученик не в архиве" });
    if (!canSeeBranch(session, existing[0].branch_id)) return res.status(403).json({ error: "Branch access denied" });
    const patch: Record<string, any> = {};
    if (req.body?.leftOn !== undefined) patch.left_on = req.body.leftOn ? String(req.body.leftOn).slice(0, 10) : null;
    if (req.body?.reason !== undefined) patch.archive_reason = String(req.body.reason || "").trim();
    if (req.body?.comment !== undefined) patch.archive_comment = String(req.body.comment || "").trim();
    if (!Object.keys(patch).length) return res.status(400).json({ error: "Нет полей для обновления" });
    const rows = await supabaseFetch<any[]>(
      "students",
      `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) }
    );
    res.json({ student: rows[0], updated: true });
  }));

  app.post("/api/mvp/students/:id/archive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const reason = (req.body && String(req.body.reason || "").trim()) || "";
    const comment = (req.body && String(req.body.comment || "").trim()) || "";
    // Дата ухода (месяц, когда реально перестал ходить). По умолчанию — сегодня.
    const leftOn = (req.body && req.body.leftOn) ? String(req.body.leftOn).slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!reason) return res.status(400).json({ error: "Укажите причину ухода ученика" });
    if (!comment) return res.status(400).json({ error: "Укажите комментарий" });
    const existing = await supabaseFetch<any[]>(
      "students",
      `select=id,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
    );
    if (!existing[0]) return res.status(404).json({ error: "Ученик не найден" });
    if (!canSeeBranch(session, existing[0].branch_id)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const archivedBy = ({ owner: "Владелец", branch_manager: "Руководитель филиала", admin: "Администратор", teacher: "Преподаватель" } as Record<string, string>)[session.role] || session.role;
    const rows = await supabaseFetch<any[]>(
      "students",
      `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
      { method: "PATCH", body: JSON.stringify({
        archived_at: new Date().toISOString(),
        left_on: leftOn,
        archive_reason: reason,
        archive_comment: comment,
        archived_by: archivedBy,
        // если ученик был в корзине — заявка закрывается переводом в архив
        deletion_requested_at: null,
        deletion_requested_by: null,
        deletion_reason: null
      }) }
    );
    res.json({ student: rows[0], archived: true });
  }));

  // Вернуть ученика из архива в активный реестр (очищаем поля архива).
  app.post("/api/mvp/students/:id/unarchive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const existing = await supabaseFetch<any[]>(
      "students",
      `select=id,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`
    );
    if (!existing[0]) return res.status(404).json({ error: "Ученик не найден" });
    if (!canSeeBranch(session, existing[0].branch_id)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const rows = await supabaseFetch<any[]>(
      "students",
      `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
      { method: "PATCH", body: JSON.stringify({
        archived_at: null, archive_reason: null, archive_comment: null, archived_by: null
      }) }
    );
    if (!rows[0]) return res.status(404).json({ error: "Ученик не найден" });
    res.json({ student: rows[0], restored: true });
  }));

  // Список архива. Владелец видит всю сеть, остальные — свои филиалы.
  app.get("/api/mvp/students/archive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const rows = (await supabaseFetch<any[]>(
      "students",
      `select=*&organization_id=eq.${session.organizationId}&archived_at=not.is.null&order=archived_at.desc`
    )).filter((row) => canSeeBranch(session, row.branch_id));
    // Число абонементов на каждого архивного — чтобы отличить «ушедших»
    // (купили ≥1 абонемент) от «отказавшихся» (ушли, ничего не купив).
    const ids = rows.map((r) => r.id);
    const subsCount = new Map<string, number>();
    if (ids.length) {
      const subs = await supabaseFetch<any[]>(
        "student_subscriptions",
        `select=student_id&student_id=in.(${ids.join(",")})`
      ).catch(() => [] as any[]);
      for (const s of subs) subsCount.set(s.student_id, (subsCount.get(s.student_id) || 0) + 1);
    }
    const students = rows.map((row) => {
      const subscriptionsCount = subsCount.get(row.id) || 0;
      return {
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "Ученик",
        branchId: row.branch_id,
        phone: row.phone || row.parent_phone || "",
        parentName: row.parent_name || "",
        parentPhone: row.parent_phone || "",
        archivedAt: row.archived_at,
        leftOn: row.left_on || null,
        archivedBy: row.archived_by || "—",
        archiveReason: row.archive_reason || "",
        archiveComment: row.archive_comment || "",
        subscriptionsCount,
        // «Ушедший» = был реальным учеником (купил ≥1 абонемент);
        // иначе «Отказавшийся» (ушёл на этапе пробных, ничего не купив).
        category: subscriptionsCount >= 1 ? "left" : "declined",
      };
    });
    res.json({ students });
  }));

  app.post("/api/mvp/payments", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId || !payload.branchId || !payload.amount) {
      return res.status(400).json({ error: "studentId, branchId and amount are required" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }

    // Запрет переплаты (ТЗ): нельзя внести больше, чем остаток долга по активным
    // абонементам. Легаси без amount_paid — остаток неизвестен, пропускаем.
    // Ошибка чтения = 500 (fail closed), НЕ пустой список — иначе валидация дырявая.
    try {
      const subsForCap = await supabaseFetch<any[]>(
        "student_subscriptions",
        `select=price,amount_paid&student_id=eq.${payload.studentId}&status=eq.active&amount_paid=not.is.null`
      );
      if (subsForCap.length > 0) {
        const totalShortfall = subsForCap.reduce(
          (sum, s) => sum + Math.max(0, (Number(s.price) || 0) - Number(s.amount_paid)), 0
        );
        if ((Number(payload.amount) || 0) > totalShortfall) {
          return res.status(400).json({
            error: totalShortfall > 0
              ? `Сумма превышает остаток долга (${totalShortfall.toLocaleString("ru-RU")} тг). Для нового месяца используйте «Продать абонемент».`
              : "У ученика нет долга по абонементам. Для нового месяца используйте «Продать абонемент»."
          });
        }
      }
    } catch (e: any) {
      return res.status(500).json({ error: "Не удалось проверить остаток долга: " + (e?.message || e) });
    }

    const insertedPayment = await supabaseFetch<any[]>("payments", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        student_id: payload.studentId,
        amount: payload.amount,
        method: payload.method || "cash",
        status: "paid",
        comment: payload.description || "Оплата",
        created_by: session.userId.startsWith("demo-") ? null : session.userId
      })
    });

    // Create a corresponding finance transaction
    await supabaseFetch<any[]>("finance_transactions", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        student_id: payload.studentId,
        payment_id: insertedPayment[0].id,
        amount: payload.amount,
        type: "income",
        category: "tuition",
        category_id: await ensureIncomeCategoryId(session.organizationId),
        description: payload.description || "Оплата абонемента"
      })
    });

    // Погашение долга: долг считается как price − amount_paid по активным
    // абонементам (computeStudentBalance), поэтому платёж обязан увеличивать
    // amount_paid — иначе доплата «не видна» и долг не гасится.
    try {
      let rest = Math.max(0, Number(payload.amount) || 0);
      const subs = await supabaseFetch<any[]>(
        "student_subscriptions",
        `select=id,price,amount_paid&student_id=eq.${payload.studentId}&status=eq.active&amount_paid=not.is.null&order=starts_on.asc`
      );
      let remainingDebt = 0;
      let hasData = false;
      for (const s of subs) {
        hasData = true;
        let shortfall = Math.max(0, (Number(s.price) || 0) - Number(s.amount_paid));
        if (shortfall > 0 && rest > 0) {
          const add = Math.min(shortfall, rest);
          await supabaseFetch("student_subscriptions", `id=eq.${s.id}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ amount_paid: Number(s.amount_paid) + add })
          });
          rest -= add;
          shortfall -= add;
        }
        remainingDebt += shortfall;
      }
      // Легаси-флаг status='debt' (абонементы без amount_paid): без данных о
      // недоплате любой платёж снимает флаг; с данными — только когда долга нет.
      if (!hasData || remainingDebt <= 0) {
        const stu = (await supabaseFetch<any[]>(
          "students",
          `select=id,status&id=eq.${payload.studentId}&organization_id=eq.${session.organizationId}`
        ))[0];
        if (stu && stu.status === "debt") {
          await supabaseFetch("students", `id=eq.${payload.studentId}&organization_id=eq.${session.organizationId}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: "active" })
          });
        }
      }
    } catch { /* погашение долга не должно ронять регистрацию платежа */ }

    res.status(201).json({ payment: mapDbPayment(insertedPayment[0]) });
  });

  // Ошибка бизнес-логики продажи с HTTP-статусом (для createSubscriptionSale).
  class SaleError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  }

  // Продажа абонемента — общая логика для одиночного и пакетного эндпоинтов.
  // Извлечено 1:1 из POST /api/mvp/student-subscriptions (денежный путь!).
  async function createSubscriptionSale(session: MvpSession, payload: any) {
    const studentId = payload.studentId;
    const branchId = payload.branchId;
    const planId = payload.planId;
    if (!studentId || !branchId || !planId) {
      throw new SaleError(400, "studentId, branchId and planId are required");
    }
    if (!canSeeBranch(session, branchId)) {
      throw new SaleError(403, "Branch access denied");
    }
    if (!supabaseEnabled) {
      throw new SaleError(503, "Supabase is not configured");
    }
    {
      // План нужен для названия и значений по умолчанию.
      const plans = await supabaseFetch<any[]>(
        "subscription_plans",
        `select=*&id=eq.${planId}&organization_id=eq.${session.organizationId}`
      );
      const plan = plans[0];
      if (!plan) throw new SaleError(404, "План абонемента не найден");

      const lessonsTotal = Number(payload.lessonsTotal) > 0
        ? Math.round(Number(payload.lessonsTotal))
        : Number(plan.lessons_count) || 0;
      const today = new Date().toISOString().slice(0, 10);
      const startsOn = payload.startsOn || today;
      let endsOn = payload.endsOn || startsOn;
      if (endsOn < startsOn) endsOn = startsOn;

      // ТЗ «Логика продажи абонементов»: один абонемент = один календарный месяц.
      if (startsOn.slice(0, 7) !== endsOn.slice(0, 7)) {
        throw new SaleError(400, "Период пересекает два календарных месяца. Создайте отдельный абонемент на каждый месяц (или используйте пакетную продажу).");
      }

      const basePrice = Number(plan.price) || 0;
      const discountAmount = Math.max(0, Number(payload.discountAmount) || 0);
      // Итоговая цена: либо передана с фронта, либо база − скидка − перерасчёт.
      const recalc = Math.max(0, Number(payload.recalc) || 0);
      const finalPrice = payload.price !== undefined
        ? Math.max(0, Number(payload.price) || 0)
        : Math.max(0, basePrice - discountAmount - recalc);

      // «Сохранить счёт» (paid=false) → абонемент создаётся неактивным (ещё не продан).
      // «Продать абонемент» (paid=true) → активный + платёж.
      const paid = payload.paid !== false;

      // Внесено: сколько реально оплатил ученик. По умолчанию — полная стоимость.
      // Если меньше — разница уходит в долг (считается по amount_paid в bootstrap).
      // Больше стоимости — СТРОГИЙ запрет (ТЗ), а не молчаливая обрезка.
      if (payload.amountPaid !== undefined && Number(payload.amountPaid) > finalPrice) {
        throw new SaleError(400, `«Внесено» (${Math.round(Number(payload.amountPaid)).toLocaleString("ru-RU")} тг) больше стоимости абонемента (${Math.round(finalPrice).toLocaleString("ru-RU")} тг) — переплата запрещена.`);
      }
      const amountPaid = payload.amountPaid !== undefined
        ? Math.min(finalPrice, Math.max(0, Number(payload.amountPaid) || 0))
        : finalPrice;
      // Дата продажи (день оформления) — отдельно от starts_on (первый урок).
      const soldOn = String(payload.soldOn || today).slice(0, 10);

      // Тариф с филиалом действует только в нём — у филиалов разные цены (ТЗ 2026-07-12).
      if (plan.branch_id && plan.branch_id !== branchId) {
        throw new SaleError(400, `Тариф «${plan.name}» действует в другом филиале — выберите тариф филиала ученика или общий тариф.`);
      }

      // Срок действия группы (ТЗ 2026-07-12): абонемент нельзя продать на период
      // вне срока действия группы. Продлить срок можно в настройках группы.
      if (payload.groupId) {
        const grp = (await supabaseFetch<any[]>(
          "groups",
          `select=name,start_date,end_date,format&id=eq.${payload.groupId}&limit=1`
        ))[0];
        // Формат тарифа обязан совпадать с форматом группы: индивидуальный тариф
        // нельзя продать в групповую группу и наоборот (ТЗ 2026-07-12).
        if (grp) {
          const planFmt = plan.format === "individual" ? "individual" : "group";
          const grpFmt = grp.format === "individual" ? "individual" : "group";
          if (planFmt !== grpFmt) {
            throw new SaleError(400, planFmt === "individual"
              ? `Тариф «${plan.name}» — индивидуальный, а «${grp.name}» — групповая группа. Выберите индивидуальный график или групповой тариф.`
              : `Тариф «${plan.name}» — групповой, а «${grp.name}» — индивидуальный график. Выберите группу или индивидуальный тариф.`);
          }
        }
        if (grp?.end_date && endsOn > grp.end_date) {
          throw new SaleError(400, `Группа «${grp.name}» действует до ${grp.end_date} — абонемент на период после этой даты продать нельзя. Продлите срок действия группы или выберите другую.`);
        }
        if (grp?.start_date && startsOn < grp.start_date) {
          throw new SaleError(400, `Группа «${grp.name}» начинает работать с ${grp.start_date} — абонемент на более ранний период продать нельзя.`);
        }
      }

      // Запрет двойной продажи (ТЗ §7): один ученик × одна группа × один
      // КАЛЕНДАРНЫЙ МЕСЯЦ = один абонемент. Окно проверки — весь месяц нового
      // абонемента (ловит и легаси-абонементы, заходящие в месяц с краёв).
      // Другая группа/направление или индивидуальное (group_id пуст) — разрешено.
      // Проверяем только при реальной продаже (paid), чтобы сохранять черновые счёта.
      if (paid && payload.groupId) {
        const y = Number(startsOn.slice(0, 4));
        const m = Number(startsOn.slice(5, 7));
        const monthStart = `${startsOn.slice(0, 7)}-01`;
        const monthEnd = `${startsOn.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
        const overlap = await supabaseFetch<any[]>(
          "student_subscriptions",
          `select=id,starts_on,ends_on&student_id=eq.${studentId}&group_id=eq.${payload.groupId}&status=eq.active&starts_on=lte.${monthEnd}&ends_on=gte.${monthStart}`
        ).catch(() => [] as any[]);
        if (overlap.length > 0) {
          throw new SaleError(409, `У ученика уже есть активный абонемент в этой группе на ${monthStart.slice(0, 7)}. Один месяц — один абонемент; выберите другой месяц, группу или индивидуальное занятие.`);
        }
      }

      const insertedSub = await supabaseFetch<any[]>("student_subscriptions", "", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          plan_id: planId,
          branch_id: branchId,
          group_id: payload.groupId || null,
          kind: payload.kind === "individual" ? "individual" : "group",
          starts_on: startsOn,
          ends_on: endsOn,
          lessons_total: lessonsTotal,
          lessons_left: lessonsTotal,
          price: finalPrice,
          amount_paid: paid ? amountPaid : null,
          sold_on: soldOn,
          discount_amount: discountAmount + recalc,
          status: paid ? "active" : "inactive"
        })
      });

      // Платёж и проводка ДДС — на фактически ВНЕСЁННУЮ сумму (может быть меньше
      // стоимости; недоплата = долг, считается по amount_paid в bootstrap).
      const debtLeft = Math.max(0, finalPrice - amountPaid);
      let payment = null;
      if (paid && amountPaid > 0) {
        const payComment = payload.description || `Абонемент: ${plan.name}`;
        const insertedPayment = await supabaseFetch<any[]>("payments", "", {
          method: "POST",
          body: JSON.stringify({
            organization_id: session.organizationId,
            branch_id: branchId,
            student_id: studentId,
            amount: amountPaid,
            method: payload.method || "kaspi",
            status: "paid",
            comment: debtLeft > 0 ? `${payComment} (частично, долг ${Math.round(debtLeft)} тг)` : payComment,
            created_by: session.userId.startsWith("demo-") ? null : session.userId
          })
        });
        payment = mapDbPayment(insertedPayment[0]);
        await supabaseFetch<any[]>("finance_transactions", "", {
          method: "POST",
          body: JSON.stringify({
            organization_id: session.organizationId,
            branch_id: branchId,
            student_id: studentId,
            payment_id: insertedPayment[0].id,
            amount: amountPaid,
            type: "income",
            category: "tuition",
            category_id: await ensureIncomeCategoryId(session.organizationId),
            description: payload.description || `Абонемент: ${plan.name}`
          })
        });
      }

      // ТЗ «Лист ожидания»: при продаже абонемента ученик автоматически уходит из
      // листа ожидания (история сохраняется через removed_at/removed_reason).
      let waitlistClosed = false;
      if (paid) {
        try {
          const closed = await supabaseFetch<any[]>(
            "student_waitlist",
            `student_id=eq.${studentId}&organization_id=eq.${session.organizationId}&removed_at=is.null`,
            { method: "PATCH", body: JSON.stringify({ removed_at: new Date().toISOString(), removed_reason: "enrolled" }) }
          );
          waitlistClosed = closed.length > 0;
        } catch { /* лист ожидания не критичен для продажи */ }

        // Продажа АКТУАЛИЗИРУЕТ статус (ТЗ: каждое действие обновляет статус):
        // снимаем ЛЮБОЙ устаревший ручной статус («Каникулы», «…оплатит» и т.п.) —
        // купивший ученик идёт по авто-логике; лид/пробный/пауза → active.
        try {
          const stu = (await supabaseFetch<any[]>("students", `select=status,manual_status&id=eq.${studentId}&organization_id=eq.${session.organizationId}`))[0];
          if (stu) {
            const upd: Record<string, any> = {};
            if (String(stu.manual_status || "").trim()) { upd.manual_status = null; upd.pay_promise_date = null; }
            if (["lead", "trial", "paused"].includes(String(stu.status))) upd.status = "active";
            if (Object.keys(upd).length) {
              await supabaseFetch("students", `id=eq.${studentId}&organization_id=eq.${session.organizationId}`, {
                method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(upd),
              });
            }
          }
        } catch { /* смена статуса не критична для продажи */ }

        // Пробный закрыт покупкой: помечаем пробные отметки converted — по этому
        // полю считают дашборд журнала («Купили после ПУ») и воронка статусов.
        try {
          await supabaseFetch("attendance", `student_id=eq.${studentId}&is_trial=eq.true&trial_outcome=is.null`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ trial_outcome: "converted" }),
          });
        } catch { /* не критично для продажи */ }

        // Перерасчёт при продаже (болезнь и т.п.): фиксируем запись с причиной и
        // справкой — она видна во вкладке «Справки» карточки ученика (ТЗ).
        if (recalc > 0) {
          try {
            await supabaseFetch("recalculations", "", {
              method: "POST",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({
                organization_id: session.organizationId,
                branch_id: branchId,
                student_id: studentId,
                subscription_id: insertedSub[0]?.id || null,
                lessons_count: 0,
                reason: payload.recalcReason || "other",
                amount: recalc,
                comment: `Перерасчёт при продаже абонемента «${plan.name}»`,
                attachment_url: payload.recalcAttachmentUrl || null,
                attachment_name: payload.recalcAttachmentName || null,
                status: "applied",
                created_by: authorId(session),
                created_by_name: session.fullName || null,
              }),
            });
          } catch { /* справка не критична для продажи */ }
        }

        // Событие ПРОДАЖИ для воронки дашборда (source='sale'): пишем напрямую,
        // потому что logStatusEvent no-op-ится, когда ученик уже active, — а
        // повторная покупка тоже должна попадать в «Купили».
        try {
          await supabaseFetch("student_status_events", "", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              organization_id: session.organizationId,
              branch_id: branchId,
              student_id: studentId,
              from_status: null,
              to_status: "active",
              source: "sale",
              created_by: session.fullName || session.role
            })
          });
        } catch { /* аналитика не критична для продажи */ }
      }

      return {
        subscription: mapDbSubscription(insertedSub[0], plan.name),
        payment,
        waitlistClosed
      };
    }
  }

  // Продать абонемент: создаём student_subscriptions + (по флагу paid) платёж и проводку ДДС.
  app.post("/api/mvp/student-subscriptions", async (req, res) => {
    const session = getSession(req);
    try {
      const result = await createSubscriptionSale(session, req.body || {});
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error instanceof SaleError ? error.status : 400).json({ error: error.message || "Не удалось продать абонемент" });
    }
  });

  // Пакетная продажа (ТЗ §5): клиент разбивает период по календарным месяцам,
  // сервер валидирует ВСЕ месяцы до первой вставки (границы месяца, дубли в
  // пакете, дубли в базе), затем создаёт абонементы последовательно.
  // PostgREST не даёт транзакций между запросами, поэтому при сбое в середине
  // возвращаем список уже созданных («создано M из N»).
  app.post("/api/mvp/student-subscriptions/batch", async (req, res) => {
    const session = getSession(req);
    const items: any[] = Array.isArray((req.body || {}).items) ? (req.body || {}).items : [];
    if (!items.length) return res.status(400).json({ error: "Пакет продаж пуст" });
    if (items.length > 12) return res.status(400).json({ error: "Не больше 12 месяцев за одну операцию" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });

    // 1. Локальная валидация пакета: границы месяца + дубли месяцев внутри пакета.
    const seenMonths = new Set<string>();
    for (const it of items) {
      const s = String(it.startsOn || "").slice(0, 10);
      const e = String(it.endsOn || s).slice(0, 10);
      if (!s) return res.status(400).json({ error: "У каждого месяца пакета должна быть дата начала" });
      if (s.slice(0, 7) !== e.slice(0, 7)) {
        return res.status(400).json({ error: `Период ${s} — ${e} пересекает два календарных месяца. Один абонемент = один месяц.` });
      }
      const key = `${it.groupId || "solo"}|${s.slice(0, 7)}`;
      if (seenMonths.has(key)) return res.status(400).json({ error: `В пакете два абонемента на один месяц (${s.slice(0, 7)}) в одну группу` });
      seenMonths.add(key);
    }

    // 2. Валидация против базы ДО вставок: дубль «ученик × группа × месяц».
    for (const it of items) {
      if (it.paid === false || !it.groupId || !it.studentId) continue;
      const s = String(it.startsOn).slice(0, 10);
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(5, 7));
      const monthStart = `${s.slice(0, 7)}-01`;
      const monthEnd = `${s.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
      try {
        const overlap = await supabaseFetch<any[]>(
          "student_subscriptions",
          `select=id&student_id=eq.${it.studentId}&group_id=eq.${it.groupId}&status=eq.active&starts_on=lte.${monthEnd}&ends_on=gte.${monthStart}&limit=1`
        );
        if (overlap.length) {
          return res.status(409).json({ error: `На ${s.slice(0, 7)} у ученика уже есть активный абонемент в этой группе — пакет не создан.` });
        }
      } catch (e: any) {
        return res.status(500).json({ error: "Не удалось проверить дубли по месяцам: " + (e?.message || e) });
      }
    }

    // 3. Последовательное создание.
    const created: any[] = [];
    for (const it of items) {
      try {
        created.push(await createSubscriptionSale(session, it));
      } catch (error: any) {
        return res.status(error instanceof SaleError ? error.status : 400).json({
          error: `Месяц ${String(it.startsOn || "").slice(0, 7)}: ${error.message || "не удалось продать"}. Создано ${created.length} из ${items.length}.`,
          created: created.map((c) => c.subscription),
          createdCount: created.length,
        });
      }
    }
    res.status(201).json({
      created: created.map((c) => c.subscription),
      payments: created.map((c) => c.payment).filter(Boolean),
      createdCount: created.length,
    });
  });

  // Удалить абонемент (ТЗ §3): мягкое удаление — абонемент не исчезает, а помечается
  // «Удалён» (status='archived') с причиной/комментарием/кто/когда. Требуется причина.
  app.delete("/api/mvp/student-subscriptions/:id", async (req, res) => {
    const session = getSession(req);
    if (!["owner", "branch_manager", "admin"].includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const reason = String((req.body || {}).reason || "").trim();
    const comment = String((req.body || {}).comment || "").trim() || null;
    if (!reason) return res.status(400).json({ error: "Укажите причину удаления абонемента" });
    try {
      const rows = await supabaseFetch<any[]>("student_subscriptions", `id=eq.${req.params.id}`, {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "archived", cancel_reason: reason, cancel_comment: comment, deleted_by: session.fullName || session.role, deleted_at: new Date().toISOString() }),
      });
      if (!rows[0]) return res.status(404).json({ error: "Абонемент не найден" });
      // Откат (ТЗ заказчика): если после удаления у ученика не осталось
      // действующего абонемента — полный откат: статус «Новый лид», снятие
      // промиса «…оплатит», сброс «купил после пробного» (trial_outcome) и
      // удаление события продажи из воронки (source='sale' за день продажи).
      try {
        const sid = rows[0].student_id;
        const remain = await supabaseFetch<any[]>("student_subscriptions", `select=status&student_id=eq.${sid}&status=neq.archived`).catch(() => [] as any[]);
        if (!remain.some((r) => String(r.status) === "active")) {
          const stu = (await supabaseFetch<any[]>("students", `select=manual_status&id=eq.${sid}&organization_id=eq.${session.organizationId}`).catch(() => [] as any[]))[0];
          const upd: Record<string, any> = { status: "lead" };
          if (/оплат/i.test(String(stu?.manual_status || ""))) { upd.manual_status = null; upd.pay_promise_date = null; }
          await supabaseFetch("students", `id=eq.${sid}&organization_id=eq.${session.organizationId}`, {
            method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(upd),
          }).catch(() => {});
          // «Купил после пробного» больше не правда — пробные снова «был, не купил».
          await supabaseFetch("attendance", `student_id=eq.${sid}&is_trial=eq.true&trial_outcome=eq.converted`, {
            method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ trial_outcome: null }),
          }).catch(() => {});
        }
        // Компенсация воронки: убираем событие продажи за день оформления
        // удалённого абонемента (иначе дашборд продолжит считать его «Купил»).
        const soldOn = String(rows[0].sold_on || "").slice(0, 10);
        if (soldOn) {
          await supabaseFetch("student_status_events",
            `student_id=eq.${sid}&source=eq.sale&occurred_at=gte.${soldOn}T00:00:00&occurred_at=lte.${soldOn}T23:59:59`, {
            method: "DELETE", headers: { Prefer: "return=minimal" },
          }).catch(() => {});
        }
      } catch { /* коррекция статуса не критична для удаления */ }
      res.json({ ok: true, subscription: mapDbSubscription(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить абонемент" });
    }
  });

  // История действий ученика (ТЗ §16): агрегируем статусы, оплаты, абонементы,
  // ЭхоБаксы, архив/корзину в одну ленту (сортировка по времени, свежее сверху).
  app.get("/api/mvp/students/:id/history", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.json({ events: [] });
    const sid = req.params.id;
    try {
      const [stu, statusEv, pays, subs, echo] = await Promise.all([
        supabaseFetch<any[]>("students", `select=created_at,archived_at,archive_reason,archived_by,deletion_requested_at,deletion_reason,deletion_requested_by&id=eq.${sid}&organization_id=eq.${session.organizationId}&limit=1`).catch(() => [] as any[]),
        supabaseFetch<any[]>("student_status_events", `select=from_status,to_status,occurred_at,created_by&student_id=eq.${sid}&order=occurred_at.desc`).catch(() => [] as any[]),
        supabaseFetch<any[]>("payments", `select=amount,paid_at,comment&student_id=eq.${sid}&order=paid_at.desc`).catch(() => [] as any[]),
        supabaseFetch<any[]>("student_subscriptions", `select=price,starts_on,ends_on,created_at,deleted_at,deleted_by,cancel_reason&student_id=eq.${sid}&order=created_at.desc`).catch(() => [] as any[]),
        supabaseFetch<any[]>("echo_transactions", `select=amount,reason,created_at,created_by&student_id=eq.${sid}&order=created_at.desc`).catch(() => [] as any[]),
      ]);
      const ev: any[] = [];
      const s0 = stu[0];
      if (s0?.created_at) ev.push({ type: "created", title: "Ученик добавлен", detail: null, at: s0.created_at, by: null });
      for (const e of statusEv) ev.push({ type: "status", title: `Статус: ${e.from_status || "—"} → ${e.to_status}`, detail: null, at: e.occurred_at, by: e.created_by });
      for (const p of pays) ev.push({ type: "payment", title: `Оплата ${Math.round(Number(p.amount) || 0)} ₸`, detail: p.comment || null, at: p.paid_at, by: null });
      for (const sub of subs) {
        ev.push({ type: "sub_buy", title: `Куплен абонемент${sub.price ? ` · ${Math.round(Number(sub.price))} ₸` : ""}`, detail: [sub.starts_on, sub.ends_on].filter(Boolean).join(" – ") || null, at: sub.created_at, by: null });
        // В заголовке — ЧТО удалено (цена/период), причина отдельной строкой с подписью:
        // раньше голая причина («ук») выглядела как данные ученика и путала.
        if (sub.deleted_at) ev.push({
          type: "sub_del",
          title: `Удалён абонемент${sub.price ? ` · ${Math.round(Number(sub.price))} ₸` : ""}${[sub.starts_on, sub.ends_on].filter(Boolean).length ? ` (${[sub.starts_on, sub.ends_on].filter(Boolean).join(" – ")})` : ""}`,
          detail: sub.cancel_reason ? `Причина: ${sub.cancel_reason}` : null,
          at: sub.deleted_at,
          by: sub.deleted_by,
        });
      }
      for (const t of echo) ev.push({ type: "echo", title: `ЭхоБаксы ${Number(t.amount) > 0 ? "+" : ""}${t.amount} ⭐`, detail: t.reason || null, at: t.created_at, by: t.created_by });
      if (s0?.archived_at) ev.push({ type: "archive", title: "Переведён в архив", detail: s0.archive_reason || null, at: s0.archived_at, by: s0.archived_by });
      if (s0?.deletion_requested_at) ev.push({ type: "trash", title: "Перемещён в корзину", detail: s0.deletion_reason || null, at: s0.deletion_requested_at, by: s0.deletion_requested_by });
      ev.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
      res.json({ events: ev });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить историю" });
    }
  });

  // Запись ученика на пробный урок (ТЗ): создаёт/находит урок на дату в группе,
  // ставит пробную отметку (is_trial) и меняет статус на «пробный» → авто-статус
  // «Записан на пробный урок». Отсюда же он виден в журнале и карточке.
  app.post("/api/mvp/students/:id/trial", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { date, time, note } = req.body || {};
    if (!date) return res.status(400).json({ error: "Укажите дату пробного урока" });
    const st = (await supabaseFetch<any[]>("students", `select=id,branch_id,group_id,teacher_id,manual_status,status&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`))[0];
    if (!st) return res.status(404).json({ error: "Ученик не найден" });
    if (!canSeeBranch(session, st.branch_id)) return res.status(403).json({ error: "Branch access denied" });
    if (!st.group_id) return res.status(400).json({ error: "Сначала назначьте ученику группу — пробный урок записывается в группу." });
    try {
      // Время «18:00–20:00» или «18:00» → начало/конец (по умолчанию +1 час).
      const hm = (s: string) => /^\d{1,2}:\d{2}$/.test(s) ? s : "";
      const [rawA, rawB] = String(time || "").split(/[–—-]/).map((s: string) => s.trim());
      const start = hm(rawA) || "18:00";
      const end = hm(rawB) || (() => { const [h, m] = start.split(":").map(Number); return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`; })();
      const startsAt = new Date(`${date}T${start}:00`).toISOString();
      const endsAt = new Date(`${date}T${end}:00`).toISOString();
      // Найти урок группы на эту дату, иначе создать «Пробный урок».
      const dayStart = new Date(`${date}T00:00:00.000Z`).toISOString();
      const dayEndD = new Date(`${date}T00:00:00.000Z`); dayEndD.setUTCDate(dayEndD.getUTCDate() + 1);
      const dayEnd = dayEndD.toISOString();
      const ex = await supabaseFetch<any[]>("schedule_lessons", `select=id&group_id=eq.${st.group_id}&starts_at=gte.${encodeURIComponent(dayStart)}&starts_at=lt.${encodeURIComponent(dayEnd)}&limit=1`);
      let lessonId = ex[0]?.id;
      // Нельзя записать пробный на ту же дату дважды — проверяем по ВСЕМ пробным
      // ученика (в любой группе), а не только по уроку текущей группы: раньше
      // дубль проходил, если прежний пробный был в другой группе/уроке.
      {
        const marks = await supabaseFetch<any[]>("attendance", `select=id,lesson_id&student_id=eq.${req.params.id}&is_trial=eq.true`).catch(() => [] as any[]);
        const lids = [...new Set(marks.map((m) => m.lesson_id).filter(Boolean))];
        if (lids.length) {
          const lessons = await supabaseFetch<any[]>("schedule_lessons", `select=id,starts_at&id=in.(${lids.join(",")})`).catch(() => [] as any[]);
          if (lessons.some((l) => String(l.starts_at || "").slice(0, 10) === String(date).slice(0, 10))) {
            return res.status(409).json({ error: "Ученик уже записан на пробный урок на эту дату" });
          }
        }
      }
      // Запись задним числом (дата в прошлом) — только с явным подтверждением (ТЗ).
      if (!Boolean((req.body || {}).confirm)) {
        const todayIso = new Date().toISOString().slice(0, 10);
        if (String(date).slice(0, 10) < todayIso) {
          return res.status(409).json({ error: `Дата пробного урока уже прошла (${String(date).slice(0, 10)}) — это запись задним числом. Записать всё равно?`, needsConfirm: true });
        }
      }
      // Повторный пробный при незакрытом предыдущем (нет отметки «был/не был») —
      // только с явным подтверждением действия (confirm=true от клиента).
      if (!Boolean((req.body || {}).confirm)) {
        const pending = await supabaseFetch<any[]>("attendance", `select=id&student_id=eq.${req.params.id}&is_trial=eq.true&status=eq.unknown&limit=1`).catch(() => [] as any[]);
        if (pending.length) return res.status(409).json({ error: "У ученика уже есть незакрытый пробный урок (нет отметки «был/не был»). Записать ещё один?", needsConfirm: true });
      }
      if (!lessonId) {
        const ins = await supabaseFetch<any[]>("schedule_lessons", "", {
          method: "POST",
          body: JSON.stringify({
            branch_id: st.branch_id, group_id: st.group_id, teacher_id: st.teacher_id || null,
            starts_at: startsAt, ends_at: endsAt, status: "scheduled", comment: "Пробный урок",
            created_by: session.userId.startsWith("demo-") ? null : session.userId,
          }),
        });
        lessonId = ins[0]?.id;
      }
      // Пробная отметка (записан, урок ещё не проведён — status unknown).
      await upsertAttendanceRows([{
        lesson_id: lessonId, student_id: req.params.id, status: "unknown",
        is_trial: true, comment: note || null, marked_at: new Date().toISOString(),
      }]);
      // Запись на пробный АКТУАЛИЗИРУЕТ статус (ТЗ): снимаем ЛЮБОЙ ручной статус
      // («Каникулы», «…оплатит» и т.п.) — иначе он (приоритетный) заслонит запись.
      // Статус → trial, но НЕ затираем active у ученика с действующим абонементом
      // (пробный в другую группу/направление не делает активного «пробным»).
      const trialUpd: Record<string, any> = {};
      if (st.status !== "active") trialUpd.status = "trial";
      if (String(st.manual_status || "").trim()) { trialUpd.manual_status = null; trialUpd.pay_promise_date = null; }
      if (!Object.keys(trialUpd).length) trialUpd.status = st.status; // PATCH не пустой
      await supabaseFetch("students", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(trialUpd),
      });
      // Приглашение на пробный закрывает строку листа ожидания (ТЗ: «не переводится из ЛО»).
      try {
        await supabaseFetch("student_waitlist",
          `student_id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&removed_at=is.null`,
          { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ removed_at: new Date().toISOString(), removed_reason: "invited_trial" }) }
        );
      } catch { /* закрытие ЛО не критично для записи на пробный */ }
      res.json({ ok: true, lessonId, date, startsAt });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось записать на пробный урок" });
    }
  });

  // Удалить запись на пробный урок (ТЗ заказчика: раньше удалить было нельзя вообще).
  // Ищем пробные отметки ученика по ДАТЕ урока (а не по lesson_id с клиента —
  // клиентский attendance ключуется датой и id урока не знает).
  app.delete("/api/mvp/students/:id/trial", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const date = String((req.body || {}).date || "").slice(0, 10);
    if (!date) return res.status(400).json({ error: "Укажите дату пробного урока" });
    const st = (await supabaseFetch<any[]>("students", `select=id,branch_id,status&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`).catch(() => [] as any[]))[0];
    if (!st) return res.status(404).json({ error: "Ученик не найден" });
    if (!canSeeBranch(session, st.branch_id)) return res.status(403).json({ error: "Branch access denied" });
    try {
      // Все пробные отметки ученика + их уроки; фильтруем по дате starts_at.
      const marks = await supabaseFetch<any[]>("attendance", `select=id,lesson_id&student_id=eq.${req.params.id}&is_trial=eq.true`);
      if (!marks.length) return res.status(404).json({ error: "Пробные уроки не найдены" });
      const lessonIds = [...new Set(marks.map((m) => m.lesson_id).filter(Boolean))];
      const lessons = lessonIds.length
        ? await supabaseFetch<any[]>("schedule_lessons", `select=id,starts_at,comment&id=in.(${lessonIds.join(",")})`)
        : [];
      const onDate = new Set(lessons.filter((l) => String(l.starts_at || "").slice(0, 10) === date).map((l) => l.id));
      const toDelete = marks.filter((m) => onDate.has(m.lesson_id));
      if (!toDelete.length) return res.status(404).json({ error: "На эту дату пробный урок не найден" });
      for (const m of toDelete) {
        await supabaseFetch("attendance", `id=eq.${m.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }
      // Урок, созданный специально под пробный, без других отметок — подчищаем.
      for (const l of lessons) {
        if (!onDate.has(l.id) || l.comment !== "Пробный урок") continue;
        const rest = await supabaseFetch<any[]>("attendance", `select=id&lesson_id=eq.${l.id}&limit=1`).catch(() => [{ id: "keep" }]);
        if (!rest.length) {
          await supabaseFetch("schedule_lessons", `id=eq.${l.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
        }
      }
      // Пробных не осталось и нет активных абонементов → ученик снова «новый лид».
      if (st.status === "trial") {
        const remaining = await supabaseFetch<any[]>("attendance", `select=id&student_id=eq.${req.params.id}&is_trial=eq.true&limit=1`).catch(() => [{ id: "keep" }]);
        const activeSubs = await supabaseFetch<any[]>("student_subscriptions", `select=id&student_id=eq.${req.params.id}&status=eq.active&limit=1`).catch(() => [{ id: "keep" }]);
        if (!remaining.length && !activeSubs.length) {
          await supabaseFetch("students", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, {
            method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "lead" }),
          }).catch(() => {});
        }
      }
      res.json({ ok: true, removed: toDelete.length });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить пробный урок" });
    }
  });

  app.post("/api/mvp/attendance", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId || !payload.status || (!payload.lessonId && !payload.date)) {
      return res.status(400).json({ error: "studentId, status and lessonId/date are required" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }

    let lessonId = payload.lessonId;
    if (!lessonId) {
      const studentsRaw = await supabaseFetch<any[]>("students", `select=*&id=eq.${payload.studentId}`);
      const student = studentsRaw[0];
      if (!student) return res.status(404).json({ error: "Student not found" });
      if (!canSeeBranch(session, student.branch_id)) {
        return res.status(403).json({ error: "Branch access denied" });
      }
      const start = new Date(`${payload.date}T00:00:00.000Z`).toISOString();
      const endDate = new Date(`${payload.date}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const end = endDate.toISOString();
      if (!student.group_id) return res.status(400).json({ error: "У ученика не указана группа — отметка ставится по уроку группы" });
      const lessons = await supabaseFetch<any[]>(
        "schedule_lessons",
        `select=*&group_id=eq.${student.group_id}&starts_at=gte.${encodeURIComponent(start)}&starts_at=lt.${encodeURIComponent(end)}&limit=1`
      );
      lessonId = lessons[0]?.id;
      if (!lessonId) {
        // Журнал показывает даты по расписанию группы, а строки уроков заведены не
        // на все даты — раньше отметка падала с 404 и «не сохранялась». Создаём урок
        // сами, время берём из расписания группы («09:00–11:00»).
        const grp = (await supabaseFetch<any[]>("groups", `select=id,branch_id,teacher_id,schedule_time&id=eq.${student.group_id}&limit=1`))[0];
        const hm = (s: string) => /^\d{1,2}:\d{2}$/.test(s || "") ? `${s.split(":")[0].padStart(2, "0")}:${s.split(":")[1]}` : "";
        const [rawA, rawB] = String(grp?.schedule_time || "").split(/[–—-]/).map((s: string) => s.trim());
        const startHm = hm(rawA) || "18:00";
        let endHm = hm(rawB) || "";
        if (!endHm || endHm <= startHm) { const [h, m] = startHm.split(":").map(Number); endHm = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
        const created = await supabaseFetch<any[]>("schedule_lessons", "", {
          method: "POST",
          body: JSON.stringify({
            branch_id: student.branch_id,
            group_id: student.group_id,
            teacher_id: student.teacher_id || grp?.teacher_id || null,
            starts_at: `${payload.date}T${startHm}:00.000Z`,
            ends_at: `${payload.date}T${endHm}:00.000Z`,
            status: "scheduled",
            created_by: session.userId.startsWith("demo-") ? null : session.userId,
          }),
        });
        lessonId = created[0]?.id;
        if (!lessonId) return res.status(500).json({ error: "Не удалось создать урок для отметки" });
      }
    }

    const rows = await upsertAttendanceRows([{
      lesson_id: lessonId,
      student_id: payload.studentId,
      status: payload.status === "unmarked" ? "unknown" : payload.status,
      marked_by: session.userId.startsWith("demo-") ? null : session.userId,
      marked_at: new Date().toISOString(),
      comment: payload.comment || null,
      absence_reason: payload.absenceReason || null,
      is_trial: Boolean(payload.isTrial) || undefined,
      trial_outcome: payload.trialOutcome || undefined,
    }]);

    // If present, create a debit transaction (lesson write-off)
    if (payload.status === "present") {
        await supabaseFetch<any[]>("finance_transactions", "", {
            method: "POST",
            body: JSON.stringify({
                organization_id: session.organizationId,
                student_id: payload.studentId,
                amount: 0, 
                type: "debit",
                description: `Списание за занятие ${payload.date || 'сегодня'}`
            })
        });
    }

    res.json({ attendance: rows[0] });
  });

  app.post("/api/mvp/notifications", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.body || !payload.recipient) {
      return res.status(400).json({ error: "recipient and body are required" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }

    const inserted = await supabaseFetch<any[]>("notifications", "", {
      method: "POST",
      body: JSON.stringify({
        branch_id: payload.branchId || session.dbBranchId,
        student_id: payload.studentId || null,
        created_by: session.userId.startsWith("demo-") ? null : session.userId,
        channel: payload.channel || "whatsapp",
        recipient: payload.recipient,
        subject: payload.subject || null,
        body: payload.body,
        status: "queued"
      })
    });
    res.status(201).json({ notification: inserted[0] });
  });

  // --- Branch management (owner only) ---
  const ownerOnly = (session: MvpSession, res: express.Response) => {
    if (session.role !== "owner") {
      res.status(403).json({ error: "Только владелец может управлять филиалами" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };

  app.post("/api/mvp/branches", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !payload.city) {
      return res.status(400).json({ error: "name and city are required" });
    }
    try {
      const inserted = await supabaseFetch<any[]>("branches", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          name: payload.name,
          city: payload.city,
          address: payload.address || "",
          phone: payload.phone || null,
          manager_name: payload.managerName || null,
          comment: payload.comment || null,
          status: payload.status === "archived" ? "archived" : "active"
        })
      });
      res.status(201).json({ branch: inserted[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать филиал" });
    }
  });

  app.patch("/api/mvp/branches/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    const updates: Record<string, unknown> = {};
    (["name", "city", "address", "phone"] as const).forEach((key) => {
      if (payload[key] !== undefined) updates[key] = payload[key];
    });
    if (payload.managerName !== undefined) updates.manager_name = payload.managerName || null;
    if (payload.comment !== undefined) updates.comment = payload.comment || null;
    if (payload.status !== undefined) updates.status = payload.status === "archived" ? "archived" : "active";
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Нет полей для обновления" });
    }
    try {
      const rows = await supabaseFetch<any[]>(
        "branches",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Филиал не найден" });
      res.json({ branch: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить филиал" });
    }
  });

  app.delete("/api/mvp/branches/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    try {
      // Soft delete: archive so dependent records (halls/groups/students) are preserved.
      const rows = await supabaseFetch<any[]>(
        "branches",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Филиал не найден" });
      res.json({ branch: rows[0], archived: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить филиал" });
    }
  });

  // --- Hall management (owner / admin / branch_manager) — ТЗ §6 ---
  const hallAccess = (session: MvpSession, res: express.Response) => {
    if (!["owner", "admin", "branch_manager"].includes(session.role)) {
      res.status(403).json({ error: "Недостаточно прав для управления залами" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };

  app.post("/api/mvp/halls", async (req, res) => {
    const session = getSession(req);
    if (!hallAccess(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !payload.branchId) {
      return res.status(400).json({ error: "name и branchId обязательны" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      const inserted = await supabaseFetch<any[]>("halls", "", {
        method: "POST",
        body: JSON.stringify({
          branch_id: payload.branchId,
          name: String(payload.name).trim(),
          capacity: payload.capacity ?? 0,
          description: payload.description || null,
          status: payload.status === "archived" ? "archived" : "active",
        }),
      });
      const h = inserted[0];
      res.status(201).json({ hall: { id: h.id, branchId: h.branch_id, name: h.name, capacity: h.capacity || 0, description: h.description || "", status: h.status || "active" } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать зал" });
    }
  });

  app.patch("/api/mvp/halls/:id", async (req, res) => {
    const session = getSession(req);
    if (!hallAccess(session, res)) return;
    const payload = req.body || {};
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = String(payload.name).trim();
    if (payload.branchId !== undefined) {
      if (!canSeeBranch(session, payload.branchId)) return res.status(403).json({ error: "Branch access denied" });
      updates.branch_id = payload.branchId;
    }
    if (payload.capacity !== undefined) updates.capacity = payload.capacity ?? 0;
    if (payload.description !== undefined) updates.description = payload.description || null;
    if (payload.status !== undefined) updates.status = payload.status === "archived" ? "archived" : "active";
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("halls", `id=eq.${req.params.id}`, {
        method: "PATCH", body: JSON.stringify(updates),
      });
      if (!rows[0]) return res.status(404).json({ error: "Зал не найден" });
      const h = rows[0];
      res.json({ hall: { id: h.id, branchId: h.branch_id, name: h.name, capacity: h.capacity || 0, description: h.description || "", status: h.status || "active" } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить зал" });
    }
  });

  app.delete("/api/mvp/halls/:id", async (req, res) => {
    const session = getSession(req);
    if (!hallAccess(session, res)) return;
    try {
      // Мягкое удаление: архивируем, чтобы привязанные группы не потеряли историю.
      const rows = await supabaseFetch<any[]>("halls", `id=eq.${req.params.id}`, {
        method: "PATCH", body: JSON.stringify({ status: "archived" }),
      });
      if (!rows[0]) return res.status(404).json({ error: "Зал не найден" });
      res.json({ hall: { id: rows[0].id }, archived: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить зал" });
    }
  });

  // --- Teacher / staff management (owner only) ---
  // Teachers are rows in the `users` table with role = "teacher". The owner can also
  // grant elevated rights by changing the role (admin / branch_manager) and assign a branch.
  const allowedRoles = ["teacher", "admin", "branch_manager", "owner"] as const;
  const normalizeRole = (value: unknown) => {
    const role = String(value || "teacher");
    return (allowedRoles as readonly string[]).includes(role) ? role : "teacher";
  };

  app.post("/api/mvp/teachers", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !String(payload.name).trim()) {
      return res.status(400).json({ error: "Имя обязательно" });
    }
    try {
      const inserted = await supabaseFetch<any[]>("users", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || null,
          role: normalizeRole(payload.role),
          full_name: String(payload.name).trim(),
          phone: payload.phone || null,
          email: payload.email || `staff-${Date.now()}@echogor.demo`,
          password_hash: "demo-only",
          specialization: payload.specialization || null,
          status: "active"
        })
      });
      res.status(201).json({ teacher: mapDbUserToTeacher(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать преподавателя" });
    }
  });

  app.patch("/api/mvp/teachers/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    const payload = req.body || {};
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.full_name = String(payload.name).trim();
    if (payload.phone !== undefined) updates.phone = payload.phone || null;
    if (payload.specialization !== undefined) updates.specialization = payload.specialization || null;
    if (payload.branchId !== undefined) updates.branch_id = payload.branchId || null;
    if (payload.role !== undefined) updates.role = normalizeRole(payload.role);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Нет полей для обновления" });
    }
    try {
      const rows = await supabaseFetch<any[]>(
        "users",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Сотрудник не найден" });
      res.json({ teacher: mapDbUserToTeacher(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить преподавателя" });
    }
  });

  app.delete("/api/mvp/teachers/:id", async (req, res) => {
    const session = getSession(req);
    if (!ownerOnly(session, res)) return;
    try {
      // Soft delete: archive so groups/lessons history is preserved.
      const rows = await supabaseFetch<any[]>(
        "users",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Сотрудник не найден" });
      res.json({ teacher: mapDbUserToTeacher(rows[0]), archived: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить преподавателя" });
    }
  });

  // ───────────────── Каталог событий кавказского танца (турниры + концерты) ──

  // Список событий. Фильтры: ?type=tournament|concert &audience=kids|adults|all
  //   &country=KZ,RU,... &status=new|published|hidden &q=поиск
  app.get("/api/mvp/dance-events", async (req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const parts = ["select=*", "order=start_date.asc.nullslast"];
    const { type, audience, country, status, q } = req.query as Record<string, string>;
    if (type) parts.push(`event_type=eq.${type}`);
    if (audience) parts.push(`audience=eq.${audience}`);
    if (country) parts.push(`country=in.(${country})`);
    if (status) parts.push(`status=eq.${status}`);
    if (q) parts.push(`title=ilike.*${encodeURIComponent(q)}*`);
    try {
      const rows = await supabaseFetch<any[]>("dance_events", parts.join("&"));
      res.json({ events: rows });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить события" });
    }
  });

  // Запуск парсинга (только владелец). Тело: { dryRun?: boolean, maxDetailFetches?: number }
  app.post("/api/mvp/dance-events/parse", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Только владелец может запускать парсинг" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { dryRun, maxDetailFetches, sources, maxMs } = req.body || {};
    try {
      const result = await runParser({
        dryRun: Boolean(dryRun),
        maxDetailFetches: Number(maxDetailFetches) || undefined,
        sources: Array.isArray(sources) && sources.length ? sources : undefined,
        maxMs: Number(maxMs) || 45000, // под лимит serverless-функции
        log: (m) => console.log("[dance-events]", m),
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Парсинг не выполнен" });
    }
  });

  // Ручное добавление турнира/концерта (для событий вне билетных систем).
  app.post("/api/mvp/dance-events", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Только владелец может добавлять события" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: "title обязателен" });
    const candidate: RawCandidate = {
      title: String(b.title),
      url: b.url || "",
      source: "manual",
      sourceUid: b.sourceUid || undefined,
      dateText: b.dateText || undefined,
      city: b.city || undefined,
      country: b.country || undefined,
      venue: b.venue || undefined,
      organizer: b.organizer || undefined,
      priceText: b.price || undefined,
      image: b.image || undefined,
      ageText: b.ageText || undefined,
      raw: b,
    };
    const ev = normalize(candidate);
    // Явные переопределения из формы (если оператор задал тип/аудиторию вручную).
    if (b.eventType) ev.event_type = b.eventType as EventType;
    if (b.audience) ev.audience = b.audience as Audience;
    if (b.regDeadline) ev.reg_deadline = b.regDeadline;
    if (b.ageCategories) ev.age_categories = b.ageCategories;
    if (b.disciplines) ev.disciplines = b.disciplines;
    try {
      const n = await supabaseUpsert([ev]);
      res.status(201).json({ event: ev, upserted: n });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось сохранить событие" });
    }
  });

  // Обновление события (статус публикации/скрытия и базовые поля). Только владелец.
  app.patch("/api/mvp/dance-events/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Только владелец может менять события" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const b = req.body || {};
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ["status", "event_type", "audience", "title", "city", "country", "venue", "organizer", "price", "url", "image", "age_categories", "disciplines"]) {
      if (b[key] !== undefined) updates[key] = b[key];
    }
    for (const key of ["start_date", "end_date", "reg_deadline"]) {
      if (b[key] !== undefined) updates[key] = b[key] || null;
    }
    try {
      const rows = await supabaseFetch<any[]>("dance_events", `id=eq.${req.params.id}`, {
        method: "PATCH", body: JSON.stringify(updates),
      });
      if (!rows[0]) return res.status(404).json({ error: "Событие не найдено" });
      res.json({ event: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить событие" });
    }
  });

  // ───────────────── Groups CRUD (owner / admin / branch_manager) ─────────────

  function mapDbGroup(row: any, studentCount = 0) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      branchId: row.branch_id,
      name: row.name,
      teacherId: row.teacher_id || "",
      hallId: row.hall_id || "",
      scheduleText: [row.schedule_days, row.schedule_time].filter(Boolean).join(" ") || "По расписанию",
      days: row.schedule_days ? String(row.schedule_days).split(",").map((d: string) => d.trim()) : [],
      time: row.schedule_time || "",
      ageGroup: row.age_from != null && row.age_to != null ? `${row.age_from}–${row.age_to} лет` : "Все возрасты",
      level: row.level || "MVP",
      status: row.status || "active",
      startDate: row.start_date || null,
      endDate: row.end_date || null,
      // 'group' — обычная группа; 'individual' — график индивидуальных занятий.
      format: row.format === "individual" ? "individual" : "group",
      // Двойной маппинг (bootstrap + mapDbGroup): поля должны совпадать в ОБОИХ.
      capacity: row.capacity ?? 0,
      ageFrom: row.age_from ?? null,
      ageTo: row.age_to ?? null,
      enrollmentOpen: row.enrollment_open !== false,
      studentCount,
    };
  }

  const groupAccess = (session: MvpSession, res: express.Response) => {
    if (!["owner", "admin", "branch_manager"].includes(session.role)) {
      res.status(403).json({ error: "Недостаточно прав для управления группами" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };

  app.post("/api/mvp/groups", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    const payload = req.body || {};
    if (!payload.name || !payload.branchId) {
      return res.status(400).json({ error: "name и branchId обязательны" });
    }
    if (!canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      // Порядок внесения данных: филиал → залы → группы. Без залов группу не создать.
      const branchHalls = await supabaseFetch<any[]>("halls", `branch_id=eq.${payload.branchId}&select=id,status`);
      const hasActiveHall = branchHalls.some((h) => String(h.status || "active") === "active");
      if (!hasActiveHall) {
        return res.status(400).json({ error: "В этом филиале ещё нет залов. Сначала добавьте зал (Филиалы → Залы), затем создавайте группы." });
      }
      const inserted = await supabaseFetch<any[]>("groups", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId,
          hall_id: payload.hallId || null,
          teacher_id: payload.teacherId || null,
          name: String(payload.name).trim(),
          age_from: payload.ageFrom ?? null,
          age_to: payload.ageTo ?? null,
          capacity: payload.capacity ?? 0,
          level: payload.level || "Начинающие",
          schedule_days: payload.scheduleDays || null,
          schedule_time: payload.scheduleTime || null,
          start_date: payload.startDate || null,
          end_date: payload.endDate || null,
          format: payload.format === "individual" ? "individual" : "group",
          status: "active",
        }),
      });
      res.status(201).json({ group: mapDbGroup(inserted[0]) });
    } catch (error: any) {
      const raw = String(error?.message || "");
      if (raw.includes("23505")) {
        return res.status(409).json({ error: `Группа «${String(payload.name).trim()}» уже есть в этом филиале. Выберите другое название.` });
      }
      res.status(400).json({ error: raw || "Не удалось создать группу" });
    }
  });

  app.patch("/api/mvp/groups/:id", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    const payload = req.body || {};
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = String(payload.name).trim();
    if (payload.branchId !== undefined) {
      if (!canSeeBranch(session, payload.branchId)) return res.status(403).json({ error: "Branch access denied" });
      updates.branch_id = payload.branchId;
    }
    if (payload.hallId !== undefined) updates.hall_id = payload.hallId || null;
    if (payload.teacherId !== undefined) updates.teacher_id = payload.teacherId || null;
    if (payload.ageFrom !== undefined) updates.age_from = payload.ageFrom ?? null;
    if (payload.ageTo !== undefined) updates.age_to = payload.ageTo ?? null;
    if (payload.capacity !== undefined) updates.capacity = payload.capacity ?? 0;
    if (payload.level !== undefined) updates.level = payload.level || null;
    if (payload.scheduleDays !== undefined) updates.schedule_days = payload.scheduleDays || null;
    if (payload.scheduleTime !== undefined) updates.schedule_time = payload.scheduleTime || null;
    if (payload.startDate !== undefined) updates.start_date = payload.startDate || null;
    if (payload.endDate !== undefined) updates.end_date = payload.endDate || null;
    if (payload.format !== undefined) updates.format = payload.format === "individual" ? "individual" : "group";
    if (payload.enrollmentOpen !== undefined) updates.enrollment_open = Boolean(payload.enrollmentOpen);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      // ТЗ §10: при смене педагога фиксируем старого/нового в журнале.
      let prevTeacherId: string | null = null;
      if (payload.teacherId !== undefined) {
        const current = await supabaseFetch<any[]>("groups", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&select=teacher_id`);
        prevTeacherId = current[0]?.teacher_id || null;
      }
      const rows = await supabaseFetch<any[]>(
        "groups",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Группа не найдена" });
      const newTeacherId = (updates.teacher_id as string | null | undefined);
      if (payload.teacherId !== undefined && (newTeacherId || null) !== prevTeacherId) {
        try {
          await supabaseFetch("group_teacher_history", "", {
            method: "POST",
            body: JSON.stringify({
              organization_id: session.organizationId,
              group_id: req.params.id,
              old_teacher_id: prevTeacherId,
              new_teacher_id: newTeacherId || null,
              changed_by: session.userId || null,
            }),
          });
        } catch { /* журнал не должен ломать обновление группы */ }
      }
      res.json({ group: mapDbGroup(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить группу" });
    }
  });

  app.delete("/api/mvp/groups/:id", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    try {
      // Нельзя архивировать группу с действующими учениками.
      const activeStudents = await supabaseFetch<any[]>(
        "students",
        `select=id&group_id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&status=neq.archived&status=neq.left&archived_at=is.null`
      );
      if (activeStudents.length) {
        return res.status(409).json({ error: `Нельзя архивировать: в группе ${activeStudents.length} действующих учеников. Сначала переведите их в другую группу.` });
      }
      // Нельзя архивировать группу с действующими (проданными) абонементами.
      const today = new Date().toISOString().slice(0, 10);
      const activeSubs = await supabaseFetch<any[]>(
        "student_subscriptions",
        `select=id&group_id=eq.${req.params.id}&status=eq.active&or=(ends_on.is.null,ends_on.gte.${today})`
      );
      if (activeSubs.length) {
        return res.status(409).json({ error: `Нельзя архивировать: в группе ${activeSubs.length} действующих абонементов.` });
      }
      const rows = await supabaseFetch<any[]>(
        "groups",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Группа не найдена" });
      // Отменяем будущие уроки архивной группы, чтобы они не висели в расписании.
      await supabaseFetch("schedule_lessons", `group_id=eq.${req.params.id}&starts_at=gte.${new Date().toISOString()}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "cancelled" }),
      }).catch(() => { /* не критично */ });
      res.json({ group: mapDbGroup(rows[0]), archived: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить группу" });
    }
  });

  // Список архивных групп (вкладка «Архив групп»).
  app.get("/api/mvp/groups/archived", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    if (!supabaseEnabled) return res.json({ groups: [] });
    try {
      const rows = await supabaseFetch<any[]>(
        "groups",
        `select=*&organization_id=eq.${session.organizationId}&status=eq.archived&order=created_at.desc`
      );
      res.json({ groups: rows.filter((r) => canSeeBranch(session, r.branch_id)).map((r) => mapDbGroup(r)) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить архив групп" });
    }
  });

  // Восстановить группу из архива.
  app.post("/api/mvp/groups/:id/restore", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const rows = await supabaseFetch<any[]>(
        "groups",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "active" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Группа не найдена" });
      res.json({ group: mapDbGroup(rows[0]), restored: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось восстановить группу" });
    }
  });

  // Удалить архивную группу НАВСЕГДА (только из архива). Отвязываем зависимости.
  app.delete("/api/mvp/groups/:id/permanent", async (req, res) => {
    const session = getSession(req);
    if (!groupAccess(session, res)) return;
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const existing = (await supabaseFetch<any[]>("groups", `select=id,status,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`))[0];
      if (!existing) return res.status(404).json({ error: "Группа не найдена" });
      if (String(existing.status) !== "archived") return res.status(400).json({ error: "Удалить навсегда можно только группу из архива." });
      // Отвязываем зависимости, чтобы удаление не упало на внешних ключах.
      await supabaseFetch("schedule_lessons", `group_id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
      await supabaseFetch("students", `group_id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ group_id: null }) }).catch(() => {});
      await supabaseFetch("student_subscriptions", `group_id=eq.${req.params.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ group_id: null }) }).catch(() => {});
      await supabaseFetch("groups", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true, deleted: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить группу" });
    }
  });

  // ───────────────── Schedule (schedule_lessons) CRUD ──────────────────────────

  function mapDbLesson(row: any, extras: { groupName?: string; hallName?: string; teacherName?: string } = {}) {
    return {
      id: row.id,
      branchId: row.branch_id,
      groupId: row.group_id,
      groupName: extras.groupName || row.group_name || null,
      teacherId: row.teacher_id || null,
      teacherName: extras.teacherName || row.teacher_name || null,
      hallId: row.hall_id || null,
      hallName: extras.hallName || row.hall_name || null,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status || "scheduled",
      topic: row.comment || null,
    };
  }

  // GET /api/mvp/schedule?branchId=...&groupId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
  app.get("/api/mvp/schedule", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { branchId, groupId, from, to } = req.query as Record<string, string>;
    // У schedule_lessons ДВА FK на users (created_by и teacher_id) — встраивание
    // users(...) неоднозначно и даёт 400. Явно указываем связь по teacher_id.
    const parts = ["select=*,groups(name,status),halls(name),users!schedule_lessons_teacher_id_fkey(full_name)", "order=starts_at.asc"];
    if (branchId) parts.push(`branch_id=eq.${branchId}`);
    else if (session.role !== "owner" && session.dbBranchId) parts.push(`branch_id=eq.${session.dbBranchId}`);
    if (groupId) parts.push(`group_id=eq.${groupId}`);
    if (from) parts.push(`starts_at=gte.${encodeURIComponent(from)}`);
    if (to) parts.push(`starts_at=lte.${encodeURIComponent(to)}`);
    // teacher sees only their lessons
    if (session.role === "teacher") parts.push(`teacher_id=eq.${session.userId}`);
    try {
      const rows = await supabaseFetch<any[]>("schedule_lessons", parts.join("&"));
      // Уроки архивных групп в расписании не показываем.
      const lessons = rows.filter((row) => row.groups?.status !== "archived").map((row) =>
        mapDbLesson(row, {
          groupName: row.groups?.name,
          hallName: row.halls?.name,
          teacherName: row.users?.full_name,
        })
      );
      res.json({ lessons });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить расписание" });
    }
  });

  const scheduleAccess = (session: MvpSession, res: express.Response) => {
    if (!["owner", "admin", "branch_manager"].includes(session.role)) {
      res.status(403).json({ error: "Недостаточно прав для управления расписанием" });
      return false;
    }
    if (!supabaseEnabled) {
      res.status(503).json({ error: "Supabase is not configured" });
      return false;
    }
    return true;
  };

  app.post("/api/mvp/schedule", async (req, res) => {
    const session = getSession(req);
    if (!scheduleAccess(session, res)) return;
    const payload = req.body || {};
    if (!payload.groupId || !payload.startsAt || !payload.endsAt) {
      return res.status(400).json({ error: "groupId, startsAt и endsAt обязательны" });
    }
    // CHECK schedule_lessons_time_valid: начало должно быть раньше конца.
    if (new Date(payload.startsAt).getTime() >= new Date(payload.endsAt).getTime()) {
      return res.status(400).json({ error: "Время окончания урока должно быть позже времени начала." });
    }
    try {
      // Resolve branchId from group if not provided
      let branchId = payload.branchId;
      if (!branchId) {
        const groups = await supabaseFetch<any[]>("groups", `select=branch_id&id=eq.${payload.groupId}`);
        branchId = groups[0]?.branch_id;
      }
      if (!canSeeBranch(session, branchId)) return res.status(403).json({ error: "Branch access denied" });
      const inserted = await supabaseFetch<any[]>("schedule_lessons", "", {
        method: "POST",
        body: JSON.stringify({
          branch_id: branchId,
          group_id: payload.groupId,
          teacher_id: payload.teacherId || null,
          hall_id: payload.hallId || null,
          starts_at: payload.startsAt,
          ends_at: payload.endsAt,
          status: "scheduled",
          comment: payload.topic || null,
          created_by: session.userId.startsWith("demo-") ? null : session.userId,
        }),
      });
      res.status(201).json({ lesson: mapDbLesson(inserted[0]) });
    } catch (error: any) {
      const raw = String(error?.message || "");
      if (raw.includes("23514")) return res.status(400).json({ error: "Время окончания урока должно быть позже начала." });
      if (raw.includes("22P02")) return res.status(400).json({ error: "Некорректные данные урока — проверьте выбранные филиал/группу/педагога и дату." });
      if (raw.includes("23503")) return res.status(400).json({ error: "Выбранная группа/зал/педагог не найдены." });
      res.status(400).json({ error: raw || "Не удалось создать урок" });
    }
  });

  app.patch("/api/mvp/schedule/:id", async (req, res) => {
    const session = getSession(req);
    if (!scheduleAccess(session, res)) return;
    const payload = req.body || {};
    const updates: Record<string, unknown> = {};
    if (payload.startsAt !== undefined) updates.starts_at = payload.startsAt;
    if (payload.endsAt !== undefined) updates.ends_at = payload.endsAt;
    if (payload.teacherId !== undefined) updates.teacher_id = payload.teacherId || null;
    if (payload.hallId !== undefined) updates.hall_id = payload.hallId || null;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.topic !== undefined) updates.comment = payload.topic || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>(
        "schedule_lessons",
        `id=eq.${req.params.id}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Урок не найден" });
      res.json({ lesson: mapDbLesson(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить урок" });
    }
  });

  app.delete("/api/mvp/schedule/:id", async (req, res) => {
    const session = getSession(req);
    if (!scheduleAccess(session, res)) return;
    try {
      const rows = await supabaseFetch<any[]>(
        "schedule_lessons",
        `id=eq.${req.params.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Урок не найден" });
      res.json({ lesson: mapDbLesson(rows[0]), cancelled: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось отменить урок" });
    }
  });

  // ===== Задачи администратора (tasks) =====
  app.post("/api/mvp/tasks", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.title || !String(payload.title).trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const branchId = payload.branchId ?? session.dbBranchId ?? null;
    if (branchId && !canSeeBranch(session, branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    try {
      const inserted = await supabaseFetch<any[]>("tasks", "", {
        method: "POST",
        body: JSON.stringify({
          branch_id: branchId,
          student_id: payload.studentId || null,
          assigned_to: payload.assignedTo || null,
          created_by: session.userId,
          title: String(payload.title).trim(),
          description: payload.description || null,
          status: payload.status || "new",
          priority: payload.priority || "normal",
          due_at: payload.dueAt || null
        })
      });
      res.status(201).json({ task: mapDbTask(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать задачу" });
    }
  });

  app.patch("/api/mvp/tasks/:id", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    if (payload.branchId && !canSeeBranch(session, payload.branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    const updates: Record<string, unknown> = {};
    if (payload.title !== undefined) updates.title = String(payload.title).trim();
    if (payload.description !== undefined) updates.description = payload.description || null;
    if (payload.status !== undefined) {
      updates.status = payload.status;
      updates.completed_at = payload.status === "done" ? new Date().toISOString() : null;
    }
    if (payload.priority !== undefined) updates.priority = payload.priority;
    if (payload.dueAt !== undefined) updates.due_at = payload.dueAt || null;
    if (payload.studentId !== undefined) updates.student_id = payload.studentId || null;
    if (payload.assignedTo !== undefined) updates.assigned_to = payload.assignedTo || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("tasks", `id=eq.${req.params.id}`, { method: "PATCH", body: JSON.stringify(updates) });
      if (!rows[0]) return res.status(404).json({ error: "Задача не найдена" });
      res.json({ task: mapDbTask(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить задачу" });
    }
  });

  app.delete("/api/mvp/tasks/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("tasks", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить задачу" });
    }
  });

  // ===== Справочник: абонементы (subscription_plans) =====
  app.post("/api/mvp/subscription-plans", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.name || !String(payload.name).trim()) return res.status(400).json({ error: "name is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch<any[]>("subscription_plans", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          name: String(payload.name).trim(),
          lessons_count: Number(payload.lessonsCount) || 0,
          duration_days: Number(payload.durationDays) || 30,
          price: Number(payload.price) || 0,
          status: payload.status || "active",
          billing_mode: payload.billingMode === "lessons" ? "lessons" : "month",
          format: payload.format === "individual" ? "individual" : "group",
          branch_id: payload.branchId || null
        })
      });
      res.status(201).json({ plan: mapDbPlan(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать абонемент" });
    }
  });

  app.patch("/api/mvp/subscription-plans/:id", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = String(payload.name).trim();
    if (payload.lessonsCount !== undefined) updates.lessons_count = Number(payload.lessonsCount) || 0;
    if (payload.durationDays !== undefined) updates.duration_days = Number(payload.durationDays) || 0;
    if (payload.price !== undefined) updates.price = Number(payload.price) || 0;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.billingMode !== undefined) updates.billing_mode = payload.billingMode === "lessons" ? "lessons" : "month";
    if (payload.format !== undefined) updates.format = payload.format === "individual" ? "individual" : "group";
    if (payload.branchId !== undefined) updates.branch_id = payload.branchId || null;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("subscription_plans", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(updates) });
      if (!rows[0]) return res.status(404).json({ error: "Абонемент не найден" });
      res.json({ plan: mapDbPlan(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить абонемент" });
    }
  });

  app.delete("/api/mvp/subscription-plans/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const scope = `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`;
    try {
      // ТЗ заказчика: тариф с продажами удалять НЕЛЬЗЯ — честный отказ,
      // а не тихая архивация (история и отчёты держатся на plan_id).
      const sales = await supabaseFetch<any[]>(
        "student_subscriptions",
        `select=id&plan_id=eq.${req.params.id}&limit=1`
      );
      if (sales.length > 0) {
        return res.status(409).json({ error: "По этому тарифу уже есть продажи — удалить нельзя, иначе сломаются история и отчёты. Если тариф больше не нужен, создайте новый, а этот перестаньте использовать." });
      }
      await supabaseFetch("subscription_plans", scope, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error?.message || "Не удалось удалить абонемент" });
    }
  });

  // ===== Справочник: рекламные источники (lead_sources) =====
  app.get("/api/mvp/lead-sources", async (_req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const rows = await supabaseFetch<any[]>("lead_sources", "select=*&order=name.asc");
      res.json({ sources: rows.map(mapDbLeadSource) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить источники" });
    }
  });

  app.post("/api/mvp/lead-sources", async (req, res) => {
    const payload = req.body || {};
    if (!payload.name || !String(payload.name).trim()) return res.status(400).json({ error: "name is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch<any[]>("lead_sources", "", {
        method: "POST",
        body: JSON.stringify({ name: String(payload.name).trim(), status: payload.status || "active" })
      });
      res.status(201).json({ source: mapDbLeadSource(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать источник" });
    }
  });

  app.patch("/api/mvp/lead-sources/:id", async (req, res) => {
    const payload = req.body || {};
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = String(payload.name).trim();
    if (payload.status !== undefined) updates.status = payload.status;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("lead_sources", `id=eq.${req.params.id}`, { method: "PATCH", body: JSON.stringify(updates) });
      if (!rows[0]) return res.status(404).json({ error: "Источник не найден" });
      res.json({ source: mapDbLeadSource(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить источник" });
    }
  });

  app.delete("/api/mvp/lead-sources/:id", async (req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      // FK в базе — ON DELETE SET NULL: без этой проверки источник удалился бы
      // молча, обнулив его у учеников (потеря статистики рекламы).
      const used = await supabaseFetch<any[]>("students", `select=id&source_id=eq.${req.params.id}&limit=1`);
      if (used.length > 0) {
        return res.status(409).json({ error: "Этот источник уже указан у учеников — удалить нельзя, иначе потеряется статистика рекламы. Если источник больше не нужен, просто перестаньте его выбирать." });
      }
      await supabaseFetch("lead_sources", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить источник" });
    }
  });

  // Cron-эндпоинт для Vercel Cron (ежедневный авто-парсинг).
  // Защита: заголовок Authorization: Bearer <CRON_SECRET> (env). Vercel шлёт его автоматически.
  app.get("/api/cron/parse-dance-events", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const result = await runParser({ maxMs: 55000, log: (m) => console.log("[cron dance-events]", m) });
      res.json({ ranAt: new Date().toISOString(), ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Парсинг не выполнен" });
    }
  });

  // ============================================================
  // ПЕДАГОГИЧЕСКИЙ СЛОЙ ПРЕПОДАВАТЕЛЯ (миграция 009)
  // teacher_notes — заметки/похвала по ученику
  // homework      — домашние задания (индивид./групповые)
  // attendance/bulk — отметить всю группу за дату
  // ============================================================

  const authorId = (session: MvpSession) =>
    session.userId.startsWith("demo-") ? null : session.userId;

  // --- Заметки преподавателя по ученику ---
  app.get("/api/mvp/notes", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const studentId = String(req.query.studentId || "");
    try {
      const query = studentId
        ? `select=*&student_id=eq.${studentId}&order=created_at.desc`
        : `select=*&order=created_at.desc&limit=200`;
      const rows = await supabaseFetch<any[]>("teacher_notes", query);
      res.json({ notes: rows });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить заметки" });
    }
  });

  app.post("/api/mvp/notes", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId || !String(payload.content || "").trim()) {
      return res.status(400).json({ error: "studentId and content are required" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const kind = ["note", "praise", "concern"].includes(payload.kind) ? payload.kind : "note";
    try {
      const inserted = await supabaseFetch<any[]>("teacher_notes", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || session.dbBranchId,
          student_id: payload.studentId,
          author_id: authorId(session),
          kind,
          content: String(payload.content).trim(),
          is_private: Boolean(payload.isPrivate),
        }),
      });
      res.status(201).json({ note: inserted[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось добавить заметку" });
    }
  });

  app.patch("/api/mvp/notes/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const payload = req.body || {};
    const patch: Record<string, unknown> = {};
    if (payload.content !== undefined) patch.content = String(payload.content).trim();
    if (payload.kind !== undefined && ["note", "praise", "concern"].includes(payload.kind)) patch.kind = payload.kind;
    if (payload.isPrivate !== undefined) patch.is_private = Boolean(payload.isPrivate);
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("teacher_notes", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      res.json({ note: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить заметку" });
    }
  });

  app.delete("/api/mvp/notes/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("teacher_notes", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить заметку" });
    }
  });

  // --- Домашние задания ---
  app.get("/api/mvp/homework", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { studentId, groupId, status } = req.query as Record<string, string>;
    const filters = ["select=*", "order=created_at.desc"];
    if (studentId) filters.push(`student_id=eq.${studentId}`);
    if (groupId) filters.push(`group_id=eq.${groupId}`);
    if (status) filters.push(`status=eq.${status}`);
    try {
      const rows = await supabaseFetch<any[]>("homework", filters.join("&"));
      res.json({ homework: rows });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить задания" });
    }
  });

  app.post("/api/mvp/homework", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!String(payload.title || "").trim()) return res.status(400).json({ error: "title is required" });
    if (!payload.studentId && !payload.groupId) return res.status(400).json({ error: "studentId or groupId is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch<any[]>("homework", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || session.dbBranchId,
          student_id: payload.studentId || null,
          group_id: payload.groupId || null,
          author_id: authorId(session),
          title: String(payload.title).trim(),
          description: payload.description || null,
          video_url: payload.videoUrl || null,
          due_at: payload.dueAt || null,
          status: "assigned",
        }),
      });
      res.status(201).json({ homework: inserted[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось выдать задание" });
    }
  });

  app.patch("/api/mvp/homework/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const payload = req.body || {};
    const patch: Record<string, unknown> = {};
    if (payload.title !== undefined) patch.title = String(payload.title).trim();
    if (payload.description !== undefined) patch.description = payload.description;
    if (payload.dueAt !== undefined) patch.due_at = payload.dueAt;
    if (payload.videoUrl !== undefined) patch.video_url = payload.videoUrl;
    if (payload.submissionNote !== undefined) patch.submission_note = payload.submissionNote;
    if (payload.submissionVideoUrl !== undefined) patch.submission_video_url = payload.submissionVideoUrl;
    if (payload.gradeComment !== undefined) patch.grade_comment = payload.gradeComment;
    if (payload.status !== undefined && ["assigned", "submitted", "done", "archived"].includes(payload.status)) {
      patch.status = payload.status;
      if (payload.status === "submitted") patch.submitted_at = new Date().toISOString();
      if (payload.status === "done") patch.graded_at = new Date().toISOString();
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("homework", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      res.json({ homework: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить задание" });
    }
  });

  app.delete("/api/mvp/homework/:id", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("homework", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить задание" });
    }
  });

  // --- Массовая отметка посещаемости группы за дату ---
  app.post("/api/mvp/attendance/bulk", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    const status = payload.status || "present";
    if (!payload.groupId || !payload.date) {
      return res.status(400).json({ error: "groupId and date are required" });
    }
    if (!["present", "absent", "sick", "excused", "recalc", "trial", "unmarked"].includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      // 1) Находим (или создаём) занятие группы на эту дату.
      const start = new Date(`${payload.date}T00:00:00.000Z`).toISOString();
      const endDate = new Date(`${payload.date}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const end = endDate.toISOString();
      let lessons = await supabaseFetch<any[]>(
        "schedule_lessons",
        `select=*&group_id=eq.${payload.groupId}&starts_at=gte.${encodeURIComponent(start)}&starts_at=lt.${encodeURIComponent(end)}&limit=1`,
      );
      let lessonId = lessons[0]?.id;
      if (!lessonId) {
        const groups = await supabaseFetch<any[]>("groups", `select=*&id=eq.${payload.groupId}&limit=1`);
        const group = groups[0];
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!canSeeBranch(session, group.branch_id)) return res.status(403).json({ error: "Branch access denied" });
        const created = await supabaseFetch<any[]>("schedule_lessons", "", {
          method: "POST",
          body: JSON.stringify({
            branch_id: group.branch_id,
            group_id: group.id,
            teacher_id: group.teacher_id || authorId(session),
            starts_at: `${payload.date}T16:00:00.000Z`,
            ends_at: `${payload.date}T17:30:00.000Z`,
            status: "scheduled",
            created_by: authorId(session),
          }),
        });
        lessonId = created[0]?.id;
      }
      if (!lessonId) return res.status(500).json({ error: "Не удалось определить занятие" });

      // 2) Список учеников группы (или явный список из payload). Ученик занимается
      // в группе, если это его основная группа ИЛИ у него действующий абонемент
      // в этой группе (мульти-группы, ТЗ 2026-07-12).
      let studentIds: string[] = Array.isArray(payload.studentIds) ? payload.studentIds : [];
      if (studentIds.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        const [studs, subStuds] = await Promise.all([
          supabaseFetch<any[]>("students", `select=id&group_id=eq.${payload.groupId}`),
          supabaseFetch<any[]>("student_subscriptions", `select=student_id&group_id=eq.${payload.groupId}&status=eq.active&or=(ends_on.is.null,ends_on.gte.${today})`).catch(() => [] as any[]),
        ]);
        studentIds = [...new Set([...studs.map((s) => s.id), ...subStuds.map((s) => s.student_id)])];
      }
      if (studentIds.length === 0) return res.json({ marked: 0, lessonId });

      // 3) Upsert посещаемости пачкой.
      const rows = studentIds.map((sid) => ({
        lesson_id: lessonId,
        student_id: sid,
        status: status === "unmarked" ? "unknown" : status,
        marked_by: authorId(session),
        marked_at: new Date().toISOString(),
        absence_reason: payload.absenceReason || null,
      }));
      const upserted = await upsertAttendanceRows(rows);
      res.json({ marked: upserted.length, lessonId });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось отметить группу" });
    }
  });

  // ============================================================
  // РАЗДЕЛ «СПАСИБО» — безопасные реакции учеников (миграция 010)
  // ============================================================
  const SAFE_REACTION_KEYS = [
    "thanks_teacher", "liked_lesson", "was_interesting",
    "understood_move", "got_better", "want_more", "hard_but_tried",
  ];

  // Ученик записывает реакцию после занятия
  app.post("/api/mvp/reactions", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.reactionKey || !SAFE_REACTION_KEYS.includes(payload.reactionKey)) {
      return res.status(400).json({ error: "valid reactionKey is required" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const inserted = await supabaseFetch<any[]>("lesson_reactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: payload.branchId || session.dbBranchId,
          group_id: payload.groupId || null,
          student_id: payload.studentId || null,
          lesson_id: payload.lessonId || null,
          teacher_id: payload.teacherId || authorId(session),
          reaction_key: payload.reactionKey,
        }),
      });
      res.status(201).json({ reaction: inserted[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось сохранить реакцию" });
    }
  });

  // Агрегированная сводка реакций (для преподавателя/владельца)
  app.get("/api/mvp/reactions/summary", async (req, res) => {
    getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { from, to, groupId } = req.query as Record<string, string>;
    const filters = ["select=reaction_key,group_id,created_at"];
    if (from) filters.push(`created_at=gte.${encodeURIComponent(from)}`);
    if (to) filters.push(`created_at=lte.${encodeURIComponent(to)}`);
    if (groupId) filters.push(`group_id=eq.${groupId}`);
    filters.push("limit=5000");
    try {
      const rows = await supabaseFetch<any[]>("lesson_reactions", filters.join("&"));
      const byKey: Record<string, number> = {};
      const byGroup: Record<string, number> = {};
      for (const r of rows) {
        byKey[r.reaction_key] = (byKey[r.reaction_key] || 0) + 1;
        if (r.group_id) byGroup[r.group_id] = (byGroup[r.group_id] || 0) + 1;
      }
      res.json({
        total: rows.length,
        byKey,
        byGroup: Object.entries(byGroup).map(([id, count]) => ({ groupId: id, count })),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить сводку реакций" });
    }
  });

  // ===================== БУХГАЛТЕРИЯ (управленческий учёт) =====================
  // Раздел доступен только Владельцу сети.
  const ACCOUNTING_TYPES = ["income", "expense", "transfer"];
  const monthKey = (d: string) => String(d).slice(0, 7); // YYYY-MM

  // Сводка: счета с остатками, ДДС, ОПиУ, платёжный календарь.
  app.get("/api/mvp/accounting/overview", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    try {
      const [accounts, categories, txns] = await Promise.all([
        supabaseFetch<any[]>("finance_accounts", `select=*&${orgFilter}&is_active=eq.true&order=sort.asc`),
        supabaseFetch<any[]>("finance_categories", `select=*&${orgFilter}&is_active=eq.true&order=kind.asc,sort.asc`),
        supabaseFetch<any[]>("finance_transactions", `select=*&${orgFilter}&type=in.(income,expense)&order=operation_date.asc`),
      ]);

      const actual = txns.filter((t) => (t.status || "actual") === "actual");
      const planned = txns.filter((t) => t.status === "planned");
      const catName = (id: string) => categories.find((c) => c.id === id)?.name || "Без статьи";
      const accName = (id: string) => accounts.find((a) => a.id === id)?.name || "—";

      // Остатки по счетам
      const accountsOut = accounts.map((a) => {
        const inc = actual.filter((t) => t.account_id === a.id && t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const exp = actual.filter((t) => t.account_id === a.id && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        return {
          id: a.id, name: a.name, kind: a.kind, currency: a.currency,
          openingBalance: Number(a.opening_balance), balance: Number(a.opening_balance) + inc - exp,
        };
      });

      // Месяцы (диапазон по фактическим операциям)
      const months = Array.from(new Set(actual.map((t) => monthKey(t.operation_date)))).sort();

      // ДДС: строки по статьям (доход/расход) с разбивкой по месяцам
      const buildRows = (kind: "income" | "expense") => {
        const cats = Array.from(new Set(actual.filter((t) => t.type === kind).map((t) => t.category_id)));
        return cats.map((cid) => {
          const byMonth = months.map((m) =>
            actual.filter((t) => t.type === kind && t.category_id === cid && monthKey(t.operation_date) === m)
              .reduce((s, t) => s + Number(t.amount), 0));
          return { category: catName(cid), byMonth, total: byMonth.reduce((s, v) => s + v, 0) };
        }).sort((a, b) => b.total - a.total);
      };
      const incomeRows = buildRows("income");
      const expenseRows = buildRows("expense");
      const incomeByMonth = months.map((m) => actual.filter((t) => t.type === "income" && monthKey(t.operation_date) === m).reduce((s, t) => s + Number(t.amount), 0));
      const expenseByMonth = months.map((m) => actual.filter((t) => t.type === "expense" && monthKey(t.operation_date) === m).reduce((s, t) => s + Number(t.amount), 0));
      const netByMonth = months.map((_, i) => incomeByMonth[i] - expenseByMonth[i]);

      // ОПиУ (P&L) — упрощённо из денежных операций
      const pnl = months.map((m, i) => ({
        month: m, revenue: incomeByMonth[i], expense: expenseByMonth[i], profit: netByMonth[i],
        margin: incomeByMonth[i] > 0 ? Math.round((netByMonth[i] / incomeByMonth[i]) * 100) : 0,
      }));

      // Платёжный календарь (плановые)
      const calendar = planned
        .map((t) => ({
          id: t.id, date: t.operation_date, type: t.type, amount: Number(t.amount),
          category: catName(t.category_id), account: accName(t.account_id),
          counterparty: t.counterparty || null, description: t.description || null,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const incomeTotal = incomeByMonth.reduce((s, v) => s + v, 0);
      const expenseTotal = expenseByMonth.reduce((s, v) => s + v, 0);
      const plannedIn = planned.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const plannedOut = planned.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

      res.json({
        accounts: accountsOut,
        categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
        cashflow: { months, incomeRows, expenseRows, incomeByMonth, expenseByMonth, netByMonth },
        pnl,
        calendar,
        totals: {
          income: incomeTotal, expense: expenseTotal, profit: incomeTotal - expenseTotal,
          plannedIn, plannedOut,
          balanceTotal: accountsOut.reduce((s, a) => s + a.balance, 0),
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить бухгалтерию" });
    }
  });

  // Лента операций
  app.get("/api/mvp/accounting/operations", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    const { status, from, to } = req.query as Record<string, string>;
    const filters = [`select=*`, orgFilter, "type=in.(income,expense)", "order=operation_date.desc"];
    if (status === "actual" || status === "planned") filters.push(`status=eq.${status}`);
    if (from) filters.push(`operation_date=gte.${from}`);
    if (to) filters.push(`operation_date=lte.${to}`);
    filters.push("limit=1000");
    try {
      const rows = await supabaseFetch<any[]>("finance_transactions", filters.join("&"));
      res.json({ operations: rows.map((t) => ({
        id: t.id, type: t.type, status: t.status || "actual", amount: Number(t.amount),
        date: t.operation_date, categoryId: t.category_id, accountId: t.account_id,
        counterparty: t.counterparty || null, description: t.description || null,
      })) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить операции" });
    }
  });

  // Создать операцию (доход/расход, факт или план)
  app.post("/api/mvp/accounting/operations", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const type = ACCOUNTING_TYPES.includes(p.type) ? p.type : "expense";
    const status = p.status === "planned" ? "planned" : "actual";
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Укажите сумму больше нуля" });
    try {
      const inserted = await supabaseFetch<any[]>("finance_transactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: p.branchId || session.dbBranchId || null,
          account_id: p.accountId || null,
          category_id: p.categoryId || null,
          amount, type, status,
          operation_date: p.date || new Date().toISOString().slice(0, 10),
          counterparty: p.counterparty || null,
          description: p.description || null,
        }),
      });
      res.status(201).json({ operation: inserted[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать операцию" });
    }
  });

  // Изменить операцию
  app.patch("/api/mvp/accounting/operations/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.amount !== undefined) patch.amount = Number(p.amount);
    if (p.type !== undefined && ACCOUNTING_TYPES.includes(p.type)) patch.type = p.type;
    if (p.status !== undefined) patch.status = p.status === "planned" ? "planned" : "actual";
    if (p.date !== undefined) patch.operation_date = p.date;
    if (p.categoryId !== undefined) patch.category_id = p.categoryId || null;
    if (p.accountId !== undefined) patch.account_id = p.accountId || null;
    if (p.counterparty !== undefined) patch.counterparty = p.counterparty || null;
    if (p.description !== undefined) patch.description = p.description || null;
    try {
      const rows = await supabaseFetch<any[]>("finance_transactions", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, {
        method: "PATCH", body: JSON.stringify(patch),
      });
      res.json({ operation: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить операцию" });
    }
  });

  // Удалить операцию
  app.delete("/api/mvp/accounting/operations/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("finance_transactions", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить операцию" });
    }
  });

  // Создать счёт/кассу
  app.post("/api/mvp/accounting/accounts", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    if (!String(p.name || "").trim()) return res.status(400).json({ error: "Укажите название счёта" });
    try {
      const inserted = await supabaseFetch<any[]>("finance_accounts", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: p.branchId || null,
          name: String(p.name).trim(),
          kind: ["cash", "bank", "card"].includes(p.kind) ? p.kind : "cash",
          currency: p.currency || "KZT",
          opening_balance: Number(p.openingBalance) || 0,
          sort: Number(p.sort) || 99,
        }),
      });
      res.status(201).json({ account: inserted[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать счёт" });
    }
  });

  // Изменить счёт (название/тип/валюта/остаток/сортировка)
  app.patch("/api/mvp/accounting/accounts/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch: Record<string, unknown> = {};
    if (p.name !== undefined) patch.name = String(p.name).trim();
    if (p.kind !== undefined) patch.kind = ["cash", "bank", "card"].includes(p.kind) ? p.kind : "cash";
    if (p.currency !== undefined) patch.currency = p.currency || "KZT";
    if (p.openingBalance !== undefined) patch.opening_balance = Number(p.openingBalance) || 0;
    if (p.sort !== undefined) patch.sort = Number(p.sort) || 0;
    if (p.isActive !== undefined) patch.is_active = Boolean(p.isActive);
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("finance_accounts", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (!rows[0]) return res.status(404).json({ error: "Счёт не найден" });
      res.json({ account: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить счёт" });
    }
  });

  // Архивировать счёт (мягко, is_active=false — операции сохраняются)
  app.delete("/api/mvp/accounting/accounts/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const rows = await supabaseFetch<any[]>("finance_accounts", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify({ is_active: false }) });
      if (!rows[0]) return res.status(404).json({ error: "Счёт не найден" });
      res.json({ account: { id: rows[0].id }, archived: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось архивировать счёт" });
    }
  });

  // ---- Статьи доходов/расходов (справочник, настраивается владельцем) ----
  app.get("/api/mvp/accounting/categories", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const rows = await supabaseFetch<any[]>("finance_categories", `select=*&organization_id=eq.${session.organizationId}&order=kind.asc,sort.asc`);
      res.json({ categories: rows.map((c) => ({ id: c.id, name: c.name, kind: c.kind, parentId: c.parent_id, sort: c.sort, isActive: c.is_active !== false })) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить статьи" });
    }
  });

  app.post("/api/mvp/accounting/categories", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    if (!String(p.name || "").trim()) return res.status(400).json({ error: "Укажите название статьи" });
    const kind = p.kind === "income" ? "income" : "expense";
    try {
      const inserted = await supabaseFetch<any[]>("finance_categories", "", {
        method: "POST",
        body: JSON.stringify({ organization_id: session.organizationId, name: String(p.name).trim(), kind, parent_id: p.parentId || null, sort: Number(p.sort) || 99 }),
      });
      const c = inserted[0];
      res.status(201).json({ category: { id: c.id, name: c.name, kind: c.kind, parentId: c.parent_id, sort: c.sort, isActive: true } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать статью" });
    }
  });

  app.patch("/api/mvp/accounting/categories/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch: Record<string, unknown> = {};
    if (p.name !== undefined) patch.name = String(p.name).trim();
    if (p.kind !== undefined) patch.kind = p.kind === "income" ? "income" : "expense";
    if (p.sort !== undefined) patch.sort = Number(p.sort) || 0;
    if (p.isActive !== undefined) patch.is_active = Boolean(p.isActive);
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("finance_categories", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (!rows[0]) return res.status(404).json({ error: "Статья не найдена" });
      const c = rows[0];
      res.json({ category: { id: c.id, name: c.name, kind: c.kind, parentId: c.parent_id, sort: c.sort, isActive: c.is_active !== false } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить статью" });
    }
  });

  app.delete("/api/mvp/accounting/categories/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      // Мягкое скрытие: операции с этой статьёй сохраняются.
      const rows = await supabaseFetch<any[]>("finance_categories", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify({ is_active: false }) });
      if (!rows[0]) return res.status(404).json({ error: "Статья не найдена" });
      res.json({ category: { id: rows[0].id }, archived: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить статью" });
    }
  });

  // ---- Реестр налогов (ставка/база/период, настраивается владельцем) ----
  const mapTax = (t: any) => ({
    id: t.id, name: t.name, baseType: t.base_type, rate: Number(t.rate) || 0,
    fixedAmount: Number(t.fixed_amount) || 0, period: t.period, branchId: t.branch_id,
    categoryId: t.category_id, accountId: t.account_id, isActive: t.is_active !== false, comment: t.comment,
  });

  app.get("/api/mvp/accounting/taxes", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const rows = await supabaseFetch<any[]>("finance_taxes", `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`);
      res.json({ taxes: rows.map(mapTax) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить налоги" });
    }
  });

  app.post("/api/mvp/accounting/taxes", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    if (!String(p.name || "").trim()) return res.status(400).json({ error: "Укажите название налога" });
    const baseType = ["revenue", "profit", "payroll", "fixed"].includes(p.baseType) ? p.baseType : "revenue";
    const period = ["month", "quarter", "year"].includes(p.period) ? p.period : "month";
    try {
      const inserted = await supabaseFetch<any[]>("finance_taxes", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId, branch_id: p.branchId || null,
          name: String(p.name).trim(), base_type: baseType, rate: Number(p.rate) || 0,
          fixed_amount: Number(p.fixedAmount) || 0, period, category_id: p.categoryId || null,
          account_id: p.accountId || null, comment: p.comment || null,
        }),
      });
      res.status(201).json({ tax: mapTax(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать налог" });
    }
  });

  app.patch("/api/mvp/accounting/taxes/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch: Record<string, unknown> = {};
    if (p.name !== undefined) patch.name = String(p.name).trim();
    if (p.baseType !== undefined) patch.base_type = ["revenue", "profit", "payroll", "fixed"].includes(p.baseType) ? p.baseType : "revenue";
    if (p.rate !== undefined) patch.rate = Number(p.rate) || 0;
    if (p.fixedAmount !== undefined) patch.fixed_amount = Number(p.fixedAmount) || 0;
    if (p.period !== undefined) patch.period = ["month", "quarter", "year"].includes(p.period) ? p.period : "month";
    if (p.categoryId !== undefined) patch.category_id = p.categoryId || null;
    if (p.accountId !== undefined) patch.account_id = p.accountId || null;
    if (p.isActive !== undefined) patch.is_active = Boolean(p.isActive);
    if (p.comment !== undefined) patch.comment = p.comment || null;
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("finance_taxes", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (!rows[0]) return res.status(404).json({ error: "Налог не найден" });
      res.json({ tax: mapTax(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить налог" });
    }
  });

  app.delete("/api/mvp/accounting/taxes/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("finance_taxes", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить налог" });
    }
  });

  // Провести налог: создаёт фактическую расходную операцию по налогу за период.
  app.post("/api/mvp/accounting/taxes/:id/pay", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    try {
      const found = await supabaseFetch<any[]>("finance_taxes", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
      const tax = found[0];
      if (!tax) return res.status(404).json({ error: "Налог не найден" });
      const amount = Number(p.amount) > 0 ? Number(p.amount) : Number(tax.fixed_amount) || 0;
      if (!amount) return res.status(400).json({ error: "Укажите сумму налога к оплате" });
      const op = await supabaseFetch<any[]>("finance_transactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId, branch_id: tax.branch_id,
          account_id: p.accountId || tax.account_id || null, category_id: tax.category_id || null,
          amount, type: "expense", status: "actual",
          operation_date: p.date || new Date().toISOString().slice(0, 10),
          description: `Налог: ${tax.name}`,
        }),
      });
      res.status(201).json({ operation: op[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось провести налог" });
    }
  });

  // ---- Рекламные расходы (для метрик маркетинга: CPL/CAC/ROMI) ----
  const mapSpend = (s: any) => ({
    id: s.id, branchId: s.branch_id, sourceId: s.source_id, channel: s.channel,
    periodMonth: s.period_month, amount: Number(s.amount) || 0, leads: Number(s.leads) || 0, comment: s.comment,
  });

  app.get("/api/mvp/marketing/spend", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const q = req.query as Record<string, string>;
    const filters = [`select=*`, `organization_id=eq.${session.organizationId}`, "order=period_month.desc"];
    if (q.period) filters.push(`period_month=eq.${q.period}`);
    try {
      const rows = await supabaseFetch<any[]>("marketing_spend", filters.join("&"));
      res.json({ spend: rows.map(mapSpend) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить рекламные расходы" });
    }
  });

  app.post("/api/mvp/marketing/spend", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Укажите сумму расхода" });
    const period = String(p.periodMonth || new Date().toISOString().slice(0, 7));
    try {
      const inserted = await supabaseFetch<any[]>("marketing_spend", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId, branch_id: p.branchId || null,
          source_id: p.sourceId || null, channel: p.channel || null, period_month: period,
          amount, leads: Number(p.leads) || 0, comment: p.comment || null,
        }),
      });
      res.status(201).json({ spend: mapSpend(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось сохранить расход" });
    }
  });

  app.patch("/api/mvp/marketing/spend/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch: Record<string, unknown> = {};
    if (p.amount !== undefined) patch.amount = Number(p.amount) || 0;
    if (p.leads !== undefined) patch.leads = Number(p.leads) || 0;
    if (p.sourceId !== undefined) patch.source_id = p.sourceId || null;
    if (p.channel !== undefined) patch.channel = p.channel || null;
    if (p.periodMonth !== undefined) patch.period_month = String(p.periodMonth);
    if (p.branchId !== undefined) patch.branch_id = p.branchId || null;
    if (p.comment !== undefined) patch.comment = p.comment || null;
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("marketing_spend", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (!rows[0]) return res.status(404).json({ error: "Запись не найдена" });
      res.json({ spend: mapSpend(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить расход" });
    }
  });

  app.delete("/api/mvp/marketing/spend/:id", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел доступен только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("marketing_spend", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить расход" });
    }
  });

  // ---- Заявки на расход (управляющий запрашивает — владелец подтверждает) ----
  const mapExpenseReq = (r: any) => ({
    id: r.id, branchId: r.branch_id, requestedByName: r.requested_by_name,
    amount: Number(r.amount), categoryId: r.category_id, description: r.description,
    status: r.status, decidedBy: r.decided_by, decidedAt: r.decided_at,
    decisionComment: r.decision_comment, operationId: r.operation_id, createdAt: r.created_at,
  });

  // Создать заявку (управляющий филиалом или владелец)
  app.post("/api/mvp/accounting/expense-requests", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "branch_manager" && session.role !== "owner") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Укажите сумму больше нуля" });
    try {
      const inserted = await supabaseFetch<any[]>("finance_expense_requests", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: p.branchId || session.dbBranchId || null,
          requested_by: authorId(session),
          requested_by_name: session.fullName || session.role,
          amount,
          category_id: p.categoryId || null,
          description: p.description || null,
          status: "pending",
        }),
      });
      res.status(201).json({ request: mapExpenseReq(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать заявку" });
    }
  });

  // Список заявок (владелец — все по сети; управляющий — только свой филиал)
  app.get("/api/mvp/accounting/expense-requests", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "branch_manager" && session.role !== "owner") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const filters = [`select=*`, `organization_id=eq.${session.organizationId}`, "order=created_at.desc", "limit=500"];
    if (session.role === "branch_manager") filters.push(`branch_id=eq.${session.dbBranchId}`);
    if (req.query.status) filters.push(`status=eq.${req.query.status}`);
    try {
      const rows = await supabaseFetch<any[]>("finance_expense_requests", filters.join("&"));
      res.json({ requests: rows.map(mapExpenseReq) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить заявки" });
    }
  });

  // Одобрить заявку (только владелец) — создаёт плановую расходную операцию
  app.post("/api/mvp/accounting/expense-requests/:id/approve", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Подтверждать может только владелец" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    try {
      const found = await supabaseFetch<any[]>("finance_expense_requests", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
      const reqRow = found[0];
      if (!reqRow) return res.status(404).json({ error: "Заявка не найдена" });
      if (reqRow.status !== "pending") return res.status(400).json({ error: "Заявка уже обработана" });

      const categoryId = p.categoryId || reqRow.category_id || null;
      // Фактическая расходная операция — списание со счёта
      const op = await supabaseFetch<any[]>("finance_transactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: reqRow.branch_id,
          account_id: p.accountId || null,
          category_id: categoryId,
          amount: reqRow.amount,
          type: "expense",
          status: "actual",
          operation_date: p.date || new Date().toISOString().slice(0, 10),
          description: reqRow.description ? `Заявка: ${reqRow.description}` : "Одобренная заявка на расход",
        }),
      });
      const rows = await supabaseFetch<any[]>("finance_expense_requests", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "approved", decided_by: session.fullName || "owner",
          decided_at: new Date().toISOString(), decision_comment: p.comment || null,
          category_id: categoryId, operation_id: op[0]?.id || null,
        }),
      });
      res.json({ request: mapExpenseReq(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось одобрить заявку" });
    }
  });

  // Отклонить заявку (только владелец)
  app.post("/api/mvp/accounting/expense-requests/:id/reject", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Отклонять может только владелец" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    try {
      const rows = await supabaseFetch<any[]>("finance_expense_requests", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&status=eq.pending`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "rejected", decided_by: session.fullName || "owner",
          decided_at: new Date().toISOString(), decision_comment: p.comment || null,
        }),
      });
      if (!rows[0]) return res.status(400).json({ error: "Заявка не найдена или уже обработана" });
      res.json({ request: mapExpenseReq(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось отклонить заявку" });
    }
  });

  // ---- Заявки на возврат средств (управляющий запрашивает — владелец подтверждает) ----
  // Миграция 043: finance_refund_requests. Одобрение создаёт фактическую расходную
  // операцию в Бухгалтерии (finance_transactions), как и заявки на расход.
  const mapRefundReq = (r: any) => ({
    id: r.id, branchId: r.branch_id, studentId: r.student_id, studentName: r.student_name,
    requestedByName: r.requested_by_name, amount: Number(r.amount), reason: r.reason,
    status: r.status, decidedBy: r.decided_by, decidedAt: r.decided_at,
    decisionComment: r.decision_comment, operationId: r.operation_id, createdAt: r.created_at,
  });

  // Создать заявку на возврат (управляющий филиалом или владелец)
  app.post("/api/mvp/accounting/refund-requests", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "branch_manager" && session.role !== "owner") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Укажите сумму больше нуля" });
    try {
      const inserted = await supabaseFetch<any[]>("finance_refund_requests", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: p.branchId || session.dbBranchId || null,
          student_id: p.studentId || null,
          student_name: p.studentName || null,
          requested_by: authorId(session),
          requested_by_name: session.fullName || session.role,
          amount,
          reason: p.reason || null,
          status: "pending",
        }),
      });
      res.status(201).json({ request: mapRefundReq(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать заявку на возврат" });
    }
  });

  // Список заявок на возврат (владелец — все по сети; управляющий — свой филиал)
  app.get("/api/mvp/accounting/refund-requests", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "branch_manager" && session.role !== "owner") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const filters = [`select=*`, `organization_id=eq.${session.organizationId}`, "order=created_at.desc", "limit=500"];
    if (session.role === "branch_manager") filters.push(`branch_id=eq.${session.dbBranchId}`);
    if (req.query.status) filters.push(`status=eq.${req.query.status}`);
    try {
      const rows = await supabaseFetch<any[]>("finance_refund_requests", filters.join("&"));
      res.json({ requests: rows.map(mapRefundReq) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить заявки на возврат" });
    }
  });

  // Одобрить возврат (только владелец) — создаёт фактическую расходную операцию
  app.post("/api/mvp/accounting/refund-requests/:id/approve", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Подтверждать может только владелец" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    try {
      const found = await supabaseFetch<any[]>("finance_refund_requests", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
      const reqRow = found[0];
      if (!reqRow) return res.status(404).json({ error: "Заявка не найдена" });
      if (reqRow.status !== "pending") return res.status(400).json({ error: "Заявка уже обработана" });

      const op = await supabaseFetch<any[]>("finance_transactions", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: reqRow.branch_id,
          account_id: p.accountId || null,
          category_id: p.categoryId || null,
          amount: reqRow.amount,
          type: "expense",
          status: "actual",
          operation_date: p.date || new Date().toISOString().slice(0, 10),
          counterparty: reqRow.student_name || null,
          description: `Возврат средств${reqRow.student_name ? `: ${reqRow.student_name}` : ""}${reqRow.reason ? ` — ${reqRow.reason}` : ""}`,
        }),
      });
      const rows = await supabaseFetch<any[]>("finance_refund_requests", `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "approved", decided_by: session.fullName || "owner",
          decided_at: new Date().toISOString(), decision_comment: p.comment || null,
          operation_id: op[0]?.id || null,
        }),
      });
      res.json({ request: mapRefundReq(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось одобрить возврат" });
    }
  });

  // Отклонить возврат (только владелец)
  app.post("/api/mvp/accounting/refund-requests/:id/reject", async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Отклонять может только владелец" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    try {
      const rows = await supabaseFetch<any[]>("finance_refund_requests", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&status=eq.pending`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "rejected", decided_by: session.fullName || "owner",
          decided_at: new Date().toISOString(), decision_comment: p.comment || null,
        }),
      });
      if (!rows[0]) return res.status(400).json({ error: "Заявка не найдена или уже обработана" });
      res.json({ request: mapRefundReq(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось отклонить возврат" });
    }
  });

  // ============================================================
  // РАЗДЕЛ «ВЫСТУПЛЕНИЯ» (миграция 017) и «ТОВАРЫ И СКЛАД» (018)
  // ============================================================
  // Выступления: владелец — полный доступ, управляющий — список без финанс.
  // аналитики, админ/педагог — нет. Товары: владелец — полный, управляющий —
  // свой филиал, админ — продажи + касса дня, педагог — нет.

  // Диапазоны периода (cur/prev/yoy) — те же ключи, что и на дашборде владельца.
  const isoDay = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const periodRanges = (period?: string, cs?: string, ce?: string) => {
    const base = new Date(); base.setHours(0, 0, 0, 0);
    const mk = (s: Date, e: Date) => ({ start: isoDay(s), end: isoDay(e) });
    const Y = base.getFullYear(), M = base.getMonth();
    switch (period) {
      case "today": {
        const p = new Date(base); p.setDate(p.getDate() - 1);
        const y = new Date(base); y.setFullYear(y.getFullYear() - 1);
        return { cur: mk(base, base), prev: mk(p, p), yoy: mk(y, y) };
      }
      case "yesterday": {
        const c = new Date(base); c.setDate(c.getDate() - 1);
        const p = new Date(c); p.setDate(p.getDate() - 1);
        const y = new Date(c); y.setFullYear(y.getFullYear() - 1);
        return { cur: mk(c, c), prev: mk(p, p), yoy: mk(y, y) };
      }
      case "week": {
        const e = new Date(base); const s = new Date(base); s.setDate(s.getDate() - 6);
        const pe = new Date(s); pe.setDate(pe.getDate() - 1); const ps = new Date(pe); ps.setDate(ps.getDate() - 6);
        const ys = new Date(s); ys.setFullYear(ys.getFullYear() - 1); const ye = new Date(e); ye.setFullYear(ye.getFullYear() - 1);
        return { cur: mk(s, e), prev: mk(ps, pe), yoy: mk(ys, ye) };
      }
      case "quarter": {
        const q = Math.floor(M / 3);
        return {
          cur: mk(new Date(Y, q * 3, 1), new Date(Y, q * 3 + 3, 0)),
          prev: mk(new Date(Y, q * 3 - 3, 1), new Date(Y, q * 3, 0)),
          yoy: mk(new Date(Y - 1, q * 3, 1), new Date(Y - 1, q * 3 + 3, 0)),
        };
      }
      case "year":
        return {
          cur: mk(new Date(Y, 0, 1), new Date(Y, 11, 31)),
          prev: mk(new Date(Y - 1, 0, 1), new Date(Y - 1, 11, 31)),
          yoy: mk(new Date(Y - 1, 0, 1), new Date(Y - 1, 11, 31)),
        };
      case "custom": {
        if (cs && ce) {
          const s = new Date(cs); const e = new Date(ce);
          const len = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
          const pe = new Date(s); pe.setDate(pe.getDate() - 1); const ps = new Date(pe); ps.setDate(ps.getDate() - len + 1);
          const ys = new Date(s); ys.setFullYear(ys.getFullYear() - 1); const ye = new Date(e); ye.setFullYear(ye.getFullYear() - 1);
          return { cur: mk(s, e), prev: mk(ps, pe), yoy: mk(ys, ye) };
        }
        // fallthrough → month
      }
      default:
        return {
          cur: mk(new Date(Y, M, 1), new Date(Y, M + 1, 0)),
          prev: mk(new Date(Y, M - 1, 1), new Date(Y, M, 0)),
          yoy: mk(new Date(Y - 1, M, 1), new Date(Y - 1, M + 1, 0)),
        };
    }
  };
  const inRange = (d: string, r: { start: string; end: string }) => d >= r.start && d <= r.end;
  const pctDelta = (cur: number, base: number): number | null =>
    base > 0 ? Math.round(((cur - base) / base) * 1000) / 10 : null;
  const todayStr = () => isoDay(new Date());

  // ---- Mock-хранилища (когда Supabase не настроен — раздел всё равно работает) ----
  const uid = () => (globalThis.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2)}`);
  const mockPerformances: any[] = [
    { id: uid(), clientName: "Свадьба Айсулу и Максат", clientPhone: "+7 701 555 0001", address: "Ресторан «Зердэ», г. Астана", eventDate: "2026-06-01", eventTime: "18:00", type: "interactive", price: 350000, status: "planned", comment: "3 номера + интерактив с гостями", branchId: demoBranchAlmaty,
      payments: [ { id: uid(), amount: 100000, paidDate: "2026-05-28", method: "cash", comment: "Аванс" }, { id: uid(), amount: 150000, paidDate: "2026-06-01", method: "transfer", comment: "Доплата" } ] },
    { id: uid(), clientName: "Корпоратив BI Group", clientPhone: "+7 701 555 0002", address: "Отель Rixos", eventDate: "2026-06-05", eventTime: "20:00", type: "basic", price: 300000, status: "planned", comment: "Базовый танец", branchId: demoBranchAlmaty,
      payments: [ { id: uid(), amount: 300000, paidDate: "2026-06-05", method: "transfer", comment: "Полная оплата" } ] },
    { id: uid(), clientName: "Банкет Нурлан", clientPhone: "+7 701 555 0003", address: "Банкетный зал «Астана»", eventDate: "2026-06-10", eventTime: "19:00", type: "interactive", price: 200000, status: "planned", comment: "Танец с интерактивом", branchId: demoBranchAlmaty, payments: [] },
  ];
  const mockProducts: any[] = [
    { id: uid(), name: "Футболка ECHO GOR", category: "Мерч", sku: "TSH-001", salePrice: 15000, costPrice: 8000, minStock: 10, branchId: demoBranchAlmaty, echoPrice: 500, isActive: true, description: "Фирменная футболка ансамбля. Мягкий хлопок, логотип на груди." },
    { id: uid(), name: "Худи ECHO GOR", category: "Мерч", sku: "HOD-002", salePrice: 28000, costPrice: 16000, minStock: 5, branchId: demoBranchAlmaty, echoPrice: 1200, isActive: true, description: "Тёплое худи с вышивкой ансамбля — награда за упорство." },
    { id: uid(), name: "Штаны тренировочные", category: "Форма", sku: "PNT-003", salePrice: 20000, costPrice: 12000, minStock: 5, branchId: demoBranchAlmaty, echoPrice: 0, isActive: true, description: "Тренировочные штаны для занятий." },
    { id: uid(), name: "Шапка ECHO GOR", category: "Мерч", sku: "CAP-004", salePrice: 7000, costPrice: 3500, minStock: 5, branchId: demoBranchAlmaty, echoPrice: 300, isActive: true, description: "Стильная шапка с логотипом — приятный бонус за баллы." },
  ];
  const mockReceipts: any[] = [
    { id: uid(), productId: mockProducts[0].id, qty: 30, costPrice: 8000, movementDate: "2026-05-01", comment: "Закуп партии", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[1].id, qty: 20, costPrice: 16000, movementDate: "2026-05-01", comment: "Закуп партии", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[2].id, qty: 12, costPrice: 12000, movementDate: "2026-05-01", comment: "Закуп партии", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[3].id, qty: 8, costPrice: 3500, movementDate: "2026-05-01", comment: "Закуп партии", branchId: demoBranchAlmaty },
  ];
  const mockSales: any[] = [
    { id: uid(), productId: mockProducts[0].id, qty: 7, amount: 105000, method: "card", soldBy: "Фатима Царикаева", saleDate: "2026-06-03", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[1].id, qty: 8, amount: 224000, method: "kaspi", soldBy: "Фатима Царикаева", saleDate: "2026-06-08", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[2].id, qty: 4, amount: 80000, method: "cash", soldBy: "Фатима Царикаева", saleDate: "2026-06-12", branchId: demoBranchAlmaty },
    { id: uid(), productId: mockProducts[3].id, qty: 6, amount: 42000, method: "cash", soldBy: "Фатима Царикаева", saleDate: "2026-06-15", branchId: demoBranchAlmaty },
  ];

  // ---------- ВЫСТУПЛЕНИЯ ----------
  const PERF_TYPES = ["basic", "interactive", "multi", "individual", "other"];
  // Нормализация выступления (DB-строка ИЛИ mock-объект) + расчёт оплат/статуса.
  const perfOut = (perf: any, payments: any[]) => {
    const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const price = Number(perf.price) || 0;
    const expense = Number(perf.expense ?? 0) || 0;
    const cancelled = (perf.status || perf.status) === "cancelled";
    const status = cancelled ? "cancelled" : paid <= 0 ? "planned" : paid >= price && price > 0 ? "paid" : "partial";
    return {
      id: perf.id,
      clientName: perf.clientName ?? perf.client_name,
      clientPhone: perf.clientPhone ?? perf.client_phone ?? null,
      address: perf.address ?? null,
      eventDate: perf.eventDate ?? perf.event_date,
      eventTime: perf.eventTime ?? perf.event_time ?? null,
      type: perf.type || "basic",
      typeLabel: perf.typeLabel ?? perf.type_label ?? null,
      performersCount: perf.performersCount ?? perf.performers_count ?? null,
      paymentMethod: perf.paymentMethod ?? perf.payment_method ?? null,
      price, paid, outstanding: Math.max(0, price - paid),
      expense,
      netProfit: price - expense, // чистая прибыль (на счёт поступает только она)
      status,
      comment: perf.comment ?? null,
      branchId: perf.branchId ?? perf.branch_id ?? null,
      payments: payments
        .map((p) => ({ id: p.id, amount: Number(p.amount), date: p.paidDate ?? p.paid_date, method: p.method || "cash", comment: p.comment ?? null }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    };
  };
  // Собрать все выступления (с оплатами) — из БД или из mock.
  const loadPerformances = async (session: MvpSession) => {
    if (!supabaseEnabled) {
      const list = session.role === "owner" ? mockPerformances : mockPerformances.filter((p) => canSeeBranch(session, p.branchId));
      return list.map((p) => perfOut(p, p.payments || []));
    }
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    const [perfs, pays] = await Promise.all([
      supabaseFetch<any[]>("performances", `select=*&${orgFilter}&order=event_date.desc`),
      supabaseFetch<any[]>("performance_payments", `select=*&${orgFilter}&order=paid_date.asc`),
    ]);
    return perfs.map((perf) => perfOut(perf, pays.filter((pp) => pp.performance_id === perf.id)));
  };

  // Список выступлений (владелец + управляющий)
  app.get("/api/mvp/performances", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") {
      return res.status(403).json({ error: "Раздел доступен владельцу и управляющему" });
    }
    let list = await loadPerformances(session);
    const { status } = req.query as Record<string, string>;
    if (status && status !== "all") list = list.filter((p) => p.status === status);
    // Управляющему — без финансовой аналитики: отдаём список, но скрываем суммы оплат.
    if (session.role === "branch_manager") {
      list = list.map((p) => ({ ...p, paid: null, outstanding: null, payments: [] }));
    }
    res.json({ performances: list });
  }));

  // Аналитика выступлений (владелец) — выручка за период с MoM/YoY + сводка
  // ВАЖНО: маршрут /overview должен быть зарегистрирован ДО /:id, иначе Express
  // примет "overview" за :id.
  app.get("/api/mvp/performances/overview", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Аналитика доступна владельцу" });
    const q = req.query as Record<string, string>;
    const r = periodRanges(q.period, q.from, q.to);
    const list = (await loadPerformances(session)).filter((p) => p.status !== "cancelled");
    const allPays = list.flatMap((p) => p.payments.map((pay) => ({ ...pay })));
    const sumIn = (range: { start: string; end: string }) =>
      allPays.filter((pp) => inRange(pp.date, range)).reduce((s, pp) => s + pp.amount, 0);
    const curRev = sumIn(r.cur), prevRev = sumIn(r.prev), yoyRev = sumIn(r.yoy);
    const inCur = list.filter((p) => inRange(p.eventDate, r.cur));
    const count = inCur.length;
    const grossCur = inCur.reduce((s, p) => s + p.price, 0);
    const expenseCur = inCur.reduce((s, p) => s + (p.expense || 0), 0);
    const netCur = grossCur - expenseCur; // чистая прибыль за период
    const performersCur = inCur.reduce((s, p) => s + (p.performersCount || 0), 0);
    const avgCheck = count > 0 ? Math.round(grossCur / count) : 0;
    const unpaid = list.filter((p) => p.outstanding > 0);
    const outstanding = unpaid.reduce((s, p) => s + p.outstanding, 0);
    // График поступлений по месяцам (последние 6 месяцев включительно)
    const months: string[] = [];
    const md = new Date(); md.setDate(1);
    for (let i = 5; i >= 0; i--) { const d = new Date(md.getFullYear(), md.getMonth() - i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
    const byMonth = months.map((mo) => ({ month: mo, amount: allPays.filter((pp) => String(pp.date).slice(0, 7) === mo).reduce((s, pp) => s + pp.amount, 0) }));
    res.json({
      revenue: { total: curRev, momPct: pctDelta(curRev, prevRev), yoyPct: pctDelta(curRev, yoyRev) },
      count, avgCheck, unpaidCount: unpaid.length, outstanding, byMonth,
      gross: grossCur, expense: expenseCur, netProfit: netCur, performers: performersCur,
    });
  }));

  // Карточка выступления (владелец)
  app.get("/api/mvp/performances/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Финансовая карточка доступна владельцу" });
    const list = await loadPerformances(session);
    const found = list.find((p) => p.id === req.params.id);
    if (!found) return res.status(404).json({ error: "Выступление не найдено" });
    res.json({ performance: found });
  }));

  // Создать выступление (владелец)
  app.post("/api/mvp/performances", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Создавать может только владелец" });
    const p = req.body || {};
    if (!String(p.clientName || "").trim()) return res.status(400).json({ error: "Укажите клиента" });
    // Дата: принимаем и eventDate, и date (раньше p.date молча игнорировался,
    // и выступление создавалось «на сегодня» — опасная тихая подмена).
    const eventDate = p.eventDate || p.date || todayStr();
    // Тип выступления теперь свободный (настраивается в «Настройках»); enum оставлен для совместимости.
    const type = p.type ? String(p.type) : "basic";
    const price = Number(p.price) || 0;
    const expense = Number(p.expense) || 0;
    const performersCount = p.performersCount != null && p.performersCount !== "" ? Math.max(0, parseInt(p.performersCount, 10)) || 0 : null;
    const paymentMethod = p.paymentMethod || null;
    const markPaid = p.status === "paid"; // владелец сразу отметил «Оплачено»
    if (!supabaseEnabled) {
      const payments = markPaid && price > 0 ? [{ id: uid(), amount: price, paidDate: eventDate, method: paymentMethod || "cash", comment: null }] : [];
      const rec = { id: uid(), clientName: String(p.clientName).trim(), clientPhone: p.clientPhone || null, address: p.address || null,
        eventDate: eventDate, eventTime: p.eventTime || null, type, typeLabel: p.typeLabel || null, price, expense,
        performersCount, paymentMethod, status: "planned", comment: p.comment || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty, payments };
      mockPerformances.unshift(rec);
      return res.status(201).json({ performance: perfOut(rec, payments) });
    }
    const inserted = await supabaseFetch<any[]>("performances", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null,
        client_name: String(p.clientName).trim(), client_phone: p.clientPhone || null, address: p.address || null,
        event_date: eventDate, event_time: p.eventTime || null, type, type_label: p.typeLabel || null,
        price, expense, performers_count: performersCount, payment_method: paymentMethod,
        status: "planned", comment: p.comment || null,
      }),
    });
    // Если отмечено «Оплачено» — фиксируем поступление на всю стоимость (аналитика считает по поступлениям).
    let pays: any[] = [];
    if (markPaid && price > 0 && inserted[0]) {
      await supabaseFetch("performance_payments", "", {
        method: "POST",
        body: JSON.stringify({ organization_id: session.organizationId, performance_id: inserted[0].id, amount: price, paid_date: eventDate, method: paymentMethod || "cash", comment: "Оплата при создании" }),
      });
      pays = await supabaseFetch<any[]>("performance_payments", `select=*&performance_id=eq.${inserted[0].id}`);
    }
    res.status(201).json({ performance: perfOut(inserted[0], pays) });
  }));

  // Изменить / отменить выступление (владелец)
  app.patch("/api/mvp/performances/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Изменять может только владелец" });
    const p = req.body || {};
    if (!supabaseEnabled) {
      const rec = mockPerformances.find((x) => x.id === req.params.id);
      if (!rec) return res.status(404).json({ error: "Выступление не найдено" });
      if (p.clientName !== undefined) rec.clientName = p.clientName;
      if (p.clientPhone !== undefined) rec.clientPhone = p.clientPhone;
      if (p.address !== undefined) rec.address = p.address;
      if (p.eventDate !== undefined) rec.eventDate = p.eventDate;
      if (p.eventTime !== undefined) rec.eventTime = p.eventTime;
      if (p.type !== undefined) rec.type = p.type;
      if (p.typeLabel !== undefined) rec.typeLabel = p.typeLabel || null;
      if (p.price !== undefined) rec.price = Number(p.price) || 0;
      if (p.expense !== undefined) rec.expense = Number(p.expense) || 0;
      if (p.performersCount !== undefined) rec.performersCount = p.performersCount === "" || p.performersCount == null ? null : Math.max(0, parseInt(p.performersCount, 10)) || 0;
      if (p.paymentMethod !== undefined) rec.paymentMethod = p.paymentMethod || null;
      if (p.status !== undefined) rec.status = p.status === "cancelled" ? "cancelled" : "planned";
      if (p.comment !== undefined) rec.comment = p.comment;
      return res.json({ performance: perfOut(rec, rec.payments || []) });
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.clientName !== undefined) patch.client_name = p.clientName;
    if (p.clientPhone !== undefined) patch.client_phone = p.clientPhone || null;
    if (p.address !== undefined) patch.address = p.address || null;
    if (p.eventDate !== undefined) patch.event_date = p.eventDate;
    if (p.eventTime !== undefined) patch.event_time = p.eventTime || null;
    if (p.type !== undefined) patch.type = p.type;
    if (p.typeLabel !== undefined) patch.type_label = p.typeLabel || null;
    if (p.price !== undefined) patch.price = Number(p.price) || 0;
    if (p.expense !== undefined) patch.expense = Number(p.expense) || 0;
    if (p.performersCount !== undefined) patch.performers_count = p.performersCount === "" || p.performersCount == null ? null : Math.max(0, parseInt(p.performersCount, 10)) || 0;
    if (p.paymentMethod !== undefined) patch.payment_method = p.paymentMethod || null;
    if (p.status !== undefined) patch.status = p.status === "cancelled" ? "cancelled" : "planned";
    if (p.comment !== undefined) patch.comment = p.comment || null;
    const rows = await supabaseFetch<any[]>("performances", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    const pays = await supabaseFetch<any[]>("performance_payments", `select=*&performance_id=eq.${req.params.id}`);
    res.json({ performance: rows[0] ? perfOut(rows[0], pays) : null });
  }));

  // Удалить выступление (владелец)
  app.delete("/api/mvp/performances/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Удалять может только владелец" });
    if (!supabaseEnabled) {
      const i = mockPerformances.findIndex((x) => x.id === req.params.id);
      if (i >= 0) mockPerformances.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("performances", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // Добавить поступление денег по выступлению (владелец)
  app.post("/api/mvp/performances/:id/payments", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Добавлять оплату может только владелец" });
    const p = req.body || {};
    const amount = Number(p.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Укажите сумму больше нуля" });
    if (!supabaseEnabled) {
      const rec = mockPerformances.find((x) => x.id === req.params.id);
      if (!rec) return res.status(404).json({ error: "Выступление не найдено" });
      rec.payments = rec.payments || [];
      rec.payments.push({ id: uid(), amount, paidDate: p.date || todayStr(), method: p.method || "cash", comment: p.comment || null });
      return res.status(201).json({ performance: perfOut(rec, rec.payments) });
    }
    await supabaseFetch("performance_payments", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, performance_id: req.params.id, amount, paid_date: p.date || todayStr(), method: p.method || "cash", comment: p.comment || null }),
    });
    const [rows, pays] = await Promise.all([
      supabaseFetch<any[]>("performances", `select=*&id=eq.${req.params.id}`),
      supabaseFetch<any[]>("performance_payments", `select=*&performance_id=eq.${req.params.id}`),
    ]);
    res.status(201).json({ performance: rows[0] ? perfOut(rows[0], pays) : null });
  }));

  // Удалить поступление (владелец)
  app.delete("/api/mvp/performances/:id/payments/:pid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) {
      const rec = mockPerformances.find((x) => x.id === req.params.id);
      if (rec) rec.payments = (rec.payments || []).filter((pp: any) => pp.id !== req.params.pid);
      return res.json({ performance: rec ? perfOut(rec, rec.payments || []) : null });
    }
    await supabaseFetch("performance_payments", `id=eq.${req.params.pid}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const [rows, pays] = await Promise.all([
      supabaseFetch<any[]>("performances", `select=*&id=eq.${req.params.id}`),
      supabaseFetch<any[]>("performance_payments", `select=*&performance_id=eq.${req.params.id}`),
    ]);
    res.json({ performance: rows[0] ? perfOut(rows[0], pays) : null });
  }));

  // ---------- НАСТРОЙКИ: СПРАВОЧНИКИ (settings_lists) ----------
  // Настраиваемые списки: типы выступлений, категории товаров, уровни групп.
  // Читают все рабочие роли (для выпадающих списков), правит только владелец.
  const SETTINGS_KINDS = ["performance_type", "product_category", "group_level", "document_category"];
  const SETTINGS_DEFAULTS: Record<string, string[]> = {
    performance_type: ["Базовый танец", "Танец с интерактивом", "Несколько номеров", "Индивидуальное выступление", "Другое"],
    product_category: ["Мерч", "Форма", "Аксессуары", "Сувениры"],
    group_level: ["Продолжающая группа", "Ансамбль", "Индивидуальные", "Мини-группа", "Другое"],
    document_category: ["Аренда", "Услуги — уборка", "Услуги — вывоз мусора", "Подрядчики / поставщики", "Прочее"],
  };
  const mockSettings: any[] = [];

  // Список значений справочника (с дефолтами, если своих ещё нет).
  // Общий конфиг статусов организации (названия/цвета/ручные статусы).
  // История действий (ТЗ заказчика): кто что делал по датам — из audit_logs
  // (пишутся middleware'ом на каждую мутацию). Человекочитаемые подписи здесь,
  // чтобы клиенту не разбирать HTTP-пути.
  app.get("/api/mvp/audit-logs", ah(async (req, res) => {
    const session = getSession(req);
    if (!["owner", "branch_manager", "admin"].includes(session.role)) {
      return res.status(403).json({ error: "История действий доступна владельцу, управляющему и администратору" });
    }
    if (!supabaseEnabled) return res.json({ logs: [] });
    const limit = Math.min(500, Number((req.query as any).limit) || 300);
    const rows = await supabaseFetch<any[]>(
      "audit_logs",
      `select=action,entity_type,after_data,created_at&order=created_at.desc&limit=${limit}`
    ).catch(() => [] as any[]);

    const label = (method: string, path: string): string => {
      const p = path.split("?")[0];
      const M = (post: string, patch: string, del: string) =>
        method === "POST" ? post : method === "DELETE" ? del : patch;
      if (/\/trial$/.test(p)) return M("Записал на пробный урок", "", "Удалил пробный урок");
      if (/\/students\/[^/]+\/archive/.test(p)) return "Архивировал ученика";
      if (/\/students\/[^/]+\/unarchive/.test(p)) return "Восстановил ученика из архива";
      if (/\/students\/[^/]+\/access/.test(p)) return M("Выдал доступ в кабинет", "Изменил доступ в кабинет", "Отозвал доступ в кабинет");
      if (/\/students(\/|$)/.test(p)) return M("Добавил ученика", "Изменил данные ученика", "Удалил ученика (в корзину)");
      if (/student-subscriptions\/batch/.test(p)) return "Пакетная продажа абонементов";
      if (/student-subscriptions/.test(p)) return M("Продал абонемент", "Изменил абонемент", "Удалил абонемент");
      if (/subscription-plans/.test(p)) return M("Создал тариф", "Изменил тариф", "Удалил тариф");
      if (/payments/.test(p)) return "Принял оплату";
      if (/waitlist/.test(p)) return M("Добавил в лист ожидания", "", "Убрал из листа ожидания");
      if (/attendance/.test(p)) return "Отметил посещаемость";
      if (/recalculations/.test(p)) return M("Создал перерасчёт", "Изменил перерасчёт", "");
      if (/groups/.test(p)) return M("Создал группу", "Изменил группу", "Удалил группу");
      if (/branches/.test(p)) return M("Создал филиал", "Изменил филиал", "Удалил филиал");
      if (/halls/.test(p)) return M("Создал зал", "Изменил зал", "Удалил зал");
      if (/teachers/.test(p)) return M("Добавил педагога", "Изменил педагога", "Удалил педагога");
      if (/schedule/.test(p)) return M("Добавил занятие", "Изменил занятие", "Удалил занятие");
      if (/status-config/.test(p)) return "Изменил настройки статусов";
      if (/shop|echo/.test(p)) return M("Действие в магазине", "Обновил заявку магазина", "Удалил в магазине");
      if (/tasks|notes|meetings|homework/.test(p)) return M("Создал запись (задачи/заметки)", "Изменил запись", "Удалил запись");
      return `${method} ${p.replace("/api/mvp/", "")}`;
    };

    // Короткая деталь из тела запроса: имя/причина/сумма — без сырых JSON.
    const detailOf = (bodyRaw: string | null): string | null => {
      if (!bodyRaw) return null;
      try {
        const b = JSON.parse(bodyRaw);
        const bits: string[] = [];
        if (b.name) bits.push(String(b.name));
        if (b.firstName || b.lastName) bits.push([b.firstName, b.lastName].filter(Boolean).join(" "));
        if (b.amount) bits.push(`${Math.round(Number(b.amount)).toLocaleString("ru-RU")} тг`);
        if (b.price) bits.push(`${Math.round(Number(b.price)).toLocaleString("ru-RU")} тг`);
        if (b.date) bits.push(String(b.date));
        if (b.reason) bits.push(`причина: ${b.reason}`);
        if (b.manualStatus) bits.push(`статус: ${b.manualStatus}`);
        return bits.length ? [...new Set(bits)].slice(0, 3).join(" · ") : null;
      } catch { return null; }
    };

    // Технические авто-запросы (снапшоты метрик, сессии) — не действия людей.
    const TECH_PATHS = /owner\/snapshot|\/session\/|status-config$/;
    const logs = rows
      .filter((r) => Number(r.after_data?.status || 0) < 400) // показываем только успешные действия
      .filter((r) => !TECH_PATHS.test(String(r.after_data?.path || "").split("?")[0]) || String(r.action) === "PUT")
      .map((r) => ({
        at: r.created_at,
        who: r.after_data?.user || r.after_data?.role || "система",
        role: r.after_data?.role || null,
        action: label(String(r.action || ""), String(r.after_data?.path || "")),
        detail: detailOf(r.after_data?.body || null),
      }));
    res.json({ logs });
  }));

  app.get("/api/mvp/settings/status-config", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.json({ config: {} });
    const rows = await supabaseFetch<any[]>(
      "org_status_config",
      `select=config&organization_id=eq.${session.organizationId}`
    ).catch(() => [] as any[]);
    res.json({ config: rows[0]?.config || {} });
  }));

  app.put("/api/mvp/settings/status-config", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    if (!["owner", "branch_manager", "admin"].includes(session.role)) {
      return res.status(403).json({ error: "Настраивать статусы может владелец или управляющий" });
    }
    const config = (req.body && req.body.config) || {};
    await supabaseFetch("org_status_config", "", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ organization_id: session.organizationId, config, updated_at: new Date().toISOString() })
    });
    res.json({ ok: true });
  }));

  app.get("/api/mvp/settings/lists", ah(async (req, res) => {
    const session = getSession(req);
    const kind = String((req.query as any).kind || "");
    if (!SETTINGS_KINDS.includes(kind)) return res.status(400).json({ error: "Неизвестный справочник" });
    let rows: any[];
    if (!supabaseEnabled) {
      rows = mockSettings.filter((s) => s.kind === kind && s.organizationId === session.organizationId);
    } else {
      rows = await supabaseFetch<any[]>("settings_lists", `select=*&organization_id=eq.${session.organizationId}&kind=eq.${kind}&is_active=eq.true&order=sort_order.asc,created_at.asc`);
    }
    const items = rows.map((r) => ({ id: r.id, label: r.label, sortOrder: r.sort_order ?? r.sortOrder ?? 0 }));
    const isDefault = items.length === 0;
    const out = isDefault ? SETTINGS_DEFAULTS[kind].map((label, i) => ({ id: `def:${kind}:${i}`, label, sortOrder: i })) : items;
    res.json({ kind, items: out, isDefault });
  }));

  // Добавить значение (владелец).
  app.post("/api/mvp/settings/lists", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Изменять справочники может только владелец" });
    const kind = String((req.body || {}).kind || "");
    const label = String((req.body || {}).label || "").trim();
    if (!SETTINGS_KINDS.includes(kind)) return res.status(400).json({ error: "Неизвестный справочник" });
    if (!label) return res.status(400).json({ error: "Укажите название" });
    const sortOrder = Number((req.body || {}).sortOrder) || 0;
    if (!supabaseEnabled) {
      const rec = { id: uid(), organizationId: session.organizationId, kind, label, sort_order: sortOrder, is_active: true };
      mockSettings.push(rec);
      return res.status(201).json({ item: { id: rec.id, label, sortOrder } });
    }
    const inserted = await supabaseFetch<any[]>("settings_lists", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, kind, label, sort_order: sortOrder }),
    });
    res.status(201).json({ item: { id: inserted[0].id, label: inserted[0].label, sortOrder: inserted[0].sort_order } });
  }));

  // Изменить значение (владелец).
  app.patch("/api/mvp/settings/lists/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    const b = req.body || {};
    if (!supabaseEnabled) {
      const rec = mockSettings.find((s) => s.id === req.params.id);
      if (rec) { if (b.label !== undefined) rec.label = String(b.label).trim(); if (b.sortOrder !== undefined) rec.sort_order = Number(b.sortOrder) || 0; if (b.isActive !== undefined) rec.is_active = !!b.isActive; }
      return res.json({ ok: true });
    }
    const patch: Record<string, unknown> = {};
    if (b.label !== undefined) patch.label = String(b.label).trim();
    if (b.sortOrder !== undefined) patch.sort_order = Number(b.sortOrder) || 0;
    if (b.isActive !== undefined) patch.is_active = !!b.isActive;
    await supabaseFetch("settings_lists", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    res.json({ ok: true });
  }));

  // Удалить значение (владелец).
  app.delete("/api/mvp/settings/lists/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) {
      const i = mockSettings.findIndex((s) => s.id === req.params.id);
      if (i >= 0) mockSettings.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("settings_lists", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // ---------- ТОВАРЫ И СКЛАД ----------
  const prodOut = (pr: any) => ({
    id: pr.id, name: pr.name, category: pr.category ?? pr.category ?? null, sku: pr.sku ?? null,
    salePrice: Number(pr.salePrice ?? pr.sale_price) || 0, costPrice: Number(pr.costPrice ?? pr.cost_price) || 0,
    minStock: Number(pr.minStock ?? pr.min_stock) || 0, comment: pr.comment ?? null,
    description: pr.description ?? null,
    echoPrice: Number(pr.echoPrice ?? pr.echo_price) || 0,
    isActive: (pr.isActive ?? pr.is_active) !== false,
    photoUrl: pr.photoUrl ?? pr.photo_url ?? null,
    branchId: pr.branchId ?? pr.branch_id ?? null,
  });
  const mockWriteoffs: any[] = [];
  // Загрузить товары, продажи, поступления — из БД или mock — в едином виде.
  const loadProducts = async (session: MvpSession) => {
    if (!supabaseEnabled) {
      const filt = (arr: any[]) => session.role === "owner" ? arr : arr.filter((x) => canSeeBranch(session, x.branchId));
      return {
        products: filt(mockProducts).map(prodOut),
        sales: filt(mockSales).map((s) => ({ id: s.id, productId: s.productId, qty: s.qty, amount: Number(s.amount), method: s.method, soldBy: s.soldBy, date: s.saleDate, branchId: s.branchId })),
        receipts: filt(mockReceipts).map((r) => ({ id: r.id, productId: r.productId, qty: r.qty, costPrice: Number(r.costPrice) || 0, date: r.movementDate, comment: r.comment, branchId: r.branchId })),
        writeoffs: filt(mockWriteoffs).map((w) => ({ id: w.id, productId: w.productId, qty: w.qty, reason: w.reason, date: w.writeoffDate, comment: w.comment, branchId: w.branchId })),
      };
    }
    const orgFilter = `organization_id=eq.${session.organizationId}`;
    const [products, sales, receipts, writeoffs] = await Promise.all([
      supabaseFetch<any[]>("products", `select=*&${orgFilter}&order=name.asc`),
      supabaseFetch<any[]>("product_sales", `select=*&${orgFilter}&order=sale_date.desc`),
      supabaseFetch<any[]>("product_stock_movements", `select=*&${orgFilter}&order=movement_date.desc`),
      supabaseFetch<any[]>("product_writeoffs", `select=*&${orgFilter}&order=writeoff_date.desc`).catch(() => [] as any[]),
    ]);
    return {
      products: products.map(prodOut),
      sales: sales.map((s) => ({ id: s.id, productId: s.product_id, qty: s.qty, amount: Number(s.amount), method: s.method, soldBy: s.sold_by, date: s.sale_date, branchId: s.branch_id })),
      receipts: receipts.map((r) => ({ id: r.id, productId: r.product_id, qty: r.qty, costPrice: Number(r.cost_price) || 0, date: r.movement_date, comment: r.comment, branchId: r.branch_id })),
      writeoffs: writeoffs.map((w) => ({ id: w.id, productId: w.product_id, qty: w.qty, reason: w.reason, date: w.writeoff_date, comment: w.comment, branchId: w.branch_id })),
    };
  };
  // Остаток по товару = Σ поступлений − Σ продаж − Σ списаний.
  const stockBalance = (productId: string, sales: any[], receipts: any[], writeoffs: any[] = []) =>
    receipts.filter((r) => r.productId === productId).reduce((s, r) => s + r.qty, 0)
    - sales.filter((s) => s.productId === productId).reduce((acc, s) => acc + s.qty, 0)
    - writeoffs.filter((w) => w.productId === productId).reduce((acc, w) => acc + w.qty, 0);

  // Справочник товаров (владелец, управляющий, администратор — для продажи)
  app.get("/api/mvp/products", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role === "teacher") return res.status(403).json({ error: "Раздел недоступен" });
    const { products, sales, receipts, writeoffs } = await loadProducts(session);
    res.json({ products: products.map((pr) => {
      const balance = stockBalance(pr.id, sales, receipts, writeoffs);
      return { ...pr, stock: balance, low: balance <= pr.minStock };
    }) });
  }));

  // Витрина магазина для родителя/ученика — товары с фото и ценой (вся сеть).
  app.get("/api/mvp/shop", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) {
      const items = mockProducts
        .filter((p) => Number(p.salePrice) > 0)
        .map((p) => ({ id: p.id, name: p.name, category: p.category || null, salePrice: Number(p.salePrice) || 0, photoUrl: p.photoUrl || null }));
      return res.json({ products: items });
    }
    const rows = await supabaseFetch<any[]>("products", `select=*&organization_id=eq.${session.organizationId}&order=name.asc`);
    const items = rows
      .filter((r) => (r.is_active ?? true) && Number(r.sale_price) > 0)
      .map((r) => ({ id: r.id, name: r.name, category: r.category || null, salePrice: Number(r.sale_price) || 0, photoUrl: r.photo_url || null }));
    res.json({ products: items });
  }));

  // ===== Заказы из магазина =====
  const ORDER_STATUSES = ["new", "confirmed", "ready", "done", "cancelled"];
  const mockOrders: any[] = [];

  // Оформить заказ (родитель/ученик/любая роль). Списание склада не происходит — это заявка.
  app.post("/api/mvp/shop/orders", ah(async (req, res) => {
    const session = getSession(req);
    const b = req.body || {};
    const rawItems: any[] = Array.isArray(b.items) ? b.items : [];
    if (rawItems.length === 0) return res.status(400).json({ error: "Корзина пуста" });
    // Текущие цены товаров.
    let priceOf: (id: string) => { name: string; price: number; branchId?: string | null } | null;
    if (!supabaseEnabled) {
      priceOf = (id) => { const p = mockProducts.find((x) => x.id === id); return p ? { name: p.name, price: Number(p.salePrice) || 0, branchId: p.branchId } : null; };
    } else {
      const ids = rawItems.map((i) => i.productId).filter(Boolean);
      const rows = ids.length ? await supabaseFetch<any[]>("products", `select=id,name,sale_price,branch_id&organization_id=eq.${session.organizationId}&id=in.(${ids.join(",")})`) : [];
      priceOf = (id) => { const p = rows.find((x) => x.id === id); return p ? { name: p.name, price: Number(p.sale_price) || 0, branchId: p.branch_id } : null; };
    }
    const items = rawItems.map((i) => {
      const meta = priceOf(i.productId);
      const qty = Math.max(1, parseInt(i.qty, 10) || 1);
      const price = meta?.price || 0;
      return { productId: i.productId, productName: meta?.name || i.productName || "Товар", qty, price, amount: qty * price, branchId: meta?.branchId || null };
    }).filter((i) => i.productName);
    const total = items.reduce((s, i) => s + i.amount, 0);
    const branchId = b.branchId || items[0]?.branchId || session.dbBranchId || null;

    if (!supabaseEnabled) {
      const order = { id: uid(), createdAt: new Date().toISOString(), status: "new", customerName: b.customerName || "", customerPhone: b.customerPhone || "", comment: b.comment || null, total, branchId, items };
      mockOrders.unshift(order);
      return res.status(201).json({ order });
    }
    const inserted = await supabaseFetch<any[]>("product_orders", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: branchId, student_id: b.studentId || null, customer_name: b.customerName || null, customer_phone: b.customerPhone || null, status: "new", total, comment: b.comment || null }),
    });
    const orderId = inserted[0].id;
    await supabaseFetch("product_order_items", "", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(items.map((i) => ({ order_id: orderId, product_id: i.productId || null, product_name: i.productName, qty: i.qty, price: i.price, amount: i.amount }))),
    });
    res.status(201).json({ order: { id: orderId, status: "new", total, items } });
  }));

  // Список заказов (владелец/управляющий/администратор).
  app.get("/api/mvp/shop/orders", ah(async (req, res) => {
    const session = getSession(req);
    if (!["owner", "branch_manager", "admin"].includes(session.role)) return res.status(403).json({ error: "Доступно владельцу, управляющему и администратору" });
    if (!supabaseEnabled) {
      const list = session.role === "owner" ? mockOrders : mockOrders.filter((o) => canSeeBranch(session, o.branchId));
      return res.json({ orders: list });
    }
    const orders = await supabaseFetch<any[]>("product_orders", `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`);
    const scoped = orders.filter((o) => canSeeBranch(session, o.branch_id));
    const ids = scoped.map((o) => o.id);
    const allItems = ids.length ? await supabaseFetch<any[]>("product_order_items", `select=*&order_id=in.(${ids.join(",")})`) : [];
    res.json({ orders: scoped.map((o) => ({
      id: o.id, createdAt: o.created_at, status: o.status, customerName: o.customer_name || "", customerPhone: o.customer_phone || "",
      comment: o.comment || null, total: Number(o.total) || 0, branchId: o.branch_id,
      items: allItems.filter((it) => it.order_id === o.id).map((it) => ({ productName: it.product_name, qty: it.qty, price: Number(it.price) || 0, amount: Number(it.amount) || 0 })),
    })) });
  }));

  // Сменить статус заказа (владелец/управляющий/администратор).
  app.patch("/api/mvp/shop/orders/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (!["owner", "branch_manager", "admin"].includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    const status = String((req.body || {}).status || "");
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "Неизвестный статус" });
    if (!supabaseEnabled) {
      const o = mockOrders.find((x) => x.id === req.params.id);
      if (o) {
        // При выдаче — раз создаём продажи по позициям (списываем склад, считаем выручку).
        if (status === "done" && !o.fulfilledAt) {
          o.fulfilledAt = new Date().toISOString();
          for (const it of (o.items || [])) {
            if (!it.productId) continue;
            mockSales.unshift({ id: uid(), productId: it.productId, qty: it.qty, amount: it.amount, method: "transfer", soldBy: "Магазин (заказ)", saleDate: todayStr(), branchId: o.branchId || null });
          }
        }
        o.status = status;
      }
      return res.json({ ok: true, status });
    }
    // Текущее состояние заказа (для одноразового списания при выдаче).
    const cur = await supabaseFetch<any[]>("product_orders", `select=id,status,fulfilled_at,branch_id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`);
    if (!cur[0]) return res.status(404).json({ error: "Заказ не найден" });
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    let fulfilled = false;
    if (status === "done" && !cur[0].fulfilled_at) {
      patch.fulfilled_at = new Date().toISOString();
      const items = await supabaseFetch<any[]>("product_order_items", `select=*&order_id=eq.${req.params.id}`);
      const sales = items.filter((it) => it.product_id).map((it) => ({
        organization_id: session.organizationId, branch_id: cur[0].branch_id || null, product_id: it.product_id,
        qty: it.qty, amount: Number(it.amount) || 0, method: "transfer", sold_by: "Магазин (заказ)", sale_date: todayStr(), comment: "Выдача заказа из магазина",
      }));
      if (sales.length) await supabaseFetch("product_sales", "", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(sales) });
      fulfilled = true;
    }
    await supabaseFetch("product_orders", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    res.json({ ok: true, status, fulfilled });
  }));

  // ======================================================================
  // ВХОД УЧЕНИКА ПО ССЫЛКЕ / QR (миграция 032).
  // Доступ выдают только владелец / руководитель филиала / администратор.
  // Ученик входит по секретному токену; уровень (junior «маленькая» /
  // senior «взрослая») задаёт набор доступных вкладок кабинета.
  // ======================================================================
  // mock-хранилище состояния доступа: studentId -> { token, code, level(ручной|null), enabled, by, at }
  const mockStudentAccess: Record<string, { token: string; code: string; level: "junior" | "senior" | null; enabled: boolean; by: string | null; at: string }> = {};

  const ageFromBirthday = (b?: string | null): number | null => {
    if (!b) return null;
    const d = new Date(b);
    if (isNaN(d.getTime())) return null;
    const t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a;
  };

  // Единый вид ученика для роутов доступа (mock + supabase).
  const loadStudentAccess = async (session: MvpSession, studentId: string): Promise<null | {
    id: string; name: string; age: number | null; branchId: string | null;
    levelManual: "junior" | "senior" | null; token: string | null; code: string | null; enabled: boolean;
  }> => {
    if (!supabaseEnabled) {
      const s: any = initialStudents.find((x: any) => x.id === studentId);
      if (!s) return null;
      const rec = mockStudentAccess[studentId];
      return { id: s.id, name: s.name, age: s.age ?? ageFromBirthday(s.birthday), branchId: s.branchId ?? null,
        levelManual: rec?.level ?? null, token: rec?.token ?? null, code: rec?.code ?? null, enabled: !!rec?.enabled };
    }
    const rows = await supabaseFetch<any[]>("students", `select=id,first_name,last_name,birthday,branch_id,access_level,access_token,access_code,access_enabled&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`);
    const r = rows[0];
    if (!r) return null;
    return { id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.full_name || "Ученик",
      age: ageFromBirthday(r.birthday), branchId: r.branch_id ?? null,
      levelManual: (r.access_level === "junior" || r.access_level === "senior") ? r.access_level : null,
      token: r.access_token ?? null, code: r.access_code ?? null, enabled: !!r.access_enabled };
  };

  const accessStatusOut = (st: { levelManual: "junior" | "senior" | null; age: number | null; token: string | null; code: string | null; enabled: boolean }) => {
    const level = effectiveAccessLevel(st.levelManual, st.age);
    return { enabled: st.enabled, level, levelManual: st.levelManual, autoLevel: effectiveAccessLevel(null, st.age),
      token: st.enabled ? st.token : null, code: st.enabled ? st.code : null, tabs: tabsForLevel(level) };
  };

  // Текущее состояние доступа ученика.
  app.get("/api/mvp/students/:id/access", ah(async (req, res) => {
    const session = getSession(req);
    if (!accessGrantStaff.includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    const st = await loadStudentAccess(session, String(req.params.id));
    if (!st) return res.status(404).json({ error: "Ученик не найден" });
    if (!canSeeBranch(session, st.branchId)) return res.status(403).json({ error: "Ученик другого филиала" });
    res.json(accessStatusOut(st));
  }));

  // Выдать / обновить доступ. body.level: 'auto' | 'junior' | 'senior'.
  app.post("/api/mvp/students/:id/access", ah(async (req, res) => {
    const session = getSession(req);
    if (!accessGrantStaff.includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    const st = await loadStudentAccess(session, String(req.params.id));
    if (!st) return res.status(404).json({ error: "Ученик не найден" });
    if (!canSeeBranch(session, st.branchId)) return res.status(403).json({ error: "Ученик другого филиала" });

    const rawLevel = String((req.body || {}).level || "auto");
    const manual: "junior" | "senior" | null = rawLevel === "junior" || rawLevel === "senior" ? rawLevel : null;
    const token = st.token || newAccessToken();
    // Короткий код — не повторяем существующий, если у ученика он уже есть.
    const uniqueAccessCode = async (): Promise<string> => {
      for (let i = 0; i < 6; i++) {
        const c = newAccessCode();
        if (!supabaseEnabled) {
          if (!Object.values(mockStudentAccess).some((v) => v.code === c)) return c;
        } else {
          const ex = await supabaseFetch<any[]>("students", `select=id&access_code=eq.${c}&limit=1`).catch(() => [] as any[]);
          if (!ex[0]) return c;
        }
      }
      return newAccessCode();
    };
    const code = st.code || (await uniqueAccessCode());
    const level = effectiveAccessLevel(manual, st.age);
    const nowIso = new Date().toISOString();

    if (supabaseEnabled) {
      await supabaseFetch("students", `id=eq.${st.id}&organization_id=eq.${session.organizationId}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ access_token: token, access_code: code, access_level: manual, access_enabled: true, access_granted_by: session.fullName || null, access_granted_at: nowIso }),
      });
    } else {
      mockStudentAccess[st.id] = { token, code, level: manual, enabled: true, by: session.fullName || null, at: nowIso };
    }
    // наполнить резолвер сессий (для обоих режимов)
    studentAccessTokens.set(token, { studentId: st.id, level, branchId: st.branchId });

    res.json({ ...accessStatusOut({ levelManual: manual, age: st.age, token, code, enabled: true }), grantedBy: session.fullName || null, grantedAt: nowIso });
  }));

  // Отозвать доступ.
  app.delete("/api/mvp/students/:id/access", ah(async (req, res) => {
    const session = getSession(req);
    if (!accessGrantStaff.includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    const st = await loadStudentAccess(session, String(req.params.id));
    if (!st) return res.status(404).json({ error: "Ученик не найден" });
    if (!canSeeBranch(session, st.branchId)) return res.status(403).json({ error: "Ученик другого филиала" });
    if (st.token) studentAccessTokens.delete(st.token);
    if (supabaseEnabled) {
      await supabaseFetch("students", `id=eq.${st.id}&organization_id=eq.${session.organizationId}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ access_enabled: false, access_token: null, access_code: null }),
      });
    } else if (mockStudentAccess[st.id]) {
      mockStudentAccess[st.id].enabled = false;
      mockStudentAccess[st.id].token = "";
      mockStudentAccess[st.id].code = "";
    }
    res.json({ ok: true });
  }));

  // Вход ученика: обмен токена (из ссылки/QR) ИЛИ короткого кода (ручной ввод)
  // на профиль + уровень + вкладки. Возвращает и токен — для скоупа последующих
  // запросов (x-student-token).
  app.post("/api/mvp/student-auth", ah(async (req, res) => {
    const body = req.body || {};
    const token = String(body.token || "").trim();
    const code = normalizeAccessCode(body.code || "");
    // Вход ученика по номеру телефона + стандартному паролю.
    const phoneDigits = String(body.phone || "").replace(/\D/g, "").slice(-10);
    const password = String(body.password || "");
    const badCred = () => res.status(401).json({ error: "Код недействителен или доступ отозван" });

    // ── Приоритетный путь: телефон + пароль (пароль у всех учеников стандартный) ──
    if (phoneDigits) {
      if (phoneDigits.length < 10) return res.status(400).json({ error: "Введите номер телефона полностью" });
      if (password !== STUDENT_STANDARD_PASSWORD) return res.status(401).json({ error: "Неверный пароль" });
      const last10 = (v: any) => String(v || "").replace(/\D/g, "").slice(-10);
      if (!supabaseEnabled) {
        const s: any = initialStudents.find((x: any) => last10(x.phone) === phoneDigits || last10(x.parentPhone) === phoneDigits);
        if (!s) return res.status(404).json({ error: "Ученик с таким номером не найден" });
        const level = effectiveAccessLevel(mockStudentAccess[s.id]?.level ?? null, s.age ?? ageFromBirthday(s.birthday));
        return res.json({ studentId: s.id, name: s.name, level, token: null, tabs: tabsForLevel(level) });
      }
      const tail7 = phoneDigits.slice(-7);
      // Внимание: колонки full_name в students НЕТ — её наличие в select ломает
      // весь запрос PostgREST (400), .catch() превращал это в «ученик не найден».
      const rows = await supabaseFetch<any[]>("students", `select=id,first_name,last_name,birthday,branch_id,access_level,phone,parent_phone&or=(phone.like.*${tail7}*,parent_phone.like.*${tail7}*)&limit=20`).catch(() => [] as any[]);
      const r = rows.find((x) => last10(x.phone) === phoneDigits || last10(x.parent_phone) === phoneDigits);
      if (!r) return res.status(404).json({ error: "Ученик с таким номером не найден" });
      const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || "Ученик";
      const level = effectiveAccessLevel(r.access_level, ageFromBirthday(r.birthday));
      return res.json({ studentId: r.id, name, level, token: null, tabs: tabsForLevel(level) });
    }

    if (!token && !code) return res.status(400).json({ error: "Введите номер телефона и пароль" });

    if (!supabaseEnabled) {
      const entry = Object.entries(mockStudentAccess).find(([, v]) =>
        v.enabled && ((token && v.token === token) || (code && v.code === code)));
      const cached = !entry && token ? studentAccessTokens.get(token) : undefined;
      const studentId = entry?.[0] || cached?.studentId;
      if (!studentId) return badCred();
      const s: any = initialStudents.find((x: any) => x.id === studentId);
      if (!s) return res.status(404).json({ error: "Ученик не найден" });
      const rec = mockStudentAccess[studentId];
      const level = effectiveAccessLevel(rec?.level ?? null, s.age ?? ageFromBirthday(s.birthday));
      const outToken = rec?.token || token || "";
      if (outToken) studentAccessTokens.set(outToken, { studentId, level, branchId: s.branchId ?? null });
      return res.json({ studentId, name: s.name, level, token: outToken || null, tabs: tabsForLevel(level) });
    }

    const filter = token
      ? `access_token=eq.${token}`
      : `access_code=eq.${code}`;
    const rows = await supabaseFetch<any[]>("students", `select=id,first_name,last_name,birthday,branch_id,access_level,access_token,access_enabled&${filter}&access_enabled=is.true&limit=1`);
    const r = rows[0];
    if (!r) return badCred();
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.full_name || "Ученик";
    const level = effectiveAccessLevel(r.access_level, ageFromBirthday(r.birthday));
    const outToken = r.access_token || token || "";
    if (outToken) studentAccessTokens.set(outToken, { studentId: r.id, level, branchId: r.branch_id ?? null });
    res.json({ studentId: r.id, name, level, token: outToken || null, tabs: tabsForLevel(level) });
  }));

  // ======================================================================
  // ЭХОБАКСЫ — магазин наград/товаров за внутреннюю валюту (роадмап §2).
  // Кошелёк ученика (students.echo_balance) + история (echo_transactions).
  // Персонал (владелец/управляющий/админ/преподаватель) начисляет и списывает,
  // ученик покупает активные товары с echo_price > 0. Есть mock-фолбэк.
  // ======================================================================
  const echoStaff = ["owner", "branch_manager", "admin", "teacher"];
  const mockEchoBalances: Record<string, number> = {};
  const mockEchoTx: any[] = [];
  const echoTxOut = (t: any) => ({
    id: t.id, studentId: t.studentId ?? t.student_id, amount: Number(t.amount) || 0,
    kind: t.kind || "grant", reason: t.reason ?? null, productId: t.productId ?? t.product_id ?? null,
    balanceAfter: Number(t.balanceAfter ?? t.balance_after) || 0, createdBy: t.createdBy ?? t.created_by ?? null,
    createdAt: t.createdAt ?? t.created_at,
  });

  // ЭхоБаксы: педагог работает только со «своими» учениками — из его групп
  // (groups.teacher_id === session.userId) или закреплёнными за ним напрямую
  // (students.teacher_id). Прочий персонал (owner/BM/admin) скоупится по филиалу
  // через canSeeBranch — здесь возвращаем null (ограничивать не нужно). Для педагога
  // возвращаем Set разрешённых studentId (пустой, если групп нет).
  const teacherStudentScope = async (session: MvpSession): Promise<Set<string> | null> => {
    if (session.role !== "teacher") return null;
    const ids = new Set<string>();
    if (!supabaseEnabled) {
      const gids = new Set(initialGroups.filter((g: any) => g.teacherId === session.userId).map((g: any) => g.id));
      for (const s of initialStudents as any[]) {
        if (s.teacherId === session.userId || (Array.isArray(s.groupIds) && s.groupIds.some((id: string) => gids.has(id)))) ids.add(s.id);
      }
      return ids;
    }
    const groups = await supabaseFetch<any[]>("groups", `select=id&teacher_id=eq.${session.userId}&organization_id=eq.${session.organizationId}`).catch(() => [] as any[]);
    const gids = new Set(groups.map((g) => g.id));
    const rows = await supabaseFetch<any[]>("students", `select=id,group_id,teacher_id&organization_id=eq.${session.organizationId}`).catch(() => [] as any[]);
    for (const s of rows) {
      if (s.teacher_id === session.userId || (s.group_id && gids.has(s.group_id))) ids.add(s.id);
    }
    return ids;
  };

  // Применить движение ЭхоБаксов. amount>0 — начислить, amount<0 — списать.
  // Возвращает {balance} или бросает Error("INSUFFICIENT").
  const applyEcho = async (session: MvpSession, studentId: string, amount: number, kind: string, reason: string | null, productId: string | null) => {
    if (!supabaseEnabled) {
      const cur = mockEchoBalances[studentId] ?? 0;
      const next = cur + amount;
      if (next < 0) throw new Error("INSUFFICIENT");
      mockEchoBalances[studentId] = next;
      const tx = { id: uid(), studentId, amount, kind, reason, productId, balanceAfter: next, createdBy: session.fullName || null, createdAt: new Date().toISOString() };
      mockEchoTx.unshift(tx);
      return { balance: next, tx: echoTxOut(tx) };
    }
    const st = await supabaseFetch<any[]>("students", `select=id,echo_balance&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`);
    if (!st[0]) throw new Error("NOT_FOUND");
    const cur = Number(st[0].echo_balance) || 0;
    const next = cur + amount;
    if (next < 0) throw new Error("INSUFFICIENT");
    await supabaseFetch("students", `id=eq.${studentId}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ echo_balance: next }) });
    const ins = await supabaseFetch<any[]>("echo_transactions", "", { method: "POST", body: JSON.stringify({ organization_id: session.organizationId, student_id: studentId, amount, kind, reason, product_id: productId, balance_after: next, created_by: session.fullName || null }) });
    return { balance: next, tx: ins[0] ? echoTxOut(ins[0]) : null };
  };

  // Каталог магазина ЭхоБаксов: активные товары с ценой в ЭхоБаксах.
  app.get("/api/mvp/shop/echo/catalog", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) {
      const items = mockProducts.filter((p) => p.isActive !== false && Number(p.echoPrice) > 0)
        .map((p) => ({ id: p.id, name: p.name, category: p.category || null, echoPrice: Number(p.echoPrice) || 0, description: p.description || null, photoUrl: p.photoUrl || null }))
        .sort((a, b) => a.echoPrice - b.echoPrice);
      return res.json({ products: items });
    }
    const rows = await supabaseFetch<any[]>("products", `select=*&organization_id=eq.${session.organizationId}`);
    const items = rows.filter((r) => (r.is_active ?? true) && Number(r.echo_price) > 0)
      .map((r) => ({ id: r.id, name: r.name, category: r.category || null, echoPrice: Number(r.echo_price) || 0, description: r.description || null, photoUrl: r.photo_url || null }))
      .sort((a, b) => a.echoPrice - b.echoPrice);
    res.json({ products: items });
  }));

  // Кошелёк ученика: баланс + последние операции.
  app.get("/api/mvp/shop/echo/wallet", ah(async (req, res) => {
    const session = getSession(req);
    const studentId = String((req.query as any).studentId || "");
    if (!studentId) return res.status(400).json({ error: "Не указан ученик" });
    // Ученик видит только свой кошелёк; педагог — только учеников своих групп;
    // прочий персонал — любой.
    if (session.role === "student" && session.studentId !== studentId) {
      return res.status(403).json({ error: "Нет доступа к чужому кошельку" });
    }
    const walletScope = await teacherStudentScope(session);
    if (walletScope && !walletScope.has(studentId)) {
      return res.status(403).json({ error: "Кошелёк доступен только по ученикам своих групп" });
    }
    if (!supabaseEnabled) {
      return res.json({ balance: mockEchoBalances[studentId] ?? 0, transactions: mockEchoTx.filter((t) => t.studentId === studentId).slice(0, 50).map(echoTxOut) });
    }
    const st = await supabaseFetch<any[]>("students", `select=id,echo_balance&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`);
    const balance = st[0] ? Number(st[0].echo_balance) || 0 : 0;
    const tx = await supabaseFetch<any[]>("echo_transactions", `select=*&student_id=eq.${studentId}&order=created_at.desc&limit=50`).catch(() => [] as any[]);
    res.json({ balance, transactions: tx.map(echoTxOut) });
  }));

  // Список учеников с балансами (для начисления персоналом).
  app.get("/api/mvp/shop/echo/students", ah(async (req, res) => {
    const session = getSession(req);
    if (!echoStaff.includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    const listScope = await teacherStudentScope(session);
    if (!supabaseEnabled) {
      const list = initialStudents
        .filter((s: any) => session.role === "owner" || canSeeBranch(session, s.branchId))
        .filter((s: any) => !listScope || listScope.has(s.id))
        .map((s: any) => ({ id: s.id, name: s.name, balance: mockEchoBalances[s.id] ?? 0 }));
      return res.json({ students: list });
    }
    const rows = await supabaseFetch<any[]>("students", `select=id,first_name,last_name,echo_balance,branch_id&organization_id=eq.${session.organizationId}&status=neq.archived&order=first_name.asc`);
    const scoped = rows.filter((r) => canSeeBranch(session, r.branch_id)).filter((r) => !listScope || listScope.has(r.id));
    res.json({ students: scoped.map((r) => ({ id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.full_name || "Ученик", balance: Number(r.echo_balance) || 0 })) });
  }));

  // Начислить / списать ЭхоБаксы (staff). amount может быть отрицательным.
  app.post("/api/mvp/shop/echo/grant", ah(async (req, res) => {
    const session = getSession(req);
    if (!echoStaff.includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    const b = req.body || {};
    const studentId = String(b.studentId || "");
    const amount = Math.trunc(Number(b.amount) || 0);
    if (!studentId) return res.status(400).json({ error: "Не указан ученик" });
    if (!amount) return res.status(400).json({ error: "Укажите количество ЭхоБаксов (со знаком минус — списание)" });
    const grantScope = await teacherStudentScope(session);
    if (grantScope && !grantScope.has(studentId)) {
      return res.status(403).json({ error: "Начислять ЭхоБаксы можно только ученикам своих групп" });
    }
    try {
      const { balance, tx } = await applyEcho(session, studentId, amount, "grant", (b.reason || "").toString().trim() || null, null);
      res.json({ balance, transaction: tx });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT") return res.status(400).json({ error: "Недостаточно баланса для списания" });
      if (e?.message === "NOT_FOUND") return res.status(404).json({ error: "Ученик не найден" });
      throw e;
    }
  }));

  // Покупка товара за ЭхоБаксы (ученик).
  app.post("/api/mvp/shop/echo/purchase", ah(async (req, res) => {
    const session = getSession(req);
    const b = req.body || {};
    const studentId = String(b.studentId || "");
    const productId = String(b.productId || "");
    if (!studentId || !productId) return res.status(400).json({ error: "Не указан ученик или товар" });
    // Ученик покупает только за свой кошелёк.
    if (session.role === "student" && session.studentId !== studentId) {
      return res.status(403).json({ error: "Нельзя покупать за чужой счёт" });
    }
    // Цена и активность товара.
    let prod: { name: string; echoPrice: number; active: boolean } | null = null;
    if (!supabaseEnabled) {
      const p = mockProducts.find((x) => x.id === productId);
      if (p) prod = { name: p.name, echoPrice: Number(p.echoPrice) || 0, active: p.isActive !== false };
    } else {
      const rows = await supabaseFetch<any[]>("products", `select=name,echo_price,is_active&id=eq.${productId}&organization_id=eq.${session.organizationId}&limit=1`);
      if (rows[0]) prod = { name: rows[0].name, echoPrice: Number(rows[0].echo_price) || 0, active: rows[0].is_active ?? true };
    }
    if (!prod) return res.status(404).json({ error: "Товар не найден" });
    if (!prod.active || prod.echoPrice <= 0) return res.status(400).json({ error: "Товар недоступен для покупки за ЭхоБаксы" });
    try {
      const { balance, tx } = await applyEcho(session, studentId, -prod.echoPrice, "purchase", `Покупка: ${prod.name}`, productId);
      res.json({ balance, transaction: tx, productName: prod.name });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT") return res.status(400).json({ error: "Недостаточно ЭхоБаксов для покупки" });
      if (e?.message === "NOT_FOUND") return res.status(404).json({ error: "Ученик не найден" });
      throw e;
    }
  }));

  // ======================================================================
  // ЗАЯВКИ НА ОБМЕН ЭХОБАКСОВ (ТЗ «Магазин», Блок 1) — миграция 035.
  // Ученик (только senior/взрослый) создаёт заявку «Обменять» → pending, без
  // списания. Персонал филиала (владелец/управляющий/админ) подтверждает выдачу
  // (issued): списываются ЭхоБаксы + товар со склада, либо отменяет (cancelled).
  // Есть mock-фолбэк.
  // ======================================================================
  const echoOrderStaff = ["owner", "branch_manager", "admin"];
  const mockEchoOrders: any[] = [];
  const echoOrderOut = (o: any) => ({
    id: o.id, studentId: o.studentId ?? o.student_id, productId: o.productId ?? o.product_id ?? null,
    branchId: o.branchId ?? o.branch_id ?? null,
    studentName: o.studentName ?? o.student_name ?? null, branchName: o.branchName ?? o.branch_name ?? null,
    groupName: o.groupName ?? o.group_name ?? null, teacherName: o.teacherName ?? o.teacher_name ?? null,
    productName: o.productName ?? o.product_name ?? null, productPhoto: o.productPhoto ?? o.product_photo ?? null,
    echoPrice: Number(o.echoPrice ?? o.echo_price) || 0, balance: Number(o.balanceAtRequest ?? o.balance_at_request) || 0,
    status: o.status || "pending", cancelReason: o.cancelReason ?? o.cancel_reason ?? null,
    decidedBy: o.decidedBy ?? o.decided_by ?? null, createdAt: o.createdAt ?? o.created_at,
    decidedAt: o.decidedAt ?? o.decided_at ?? null,
  });

  // Снапшот карточки ученика для заявки: ФИО, филиал, группа, педагог, баланс.
  const resolveEchoCard = async (session: MvpSession, studentId: string): Promise<null | {
    name: string; branchId: string | null; branchName: string | null; groupName: string | null; teacherName: string | null; balance: number;
  }> => {
    if (!supabaseEnabled) {
      const s: any = initialStudents.find((x: any) => x.id === studentId);
      if (!s) return null;
      const g: any = initialGroups.find((x: any) => x.id === s.groupId);
      const t: any = initialTeachers.find((x: any) => x.id === (g?.teacherId ?? s.teacherId));
      const b: any = initialBranches.find((x: any) => x.id === s.branchId);
      return { name: s.name || "Ученик", branchId: s.branchId ?? null, branchName: b?.name ?? null, groupName: g?.name ?? null, teacherName: t?.name ?? null, balance: mockEchoBalances[studentId] ?? 0 };
    }
    const st = await supabaseFetch<any[]>("students", `select=*&id=eq.${studentId}&organization_id=eq.${session.organizationId}&limit=1`).catch(() => [] as any[]);
    if (!st[0]) return null;
    const s = st[0];
    const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.full_name || "Ученик";
    let branchName: string | null = null, groupName: string | null = null, teacherName: string | null = null;
    if (s.branch_id) { const b = await supabaseFetch<any[]>("branches", `select=name&id=eq.${s.branch_id}&limit=1`).catch(() => [] as any[]); branchName = b[0]?.name ?? null; }
    if (s.group_id) {
      const g = await supabaseFetch<any[]>("groups", `select=name,teacher_id&id=eq.${s.group_id}&limit=1`).catch(() => [] as any[]);
      groupName = g[0]?.name ?? null;
      const tid = g[0]?.teacher_id ?? s.teacher_id;
      if (tid) { const t = await supabaseFetch<any[]>("teachers", `select=name,first_name,last_name&id=eq.${tid}&limit=1`).catch(() => [] as any[]); teacherName = t[0]?.name ?? [t[0]?.first_name, t[0]?.last_name].filter(Boolean).join(" ") ?? null; }
    }
    return { name, branchId: s.branch_id ?? null, branchName, groupName, teacherName, balance: Number(s.echo_balance) || 0 };
  };

  // Текущий остаток товара на складе (для проверки наличия).
  const productStock = async (session: MvpSession, productId: string): Promise<number> => {
    const { sales, receipts, writeoffs } = await loadProducts(session);
    return stockBalance(productId, sales, receipts, writeoffs);
  };

  // Создать заявку на обмен (ученик). Списания нет — только заявка.
  app.post("/api/mvp/shop/echo/orders", ah(async (req, res) => {
    const session = getSession(req);
    // Только взрослые (senior). junior — блокируем (undefined в демо не блокируется).
    if (session.role === "student" && session.accessLevel === "junior") {
      return res.status(403).json({ error: "Обмен ЭхоБаксов доступен только взрослой группе" });
    }
    const b = req.body || {};
    const studentId = String(b.studentId || session.studentId || "");
    const productId = String(b.productId || "");
    if (!studentId || !productId) return res.status(400).json({ error: "Не указан ученик или товар" });
    if (session.role === "student" && session.studentId && session.studentId !== studentId) {
      return res.status(403).json({ error: "Нельзя оформлять заявку за другого ученика" });
    }
    // Товар: активность + цена в ЭхоБаксах + фото.
    let prod: { name: string; echoPrice: number; active: boolean; photo: string | null } | null = null;
    if (!supabaseEnabled) {
      const p = mockProducts.find((x) => x.id === productId);
      if (p) prod = { name: p.name, echoPrice: Number(p.echoPrice) || 0, active: p.isActive !== false, photo: p.photoUrl || null };
    } else {
      const rows = await supabaseFetch<any[]>("products", `select=name,echo_price,is_active,photo_url&id=eq.${productId}&organization_id=eq.${session.organizationId}&limit=1`);
      if (rows[0]) prod = { name: rows[0].name, echoPrice: Number(rows[0].echo_price) || 0, active: rows[0].is_active ?? true, photo: rows[0].photo_url || null };
    }
    if (!prod) return res.status(404).json({ error: "Товар не найден" });
    if (!prod.active || prod.echoPrice <= 0) return res.status(400).json({ error: "Товар недоступен для обмена на ЭхоБаксы" });
    // Наличие на складе.
    if (await productStock(session, productId) <= 0) return res.status(400).json({ error: "Товара нет в наличии — обмен временно недоступен" });
    // Карточка ученика + баланс.
    const card = await resolveEchoCard(session, studentId);
    if (!card) return res.status(404).json({ error: "Ученик не найден" });
    if (card.balance < prod.echoPrice) return res.status(400).json({ error: "Недостаточно ЭхоБаксов для обмена" });
    // Одна активная заявка на товар за раз.
    const dupPending = (list: any[]) => list.some((o) => (o.studentId ?? o.student_id) === studentId && (o.productId ?? o.product_id) === productId && o.status === "pending");
    if (!supabaseEnabled) {
      if (dupPending(mockEchoOrders)) return res.status(400).json({ error: "Заявка на этот товар уже создана и ожидает выдачи" });
      const order = { id: uid(), studentId, productId, branchId: card.branchId, studentName: card.name, branchName: card.branchName, groupName: card.groupName, teacherName: card.teacherName, productName: prod.name, productPhoto: prod.photo, echoPrice: prod.echoPrice, balanceAtRequest: card.balance, status: "pending", cancelReason: null, decidedBy: null, createdAt: new Date().toISOString(), decidedAt: null };
      mockEchoOrders.unshift(order);
      return res.status(201).json({ order: echoOrderOut(order) });
    }
    const exist = await supabaseFetch<any[]>("echo_orders", `select=id&student_id=eq.${studentId}&product_id=eq.${productId}&status=eq.pending&limit=1`).catch(() => [] as any[]);
    if (dupPending(exist)) return res.status(400).json({ error: "Заявка на этот товар уже создана и ожидает выдачи" });
    const ins = await supabaseFetch<any[]>("echo_orders", "", { method: "POST", body: JSON.stringify({
      organization_id: session.organizationId, student_id: studentId, product_id: productId, branch_id: card.branchId,
      student_name: card.name, branch_name: card.branchName, group_name: card.groupName, teacher_name: card.teacherName,
      product_name: prod.name, product_photo: prod.photo, echo_price: prod.echoPrice, balance_at_request: card.balance, status: "pending",
    }) });
    res.status(201).json({ order: ins[0] ? echoOrderOut(ins[0]) : null });
  }));

  // Список заявок. С ?studentId= — заявки ученика (кабинет). Без — инбокс персонала (по филиалу).
  app.get("/api/mvp/shop/echo/orders", ah(async (req, res) => {
    const session = getSession(req);
    const studentId = String((req.query as any).studentId || "");
    const rows: any[] = supabaseEnabled
      ? await supabaseFetch<any[]>("echo_orders", `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`)
      : mockEchoOrders.slice();
    if (studentId) {
      if (session.role === "student" && session.studentId && session.studentId !== studentId) {
        return res.status(403).json({ error: "Нет доступа к чужим заявкам" });
      }
      return res.json({ orders: rows.filter((o) => (o.studentId ?? o.student_id) === studentId).map(echoOrderOut) });
    }
    if (!echoOrderStaff.includes(session.role)) return res.status(403).json({ error: "Доступно владельцу, управляющему и администратору" });
    const scoped = rows.filter((o) => canSeeBranch(session, o.branchId ?? o.branch_id));
    res.json({ orders: scoped.map(echoOrderOut) });
  }));

  // Выдать / отменить заявку (персонал). body: { action: 'issue' | 'cancel', reason? }.
  app.patch("/api/mvp/shop/echo/orders/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (!echoOrderStaff.includes(session.role)) return res.status(403).json({ error: "Недостаточно прав" });
    const action = String((req.body || {}).action || "");
    const reason = String((req.body || {}).reason || "").trim() || null;
    if (!["issue", "cancel"].includes(action)) return res.status(400).json({ error: "Неизвестное действие" });

    // Загрузить заявку.
    let order: any;
    if (!supabaseEnabled) {
      order = mockEchoOrders.find((o) => o.id === req.params.id);
    } else {
      const rows = await supabaseFetch<any[]>("echo_orders", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&limit=1`);
      order = rows[0];
    }
    if (!order) return res.status(404).json({ error: "Заявка не найдена" });
    const oBranch = order.branchId ?? order.branch_id;
    if (!canSeeBranch(session, oBranch)) return res.status(403).json({ error: "Заявка другого филиала" });
    if (order.status !== "pending") return res.status(400).json({ error: "Заявка уже обработана" });
    const studentId = order.studentId ?? order.student_id;
    const productId = order.productId ?? order.product_id;
    const price = Number(order.echoPrice ?? order.echo_price) || 0;
    const productName = order.productName ?? order.product_name ?? "Товар";
    const nowIso = new Date().toISOString();

    if (action === "cancel") {
      if (!supabaseEnabled) { order.status = "cancelled"; order.cancelReason = reason; order.decidedBy = session.fullName || null; order.decidedAt = nowIso; return res.json({ ok: true, order: echoOrderOut(order) }); }
      await supabaseFetch("echo_orders", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "cancelled", cancel_reason: reason, decided_by: session.fullName || null, decided_at: nowIso }) });
      return res.json({ ok: true, status: "cancelled" });
    }

    // action === "issue": проверить наличие, списать баксы, списать склад, закрыть.
    if (productId && await productStock(session, productId) <= 0) return res.status(400).json({ error: "Товара нет на складе — выдача невозможна" });
    try {
      await applyEcho(session, studentId, -price, "purchase", `Магазин: ${productName}`, productId || null);
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT") return res.status(400).json({ error: "У ученика недостаточно ЭхоБаксов" });
      if (e?.message === "NOT_FOUND") return res.status(404).json({ error: "Ученик не найден" });
      throw e;
    }
    // Списание со склада (расход, без выручки).
    if (productId) {
      if (!supabaseEnabled) {
        mockWriteoffs.unshift({ id: uid(), productId, qty: 1, reason: "Выдача из магазина ЭхоБаксов", writeoffDate: todayStr(), comment: `Заявка ${order.studentName ?? order.student_name ?? ""}`.trim(), branchId: oBranch || demoBranchAlmaty });
      } else {
        await supabaseFetch("product_writeoffs", "", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ organization_id: session.organizationId, branch_id: oBranch || null, product_id: productId, qty: 1, reason: "Выдача из магазина ЭхоБаксов", writeoff_date: todayStr(), comment: `Заявка магазина: ${order.student_name || ""}`.trim() }) }).catch((e: any) => console.warn("[echo-order] списание склада не прошло:", e?.message || e));
      }
    }
    if (!supabaseEnabled) { order.status = "issued"; order.decidedBy = session.fullName || null; order.decidedAt = nowIso; return res.json({ ok: true, order: echoOrderOut(order) }); }
    await supabaseFetch("echo_orders", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "issued", decided_by: session.fullName || null, decided_at: nowIso }) });
    res.json({ ok: true, status: "issued" });
  }));

  // ===== Маркетинг: авторассылка приглашений (WhatsApp Cloud API) =====
  // Работает, если заданы WHATSAPP_TOKEN и WHATSAPP_PHONE_ID. Иначе 503 — фронт
  // переключается на ручное открытие диалогов wa.me.
  app.post("/api/mvp/marketing/broadcast", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно владельцу" });
    const token = process.env.WHATSAPP_TOKEN, phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) return res.status(503).json({ error: "Авторассылка не настроена (нет WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)" });
    const recipients: any[] = Array.isArray((req.body || {}).recipients) ? req.body.recipients : [];
    const template = String((req.body || {}).template || "");
    if (recipients.length === 0) return res.status(400).json({ error: "Нет получателей" });
    const results: any[] = [];
    for (const r of recipients) {
      const phone = String(r.phone || "").replace(/\D/g, "");
      if (!phone) { results.push({ phone: r.phone, ok: false, error: "нет телефона" }); continue; }
      const text = template.replace(/\{имя\}/g, String(r.name || "").split(" ")[0] || "");
      try {
        const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
        });
        results.push({ phone, ok: resp.ok });
      } catch (e: any) { results.push({ phone, ok: false, error: e?.message }); }
    }
    res.json({ sent: results.filter((x) => x.ok).length, total: recipients.length, results });
  }));

  // Продажи (владелец/управляющий — все; администратор — только сегодня = касса дня)
  app.get("/api/mvp/products/sales", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role === "teacher") return res.status(403).json({ error: "Раздел недоступен" });
    const { products, sales } = await loadProducts(session);
    const nameOf = (id: string) => products.find((p) => p.id === id)?.name || "—";
    const q = req.query as Record<string, string>;
    let from = q.from, to = q.to;
    if (session.role === "admin") { from = todayStr(); to = todayStr(); } // админ видит только сегодняшнюю кассу
    let list = sales;
    if (from) list = list.filter((s) => s.date >= from!);
    if (to) list = list.filter((s) => s.date <= to!);
    res.json({ sales: list.map((s) => ({ ...s, productName: nameOf(s.productId) })) });
  }));

  // Остатки (владелец/управляющий)
  app.get("/api/mvp/products/stock", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Остатки доступны владельцу и управляющему" });
    const { products, sales, receipts, writeoffs } = await loadProducts(session);
    const rows = products.map((pr) => {
      const received = receipts.filter((r) => r.productId === pr.id).reduce((s, r) => s + r.qty, 0);
      const sold = sales.filter((s) => s.productId === pr.id).reduce((s, x) => s + x.qty, 0);
      const written = writeoffs.filter((w) => w.productId === pr.id).reduce((s, x) => s + x.qty, 0);
      const balance = received - sold - written;
      return { productId: pr.id, name: pr.name, sku: pr.sku, received, sold, written, balance, costPrice: pr.costPrice, salePrice: pr.salePrice, stockValue: balance * pr.costPrice, retailValue: balance * pr.salePrice, minStock: pr.minStock, low: balance <= pr.minStock };
    });
    // Сводка по складу: на какую сумму закуплен товар, в каком количестве.
    const summary = {
      units: rows.reduce((s, r) => s + Math.max(0, r.balance), 0),
      stockValue: rows.reduce((s, r) => s + Math.max(0, r.balance) * r.costPrice, 0),
      retailValue: rows.reduce((s, r) => s + Math.max(0, r.balance) * r.salePrice, 0),
      positions: rows.filter((r) => r.balance > 0).length,
    };
    res.json({ stock: rows, summary });
  }));

  // Списания (владелец/управляющий)
  app.get("/api/mvp/products/writeoffs", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Доступно владельцу и управляющему" });
    const { products, writeoffs } = await loadProducts(session);
    const nameOf = (id: string) => products.find((p) => p.id === id)?.name || "—";
    res.json({ writeoffs: writeoffs.map((w) => ({ ...w, productName: nameOf(w.productId) })) });
  }));

  // Поступления товара (владелец/управляющий)
  app.get("/api/mvp/products/receipts", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Доступно владельцу и управляющему" });
    const { products, receipts } = await loadProducts(session);
    const nameOf = (id: string) => products.find((p) => p.id === id)?.name || "—";
    res.json({ receipts: receipts.map((r) => ({ ...r, productName: nameOf(r.productId) })) });
  }));

  // Аналитика товаров (владелец/управляющий) — выручка за период + прибыль + топ + низкий остаток
  app.get("/api/mvp/products/overview", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Аналитика доступна владельцу и управляющему" });
    const q = req.query as Record<string, string>;
    const r = periodRanges(q.period, q.from, q.to);
    const { products, sales, receipts, writeoffs } = await loadProducts(session);
    const costOf = (id: string) => products.find((p) => p.id === id)?.costPrice || 0;
    const sumRev = (range: { start: string; end: string }) => sales.filter((s) => inRange(s.date, range)).reduce((acc, s) => acc + s.amount, 0);
    const curRev = sumRev(r.cur), prevRev = sumRev(r.prev), yoyRev = sumRev(r.yoy);
    const curSales = sales.filter((s) => inRange(s.date, r.cur));
    const unitsSold = curSales.reduce((s, x) => s + x.qty, 0);
    const avgCheck = curSales.length > 0 ? Math.round(curRev / curSales.length) : 0;
    const grossProfit = curSales.reduce((acc, s) => acc + (s.amount - s.qty * costOf(s.productId)), 0);
    const margin = curRev > 0 ? Math.round((grossProfit / curRev) * 100) : 0;
    const lowStock = products
      .map((pr) => ({ id: pr.id, name: pr.name, stock: stockBalance(pr.id, sales, receipts, writeoffs), minStock: pr.minStock }))
      .filter((x) => x.stock <= x.minStock);
    const top = products
      .map((pr) => ({ id: pr.id, name: pr.name, revenue: sales.filter((s) => s.productId === pr.id && inRange(s.date, r.cur)).reduce((a, s) => a + s.amount, 0), qty: sales.filter((s) => s.productId === pr.id && inRange(s.date, r.cur)).reduce((a, s) => a + s.qty, 0) }))
      .filter((x) => x.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    // Склад сейчас: сколько денег «лежит» на складе и в каком количестве (по закупке и по продаже).
    let stockUnits = 0, stockValue = 0, retailValue = 0;
    for (const pr of products) {
      const bal = Math.max(0, stockBalance(pr.id, sales, receipts, writeoffs));
      stockUnits += bal; stockValue += bal * pr.costPrice; retailValue += bal * pr.salePrice;
    }
    // График выручки по месяцам (последние 6 месяцев включительно) — для мини-спарклайна на дашборде.
    const months: string[] = [];
    const md = new Date(); md.setDate(1);
    for (let i = 5; i >= 0; i--) { const d = new Date(md.getFullYear(), md.getMonth() - i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
    const byMonth = months.map((mo) => ({ month: mo, amount: sales.filter((s) => String(s.date).slice(0, 7) === mo).reduce((acc, s) => acc + s.amount, 0) }));
    res.json({
      revenue: { total: curRev, momPct: pctDelta(curRev, prevRev), yoyPct: pctDelta(curRev, yoyRev) },
      unitsSold, avgCheck, grossProfit, margin, lowStock, top, byMonth,
      stockUnits, stockValue, retailValue,
    });
  }));

  // Создать товар (владелец/управляющий)
  app.post("/api/mvp/products", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Создавать товары может владелец или управляющий" });
    const p = req.body || {};
    if (!String(p.name || "").trim()) return res.status(400).json({ error: "Укажите название товара" });
    if (!supabaseEnabled) {
      const rec = { id: uid(), name: String(p.name).trim(), category: p.category || null, sku: p.sku || null, salePrice: Number(p.salePrice) || 0, costPrice: Number(p.costPrice) || 0, minStock: Number(p.minStock) || 0, comment: p.comment || null, description: p.description || null, echoPrice: Number(p.echoPrice) || 0, isActive: p.isActive !== false, photoUrl: p.photoUrl || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty };
      mockProducts.unshift(rec);
      return res.status(201).json({ product: { ...prodOut(rec), stock: 0, low: 0 <= rec.minStock } });
    }
    const inserted = await supabaseFetch<any[]>("products", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, name: String(p.name).trim(), category: p.category || null, sku: p.sku || null, sale_price: Number(p.salePrice) || 0, cost_price: Number(p.costPrice) || 0, min_stock: Number(p.minStock) || 0, comment: p.comment || null, description: p.description || null, echo_price: Number(p.echoPrice) || 0, is_active: p.isActive !== false, photo_url: p.photoUrl || null }),
    });
    res.status(201).json({ product: { ...prodOut(inserted[0]), stock: 0, low: 0 <= (Number(p.minStock) || 0) } });
  }));

  // Изменить товар (владелец/управляющий)
  app.patch("/api/mvp/products/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Недостаточно прав" });
    const p = req.body || {};
    if (!supabaseEnabled) {
      const rec = mockProducts.find((x) => x.id === req.params.id);
      if (!rec) return res.status(404).json({ error: "Товар не найден" });
      ["name", "category", "sku", "comment", "description", "photoUrl"].forEach((k) => { if (p[k] !== undefined) rec[k] = p[k]; });
      if (p.salePrice !== undefined) rec.salePrice = Number(p.salePrice) || 0;
      if (p.costPrice !== undefined) rec.costPrice = Number(p.costPrice) || 0;
      if (p.minStock !== undefined) rec.minStock = Number(p.minStock) || 0;
      if (p.echoPrice !== undefined) rec.echoPrice = Number(p.echoPrice) || 0;
      if (p.isActive !== undefined) rec.isActive = !!p.isActive;
      return res.json({ product: prodOut(rec) });
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.name !== undefined) patch.name = p.name;
    if (p.category !== undefined) patch.category = p.category || null;
    if (p.sku !== undefined) patch.sku = p.sku || null;
    if (p.photoUrl !== undefined) patch.photo_url = p.photoUrl || null;
    if (p.salePrice !== undefined) patch.sale_price = Number(p.salePrice) || 0;
    if (p.costPrice !== undefined) patch.cost_price = Number(p.costPrice) || 0;
    if (p.minStock !== undefined) patch.min_stock = Number(p.minStock) || 0;
    if (p.comment !== undefined) patch.comment = p.comment || null;
    if (p.description !== undefined) patch.description = p.description || null;
    if (p.echoPrice !== undefined) patch.echo_price = Number(p.echoPrice) || 0;
    if (p.isActive !== undefined) patch.is_active = !!p.isActive;
    const rows = await supabaseFetch<any[]>("products", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    res.json({ product: rows[0] ? prodOut(rows[0]) : null });
  }));

  // Оформить продажу (владелец/управляющий/администратор)
  app.post("/api/mvp/products/sales", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role === "teacher") return res.status(403).json({ error: "Раздел недоступен" });
    const p = req.body || {};
    const qty = Number(p.qty) || 1;
    if (!p.productId) return res.status(400).json({ error: "Выберите товар" });
    if (qty <= 0) return res.status(400).json({ error: "Количество должно быть больше нуля" });
    if (!supabaseEnabled) {
      const prod = mockProducts.find((x) => x.id === p.productId);
      const amount = Number(p.amount) || qty * (prod?.salePrice || 0);
      const rec = { id: uid(), productId: p.productId, qty, amount, method: p.method || "cash", soldBy: p.soldBy || session.fullName, saleDate: p.date || todayStr(), branchId: p.branchId || session.dbBranchId || demoBranchAlmaty, comment: p.comment || null };
      mockSales.unshift(rec);
      return res.status(201).json({ sale: { id: rec.id, productId: rec.productId, productName: prod?.name || "—", qty, amount, method: rec.method, soldBy: rec.soldBy, date: rec.saleDate } });
    }
    const prodRows = await supabaseFetch<any[]>("products", `select=*&id=eq.${p.productId}&organization_id=eq.${session.organizationId}`);
    const prod = prodRows[0];
    const amount = Number(p.amount) || qty * (Number(prod?.sale_price) || 0);
    const inserted = await supabaseFetch<any[]>("product_sales", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, product_id: p.productId, qty, amount, method: p.method || "cash", sold_by: p.soldBy || session.fullName, sale_date: p.date || todayStr(), comment: p.comment || null }),
    });
    res.status(201).json({ sale: { id: inserted[0].id, productId: p.productId, productName: prod?.name || "—", qty, amount, method: inserted[0].method, soldBy: inserted[0].sold_by, date: inserted[0].sale_date } });
  }));

  // Оформить поступление товара (владелец/управляющий)
  app.post("/api/mvp/products/receipts", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Поступления оформляет владелец или управляющий" });
    const p = req.body || {};
    const qty = Number(p.qty) || 0;
    if (!p.productId) return res.status(400).json({ error: "Выберите товар" });
    if (qty <= 0) return res.status(400).json({ error: "Количество должно быть больше нуля" });
    if (!supabaseEnabled) {
      const rec = { id: uid(), productId: p.productId, qty, costPrice: Number(p.costPrice) || 0, movementDate: p.date || todayStr(), comment: p.comment || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty };
      mockReceipts.unshift(rec);
      return res.status(201).json({ receipt: { id: rec.id, productId: rec.productId, qty, costPrice: rec.costPrice, date: rec.movementDate, comment: rec.comment } });
    }
    const inserted = await supabaseFetch<any[]>("product_stock_movements", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, product_id: p.productId, qty, cost_price: Number(p.costPrice) || null, movement_date: p.date || todayStr(), comment: p.comment || null }),
    });
    res.status(201).json({ receipt: { id: inserted[0].id, productId: p.productId, qty, costPrice: Number(inserted[0].cost_price) || 0, date: inserted[0].movement_date, comment: inserted[0].comment } });
  }));

  // Оформить списание товара (владелец/управляющий). Остаток уменьшается.
  app.post("/api/mvp/products/writeoffs", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Списания оформляет владелец или управляющий" });
    const p = req.body || {};
    const qty = Number(p.qty) || 0;
    if (!p.productId) return res.status(400).json({ error: "Выберите товар" });
    if (qty <= 0) return res.status(400).json({ error: "Количество должно быть больше нуля" });
    if (!supabaseEnabled) {
      const rec = { id: uid(), productId: p.productId, qty, reason: p.reason || null, writeoffDate: p.date || todayStr(), comment: p.comment || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty };
      mockWriteoffs.unshift(rec);
      return res.status(201).json({ writeoff: { id: rec.id, productId: rec.productId, qty, reason: rec.reason, date: rec.writeoffDate, comment: rec.comment } });
    }
    const inserted = await supabaseFetch<any[]>("product_writeoffs", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, product_id: p.productId, qty, reason: p.reason || null, writeoff_date: p.date || todayStr(), comment: p.comment || null }),
    });
    res.status(201).json({ writeoff: { id: inserted[0].id, productId: p.productId, qty, reason: inserted[0].reason, date: inserted[0].writeoff_date, comment: inserted[0].comment } });
  }));

  // Удалить списание (владелец/управляющий)
  app.delete("/api/mvp/products/writeoffs/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Недостаточно прав" });
    if (!supabaseEnabled) {
      const i = mockWriteoffs.findIndex((x) => x.id === req.params.id);
      if (i >= 0) mockWriteoffs.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("product_writeoffs", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // ============================================================
  // РАЗДЕЛ «КАРТОЧКА ПЕДАГОГА» (миграция 020)
  // ============================================================
  // KPI/качество/группы/рейтинг считаются на фронте из уже загруженных данных.
  // Здесь — только персистентное: зарплатная схема, выплаты, чек-лист стажировки.
  const COMP_SCHEMES = ["percent", "per_lesson", "fixed", "mixed"];
  const DEFAULT_ONBOARDING = [
    { key: "doc_signed", title: "Подписан договор" },
    { key: "intro_training", title: "Пройдено вводное обучение" },
    { key: "first_lesson", title: "Проведено первое занятие" },
    { key: "mentor_review", title: "Оценка наставника" },
    { key: "probation_passed", title: "Испытательный срок пройден" },
  ];
  const defaultComp = () => ({ scheme: "percent", baseSalary: 0, percent: 0, perLessonRate: 0, comment: null });
  const compOut = (r: any) => ({ scheme: r.scheme || "percent", baseSalary: Number(r.base_salary) || 0, percent: Number(r.percent) || 0, perLessonRate: Number(r.per_lesson_rate) || 0, comment: r.comment ?? null });
  const onbOut = (r: any) => ({ id: r.id, stepKey: r.step_key ?? r.stepKey, title: r.title, done: !!r.done, doneAt: r.done_at ?? r.doneAt ?? null, sort: r.sort ?? 0 });
  const payoutOut = (r: any) => ({ id: r.id, periodStart: r.period_start ?? r.periodStart, periodEnd: r.period_end ?? r.periodEnd, amount: Number(r.amount) || 0, status: r.status || "planned", comment: r.comment ?? null, createdAt: r.created_at ?? r.createdAt });

  // Mock-хранилища карточки педагога
  const mockTeacherComp: Record<string, any> = {};
  const mockTeacherPayouts: any[] = [];
  const mockTeacherOnboarding: Record<string, any[]> = {};
  const seedMockOnboarding = (tid: string) => {
    if (!mockTeacherOnboarding[tid]) {
      mockTeacherOnboarding[tid] = DEFAULT_ONBOARDING.map((s, i) => ({ id: uid(), stepKey: s.key, title: s.title, done: i < 3, doneAt: i < 3 ? new Date().toISOString() : null, sort: i + 1 }));
    }
    return mockTeacherOnboarding[tid];
  };

  // Карточка педагога: компенсация + выплаты + онбординг + кол-во проведённых занятий за период
  app.get("/api/mvp/teachers/:id/card", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Карточка педагога доступна владельцу" });
    const tid = req.params.id;
    const q = req.query as Record<string, string>;
    const r = periodRanges(q.period, q.from, q.to);
    if (!supabaseEnabled) {
      return res.json({
        compensation: mockTeacherComp[tid] || defaultComp(),
        onboarding: seedMockOnboarding(tid),
        payouts: mockTeacherPayouts.filter((p) => p.teacherId === tid),
        lessonsCompleted: 0,
        period: r.cur,
      });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const [compRows, onbRows, payoutRows, lessons] = await Promise.all([
      supabaseFetch<any[]>("teacher_compensation", `select=*&${orgF}&teacher_id=eq.${tid}&limit=1`),
      supabaseFetch<any[]>("teacher_onboarding", `select=*&${orgF}&teacher_id=eq.${tid}&order=sort.asc`),
      supabaseFetch<any[]>("teacher_payouts", `select=*&${orgF}&teacher_id=eq.${tid}&order=created_at.desc&limit=200`),
      // «Проведённые» = прошедшие непроведённые уроки (ends_at в прошлом, не отменены) —
      // авто-учёт без ручного закрытия. Физическое закрытие — POST /lessons/autoclose.
      supabaseFetch<any[]>("schedule_lessons", `select=id&teacher_id=eq.${tid}&status=neq.cancelled&ends_at=lt.${new Date().toISOString()}&starts_at=gte.${r.cur.start}T00:00:00&starts_at=lte.${r.cur.end}T23:59:59`),
    ]);
    let onboarding = onbRows;
    if (onboarding.length === 0) {
      const rows = DEFAULT_ONBOARDING.map((s, i) => ({ organization_id: session.organizationId, teacher_id: tid, step_key: s.key, title: s.title, done: false, sort: i + 1 }));
      try { onboarding = await supabaseFetch<any[]>("teacher_onboarding", "", { method: "POST", body: JSON.stringify(rows) }); } catch { onboarding = []; }
      onboarding = (onboarding || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }
    res.json({
      compensation: compRows[0] ? compOut(compRows[0]) : defaultComp(),
      onboarding: onboarding.map(onbOut),
      payouts: payoutRows.map(payoutOut),
      lessonsCompleted: lessons.length,
      period: r.cur,
    });
  }));

  // Сохранить зарплатную схему педагога
  app.patch("/api/mvp/teachers/:id/compensation", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Изменять может только владелец" });
    const tid = req.params.id; const p = req.body || {};
    const payload = {
      scheme: COMP_SCHEMES.includes(p.scheme) ? p.scheme : "percent",
      base_salary: Number(p.baseSalary) || 0,
      percent: Number(p.percent) || 0,
      per_lesson_rate: Number(p.perLessonRate) || 0,
      comment: p.comment || null,
    };
    if (!supabaseEnabled) {
      mockTeacherComp[tid] = { scheme: payload.scheme, baseSalary: payload.base_salary, percent: payload.percent, perLessonRate: payload.per_lesson_rate, comment: payload.comment };
      return res.json({ compensation: mockTeacherComp[tid] });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const existing = await supabaseFetch<any[]>("teacher_compensation", `select=id&${orgF}&teacher_id=eq.${tid}&limit=1`);
    let rows: any[];
    if (existing[0]) {
      rows = await supabaseFetch<any[]>("teacher_compensation", `id=eq.${existing[0].id}`, { method: "PATCH", body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }) });
    } else {
      rows = await supabaseFetch<any[]>("teacher_compensation", "", { method: "POST", body: JSON.stringify({ organization_id: session.organizationId, teacher_id: tid, ...payload }) });
    }
    res.json({ compensation: rows[0] ? compOut(rows[0]) : defaultComp() });
  }));

  // ---- Профиль педагога: категория, даты, статус (настраивается владельцем) ----
  app.get("/api/mvp/teachers/:id/profile", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.json({ profile: null });
    const rows = await supabaseFetch<any[]>("teacher_profiles", `select=*&organization_id=eq.${session.organizationId}&teacher_id=eq.${req.params.id}&limit=1`);
    const p = rows[0];
    res.json({ profile: p ? { teacherId: p.teacher_id, category: p.category, birthDate: p.birth_date, hiredOn: p.hired_on, status: p.status, notes: p.notes } : null });
  }));

  app.patch("/api/mvp/teachers/:id/profile", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const tid = req.params.id; const p = req.body || {};
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.category !== undefined) payload.category = p.category === null || p.category === "" ? null : Number(p.category);
    if (p.birthDate !== undefined) payload.birth_date = p.birthDate || null;
    if (p.hiredOn !== undefined) payload.hired_on = p.hiredOn || null;
    if (p.status !== undefined) payload.status = p.status || "active";
    if (p.notes !== undefined) payload.notes = p.notes || null;
    const existing = await supabaseFetch<any[]>("teacher_profiles", `select=teacher_id&organization_id=eq.${session.organizationId}&teacher_id=eq.${tid}&limit=1`);
    let rows: any[];
    if (existing[0]) {
      rows = await supabaseFetch<any[]>("teacher_profiles", `teacher_id=eq.${tid}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      rows = await supabaseFetch<any[]>("teacher_profiles", "", { method: "POST", body: JSON.stringify({ teacher_id: tid, organization_id: session.organizationId, ...payload }) });
    }
    const r = rows[0] || {};
    res.json({ profile: { teacherId: tid, category: r.category, birthDate: r.birth_date, hiredOn: r.hired_on, status: r.status, notes: r.notes } });
  }));

  // ---- KPI педагога по месяцам ----
  app.get("/api/mvp/teachers/:id/kpi", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.json({ kpi: [] });
    const rows = await supabaseFetch<any[]>("teacher_kpi", `select=*&organization_id=eq.${session.organizationId}&teacher_id=eq.${req.params.id}&order=period_month.desc`);
    res.json({ kpi: rows.map((k) => ({ id: k.id, periodMonth: k.period_month, retention: Number(k.retention) || 0, funnel: Number(k.funnel) || 0, standards: Number(k.standards) || 0, reviewAvg: Number(k.review_avg) || 0, comment: k.comment })) });
  }));

  app.post("/api/mvp/teachers/:id/kpi", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const tid = req.params.id; const p = req.body || {};
    const period = String(p.periodMonth || new Date().toISOString().slice(0, 7));
    const body = {
      organization_id: session.organizationId, teacher_id: tid, period_month: period,
      retention: Number(p.retention) || 0, funnel: Number(p.funnel) || 0,
      standards: Number(p.standards) || 0, review_avg: Number(p.reviewAvg) || 0, comment: p.comment || null,
    };
    try {
      const rows = await supabaseFetch<any[]>("teacher_kpi", "", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) });
      const k = rows[0] || body;
      res.status(201).json({ kpi: { id: k.id, periodMonth: period, retention: Number(k.retention) || 0, funnel: Number(k.funnel) || 0, standards: Number(k.standards) || 0, reviewAvg: Number(k.review_avg) || 0, comment: k.comment } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось сохранить KPI" });
    }
  }));

  // ---- Отзывы о педагоге ----
  app.get("/api/mvp/teachers/:id/reviews", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.json({ reviews: [] });
    const rows = await supabaseFetch<any[]>("teacher_reviews", `select=*&organization_id=eq.${session.organizationId}&teacher_id=eq.${req.params.id}&order=created_at.desc`);
    res.json({ reviews: rows.map((r) => ({ id: r.id, author: r.author, source: r.source, stars: r.stars, text: r.text, createdAt: r.created_at })) });
  }));

  app.post("/api/mvp/teachers/:id/reviews", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const stars = Math.max(1, Math.min(5, Number(p.stars) || 5));
    const inserted = await supabaseFetch<any[]>("teacher_reviews", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, teacher_id: req.params.id, author: p.author || "Аноним", source: p.source || "Личный кабинет", stars, text: p.text || null }),
    });
    const r = inserted[0];
    res.status(201).json({ review: { id: r.id, author: r.author, source: r.source, stars: r.stars, text: r.text, createdAt: r.created_at } });
  }));

  app.delete("/api/mvp/teachers/:id/reviews/:rid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    await supabaseFetch("teacher_reviews", `id=eq.${req.params.rid}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // ---- Аттестации педагога ----
  app.get("/api/mvp/teachers/:id/attestations", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.json({ attestations: [] });
    const rows = await supabaseFetch<any[]>("teacher_attestations", `select=*&organization_id=eq.${session.organizationId}&teacher_id=eq.${req.params.id}&order=att_date.desc`);
    res.json({ attestations: rows.map((a) => ({ id: a.id, date: a.att_date, direction: a.direction, result: a.result, mark: a.mark, note: a.note })) });
  }));

  app.post("/api/mvp/teachers/:id/attestations", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const inserted = await supabaseFetch<any[]>("teacher_attestations", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, teacher_id: req.params.id, att_date: p.date || null, direction: p.direction || null, result: p.result || null, mark: p.mark || null, note: p.note || null }),
    });
    const a = inserted[0];
    res.status(201).json({ attestation: { id: a.id, date: a.att_date, direction: a.direction, result: a.result, mark: a.mark, note: a.note } });
  }));

  app.delete("/api/mvp/teachers/:id/attestations/:aid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    await supabaseFetch("teacher_attestations", `id=eq.${req.params.aid}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // ---- Стандарты работы педагога (чек-лист) ----
  app.get("/api/mvp/teachers/:id/standards", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.json({ standards: [] });
    const rows = await supabaseFetch<any[]>("teacher_standards", `select=*&organization_id=eq.${session.organizationId}&teacher_id=eq.${req.params.id}&order=sort.asc`);
    res.json({ standards: rows.map((s) => ({ id: s.id, title: s.title, detail: s.detail, state: s.state, sort: s.sort })) });
  }));

  app.post("/api/mvp/teachers/:id/standards", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    if (!String(p.title || "").trim()) return res.status(400).json({ error: "Укажите стандарт" });
    const inserted = await supabaseFetch<any[]>("teacher_standards", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, teacher_id: req.params.id, title: String(p.title).trim(), detail: p.detail || null, state: ["y", "p", "n"].includes(p.state) ? p.state : "n", sort: Number(p.sort) || 0 }),
    });
    const s = inserted[0];
    res.status(201).json({ standard: { id: s.id, title: s.title, detail: s.detail, state: s.state, sort: s.sort } });
  }));

  app.patch("/api/mvp/teachers/:id/standards/:sid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.title !== undefined) patch.title = String(p.title).trim();
    if (p.detail !== undefined) patch.detail = p.detail || null;
    if (p.state !== undefined) patch.state = ["y", "p", "n"].includes(p.state) ? p.state : "n";
    if (p.sort !== undefined) patch.sort = Number(p.sort) || 0;
    const rows = await supabaseFetch<any[]>("teacher_standards", `id=eq.${req.params.sid}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (!rows[0]) return res.status(404).json({ error: "Стандарт не найден" });
    const s = rows[0];
    res.json({ standard: { id: s.id, title: s.title, detail: s.detail, state: s.state, sort: s.sort } });
  }));

  app.delete("/api/mvp/teachers/:id/standards/:sid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    await supabaseFetch("teacher_standards", `id=eq.${req.params.sid}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // Добавить выплату/начисление педагогу
  app.post("/api/mvp/teachers/:id/payouts", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    const tid = req.params.id; const p = req.body || {};
    const amount = Number(p.amount) || 0;
    const common = { periodStart: p.periodStart || todayStr(), periodEnd: p.periodEnd || todayStr(), status: p.status === "paid" ? "paid" : "planned", comment: p.comment || null };
    if (!supabaseEnabled) {
      const rec = { id: uid(), teacherId: tid, amount, ...common, createdAt: new Date().toISOString() };
      mockTeacherPayouts.unshift(rec);
      return res.status(201).json({ payout: rec });
    }
    const inserted = await supabaseFetch<any[]>("teacher_payouts", "", { method: "POST", body: JSON.stringify({ organization_id: session.organizationId, teacher_id: tid, period_start: common.periodStart, period_end: common.periodEnd, amount, status: common.status, comment: common.comment }) });
    res.status(201).json({ payout: payoutOut(inserted[0]) });
  }));

  // Удалить выплату
  app.delete("/api/mvp/teachers/:id/payouts/:pid", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    if (!supabaseEnabled) {
      const i = mockTeacherPayouts.findIndex((x) => x.id === req.params.pid);
      if (i >= 0) mockTeacherPayouts.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("teacher_payouts", `id=eq.${req.params.pid}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // Отметить/снять шаг стажировки
  app.patch("/api/mvp/teachers/:id/onboarding/:stepId", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Доступно только владельцу" });
    const done = req.body?.done !== false;
    if (!supabaseEnabled) {
      const steps = seedMockOnboarding(req.params.id);
      const st = steps.find((s) => s.id === req.params.stepId);
      if (st) { st.done = done; st.doneAt = done ? new Date().toISOString() : null; }
      return res.json({ onboarding: steps });
    }
    const rows = await supabaseFetch<any[]>("teacher_onboarding", `id=eq.${req.params.stepId}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify({ done, done_at: done ? new Date().toISOString() : null }) });
    res.json({ step: rows[0] ? onbOut(rows[0]) : null });
  }));

  // Зарплатная ведомость по всем педагогам за период.
  // Возвращает карты по teacher_id: схема, кол-во закрытых занятий (из журнала
  // schedule_lessons status=completed) и уже выплаченное. Выручку фронт считает сам.
  app.get("/api/mvp/teachers/payroll", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Ведомость доступна владельцу и управляющему" });
    const q = req.query as Record<string, string>;
    const r = periodRanges(q.period, q.from, q.to);
    if (!supabaseEnabled) {
      const comp: Record<string, any> = {}; const lessons: Record<string, number> = {}; const paid: Record<string, number> = {};
      initialTeachers
        .filter((t: any) => session.role === "owner" || canSeeBranch(session, t.branchId))
        .forEach((t: any) => {
          comp[t.id] = mockTeacherComp[t.id] || defaultComp();
          lessons[t.id] = 0;
          paid[t.id] = mockTeacherPayouts.filter((p) => p.teacherId === t.id && p.status === "paid" && p.periodStart >= r.cur.start && p.periodStart <= r.cur.end).reduce((s, p) => s + p.amount, 0);
        });
      return res.json({ comp, lessons, paid, period: r.cur });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const branchFilter = session.role === "branch_manager" ? `&branch_id=eq.${session.dbBranchId}` : "";
    const [users, compRows, lessonRows, payoutRows] = await Promise.all([
      supabaseFetch<any[]>("users", `select=id,branch_id,role&${orgF}&role=eq.teacher`),
      supabaseFetch<any[]>("teacher_compensation", `select=*&${orgF}`),
      supabaseFetch<any[]>("schedule_lessons", `select=teacher_id&status=neq.cancelled&ends_at=lt.${new Date().toISOString()}&starts_at=gte.${r.cur.start}T00:00:00&starts_at=lte.${r.cur.end}T23:59:59${branchFilter}`),
      supabaseFetch<any[]>("teacher_payouts", `select=teacher_id,amount,status,period_start&${orgF}&status=eq.paid`),
    ]);
    // Видимые педагоги: владельцу — все, управляющему — только своего филиала.
    const visible = new Set(users.filter((u) => session.role === "owner" || u.branch_id === session.dbBranchId).map((u) => u.id));
    const comp: Record<string, any> = {}; const lessons: Record<string, number> = {}; const paid: Record<string, number> = {};
    compRows.forEach((c) => { if (visible.has(c.teacher_id)) comp[c.teacher_id] = compOut(c); });
    lessonRows.forEach((l) => { if (l.teacher_id && visible.has(l.teacher_id)) lessons[l.teacher_id] = (lessons[l.teacher_id] || 0) + 1; });
    payoutRows.forEach((p) => { if (visible.has(p.teacher_id) && p.period_start >= r.cur.start && p.period_start <= r.cur.end) paid[p.teacher_id] = (paid[p.teacher_id] || 0) + Number(p.amount); });
    res.json({ comp, lessons, paid, period: r.cur });
  }));

  // Массовое начисление зарплат: один POST на пачку строк ведомости.
  app.post("/api/mvp/teachers/payroll/accrue", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Начислять может владелец или управляющий" });
    const p = req.body || {};
    const items = Array.isArray(p.items) ? p.items : [];
    const status = p.status === "paid" ? "paid" : "planned";
    const ps = p.periodStart || todayStr(); const pe = p.periodEnd || todayStr();
    const comment = p.comment || "Массовое начисление";
    let valid = items.filter((it: any) => it.teacherId && Number(it.amount) > 0);
    // Управляющий может начислять только педагогам своего филиала.
    if (supabaseEnabled && session.role === "branch_manager") {
      const users = await supabaseFetch<any[]>("users", `select=id,branch_id&organization_id=eq.${session.organizationId}&role=eq.teacher&branch_id=eq.${session.dbBranchId}`);
      const allowed = new Set(users.map((u) => u.id));
      valid = valid.filter((it: any) => allowed.has(it.teacherId));
    }
    if (valid.length === 0) return res.status(400).json({ error: "Нет строк для начисления" });
    if (!supabaseEnabled) {
      valid.forEach((it: any) => mockTeacherPayouts.unshift({ id: uid(), teacherId: it.teacherId, amount: Number(it.amount), periodStart: ps, periodEnd: pe, status, comment, createdAt: new Date().toISOString() }));
      return res.status(201).json({ created: valid.length });
    }
    await supabaseFetch("teacher_payouts", "", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(valid.map((it: any) => ({ organization_id: session.organizationId, teacher_id: it.teacherId, period_start: ps, period_end: pe, amount: Number(it.amount), status, comment }))),
    });
    res.status(201).json({ created: valid.length });
  }));

  // Автозакрытие уроков: прошедшие 'scheduled' → 'completed' (для журнала/отчётов).
  // Расчёт «за занятие» работает и без этого (см. held-фильтр выше), но физическое
  // закрытие нужно для корректного статуса в журнале.
  app.post("/api/mvp/lessons/autoclose", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Доступно владельцу и управляющему" });
    if (!supabaseEnabled) return res.json({ closed: 0 });
    const nowIso = new Date().toISOString();
    const branchFilter = session.role === "branch_manager" ? `&branch_id=eq.${session.dbBranchId}` : "";
    const rows = await supabaseFetch<any[]>("schedule_lessons", `status=eq.scheduled&ends_at=lt.${nowIso}${branchFilter}`, {
      method: "PATCH", body: JSON.stringify({ status: "completed", updated_at: nowIso }),
    });
    res.json({ closed: Array.isArray(rows) ? rows.length : 0 });
  }));

  // История выплат по месяцам (последние N месяцев), planned/paid. Владелец — по сети,
  // управляющий — по своему филиалу.
  app.get("/api/mvp/teachers/payouts/history", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Доступно владельцу и управляющему" });
    const q = req.query as Record<string, string>;
    const months = Math.min(24, Math.max(1, Number(q.months) || 12));
    const buckets: string[] = [];
    const md = new Date(); md.setDate(1);
    for (let i = months - 1; i >= 0; i--) { const d = new Date(md.getFullYear(), md.getMonth() - i, 1); buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
    const bucketize = (rows: { periodStart: string; amount: number; status: string }[]) => buckets.map((mo) => ({
      month: mo,
      planned: rows.filter((p) => String(p.periodStart).slice(0, 7) === mo && p.status !== "paid").reduce((s, p) => s + p.amount, 0),
      paid: rows.filter((p) => String(p.periodStart).slice(0, 7) === mo && p.status === "paid").reduce((s, p) => s + p.amount, 0),
    }));
    if (!supabaseEnabled) {
      return res.json({ months: bucketize(mockTeacherPayouts.map((p) => ({ periodStart: p.periodStart, amount: p.amount, status: p.status }))) });
    }
    const orgF = `organization_id=eq.${session.organizationId}`;
    const payoutRows = await supabaseFetch<any[]>("teacher_payouts", `select=teacher_id,amount,status,period_start&${orgF}&limit=2000`);
    let rows = payoutRows;
    if (session.role === "branch_manager") {
      const users = await supabaseFetch<any[]>("users", `select=id&${orgF}&role=eq.teacher&branch_id=eq.${session.dbBranchId}`);
      const allowed = new Set(users.map((u) => u.id));
      rows = payoutRows.filter((p) => allowed.has(p.teacher_id));
    }
    res.json({ months: bucketize(rows.map((p) => ({ periodStart: p.period_start, amount: Number(p.amount), status: p.status }))) });
  }));

  // ============================================================
  // РАЗДЕЛ «ЖУРНАЛ ПОСЕЩАЕМОСТИ» (миграция 016)
  // ============================================================

  // Дашборд журнала (ТЗ §2-§3): показатели + KPI «журнал не закрыт».
  // Фильтры: branchId, groupId, from, to (YYYY-MM-DD). Ролевой скоуп.
  app.get("/api/mvp/journal/dashboard", ah(async (req, res) => {
    const session = getSession(req);
    const q = req.query as Record<string, string>;
    const today = new Date().toISOString().slice(0, 10);
    const from = q.from || today;
    const to = q.to || from;
    if (!supabaseEnabled) return res.json(emptyJournalDashboard(from, to));

    const toPlus1 = new Date(`${to}T00:00:00.000Z`);
    toPlus1.setUTCDate(toPlus1.getUTCDate() + 1);
    const upper = toPlus1.toISOString().slice(0, 10);

    const lessonFilters = [
      "select=*",
      `starts_at=gte.${from}T00:00:00`,
      `starts_at=lt.${upper}T00:00:00`,
      "order=starts_at.asc",
    ];
    // Скоуп по филиалу: владелец — любой/выбранный, остальные — закреплённый.
    let branchId: string | undefined = q.branchId;
    if (session.role !== "owner") branchId = session.dbBranchId || branchId || undefined;
    if (branchId) lessonFilters.push(`branch_id=eq.${branchId}`);
    if (q.groupId) lessonFilters.push(`group_id=eq.${q.groupId}`);

    try {
      // Группы педагога — для скоупа «только свои».
      let teacherGroupIds: Set<string> | null = null;
      if (session.role === "teacher") {
        const myGroups = await supabaseFetch<any[]>(
          "groups",
          `select=id&teacher_id=eq.${session.userId}`,
        ).catch(() => [] as any[]);
        teacherGroupIds = new Set(myGroups.map((g) => g.id));
      }

      const lessonsRaw = await supabaseFetch<any[]>("schedule_lessons", lessonFilters.join("&"));
      const lessons = teacherGroupIds
        ? lessonsRaw.filter((l) => teacherGroupIds!.has(l.group_id))
        : lessonsRaw;
      const lessonIds = lessons.map((l) => l.id);

      let attendance: any[] = [];
      if (lessonIds.length) {
        attendance = await supabaseFetch<any[]>(
          "attendance",
          `select=*&lesson_id=in.(${lessonIds.join(",")})`,
        ).catch(() => [] as any[]);
      }

      const orgFilter = `organization_id=eq.${session.organizationId}`;
      const [students, subs, groups, users] = await Promise.all([
        supabaseFetch<any[]>("students", `select=*&${orgFilter}&status=neq.archived&archived_at=is.null`).catch(() => [] as any[]),
        supabaseFetch<any[]>("student_subscriptions", "select=student_id,status,lessons_left,ends_on").catch(() => [] as any[]),
        supabaseFetch<any[]>("groups", `select=id,name,teacher_id,branch_id&${orgFilter}`).catch(() => [] as any[]),
        supabaseFetch<any[]>("users", `select=*&${orgFilter}`).catch(() => [] as any[]),
      ]);

      const subsByStudent = new Map<string, any[]>();
      subs.forEach((s) => {
        const arr = subsByStudent.get(s.student_id) || [];
        arr.push(s);
        subsByStudent.set(s.student_id, arr);
      });
      const studentName = new Map<string, string>(students.map((s) => [s.id, s.name]));
      const groupById = new Map(groups.map((g) => [g.id, g]));
      const userName = new Map<string, string>(
        users.map((u) => [u.id, u.full_name || u.name || [u.first_name, u.last_name].filter(Boolean).join(" ") || "Педагог"]),
      );
      // Кол-во учеников в группе (для подсчёта неотмеченных).
      const groupStudentCount = new Map<string, number>();
      students.forEach((s) => {
        if (!s.group_id) return;
        groupStudentCount.set(s.group_id, (groupStudentCount.get(s.group_id) || 0) + 1);
      });

      // --- Показатели ---
      const visited = new Set<string>();
      const trialStudents = new Set<string>();
      const trialConverted = new Set<string>();
      const markedByLesson = new Map<string, number>();
      attendance.forEach((a) => {
        const marked = a.status && a.status !== "unknown";
        if (marked) markedByLesson.set(a.lesson_id, (markedByLesson.get(a.lesson_id) || 0) + 1);
        if (a.status === "present" || a.status === "excused" || a.is_trial) visited.add(a.student_id);
        if (a.is_trial || a.status === "trial") {
          trialStudents.add(a.student_id);
          if (a.trial_outcome === "converted") trialConverted.add(a.student_id);
        }
      });

      // Посещают без оплаты: были present, но нет активного абонемента (ТЗ §8, §13).
      const presentStudents = new Set<string>();
      attendance.forEach((a) => {
        if (a.status === "present") presentStudents.add(a.student_id);
      });
      const unpaid: string[] = [];
      presentStudents.forEach((sid) => {
        if (trialStudents.has(sid)) return; // пробные считаются отдельно
        if (!hasActiveSubscription(subsByStudent.get(sid) || [], today)) unpaid.push(sid);
      });

      // Воронка пробных: купил / не купил абонемент (ТЗ §2).
      const trialBought: string[] = [];
      const trialNotBought: string[] = [];
      trialStudents.forEach((sid) => {
        const bought = trialConverted.has(sid) || hasActiveSubscription(subsByStudent.get(sid) || [], today);
        (bought ? trialBought : trialNotBought).push(sid);
      });

      // KPI: журнал не закрыт спустя 60 минут после занятия (ТЗ §3).
      const now = Date.now();
      const openJournals = lessons
        .filter((l) => {
          const ended = new Date(l.ends_at).getTime();
          return ended + 60 * 60 * 1000 < now; // прошло больше 60 минут
        })
        .map((l) => {
          const total = groupStudentCount.get(l.group_id) || 0;
          const marked = markedByLesson.get(l.id) || 0;
          const unmarkedCount = Math.max(0, total - marked);
          const g = groupById.get(l.group_id);
          const fmt = (iso: string) =>
            new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
          return {
            lessonId: l.id,
            groupId: l.group_id,
            groupName: g?.name || "Группа",
            teacherId: l.teacher_id || g?.teacher_id || null,
            teacherName: userName.get(l.teacher_id || g?.teacher_id) || "Педагог",
            branchId: l.branch_id || null,
            startsAt: l.starts_at,
            endsAt: l.ends_at,
            timeLabel: `${fmt(l.starts_at)} – ${fmt(l.ends_at)}`,
            unmarkedCount,
            minutesOverdue: Math.floor((now - new Date(l.ends_at).getTime()) / 60000),
          };
        })
        .filter((x) => x.unmarkedCount > 0);

      res.json({
        rangeFrom: from,
        rangeTo: to,
        visited: { count: visited.size, studentIds: [...visited] },
        unpaid: { count: unpaid.length, studentIds: unpaid },
        trialNotBought: { count: trialNotBought.length, studentIds: trialNotBought },
        trialBought: { count: trialBought.length, studentIds: trialBought },
        openJournals,
        _names: Object.fromEntries(studentName),
      });
    } catch (error: any) {
      // Журнал не должен ронять интерфейс — отдаём пустую сводку.
      res.json(emptyJournalDashboard(from, to));
    }
  }));

  // Перерасчёты (ТЗ §10). Список по ученику или все pending.
  app.get("/api/mvp/recalculations", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.json({ recalculations: [] });
    const q = req.query as Record<string, string>;
    const filters = [`select=*`, `organization_id=eq.${session.organizationId}`, "order=created_at.desc"];
    if (q.studentId) filters.push(`student_id=eq.${q.studentId}`);
    if (q.status) filters.push(`status=eq.${q.status}`);
    if (session.role !== "owner" && session.dbBranchId) filters.push(`branch_id=eq.${session.dbBranchId}`);
    try {
      const rows = await supabaseFetch<any[]>("recalculations", filters.join("&"));
      res.json({ recalculations: rows.map((r) => mapDbRecalc(r)) });
    } catch (error: any) {
      res.json({ recalculations: [] }); // таблицы ещё нет — миграция не применена
    }
  }));

  app.post("/api/mvp/recalculations", ah(async (req, res) => {
    const session = getSession(req);
    const p = req.body || {};
    if (!p.studentId) return res.status(400).json({ error: "studentId is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      const studs = await supabaseFetch<any[]>("students", `select=branch_id&id=eq.${p.studentId}&limit=1`);
      const branch = studs[0]?.branch_id || session.dbBranchId || null;
      if (!canSeeBranch(session, branch)) return res.status(403).json({ error: "Branch access denied" });
      const inserted = await supabaseFetch<any[]>("recalculations", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          branch_id: branch,
          student_id: p.studentId,
          subscription_id: p.subscriptionId || null,
          period_from: p.periodFrom || null,
          period_to: p.periodTo || null,
          lessons_count: Number(p.lessonsCount) || 0,
          reason: p.reason || null,
          amount: Number(p.amount) || 0,
          comment: p.comment || null,
          attachment_url: p.attachmentUrl || null,
          attachment_name: p.attachmentName || null,
          status: "pending",
          created_by: authorId(session),
          created_by_name: session.fullName || null,
        }),
      });
      res.status(201).json({ recalculation: mapDbRecalc(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать перерасчёт. Проверьте, применена ли миграция 016." });
    }
  }));

  app.patch("/api/mvp/recalculations/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const p = req.body || {};
    const patch: Record<string, unknown> = {};
    if (p.status && ["pending", "applied", "cancelled"].includes(p.status)) {
      patch.status = p.status;
      if (p.status === "applied") patch.applied_at = new Date().toISOString();
    }
    if (p.amount !== undefined) patch.amount = Number(p.amount) || 0;
    if (p.lessonsCount !== undefined) patch.lessons_count = Number(p.lessonsCount) || 0;
    if (p.comment !== undefined) patch.comment = p.comment;
    if (p.appliedPaymentId !== undefined) patch.applied_payment_id = p.appliedPaymentId;
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>(
        "recalculations",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      );
      res.json({ recalculation: rows[0] ? mapDbRecalc(rows[0]) : null });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить перерасчёт" });
    }
  }));

  // Статус «Оплатит позже» (ТЗ §8, §9) — ручной флаг ученику.
  app.post("/api/mvp/students/:id/pay-later", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const enabled = req.body?.enabled !== false;
    try {
      const studs = await supabaseFetch<any[]>("students", `select=branch_id&id=eq.${req.params.id}&limit=1`);
      if (!studs[0]) return res.status(404).json({ error: "Student not found" });
      if (!canSeeBranch(session, studs[0].branch_id)) return res.status(403).json({ error: "Branch access denied" });
      const rows = await supabaseFetch<any[]>(`students`, `id=eq.${req.params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          pay_later: enabled,
          pay_later_set_at: enabled ? new Date().toISOString() : null,
        }),
      });
      res.json({ ok: true, student: rows[0] || null });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить статус. Проверьте миграцию 016." });
    }
  }));

  // ============================================================================
  // ДОКУМЕНТОЛОГ — хранилище договоров + генератор (только владелец). Миграция 027.
  // ============================================================================
  const DOC_STATUSES = ["draft", "active", "expired", "terminated"];
  const REMIND_DAYS = 30;          // порог «истекает скоро»
  const orgName = "Эхо Гор";

  // Mock-хранилище (когда Supabase не настроен / демо / E2E).
  const mockDocuments: any[] = [
    { id: uid(), organization_id: orgId, category: "Аренда", contractor: "ТОО «Алматы Молл»", subject: "Зал 120 м², 3 этаж", amount: 450000, currency: "₸", date_start: "2026-01-01", date_end: "2026-07-15", auto_renew: false, status: "active", scan_url: null, comment: "", created_at: "2026-01-01T00:00:00Z" },
    { id: uid(), organization_id: orgId, category: "Услуги — уборка", contractor: "ИП Клининг Сервис", subject: "Ежедневная уборка залов", amount: 90000, currency: "₸", date_start: "2026-03-01", date_end: "2027-03-01", auto_renew: true, status: "active", scan_url: null, comment: "", created_at: "2026-03-01T00:00:00Z" },
    { id: uid(), organization_id: orgId, category: "Услуги — вывоз мусора", contractor: "Тазалык", subject: "Вывоз ТБО 2 раза/нед", amount: 25000, currency: "₸", date_start: "2025-09-01", date_end: "2026-06-30", auto_renew: false, status: "active", scan_url: null, comment: "", created_at: "2025-09-01T00:00:00Z" },
  ];
  const mockTemplates: any[] = [
    {
      id: uid(), organization_id: orgId, name: "Договор аренды помещения", category: "Аренда", sort_order: 0,
      body: '<h2 style="text-align:center">ДОГОВОР АРЕНДЫ ПОМЕЩЕНИЯ</h2><p style="text-align:right">г. {{city}}, {{today}}</p><p>{{org_name}}, именуемое «Арендатор», и {{contractor}}, именуемый «Арендодатель», заключили настоящий договор.</p><p><b>1. Предмет.</b> Арендодатель передаёт во временное пользование помещение: {{subject}}.</p><p><b>2. Срок.</b> Договор действует с {{date_start}} по {{date_end}}.[[if auto_renew]] По окончании срок продлевается автоматически на тот же период, если ни одна из сторон не заявит об отказе за 30 дней.[[/if]]</p><p><b>3. Арендная плата.</b> {{amount}} {{currency}} в месяц.[[if vat]] В том числе НДС.[[/if]][[if !vat]] НДС не облагается.[[/if]] [[if prepay]]Оплата авансом до 5 числа месяца.[[/if]][[if !prepay]]Оплата по факту до 10 числа следующего месяца.[[/if]]</p><p><b>4. Подписи сторон.</b></p><p>Арендатор: {{org_name}} ____________</p><p>Арендодатель: {{contractor}} ____________</p>',
      fields: [
        { key: "contractor", label: "Арендодатель (контрагент)", type: "text", required: true },
        { key: "subject", label: "Помещение / адрес", type: "text", required: true },
        { key: "amount", label: "Арендная плата в месяц", type: "number", required: true },
        { key: "date_start", label: "Дата начала", type: "date", required: true },
        { key: "date_end", label: "Дата окончания", type: "date", required: false },
        { key: "city", label: "Город", type: "text", required: false },
      ],
      toggles: [
        { key: "vat", label: "С НДС", default: false },
        { key: "prepay", label: "Предоплата (аванс)", default: true },
        { key: "auto_renew", label: "Автопролонгация", default: false },
      ],
    },
    {
      id: uid(), organization_id: orgId, name: "Договор оказания услуг", category: "Подрядчики / поставщики", sort_order: 1,
      body: '<h2 style="text-align:center">ДОГОВОР ОКАЗАНИЯ УСЛУГ</h2><p style="text-align:right">г. {{city}}, {{today}}</p><p>{{org_name}}, именуемое «Заказчик», и {{contractor}}, именуемый «Исполнитель», заключили договор.</p><p><b>1. Предмет.</b> Исполнитель оказывает услуги: {{subject}}.</p><p><b>2. Срок.</b> С {{date_start}} по {{date_end}}.[[if auto_renew]] Договор продлевается автоматически, если стороны не заявят об отказе за 30 дней.[[/if]]</p><p><b>3. Стоимость.</b> {{amount}} {{currency}}.[[if vat]] В том числе НДС.[[/if]][[if !vat]] НДС не облагается.[[/if]] [[if prepay]]Предоплата 100%.[[/if]][[if !prepay]]Оплата по факту.[[/if]][[if act]] Приёмка оформляется актом выполненных работ.[[/if]]</p><p><b>4. Подписи.</b></p><p>Заказчик: {{org_name}} ____________</p><p>Исполнитель: {{contractor}} ____________</p>',
      fields: [
        { key: "contractor", label: "Исполнитель (контрагент)", type: "text", required: true },
        { key: "subject", label: "Какие услуги", type: "text", required: true },
        { key: "amount", label: "Стоимость", type: "number", required: true },
        { key: "date_start", label: "Дата начала", type: "date", required: true },
        { key: "date_end", label: "Дата окончания", type: "date", required: false },
        { key: "city", label: "Город", type: "text", required: false },
      ],
      toggles: [
        { key: "vat", label: "С НДС", default: false },
        { key: "prepay", label: "Предоплата", default: false },
        { key: "act", label: "С актом приёмки", default: true },
        { key: "auto_renew", label: "Автопролонгация", default: false },
      ],
    },
  ];

  const docExpiry = (row: any) => {
    if (!row.date_end || row.status === "terminated") return { daysLeft: null, expiring: false, expired: false };
    const end = new Date(row.date_end + "T00:00:00");
    const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
    return { daysLeft: days, expiring: days >= 0 && days <= REMIND_DAYS, expired: days < 0 };
  };
  const docOut = (r: any) => ({
    id: r.id,
    category: r.category ?? null,
    contractor: r.contractor ?? null,
    subject: r.subject ?? null,
    amount: Number(r.amount) || 0,
    currency: r.currency ?? "₸",
    dateStart: r.date_start ?? null,
    dateEnd: r.date_end ?? null,
    autoRenew: !!r.auto_renew,
    status: r.status ?? "draft",
    scanUrl: r.scan_url ?? null,
    templateId: r.template_id ?? null,
    comment: r.comment ?? null,
    createdAt: r.created_at ?? null,
    ...docExpiry(r),
  });

  // Подстановка плейсхолдеров {{key}} и условных блоков [[if flag]]/[[if !flag]]…[[/if]].
  const renderTemplate = (body: string, values: Record<string, any>, toggles: Record<string, boolean>) => {
    let out = String(body || "");
    // Условные блоки (сначала, чтобы внутри тоже подставились значения).
    out = out.replace(/\[\[if\s+(!?)([a-z_]+)\]\]([\s\S]*?)\[\[\/if\]\]/gi, (_m, neg, key, inner) => {
      const on = !!toggles[key];
      return (neg ? !on : on) ? inner : "";
    });
    // Плейсхолдеры.
    out = out.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key) => {
      const v = values[key];
      return v === undefined || v === null || v === "" ? "—" : String(v);
    });
    return out;
  };

  const requireOwner = (req: express.Request, res: express.Response) => {
    const session = getSession(req);
    if (session.role !== "owner") { res.status(403).json({ error: "Раздел «Документолог» доступен только владельцу" }); return null; }
    return session;
  };

  // Список договоров (+ фильтры category/status), со сводкой по срокам.
  app.get("/api/mvp/documents", ah(async (req, res) => {
    const session = requireOwner(req, res); if (!session) return;
    const q = req.query as Record<string, string>;
    let rows: any[];
    if (!supabaseEnabled) {
      rows = mockDocuments.filter((d) => d.organization_id === session.organizationId);
    } else {
      let query = `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`;
      if (q.category) query += `&category=eq.${encodeURIComponent(q.category)}`;
      if (q.status) query += `&status=eq.${encodeURIComponent(q.status)}`;
      rows = await supabaseFetch<any[]>("documents", query);
    }
    let items = rows.map(docOut);
    if (!supabaseEnabled) {
      if (q.category) items = items.filter((d) => d.category === q.category);
      if (q.status) items = items.filter((d) => d.status === q.status);
    }
    const summary = {
      total: items.length,
      active: items.filter((d) => d.status === "active").length,
      expiring: items.filter((d) => d.expiring).length,
      expired: items.filter((d) => d.expired).length,
    };
    res.json({ documents: items, summary, remindDays: REMIND_DAYS });
  }));

  // Создать запись договора.
  app.post("/api/mvp/documents", ah(async (req, res) => {
    const session = requireOwner(req, res); if (!session) return;
    const b = req.body || {};
    const rec = {
      organization_id: session.organizationId,
      category: b.category || null,
      contractor: (b.contractor || "").trim() || null,
      subject: (b.subject || "").trim() || null,
      amount: Number(b.amount) || 0,
      currency: b.currency || "₸",
      date_start: b.dateStart || null,
      date_end: b.dateEnd || null,
      auto_renew: !!b.autoRenew,
      status: DOC_STATUSES.includes(b.status) ? b.status : "draft",
      scan_url: b.scanUrl || null,
      template_id: b.templateId || null,
      comment: b.comment || null,
    };
    if (!supabaseEnabled) {
      const row = { id: uid(), created_at: new Date().toISOString(), ...rec };
      mockDocuments.unshift(row);
      return res.status(201).json({ document: docOut(row) });
    }
    const inserted = await supabaseFetch<any[]>("documents", "", { method: "POST", body: JSON.stringify(rec) });
    res.status(201).json({ document: docOut(inserted[0]) });
  }));

  // Изменить договор (статус, поля, ссылка на скан).
  app.patch("/api/mvp/documents/:id", ah(async (req, res) => {
    const session = requireOwner(req, res); if (!session) return;
    const b = req.body || {};
    const map: Record<string, string> = { contractor: "contractor", subject: "subject", category: "category", currency: "currency", comment: "comment", dateStart: "date_start", dateEnd: "date_end", scanUrl: "scan_url" };
    const patch: Record<string, any> = {};
    for (const [k, col] of Object.entries(map)) if (b[k] !== undefined) patch[col] = b[k] === "" ? null : b[k];
    if (b.amount !== undefined) patch.amount = Number(b.amount) || 0;
    if (b.autoRenew !== undefined) patch.auto_renew = !!b.autoRenew;
    if (b.status !== undefined) { if (!DOC_STATUSES.includes(b.status)) return res.status(400).json({ error: "Неизвестный статус" }); patch.status = b.status; }
    patch.updated_at = new Date().toISOString();
    if (!supabaseEnabled) {
      const row = mockDocuments.find((d) => d.id === req.params.id);
      if (!row) return res.status(404).json({ error: "Договор не найден" });
      Object.assign(row, patch);
      return res.json({ document: docOut(row) });
    }
    const rows = await supabaseFetch<any[]>("documents", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    res.json({ document: rows[0] ? docOut(rows[0]) : null });
  }));

  // Удалить договор.
  app.delete("/api/mvp/documents/:id", ah(async (req, res) => {
    const session = requireOwner(req, res); if (!session) return;
    if (!supabaseEnabled) {
      const i = mockDocuments.findIndex((d) => d.id === req.params.id);
      if (i >= 0) mockDocuments.splice(i, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("documents", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // Список шаблонов генератора.
  app.get("/api/mvp/documents/templates", ah(async (req, res) => {
    const session = requireOwner(req, res); if (!session) return;
    let rows: any[];
    if (!supabaseEnabled) {
      rows = mockTemplates.filter((t) => t.organization_id === session.organizationId);
    } else {
      rows = await supabaseFetch<any[]>("document_templates", `select=*&organization_id=eq.${session.organizationId}&is_active=eq.true&order=sort_order.asc`);
    }
    res.json({ templates: rows.map((t) => ({ id: t.id, name: t.name, category: t.category ?? null, fields: t.fields || [], toggles: t.toggles || [] })) });
  }));

  // Генерация договора: собрать тело из шаблона + полей + переключателей,
  // создать запись-черновик в хранилище, вернуть HTML для скачивания (.doc).
  app.post("/api/mvp/documents/generate", ah(async (req, res) => {
    const session = requireOwner(req, res); if (!session) return;
    const b = req.body || {};
    const templateId = b.templateId;
    const values: Record<string, any> = b.values || {};
    const toggles: Record<string, boolean> = b.toggles || {};
    let tpl: any;
    if (!supabaseEnabled) {
      tpl = mockTemplates.find((t) => t.id === templateId);
    } else {
      const rows = await supabaseFetch<any[]>("document_templates", `select=*&id=eq.${templateId}&organization_id=eq.${session.organizationId}&limit=1`);
      tpl = rows[0];
    }
    if (!tpl) return res.status(404).json({ error: "Шаблон не найден" });

    const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    const ctx = { ...values, org_name: orgName, today, currency: values.currency || "₸" };
    const inner = renderTemplate(tpl.body || "", ctx, toggles);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${tpl.name}</title></head><body style="font-family:'Times New Roman',serif;font-size:14px;line-height:1.5;max-width:720px;margin:0 auto">${inner}</body></html>`;

    // Завести черновик в хранилище.
    const rec = {
      organization_id: session.organizationId,
      category: tpl.category || null,
      contractor: (values.contractor || "").trim() || null,
      subject: (values.subject || "").trim() || null,
      amount: Number(values.amount) || 0,
      currency: ctx.currency,
      date_start: values.date_start || null,
      date_end: values.date_end || null,
      auto_renew: !!toggles.auto_renew,
      status: "draft",
      template_id: tpl.id,
    };
    let document: any;
    if (!supabaseEnabled) {
      const row = { id: uid(), created_at: new Date().toISOString(), scan_url: null, comment: null, ...rec };
      mockDocuments.unshift(row);
      document = docOut(row);
    } else {
      const inserted = await supabaseFetch<any[]>("documents", "", { method: "POST", body: JSON.stringify(rec) });
      document = docOut(inserted[0]);
    }
    res.json({ html, filename: `${tpl.name}.doc`, document });
  }));

  // ======================================================================
  // ПЛАНЁРКИ (совещания сети). Доступ: владелец и управляющий (руководитель
  // филиала). CRUD + задачи планёрки. AI-итоги живут в /api/gemini/meeting-summary.
  // В mock-режиме хранит данные в памяти процесса, в supabase-режиме — в таблицах
  // meetings / meeting_action_items (миграция 030).
  // ======================================================================
  const requireMeetingRole = (req: express.Request, res: express.Response) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") {
      res.status(403).json({ error: "Раздел «Планёрки» доступен владельцу и управляющему" }); return null;
    }
    return session;
  };
  const mockMeetings: any[] = [];
  const mockMeetingItems: any[] = [];
  const meetingOut = (row: any, items: any[] = []) => ({
    id: row.id,
    branchId: row.branch_id ?? null,
    title: row.title,
    date: row.meeting_date,
    participants: Array.isArray(row.participants) ? row.participants : (row.participants ? row.participants : []),
    agenda: row.agenda ?? null,
    summary: row.summary ?? null,
    transcript: row.transcript ?? null,
    status: row.status || "draft",
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    items: items.map(itemOut),
    itemsCount: items.length,
    openItems: items.filter((i) => !i.done).length,
  });
  const itemOut = (r: any) => ({ id: r.id, meetingId: r.meeting_id, title: r.title, assignee: r.assignee ?? null, dueDate: r.due_date ?? null, done: !!r.done, source: r.source || "manual", sort: r.sort ?? 0 });

  // Список планёрок (+ поиск q по названию/итогам/участникам). Новые сверху.
  app.get("/api/mvp/meetings", ah(async (req, res) => {
    const session = requireMeetingRole(req, res); if (!session) return;
    const q = String((req.query as any).q || "").trim().toLowerCase();
    let meetings: any[]; let items: any[];
    if (!supabaseEnabled) {
      meetings = mockMeetings.filter((m) => m.organization_id === session.organizationId);
      items = mockMeetingItems.filter((i) => i.organization_id === session.organizationId);
    } else {
      meetings = await supabaseFetch<any[]>("meetings", `select=*&organization_id=eq.${session.organizationId}&order=meeting_date.desc,created_at.desc`);
      items = await supabaseFetch<any[]>("meeting_action_items", `select=*&organization_id=eq.${session.organizationId}`).catch(() => [] as any[]);
    }
    if (session.role === "branch_manager" && session.dbBranchId) {
      meetings = meetings.filter((m) => !m.branch_id || m.branch_id === session.dbBranchId);
    }
    const itemsByMeeting = new Map<string, any[]>();
    for (const it of items) { const a = itemsByMeeting.get(it.meeting_id) || []; a.push(it); itemsByMeeting.set(it.meeting_id, a); }
    let out = meetings.map((m) => meetingOut(m, (itemsByMeeting.get(m.id) || []).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))));
    if (q) {
      out = out.filter((m) =>
        (m.title || "").toLowerCase().includes(q) ||
        (m.summary || "").toLowerCase().includes(q) ||
        (m.agenda || "").toLowerCase().includes(q) ||
        (Array.isArray(m.participants) ? m.participants.join(" ") : "").toLowerCase().includes(q) ||
        m.items.some((i: any) => (i.title || "").toLowerCase().includes(q) || (i.assignee || "").toLowerCase().includes(q))
      );
    }
    const summary = {
      total: out.length,
      openTasks: out.reduce((s, m) => s + m.openItems, 0),
      thisMonth: out.filter((m) => (m.date || "").slice(0, 7) === new Date().toISOString().slice(0, 7)).length,
    };
    res.json({ meetings: out, summary });
  }));

  // Одна планёрка с задачами.
  app.get("/api/mvp/meetings/:id", ah(async (req, res) => {
    const session = requireMeetingRole(req, res); if (!session) return;
    let row: any; let items: any[];
    if (!supabaseEnabled) {
      row = mockMeetings.find((m) => m.id === req.params.id && m.organization_id === session.organizationId);
      items = mockMeetingItems.filter((i) => i.meeting_id === req.params.id);
    } else {
      const rows = await supabaseFetch<any[]>("meetings", `select=*&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&limit=1`);
      row = rows[0];
      items = row ? await supabaseFetch<any[]>("meeting_action_items", `select=*&meeting_id=eq.${req.params.id}&order=sort.asc`).catch(() => [] as any[]) : [];
    }
    if (!row) return res.status(404).json({ error: "Планёрка не найдена" });
    res.json({ meeting: meetingOut(row, items.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))) });
  }));

  // Создать планёрку.
  app.post("/api/mvp/meetings", ah(async (req, res) => {
    const session = requireMeetingRole(req, res); if (!session) return;
    const b = req.body || {};
    if (!String(b.title || "").trim()) return res.status(400).json({ error: "Укажите название планёрки" });
    const participants = Array.isArray(b.participants) ? b.participants.filter((p: any) => String(p || "").trim()) : [];
    const rec = {
      organization_id: session.organizationId,
      branch_id: session.role === "branch_manager" ? (session.dbBranchId || null) : (b.branchId || null),
      title: String(b.title).trim(),
      meeting_date: b.date || new Date().toISOString().slice(0, 10),
      participants,
      agenda: (b.agenda || "").trim() || null,
      summary: (b.summary || "").trim() || null,
      transcript: (b.transcript || "").trim() || null,
      status: ["draft", "held", "archived"].includes(b.status) ? b.status : "draft",
      created_by: session.fullName || null,
    };
    if (!supabaseEnabled) {
      const row = { id: uid(), created_at: new Date().toISOString(), ...rec };
      mockMeetings.unshift(row);
      return res.status(201).json({ meeting: meetingOut(row, []) });
    }
    const inserted = await supabaseFetch<any[]>("meetings", "", { method: "POST", body: JSON.stringify(rec) });
    res.status(201).json({ meeting: meetingOut(inserted[0], []) });
  }));

  // Изменить планёрку.
  app.patch("/api/mvp/meetings/:id", ah(async (req, res) => {
    const session = requireMeetingRole(req, res); if (!session) return;
    const b = req.body || {};
    const patch: Record<string, any> = {};
    if (b.title !== undefined) patch.title = String(b.title).trim();
    if (b.date !== undefined) patch.meeting_date = b.date;
    if (b.participants !== undefined) patch.participants = Array.isArray(b.participants) ? b.participants.filter((p: any) => String(p || "").trim()) : [];
    if (b.agenda !== undefined) patch.agenda = (b.agenda || "").trim() || null;
    if (b.summary !== undefined) patch.summary = (b.summary || "").trim() || null;
    if (b.transcript !== undefined) patch.transcript = (b.transcript || "").trim() || null;
    if (b.status !== undefined) { if (!["draft", "held", "archived"].includes(b.status)) return res.status(400).json({ error: "Неизвестный статус" }); patch.status = b.status; }
    patch.updated_at = new Date().toISOString();
    if (!supabaseEnabled) {
      const row = mockMeetings.find((m) => m.id === req.params.id && m.organization_id === session.organizationId);
      if (!row) return res.status(404).json({ error: "Планёрка не найдена" });
      Object.assign(row, patch);
      const items = mockMeetingItems.filter((i) => i.meeting_id === row.id);
      return res.json({ meeting: meetingOut(row, items) });
    }
    const rows = await supabaseFetch<any[]>("meetings", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (!rows[0]) return res.status(404).json({ error: "Планёрка не найдена" });
    const items = await supabaseFetch<any[]>("meeting_action_items", `select=*&meeting_id=eq.${req.params.id}&order=sort.asc`).catch(() => [] as any[]);
    res.json({ meeting: meetingOut(rows[0], items) });
  }));

  // Удалить планёрку (задачи уйдут каскадом).
  app.delete("/api/mvp/meetings/:id", ah(async (req, res) => {
    const session = requireMeetingRole(req, res); if (!session) return;
    if (!supabaseEnabled) {
      const i = mockMeetings.findIndex((m) => m.id === req.params.id && m.organization_id === session.organizationId);
      if (i >= 0) mockMeetings.splice(i, 1);
      for (let k = mockMeetingItems.length - 1; k >= 0; k--) if (mockMeetingItems[k].meeting_id === req.params.id) mockMeetingItems.splice(k, 1);
      return res.json({ ok: true });
    }
    await supabaseFetch("meetings", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    res.json({ ok: true });
  }));

  // Заменить набор задач планёрки (используется после AI-разбора и ручного редактирования).
  app.put("/api/mvp/meetings/:id/items", ah(async (req, res) => {
    const session = requireMeetingRole(req, res); if (!session) return;
    const list = Array.isArray(req.body?.items) ? req.body.items : [];
    const rows = list.map((it: any, idx: number) => ({
      title: String(it.title || "").trim(),
      assignee: (it.assignee || "").toString().trim() || null,
      due_date: (it.dueDate || it.due_date || "") || null,
      done: !!it.done,
      source: it.source === "ai" ? "ai" : "manual",
      sort: idx,
    })).filter((r: any) => r.title);
    // Проверка, что планёрка существует и в области видимости.
    if (!supabaseEnabled) {
      const m = mockMeetings.find((x) => x.id === req.params.id && x.organization_id === session.organizationId);
      if (!m) return res.status(404).json({ error: "Планёрка не найдена" });
      for (let k = mockMeetingItems.length - 1; k >= 0; k--) if (mockMeetingItems[k].meeting_id === req.params.id) mockMeetingItems.splice(k, 1);
      const created = rows.map((r: any) => ({ id: uid(), meeting_id: req.params.id, organization_id: session.organizationId, created_at: new Date().toISOString(), ...r }));
      mockMeetingItems.push(...created);
      return res.json({ items: created.map(itemOut) });
    }
    const exists = await supabaseFetch<any[]>("meetings", `select=id&id=eq.${req.params.id}&organization_id=eq.${session.organizationId}&limit=1`);
    if (!exists[0]) return res.status(404).json({ error: "Планёрка не найдена" });
    await supabaseFetch("meeting_action_items", `meeting_id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    if (rows.length === 0) return res.json({ items: [] });
    const payload = rows.map((r: any) => ({ meeting_id: req.params.id, organization_id: session.organizationId, ...r }));
    const inserted = await supabaseFetch<any[]>("meeting_action_items", "", { method: "POST", body: JSON.stringify(payload) });
    res.json({ items: inserted.map(itemOut) });
  }));

  // Переключить/изменить одну задачу планёрки (обычно отметка «выполнено»).
  app.patch("/api/mvp/meetings/:id/items/:itemId", ah(async (req, res) => {
    const session = requireMeetingRole(req, res); if (!session) return;
    const b = req.body || {};
    const patch: Record<string, any> = {};
    if (b.title !== undefined) patch.title = String(b.title).trim();
    if (b.assignee !== undefined) patch.assignee = (b.assignee || "").trim() || null;
    if (b.dueDate !== undefined) patch.due_date = b.dueDate || null;
    if (b.done !== undefined) patch.done = !!b.done;
    if (!supabaseEnabled) {
      const it = mockMeetingItems.find((i) => i.id === req.params.itemId && i.meeting_id === req.params.id);
      if (!it) return res.status(404).json({ error: "Задача не найдена" });
      Object.assign(it, patch);
      return res.json({ item: itemOut(it) });
    }
    const rows = await supabaseFetch<any[]>("meeting_action_items", `id=eq.${req.params.itemId}&meeting_id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "PATCH", body: JSON.stringify(patch) });
    res.json({ item: rows[0] ? itemOut(rows[0]) : null });
  }));

  // ======================================================================
  // ПЛАНИРОВАНИЕ (БДР) — бюджет доходов и расходов сети. Только владелец.
  // В mock-режиме отдаёт демо-данные (как Документолог), в supabase-режиме —
  // сохранённый бюджет + факт из finance_transactions, с откатом на демо.
  // ======================================================================
  type PlanBudgetStore = {
    period: string;
    branchId: string | null;
    source: string;
    revenueLines: { direction: string; planned: number; mode: string }[];
    expenseLines: { category: string; planned: number; mode: string }[];
  };
  // Память владельца на время жизни процесса (mock-режим).
  const planningStore: Record<string, PlanBudgetStore> = {};
  const planningMotivation: Record<string, any[]> = {};
  const planningDaily: Record<string, any[]> = {};

  const planningDefaults = (period: string): PlanBudgetStore => ({
    period,
    branchId: null,
    source: "prev_month",
    revenueLines: [
      { direction: "Ансамбль", planned: 9_000_000, mode: "auto" },
      { direction: "Соло", planned: 7_500_000, mode: "auto" },
      { direction: "Хип-хоп", planned: 6_000_000, mode: "auto" },
      { direction: "Малыши", planned: 4_000_000, mode: "auto" },
      { direction: "Выступления", planned: 2_500_000, mode: "manual" },
      { direction: "Товары / форма", planned: 1_000_000, mode: "manual" },
    ],
    expenseLines: [
      { category: "Зарплата", planned: 9_000_000, mode: "auto" },
      { category: "Аренда", planned: 4_000_000, mode: "manual" },
      { category: "Реклама", planned: 2_500_000, mode: "manual" },
      { category: "Коммунальные", planned: 800_000, mode: "manual" },
      { category: "Костюмы", planned: 700_000, mode: "manual" },
      { category: "Материалы", planned: 600_000, mode: "manual" },
      { category: "Налоги", planned: 700_000, mode: "manual" },
      { category: "Прочее", planned: 300_000, mode: "manual" },
    ],
  });

  const motivationDefaults = () => [
    { level: "80% плана", threshold: 80, bonus: "+50 000 ₸ команде филиала" },
    { level: "100% плана", threshold: 100, bonus: "+150 000 ₸ + премия педагогам" },
    { level: "110% плана", threshold: 110, bonus: "+300 000 ₸ + командная поездка" },
  ];

  const dailyDefaults = () => [
    { date: "2026-06-28", revenue: 540_000, trials: 4, sales: 3, comment: "Сильный день, добор в Ансамбль", author: "Магомед (управляющий)" },
    { date: "2026-06-27", revenue: 410_000, trials: 6, sales: 2, comment: "Много пробных, конверсия низкая", author: "Магомед (управляющий)" },
    { date: "2026-06-26", revenue: 620_000, trials: 3, sales: 5, comment: "Продлили 5 абонементов", author: "Фатима (админ)" },
  ];

  // Факт по направлениям (демо). В supabase-режиме перекрывается реальными данными.
  const planningFactByDirection: Record<string, number> = {
    "Ансамбль": 7_100_000, "Соло": 5_900_000, "Хип-хоп": 4_600_000,
    "Малыши": 2_700_000, "Выступления": 1_000_000, "Товары / форма": 600_000,
  };

  // ---- Детальный План БДР (как в прототипе): филиал → залы → группы,
  // расходы с раскрытием ЗП/бонусов по людям, воронка продаж. ----
  type PlanGroupRow = {
    name: string; teacher: string; check: number;
    permanent: number; new: number; total: number; free: number;
    factPrev: number; recommended: number; planned: number;
  };
  type PlanRoom = { name: string; groupsCount: number; studentsCount: number; total: number; groups: PlanGroupRow[] };
  type PlanExpenseRow = { key: string; label: string; planned: number; mode: "auto" | "manual"; children?: { label: string; planned: number }[] };

  const g = (name: string, teacher: string, check: number, perm: number, nw: number, free: number, factPrev: number, recommended: number, planned: number): PlanGroupRow =>
    ({ name, teacher, check, permanent: perm, new: nw, total: perm + nw, free, factPrev, recommended, planned });

  // Демо-данные один-в-один со скринами прототипа (филиал «Астана 203»).
  const planDetailedMock = () => {
    const rooms: PlanRoom[] = [
      { name: "Зал №2", groupsCount: 4, studentsCount: 51, total: 991_330, groups: [
        g("Ансамбль", "—", 17_176, 17, 0, 1, 292_904, 282_310, 291_992),
        g("Мужская взрослая 17:00", "—", 21_900, 10, 0, 12, 209_310, 309_557, 219_000),
        g("Мужская взрослая 18:30", "—", 20_143, 7, 0, 15, 143_220, 261_188, 141_001),
        g("Младший ансамбль", "—", 19_961, 17, 0, 4, 351_547, 359_084, 339_337),
      ] },
      { name: "Зал №1", groupsCount: 17, studentsCount: 340, total: 6_648_051, groups: [
        g("Мужская студия Сб Вс (Хамит)", "Хамит", 18_914, 28, 0, 0, 516_272, 492_261, 529_592),
        g("Мужская начальный Вт Чт (Тимур)", "Тимур", 18_338, 19, 1, 3, 347_843, 370_275, 366_760),
        g("Продолжающая группа Сб Вс (Тимур)", "Тимур", 20_444, 27, 0, 0, 509_733, 505_424, 551_988),
        g("Взрослая продолжающая Сб Вс (Дэйси)", "Дэйси", 19_089, 15, 0, 5, 287_619, 318_897, 286_335),
        g("Девичья Ср Пт (Дэйси)", "Дэйси", 19_550, 12, 3, 0, 278_193, 280_223, 293_250),
        g("Девичья 10:15 сб/вс (Дэйси)", "Дэйси", 20_130, 27, 0, 0, 557_220, 518_002, 543_510),
        g("Взрослая начальная Сб Вс (Мерей)", "Мерей", 20_174, 23, 0, 0, 475_489, 464_581, 464_002),
        g("Взрослая продолжающая Сб Вс (Мерей)", "Мерей", 19_684, 19, 0, 3, 360_619, 372_559, 373_996),
        g("Девичья 10:00 (Анжела)", "Анжела", 18_572, 22, 0, 3, 426_740, 425_060, 408_584),
        g("Женская продолжающая Анжела", "—", 19_851, 37, 0, 0, 684_583, 670_438, 734_487),
        g("Девичья 3-4 года (Анжела)", "Анжела", 20_273, 11, 0, 11, 229_731, 311_612, 223_003),
        g("Женская студия Анжела", "—", 18_357, 14, 0, 3, 263_404, 279_937, 256_998),
        g("Женская взрослая Анжела 19:30", "—", 18_559, 16, 1, 5, 312_256, 353_559, 315_503),
        g("Грузинская группа", "—", 19_709, 11, 0, 0, 210_123, 208_831, 216_799),
        g("Девичья продолжающая вт/чт (Анжела)", "Анжела", 19_420, 22, 0, 0, 439_126, 426_047, 427_240),
        g("Мужская 10:00 (Ислам)", "Ислам", 20_700, 20, 0, 2, 427_257, 429_080, 414_000),
        g("Продолжающая (Ислам)", "Ислам", 20_167, 12, 0, 0, 244_809, 229_663, 242_004),
      ] },
      { name: "Зал №3", groupsCount: 10, studentsCount: 55, total: 1_364_626, groups: [
        g("Мини группа взрослая Ср Пт (Медина)", "Медина", 16_375, 7, 4, 0, 171_051, 168_429, 180_125),
        g("Мини-группа взрослая ПН Ср (Хамит)", "Хамит", 20_389, 6, 3, 1, 170_724, 177_248, 183_501),
        g("Индивидуальные Хамит", "—", 47_000, 6, 1, 0, 306_999, 304_661, 329_000),
        g("Мини-группа детская Пн Ср (Хамит)", "Хамит", 18_750, 8, 1, 0, 169_195, 163_157, 168_750),
        g("Мини группа детская Вт Чт (Тимур)", "Тимур", 24_219, 4, 0, 2, 93_787, 110_315, 96_876),
        g("Мини-группа взрослая Вт Чт (Дэйси)", "Дэйси", 22_656, 8, 0, 0, 173_038, 178_152, 181_248),
        g("Индивидуальные Дэйси", "—", 22_500, 2, 0, 0, 45_191, 44_314, 45_000),
        g("Индивидуальный Тимур", "—", 36_750, 1, 0, 0, 34_627, 35_359, 36_750),
        g("Индивидуальные Медина", "—", 44_063, 1, 1, 0, 82_947, 82_590, 88_126),
        g("Индивидуальный Ислам", "—", 27_625, 2, 0, 0, 52_000, 54_000, 55_250),
      ] },
    ];
    const expenses: PlanExpenseRow[] = [
      { key: "rent", label: "Аренда", planned: 1_080_450, mode: "auto" },
      { key: "utilities", label: "Ком. услуги", planned: 55_000, mode: "auto" },
      { key: "salaries", label: "Зарплаты", planned: 2_619_025, mode: "auto", children: [
        { label: "Педагог · Хамит", planned: 420_000 },
        { label: "Педагог · Тимур", planned: 480_000 },
        { label: "Педагог · Дэйси", planned: 390_000 },
        { label: "Управляющий · Анель", planned: 350_000 },
        { label: "Администратор", planned: 250_000 },
        { label: "Прочий персонал", planned: 729_025 },
      ] },
      { key: "bonuses", label: "Бонусы", planned: 333_700, mode: "auto", children: [
        { label: "Бонус управляющего", planned: 180_000 },
        { label: "Бонусы педагогов", planned: 153_700 },
      ] },
      { key: "household", label: "Хоз. товары", planned: 140_000, mode: "manual" },
      { key: "marketing", label: "Маркетинг", planned: 340_000, mode: "auto" },
      { key: "comms", label: "Сотовая связь и подписки", planned: 147_230, mode: "manual" },
    ];
    return { rooms, expenses };
  };

  // Собрать детальный план из реальных данных (supabase) с откатом на демо.
  const buildDetailedPlan = async (session: MvpSession, period: string, _branchId: string | null) => {
    const mock = planDetailedMock();
    let rooms = mock.rooms;
    let expenses = mock.expenses;
    let branchName = "Астана 203";
    const branches = [{ id: "astana203", name: "Астана 203" }];

    if (supabaseEnabled) {
      try {
        const orgFilter = `organization_id=eq.${session.organizationId}`;
        const monthStart = `${period}-01`;
        const [branchesRaw, hallsRaw, groupsRaw, usersRaw, studentsRaw, subsRaw, compRaw] = await Promise.all([
          supabaseFetch<any[]>("branches", `select=*&${orgFilter}&status=neq.archived`),
          supabaseFetch<any[]>("halls", `select=*`).catch(() => [] as any[]),
          supabaseFetch<any[]>("groups", `select=*&${orgFilter}`).catch(() => [] as any[]),
          supabaseFetch<any[]>("users", `select=*&${orgFilter}`).catch(() => [] as any[]),
          supabaseFetch<any[]>("students", `select=*&${orgFilter}&status=eq.active`).catch(() => [] as any[]),
          supabaseFetch<any[]>("student_subscriptions", `select=*`).catch(() => [] as any[]),
          supabaseFetch<any[]>("teacher_compensation", `select=*&${orgFilter}`).catch(() => [] as any[]),
        ]);
        if (Array.isArray(groupsRaw) && groupsRaw.length) {
          const branch = (branchesRaw || [])[0];
          if (branch) { branchName = branch.name; branches[0] = { id: branch.id, name: branch.name }; }
          const teacherName = new Map((usersRaw || []).map((u: any) => [u.id, (u.full_name || "").split(" ")[0] || "—"]));
          const hallName = new Map((hallsRaw || []).map((h: any) => [h.id, h.name]));
          // подписки по группе (активные)
          const subsByGroup = new Map<string, any[]>();
          (subsRaw || []).forEach((s: any) => {
            if (s.status !== "active" || !s.group_id) return;
            const list = subsByGroup.get(s.group_id) || []; list.push(s); subsByGroup.set(s.group_id, list);
          });
          const studentsByGroup = new Map<string, any[]>();
          (studentsRaw || []).forEach((s: any) => {
            if (!s.group_id) return;
            const list = studentsByGroup.get(s.group_id) || []; list.push(s); studentsByGroup.set(s.group_id, list);
          });
          const roomMap = new Map<string, PlanRoom>();
          for (const grp of groupsRaw) {
            const subs = subsByGroup.get(grp.id) || [];
            const students = studentsByGroup.get(grp.id) || [];
            const check = subs.length ? Math.round(subs.reduce((a, b) => a + Number(b.price || 0), 0) / subs.length) : 0;
            const total = students.length;
            const isNew = (s: any) => s.created_at && s.created_at >= monthStart;
            const nw = students.filter(isNew).length;
            const perm = Math.max(0, total - nw);
            const capacity = Number(grp.capacity || 0);
            const free = Math.max(0, capacity - total);
            const factPrev = subs.reduce((a, b) => a + Number(b.price || 0), 0);
            const planned = check * total;
            const recommended = Math.round(check * Math.max(total, Math.round(capacity * 0.9)));
            const row: PlanGroupRow = { name: grp.name, teacher: teacherName.get(grp.teacher_id) || "—", check, permanent: perm, new: nw, total, free, factPrev, recommended, planned };
            const rn = hallName.get(grp.hall_id) || "Без зала";
            const room = roomMap.get(rn) || { name: rn, groupsCount: 0, studentsCount: 0, total: 0, groups: [] };
            room.groups.push(row); room.groupsCount++; room.studentsCount += total; room.total += planned;
            roomMap.set(rn, room);
          }
          if (roomMap.size) rooms = Array.from(roomMap.values());
          // расходы: ЗП из карточек педагогов
          const salaryChildren = (compRaw || []).map((c: any) => ({ label: `Педагог · ${teacherName.get(c.teacher_id) || "—"}`, planned: Number(c.base_salary || 0) })).filter((x: any) => x.planned > 0);
          if (salaryChildren.length) {
            const salTotal = salaryChildren.reduce((a: number, b: any) => a + b.planned, 0);
            expenses = expenses.map((e) => e.key === "salaries" ? { ...e, planned: salTotal, children: salaryChildren } : e);
          }
        }
      } catch (e: any) {
        console.warn("[planning] detailed real-data compute failed, using mock:", e?.message || e);
      }
    }

    // Свод по группам.
    const allGroups = rooms.flatMap((r) => r.groups);
    const revenue = rooms.reduce((s, r) => s + r.total, 0);
    const studentsCount = rooms.reduce((s, r) => s + r.studentsCount, 0);
    const groupsCount = rooms.reduce((s, r) => s + r.groupsCount, 0);
    const capacityTotal = allGroups.reduce((s, r) => s + r.total + r.free, 0);
    const fillPct = capacityTotal ? Math.round((studentsCount / capacityTotal) * 100) : 0;
    const expense = expenses.reduce((s, e) => s + e.planned, 0);
    const profit = revenue - expense;
    const margin = revenue ? Math.round((profit / revenue) * 100) : 0;

    // По типу занятий (эвристика: индивидуальные / мини-группы / групповые).
    const isIndividual = (n: string) => /индивид/i.test(n);
    const isMini = (n: string) => /мини/i.test(n);
    const individual = allGroups.filter((x) => isIndividual(x.name)).reduce((s, x) => s + x.planned, 0);
    const mini = allGroups.filter((x) => !isIndividual(x.name) && isMini(x.name)).reduce((s, x) => s + x.planned, 0);
    const group = revenue - individual - mini;
    // По аудитории: новые = доля новых учеников по чеку.
    const newRevenue = allGroups.reduce((s, x) => s + x.check * x.new, 0);
    const permRevenue = revenue - newRevenue;

    // Воронка (демо-конверсии прототипа).
    const neededSales = 20;
    const trialConv = 0.5, recordConv = 0.7, leadConv = 0.55;
    const trials = Math.ceil(neededSales / trialConv);
    const records = Math.ceil(trials / recordConv);
    const leads = Math.ceil(records / leadConv);

    return {
      branchName, branches, groupsCount, studentsCount, fillPct,
      revenue, expense, profit, margin,
      byType: { group, mini, individual },
      byAudience: { permanent: permRevenue, new: newRevenue },
      rooms, expenses,
      funnel: { neededSales, trialConv, trials, recordConv, records, leadConv, leads },
    };
  };

  const buildPlanningOverview = (session: MvpSession, period: string, branchId: string | null) => {
    const key = `${session.organizationId}:${period}`;
    const budget = planningStore[key] || planningDefaults(period);
    const plannedRevenue = budget.revenueLines.reduce((s, r) => s + r.planned, 0);
    const plannedExpense = budget.expenseLines.reduce((s, e) => s + e.planned, 0);
    const plannedProfit = plannedRevenue - plannedExpense;
    const margin = plannedRevenue ? Math.round((plannedProfit / plannedRevenue) * 1000) / 10 : 0;

    // Факт (демо). Доход — по направлениям, расход — доля от плана.
    const factRevenue = budget.revenueLines.reduce((s, r) => s + (planningFactByDirection[r.direction] ?? Math.round(r.planned * 0.73)), 0);
    const factExpense = Math.round(plannedExpense * 0.747);
    const factProfit = factRevenue - factExpense;
    const factMargin = factRevenue ? Math.round((factProfit / factRevenue) * 1000) / 10 : 0;

    const incomeByDirection = budget.revenueLines.map((r) => ({
      direction: r.direction,
      plan: r.planned,
      fact: planningFactByDirection[r.direction] ?? Math.round(r.planned * 0.73),
    }));

    // Выполнение плана по форматам занятий (родитель «Доходы» + подуровни).
    const levels = [
      { level: "Групповые", plan: 8_628_449, fact: 8_474_882 },
      { level: "Мини-группы", plan: 882_486, fact: 810_500 },
      { level: "Индивидуальные", plan: 551_500, fact: 554_125 },
    ].map((l) => ({ ...l, deviation: l.fact - l.plan, done: Math.round((l.fact / l.plan) * 100) }));

    // Воронка: сколько действий нужно для плана (демо-конверсии).
    const avgCheck = 24_000;
    const neededSales = Math.max(0, Math.ceil((plannedRevenue - factRevenue) / avgCheck));
    const funnel = {
      neededSales,
      trials: Math.ceil(neededSales / 0.4),   // конверсия пробный→продажа 40%
      signups: Math.ceil(neededSales / 0.6),
      leads: Math.ceil(neededSales / 0.2),    // лид→продажа 20%
    };

    return {
      period,
      branchId,
      mode: supabaseEnabled ? "db" : "mock",
      source: budget.source,
      basis: { prevMonth: 27_400_000, prevYear: 24_100_000, avg6: 26_000_000 },
      plan: {
        revenueLines: budget.revenueLines,
        expenseLines: budget.expenseLines,
        plannedRevenue, plannedExpense, plannedProfit, margin,
      },
      fact: {
        revenue: factRevenue, expense: factExpense, profit: factProfit, margin: factMargin,
        donePct: plannedRevenue ? Math.round((factRevenue / plannedRevenue) * 100) : 0,
        incomeByDirection,
      },
      levels,
      funnel,
      motivation: planningMotivation[session.organizationId] || motivationDefaults(),
      daily: planningDaily[session.organizationId] || dailyDefaults(),
    };
  };

  // Сводка БДР за период.
  app.get("/api/mvp/planning/overview", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел «Планирование» доступен только владельцу" });
    const period = String(req.query.period || new Date().toISOString().slice(0, 7));
    const branchId = req.query.branch && req.query.branch !== "all" ? String(req.query.branch) : null;
    const base = buildPlanningOverview(session, period, branchId);
    const detailed = await buildDetailedPlan(session, period, branchId);
    res.json({ ...base, detailed });
  }));

  // Создать / сохранить бюджет на период (план доходов и расходов).
  app.post("/api/mvp/planning/budget", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел «Планирование» доступен только владельцу" });
    const b = req.body || {};
    const period = String(b.period || new Date().toISOString().slice(0, 7));
    const key = `${session.organizationId}:${period}`;
    const base = planningStore[key] || planningDefaults(period);
    const store: PlanBudgetStore = {
      period,
      branchId: b.branchId || null,
      source: b.source || base.source,
      revenueLines: Array.isArray(b.revenueLines) ? b.revenueLines.map((r: any) => ({ direction: String(r.direction || "Направление"), planned: Number(r.planned) || 0, mode: r.mode === "manual" ? "manual" : "auto" })) : base.revenueLines,
      expenseLines: Array.isArray(b.expenseLines) ? b.expenseLines.map((e: any) => ({ category: String(e.category || "Категория"), planned: Number(e.planned) || 0, mode: e.mode === "auto" ? "auto" : "manual" })) : base.expenseLines,
    };
    planningStore[key] = store;
    if (supabaseEnabled) {
      try {
        await supabaseFetch<any[]>("planning_budgets", "", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            organization_id: session.organizationId,
            branch_id: store.branchId,
            period_month: period,
            source: store.source,
            planned_revenue: store.revenueLines.reduce((s, r) => s + r.planned, 0),
            planned_expense: store.expenseLines.reduce((s, e) => s + e.planned, 0),
          }),
        });
      } catch (e: any) { /* mock-режим: храним в памяти */ }
    }
    res.status(201).json(buildPlanningOverview(session, period, store.branchId));
  }));

  // Сохранить настройки мотивации.
  app.patch("/api/mvp/planning/motivation", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел «Планирование» доступен только владельцу" });
    const rows = Array.isArray(req.body?.motivation) ? req.body.motivation : [];
    planningMotivation[session.organizationId] = rows.map((r: any) => ({
      level: String(r.level || ""), threshold: Number(r.threshold) || 0, bonus: String(r.bonus || ""),
    }));
    res.json({ motivation: planningMotivation[session.organizationId] });
  }));

  // Добавить ежедневный отчёт управляющего.
  app.post("/api/mvp/planning/daily", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner") return res.status(403).json({ error: "Раздел «Планирование» доступен только владельцу" });
    const b = req.body || {};
    const row = {
      date: String(b.date || new Date().toISOString().slice(0, 10)),
      revenue: Number(b.revenue) || 0,
      trials: Number(b.trials) || 0,
      sales: Number(b.sales) || 0,
      comment: String(b.comment || ""),
      author: String(b.author || "Управляющий"),
    };
    const list = planningDaily[session.organizationId] || dailyDefaults();
    planningDaily[session.organizationId] = [row, ...list];
    res.status(201).json({ daily: planningDaily[session.organizationId] });
  }));

  // ======================================================================
  // ШТРАФЫ ПРЕПОДАВАТЕЛЕЙ — журнал штрафов, вычитаются из ЗП.
  // Начислять может владелец/управляющий. mock-режим: память процесса + демо.
  // ======================================================================
  const penaltyStore: Record<string, any[]> = {};
  const penaltyDefaults = () => [
    { id: uid(), teacherId: null, teacherName: "Аслан Плиев", reason: "Опоздание", amount: 5000, period_month: "2026-06", created_by: "Управляющий", comment: "Опоздал на 25 минут", created_at: "2026-06-18T09:00:00Z" },
    { id: uid(), teacherId: null, teacherName: "Хамит Муратович", reason: "Незакрытый журнал", amount: 3000, period_month: "2026-06", created_by: "Владелец", comment: "Журнал не закрыт 2 дня", created_at: "2026-06-22T19:00:00Z" },
  ];

  app.get("/api/mvp/teachers/penalties", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Раздел доступен владельцу и управляющему" });
    if (!penaltyStore[session.organizationId]) penaltyStore[session.organizationId] = penaltyDefaults();
    let rows = penaltyStore[session.organizationId];
    if (supabaseEnabled) {
      try {
        rows = await supabaseFetch<any[]>("teacher_penalties", `select=*&organization_id=eq.${session.organizationId}&order=created_at.desc`);
      } catch { /* откат на mock */ }
    }
    const total = rows.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
    res.json({ penalties: rows, total });
  }));

  app.post("/api/mvp/teachers/penalties", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Раздел доступен владельцу и управляющему" });
    const b = req.body || {};
    const amount = Number(b.amount);
    if (!b.reason || !amount || amount <= 0) return res.status(400).json({ error: "Укажите причину и сумму штрафа" });
    const row = {
      id: uid(),
      teacherId: b.teacherId || null,
      teacherName: b.teacherName || "Преподаватель",
      reason: String(b.reason),
      amount,
      period_month: String(b.period_month || new Date().toISOString().slice(0, 7)),
      created_by: b.created_by === "Управляющий" ? "Управляющий" : "Владелец",
      comment: b.comment || null,
      created_at: new Date().toISOString(),
    };
    if (supabaseEnabled) {
      try {
        await supabaseFetch<any[]>("teacher_penalties", "", {
          method: "POST",
          body: JSON.stringify({
            organization_id: session.organizationId, teacher_id: row.teacherId,
            branch_id: b.branchId || session.dbBranchId || null,
            reason: row.reason, amount: row.amount, period_month: row.period_month,
            created_by: row.created_by, comment: row.comment,
          }),
        });
      } catch { /* mock */ }
    }
    if (!penaltyStore[session.organizationId]) penaltyStore[session.organizationId] = penaltyDefaults();
    penaltyStore[session.organizationId] = [row, ...penaltyStore[session.organizationId]];
    res.status(201).json({ penalty: row });
  }));

  app.delete("/api/mvp/teachers/penalties/:id", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "owner" && session.role !== "branch_manager") return res.status(403).json({ error: "Раздел доступен владельцу и управляющему" });
    const id = req.params.id;
    if (supabaseEnabled) {
      try { await supabaseFetch("teacher_penalties", `id=eq.${id}&organization_id=eq.${session.organizationId}`, { method: "DELETE" }); } catch { /* mock */ }
    }
    if (penaltyStore[session.organizationId]) penaltyStore[session.organizationId] = penaltyStore[session.organizationId].filter((r) => r.id !== id);
    res.json({ ok: true });
  }));

  // ===================== Приход педагога (стандарт работы: фото + вовремя) =====================
  const arrivalStore: Record<string, { time: string; late: boolean; photo?: string | null; date: string }> = {};
  const arrivalKey = (session: MvpSession, date: string) => `${session.organizationId}:${date}:${session.userId}`;

  // Статус прихода на сегодня.
  app.get("/api/mvp/teachers/arrival/today", ah(async (req, res) => {
    const session = getSession(req);
    const date = KZ_DATE.format(new Date());
    const local = arrivalStore[arrivalKey(session, date)];
    if (local) return res.json({ arrival: { time: local.time, late: local.late } });
    if (supabaseEnabled) {
      try {
        const rows = await supabaseFetch<any[]>("teacher_arrivals", `organization_id=eq.${session.organizationId}&teacher_id=eq.${session.userId}&arrival_date=eq.${date}&select=arrival_time,is_late`, {});
        const r = rows?.[0];
        if (r) return res.json({ arrival: { time: r.arrival_time, late: r.is_late } });
      } catch { /* mock */ }
    }
    res.json({ arrival: null });
  }));

  // Отметить приход (фото + время). Один приход в день — перезаписываем.
  app.post("/api/mvp/teachers/arrival", ah(async (req, res) => {
    const session = getSession(req);
    if (session.role !== "teacher" && session.role !== "owner" && session.role !== "branch_manager" && session.role !== "admin")
      return res.status(403).json({ error: "Недоступно" });
    const b = req.body || {};
    const date = KZ_DATE.format(new Date());
    const time = String(b.time || "").match(/^\d{1,2}:\d{2}$/) ? String(b.time) : KZ_DATE.format(new Date());
    const late = Boolean(b.late);
    const photo = typeof b.photo === "string" ? b.photo : null;
    arrivalStore[arrivalKey(session, date)] = { time, late, photo, date };
    if (supabaseEnabled) {
      try {
        // teacher_id оставляем null: demo-сессия не всегда = реальному teachers.id (FK).
        await supabaseFetch("teacher_arrivals", "", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            organization_id: session.organizationId, teacher_id: null,
            branch_id: session.dbBranchId || null,
            arrival_date: date, arrival_time: time, is_late: late, photo,
          }),
        });
      } catch { /* mock */ }
    }
    res.status(201).json({ arrival: { time, late } });
  }));

  // Пробные занятия на сегодня (по отметкам is_trial у сегодняшних уроков).
  app.get("/api/mvp/teachers/trials-today", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.json({ trials: [] });
    const today = KZ_DATE.format(new Date()); // YYYY-MM-DD (Almaty)
    const start = new Date(`${today}T00:00:00+05:00`).toISOString();
    const endD = new Date(`${today}T00:00:00+05:00`); endD.setDate(endD.getDate() + 1);
    const end = endD.toISOString();
    const timeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", minute: "2-digit", hour12: false });
    try {
      const lessons = await supabaseFetch<any[]>("schedule_lessons",
        `select=id,group_id,starts_at&organization_id=eq.${session.organizationId}&starts_at=gte.${encodeURIComponent(start)}&starts_at=lt.${encodeURIComponent(end)}`).catch(() => [] as any[]);
      if (!lessons.length) return res.json({ trials: [] });
      const lessonIds = lessons.map((l) => l.id).filter(Boolean);
      const marks = await supabaseFetch<any[]>("attendance",
        `select=student_id,lesson_id,trial_outcome,status&is_trial=eq.true&lesson_id=in.(${lessonIds.join(",")})`).catch(() => [] as any[]);
      if (!marks.length) return res.json({ trials: [] });
      const studentIds = [...new Set(marks.map((m) => m.student_id).filter(Boolean))];
      const groupIds = [...new Set(lessons.map((l) => l.group_id).filter(Boolean))];
      const students = studentIds.length
        ? await supabaseFetch<any[]>("students", `select=id,name,phone,parent_phone&id=in.(${studentIds.join(",")})`).catch(() => [] as any[]) : [];
      const groups = groupIds.length
        ? await supabaseFetch<any[]>("groups", `select=id,name,teacher_id&id=in.(${groupIds.join(",")})`).catch(() => [] as any[]) : [];
      const gById: Record<string, any> = Object.fromEntries(groups.map((g) => [g.id, g]));
      const lById: Record<string, any> = Object.fromEntries(lessons.map((l) => [l.id, l]));
      const sById: Record<string, any> = Object.fromEntries(students.map((s) => [s.id, s]));
      let trials = marks.map((m) => {
        const l = lById[m.lesson_id];
        const g = l ? gById[l.group_id] : null;
        const s = sById[m.student_id];
        const outcome = m.trial_outcome || (m.status === "unknown" || !m.status ? "pending" : m.status);
        return {
          studentId: m.student_id,
          studentName: s?.name || "Ученик",
          phone: s?.phone || s?.parent_phone || "",
          groupId: l?.group_id || null,
          groupName: g?.name || "",
          teacherId: g?.teacher_id || null,
          time: l?.starts_at ? timeFmt.format(new Date(l.starts_at)) : "",
          outcome, // pending | converted | lost
        };
      });
      if (session.role === "teacher") trials = trials.filter((t) => !t.teacherId || t.teacherId === session.userId);
      trials.sort((a, b) => String(a.time).localeCompare(String(b.time)));
      res.json({ trials });
    } catch {
      res.json({ trials: [] });
    }
  }));
}
