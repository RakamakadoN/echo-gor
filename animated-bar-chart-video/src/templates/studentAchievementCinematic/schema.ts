export type StudentAchievementPayload = {
  studentName: string;
  photoUrl?: string;
  level: string;
  achievement: "Первое выступление" | "50 тренировок" | "Участник фестиваля" | string;
  teacherName: string;
  branchName: string;
  groupName: string;
  receivedAt: string;
  attendanceCount: number;
  performanceCount: number;
  unlockedAchievements: number;
  logoUrl?: string;
};

export const STUDENT_ACHIEVEMENT_CINEMATIC_DURATION = 18 * 30;
export const STUDENT_ACHIEVEMENT_CINEMATIC_FPS = 30;
