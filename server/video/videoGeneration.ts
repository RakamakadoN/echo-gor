import type { Branch, ExecutiveSummary, Group, Student, Teacher } from "../../src/types";
import { getVideoTemplate, videoTemplates } from "../../animated-bar-chart-video/src/data/templateRegistry";
import type {
  EchoGorVideoPayload,
  MetricItem,
  VideoFormat,
  VideoTemplateId,
} from "../../animated-bar-chart-video/src/data/videoTypes";
import type { TeacherSpotlightPayload } from "../../animated-bar-chart-video/src/templates/teacherSpotlightTrailer/schema";

export type VideoRenderStatus = "queued" | "validating" | "rendering" | "uploading" | "completed" | "failed";

export type VideoRenderJob = {
  id: string;
  templateId: VideoTemplateId;
  templateVersion: string;
  status: VideoRenderStatus;
  progress: number;
  priority: "high" | "normal" | "low";
  requestedBy: string;
  entityType: EchoGorVideoPayload["entity"]["type"];
  entityId: string;
  format: VideoFormat;
  payloadSnapshot: EchoGorVideoPayload;
  templatePayloadSnapshot?: TeacherSpotlightPayload;
  output?: {
    storageUrl: string;
    thumbnailUrl: string;
    shareUrl: string;
  };
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
};

type BootstrapPayload = {
  branches: Branch[];
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  metrics: ExecutiveSummary;
};

const jobs = new Map<string, VideoRenderJob>();

