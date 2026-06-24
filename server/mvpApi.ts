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
  role: "owner" | "branch_manager" | "admin" | "teacher";
  branchId: string | null;   // mock-data branch key (see src/dataMock.ts)
  dbBranchId: string | null; // real Supabase branch UUID (see db/seed_mvp_demo.sql)
  fullName: string;
};

// Organization UUID — MUST match the organizations row seeded in db/seed_mvp_demo.sql.
const orgId = "00000000-0000-0000-0000-000000000001";
// Almaty branch UUID from db/seed_mvp_demo.sql (the only seeded branch with staff/students).
const demoBranchAlmaty = "00000000-0000-0000-0000-000000000101";

const demoUsers: MvpSession[] = [
  { userId: "00000000-0000-0000-0000-000000001001", organizationId: orgId, role: "owner", branchId: null, dbBranchId: null, fullName: "Асланбек Болотаев" },
  { userId: "00000000-0000-0000-0000-000000001002", organizationId: orgId, role: "branch_manager", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "Магомед Даудов" },
  { userId: "00000000-0000-0000-0000-000000001003", organizationId: orgId, role: "admin", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "Фатима Царикаева" },
  { userId: "00000000-0000-0000-0000-000000001004", organizationId: orgId, role: "teacher", branchId: "branch-almaty", dbBranchId: demoBranchAlmaty, fullName: "Аслан Плиев" }
];

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

const toDate = (value?: string | null) => value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);

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

// Семейный квест → форма, удобная фронту (ParentWorkspace).
// status в БД: in_progress | awaiting | confirmed → русские подписи UI.
const QUEST_STATUS_LABEL: Record<string, string> = {
  in_progress: "В процессе",
  awaiting: "Ждет подтверждения",
  confirmed: "Подтверждено"
};
function mapDbQuest(row: any) {
  return {
    id: row.id,
    studentId: row.student_id || null,
    title: row.title,
    category: row.category || "",
    reward: row.reward || "",
    minutes: row.minutes || "",
    status: QUEST_STATUS_LABEL[row.status] || "В процессе",
    statusKey: row.status || "in_progress",
    createdAt: row.created_at || null,
    confirmedAt: row.confirmed_at || null
  };
}

function mapDbPlan(row: any) {
  return {
    id: row.id,
    name: row.name,
    lessonsCount: row.lessons_count ?? 0,
    durationDays: row.duration_days ?? 0,
    price: Number(row.price || 0),
    status: row.status || "active"
  };
}

