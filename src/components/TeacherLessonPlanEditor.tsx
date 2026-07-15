import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles, Wand2, Loader2, Save, Check, CalendarClock, Presentation } from "lucide-react";

type Kind = "lesson" | "open";

type Props = {
  kind: Kind;
  groupName?: string;
  groupLevel?: string;
  studentCount?: number;
  onClose: () => void;
};

function almatyDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
}

function sectionsToText(data: any): string {
  const lines: string[] = [];
  if (data?.title) lines.push(String(data.title));
  if (data?.summary) { lines.push(String(data.summary)); lines.push(""); }
  for (const s of data?.sections || []) {
    if (s?.heading) lines.push(`${s.heading}:`);
    for (const it of s?.items || []) lines.push(`— ${it}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function TeacherLessonPlanEditor({ kind, groupName, groupLevel, studentCount, onClose }: Props) {
  const isOpen = kind === "open";
  const storageKey = `echo-lesson-plan:${kind}:${groupName || "—"}:${almatyDate()}`;

  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"assist" | "organize" | null>(null);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Серверный вид плана: 'open' → "open", обычный → "lesson" (аудит #16).
  const serverKind = isOpen ? "open" : "lesson";
  const today = almatyDate();

  useEffect(() => {
    // Сначала показываем локальный черновик (мгновенно), затем подтягиваем серверную версию.
    try { const s = localStorage.getItem(storageKey); if (s) setText(s); } catch { /* ignore */ }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/mvp/teacher/lesson-plan?kind=${serverKind}&groupName=${encodeURIComponent(groupName || "")}&date=${today}`, {
          headers: { "x-demo-role": "teacher" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && typeof data?.content === "string" && data.content) setText(data.content);
      } catch { /* офлайн — остаётся локальный черновик */ }
    })();
    return () => { alive = false; };
  }, [storageKey, serverKind, groupName, today]);

  async function callAi(mode: "assist" | "organize") {
    setBusy(mode);
    setNote("");
    try {
      const res = await fetch("/api/gemini/lesson-plan-organize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({ mode, kind, draft: text, groupName, groupLevel, studentCount }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const formatted = sectionsToText(data);
      if (formatted) {
        setText(formatted);
        setNote(mode === "assist" ? "ИИ предложил черновик — доработайте под себя." : "ИИ упорядочил ваш план — отредактируйте при необходимости.");
      }
    } catch {
      // Мягкая деградация без ИИ.
      if (mode === "assist" && !text.trim()) {
        setText(isOpen
          ? "Открытый урок для родителей:\nВступление: приветствие, что покажем.\n— Показательный номер группы\n— Разминка на глазах у родителей\nОсновная часть:\n— Отработка ключевых движений\n— Мини-выступление каждого\nЗавершение:\n— Слово родителям, планы, фото"
          : "Разминка:\n— Суставная гимнастика, растяжка\nОсновная часть:\n— Новые движения по теме занятия\nОтработка:\n— Связки в парах/линиях\nЗавершение:\n— Повтор, обратная связь, задание на дом");
        setNote("ИИ недоступен — вставил базовый шаблон, отредактируйте.");
      } else {
        setNote("ИИ временно недоступен — сохраните свой план как есть.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    // Локальная копия — как офлайн-резерв; основное хранение на сервере (аудит #16).
    try { localStorage.setItem(storageKey, text); } catch { /* ignore */ }
    try {
      const res = await fetch("/api/mvp/teacher/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({ kind: serverKind, groupName: groupName || "", date: today, content: text }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Не сохранилось на сервере — честно предупреждаем (черновик остался локально).
      setNote("Не удалось сохранить на сервере — черновик сохранён локально. Повторите при связи.");
    }
  }

  const Icon = isOpen ? Presentation : CalendarClock;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#C5A059]" />
            <div>
              <h3 className="text-base font-black text-white">{isOpen ? "Открытый урок" : "План урока"}</h3>
              {groupName && <p className="text-[10px] text-slate-500">{groupName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col overflow-y-auto p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          <p className="mb-2 text-xs text-slate-400">
            Напишите план сами — ИИ поможет упорядочить или подскажет черновик.
          </p>
          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isOpen
              ? "Опишите открытый урок: что покажете родителям, номера, вовлечение…"
              : "Опишите занятие: тема, разминка, что отрабатываете, задание на дом…"}
            className="h-56 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3.5 text-sm leading-relaxed text-slate-100 outline-none focus:border-[#C5A059]/50"
          />

          {note && (
            <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#C5A059]/10 px-3 py-2 text-[11px] text-[#e6c987]">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {note}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => callAi("assist")}
              disabled={!!busy}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-3 py-2.5 text-xs font-bold text-[#C5A059] transition hover:bg-[#C5A059]/20 disabled:opacity-50"
            >
              {busy === "assist" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Помочь с планом
            </button>
            <button
              onClick={() => callAi("organize")}
              disabled={!!busy || !text.trim()}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
            >
              {busy === "organize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Упорядочить
            </button>
          </div>

          <button
            onClick={save}
            disabled={!text.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black transition hover:brightness-105 disabled:opacity-40"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} {saved ? "Сохранено" : "Сохранить план"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeacherLessonPlanEditor;
