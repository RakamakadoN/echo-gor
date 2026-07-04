/**
 * «AI-панель дня» владельца (ТЗ, фаза 1: фундамент).
 *
 * Авто-загружает брифинг с POST /api/gemini/ai-briefing (заголовок x-demo-role
 * скоупит данные по роли). Показывает ТОП-приоритеты, аномалии и предложения,
 * сформированные AI по реальному срезу CRM. Отдельно — отчёты за день/неделю/
 * месяц по кнопке (POST /api/gemini/ai-report), открываются в модалке.
 *
 * Движок общий и переиспользуется для остальных ролей (следующие фазы).
 *
 * Цвета выбраны из палитры, которую перекрывает дневная тема (#0F0F0F, bg-white/5),
 * поэтому панель корректно светлеет вместе с остальным интерфейсом.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lightbulb,
  ListChecks,
  FileText,
  X,
} from "lucide-react";

type Priority = { title: string; reason?: string; action?: string };
type Anomaly = { title: string; detail?: string; severity?: "high" | "medium" | "low" };
type Suggestion = { title: string; detail?: string };
type Briefing = {
  generatedAt: string;
  summary: string;
  priorities: Priority[];
  anomalies: Anomaly[];
  suggestions: Suggestion[];
};

type Props = { roleHeader?: string };

// Минимальный рендер **жирного** и переносов строк (для отчёта).
function renderText(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="font-semibold text-[#C5A059]">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
    </span>
  ));
}

const SEVERITY: Record<string, { dot: string; label: string }> = {
  high: { dot: "#EF6461", label: "высокий" },
  medium: { dot: "#E0A458", label: "средний" },
  low: { dot: "#6BA368", label: "низкий" },
};

export function AiBriefingPanel({ roleHeader = "owner" }: Props) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Отчёт по периоду
  const [reportPeriod, setReportPeriod] = useState<"day" | "week" | "month" | null>(null);
  const [reportText, setReportText] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/gemini/ai-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({}),
      });
      if (r.status === 503) {
        setError("AI-панель не подключена: не задан ключ ANTHROPIC_API_KEY на сервере.");
        return;
      }
      if (r.status === 429) {
        setError("Сейчас слишком много запросов к ИИ. Попробуйте через минуту.");
        return;
      }
      if (!r.ok) throw new Error();
      setBriefing((await r.json()) as Briefing);
    } catch {
      setError("Не удалось собрать сводку. Попробуйте обновить.");
    } finally {
      setLoading(false);
    }
  }, [roleHeader]);

  useEffect(() => {
    load();
  }, [load]);

  async function openReport(period: "day" | "week" | "month") {
    setReportPeriod(period);
    setReportText("");
    setReportLoading(true);
    try {
      const r = await fetch("/api/gemini/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({ period }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setReportText(data.report || "Пустой отчёт.");
    } catch {
      setReportText("Не удалось сформировать отчёт. Попробуйте ещё раз.");
    } finally {
      setReportLoading(false);
    }
  }

  const periodLabel: Record<string, string> = { day: "День", week: "Неделя", month: "Месяц" };

  return (
    <div className="rounded-2xl border border-[#C5A059]/25 bg-[#0F0F0F] p-5">
      {/* Шапка */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C5A059] text-black">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="mr-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C5A059]">
            AI-панель дня
          </p>
          <h3 className="text-base font-black text-white">Сводка и приоритеты от AI</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => openReport(p)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-white/10"
            >
              <FileText size={12} /> {periodLabel[p]}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            aria-label="Обновить"
            className="inline-flex items-center gap-1 rounded-lg border border-[#C5A059]/40 bg-[#C5A059]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#C5A059] transition hover:bg-[#C5A059]/20 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Обновить
          </button>
        </div>
      </div>

      {/* Состояния */}
      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin text-[#C5A059]" />
          AI анализирует данные сети…
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {briefing && !loading && (
        <div className="mt-4 space-y-4">
          {briefing.summary && (
            <p className="text-sm leading-relaxed text-slate-300">{briefing.summary}</p>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Приоритеты */}
            <div className="rounded-xl border border-white/8 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ListChecks size={15} className="text-[#C5A059]" />
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  ТОП-приоритеты
                </p>
              </div>
              {briefing.priorities.length === 0 ? (
                <p className="text-xs text-slate-500">Нет данных.</p>
              ) : (
                <ol className="space-y-2.5">
                  {briefing.priorities.map((p, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#C5A059] text-[11px] font-black text-black">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-white">{p.title}</p>
                        {p.reason && <p className="text-[11px] text-slate-400">{p.reason}</p>}
                        {p.action && (
                          <p className="mt-0.5 text-[11px] text-[#C5A059]">→ {p.action}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Аномалии */}
            <div className="rounded-xl border border-white/8 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={15} className="text-[#E0A458]" />
                <p className="text-xs font-black uppercase tracking-wider text-white">Аномалии</p>
              </div>
              {briefing.anomalies.length === 0 ? (
                <p className="text-xs text-slate-500">Отклонений не найдено.</p>
              ) : (
                <ul className="space-y-2.5">
                  {briefing.anomalies.map((a, i) => {
                    const sev = SEVERITY[a.severity || "medium"] || SEVERITY.medium;
                    return (
                      <li key={i} className="flex gap-2">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: sev.dot }}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white">{a.title}</p>
                          {a.detail && <p className="text-[11px] text-slate-400">{a.detail}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Предложения */}
            <div className="rounded-xl border border-white/8 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb size={15} className="text-[#6BA368]" />
                <p className="text-xs font-black uppercase tracking-wider text-white">Предложения</p>
              </div>
              {briefing.suggestions.length === 0 ? (
                <p className="text-xs text-slate-500">Нет предложений.</p>
              ) : (
                <ul className="space-y-2.5">
                  {briefing.suggestions.map((s, i) => (
                    <li key={i}>
                      <p className="text-[13px] font-bold text-white">{s.title}</p>
                      {s.detail && <p className="text-[11px] text-slate-400">{s.detail}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка отчёта */}
      {reportPeriod && (
        <div
          className="fixed inset-0 z-[940] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReportPeriod(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F0F]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#C5A059]" />
                <p className="text-sm font-bold text-white">Отчёт за {periodLabel[reportPeriod].toLowerCase()}</p>
              </div>
              <button
                onClick={() => setReportPeriod(null)}
                aria-label="Закрыть"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-slate-200">
              {reportLoading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin text-[#C5A059]" />
                  AI формирует отчёт…
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{renderText(reportText)}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiBriefingPanel;
