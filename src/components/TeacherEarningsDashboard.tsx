import React, { useMemo, useState } from "react";
import {
  Coins, Crown, TrendingUp, AlertTriangle, CheckCircle2, Circle,
  Trophy, ChevronRight, Wallet, Sparkles, Target, X, Flame, CalendarClock,
} from "lucide-react";
import type { Teacher } from "../types";
import {
  TN_MONTHS, TN_RATES, TN_RET_BONUS, TN_TOM_BONUS, TN_SEED,
  tnEnrich, tnCatName, tnKpiComponents,
} from "../teacherEconomics";

const money = (n: number) => `${new Intl.NumberFormat("ru-RU").format(Math.round(n))} ₸`;

// «Сегодня» по Алматы (как в остальном приложении — sv-SE даёт YYYY-MM-DD).
function almatyToday(): Date {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty" }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type Props = {
  teacherName: string;
  teachers?: Teacher[];
  onMarkAttendance?: () => void;
};

export function TeacherEarningsDashboard({ teacherName, teachers = [] }: Props) {
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [kpiOpen, setKpiOpen] = useState(false);

  const model = useMemo(() => {
    const key = teacherName.trim().toLowerCase();
    const selfTeacher: Teacher =
      teachers.find((t) => t.name.trim().toLowerCase() === key) ??
      ({ id: "self", organizationId: "", name: teacherName, photoUrl: "", specialties: [], phone: "", bio: "", experienceYears: 0 } as Teacher);

    // Рабочий месяц = последний месяц с данными у этого педагога.
    const monthsWithData = TN_MONTHS.filter((mo) => tnEnrich(selfTeacher, undefined, mo, []).m);
    const month = monthsWithData[monthsWithData.length - 1] ?? TN_MONTHS[TN_MONTHS.length - 1];

    const row = tnEnrich(selfTeacher, undefined, month, []);

    // Таблица лидеров для «гонки Педагог месяца».
    const pool = teachers.length ? teachers : [selfTeacher];
    const withSelf = pool.some((t) => t.name.trim().toLowerCase() === key) ? pool : [...pool, selfTeacher];
    const allRows = withSelf.map((t) => tnEnrich(t, undefined, month, []));
    const ranked = allRows.filter((r) => r.kpi > 0).sort((a, b) => b.kpi - a.kpi);
    const leader = ranked[0] ?? row;
    const isWinner = leader.teacher.name.trim().toLowerCase() === key && row.kpi > 0;
    const myRank = Math.max(1, ranked.findIndex((r) => r.teacher.name.trim().toLowerCase() === key) + 1);

    // Зарплата с учётом возможного бонуса «Педагог месяца».
    const m = row.m;
    const cat = row.cat;
    const newSum = m ? m.newCnt * (TN_RATES.new[cat] || 0) : 0;
    const contCnt = m && cat === 3 ? (m.regCont || 0) : 0;
    const plainReg = m ? Math.max(0, (m.regCnt || 0) - contCnt) : 0;
    const regSum = plainReg * (TN_RATES.reg[cat] || 0);
    const contSum = cat === 3 ? contCnt * (TN_RATES.regCont[3] || 0) : 0;
    const base = newSum + regSum + contSum;
    const retActive = !!m && m.left <= 2;
    const retBonus = retActive ? base * TN_RET_BONUS[cat] : 0;
    const tomBonus = isWinner ? TN_TOM_BONUS : 0;
    const finesSum = row.finesSum;
    const total = base + retBonus + tomBonus - finesSum;

    // Штрафы: за текущий месяц + история.
    const seed = TN_SEED[key];
    const monthFines = seed?.fines[month] ?? [];
    const historyFines = seed
      ? Object.entries(seed.fines)
          .filter(([mo]) => mo !== month)
          .flatMap(([mo, arr]) => arr.map((f) => ({ ...f, month: mo })))
      : [];

    const comp = tnKpiComponents(m);

    // Прогресс месяца.
    const today = almatyToday();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const daysLeft = Math.max(0, daysInMonth - dayOfMonth);
    const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

    return {
      selfTeacher, month, row, m, cat, base, newSum, regSum, contSum, plainReg, contCnt,
      retActive, retBonus, tomBonus, finesSum, total, isWinner, leader, myRank,
      rankedCount: ranked.length, monthFines, historyFines, comp, daysLeft, monthProgress,
    };
  }, [teacherName, teachers]);

  const { row, m, cat, total, base, retBonus, tomBonus, finesSum, isWinner, leader, myRank,
    rankedCount, monthFines, historyFines, comp, daysLeft, monthProgress, month } = model;

  const catNext: Record<number, string> = {
    1: "Наберите 3+ года стажа и стабильную группу → 2 категория",
    2: "10+ лет стажа и высокое удержание → 3 категория",
    3: "Высшая категория — максимальные ставки",
  };

  // Чек-лист «дойти до конца месяца с высокой ЗП» — состояние из данных, где возможно.
  const noLate = !monthFines.some((f) => /опоздан/i.test(f.reason));
  const journalsOk = !monthFines.some((f) => /журнал/i.test(f.reason));
  const checklist = [
    { label: "Закрывать журнал каждый день", done: journalsOk, hint: "штраф 3 000–5 000 ₸ за незакрытый журнал" },
    { label: "Без опозданий на занятия", done: noLate, hint: "штраф 2 000 ₸ за опоздание" },
    { label: "Удержать учеников (отток ≤ 2)", done: model.retActive, hint: `бонус +${Math.round(TN_RET_BONUS[cat] * 100)}% к базе` },
    { label: "Загружать фото прихода", done: false, hint: "скоро в кабинете · штраф за отсутствие" },
    { label: "Провести все занятия месяца", done: !!m, hint: "влияет на стандарты и KPI" },
  ];

  const kpiPct = row.kpi;
  const leaderKpi = leader?.kpi || kpiPct || 1;
  const racePct = Math.min(100, Math.round((kpiPct / leaderKpi) * 100));

  return (
    <div className="space-y-4">
      {/* HERO — прогноз ЗП */}
      <button
        onClick={() => setSalaryOpen(true)}
        className="group relative w-full overflow-hidden rounded-[1.75rem] border border-[#C5A059]/30 bg-gradient-to-br from-[#241d10] via-[#141414] to-black p-5 text-left shadow-2xl md:p-6"
      >
        <div className="absolute right-[-60px] top-[-60px] h-52 w-52 rounded-full bg-[#C5A059]/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059]">
              <Wallet className="h-3.5 w-3.5" /> Прогноз ЗП · {month}
            </div>
            <div className="mt-2 text-3xl font-black tabular-nums leading-tight text-white md:text-4xl">{money(total)}</div>
            <div className="mt-1 text-xs text-slate-400">
              к концу месяца, если сохраните темп · нажмите для детализации
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-[#C5A059]" />
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Chip tone="base" label={`База ${money(base)}`} />
          {retBonus > 0 && <Chip tone="good" label={`+ удержание ${money(retBonus)}`} />}
          {tomBonus > 0 && <Chip tone="gold" label={`+ Педагог месяца ${money(tomBonus)}`} />}
          {finesSum > 0 && <Chip tone="bad" label={`− штрафы ${money(finesSum)}`} />}
        </div>
        {/* прогресс месяца */}
        <div className="relative mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Месяц пройден на {monthProgress}%</span>
            <span>{daysLeft} дн. до конца</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#C5A059] to-[#e6c987]" style={{ width: `${monthProgress}%` }} />
          </div>
        </div>
      </button>

      {/* 3 плитки: категория / KPI / штрафы */}
      <div className="grid grid-cols-3 gap-3">
        {/* категория */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Crown className="h-3.5 w-3.5 text-[#C5A059]" /> Категория
          </div>
          <div className="mt-2 inline-flex rounded-lg bg-[#C5A059]/15 px-2.5 py-1 text-sm font-black text-[#C5A059]">
            {tnCatName(cat)}
          </div>
          <div className="mt-2 text-[10px] leading-tight text-slate-500">{row.status}</div>
        </div>

        {/* KPI */}
        <button onClick={() => setKpiOpen((v) => !v)} className="rounded-2xl border border-white/10 bg-[#141414] p-3.5 text-left transition hover:border-[#C5A059]/30">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Target className="h-3.5 w-3.5 text-emerald-400" /> KPI
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums text-white">{kpiPct}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${kpiPct}%` }} />
          </div>
        </button>

        {/* штрафы */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-3.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> Штрафы
          </div>
          <div className={`mt-2 text-2xl font-black tabular-nums leading-tight ${finesSum > 0 ? "text-rose-300" : "text-emerald-300"}`}>
            {finesSum > 0 ? money(finesSum) : "0 ₸"}
          </div>
          <div className="mt-2 text-[10px] leading-tight text-slate-500">
            {monthFines.length ? `${monthFines.length} в этом месяце` : "нет нарушений"}
          </div>
        </div>
      </div>

      {/* KPI-разбивка (раскрывается) */}
      {kpiOpen && comp && (
        <div className="rounded-2xl border border-white/10 bg-[#111] p-4">
          <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Из чего складывается KPI</div>
          <div className="space-y-2.5">
            <KpiBar label="Удержание учеников" value={comp.ret} weight={35} />
            <KpiBar label="Воронка / конверсия" value={comp.funnel} weight={30} />
            <KpiBar label="Отзывы" value={comp.reviews} weight={17.5} />
            <KpiBar label="Стандарты работы" value={comp.standards} weight={17.5} />
          </div>
        </div>
      )}

      {/* ГЕЙМИФИКАЦИЯ — гонка «Педагог месяца» */}
      <div className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${isWinner ? "border-[#C5A059]/40 bg-gradient-to-br from-[#241d10] to-black" : "border-white/10 bg-[#121212]"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className={`h-5 w-5 ${isWinner ? "text-[#C5A059]" : "text-slate-400"}`} />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Гонка «Педагог месяца»</h3>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#C5A059]/15 px-2.5 py-1 text-[10px] font-black text-[#C5A059]">приз +{money(TN_TOM_BONUS)}</span>
        </div>

        {isWinner ? (
          <p className="mt-3 text-sm font-bold text-[#e6c987]">
            <Flame className="mr-1 inline h-4 w-4" /> Вы лидируете! Удержите KPI до конца месяца — и бонус {money(TN_TOM_BONUS)} ваш.
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-300">
            Вы на <b className="text-white">{myRank}-м</b> месте{rankedCount > 1 ? ` из ${rankedCount}` : ""}. До лидера — {Math.max(0, leaderKpi - kpiPct)} KPI.
          </p>
        )}

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Ваш KPI {kpiPct}</span>
            <span>Лидер {leaderKpi}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#C5A059] to-[#e6c987]" style={{ width: `${racePct}%` }} />
          </div>
        </div>

        {/* чек-лист «как дойти до конца месяца с высокой ЗП» */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
            <CalendarClock className="h-3.5 w-3.5" /> Чтобы дойти с высокой ЗП
          </div>
          <div className="space-y-1.5">
            {checklist.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2">
                {c.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                )}
                <div className="min-w-0">
                  <div className={`text-xs font-bold ${c.done ? "text-slate-300 line-through decoration-slate-600" : "text-white"}`}>{c.label}</div>
                  <div className="text-[10px] text-slate-500">{c.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* НАРУШЕНИЯ */}
      <div className="rounded-[1.5rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Мои нарушения</h3>
        </div>
        {monthFines.length === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> В этом месяце нарушений нет — так держать!
          </div>
        )}
        {monthFines.map((f, i) => (
          <FineRow key={i} f={f} />
        ))}
        {historyFines.length > 0 && (
          <>
            <div className="mt-4 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">История</div>
            {historyFines.map((f, i) => (
              <FineRow key={`h${i}`} f={f} faded />
            ))}
          </>
        )}
      </div>

      {/* Модалка детализации ЗП */}
      {salaryOpen && (
        <SalaryBreakdownModal model={model} onClose={() => setSalaryOpen(false)} />
      )}
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "base" | "good" | "gold" | "bad" }) {
  const cls =
    tone === "good" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
    : tone === "gold" ? "bg-[#C5A059]/15 text-[#C5A059] border-[#C5A059]/30"
    : tone === "bad" ? "bg-rose-500/15 text-rose-300 border-rose-500/25"
    : "bg-white/5 text-slate-300 border-white/10";
  return <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${cls}`}>{label}</span>;
}

function KpiBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate text-slate-300">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-500">{Math.round(value)} · вес {weight}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function FineRow({ f, faded }: { f: { date: string; reason: string; sum: number; comment?: string; by?: string; month?: string }; faded?: boolean }) {
  return (
    <div className={`mt-2 flex items-start justify-between gap-3 rounded-xl border border-white/5 px-3 py-2.5 ${faded ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <div className="text-xs font-bold text-white">{f.reason}</div>
        <div className="text-[10px] text-slate-500">
          {f.date}{f.month ? ` · ${f.month}` : ""}{f.comment ? ` · ${f.comment}` : ""}
        </div>
      </div>
      <div className="shrink-0 text-sm font-black tabular-nums text-rose-300">−{money(f.sum)}</div>
    </div>
  );
}

function SalaryBreakdownModal({ model, onClose }: { model: any; onClose: () => void }) {
  const { m, cat, base, newSum, regSum, contSum, plainReg, contCnt, retActive, retBonus, tomBonus, finesSum, total, month } = model;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#141414] p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#C5A059]" />
            <h3 className="text-base font-black text-white">Расчёт ЗП · {month}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!m ? (
          <p className="text-sm text-slate-400">Нет данных по месяцу.</p>
        ) : (
          <div className="space-y-4">
            {/* группы */}
            {m.groups && m.groups.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-bold">Группа</th>
                        <th className="px-3 py-2 text-right font-bold">Новые</th>
                        <th className="px-3 py-2 text-right font-bold">Постоян.</th>
                        <th className="px-3 py-2 text-right font-bold">Продолж.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.groups.map((g: any, i: number) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="px-3 py-2 font-bold text-white">{g.name}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{g.newCnt}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{g.regCnt}</td>
                          <td className="px-3 py-2 text-right text-slate-300">{g.contCnt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* построчно */}
            <div className="space-y-1.5">
              <LineItem label={`Новые ученики: ${m.newCnt} × ${money(TN_RATES.new[cat] || 0)}`} value={money(newSum)} />
              <LineItem label={`Постоянные: ${plainReg} × ${money(TN_RATES.reg[cat] || 0)}`} value={money(regSum)} />
              {cat === 3 && contCnt > 0 && (
                <LineItem label={`Продолжающие: ${contCnt} × ${money(TN_RATES.regCont[3] || 0)}`} value={money(contSum)} />
              )}
              <div className="my-1 border-t border-white/10" />
              <LineItem label="База" value={money(base)} bold />
              {retBonus > 0 && <LineItem label={`Бонус за удержание (+${Math.round(TN_RET_BONUS[cat] * 100)}%)`} value={`+ ${money(retBonus)}`} tone="good" />}
              {!retActive && <LineItem label="Бонус за удержание (отток > 2)" value="0 ₸" tone="muted" />}
              {tomBonus > 0 && <LineItem label="Бонус «Педагог месяца»" value={`+ ${money(tomBonus)}`} tone="gold" />}
              {finesSum > 0 && <LineItem label="Штрафы" value={`− ${money(finesSum)}`} tone="bad" />}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#C5A059]/10 px-4 py-3">
              <span className="min-w-0 text-sm font-black uppercase tracking-wider text-[#C5A059]">Итого к выплате</span>
              <span className="shrink-0 text-xl font-black tabular-nums text-white">{money(total)}</span>
            </div>

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C5A059]" />
              Ставки зависят от категории. Бонус за удержание начисляется, если отток ≤ 2 учеников. Бонус «Педагог месяца» (+{money(TN_TOM_BONUS)}) — лидеру по KPI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LineItem({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: "good" | "gold" | "bad" | "muted" }) {
  const vcls =
    tone === "good" ? "text-emerald-300"
    : tone === "gold" ? "text-[#C5A059]"
    : tone === "bad" ? "text-rose-300"
    : tone === "muted" ? "text-slate-500"
    : "text-white";
  return (
    <div className="flex items-center justify-between gap-3 px-1 text-xs">
      <span className={`min-w-0 ${bold ? "font-black text-white" : "text-slate-400"}`}>{label}</span>
      <span className={`shrink-0 tabular-nums font-bold ${bold ? "text-white" : vcls}`}>{value}</span>
    </div>
  );
}

export default TeacherEarningsDashboard;
