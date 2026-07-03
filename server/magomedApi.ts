/**
 * «Магомед» — ИИ-ассистент CRM «Эхо Гор» (на Claude / Anthropic API).
 *
 * Чат-виджет (src/components/MagomedAssistant.tsx) шлёт историю диалога на
 * POST /api/gemini/magomed-chat (путь исторический). Эндпоинт прогоняет её
 * через Anthropic Messages API с tool use: модель сама решает, когда вызвать
 * инструмент над базой, мы исполняем вызов через Supabase REST и возвращаем
 * результат модели. Магомед отвечает СТРОГО по данным CRM, без галлюцинаций.
 *
 * Почему Claude: единый API для всех ИИ-агентов системы, качественный
 * tool use при низкой цене. Модель по умолчанию — Claude Haiku 4.5
 * (цена/качество для рабочего чат-виджета). Меняется через ANTHROPIC_MODEL.
 *
 * Деградация:
 *  - нет ANTHROPIC_API_KEY → 503 (виджет показывает понятное сообщение);
 *  - 429/529 (лимит/перегрузка) → дружелюбный ответ «попробуйте позже»;
 *  - нет Supabase-ключа → инструменты честно отвечают «база недоступна».
 *
 * Инструменты только на чтение/поиск/аналитику + создание задачи с явным
 * подтверждением. Удаление и изменение записей выполняется в интерфейсе CRM
 * (сознательное ограничение безопасности).
 */
import type express from "express";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 1024;

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseEnabled = Boolean(supabaseUrl && supabaseKey);

// Организация и демо-филиал должны совпадать с server/mvpApi.ts / db/seed_mvp_demo.sql.
const ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_BRANCH_ALMATY = "00000000-0000-0000-0000-000000000101";

type Role = "owner" | "branch_manager" | "admin" | "teacher";

type MagomedSession = {
  role: Role;
  organizationId: string;
  // dbBranchId === null → видит всю сеть (владелец); иначе скоуп по филиалу.
  dbBranchId: string | null;
};

function getSession(req: express.Request): MagomedSession {
  const raw = String(req.headers["x-demo-role"] || "owner");
  const role: Role =
    raw === "branch_manager" || raw === "admin" || raw === "teacher" ? (raw as Role) : "owner";
  return {
    role,
    organizationId: ORG_ID,
    dbBranchId: role === "owner" ? null : DEMO_BRANCH_ALMATY,
  };
}

