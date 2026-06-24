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
