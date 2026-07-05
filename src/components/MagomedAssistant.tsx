/**
 * «Магомед» — плавающий ИИ-чат-виджет CRM «Эхо Гор».
 *
 * Постоянная кнопка в правом нижнем углу; по клику разворачивается панель чата.
 * Историю диалога шлёт на POST /api/gemini/magomed-chat вместе с заголовком
 * x-demo-role (роль активного кабинета) — бэкенд скоупит данные по роли.
 *
 * Голосовой ввод: кнопка микрофона использует браузерный Web Speech API
 * (ru-RU), как в модуле «Планёрки». Наговор пишется прямо в поле ввода,
 * пользователь проверяет текст и отправляет вручную. Если браузер не
 * поддерживает распознавание (не Chrome) — показываем понятную подсказку.
 *
 * Деградация: при 503 (нет ANTHROPIC_API_KEY) показывает понятное сообщение,
 * а не падает — как остальные AI-кнопки приложения.
 */
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Sparkles, Loader2, Mic } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  /** Значение для заголовка x-demo-role (owner | branch_manager | admin | teacher). */
  roleHeader: string;
  /** Человекочитаемое имя текущей роли — для приветствия. */
  roleLabel?: string;
};

const GREETING =
  "Мир вашему дому. Я — **Магомед**, помощник по базе «Эхо Гор». " +
  "Найду ученика, покажу карточку или сводку по оплатам. Чем могу помочь?";

const SUGGESTIONS = [
  "Сводка по оплатам за сегодня",
  "Найди ученика",
  "Сколько активных учеников?",
];

// Минимальный рендер: **жирный** и переносы строк. Без внешних зависимостей.
function renderText(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="text-[#E8C887] font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={j}>{part}</span>
        )
      )}
    </span>
  ));
}

