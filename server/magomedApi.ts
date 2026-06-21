/**
 * «Магомед» — ИИ-ассистент CRM «Эхо Гор».
 *
 * Чат-виджет (src/components/MagomedAssistant.tsx) шлёт историю диалога на
 * POST /api/gemini/magomed-chat. Эндпоинт прогоняет её через Gemini с
 * function-calling: модель сама решает, когда вызвать инструмент над базой
 * (search_crm / get_record_details / get_sales_summary), мы исполняем вызов
 * через Supabase REST и возвращаем результат модели. Так Магомед отвечает
 * СТРОГО по данным CRM, без галлюцинаций.
 *
 * Деградация как у geminiApi.ts:
 *  - нет GEMINI_API_KEY  → 503 (виджет показывает понятное сообщение);
 *  - нет Supabase-ключа  → инструменты честно отвечают «база недоступна».
 *
 * Инструменты ТОЛЬКО на чтение/поиск/аналитику. Изменение и удаление данных
 * выполняется в интерфейсе CRM — это сознательное ограничение безопасности
 * (см. системный промпт: защита от деструктивных действий).
 */
import type express from "express";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
// gemini-2.0-flash отключён Google с 01.06.2026 — дефолт на актуальную модель.
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const genai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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

const PRIORITY_RU: Record<string, string> = {
  low: "низкий",
  normal: "обычный",
  high: "высокий",
};