async function supabaseFetch<T>(
  table: string,
  query = "select=*",
  init: RequestInit = {}
): Promise<T> {
  if (!supabaseEnabled) throw new Error("SUPABASE_NOT_CONFIGURED");
  const separator = query ? "?" : "";
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${separator}${query}`, {
    ...init,
    headers: {
      apikey: supabaseKey!,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

// PostgREST: внутри or=(...) запятые/скобки/звёздочки — служебные символы.
// Чистим пользовательский запрос, чтобы не сломать фильтр и не словить инъекцию.
function sanitize(q: unknown): string {
  return String(q ?? "")
    .replace(/[(),*]/g, " ")
    .trim()
    .slice(0, 60);
}

function branchClause(session: MagomedSession): string {
  return session.dbBranchId ? `&branch_id=eq.${session.dbBranchId}` : "";
}

function fullName(row: any): string {
  return (
    [row.first_name, row.last_name].filter(Boolean).join(" ") ||
    row.full_name ||
    "—"
  );
}

const STUDENT_STATUS_RU: Record<string, string> = {
  lead: "Лид",
  trial: "Пробное",
  active: "Активен",
  paused: "Пауза",
  debt: "Должник",
  left: "Ушёл",
  archived: "В архиве",
};

const PRIORITY_RU: Record<string, string> = {
  low: "низкий",
  normal: "обычный",
  high: "высокий",
};

// ───────────────────────── Инструменты (исполнение) ─────────────────────────

async function toolSearchCrm(args: any, session: MagomedSession) {
  const entity = String(args?.entity || "students");
  const q = sanitize(args?.query);
  const enc = encodeURIComponent(`*${q}*`);
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);

  if (entity === "students") {
    // ВАЖНО: в таблице students НЕТ колонки full_name (она есть только в users).
    // Имя собираем из first_name/last_name/middle_name.
    const or = q
      ? `&or=(first_name.ilike.${enc},last_name.ilike.${enc},middle_name.ilike.${enc},phone.ilike.${enc},parent_name.ilike.${enc},parent_phone.ilike.${enc})`
      : "";
    const rows = await supabaseFetch<any[]>(
      "students",
      `select=id,first_name,last_name,middle_name,phone,parent_name,parent_phone,status,group_id&${org}&status=neq.archived&deletion_requested_at=is.null${branch}${or}&limit=15`
    );
    return {
      count: rows.length,
      students: rows.map((r) => ({
        id: r.id,
        name: fullName(r),
        phone: r.phone || r.parent_phone || null,
        parent: r.parent_name || null,
        status: STUDENT_STATUS_RU[r.status] || r.status,
      })),
    };
  }

  if (entity === "teachers") {
    const or = q ? `&or=(full_name.ilike.${enc},phone.ilike.${enc})` : "";
    const rows = await supabaseFetch<any[]>(
      "users",
      `select=id,full_name,phone,role,branch_id&${org}&role=eq.teacher${branch}${or}&limit=15`
    );
    return {
      count: rows.length,
      teachers: rows.map((r) => ({ id: r.id, name: r.full_name, phone: r.phone || null })),
    };
  }

  if (entity === "groups") {
    const or = q ? `&name=ilike.${enc}` : "";
    const rows = await supabaseFetch<any[]>(
      "groups",
      `select=id,name,branch_id,teacher_id&${org}${branch}${or}&limit=20`
    );
    return { count: rows.length, groups: rows.map((r) => ({ id: r.id, name: r.name })) };
  }

  if (entity === "tasks") {
    // tasks без organization_id — скоуп только по филиалу.
    const or = q ? `&or=(title.ilike.${enc},description.ilike.${enc})` : "";
    const rows = await supabaseFetch<any[]>(
      "tasks",
      `select=id,title,status,priority,due_at,branch_id${branch}${or}&order=created_at.desc&limit=20`
    );
    return {
      count: rows.length,
      tasks: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        dueAt: r.due_at,
      })),
    };
  }

  return { error: `Неизвестная сущность: ${entity}. Доступно: students, teachers, groups, tasks.` };
}

async function toolGetRecordDetails(args: any, session: MagomedSession) {
  const entity = String(args?.entity || "students");
  const id = sanitize(args?.id);
  if (!id) return { error: "Не указан id." };
  const branch = branchClause(session);

  if (entity === "students") {
    const rows = await supabaseFetch<any[]>(
      "students",
      `select=*&id=eq.${id}${branch}&limit=1`
    );
    const r = rows[0];
    if (!r) return { found: false };
    const subs = await supabaseFetch<any[]>(
      "student_subscriptions",
      `select=plan_name,lessons_left,lessons_total,status,ends_on&student_id=eq.${id}&order=ends_on.desc&limit=3`
    ).catch(() => []);
    const payments = await supabaseFetch<any[]>(
      "payments",
      `select=amount,paid_at,status&student_id=eq.${id}&order=paid_at.desc&limit=5`
    ).catch(() => []);
    return {
      found: true,
      student: {
        id: r.id,
        name: fullName(r),
        phone: r.phone || null,
        parent: r.parent_name || null,
        parentPhone: r.parent_phone || null,
        status: STUDENT_STATUS_RU[r.status] || r.status,
        birthday: r.birthday || null,
        comment: r.comment || null,
        subscriptions: subs,
        lastPayments: payments,
      },
    };
  }

  if (entity === "tasks") {
    const rows = await supabaseFetch<any[]>("tasks", `select=*&id=eq.${id}${branch}&limit=1`);
    return rows[0] ? { found: true, task: rows[0] } : { found: false };
  }

  if (entity === "groups") {
    const rows = await supabaseFetch<any[]>(
      "groups",
      `select=*&id=eq.${id}&organization_id=eq.${session.organizationId}${branch}&limit=1`
    );
    return rows[0] ? { found: true, group: rows[0] } : { found: false };
  }

  return { error: `Неизвестная сущность: ${entity}.` };
}

function periodStartIso(period: string): string {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  // month по умолчанию
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function toolGetSalesSummary(args: any, session: MagomedSession) {
  const period = ["today", "week", "month"].includes(String(args?.period))
    ? String(args?.period)
    : "month";
  const start = periodStartIso(period);
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);
  const rows = await supabaseFetch<any[]>(
    "payments",
    `select=amount,paid_at,status&${org}&status=eq.paid&paid_at=gte.${start}${branch}&limit=2000`
  );
  const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return {
    period,
    from: start.slice(0, 10),
    paymentsCount: rows.length,
    totalAmount: total,
    currency: "₸",
    scope: session.dbBranchId ? "филиал" : "вся сеть",
  };
}

// Сводка по ученикам: всего + разбивка по статусам. Отвечает на «сколько
// активных/должников/новых учеников».
async function toolGetStudentsSummary(_args: any, session: MagomedSession) {
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);
  const rows = await supabaseFetch<any[]>(
    "students",
    `select=status&${org}&status=neq.archived&deletion_requested_at=is.null${branch}&limit=5000`
  );
  const byStatus: Record<string, number> = {};
  for (const r of rows) {
    const key = STUDENT_STATUS_RU[r.status] || r.status || "—";
    byStatus[key] = (byStatus[key] || 0) + 1;
  }
  return {
    total: rows.length,
    byStatus,
    scope: session.dbBranchId ? "филиал" : "вся сеть",
  };
}

// ── Бухгалтерия: сводка ДДС/ОПиУ (для агента-бухгалтера) ──
// Читает finance_accounts/categories/transactions (как /api/mvp/accounting/overview).
// Раздел бухгалтерии — только для владельца, поэтому tool guard по роли.
function monthKeyOf(dateStr: string): string {
  return String(dateStr || "").slice(0, 7); // YYYY-MM
}

async function toolGetFinanceOverview(_args: any, session: MagomedSession) {
  if (session.role !== "owner") {
    return { error: "Бухгалтерия доступна только владельцу сети." };
  }
  const org = `organization_id=eq.${session.organizationId}`;
  const [accounts, categories, txns] = await Promise.all([
    supabaseFetch<any[]>("finance_accounts", `select=*&${org}&order=sort.asc`).catch(() => []),
    supabaseFetch<any[]>("finance_categories", `select=*&${org}`).catch(() => []),
    supabaseFetch<any[]>(
      "finance_transactions",
      `select=*&${org}&type=in.(income,expense)&order=operation_date.asc&limit=5000`
    ).catch(() => []),
  ]);
  if (txns.length === 0 && accounts.length === 0) {
    return { note: "В бухгалтерии пока нет операций и счетов." };
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name || "Без статьи";
  const actual = txns.filter((t) => (t.status || "actual") === "actual");
  const planned = txns.filter((t) => t.status === "planned");

  // Остатки по счетам
  const accountsOut = accounts.map((a) => {
    const inc = actual.filter((t) => t.account_id === a.id && t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const exp = actual.filter((t) => t.account_id === a.id && t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return { name: a.name, balance: Number(a.opening_balance || 0) + inc - exp };
  });

  // Помесячная динамика (последние 6 месяцев с операциями)
  const months = Array.from(new Set(actual.map((t) => monthKeyOf(t.operation_date)))).sort().slice(-6);
  const pnl = months.map((m) => {
    const income = actual.filter((t) => t.type === "income" && monthKeyOf(t.operation_date) === m).reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = actual.filter((t) => t.type === "expense" && monthKeyOf(t.operation_date) === m).reduce((s, t) => s + Number(t.amount || 0), 0);
    const profit = income - expense;
    return { month: m, income, expense, profit, margin: income > 0 ? Math.round((profit / income) * 100) : 0 };
  });

  // Топ статей расходов/доходов (по всей истории факта)
  const topBy = (kind: "income" | "expense") => {
    const map: Record<string, number> = {};
    for (const t of actual.filter((x) => x.type === kind)) {
      const key = catName(t.category_id);
      map[key] = (map[key] || 0) + Number(t.amount || 0);
    }
    return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  };

  const incomeTotal = actual.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenseTotal = actual.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const plannedIn = planned.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const plannedOut = planned.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);

  return {
    currency: "₸",
    scope: "вся сеть",
    totals: {
      income: incomeTotal,
      expense: expenseTotal,
      profit: incomeTotal - expenseTotal,
      margin: incomeTotal > 0 ? Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100) : 0,
      balanceTotal: accountsOut.reduce((s, a) => s + a.balance, 0),
      plannedIncome: plannedIn,
      plannedExpense: plannedOut,
    },
    accounts: accountsOut,
    monthlyPnl: pnl,
    topExpenseCategories: topBy("expense"),
    topIncomeCategories: topBy("income"),
  };
}

// ── Маркетинг: воронка и источники лидов (для агента-маркетолога) ──
// Читает students (статусы, source_id, created_at) + lead_sources (названия).
async function toolGetMarketingFunnel(_args: any, session: MagomedSession) {
  const org = `organization_id=eq.${session.organizationId}`;
  const branch = branchClause(session);
  const [students, sources] = await Promise.all([
    supabaseFetch<any[]>(
      "students",
      `select=status,source_id,created_at&${org}&deletion_requested_at=is.null${branch}&limit=5000`
    ),
    supabaseFetch<any[]>("lead_sources", `select=id,name`).catch(() => []),
  ]);

  const sourceName = (id: string | null) =>
    (id && sources.find((s) => s.id === id)?.name) || "Без источника";

  // Воронка по статусам (порядок по этапам)
  const order = ["lead", "trial", "active", "paused", "debt", "left", "archived"];
  const funnel: Record<string, number> = {};
  for (const st of order) funnel[STUDENT_STATUS_RU[st] || st] = 0;
  for (const r of students) {
    const key = STUDENT_STATUS_RU[r.status] || r.status || "—";
    funnel[key] = (funnel[key] || 0) + 1;
  }

  // Разбивка по источникам: всего пришло и сколько дошло до «Активен»
  const bySrc: Record<string, { total: number; active: number }> = {};
  for (const r of students) {
    const name = sourceName(r.source_id);
    if (!bySrc[name]) bySrc[name] = { total: 0, active: 0 };
    bySrc[name].total += 1;
    if (r.status === "active") bySrc[name].active += 1;
  }
  const bySource = Object.entries(bySrc)
    .map(([source, v]) => ({
      source,
      total: v.total,
      active: v.active,
      conversion: v.total > 0 ? Math.round((v.active / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Новые лиды за текущий месяц
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = students.filter((r) => r.created_at && new Date(r.created_at) >= monthStart).length;

  const leads = funnel[STUDENT_STATUS_RU.lead] || 0;
  const active = funnel[STUDENT_STATUS_RU.active] || 0;
  const total = students.length;

  return {
    scope: session.dbBranchId ? "филиал" : "вся сеть",
    totalStudents: total,
    newStudentsThisMonth: newThisMonth,
    funnelByStatus: funnel,
    leadToActiveConversion: total > 0 ? Math.round((active / total) * 100) : 0,
    hint: leads > 0 ? `${leads} лидов ещё не сконвертированы` : undefined,
    bySource,
  };
}

// Является ли последнее сообщение пользователя явным подтверждением.
// Короткая фраза-согласие — защита от создания задачи в том же ходе, что и
// запрос (слабые модели любят сразу проставлять confirmed=true).
const AFFIRM_RE =
  /^(да|ага|угу|ок|окей|окей|подтвержд\w*|подтверждаю|верно|всё верно|все верно|давай|давайте|конечно|yes|yep|yeah|sure|ok|okay)\b/i;
function isAffirmation(text: string): boolean {
  const t = (text || "").trim();
  return t.length > 0 && t.length <= 30 && AFFIRM_RE.test(t);
}

// Создание задачи. Двухшаговый протокол с подтверждением. Решение «создавать
// ли» принимает СЕРВЕР по последнему сообщению пользователя (lastUserText), а не
// по флагу модели — так создание не происходит в том же ходе, что и запрос.
async function toolCreateTask(args: any, session: MagomedSession, lastUserText: string) {
  const title = String(args?.title ?? "").trim().slice(0, 200);
  if (!title) return { error: "Не указан заголовок задачи." };
  const priority = ["low", "normal", "high"].includes(String(args?.priority))
    ? String(args?.priority)
    : "normal";
  const description = args?.description ? String(args.description).slice(0, 1000) : null;
  const dueAt = args?.dueAt ? String(args.dueAt).slice(0, 40) : null;

  // Необязательная привязка к ученику по имени.
  let studentId: string | null = null;
  let studentName: string | null = null;
  if (args?.studentName) {
    const found = await toolSearchCrm(
      { entity: "students", query: args.studentName },
      session
    );
    const first = (found as any)?.students?.[0];
    if (first) {
      studentId = first.id;
      studentName = first.name;
    }
  }

  const preview = {
    title,
    priority: PRIORITY_RU[priority],
    dueAt,
    student: studentName,
    scope: session.dbBranchId ? "филиал" : "вся сеть",
  };

  // Создаём ТОЛЬКО если последнее сообщение пользователя — явное согласие.
  // Флаг модели args.confirmed игнорируем как недостаточно надёжный.
  if (!isAffirmation(lastUserText)) {
    return {
      needsConfirmation: true,
      willCreate: preview,
      instruction:
        "НЕ создавай задачу сейчас. Покажи пользователю превью (что будет создано) и попроси " +
        "подтвердить дословно: «Напишите «Да» для создания». Задача будет создана только после " +
        "того, как пользователь ответит «Да».",
    };
  }

  const inserted = await supabaseFetch<any[]>("tasks", "", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      branch_id: session.dbBranchId,
      student_id: studentId,
      title,
      description,
      status: "new",
      priority,
      due_at: dueAt,
    }),
  });
  return {
    created: true,
    taskId: inserted?.[0]?.id ?? null,
    task: preview,
  };
}

async function executeTool(
  name: string,
  args: any,
  session: MagomedSession,
  lastUserText: string
) {
  try {
    if (!supabaseEnabled) {
      return { error: "База данных недоступна (Supabase не настроен). Сообщи об этом пользователю." };
    }
    if (name === "search_crm") return await toolSearchCrm(args, session);
    if (name === "get_record_details") return await toolGetRecordDetails(args, session);
    if (name === "get_sales_summary") return await toolGetSalesSummary(args, session);
    if (name === "get_students_summary") return await toolGetStudentsSummary(args, session);
    if (name === "get_finance_overview") return await toolGetFinanceOverview(args, session);
    if (name === "get_marketing_funnel") return await toolGetMarketingFunnel(args, session);
    if (name === "consult_colleague") return await consultColleague(args, session);
    if (name === "create_task") return await toolCreateTask(args, session, lastUserText);
    return { error: `Неизвестный инструмент: ${name}` };
  } catch (e: any) {
    if (e?.message === "SUPABASE_NOT_CONFIGURED") {
      return { error: "База данных недоступна (Supabase не настроен)." };
    }
    return { error: `Ошибка обращения к базе: ${e?.message || "unknown"}` };
  }
}

// ─────────────────── Инструменты в формате Anthropic ───────────────────

const tools = [
  {
    name: "search_crm",
    description:
      "Поиск записей в CRM по имени, телефону или названию. Возвращает краткий список с id. " +
      "Используй, когда пользователь ищет ученика, преподавателя, группу или задачу.",
    input_schema: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          enum: ["students", "teachers", "groups", "tasks"],
          description: "Тип записи",
        },
        query: {
          type: "string",
          description: "Поисковая строка: имя, фамилия, телефон или название. Может быть пустой для списка.",
        },
      },
      required: ["entity"],
    },
  },
  {
    name: "get_record_details",
    description:
      "Полная карточка одной записи по её id (получи id через search_crm). " +
      "Для ученика возвращает абонементы и последние оплаты.",
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["students", "tasks", "groups"] },
        id: { type: "string", description: "UUID записи" },
      },
      required: ["entity", "id"],
    },
  },
  {
    name: "get_sales_summary",
    description:
      "Сводка по оплатам (выручка) за период: сегодня, неделя или месяц. " +
      "Скоуп зависит от роли: владелец видит всю сеть, остальные — свой филиал.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "week", "month"] },
      },
      required: ["period"],
    },
  },
  {
    name: "get_students_summary",
    description:
      "Сводка по ученикам: общее количество и разбивка по статусам (Активен, Должник, " +
      "Пробное, Лид, Пауза, Ушёл). Используй для вопросов вида «сколько активных учеников», " +
      "«сколько должников», «сколько всего учеников». Скоуп зависит от роли.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_finance_overview",
    description:
      "Финансовая сводка по бухгалтерии (ДДС/ОПиУ): итоги доходов/расходов/прибыли и маржа, " +
      "остатки по счетам, помесячная динамика (P&L за последние месяцы), топ статей расходов и " +
      "доходов, плановые поступления и выплаты. Используй для вопросов про деньги, прибыль, " +
      "расходы, налоги, финансовое планирование. Доступно только владельцу.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_marketing_funnel",
    description:
      "Маркетинговая воронка и источники лидов: количество учеников по статусам (Лид → Пробное → " +
      "Активен → Пауза → Должник → Ушёл), новые ученики за текущий месяц, конверсия лид→актив, а " +
      "также разбивка по рекламным источникам с конверсией каждого в активных. Используй для " +
      "вопросов про воронку, источники трафика, конверсию, привлечение и удержание.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_task",
    description:
      "Создать задачу в CRM. ВАЖНО: сначала вызови без confirmed (или confirmed=false), " +
      "чтобы получить превью, покажи его пользователю и попроси подтверждение. " +
      "Вызывай с confirmed=true ТОЛЬКО после явного согласия пользователя.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Заголовок задачи" },
        description: { type: "string", description: "Описание (необязательно)" },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        dueAt: {
          type: "string",
          description: "Срок в ISO-формате, напр. 2026-06-25 (необязательно)",
        },
        studentName: {
          type: "string",
          description: "Имя ученика для привязки задачи (необязательно)",
        },
        confirmed: {
          type: "boolean",
          description: "true — пользователь подтвердил создание. Иначе вернётся только превью.",
        },
      },
      required: ["title"],
    },
  },
];

const SYSTEM_PROMPT = `Ты — Магомед, умный, надёжный и исполнительный ИИ-помощник CRM-системы школы кавказского танца «Эхо Гор». Ты встроен в интерфейс как чат-виджет.

ХАРАКТЕР И СТИЛЬ:
- Профессионально, вежливо, с лёгким оттенком традиционного гостеприимства и уважения в духе названия «Эхо гор». Обращайся к сотруднику уважительно.
- Максимально кратко и чётко — ты работаешь в узком виджете. Никакой воды. Ключевые данные выделяй **жирным**, используй короткие списки.
- Проактивность: предлагай логичный следующий шаг (открыть карточку, посмотреть оплаты, создать задачу).

ГЛАВНЫЕ ПРАВИЛА:
1. НИКАКИХ ГАЛЛЮЦИНАЦИЙ. Отвечай ИСКЛЮЧИТЕЛЬНО по данным, полученным из инструментов. Не выдумывай имена, цифры, даты, статусы. Если инструмент вернул пусто — скажи прямо: «В базе данных нет информации по этому запросу».
2. Чтобы ответить про данные CRM — сначала вызови подходящий инструмент. Не отвечай по памяти.
3. ЗАЩИТА ОТ ДЕСТРУКТИВНЫХ ДЕЙСТВИЙ. Создавать задачи можно через create_task, но ТОЛЬКО с подтверждением: сначала вызови create_task без confirmed, покажи пользователю превью (что именно создашь) и попроси подтвердить — «Напишите «Да» для создания». Вызывай create_task с confirmed=true лишь после явного согласия. Удаление, массовая рассылка и изменение существующих записей у тебя НЕ реализованы — вежливо объясни, что это делается в интерфейсе CRM.
4. Форматирование: суммы — с разделением разрядов и знаком ₸; телефоны и даты — в удобочитаемом виде.
5. Фокус на работе. Если вопрос не про CRM/«Эхо Гор» — вежливо верни в рабочее русло.

Отвечай на русском языке.`;

// ─────────────────────────── Вызов Anthropic ───────────────────────────

// system передаётся отдельным top-level параметром (не в messages).
// Промпт и лимит токенов настраиваются — это позволяет переиспользовать
// один tool-loop для Магомеда и для агентов AI HUB (у них свои роли/длина ответа).
async function anthropicChat(
  messages: any[],
  system: string = SYSTEM_PROMPT,
  maxTokens: number = MAX_TOKENS,
  toolset: any[] = tools
): Promise<any> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey!,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: toolset,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(text || `Anthropic ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Стриминговый вызов: тот же запрос со stream:true. Разбираем SSE Anthropic,
// прокидываем текстовые дельты в onDelta и в конце возвращаем собранный ответ
// в том же виде, что anthropicChat ({ content, stop_reason }) — чтобы tool-loop
// работал единообразно.
async function anthropicStream(
  messages: any[],
  system: string,
  maxTokens: number,
  toolset: any[],
  onDelta: (chunk: string) => void
): Promise<any> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey!,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: toolset,
      temperature: 0.3,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(text || `Anthropic ${res.status}`);
    err.status = res.status;
    throw err;
  }

  // Собираем блоки контента по index (text | tool_use с накоплением JSON-инпута).
  const blocks: any[] = [];
  const partialJson: Record<number, string> = {};
  let stopReason: string | null = null;

  const decoder = new TextDecoder();
  let buffer = "";

  const handleEvent = (jsonStr: string) => {
    let ev: any;
    try {
      ev = JSON.parse(jsonStr);
    } catch {
      return;
    }
    const type = ev?.type;
    if (type === "content_block_start") {
      const cb = ev.content_block || {};
      blocks[ev.index] = cb.type === "tool_use"
        ? { type: "tool_use", id: cb.id, name: cb.name, input: {} }
        : { type: "text", text: "" };
      if (cb.type === "tool_use") partialJson[ev.index] = "";
    } else if (type === "content_block_delta") {
      const d = ev.delta || {};
      if (d.type === "text_delta" && typeof d.text === "string") {
        if (blocks[ev.index]) blocks[ev.index].text += d.text;
        onDelta(d.text);
      } else if (d.type === "input_json_delta" && typeof d.partial_json === "string") {
        partialJson[ev.index] = (partialJson[ev.index] || "") + d.partial_json;
      }
    } else if (type === "content_block_stop") {
      const b = blocks[ev.index];
      if (b?.type === "tool_use") {
        try {
          b.input = partialJson[ev.index] ? JSON.parse(partialJson[ev.index]) : {};
        } catch {
          b.input = {};
        }
      }
    } else if (type === "message_delta") {
      if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason;
    } else if (type === "error") {
      const err: any = new Error(ev.error?.message || "stream error");
      err.status = 502;
      throw err;
    }
  };

  // res.body — async-итерируемый поток (Node 18+/undici).
  for await (const chunk of res.body as any) {
    buffer += decoder.decode(chunk, { stream: true });
    // SSE: события разделены "\n\n"; берём строки "data: {...}".
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          handleEvent(trimmed.slice(5).trim());
        }
      }
    }
  }

  return { content: blocks.filter(Boolean), stop_reason: stopReason };
}

