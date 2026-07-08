/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToastHost — рисует глобальные тосты (см. src/toast.ts). Один экземпляр в App.
 * Анимация появления/ухода на CSS-переходах, без внешних библиотек.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { subscribeToasts, dismissToast, type ToastItem, type ToastType } from "../toast";

const STYLES: Record<ToastType, { cls: string; Icon: typeof CheckCircle2 }> = {
  success: { cls: "border-emerald-400/40 bg-emerald-600 text-white", Icon: CheckCircle2 },
  error: { cls: "border-rose-400/40 bg-rose-600 text-white", Icon: XCircle },
  info: { cls: "border-slate-400/40 bg-slate-800 text-white", Icon: Info },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [show, setShow] = useState(false);
  const raf = useRef(0);
  useEffect(() => {
    raf.current = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf.current);
  }, []);
  const { cls, Icon } = STYLES[item.type];
  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl transition-all duration-300 ease-out ${cls} ${show ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}
      role="status"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-semibold leading-snug">{item.message}</p>
      <button onClick={() => dismissToast(item.id)} className="shrink-0 rounded-lg p-0.5 text-white/70 transition hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}
