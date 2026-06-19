import { videoTemplates } from "../data/templateRegistry";
import type { EchoGorVideoPayload, MetricItem, VideoTemplateId } from "../data/videoTypes";

const fps = 30;

const getTemplate = (templateId: VideoTemplateId) => {
  const template = videoTemplates.find((item) => item.id === templateId);
  if (!template) {
    throw new Error(`Unknown video template: ${templateId}`);
  }
  return template;
};

const baseMetrics: MetricItem[] = [
  { label: "Ученики", value: "248", delta: "+18 за месяц", tone: "gold" },
  { label: "Посещаемость", value: "92%", delta: "+4%", tone: "success" },
  { label: "Группы", value: "19", tone: "neutral" },
  { label: "Выступления", value: "7", delta: "в сезоне", tone: "gold" },
  { label: "Филиалы", value: "3", tone: "neutral" },
  { label: "Новые заявки", value: "46", delta: "+12%", tone: "success" },
];

const createPayload = (
  templateId: VideoTemplateId,
  overrides: Partial<EchoGorVideoPayload>,
): EchoGorVideoPayload => {
  const template = getTemplate(templateId);
  const scenes = template.scenePlan.map((scene) => ({
    ...scene,
    subtitle: scene.kind === "metrics" ? "Главные показатели без лишнего шума" : undefined,
    body: scene.kind === "cta" ? "Сильная школа начинается с дисциплины, сцены и уважения к традиции." : undefined,
    metrics: baseMetrics,
  }));

  return {
    templateId,
    templateVersion: template.version,
    format: template.supportedFormats[0],
    title: template.name,
    subtitle: template.goal,
    audience: template.audience,
    durationInFrames: template.defaultDurationSeconds * fps,
    fps,
    entity: { type: "network", id: "demo", name: "Эхо Гор" },
    brand: { schoolName: "Эхо Гор", branchName: "Алматы", city: "Алматы" },
    metrics: baseMetrics,
    quote: {
      text: "В танце ребенок учится держать спину, слово и характер.",
      author: "Художественный руководитель",
    },
    callToAction: {
      label: "Эхо Гор",
      detail: "Школа кавказского танца",
    },
    media: [],
    scenes,
    ...overrides,
  };
};