// ───────────────────────────── AI HUB: агенты ─────────────────────────────
//
// Специализированные ИИ-агенты для владельца сети. Работают на том же
// tool-loop и тех же read-only инструментах, что и Магомед (данные CRM,
// скоуп по роли), но с профильными системными промптами. Ответы длиннее —
// это не узкий виджет, а полноэкранный рабочий раздел.

const AGENT_MAX_TOKENS = Number(process.env.ANTHROPIC_AGENT_MAX_TOKENS) || 2048;

const AGENT_SHARED_RULES = `
ОБЩИЕ ПРАВИЛА ДЛЯ ВСЕХ АГЕНТОВ:
1. НИКАКИХ ГАЛЛЮЦИНАЦИЙ О ДАННЫХ. Любые цифры, имена, суммы, статусы бери ТОЛЬКО из инструментов CRM. Если инструмент вернул пусто — так и скажи. Экспертные рекомендации (советы, шаблоны, тексты) можешь давать из своих знаний, но чётко отделяй «данные из базы» от «моя рекомендация».
2. Чтобы сослаться на реальные показатели школы — сначала вызови инструмент (get_students_summary, get_sales_summary, search_crm, get_record_details). Не выдумывай.
3. Создание задач — только через create_task с подтверждением: сперва превью без confirmed, затем confirmed=true после явного «Да». Удаление и изменение записей делаются в интерфейсе CRM.
4. Суммы — с разделением разрядов и знаком ₸. Отвечай на русском, структурно, по делу. Ключевое выделяй **жирным**.
5. Ты — эксперт в своей области. Если вопросу нужна экспертиза коллеги (маркетолог/юрист/бухгалтер/HR) — вызови consult_colleague, получи его мнение и вплети в свой ответ, честно указав «уточнил у юриста/бухгалтера…». Консультируйся только когда это реально помогает, не по каждому пустяку.`;

