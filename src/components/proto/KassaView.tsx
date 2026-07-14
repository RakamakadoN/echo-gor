import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

/* ===== РАЗДЕЛ «КАССА» — подтверждение поступлений владельцем =====
   Смена продаёт (абонементы/выступления/товары) и прикладывает чек; владелец сверяет,
   подтверждает — деньги уходят на свой счёт, комиссия Kaspi списывается отдельным расходом. */

const H = { "x-demo-role": "owner" } as const;
const HJ = { "Content-Type": "application/json", "x-demo-role": "owner" } as const;
const money = (n: number) => Math.round(n || 0).toLocaleString("ru-RU") + " ₸";
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shiftDay = (iso: string, delta: number) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + delta); return isoLocal(d); };
const ddmm = (iso: string) => String(iso).slice(8, 10) + "." + String(iso).slice(5, 7);
const methodLabel: Record<string, string> = { card: "💳 Картой", kaspi: "💳 Kaspi", transfer: "🔁 Перевод", cash: "💵 Наличные" };

type Item = {
  type: "abon" | "perf" | "tovar"; id: string; stream: string; emo: string; who: string;
  method: string; amount: number; commission: number; account: string;
  attachmentUrl: string | null; attachmentName: string | null; status: "pending" | "confirmed" | "rejected";
};
type Acc = { key: string; name: string; balance: number };

