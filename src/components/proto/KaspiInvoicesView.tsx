import { useCallback, useEffect, useMemo, useState } from "react";

/* ===== «СЧЕТА KASPI» — выставление счетов ученикам через ApiPay =====
   СРМ — источник правды: кому/сколько/когда. Счёт уходит push-ем в Kaspi;
   после оплаты вебхук сам создаёт оплату (метод Kaspi) → очередь «Касса». */

const H = { "x-demo-role": "owner" } as const;
const HJ = { "Content-Type": "application/json", "x-demo-role": "owner" } as const;
const money = (n: number) => Math.round(n || 0).toLocaleString("ru-RU") + " ₸";
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

const STATUS: Record<string, { label: string; cls: string }> = {
  processing: { label: "🕓 создаётся", cls: "wait" },
  pending: { label: "⏳ ждёт оплаты", cls: "wait" },
  paid: { label: "✓ оплачен", cls: "ok" },
  cancelled: { label: "✕ отменён", cls: "off" },
  expired: { label: "⌛ истёк (24ч)", cls: "off" },
  error: { label: "⚠ ошибка", cls: "err" },
  partially_refunded: { label: "↩ част. возврат", cls: "off" },
};

type Inv = {
  id: string; apipay_invoice_id: string | null; student_id: string | null; student_name: string;
  phone: string; amount: number; description: string | null; status: string; error: string | null;
  sold_by_name: string | null; created_at: string; paid_at: string | null; payment_id: string | null;
};
type Stu = { id: string; branchId: string; name: string; phone: string | null };

