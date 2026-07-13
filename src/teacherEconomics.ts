// ===================== Преподаватели сети: модель KPI / ЗП (порт light-прототипа) =====================
// Единый источник расчётов ЗП, категории, KPI и штрафов преподавателя.
// Используется и в кабинете владельца (TeachersNetworkView), и в кабинете самого педагога
// (дашборд «Сегодня»), чтобы цифры совпадали до рубля.
import type { Teacher } from "./types";

export const TN_KPI_WEIGHTS = { ret: 35, funnel: 30, reviews: 17.5, standards: 17.5 };
export const TN_RATES = {
  new: { 1: 1250, 2: 1500, 3: 1500 } as Record<number, number>,
  reg: { 1: 2500, 2: 3000, 3: 3000 } as Record<number, number>,
  regCont: { 3: 3500 } as Record<number, number>,
};
export const TN_RET_BONUS: Record<number, number> = { 1: 0.20, 2: 0.20, 3: 0.30 };
export const TN_TOM_BONUS = 20000;
export const TN_MONTHS = ["Январь 2026", "Февраль 2026", "Март 2026", "Апрель 2026", "Май 2026", "Июнь 2026"];

export type TnGroupBreak = { name: string; newCnt: number; regCnt: number; contCnt: number };
export type TnMonth = { ret: number; funnel: number; rev: number; std: number; students: number; newCnt: number; regCnt: number; regCont: number; left: number; groups?: TnGroupBreak[] };
export type TnFine = { date: string; reason: string; sum: number; comment?: string; by?: string };
export type TnSeed = { cat: number; status: string; spec: string; branch: string; phone: string; byMonth: Record<string, TnMonth | null>; fines: Record<string, TnFine[]> };

// Реальные педагоги сети — точные месячные данные (совпадают с прототипом-эталоном).
export const TN_SEED: Record<string, TnSeed> = {
  "аслан плиев": {
    cat: 3, status: "Активен", spec: "Лезгинка, ансамблевая подготовка", branch: "Эхо Гор Чокина 109/1", phone: "+7 701 441 11 22",
    byMonth: {
      "Январь 2026": { ret: 62, funnel: 55, rev: 4.6, std: 90, students: 26, newCnt: 4, regCnt: 22, regCont: 8, left: 1 },
      "Февраль 2026": { ret: 64, funnel: 58, rev: 4.7, std: 92, students: 28, newCnt: 5, regCnt: 23, regCont: 9, left: 1 },
      "Март 2026": { ret: 66, funnel: 60, rev: 4.7, std: 95, students: 29, newCnt: 4, regCnt: 25, regCont: 10, left: 2 },
      "Апрель 2026": { ret: 67, funnel: 62, rev: 4.8, std: 96, students: 30, newCnt: 5, regCnt: 25, regCont: 11, left: 1 },
      "Май 2026": { ret: 67.7, funnel: 64, rev: 4.8, std: 98, students: 31, newCnt: 6, regCnt: 25, regCont: 12, left: 2 },
      "Июнь 2026": { ret: 69, funnel: 66, rev: 4.9, std: 100, students: 31, newCnt: 6, regCnt: 25, regCont: 12, left: 1, groups: [
        { name: "Лезгинка · взрослые (вечер)", newCnt: 2, regCnt: 12, contCnt: 0 },
        { name: "Ансамбль «Эхо»", newCnt: 0, regCnt: 0, contCnt: 12 },
        { name: "Лезгинка · дети 8–11", newCnt: 4, regCnt: 1, contCnt: 0 },
      ] },
    },
    fines: { "Май 2026": [{ date: "14.05.2026", reason: "Опоздание", sum: 2000, comment: "Опоздание на групповое занятие", by: "Владелец" }] },
  },
  "хамит муратович": {
    cat: 1, status: "Стажер", spec: "High Heels", branch: "Сатпаева 210/1", phone: "+7 (702) 123 46 58",
    byMonth: {
      "Январь 2026": null, "Февраль 2026": null, "Март 2026": null, "Апрель 2026": null, "Май 2026": null,
      "Июнь 2026": { ret: 0, funnel: 20, rev: 0, std: 40, students: 1, newCnt: 1, regCnt: 0, regCont: 0, left: 0 },
    },
    fines: { "Июнь 2026": [{ date: "12.06.2026", reason: "Незакрытый журнал", sum: 5000, comment: "Журнал не закрыт 2 дня подряд", by: "Владелец" }] },
  },
};

