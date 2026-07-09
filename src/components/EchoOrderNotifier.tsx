/**
 * «ИИ администратора» — плавающее уведомление о новых заявках на обмен ЭхоБаксов
 * (ТЗ «Магазин» §3.5). Глобальный виджет для персонала (владелец / управляющий /
 * администратор): опрашивает инбокс заявок и, когда появляется НОВАЯ ожидающая
 * заявка, показывает карточку в левом нижнем углу с быстрым действием «✅ Выдать
 * товар». Не мешает чат-виджету «Магомед» (тот в правом нижнем углу).
 *
 * Механика «новизны»: серверный push тут не нужен — приложение polling-овое.
 * Раз в POLL_MS запрашиваем /api/mvp/shop/echo/orders (инбокс, скоуп по филиалу
 * делает бэкенд) и сравниваем pending-заявки с множеством «уже показанных» ID,
 * которое переживает перезагрузку в localStorage (ключ по роли). При первом
 * запуске существующий бэклог помечаем показанным ТИХО — чтобы не завалить
 * персонал старыми заявками; всплывают только те, что появились после.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X, Loader2, Check } from "lucide-react";
import { toast } from "../toast";

type Order = {
  id: string;
  studentName: string | null;
  branchName: string | null;
  groupName: string | null;
  teacherName: string | null;
  productName: string | null;
  productPhoto: string | null;
  echoPrice: number;
  balance: number;
  createdAt: string | null;
  status: string;
};

const POLL_MS = 30_000;      // как часто опрашивать инбокс заявок
const MAX_CARDS = 3;         // сколько карточек показывать одновременно
const seenKey = (role: string) => `echo_seen_orders_${role}`;

function loadSeen(role: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(role));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function saveSeen(role: string, seen: Set<string>) {
  try {
    // Не даём множеству расти бесконечно — храним последние 200 ID.
    const arr = [...seen].slice(-200);
    localStorage.setItem(seenKey(role), JSON.stringify(arr));
  } catch { /* ignore */ }
}

const fmtWhen = (s?: string | null) =>
  s ? new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function EchoOrderNotifier({ roleHeader }: { roleHeader: string }) {
  const [queue, setQueue] = useState<Order[]>([]);   // новые заявки, ждущие показа
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errId, setErrId] = useState<{ id: string; msg: string } | null>(null);
  const seenRef = useRef<Set<string>>(loadSeen(roleHeader));
  const primedRef = useRef(false);   // первый опрос уже прошёл (бэклог поглощён тихо)

  // Роль сменилась — перечитываем «показанные» и сбрасываем очередь.
  useEffect(() => {
    seenRef.current = loadSeen(roleHeader);
    primedRef.current = false;
    setQueue([]);
    setErrId(null);
  }, [roleHeader]);

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/mvp/shop/echo/orders", { headers: { "x-demo-role": roleHeader } });
      if (!r.ok) return;   // 403 для роли без доступа — молча выходим
      const orders: Order[] = (await r.json()).orders || [];
      const pending = orders.filter((o) => o.status === "pending");
      const seen = seenRef.current;

      if (!primedRef.current) {
        // Первый проход: поглощаем текущий бэклог без всплытий.
        for (const o of pending) seen.add(o.id);
        saveSeen(roleHeader, seen);
        primedRef.current = true;
        return;
      }

      const fresh = pending.filter((o) => !seen.has(o.id));
      if (fresh.length === 0) return;
      for (const o of fresh) seen.add(o.id);
      saveSeen(roleHeader, seen);
      // Новые сверху; ограничиваем длину очереди.
      setQueue((prev) => [...fresh, ...prev].slice(0, MAX_CARDS));
    } catch { /* сеть недоступна — попробуем в следующий раз */ }
  }, [roleHeader]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  const dismiss = (id: string) => {
    setQueue((prev) => prev.filter((o) => o.id !== id));
    if (errId?.id === id) setErrId(null);
  };

  const issue = async (o: Order) => {
    setBusyId(o.id); setErrId(null);
    try {
      const res = await fetch(`/api/mvp/shop/echo/orders/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({ action: "issue" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Не удалось выдать товар");
      toast.success(`Выдано: ${o.productName || "товар"} — ${o.studentName || "ученик"}`);
      dismiss(o.id);
    } catch (e: any) {
      setErrId({ id: o.id, msg: e?.message || "Ошибка" });
    } finally { setBusyId(null); }
  };

  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[60] flex w-[min(92vw,22rem)] flex-col gap-3">
      {queue.map((o) => (
        <article key={o.id} className="overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-[#121212] shadow-2xl shadow-black/60">
          <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#C5A059]/10 px-4 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#E8C887]">
              <Sparkles className="h-4 w-4" /> ИИ администратора
            </div>
            <button onClick={() => dismiss(o.id)} aria-label="Закрыть" className="rounded-lg p-1 text-slate-500 transition hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex gap-3 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-black">
              {o.productPhoto
                ? <img src={o.productPhoto} alt={o.productName || ""} className="h-full w-full object-cover" />
                : <span className="text-2xl">🎁</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">🔔 Новая заявка на обмен</p>
              <p className="mt-0.5 truncate text-sm font-bold text-white">{o.studentName || "Ученик"}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                {[o.branchName && `📍 ${o.branchName}`, o.teacherName && `👨‍🏫 ${o.teacherName}`, o.groupName && `👥 ${o.groupName}`].filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="mt-1 text-[12px] text-slate-300">🎁 {o.productName || "Товар"} · <span className="font-black text-[#C5A059]">🪙 {o.echoPrice} ЭхоБаксов</span></p>
              <p className="mt-0.5 text-[11px] text-slate-500">📅 {fmtWhen(o.createdAt)}</p>
            </div>
          </div>
          {errId?.id === o.id && (
            <p className="mx-4 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-300">{errId.msg}</p>
          )}
          <div className="flex gap-2 border-t border-white/5 bg-black/20 p-3">
            <button
              onClick={() => issue(o)}
              disabled={busyId === o.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-500 disabled:opacity-50">
              {busyId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Выдать товар
            </button>
            <button
              onClick={() => dismiss(o.id)}
              disabled={busyId === o.id}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:text-white disabled:opacity-50">
              Позже
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
