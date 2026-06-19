import type { TeacherSpotlightPayload } from "./schema";

export const defaultTeacherSpotlightPayload: TeacherSpotlightPayload = {
  teacherName: "Аслан Плиев",
  photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&fit=crop&q=85",
  experienceYears: 18,
  specialties: ["Мужская лезгинка", "Симд", "Трюковая техника"],
  achievements: [
    "Экс-солист государственного ансамбля",
    "Подготовил концертные группы Эхо Гор",
    "Наставник сольных партий и сценической дисциплины",
  ],
  groups: [
    { id: "senior", name: "Старший ансамбль", level: "Ансамбль", studentCount: 18 },
    { id: "kids", name: "Младшие джигиты", level: "Основы", studentCount: 14 },
    { id: "solo", name: "Сольная подготовка", level: "Сцена", studentCount: 6 },
  ],
  concertsCount: 24,
  studentThanks: [
    { text: "Он научил меня не бояться сцены.", studentName: "Сослан" },
    { text: "После его занятий ребенок стал увереннее.", studentName: "Родители ученика" },
  ],
  branchName: "Алматы",
};