export const tnInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
export const tnCatName = (c: number) => `${c} категория`;
export function tnKpiComponents(m: TnMonth | null) {
  if (!m) return null;
  return { ret: Math.min(100, m.ret), funnel: Math.min(100, m.funnel), reviews: Math.round((m.rev / 5) * 100), standards: m.std };
}
export function tnKpiTotal(c: ReturnType<typeof tnKpiComponents>) {
  if (!c) return 0;
  const w = TN_KPI_WEIGHTS;
  return Math.round(c.ret * w.ret / 100 + c.funnel * w.funnel / 100 + c.reviews * w.reviews / 100 + c.standards * w.standards / 100);
}
export function tnSalary(m: TnMonth | null, cat: number, isWinner: boolean, finesSum: number) {
  if (!m) return null;
  const newSum = m.newCnt * (TN_RATES.new[cat] || 0);
  const contCnt = cat === 3 ? (m.regCont || 0) : 0;
  const plainReg = Math.max(0, (m.regCnt || 0) - contCnt);
  const regSum = plainReg * (TN_RATES.reg[cat] || 0);
  const contSum = cat === 3 ? contCnt * (TN_RATES.regCont[3] || 0) : 0;
  const base = newSum + regSum + contSum;
  const retBonus = m.left <= 2 ? base * TN_RET_BONUS[cat] : 0;
  const tomBonus = isWinner ? TN_TOM_BONUS : 0;
  return { base, retBonus, tomBonus, finesSum, total: base + retBonus + tomBonus - finesSum };
}

// Собирает отображаемый профиль педагога за выбранный месяц (seed-данные или расчёт из живых метрик).
export function tnEnrich(t: Teacher, metric: any, month: string, penalties: any[]) {
  const seed = TN_SEED[t.name.trim().toLowerCase()];
  let cat: number, status: string, spec: string, branch: string, phone: string, m: TnMonth | null, finesSum: number;
  if (seed) {
    cat = seed.cat; status = seed.status; spec = seed.spec; branch = seed.branch; phone = seed.phone;
    m = seed.byMonth[month] ?? null;
    finesSum = (seed.fines[month] || []).reduce((s, f) => s + f.sum, 0);
  } else {
    const students = metric?.studentsCount ?? 0;
    const ret = metric?.retentionRate ?? 0;
    const att = metric?.averageAttendance ?? 0;
    cat = (t.experienceYears ?? 0) >= 10 ? 3 : (t.experienceYears ?? 0) >= 3 ? 2 : 1;
    status = ((t.experienceYears ?? 0) < 1 || students <= 1) ? "Стажер" : "Активен";
    spec = t.specialties?.[0] || "—";
    branch = "";
    phone = t.phone || "";
    const newCnt = Math.round(students * 0.2);
    const regCnt = Math.max(0, students - newCnt);
    m = students > 0 ? { ret, funnel: Math.round(ret * 0.9), rev: att >= 90 ? 4.8 : Math.round((att / 20) * 10) / 10, std: att || 80, students, newCnt, regCnt, regCont: cat === 3 ? Math.round(regCnt * 0.4) : 0, left: 1 } : null;
    finesSum = penalties.filter((p) => p.teacherId === t.id).reduce((s, p) => s + (p.amount || 0), 0);
  }
  const comp = tnKpiComponents(m);
  const kpi = tnKpiTotal(comp);
  return { teacher: t, seed: Boolean(seed), cat, status, spec, branch, phone, initials: tnInitials(t.name), m, comp, kpi, finesSum };
}
export type TnRow = ReturnType<typeof tnEnrich>;
