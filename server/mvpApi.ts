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
const supabaseEnabled = Boolean(supabaseUrl && supabaseKey);

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
    groups,
    students,
    announcements: initialAnnouncements,
    payments,
    financeTransactions: initialFinanceTransactions,
    auditLogs: initialAuditLogs,
    metrics: getExecutiveSummary(branchFiltered, groups, students, payments, initialTeachers)
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
      status: sub.status === "active" ? "active" : "expired"
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

async function dbBootstrap(session: MvpSession) {
  const orgFilter = `organization_id=eq.${session.organizationId}`;
  
  const [branches, halls, users, groups, studentsRaw, paymentsRaw, lessons, attendanceRaw, subscriptionsRaw, plans, financeTransactions] = await Promise.all([
    supabaseFetch<any[]>("branches", `select=*&${orgFilter}&status=neq.archived`),
    supabaseFetch<any[]>("halls", `select=*`), // Halls are filtered by branch in mapping
    supabaseFetch<any[]>("users", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("groups", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("students", `select=*&${orgFilter}&status=neq.archived`),
    supabaseFetch<any[]>("payments", `select=*&${orgFilter}&order=paid_at.desc`),
    supabaseFetch<any[]>("schedule_lessons", `select=*&order=starts_at.desc`), // Cross-org lessons are unlikely but we keep mapping safe
    supabaseFetch<any[]>("attendance", "select=*"),
    supabaseFetch<any[]>("student_subscriptions", `select=*`),
    supabaseFetch<any[]>("subscription_plans", `select=*&${orgFilter}`),
    supabaseFetch<any[]>("finance_transactions", `select=*&${orgFilter}&order=created_at.desc`)
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

  return {
    mode: "supabase",
    session,
    organizations: initialOrganizations,
    branches: branchesVisible,
    halls: hallsVisible,
    teachers,
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

  app.post("/api/mvp/students", async (req, res) => {
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
        status: "active",
        comment: payload.comment || null
      })
    });
    res.status(201).json({ student: inserted[0] });
  });

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
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Нет полей для обновления" });
    }
    try {
      const rows = await supabaseFetch<any[]>(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (!rows[0]) return res.status(404).json({ error: "Ученик не найден" });
      res.json({ student: rows[0] });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось обновить ученика" });
    }
  });

  app.delete("/api/mvp/students/:id", async (req, res) => {
    const session = getSession(req);
    if (!supabaseEnabled) {
      return res.status(503).json({ error: "Supabase is not configured" });
    }
    try {
      // Soft delete: archive so payments/attendance history is preserved.
      const rows = await supabaseFetch<any[]>(
        "students",
        `id=eq.${req.params.id}&organization_id=eq.${session.organizationId}`,
        { method: "PATCH", body: JSON.stringify({ status: "archived" }) }
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
    const { dryRun, maxDetailFetches } = req.body || {};
    try {
      const result = await runParser({
        dryRun: Boolean(dryRun),
        maxDetailFetches: Number(maxDetailFetches) || undefined,
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
      const [studentsRaw, subscriptionsRaw, paymentsRaw, lessons, attendanceRaw, plans] = await Promise.all([
        supabaseFetch<any[]>("students", `select=*&id=eq.${studentId}&status=neq.archived`),
        supabaseFetch<any[]>("student_subscriptions", `select=*&student_id=eq.${studentId}&order=starts_on.desc`),
        supabaseFetch<any[]>("payments", `select=*&student_id=eq.${studentId}&order=paid_at.desc&limit=20`),
        supabaseFetch<any[]>("schedule_lessons", `select=*&order=starts_at.desc&limit=60`),
        supabaseFetch<any[]>("attendance", `select=*&student_id=eq.${studentId}`),
        supabaseFetch<any[]>("subscription_plans", `select=*`),
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
        };
      });
      const paymentsMapped = paymentsRaw.map(mapDbPayment);
      const mapped = mapDbStudent(student, new Map([[studentId, attendanceMap]]), new Map([[studentId, subscriptionsRaw]]));
      res.json({ student: { ...mapped, subscriptions: subsMapped }, payments: paymentsMapped });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Не удалось загрузить данные ребёнка" });
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
      const result = await runParser({ log: (m) => console.log("[cron dance-events]", m) });
      res.json({ ranAt: new Date().toISOString(), ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Парсинг не выполнен" });
    }
  });
}