export function KaspiInvoicesView() {
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [students, setStudents] = useState<Stu[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Stu | null>(null);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/mvp/apipay/invoices", { headers: H });
      const j = r.ok ? await r.json() : {};
      if (!r.ok) setErr(j.error || "Не удалось загрузить счета");
      setInvoices(j.invoices || []);
    } catch { setErr("Сервер недоступен"); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  // Пока есть неоплаченные счета — тихо обновляем раз в 15 сек, чтобы оплата «прилетела» сама.
  useEffect(() => {
    if (!invoices.some((i) => i.status === "pending" || i.status === "processing")) return;
    const t = setInterval(async () => {
      try { const r = await fetch("/api/mvp/apipay/invoices", { headers: H }); if (r.ok) setInvoices((await r.json()).invoices || []); } catch { /**/ }
    }, 15000);
    return () => clearInterval(t);
  }, [invoices]);

  const openForm = async () => {
    setShowForm(true); setPick(null); setQ(""); setAmount(""); setComment("");
    if (!students.length) {
      try { const r = await fetch("/api/mvp/apipay/students", { headers: H }); if (r.ok) setStudents((await r.json()).students || []); } catch { /**/ }
    }
  };

  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return students.slice(0, 8);
    return students.filter((x) => x.name.toLowerCase().includes(s)).slice(0, 8);
  }, [q, students]);

  const send = async () => {
    if (!pick || !Number(amount)) return;
    setBusy("send"); setErr("");
    try {
      const r = await fetch("/api/mvp/apipay/invoice", {
        method: "POST", headers: HJ,
        body: JSON.stringify({ studentId: pick.id, branchId: pick.branchId, amount: Number(amount), description: comment || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error || "Счёт не выставлен");
      else { setShowForm(false); await load(); }
    } catch { setErr("Сервер недоступен"); }
    setBusy(null);
  };

  const act = async (url: string, key: string) => {
    setBusy(key); setErr("");
    try {
      const r = await fetch(url, { method: "POST", headers: HJ, body: "{}" });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || "Ошибка операции"); }
      else await load();
    } catch { setErr("Сервер недоступен"); }
    setBusy(null);
  };

  const waiting = invoices.filter((i) => i.status === "pending" || i.status === "processing");
  const paidToday = invoices.filter((i) => i.status === "paid" && String(i.paid_at || "").slice(0, 10) === new Date().toISOString().slice(0, 10));

  return (
    <div className="card kaspi-inv">
      <style>{CSS}</style>

      <div className="ki-head">
        <div>
          <b>Счета Kaspi</b>
          <div className="s">Счёт уходит push-уведомлением в Kaspi ученика. После оплаты запись сама появляется в «Кассе».</div>
        </div>
        <button className="ki-new" onClick={openForm}>+ Выставить счёт</button>
        <button className="ki-ghost" onClick={load}>{loading ? "…" : "Обновить"}</button>
      </div>

      {err && <div className="ki-err">⚠ {err}</div>}

      <div className="ki-stats">
        <div className="st"><span>Ждут оплаты</span><b>{waiting.length} · {money(waiting.reduce((a, i) => a + Number(i.amount), 0))}</b></div>
        <div className="st"><span>Оплачено сегодня</span><b>{paidToday.length} · {money(paidToday.reduce((a, i) => a + Number(i.amount), 0))}</b></div>
      </div>

      <div className="ki-table">
        <div className="hd"><span>Создан</span><span>Ученик</span><span>Телефон</span><span className="r">Сумма</span><span>Статус</span><span></span></div>
        {invoices.map((i) => {
          const st = STATUS[i.status] || { label: i.status, cls: "off" };
          const cancellable = i.status === "pending" || i.status === "processing";
          return (
            <div className="rw" key={i.id}>
              <span className="mut">{dt(i.created_at)}</span>
              <span className="nm">{i.student_name}{i.description ? <em> · {i.description}</em> : null}</span>
              <span className="mut">{i.phone}</span>
              <span className="r">{money(Number(i.amount))}</span>
              <span className={"st " + st.cls} title={i.error || (i.paid_at ? "Оплачен " + dt(i.paid_at) : "")}>{st.label}</span>
              <span className="acts">
                {cancellable && <button className="mini" disabled={busy === i.id} onClick={() => act(`/api/mvp/apipay/invoice/${i.id}/cancel`, i.id)}>отменить</button>}
                {cancellable && <button className="mini test" disabled={busy === "sim" + i.id} title="Только песочница: эмулировать оплату" onClick={() => act(`/api/mvp/apipay/invoice/${i.id}/simulate`, "sim" + i.id)}>🧪 тест-оплата</button>}
              </span>
            </div>
          );
        })}
        {invoices.length === 0 && !loading && (
          <div className="hint" style={{ color: "var(--muted)", padding: 18 }}>
            Счетов пока нет. Нажмите «Выставить счёт» — ученику придёт push в Kaspi.
          </div>
        )}
      </div>

      <div className="ki-note">💡 Счёт живёт 24 часа. Комиссия Kaspi 0.95% на эквайринге будет списана отдельной строкой при подтверждении в «Кассе». Кнопка «тест-оплата» работает, пока ApiPay в режиме песочницы, — на боевом режиме она исчезнет из процесса: платить будут настоящие ученики.</div>

      {showForm && (
        <div className="ki-modal" onClick={() => setShowForm(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sh"><span>Выставить счёт Kaspi</span><button onClick={() => setShowForm(false)}>×</button></div>
            <div className="body">
              {!pick ? (
                <>
                  <input className="ki-input" autoFocus placeholder="Найти ученика по фамилии…" value={q} onChange={(e) => setQ(e.target.value)} />
                  <div className="ki-found">
                    {found.map((s) => (
                      <button key={s.id} className="ki-stu" onClick={() => setPick(s)}>
                        <span>{s.name}</span>
                        <em>{s.phone || "нет телефона!"}</em>
                      </button>
                    ))}
                    {students.length === 0 && <div className="hint" style={{ color: "var(--muted)", padding: 10 }}>Загружаю учеников…</div>}
                  </div>
                </>
              ) : (
                <>
                  <div className="ki-picked">
                    <b>{pick.name}</b> <span className="mut">{pick.phone || "⚠ нет телефона"}</span>
                    <button className="mini" onClick={() => setPick(null)}>сменить</button>
                  </div>
                  <input className="ki-input" type="number" min={100} max={1000000} placeholder="Сумма, ₸ (например 25000)" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <input className="ki-input" placeholder="Комментарий (виден вам, необязателен)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  {!pick.phone && <div className="ki-err">У ученика нет телефона в карточке — счёт выставить не получится. Добавьте номер в карточку ученика.</div>}
                  <button className="ki-send" disabled={!pick.phone || !Number(amount) || busy === "send"} onClick={send}>
                    {busy === "send" ? "Отправляю…" : `Отправить счёт ${Number(amount) ? "на " + money(Number(amount)) : ""}`}
                  </button>
                  <div className="ki-note" style={{ marginTop: 10 }}>Ученику придёт push в приложении Kaspi с кнопкой «Оплатить». Деньги упадут напрямую на ваш Kaspi Pay.</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.kaspi-inv .ki-head{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
.kaspi-inv .ki-head b{ font-size:16px; }
.kaspi-inv .ki-head .s{ font-size:12.5px; color:var(--muted); margin-top:2px; max-width:520px; }
.kaspi-inv .ki-new{ margin-left:auto; background:var(--green); color:#fff; border:0; font:inherit; font-weight:700; font-size:13.5px; padding:9px 15px; border-radius:10px; cursor:pointer; }
.kaspi-inv .ki-ghost{ background:var(--chip); border:1px solid var(--border-c); color:var(--ink); font:inherit; font-weight:600; font-size:13px; padding:8px 13px; border-radius:10px; cursor:pointer; }
.kaspi-inv .ki-err{ background:var(--red-soft); color:var(--red); border-radius:10px; padding:10px 12px; font-size:13px; margin:10px 0; }
.kaspi-inv .ki-stats{ display:grid; grid-template-columns:repeat(2,minmax(140px,240px)); gap:10px; margin-bottom:14px; }
.kaspi-inv .ki-stats .st{ background:var(--panel); border:1px solid var(--border-c); border-radius:12px; padding:11px 12px; }
.kaspi-inv .ki-stats .st span{ font-size:12px; color:var(--muted); display:block; }
.kaspi-inv .ki-stats .st b{ font-size:15px; margin-top:3px; display:block; font-variant-numeric:tabular-nums; }
.kaspi-inv .ki-table{ border:1px solid var(--border-c); border-radius:12px; overflow:hidden; }
.kaspi-inv .ki-table .hd,.kaspi-inv .ki-table .rw{ display:grid; grid-template-columns:88px 1.7fr 1fr .9fr 1.1fr 1.3fr; gap:8px; padding:10px 13px; align-items:center; font-size:13px; }
@media(max-width:760px){ .kaspi-inv .ki-table .hd,.kaspi-inv .ki-table .rw{ grid-template-columns:70px 1.4fr .9fr 1fr; } .kaspi-inv .ki-table .hd span:nth-child(3),.kaspi-inv .ki-table .rw>span:nth-child(3){ display:none; } .kaspi-inv .ki-table .hd span:last-child,.kaspi-inv .ki-table .rw .acts{ display:none; } }
.kaspi-inv .ki-table .hd{ background:var(--panel); color:var(--muted); font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; font-weight:700; }
.kaspi-inv .ki-table .rw{ border-top:1px solid var(--row-border,var(--line)); }
.kaspi-inv .ki-table .nm{ font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.kaspi-inv .ki-table .nm em{ color:var(--muted); font-weight:500; font-style:normal; }
.kaspi-inv .ki-table .mut{ color:var(--muted); }
.kaspi-inv .ki-table .r{ text-align:right; font-weight:800; font-variant-numeric:tabular-nums; }
.kaspi-inv .ki-table .st{ font-weight:700; font-size:12.5px; }
.kaspi-inv .ki-table .st.ok{ color:var(--green); }
.kaspi-inv .ki-table .st.wait{ color:var(--amber); }
.kaspi-inv .ki-table .st.err{ color:var(--red); }
.kaspi-inv .ki-table .st.off{ color:var(--faint); }
.kaspi-inv .acts{ display:flex; gap:6px; justify-content:flex-end; }
.kaspi-inv .mini{ font:inherit; font-size:11.5px; font-weight:600; color:var(--muted); background:var(--chip); border:1px solid var(--border-c); border-radius:8px; padding:4px 9px; cursor:pointer; white-space:nowrap; }
.kaspi-inv .mini.test{ color:var(--blue-ink,var(--blue)); }
.kaspi-inv .mini:disabled{ opacity:.5; cursor:default; }
.kaspi-inv .ki-note{ background:var(--blue-soft); color:var(--blue-ink,var(--blue)); border-radius:10px; padding:11px 13px; font-size:12.5px; margin-top:12px; line-height:1.5; }
.kaspi-inv .ki-modal{ position:fixed; inset:0; background:rgba(10,18,15,.55); display:flex; align-items:center; justify-content:center; z-index:80; padding:18px; }
.kaspi-inv .ki-modal .sheet{ background:var(--card); border:1px solid var(--border-c); border-radius:14px; max-width:420px; width:100%; overflow:hidden; }
.kaspi-inv .ki-modal .sh{ display:flex; align-items:center; padding:13px 15px; border-bottom:1px solid var(--border-c); font-weight:700; }
.kaspi-inv .ki-modal .sh button{ margin-left:auto; border:0; background:none; font-size:20px; color:var(--muted); cursor:pointer; }
.kaspi-inv .ki-modal .body{ padding:16px; }
.kaspi-inv .ki-input{ width:100%; font:inherit; font-size:14px; padding:10px 12px; border:1px solid var(--border-c); border-radius:10px; background:var(--panel); color:var(--ink); margin-bottom:10px; box-sizing:border-box; }
.kaspi-inv .ki-found{ display:flex; flex-direction:column; gap:6px; max-height:280px; overflow:auto; }
.kaspi-inv .ki-stu{ display:flex; align-items:center; justify-content:space-between; gap:10px; font:inherit; font-size:13.5px; font-weight:600; text-align:left; padding:10px 12px; background:var(--panel); border:1px solid var(--border-c); border-radius:10px; cursor:pointer; color:var(--ink); }
.kaspi-inv .ki-stu:hover{ border-color:var(--ink); }
.kaspi-inv .ki-stu em{ font-style:normal; color:var(--muted); font-weight:500; font-size:12px; }
.kaspi-inv .ki-picked{ display:flex; align-items:center; gap:10px; margin-bottom:12px; font-size:14px; }
.kaspi-inv .ki-picked .mut{ color:var(--muted); font-size:12.5px; }
.kaspi-inv .ki-send{ width:100%; background:var(--green); color:#fff; border:0; font:inherit; font-weight:700; font-size:14px; padding:12px; border-radius:10px; cursor:pointer; }
.kaspi-inv .ki-send:disabled{ opacity:.5; cursor:default; }
`;