const AGENT_PROMPTS: Record<string, { label: string; system: string }> = {
  marketing: {
    label: "Маркетолог",
    system:
      `Ты — ИИ-маркетолог сети школ кавказского танца «Эхо Гор». Помогаешь владельцу привлекать и удерживать учеников.
СПЕЦИАЛИЗАЦИЯ: воронка продаж и конверсия пробных занятий, источники лидов (откуда приходят ученики), удержание и отток, реактивация ушедших, акции и спецпредложения, тексты для постов, рассылок и рекламы (Instagram, WhatsApp, TikTok), позиционирование бренда, сезонные наборы в группы.
КАК РАБОТАЕШЬ: опирайся на реальные данные. Для воронки, источников трафика и конверсии вызывай get_marketing_funnel (статусы, новые лиды за месяц, конверсия каждого источника в активных). Для выручки — get_sales_summary. Сначала посмотри данные, потом дай конкретные рекомендации с цифрами. Предлагай готовые тексты и связки «проблема → действие → ожидаемый результат».` +
      AGENT_SHARED_RULES,
  },
  legal: {
    label: "Юрист",
    system:
      `Ты — ИИ-юрист сети школ кавказского танца «Эхо Гор» (работает в Казахстане). Помогаешь владельцу с правовыми вопросами бизнеса.
СПЕЦИАЛИЗАЦИЯ: договоры оказания услуг с родителями/учениками, публичные оферты, согласия на обработку персональных данных и на съёмку детей, трудовые отношения с преподавателями (договоры, ГПХ, штрафы, увольнения), претензии и возвраты, правила посещения, ответственность за несовершеннолетних, интеллектуальная собственность на хореографию и контент.
КАК РАБОТАЕШЬ: давай практичные рекомендации и шаблоны формулировок. Данные о конкретных учениках/преподавателях смотри инструментами, если вопрос касается реального человека или договора.
ВАЖНО: ты ИИ-помощник, а не адвокат. По серьёзным и спорным вопросам всегда рекомендуй сверку с практикующим юристом. Не давай гарантий по исходу споров.` +
      AGENT_SHARED_RULES,
  },
  accountant: {
    label: "Бухгалтер",
    system:
      `Ты — ИИ-бухгалтер сети школ кавказского танца «Эхо Гор» (Казахстан). Помогаешь владельцу с финансами и учётом.
СПЕЦИАЛИЗАЦИЯ: ДДС и ОПиУ, выручка и её структура по филиалам/направлениям, дебиторка (должники), зарплатные схемы преподавателей и расчёт выплат, налоги и режимы налогообложения РК, платёжный календарь, точка безубыточности, юнит-экономика ученика (LTV/CAC), финансовое планирование (БДР).
КАК РАБОТАЕШЬ: всегда сначала подтяни реальные цифры инструментами. Для полной картины финансов вызывай get_finance_overview (доходы/расходы/прибыль/маржа, остатки счетов, помесячный P&L, топ статей расходов, плановые платежи). Для выручки по периодам — get_sales_summary, для должников — get_students_summary. Потом считай и объясняй по шагам. Помечай, где нужна сверка с первичкой.
ВАЖНО: ты ИИ-помощник, не налоговый консультант. По налоговой отчётности рекомендуй сверку с бухгалтером/налоговиком.` +
      AGENT_SHARED_RULES,
  },
  smm: {
    label: "SMM-менеджер",
    system:
      `Ты — ИИ-SMM-менеджер сети школ кавказского танца «Эхо Гор». Отвечаешь за соцсети и контент.
СПЕЦИАЛИЗАЦИЯ: контент-план и рубрики для Instagram, TikTok, YouTube Shorts, Telegram и WhatsApp; сценарии рилсов и сторис; тексты постов и подписи, хэштеги; вовлечённость и рост аудитории; тренды и звуки под танцевальный контент; UGC от учеников и родителей, отзывы; работа с блогерами и коллаборации; оформление профиля и актуальных; воронка «контент → заявка».
КАК РАБОТАЕШЬ: связывай контент с реальными задачами школы. Для понимания аудитории, источников и конверсии соцсетей вызывай get_marketing_funnel; по наборам в группы и выступлениям опирайся на данные CRM. Давай готовые сценарии рилсов (хук → развитие → призыв), тексты постов, идеи рубрик на неделю и конкретные форматы. Отличай свою зону (ведение соцсетей, контент) от маркетолога (стратегия привлечения, воронка, акции) — при пересечении советуйся с ним.` +
      AGENT_SHARED_RULES,
  },
  hr: {
    label: "HR / Рекрутер",
    system:
      `Ты — ИИ-HR и рекрутер сети школ кавказского танца «Эхо Гор». Помогаешь владельцу с командой преподавателей и администраторов.
СПЕЦИАЛИЗАЦИЯ: найм преподавателей (тексты вакансий, каналы поиска, воронка кандидатов), сценарии и вопросы для собеседований, чек-листы стажировки и адаптации, системы мотивации и KPI, удержание команды и профилактика выгорания, оценка загрузки педагогов, обратная связь и разбор конфликтов.
КАК РАБОТАЕШЬ: смотри реальные данные о преподавателях и группах инструментами (search_crm по teachers/groups, детали через get_record_details), оценивай загрузку и на этом строй рекомендации. Давай готовые тексты вакансий, скрипты собеседований, планы адаптации.` +
      AGENT_SHARED_RULES,
  },
};

