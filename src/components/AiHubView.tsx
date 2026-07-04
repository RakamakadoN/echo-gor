/**
 * «AI HUB» — раздел кабинета Владельца с командой профильных ИИ-агентов.
 *
 * Слева — список агентов (Маркетолог, SMM, Юрист, Бухгалтер, HR/Рекрутер),
 * справа — полноэкранная панель чата с выбранным агентом. Отдельно — режим
 * «Совет» (round-table), где все агенты обсуждают один вопрос.
 *
 * Чат стримится по SSE: POST /api/gemini/ai-hub-stream (события status/delta/
 * done), совет — POST /api/gemini/ai-hub-council-stream (start/turn/synthesis).
 * Заголовок x-demo-role скоупит данные CRM по роли (см. server/magomedApi.ts).
 * Под ответом — источники (какие данные подтянул агент) и действия: копировать,
 * создать задачу (/api/mvp/tasks), сохранить черновик в Документолог
 * (/api/mvp/documents).
 *
 * Деградация: 503 (нет ANTHROPIC_API_KEY) и 429 (лимит) показывают понятные
 * сообщения вместо падения — как остальные AI-кнопки приложения.
 */
import { useEffect, useRef, useState } from "react";
import AiBriefingPanel from "./AiBriefingPanel";
import {
  Send,
  Loader2,
  Sparkles,
  Megaphone,
  Scale,
  Calculator,
  Users,
  ArrowLeft,
  MessagesSquare,
  Gavel,
  Share2,
  Copy,
  FilePlus,
  ListPlus,
  Database,
  Check,
} from "lucide-react";

type Source = { tool: string; label: string };
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
};

type AgentKey = "marketing" | "legal" | "accountant" | "hr" | "smm";

type CouncilTurn = { agent: string; label: string; answer: string; sources?: Source[] };
type CouncilOrderItem = { agent: string; label: string };
type CouncilResult = { question: string; turns: CouncilTurn[]; synthesis: string };

type Mode = "agents" | "council";

// Разбор потока SSE (fetch + ReadableStream). Вызывает onEvent(event, data)
// на каждое событие «event: X / data: {…}».
async function streamSSE(
  response: Response,
  onEvent: (event: string, data: any) => void
) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = "message";
      let dataStr = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (dataStr) {
        try {
          onEvent(event, JSON.parse(dataStr));
        } catch {
          /* пропускаем неполные/служебные строки */
        }
      }
    }
  }
}

type Agent = {
  key: AgentKey;
  name: string;
  title: string;
  icon: React.ElementType;
  greeting: string;
  suggestions: string[];
  accent: string; // цвет-акцент карточки
};

