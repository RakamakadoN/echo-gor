// Демо-датасет «ЭХО ГОР» для проверки корректности дашборда.
// Всё помечено префиксом «ТЕСТ» — чистится одним SQL по паттерну.
// Создаёт: 2 филиала, залы, педагогов, тарифы, группы (с вместимостью и
// статусом набора), учеников по сценариям (удержание, отток, должники,
// новые, пробники с отметками был/не был/купил, будущие пробные, лиды).
// Даты продаж/пробных проставляются реальные (июнь = прошлый, июль = текущий).
// Историю (created_at, июньские платежи, отток, план БДР) досаживает SQL-шаг.

const BASE = "http://localhost:3100/api/mvp";
const H = { "Content-Type": "application/json", "x-demo-role": "owner" };

async function api(path: string, body?: any, method = "POST") {
  const r = await fetch(BASE + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  let j: any; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${t.slice(0, 200)}`);
  return j;
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const today = isoOf(now);
const yesterday = isoOf(new Date(now.getTime() - 86400000));
const tomorrow = isoOf(new Date(now.getTime() + 86400000));
const JUL = { s: "2026-07-01", e: "2026-07-31" };
const JUN = { s: "2026-06-01", e: "2026-06-30" };

// ── фабрики сущностей ──
const mkBranch = async (name: string, city: string, address: string) => (await api("/branches", { name, city, address })).branch.id as string;
const mkHall = async (branchId: string, name: string) => (await api("/halls", { branchId, name, capacity: 40 })).hall.id as string;
const mkTeacher = async (name: string, branchId: string, spec: string) => (await api("/teachers", { name, branchId, specialization: spec, role: "teacher" })).teacher.id as string;
const mkPlan = async (name: string, format: "group" | "individual", price: number) => (await api("/subscription-plans", { name, format, price, lessonsCount: 8, durationDays: 30 })).plan.id as string;
async function mkGroup(o: any) {
  const g = (await api("/groups", o)).group.id as string;
  if (o.enrollmentOpen === false) await api(`/groups/${g}`, { enrollmentOpen: false }, "PATCH");
  return g;
}
const mkStudent = async (name: string, branchId: string, groupId: string | null, status: string, teacherId?: string) =>
  (await api("/students", { name, branchId, groupId, teacherId, status })).student.id as string;
const sell = async (studentId: string, branchId: string, groupId: string | null, planId: string, o: any) =>
  api("/student-subscriptions", { studentId, branchId, groupId, planId, kind: o.kind || "group", startsOn: o.s, endsOn: o.e, soldOn: o.soldOn, amountPaid: o.amountPaid, description: o.desc });
const trial = async (studentId: string, date: string) => api(`/students/${studentId}/trial`, { date, confirm: true });
const mark = async (studentId: string, date: string, status: string, outcome?: string) => api("/attendance", { studentId, date, status, isTrial: true, trialOutcome: outcome });

// desc-метки для backdating дат платежей:
//  M06 — июньская продажа (paid_at → июнь), M07E — ранняя июльская (→ 04.07), M07T — сегодня.
const D_JUN = "ТЕСТ-M06", D_JULE = "ТЕСТ-M07E", D_JULT = "ТЕСТ-M07T";

async function run() {
  const log = (s: string) => console.log(s);

  // ── филиалы / залы / педагоги / тарифы ──
  const bAstana = await mkBranch("ТЕСТ Астана Есиль", "Астана", "пр. Кабанбай батыра 12");
  const bKar = await mkBranch("ТЕСТ Караганда Центр", "Караганда", "ул. Ерубаева 44");
  log(`Филиалы: ${bAstana}, ${bKar}`);

  const hA1 = await mkHall(bAstana, "ТЕСТ Зал А"); const hA2 = await mkHall(bAstana, "ТЕСТ Зал Б");
  const hK1 = await mkHall(bKar, "ТЕСТ Зал 1"); const hK2 = await mkHall(bKar, "ТЕСТ Зал 2");

  const tAlyev = await mkTeacher("ТЕСТ Пед Алиев", bAstana, "Народный танец");
  const tBekov = await mkTeacher("ТЕСТ Пед Беков", bAstana, "Хореография");
  const tVtor = await mkTeacher("ТЕСТ Пед Втор", bKar, "Народный танец");
  const tGani = await mkTeacher("ТЕСТ Пед Гани", bKar, "Ансамбль");
  log("Залы и педагоги созданы");

  const planG = await mkPlan("ТЕСТ Групповой месяц", "group", 25000);
  const planI = await mkPlan("ТЕСТ Индивидуальный месяц", "individual", 60000);

  // ── группы ──
  const g1 = await mkGroup({ name: "ТЕСТ Дети 6-9 (Астана)", branchId: bAstana, hallId: hA1, teacherId: tAlyev, capacity: 14, ageFrom: 6, ageTo: 9, scheduleDays: "Пн, Ср", scheduleTime: "17:00–18:30" });
  const g2 = await mkGroup({ name: "ТЕСТ Юниоры 10-13 (Астана)", branchId: bAstana, hallId: hA2, teacherId: tBekov, capacity: 16, ageFrom: 10, ageTo: 13, scheduleDays: "Вт, Чт", scheduleTime: "18:00–19:30" });
  const g3 = await mkGroup({ name: "ТЕСТ Взрослые (Астана)", branchId: bAstana, hallId: hA1, teacherId: tAlyev, capacity: 18, ageFrom: 16, ageTo: 45, scheduleDays: "Сб, Вс", scheduleTime: "12:00–13:30", enrollmentOpen: false });
  const g4 = await mkGroup({ name: "ТЕСТ Дети 6-9 (Караганда)", branchId: bKar, hallId: hK1, teacherId: tVtor, capacity: 12, ageFrom: 6, ageTo: 9, scheduleDays: "Пн, Ср", scheduleTime: "17:00–18:30" });
  const g5 = await mkGroup({ name: "ТЕСТ Ансамбль (Караганда)", branchId: bKar, hallId: hK2, teacherId: tGani, capacity: 14, scheduleDays: "Пн, Ср, Пт", scheduleTime: "19:30–21:00", enrollmentOpen: false });
  const g6 = await mkGroup({ name: "ТЕСТ Индивидуальные (Караганда)", branchId: bKar, hallId: hK1, teacherId: tVtor, capacity: 6, format: "individual", scheduleDays: "Вт, Чт", scheduleTime: "16:00–17:00" });
  log("Группы созданы");

  // ── сценарии учеников ──
  // bucket — слово в last_name, по нему SQL проставит created_at (срок обучения).
  let n = 0;
  const nm = (bucket: string) => `ТЕСТ ${bucket} П${pad(++n)}`;

  // удержан: оплачен июнь + июль (полностью)
  async function retained(bucket: string, b: string, g: string, plan: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "active", t);
    await sell(id, b, g, plan, { ...JUN, soldOn: "2026-06-05", desc: D_JUN });
    await sell(id, b, g, plan, { ...JUL, soldOn: "2026-07-04", desc: D_JULE });
    return id;
  }
  // новый, купил сразу (июль, сегодня)
  async function newBought(bucket: string, b: string, g: string, plan: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "active", t);
    await sell(id, b, g, plan, { ...JUL, soldOn: today, desc: D_JULT });
    return id;
  }
  // новый через пробный: записался → пришёл → купил
  async function newTrialBought(bucket: string, b: string, g: string, plan: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "trial", t);
    await trial(id, "2026-07-08");
    await mark(id, "2026-07-08", "present");
    await sell(id, b, g, plan, { ...JUL, soldOn: "2026-07-09", desc: D_JULE });
    return id;
  }
  // должник: июнь оплачен, июль оплачен частично (25000 → внесено 10000)
  async function debtor(bucket: string, b: string, g: string, plan: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "active", t);
    await sell(id, b, g, plan, { ...JUN, soldOn: "2026-06-05", desc: D_JUN });
    await sell(id, b, g, plan, { ...JUL, soldOn: "2026-07-04", amountPaid: 10000, desc: D_JULE });
    return id;
  }
  // не продлил: оплачен только июнь
  async function notRenewed(bucket: string, b: string, g: string, plan: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "active", t);
    await sell(id, b, g, plan, { ...JUN, soldOn: "2026-06-06", desc: D_JUN });
    return id;
  }
  // вчерашний пробный: был, не купил (не обработан)
  async function trialLostY(bucket: string, b: string, g: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "trial", t);
    await trial(id, yesterday); await mark(id, yesterday, "present", "lost");
    return id;
  }
  // вчерашний пробный: не пришёл
  async function trialMissY(bucket: string, b: string, g: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "trial", t);
    await trial(id, yesterday); await mark(id, yesterday, "absent");
    return id;
  }
  // записан на пробный на будущее (завтра, без отметки)
  async function trialFuture(bucket: string, b: string, g: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "trial", t);
    await trial(id, tomorrow);
    return id;
  }
  // чистый лид (без действий) — НЕ должен считаться новым
  async function lead(bucket: string, b: string, g: string, t: string) {
    return mkStudent(nm(bucket), b, g, "lead", t);
  }
  // отток: был активен (июнь), в июле уходит (архивируется SQL-шагом)
  async function churn(bucket: string, b: string, g: string, plan: string, t: string) {
    const id = await mkStudent(nm(bucket), b, g, "active", t);
    await sell(id, b, g, plan, { ...JUN, soldOn: "2026-06-07", desc: D_JUN });
    return id;
  }

  // G1 — Дети Астана (Алиев)
  await retained("Старожил", bAstana, g1, planG, tAlyev);
  await retained("Ядро", bAstana, g1, planG, tAlyev);
  await newTrialBought("Новичок", bAstana, g1, planG, tAlyev);
  await debtor("Долг", bAstana, g1, planG, tAlyev);
  await notRenewed("НеПродлил", bAstana, g1, planG, tAlyev);
  await trialLostY("Проб", bAstana, g1, tAlyev);
  log("G1 готова");

  // G2 — Юниоры Астана (Беков)
  await retained("Опыт", bAstana, g2, planG, tBekov);
  await retained("Стаж", bAstana, g2, planG, tBekov);
  await newBought("Дебют", bAstana, g2, planG, tBekov);
  await trialMissY("Проб", bAstana, g2, tBekov);
  await trialFuture("Проб", bAstana, g2, tBekov);
  await lead("Лид", bAstana, g2, tBekov);
  log("G2 готова");

  // G3 — Взрослые Астана (закрыт набор, Алиев)
  await retained("Адапт", bAstana, g3, planG, tAlyev);
  await retained("Ядро", bAstana, g3, planG, tAlyev);
  await churn("Отток", bAstana, g3, planG, tAlyev);
  log("G3 готова");

  // G4 — Дети Караганда (Втор)
  await retained("Старожил", bKar, g4, planG, tVtor);
  await newBought("Дебют", bKar, g4, planG, tVtor);
  await debtor("Долг", bKar, g4, planG, tVtor);
  await notRenewed("НеПродлил", bKar, g4, planG, tVtor);
  await trialLostY("Проб", bKar, g4, tVtor);
  log("G4 готова");

  // G5 — Ансамбль Караганда (закрыт, Гани)
  await retained("Опыт", bKar, g5, planG, tGani);
  await retained("Стаж", bKar, g5, planG, tGani);
  await churn("Отток", bKar, g5, planG, tGani);
  log("G5 готова");

  // G6 — Индивидуальные Караганда (Втор)
  await retained("Опыт", bKar, g6, planI, tVtor);   // индив, срок 8 мес
  await newBought("Дебют", bKar, g6, planI, tVtor); // индив, новый
  log("G6 готова");

  console.log(JSON.stringify({
    ok: true, branches: { bAstana, bKar }, plans: { planG, planI },
    total: n,
  }));
}

run().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