export function KassaView() {
  const [date, setDate] = useState(isoLocal(new Date()));
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [sub, setSub] = useState<"day" | "archive">("day");
  const [sumView, setSumView] = useState<"stream" | "pay">("stream");
  const [modal, setModal] = useState<Item | null>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [arcFilter, setArcFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const attachTarget = useRef<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`/api/mvp/accounting/kassa?date=${date}`, { headers: H });
      const j = r.ok ? await r.json() : { items: [], accounts: [] };
      if (!r.ok) setErr(j.error || "Не удалось загрузить кассу");
      setItems(j.items || []); setAccounts(j.accounts || []);
    } catch { setErr("Сервер недоступен"); }
    setLoading(false);
  }, [date]);
  useEffect(() => { if (sub === "day") load(); }, [load, sub]);

  const loadReceipts = useCallback(async () => {
    try { const r = await fetch(`/api/mvp/accounting/kassa/receipts`, { headers: H }); const j = r.ok ? await r.json() : { receipts: [] }; setReceipts(j.receipts || []); } catch { /**/ }
  }, []);
  useEffect(() => { if (sub === "archive") loadReceipts(); }, [loadReceipts, sub]);

  const act = async (url: string, body: any, key: string) => {
    setBusy(key);
    try {
      const r = await fetch(url, { method: "POST", headers: HJ, body: JSON.stringify(body) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || "Ошибка операции"); }
      else await load();
    } catch { setErr("Сервер недоступен"); }
    setBusy(null);
  };
  const confirm = (it: Item) => act("/api/mvp/accounting/kassa/confirm", { type: it.type, id: it.id }, it.id);
  const setStatus = (it: Item, status: string) => act("/api/mvp/accounting/kassa/set-status", { type: it.type, id: it.id, status }, it.id);

  const onPickFile = (it: Item) => { attachTarget.current = it; fileRef.current?.click(); };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; const it = attachTarget.current; e.target.value = "";
    if (!f || !it) return;
    if (f.size > 4_000_000) { setErr("Файл больше 4 МБ — сожмите или сфотографируйте меньше"); return; }
    const reader = new FileReader();
    reader.onload = async () => { await act("/api/mvp/accounting/kassa/attach", { type: it.type, id: it.id, dataUrl: reader.result, name: f.name }, it.id); };
    reader.readAsDataURL(f);
  };

  /* ---- агрегаты дня ---- */
  const pending = items.filter((i) => i.status === "pending");
  const confirmed = items.filter((i) => i.status === "confirmed");
  const noReceipt = pending.filter((i) => !i.attachmentUrl).length;
  const allDone = items.length > 0 && pending.length === 0;

  const streams = [
    { name: "Абонементы", type: "abon", emo: "📄" },
    { name: "Выступления", type: "perf", emo: "🎉" },
    { name: "Товары/прокат", type: "tovar", emo: "🛍" },
  ];
  const accByStream = (k: string) => accounts.find((a) => a.key === k)?.name || "—";

  return (
    <div className="card kassa">
      <style>{KASSA_CSS}</style>

      {/* sub-tabs */}
      <div className="k-sub">
        <button className={sub === "day" ? "on" : ""} onClick={() => setSub("day")}>Подтверждение дня</button>
        <button className={sub === "archive" ? "on" : ""} onClick={() => setSub("archive")}>Чеки и отчёты</button>
      </div>

      {err && <div className="k-err">⚠ {err}</div>}

      {sub === "day" && (
        <>
          {/* account cards */}
          <div className="k-label">Счета — деньги распределяются автоматически при подтверждении</div>
          <div className="k-accts">
            {accounts.length ? accounts.map((a) => (
              <div className="k-acc" key={a.key}>
                <div className="an">{a.key === "cash" ? "💵" : "💳"} {a.name}</div>
                <div className="av">{money(a.balance)}</div>
              </div>
            )) : <div className="hint" style={{ color: "var(--muted)" }}>Счета появятся после первой продажи.</div>}
          </div>

          {/* toolbar */}
          <div className="k-toolbar">
            <div className="k-datenav">
              <button onClick={() => setDate(shiftDay(date, -1))}>‹</button>
              <span>{date.split("-").reverse().join(".")}</span>
              <button onClick={() => setDate(shiftDay(date, 1))} disabled={date >= isoLocal(new Date())}>›</button>
            </div>
            <button className="k-ghost" onClick={load}>{loading ? "…" : "Обновить"}</button>
          </div>

          {/* verdict */}
          {items.length === 0 ? (
            <div className="k-verdict ok"><span className="i">📭</span><div><b>Поступлений за этот день нет</b><div className="s">Выберите другой день стрелками</div></div></div>
          ) : allDone ? (
            <div className="k-verdict ok"><span className="i">✅</span><div><b>Все поступления подтверждены</b><div className="s">Деньги разнесены по счетам</div></div></div>
          ) : (
            <div className="k-verdict warn"><span className="i">🕓</span><div><b>Ждут подтверждения: {pending.length}</b><div className="s">{noReceipt > 0 ? `Без чека: ${noReceipt}` : "Все с чеком — проверьте и подтвердите"}</div></div></div>
          )}

          {/* queue */}
          <div className="k-label">Поступления за день</div>
          <div className="k-list">
            {items.map((it) => {
              const st = it.status;
              return (
                <div className={"k-op " + st} key={it.type + it.id}>
                  <span className="emo">{it.emo}</span>
                  <div className="main">
                    <div className="who">{it.who} <span className="stream">· {it.stream}</span></div>
                    <div className="meta">
                      <span className="pm">{methodLabel[it.method] || it.method}</span>
                      <span className="toacc">→ {it.account}</span>
                      {it.attachmentUrl
                        ? <span className="file" onClick={() => setModal(it)}>📎 {it.attachmentName || "чек"}</span>
                        : <span className="nofile" onClick={() => onPickFile(it)}>📎 приложить чек</span>}
                    </div>
                  </div>
                  <div className="amt">
                    <div className="a">{money(it.amount)}</div>
                    {it.commission > 0 && <div className="comm">комиссия −{money(it.commission)}</div>}
                  </div>
                  <div className="act">
                    {st === "pending" && <>
                      <button className="rej" disabled={busy === it.id} onClick={() => setStatus(it, "rejected")}>Отклонить</button>
                      <button className="conf" disabled={busy === it.id} onClick={() => confirm(it)}>{busy === it.id ? "…" : "Подтвердить ✓"}</button>
                    </>}
                    {st === "confirmed" && <>
                      <span className="badge ok">✓ на «{it.account}»</span>
                      <span className="undo" onClick={() => setStatus(it, "pending")}>отменить</span>
                    </>}
                    {st === "rejected" && <>
                      <span className="badge rej">✕ отклонено</span>
                      <span className="undo" onClick={() => setStatus(it, "pending")}>вернуть</span>
                    </>}
                  </div>
                </div>
              );
            })}
            {items.length === 0 && !loading && <div className="hint" style={{ color: "var(--muted)", padding: 16 }}>Пусто.</div>}
          </div>

          {/* summary */}
          {items.length > 0 && (
            <div className="k-summary">
              <div className="k-sumhead">
                <b>Итог по подтверждённым</b>
                <div className="k-seg">
                  <button className={sumView === "stream" ? "on" : ""} onClick={() => setSumView("stream")}>По потокам → счета</button>
                  <button className={sumView === "pay" ? "on" : ""} onClick={() => setSumView("pay")}>По виду оплаты</button>
                </div>
              </div>
              <div className="k-prog">Подтверждено {confirmed.length} из {items.length}</div>
              {sumView === "stream" ? (
                <div className="k-arows">
                  {streams.map((s) => {
                    const list = confirmed.filter((i) => i.type === s.type);
                    const sum = list.reduce((a, i) => a + i.amount, 0);
                    const bez = list.filter((i) => i.method !== "cash").reduce((a, i) => a + i.amount, 0);
                    const nal = list.filter((i) => i.method === "cash").reduce((a, i) => a + i.amount, 0);
                    return (
                      <div className={"k-arow" + (sum === 0 ? " zero" : "")} key={s.type}>
                        <span className="e">{s.emo}</span>
                        <div className="l"><div className="n">{s.name}</div><div className="d">→ счёт «{accByStream(s.type)}»</div></div>
                        <div className="r"><div className="m">{money(sum)}</div><div className="sub">{sum === 0 ? "ждёт подтверждения" : `безнал ${money(bez)} · нал ${money(nal)}`}</div></div>
                      </div>
                    );
                  })}
                  <div className="k-note">💡 При подтверждении каждый поток уходит на свой счёт. Наличные — на «{accByStream("cash")}» (управляющей). Комиссия Kaspi 0.95% списывается отдельной строкой-расходом.</div>
                </div>
              ) : (() => {
                const commSum = confirmed.reduce((a, i) => a + i.commission, 0);
                const card = confirmed.filter((i) => i.method !== "cash").reduce((a, i) => a + i.amount, 0);
                const cash = confirmed.filter((i) => i.method === "cash").reduce((a, i) => a + i.amount, 0);
                return (
                  <div className="k-pay">
                    <div className="pr"><span>💳 Безнал (после комиссии {money(commSum)})</span><b>{money(card - commSum)}</b></div>
                    <div className="pr"><span>💵 Наличные — управляющей</span><b>{money(cash)}</b></div>
                    <div className="pr tot"><span>Итого выручка за день</span><b>{money(card + cash)}</b></div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {sub === "archive" && (
        <>
          <div className="k-label">Архив чеков и отчётов — всё, что приложила смена</div>
          <div className="k-arcfilter">
            {[["all", "Все"], ["card", "💳 Картой"], ["transfer", "🔁 Переводы"], ["cash", "💵 Наличные"]].map(([k, l]) => (
              <button key={k} className={arcFilter === k ? "on" : ""} onClick={() => setArcFilter(k)}>{l}</button>
            ))}
          </div>
          <div className="k-arctable">
            <div className="hd"><span>Дата</span><span>Файл</span><span>Кто</span><span>Поток</span><span className="r">Сумма</span><span>Статус</span></div>
            {receipts.filter((r) => arcFilter === "all" || (arcFilter === "card" ? (r.method === "card" || r.method === "kaspi") : r.method === arcFilter)).map((r) => (
              <div className="rw" key={r.type + r.id}>
                <span>{ddmm(r.date)}</span>
                <span className="fn" onClick={() => setModal({ ...r, emo: "", stream: r.stream } as any)}>📄 {r.attachmentName || "чек"}</span>
                <span className="tr">{r.who}</span>
                <span className="tr">{r.stream}</span>
                <span className="r">{money(r.amount)}</span>
                <span className={"st " + r.status}>{r.status === "confirmed" ? "✓" : r.status === "rejected" ? "✕" : "🕓"}</span>
              </div>
            ))}
            {receipts.length === 0 && <div className="hint" style={{ color: "var(--muted)", padding: 16 }}>Чеков пока нет.</div>}
          </div>
          <div className="k-note">Файлы хранятся всегда и привязаны к операции — можно открыть для налоговой или спора.</div>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onFile} />

      {modal && (
        <div className="k-modal" onClick={() => setModal(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sh"><span>📎 Чек</span><button onClick={() => setModal(null)}>×</button></div>
            <div className="body">
              {modal.attachmentUrl && String(modal.attachmentUrl).startsWith("data:image")
                ? <img src={modal.attachmentUrl} alt="чек" />
                : <div className="pdf"><div className="ic">📄</div><div>{modal.attachmentName || "Файл"}</div>
                    {modal.attachmentUrl && <a href={modal.attachmentUrl} download={modal.attachmentName || "receipt"}>Скачать</a>}</div>}
              <div className="det">
                <div><span>Поток</span><b>{modal.stream}</b></div>
                <div><span>Вид оплаты</span><b>{methodLabel[modal.method] || modal.method}</b></div>
                <div><span>Сумма</span><b>{money(modal.amount)}</b></div>
                {modal.commission > 0 && <div><span>Комиссия 0.95%</span><b>−{money(modal.commission)}</b></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const KASSA_CSS = `
.kassa .k-sub{ display:flex; gap:6px; margin-bottom:14px; }
.kassa .k-sub button{ background:var(--chip); border:1px solid var(--border-c); color:var(--muted); font:inherit; font-weight:600; font-size:13px; padding:8px 14px; border-radius:10px; cursor:pointer; }
.kassa .k-sub button.on{ background:var(--card); color:var(--ink); border-color:var(--ink); }
.kassa .k-err{ background:var(--red-soft); color:var(--red); border-radius:10px; padding:10px 12px; font-size:13px; margin-bottom:12px; }
.kassa .k-label{ font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:700; margin:18px 2px 8px; }
.kassa .k-accts{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
@media(max-width:640px){ .kassa .k-accts{ grid-template-columns:repeat(2,1fr);} }
.kassa .k-acc{ background:var(--panel); border:1px solid var(--border-c); border-radius:12px; padding:11px 12px; }
.kassa .k-acc .an{ font-size:12px; color:var(--muted); }
.kassa .k-acc .av{ font-size:16px; font-weight:800; margin-top:3px; color:var(--ink); font-variant-numeric:tabular-nums; }
.kassa .k-toolbar{ display:flex; align-items:center; gap:10px; margin:14px 0; }
.kassa .k-datenav{ display:inline-flex; align-items:center; gap:2px; background:var(--card); border:1px solid var(--border-c); border-radius:10px; padding:3px; }
.kassa .k-datenav button{ width:30px; height:30px; border:0; background:none; color:var(--ink); font-size:16px; cursor:pointer; border-radius:7px; }
.kassa .k-datenav button:hover:not(:disabled){ background:var(--hover); }
.kassa .k-datenav button:disabled{ color:var(--faint); cursor:default; }
.kassa .k-datenav span{ min-width:110px; text-align:center; font-weight:700; font-size:13.5px; font-variant-numeric:tabular-nums; }
.kassa .k-ghost{ background:var(--chip); border:1px solid var(--border-c); color:var(--ink); font:inherit; font-weight:600; font-size:13px; padding:8px 13px; border-radius:10px; cursor:pointer; }
.kassa .k-verdict{ display:flex; align-items:center; gap:12px; border-radius:12px; padding:13px 15px; border:1px solid transparent; }
.kassa .k-verdict .i{ font-size:22px; }
.kassa .k-verdict b{ font-size:15px; }
.kassa .k-verdict .s{ font-size:12.5px; opacity:.85; margin-top:1px; }
.kassa .k-verdict.ok{ background:var(--green-soft); color:var(--green); }
.kassa .k-verdict.warn{ background:var(--amber-soft); color:var(--amber); }
.kassa .k-list{ display:flex; flex-direction:column; gap:9px; }
.kassa .k-op{ display:flex; align-items:center; gap:12px; background:var(--card); border:1px solid var(--border-c); border-radius:12px; padding:12px 14px; border-left:4px solid var(--amber); flex-wrap:wrap; }
.kassa .k-op.confirmed{ border-left-color:var(--green); }
.kassa .k-op.rejected{ border-left-color:var(--red); opacity:.7; }
.kassa .k-op .emo{ font-size:19px; }
.kassa .k-op .main{ flex:1 1 180px; min-width:0; }
.kassa .k-op .who{ font-weight:700; font-size:14px; }
.kassa .k-op .who .stream{ color:var(--muted); font-weight:500; }
.kassa .k-op .meta{ font-size:12px; color:var(--muted); margin-top:3px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.kassa .k-op .meta .pm{ background:var(--chip); border:1px solid var(--border-c); border-radius:20px; padding:2px 8px; color:var(--ink); font-weight:600; }
.kassa .k-op .meta .toacc{ color:var(--blue-ink,var(--blue)); font-weight:600; }
.kassa .k-op .meta .file{ color:var(--blue-ink,var(--blue)); font-weight:600; cursor:pointer; }
.kassa .k-op .meta .file:hover{ text-decoration:underline; }
.kassa .k-op .meta .nofile{ color:var(--amber); font-weight:600; cursor:pointer; }
.kassa .k-op .amt{ text-align:right; }
.kassa .k-op .amt .a{ font-weight:800; font-size:16px; color:var(--ink); font-variant-numeric:tabular-nums; }
.kassa .k-op .amt .comm{ font-size:11px; color:var(--muted); margin-top:2px; }
.kassa .k-op .act{ display:flex; align-items:center; gap:8px; }
.kassa .k-op .act button{ font:inherit; font-weight:700; font-size:13px; padding:8px 13px; border-radius:9px; cursor:pointer; border:1px solid transparent; }
.kassa .k-op .act .conf{ background:var(--green); color:#fff; }
.kassa .k-op .act .rej{ background:transparent; border-color:var(--border-c); color:var(--muted); }
.kassa .k-op .act button:disabled{ opacity:.5; cursor:default; }
.kassa .badge{ font-size:12px; font-weight:700; padding:6px 11px; border-radius:20px; }
.kassa .badge.ok{ background:var(--green-soft); color:var(--green); }
.kassa .badge.rej{ background:var(--red-soft); color:var(--red); }
.kassa .undo{ font-size:12px; color:var(--muted); cursor:pointer; text-decoration:underline; }
.kassa .k-summary{ background:var(--panel); border:1px solid var(--border-c); border-radius:12px; padding:14px 16px; margin-top:18px; }
.kassa .k-sumhead{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.kassa .k-sumhead b{ font-size:14px; }
.kassa .k-seg{ margin-left:auto; display:inline-flex; background:var(--chip); border:1px solid var(--border-c); border-radius:9px; padding:3px; }
.kassa .k-seg button{ border:0; background:none; font:inherit; font-weight:600; font-size:12px; color:var(--muted); padding:6px 11px; border-radius:6px; cursor:pointer; }
.kassa .k-seg button.on{ background:var(--card); color:var(--ink); }
.kassa .k-prog{ font-size:12.5px; color:var(--muted); margin:8px 0 10px; }
.kassa .k-arow{ display:flex; align-items:center; gap:12px; padding:10px 0; border-top:1px solid var(--row-border,var(--line)); }
.kassa .k-arow .e{ font-size:17px; }
.kassa .k-arow .l .n{ font-weight:700; font-size:14px; }
.kassa .k-arow .l .d{ font-size:12px; color:var(--blue-ink,var(--blue)); font-weight:600; margin-top:1px; }
.kassa .k-arow .r{ margin-left:auto; text-align:right; }
.kassa .k-arow .r .m{ font-weight:800; font-size:15px; color:var(--ink); font-variant-numeric:tabular-nums; }
.kassa .k-arow .r .sub{ font-size:11.5px; color:var(--muted); margin-top:1px; }
.kassa .k-arow.zero .r .m{ color:var(--faint); }
.kassa .k-note{ background:var(--blue-soft); color:var(--blue-ink,var(--blue)); border-radius:10px; padding:11px 13px; font-size:12.5px; margin-top:12px; line-height:1.5; }
.kassa .k-pay .pr{ display:flex; align-items:center; padding:9px 0; border-top:1px solid var(--row-border,var(--line)); font-size:14px; }
.kassa .k-pay .pr b{ margin-left:auto; font-variant-numeric:tabular-nums; }
.kassa .k-pay .pr span{ color:var(--muted); }
.kassa .k-pay .pr.tot span,.kassa .k-pay .pr.tot b{ color:var(--ink); font-weight:800; }
.kassa .k-arcfilter{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
.kassa .k-arcfilter button{ font:inherit; font-weight:600; font-size:12.5px; padding:6px 12px; border-radius:20px; border:1px solid var(--border-c); background:var(--card); color:var(--muted); cursor:pointer; }
.kassa .k-arcfilter button.on{ background:var(--blue-soft); color:var(--blue-ink,var(--blue)); border-color:transparent; }
.kassa .k-arctable{ border:1px solid var(--border-c); border-radius:12px; overflow:hidden; }
.kassa .k-arctable .hd,.kassa .k-arctable .rw{ display:grid; grid-template-columns:56px 1.6fr 1.2fr 1fr .8fr 50px; gap:8px; padding:10px 13px; align-items:center; font-size:13px; }
.kassa .k-arctable .hd{ background:var(--panel); color:var(--muted); font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; font-weight:700; }
.kassa .k-arctable .rw{ border-top:1px solid var(--row-border,var(--line)); }
.kassa .k-arctable .fn{ color:var(--blue-ink,var(--blue)); font-weight:600; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kassa .k-arctable .tr{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kassa .k-arctable .r{ text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
.kassa .k-arctable .st.confirmed{ color:var(--green); }
.kassa .k-arctable .st.rejected{ color:var(--red); }
.kassa .k-modal{ position:fixed; inset:0; background:rgba(10,18,15,.55); display:flex; align-items:center; justify-content:center; z-index:80; padding:18px; }
.kassa .k-modal .sheet{ background:var(--card); border:1px solid var(--border-c); border-radius:14px; max-width:380px; width:100%; overflow:hidden; }
.kassa .k-modal .sh{ display:flex; align-items:center; padding:13px 15px; border-bottom:1px solid var(--border-c); font-weight:700; }
.kassa .k-modal .sh button{ margin-left:auto; border:0; background:none; font-size:20px; color:var(--muted); cursor:pointer; }
.kassa .k-modal .body{ padding:16px; }
.kassa .k-modal .body img{ max-width:100%; border-radius:10px; display:block; margin:0 auto; }
.kassa .k-modal .pdf{ text-align:center; padding:14px; }
.kassa .k-modal .pdf .ic{ font-size:38px; }
.kassa .k-modal .pdf a{ display:inline-block; margin-top:8px; color:var(--blue-ink,var(--blue)); font-weight:600; }
.kassa .k-modal .det{ margin-top:14px; background:var(--panel); border-radius:10px; padding:12px; font-size:13px; }
.kassa .k-modal .det div{ display:flex; justify-content:space-between; padding:3px 0; }
.kassa .k-modal .det span{ color:var(--muted); }
`;
