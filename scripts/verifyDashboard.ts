// Сверка показателей дашборда: тянем те же данные, что видит клиент
// (/api/mvp/bootstrap + /students/archive), прогоняем через настоящий движок
// computeOwnerDashboard и печатаем все ключевые цифры в JSON — для сравнения
// с прямыми SQL-запросами к базе.
import { computeOwnerDashboard } from "../src/ownerDashboardAnalytics";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const hdr = { "x-demo-role": "owner" };

async function get(path: string) {
  const r = await fetch(BASE + path, { headers: hdr });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

const boot = await get("/api/mvp/bootstrap");
const archive = (await get("/api/mvp/students/archive")).students || [];
const extras = await get("/api/mvp/owner/extras").catch(() => ({}));

const m = computeOwnerDashboard(
  {
    students: boot.students || [],
    payments: boot.payments || [],
    groups: boot.groups || [],
    branches: boot.branches || [],
    teachers: boot.teachers || [],
    archive,
  },
  { period: "month", level: "network" },
  new Date(),
  extras
);

const out = {
  scope: m.scope,
  today: {
    revenueToday: m.dailyReport.revenueToday,
    paymentsToday: m.dailyReport.paymentsToday,
    studentsWithSub: m.activeSubs.students,
    activeSubs: m.activeSubs.count,
    unpaidCurrentMonth: m.dailyReport.unpaidCurrentMonth.count,
    unpaidPrevMonth: m.dailyReport.unpaidPrevMonth.count,
    retentionPct: m.retention.pct,
    avgCheck: m.avgCheck.all,
    trialYesterdayLost: m.dailyReport.trialYesterdayLost.count,
    trialYesterdayMissed: m.dailyReport.trialYesterdayMissed.count,
  },
  finance: {
    revenueTotalPeriod: m.revenue.total,
    mtd: m.mtd,
  },
  sales: {
    funnel: m.funnel.month,
    soldSubs: m.sales.soldSubs,
    uniqueBuyers: m.sales.uniqueBuyers,
    newStudentsPeriod: m.newStudents.period,
    futureEnrollments: m.futureEnrollments.total,
  },
  retention: {
    churn: m.churn,
    occupancy: { pct: m.occupancy.pct, filled: m.occupancy.filled, capacity: m.occupancy.capacity },
    trialsToFill: m.trialsToFill,
    ltv: { avgMonths: m.ltv.avgMonths, avgRevenue: m.ltv.avgRevenue, buckets: m.ltv.buckets.map((b) => ({ label: b.label, count: b.count })) },
    debtors: m.debtors.total,
  },
};
console.log(JSON.stringify(out, null, 2));