// Источник = человекочитаемый след того, какие данные CRM подтянул агент.
// Показываем владельцу под ответом — для доверия к цифрам.
type Source = { tool: string; label: string };

const num = (v: any) => Number(v || 0).toLocaleString("ru-RU");

// Короткая подпись вызова инструмента по его имени, аргументам и результату.
function toolLabel(name: string, args: any, result: any): string {
  try {
    if (name === "get_sales_summary") {
      const p = result?.period === "today" ? "сегодня" : result?.period === "week" ? "за неделю" : "за месяц";
      return `Оплаты ${p}: ${num(result?.paymentsCount)} шт · ${num(result?.totalAmount)} ₸`;
    }
    if (name === "get_students_summary") {
      return `Ученики: всего ${num(result?.total)}`;
    }
    if (name === "get_finance_overview") {
      return `Финансы: прибыль ${num(result?.totals?.profit)} ₸ · маржа ${result?.totals?.margin ?? "—"}%`;
    }
    if (name === "get_marketing_funnel") {
      return `Воронка: ${num(result?.totalStudents)} учеников · ${num(result?.newStudentsThisMonth)} новых за месяц`;
    }
    if (name === "search_crm") {
      const ent = String(args?.entity || "записи");
      const map: Record<string, string> = { students: "ученики", teachers: "педагоги", groups: "группы", tasks: "задачи" };
      return `Поиск (${map[ent] || ent}): найдено ${num(result?.count)}`;
    }
    if (name === "get_record_details") {
      return `Карточка: ${result?.student?.name || result?.group?.name || "запись"}`;
    }
    if (name === "consult_colleague") {
      return `Консультация: ${result?.colleague || args?.agent || "коллега"}`;
    }
    if (name === "create_task") {
      return result?.created ? "Создана задача" : "Черновик задачи";
    }
  } catch {
    /* fallthrough */
  }
  return name;
}