const AGENTS: Agent[] = [
  {
    key: "marketing",
    name: "Марьям",
    title: "Маркетолог",
    icon: Megaphone,
    accent: "#E0669B",
    greeting:
      "Здравствуйте. Я — **Марьям**, ваш ИИ-маркетолог. Разберу воронку и источники, найду точки роста и напишу тексты для постов и рассылок. С чего начнём?",
    suggestions: [
      "Разбери воронку пробных занятий",
      "Откуда приходят ученики?",
      "Идеи для реактивации ушедших",
      "Текст поста про набор в группу",
    ],
  },
  {
    key: "smm",
    name: "Камила",
    title: "SMM-менеджер",
    icon: Share2,
    accent: "#8B7CF6",
    greeting:
      "Привет! Я — **Камила**, ваш ИИ-SMM-менеджер. Соберу контент-план, напишу сценарии рилсов и тексты постов, подскажу тренды и рубрики для соцсетей. С чего начнём?",
    suggestions: [
      "Контент-план на неделю",
      "Сценарий рилса про набор в группу",
      "Идеи рубрик для Instagram",
      "Как поднять вовлечённость?",
    ],
  },
  {
    key: "legal",
    name: "Тимур",
    title: "Юрист",
    icon: Scale,
    accent: "#5B8DEF",
    greeting:
      "Приветствую. Я — **Тимур**, ИИ-юрист школы. Помогу с договорами, офертами, согласиями на данные детей и трудовыми вопросами. Чем могу помочь?",
    suggestions: [
      "Шаблон договора с родителем",
      "Согласие на съёмку детей",
      "Как оформить штраф преподавателю?",
      "Правила возврата за абонемент",
    ],
  },
  {
    key: "accountant",
    name: "Аслан",
    title: "Бухгалтер",
    icon: Calculator,
    accent: "#3FB98B",
    greeting:
      "Добрый день. Я — **Аслан**, ИИ-бухгалтер. Посчитаю выручку и должников, разберу зарплатные схемы и налоги, помогу с планированием. Что считаем?",
    suggestions: [
      "Выручка за месяц по сети",
      "Сколько сейчас должников?",
      "Точка безубыточности филиала",
      "Какой налоговый режим выбрать?",
    ],
  },
  {
    key: "hr",
    name: "Лейла",
    title: "HR / Рекрутер",
    icon: Users,
    accent: "#C5A059",
    greeting:
      "Здравствуйте. Я — **Лейла**, ИИ-HR и рекрутер. Помогу с наймом преподавателей, собеседованиями, адаптацией и мотивацией команды. С чего начнём?",
    suggestions: [
      "Текст вакансии преподавателя",
      "Вопросы для собеседования",
      "Чек-лист стажировки новичка",
      "Оцени загрузку преподавателей",
    ],
  },
];

// Минимальный рендер: **жирный** и переносы строк. Без внешних зависимостей.
function renderText(text: string, accent: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} style={{ color: accent }} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
    </span>
  ));
}

type Props = {
  /** Значение для заголовка x-demo-role. В кабинете владельца — "owner". */
  roleHeader?: string;
};

const AGENT_BY_KEY: Record<string, Agent> = Object.fromEntries(
  AGENTS.map((a) => [a.key, a])
);

const COUNCIL_EXAMPLES = [
  "Запускать ли летний лагерь со скидкой 30%?",
  "Как удержать преподавателей от ухода к конкурентам?",
  "Стоит ли открывать третий филиал в этом году?",
  "Поднять ли цены на абонементы на 15%?",
];