// Стабильный id устройства для памяти чатов (7 дней). Живёт в localStorage,
// уходит на сервер в заголовке x-magomed-thread — вместе с ролью образует ключ
// ветки истории. Если localStorage недоступен — "anon" (память не сохранится).
function getClientId(): string {
  try {
    let id = localStorage.getItem("magomed_client_id");
    if (!id) {
      id =
        (crypto as any)?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("magomed_client_id", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function MagomedAssistant({ roleHeader, roleLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<any>(null);
  // Текст в поле до старта записи — к нему дописываем распознанное.
  const baseRef = useRef<string>("");
  // id устройства для памяти + флаг, что историю уже подгрузили.
  const clientIdRef = useRef<string>("");
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Память 7 дней: при первом открытии подтягиваем историю чата с сервера
  // (ключ = устройство + роль). Восстановленная лента добавляется после приветствия.
  useEffect(() => {
    if (!open || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    if (!clientIdRef.current) clientIdRef.current = getClientId();
    (async () => {
      try {
        const res = await fetch("/api/gemini/magomed-history", {
          headers: { "x-demo-role": roleHeader, "x-magomed-thread": clientIdRef.current },
        });
        if (!res.ok) return;
        const data = await res.json();
        const past: ChatMessage[] = Array.isArray(data?.messages)
          ? data.messages
              .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && m?.content)
              .map((m: any) => ({ role: m.role, content: String(m.content) }))
          : [];
        if (past.length > 0) {
          setMessages([{ role: "assistant", content: GREETING }, ...past]);
        }
      } catch {
        // История не критична — молча продолжаем с приветствием.
      }
    })();
  }, [open, roleHeader]);

  // Остановить запись при размонтировании / сворачивании панели.
  useEffect(() => {
    if (!open && recRef.current) {
      try { recRef.current.stop(); } catch {}
    }
  }, [open]);
  useEffect(() => () => { try { recRef.current?.stop(); } catch {} }, []);

  // ── Голосовой ввод (Web Speech API, ru-RU) ──
  // Одна фраза: continuous=false — распознавание само завершится после паузы.
  // interimResults показывают текст «на лету» прямо в поле ввода.
  function toggleRecording() {
    if (recording) {
      try { recRef.current?.stop(); } catch {}
      setRecording(false);
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setRecError("Голосовой ввод поддерживается в Chrome. Наберите запрос вручную.");
      return;
    }
    setRecError(null);
    baseRef.current = input ? input.trim() + " " : "";
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = true;
    let finalBuf = "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalBuf += t + " ";
        else interim += t;
      }
      setInput((baseRef.current + finalBuf + interim).trimStart());
    };
    rec.onerror = (e: any) => {
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setRecError("Нет доступа к микрофону. Разрешите его в настройках браузера.");
      } else if (code !== "aborted" && code !== "no-speech") {
        setRecError("Ошибка распознавания речи. Попробуйте ещё раз.");
      }
      setRecording(false);
    };
    rec.onend = () => {
      if (recRef.current === rec) {
        recRef.current = null;
        setRecording(false);
        inputRef.current?.focus();
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setRecError("Не удалось начать запись.");
      setRecording(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Остановить запись, если шла — иначе наговор перетрёт очищенное поле.
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
      recRef.current = null;
      setRecording(false);
    }

    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      if (!clientIdRef.current) clientIdRef.current = getClientId();
      const response = await fetch("/api/gemini/magomed-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": roleHeader,
          "x-magomed-thread": clientIdRef.current,
        },
        // Шлём только реальный диалог (без вступительного приветствия).
        body: JSON.stringify({
          role: roleHeader,
          messages: next.filter((m, i) => !(i === 0 && m.role === "assistant")),
        }),
      });

      if (response.status === 503) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "ИИ-помощник пока не подключён: не задан ключ **ANTHROPIC_API_KEY** на сервере. " +
              "Добавьте ключ в .env и перезапустите сервер.",
          },
        ]);
        return;
      }

      // 429 — лимит запросов: сервер присылает дружелюбный текст в reply.
      if (response.status === 429) {
        const data = await response.json().catch(() => null);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data?.reply ||
              "Сейчас слишком много запросов к ИИ. Пожалуйста, попробуйте через минуту.",
          },
        ]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Пустой ответ." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Не удалось связаться с помощником. Проверьте соединение и попробуйте ещё раз.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Плавающая кнопка вызова */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Открыть помощника Магомеда"
          className="fixed bottom-24 right-4 z-[35] flex items-center gap-2 rounded-full bg-gradient-to-br from-[#C5A059] to-[#9C784D] px-4 py-3 text-black shadow-[0_8px_30px_rgba(197,160,89,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer lg:bottom-5 lg:right-5 lg:z-[900]"
        >
          <MessageCircle size={20} strokeWidth={2.2} />
          <span className="hidden sm:block text-sm font-bold">Магомед</span>
        </button>
      )}

      {/* Панель чата */}
      {open && (
        <div className="fixed bottom-0 right-0 z-[900] flex h-[70vh] max-h-[560px] w-full flex-col overflow-hidden border border-[#C5A059]/30 bg-[#0C0E14] shadow-2xl sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[380px] sm:rounded-2xl">
          {/* Шапка */}
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1A140A] to-[#0C0E14] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C5A059] to-[#9C784D] text-black">
                <Sparkles size={18} />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-white">Магомед</div>
                <div className="text-[11px] text-[#C5A059]">
                  Помощник CRM{roleLabel ? ` · ${roleLabel}` : ""}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Свернуть"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Лента сообщений */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-[#C5A059] text-black"
                      : "rounded-bl-sm bg-white/5 text-slate-200 border border-white/5"
                  }`}
                >
                  {renderText(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-white/5 bg-white/5 px-3.5 py-2 text-[13px] text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  Магомед смотрит в базу…
                </div>
              </div>
            )}

            {/* Быстрые подсказки — только в начале диалога */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-1.5 text-[12px] text-[#E8C887] transition hover:bg-[#C5A059]/20 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Поле ввода */}
          <div className="border-t border-white/10 bg-[#0C0E14] p-3">
            {recording && (
              <div className="mb-2 flex items-center gap-2 px-1 text-[11px] text-[#E8C887]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Слушаю… говорите, текст появится в поле
              </div>
            )}
            {recError && (
              <div className="mb-2 px-1 text-[11px] text-red-400">{recError}</div>
            )}
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
                placeholder={recording ? "Говорите…" : "Спросите Магомеда…"}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-[#C5A059]/50 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={toggleRecording}
                disabled={loading}
                aria-label={recording ? "Остановить запись" : "Голосовой ввод"}
                title={recording ? "Остановить запись" : "Голосовой ввод"}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
                  recording
                    ? "border-red-500/60 bg-red-500/20 text-red-300 animate-pulse"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-[#C5A059]/50 hover:text-[#E8C887]"
                }`}
              >
                <Mic size={17} />
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Отправить"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C5A059] to-[#9C784D] text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default MagomedAssistant;
