/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusSettings — редактор статусов для владельца.
 * Переименование и перекраска базовых статусов (KPI + воронка) и управление
 * списком ручных статусов. Сохраняется в localStorage через statusConfig.
 */
import React, { useState } from "react";
import { X, Plus, Trash2, RotateCcw } from "lucide-react";
import {
  STATUS_TONES,
  loadStatusConfig,
  saveStatusConfig,
  getManualStatuses,
  StatusTone,
} from "../statusConfig";

export default function StatusSettings({ onClose, roleHeader = "owner" }: { onClose: () => void; roleHeader?: string }) {
  const initial = loadStatusConfig();
  const [labels, setLabels] = useState<Record<string, string>>(initial.labels || {});
  const [tones, setTones] = useState<Record<string, StatusTone>>(initial.tones || {});
  // Ручные статусы: помним исходное имя строки, чтобы при переименовании
  // перенести привязанный цвет (tones ключуется текстом статуса).
  const [manual, setManual] = useState<{ name: string; initialName: string }[]>(
    getManualStatuses().map((s) => ({ name: s, initialName: s }))
  );

  const setTone = (key: string, t: StatusTone) => setTones((m) => ({ ...m, [key]: t }));
  // «Был на пробном, оплатит» — системный ручной статус: на него завязана логика
  // промиса оплаты (regex /оплат/), переименовывать и удалять нельзя.
  const isProtectedManual = (name: string) => name.trim() === "Был на пробном, оплатит";

  const save = () => {
    const cleanLabels: Record<string, string> = {};
    Object.entries(labels).forEach(([k, v]) => {
      const s = String(v ?? "").trim();
      if (s) cleanLabels[k] = s;
    });
    // Перенос цвета при переименовании: tones[старое имя] → tones[новое имя].
    const nextTones = { ...tones };
    for (const row of manual) {
      const name = row.name.trim();
      if (!name || !row.initialName || name === row.initialName) continue;
      if (nextTones[row.initialName] && !nextTones[name]) {
        nextTones[name] = nextTones[row.initialName];
        delete nextTones[row.initialName];
      }
    }
    const cleanManual = manual.map((r) => r.name.trim()).filter(Boolean);
    // Пустой список сохраняется как есть: manualSet в saveStatusConfig помечает
    // «удалили все статусы сознательно», дефолты не вернутся.
    saveStatusConfig({ labels: cleanLabels, tones: nextTones, manual: cleanManual }, roleHeader);
    onClose();
  };

  // Авто-статусы (ТЗ заказчика): название системное и НЕ редактируется — можно
  // менять только ЦВЕТ. Один статус = ОДНА строка: цвет применяется сразу ко всем
  // местам (KPI-плитка, воронка, пилюля в списке, дашборд) через группу ключей.
  const Row = ({ item }: { item: { keys: string[]; label: string; tone: StatusTone } }) => {
    const curTone = item.keys.map((k) => tones[k]).find(Boolean) || item.tone;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <span className="min-w-[160px] flex-1 px-1 text-sm font-semibold text-slate-700">{item.label}</span>
        <div className="flex items-center gap-1.5">
          {STATUS_TONES.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => setTones((m) => { const next = { ...m }; for (const k of item.keys) next[k] = t.id; return next; })}
              className={`h-6 w-6 rounded-full border-2 transition ${curTone === t.id ? "border-slate-800" : "border-transparent"}`}
              style={{ background: t.swatch }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Единый список авто-статусов без повторов — ТОЛЬКО те, что система реально
  // присваивает сама (сверено с getStudentState/SEGMENTS, ТЗ 2026-07-12).
  // «Каникулы», «Замороженный абонемент» и прочее — РУЧНЫЕ статусы (секция ниже),
  // их можно добавлять и удалять. keys — все места, куда применяется цвет.
  const COMBINED_STATUSES: { keys: string[]; label: string; tone: StatusTone }[] = [
    { keys: ["total"], label: "Всего учеников", tone: "gray" },
    { keys: ["lead"], label: "Новый лид", tone: "purple" },
    { keys: ["trial", "funnel:trial"], label: "Записан на пробный", tone: "blue" },
    { keys: ["trial_missed", "funnel:trial_missed"], label: "Не пришёл на пробный", tone: "red" },
    { keys: ["trial_rebooked", "funnel:trial_rebooked"], label: "Перезаписан на пробный", tone: "orange" },
    { keys: ["trial_lost", "funnel:trial_lost"], label: "Был на пробном, не купил", tone: "orange" },
    { keys: ["visitor_new", "funnel:visitor_new"], label: "Купили абонемент (новый посетитель)", tone: "green" },
    { keys: ["new"], label: "Новый ученик (первый месяц)", tone: "blue" },
    { keys: ["active"], label: "Активные / Постоянный ученик", tone: "green" },
    { keys: ["next_paid"], label: "Куплен следующий месяц", tone: "green" },
    { keys: ["renewal", "debt_current"], label: "Не оплачен текущий месяц", tone: "orange" },
    { keys: ["prev_unpaid", "debt_prev"], label: "Не оплачен прошлый месяц", tone: "red" },
    { keys: ["not_renewed"], label: "Не продлил абонемент", tone: "red" },
    { keys: ["debtors"], label: "Должники", tone: "red" },
    { keys: ["partially_paid"], label: "Частично оплачено (группа/индивид.)", tone: "orange" },
    { keys: ["waitlist"], label: "Лист ожидания", tone: "purple" },
    { keys: ["returned"], label: "Вернувшийся ученик", tone: "purple" },
    { keys: ["left"], label: "Ушли в этом месяце", tone: "red" },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-slate-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Настройки</p>
            <h3 className="text-lg font-black text-slate-900">Статусы учеников</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Авто-статусы системы</p>
            <p className="mb-2 text-[11px] text-slate-400">Система считает их сама. Названия не редактируются — настраивается только цвет; он применяется везде: KPI-плитки, воронка, список учеников, дашборд.</p>
            <div className="space-y-2">
              {COMBINED_STATUSES.map((it) => (
                <Row key={it.keys[0]} item={it} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ручные статусы</p>
              <button
                onClick={() => setManual((m) => [...m, { name: "", initialName: "" }])}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5" /> Добавить
              </button>
            </div>
            <div className="space-y-2">
              {manual.map((row, i) => {
                const curTone = tones[row.name] || tones[row.initialName] || "gray";
                const locked = isProtectedManual(row.initialName);
                return (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  {locked ? (
                    <span className="min-w-[160px] flex-1 px-1 text-sm font-semibold text-slate-700" title="Системный статус: на него завязана логика оплаты, переименовать нельзя">
                      {row.name} <span className="text-[10px] font-bold text-slate-400">· системный</span>
                    </span>
                  ) : (
                    <input
                      value={row.name}
                      onChange={(e) => setManual((m) => m.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      placeholder="Название статуса"
                      className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                    />
                  )}
                  <div className="flex items-center gap-1.5">
                    {STATUS_TONES.map((t) => (
                      <button key={t.id} title={t.label} onClick={() => row.name.trim() && setTone(row.name.trim(), t.id)}
                        className={`h-6 w-6 rounded-full border-2 transition ${curTone === t.id ? "border-slate-800" : "border-transparent"}`}
                        style={{ background: t.swatch }} />
                    ))}
                  </div>
                  {!locked && (
                    <button
                      onClick={() => setManual((m) => m.filter((_, j) => j !== i))}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                );
              })}
              {manual.length === 0 && <p className="text-sm text-slate-400">Список пуст — можно сохранить и без ручных статусов.</p>}
              <p className="text-[11px] text-slate-400">Переименование статуса не меняет его у уже отмеченных учеников — им нужно выставить новый статус заново.</p>
            </div>
          </section>

        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <button
            onClick={() => {
              setLabels({});
              setTones({});
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:text-rose-600"
          >
            <RotateCcw className="h-4 w-4" /> Сбросить цвета
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
            >
              Отмена
            </button>
            <button
              onClick={save}
              className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-white hover:bg-amber-600"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