export function AiHubView({ roleHeader = "owner" }: Props) {
  const [mode, setMode] = useState<Mode>("agents");
  const [activeKey, setActiveKey] = useState<AgentKey | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  // Консультации между агентами — включаются тумблером, по умолчанию выключены.
  const [collaborate, setCollaborate] = useState(false);
  // Короткое всплывающее уведомление (создана задача / сохранено).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Режим «Совет»
  const [councilQ, setCouncilQ] = useState("");
  const [councilLoading, setCouncilLoading] = useState(false);
  const [councilResult, setCouncilResult] = useState<CouncilResult | null>(null);
  const [councilOrder, setCouncilOrder] = useState<CouncilOrderItem[]>([]);
  const [councilError, setCouncilError] = useState<string | null>(null);

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // Обновление последнего (стримингового) ответа агента в его ветке.
  function updateLastAssistant(key: AgentKey, patch: Partial<ChatMessage>) {
    setThreads((prev) => {
      const arr = [...prev[key]];
      const i = arr.length - 1;
      if (i >= 0 && arr[i].role === "assistant") arr[i] = { ...arr[i], ...patch };
      return { ...prev, [key]: arr };
    });
  }

  // Действия под ответом агента: копирование, задача, черновик в Документолог.
  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Скопировано в буфер обмена");
    } catch {
      showToast("Не удалось скопировать");
    }
  }

  async function createTask(agent: Agent, text: string) {
    const title = `${agent.title}: рекомендация`;
    try {
      const r = await fetch("/api/mvp/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({ title, description: text, priority: "normal" }),
      });
      if (!r.ok) throw new Error();
      showToast("Задача создана в разделе «Задачи»");
    } catch {
      showToast("Не удалось создать задачу");
    }
  }

  async function saveToDocuments(agent: Agent, text: string) {
    const category = agent.key === "legal" ? "Юридический" : "Маркетинг";
    try {
      const r = await fetch("/api/mvp/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({
          category,
          subject: `Черновик от «${agent.title}»`,
          comment: text,
          status: "draft",
        }),
      });
      if (!r.ok) throw new Error();
      showToast("Черновик сохранён в «Документолог»");
    } catch {
      showToast("Не удалось сохранить черновик");
    }
  }
  // История диалога отдельно для каждого агента — переключение не теряет контекст.
  const [threads, setThreads] = useState<Record<AgentKey, ChatMessage[]>>({
    marketing: [],
    smm: [],
    legal: [],
    accountant: [],
    hr: [],
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = AGENTS.find((a) => a.key === activeKey) || null;
  const messages = activeKey ? threads[activeKey] : [];

  // Прогресс совета: кто уже высказался и кто в очереди.
  const councilDone = new Set((councilResult?.turns || []).map((t) => t.agent));
  const councilPending = councilOrder.filter((o) => !councilDone.has(o.agent));
  const councilAllSpoke = councilOrder.length > 0 && councilPending.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, activeKey]);

  useEffect(() => {
    if (activeKey) inputRef.current?.focus();
  }, [activeKey]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !active) return;
    const key = active.key;

    const next: ChatMessage[] = [...threads[key], { role: "user", content: trimmed }];
    // Плюс пустой ответ агента, в который стримим текст.
    setThreads((prev) => ({
      ...prev,
      [key]: [...next, { role: "assistant", content: "", streaming: true }],
    }));
    setInput("");
    setLoading(true);
    setStreamStatus(null);

    let acc = "";
    try {
      const response = await fetch("/api/gemini/ai-hub-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({ agent: key, role: roleHeader, messages: next, collaborate }),
      });

      // Ошибки до старта потока приходят обычным JSON со статусом.
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        const msg =
          response.status === 503
            ? "ИИ-агенты пока не подключены: не задан ключ **ANTHROPIC_API_KEY** на сервере."
            : data?.reply || "Не удалось связаться с агентом. Попробуйте ещё раз.";
        updateLastAssistant(key, { content: msg, streaming: false });
        return;
      }

      await streamSSE(response, (event, data) => {
        if (event === "status") {
          setStreamStatus(data.text || null);
        } else if (event === "delta") {
          acc += data.text || "";
          setStreamStatus(null);
          updateLastAssistant(key, { content: acc });
        } else if (event === "done") {
          updateLastAssistant(key, {
            content: data.reply || acc || "Пустой ответ.",
            sources: data.sources || [],
            streaming: false,
          });
        } else if (event === "error") {
          updateLastAssistant(key, {
            content:
              data.message === "rate_limited"
                ? "Сейчас слишком много запросов к ИИ. Попробуйте через минуту."
                : "Не удалось получить ответ агента. Попробуйте ещё раз.",
            streaming: false,
          });
        }
      });
    } catch {
      updateLastAssistant(key, {
        content: acc || "Не удалось связаться с агентом. Проверьте соединение и попробуйте ещё раз.",
        streaming: false,
      });
    } finally {
      setLoading(false);
      setStreamStatus(null);
    }
  }

  async function askCouncil(text: string) {
    const trimmed = text.trim();
    if (!trimmed || councilLoading) return;
    setCouncilLoading(true);
    setCouncilError(null);
    setCouncilResult({ question: trimmed, turns: [], synthesis: "" });
    setCouncilOrder([]);
    try {
      const response = await fetch("/api/gemini/ai-hub-council-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!response.ok || !response.body) {
        setCouncilError(
          response.status === 503
            ? "ИИ-агенты пока не подключены: не задан ключ ANTHROPIC_API_KEY на сервере."
            : "Не удалось собрать совет. Попробуйте ещё раз."
        );
        setCouncilResult(null);
        return;
      }

      await streamSSE(response, (event, data) => {
        if (event === "start") {
          setCouncilOrder(data.order || []);
        } else if (event === "turn") {
          setCouncilResult((prev) =>
            prev ? { ...prev, turns: [...prev.turns, data as CouncilTurn] } : prev
          );
        } else if (event === "synthesis") {
          setCouncilResult((prev) => (prev ? { ...prev, synthesis: data.synthesis || "" } : prev));
        } else if (event === "error") {
          setCouncilError(
            data.message === "rate_limited"
              ? "Сейчас слишком много запросов к ИИ. Попробуйте через минуту."
              : "Не удалось собрать совет. Попробуйте ещё раз."
          );
        }
      });
    } catch {
      setCouncilError("Не удалось собрать совет. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      setCouncilLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Заголовок раздела */}
      <div className="rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#2A2110] to-[#111] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C5A059] text-black">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">
              AI HUB
            </p>
            <h2 className="text-xl font-black text-white">Команда ИИ-агентов</h2>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Профильные помощники видят реальные данные вашей сети «Эхо Гор» и отвечают по фактам:
          маркетинг, право, финансы и команда. Общайтесь с агентом один на один или вынесите вопрос
          на общий совет — где они обсуждают его вместе.
        </p>

        {/* Вход в режим «Совет» — отдельной кнопкой. По умолчанию открыт режим агентов. */}
        <div className="mt-4">
          {mode === "agents" ? (
            <button
              onClick={() => setMode("council")}
              className="inline-flex items-center gap-2 rounded-xl border border-[#C5A059]/40 bg-[#C5A059]/10 px-4 py-2.5 text-sm font-bold text-[#E8C887] transition hover:bg-[#C5A059]/20"
            >
              <Gavel size={16} /> Собрать совет агентов
            </button>
          ) : (
            <button
              onClick={() => setMode("agents")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              <MessagesSquare size={16} /> Вернуться к агентам
            </button>
          )}
        </div>
      </div>

      {mode === "council" && (
        <div className="space-y-5">
          {/* Ввод вопроса на совет */}
          <div className="rounded-2xl border border-white/8 bg-[#0C0E14] p-5">
            <p className="text-sm font-bold text-white">Вынести вопрос на совет</p>
            <p className="mt-1 text-xs text-slate-400">
              Бухгалтер, юрист, маркетолог и HR по очереди выскажутся, видя мнения друг друга, а в
              конце вы получите общее решение.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                askCouncil(councilQ);
              }}
              className="mt-3 flex flex-col gap-2 sm:flex-row"
            >
              <input
                value={councilQ}
                onChange={(e) => setCouncilQ(e.target.value)}
                placeholder="Например: стоит ли открывать третий филиал?"
                disabled={councilLoading}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-[#C5A059]/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={councilLoading || !councilQ.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#C5A059] to-[#9C784D] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {councilLoading ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
                Собрать совет
              </button>
            </form>

            {!councilResult && !councilLoading && (
              <div className="mt-3 flex flex-wrap gap-2">
                {COUNCIL_EXAMPLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setCouncilQ(s);
                      askCouncil(s);
                    }}
                    className="rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-1.5 text-[12px] text-[#E8C887] transition hover:bg-[#C5A059]/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {councilError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {councilError}
            </div>
          )}

          {councilResult && (
            <div className="space-y-4">
              {/* Вопрос */}
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Вопрос на совет
                </p>
                <p className="mt-1 text-sm font-bold text-white">{councilResult.question}</p>
              </div>

              {/* Реплики агентов (появляются по мере готовности) */}
              {councilResult.turns.map((turn, i) => {
                const meta = AGENT_BY_KEY[turn.agent];
                const accent = meta?.accent || "#C5A059";
                const Icon = meta?.icon || Sparkles;
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/8 bg-[#0C0E14] p-4"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    <div className="mb-2 flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-black"
                        style={{ backgroundColor: accent }}
                      >
                        <Icon size={17} />
                      </div>
                      <div className="leading-tight">
                        <p className="text-sm font-bold text-white">{meta?.name || turn.label}</p>
                        <p className="text-[11px]" style={{ color: accent }}>
                          {turn.label}
                        </p>
                      </div>
                    </div>
                    <div className="text-[13px] leading-relaxed text-slate-200">
                      {renderText(turn.answer, accent)}
                    </div>
                    {turn.sources && turn.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {turn.sources.map((s, si) => (
                          <span
                            key={si}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400"
                          >
                            <Database size={10} style={{ color: accent }} /> {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Очередь: кто ещё не высказался */}
              {councilLoading &&
                councilPending.map((p, idx) => {
                  const meta = AGENT_BY_KEY[p.agent];
                  const accent = meta?.accent || "#C5A059";
                  const Icon = meta?.icon || Sparkles;
                  const isCurrent = idx === 0;
                  return (
                    <div
                      key={p.agent}
                      className={`flex items-center gap-2.5 rounded-2xl border border-white/8 bg-[#0C0E14] p-4 ${
                        isCurrent ? "opacity-100" : "opacity-50"
                      }`}
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-black"
                        style={{ backgroundColor: accent }}
                      >
                        <Icon size={17} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="font-bold text-white">{meta?.name || p.label}</span>
                        <span className="text-slate-500">·</span>
                        {isCurrent ? (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Loader2 size={13} className="animate-spin" /> высказывается…
                          </span>
                        ) : (
                          <span className="text-slate-500">ожидает очереди</span>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Итоговое решение / формирование итога */}
              {councilResult.synthesis ? (
                <div className="rounded-2xl border border-[#C5A059]/40 bg-gradient-to-br from-[#2A2110] to-[#111] p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Gavel size={18} className="text-[#C5A059]" />
                    <p className="text-sm font-black uppercase tracking-wider text-[#C5A059]">
                      Решение совета
                    </p>
                  </div>
                  <div className="text-[13px] leading-relaxed text-slate-100">
                    {renderText(councilResult.synthesis, "#C5A059")}
                  </div>
                </div>
              ) : (
                councilLoading &&
                councilAllSpoke && (
                  <div className="flex items-center gap-3 rounded-2xl border border-[#C5A059]/40 bg-[#C5A059]/5 p-4 text-sm text-[#E8C887]">
                    <Loader2 size={16} className="animate-spin" />
                    Модератор сводит мнения в итоговое решение…
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {mode === "agents" && <AiBriefingPanel roleHeader={roleHeader} />}

      {mode === "agents" && (
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Список агентов */}
        <div className="space-y-3">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            const isActive = agent.key === activeKey;
            const count = threads[agent.key].length;
            return (
              <button
                key={agent.key}
                onClick={() => setActiveKey(agent.key)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? "border-[#C5A059]/60 bg-[#C5A059]/10"
                    : "border-white/8 bg-[#0F0F0F] hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-black"
                  style={{ backgroundColor: agent.accent }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{agent.title}</p>
                  <p className="truncate text-xs text-slate-400">
                    {agent.name}
                    {count > 0 ? ` · ${Math.ceil(count / 2)} запр.` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Панель чата */}
        <div className="flex h-[calc(100vh-260px)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0C0E14]">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="text-base font-bold text-white">Выберите агента слева</p>
              <p className="max-w-sm text-sm text-slate-400">
                Начните диалог с маркетологом, SMM-менеджером, юристом, бухгалтером или HR — каждый
                работает по реальным данным вашей сети.
              </p>
            </div>
          ) : (
            <>
              {/* Шапка выбранного агента */}
              <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#141414] to-[#0C0E14] px-4 py-3">
                <button
                  onClick={() => setActiveKey(null)}
                  aria-label="К списку агентов"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
                >
                  <ArrowLeft size={18} />
                </button>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-black"
                  style={{ backgroundColor: active.accent }}
                >
                  <active.icon size={18} />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-white">
                    {active.name} · {active.title}
                  </div>
                  <div className="text-[11px]" style={{ color: active.accent }}>
                    ИИ-агент · данные CRM
                  </div>
                </div>

                {/* Тумблер «Совместная работа»: агент может советоваться с коллегами */}
                <button
                  onClick={() => setCollaborate((v) => !v)}
                  title="Разрешить агенту советоваться с коллегами по AI HUB (ответы чуть дольше)"
                  className={`ml-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                    collaborate
                      ? "border-[#C5A059]/50 bg-[#C5A059]/15 text-[#E8C887]"
                      : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users size={13} />
                  <span className="hidden sm:inline">Совместная работа</span>
                  <span
                    className={`flex h-4 w-7 items-center rounded-full p-0.5 transition ${
                      collaborate ? "bg-[#C5A059]" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full bg-white transition-transform ${
                        collaborate ? "translate-x-3" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
              </div>

              {/* Подсказка при включённой совместной работе */}
              {collaborate && (
                <div className="border-b border-white/5 bg-[#C5A059]/5 px-4 py-2 text-[11px] text-[#E8C887]">
                  {active.name} может советоваться с юристом, бухгалтером, маркетологом и HR — ответ
                  может занять чуть больше времени.
                </div>
              )}

              {/* Лента сообщений */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {/* Приветствие */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/5 bg-white/5 px-3.5 py-2 text-[13px] leading-relaxed text-slate-200">
                    {renderText(active.greeting, active.accent)}
                  </div>
                </div>

                {messages.map((m, i) => {
                  if (m.role === "user") {
                    return (
                      <div key={i} className="flex justify-end">
                        <div
                          className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px] leading-relaxed text-black"
                          style={{ backgroundColor: active.accent }}
                        >
                          {renderText(m.content, active.accent)}
                        </div>
                      </div>
                    );
                  }
                  const empty = !m.content;
                  const canSaveDoc =
                    active.key === "legal" || active.key === "smm" || active.key === "marketing";
                  return (
                    <div key={i} className="flex justify-start">
                      <div className="max-w-[85%] space-y-2">
                        <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-white/5 bg-white/5 px-3.5 py-2 text-[13px] leading-relaxed text-slate-200">
                          {empty && m.streaming ? (
                            <span className="flex items-center gap-2 text-slate-400">
                              <Loader2 size={14} className="animate-spin" />
                              {streamStatus ? `${active.name}: ${streamStatus}` : `${active.name} думает…`}
                            </span>
                          ) : (
                            <>
                              {renderText(m.content, active.accent)}
                              {m.streaming && (
                                <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-[#C5A059] align-middle" />
                              )}
                            </>
                          )}
                        </div>

                        {/* Источники: какие данные CRM подтянул агент */}
                        {!m.streaming && m.sources && m.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.sources.map((s, si) => (
                              <span
                                key={si}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400"
                              >
                                <Database size={10} className="text-[#C5A059]" /> {s.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Действия под ответом */}
                        {!m.streaming && m.content && (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => copyText(m.content)}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
                            >
                              <Copy size={12} /> Скопировать
                            </button>
                            <button
                              onClick={() => createTask(active, m.content)}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
                            >
                              <ListPlus size={12} /> Создать задачу
                            </button>
                            {canSaveDoc && (
                              <button
                                onClick={() => saveToDocuments(active, m.content)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
                              >
                                <FilePlus size={12} />{" "}
                                {active.key === "legal" ? "В Документолог" : "Сохранить черновик"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Быстрые подсказки — только пока диалог пуст */}
                {messages.length === 0 && !loading && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {active.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border px-3 py-1.5 text-[12px] transition hover:brightness-110"
                        style={{
                          borderColor: `${active.accent}55`,
                          backgroundColor: `${active.accent}18`,
                          color: active.accent,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Поле ввода */}
              <div className="border-t border-white/10 bg-[#0C0E14] p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Спросите ${active.name}…`}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-[#C5A059]/50 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label="Отправить"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ backgroundColor: active.accent }}
                  >
                    <Send size={17} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Всплывающее уведомление о действии */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[950] -translate-x-1/2 rounded-xl border border-[#C5A059]/40 bg-[#1A140A] px-4 py-2.5 text-sm font-semibold text-[#C5A059] shadow-lg">
          <span className="flex items-center gap-2">
            <Check size={15} /> {toast}
          </span>
        </div>
      )}
    </div>
  );
}

export default AiHubView;
