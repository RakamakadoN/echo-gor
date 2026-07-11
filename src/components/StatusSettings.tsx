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
  BASE_KPI_STATUSES,
  BASE_FUNNEL_STATUSES,
  AUTO_STATUS_LIST,
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

  const setLabel = (key: string, v: string) => setLabels((m) => ({ ...m, [key]: v }));
  const setTone = (key: string, t: StatusTone) => setTones((m) => ({ ...m, [key]: t }));

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

  const Row = ({ item }: { item: { key: string; label: string; tone: StatusTone } }) => {
    const curTone = tones[item.key] || item.tone;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <input
          value={labels[item.key] ?? ""}
          onChange={(e) => setLabel(item.key, e.target.value)}
          placeholder={item.label}
          className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
        />
        <div className="flex items-center gap-1.5">
          {STATUS_TONES.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => setTone(item.key, t.id)}
              className={`h-6 w-6 rounded-full border-2 transition ${curTone === t.id ? "border-slate-800" : "border-transparent"}`}
              style={{ background: t.swatch }}
            />
          ))}
        </div>
      </div>
    );
  };

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
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Основные показатели</p>
            <div className="space-y-2">
              {BASE_KPI_STATUSES.map((it) => (
                <Row key={it.key} item={it} />
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Воронка продаж</p>
            <div className="space-y-2">
              {BASE_FUNNEL_STATUSES.map((it) => (
                <Row key={it.key} item={it} />
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
                return (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <input
                    value={row.name}
                    onChange={(e) => setManual((m) => m.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Название статуса"
                    className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                  />
                  <div className="flex items-center gap-1.5">
                    {STATUS_TONES.map((t) => (
                      <button key={t.id} title={t.label} onClick={() => row.name.trim() && setTone(row.name.trim(), t.id)}
                        className={`h-6 w-6 rounded-full border-2 transition ${curTone === t.id ? "border-slate-800" : "border-transparent"}`}
                        style={{ background: t.swatch }} />
                    ))}
                  </div>
                  <button
                    onClick={() => setManual((m) => m.filter((_, j) => j !== i))}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                );
              })}
              {manual.length === 0 && <p className="text-sm text-slate-400">Список пуст — можно сохранить и без ручных статусов.</p>}
              <p className="text-[11px] text-slate-400">Переименование статуса не меняет его у уже отмеченных учеников — им нужно выставить новый статус заново.</p>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Авто-статусы (дашборд)</p>
            <p className="mb-2 text-[11px] text-slate-400">Система считает их сама из посещаемости и абонементов. Цвет применяется на дашборде «Авто-статусы учеников» и в бейджах списка.</p>
            <div className="space-y-2">
              {AUTO_STATUS_LIST.map((it) => (
                <Row key={it.key} item={it} />
              ))}
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
            <RotateCcw className="h-4 w-4" /> Сбросить цвета и названия
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
