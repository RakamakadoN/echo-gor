/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ArtistLevel {
  FIRST_STEP = "Первый шаг",
  ENSEMBLE_STUDENT = "Ученик ансамбля",
  PERFORMANCE_MEMBER = "Участник выступлений",
  SCHOOL_REPRESENTATIVE = "Представитель школы",
  SOLOIST = "Солист",
  SENIOR_STUDENT = "Старший ученик",
  ACADEMY_LEGEND = "Легенда школы"
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  city: string;
  address: string;
  managerName: string;
  phone: string;
  hallsCount: number;
}

export interface Hall {
  id: string;
  branchId: string;
  name: string;
  capacity: number;
}

export interface Teacher {
  id: string;
  organizationId: string;
  name: string;
  photoUrl: string;
  specialties: string[];
  phone: string;
  bio: string;
  experienceYears: number;
  branchId?: string | null;
  role?: "teacher" | "admin" | "branch_manager" | "owner";
}

export interface Guardian {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email?: string;
  telegram?: string;
}

export interface Group {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  teacherId: string;
  hallId: string;
  scheduleText: string;
  days: string[]; // e.g., ["Пн", "Ср", "Пт"]
  time: string; // e.g., "18:30"
  ageGroup: string; // e.g., "7-12 лет", "16+ лет"
  ageFrom?: number | null;
  ageTo?: number | null;
  capacity?: number; // вместимость группы (для расчёта заполняемости)
  level: string; // e.g., "Начинающие", "Продолжающие", "Ансамбль"
  studentCount: number;
}

export interface Attendance {
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'sick' | 'unmarked';
  markedBy?: string;
  note?: string;
}

export interface FinanceTransaction {
  id: string;
  organizationId: string;
  branchId?: string;
  studentId?: string;
  paymentId?: string;
  amount: number;
  type: 'income' | 'expense' | 'debit';
  category?: string;
  description: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  organizationId: string;
  branchId: string;
  studentId: string;
  amount: number;
  date: string;
  type: 'subscription' | 'single' | 'uniform' | 'concert';
  description: string;
  method: 'card' | 'cash' | 'transfer' | 'kaspi';
  status: 'paid' | 'pending';
}

export interface Subscription {
  id: string;
  studentId: string;
  name: string; // e.g., "Стандартный 12 занятий"
  price: number;
  lessonsTotal: number;
  lessonsLeft: number;
  validUntil: string;
  isAutoRenew: boolean;
  status: 'active' | 'expired' | 'suspended';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string; // date unlocked, or undefined if locked
  category: 'attendance' | 'performance' | 'skill' | 'time';
  iconName: string; // lucide icon identifier
}

export interface PerformanceParticipation {
  id: string;
  eventName: string;
  date: string;
  role: string; // e.g., "Сольное исполнение (Лезгинка)", "Общий танец (Симд)"
  location: string;
  achievedRank?: string; // e.g., "Лауреат I степени"
  mediaUrl?: string; // Photo/Video link
  mediaType?: 'photo' | 'video';
}

export interface Homework {
  id: string;
  groupId: string;
  title: string;
  description: string;
  dueDate: string;
  videoUrl?: string;
  linkUrl?: string;
  createdAt: string;
  status: 'assigned' | 'viewed' | 'completed' | 'overdue';
}

export interface StudentProgressNote {
  id: string;
  date: string;
  teacherId: string;
  teacherName: string;
  content: string;
  isPrivate: boolean; // if true, only admins and owner can see it
}

export interface Student {
  id: string;
  organizationId: string;
  name: string;
  age: number;
  photoUrl: string;
  branchId: string;
  groupIds: string[]; // Updated for multiple groups
  teacherId: string;
  guardians?: Guardian[]; // Updated for separate guardian entity
  parentName: string; // Keep for legacy/simple compatibility
  parentPhone: string; // Keep for legacy/simple compatibility
  balance: number; // Positive is credit, negative is outstanding debt
  artistLevel: ArtistLevel;
  artistLevelPoints: number; // e.g., 450 out of 1000 for next rank
  achievements: Achievement[];
  performances: PerformanceParticipation[];
  notes: StudentProgressNote[];
  attendance: { [date: string]: Attendance }; // keyed by date (YYYY-MM-DD)
  subscriptions: Subscription[];
  paymentStatus?: string;
  createdAt?: string; // дата регистрации ученика (ISO), для метрики «новые ученики»
  status?: string; // статус из БД: lead|trial|active|paused|debt|left|archived
}

export type AnnouncementAudience = "all" | "branches" | "teachers" | "parents" | "students";

export interface Announcement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  date: string;
  authorId: string;
  authorName: string;
  authorRole: string; // e.g., "Владелец", "Директор", "Преподаватель"
  branchId?: string; // if undefined, visible network-wide
  audience: AnnouncementAudience;
  likes: number;
  isImportant: boolean;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  timestamp: string;
  userEmail: string;
  userRole: string;
  action: string;
  details: string;
  ip?: string;
}

export interface ExecutiveSummary {
  todayRevenue: number;
  thisMonthRevenue: number;
  activeStudentsTotal: number;
  activeSubscriptionsCount: number;
  overallAttendanceRate: number; // e.g., 92%
  churnRate: number; // e.g., 2.4%
  newRegistrationsToday: number;
  branchMetrics: {
    branchId: string;
    branchName: string;
    studentsCount: number;
    revenue: number;
    attendanceRate: number;
    capacityRate: number;
  }[];
  teacherPerformance: {
    teacherId: string;
    teacherName: string;
    studentsCount: number;
    retentionRate: number;
    averageAttendance: number;
  }[];
}

export interface Competition {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  level: "regional" | "republican"; // региональный / республиканский
  scope: "kazakhstan" | "cis"; // Казахстан / СНГ
  location: string;
  prizePool?: string;
  registeredGroupIds: string[]; // Ensemble group IDs planned
  status: "registering" | "rehearsals" | "completed";
  rehearsalSlots?: { [groupId: string]: string[] }; // Map of groupId to list of day-time descriptions
  responsibleTeacherId?: string; // Преподаватель, ответственный за концерт
  participantStudentIds?: string[]; // Ученики, участвующие в концерте
}

