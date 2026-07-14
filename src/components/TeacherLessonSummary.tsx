import React, { useRef, useState } from "react";
import { X, Mic, Square, Loader2, Sparkles, Save, Check, CheckCircle2, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

type Structured = { summary?: string; done?: string[]; progress?: string[]; attention?: string[]; advice?: string[] };

export function TeacherLessonSummary({ groupName, groupLevel, studentCount, onClose }: {
  groupName?: string; groupLevel?: string; studentCount?: number; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Structured | null>(null);
  const [saved, setSaved] = useState(false);
  const recRef = useRef<any>(null);
  const baseRef = useRef("");

  function toggleRecording() {
    if (recording) { try { recRef.current?.stop(); } catch {} setRecording(false); return; }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setRecError("Голосовой ввод работает в Chrome. Наберите текст вручную."); return; }
    setRecError("");
    baseRef.current = text ? text.trim() + " " : "";
    const rec = new SR();
    rec.lang = "ru-RU"; rec.continuous = true; rec.interimResults = true;
    let finalBuf = "";
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalBuf += t + " "; else interim += t;
      }
      setText((baseRef.current + finalBuf + interim).trimStart());
    };
    rec.onerror = (e: any) => {
      const code = e?.error;
      if (code === "not-allowed" || code === "service-not-allowed") setRecError("Нет доступа к микрофону — разрешите в браузере.");
      else if (code !== "aborted" && code !== "no-speech") setRecError("Ошибка распознавания. Попробуйте ещё раз.");
      setRecording(false);
    };
    rec.onend = () => { if (recRef.current === rec) { recRef.current = null; setRecording(false); } };
    recRef.current = rec;
    try { rec.start(); setRecording(true); } catch { setRecording(false); }
  }

  async function structure() {
    if (!text.trim()) return;
    if (recording) { try { recRef.current?.stop(); } catch {} setRecording(false); }
    setBusy(true);
    try {
      const res = await fetch("/api/gemini/lesson-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": "teacher" },
        body: JSON.stringify({ transcript: text, groupName, groupLevel, studentCount }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch {
      // Фолбэк без ИИ — простая структуризация.
      const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
      setResult({
        summary: sentences[0] || text.slice(0, 120),
        done: sentences.slice(0, 3),
        progress: [],
        attention: [],
        advice: ["ИИ недоступен — сохранён ваш текст. Отредактируйте при необходимости."],
      });
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const key = `echo-lesson-summary:${groupName || "—"}:${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date())}`;
    try { localStorage.setItem(key, JSON.stringify({ text, result })); } catch {}
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-[#C5A059]" />
            <div>
              <h3 className="text-base font-black text-white">Итоги урока</h3>
              {groupName && <p className="text-[10px] text-slate-500">{groupName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          <p className="mb-2 text-xs text-slate-400">Нажмите микрофон и наговорите, как прошло занятие — ИИ разложит по полочкам и подскажет.</p>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="…или напишите: что успели, у кого прогресс, на что обратить внимание"
              className="h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3.5 pr-14 text-sm leading-relaxed text-slate-100 outline-none focus:border-[#C5A059]/50"
            />
            <button
              onClick={toggleRecording}
              className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full transition ${
                recording ? "bg-red-500/20 text-red-300 animate-pulse ring-2 ring-red-500/40" : "bg-[#C5A059] text-black hover:brightness-105"
              }`}
              title={recording ? "Остановить" : "Говорить"}
            >
              {recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>
          {recording && <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-300"><span className="h-1.5 w-1.5 animate-ping rounded-full bg-red-500" /> Слушаю… говорите</p>}
          {recError && <p className="mt-1.5 text-[11px] text-rose-300">{recError}</p>}

          <button
            onClick={structure}
            disabled={busy || !text.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-4 py-2.5 text-sm font-bold text-[#C5A059] transition hover:bg-[#C5A059]/20 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Разложить по полочкам с ИИ
          </button>

          {result && (
            <div className="mt-4 space-y-3">
              {result.summary && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-sm text-slate-200">{result.summary}</div>
              )}
              <ResultBlock icon={CheckCircle2} color="text-emerald-400" title="Что успели" items={result.done} />
              <ResultBlock icon={TrendingUp} color="text-sky-400" title="Прогресс" items={result.progress} />
              <ResultBlock icon={AlertTriangle} color="text-amber-400" title="На что обратить внимание" items={result.attention} />
              <ResultBlock icon={Lightbulb} color="text-[#C5A059]" title="Советы ИИ" items={result.advice} />

              <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black transition hover:brightness-105">
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} {saved ? "Сохранено" : "Сохранить итоги"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultBlock({ icon: Icon, color, title, items }: { icon: any; color: string; title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] p-3.5">
      <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${color}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" /> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TeacherLessonSummary;