// Короткий статус «что агент сейчас делает» — для индикатора в UI.
const STATUS_BY_TOOL: Record<string, string> = {
  search_crm: "ищу в базе",
  get_record_details: "открываю карточку",
  get_sales_summary: "смотрю оплаты",
  get_students_summary: "считаю учеников",
  get_finance_overview: "смотрю финансы",
  get_marketing_funnel: "смотрю воронку",
  consult_colleague: "советуюсь с коллегой",
  create_task: "готовлю задачу",
};

type LoopResult = { reply: string; sources: Source[] };
type LoopHooks = {
  onStatus?: (text: string) => void; // «смотрю оплаты…» перед вызовом инструментов
  onDelta?: (chunk: string) => void; // потоковый текст (для стриминга)
};

// Общий tool-loop: гоняем историю через модель, исполняем инструменты, до 6 шагов.
// Возвращает финальный ответ и список источников (какие данные подтянуты).
async function runAgentLoop(
  messages: any[],
  session: MagomedSession,
  lastUserText: string,
  system: string,
  maxTokens: number,
  toolset: any[] = tools,
  hooks: LoopHooks = {}
): Promise<LoopResult> {
  let reply = "";
  const sources: Source[] = [];
  for (let step = 0; step < 6; step++) {
    const data = hooks.onDelta
      ? await anthropicStream(messages, system, maxTokens, toolset, hooks.onDelta)
      : await anthropicChat(messages, system, maxTokens, toolset);
    const content: any[] = Array.isArray(data?.content) ? data.content : [];
    if (content.length === 0) break;

    const text = content
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("")
      .trim();

    const toolUses = content.filter((b) => b?.type === "tool_use");

    if (toolUses.length > 0) {
      // Статус для UI: что агент сейчас смотрит.
      if (hooks.onStatus) {
        const names = toolUses.map((t: any) => STATUS_BY_TOOL[t.name] || "смотрю данные");
        hooks.onStatus(Array.from(new Set(names)).join(", ") + "…");
      }
      messages.push({ role: "assistant", content });
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        const result = await executeTool(tu.name || "", tu.input || {}, session, lastUserText);
        sources.push({ tool: tu.name || "", label: toolLabel(tu.name || "", tu.input || {}, result) });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    reply = text;
    break;
  }
  return { reply, sources };
}

// История клиента → формат Anthropic (последние 16 сообщений, текстовые блоки).
function toAnthropicMessages(history: Array<{ role?: string; content?: string }>): any[] {
  const messages: any[] = [];
  for (const m of history.slice(-16)) {
    if (m && typeof m.content === "string" && m.content.trim()) {
      messages.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }
  }
  return messages;
}

// ─────────────────── AI HUB: общение агентов между собой ───────────────────
//
// Два механизма:
//  1) consult_colleague — инструмент: агент в личном чате спрашивает коллегу и
//     вплетает его ответ в свой. Коллега отвечает БЕЗ инструмента консультации
//     (READ_TOOLS) — так исключаем бесконечную рекурсию.
//  2) Совет (round-table) — /api/gemini/ai-hub-council: агенты по очереди
//     высказываются по одному вопросу, видя мнения друг друга, затем — общий итог.

// Инструменты только на чтение (для суб-вызова коллеги: без create_task и без
// consult_colleague, чтобы не было рекурсии и создания задач «из чужого рта»).
const READ_TOOLS = tools.filter((t) => t.name !== "create_task");

const CONSULT_TOOL = {
  name: "consult_colleague",
  description:
    "Спросить мнение другого ИИ-агента AI HUB, когда вопрос выходит за твою специализацию. " +
    "Например: маркетологу нужна правовая оценка акции → спроси legal; бухгалтеру нужен HR-взгляд " +
    "на зарплатную мотивацию → спроси hr. Коллега видит те же данные CRM. Верни его ответ и учти " +
    "в своём. Не злоупотребляй: консультируйся только когда это реально помогает.",
  input_schema: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        enum: ["marketing", "legal", "accountant", "hr", "smm"],
        description: "Кого спросить: marketing (маркетолог), legal (юрист), accountant (бухгалтер), hr (HR/рекрутер), smm (SMM-менеджер).",
      },
      question: {
        type: "string",
        description: "Конкретный вопрос коллеге по его профилю.",
      },
    },
    required: ["agent", "question"],
  },
};