const isTemplateId = (value: string): value is VideoTemplateId => {
  return videoTemplates.some((template) => template.id === value);
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `video-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
};

const attendanceRate = (student: Student) => {
  const records = Object.values(student.attendance || {});
  if (records.length === 0) return "нет данных";
  const present = records.filter((record) => record.status === "present").length;
  return `${Math.round((present / records.length) * 100)}%`;
};

const findContext = (data: BootstrapPayload, entityType: string, entityId: string) => {
  const student = data.students.find((item) => item.id === entityId) || data.students[0];
  const teacher =
    data.teachers.find((item) => item.id === entityId) ||
    data.teachers.find((item) => item.id === student?.teacherId) ||
    data.teachers[0];
  const group = data.groups.find((item) => student?.groupIds?.includes(item.id)) || data.groups[0];
  const branch =
    data.branches.find((item) => item.id === entityId) ||
    data.branches.find((item) => item.id === student?.branchId || item.id === group?.branchId) ||
    data.branches[0];

  return { student, teacher, group, branch };
};

const networkMetrics = (metrics: ExecutiveSummary): MetricItem[] => [
  { label: "Активные ученики", value: String(metrics.activeStudentsTotal), tone: "gold" },
  { label: "Выручка месяца", value: `${formatMoney(metrics.thisMonthRevenue)} ₸`, tone: "success" },
  { label: "Посещаемость", value: `${metrics.overallAttendanceRate}%`, tone: "gold" },
  { label: "Новые регистрации", value: String(metrics.newRegistrationsToday), delta: "сегодня", tone: "success" },
  { label: "Отток", value: `${metrics.churnRate}%`, tone: metrics.churnRate > 5 ? "warning" : "neutral" },
  { label: "Абонементы", value: String(metrics.activeSubscriptionsCount), tone: "neutral" },
];

const createTeacherSpotlightPayload = (
  data: BootstrapPayload,
  teacherId: string,
): TeacherSpotlightPayload => {
  const teacher = data.teachers.find((item) => item.id === teacherId) || data.teachers[0];
  const teacherGroups = data.groups.filter((item) => item.teacherId === teacher?.id);
  const teacherStudents = data.students.filter(
    (item) => item.teacherId === teacher?.id || teacherGroups.some((group) => item.groupIds?.includes(group.id)),
  );
  const firstGroup = teacherGroups[0];
  const branch =
    data.branches.find((item) => item.id === firstGroup?.branchId) ||
    data.branches.find((item) => teacherStudents.some((student) => student.branchId === item.id)) ||
    data.branches[0];
  const concertsCount = teacherStudents.reduce((sum, item) => sum + item.performances.length, 0);
  const studentAchievementTitles = teacherStudents
    .flatMap((student) => student.achievements)
    .filter((achievement) => achievement.unlockedAt)
    .map((achievement) => achievement.title);
  const studentThanks = teacherStudents
    .flatMap((student) =>
      student.notes
        .filter((note) => !note.isPrivate)
        .map((note) => ({
          text: note.content,
          studentName: student.name,
        })),
    )
    .slice(0, 3);

  return {
    teacherName: teacher?.name || "Преподаватель Эхо Гор",
    photoUrl: teacher?.photoUrl,
    experienceYears: teacher?.experienceYears || 5,
    specialties: teacher?.specialties?.length ? teacher.specialties : ["Кавказский танец"],
    achievements: [
      ...(teacher?.bio ? [teacher.bio] : []),
      ...studentAchievementTitles,
      `Подготовлено концертов: ${concertsCount || 1}`,
    ].slice(0, 4),
    groups: (teacherGroups.length ? teacherGroups : data.groups.slice(0, 2)).map((group) => ({
      id: group.id,
      name: group.name,
      level: group.level,
      studentCount: group.studentCount,
    })),
    concertsCount: concertsCount || 1,
    studentThanks:
      studentThanks.length > 0
        ? studentThanks
        : [
            { text: "Спасибо за уверенность перед сценой.", studentName: "Ученики" },
            { text: "После занятий ребенок стал держаться сильнее.", studentName: "Родители" },
          ],
    branchName: branch?.name || "Эхо Гор",
  };
};

export const createEchoGorVideoPayload = (
  data: BootstrapPayload,
  templateId: VideoTemplateId,
  entityType: EchoGorVideoPayload["entity"]["type"],
  entityId: string,
  format: VideoFormat,
): EchoGorVideoPayload => {
  const template = getVideoTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown video template: ${templateId}`);
  }

  const { student, teacher, group, branch } = findContext(data, entityType, entityId);
  const metricItems = networkMetrics(data.metrics);
  const branchMetric = data.metrics.branchMetrics.find((item) => item.branchId === branch?.id);
  const studentName = student?.name || "Ученик Эхо Гор";
  const teacherName = teacher?.name || "Преподаватель Эхо Гор";
  const branchName = branch?.name || "Эхо Гор";

  const titleByTemplate: Record<VideoTemplateId, string> = {
    "student-achievement": `${studentName}: новое достижение`,
    "concert-announcement": "Большой концерт Эхо Гор",
    "event-recap": "Итоги выступления",
    "teacher-profile": teacherName,
    "teacher-spotlight": `${teacherName}: Teacher Spotlight`,
    "branch-weekly-report": `Филиал ${branchName}`,
    "owner-network-summary": "Сеть Эхо Гор",
    "artist-journey": `Путь артиста: ${studentName}`,
  };

  const teacherGroups = data.groups.filter((item) => item.teacherId === teacher?.id);
  const teacherStudents = data.students.filter((item) => item.teacherId === teacher?.id || teacherGroups.some((group) => item.groupIds?.includes(group.id)));
  const teacherConcertsCount = teacherStudents.reduce((sum, item) => sum + item.performances.length, 0);
  const teacherAchievementsCount = teacherStudents.reduce(
    (sum, item) => sum + item.achievements.filter((achievement) => achievement.unlockedAt).length,
    0,
  );

  const templateMetrics: Record<VideoTemplateId, MetricItem[]> = {
    "student-achievement": [
      { label: "Уровень", value: student?.artistLevel || "Первый шаг", tone: "gold" },
      { label: "Посещаемость", value: student ? attendanceRate(student) : "нет данных", tone: "success" },
      { label: "Выступления", value: String(student?.performances.length || 0), tone: "gold" },
    ],
    "concert-announcement": [
      { label: "Дата", value: "Скоро", tone: "gold" },
      { label: "Группы", value: String(data.groups.length), tone: "neutral" },
      { label: "Филиал", value: branchName, tone: "gold" },
    ],
    "event-recap": [
      { label: "Участники", value: String(data.students.length), tone: "gold" },
      { label: "Группы", value: String(data.groups.length), tone: "neutral" },
      { label: "Выступления", value: String(data.students.reduce((sum, item) => sum + item.performances.length, 0)), tone: "success" },
    ],
    "teacher-profile": [
      { label: "Опыт", value: `${teacher?.experienceYears || 5} лет`, tone: "gold" },
      { label: "Группы", value: String(data.groups.filter((item) => item.teacherId === teacher?.id).length || 1), tone: "neutral" },
      { label: "Ученики", value: String(data.students.filter((item) => item.teacherId === teacher?.id).length || group?.studentCount || 0), tone: "success" },
    ],
    "teacher-spotlight": [
      { label: "Стаж", value: `${teacher?.experienceYears || 5} лет`, tone: "gold" },
      { label: "Группы", value: String(teacherGroups.length || 1), tone: "neutral" },
      { label: "Ученики", value: String(teacherStudents.length || group?.studentCount || 0), tone: "success" },
      { label: "Концерты", value: String(teacherConcertsCount || 1), tone: "gold" },
      { label: "Достижения", value: String(teacherAchievementsCount || 1), tone: "success" },
      { label: "Благодарности", value: String(Math.max(teacherStudents.length, 3)), tone: "gold" },
    ],
    "branch-weekly-report": [
      { label: "Ученики", value: String(branchMetric?.studentsCount || data.students.length), tone: "gold" },
      { label: "Выручка", value: `${formatMoney(branchMetric?.revenue || 0)} ₸`, tone: "success" },
      { label: "Посещаемость", value: `${branchMetric?.attendanceRate || data.metrics.overallAttendanceRate}%`, tone: "gold" },
      { label: "Заполняемость", value: `${branchMetric?.capacityRate || 0}%`, tone: "neutral" },
      { label: "Группы", value: String(data.groups.filter((item) => item.branchId === branch?.id).length), tone: "neutral" },
      { label: "Новые заявки", value: String(data.metrics.newRegistrationsToday), tone: "success" },
    ],
    "owner-network-summary": metricItems,
    "artist-journey": [
      { label: "Уровень", value: student?.artistLevel || "Первый шаг", tone: "gold" },
      { label: "Баллы пути", value: String(student?.artistLevelPoints || 0), tone: "success" },
      { label: "Сцена", value: String(student?.performances.length || 0), tone: "gold" },
    ],
  };

  const scenes = template.scenePlan.map((scene) => ({
    ...scene,
    subtitle: scene.kind === "metrics" ? "Ключевые данные из CRM" : undefined,
    body:
      scene.kind === "cta"
        ? "Сильная школа растет через дисциплину, сцену и уважение к традиции."
        : undefined,
    metrics: templateMetrics[templateId],
  }));

  return {
    templateId,
    templateVersion: template.version,
    format,
    title: titleByTemplate[templateId],
    subtitle: template.goal,
    audience: template.audience,
    durationInFrames: template.defaultDurationSeconds * 30,
    fps: 30,
    entity: {
      type: entityType,
      id: entityId,
      name: entityType === "teacher" ? teacherName : entityType === "branch" ? branchName : studentName,
    },
    brand: {
      schoolName: "Эхо Гор",
      branchName,
      city: branch?.city,
    },
    people: {
      student: student ? { id: student.id, name: student.name, photoUrl: student.photoUrl } : undefined,
      teacher: teacher ? { id: teacher.id, name: teacher.name, photoUrl: teacher.photoUrl } : undefined,
    },
    metrics: templateMetrics[templateId],
    quote: {
      text: "В танце ребенок учится держать спину, слово и характер.",
      author: teacherName,
    },
    callToAction: {
      label:
        templateId === "teacher-spotlight"
          ? "Teacher Spotlight"
          : templateId.includes("report") || templateId.includes("summary")
            ? "Фокус недели"
            : "Эхо Гор",
      detail:
        templateId === "teacher-spotlight"
          ? `${teacherName}, ${branchName}`
          : templateId.includes("report") || templateId.includes("summary")
            ? "Действовать по данным"
            : "Школа кавказского танца",
    },
    media: [
      ...(student?.photoUrl ? [{ id: `${student.id}-photo`, type: "image" as const, url: student.photoUrl, title: student.name }] : []),
      ...(teacher?.photoUrl ? [{ id: `${teacher.id}-photo`, type: "image" as const, url: teacher.photoUrl, title: teacher.name }] : []),
    ],
    scenes,
  };
};

