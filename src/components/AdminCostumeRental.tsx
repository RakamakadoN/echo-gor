import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Shirt, Plus, X, Camera, Loader2, CheckCircle2, ArrowRightLeft, Clock, AlertTriangle, Package,
} from "lucide-react";
import { toast } from "../toast";

const HDR = { "x-demo-role": "admin" };
const JHDR = { "Content-Type": "application/json", "x-demo-role": "admin" };
const money = (v: number) => `${Math.round(v || 0).toLocaleString("ru-RU")} ₸`;
const almatyToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
const fmtDate = (iso?: string | null) => (iso ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(iso)) : "—");

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
type Rental = {
  id: string; costumeId: string | null; costumeName: string | null; renterName: string; issuedAt: string; issuedBy?: string | null;
  dueDate?: string | null; fee: number; deposit: number; method?: string | null; issuePhoto?: string | null;
  idPhoto?: string | null; idNote?: string | null;
  returnedAt?: string | null; returnPhoto?: string | null; returnCondition?: string | null; depositRefunded?: boolean | null; status: string;
};

export function AdminCostumeRental() {
  const [costumes, setCostumes] = useState<Costume[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueFor, setIssueFor] = useState<Costume | "pick" | null>(null);
  const [returnFor, setReturnFor] = useState<Rental | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/mvp/costumes", { headers: HDR })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setCostumes(d.costumes || []); setRentals(d.rentals || []); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const active = useMemo(() => rentals.filter((r) => r.status === "active"), [rentals]);
  const today = almatyToday();
  const isOverdue = (r: Rental) => r.dueDate && r.dueDate < today;
  const available = useMemo(() => costumes.filter((c) => c.status !== "retired"), [costumes]);

  const statusLabel: Record<string, string> = { available: "Доступен", rented: "В прокате", cleaning: "На чистке", retired: "Списан" };
  const statusTone: Record<string, string> = {
    available: "bg-emerald-400/10 text-emerald-300", rented: "bg-indigo-400/10 text-indigo-300",
    cleaning: "bg-amber-400/10 text-amber-300", retired: "bg-white/5 text-slate-500",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-white"><Shirt className="h-5 w-5 text-indigo-400" /> Прокат костюмов</h2>
          <p className="mt-1 text-sm text-slate-400">Выдача и приём костюмов. Приём — обязательно с фото (костюм в надлежащем виде).</p>
        </div>
        <button onClick={() => setIssueFor("pick")} className="flex items-center gap-1.5 rounded-2xl bg-[#C5A059] px-3.5 py-2 text-sm font-black text-black hover:bg-[#d4b06a]">
          <ArrowRightLeft className="h-4 w-4" /> Выдать костюм
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {/* В прокате */}
          <section>
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-white">В прокате · {active.length}</h3>
            {active.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-[#0F0F0F] py-8 text-center text-sm text-slate-500">Сейчас никто не держит костюмы</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {active.map((r) => (
                  <div key={r.id} className={`rounded-2xl border p-4 ${isOverdue(r) ? "border-rose-400/40 bg-rose-400/[0.05]" : "border-white/10 bg-[#0F0F0F]"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">{r.costumeName}</div>
                        <div className="truncate text-xs text-slate-400">{r.renterName}</div>
                      </div>
                      {isOverdue(r) ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300"><AlertTriangle className="h-3 w-3" /> просрочка</span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400"><Clock className="h-3 w-3" /> до {fmtDate(r.dueDate)}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Выдан {fmtDate(r.issuedAt)}{r.issuedBy ? ` · ${r.issuedBy}` : ""}</span>
                      {r.fee > 0 && <span>Прокат {money(r.fee)}</span>}
                      <span className="text-indigo-300">Залог: УДО{r.idNote ? ` · ${r.idNote}` : ""}</span>
                    </div>
                    <button onClick={() => setReturnFor(r)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-black hover:bg-emerald-400">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Принять костюм
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Каталог */}
          <section>
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-white">Каталог · {available.length}</h3>
            {available.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-[#0F0F0F] py-8 text-center text-sm text-slate-500">Костюмов пока нет — добавьте первый</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((c) => (
                  <div key={c.id} className="flex gap-3 rounded-2xl border border-white/10 bg-[#0F0F0F] p-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                      {c.refPhoto ? <img src={c.refPhoto} alt={c.name} className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-slate-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.size ? `размер ${c.size}` : "размер —"}{c.deposit ? ` · залог ${money(c.deposit)}` : ""}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone[c.status]}`}>{statusLabel[c.status] || c.status}</span>
                        {c.status === "available" && (
                          <button onClick={() => setIssueFor(c)} className="text-[11px] font-black text-[#C5A059] hover:underline">Выдать →</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {issueFor && <IssueModal costume={issueFor === "pick" ? null : issueFor} options={costumes.filter((c) => c.status === "available")} onClose={() => setIssueFor(null)} onDone={() => { setIssueFor(null); load(); }} />}
      {returnFor && <ReturnModal rental={returnFor} onClose={() => setReturnFor(null)} onDone={() => { setReturnFor(null); load(); }} />}
    </div>
  );
}

function Modal({ title, icon: Icon, onClose, children }: { title: string; icon: React.ElementType; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0F0F0F] p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-black text-white"><Icon className="h-4 w-4 text-[#C5A059]" /> {title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#C5A059]/50 focus:outline-none";
const labelCls = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500";

function PhotoField({ photo, onPick, busy, label }: { photo: string | null; onPick: (f: File) => void; busy: boolean; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
      {photo ? (
        <div className="relative">
          <img src={photo} alt="фото" className="max-h-56 w-full rounded-2xl border border-white/10 object-cover" />
          <button onClick={() => ref.current?.click()} className="absolute bottom-2 right-2 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-bold text-white hover:bg-black/90">Переснять</button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 text-slate-400 hover:border-[#C5A059]/40 hover:text-slate-200">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}<span className="text-sm font-bold">{label}</span>
        </button>
      )}
    </div>
  );
}

function IssueModal({ costume, options, onClose, onDone }: { costume: Costume | null; options: Costume[]; onClose: () => void; onDone: () => void }) {
  const [selectedId, setSelectedId] = useState(costume?.id || "");
  const picked = costume || options.find((c) => c.id === selectedId) || null;
  const [renter, setRenter] = useState("");
  // Аудит #30: срок возврата обязателен и по умолчанию +14 дней — иначе прокат
  // «без срока» никогда не становился просроченным и выпадал из контроля.
  const [due, setDue] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date(Date.now() + 14 * 86400000)));
  const [fee, setFee] = useState(String(costume?.fee || ""));
  useEffect(() => { if (!costume && picked) setFee(String(picked.fee || "")); }, [selectedId]);
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [idNote, setIdNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(f: File) { setBusy(true); try { setPhoto(await compressImage(f)); } finally { setBusy(false); } }
  async function pickId(f: File) { setBusy(true); try { setIdPhoto(await compressImage(f)); } finally { setBusy(false); } }
  async function issue() {
    if (!renter.trim() || !picked) return;
    if (!due) { toast.error("Укажите срок возврата — без него прокат нельзя проконтролировать"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/mvp/costumes/issue", {
        method: "POST", headers: JHDR,
        body: JSON.stringify({ costumeId: picked.id, renterName: renter, dueDate: due, fee: Number(fee) || 0, method, issuePhoto: photo, idPhoto, idNote, notes }),
      });
      if (res.ok) { toast.success(`Костюм выдан: ${picked.name} → ${renter}`); onDone(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Не удалось выдать костюм"); }
    } catch { toast.error("Ошибка сети при выдаче"); } finally { setBusy(false); }
  }

  return (
    <Modal title={costume ? `Выдать: ${costume.name}` : "Выдать костюм"} icon={ArrowRightLeft} onClose={onClose}>
      <div className="space-y-3">
        {!costume && (
          <div>
            <label className={labelCls}>Костюм</label>
            <select className={inputCls} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— выберите из каталога —</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.name}{c.size ? ` · ${c.size}` : ""}</option>)}
            </select>
            {options.length === 0 && <p className="mt-1 text-[11px] text-amber-400">Нет доступных костюмов. Каталог ведёт управляющий/владелец.</p>}
          </div>
        )}
        <div><label className={labelCls}>Кто берёт</label><input className={inputCls} value={renter} onChange={(e) => setRenter(e.target.value)} placeholder="Имя ученика / клиента" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Вернуть до *</label><input className={inputCls} type="date" min={almatyToday()} value={due} onChange={(e) => setDue(e.target.value)} required /></div>
          <div><label className={labelCls}>Плата за прокат ₸</label><input className={inputCls} type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
        </div>
        {Number(fee) > 0 && (
          <div><label className={labelCls}>Способ оплаты</label>
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Наличные</option><option value="kaspi">Kaspi</option><option value="card">Карта</option><option value="transfer">Перевод</option>
            </select>
          </div>
        )}

        {/* Залог — удостоверение личности (УДО) */}
        <div className="rounded-2xl border border-indigo-400/25 bg-indigo-400/[0.05] p-3">
          <label className={labelCls}>Залог — удостоверение (УДО)</label>
          <input className={`${inputCls} mb-2`} value={idNote} onChange={(e) => setIdNote(e.target.value)} placeholder="ЧИО / номер удостоверения" />
          <PhotoField photo={idPhoto} onPick={pickId} busy={busy} label="Фото удостоверения" />
        </div>

        <div><label className={labelCls}>Фото костюма при выдаче (опционально)</label><PhotoField photo={photo} onPick={pick} busy={busy} label="Зафиксировать состояние" /></div>
        <div><label className={labelCls}>Заметка</label><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="напр. без повреждений" /></div>
        <button onClick={issue} disabled={!renter.trim() || !picked || busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-3 text-sm font-black text-black hover:bg-[#d4b06a] disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Выдать в прокат
        </button>
      </div>
    </Modal>
  );
}

function ReturnModal({ rental, onClose, onDone }: { rental: Rental; onClose: () => void; onDone: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [condition, setCondition] = useState<"ok" | "damaged">("ok");
  const [idReturned, setIdReturned] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(f: File) { setBusy(true); try { setPhoto(await compressImage(f)); } finally { setBusy(false); } }
  async function accept() {
    if (!photo || !idReturned) return; // без фото костюма и без возврата УДО принять нельзя
    setBusy(true);
    try {
      const res = await fetch("/api/mvp/costumes/return", {
        method: "POST", headers: JHDR,
        body: JSON.stringify({ rentalId: rental.id, returnPhoto: photo, returnCondition: condition, depositRefunded: true, notes }),
      });
      if (res.ok) { toast.success(condition === "damaged" ? "Костюм принят (повреждён) · УДО возвращено" : "Костюм принят · УДО возвращено"); onDone(); }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Не удалось принять костюм"); }
    } catch { toast.error("Ошибка сети при приёме"); } finally { setBusy(false); }
  }

  return (
    <Modal title={`Приём: ${rental.costumeName}`} icon={ArrowRightLeft} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">Сделайте фото костюма — подтверждение, что принят в надлежащем виде. Без фото принять нельзя.</p>
        <PhotoField photo={photo} onPick={pick} busy={busy} label="Фото костюма при приёме" />

        <div>
          <label className={labelCls}>Состояние</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCondition("ok")} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${condition === "ok" ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-slate-400"}`}>В порядке</button>
            <button onClick={() => setCondition("damaged")} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${condition === "damaged" ? "border-rose-400/50 bg-rose-400/10 text-rose-300" : "border-white/10 text-slate-400"}`}>Повреждён</button>
          </div>
        </div>

        {/* Вернуть залог — удостоверение (УДО) */}
        <div className="rounded-2xl border border-indigo-400/25 bg-indigo-400/[0.05] p-3">
          <div className="mb-2 flex items-center gap-3">
            {rental.idPhoto ? (
              <img src={rental.idPhoto} alt="УДО" className="h-12 w-16 shrink-0 rounded-lg border border-white/10 object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-bold text-indigo-200">Вернуть УДО клиенту</div>
              <div className="truncate text-[11px] text-slate-400">{rental.idNote || "удостоверение личности"}</div>
            </div>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5">
            <span className="text-sm text-slate-300">Удостоверение возвращено клиенту</span>
            <input type="checkbox" checked={idReturned} onChange={(e) => setIdReturned(e.target.checked)} className="h-5 w-5 accent-[#C5A059]" />
          </label>
        </div>

        {condition === "damaged" && <div className="rounded-xl bg-rose-500/10 p-2.5 text-[11px] text-rose-300">Костюм уйдёт «на чистку». УДО всё равно возвращается клиенту; вопрос компенсации решает руководитель.</div>}

        <div><label className={labelCls}>Заметка</label><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="напр. пятно на рукаве" /></div>
        <button onClick={accept} disabled={!photo || !idReturned || busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-black hover:bg-emerald-400 disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Принять костюм
        </button>
      </div>
    </Modal>
  );
}

export default AdminCostumeRental;