// Полный набор инструментов агента AI HUB = базовые + консультация коллеги.
const AGENT_TOOLS = [...tools, CONSULT_TOOL];

// Суб-вызов коллеги: отдельный короткий диалог с его системным промптом.
async function consultColleague(args: any, session: MagomedSession) {
  const key = String(args?.agent || "").toLowerCase();
  const agent = AGENT_PROMPTS[key];
  if (!agent) return { error: `Неизвестный коллега: ${key}` };
  const question = String(args?.question || "").trim();
  if (!question) return { error: "Пустой вопрос коллеге." };

  const messages: any[] = [
    { role: "user", content: `Коллега из AI HUB просит твоё профессиональное мнение.\n\nВопрос: ${question}\n\nОтветь кратко и по делу, с точки зрения твоей роли. При необходимости сверься с данными CRM.` },
  ];
  const { reply: answer } = await runAgentLoop(messages, session, "", agent.system, AGENT_MAX_TOKENS, READ_TOOLS);
  return { colleague: agent.label, answer: answer || "Коллега не смог сформировать ответ." };
}

// Совет: агенты по очереди высказываются по вопросу, видя предыдущие мнения.
const COUNCIL_ORDER: Array<keyof typeof AGENT_PROMPTS | string> = [
  "accountant",
  "legal",
  "marketing",
  "smm",
  "hr",
];

type CouncilTurn = { agent: string; label: string; answer: string; sources: Source[] };

async function runCouncil(
  question: string,
  session: MagomedSession,
  onTurn?: (turn: CouncilTurn) => void
) {
  const turns: CouncilTurn[] = [];
  for (const key of COUNCIL_ORDER) {
    const agent = AGENT_PROMPTS[key];
    if (!agent) continue;
    const prior = turns.length
      ? turns.map((t) => `**${t.label}:** ${t.answer}`).join("\n\n")
      : "(вы высказываетесь первым)";
    const messages: any[] = [
      {
        role: "user",
        content:
          `Владелец сети вынес на совет AI HUB вопрос:\n«${question}»\n\n` +
          `Мнения коллег на данный момент:\n${prior}\n\n` +
          `Дай своё профессиональное мнение с точки зрения твоей роли: кратко (2–4 абзаца), ` +
          `по делу, можешь опереться на данные CRM. Если согласен/не согласен с коллегой — ` +
          `так и скажи и поясни почему.`,
      },
    ];
    const { reply: answer, sources } = await runAgentLoop(messages, session, "", agent.system, AGENT_MAX_TOKENS, READ_TOOLS);
    const turn: CouncilTurn = { agent: String(key), label: agent.label, answer: answer || "—", sources };
    turns.push(turn);
    onTurn?.(turn);
  }

  // Итог: модератор сводит мнения в решение для владельца.
  const transcript = turns.map((t) => `${t.label}:\n${t.answer}`).join("\n\n———\n\n");
  const moderatorSystem =
    `Ты — модератор совета AI HUB школы танца «Эхо Гор». Тебе дан вопрос владельца и мнения ` +
    `четырёх экспертов (бухгалтер, юрист, маркетолог, HR). Сведи их в короткое итоговое решение ` +
    `для владельца: 3–6 пунктов конкретных шагов с учётом всех сторон, отметь риски и приоритет. ` +
    `Без воды, на русском, ключевое выделяй **жирным**.`;
  let synthesis = "";
  try {
    const data = await anthropicChat(
      [{ role: "user", content: `Вопрос владельца: «${question}»\n\nМнения экспертов:\n\n${transcript}\n\nСформируй итоговое решение.` }],
      moderatorSystem,
      AGENT_MAX_TOKENS,
      []
    );
    const content: any[] = Array.isArray(data?.content) ? data.content : [];
    synthesis = content.filter((b) => b?.type === "text").map((b) => b.text).join("").trim();
  } catch {
    synthesis = "";
  }

  return { question, turns, synthesis };
}