// Создание задачи. Двухшаговый протокол с подтверждением:
//  1) без confirmed=true → возвращаем превью и просим подтвердить (вставки НЕТ);
//  2) confirmed=true     → реально создаём строку в tasks.
async function toolCreateTask(args: any, session: MagomedSession) {
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

  if (args?.confirmed !== true) {
    return {
      needsConfirmation: true,
      willCreate: preview,
      instruction:
        "Покажи пользователю, что будет создано, и попроси подтвердить («Напишите «Да» для создания»). " +
        "Вызови create_task с confirmed=true ТОЛЬКО после явного согласия.",
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

// Сводка по ученикам: всего + разбивка по статусам. Отвечает на «сколько
// активных/должников/новых учеников». В студии учеников немного — берём все
// и считаем в коде (без count-заголовков PostgREST).
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

async function executeTool(name: string, args: any, session: MagomedSession) {
  try {
    if (!supabaseEnabled) {
      return { error: "База данных недоступна (Supabase не настроен). Сообщи об этом пользователю." };
    }
    if (name === "search_crm") return await toolSearchCrm(args, session);
    if (name === "get_record_details") return await toolGetRecordDetails(args, session);
    if (name === "get_sales_summary") return await toolGetSalesSummary(args, session);
    if (name === "get_students_summary") return await toolGetStudentsSummary(args, session);
    if (name === "create_task") return await toolCreateTask(args, session);
    return { error: `Неизвестный инструмент: ${name}` };
  } catch (e: any) {
    if (e?.message === "SUPABASE_NOT_CONFIGURED") {
      return { error: "База данных недоступна (Supabase не настроен)." };
    }
    return { error: `Ошибка обращения к базе: ${e?.message || "unknown"}` };
  }
}

// ───────────────────────── Объявление инструментов ─────────────────────────

const functionDeclarations = [
  {
    name: "search_crm",
    description:
      "Поиск записей в CRM по имени, телефону или названию. Возвращает краткий список с id. " +
      "Используй, когда пользователь ищет ученика, преподавателя, группу или задачу.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        entity: {
          type: Type.STRING,
          description: "Тип записи",
          enum: ["students", "teachers", "groups", "tasks"],
        },
        query: {
          type: Type.STRING,
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
    parameters: {
      type: Type.OBJECT,
      properties: {
        entity: { type: Type.STRING, enum: ["students", "tasks", "groups"] },
        id: { type: Type.STRING, description: "UUID записи" },
      },
      required: ["entity", "id"],
    },
  },
  {
    name: "get_sales_summary",
    description:
      "Сводка по оплатам (выручка) за период: сегодня, неделя или месяц. " +
      "Скоуп зависит от роли: владелец видит всю сеть, остальные — свой филиал.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, enum: ["today", "week", "month"] },
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
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "create_task",
    description:
      "Создать задачу в CRM. ВАЖНО: сначала вызови без confirmed (или confirmed=false), " +
      "чтобы получить превью, покажи его пользователю и попроси подтверждение. " +
      "Вызывай с confirmed=true ТОЛЬКО после явного согласия пользователя.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Заголовок задачи" },
        description: { type: Type.STRING, description: "Описание (необязательно)" },
        priority: { type: Type.STRING, enum: ["low", "normal", "high"] },
        dueAt: {
          type: Type.STRING,
          description: "Срок в ISO-формате, напр. 2026-06-25 (необязательно)",
        },
        studentName: {
          type: Type.STRING,
          description: "Имя ученика для привязки задачи (необязательно)",
        },
        confirmed: {
          type: Type.BOOLEAN,
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
- Проактивность: предлагай логичный следующий шаг (открыть карточку, посмотреть оплаты, создать задачу в интерфейсе).

ГЛАВНЫЕ ПРАВИЛА:
1. НИКАКИХ ГАЛЛЮЦИНАЦИЙ. Отвечай ИСКЛЮЧИТЕЛЬНО по данным, полученным из инструментов. Не выдумывай имена, цифры, даты, статусы. Если инструмент вернул пусто — скажи прямо: «В базе данных нет информации по этому запросу».
2. Чтобы ответить про данные CRM — сначала вызови подходящий инструмент. Не отвечай по памяти.
3. ЗАЩИТА ОТ ДЕСТРУКТИВНЫХ ДЕЙСТВИЙ. Создавать задачи можно через create_task, но ТОЛЬКО с подтверждением: сначала вызови create_task без confirmed, покажи пользователю превью (что именно создашь) и попроси подтвердить — «Напишите «Да» для создания». Вызывай create_task с confirmed=true лишь после явного согласия. Удаление, массовая рассылка и изменение существующих записей у тебя НЕ реализованы — вежливо объясни, что это делается в интерфейсе CRM.
4. Форматирование: суммы — с разделением разрядов и знаком ₸; телефоны и даты — в удобочитаемом виде.
5. Фокус на работе. Если вопрос не про CRM/«Эхо Гор» — вежливо верни в рабочее русло.

Отвечай на русском языке.`;

// ───────────────────────────── HTTP-эндпоинт ─────────────────────────────

export function registerMagomedApi(app: express.Express) {
  app.post("/api/gemini/magomed-chat", async (req, res) => {
    if (!genai) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    }
    const session = getSession(req);
    const history: Array<{ role?: string; content?: string }> = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    // История диалога → формат Gemini. Берём последние 16 сообщений.
    const contents: any[] = history
      .slice(-16)
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content as string }],
      }));

    if (!contents.length) {
      return res.status(400).json({ error: "Пустой запрос" });
    }

    const config = {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
      tools: [{ functionDeclarations }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
    };

    try {
      let reply = "";
      // До 6 шагов tool-loop, чтобы модель успела сделать поиск → детали → ответ.
      for (let step = 0; step < 6; step++) {
        const response = await genai.models.generateContent({ model, contents, config });
        const calls = response.functionCalls;

        if (!calls || calls.length === 0) {
          reply = response.text ?? "";
          break;
        }

        // Сохраняем ход модели (с function_call) в историю запроса.
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) contents.push(modelContent);

        // Исполняем все запрошенные вызовы и возвращаем результаты модели.
        const responseParts: any[] = [];
        for (const call of calls) {
          const result = await executeTool(call.name || "", call.args || {}, session);
          responseParts.push({
            functionResponse: { name: call.name, response: result as Record<string, unknown> },
          });
        }
        contents.push({ role: "user", parts: responseParts });
      }

      if (!reply) {
        reply = "Извините, не удалось сформировать ответ. Попробуйте переформулировать запрос.";
      }
      res.json({ reply });
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });
}
