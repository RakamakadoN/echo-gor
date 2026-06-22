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

  return response.json() as Promise<T>;
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
  
  const [branches, halls, users, groups, studentsRaw, paymentsRaw, lessons, attendanceRaw, subscriptionsRaw, plans, financeTransactions, tasksRaw, leadSourcesRaw] = await Promise.all([
    supabaseFetch<any[]>("branches", `select=*&${orgFilter}&status=neq.archived`),
    supabaseFetch<any[]>("halls", `select=*`), // Halls are filtered by branch in mapping
    supabaseFetch<any[]>("users", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("groups", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("students", `select=*&${orgFilter}&status=neq.archived&deletion_requested_at=is.null`),
    supabaseFetch<any[]>("payments", `select=*&${orgFilter}&order=paid_at.desc`),
    supabaseFetch<any[]>("schedule_lessons", `select=*&order=starts_at.desc`), // Cross-org lessons are unlikely but we keep mapping safe
    supabaseFetch<any[]>("attendance", "select=*"),
    supabaseFetch<any[]>("student_subscriptions", `select=*`),
    supabaseFetch<any[]>("subscription_plans", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("finance_transactions", `select=*&${orgFilter}&order=created_at.desc`),
    // tasks/lead_sources не имеют organization_id — фильтруем по филиалу в коде
    supabaseFetch<any[]>("tasks", `select=*&order=created_at.desc`).catch(() => [] as any[]),
    supabaseFetch<any[]>("lead_sources", `select=*&order=name.asc`).catch(() => [] as any[])
  ]);

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
      note: row.comment || undefined
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
      return mapDbStudent({ ...student, teacher_id: student.teacher_id || group?.teacher_id }, attendanceByStudent, subsByStudent);
    });

  const visibleStudentIds = new Set(students.map((student) => student.id));
  const payments = paymentsRaw.filter((payment) => visibleStudentIds.has(payment.student_id)).map(mapDbPayment);

  const branchesVisible = branches
    .filter((branch) => branchAllowed(branch.id))
    .map((branch) => ({
      id: branch.id,
      organizationId: branch.organization_id,
      name: branch.name,
      city: branch.city,
      address: branch.address,
      managerName: users.find((user) => user.id === branch.manager_id)?.full_name || "Руководитель",
      phone: branch.phone || "",
      hallsCount: halls.filter((hall) => hall.branch_id === branch.id).length
    }));

  const hallsVisible = halls
    .filter((hall) => branchAllowed(hall.branch_id))
    .map((hall) => ({ id: hall.id, branchId: hall.branch_id, name: hall.name, capacity: hall.capacity || 0 }));

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
    announcements: initialAnnouncements,
    payments,
    financeTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branchesVisible as any, groupsVisible as any, students as any, payments as any, teachers as any)
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
        supabaseFetch<any[]>("students", `select=id,branch_id,birthday&${orgFilter}&status=neq.archived`)
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
        supabaseFetch<any[]>("students", `select=id,branch_id,status,created_at&${orgFilter}&status=neq.archived`),
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

    const [firstName, ...rest] = String(payload.name).trim().split(/\s+/);
    const inserted = await supabaseFetch<any[]>("students", "", {
      method: "POST",
      body: JSON.stringify({
        organization_id: session.organizationId,
        branch_id: payload.branchId,
        group_id: payload.groupId || null,
        first_name: firstName || payload.name,
        last_name: rest.join(" ") || "-",
        teacher_id: payload.teacherId || null,
        parent_name: payload.parentName || null,
        parent_phone: payload.parentPhone || null,
        status: payload.status || "active",
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
    if (payload.name !== undefined) {
      const [firstName, ...rest] = String(payload.name).trim().split(/\s+/);
      updates.first_name = firstName || payload.name;
      updates.last_name = rest.join(" ") || "-";
    }
    if (payload.branchId !== undefined) updates.branch_id = payload.branchId;
    if (payload.groupId !== undefined) updates.group_id = payload.groupId || null;
    if (payload.teacherId !== undefined) updates.teacher_id = payload.teacherId || null;
    if (payload.parentName !== undefined) updates.parent_name = payload.parentName || null;
    if (payload.parentPhone !== undefined) updates.parent_phone = payload.parentPhone || null;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.manualStatus !== undefined) updates.manual_status = payload.manualStatus || null;
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

      res.status(201).json({
        subscription: mapDbSubscription(insertedSub[0], plan.name),
        payment
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

    const rows = await supabaseFetch<any[]>("attendance", "on_conflict=lesson_id,student_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        lesson_id: lessonId,
        student_id: payload.studentId,
        status: payload.status === "unmarked" ? "unknown" : payload.status,
        marked_by: session.userId.startsWith("demo-") ? null : session.userId,
        marked_at: new Date().toISOString(),
        comment: payload.comment || null
      })
    });

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
          status: "active"
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
      const rows = await supabaseFetch<any[]>(
        "groups",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Группа не найдена" });
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
    if (!["present", "absent", "sick", "unmarked"].includes(status)) {
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
      }));
      const upserted = await supabaseFetch<any[]>("attendance", "on_conflict=lesson_id,student_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(rows),
      });
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
}
