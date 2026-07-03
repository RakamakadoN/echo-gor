import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle,
  Clock,
  Coins,
  Film,
  Flag,
  HeartHandshake,
  Image,
  Landmark,
  Lock,
  Medal,
  Mountain,
  PlayCircle,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Sticker,
  TrendingUp,
  Trophy,
  Users,
  Video
} from "lucide-react";
import { ArtistLevel, Branch, Group, Student, Teacher } from "../types";
import { StudentVideoStudio } from "./StudentVideoStudio";

interface StudentArtistCabinetProps {
  student: Student;
  group?: Group;
  allStudents?: Student[];
  groups?: Group[];
  branches?: Branch[];
  teachers?: Teacher[];
  readOnlyPreview?: boolean;
}

// Награды за наклейки (педагог ставит наклейку после занятия) — пороги как в прототипе.
const STICKER_REWARDS = [
  { stickers: 20, name: "Браслет" },
  { stickers: 40, name: "Блокнот" },
  { stickers: 60, name: "Стикерпак" },
  { stickers: 80, name: "Шоппер" },
  { stickers: 100, name: "Футболка" }
];

// Наклейки начисляются педагогом после занятия. В демо считаем их от посещений
// (каждое присутствие ≈ одна наклейка), чтобы прогресс был живым.
function stickersOf(s: Student): number {
  const records = Object.values(s.attendance || {});
  const present = records.filter((r: any) => r.status === "present").length;
  return present;
}

function monthsOf(s: Student): number {
  const iso = s.createdAt;
  if (!iso) return 0;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.round((Date.now() - start) / (1000 * 60 * 60 * 24 * 30)));
}

const COMM_METRICS = [
  { k: "visits", label: "По посещаемости", unit: "занятий", icon: CalendarDays, val: (s: Student) => Object.values(s.attendance || {}).filter((r: any) => r.status === "present").length },
  { k: "growth", label: "По прогрессу", unit: "очков", icon: TrendingUp, val: (s: Student) => s.artistLevelPoints || 0 },
  { k: "ach", label: "По достижениям", unit: "достижений", icon: Trophy, val: (s: Student) => (s.achievements?.length || 0) },
  { k: "months", label: "По времени", unit: "мес.", icon: Clock, val: (s: Student) => monthsOf(s) }
] as const;

// XP-уровни (как в прототипе): Новичок → Легенда, после — ★ каждые XP_LEGEND_STEP.
const XP_TIERS = [
  { min: 0, name: "Новичок", icon: "🌱" },
  { min: 1000, name: "Ученик", icon: "🎵" },
  { min: 2500, name: "Танцор", icon: "💃" },
  { min: 4500, name: "Артист", icon: "🌟" },
  { min: 7000, name: "Мастер", icon: "🔥" },
  { min: 10000, name: "Легенда", icon: "👑" }
];
const XP_LEGEND_STEP = 5000;

// XP считается из показателей ученика: посещения·10 + наклейки·20 + достижения·100 + очки пути.
function xpOf(s: Student): number {
  const present = Object.values(s.attendance || {}).filter((r: any) => r.status === "present").length;
  return present * 10 + stickersOf(s) * 20 + (s.achievements?.length || 0) * 100 + (s.artistLevelPoints || 0);
}

function xpLevel(total: number) {
  const T = XP_TIERS;
  let i = 0;
  for (let k = 0; k < T.length; k++) if (total >= T[k].min) i = k;
  const t = T[i];
  const isLegend = i === T.length - 1;
  let into: number, need: number, nextName: string, name = t.name;
  if (isLegend) {
    const over = total - t.min;
    const stars = Math.floor(over / XP_LEGEND_STEP);
    into = over % XP_LEGEND_STEP; need = XP_LEGEND_STEP;
    if (stars > 0) name = t.name + " " + "★".repeat(Math.min(stars, 5));
    nextName = t.name + " " + "★".repeat(Math.min(stars + 1, 5));
  } else {
    const nxt = T[i + 1];
    into = total - t.min; need = nxt.min - t.min; nextName = nxt.name;
  }
  return { idx: i, name, icon: t.icon, into, need, left: need - into, pct: need > 0 ? Math.round((into / need) * 100) : 100, nextName, isLegend };
}

