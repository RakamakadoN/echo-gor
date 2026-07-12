import React, { useState } from "react";
import { SubscriptionPlan } from "../types";

// Управление тарифами абонементов (subscription_plans): название, кол-во занятий,
// срок в днях и цена. Самодостаточный компонент — используется в кабинете владельца
// (и может переиспользоваться в других кабинетах). Без внешних зависимостей, чтобы
// не создавать циклических импортов между воркспейсами.
const fmtTenge = (n: number) => `${new Intl.NumberFormat("ru-RU").format(Math.round(Number(n) || 0))} ₸`;

export function SubscriptionPlansManager({
  plans,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
}: {
  plans?: SubscriptionPlan[];
  onCreatePlan?: (data: any) => Promise<boolean>;
  onUpdatePlan?: (id: string, data: any) => Promise<boolean>;
  onDeletePlan?: (id: string) => Promise<boolean>;
}) {
  const canManage = Boolean(onCreatePlan);
  const emptyForm = { name: "", lessonsCount: "", durationDays: "", price: "", billingMode: "month" as "month" | "lessons", format: "group" as "group" | "individual" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const list: SubscriptionPlan[] = plans || [];

  const save = async () => {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      lessonsCount: Number(form.lessonsCount) || 0,
      durationDays: Number(form.durationDays) || 30,
      price: Number(form.price) || 0,
      billingMode: form.billingMode,
      format: form.format,
    };
    const ok = editingId ? await onUpdatePlan?.(editingId, data) : await onCreatePlan?.(data);
    if (ok) { setForm(emptyForm); setEditingId(null); }
  };
  const edit = (p: SubscriptionPlan) => {
    setEditingId(p.id);
    setForm({ name: p.name, lessonsCount: String(p.lessonsCount), durationDays: String(p.durationDays), price: String(p.price), billingMode: p.billingMode === "lessons" ? "lessons" : "month", format: p.format === "individual" ? "individual" : "group" });
  };
  const cancel = () => { setEditingId(null); setForm(emptyForm); };

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#141414] to-black p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Тарифы абонементов</h3>
        <span className="text-xs text-slate-500">{list.length} в справочнике</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Настройте тарифы: название, число занятий, срок и стоимость. Они появятся при продаже абонемента ученику.</p>

      {canManage && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_auto] sm:items-end">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Название" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <input type="number" value={form.lessonsCount} onChange={(e) => setForm((f) => ({ ...f, lessonsCount: e.target.value }))} placeholder="Занятий" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <input type="number" value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))} placeholder="Дней" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="Цена ₸" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-slate-600" />
          <select
            value={form.format}
            onChange={(e) => {
              const format = e.target.value as "group" | "individual";
              // Индивидуальный тариф всегда «по количеству занятий» (ТЗ).
              setForm((f) => ({ ...f, format, billingMode: format === "individual" ? "lessons" : f.billingMode }));
            }}
            title="Групповой тариф продаётся в группу; индивидуальный — без группы."
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"
          >
            <option value="group">Групповой</option>
            <option value="individual">Индивидуальный</option>
          </select>
          <select
            value={form.billingMode}
            onChange={(e) => setForm((f) => ({ ...f, billingMode: e.target.value as "month" | "lessons" }))}
            title="Месячный: в абонемент входят все занятия календарного месяца без доплаты. По количеству: строго число занятий тарифа (индивидуальные)."
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"
          >
            <option value="month">На месяц (все занятия)</option>
            <option value="lessons">По количеству занятий</option>
          </select>
          <div className="flex gap-2">
            <button onClick={save} disabled={!form.name.trim()} className="flex-1 rounded-xl bg-[#C5A059] px-3 py-2 text-sm font-black text-black hover:bg-[#D4AF70] disabled:opacity-40">{editingId ? "Сохранить" : "Добавить"}</button>
            {editingId && <button onClick={cancel} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 hover:text-white">Отмена</button>}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {list.length === 0 && <p className="text-xs text-slate-500">Тарифов пока нет — добавьте первый выше.</p>}
        {list.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{p.name}</p>
              <p className="text-xs text-slate-500">{p.format === "individual" ? "индивидуальный" : "групповой"} · {p.billingMode === "lessons" ? `строго ${p.lessonsCount} занятий` : "месячный (все занятия месяца)"} · {p.durationDays} дн. · {fmtTenge(p.price)}{p.status !== "active" ? " · архив" : ""}</p>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-2">
                <button onClick={() => edit(p)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10">Изм.</button>
                <button onClick={() => onDeletePlan?.(p.id)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-white/10">Удалить</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
