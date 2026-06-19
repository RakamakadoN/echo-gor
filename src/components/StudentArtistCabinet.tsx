import React, { useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle,
  Film,
  Flag,
  HeartHandshake,
  Image,
  Landmark,
  Mountain,
  PlayCircle,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  Video
} from "lucide-react";
import { ArtistLevel, Group, Student } from "../types";
import { StudentVideoStudio } from "./StudentVideoStudio";
// @ts-ignore
import studentArtistCard from "../assets/images/student_artist_card.png";

interface StudentArtistCabinetProps {
  student: Student;
  group?: Group;
  readOnlyPreview?: boolean;
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

export function StudentArtistCabinet({ student, group, readOnlyPreview = false }: StudentArtistCabinetProps) {
  const [activeTab, setActiveTab] = useState<"Паспорт" | "Сцены" | "Видео" | "Выступления" | "Команда">("Паспорт");
  const currentLevelIndex = Math.max(0, artistLevels.indexOf(student.artistLevel));
  const progressToLegend = Math.min(100, Math.round((student.artistLevelPoints / 900) * 100));

  const attendanceStats = useMemo(() => {
    const records = Object.values(student.attendance || {});
    const present = records.filter((item) => item.status === "present").length;
    const total = records.filter((item) => item.status !== "unmarked").length || 1;
    return Math.round((present / total) * 100);
  }, [student.attendance]);

  return (
    <div className="space-y-5 pb-6">
      {readOnlyPreview && (
        <section className="rounded-3xl border border-[#C5A059]/30 bg-[#C5A059]/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Preview слоя наследия</p>
          <p className="mt-2 text-sm text-slate-200">
            Паспорт артиста сохранен как read-only preview. В Эхо Гор 1.0 он обещает будущую магию, но не входит в рабочий операционный слой.
          </p>
        </section>
      )}
      <section className="relative overflow-hidden rounded-3xl border border-[#C5A059]/25 bg-gradient-to-br from-[#151515] via-[#111827] to-black p-5 md:p-7">
        <div className="absolute right-[-70px] top-[-70px] h-64 w-64 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <img src={student.photoUrl} alt={student.name} className="h-24 w-24 rounded-3xl border border-[#C5A059]/40 object-cover shadow-2xl" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059]">Цифровой паспорт артиста</p>
            <h1 className="mt-2 text-3xl font-black text-white">{student.name}</h1>
            <p className="mt-1 text-sm text-slate-300">{student.age} лет • {group?.name || "Ансамбль"} • {student.artistLevel}</p>
            <div className="mt-4 h-3 max-w-xl overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${progressToLegend}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{student.artistLevelPoints} очков пути. Рост сравнивается только с личной историей ученика.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Посещаемость</p>
            <p className="mt-1 text-4xl font-black text-emerald-400">{attendanceStats}%</p>
            <p className="text-[10px] text-slate-500">личная дисциплина</p>
          </div>
        </div>
        <div className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-[#C5A059]/25 bg-black/35 shadow-2xl shadow-black/30">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[360px] overflow-hidden bg-[#060b0d] sm:min-h-[480px] lg:min-h-[520px]">
              <img
                src={studentArtistCard}
                alt="Карта ученика: путь танцора"
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 lg:hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Карта ученика</p>
                <h2 className="mt-1 text-2xl font-black text-white">Путь танцора</h2>
              </div>
            </div>
            <div className="flex flex-col justify-center border-t border-[#C5A059]/15 p-5 lg:border-l lg:border-t-0 lg:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Карта ученика</p>
              <h2 className="mt-2 text-3xl font-black text-white">Путь танцора</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                Личный образ артиста сохраняет прогресс, сценический путь и достижения ученика как историю роста, а не соревнование с другими детьми.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-black text-white">{student.achievements.length}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">достижений</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-black text-white">{student.performances.length}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">выступлений</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-black text-[#C5A059]">{currentLevelIndex + 1}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">этап пути</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="grid grid-cols-5 gap-2">
        {(["Паспорт", "Сцены", "Видео", "Выступления", "Команда"] as const).map((tab) => (
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

      {activeTab === "Паспорт" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-[#121212] p-5">
            <h2 className="text-lg font-black text-white">Путь артиста</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {artistLevels.map((level, index) => {
                const unlocked = index <= currentLevelIndex;
                return (
                  <div key={level} className={`rounded-2xl border p-4 ${unlocked ? "border-[#C5A059]/40 bg-[#C5A059]/10" : "border-white/5 bg-black/30"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${unlocked ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-600"}`}>
                        {unlocked ? <CheckCircle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className={`text-sm font-black ${unlocked ? "text-white" : "text-slate-500"}`}>{level}</p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Этап {index + 1}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Достижения</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[...student.achievements.map((item) => item.title), ...achievementLibrary].slice(0, 10).map((title, index) => (
                <div key={`${title}-${index}`} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <Award className="h-5 w-5 text-[#C5A059]" />
                  <p className="mt-3 text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{index < student.achievements.length ? "Открыто" : "Следующая цель"}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "Сцены" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const unlocked = student.artistLevelPoints >= stage.points;
            return (
              <div key={stage.title} className={`rounded-3xl border p-5 ${unlocked ? "border-[#C5A059]/35 bg-[#C5A059]/10" : "border-white/10 bg-[#121212]"}`}>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${unlocked ? "bg-[#C5A059] text-black" : "bg-white/5 text-slate-600"}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-black text-white">{stage.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{stage.description}</p>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{unlocked ? "Открыта" : `${stage.points} очков пути`}</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "Видео" && <StudentVideoStudio student={student} group={group} />}

      {activeTab === "Выступления" && (
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
      )}

      {activeTab === "Команда" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <TeamCard icon={<Users />} title="Дух ансамбля" text="Группа открывает общие достижения без сравнения детей между собой." />
          <TeamCard icon={<HeartHandshake />} title="Помощь младшим" text="Старшие ученики получают уважительный статус наставника за поддержку новичков." />
          <TeamCard icon={<Film />} title="История школы" text="Каждое выступление попадает в цифровой архив и остается частью пути артиста." />
          <TeamCard icon={<PlayCircle />} title="Репетиции" text="Прогресс строится на дисциплине, повторении и общей готовности номера." />
          <TeamCard icon={<Trophy />} title="Фестивали" text="Участие фиксируется как опыт, а не как давление победить любой ценой." />
          <TeamCard icon={<CalendarDays />} title="Регулярность" text="Стабильное посещение ценится как основа мастерства и уважения к коллективу." />
        </div>
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
