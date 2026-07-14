import { useState, useEffect, useMemo } from "react";
import type { Teacher, Branch, Group, Student } from "../../types";
import "./teachers-proto.css";

/* =========================================================================
   Порт статического прототипа «Преподаватели — Эхо Гор CRM».
   Только рабочая область (без сайдбара/навигации/переключателя темы).
   Весь интерактив на useState, формы добавляют записи только в локальный state.
   Типы намеренно any — это визуальный порт прототипа.
   ========================================================================= */

/* ===== CONFIG ===== */
const KPI_WEIGHTS: any = { ret: 35, funnel: 30, reviews: 17.5, standards: 17.5 };
const RATES: any = { new: { 1: 1250, 2: 1500, 3: 1500 }, reg: { 1: 2500, 2: 3000, 3: 3000 }, regCont: { 3: 3500 } };
const RETENTION_BONUS: any = { 1: 0.2, 2: 0.2, 3: 0.3 };
const TEACHER_OF_MONTH_BONUS = 20000;
const MONTHS: string[] = ["Январь 2026", "Февраль 2026", "Март 2026", "Апрель 2026", "Май 2026", "Июнь 2026", "Июль 2026"];

/* Русские названия месяцев для конвертации period_month <-> ярлык */
const RU_MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
/* "2026-05" -> "Май 2026" */
const periodToLabel = (pm: string): string => {
  if (!pm || pm.indexOf("-") < 0) return pm || "—";
  const [y, m] = pm.split("-");
  const idx = parseInt(m, 10) - 1;
  return (RU_MONTHS[idx] || m) + " " + y;
};
/* "Май 2026" -> "2026-05" */
const labelToPeriod = (label: string): string => {
  const parts = (label || "").trim().split(" ");
  if (parts.length < 2) return new Date().toISOString().slice(0, 7);
  const idx = RU_MONTHS.indexOf(parts[0]);
  const y = parts[1];
  return y + "-" + String(idx >= 0 ? idx + 1 : 1).padStart(2, "0");
};
/* ISO -> dd.mm.yyyy */
const isoToDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
};
/* ISO/дата -> yyyy-mm-dd для <input type="date"> */
const isoToInput = (iso?: string | null): string => (iso ? String(iso).slice(0, 10) : "");
const initialsOf = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "—";
};
const roleLabel = (role?: string): string => {
  switch (role) {
    case "admin": return "Администратор";
    case "branch_manager": return "Управляющий";
    case "owner": return "Владелец";
    case "teacher": default: return "Преподаватель";
  }
};
const SCHEME_LABEL: Record<string, string> = {
  percent: "Процент от выручки", per_lesson: "За занятие", fixed: "Фиксированный оклад", mixed: "Смешанная схема",
};
const DEMO_HEADERS = { "x-demo-role": "owner" };
const JSON_HEADERS = { "Content-Type": "application/json", "x-demo-role": "owner" };

/* Заглушка «данных пока нет» — приглушённый блок, не пустота */
function Empty({ children }: { children?: any }) {
  return (
    <div style={{ padding: "16px 14px", background: "var(--gold-soft, #f6f1e7)", border: "1px dashed var(--line, #e4ddce)", borderRadius: 12, color: "var(--muted, #8a8676)", fontSize: 14, textAlign: "center" }}>
      {children || "Данных пока нет"}
    </div>
  );
}

/* Построить массив педагогов в форме, которую ждёт вёрстка, из РЕАЛЬНЫХ данных.
   Штрафы (fines) прикручиваются отдельно из penalties. KPI/byMonth система не хранит → null. */
function buildTeachers(teachers: Teacher[], branches: Branch[], groups: Group[], students: Student[]): any[] {
  const branchName = (id?: string | null) => branches.find((b) => b.id === id)?.name || "—";
  return (teachers || []).map((t) => {
    const tGroups = (groups || []).filter((g) => g.teacherId === t.id);
    const tGroupIds = new Set(tGroups.map((g) => g.id));
    const studentsCount = (students || []).filter((s) => s.teacherId === t.id || (Array.isArray(s.groupIds) && s.groupIds.some((gid) => tGroupIds.has(gid)))).length;
    const isTeacherRole = !t.role || t.role === "teacher";
    const status = isTeacherRole && ((t.experienceYears || 0) === 0 || tGroups.length === 0) ? "Стажер" : "Активен";
    return {
      id: t.id,
      name: t.name,
      initials: initialsOf(t.name),
      phone: t.phone || "—",
      login: t.phone || "—",
      pass: "",
      spec: t.specialties && t.specialties.length ? t.specialties.join(", ") : "—",
      branch: branchName(t.branchId),
      cat: null,
      role: roleLabel(t.role),
      status,
      birth: "—",
      hired: "—",
      years: t.experienceYears ? t.experienceYears + " г." : "—",
      thanks: 0,
      ltvMonths: 0,
      bio: t.bio || "",
      studentsCount,
      fines: {},
      leavers: {},
      byMonth: Object.fromEntries(MONTHS.map((mn) => [mn, null])),
      groups: tGroups.map((g) => ({
        name: g.name,
        st: g.studentCount ?? 0,
        free: Math.max(0, (g.capacity || 0) - (g.studentCount || 0)),
        fill: g.capacity ? Math.round(((g.studentCount || 0) / g.capacity) * 100) : 0,
        ret: null, newCnt: null, regCnt: null, regCont: null,
      })),
      standards: [],
      training: [],
      attest: [],
      reviews: [],
      ai: null,
    };
  });
}

/* Сгруппировать penalties по ярлыку месяца для одного педагога */
function finesForTeacher(penalties: any[], t: any): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  (penalties || []).forEach((p) => {
    const match = p.teacherId ? p.teacherId === t.id : p.teacherName === t.name;
    if (!match) return;
    const label = periodToLabel(p.period_month);
    if (!out[label]) out[label] = [];
    out[label].push({ id: p.id, date: isoToDate(p.created_at), reason: p.reason, sum: Number(p.amount) || 0, note: p.comment || "", by: p.created_by || "—" });
  });
  return out;
}

/* Колонки таблицы (порядок важен для меню и заголовков) */
const COLUMN_DEFS: any[] = [
  { id: "spec", label: "Специализация", on: true },
  { id: "branch", label: "Филиал", on: true },
  { id: "cat", label: "Категория", on: true },
  { id: "ret", label: "Удержание", on: true },
  { id: "kpi", label: "KPI", on: true },
  { id: "fines", label: "Штрафы", on: true },
  { id: "sal", label: "Ожид. ЗП", on: true },
  { id: "students", label: "Ученики", on: false },
  { id: "funnel", label: "Воронка ПУ", on: false },
  { id: "rev", label: "Отзывы (оценка)", on: false },
  { id: "std", label: "Стандарты", on: false },
  { id: "phone", label: "Телефон", on: false },
  { id: "role", label: "Права", on: true },
];

const CARD_TABS: [string, string][] = [
  ["info", "Общая"], ["kpi", "KPI"], ["groups", "Группы"], ["std", "Стандарты"],
  ["train", "Обучение"], ["att", "Аттестация"], ["rev", "Отзывы"], ["ai", "AI-анализ"], ["fines", "Штрафы"], ["sal", "Ожидаемая ЗП"],
];

const FINE_REASONS = ["Опоздание", "Незакрытый журнал", "Нет плана работы", "Нет фото прихода", "Нарушение дисциплины", "Другое"];

/* ===== HELPERS ===== */
const money = (n: number) => Math.round(n).toLocaleString("ru-RU") + " тг";
const retClass = (v: number) => (v >= 60 ? "" : v >= 40 ? "warn" : "bad");
const catName = (c: any) => (c == null ? "Не задана" : c + " категория");
const starsStr = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const fillColor = (v: number) => (v >= 70 ? "var(--green)" : v >= 45 ? "var(--gold)" : "var(--red)");

function kpiComponents(m: any): any {
  if (!m) return null;
  return { ret: Math.min(100, m.ret), funnel: Math.min(100, m.funnel), reviews: Math.round((m.rev / 5) * 100), standards: m.std };
}
function kpiTotal(c: any): number {
  if (!c) return 0;
  const w = KPI_WEIGHTS;
  return Math.round((c.ret * w.ret) / 100 + (c.funnel * w.funnel) / 100 + (c.reviews * w.reviews) / 100 + (c.standards * w.standards) / 100);
}
function monthData(t: any, mn: string): any {
  return t.byMonth[mn];
}
function salary(t: any, m: any, mn: string, winnerId: number): any {
  if (!m) return null;
  const c = t.cat;
  const newSum = m.newCnt * RATES.new[c];
  const contCnt = c === 3 ? m.regCont || 0 : 0;
  const plainReg = Math.max(0, (m.regCnt || 0) - contCnt);
  const regSum = plainReg * RATES.reg[c];
  const contSum = c === 3 ? contCnt * RATES.regCont[3] : 0;
  const base = newSum + regSum + contSum;
  const retOk = m.left <= 2;
  const retBonus = retOk ? base * RETENTION_BONUS[c] : 0;
  const isWinner = winnerId === t.id;
  const tomBonus = isWinner ? TEACHER_OF_MONTH_BONUS : 0;
  const fineList = t.fines && t.fines[mn] ? t.fines[mn] : [];
  const finesSum = fineList.reduce((s: number, f: any) => s + f.sum, 0);
  return { newCnt: m.newCnt, newSum, plainReg, regSum, contCnt, contSum, base, retOk, retBonus, tomBonus, fineList, finesSum, total: base + retBonus + tomBonus - finesSum };
}

/* ===== ICONS ===== */
const IconCols = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={15} height={15}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
);
const IconCrown = () => (
  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 2h14v2H5z" /></svg>
);
const IconSpark = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></svg>
);
const IconWbadge = () => (
  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5z" /></svg>
);
const IconEdit = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
);
const IconArchive = () => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);