function mapDbLeadSource(row: any) {
  return { id: row.id, name: row.name, status: row.status || "active" };
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

function mapDbStudent(row: any, attendanceByStudent: Map<string, Record<string, Attendance>>, subsByStudent: Map<string, any[]>): Student {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "Ученик";
  return {
    id: row.id,
    organizationId: row.organization_id,
    name,
    age: row.birthday ? Math.max(4, new Date().getFullYear() - new Date(row.birthday).getFullYear()) : 12,
    photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop&q=80",
    branchId: row.branch_id,
    groupIds: row.group_id ? [row.group_id] : [],
    teacherId: row.teacher_id || "",
    createdAt: row.created_at || undefined,
    status: row.status || undefined,
    manualStatus: row.manual_status || null,
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
    balance: row.status === "debt" ? -1 : 0,
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
      status: sub.status === "active" ? "active" : "expired",
      startsOn: sub.starts_on,
      discountAmount: Number(sub.discount_amount || 0),
      groupId: sub.group_id || null
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
    status: row.status === "active" ? "active" : "expired",
    startsOn: row.starts_on,
    discountAmount: Number(row.discount_amount || 0),
    groupId: row.group_id || null
  };
}

async function dbBootstrap(session: MvpSession) {
  const orgFilter = `organization_id=eq.${session.organizationId}`;
  
  const [branches, halls, users, groups, studentsRaw, paymentsRaw, lessons, attendanceRaw, subscriptionsRaw, plans, financeTransactions, tasksRaw, leadSourcesRaw, waitlistRaw] = await Promise.all([
    supabaseFetch<any[]>("branches", `select=*&${orgFilter}&status=neq.archived`),
    supabaseFetch<any[]>("halls", `select=*`), // Halls are filtered by branch in mapping
    supabaseFetch<any[]>("users", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("groups", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("students", `select=*&${orgFilter}&status=neq.archived&deletion_requested_at=is.null&archived_at=is.null`),
    supabaseFetch<any[]>("payments", `select=*&${orgFilter}&order=paid_at.desc`),
    supabaseFetch<any[]>("schedule_lessons", `select=*&order=starts_at.desc`), // Cross-org lessons are unlikely but we keep mapping safe
    supabaseFetch<any[]>("attendance", "select=*"),
    supabaseFetch<any[]>("student_subscriptions", `select=*`),
    supabaseFetch<any[]>("subscription_plans", `select=*&${orgFilter}`),
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
    scheduleText: "По расписанию",
    days: [],
    time: "",
    ageGroup: group.age_from && group.age_to ? `${group.age_from}-${group.age_to} лет` : "Все возрасты",
    ageFrom: group.age_from ?? null,
    ageTo: group.age_to ?? null,
    capacity: group.capacity ?? 0,
    level: "MVP",
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

  const visibleStudentIds = new Set(students.map((student) => student.id));
  const waitlist = waitlistRaw
    .filter((w) => visibleStudentIds.has(w.student_id))
    .map(mapDbWaitlist);
  const payments = paymentsRaw.filter((payment) => visibleStudentIds.has(payment.student_id)).map(mapDbPayment);

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
        supabaseFetch<any[]>("student_status_events", `select=to_status&${orgFilter}&occurred_at=gte.${dayStart(today)}&occurred_at=lte.${dayEnd(today)}`),
        supabaseFetch<any[]>("student_status_events", `select=to_status&${orgFilter}&occurred_at=gte.${dayStart(yesterday)}&occurred_at=lte.${dayEnd(yesterday)}`),
        supabaseFetch<any[]>("invoices", `select=due_on,status&${orgFilter}&due_on=lt.${today}&status=in.(sent,overdue)`),
        supabaseFetch<any[]>("student_subscriptions", `select=student_id,branch_id,starts_on&starts_on=gt.${today}`),
        supabaseFetch<any[]>("students", `select=id,branch_id,birthday&${orgFilter}&status=neq.archived&archived_at=is.null`)
      ]);
      const snapshots = snapsRaw.map((s) => ({
        periodMonth: toDate(s.period_month), branchId: s.branch_id,
        revenue: Number(s.revenue || 0), activeSubscriptions: s.active_subscriptions || 0,
        avgCheck: Number(s.avg_check || 0), retentionRate: Number(s.retention_rate || 0),
        attendanceRate: Number(s.attendance_rate || 0), newStudents: s.new_students || 0
      }));
      const funnel = (rows: any[]) => ({
        leads: rows.filter((r) => r.to_status === "lead").length,
        trialBooked: rows.filter((r) => r.to_status === "trial").length,
        trialCame: rows.filter((r) => r.to_status === "trial").length,
        bought: rows.filter((r) => r.to_status === "active").length
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
        supabaseFetch<any[]>("students", `select=id,branch_id,status,created_at&${orgFilter}&status=neq.archived&archived_at=is.null`),
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
        const activeStud = bs.filter((s) => s.status === "active").length;
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
      res.status(503).json({ error: error.message });
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
    const inserted = await supabaseFetch<any[]>("students", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        group_id: payload.groupId || null,
        source_id: payload.sourceId || null,
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
    if (payload.sourceId !== undefined) updates.source_id = payload.sourceId || null;
    if (payload.teacherId !== undefined) updates.teacher_id = payload.teacherId || null;
    if (payload.gender !== undefined) updates.gender = payload.gender || null;
    if (payload.birthday !== undefined) updates.birthday = payload.birthday || null;
    if (payload.phone !== undefined) updates.phone = payload.phone || null;
    if (payload.parentName !== undefined) updates.parent_name = payload.parentName || null;
    if (payload.parentPhone !== undefined) updates.parent_phone = payload.parentPhone || null;
    if (payload.comment !== undefined) updates.comment = payload.comment || null;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.manualStatus !== undefined) updates.manual_status = payload.manualStatus || null;
    if (payload.payPromiseDate !== undefined) updates.pay_promise_date = payload.payPromiseDate || null;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Нет полей для обновления" });
    }
    try {
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
  app.post("/api/mvp/students/:id/archive", ah(async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const reason = (req.body && String(req.body.reason || "").trim()) || "";
    const comment = (req.body && String(req.body.comment || "").trim()) || "";
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
    const rows = await supabaseFetch<any[]>(
      "students",
      `select=*&organization_id=eq.${session.organizationId}&archived_at=not.is.null&order=archived_at.desc`
    );
    const students = rows
      .filter((row) => canSeeBranch(session, row.branch_id))
      .map((row) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.full_name || "Ученик",
        branchId: row.branch_id,
        phone: row.phone || row.parent_phone || "",
        parentName: row.parent_name || "",
        parentPhone: row.parent_phone || "",
        archivedAt: row.archived_at,
        archivedBy: row.archived_by || "—",
        archiveReason: row.archive_reason || "",
        archiveComment: row.archive_comment || ""
      }));
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
        description: payload.description || "Оплата абонемента"
      })
    });

    res.status(201).json({ payment: mapDbPayment(insertedPayment[0]) });
  });

  // Продать абонемент: создаём student_subscriptions + (по флагу paid) платёж и проводку ДДС.
  app.post("/api/mvp/student-subscriptions", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    const studentId = payload.studentId;
    const branchId = payload.branchId;
    const planId = payload.planId;
    if (!studentId || !branchId || !planId) {
      return res.status(400).json({ error: "studentId, branchId and planId are required" });
    }
    if (!canSeeBranch(session, branchId)) {
      return res.status(403).json({ error: "Branch access denied" });
    }
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      // План нужен для названия и значений по умолчанию.
      const plans = await supabaseFetch<any[]>(
        "subscription_plans",
        `select=*&id=eq.${planId}&organization_id=eq.${session.organizationId}`
      );
      const plan = plans[0];
      if (!plan) return res.status(404).json({ error: "План абонемента не найден" });

      const lessonsTotal = Number(payload.lessonsTotal) > 0
        ? Math.round(Number(payload.lessonsTotal))
        : Number(plan.lessons_count) || 0;
      const today = new Date().toISOString().slice(0, 10);
      const startsOn = payload.startsOn || today;
      let endsOn = payload.endsOn || startsOn;
      if (endsOn < startsOn) endsOn = startsOn;

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
      const insertedSub = await supabaseFetch<any[]>("student_subscriptions", "", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          plan_id: planId,
          branch_id: branchId,
          group_id: payload.groupId || null,
          starts_on: startsOn,
          ends_on: endsOn,
          lessons_total: lessonsTotal,
          lessons_left: lessonsTotal,
          price: finalPrice,
          discount_amount: discountAmount + recalc,
          status: paid ? "active" : "inactive"
        })
      });

      // Платёж и проводка ДДС — только если оплата принята.
      let payment = null;
      if (paid && finalPrice > 0) {
        const insertedPayment = await supabaseFetch<any[]>("payments", "", {
          method: "POST",
          body: JSON.stringify({
            organization_id: session.organizationId,
            branch_id: branchId,
            student_id: studentId,
            amount: finalPrice,
            method: payload.method || "kaspi",
            status: "paid",
            comment: payload.description || `Абонемент: ${plan.name}`,
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
            amount: finalPrice,
            type: "income",
            category: "tuition",
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
      }

      res.status(201).json({
        subscription: mapDbSubscription(insertedSub[0], plan.name),
        payment,
        waitlistClosed
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось продать абонемент" });
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
      const lessons = await supabaseFetch<any[]>(
        "schedule_lessons",
        `select=*&group_id=eq.${student.group_id}&starts_at=gte.${encodeURIComponent(start)}&starts_at=lt.${encodeURIComponent(end)}&limit=1`
      );
      if (!lessons[0]) return res.status(404).json({ error: "Lesson not found for student group and date" });
      lessonId = lessons[0].id;
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
          capacity: payload.capacity ?? null,
          level: payload.level || "Начинающие",
          schedule_days: payload.scheduleDays || null,
          schedule_time: payload.scheduleTime || null,
          status: "active",
        }),
      });
      res.status(201).json({ group: mapDbGroup(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать группу" });
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
    if (payload.capacity !== undefined) updates.capacity = payload.capacity ?? null;
    if (payload.level !== undefined) updates.level = payload.level || null;
    if (payload.scheduleDays !== undefined) updates.schedule_days = payload.scheduleDays || null;
    if (payload.scheduleTime !== undefined) updates.schedule_time = payload.scheduleTime || null;
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
      const rows = await supabaseFetch<any[]>(
        "groups",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Группа не найдена" });
      res.json({ group: mapDbGroup(rows[0]), archived: true });
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
      topic: row.topic || null,
    };
  }

  // GET /api/mvp/schedule?branchId=...&groupId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
  app.get("/api/mvp/schedule", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { branchId, groupId, from, to } = req.query as Record<string, string>;
    const parts = ["select=*,groups(name),halls(name),users(full_name)", "order=starts_at.asc"];
    if (branchId) parts.push(`branch_id=eq.${branchId}`);
    else if (session.role !== "owner" && session.dbBranchId) parts.push(`branch_id=eq.${session.dbBranchId}`);
    if (groupId) parts.push(`group_id=eq.${groupId}`);
    if (from) parts.push(`starts_at=gte.${encodeURIComponent(from)}`);
    if (to) parts.push(`starts_at=lte.${encodeURIComponent(to)}`);
    // teacher sees only their lessons
    if (session.role === "teacher") parts.push(`teacher_id=eq.${session.userId}`);
    try {
      const rows = await supabaseFetch<any[]>("schedule_lessons", parts.join("&"));
      const lessons = rows.map((row) =>
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
          topic: payload.topic || null,
          created_by: session.userId.startsWith("demo-") ? null : session.userId,
        }),
      });
      res.status(201).json({ lesson: mapDbLesson(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать урок" });
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
    if (payload.topic !== undefined) updates.topic = payload.topic || null;
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

  // ───────────────── Parent cabinet: данные конкретного ребёнка ────────────────

  // GET /api/mvp/parent/child?studentId=...
  // Возвращает профиль ученика + группа + подписки + платежи + посещаемость.
  // В MVP доступно всем ролям (родитель узнаёт studentId из URL или сессии).
  app.get("/api/mvp/parent/child", async (req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { studentId } = req.query as Record<string, string>;
    if (!studentId) return res.status(400).json({ error: "studentId обязателен" });
    try {
      const [studentsRaw, subscriptionsRaw, paymentsRaw, lessons, attendanceRaw, plans, questsRaw] = await Promise.all([
        supabaseFetch<any[]>("students", `select=*&id=eq.${studentId}&status=neq.archived`),
        supabaseFetch<any[]>("student_subscriptions", `select=*&student_id=eq.${studentId}&order=starts_on.desc`),
        supabaseFetch<any[]>("payments", `select=*&student_id=eq.${studentId}&order=paid_at.desc&limit=20`),
        supabaseFetch<any[]>("schedule_lessons", `select=*&order=starts_at.desc&limit=60`),
        supabaseFetch<any[]>("attendance", `select=*&student_id=eq.${studentId}`),
        supabaseFetch<any[]>("subscription_plans", `select=*`),
        supabaseFetch<any[]>("family_quests", `select=*&student_id=eq.${studentId}&order=created_at.desc`).catch(() => []),
      ]);
      const student = studentsRaw[0];
      if (!student) return res.status(404).json({ error: "Ученик не найден" });

      const planById = new Map(plans.map((p) => [p.id, p]));
      const lessonById = new Map(lessons.map((l) => [l.id, l]));
      const attendanceMap: Record<string, Attendance> = {};
      attendanceRaw.forEach((row) => {
        const lesson = lessonById.get(row.lesson_id);
        if (!lesson) return;
        const date = toDate(lesson.starts_at);
        attendanceMap[date] = {
          date,
          status: row.status === "unknown" ? "unmarked" : row.status,
          markedBy: row.marked_by || undefined,
          note: row.comment || undefined,
        };
      });
      const subsMapped = subscriptionsRaw.map((sub) => {
        const plan = planById.get(sub.plan_id);
        return {
          id: sub.id,
          studentId: sub.student_id,
          name: plan?.name || "Абонемент",
          price: Number(sub.price || 0),
          lessonsTotal: sub.lessons_total || 0,
          lessonsLeft: sub.lessons_left || 0,
          validUntil: sub.ends_on,
          isAutoRenew: false,
          status: sub.status === "active" ? "active" : "expired",
          startsOn: sub.starts_on,
          discountAmount: Number(sub.discount_amount || 0),
          groupId: sub.group_id || null,
        };
      });
      const paymentsMapped = paymentsRaw.map(mapDbPayment);
      const questsMapped = (questsRaw || []).map(mapDbQuest);
      const mapped = mapDbStudent(student, new Map([[studentId, attendanceMap]]), new Map([[studentId, subscriptionsRaw]]));
      res.json({ student: { ...mapped, subscriptions: subsMapped }, payments: paymentsMapped, quests: questsMapped });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить данные ребёнка" });
    }
  });

  // ===== Семейные квесты родительского кабинета (family_quests) =====
  // Родитель создаёт квест, ребёнок выполняет, семья подтверждает.
  // GET — список квестов ребёнка.
  app.get("/api/mvp/parent/quests", async (req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const { studentId } = req.query as Record<string, string>;
    if (!studentId) return res.status(400).json({ error: "studentId обязателен" });
    try {
      const rows = await supabaseFetch<any[]>("family_quests", `select=*&student_id=eq.${studentId}&order=created_at.desc`);
      res.json({ quests: rows.map(mapDbQuest) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить квесты" });
    }
  });

  // POST — создать квест для ребёнка.
  app.post("/api/mvp/parent/quests", async (req, res) => {
    const session = getSession(req);
    const payload = req.body || {};
    if (!payload.studentId) return res.status(400).json({ error: "studentId обязателен" });
    if (!payload.title || !String(payload.title).trim()) return res.status(400).json({ error: "title is required" });
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const allowed = new Set(["in_progress", "awaiting", "confirmed"]);
    const status = allowed.has(payload.status) ? payload.status : "in_progress";
    try {
      const inserted = await supabaseFetch<any[]>("family_quests", "", {
        method: "POST",
        body: JSON.stringify({
          organization_id: session.organizationId,
          student_id: payload.studentId,
          created_by: session.userId,
          title: String(payload.title).trim(),
          category: payload.category || null,
          reward: payload.reward || null,
          minutes: payload.minutes || null,
          status
        })
      });
      res.status(201).json({ quest: mapDbQuest(inserted[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось создать квест" });
    }
  });

  // PATCH — обновить статус квеста (подтверждение выполнения и т.п.).
  app.patch("/api/mvp/parent/quests/:id", async (req, res) => {
    const payload = req.body || {};
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.status !== undefined) {
      const allowed = new Set(["in_progress", "awaiting", "confirmed"]);
      if (!allowed.has(payload.status)) return res.status(400).json({ error: "Недопустимый статус" });
      updates.status = payload.status;
      updates.confirmed_at = payload.status === "confirmed" ? new Date().toISOString() : null;
    }
    if (payload.title !== undefined) updates.title = String(payload.title).trim();
    if (payload.category !== undefined) updates.category = payload.category || null;
    if (payload.reward !== undefined) updates.reward = payload.reward || null;
    if (Object.keys(updates).length <= 1) return res.status(400).json({ error: "Нет полей для обновления" });
    try {
      const rows = await supabaseFetch<any[]>("family_quests", `id=eq.${req.params.id}`, { method: "PATCH", body: JSON.stringify(updates) });
      if (!rows[0]) return res.status(404).json({ error: "Квест не найден" });
      res.json({ quest: mapDbQuest(rows[0]) });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить квест" });
    }
  });

  // DELETE — удалить квест.
  app.delete("/api/mvp/parent/quests/:id", async (req, res) => {
    if (!supabaseEnabled) return res.status(503).json({ error: "Supabase is not configured" });
    try {
      await supabaseFetch("family_quests", `id=eq.${req.params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить квест" });
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
          status: payload.status || "active"
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
    try {
      await supabaseFetch("subscription_plans", `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось удалить абонемент" });
    }
  });

  // ===== Справочник: рекламные источники (lead_sources) =====
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

      // 2) Список учеников группы (или явный список из payload).
      let studentIds: string[] = Array.isArray(payload.studentIds) ? payload.studentIds : [];
      if (studentIds.length === 0) {
        const studs = await supabaseFetch<any[]>("students", `select=id&group_id=eq.${payload.groupId}`);
        studentIds = studs.map((s) => s.id);
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
        supabaseFetch<any[]>("finance_accounts", `select=*&${orgFilter}&order=sort.asc`),
        supabaseFetch<any[]>("finance_categories", `select=*&${orgFilter}&order=kind.asc,sort.asc`),
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
    { id: uid(), name: "Футболка ECHO GOR", category: "Мерч", sku: "TSH-001", salePrice: 15000, costPrice: 8000, minStock: 10, branchId: demoBranchAlmaty },
    { id: uid(), name: "Худи ECHO GOR", category: "Мерч", sku: "HOD-002", salePrice: 28000, costPrice: 16000, minStock: 5, branchId: demoBranchAlmaty },
    { id: uid(), name: "Штаны тренировочные", category: "Форма", sku: "PNT-003", salePrice: 20000, costPrice: 12000, minStock: 5, branchId: demoBranchAlmaty },
    { id: uid(), name: "Шапка ECHO GOR", category: "Мерч", sku: "CAP-004", salePrice: 7000, costPrice: 3500, minStock: 5, branchId: demoBranchAlmaty },
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
    // Тип выступления теперь свободный (настраивается в «Настройках»); enum оставлен для совместимости.
    const type = p.type ? String(p.type) : "basic";
    const price = Number(p.price) || 0;
    const expense = Number(p.expense) || 0;
    const performersCount = p.performersCount != null && p.performersCount !== "" ? Math.max(0, parseInt(p.performersCount, 10)) || 0 : null;
    const paymentMethod = p.paymentMethod || null;
    const markPaid = p.status === "paid"; // владелец сразу отметил «Оплачено»
    if (!supabaseEnabled) {
      const payments = markPaid && price > 0 ? [{ id: uid(), amount: price, paidDate: p.eventDate || todayStr(), method: paymentMethod || "cash", comment: null }] : [];
      const rec = { id: uid(), clientName: String(p.clientName).trim(), clientPhone: p.clientPhone || null, address: p.address || null,
        eventDate: p.eventDate || todayStr(), eventTime: p.eventTime || null, type, typeLabel: p.typeLabel || null, price, expense,
        performersCount, paymentMethod, status: "planned", comment: p.comment || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty, payments };
      mockPerformances.unshift(rec);
      return res.status(201).json({ performance: perfOut(rec, payments) });
    }
    const inserted = await supabaseFetch<any[]>("performances", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null,
        client_name: String(p.clientName).trim(), client_phone: p.clientPhone || null, address: p.address || null,
        event_date: p.eventDate || todayStr(), event_time: p.eventTime || null, type, type_label: p.typeLabel || null,
        price, expense, performers_count: performersCount, payment_method: paymentMethod,
        status: "planned", comment: p.comment || null,
      }),
    });
    // Если отмечено «Оплачено» — фиксируем поступление на всю стоимость (аналитика считает по поступлениям).
    let pays: any[] = [];
    if (markPaid && price > 0 && inserted[0]) {
      await supabaseFetch("performance_payments", "", {
        method: "POST",
        body: JSON.stringify({ organization_id: session.organizationId, performance_id: inserted[0].id, amount: price, paid_date: p.eventDate || todayStr(), method: paymentMethod || "cash", comment: "Оплата при создании" }),
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
    res.json({
      revenue: { total: curRev, momPct: pctDelta(curRev, prevRev), yoyPct: pctDelta(curRev, yoyRev) },
      unitsSold, avgCheck, grossProfit, margin, lowStock, top,
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
      const rec = { id: uid(), name: String(p.name).trim(), category: p.category || null, sku: p.sku || null, salePrice: Number(p.salePrice) || 0, costPrice: Number(p.costPrice) || 0, minStock: Number(p.minStock) || 0, comment: p.comment || null, photoUrl: p.photoUrl || null, branchId: p.branchId || session.dbBranchId || demoBranchAlmaty };
      mockProducts.unshift(rec);
      return res.status(201).json({ product: { ...prodOut(rec), stock: 0, low: 0 <= rec.minStock } });
    }
    const inserted = await supabaseFetch<any[]>("products", "", {
      method: "POST",
      body: JSON.stringify({ organization_id: session.organizationId, branch_id: p.branchId || session.dbBranchId || null, name: String(p.name).trim(), category: p.category || null, sku: p.sku || null, sale_price: Number(p.salePrice) || 0, cost_price: Number(p.costPrice) || 0, min_stock: Number(p.minStock) || 0, comment: p.comment || null, photo_url: p.photoUrl || null }),
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
      ["name", "category", "sku", "comment", "photoUrl"].forEach((k) => { if (p[k] !== undefined) rec[k] = p[k]; });
      if (p.salePrice !== undefined) rec.salePrice = Number(p.salePrice) || 0;
      if (p.costPrice !== undefined) rec.costPrice = Number(p.costPrice) || 0;
      if (p.minStock !== undefined) rec.minStock = Number(p.minStock) || 0;
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
}
