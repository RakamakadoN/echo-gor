import React, { useEffect, useMemo, useRef, useState } from "react";
import { Shirt, Plus, Camera, Loader2, Package, Archive, RotateCcw } from "lucide-react";
import { toast } from "../toast";

const money = (v: number) => `${Math.round(v || 0).toLocaleString("ru-RU")} ₸`;

async function compressImage(file: File, max = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

type Costume = { id: string; name: string; size?: string | null; deposit: number; fee: number; refPhoto?: string | null; status: string };

// Каталог костюмов для настроек владельца/управляющего: добавление, список, списание.
// Админ костюмы НЕ заводит — только выдаёт/принимает в своём кабинете.
export function CostumeCatalogSettings({ role = "owner" }: { role?: string }) {
  const HDR = { "x-demo-role": role };
  const JHDR = { "Content-Type": "application/json", "x-demo-role": role };
  const [costumes, setCostumes] = useState<Costume[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [fee, setFee] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/mvp/costumes", { headers: HDR })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setCostumes(d.costumes || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function pick(f: File) { setBusy(true); try { setPhoto(await compressImage(f)); } finally { setBusy(false); } }
  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mvp/costumes", { method: "POST", headers: JHDR, body: JSON.stringify({ name, size, fee: Number(fee) || 0, refPhoto: photo }) });
      if (res.ok) { toast.success(`Костюм добавлен: ${name}`); setName(""); setSize(""); setFee(""); setPhoto(null); load(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Не удалось добавить костюм"); }
    } catch { toast.error("Ошибка сети"); } finally { setBusy(false); }
  }
  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/mvp/costumes/${id}`, { method: "PATCH", headers: JHDR, body: JSON.stringify({ status }) });
    if (res.ok) toast.success(status === "retired" ? "Костюм списан" : "Костюм возвращён в каталог");
    else toast.error("Не удалось изменить костюм");
    load();
  }

  const active = useMemo(() => costumes.filter((c) => c.status !== "retired"), [costumes]);
  const retired = useMemo(() => costumes.filter((c) => c.status === "retired"), [costumes]);
  const statusLabel: Record<string, string> = { available: "Доступен", rented: "В прокате", cleaning: "На чистке", retired: "Списан" };
  const statusTone: Record<string, string> = {
    available: "bg-emerald-400/10 text-emerald-300", rented: "bg-indigo-400/10 text-indigo-300",
    cleaning: "bg-amber-400/10 text-amber-300", retired: "bg-white/5 text-slate-500",
  };
  const inputCls = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#C5A059]/50 focus:outline-none";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F0F0F] p-5">
      <h3 className="flex items-center gap-2 text-base font-black text-white"><Shirt className="h-5 w-5 text-indigo-400" /> Каталог костюмов для проката</h3>
      <p className="mt-1 text-xs text-slate-400">Заводите костюмы здесь. Администратор на ресепшене выдаёт и принимает их (залог — удостоверение).</p>

      {/* Добавление */}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_90px_110px_auto]">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Название костюма" />
        <input className={inputCls} value={size} onChange={(e) => setSize(e.target.value)} placeholder="Размер" />
        <input className={inputCls} type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Прокат ₸" />
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
          <button onClick={() => fileRef.current?.click()} title="Фото-эталон" className={`flex h-[42px] w-11 shrink-0 items-center justify-center rounded-xl border ${photo ? "border-[#C5A059]/50 text-[#C5A059]" : "border-white/10 text-slate-400"} hover:bg-white/5`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <button onClick={add} disabled={!name.trim() || busy} className="flex items-center gap-1 rounded-xl bg-[#C5A059] px-3 text-sm font-black text-black hover:bg-[#d4b06a] disabled:opacity-40">
            <Plus className="h-4 w-4" /> Добавить
          </button>
        </div>
      </div>
      {photo && <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400"><img src={photo} className="h-8 w-8 rounded object-cover" alt="" /> фото прикреплено</div>}

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-8 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="mt-4 space-y-2">
          {active.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Костюмов пока нет</p>}
          {active.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                {c.refPhoto ? <img src={c.refPhoto} className="h-full w-full object-cover" alt="" /> : <Package className="h-4 w-4 text-slate-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{c.name}</div>
                <div className="text-[11px] text-slate-500">{c.size ? `размер ${c.size} · ` : ""}прокат {money(c.fee)}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone[c.status]}`}>{statusLabel[c.status] || c.status}</span>
              {c.status !== "rented" && (
                <button onClick={() => setStatus(c.id, "retired")} title="Списать" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-300"><Archive className="h-4 w-4" /></button>
              )}
            </div>
          ))}
          {retired.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-bold text-slate-500">Списанные · {retired.length}</summary>
              <div className="mt-2 space-y-2">
                {retired.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2 opacity-70">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{c.name}</span>
                    <button onClick={() => setStatus(c.id, "available")} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" /> Вернуть</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default CostumeCatalogSettings;
