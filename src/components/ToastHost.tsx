/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToastHost — рисует глобальные тосты (см. src/toast.ts). Один экземпляр в App,
 * поэтому анимация работает ВЕЗДЕ во всех вкладках и ролях СРМ автоматически.
 *
 * Тост показывается по центру экрана как «всплывающая» карточка: круг с иконкой
 * пружинисто появляется (pop), галочка/крестик рисуются штрихом, затем карточка
 * плавно уходит. Анимации — на чистом CSS, без внешних библиотек.
 */
import { useEffect, useRef, useState, type CSSProperties, type Key } from "react";
import { X } from "lucide-react";
import { subscribeToasts, dismissToast, type ToastItem, type ToastType } from "../toast";

const EXIT_MS = 320; // должно совпадать с длительностью exit-анимации ниже

const STYLES: Record<ToastType, { ring: string; glow: string }> = {
  success: { ring: "#10b981", glow: "16,185,129" },
  error: { ring: "#f43f5e", glow: "244,63,94" },
  info: { ring: "#6366f1", glow: "99,102,241" },
};

/** Анимированная иконка внутри круга: галочка / крестик / инфо, рисуется штрихом. */
function ToastGlyph({ type }: { type: ToastType }) {
  const color = STYLES[type].ring;
  return (
    <svg viewBox="0 0 52 52" className="tst-glyph" aria-hidden="true">
      <circle className="tst-circle" cx="26" cy="26" r="24" fill="none" stroke={color} strokeWidth="3" />
      {type === "success" && (
        <path className="tst-mark" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M15 27 L23 34 L38 18" />
      )}
      {type === "error" && (
        <>
          <path className="tst-mark" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" d="M18 18 L34 34" />
          <path className="tst-mark tst-mark--2" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" d="M34 18 L18 34" />
        </>
      )}
      {type === "info" && (
        <>
          <circle className="tst-dot" cx="26" cy="17" r="2.4" fill={color} stroke="none" />
          <path className="tst-mark" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" d="M26 24 L26 36" />
        </>
      )}
    </svg>
  );
}

function ToastCard({ item, exiting }: { key?: Key; item: ToastItem; exiting: boolean }) {
  const [show, setShow] = useState(false);
  const raf = useRef(0);
  useEffect(() => {
    raf.current = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf.current);
  }, []);
  const s = STYLES[item.type];
  return (
    <div
      className={`tst-card pointer-events-auto ${exiting ? "tst-out" : show ? "tst-in" : "tst-pre"}`}
      style={{ "--tst-glow": s.glow } as CSSProperties}
      role="status"
    >
      <button
        onClick={() => dismissToast(item.id)}
        className="tst-close"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" />
      </button>
      <ToastGlyph type={item.type} />
      <p className="tst-msg">{item.message}</p>
    </div>
  );
}

interface LocalToast extends ToastItem { exiting: boolean }

