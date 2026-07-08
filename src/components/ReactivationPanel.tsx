/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ReactivationPanel — блок «Можно вернуть» на дашборде владельца.
 * Находит ушедших, кто в архиве дольше порога (по умолчанию 2 мес), и по кнопке
 * просит ИИ (Магомед/Gemini) подобрать оффер и готовый текст сообщения на основе
 * причины ухода. Напоминание, чтобы возврат учеников не забывался.
 * Деградация: при 503 (нет GEMINI_API_KEY) показывает кандидатов без ИИ-текста.
 */
import { useMemo, useState } from "react";
import { HeartHandshake, Sparkles, Loader2, Copy, Check } from "lucide-react";

type ArchiveStudent = {
  id: string; name: string; branchId: string;
  archivedAt: string; archiveReason?: string; archiveComment?: string;
  subscriptionsCount?: number; category?: "left" | "declined";
};

type Offer = { id: string; recommend?: boolean; offerType?: string; message?: string; reasoning?: string };

function monthsSince(iso?: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / (86400000 * 30));
}

export default function ReactivationPanel({
  archive = [],
  roleHeader = "owner",
  minMonths = 2,
}: {
  archive?: ArchiveStudent[];
  roleHeader?: string;
  minMonths?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<Record<string, Offer> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Кандидаты: ушедшие (купили ≥1 абонемент) в архиве дольше порога.
  const candidates = useMemo(
    () => archive
      .filter((a) => (a.category || (Number(a.subscriptionsCount) >= 1 ? "left" : "declined")) === "left")
      .filter((a) => monthsSince(a.archivedAt) >= minMonths)
      .sort((a, b) => new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime()),
    [archive, minMonths]
  );

  const suggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gemini/reactivation", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": roleHeader },
        body: JSON.stringify({
          students: candidates.map((a) => ({
            id: a.id,
            name: a.name,
            archiveReason: a.archiveReason || "",
            archiveComment: a.archiveComment || "",
            monthsInArchive: monthsSince(a.archivedAt),
          })),
        }),
      });
      if (res.status === 503) {
        setError("ИИ-подсказки недоступны: не настроен ключ GEMINI_API_KEY. Кандидаты показаны ниже.");
        setOffers({});
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const map: Record<string, Offer> = {};
      (data?.candidates || []).forEach((o: Offer) => { if (o?.id) map[o.id] = o; });
      setOffers(map);
    } catch (e: any) {
      setError(e?.message || "Не удалось получить подсказки ИИ");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[#0d1411]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/15 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/15 p-2.5 text-emerald-300"><HeartHandshake className="h-5 w-5" /></div>
          <div>
            <h3 className="font-black text-white">Можно вернуть: {candidates.length}</h3>
            <p className="text-xs text-slate-500">Ушедшие в архиве дольше {minMonths} мес. ИИ подберёт оффер по причине ухода.</p>
          </div>
        </div>
        <button
          onClick={suggest}
          disabled={loading || candidates.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {offers ? "Обновить подсказки" : "Подобрать офферы (ИИ)"}
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Пока некого возвращать — нет ушедших в архиве дольше {minMonths} мес.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {error && <p className="px-5 py-3 text-xs text-amber-300">{error}</p>}
          {candidates.map((a) => {
            const o = offers?.[a.id];
            const hidden = o && o.recommend === false;
            return (
              <div key={a.id} className={`px-5 py-3 text-sm ${hidden ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-white">{a.name}</span>
                    <span className="ml-2 text-xs text-slate-500">в архиве {monthsSince(a.archivedAt)} мес · причина: {a.archiveReason || "—"}</span>
                  </div>
                  {o?.offerType && !hidden && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">{o.offerType}</span>
                  )}
                  {hidden && <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-500">ИИ не советует сейчас</span>}
                </div>
                {o?.message && !hidden && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="whitespace-pre-wrap text-slate-200">{o.message}</p>
                    {o.reasoning && <p className="mt-1.5 text-[11px] italic text-slate-500">{o.reasoning}</p>}
                    <button
                      onClick={() => copy(a.id, o.message || "")}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition hover:bg-white/10"
                    >
                      {copied === a.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copied === a.id ? "Скопировано" : "Копировать текст"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
