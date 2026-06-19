export type TeacherSpotlightGroup = {
  id: string;
  name: string;
  level: string;
  studentCount: number;
};

export type StudentThanks = {
  text: string;
  studentName?: string;
};

export type TeacherSpotlightPayload = {
  teacherName: string;
  photoUrl?: string;
  experienceYears: number;
  specialties: string[];
  achievements: string[];
  groups: TeacherSpotlightGroup[];
  concertsCount: number;
  studentThanks: StudentThanks[];
  branchName: string;
  logoUrl?: string;
};

export const TEACHER_SPOTLIGHT_DURATION_FRAMES = 20 * 30;
export const TEACHER_SPOTLIGHT_FPS = 30;