// Вертикальная FIFA-карточка ученика: горы, золотая рамка, щит, уровень, фото.
function FifaCard({ student, level }: { student: Student; level: ReturnType<typeof xpLevel> }) {
  return (
    <div className="relative mx-auto aspect-[300/420] w-full max-w-[300px] overflow-hidden rounded-[1.75rem]">
      <svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="fcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9a24a" /><stop offset=".45" stopColor="#6b5836" /><stop offset="1" stopColor="#15181d" /></linearGradient>
          <linearGradient id="fcMt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2b2e" /><stop offset="1" stopColor="#0e1013" /></linearGradient>
        </defs>
        <rect width="300" height="420" fill="url(#fcSky)" />
        <path d="M0 260 L55 150 L95 210 L150 110 L200 200 L245 140 L300 250 L300 420 L0 420 Z" fill="url(#fcMt)" opacity=".92" />
        <path d="M0 320 L70 220 L120 285 L175 200 L235 275 L300 215 L300 420 L0 420 Z" fill="#0b0d10" opacity=".85" />
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border-2 border-[#BF9D5F]/70" />
      <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
        <svg viewBox="0 0 48 56" fill="none" className="h-9 w-8">
          <path d="M24 2 L44 9 V28 C44 42 34 50 24 54 C14 50 4 42 4 28 V9 Z" fill="#12161a" stroke="#BF9D5F" strokeWidth="2" />
          <path d="M24 16 L27 24 L35 22 L28 28 L31 37 L24 32 L17 37 L20 28 L13 22 L21 24 Z" fill="#BF9D5F" />
        </svg>
        <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-black text-[#F0D9A6] backdrop-blur">{level.icon} {level.name}</span>
      </div>
      <div className="absolute inset-x-0 top-[22%] flex justify-center">
        {student.photoUrl ? (
          <img src={student.photoUrl} alt={student.name} className="h-40 w-32 rounded-2xl border-2 border-[#BF9D5F]/60 object-cover object-top shadow-2xl" />
        ) : (
          <div className="flex h-40 w-32 items-center justify-center rounded-2xl border-2 border-[#BF9D5F]/60 bg-black/40 text-4xl font-black text-[#BF9D5F]">{student.name?.[0] || "?"}</div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
        <div className="text-center text-xl font-black uppercase tracking-wide text-white drop-shadow">{student.name}</div>
        <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.35em] text-[#F0D9A6]">Путь танцора</div>
        <svg viewBox="0 0 80 20" className="mt-2 h-4 w-20"><path d="M2 18 L18 6 L28 13 L40 3 L52 13 L64 7 L78 18 Z" fill="#BF9D5F" /></svg>
      </div>
    </div>
  );
}

const artistLevels = [
  ArtistLevel.FIRST_STEP,
  ArtistLevel.ENSEMBLE_STUDENT,
  ArtistLevel.PERFORMANCE_MEMBER,
  ArtistLevel.SCHOOL_REPRESENTATIVE,
  ArtistLevel.SOLOIST,
  ArtistLevel.SENIOR_STUDENT,
  ArtistLevel.ACADEMY_LEGEND
];

const stages = [
  { title: "Тренировочный зал", icon: Mountain, points: 0, description: "Первое занятие и первые правила ансамбля." },
  { title: "Малая сцена", icon: Landmark, points: 120, description: "Открытый урок или первое внутреннее выступление." },
  { title: "Городской концерт", icon: Flag, points: 220, description: "Первое выступление перед городским зрителем." },
  { title: "Областной фестиваль", icon: Users, points: 360, description: "Выезд и участие в большом коллективном событии." },
  { title: "Национальный фестиваль", icon: Shield, points: 520, description: "Представление школы на уровне страны." },
  { title: "Международный фестиваль", icon: Trophy, points: 700, description: "Сцена за пределами привычного круга." },
  { title: "Большая сцена", icon: Star, points: 900, description: "Почетное выступление в истории ансамбля." }
];

const achievementLibrary = [
  "Первый урок", "10 тренировок", "Месяц без пропусков", "Первое выступление",
  "Командный поклон", "Помог младшему", "Готов к сцене", "Уважение к традиции"
];

const CABINET_TABS = ["Главная", "Наклейки", "Достижения", "Мой путь", "Паспорт", "Сообщество", "Магазин", "Выступления", "Видео"] as const;
type CabinetTab = (typeof CABINET_TABS)[number];

export function StudentArtistCabinet({ student, group, allStudents = [], groups = [], branches = [], teachers = [], readOnlyPreview = false }: StudentArtistCabinetProps) {
  const [activeTab, setActiveTab] = useState<CabinetTab>("Главная");
  const [commMetric, setCommMetric] = useState<string>("visits");

  const stickers = stickersOf(student);
  const nextReward = STICKER_REWARDS.find((r) => stickers < r.stickers) || null;
  const rewardsEarned = STICKER_REWARDS.filter((r) => stickers >= r.stickers).length;
  const stickerBase = nextReward ? (STICKER_REWARDS.slice().reverse().find((r) => stickers >= r.stickers)?.stickers ?? 0) : 0;
  const stickerPct = nextReward ? Math.min(100, Math.round(((stickers - stickerBase) / (nextReward.stickers - stickerBase)) * 100)) : 100;

  const xp = xpOf(student);
  const level = xpLevel(xp);

  const groupNameOf = (ids?: string[]) => groups.find((g) => ids?.includes(g.id))?.name || group?.name || "Ансамбль";
  const branchName = branches.find((b) => b.id === student.branchId)?.name || "—";
  const teacherName = teachers.find((t) => t.id === student.teacherId)?.name || "—";
  const months = monthsOf(student);
  const tenure = months >= 12 ? `${Math.floor(months / 12)} г. ${months % 12} мес.` : `${months} мес.`;
  const activeSub = (student.subscriptions || []).find((sub: any) => { const end = sub.endDate || sub.validUntil || sub.until; return end && new Date(end).getTime() > Date.now(); });
  const subActive = !!activeSub || student.status === "active";
  const subUntil: string | null = (activeSub as any)?.endDate || (activeSub as any)?.validUntil || (activeSub as any)?.until || null;
  const subDays = subUntil ? Math.max(0, Math.round((new Date(subUntil).getTime() - Date.now()) / 86400000)) : 0;
  const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("ru-RU") : "—");

  const pathDone = stages.filter((st) => student.artistLevelPoints >= st.points).length;

  const dashTiles: { tab: CabinetTab; ic: string; val: React.ReactNode; name: string }[] = [
    { tab: "Наклейки", ic: "🎁", val: `${rewardsEarned}/${STICKER_REWARDS.length}`, name: "Награды" },
    { tab: "Магазин", ic: "🛍️", val: "ЭхоБаксы", name: "Магазин" },
    { tab: "Достижения", ic: "🏆", val: student.achievements.length, name: "Достижения" },
    { tab: "Мой путь", ic: "🧭", val: `${pathDone}/${stages.length}`, name: "Мой путь" },
    { tab: "Сообщество", ic: "⭐", val: "ТОП-10", name: "Сообщество" }
  ];

  const statCells = [
    { tone: "blue", val: Object.values(student.attendance || {}).filter((r: any) => r.status === "present").length, label: "Посещено", icon: CheckCircle },
    { tone: "gold", val: student.achievements.length, label: "Достижений", icon: Trophy },
    { tone: "green", val: stickers, label: "Наклеек", icon: Sticker },
    { tone: "gold", val: `${rewardsEarned}/${STICKER_REWARDS.length}`, label: "Наград", icon: Medal }
  ];

  const activeMetric = COMM_METRICS.find((m) => m.k === commMetric) || COMM_METRICS[0];
  const leaderboard = useMemo(() => {
    const pool = (allStudents.length ? allStudents : [student]).slice();
    return pool.sort((a, b) => activeMetric.val(b) - activeMetric.val(a)).slice(0, 10);
  }, [allStudents, student, activeMetric]);

  const passportRows: [string, string][] = [
    ["ФИО", student.name],
    ["Возраст", `${student.age} лет`],
    ["Филиал", branchName],
    ["Группа", groupNameOf(student.groupIds)],
    ["Педагог", teacherName],
    ["В студии", tenure],
    ["Пришёл(ла)", fmtDate(student.createdAt)]
  ];

  return (
    <div className="space-y-5 pb-6">
      {readOnlyPreview && (
        <section className="rounded-3xl border border-[#C5A059]/30 bg-[#C5A059]/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Preview слоя наследия</p>
          <p className="mt-2 text-sm text-slate-200">
            Кабинет ученика сохранён как read-only preview. В Эхо Гор 1.0 он обещает будущую магию, но не входит в рабочий операционный слой.
          </p>
        </section>
      )}

      <nav className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {CABINET_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-2xl border px-2 py-3 text-[10px] font-black uppercase tracking-wider transition md:text-xs ${
              activeTab === tab ? "border-[#C5A059] bg-[#C5A059] text-black" : "border-white/10 bg-white/[0.04] text-slate-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Главная" && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <FifaCard student={student} level={level} />
            <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-[#121212] p-5 md:p-6">
              <h1 className="text-2xl font-black text-white">{student.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#C5A059]/15 px-3 py-1 text-xs font-black text-[#C5A059]">{level.icon} {level.name}</span>
                <span className="text-sm font-black text-white">{xp.toLocaleString("ru-RU")} XP</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#C5A059] transition-all" style={{ width: `${level.pct}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>{level.into.toLocaleString("ru-RU")} / {level.need.toLocaleString("ru-RU")} XP</span>
                <span>До «{level.nextName}»: <b className="text-slate-200">{level.left.toLocaleString("ru-RU")} XP</b></span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {[["Возраст", `${student.age} лет`], ["Группа", groupNameOf(student.groupIds)], ["Педагог", teacherName], ["Филиал", branchName], ["В студии", tenure]].map(([k, v]) => (
                  <span key={k} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-400">{k}: <b className="text-slate-200">{v}</b></span>
                ))}
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-2xl border p-4 ${subActive ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"}`}>
            <span className="text-lg">{subActive ? "🟢" : "🔴"}</span>
            <div>
              <b className={`block text-sm ${subActive ? "text-emerald-300" : "text-rose-300"}`}>{subActive ? "Абонемент активен" : "Абонемент неактивен"}</b>
              <span className="text-xs text-slate-400">{subActive ? (subUntil ? `Действует до ${fmtDate(subUntil)} · осталось ${subDays} дн.` : "Действует") : (subUntil ? `Закончился ${fmtDate(subUntil)}` : "Оформите абонемент в студии")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {dashTiles.map((t) => (
              <button key={t.name} onClick={() => setActiveTab(t.tab)}
                className="group relative rounded-2xl border border-white/10 bg-[#121212] p-4 text-left transition hover:border-[#C5A059]/40">
                <span className="absolute right-3 top-3 text-slate-600 transition group-hover:text-[#C5A059]">→</span>
                <div className="text-2xl">{t.ic}</div>
                <div className="mt-2 text-xl font-black text-white">{t.val}</div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.name}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCells.map((c) => {
              const Icon = c.icon;
              const tone = c.tone === "green" ? "text-emerald-400" : c.tone === "blue" ? "text-sky-400" : "text-[#C5A059]";
              return (
                <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <Icon className={`mx-auto h-5 w-5 ${tone}`} />
                  <div className="mt-2 text-xl font-black text-white">{c.val}</div>
                  <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "Достижения" && (
        <section className="rounded-3xl border border-white/10 bg-[#121212] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-white">Достижения</h2>
            <span className="text-xs text-slate-500">{student.achievements.length} получено · считаются автоматически</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...student.achievements.map((item) => item.title), ...achievementLibrary].slice(0, 12).map((title, index) => {
              const done = index < student.achievements.length;
              return (
                <div key={`${title}-${index}`} className={`flex items-center gap-3 rounded-2xl border p-4 ${done ? "border-[#C5A059]/35 bg-[#C5A059]/10" : "border-white/5 bg-black/30"}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${done ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-600"}`}>
                    {done ? <Trophy className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <b className="block truncate text-sm font-bold text-white">{title}</b>
                    <span className="text-[11px] text-slate-500">{done ? "Получено" : "Не открыто"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "Мой путь" && (
        <section className="rounded-3xl border border-white/10 bg-[#121212] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-white">Мой путь</h2>
            <span className="text-xs text-slate-500">{pathDone} из {stages.length} вех пройдено · вся история роста</span>
          </div>
          <div className="mt-5 space-y-0">
            {stages.map((stage, i) => {
              const done = student.artistLevelPoints >= stage.points;
              const current = !done && i === pathDone;
              const Icon = stage.icon;
              return (
                <div key={stage.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full ${done ? "bg-[#C5A059] text-black" : current ? "border-2 border-[#C5A059] text-[#C5A059]" : "bg-white/5 text-slate-600"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {i < stages.length - 1 && <div className={`w-0.5 flex-1 ${done ? "bg-[#C5A059]/40" : "bg-white/10"}`} style={{ minHeight: 28 }} />}
                  </div>
                  <div className="pb-6 pt-1.5">
                    <b className={`block text-sm font-black ${done || current ? "text-white" : "text-slate-500"}`}>{stage.title}</b>
                    <span className="text-xs text-slate-500">{done ? "Пройдено" : current ? "Следующая цель" : `${stage.points} очков пути`}</span>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "Паспорт" && (
        <section className="rounded-3xl border border-white/10 bg-[#121212] p-5 md:p-6">
          <h2 className="text-lg font-black text-white">Паспорт</h2>
          <div className="mt-5 grid grid-cols-[130px_1fr] gap-x-4 gap-y-3 text-sm">
            {passportRows.map(([k, v]) => (
              <React.Fragment key={k}>
                <div className="text-slate-500">{k}</div>
                <div className="font-medium text-white">{v}</div>
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {activeTab === "Наклейки" && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-[#121212] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Наклейки</h2>
              <span className="text-xs text-slate-500">Педагог ставит наклейку после занятия</span>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-3xl border border-[#C5A059]/40 bg-[#C5A059]/10">
                <span className="text-3xl font-black text-[#C5A059]">{stickers}</span>
                <Sticker className="h-4 w-4 text-[#C5A059]/70" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#C5A059] transition-all" style={{ width: `${stickerPct}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>{stickers} наклеек</span>
                  <span>{nextReward ? `до «${nextReward.name}»: ${nextReward.stickers - stickers} шт.` : "Все награды собраны! 🎉"}</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">Наклейки начисляет педагог в разделе «Ученики» → карточка ученика. Здесь ученик видит прогресс.</p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Награды за наклейки</h2>
              <span className="text-xs text-slate-500">{rewardsEarned} из {STICKER_REWARDS.length} · за наклейки</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STICKER_REWARDS.map((r) => {
                const earned = stickers >= r.stickers;
                const isNext = nextReward?.stickers === r.stickers;
                return (
                  <div key={r.name} className={`relative flex flex-col items-center rounded-2xl border p-4 text-center ${earned ? "border-[#C5A059]/40 bg-[#C5A059]/10" : isNext ? "border-[#C5A059]/30 bg-black/30" : "border-white/5 bg-black/30"}`}>
                    {isNext && <span className="absolute -top-2 rounded-full bg-[#C5A059] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">Следующая</span>}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${earned ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-600"}`}>
                      {earned ? <Medal className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <b className="mt-3 text-sm font-black text-white">{r.name}</b>
                    <span className="mt-0.5 text-[11px] text-slate-500">{r.stickers} наклеек</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === "Сообщество" && (
        <section className="rounded-3xl border border-white/10 bg-[#121212] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-white">Сообщество Эхо Гор</h2>
            <span className="text-xs text-slate-500">ТОП-10 · только публичные данные</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COMM_METRICS.map((m) => {
              const Icon = m.icon;
              const on = commMetric === m.k;
              return (
                <button key={m.k} onClick={() => setCommMetric(m.k)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? "border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059]" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"}`}>
                  <Icon className="h-3.5 w-3.5" /> {m.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5">
            {leaderboard.map((s, i) => {
              const top = i < 3;
              const isMe = s.id === student.id;
              return (
                <div key={s.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${isMe ? "border-[#C5A059]/40 bg-[#C5A059]/10" : "border-white/5 bg-black/25"}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${top ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-400"}`}>{i + 1}</div>
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt={s.name} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-black text-slate-400">{s.name?.[0] || "?"}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-bold text-white">{s.name}{isMe && <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-[#C5A059]">вы</span>}</b>
                    <span className="block truncate text-[11px] text-slate-500">{groupNameOf(s.groupIds)}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-base font-black text-white">{activeMetric.val(s)}</span>
                    <span className="ml-1 text-[10px] text-slate-500">{activeMetric.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">Публичный рейтинг — видны только открытые данные. Телефон, оплаты и личные заметки скрыты.</p>
        </section>
      )}

      {activeTab === "Видео" && <StudentVideoStudio student={student} group={group} />}

      {activeTab === "Выступления" && (
        student.performances.length === 0 ? (
          <section className="rounded-3xl border border-white/10 bg-[#121212] p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Выступления</h2>
              <span className="text-xs text-slate-500">концерты, фестивали и конкурсы</span>
            </div>
            <div className="mt-6 rounded-2xl border border-white/5 bg-black/25 py-16 text-center">
              <Video className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">Пока нет выступлений. Они появятся здесь после первого концерта или фестиваля.</p>
            </div>
          </section>
        ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {student.performances.map((performance) => (
            <article key={performance.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#121212]">
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-900 to-black text-[#C5A059]">
                {performance.mediaType === "video" ? <Video className="h-12 w-12" /> : <Image className="h-12 w-12" />}
              </div>
              <div className="p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{performance.date}</p>
                <h3 className="mt-1 text-lg font-black text-white">{performance.eventName}</h3>
                <p className="mt-2 text-xs text-slate-400">{performance.location} • {performance.role}</p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Фото</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Видео</span>
                  {performance.achievedRank && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">{performance.achievedRank}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
        )
      )}

      {activeTab === "Магазин" && <EchoShop studentId={student.id} readOnly={readOnlyPreview} />}
    </div>
  );
}

// Магазин за ЭхоБаксы в кабинете ученика: баланс, витрина товаров, покупка, история.
function EchoShop({ studentId, readOnly }: { studentId: string; readOnly?: boolean }) {
  const hdr = { headers: { "x-demo-role": "student" } };
  const jhdr = { headers: { "Content-Type": "application/json", "x-demo-role": "student" } };
  const [balance, setBalance] = useState(0);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, w] = await Promise.all([
        fetch("/api/mvp/shop/echo/catalog", hdr),
        fetch(`/api/mvp/shop/echo/wallet?studentId=${encodeURIComponent(studentId)}`, hdr),
      ]);
      if (c.ok) setCatalog((await c.json()).products || []);
      if (w.ok) { const wj = await w.json(); setBalance(wj.balance || 0); setTransactions(wj.transactions || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [studentId]);

  const buy = async (p: any) => {
    if (readOnly) { setMsg({ tone: "err", text: "Это read-only превью кабинета — покупка недоступна." }); return; }
    if (balance < p.echoPrice) { setMsg({ tone: "err", text: "Недостаточно ЭхоБаксов для покупки." }); return; }
    setBusyId(p.id); setMsg(null);
    try {
      const res = await fetch("/api/mvp/shop/echo/purchase", { method: "POST", ...jhdr, body: JSON.stringify({ studentId, productId: p.id }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Не удалось купить");
      setBalance(j.balance ?? balance);
      setMsg({ tone: "ok", text: `Куплено: ${j.productName || p.name}! Осталось ${j.balance} ⭐` });
      await load();
    } catch (e: any) { setMsg({ tone: "err", text: e?.message || "Ошибка покупки" }); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Кошелёк */}
      <section className="flex items-center justify-between rounded-3xl border border-[#C5A059]/25 bg-gradient-to-br from-[#151515] to-black p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Кошелёк ЭхоБаксов</p>
          <p className="mt-1 text-sm text-slate-400">Зарабатывай за дисциплину, победы и помощь — трать на награды.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[#C5A059]/30 bg-black/40 px-5 py-3">
          <Coins className="h-7 w-7 text-[#C5A059]" />
          <span className="text-3xl font-black text-white">{balance}</span>
          <span className="text-lg text-[#C5A059]">⭐</span>
        </div>
      </section>

      {msg && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${msg.tone === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{msg.text}</div>
      )}

      {/* Витрина */}
      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Загрузка магазина…</p>
      ) : catalog.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] py-16 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">Пока нет товаров за ЭхоБаксы. Их добавляет школа в разделе «Товары».</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.map((p) => {
            const affordable = balance >= p.echoPrice;
            return (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121212]">
                <div className="flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-black">
                  {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" /> : <ShoppingBag className="h-12 w-12 text-[#C5A059]/60" />}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {p.category && <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{p.category}</p>}
                  <h3 className="mt-1 text-base font-black text-white">{p.name}</h3>
                  {p.description && <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">{p.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-lg font-black text-[#C5A059]">{p.echoPrice} <span className="text-sm">⭐</span></span>
                    <button onClick={() => buy(p)} disabled={busyId === p.id || !affordable || readOnly}
                      className={`rounded-xl px-4 py-2 text-xs font-black transition ${affordable && !readOnly ? "bg-[#C5A059] text-black hover:bg-[#d4af6a]" : "cursor-not-allowed border border-white/10 text-slate-500"}`}>
                      {busyId === p.id ? "…" : affordable ? "Купить" : "Не хватает"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* История покупок и начислений */}
      {transactions.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">История ЭхоБаксов</h3>
          <div className="mt-3 space-y-1.5">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-slate-300">{t.reason || (t.kind === "purchase" ? "Покупка" : "Начисление")}</span>
                <span className={`ml-2 shrink-0 font-black ${t.amount >= 0 ? "text-emerald-400" : "text-rose-300"}`}>{t.amount >= 0 ? "+" : ""}{t.amount} ⭐</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TeamCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#121212] p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">{icon}</div>
      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
    </section>
  );
}