/* ========================================================================= */
interface TeachersProtoViewProps {
  teachers?: Teacher[];
  branches?: Branch[];
  groups?: Group[];
  students?: Student[];
}

export function TeachersProtoView({ teachers: teachersProp = [], branches = [], groups = [], students = [] }: TeachersProtoViewProps = {}) {
  /* Реальные данные, приведённые к форме вёрстки */
  const baseTeachers = useMemo(() => buildTeachers(teachersProp, branches, groups, students), [teachersProp, branches, groups, students]);

  const [penalties, setPenalties] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<{ comp: Record<string, any>; lessons: Record<string, number>; paid: Record<string, number> }>({ comp: {}, lessons: {}, paid: {} });
  /* Профили педагогов (категория/даты/статус/заметки) — карта teacherId -> profile */
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const [teachers, setTeachers] = useState<any[]>(baseTeachers);
  const [fMonth, setFMonth] = useState<string>(MONTHS[MONTHS.length - 1]);
  const [fBranch, setFBranch] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("");
  const [fCat, setFCat] = useState<string>("");
  const [winnerId, setWinnerId] = useState<string | null>(null);

  /* Список реальных филиалов для фильтра/форм */
  const branchNames = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => b?.name && set.add(b.name));
    baseTeachers.forEach((t) => t.branch && t.branch !== "—" && set.add(t.branch));
    return Array.from(set);
  }, [branches, baseTeachers]);

  /* Пересобрать список педагогов из реальных данных + прикрутить штрафы и профиль */
  useEffect(() => {
    setTeachers(baseTeachers.map((t) => {
      const pr = profiles[t.id];
      return {
        ...t,
        fines: finesForTeacher(penalties, t),
        cat: pr && pr.category != null ? Number(pr.category) : t.cat,
        birth: pr && pr.birthDate ? isoToDate(pr.birthDate) : t.birth,
        hired: pr && pr.hiredOn ? isoToDate(pr.hiredOn) : t.hired,
        status: pr && pr.status ? pr.status : t.status,
        notes: pr && pr.notes ? pr.notes : "",
      };
    }));
  }, [baseTeachers, penalties, profiles]);

  /* Загрузка штрафов */
  const loadPenalties = () => {
    fetch("/api/mvp/teachers/penalties", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : { penalties: [] }))
      .then((d) => setPenalties(Array.isArray(d?.penalties) ? d.penalties : []))
      .catch(() => setPenalties([]));
  };
  /* Загрузка зарплатной ведомости */
  const loadPayroll = () => {
    fetch("/api/mvp/teachers/payroll?period=month", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPayroll({ comp: d?.comp || {}, lessons: d?.lessons || {}, paid: d?.paid || {} }))
      .catch(() => setPayroll({ comp: {}, lessons: {}, paid: {} }));
  };
  /* Загрузить профиль одного педагога в карту profiles (для таблицы/карточек) */
  const fetchProfileInto = (id: string) => {
    fetch("/api/mvp/teachers/" + id + "/profile", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d) => setProfiles((p) => ({ ...p, [id]: d?.profile || null })))
      .catch(() => {});
  };
  /* Профили всех педагогов из props — чтобы категория была видна в таблице/карточках */
  useEffect(() => {
    (teachersProp || []).forEach((t) => fetchProfileInto(t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachersProp]);
  useEffect(() => { loadPenalties(); loadPayroll(); }, []);

  const [columns, setColumns] = useState<any[]>(COLUMN_DEFS.map((c) => ({ ...c })));
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const [detailKind, setDetailKind] = useState<string | null>(null);
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  const [cardId, setCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("info");

  /* ===== данные карточки открытого педагога ===== */
  const [cardProfile, setCardProfile] = useState<any>(null);
  const [cardKpi, setCardKpi] = useState<any[]>([]);
  const [cardReviews, setCardReviews] = useState<any[]>([]);
  const [cardAtt, setCardAtt] = useState<any[]>([]);
  const [cardStd, setCardStd] = useState<any[]>([]);

  /* редактор профиля/категории в карточке (вкладка «Общая») */
  const [profEdit, setProfEdit] = useState<any>({ ct: "", birth: "", hired: "", st: "", notes: "" });
  /* ввод KPI по месяцам */
  const [kpiMonth, setKpiMonth] = useState<string>(labelToPeriod(MONTHS[MONTHS.length - 1]));
  const [kpiForm, setKpiForm] = useState<any>({ retention: "", funnel: "", standards: "", reviewAvg: "", comment: "" });
  /* формы отзыва / аттестации / стандарта */
  const [revForm, setRevForm] = useState<any>({ author: "", source: "Родитель", stars: 5, text: "" });
  const [attForm, setAttForm] = useState<any>({ date: "", direction: "", result: "Аттестован", mark: "", note: "" });
  const [stdForm, setStdForm] = useState<any>({ title: "", detail: "" });

  const loadCardProfile = (id: string) => {
    fetch("/api/mvp/teachers/" + id + "/profile", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d) => {
        const pr = d?.profile || null;
        setCardProfile(pr);
        setProfEdit({
          ct: pr && pr.category != null ? String(pr.category) : "",
          birth: isoToInput(pr?.birthDate), hired: isoToInput(pr?.hiredOn),
          st: pr?.status || "", notes: pr?.notes || "",
        });
        setProfiles((p) => ({ ...p, [id]: pr }));
      })
      .catch(() => { setCardProfile(null); });
  };
  const loadCardKpi = (id: string) => {
    fetch("/api/mvp/teachers/" + id + "/kpi", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : { kpi: [] }))
      .then((d) => setCardKpi(Array.isArray(d?.kpi) ? d.kpi : []))
      .catch(() => setCardKpi([]));
  };
  const loadCardReviews = (id: string) => {
    fetch("/api/mvp/teachers/" + id + "/reviews", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d) => setCardReviews(Array.isArray(d?.reviews) ? d.reviews : []))
      .catch(() => setCardReviews([]));
  };
  const loadCardAtt = (id: string) => {
    fetch("/api/mvp/teachers/" + id + "/attestations", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : { attestations: [] }))
      .then((d) => setCardAtt(Array.isArray(d?.attestations) ? d.attestations : []))
      .catch(() => setCardAtt([]));
  };
  const loadCardStd = (id: string) => {
    fetch("/api/mvp/teachers/" + id + "/standards", { headers: DEMO_HEADERS })
      .then((r) => (r.ok ? r.json() : { standards: [] }))
      .then((d) => setCardStd(Array.isArray(d?.standards) ? d.standards : []))
      .catch(() => setCardStd([]));
  };

  /* при открытии карточки конкретного педагога — тянем все его данные */
  useEffect(() => {
    if (cardId == null) return;
    loadCardProfile(cardId); loadCardKpi(cardId); loadCardReviews(cardId); loadCardAtt(cardId); loadCardStd(cardId);
    setKpiMonth(labelToPeriod(fMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  /* подставить существующий KPI выбранного месяца в форму ввода */
  useEffect(() => {
    const e = cardKpi.find((x) => x.periodMonth === kpiMonth);
    setKpiForm(e
      ? { retention: String(e.retention ?? ""), funnel: String(e.funnel ?? ""), standards: String(e.standards ?? ""), reviewAvg: String(e.reviewAvg ?? ""), comment: e.comment || "" }
      : { retention: "", funnel: "", standards: "", reviewAvg: "", comment: "" });
  }, [cardKpi, kpiMonth]);

  /* ===== мутации данных карточки ===== */
  const saveProfile = (id: string) => {
    const body = {
      category: profEdit.ct ? Number(profEdit.ct) : null,
      birthDate: profEdit.birth || null,
      hiredOn: profEdit.hired || null,
      status: profEdit.st || null,
      notes: profEdit.notes || null,
    };
    fetch("/api/mvp/teachers/" + id + "/profile", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(body) })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardProfile(id); toast("Профиль сохранён"); })
      .catch(() => toast("Не удалось сохранить профиль"));
  };
  const saveKpi = (id: string) => {
    const body = {
      periodMonth: kpiMonth,
      retention: Number(kpiForm.retention) || 0,
      funnel: Number(kpiForm.funnel) || 0,
      standards: Number(kpiForm.standards) || 0,
      reviewAvg: Number(kpiForm.reviewAvg) || 0,
      comment: (kpiForm.comment || "").trim(),
    };
    fetch("/api/mvp/teachers/" + id + "/kpi", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardKpi(id); toast("KPI сохранён за " + periodToLabel(kpiMonth)); })
      .catch(() => toast("Не удалось сохранить KPI"));
  };
  const addReview = (id: string) => {
    if (!revForm.author.trim()) { toast("Укажите автора отзыва"); return; }
    if (!revForm.text.trim()) { toast("Введите текст отзыва"); return; }
    const body = { author: revForm.author.trim(), source: revForm.source || undefined, stars: Number(revForm.stars) || 5, text: revForm.text.trim() };
    fetch("/api/mvp/teachers/" + id + "/reviews", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardReviews(id); setRevForm({ author: "", source: "Родитель", stars: 5, text: "" }); toast("Отзыв добавлен"); })
      .catch(() => toast("Не удалось добавить отзыв"));
  };
  const delReview = (id: string, rid: string) => {
    if (!window.confirm("Удалить отзыв?")) return;
    fetch("/api/mvp/teachers/" + id + "/reviews/" + rid, { method: "DELETE", headers: DEMO_HEADERS })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardReviews(id); toast("Отзыв удалён"); })
      .catch(() => toast("Не удалось удалить отзыв"));
  };
  const addAtt = (id: string) => {
    if (!attForm.direction.trim()) { toast("Укажите направление аттестации"); return; }
    const body = { date: attForm.date || null, direction: attForm.direction.trim(), result: attForm.result, mark: attForm.mark.trim() || "—", note: attForm.note.trim() };
    fetch("/api/mvp/teachers/" + id + "/attestations", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardAtt(id); setAttForm({ date: "", direction: "", result: "Аттестован", mark: "", note: "" }); toast("Аттестация добавлена"); })
      .catch(() => toast("Не удалось добавить аттестацию"));
  };
  const delAtt = (id: string, aid: string) => {
    if (!window.confirm("Удалить запись об аттестации?")) return;
    fetch("/api/mvp/teachers/" + id + "/attestations/" + aid, { method: "DELETE", headers: DEMO_HEADERS })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardAtt(id); toast("Аттестация удалена"); })
      .catch(() => toast("Не удалось удалить аттестацию"));
  };
  const addStd = (id: string) => {
    if (!stdForm.title.trim()) { toast("Введите название пункта стандарта"); return; }
    const body = { title: stdForm.title.trim(), detail: stdForm.detail.trim() || undefined, state: "n", sort: cardStd.length };
    fetch("/api/mvp/teachers/" + id + "/standards", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardStd(id); setStdForm({ title: "", detail: "" }); toast("Пункт добавлен"); })
      .catch(() => toast("Не удалось добавить пункт"));
  };
  const cycleStd = (id: string, s: any) => {
    const next = s.state === "y" ? "p" : s.state === "p" ? "n" : "y";
    fetch("/api/mvp/teachers/" + id + "/standards/" + s.id, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ state: next }) })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => loadCardStd(id))
      .catch(() => toast("Не удалось изменить статус"));
  };
  const delStd = (id: string, sid: string) => {
    if (!window.confirm("Удалить пункт стандарта?")) return;
    fetch("/api/mvp/teachers/" + id + "/standards/" + sid, { method: "DELETE", headers: DEMO_HEADERS })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadCardStd(id); toast("Пункт удалён"); })
      .catch(() => toast("Не удалось удалить пункт"));
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", phone: "", birth: "", hired: "", br: "", ct: "", rl: "Преподаватель", spec: "", st: "Активен", notes: "", login: "", pass: "", loginTouched: false, ava: "+" });

  const [payOpen, setPayOpen] = useState(false);
  const [payWho, setPayWho] = useState<string>("");
  const [payMonth, setPayMonth] = useState<string>(MONTHS[MONTHS.length - 1]);

  const [finesLogOpen, setFinesLogOpen] = useState(false);
  const [logMonth, setLogMonth] = useState<string>("");
  const [logWho, setLogWho] = useState<string>("");

  const [fineOpen, setFineOpen] = useState(false);
  const [fineId, setFineId] = useState<string | null>(null);
  const [fineMonth, setFineMonth] = useState<string>(MONTHS[MONTHS.length - 1]);
  const [fineReason, setFineReason] = useState<string>("Опоздание");
  const [fineSum, setFineSum] = useState<string>("");
  const [fineNote, setFineNote] = useState<string>("");
  const [fineBy, setFineBy] = useState<string>("Владелец");

  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  /* ===== toast ===== */
  const toast = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, msg }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2600);
  };

  /* ===== derived ===== */
  /* какие категории реально заданы (для показа фильтра) */
  const catValues = useMemo(() => {
    const set = new Set<number>();
    teachers.forEach((t) => { if (t.cat != null) set.add(Number(t.cat)); });
    return Array.from(set).sort((a, b) => a - b);
  }, [teachers]);
  const filtered = teachers.filter(
    (t) => (!fBranch || t.branch === fBranch) && (!fStatus || t.status === fStatus) && (!fCat || String(t.cat) === fCat)
  );
  const finesSumForMonth = (t: any, mn: string): number => (t.fines?.[mn] || []).reduce((s: number, f: any) => s + (f.sum || 0), 0);
  const withM = teachers.map((t) => ({ t, m: monthData(t, fMonth) })).filter((x) => x.m);
  const avgRet = withM.length ? withM.reduce((s, x) => s + x.m.ret, 0) / withM.length : 0;
  const avgKpi = withM.length ? withM.reduce((s, x) => s + kpiTotal(kpiComponents(x.m)), 0) / withM.length : 0;

  /* Педагог месяца: ИИ-предложение = лучший KPI */
  let best: any = null, bestK = -1;
  withM.forEach((x) => { const k = kpiTotal(kpiComponents(x.m)); if (k > bestK) { bestK = k; best = x.t; } });
  const winner = teachers.find((t) => t.id === winnerId) || best;

  /* ===== actions ===== */
  const showDetail = (kind: string) => { setDetailKind(kind); };
  const closeDetail = () => setDetailKind(null);
  const toggleSub = (id: string) => setOpenSubs((s) => ({ ...s, [id]: !s[id] }));
  const approveTOM = (id: string) => { setWinnerId(id); const t = teachers.find((x) => x.id === id); if (t) toast("Педагог месяца утверждён: " + t.name + " (+20 000 тг)"); };

  const openCard = (id: string) => { setCardId(id); setActiveTab("info"); setDetailKind(null); };
  const closeCard = () => setCardId(null);

  const toggleCol = (id: string, on: boolean) => setColumns((cols) => cols.map((c) => (c.id === id ? { ...c, on } : c)));

  const defaultBranch = () => branchNames[0] || "";
  const openForm = (id?: string) => {
    if (id != null) {
      const t = teachers.find((x) => x.id === id);
      if (!t) return;
      setEditId(id);
      const pr = profiles[id] || {};
      setForm({ name: t.name, phone: t.phone, birth: isoToInput(pr.birthDate), hired: isoToInput(pr.hiredOn), br: t.branch, ct: pr.category != null ? String(pr.category) : (t.cat == null ? "" : String(t.cat)), rl: t.role, spec: t.spec === "—" ? "" : t.spec, st: t.status, notes: pr.notes || t.notes || "", login: t.login || t.phone, pass: t.pass || "", loginTouched: false, ava: t.initials });
    } else {
      setEditId(null);
      setForm({ name: "", phone: "", birth: "", hired: "", br: defaultBranch(), ct: "", rl: "Преподаватель", spec: "", st: "Активен", notes: "", login: "", pass: "", loginTouched: false, ava: "+" });
    }
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);
  const genPass = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setForm((f: any) => ({ ...f, pass: p }));
    toast("Пароль сгенерирован: " + p);
  };
  const saveForm = () => {
    const name = form.name.trim();
    if (!name) { toast("Введите ФИО"); return; }
    if (!form.phone.trim()) { toast("Введите телефон"); return; }
    const parts = name.split(" ");
    const initials = ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).toUpperCase();
    if (editId) {
      setTeachers((list) => list.map((t) => t.id === editId ? {
        ...t, name, phone: form.phone, spec: form.spec.trim() || "—", branch: form.br, role: form.rl, status: form.st,
        initials, login: form.login.trim() || form.phone.trim(), pass: form.pass,
      } : t));
      /* профиль (категория/даты/статус/заметки) сохраняем на сервере для реального педагога */
      if (!String(editId).startsWith("local-")) {
        const pbody = {
          category: form.ct ? Number(form.ct) : null,
          birthDate: form.birth || null,
          hiredOn: form.hired || null,
          status: form.st || null,
          notes: form.notes || null,
        };
        fetch("/api/mvp/teachers/" + editId + "/profile", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(pbody) })
          .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
          .then(() => fetchProfileInto(editId))
          .catch(() => toast("Профиль не сохранён на сервере"));
      }
      toast("Сохранено: " + name);
    } else {
      setTeachers((list) => {
        const id = "local-" + Date.now();
        const nt = {
          id, name, initials, phone: form.phone, spec: form.spec.trim() || "—", branch: form.br, cat: null, role: form.rl, status: form.st,
          login: form.login.trim() || form.phone.trim(), pass: form.pass,
          birth: "—", hired: form.hired || "—", years: "—", thanks: 0, ltvMonths: 0, bio: "", studentsCount: 0, fines: {}, leavers: {},
          byMonth: Object.fromEntries(MONTHS.map((mn) => [mn, null])),
          groups: [],
          standards: [],
          training: [],
          attest: [],
          reviews: [],
          ai: null,
        };
        return [...list, nt];
      });
      toast("Добавлен преподаватель: " + name);
    }
    closeForm();
  };
  const archive = (id: string) => {
    const t = teachers.find((x) => x.id === id);
    if (!t) return;
    if (window.confirm("Архивировать преподавателя «" + t.name + "»? Это действие можно отменить в разделе «Архив».")) {
      setTeachers((list) => list.filter((x) => x.id !== id));
      toast("В архив: " + t.name);
    }
  };

  const markArrival = (name: string) => toast("📷 Камера: фото прихода для " + name + " — штамп времени поставит сервер");
  const uploadPlan = (name: string) => toast("📎 Выбор файла плана работы для " + name);

  const openFinesLog = () => { setLogMonth(fMonth); setLogWho(""); setFinesLogOpen(true); };
  const closeFinesLog = () => setFinesLogOpen(false);

  const openPayroll = () => { setPayWho(teachers[0]?.id || ""); setPayMonth(MONTHS[MONTHS.length - 1]); setPayOpen(true); };
  const closePayroll = () => setPayOpen(false);

  const openFine = (id: string, mn?: string) => {
    setFineId(id);
    setFineMonth(mn || fMonth);
    setFineReason("Опоздание");
    setFineSum("");
    setFineNote("");
    setFineBy("Владелец");
    setFineOpen(true);
  };
  const openFineFromLog = () => {
    const id = logWho || teachers[0]?.id;
    if (!id) { toast("Нет преподавателей для начисления штрафа"); return; }
    setFinesLogOpen(false);
    openFine(id, logMonth || undefined);
  };
  const closeFine = () => setFineOpen(false);
  const saveFine = () => {
    const sum = parseInt(fineSum, 10);
    if (!sum || sum <= 0) { toast("Введите сумму штрафа"); return; }
    const t = teachers.find((x) => x.id === fineId);
    if (!t) { toast("Преподаватель не найден"); return; }
    const body = {
      teacherId: t.id,
      teacherName: t.name,
      reason: fineReason,
      amount: sum,
      period_month: labelToPeriod(fineMonth),
      created_by: fineBy,
      comment: fineNote.trim(),
    };
    fetch("/api/mvp/teachers/penalties", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...DEMO_HEADERS },
      body: JSON.stringify(body),
    })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadPenalties(); toast("Штраф начислен: " + t.name + " — " + money(sum) + " (" + fineReason + ")"); })
      .catch(() => toast("Не удалось начислить штраф"));
    setFineOpen(false);
    if (cardId != null) setActiveTab("fines");
  };
  const deleteFine = (fine: any) => {
    if (!fine?.id) { toast("Штраф без идентификатора нельзя удалить"); return; }
    if (!window.confirm("Удалить штраф на сумму " + money(fine.sum) + "?")) return;
    fetch("/api/mvp/teachers/penalties/" + fine.id, { method: "DELETE", headers: DEMO_HEADERS })
      .then((r) => { if (!r.ok) throw new Error("fail"); return r.json(); })
      .then(() => { loadPenalties(); toast("Штраф удалён"); })
      .catch(() => toast("Не удалось удалить штраф"));
  };

  /* ===== cell renderer ===== */
  const renderCell = (id: string, t: any, m: any, k: number, sal: any): any => {
    switch (id) {
      case "spec": return t.spec;
      case "branch": return t.branch;
      case "cat": return <span className="badge b-role">{catName(t.cat)}</span>;
      case "ret": return m ? (<><div className={"meter " + retClass(m.ret)}><span style={{ width: m.ret + "%" }} /></div><small style={{ color: "var(--muted)" }}>{m.ret}%</small></>) : "—";
      case "kpi": return <b>{m ? k : "—"}</b>;
      case "fines": { const fs = finesSumForMonth(t, fMonth); return fs ? <span style={{ color: "var(--red)", fontWeight: 700 }}>− {money(fs)}</span> : <span style={{ color: "var(--muted)" }}>—</span>; }
      case "sal": return sal ? money(sal.total) : "—";
      case "students": return t.studentsCount;
      case "funnel": return m ? m.funnel + "%" : "—";
      case "rev": return m && m.rev ? m.rev.toFixed(1) + " ★" : "—";
      case "std": return m ? m.std + "%" : "—";
      case "phone": return t.phone;
      case "role": return <span className="badge b-role">{t.role}</span>;
      default: return "—";
    }
  };
  const activeCols = columns.filter((c) => c.on);

  /* ===== detail rows ===== */
  const detailActionsBar = (
    <div className="modal-foot" style={{ justifyContent: "flex-start", marginBottom: 6 }}>
      <button className="btn-sm" onClick={openFinesLog} style={{ borderColor: "#EBC4B6", color: "var(--red)" }}>Штрафы</button>
      <button className="btn-sm" onClick={openPayroll}>Рассчитать ЗП</button>
      <button className="btn-sm" onClick={() => openForm()}>+ Добавить преподавателя</button>
    </div>
  );
  const detailRow = (t: any, right: any) => (
    <div className="drow" key={t.id} onClick={() => openCard(t.id)}>
      <div><div className="nm">{t.name}</div><div className="meta">{catName(t.cat)} · {t.branch}</div></div>
      <div style={{ textAlign: "right" }}>{right}</div>
    </div>
  );

  const renderDetail = () => {
    const mn = fMonth;
    const list = teachers.filter((t) => monthData(t, mn));
    let title = "";
    let rows: any = null;
    if (detailKind === "all") {
      title = "Все преподаватели сети";
      rows = teachers.map((t) => detailRow(t, <><b>{t.studentsCount}</b> уч. · {t.status}</>));
    } else if (detailKind === "active") {
      title = "Активные преподаватели";
      rows = teachers.filter((t) => t.status === "Активен").map((t) => detailRow(t, <><b>{t.studentsCount}</b> уч.</>));
    } else if (detailKind === "intern") {
      title = "Стажёры";
      rows = teachers.filter((t) => t.status === "Стажер").map((t) => detailRow(t, <>принят {t.hired}</>));
    } else if (detailKind === "ret") {
      title = "Удержание по педагогам · " + mn;
      rows = list.map((t) => {
        const m = monthData(t, mn);
        const lv = t.leavers && t.leavers[mn] ? t.leavers[mn] : [];
        const subId = "ret" + t.id;
        return (
          <div key={t.id}>
            <div className="drow" onClick={() => toggleSub(subId)}>
              <div><div className="nm">{t.name} {lv.length ? <span style={{ color: "var(--gold-ink)", fontSize: 13 }}>· показать ушедших ▾</span> : null}</div><div className="meta">{catName(t.cat)} · {t.branch}</div></div>
              <div style={{ textAlign: "right" }}><b>{m.ret}%</b> · ушло {m.left}</div>
            </div>
            {lv.length && openSubs[subId] ? (
              <div style={{ padding: "0 0 10px 0" }}>
                <table className="sal-table"><thead><tr><th>Ученик</th><th>Группа</th><th>Филиал</th><th>Дата ухода</th><th>Причина</th></tr></thead>
                  <tbody>{lv.map((s: any, i: number) => (<tr key={i}><td><b>{s.name}</b></td><td>{s.group}</td><td>{s.branch}</td><td>{s.date}</td><td>{s.reason}</td></tr>))}</tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      });
    } else if (detailKind === "kpi") {
      title = "KPI по педагогам · " + mn;
      rows = list.map((t) => {
        const m = monthData(t, mn); const c = kpiComponents(m); const k = kpiTotal(c); const w = KPI_WEIGHTS;
        const subId = "kpi" + t.id;
        const part = (label: string, val: number, wt: number, i: number) => (<tr key={i}><td>{label}</td><td className="r">{val}</td><td className="r">{wt}%</td><td className="r"><b>{((val * wt) / 100).toFixed(1)}</b></td></tr>);
        return (
          <div key={t.id}>
            <div className="drow" onClick={() => toggleSub(subId)}>
              <div><div className="nm">{t.name} <span style={{ color: "var(--gold-ink)", fontSize: 13 }}>· показать формулу ▾</span></div><div className="meta">{catName(t.cat)} · {t.branch}</div></div>
              <div style={{ textAlign: "right" }}><b>{k}</b>/100</div>
            </div>
            {openSubs[subId] ? (
              <div style={{ padding: "0 0 10px 0" }}>
                <table className="sal-table"><thead><tr><th>Компонент</th><th className="r">Балл</th><th className="r">Вес</th><th className="r">Вклад</th></tr></thead>
                  <tbody>
                    {part("Удержание из мес. в мес.", c.ret, w.ret, 0)}
                    {part("Воронка ПУ (приход → покупка)", c.funnel, w.funnel, 1)}
                    {part("Отзывы родителей", c.reviews, w.reviews, 2)}
                    {part("Выполнение стандартов", c.standards, w.standards, 3)}
                    <tr style={{ background: "var(--gold-soft)" }}><td><b>Итоговый KPI</b></td><td className="r" /><td className="r" /><td className="r"><b>{k}/100</b></td></tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      });
    }
    const hasRows = Array.isArray(rows) && rows.length > 0;
    return (
      <div className={"detail" + (detailKind ? " open" : "")}>
        <div className="dh"><b>{title}</b><button className="x" onClick={closeDetail}>×</button></div>
        <div className="dbody">
          {hasRows ? detailActionsBar : null}
          {hasRows ? rows : <p className="note">Нет данных за выбранный месяц.</p>}
        </div>
      </div>
    );
  };

  /* ===== salary detail (shared card tab + payroll) =====
     Показываем РЕАЛЬНУЮ зарплатную схему из /payroll (comp/lessons/paid).
     Итоговую сумму система здесь не считает (нужна выручка) — не выдумываем число. */
  const salaryDetail = (t: any, mn: string, variant: "card" | "payroll") => {
    const comp = payroll.comp[t.id];
    const lessons = payroll.lessons[t.id] ?? 0;
    const paidSum = payroll.paid[t.id] ?? 0;
    const finesSum = finesSumForMonth(t, mn);
    const fineList = t.fines?.[mn] || [];
    if (!comp) {
      return (
        <>
          <Empty>Схема оплаты для этого педагога ещё не задана.</Empty>
          <div className="modal-foot" style={{ justifyContent: "flex-start", marginTop: 12 }}>
            <button className="btn-sm" onClick={() => openFine(t.id, mn)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Начислить штраф</button>
          </div>
        </>
      );
    }
    return (
      <>
        <div className="sal-hero">
          <div className="k">Схема оплаты · {mn}</div>
          <div className="v" style={{ fontSize: 24 }}>{SCHEME_LABEL[comp.scheme] || comp.scheme}</div>
          <div className="sub">{t.name}{comp.comment ? " · " + comp.comment : ""}</div>
        </div>
        <h4>Параметры схемы</h4>
        <div className="sal-line"><span>Оклад (фикс. часть)</span><span>{comp.baseSalary ? money(comp.baseSalary) : "—"}</span></div>
        <div className="sal-line"><span>Процент от выручки</span><span>{comp.percent ? comp.percent + "%" : "—"}</span></div>
        <div className="sal-line"><span>Ставка за занятие</span><span>{comp.perLessonRate ? money(comp.perLessonRate) : "—"}</span></div>
        <div className="sal-line"><span>Проведено занятий за период</span><span><b>{lessons}</b></span></div>
        <h4>Штрафы за {mn}</h4>
        {fineList.length ? fineList.map((f: any, i: number) => (
          <div className="sal-line" key={i}><span style={{ color: "var(--red)" }}>Штраф · {f.reason} <span style={{ color: "var(--muted)", fontSize: 13 }}>({f.date}{f.by ? " · " + f.by : ""})</span></span><span style={{ color: "var(--red)", fontWeight: 700 }}>− {money(f.sum)}</span></div>
        )) : <p className="note">Штрафов за месяц нет.</p>}
        <div className="sal-line"><span>Штрафы итого {finesSum ? "" : "(нет)"}</span><span style={{ color: "var(--red)", fontWeight: 700 }}>{finesSum ? "− " + money(finesSum) : money(0)}</span></div>
        <div className="sal-line total"><span>Уже выплачено за период</span><span>{money(paidSum)}</span></div>
        <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
          {variant === "card"
            ? <button className="btn-sm" onClick={() => setActiveTab("fines")} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Управлять штрафами →</button>
            : <button className="btn-sm" onClick={() => openFine(t.id, mn)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Начислить штраф</button>}
        </div>
        <p className="note">Итоговая сумма к выплате рассчитывается бухгалтерией из схемы оплаты, числа проведённых занятий и выручки групп. Штрафы вычитаются автоматически.</p>
      </>
    );
  };

  /* ===== fines tab (карточка педагога) ===== */
  const finesTab = (t: any) => {
    const mn = fMonth;
    const all = t.fines || {};
    let allRows: any[] = [];
    Object.keys(all).forEach((month) => { (all[month] || []).forEach((f: any) => allRows.push({ ...f, month })); });
    const monthSum = (all[mn] || []).reduce((s: number, f: any) => s + f.sum, 0);
    const totalSum = allRows.reduce((s, f) => s + f.sum, 0);
    allRows = allRows.slice().sort((a, b) => (b.month === mn ? 1 : 0) - (a.month === mn ? 1 : 0));
    return (
      <>
        <div className="grid2" style={{ marginBottom: 8 }}>
          <div className="kpi"><div className="v" style={{ color: "var(--red)" }}>{money(monthSum)}</div><div className="k">Штрафы за {mn}</div></div>
          <div className="kpi"><div className="v" style={{ color: "var(--red)" }}>{money(totalSum)}</div><div className="k">Всего штрафов (история)</div></div>
        </div>
        <div className="modal-foot" style={{ justifyContent: "flex-start", margin: "6px 0 14px" }}>
          <button className="btn-sm" onClick={() => openFine(t.id)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>+ Начислить штраф</button>
        </div>
        {!allRows.length ? <p className="note">Штрафов нет. Чистая история.</p> : (
          <>
            <h4>История штрафов</h4>
            {allRows.map((f, i) => (
              <div className="row-item" key={f.id || i}>
                <div><div className="ttl" style={{ color: "var(--red)" }}>{f.reason} · {money(f.sum)}</div>
                  <div className="det">{f.month} · {f.date}{f.note ? " · " + f.note : ""} · начислил: {f.by || "—"}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={"badge " + (f.month === mn ? "b-red" : "b-gray")}>{f.month === mn ? "текущий месяц" : f.month}</span>
                  <button className="btn-sm" onClick={() => deleteFine(f)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Удалить</button>
                </div>
              </div>
            ))}
            <p className="note">Штрафы вычитаются из итоговой ЗП автоматически. Начисляют владелец и управляющий.</p>
          </>
        )}
      </>
    );
  };

  /* ===== card panes ===== */
  const renderCardPanes = (t: any, m: any) => {
    const comp = kpiComponents(m); const k = kpiTotal(comp);
    const pane = (key: string, body: any, extra?: any) => (
      <div className={"pane" + (activeTab === key ? " active" : "")} id={"pane-" + key} key={key} style={extra}>{body}</div>
    );
    const sLabel: any = { y: "✓", n: "✕", p: "~" };
    const stdBtn = (x: any) => {
      if (x.type === "photo") return <button className="btn-sm" onClick={() => markArrival(t.name)}>📷 Отметить приход</button>;
      if (x.type === "plan") return <button className="btn-sm" onClick={() => uploadPlan(t.name)}>📎 Загрузить план</button>;
      if (x.type === "journal") return <button className="btn-sm" onClick={() => toast("Открыт раздел «Журнал посещаемости»")}>Открыть журнал</button>;
      return <button className="btn-sm" onClick={() => toast("Запрос оценки отправлен родителям")}>Запросить оценку</button>;
    };
    const tb = (s: string) => (s === "Аттестован" ? "b-green" : s === "В процессе" ? "b-role" : "b-gray");
    const base = t.training.filter((x: any) => x.base);
    const extra = t.training.filter((x: any) => !x.base);
    const kpiRows = comp ? [["Удержание из мес. в мес.", comp.ret, KPI_WEIGHTS.ret], ["Воронка ПУ (приход → покупка)", comp.funnel, KPI_WEIGHTS.funnel], ["Отзывы родителей", comp.reviews, KPI_WEIGHTS.reviews], ["Выполнение стандартов", comp.standards, KPI_WEIGHTS.standards]] : [];

    return [
      /* INFO */
      pane("info", (
        <>
          <h4>Основная информация</h4>
          <div className="grid3">
            <div className="info"><div className="k">Телефон</div><div className="v">{t.phone}</div></div>
            <div className="info"><div className="k">Дата рождения</div><div className="v">{t.birth}</div></div>
            <div className="info"><div className="k">Принят на работу</div><div className="v">{t.hired}</div></div>
            <div className="info"><div className="k">Стаж работы</div><div className="v">{t.years}</div></div>
            <div className="info"><div className="k">LTV учеников</div><div className="v">{t.ltvMonths} мес.</div></div>
            <div className="info"><div className="k">Категория</div><div className="v">{catName(t.cat)}</div></div>
            <div className="info"><div className="k">Роль</div><div className="v">{t.role}</div></div>
            <div className="info"><div className="k">Статус</div><div className="v">{t.status}</div></div>
            <div className="info"><div className="k">Специализация</div><div className="v">{t.spec}</div></div>
          </div>
          {t.notes ? (<div className="info" style={{ marginTop: 10 }}><div className="k">Заметки</div><div className="v" style={{ fontWeight: 400 }}>{t.notes}</div></div>) : null}
          <h4>Профиль и категория</h4>
          {!cardProfile ? <Empty>Профиль ещё не заполнен — задайте категорию, даты и статус ниже.</Empty> : null}
          <div className="form-grid" style={{ marginTop: 10 }}>
            <div className="field"><label>Категория</label><select value={profEdit.ct} onChange={(e) => setProfEdit((p: any) => ({ ...p, ct: e.target.value }))}><option value="">Не задана</option><option value="1">1 категория</option><option value="2">2 категория</option><option value="3">3 категория</option></select></div>
            <div className="field"><label>Статус</label><select value={profEdit.st} onChange={(e) => setProfEdit((p: any) => ({ ...p, st: e.target.value }))}><option value="">— не задан —</option><option>Активен</option><option>Стажер</option></select></div>
            <div className="field"><label>Дата рождения</label><input type="date" value={profEdit.birth} onChange={(e) => setProfEdit((p: any) => ({ ...p, birth: e.target.value }))} /></div>
            <div className="field"><label>Дата приёма</label><input type="date" value={profEdit.hired} onChange={(e) => setProfEdit((p: any) => ({ ...p, hired: e.target.value }))} /></div>
            <div className="field full"><label>Заметки</label><textarea rows={2} value={profEdit.notes} placeholder="Внутренние заметки о педагоге" onChange={(e) => setProfEdit((p: any) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-sm" onClick={() => saveProfile(t.id)}>Сохранить профиль</button>
          </div>
          <h4>Доступ в личный кабинет</h4>
          <div className="grid3">
            <div className="info"><div className="k">Логин</div><div className="v">{t.login || t.phone}</div></div>
            <div className="info"><div className="k">Пароль</div><div className="v">{t.pass ? "••••••••" : <span style={{ color: "var(--muted)" }}>не задан</span>}</div></div>
            <div className="info"><div className="k">Кабинет</div><div className="v" style={{ color: "var(--green)" }}>{t.pass ? "Активен" : "Нет доступа"}</div></div>
          </div>
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-sm" onClick={() => { closeCard(); openForm(t.id); }}>Редактировать карточку</button>
            {t.pass ? <button className="btn-sm" onClick={() => toast("Данные для входа отправлены: " + (t.login || t.phone))}>Отправить доступ педагогу</button> : null}
          </div>
        </>
      )),
      /* KPI */
      pane("kpi", (() => {
        const cur = cardKpi.find((e) => e.periodMonth === kpiMonth);
        const cComp = cur ? kpiComponents({ ret: Number(cur.retention) || 0, funnel: Number(cur.funnel) || 0, rev: Number(cur.reviewAvg) || 0, std: Number(cur.standards) || 0 }) : null;
        const cK = cComp ? kpiTotal(cComp) : null;
        const cRows = cComp ? [["Удержание из мес. в мес.", cComp.ret, KPI_WEIGHTS.ret], ["Воронка ПУ (приход → покупка)", cComp.funnel, KPI_WEIGHTS.funnel], ["Отзывы родителей", cComp.reviews, KPI_WEIGHTS.reviews], ["Выполнение стандартов", cComp.standards, KPI_WEIGHTS.standards]] : [];
        return (
          <>
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="field"><label>Месяц KPI</label><select value={kpiMonth} onChange={(e) => setKpiMonth(e.target.value)}>{MONTHS.map((mn) => { const p = labelToPeriod(mn); return (<option key={p} value={p}>{mn}</option>); })}</select></div>
            </div>
            {cComp ? (
              <>
                <div className="kpi final" style={{ marginBottom: 18 }}><div className="v">{cK}</div><div className="k">Итоговый KPI за {periodToLabel(kpiMonth)} · из 100</div></div>
                {cRows.map((r: any, i: number) => (
                  <div className="kbar" key={i}>
                    <div className="hd"><span className="nm">{r[0]}</span><span><span className="wt">вес {r[2]}% · </span><span className="sc">{r[1]}</span></span></div>
                    <div className="track"><div className="fill" style={{ width: r[1] + "%", background: fillColor(r[1]) }} /></div>
                  </div>
                ))}
              </>
            ) : <Empty>За {periodToLabel(kpiMonth)} KPI ещё не введён — заполните форму ниже.</Empty>}
            <h4>Ввод / редактирование KPI · {periodToLabel(kpiMonth)}</h4>
            <div className="form-grid">
              <div className="field"><label>Удержание, %</label><input type="number" min={0} max={100} value={kpiForm.retention} placeholder="0..100" onChange={(e) => setKpiForm((f: any) => ({ ...f, retention: e.target.value }))} /></div>
              <div className="field"><label>Воронка ПУ, %</label><input type="number" min={0} max={100} value={kpiForm.funnel} placeholder="0..100" onChange={(e) => setKpiForm((f: any) => ({ ...f, funnel: e.target.value }))} /></div>
              <div className="field"><label>Стандарты, %</label><input type="number" min={0} max={100} value={kpiForm.standards} placeholder="0..100" onChange={(e) => setKpiForm((f: any) => ({ ...f, standards: e.target.value }))} /></div>
              <div className="field"><label>Средняя оценка, 0..5</label><input type="number" min={0} max={5} step={0.1} value={kpiForm.reviewAvg} placeholder="0..5" onChange={(e) => setKpiForm((f: any) => ({ ...f, reviewAvg: e.target.value }))} /></div>
              <div className="field full"><label>Комментарий</label><textarea rows={2} value={kpiForm.comment} placeholder="Заметка к KPI за месяц" onChange={(e) => setKpiForm((f: any) => ({ ...f, comment: e.target.value }))} /></div>
            </div>
            <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
              <button className="btn-sm" onClick={() => saveKpi(t.id)}>Сохранить KPI за месяц</button>
            </div>
            {cardKpi.length ? (
              <>
                <h4>Введённые KPI по месяцам</h4>
                {cardKpi.slice().sort((a, b) => (a.periodMonth < b.periodMonth ? 1 : -1)).map((e) => {
                  const ec = kpiComponents({ ret: Number(e.retention) || 0, funnel: Number(e.funnel) || 0, rev: Number(e.reviewAvg) || 0, std: Number(e.standards) || 0 });
                  return (
                    <div className="row-item" key={e.id || e.periodMonth} onClick={() => setKpiMonth(e.periodMonth)} style={{ cursor: "pointer" }}>
                      <div><div className="ttl">{periodToLabel(e.periodMonth)} · KPI {kpiTotal(ec)}/100</div><div className="det">удержание {e.retention}% · воронка {e.funnel}% · стандарты {e.standards}% · оценка {Number(e.reviewAvg).toFixed(1)}★{e.comment ? " · " + e.comment : ""}</div></div>
                      <div style={{ textAlign: "right" }}><b>{kpiTotal(ec)}</b></div>
                    </div>
                  );
                })}
              </>
            ) : <Empty>Данных пока нет — KPI ещё не вводились.</Empty>}
            <p className="note">Итог = удержание×{KPI_WEIGHTS.ret}% + воронка×{KPI_WEIGHTS.funnel}% + отзывы×{KPI_WEIGHTS.reviews}% + стандарты×{KPI_WEIGHTS.standards}%. Влияет на категорию, звание «Педагог месяца» и бонусы.</p>
          </>
        );
      })()),
      /* GROUPS */
      pane("groups", (
        <>
          <h4>Закреплённые группы</h4>
          {t.groups.length ? t.groups.map((g: any, i: number) => (
            <div className="row-item" key={i}>
              <div><div className="ttl">{g.name}</div><div className="det">{g.st} учеников · свободно {g.free} · удержание {g.ret == null ? "—" : g.ret + "%"}</div></div>
              <div style={{ textAlign: "right" }}><div className={"meter " + retClass(g.fill)} style={{ marginLeft: "auto" }}><span style={{ width: g.fill + "%" }} /></div><small style={{ color: "var(--muted)" }}>заполн. {g.fill}%</small></div>
            </div>
          )) : <Empty>У педагога пока нет закреплённых групп.</Empty>}
        </>
      )),
      /* STANDARDS */
      pane("std", (
        <>
          <h4>Чек-лист стандартов</h4>
          {cardStd.length ? cardStd.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map((x: any) => (
            <div className="std" key={x.id}>
              <div className={"ck " + x.state} onClick={() => cycleStd(t.id, x)} title="Переключить: выполнено / частично / нет" style={{ cursor: "pointer" }}>{sLabel[x.state] || "?"}</div>
              <div className="body"><div className="nm">{x.title}</div><div className="det">{x.detail || ""}</div></div>
              <div className="act"><button className="btn-sm" onClick={() => cycleStd(t.id, x)}>Статус →</button><button className="btn-sm" onClick={() => delStd(t.id, x.id)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Удалить</button></div>
            </div>
          )) : <Empty>Данных пока нет — добавьте пункты чек-листа стандартов.</Empty>}
          <h4>Добавить пункт</h4>
          <div className="form-grid">
            <div className="field full"><label>Название *</label><input value={stdForm.title} placeholder="Напр.: Фото прихода вовремя" onChange={(e) => setStdForm((f: any) => ({ ...f, title: e.target.value }))} /></div>
            <div className="field full"><label>Пояснение</label><input value={stdForm.detail} placeholder="Как проверяется" onChange={(e) => setStdForm((f: any) => ({ ...f, detail: e.target.value }))} /></div>
          </div>
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-sm" onClick={() => addStd(t.id)}>+ Добавить пункт</button>
          </div>
          <p className="note">Клик по значку слева переключает состояние: ✓ выполнено → ~ частично → ✕ нет. Выполнение стандартов даёт % (вес {KPI_WEIGHTS.standards}% в KPI) и влияет на бонусы и звание.</p>
        </>
      )),
      /* TRAIN */
      pane("train", (
        t.training.length ? (
          <>
            <div className="sec-label">Базовая программа</div>
            {base.map((x: any, i: number) => (<div className="train-item" key={"b" + i}><div className="hd"><span className="nm">{x.dir}</span><span className={"badge " + tb(x.st)}>{x.st}</span></div></div>))}
            <div className="sec-label">Дополнительные направления</div>
            {extra.map((x: any, i: number) => (<div className="train-item" key={"e" + i}><div className="hd"><span className="nm">{x.dir}</span><span className={"badge " + tb(x.st)}>{x.st}</span></div></div>))}
          </>
        ) : <Empty>Данных об обучении и аттестации направлений пока нет.</Empty>
      )),
      /* ATT */
      pane("att", (
        <>
          <h4>История аттестаций</h4>
          {cardAtt.length ? cardAtt.slice().sort((a, b) => (String(b.date) < String(a.date) ? -1 : 1)).map((a: any) => (
            <div className="row-item" key={a.id}>
              <div><div className="ttl">{a.direction} {a.mark && a.mark !== "—" ? "· " + a.mark : ""}</div><div className="det">{a.note || ""}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}><span className={"badge " + (a.result === "Аттестован" ? "b-green" : a.result === "В процессе" ? "b-role" : "b-gray")}>{a.result}</span><div className="det">{a.date ? isoToDate(a.date) : "—"}</div></div>
                <button className="btn-sm" onClick={() => delAtt(t.id, a.id)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Удалить</button>
              </div>
            </div>
          )) : <Empty>Данных пока нет — аттестаций ещё не было.</Empty>}
          <h4>Добавить аттестацию</h4>
          <div className="form-grid">
            <div className="field"><label>Дата</label><input type="date" value={attForm.date} onChange={(e) => setAttForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
            <div className="field"><label>Направление *</label><input value={attForm.direction} placeholder="Напр.: Лезгинка" onChange={(e) => setAttForm((f: any) => ({ ...f, direction: e.target.value }))} /></div>
            <div className="field"><label>Результат</label><select value={attForm.result} onChange={(e) => setAttForm((f: any) => ({ ...f, result: e.target.value }))}><option>Аттестован</option><option>В процессе</option><option>Не аттестован</option></select></div>
            <div className="field"><label>Оценка</label><input value={attForm.mark} placeholder="Напр.: 5 / отлично" onChange={(e) => setAttForm((f: any) => ({ ...f, mark: e.target.value }))} /></div>
            <div className="field full"><label>Заметка</label><textarea rows={2} value={attForm.note} placeholder="Комментарий комиссии" onChange={(e) => setAttForm((f: any) => ({ ...f, note: e.target.value }))} /></div>
          </div>
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}><button className="btn-sm" onClick={() => addAtt(t.id)}>+ Добавить аттестацию</button></div>
          <p className="note">История сохраняется бессрочно.</p>
        </>
      )),
      /* REV */
      pane("rev", (
        <>
          <h4>Отзывы и оценки</h4>
          {cardReviews.length ? cardReviews.map((r: any) => (
            <div className="review" key={r.id}>
              <div className="hd">
                <div><span className="stars">{r.stars ? starsStr(Number(r.stars)) : ""}</span> <span className="src">{r.author}{r.source ? " · " + r.source : ""}{r.createdAt ? " · " + isoToDate(r.createdAt) : ""}</span></div>
                <button className="btn-sm" onClick={() => delReview(t.id, r.id)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Удалить</button>
              </div>
              <p>{r.text}</p>
            </div>
          )) : <Empty>Данных пока нет — отзывов о педагоге ещё нет.</Empty>}
          <h4>Добавить отзыв</h4>
          <div className="form-grid">
            <div className="field"><label>Автор *</label><input value={revForm.author} placeholder="Имя родителя" onChange={(e) => setRevForm((f: any) => ({ ...f, author: e.target.value }))} /></div>
            <div className="field"><label>Источник</label><input value={revForm.source} placeholder="Родитель / WhatsApp / 2ГИС" onChange={(e) => setRevForm((f: any) => ({ ...f, source: e.target.value }))} /></div>
            <div className="field"><label>Оценка</label><select value={revForm.stars} onChange={(e) => setRevForm((f: any) => ({ ...f, stars: Number(e.target.value) }))}>{[5, 4, 3, 2, 1].map((n) => (<option key={n} value={n}>{starsStr(n)} ({n})</option>))}</select></div>
            <div className="field full"><label>Текст *</label><textarea rows={2} value={revForm.text} placeholder="Текст отзыва" onChange={(e) => setRevForm((f: any) => ({ ...f, text: e.target.value }))} /></div>
          </div>
          <div className="modal-foot" style={{ justifyContent: "flex-start" }}>
            <button className="btn-sm" onClick={() => addReview(t.id)}>+ Добавить отзыв</button>
            <button className="btn-sm" onClick={() => toast("Ссылка на оценку отправлена родителям в WhatsApp")}>Запросить у родителей</button>
          </div>
        </>
      )),
      /* AI */
      pane("ai", (
        t.ai ? (
          <div className="ai-box">
            <div className="ttl"><IconSpark />AI-анализ работы · {fMonth}</div>
            <div className="sec-label">Сильные стороны</div><div className="pill-list">{t.ai.pos.map((p: string, i: number) => (<span className="pill b-green" key={i}>{p}</span>))}</div>
            <div className="sec-label">Замечания</div><div className="pill-list">{t.ai.neg.map((p: string, i: number) => (<span className="pill b-red" key={i}>{p}</span>))}</div>
            <div className="sec-label">Заключение</div><p>{t.ai.verdict}</p>
            <div className="sec-label">Рекомендация по «Педагогу месяца»</div><p>{t.ai.rec}</p>
          </div>
        ) : <Empty>AI-анализ появится, когда накопятся данные по KPI, отзывам и стандартам.</Empty>
      )),
      /* FINES */
      pane("fines", finesTab(t)),
      /* SAL */
      pane("sal", salaryDetail(t, fMonth, "card")),
    ];
  };

  /* ===== fines log rows (из реальных penalties) ===== */
  const renderFinesLog = () => {
    const rows = (penalties || []).filter((p) => {
      const monthLabel = periodToLabel(p.period_month);
      if (logWho && p.teacherId !== logWho) return false;
      if (logMonth && logMonth !== monthLabel) return false;
      return true;
    }).map((p) => ({
      id: p.id, tName: p.teacherName || "Преподаватель", reason: p.reason, sum: Number(p.amount) || 0,
      month: periodToLabel(p.period_month), date: isoToDate(p.created_at), note: p.comment || "", by: p.created_by || "—",
    }));
    const total = rows.reduce((s, f) => s + f.sum, 0);
    return (
      <>
        <div className="kpi" style={{ marginBottom: 14, background: "var(--red-soft)" }}><div className="v" style={{ color: "var(--red)" }}>{money(total)}</div><div className="k">Сумма штрафов по фильтру · {rows.length} шт.</div></div>
        <div className="modal-foot" style={{ justifyContent: "flex-start", marginBottom: 14 }}>
          <button className="btn-sm" onClick={openFineFromLog} style={{ borderColor: "var(--red)", color: "var(--red)" }}>+ Начислить новый штраф</button>
        </div>
        {!rows.length ? <Empty>Штрафов по выбранному фильтру нет.</Empty> : rows.map((f, i) => (
          <div className="row-item" key={f.id || i}>
            <div>
              <div className="ttl" style={{ color: "var(--red)" }}>{f.tName} · {f.reason} · {money(f.sum)}</div>
              <div className="det">{f.month} · {f.date}{f.note ? " · " + f.note : ""} · начислил: {f.by || "—"}</div>
            </div>
            <div><button className="btn-sm" onClick={() => deleteFine(f)} style={{ borderColor: "var(--red)", color: "var(--red)" }}>Удалить</button></div>
          </div>
        ))}
      </>
    );
  };

  const cardTeacher = cardId != null ? teachers.find((t) => t.id === cardId) : null;
  const cardMonth = cardTeacher ? monthData(cardTeacher, fMonth) : null;
  const payTeacher = teachers.find((t) => t.id === payWho) || teachers[0];
  const fineTeacher = fineId != null ? teachers.find((t) => t.id === fineId) : null;

  /* ========================================================================= */
  return (
    <div className="proto-teachers">
      <h1>Преподаватели сети</h1>
      <p className="lead">Статистика и развитие педагогического состава. Выберите месяц — пересчитаются KPI, удержание и зарплата. Нажмите на показатель или преподавателя, чтобы раскрыть детали.</p>

      <div className="dash-bar">
        <div className="filters">
          <select className="month" value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
            {MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}
          </select>
          <select value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
            <option value="">Вся сеть</option>
            {branchNames.map((b) => (<option key={b} value={b}>{b}</option>))}
          </select>
          {/* Фильтр по категории — показываем, если задано несколько разных категорий */}
          {catValues.length > 1 ? (
            <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">Любая категория</option>
              {catValues.map((c) => (<option key={c} value={String(c)}>{c} категория</option>))}
            </select>
          ) : null}
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Любой статус</option>
            <option>Активен</option><option>Стажер</option>
          </select>
        </div>
      </div>

      {/* TEACHER OF MONTH BANNER */}
      <div className="tom">
        {winner ? (
          <>
            <div className="crown"><IconCrown /></div>
            <div className="info">
              <div className="elbl">Педагог месяца · {fMonth}</div>
              <div className="nm">{winner.name} · {catName(winner.cat)}</div>
              <div className="ai-tag"><IconSpark />ИИ предлагает: <b>&nbsp;{best ? best.name : "—"}</b> (KPI {bestK}). Бонус +20 000 тг</div>
            </div>
            <div className="btns">
              <button className="btn-sm primary" onClick={() => approveTOM(best ? best.id : winner.id)}>Утвердить выбор ИИ</button>
              <button className="btn-sm" onClick={() => showDetail("kpi")}>Сравнить педагогов</button>
            </div>
          </>
        ) : (
          <div className="info"><div className="elbl">Педагог месяца</div><div className="nm">Нет данных за месяц</div></div>
        )}
      </div>

      {/* TILES */}
      <div className="tiles">
        <div className="tile" onClick={() => showDetail("all")}><div className="lbl">Всего</div><div className="val">{teachers.length}</div><div className="sub">в сети →</div></div>
        <div className="tile" onClick={() => showDetail("active")}><div className="lbl">Активные</div><div className="val">{teachers.filter((t) => t.status === "Активен").length}</div><div className="sub">работают →</div></div>
        <div className="tile" onClick={() => showDetail("intern")}><div className="lbl">Стажёры</div><div className="val">{teachers.filter((t) => t.status === "Стажер").length}</div><div className="sub">статус «Стажер» →</div></div>
        <div className="tile" onClick={() => showDetail("ret")}><div className="lbl">Ср. удержание</div><div className="val">{withM.length ? avgRet.toFixed(1) + "%" : "—"}</div><div className="sub">м/м · детально →</div></div>
        <div className="tile" onClick={() => showDetail("kpi")}><div className="lbl">Ср. KPI</div><div className="val">{withM.length ? Math.round(avgKpi) : "—"}</div><div className="sub">из 100 · детально →</div></div>
      </div>

      {/* DETAIL PANEL */}
      {detailKind ? renderDetail() : null}

      {/* SPOTLIGHT CARDS */}
      <div className="cards">
        {filtered.map((t) => {
          const m = monthData(t, fMonth); const k = kpiTotal(kpiComponents(m)); const win = winnerId === t.id;
          const sal = salary(t, m, fMonth, winnerId); const fSum = finesSumForMonth(t, fMonth);
          return (
            <div className={"tcard" + (win ? " winner" : "")} key={t.id}>
              <div className="catpill">{catName(t.cat)}</div>
              {win ? <div className="wbadge"><IconWbadge />Педагог месяца</div> : null}
              <div className="top"><div className="ava">{t.initials}</div><h3>{t.name}</h3></div>
              <div className="stat-grid">
                <div className="st"><div className="k">Ученики</div><div className="v">{t.studentsCount}</div></div>
                <div className="st"><div className="k">Удержание</div><div className="v">{m ? m.ret + "%" : "—"}</div></div>
                <div className="st"><div className="k">KPI</div><div className="v">{m ? k : "—"}</div></div>
                <div className="st"><div className="k">Ожид. ЗП</div><div className="v" style={{ fontSize: 17 }}>{sal ? money(sal.total) : "—"}</div></div>
              </div>
              {fSum ? <div style={{ background: "var(--red-soft)", color: "var(--red)", borderRadius: 12, padding: "10px 14px", fontWeight: 700, fontSize: 14, marginBottom: 16, display: "flex", justifyContent: "space-between" }}><span>Штрафы за месяц</span><span>− {money(fSum)}</span></div> : null}
              <button className="open-link" onClick={() => openCard(t.id)}>Открыть карточку ›</button>
            </div>
          );
        })}
      </div>

      {/* COUNT ROW + ACTIONS */}
      <div className="count-row">
        <span className="cnt">{filtered.length} преподавателей в сети</span>
        <div className="actions">
          <div className="colcfg">
            <button className="colcfg-btn" onClick={(e) => { e.stopPropagation(); setColMenuOpen((v) => !v); }}><IconCols />Показатели</button>
            <div className={"colcfg-menu" + (colMenuOpen ? " open" : "")} style={{ left: "auto", right: 0 }}>
              <div className="ttl">Колонки таблицы</div>
              <div className="colcfg-row locked"><input type="checkbox" checked disabled readOnly /> Преподаватель</div>
              {columns.map((c) => (
                <label className="colcfg-row" key={c.id}><input type="checkbox" checked={c.on} onChange={(e) => toggleCol(c.id, e.target.checked)} /> {c.label}</label>
              ))}
              <div className="colcfg-row locked"><input type="checkbox" checked disabled readOnly /> Действия</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={openFinesLog} style={{ borderColor: "#EBC4B6", color: "var(--red)" }}>Штрафы</button>
          <button className="btn-ghost" onClick={openPayroll}>Рассчитать ЗП</button>
          <button className="btn-gold" onClick={() => openForm()}>+ Добавить преподавателя</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Преподаватель</th>
              {activeCols.map((c) => (<th key={c.id}>{c.label}</th>))}
              <th style={{ textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const m = monthData(t, fMonth); const k = kpiTotal(kpiComponents(m)); const sal = salary(t, m, fMonth, winnerId);
              return (
                <tr key={t.id} onClick={() => openCard(t.id)}>
                  <td className="who"><b>{t.name}</b><span>{t.phone} · {t.studentsCount} уч.</span></td>
                  {activeCols.map((c) => (<td key={c.id}>{renderCell(c.id, t, m, k, sal)}</td>))}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      <button className="icn" title="Редактировать" onClick={() => openForm(t.id)}><IconEdit /></button>
                      <button className="icn" title="Архивировать" onClick={() => archive(t.id)}><IconArchive /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CARD MODAL */}
      {cardTeacher ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeCard(); }}>
          <div className="sheet">
            <div className="sheet-head">
              <div className="ava">{cardTeacher.initials}</div>
              <div><h2>{cardTeacher.name}</h2><div className="meta">{cardTeacher.spec} · {cardTeacher.branch} · {catName(cardTeacher.cat)} · {fMonth}</div></div>
              <button className="close" onClick={closeCard}>×</button>
            </div>
            <div className="tabs">
              {CARD_TABS.map(([key, label]) => (
                <button className={"tab" + (activeTab === key ? " active" : "")} key={key} onClick={() => setActiveTab(key)}>{label}</button>
              ))}
            </div>
            <div>{renderCardPanes(cardTeacher, cardMonth)}</div>
          </div>
        </div>
      ) : null}

      {/* ADD / EDIT FORM MODAL */}
      {formOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="sheet" style={{ maxWidth: 680 }}>
            <div className="sheet-head">
              <div><h2>{editId ? "Редактирование: " + (teachers.find((t) => t.id === editId)?.name || "") : "Новый преподаватель"}</h2><div className="meta">Заполните карточку сотрудника</div></div>
              <button className="close" onClick={closeForm}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="avatar-pick" style={{ marginBottom: 16 }}>
                <div className="ava">{form.ava}</div>
                <button className="btn-sm" onClick={() => toast("Загрузка фото — выбор файла")}>Загрузить фото</button>
              </div>
              <div className="form-grid">
                <div className="field full"><label>ФИО *</label><input value={form.name} placeholder="Иванов Иван" onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
                <div className="field"><label>Телефон *</label><input value={form.phone} placeholder="+7 ___ ___ __ __" onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value, login: f.loginTouched ? f.login : e.target.value }))} /></div>
                <div className="field"><label>Дата рождения</label><input type="date" value={form.birth} onChange={(e) => setForm((f: any) => ({ ...f, birth: e.target.value }))} /></div>
                <div className="field"><label>Дата приёма</label><input type="date" value={form.hired} onChange={(e) => setForm((f: any) => ({ ...f, hired: e.target.value }))} /></div>
                <div className="field"><label>Филиал *</label><select value={form.br} onChange={(e) => setForm((f: any) => ({ ...f, br: e.target.value }))}>{form.br && !branchNames.includes(form.br) ? <option value={form.br}>{form.br}</option> : null}{branchNames.length ? branchNames.map((b) => (<option key={b} value={b}>{b}</option>)) : <option value="">Нет филиалов</option>}</select></div>
                <div className="field"><label>Категория</label><select value={form.ct} onChange={(e) => setForm((f: any) => ({ ...f, ct: e.target.value }))}><option value="">Не задана</option><option value="1">1 категория</option><option value="2">2 категория</option><option value="3">3 категория</option></select></div>
                <div className="field"><label>Роль</label><select value={form.rl} onChange={(e) => setForm((f: any) => ({ ...f, rl: e.target.value }))}><option>Преподаватель</option><option>Администратор</option><option>Управляющий</option></select></div>
                <div className="field full"><label>Специализация</label><input value={form.spec} placeholder="Лезгинка, High Heels..." onChange={(e) => setForm((f: any) => ({ ...f, spec: e.target.value }))} /></div>
                <div className="field"><label>Статус</label><select value={form.st} onChange={(e) => setForm((f: any) => ({ ...f, st: e.target.value }))}><option>Активен</option><option>Стажер</option></select></div>
                <div className="field full"><label>Заметки</label><textarea rows={2} value={form.notes} placeholder="Внутренние заметки о педагоге" onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="sec-label" style={{ marginTop: 20 }}>Доступ в личный кабинет</div>
              <div className="form-grid">
                <div className="field"><label>Логин (телефон)</label><input value={form.login} placeholder="Подставится из телефона" onChange={(e) => setForm((f: any) => ({ ...f, login: e.target.value, loginTouched: true }))} /></div>
                <div className="field"><label>Пароль</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" value={form.pass} placeholder="Пароль для входа" style={{ flex: 1 }} onChange={(e) => setForm((f: any) => ({ ...f, pass: e.target.value }))} />
                    <button className="btn-sm" type="button" onClick={genPass}>Сгенерировать</button>
                  </div>
                </div>
              </div>
              <p className="note">Логин по умолчанию = номер телефона. Педагог входит в личный кабинет и видит свои KPI, ЗП, штрафы, обучение. Пароль в рабочей системе хранится в зашифрованном виде на сервере.</p>
              <div className="modal-foot">
                <button className="btn-ghost" onClick={closeForm}>Отмена</button>
                <button className="btn-gold" onClick={saveForm}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* PAYROLL MODAL */}
      {payOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closePayroll(); }}>
          <div className="sheet">
            <div className="sheet-head">
              <div><h2>Расчёт зарплаты</h2><div className="meta">Реальная схема оплаты и число проведённых занятий</div></div>
              <button className="close" onClick={closePayroll}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="form-grid" style={{ marginBottom: 8 }}>
                <div className="field"><label>Преподаватель</label><select value={payWho} onChange={(e) => setPayWho(e.target.value)}>{teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                <div className="field"><label>Месяц</label><select value={payMonth} onChange={(e) => setPayMonth(e.target.value)}>{MONTHS.map((mn) => (<option key={mn} value={mn}>{mn}</option>))}</select></div>
              </div>
              <div>{payTeacher ? salaryDetail(payTeacher, payMonth, "payroll") : <Empty>Нет преподавателей для расчёта.</Empty>}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* FINES LOG MODAL */}
      {finesLogOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeFinesLog(); }}>
          <div className="sheet">
            <div className="sheet-head">
              <div><h2>Журнал штрафов</h2><div className="meta">Все штрафы по сети · вычитаются из ЗП автоматически</div></div>
              <button className="close" onClick={closeFinesLog}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="form-grid" style={{ marginBottom: 8 }}>
                <div className="field"><label>Месяц</label><select value={logMonth} onChange={(e) => setLogMonth(e.target.value)}><option value="">Все месяцы</option>{MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}</select></div>
                <div className="field"><label>Преподаватель</label><select value={logWho} onChange={(e) => setLogWho(e.target.value)}><option value="">Все преподаватели</option>{teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
              </div>
              <div>{renderFinesLog()}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* FINE MODAL */}
      {fineOpen ? (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) closeFine(); }}>
          <div className="sheet" style={{ maxWidth: 520 }}>
            <div className="sheet-head">
              <div><h2>Начислить штраф</h2><div className="meta">{fineTeacher ? fineTeacher.name + " · " + catName(fineTeacher.cat) : ""}</div></div>
              <button className="close" onClick={closeFine}>×</button>
            </div>
            <div className="pane active" style={{ display: "block" }}>
              <div className="form-grid">
                <div className="field"><label>Причина *</label><select value={fineReason} onChange={(e) => setFineReason(e.target.value)}>{FINE_REASONS.map((r) => (<option key={r}>{r}</option>))}</select></div>
                <div className="field"><label>Сумма, тг *</label><input type="number" value={fineSum} placeholder="2000" onChange={(e) => setFineSum(e.target.value)} /></div>
                <div className="field"><label>Месяц</label><select value={fineMonth} onChange={(e) => setFineMonth(e.target.value)}>{MONTHS.map((m) => (<option key={m} value={m}>{m}</option>))}</select></div>
                <div className="field"><label>Кто начислил</label><select value={fineBy} onChange={(e) => setFineBy(e.target.value)}><option>Владелец</option><option>Управляющий</option></select></div>
                <div className="field full"><label>Комментарий</label><textarea rows={2} value={fineNote} placeholder="Детали нарушения" onChange={(e) => setFineNote(e.target.value)} /></div>
              </div>
              <p className="note">Штраф вычитается из итоговой ЗП. Педагог видит причину, сумму, дату и кто начислил.</p>
              <div className="modal-foot">
                <button className="btn-ghost" onClick={closeFine}>Отмена</button>
                <button className="btn-gold" onClick={saveFine}>Начислить штраф</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* TOASTS */}
      <div className="toasts">
        {toasts.map((t) => (<div className="toast" key={t.id}><span className="dot" /><span>{t.msg}</span></div>))}
      </div>
    </div>
  );
}

export default TeachersProtoView;
