/**
 * Gemini AI endpoints for Echo Gor.
 *
 * The frontend (src/App.tsx) calls three POST endpoints and, if the response is
 * not OK, falls back to local mock content. So when GEMINI_API_KEY is missing we
 * return 503 and the UI degrades gracefully to its built-in fallback.
 *
 * Set GEMINI_API_KEY (server-only, never exposed to the browser) and optionally
 * GEMINI_MODEL (defaults to "gemini-2.0-flash").
 */
import type express from "express";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
// gemini-2.0-flash отключён Google с 01.06.2026 — дефолт на актуальную модель.
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Модель генерации изображений (фото товара). Переопределяется GEMINI_IMAGE_MODEL.
const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation";
const genai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function generateJson(prompt: string): Promise<unknown> {
  if (!genai) throw new Error("GEMINI_API_KEY is not configured");
  const response = await genai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.7 },
  });
  const text = (response as { text?: string }).text ?? "";
  return JSON.parse(text);
}

export function registerGeminiApi(app: express.Express) {
  // Отчёт для планёрки (ТЗ 14.07): недельный (итоги недели + фокус на текущую)
  // или месячный (БДР план/факт, прибыль, по филиалам, план на месяц).
  // Данные собирает фронт из того же движка, что дашборд, — ИИ только оформляет.
  app.post("/api/gemini/period-report", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { kind, metrics } = req.body || {};
    const isMonth = kind === "month";
    const audience = isMonth
      ? "месячная планёрка с управляющими филиалов: разбор БДР план/факт, чистая прибыль, удержание/отток, воронка, показатели по филиалам, и план на текущий месяц"
      : "недельная планёрка с управляющими: итоги прошедшей недели и фокус-задачи на текущую неделю";
    const prompt = `Ты — операционный директор сети школ кавказского танца «Эхо Гор» (Казахстан). Составь деловой отчёт для планёрки владельца с управляющими. Тип: ${audience}. Верни СТРОГО JSON по схеме:
{"title": string, "tldr": string, "sections": [{"title": string, "points": string[]}], "focus": string[]}
Правила: пиши по-русски, кратко и по делу, как для совещания. Опирайся ТОЛЬКО на переданные цифры, не выдумывай. tldr — 2-3 предложения главного (выполнение плана, прибыль, тренд). sections — 3-5 блоков по темам (Финансы и БДР, Продажи и воронка, Удержание и отток, Заполняемость и набор, Филиалы). В points — конкретика с числами и сравнением (мес/период назад), отмечай что просело/выросло. focus — 3-5 конкретных задач-приоритетов на ${isMonth ? "текущий месяц" : "текущую неделю"} с ответственными (управляющие филиалов), где уместно. Если по какому-то показателю данных нет — не упоминай его.
Данные периода: ${JSON.stringify(metrics ?? {})}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Owner-level analytics over the whole network.
  app.post("/api/gemini/insights", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { metrics, currentContext } = req.body || {};
    const prompt = `Ты — аналитик сети школ кавказского танца «Эхо Гор». Проанализируй показатели и верни СТРОГО JSON по схеме:
{"executiveSummary": string, "branchRisks": [{"branchId": string, "riskTitle": string, "description": string, "severity": "low"|"medium"|"high"}], "growthRecommendations": string[], "insights": string[]}
Пиши по-русски, кратко и конкретно, опираясь только на переданные данные.
metrics=${JSON.stringify(metrics ?? {})}
context=${JSON.stringify(currentContext ?? {})}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // ИИ-реактивация ушедших (панель «Можно вернуть» в ежедневном отчёте).
  // Вход: {students:[{id,name,archiveReason,archiveComment,monthsInArchive}]}
  // Выход: {"candidates":[{id,recommend,offerType,message,reasoning}]} — по Offer в ReactivationPanel.
  app.post("/api/gemini/reactivation", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { students } = req.body || {};
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "students обязателен" });
    }
    const prompt = `Ты — заботливый менеджер школы кавказского танца «Эхо Гор». Ученики ниже ушли из школы 2+ месяца назад. Для КАЖДОГО подбери персональный оффер возврата с учётом причины ухода и срока отсутствия, и составь короткое тёплое сообщение для WhatsApp (без давления, 2-4 предложения, по-русски, обращение по имени). Верни СТРОГО JSON по схеме:
{"candidates": [{"id": string, "recommend": boolean, "offerType": string, "message": string, "reasoning": string}]}
offerType — короткое название оффера (напр. «Скидка 20% на месяц», «Бесплатное занятие», «Заморозка цены»). recommend=false только если возвращать бессмысленно (переезд в другой город и т.п.).
students=${JSON.stringify(students.slice(0, 20))}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Per-student progress analysis for teachers.
  app.post("/api/gemini/student-analysis", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { student, notes } = req.body || {};
    const prompt = `Ты — опытный педагог кавказского танца школы «Эхо Гор». Проанализируй прогресс ученика и верни СТРОГО JSON по схеме:
{"praise": string, "focusArea": string, "nextMilestoneAdvice": string}
Пиши по-русски, доброжелательно и по делу.
student=${JSON.stringify(student ?? {})}
notes=${JSON.stringify(notes ?? [])}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Lesson plan / free-form pedagogical assistant for teachers.
  // Used by the "Подготовить план занятия" buttons and the AI Notebook prompts.
  app.post("/api/gemini/lesson-plan", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { prompt: userPrompt, groupName, groupLevel, studentCount, context } = req.body || {};
    const prompt = `Ты — методист и хореограф школы кавказского танца «Эхо Гор». Помоги преподавателю и верни СТРОГО JSON по схеме:
{"title": string, "summary": string, "sections": [{"heading": string, "items": string[]}]}
Пиши по-русски, конкретно и применимо на занятии. Если это план занятия — раздели на разминку, основную часть, отработку и завершение.
request=${JSON.stringify(userPrompt ?? "Составь план занятия")}
group=${JSON.stringify({ groupName, groupLevel, studentCount })}
context=${JSON.stringify(context ?? {})}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Сводка дня для педагога: краткий план на сегодня + рекомендации.
  app.post("/api/gemini/teacher-daily-briefing", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { teacherName, weekday, groupsCount, schedule, newStudents, totalLessonsYear } = req.body || {};
    const prompt = `Ты — заботливый наставник-куратор школы кавказского танца «Эхо Гор». Составь короткую тёплую сводку дня для преподавателя. Верни СТРОГО JSON по схеме:
{"summary": string, "recommendations": string[]}
Пиши по-русски, на «вы», живо и по делу. summary — 1-2 предложения обзора дня (сколько групп, график, новенькие по именам, если есть). recommendations — 2-4 коротких практичных совета на день (подготовка, внимание к новичкам, дисциплина, настрой). Не повторяй цифры дословно из данных — говори человечно.
data=${JSON.stringify({ teacherName, weekday, groupsCount, schedule, newStudents, totalLessonsYear })}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Персональное поздравление ученика с днём рождения (кабинет педагога).
  // Педагог выбирает ученика → получает тёплый текст → отправляет в WhatsApp.
  app.post("/api/gemini/birthday-greeting", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { studentName, age, groupName, teacherName, achievements, tone } = req.body || {};
    const prompt = `Ты — преподаватель школы кавказского танца «Эхо Гор». Напиши тёплое личное поздравление ученику с днём рождения от лица педагога. Верни СТРОГО JSON по схеме:
{"message": string}
Пиши по-русски, от первого лица (я, педагог), обращайся к ученику по имени на «ты» если ребёнок. 2-4 предложения, искренне, с уважением к ценностям школы (характер, дисциплина, культура). Без хэштегов и эмодзи-спама (максимум 1-2 уместных эмодзи). Упомяни танец/успехи, если уместно.
student=${JSON.stringify({ studentName, age, groupName, achievements })}
teacher=${JSON.stringify({ teacherName })}
tone=${JSON.stringify(tone ?? "тёплый, личный")}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Competition readiness consultation for a group.
  app.post("/api/gemini/competition-consult", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { competition, groupName, groupLevel, studentCount } = req.body || {};
    const prompt = `Ты — хореограф-постановщик кавказских танцев школы «Эхо Гор». Дай консультацию по подготовке группы к конкурсу и верни СТРОГО JSON по схеме:
{"readinessRating": string, "rehearsalPlan": string, "stageCraftAdvice": string}
Пиши по-русски. В rehearsalPlan используй переносы строк для недель.
competition=${JSON.stringify(competition ?? {})}
group=${JSON.stringify({ groupName, groupLevel, studentCount })}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // AI-помощник родителя (родительский кабинет).
  // Отвечает на вопросы о воспитании/мотивации и предлагает семейные квесты.
  app.post("/api/gemini/parent-advice", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { question, childName, childAge, attendanceRate } = req.body || {};
    const prompt = `Ты — добрый семейный наставник школы кавказского танца «Эхо Гор». Помогаешь родителю поддержать ребёнка без давления, опираясь на ценности: уважение к старшим, дисциплина, ответственность, характер. Верни СТРОГО JSON по схеме:
{"answer": string, "weekPlan": [{"day": string, "action": string}], "suggestedQuests": [{"title": string, "category": string, "reward": string}]}
Пиши по-русски, тепло и конкретно. weekPlan — 3-4 пункта. suggestedQuests — 2-3 квеста, которые родитель может дать ребёнку.
question=${JSON.stringify(question ?? "")}
child=${JSON.stringify({ childName, childAge, attendanceRate })}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Планёрки: расшифровка/заметки встречи → итоги, задачи, ответственные, сроки.
  // Используется кнопкой «Собрать итоги AI» в разделе «Планёрки» (владелец/управляющий).
  app.post("/api/gemini/meeting-summary", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { transcript, title, participants, meetingDate } = req.body || {};
    if (!String(transcript || "").trim()) return res.status(400).json({ error: "Нет текста встречи для анализа" });
    const today = meetingDate || new Date().toISOString().slice(0, 10);
    const prompt = `Ты — ассистент-секретарь планёрок сети школ кавказского танца «Эхо Гор». На вход — расшифровка (или заметки) совещания. Составь деловые итоги и выдели задачи. Верни СТРОГО JSON по схеме:
{"summary": string, "decisions": string[], "actionItems": [{"title": string, "assignee": string, "dueDate": string}]}
Правила: пиши по-русски, кратко и по делу. summary — 3-6 предложений сути встречи. decisions — принятые решения. actionItems — конкретные задачи; assignee — имя ответственного из участников (если не назван — пустая строка); dueDate — дата в формате YYYY-MM-DD (если срок не назван явно, оставь пустую строку, не выдумывай). Дата планёрки: ${today}.
title=${JSON.stringify(title ?? "")}
participants=${JSON.stringify(participants ?? [])}
transcript=${JSON.stringify(String(transcript).slice(0, 24000))}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Реактивация ушедших: по причине ухода и сроку в архиве ИИ предлагает,
  // кого стоит вернуть, каким оффером и с каким текстом сообщения.
  // Используется панелью «Можно вернуть» на дашборде владельца.
  app.post("/api/gemini/reactivation", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { students } = req.body || {};
    const list = Array.isArray(students) ? students.slice(0, 40) : [];
    if (!list.length) return res.status(400).json({ error: "Нет кандидатов для анализа" });
    const prompt = `Ты — маркетолог сети школ кавказского танца «Эхо Гор». Тебе дан список УШЕДШИХ учеников: причина ухода, свободный комментарий и сколько месяцев прошло с ухода. Для КАЖДОГО предложи, стоит ли его возвращать сейчас и каким оффером, с готовым коротким текстом сообщения родителю. Верни СТРОГО JSON по схеме:
{"candidates": [{"id": string, "recommend": boolean, "offerType": string, "message": string, "reasoning": string}]}
Правила: пиши по-русски, тепло и по-человечески, без навязчивости. offerType — короткое название оффера (например: «Бесплатное пробное возвращение», «Скидка 30% на первый месяц», «Индивидуальный график»). message — готовый текст для родителя (2-4 предложения), учитывай причину ухода. reasoning — 1 предложение, почему такой оффер. recommend=false, если возвращать сейчас не стоит (например, ушли из-за переезда). id — верни ровно как во входных данных.
students=${JSON.stringify(list)}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Рекламный оффер для набора в конкретную группу (вкладка «Маркетинг»):
  // ИИ формирует заголовок, текст объявления и CTA, учитывая группу, филиал,
  // адрес, расписание, возраст аудитории и число свободных мест.
  app.post("/api/gemini/ad-offer", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { groupName, branchName, address, schedule, ageGroup, freeSpots, teacherName, price, extraWishes } = req.body || {};
    if (!String(groupName || "").trim()) return res.status(400).json({ error: "Укажите группу" });
    const prompt = `Ты — маркетолог сети школ кавказского танца «Эхо Гор» (Казахстан). Составь рекламное объявление для набора учеников в конкретную группу. Верни СТРОГО JSON по схеме:
{"headline": string, "offer": string, "cta": string, "audience": string, "hashtags": string[]}
Правила: пиши по-русски, живо и конкретно, без штампов и КАПСА. headline — цепляющий заголовок до 60 знаков. offer — текст объявления 3-5 предложений: что за группа, кому подойдёт (возраст), где занятия (филиал/адрес), когда (расписание), чем ценно (характер, осанка, культура, сцена), и что мест мало, если freeSpots небольшое. cta — короткий призыв (записаться на бесплатный пробный урок). audience — 1-2 предложения, на кого таргетировать рекламу (возраст детей/взрослых, гео вокруг адреса, интересы родителей). hashtags — 4-6 хэштегов. Не выдумывай фактов, которых нет во входных данных.
Данные:
group=${JSON.stringify(groupName)}
branch=${JSON.stringify(branchName ?? "")}
address=${JSON.stringify(address ?? "")}
schedule=${JSON.stringify(schedule ?? "")}
ageGroup=${JSON.stringify(ageGroup ?? "")}
teacher=${JSON.stringify(teacherName ?? "")}
freeSpots=${JSON.stringify(freeSpots ?? null)}
price=${JSON.stringify(price ?? null)}
wishes=${JSON.stringify(extraWishes ?? "")}`;
    try {
      res.json(await generateJson(prompt));
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "AI request failed" });
    }
  });

  // Генерация красивого фото товара нейросетью (для каталога и магазина родителя).
  // Возвращает data-URL (base64 PNG), который фронт кладёт в photoUrl товара.
  app.post("/api/gemini/product-image", async (req, res) => {
    if (!genai) return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    const { name, category, description } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ error: "Укажите название товара" });
    const prompt = `Профессиональное рекламное фото товара для интернет-магазина школы кавказского танца «Эхо Гор»: ${name}${category ? `, категория: ${category}` : ""}${description ? `. ${description}` : ""}. Студийный свет, чистый светлый фон, товар по центру, высокая детализация, эстетично, без текста, водяных знаков и логотипов.`;
    try {
      const response: any = await genai.models.generateContent({
        model: imageModel,
        contents: prompt,
        config: { responseModalities: ["IMAGE", "TEXT"] } as any,
      });
      const parts = response?.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p: any) => p?.inlineData?.data);
      if (!img?.inlineData?.data) return res.status(502).json({ error: "Модель не вернула изображение" });
      const mime = img.inlineData.mimeType || "image/png";
      res.json({ dataUrl: `data:${mime};base64,${img.inlineData.data}` });
    } catch (e: any) {
      res.status(502).json({ error: e?.message || "Не удалось сгенерировать изображение" });
    }
  });
}