export const defaultPayloads: Record<VideoTemplateId, EchoGorVideoPayload> = {
  "student-achievement": createPayload("student-achievement", {
    title: "Амина делает большой шаг",
    subtitle: "Первое выступление на сцене ансамбля",
    entity: { type: "student", id: "student-demo", name: "Амина" },
    people: {
      student: { id: "student-demo", name: "Амина" },
      teacher: { id: "teacher-demo", name: "Аслан Плиев" },
    },
    metrics: [
      { label: "Достижение", value: "Сцена", delta: "первый выход", tone: "gold" },
      { label: "Занятий", value: "36", delta: "за сезон", tone: "success" },
      { label: "Группа", value: "Ансамбль", tone: "gold" },
    ],
    callToAction: { label: "Гордимся результатом", detail: "Эхо Гор, Алматы" },
  }),
  "concert-announcement": createPayload("concert-announcement", {
    title: "Большой концерт Эхо Гор",
    subtitle: "Вечер силы, сцены и традиций Кавказа",
    entity: { type: "event", id: "concert-demo", name: "Большой концерт" },
    event: {
      name: "Большой концерт Эхо Гор",
      date: "2026-06-22",
      time: "18:30",
      location: "Дворец культуры",
      address: "Алматы",
    },
    metrics: [
      { label: "Дата", value: "22 июня", tone: "gold" },
      { label: "Время", value: "18:30", tone: "neutral" },
      { label: "Группы", value: "12", delta: "на сцене", tone: "success" },
    ],
    callToAction: { label: "Приходите всей семьей", detail: "Места ограничены" },
  }),
  "event-recap": createPayload("event-recap", {
    title: "Итоги выступления",
    subtitle: "Сцена, энергия и общее дыхание ансамбля",
    entity: { type: "event", id: "event-demo", name: "Отчетный концерт" },
    metrics: [
      { label: "Участники", value: "84", tone: "gold" },
      { label: "Номера", value: "16", tone: "neutral" },
      { label: "Награды", value: "5", delta: "за вечер", tone: "success" },
    ],
  }),
  "teacher-profile": createPayload("teacher-profile", {
    title: "Аслан Плиев",
    subtitle: "Преподаватель, который ведет учеников от первого шага к сцене",
    entity: { type: "teacher", id: "teacher-demo", name: "Аслан Плиев" },
    people: {
      teacher: { id: "teacher-demo", name: "Аслан Плиев" },
    },
    metrics: [
      { label: "Опыт", value: "12 лет", tone: "gold" },
      { label: "Группы", value: "6", tone: "neutral" },
      { label: "Направление", value: "Лезгинка", tone: "gold" },
    ],
    quote: {
      text: "Сначала дисциплина, потом техника, потом сцена начинает верить артисту.",
      author: "Аслан Плиев",
    },
  }),
  "teacher-spotlight": createPayload("teacher-spotlight", {
    title: "Teacher Spotlight: Аслан Плиев",
    subtitle: "Премиальный трейлер наставника сцены",
    entity: { type: "teacher", id: "teacher-demo", name: "Аслан Плиев" },
    people: {
      teacher: { id: "teacher-demo", name: "Аслан Плиев" },
    },
    metrics: [
      { label: "Стаж", value: "18 лет", tone: "gold" },
      { label: "Группы", value: "3", tone: "neutral" },
      { label: "Концерты", value: "24", tone: "success" },
      { label: "Ученики", value: "38", tone: "gold" },
      { label: "Достижения", value: "16", tone: "success" },
      { label: "Спасибо", value: "42", tone: "gold" },
    ],
    quote: {
      text: "Он научил меня не бояться сцены.",
      author: "Ученик Эхо Гор",
    },
    callToAction: { label: "Teacher Spotlight", detail: "Эхо Гор, Алматы" },
  }),
  "branch-weekly-report": createPayload("branch-weekly-report", {
    title: "Филиал Алматы",
    subtitle: "Недельный отчет: рост, посещаемость и точки внимания",
    entity: { type: "branch", id: "branch-demo", name: "Алматы" },
    metrics: [
      { label: "Активные ученики", value: "128", delta: "+6", tone: "success" },
      { label: "Посещаемость", value: "91%", delta: "+3%", tone: "success" },
      { label: "Пробные", value: "14", tone: "gold" },
      { label: "Оплаты", value: "87%", tone: "neutral" },
      { label: "Риск оттока", value: "6", delta: "учеников", tone: "warning" },
      { label: "Группы", value: "11", tone: "neutral" },
    ],
  }),
  "owner-network-summary": createPayload("owner-network-summary", {
    title: "Сеть Эхо Гор",
    subtitle: "Executive summary по филиалам, росту и сценическим событиям",
    entity: { type: "network", id: "network-demo", name: "Эхо Гор" },
    brand: { schoolName: "Эхо Гор", city: "Казахстан" },
    metrics: baseMetrics,
    callToAction: { label: "Фокус недели", detail: "Удержание новичков и подготовка концертных групп" },
  }),
  "artist-journey": createPayload("artist-journey", {
    title: "Путь артиста: Амина",
    subtitle: "От первого занятия до уверенного выхода на сцену",
    entity: { type: "student", id: "student-demo", name: "Амина" },
    people: {
      student: { id: "student-demo", name: "Амина" },
      teacher: { id: "teacher-demo", name: "Аслан Плиев" },
    },
    metrics: [
      { label: "Стаж", value: "9 мес.", tone: "gold" },
      { label: "Выступления", value: "3", tone: "success" },
      { label: "Уровень", value: "Ансамбль", tone: "gold" },
    ],
    quote: {
      text: "Она научилась не просто повторять движения, а держать сцену.",
      author: "Преподаватель",
    },
  }),
};
