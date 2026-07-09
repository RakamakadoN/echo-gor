import { useState } from "react";
import { Archive, X } from "lucide-react";

/**
 * Модалка перевода ученика(ов) в архив (ТЗ заказчика 24.06.2026).
 * Два комментария обязательны: «Почему он ушёл?» и свободный комментарий.
 * Данные ученика при этом сохраняются — архив нужен для будущих рассылок.
 * Тёмная тема (под кабинеты владельца/руководителя). Фон заблюрен.
 */
export function ArchiveReasonModal({
  title,
  subtitle,
  busy = false,
  warning,
  onConfirm,
  onCancel
}: {
  title: string;
  subtitle?: string;
  busy?: boolean;
  /** Предупреждение о последствиях (напр. у ученика есть действующий абонемент). */
  warning?: string;
  onConfirm: (reason: string, comment: string, leftOn: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  // Дата ухода — когда ученик реально перестал ходить (по умолчанию — сегодня).
  const [leftDate, setLeftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const canSubmit = reason.trim().length > 0 && comment.trim().length > 0 && leftDate.length === 10 && !busy;

  const REASONS = [
    "Переезд",
    "Финансовые причины",
    "Не подошло расписание",
    "Потеря интереса",
    "Конфликт / недовольство",
    "Здоровье",
    "Другое"
  ];

  const fieldCls =
    "mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={onCancel}>
      <div
        className="w-full max-w-lg rounded-[2rem] border border-rose-500/25 bg-[#161213] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-rose-500/15 p-2.5 text-rose-400">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {warning && (
          <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
            ⚠️ {warning}
          </p>
        )}

        <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
          Данные ученика сохранятся в базе — история оплат, посещений и групп. Архив нужен для будущих
          маркетинговых рассылок и возврата ученика.
        </p>

        <label className="mt-4 block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Почему он ушёл? *</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={fieldCls}>
            <option value="">— выберите причину —</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Дата ухода *</span>
          <input
            type="date"
            value={leftDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setLeftDate(e.target.value)}
            className={`${fieldCls} [color-scheme:dark]`}
          />
          <span className="mt-1 block text-[11px] text-slate-500">Когда ученик реально перестал посещать занятия (может отличаться от даты переноса в архив). Нажмите — откроется календарь.</span>
        </label>

        <label className="mt-3 block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Комментарий *</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Свободный комментарий (детали ухода, договорённости, заметки для возврата)…"
            className={fieldCls}
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
          >
            Отмена
          </button>
          <button
            onClick={() => canSubmit && onConfirm(reason.trim(), comment.trim(), leftDate)}
            disabled={!canSubmit}
            className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-black text-rose-300 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Переносим…" : "В архив"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArchiveReasonModal;
