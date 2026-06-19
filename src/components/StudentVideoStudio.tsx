import React, { useMemo, useState } from "react";
import {
  Award,
  CheckCircle,
  Clock,
  ExternalLink,
  Film,
  Mountain,
  PlayCircle,
  Sparkles,
  Video,
} from "lucide-react";
import { Group, Student } from "../types";

type VideoTemplateKey = "StudentAchievementCinematic" | "ArtistJourneyDocumentary";

type RenderJobState = {
  template: VideoTemplateKey;
  status: "idle" | "queued" | "rendering" | "completed";
  progress: number;
};

type VideoTemplateCard = {
  key: VideoTemplateKey;
  title: string;
  subtitle: string;
  duration: string;
  compositionUrl: string;
  icon: React.ElementType;
  accent: string;
  deliverable: string;
};

interface StudentVideoStudioProps {
  student: Student;
  group?: Group;
}

const remotionStudioBaseUrl = "http://localhost:3001";

const videoTemplates: VideoTemplateCard[] = [
  {
    key: "StudentAchievementCinematic",
    title: "Student Achievement",
    subtitle: "Короткий cinematic ролик для нового достижения ученика.",
    duration: "15-20 сек",
    compositionUrl: `${remotionStudioBaseUrl}/StudentAchievementCinematic`,
    icon: Award,
    accent: "from-[#C5A059]/25 to-[#101318]",
    deliverable: "Reels / TikTok / Shorts",
  },
  {
    key: "ArtistJourneyDocumentary",
    title: "Artist Journey",
    subtitle: "Документальный фильм о пути ребенка за годы обучения.",
    duration: "30-60 сек",
    compositionUrl: `${remotionStudioBaseUrl}/ArtistJourneyDocumentary`,
    icon: Film,
    accent: "from-slate-500/15 to-[#050608]",
    deliverable: "Netflix Documentary style",
  },
];

const countPresentLessons = (student: Student) => {
  return Object.values(student.attendance || {}).filter((record) => record.status === "present").length;
};

const firstKnownDate = (student: Student) => {
  const dates = [
    ...Object.keys(student.attendance || {}),
    ...student.achievements.map((achievement) => achievement.unlockedAt).filter(Boolean),
    ...student.performances.map((performance) => performance.date),
  ] as string[];

  return dates.sort()[0] || "Не указано";
};

const latestAchievementTitle = (student: Student) => {
  const unlocked = student.achievements.filter((achievement) => achievement.unlockedAt);
  return unlocked.at(-1)?.title || student.achievements[0]?.title || "Новое достижение";
};

export function StudentVideoStudio({ student, group }: StudentVideoStudioProps) {
  const [renderJob, setRenderJob] = useState<RenderJobState | null>(null);

  const crmSnapshot = useMemo(
    () => [
      { label: "Ученик", value: student.name },
      { label: "Группа", value: group?.name || "Ансамбль" },
      { label: "Уровень", value: student.artistLevel },
      { label: "Первое занятие", value: firstKnownDate(student) },
      { label: "Посещений", value: countPresentLessons(student) },
      { label: "Выступлений", value: student.performances.length },
      { label: "Достижений", value: student.achievements.filter((achievement) => achievement.unlockedAt).length },
      { label: "Последнее достижение", value: latestAchievementTitle(student) },
    ],
    [group?.name, student],
  );

  const startRender = (template: VideoTemplateKey) => {
    setRenderJob({ template, status: "queued", progress: 12 });
    window.setTimeout(() => setRenderJob({ template, status: "rendering", progress: 58 }), 450);
    window.setTimeout(() => setRenderJob({ template, status: "completed", progress: 100 }), 1200);
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-[#C5A059]/25 bg-gradient-to-br from-[#151515] via-[#0f1418] to-black p-5 md:p-7">
        <div className="absolute right-[-90px] top-[-90px] h-72 w-72 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Видео-студия CRM</p>
            <h2 className="mt-2 text-3xl font-black text-white">Автофильмы из истории ученика</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Шаблоны берут данные из паспорта артиста: фото, первое занятие, выступления, дипломы, достижения,
              посещаемость и группу. Преподавателю остается выбрать формат и запустить генерацию.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
            <StudioMetric label="Шаблонов" value="2" />
            <StudioMetric label="Формат" value="9:16" />
            <StudioMetric label="Источник" value="CRM" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="grid gap-4 lg:grid-cols-2">
          {videoTemplates.map((template) => {
            const Icon = template.icon;
            const activeJob = renderJob?.template === template.key ? renderJob : null;
            const isCompleted = activeJob?.status === "completed";

            return (
              <article
                key={template.key}
                className={`overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${template.accent} p-5`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {template.duration}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black text-white">{template.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{template.subtitle}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#C5A059]">
                  <Mountain className="h-3.5 w-3.5" />
                  {template.deliverable}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400">
                      {activeJob ? renderStatusLabel(activeJob.status) : "Готов к генерации"}
                    </span>
                    <span className="font-black text-white">{activeJob?.progress || 0}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#C5A059] transition-all duration-500"
                      style={{ width: `${activeJob?.progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <a
                    href={template.compositionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:border-[#C5A059]/50"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Preview
                  </a>
                  <button
                    onClick={() => startRender(template.key)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C5A059] px-3 py-3 text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#D8B466]"
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    {isCompleted ? "Готово" : "Render"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#121212] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">CRM snapshot</p>
              <h3 className="mt-1 text-lg font-black text-white">Данные для ролика</h3>
            </div>
            <Sparkles className="h-5 w-5 text-[#C5A059]" />
          </div>
          <div className="mt-5 grid gap-3">
            {crmSnapshot.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-black/30 p-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</span>
                <span className="max-w-[58%] text-right text-xs font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
          <a
            href={`${remotionStudioBaseUrl}/ArtistJourneyDocumentary`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-[#C5A059]"
          >
            <ExternalLink className="h-4 w-4" />
            Открыть Remotion Studio
          </a>
        </section>
      </div>
    </div>
  );
}

function StudioMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function renderStatusLabel(status: RenderJobState["status"]) {
  if (status === "queued") return "В очереди";
  if (status === "rendering") return "Рендеринг";
  if (status === "completed") return "Готово к публикации";
  return "Готов к генерации";
}