export default function ToastHost() {
  // Единый локальный список того, что реально отрисовано на экране: и активные,
  // и те, что уже удалены из стора, но доигрывают exit-анимацию.
  const [local, setLocal] = useState<LocalToast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const unsub = subscribeToasts((items) => {
      const storeIds = new Set(items.map((t) => t.id));
      setLocal((prev) => {
        // Добавляем новые из стора, сохраняя уже проигранные.
        const merged: LocalToast[] = items.map((it) => {
          const ex = prev.find((p) => p.id === it.id);
          return ex ? { ...ex, ...it, exiting: false } : { ...it, exiting: false };
        });
        // Помечаем ушедшие как exiting и планируем удаление.
        for (const p of prev) {
          if (!storeIds.has(p.id)) {
            if (!merged.some((m) => m.id === p.id)) merged.push({ ...p, exiting: true });
            if (!timersRef.current.has(p.id)) {
              const t = setTimeout(() => {
                timersRef.current.delete(p.id);
                setLocal((cur) => cur.filter((x) => x.id !== p.id));
              }, EXIT_MS);
              timersRef.current.set(p.id, t);
            }
          }
        }
        merged.sort((a, b) => a.id - b.id);
        return merged;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => { for (const t of timers.values()) clearTimeout(t); };
  }, []);

  return (
    <>
      <style>{TOAST_CSS}</style>
      <div className="tst-host pointer-events-none">
        {local.map((t) => (
          <ToastCard key={t.id} item={t} exiting={t.exiting} />
        ))}
      </div>
    </>
  );
}

const TOAST_CSS = `
.tst-host{
  position:fixed; inset:0; z-index:200;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:14px; padding:16px;
}
.tst-card{
  position:relative; pointer-events:auto;
  display:flex; flex-direction:column; align-items:center; text-align:center;
  gap:12px; width:min(92vw,320px);
  padding:26px 26px 22px;
  border-radius:22px;
  /* Светлая «стеклянная» карточка одинаково читаема и на тёмном фоне СРМ,
     и в светлой day-теме — тёмный текст + цветное свечение по типу тоста. */
  background:rgba(255,255,255,0.95);
  backdrop-filter:blur(14px) saturate(1.1);
  -webkit-backdrop-filter:blur(14px) saturate(1.1);
  border:1px solid rgba(var(--tst-glow),0.35);
  box-shadow:0 20px 55px -12px rgba(var(--tst-glow),0.5), 0 10px 30px -10px rgba(0,0,0,0.45);
}
.tst-msg{
  margin:0; font-size:15px; font-weight:700; line-height:1.35; color:#0f172a;
  letter-spacing:-0.01em;
}
.tst-close{
  position:absolute; top:8px; right:8px;
  display:inline-flex; align-items:center; justify-content:center;
  width:26px; height:26px; border-radius:9px;
  color:rgba(100,116,139,0.7); background:transparent; border:none; cursor:pointer;
  transition:color .15s ease, background .15s ease;
}
.tst-close:hover{ color:#0f172a; background:rgba(148,163,184,0.18); }

.tst-glyph{ width:64px; height:64px; overflow:visible; }
.tst-circle{
  transform-origin:center;
  stroke-dasharray:151; stroke-dashoffset:151;
}
.tst-mark{
  stroke-dasharray:48; stroke-dashoffset:48;
}
.tst-dot{ opacity:0; transform-origin:center; }

/* Появление карточки — пружинисто */
.tst-pre{ opacity:0; transform:translateY(10px) scale(.82); }
.tst-in{
  animation:tstPop .42s cubic-bezier(.34,1.56,.64,1) forwards;
}
.tst-out{
  animation:tstOut .32s ease-in forwards;
}
@keyframes tstPop{
  0%{ opacity:0; transform:translateY(10px) scale(.82); }
  60%{ opacity:1; }
  100%{ opacity:1; transform:translateY(0) scale(1); }
}
@keyframes tstOut{
  0%{ opacity:1; transform:translateY(0) scale(1); }
  100%{ opacity:0; transform:translateY(-6px) scale(.92); }
}

/* Иконка играет только на входе */
.tst-in .tst-circle{ animation:tstDraw .45s ease-out .08s forwards; }
.tst-in .tst-mark{ animation:tstDraw .32s ease-out .34s forwards; }
.tst-in .tst-mark--2{ animation-delay:.46s; }
.tst-in .tst-dot{ animation:tstFadeIn .25s ease-out .5s forwards; }

@keyframes tstDraw{ to{ stroke-dashoffset:0; } }
@keyframes tstFadeIn{ to{ opacity:1; } }

/* Уважение к prefers-reduced-motion */
@media (prefers-reduced-motion: reduce){
  .tst-in{ animation:tstFadeIn .2s ease forwards; opacity:1; transform:none; }
  .tst-in .tst-circle, .tst-in .tst-mark, .tst-in .tst-dot{ animation:none; stroke-dashoffset:0; opacity:1; }
  .tst-out{ animation:tstFadeIn .15s ease reverse forwards; }
}
`;
