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
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
}