export const listVideoTemplates = () => videoTemplates;

export const getVideoJobs = () => [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getVideoJob = (id: string) => jobs.get(id);

export const createVideoRenderJob = (
  data: BootstrapPayload,
  input: {
    templateId: string;
    entityType?: EchoGorVideoPayload["entity"]["type"];
    entityId?: string;
    format?: VideoFormat;
    requestedBy: string;
    priority?: "high" | "normal" | "low";
  },
) => {
  if (!isTemplateId(input.templateId)) {
    throw new Error("Unknown video template");
  }

  const entityType = input.entityType || "network";
  const entityId = input.entityId || "network";
  const format = input.format || (input.templateId.includes("report") || input.templateId.includes("summary") ? "landscape-16x9" : "reel-9x16");
  const payloadSnapshot = createEchoGorVideoPayload(data, input.templateId, entityType, entityId, format);
  const templatePayloadSnapshot =
    input.templateId === "teacher-spotlight" ? createTeacherSpotlightPayload(data, entityId) : undefined;
  const now = new Date().toISOString();
  const job: VideoRenderJob = {
    id: createId(),
    templateId: input.templateId,
    templateVersion: payloadSnapshot.templateVersion,
    status: "queued",
    progress: 0,
    priority: input.priority || "normal",
    requestedBy: input.requestedBy,
    entityType,
    entityId,
    format,
    payloadSnapshot,
    templatePayloadSnapshot,
    createdAt: now,
  };

  jobs.set(job.id, job);
  simulateQueue(job.id);
  return job;
};

const updateJob = (id: string, patch: Partial<VideoRenderJob>) => {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...patch });
};

const simulateQueue = (id: string) => {
  setTimeout(() => updateJob(id, { status: "validating", progress: 12, startedAt: new Date().toISOString() }), 250);
  setTimeout(() => updateJob(id, { status: "rendering", progress: 45 }), 800);
  setTimeout(() => updateJob(id, { status: "uploading", progress: 82 }), 1400);
  setTimeout(() => {
    const job = jobs.get(id);
    if (!job) return;
    updateJob(id, {
      status: "completed",
      progress: 100,
      finishedAt: new Date().toISOString(),
      output: {
        storageUrl: `/storage/videos/${job.templateId}/${job.id}/video.mp4`,
        thumbnailUrl: `/storage/videos/${job.templateId}/${job.id}/thumbnail.jpg`,
        shareUrl: `/share/video/${job.id}`,
      },
    });
  }, 2200);
};
