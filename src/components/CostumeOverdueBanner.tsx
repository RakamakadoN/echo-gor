import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

// Уведомление о невозвращённых вовремя костюмах. Рендерится ТОЛЬКО если есть просрочка.
// Видно владельцу, управляющему и админу (бэкенд сам скоупит по филиалу через canSeeBranch).
export function CostumeOverdueBanner({ role = "admin", onOpen }: { role?: string; onOpen?: () => void }) {
  const [overdue, setOverdue] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
    fetch("/api/mvp/costumes", { headers: { "x-demo-role": role } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.rentals) return;
        setOverdue(d.rentals.filter((x: any) => x.status === "active" && x.dueDate && x.dueDate < today));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [role]);

  if (overdue.length === 0) return null;

  const daysLate = (due: string) => {
    const today = new Date(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date()));
    return Math.max(1, Math.round((today.getTime() - new Date(due).getTime()) / 86400000));
  };

  return (
    <div className="rounded-2xl border border-rose-400/40 bg-rose-500/[0.08] p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-rose-400" />
        <h3 className="text-sm font-black text-rose-200">Костюмы не сданы вовремя · {overdue.length}</h3>
        {onOpen && (
          <button onClick={onOpen} className="ml-auto rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-500/30">
            К прокату
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {overdue.slice(0, 6).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-slate-200">
              <span className="font-bold">{r.costumeName}</span> · {r.renterName}
            </span>
            <span className="shrink-0 font-bold text-rose-300">просрочка {daysLate(r.dueDate)} дн.</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CostumeOverdueBanner;