// ───────────────────────────── HTTP-эндпоинт ─────────────────────────────

export function registerMagomedApi(app: express.Express) {
  // ── AI HUB: совет агентов (round-table) ──
  app.post("/api/gemini/ai-hub-council", async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    }
    const session = getSession(req);
    const question = String(req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ error: "Пустой вопрос" });
    }
    try {
      const result = await runCouncil(question, session);
      res.json(result);
    } catch (e: any) {
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({
          error: "rate_limited",
          reply: "Сейчас слишком много запросов к ИИ. Пожалуйста, попробуйте через минуту.",
        });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // ── AI HUB: чат с выбранным агентом ──
  app.post("/api/gemini/ai-hub-chat", async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    }
    const session = getSession(req);
    const agentKey = String(req.body?.agent || "").toLowerCase();
    const agent = AGENT_PROMPTS[agentKey];
    if (!agent) {
      return res.status(400).json({ error: `Неизвестный агент: ${agentKey}` });
    }

    const history: Array<{ role?: string; content?: string }> = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];
    const messages = toAnthropicMessages(history);
    if (messages.length === 0) {
      return res.status(400).json({ error: "Пустой запрос" });
    }
    const lastUserText =
      [...history].reverse().find(
        (m) => m && m.role !== "assistant" && typeof m.content === "string"
      )?.content || "";

    // collaborate=true → агент может советоваться с коллегами (consult_colleague).
    // По умолчанию агент работает соло (быстрее, без лишних вызовов модели).
    const collaborate = req.body?.collaborate === true;
    const toolset = collaborate ? AGENT_TOOLS : tools;

    try {
      const result = await runAgentLoop(
        messages,
        session,
        lastUserText,
        agent.system,
        AGENT_MAX_TOKENS,
        toolset
      );
      const reply = result.reply ||
        "Извините, не удалось сформировать ответ. Попробуйте переформулировать запрос.";
      res.json({ reply, agent: agentKey, sources: result.sources });
    } catch (e: any) {
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({
          error: "rate_limited",
          reply: "Сейчас слишком много запросов к ИИ. Пожалуйста, попробуйте через минуту.",
        });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // ── AI HUB: стриминг чата с агентом (SSE: status → delta → done) ──
  app.post("/api/gemini/ai-hub-stream", async (req, res) => {
    if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    const session = getSession(req);
    const agentKey = String(req.body?.agent || "").toLowerCase();
    const agent = AGENT_PROMPTS[agentKey];
    if (!agent) return res.status(400).json({ error: `Неизвестный агент: ${agentKey}` });

    const history: Array<{ role?: string; content?: string }> = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];
    const messages = toAnthropicMessages(history);
    if (messages.length === 0) return res.status(400).json({ error: "Пустой запрос" });
    const lastUserText =
      [...history].reverse().find((m) => m && m.role !== "assistant" && typeof m.content === "string")?.content || "";
    const collaborate = req.body?.collaborate === true;
    const toolset = collaborate ? AGENT_TOOLS : tools;

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: any) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const result = await runAgentLoop(
        messages, session, lastUserText, agent.system, AGENT_MAX_TOKENS, toolset,
        { onStatus: (text) => send("status", { text }), onDelta: (chunk) => send("delta", { text: chunk }) }
      );
      send("done", { reply: result.reply, sources: result.sources });
    } catch (e: any) {
      const rate = e?.status === 429 || e?.status === 529;
      send("error", { message: rate ? "rate_limited" : e?.message || "AI request failed" });
    } finally {
      res.end();
    }
  });

  // ── AI HUB: стриминг совета (SSE: start → turn* → synthesis → done) ──
  app.post("/api/gemini/ai-hub-council-stream", async (req, res) => {
    if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    const session = getSession(req);
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Пустой вопрос" });

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: any) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const order = COUNCIL_ORDER
      .map((k) => ({ agent: String(k), label: AGENT_PROMPTS[k]?.label }))
      .filter((o) => o.label);

    try {
      send("start", { question, order });
      const result = await runCouncil(question, session, (turn) => send("turn", turn));
      send("synthesis", { synthesis: result.synthesis });
      send("done", {});
    } catch (e: any) {
      const rate = e?.status === 429 || e?.status === 529;
      send("error", { message: rate ? "rate_limited" : e?.message || "AI request failed" });
    } finally {
      res.end();
    }
  });


  app.post("/api/gemini/magomed-chat", async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    }
    const session = getSession(req);
    const history: Array<{ role?: string; content?: string }> = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    // История диалога → формат Anthropic (последние 16 сообщений).
    const messages = toAnthropicMessages(history);
    if (messages.length === 0) {
      return res.status(400).json({ error: "Пустой запрос" });
    }

    // Последнее сообщение пользователя — для серверной проверки подтверждений.
    const lastUserText = [...history].reverse().find(
      (m) => m && m.role !== "assistant" && typeof m.content === "string"
    )?.content || "";

    try {
      // До 6 шагов tool-loop: поиск → детали → ответ (промпт и лимит Магомеда по умолчанию).
      const result = await runAgentLoop(messages, session, lastUserText, SYSTEM_PROMPT, MAX_TOKENS);
      const reply = result.reply ||
        "Извините, не удалось сформировать ответ. Попробуйте переформулировать запрос.";
      res.json({ reply });
    } catch (e: any) {
      // 429/529 — лимит запросов / перегрузка: отдаём понятный сигнал, чтобы
      // виджет показал дружелюбное сообщение вместо общей ошибки.
      if (e?.status === 429 || e?.status === 529) {
        return res.status(429).json({
          error: "rate_limited",
          reply: "Сейчас слишком много запросов к ИИ. Пожалуйста, попробуйте через минуту.",
        });
      }
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
}
