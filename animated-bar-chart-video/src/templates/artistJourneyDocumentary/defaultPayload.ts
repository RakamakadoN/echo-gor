import type { ArtistJourneyDocumentaryPayload } from "./schema";

export const defaultArtistJourneyDocumentaryPayload: ArtistJourneyDocumentaryPayload = {
  student: {
    id: "artist-journey-demo",
    name: "Амина",
    currentAge: 12,
  },
  school: {
    name: "Эхо Гор",
    branchName: "Алматы",
  },
  timeline: {
    firstLesson: {
      id: "first-lesson",
      title: "Первое занятие",
      date: "12.09.2021",
      location: "Филиал Алматы",
      description: "Тогда все началось с одного робкого шага в зал.",
    },
    firstPerformance: {
      id: "first-performance",
      title: "Первое выступление",
      date: "20.05.2022",
      location: "Отчетный концерт Эхо Гор",
      description: "Первый свет сцены, первые аплодисменты и первый настоящий артистический опыт.",
    },
    festivals: [
      {
        id: "festival-spring",
        title: "Весенний фестиваль",
        date: "18.03.2023",
        location: "Алматы",
        description: "Первое большое событие за пределами школы.",
      },
      {
        id: "festival-caucasus",
        title: "Фестиваль традиций Кавказа",
        date: "07.10.2024",
        location: "Дворец культуры",
        description: "Командный номер, уверенность и сильная сценическая подача.",
      },
    ],
    diplomas: [
      {
        id: "diploma-discipline",
        title: "Диплом за дисциплину",
        date: "28.12.2023",
        description: "За стабильность, труд и уважение к репетиционному процессу.",
      },
      {
        id: "diploma-stage",
        title: "Диплом участника концерта",
        date: "02.06.2025",
        description: "За вклад в итоговую программу ансамбля.",
      },
    ],
    achievements: [
      {
        id: "achievement-50",
        title: "50 тренировок",
        date: "15.04.2023",
        description: "Первый серьезный рубеж личной дисциплины.",
      },
      {
        id: "achievement-solo",
        title: "Первый сольный фрагмент",
        date: "14.12.2025",
        description: "Момент, когда техника превратилась в характер.",
      },
    ],
    concerts: [
      {
        id: "concert-2024",
        title: "Большой концерт Эхо Гор",
        date: "01.06.2024",
        location: "Алматы",
      },
      {
        id: "concert-2025",
        title: "Итоговый концерт сезона",
        date: "02.06.2025",
        location: "Главная сцена",
      },
    ],
  },
  summary: {
    yearsInSchool: 5,
    lessonsCount: 186,
    performancesCount: 7,
    festivalsCount: 2,
    diplomasCount: 2,
    achievementsCount: 6,
  },
  parentsQuote: {
    text: "Мы видели, как вместе с танцем у нее выросла уверенность.",
    author: "Родители",
  },
  teacherQuote: {
    text: "Она научилась держать не только движение, но и сцену.",
    author: "Аслан Плиев",
  },
  durationSeconds: 60,
};
